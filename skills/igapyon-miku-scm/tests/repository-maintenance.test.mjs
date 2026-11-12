import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyMaintenancePlan,
  createGitRunner,
  diagnose,
  parseArgs,
  parseBackupName,
  repositoryPathsEqual,
  saveMaintenancePlan,
} from "../scripts/repository-maintenance.mjs";


import { git, repository, options, mergedPull, ghReturning } from "./repository-maintenance-support.mjs";

test("argument parser keeps apply behind a fixed plan path and digest", () => {
  const digest = "a".repeat(64);
  const parsed = parseArgs([
    "--apply-plan",
    "workplace/miku-scm/maintenance/plans/maintenance-1.json",
    "--expected-plan-sha256",
    digest,
  ]);
  assert.equal(parsed.expectedPlanSha256, digest);
  assert.throws(() => parseArgs(["--apply-plan", "../plan.json", "--expected-plan-sha256", digest]), /maintenance plan path/);
  assert.throws(() => parseArgs(["--save-plan", "--apply-plan",
    "workplace/miku-scm/maintenance/plans/maintenance-1.json",
    "--expected-plan-sha256", digest]), /cannot be combined/);
});

test("backup name parser validates JST calendar values and collision suffixes", () => {
  const parsed = parseBackupName("backup/2026-07-27-1230");
  assert.equal(parsed.sequence, 1);
  assert.equal(parsed.created_at, "2026-07-27T03:30:00.000Z");
  assert.equal(parseBackupName("backup/2026-07-27-1230-3").sequence, 3);
  assert.equal(parseBackupName("backup/2026-02-30-1230"), null);
  assert.equal(parseBackupName("backup/custom"), null);
  assert.equal(parseBackupName("backup/2026-07-27-1230-1"), null);
});

test("maintenance plan repository paths accept Windows separators and case", () => {
  assert.equal(repositoryPathsEqual("D:/a/project", "d:\\a\\project", path.win32), true);
  assert.equal(repositoryPathsEqual("D:/a/project", "D:/a/project-other", path.win32), false);
  assert.equal(repositoryPathsEqual("/tmp/project", "/tmp/project", path.posix), true);
});

test("diagnosis keeps newest three backups and selects only older remaining backups", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-20-1200-3",
    "backup/2026-07-20-1200-2",
    "backup/2026-07-20-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);

  const result = await diagnose(options(state.root), {
    now: () => new Date("2026-07-27T03:01:00Z"),
  });

  assert.deepEqual(result.backups.retained.map((value) => value.branch), [
    "backup/2026-07-26-1200",
    "backup/2026-07-20-1200-3",
    "backup/2026-07-20-1200-2",
  ]);
  assert.deepEqual(result.backups.delete_candidates.map((value) => value.branch), [
    "backup/2026-07-20-1200",
    "backup/2026-07-10-1200",
  ]);
  assert.equal(result.deletion_performed, false);
  assert.ok(result.backups.delete_candidates.every((value) => value.contained_by_other_refs.length > 0));
  assert.ok(result.backups.retained.every((value) => !("contained_by_other_refs" in value)));
});

test("backup reachability runs only for deletion candidates", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-20-1200-3",
    "backup/2026-07-20-1200-2",
    "backup/2026-07-20-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);
  const realGit = createGitRunner();
  let containsCalls = 0;
  const result = await diagnose(options(state.root), {
    now: () => new Date("2026-07-27T03:01:00Z"),
    git: (cwd, args, runOptions) => {
      if (args.some((arg) => arg.startsWith("--contains="))) containsCalls += 1;
      return realGit(cwd, args, runOptions);
    },
  });

  assert.equal(result.backups.delete_candidates.length, 2);
  assert.equal(containsCalls, 2);
});
