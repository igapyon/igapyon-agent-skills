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

test("diagnosis classifies exactly matched merged done branch for deletion", async (t) => {
  const state = await repository(t);
  const pushed = "devel-tiga0720daa";
  git(state.root, "branch", `${pushed}-done`, state.head);
  const requests = [];
  const result = await diagnose(options(state.root), {
    now: () => new Date("2026-07-27T12:00:00Z"),
    gh: (args) => {
      requests.push(args);
      return ghReturning([mergedPull(pushed, state.head)])();
    },
  });

  assert.equal(result.done.delete_candidates.length, 1);
  assert.equal(result.done.delete_candidates[0].branch, `${pushed}-done`);
  assert.equal(result.done.delete_candidates[0].pull_request.number, 42);
  assert.deepEqual(requests[0], [
    "api", "--method", "GET", "repos/example/project/pulls",
    "--hostname", "github.com",
    "-f", "state=all", "-f", `head=example:${pushed}`, "-f", "per_page=100",
  ]);
  assert.ok(!requests[0].includes("--paginate"));
});

test("diagnosis queries Enterprise remotes through their selected API host", async (t) => {
  const state = await repository(t);
  const pushed = "devel-tiga0720daa";
  git(state.root, "branch", `${pushed}-done`, state.head);
  git(state.root, "remote", "set-url", "origin", "git@forge.internal:example/project.git");
  const calls = [];
  const result = await diagnose(options(state.root), {
    gh: (args) => { calls.push(args); return ghReturning([mergedPull(pushed, state.head)])(); },
  });
  assert.equal(result.done.delete_candidates.length, 1);
  assert.equal(calls[0][calls[0].indexOf("--hostname") + 1], "forge.internal");
});

test("diagnosis queries only local done heads and never enumerates all pull requests", async (t) => {
  const state = await repository(t);
  const branches = ["devel-tiga0720daa", "devel-tiga0721ebb"];
  for (const branch of branches) git(state.root, "branch", `${branch}-done`, state.head);
  const requests = [];
  const result = await diagnose(options(state.root), {
    gh: (args) => {
      requests.push(args);
      const branch = branches.find((value) => args.includes(`head=example:${value}`));
      return ghReturning(branch ? [mergedPull(branch, state.head)] : [])();
    },
  });

  assert.equal(result.done.delete_candidates.length, 2);
  assert.equal(requests.length, 2);
  assert.ok(requests.every((args) => args.some((arg) => arg.startsWith("head=example:"))));
  assert.ok(requests.every((args) => !args.includes("--paginate")));
});

test("publication provenance is loaded once per diagnosis", async (t) => {
  const state = await repository(t);
  const branches = ["devel-tiga0720daa", "devel-tiga0721ebb"];
  for (const branch of branches) git(state.root, "branch", `${branch}-done`, state.head);
  let loads = 0;
  const result = await diagnose(options(state.root), {
    loadProvenance: async () => {
      loads += 1;
      return new Map();
    },
    gh: (args) => {
      const branch = branches.find((value) => args.includes(`head=example:${value}`));
      return ghReturning([mergedPull(branch, state.head)])();
    },
  });

  assert.equal(loads, 1);
  assert.equal(result.done.delete_candidates.length, 2);
});

test("one hundred head matches are unresolved without pagination", async (t) => {
  const state = await repository(t);
  const branch = "devel-tiga0720daa";
  git(state.root, "branch", `${branch}-done`, state.head);
  const requests = [];
  const pulls = Array.from({ length: 100 }, (_, index) => mergedPull(branch, state.head, index + 1));
  const result = await diagnose(options(state.root), {
    gh: (args) => {
      requests.push(args);
      return ghReturning(pulls)();
    },
  });

  assert.equal(requests.length, 1);
  assert.ok(!requests[0].includes("--paginate"));
  assert.equal(result.done.unresolved[0].reason, "pull-request-head-result-limit");
});

