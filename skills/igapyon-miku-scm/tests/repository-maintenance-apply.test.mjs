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

test("saved plan applies once after revalidation and records recovery data", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-25-1200",
    "backup/2026-07-24-1200",
    "backup/2026-07-10-1200",
    "backup/2026-07-09-1200",
  ]) git(state.root, "branch", name, state.head);
  const dependencies = {
    now: () => new Date("2026-07-27T03:01:00Z"),
  };
  const diagnosis = await diagnose(options(state.root), dependencies);
  const saved = await saveMaintenancePlan(diagnosis, dependencies);
  assert.match(saved.plan_path, /^workplace\/miku-scm\/maintenance\/plans\/maintenance-/);
  assert.match(saved.plan_sha256, /^[0-9a-f]{64}$/);
  const savedPlan = JSON.parse(await readFile(path.join(state.root, saved.plan_path), "utf8"));
  assert.equal(savedPlan.workflow_contract, "repository.maintenance.apply");
  assert.equal(savedPlan.contract_version, 1);
  assert.match(savedPlan.contract_pair_sha256, /^[0-9a-f]{64}$/);

  const applied = await applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies);
  assert.equal(applied.status, "applied");
  assert.equal(git(state.root, "branch", "--list", "backup/2026-07-10-1200"), "");
  assert.equal(git(state.root, "branch", "--list", "backup/2026-07-09-1200"), "");
  assert.equal(applied.deleted.length, 2);
  assert.match(applied.recovery[0].command, /^git branch backup\/2026-07-10-1200 [0-9a-f]+$/);
  const attempt = JSON.parse(await readFile(path.join(state.root, applied.attempt_record), "utf8"));
  assert.equal(attempt.status, "applied");

  await assert.rejects(applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies), /already has an attempt/);
});

test("apply rejects changed plan bytes before diagnosis or deletion", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-25-1200",
    "backup/2026-07-24-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);
  const dependencies = {
    now: () => new Date("2026-07-27T03:01:00Z"),
  };
  const saved = await saveMaintenancePlan(await diagnose(options(state.root), dependencies), dependencies);
  const planFile = path.join(state.root, saved.plan_path);
  await writeFile(planFile, `${await readFile(planFile, "utf8")}\n`, "utf8");

  await assert.rejects(applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies), /SHA-256 changed/);
  assert.notEqual(git(state.root, "branch", "--list", "backup/2026-07-10-1200"), "");
});

test("apply rechecks only done branches included in the reviewed plan", async (t) => {
  const state = await repository(t);
  const planned = "devel-tiga0720daa";
  const unrelated = "devel-tiga0721ebb";
  git(state.root, "branch", `${planned}-done`, state.head);
  git(state.root, "branch", `${unrelated}-done`, state.head);
  const initial = await diagnose(options(state.root), {
    gh: (args) => ghReturning(args.includes(`head=example:${planned}`)
      ? [mergedPull(planned, state.head)]
      : [])(),
  });
  const saved = await saveMaintenancePlan(initial, {
    now: () => new Date("2026-07-27T12:00:00Z"),
  });
  let applyRequests = 0;
  const applied = await applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), {
    gh: (args) => {
      applyRequests += 1;
      assert.deepEqual(args, [
        "api", "--method", "GET", "repos/example/project/pulls/42",
        "--hostname", "github.com",
      ]);
      return ghReturning(mergedPull(planned, state.head))();
    },
  });

  assert.equal(applyRequests, 1);
  assert.equal(applied.deleted.length, 1);
  assert.equal(git(state.root, "branch", "--list", `${planned}-done`), "");
  assert.notEqual(git(state.root, "branch", "--list", `${unrelated}-done`), "");
});

test("apply stops before an attempt when a reviewed branch object changed", async (t) => {
  const state = await repository(t);
  for (const name of [
    "backup/2026-07-26-1200",
    "backup/2026-07-25-1200",
    "backup/2026-07-24-1200",
    "backup/2026-07-10-1200",
  ]) git(state.root, "branch", name, state.head);
  const dependencies = {
    now: () => new Date("2026-07-27T03:01:00Z"),
  };
  const saved = await saveMaintenancePlan(await diagnose(options(state.root), dependencies), dependencies);

  await writeFile(path.join(state.root, "changed.txt"), "changed\n", "utf8");
  git(state.root, "add", "changed.txt");
  git(state.root, "commit", "-m", "changed");
  git(state.root, "branch", "-f", "backup/2026-07-10-1200", "HEAD");

  await assert.rejects(applyMaintenancePlan(options(state.root,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256), dependencies), /no longer eligible/);
});

