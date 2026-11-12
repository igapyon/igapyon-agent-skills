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

test("gh failure stops further done lookups and leaves them unresolved", async (t) => {
  const state = await repository(t);
  for (const branch of ["devel-tiga0720daa", "devel-tiga0721ebb"]) {
    git(state.root, "branch", `${branch}-done`, state.head);
  }
  let requests = 0;
  const result = await diagnose(options(state.root), {
    gh: () => {
      requests += 1;
      return ghReturning(null, { ok: false, stderr: "rate limit exceeded" })();
    },
  });

  assert.equal(requests, 1);
  assert.equal(result.done.unresolved.length, 2);
  assert.ok(result.done.unresolved.every((value) => value.reason === "github-inspection-failed"));
});

test("gh timeout is not repeated for every done branch", async (t) => {
  const state = await repository(t);
  for (const branch of ["devel-tiga0720daa", "devel-tiga0721ebb"]) {
    git(state.root, "branch", `${branch}-done`, state.head);
  }
  let requests = 0;
  const result = await diagnose(options(state.root), {
    gh: () => {
      requests += 1;
      return ghReturning(null, { ok: false, timedOut: true })();
    },
  });

  assert.equal(requests, 1);
  assert.equal(result.done.unresolved.length, 2);
  assert.match(result.done.unresolved[0].detail, /timed out after 15000ms/);
});

test("open or mismatched done branches are never deletion candidates", async (t) => {
  const state = await repository(t);
  const pushed = "devel-tiga0720daa";
  git(state.root, "branch", `${pushed}-done`, state.head);
  const open = mergedPull(pushed, state.head);
  open.state = "open";
  open.merged_at = null;

  const retained = await diagnose(options(state.root), {
    gh: ghReturning([open]),
  });
  assert.equal(retained.done.retained[0].reason, "pull-request-not-merged");

  const unresolved = await diagnose(options(state.root), {
    gh: ghReturning([mergedPull(pushed, "0".repeat(40))]),
  });
  assert.equal(unresolved.done.unresolved[0].reason, "exact-pull-request-not-found");
});

test("current done branch is retained without GitHub deletion classification", async (t) => {
  const state = await repository(t);
  const branch = "devel-tiga0720daa-done";
  git(state.root, "switch", "-c", branch);
  const result = await diagnose(options(state.root), {
    gh() { throw new Error("gh must not run for the current branch"); },
  });
  assert.equal(result.done.retained[0].reason, "current-branch");
  assert.equal(result.done.delete_candidates.length, 0);
});
