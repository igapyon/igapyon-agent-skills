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

test("apply stops when the remote SHA changed after preflight", async (t) => {
  const state = await scenario(t, { existingRemoteBranch: true });
  const saved = await preparePublicationPlan(state);
  const reviewedRemoteHead = saved.remote_branch.head;

  const other = path.join(state.temporary, "other");
  git(state.temporary, "clone", state.remote, other);
  git(other, "config", "user.name", "Other User");
  git(other, "config", "user.email", "other@example.invalid");
  git(other, "switch", state.branch);
  await writeFile(path.join(other, "other.txt"), "remote update\n", "utf8");
  git(other, "add", "other.txt");
  git(other, "commit", "-m", "remote update");
  git(other, "push", "origin", state.branch);
  const thirdPartyHead = git(other, "rev-parse", "HEAD");

  await assert.rejects(applySavedPublication(state, saved, applyDependencies), /remote branch HEAD changed/);
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), thirdPartyHead);
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});

test("apply stops before push when the completion branch already exists", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  git(state.repo, "branch", `${state.branch}-done`, "HEAD");

  await assert.rejects(applySavedPublication(state, saved, applyDependencies), /already exists/);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("fetch failure prevents push and rename through an injectable Git runner", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  const realGit = createGitRunner();
  const failingGit = (cwd, args, options) => {
    if (args[0] === "fetch") throw new Error("injected fetch failure");
    return realGit(cwd, args, options);
  };

  await assert.rejects(applySavedPublication(state, saved, { ...applyDependencies, git: failingGit }), /injected fetch failure/);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
});

