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

import { PUBLISH_SCRIPT, git, recordedGit, NEXT_WORK_DATE, mergedScenario, nextWorkOptions, scenario, optionsFor, preparePublicationPlan, applySavedPublication, applyDependencies, nativeApplyDependencies } from "./post-recommit-publish-support.mjs";

test("saved plan returns the only supported apply arguments", async (t) => {
  const state = await scenario(t);
  const unplanned = await runPublish(optionsFor(state), { gh: null });
  assert.equal(unplanned.apply_arguments, undefined);
  assert.equal(unplanned.next_action, "Save and review a publication plan before applying.");
  assert.ok(unplanned.save_plan_arguments.includes("--save-plan"));
  const saved = await executePublish(optionsFor(state, "--save-plan"), { gh: null });
  assert.deepEqual(saved.apply_arguments, ["--repo", await realpath(state.repo), "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256]);
  assert.ok(!saved.apply_arguments.includes("--apply"));
});

test("saved plan remains unconsumed when a pre-mutation environment check fails", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  await assert.rejects(cli([
    "--repo", state.repo,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256,
  ], {
    ...applyDependencies,
    beforeMutation: async () => {
      throw new Error("sandbox network denied before mutation");
    },
  }), /sandbox network denied/);
  await assert.rejects(
    readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"),
    (error) => error?.code === "ENOENT",
  );
  assert.equal(git(state.repo, "branch", "--show-current"), state.branch);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("programmatic publication marks a pre-mutation failure as not invoked", async (t) => {
  const state = await scenario(t);
  const saved = JSON.parse(execFileSync(process.execPath, [PUBLISH_SCRIPT,
    "--repo", state.repo, "--expected-head", state.expectedHead, "--save-plan"], { encoding: "utf8" }));
  const options = parseArgs([
    "--repo", state.repo,
    "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256,
  ]);
  await assert.rejects(
    executePublish(options, {
      ...applyDependencies,
      beforeMutation: async () => {
        throw new Error("sandbox network denied before mutation");
      },
    }),
    (error) => error?.mutationInvoked === false
      && /sandbox network denied/.test(error.message),
  );
  await assert.rejects(
    readFile(path.join(state.repo, `${saved.plan_path}.attempt.json`), "utf8"),
    (error) => error?.code === "ENOENT",
  );
});

test("programmatic publication marks plan-load failure as not invoked", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-missing-plan-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = parseArgs([
    "--repo", root,
    "--apply-plan", "workplace/miku-scm/ok-push/missing.json",
    "--expected-plan-sha256", "d".repeat(64),
  ]);
  await assert.rejects(
    executePublish(options, applyDependencies),
    (error) => error?.mutationInvoked === false,
  );
});

test("saved plan rejects a changed local HEAD before push", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  await writeFile(path.join(state.repo, "concurrent.txt"), "changed\n", "utf8");
  git(state.repo, "add", "concurrent.txt");
  git(state.repo, "commit", "-m", "concurrent change");
  await assert.rejects(applySavedPublication(state, saved, applyDependencies), /local HEAD changed/);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("saved plan rejects a dirty worktree before push", async (t) => {
  const state = await scenario(t);
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  await writeFile(path.join(state.repo, "dirty.txt"), "dirty\n", "utf8");

  await assert.rejects(applySavedPublication(state, saved, applyDependencies), /dirty/);
  assert.equal(git(state.remote, "branch", "--list", state.branch), "");
});

test("saved plan publishes on the native platform and verifies the remote", async (t) => {
  const state = await scenario(t);
  const calls = [];
  const realGit = createGitRunner();
  const recordingGit = (cwd, args, options) => {
    calls.push(args);
    return realGit(cwd, args, options);
  };
  const saved = await preparePublicationPlan(state, "--expect-new-remote-branch");
  const result = await applySavedPublication(state, saved, { ...nativeApplyDependencies, git: recordingGit });

  assert.equal(result.status, "published");
  assert.equal(result.platform, nativeApplyDependencies.platform);
  assert.equal(result.push_mode, "new-branch");
  assert.ok(calls.some((args) => args.includes(`--force-with-lease=refs/heads/${state.branch}:`)));
  assert.equal(result.comparison, "0 0");
  assert.equal(result.recommended_tag, "unresolved");
  assert.equal(result.human_handoff, "Create the PR and tag through GitHub.");
  assert.equal(git(state.remote, "rev-parse", `refs/heads/${state.branch}`), state.expectedHead);
  assert.equal(git(state.repo, "branch", "--show-current"), `${state.branch}-done`);
});

