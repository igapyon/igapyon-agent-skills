import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createGitRunner,
  cli,
  executePublish,
  parseArgs,
  resolvePrHandoff,
  runPublish,
  savePublicationPlan,
} from "../scripts/post-recommit-publish.mjs";
import {
  classifyTagLookup,
  prepareNextWorkBranch,
  run as runNextWork,
} from "../scripts/post-merge-next-work.mjs";
import { runWorkflow } from "../scripts/miku-scm-run.mjs";

import { PUBLISH_SCRIPT, git, recordedGit, NEXT_WORK_DATE, mergedScenario, nextWorkOptions, scenario, optionsFor, preparePublicationPlan, applySavedPublication, applyDependencies } from "./post-recommit-publish-support.mjs";

test("apply uses the reviewed remote SHA as an explicit force-with-lease", async (t) => {
  const state = await scenario(t, { existingRemoteBranch: true });
  const calls = [];
  const realGit = createGitRunner();
  const recordingGit = (cwd, args, options) => {
    calls.push(args);
    return realGit(cwd, args, options);
  };
  const saved = await preparePublicationPlan(state, "--expected-remote-head", state.expectedRemoteHead);
  const result = await applySavedPublication(state, saved, { ...applyDependencies, git: recordingGit });

  const destination = `refs/heads/${state.branch}`;
  assert.equal(result.push_mode, "force-with-explicit-lease");
  assert.ok(calls.some((args) => args.includes(`--force-with-lease=${destination}:${state.expectedRemoteHead}`)));
  assert.ok(calls.some((args) => args.includes(`HEAD:${destination}`)));
  assert.ok(calls.every((args) => !args.includes("--force")));
  assert.equal(git(state.remote, "rev-parse", destination), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

