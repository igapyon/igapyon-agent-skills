import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  parseArgs,
  runRecommit,
} from "../scripts/pr-soft-reset-recommit-preflight.mjs";

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function scenario(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-recommit-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, "init");
  git(root, "config", "user.name", "Test User");
  git(root, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  await writeFile(path.join(root, "base.txt"), "base\n", "utf8");
  git(root, "add", ".gitignore", "base.txt");
  git(root, "commit", "-m", "base");
  git(root, "branch", "-M", "devel");
  git(root, "switch", "-c", "devel-tiga0727weg");
  await writeFile(path.join(root, "feature.txt"), "feature\n", "utf8");
  git(root, "add", "feature.txt");
  git(root, "commit", "-m", "feature");
  const oldHead = git(root, "rev-parse", "HEAD");
  const draft = "workplace/miku-scm/pr-drafts/pr-devel-tiga0727weg-202607272300.md";
  await mkdir(path.join(root, path.dirname(draft)), { recursive: true });
  await writeFile(path.join(root, draft), "Runner-based recommit\n\nBody\n", "utf8");
  return { root, draft, oldHead };
}

test("recommit workflow preserves preflight and mutation safety", async (t) => {
  const state = await scenario(t);
  const dependencies = {
    now: () => new Date("2026-07-27T23:00:00+09:00"),
  };

  await t.test("preflight is structured and does not mutate history", () => {
    const result = runRecommit(parseArgs([
      "--repo", state.root,
      "--base", "devel",
      "--pr-draft", state.draft,
    ]), dependencies);
    assert.equal(result.status, "preflight-ok");
    assert.equal(result.readonly, true);
    assert.equal(result.commits_to_collapse, 1);
    assert.match(result.pr_draft_sha256, /^[0-9a-f]{64}$/);
    assert.equal(result.backup_branch, "backup/2026-07-27-2300");
    assert.equal(git(state.root, "rev-parse", "HEAD"), state.oldHead);
    assert.equal(git(state.root, "branch", "--list", "backup/*"), "");
  });

  await t.test("missing draft is reported before any local mutation", () => {
    assert.throws(
      () => runRecommit(parseArgs([
        "--repo", state.root,
        "--base", "devel",
        "--pr-draft", "workplace/miku-scm/pr-drafts/missing.md",
        "--apply",
      ]), dependencies),
      (error) => error?.mutationInvoked === false && /PR draft/.test(error.message),
    );
    assert.equal(git(state.root, "branch", "--list", "backup/*"), "");
  });

  await t.test("outside draft is rejected before any local mutation", async () => {
    const outside = path.join(path.dirname(state.root), "outside-pr-draft.md");
    await writeFile(outside, "Outside\n", "utf8");
    t.after(() => rm(outside, { force: true }));
    assert.throws(
      () => runRecommit(parseArgs([
        "--repo", state.root,
        "--base", "devel",
        "--pr-draft", outside,
        "--apply",
      ]), dependencies),
      (error) => error?.mutationInvoked === false
        && /inside the repository/.test(error.message),
    );
    assert.equal(git(state.root, "branch", "--list", "backup/*"), "");
  });

  await t.test("apply creates backup then rebuilds the reviewed commit", () => {
    const result = runRecommit(parseArgs([
      "--repo", state.root,
      "--base", "devel",
      "--pr-draft", state.draft,
      "--apply",
    ]), dependencies);
    assert.equal(result.status, "recommitted");
    assert.equal(result.mutation_invoked, true);
    assert.equal(git(state.root, "rev-parse", "backup/2026-07-27-2300"), state.oldHead);
    assert.equal(git(state.root, "log", "-1", "--format=%s"), "Runner-based recommit");
    assert.equal(git(state.root, "status", "--porcelain"), "");
  });

  await t.test("backup verification stops before reset when the backup no longer resolves to old HEAD", () => {
    const runGit = (cwd, argumentsValue, options = {}) => {
      const result = spawnSync("git", argumentsValue, {
        cwd,
        encoding: "utf8",
        input: options.input,
      });
      if (argumentsValue[0] === "rev-parse" && argumentsValue[1] === "backup/2026-07-27-2300-2") {
        return { ok: true, stdout: "0".repeat(40), stderr: "" };
      }
      if (result.status !== 0 && !options.allowFailure) {
        throw new Error((result.stderr || result.stdout || "").trim());
      }
      return {
        ok: result.status === 0,
        stdout: (result.stdout || "").trimEnd(),
        stderr: (result.stderr || "").trimEnd(),
      };
    };
    const before = git(state.root, "rev-parse", "HEAD");
    assert.throws(
      () => runRecommit(parseArgs([
        "--repo", state.root,
        "--base", "devel",
        "--pr-draft", state.draft,
        "--apply",
      ]), { ...dependencies, git: runGit }),
      (error) => error?.mutationInvoked === true && /Backup branch does not point/.test(error.message),
    );
    assert.equal(git(state.root, "rev-parse", "HEAD"), before);
  });
});
