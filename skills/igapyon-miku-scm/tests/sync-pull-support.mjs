// Shared test support; importing this module registers no tests.
import assert from "node:assert/strict";
import { lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { runSyncPull, parseArgs } from "../scripts/sync-pull.mjs";
import { renderHumanOutput } from "../scripts/miku-scm-human-output.mjs";
import { context, hash, loadOperation, lock, newId, snapshot, syncGit, writeJson } from "../scripts/miku-scm-sync-state.mjs";
import { guardIgnored } from "../scripts/miku-scm-sync-worktree.mjs";
import { fixture } from "./sync-fixture.mjs";

export async function doneFixture(t, response = {}, squash = false, host = "github.com") {
  const f = await fixture(t); const own = await f.commit("own.txt", "merged\n");
  syncGit(f.other, ["fetch", f.repo, f.git(["branch", "--show-current"])]);
  syncGit(f.other, squash ? ["merge", "--squash", "FETCH_HEAD"] : ["merge", "--ff-only", "FETCH_HEAD"]);
  if (squash) syncGit(f.other, ["commit", "-m", "Squash PR"]);
  syncGit(f.other, ["push", "origin", "devel"]);
  const merged = syncGit(f.other, ["rev-parse", "HEAD"]).out;
  f.git(["branch", "-m", `${f.git(["branch", "--show-current"])}-done`]);
  const calls = [];
  const pull = { number: 7, state: "closed", merged: true, merged_at: "2026-10-26T00:00:00Z", merge_commit_sha: merged, head: { ref: "devel-tiga1026aaa", sha: own, repo: { full_name: "owner/repo" } }, base: { ref: "devel", repo: { full_name: "owner/repo" } }, ...response };
  const dependencies = { now: () => new Date("2026-10-26T03:45:00Z"), git: (cwd, args, options) => args[0] === "remote" && args[1] === "get-url" ? { ...syncGit(cwd, args, options), out: `https://${host}/owner/repo.git` } : syncGit(cwd, args, options), gh: (cwd, args, options) => { calls.push({ args, options }); return { ok: true, stdout: JSON.stringify(args[3].endsWith("/7") ? pull : [pull]) }; } };
  return { ...f, dependencies, calls, pull };
}


export function withoutGh(f, fetch) {
  let attempts = 0;
  return {
    ...f.dependencies, fetch,
    gh: () => { attempts++; return { ok: false, error: { code: "ENOENT" } }; },
    attempts: () => attempts,
  };
}
