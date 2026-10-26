import test from "node:test";
import assert from "node:assert/strict";
import { lstat, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { runSyncPull, parseArgs } from "../scripts/sync-pull.mjs";
import { context, hash, loadOperation, lock, newId, snapshot, syncGit, writeJson } from "../scripts/miku-scm-sync-state.mjs";
import { fixture } from "./sync-fixture.mjs";

test("sync pull FF preserves staged, unstaged, binary, deletion and untracked work without gh", async (t) => {
  const f = await fixture(t);
  await f.commit("edit.txt", "one\ntwo\n");
  // Establish a verified base by first using a branch exactly at shared base.
  f.git(["switch", "-c", "fresh", "origin/devel"]);
  assert.equal((await runSyncPull(f.options)).status, "up-to-date");
  await f.write("base.txt", "staged\n"); f.git(["add", "base.txt"]);
  await f.write("base.txt", "staged\nunstaged\n");
  f.git(["mv", "rename.txt", "renamed.txt"]); f.git(["rm", "delete.txt"]);
  await f.write("binary.bin", Buffer.from([0, 9, 127, 0]));
  await f.write("new.bin", Buffer.from([0, 1, 255, 8]));
  const before = await snapshot(await context(f.repo));
  const latest = await f.advance();
  let calls = 0;
  const r = await runSyncPull(f.options, { gh: () => { calls++; throw new Error("unexpected gh"); } });
  assert.equal(r.status, "completed", JSON.stringify(r));
  assert.equal(r.method, "fast-forward"); assert.equal(r.head, latest); assert.equal(calls, 0);
  const after = await snapshot(await context(f.repo));
  assert.equal(after.index_digest, before.index_digest); assert.equal(after.working_digest, before.working_digest); assert.equal(after.untracked_digest, before.untracked_digest);
  assert.ok(r.stash_sha); assert.equal(f.git(["rev-parse", r.backup_branch]), before.head);
});

test("sync pull ahead no-op keeps dirty content and does not seed an unknown branch base", async (t) => {
  const f = await fixture(t); await f.commit("own.txt", "own\n"); await f.write("edit.txt", "editing\n");
  const before = await snapshot(await context(f.repo));
  assert.equal((await runSyncPull(f.options)).status, "up-to-date");
  assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
  await f.advance();
  const r = await runSyncPull(f.options);
  assert.equal(r.status, "not-applied"); assert.match(r.reason, /base is unknown/);
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

test("sync pull rejects already-fetched rewritten base using branch provenance", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); await f.commit("own.txt", "mine\n");
  // Replace the shared root, then fetch separately before sync's own fetch.
  syncGit(f.other, ["checkout", "--orphan", "replacement"]); syncGit(f.other, ["rm", "-rf", "."]);
  await f.write("replacement", "new\n", f.other); syncGit(f.other, ["add", "."]); syncGit(f.other, ["commit", "-m", "Replace shared history"]);
  syncGit(f.other, ["push", "--force", "origin", "HEAD:devel"]); f.git(["fetch", "origin"]);
  const before = f.git(["rev-parse", "HEAD"]); const r = await runSyncPull(f.options);
  assert.equal(r.status, "not-applied"); assert.match(r.reason, /history was rewritten/); assert.equal(f.git(["rev-parse", "HEAD"]), before);
});

for (const mode of ["ff", "intermediate-rebase"]) test(`sync pull protects ignored paths in ${mode} trees`, async (t) => {
  const f = await fixture(t); await runSyncPull(f.options);
  if (mode === "intermediate-rebase") {
    // Force-add a temporary ignored path in an own commit, then remove it.
    await f.write("secret.cache", "tracked\n"); f.git(["add", "-f", "secret.cache"]); f.git(["commit", "-m", "Temporary path"]);
    f.git(["rm", "secret.cache"]); f.git(["commit", "-m", "Remove temporary path"]);
    await f.advance();
  } else { await f.write("secret.cache", "remote\n", f.other); syncGit(f.other, ["add", "-f", "secret.cache"]); syncGit(f.other, ["commit", "-m", "Track cache"]); syncGit(f.other, ["push", "origin", "devel"]); }
  await f.write("secret.cache", "private local\n");
  const before = f.git(["rev-parse", "HEAD"]); const r = await runSyncPull(f.options);
  assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.match(r.reason, /Ignored path/); assert.equal(await f.read("secret.cache"), "private local\n"); assert.equal(f.git(["rev-parse", "HEAD"]), before);
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

async function doneFixture(t, response = {}, squash = false) {
  const f = await fixture(t); const own = await f.commit("own.txt", "merged\n");
  syncGit(f.other, ["fetch", f.repo, f.git(["branch", "--show-current"])]);
  syncGit(f.other, squash ? ["merge", "--squash", "FETCH_HEAD"] : ["merge", "--ff-only", "FETCH_HEAD"]);
  if (squash) syncGit(f.other, ["commit", "-m", "Squash PR"]);
  syncGit(f.other, ["push", "origin", "devel"]);
  const merged = syncGit(f.other, ["rev-parse", "HEAD"]).out;
  f.git(["branch", "-m", `${f.git(["branch", "--show-current"])}-done`]);
  const calls = [];
  const pull = { number: 7, state: "closed", merged: true, merged_at: "2026-10-26T00:00:00Z", merge_commit_sha: merged, head: { ref: "devel-tiga1026aaa", sha: own, repo: { full_name: "owner/repo" } }, base: { ref: "devel", repo: { full_name: "owner/repo" } }, ...response };
  const dependencies = { now: () => new Date("2026-10-26T03:45:00Z"), git: (cwd, args, options) => args[0] === "remote" && args[1] === "get-url" ? { ...syncGit(cwd, args, options), out: "https://github.com/owner/repo.git" } : syncGit(cwd, args, options), gh: (cwd, args, options) => { calls.push({ args, options }); return { ok: true, stdout: JSON.stringify(args[3].endsWith("/7") ? pull : [pull]) }; } };
  return { ...f, dependencies, calls, pull };
}

test("sync pull done verifies exact PR and carries staged work to one new branch", async (t) => {
  const f = await doneFixture(t); const latest = await f.advance();
  await f.write("carry.txt", "stage\n"); f.git(["add", "carry.txt"]); await f.write("carry.txt", "stage\nunstaged\n");
  const r = await runSyncPull(f.options, f.dependencies);
  assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(r.method, "next-work"); assert.equal(r.head, latest); assert.equal(r.final_branch, "devel-tiga1026mef");
  assert.equal(await f.read("carry.txt"), "stage\nunstaged\n"); assert.equal(f.git(["show", ":carry.txt"]), "stage");
  assert.equal(f.calls.length, 2); assert.equal(f.calls[0].options.timeout, 15000); assert.deepEqual(f.calls[1].args, ["api", "--method", "GET", "repos/owner/repo/pulls/7"]);
  assert.deepEqual(f.calls[0].args, ["api", "--method", "GET", "repos/owner/repo/pulls", "-f", "state=all", "-f", "head=owner:devel-tiga1026aaa", "-f", "base=devel", "-f", "per_page=100"]);
  f.git(["stash", "push", "--include-untracked"]); f.git(["switch", r.previous_branch]);
  const again = await runSyncPull(f.options, f.dependencies); assert.equal(again.status, "not-applied"); assert.match(again.reason, /already has a next-work transition/);
});

for (const bad of [{ merged: false }, { state: "open" }, { head: { ref: "wrong" } }, { merge_commit_sha: "0".repeat(40) }]) test(`sync pull done blocks unverifiable merge ${JSON.stringify(bad)}`, async (t) => {
  const f = await doneFixture(t, bad); await f.write("carry.txt", "untouched\n"); const before = await snapshot(await context(f.repo));
  const r = await runSyncPull(f.options, f.dependencies); assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal(r.stash_sha, null); assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("sync locks exclude sibling worktrees and do not linger after prepare-like release", async (t) => {
  const f = await fixture(t); const sibling = path.join(f.directory, "sibling"); f.git(["worktree", "add", "-b", "sibling", sibling, "origin/devel"]);
  const ctx = await context(f.repo); const siblingContext = await context(sibling); const id = newId(); const release = await lock(ctx, id);
  await assert.rejects(lock(siblingContext, newId()), /Another sync holds/); await release(); const other = await lock(siblingContext, newId()); await other();
});

test("sync pull parser rejects command passthrough and ambiguous recovery", () => {
  assert.throws(() => parseArgs(["--apply", "--exec", "anything"]), /Unknown/);
  assert.throws(() => parseArgs(["--apply", "--resume", "x", "--base", "devel"]), /saved remote/);
});

test("sync pull squash merge uses the merge result rather than PR head ancestry", async (t) => {
  const f = await doneFixture(t, {}, true);
  assert.equal(syncGit(f.repo, ["merge-base", "--is-ancestor", f.pull.head.sha, f.pull.merge_commit_sha], { allowFailure: true }).ok, false);
  const r = await runSyncPull(f.options, f.dependencies); assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(r.head, f.pull.merge_commit_sha);
});

for (const kind of ["limit", "multiple", "invalid-json", "api-failure"]) test(`sync pull done rejects ${kind} PR evidence before stash`, async (t) => {
  const f = await doneFixture(t); await f.write("carry.txt", "preserve\n");
  const dependencies = { ...f.dependencies, gh: () => kind === "api-failure" ? { ok: false, stdout: "" } : { ok: true, stdout: kind === "invalid-json" ? "{" : JSON.stringify(Array(kind === "limit" ? 100 : 2).fill(f.pull)) } };
  const before = await snapshot(await context(f.repo)); const r = await runSyncPull(f.options, dependencies);
  assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal((await snapshot(await context(f.repo))).digest, before.digest); assert.equal(r.stash_sha, null);
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

test("sync pull same-count edits during inspection stop before work mutation", async (t) => {
  const f = await fixture(t); await f.write("edit.txt", "111\n"); await f.advance();
  const r = await runSyncPull(f.options, { beforeAction: async (phase) => { if (phase === "pre-mutation") await f.write("edit.txt", "222\n"); } });
  assert.equal(r.status, "not-applied"); assert.match(r.reason, /content changed/); assert.equal(await f.read("edit.txt"), "222\n"); assert.equal(r.backup_branch, null);
});

test("sync pull migrates an exact previous next-work receipt", async (t) => {
  const f = await fixture(t); const base = f.git(["rev-parse", "HEAD"]); const current = f.git(["branch", "--show-current"]);
  await writeJson(path.join(f.repo, "workplace/miku-scm/runs/legacy/plan.json"), { repository: f.repo });
  await writeJson(path.join(f.repo, "workplace/miku-scm/runs/legacy/result.json"), { workflow: "repository.post-merge.next-work", status: "success", result: { next_branch: current, remote: "origin", base: "devel", base_commit: base } });
  await f.commit("own.txt", "own\n"); await f.advance(); const r = await runSyncPull(f.options); assert.equal(r.status, "completed", JSON.stringify(r)); assert.equal(r.method, "rebase");
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
