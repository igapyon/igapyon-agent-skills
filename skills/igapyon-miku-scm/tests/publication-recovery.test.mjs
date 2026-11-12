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

import { PUBLISH_SCRIPT, git, recordedGit, NEXT_WORK_DATE, mergedScenario, nextWorkOptions, scenario, optionsFor, preparePublicationPlan, applySavedPublication, applyDependencies, windowsApplyDependencies, nativeApplyDependencies } from "./post-recommit-publish-support.mjs";

test("push timeout keeps publication unresolved and is never retried", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  let pushCalls = 0;
  const timedGit = createGitRunner({ spawn: (command, args, options) => {
    if (args[0] === "push") {
      pushCalls++;
      const error = new Error("timed out https://user:secret@example.invalid/repo"); error.code = "ETIMEDOUT";
      return { status: null, signal: "SIGTERM", stdout: "", stderr: error.message, error };
    }
    return spawnSync(command, args, options);
  } });
  await assert.rejects(applySavedPublication(state, saved, { ...applyDependencies, git: timedGit }), (error) => {
    assert.equal(error.mutationInvoked, null);
    assert.match(error.message, /ETIMEDOUT/);
    assert.doesNotMatch(error.message, /secret|example\.invalid/);
    return true;
  });
  assert.equal(pushCalls, 1);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  const attempt = JSON.parse(await readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"));
  assert.equal(attempt.status, "unresolved");
});

test("post-push fetch timeout leaves a possibly published branch unresolved and unrenamed", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  let fetchCount = 0;
  let pushCount = 0;
  const timedGit = createGitRunner({ spawn: (command, args, options) => {
    if (args[0] === "push") pushCount++;
    if (args[0] === "fetch" && ++fetchCount === 2) {
      const error = new Error("timed out https://user:secret@example.invalid/repo"); error.code = "ETIMEDOUT";
      return { status: null, signal: "SIGTERM", stdout: "", stderr: error.message, error };
    }
    return spawnSync(command, args, options);
  } });
  await assert.rejects(applySavedPublication(state, saved, { ...applyDependencies, git: timedGit }), (error) => {
    assert.equal(error.mutationInvoked, null);
    assert.match(error.message, /ETIMEDOUT/);
    assert.doesNotMatch(error.message, /secret|example\.invalid/);
    return true;
  });
  assert.equal(pushCount, 1);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  const attempt = JSON.parse(await readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"));
  assert.equal(attempt.status, "unresolved");
});

test("post-push mismatch prevents the local done rename", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  const realGit = createGitRunner();
  const mismatchingGit = (cwd, args, options) => {
    const result = realGit(cwd, args, options);
    if (args[0] === "rev-list" && args.includes("--left-right")) {
      return { ...result, stdout: "1\t0" };
    }
    return result;
  };

  await assert.rejects(applySavedPublication(state, saved, { ...applyDependencies, git: mismatchingGit }), /comparison failed/);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});
