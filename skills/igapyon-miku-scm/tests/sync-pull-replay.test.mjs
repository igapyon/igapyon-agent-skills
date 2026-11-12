import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { runSyncPull, parseArgs } from "../scripts/sync-pull.mjs";
import { renderHumanOutput } from "../scripts/miku-scm-human-output.mjs";
import { context, hash, loadOperation, lock, newId, snapshot, syncGit, writeJson } from "../scripts/miku-scm-sync-state.mjs";
import { guardIgnored } from "../scripts/miku-scm-sync-worktree.mjs";
import { fixture } from "./sync-fixture.mjs";

import { doneFixture, withoutGh } from "./sync-pull-support.mjs";

test("sync pull batches distinct untracked collisions and retains exact recovery data", async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 100; i++) await f.write(`incoming/file-${i}.txt`, "upstream\n", f.other);
  syncGit(f.other, ["add", "."]);
  syncGit(f.other, ["commit", "-m", "Incoming collision files"]);
  syncGit(f.other, ["push", "origin", "devel"]);
  for (let i = 0; i < 100; i++) await f.write(`incoming/file-${i}.txt`, `private-${i}\n`);
  const originalHead = f.git(["rev-parse", "HEAD"]);
  let calls = 0;
  let input = "";
  const result = await runSyncPull(f.options, { git: (cwd, args, options) => {
    if (args[0] === "check-ignore" && args.includes("--stdin")) {
      calls++;
      input = options.input;
    }
    return syncGit(cwd, args, options);
  } });
  assert.equal(result.status, "partial", JSON.stringify(result));
  assert.equal(calls, 1);
  const checked = input.slice(0, -1).split("\0");
  assert.equal(checked.length, 101);
  assert.equal(new Set(checked).size, checked.length);
  assert.ok(checked.includes("incoming/file-99.txt"));
  assert.ok(result.stash_sha);
  assert.equal(f.git(["rev-parse", result.backup_branch]), originalHead);
  assert.ok(f.git(["stash", "list", "--format=%H"]).split("\n").includes(result.stash_sha));
  assert.equal(f.git(["show", `${result.stash_sha}^3:incoming/file-0.txt`]), "private-0");
});

test("sync pull replays only unpublished work from the independently recorded base", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options);
  const original = await f.commit("own.txt", "one\n"); await f.commit("second.txt", "two\n");
  const oldHead = f.git(["rev-parse", "HEAD"]); const base = await f.advance();
  f.git(["config", "rebase.updateRefs", "true"]); f.git(["branch", "other-local", oldHead]);
  const r = await runSyncPull(f.options);
  assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(r.method, "rebase");
  assert.equal(f.git(["rev-list", "--count", `${base}..HEAD`]), "2");
  assert.equal(f.git(["rev-parse", "other-local"]), oldHead); assert.equal(f.git(["rev-parse", r.backup_branch]), oldHead); assert.notEqual(r.head, original);
});

test("sync pull rebase conflict abort restores exact staged and unstaged carryover", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); await f.commit("base.txt", "own conflict\n");
  await f.write("carry.txt", "stage\n"); f.git(["add", "carry.txt"]); await f.write("carry.txt", "stage\nedit\n");
  const before = await snapshot(await context(f.repo)); await f.advance("base.txt", "remote conflict\n");
  const r = await runSyncPull(f.options); assert.equal(r.status, "partial", JSON.stringify(r));
  const aborted = await runSyncPull({ repo: f.repo, abort: r.operation_id, apply: true });
  assert.equal(aborted.status, "aborted", JSON.stringify(aborted)); assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("sync pull rebase conflict resume continues the same operation without new stash or fetch", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); await f.commit("base.txt", "own conflict\n"); await f.advance("base.txt", "remote conflict\n");
  const r = await runSyncPull(f.options); assert.equal(r.status, "partial");
  await f.write("base.txt", "resolved\n"); f.git(["add", "base.txt"]);
  const commands = [];
  const resumed = await runSyncPull({ repo: f.repo, resume: r.operation_id, apply: true }, { git: (cwd, args, options) => { commands.push(args[0]); return syncGit(cwd, args, options); } });
  assert.equal(resumed.status, "completed", JSON.stringify(resumed)); assert.equal(await f.read("base.txt"), "resolved\n"); assert.equal(commands.includes("fetch"), false); assert.equal(commands.includes("stash"), false);
});

test("sync pull identical patch stops rather than dropping it and supports explicit empty keep", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); await f.commit("same.txt", "same\n"); await f.advance("same.txt", "same\n");
  const r = await runSyncPull(f.options); assert.equal(r.status, "partial", JSON.stringify(r));
  const noChoice = await runSyncPull({ repo: f.repo, resume: r.operation_id, apply: true }); assert.match(noChoice.reason, /explicitly choose/);
  const kept = await runSyncPull({ repo: f.repo, resume: r.operation_id, empty: "keep", apply: true });
  assert.equal(kept.status, "completed", JSON.stringify(kept)); assert.equal(f.git(["rev-list", "--count", "origin/devel..HEAD"]), "1");
});

test("sync pull refuses shared commits and local merges before backup", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); await f.commit("own.txt", "own\n"); f.git(["push", "origin", "HEAD"]); await f.advance();
  const r = await runSyncPull(f.options); assert.equal(r.status, "not-applied"); assert.match(r.reason, /Published work/); assert.equal(r.backup_branch, null);
});

test("sync pull retains originally empty commits and supports explicit empty drop", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); f.git(["commit", "--allow-empty", "-m", "Keep this marker"]); await f.advance();
  const r = await runSyncPull(f.options); assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(f.git(["rev-list", "--count", "origin/devel..HEAD"]), "1");
  await f.commit("identical.txt", "same\n"); await f.advance("identical.txt", "same\n");
  const stopped = await runSyncPull(f.options); assert.equal(stopped.status, "partial");
  const dropped = await runSyncPull({ repo: f.repo, resume: stopped.operation_id, empty: "drop", apply: true }); assert.equal(dropped.status, "completed", JSON.stringify(dropped));
  assert.equal(f.git(["rev-list", "--count", "origin/devel..HEAD"]), "1");
});

test("sync pull stash conflicts never reapply and require explicit resolved carryover", async (t) => {
  const f = await fixture(t); await f.write("base.txt", "local pending\n"); await f.advance("base.txt", "remote edit\n");
  const r = await runSyncPull(f.options); assert.equal(r.status, "partial", JSON.stringify(r)); assert.ok(r.stash_sha);
  const abort = await runSyncPull({ repo: f.repo, abort: r.operation_id, apply: true }); assert.match(abort.reason, /Restoration has started/);
  const noAck = await runSyncPull({ repo: f.repo, resume: r.operation_id, apply: true }); assert.match(noAck.reason, /resolved-carryover/);
  await f.write("base.txt", "resolved pending\n"); f.git(["add", "base.txt"]);
  const commands = [];
  const resumed = await runSyncPull({ repo: f.repo, resume: r.operation_id, resolvedCarryover: true, apply: true }, { git: (cwd, args, options) => { commands.push(args); return syncGit(cwd, args, options); } });
  assert.equal(resumed.status, "completed", JSON.stringify(resumed)); assert.equal(commands.some((args) => args.includes("stash") && args.includes("apply")), false); assert.equal(await f.read("base.txt"), "resolved pending\n");
});

for (const carry of ["commit", "index", "worktree"]) test(`sync pull directory rename cannot overwrite ignored contents during ${carry} integration`, async (t) => {
  const f = await fixture(t); await f.commit("old/file.txt", "seed\n"); f.git(["push", "origin", "HEAD:devel"]);
  syncGit(f.other, ["fetch", "origin"]); syncGit(f.other, ["reset", "--hard", "origin/devel"]);
  await runSyncPull(f.options);
  await f.write("old/hidden.cache", "own tracked\n"); f.git(["add", "-f", "old/hidden.cache"]);
  if (carry === "commit" || carry === "worktree") f.git(["commit", "-m", "Own tracked file"]);
  if (carry === "worktree") await f.write("old/hidden.cache", "own pending\n");
  syncGit(f.other, ["mv", "old", "new"]); syncGit(f.other, ["commit", "-m", "Rename directory"]); syncGit(f.other, ["push", "origin", "devel"]);
  await f.write("new/hidden.cache", "private ignored\n");
  const r = await runSyncPull(f.options);
  assert.equal(await f.read("new/hidden.cache"), "private ignored\n", JSON.stringify(r));
  assert.ok(["completed", "partial"].includes(r.status), JSON.stringify(r));
  if (r.status === "completed") assert.equal(await f.read("old/hidden.cache"), carry === "worktree" ? "own pending\n" : "own tracked\n");
});
