// Shared test support; importing this module registers no tests.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

export const PUBLISH_SCRIPT = fileURLToPath(new URL("../scripts/post-recommit-publish.mjs", import.meta.url));


export function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}


export function recordedGit(calls) {
  return (cwd, args, allowFailure = false) => {
    calls.push(args);
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    const output = { ok: result.status === 0, out: (result.stdout || "").trim(), err: (result.stderr || "").trim() };
    if (!output.ok && !allowFailure) throw new Error(`git ${args.join(" ")} failed: ${output.err || output.out}`);
    return output;
  };
}


export const NEXT_WORK_DATE = new Date("2026-07-25T08:45:00+09:00");


export async function mergedScenario(t) {
  const state = await scenario(t);
  git(state.repo, "push", "origin", "HEAD:devel");
  git(state.repo, "branch", "-m", `${state.branch}-done`);
  return state;
}


export function nextWorkOptions(state) {
  return { repo: state.repo, remote: "origin", base: "devel", confirmedMerged: true, apply: true };
}


export async function scenario(t, { existingRemoteBranch = false } = {}) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-publish-test-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const remote = path.join(temporary, "remote.git");
  const repo = path.join(temporary, "repo");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["init", repo], { stdio: "ignore" });
  git(repo, "config", "core.autocrlf", "false");
  git(repo, "config", "user.name", "Test User");
  git(repo, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(repo, "README.md"), "base\n", "utf8");
  await writeFile(path.join(repo, ".gitignore"), "workplace/\n", "utf8");
  await writeFile(path.join(repo, "pom.xml"), "<project><version>1.20260725.3</version></project>\n", "utf8");
  git(repo, "add", "README.md", ".gitignore", "pom.xml");
  git(repo, "commit", "-m", "base");
  git(repo, "branch", "-M", "devel");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-u", "origin", "devel");
  const branch = "devel-tiga0721kaa";
  git(repo, "switch", "-c", branch);
  await writeFile(path.join(repo, "feature.txt"), "first\n", "utf8");
  git(repo, "add", "feature.txt");
  git(repo, "commit", "-m", "feature");

  let expectedRemoteHead = "";
  if (existingRemoteBranch) {
    git(repo, "push", "-u", "origin", `HEAD:refs/heads/${branch}`);
    expectedRemoteHead = git(repo, "rev-parse", "HEAD");
    await writeFile(path.join(repo, "feature.txt"), "recommitted\n", "utf8");
    git(repo, "add", "feature.txt");
    git(repo, "commit", "--amend", "-m", "feature recommitted");
  }

  return {
    temporary,
    remote,
    repo,
    branch,
    expectedHead: git(repo, "rev-parse", "HEAD"),
    expectedRemoteHead,
  };
}


export function optionsFor(state, ...extra) {
  return parseArgs([
    "--repo",
    state.repo,
    "--expected-head",
    state.expectedHead,
    ...extra,
  ]);
}


export async function preparePublicationPlan(state, ...preflightArguments) {
  const preflight = await runPublish(optionsFor(state, ...preflightArguments), { gh: null });
  return savePublicationPlan(state.repo, preflight);
}


export function applySavedPublication(state, saved, dependencies = { gh: null }) {
  return executePublish(parseArgs(["--repo", state.repo, "--apply-plan", saved.plan_path,
    "--expected-plan-sha256", saved.plan_sha256]), dependencies);
}


export const applyDependencies = { platform: "darwin", fetchImpl: null };

export const windowsApplyDependencies = { platform: "win32", gh: null };

export const nativeApplyDependencies = {
  platform: process.platform,
  gh: null,
};
