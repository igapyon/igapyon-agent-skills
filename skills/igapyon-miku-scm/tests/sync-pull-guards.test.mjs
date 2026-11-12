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

test("sync pull bounds repeated ignore checks while retaining untracked carryover", async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 100; i++) await f.write(`incoming/file-${i}.txt`, "shared\n", f.other);
  syncGit(f.other, ["add", "."]);
  syncGit(f.other, ["commit", "-m", "Incoming files"]);
  syncGit(f.other, ["push", "origin", "devel"]);
  await f.write("incoming/local.txt", "private work\n");
  let count = 0;
  const r = await runSyncPull(f.options, { git: (cwd, args, options) => {
    if (args[0] === "check-ignore" && args.includes("--no-index")) count++;
    return syncGit(cwd, args, options);
  } });
  assert.equal(r.status, "completed", JSON.stringify(r));
  assert.equal(count, 1);
  assert.equal(await f.read("incoming/local.txt"), "private work\n");
  assert.equal(await f.read("incoming/file-99.txt"), "shared\n");
});

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

test("sync pull continues with local exclusion when no ignore rule was prepared", async (t) => {
  const f = await fixture(t);
  await f.write(".gitignore", "ignored/\n*.cache\n");
  const result = await runSyncPull(f.options);
  assert.equal(result.status, "up-to-date", JSON.stringify(result));
  assert.equal(result.warnings.length, 1);
  assert.equal(f.git(["status", "--porcelain", "--", "workplace/miku-scm"]), "");
  assert.equal(await f.read(".gitignore"), "ignored/\n*.cache\n");
  await f.advance();
  const integrated = await runSyncPull(f.options);
  assert.equal(integrated.status, "completed", JSON.stringify(integrated));
  assert.equal(integrated.method, "fast-forward");
  assert.equal(await f.read(".gitignore"), "ignored/\n*.cache\n");
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

test("sync pull allows tracked descendants under an ignored directory and protects ignored additions", async (t) => {
  const f = await fixture(t);
  await f.write(".gitignore", "workplace/\nignored/\n*.cache\n/blanco/main/\n");
  await f.write("blanco/main/Tracked.java", "generated source\n");
  f.git(["add", ".gitignore"]);
  f.git(["add", "-f", "blanco/main/Tracked.java"]);
  f.git(["commit", "-m", "Track generated source"]);
  f.git(["push", "origin", "HEAD:devel"]);
  f.git(["fetch", "origin"]);
  f.git(["reset", "--hard", "origin/devel"]);
  syncGit(f.other, ["fetch", "origin"]);
  syncGit(f.other, ["reset", "--hard", "origin/devel"]);

  assert.equal((await runSyncPull(f.options)).status, "up-to-date");
  const latest = await f.advance();
  const integrated = await runSyncPull(f.options);
  assert.equal(integrated.status, "completed", JSON.stringify(integrated));
  assert.equal(integrated.method, "fast-forward");
  assert.equal(integrated.head, latest);
  assert.equal(await f.read("blanco/main/Tracked.java"), "generated source\n");

  await f.write("blanco/main/New.cache", "upstream\n", f.other);
  syncGit(f.other, ["add", "-f", "blanco/main/New.cache"]);
  syncGit(f.other, ["commit", "-m", "Add generated cache path"]);
  syncGit(f.other, ["push", "origin", "devel"]);
  await f.write("blanco/main/New.cache", "private local\n");
  const before = f.git(["rev-parse", "HEAD"]);
  const blocked = await runSyncPull(f.options);
  assert.equal(blocked.status, "not-applied", JSON.stringify(blocked));
  assert.match(blocked.reason, /Ignored path/);
  assert.equal(await f.read("blanco/main/New.cache"), "private local\n");
  assert.equal(f.git(["rev-parse", "HEAD"]), before);
});

for (const kind of ["file", "symlink"]) test(`sync pull protects an ignored ${kind} replacing a tracked directory`, async (t) => {
  const f = await fixture(t);
  await f.write(".gitignore", "workplace/\nignored/\n*.cache\n/generated\n");
  await f.write("generated/Tracked.java", "tracked source\n");
  f.git(["add", ".gitignore"]);
  f.git(["add", "-f", "generated/Tracked.java"]);
  f.git(["commit", "-m", "Track generated source"]);
  await rm(path.join(f.repo, "generated"), { recursive: true });
  if (kind === "symlink") {
    const target = path.join(f.directory, "private-target");
    await writeFile(target, "private local\n");
    try { await symlink(target, path.join(f.repo, "generated")); }
    catch (error) { if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) { t.skip("Symlinks are unavailable"); return; } throw error; }
  } else await f.write("generated", "private local\n");
  const before = f.git(["rev-parse", "HEAD"]);
  await assert.rejects(guardIgnored(await context(f.repo), [before]), /Ignored path/);
  assert.equal(await f.read("generated"), "private local\n");
  assert.equal((await lstat(path.join(f.repo, "generated"))).isSymbolicLink(), kind === "symlink");
  assert.equal(f.git(["rev-parse", "HEAD"]), before);
});

test("sync pull checks many remote aliases with one bounded ancestry query", async (t) => {
  const f = await fixture(t);
  await runSyncPull(f.options);
  await f.commit("own.txt", "first\n");
  const replayed = await f.commit("second.txt", "second\n");
  for (let index = 0; index < 100; index++) f.git(["update-ref", `refs/remotes/origin/alias-${index}`, replayed]);
  await f.advance();
  let ancestryQueries = 0;
  const result = await runSyncPull(f.options, { git: (cwd, args, options) => {
    if (args[0] === "rev-list" && args.includes("--stdin")) ancestryQueries++;
    return syncGit(cwd, args, options);
  } });
  assert.equal(result.status, "not-applied", JSON.stringify(result));
  assert.match(result.reason, /already shared on a fetched remote ref/);
  assert.equal(result.backup_branch, null);
  assert.equal(ancestryQueries, 1);
});

test("sync pull keeps unresolved publication receipts in the batched history guard", async (t) => {
  const f = await fixture(t);
  await runSyncPull(f.options);
  await f.commit("own.txt", "published candidate\n");
  const reviewed = f.git(["rev-parse", "HEAD"]);
  const branch = f.git(["branch", "--show-current"]);
  const receiptDirectory = path.join(f.repo, "workplace/miku-scm/ok-push");
  await mkdir(receiptDirectory, { recursive: true });
  await writeFile(path.join(receiptDirectory, "unresolved.json"), JSON.stringify({ branch, reviewed_head: reviewed }));
  await writeFile(path.join(receiptDirectory, "unresolved.json.attempt.json"), JSON.stringify({ status: "unresolved" }));
  await f.advance();
  let ancestryQueries = 0;
  const result = await runSyncPull(f.options, { git: (cwd, args, options) => {
    if (args[0] === "rev-list" && args.includes("--stdin")) ancestryQueries++;
    return syncGit(cwd, args, options);
  } });
  assert.equal(result.status, "not-applied", JSON.stringify(result));
  assert.match(result.reason, /receipt or unresolved attempt/);
  assert.equal(result.backup_branch, null);
  assert.equal(ancestryQueries, 2);
});

test("sync pull stops before backup when batched history output is malformed", async (t) => {
  const f = await fixture(t);
  await runSyncPull(f.options);
  await f.commit("own.txt", "unpublished\n");
  await f.advance();
  const result = await runSyncPull(f.options, { git: (cwd, args, options) => {
    if (args[0] === "rev-list" && args.includes("--stdin")) return { ok: true, out: "not-a-full-oid", stdout: "not-a-full-oid", err: "" };
    return syncGit(cwd, args, options);
  } });
  assert.equal(result.status, "not-applied", JSON.stringify(result));
  assert.match(result.reason, /malformed commit SHA/);
  assert.equal(result.backup_branch, null);
  assert.equal(f.git(["status", "--porcelain"]), "");
});

test("sync pull on a normal branch uses neither gh nor anonymous PR reads", async (t) => {
  const f = await fixture(t); await f.advance();
  const unexpected = () => { throw new Error("unexpected PR read"); };
  const result = await runSyncPull(f.options, { gh: unexpected, fetch: unexpected });
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.method, "fast-forward");
});

test("sync pull honors narrowed and negative fetch refspecs without fetching excluded branches", async (t) => {
  for (const mode of ["narrow", "negative"]) {
    const f = await fixture(t);
    syncGit(f.other, ["push", "origin", "HEAD:excluded"]);
    await f.advance();
    if (mode === "narrow") f.git(["config", "remote.origin.fetch", "+refs/heads/devel:refs/remotes/origin/devel"]);
    else f.git(["config", "--add", "remote.origin.fetch", "^refs/heads/excluded"]);
    const result = await runSyncPull(f.options);
    assert.equal(result.status, "completed", JSON.stringify(result));
    assert.equal(syncGit(f.repo, ["show-ref", "--verify", "--quiet", "refs/remotes/origin/excluded"], { allowFailure: true }).ok, false);
  }
});

test("sync pull honors default tag following and an explicit no-tags setting", async (t) => {
  for (const noTags of [false, true]) {
    const f = await fixture(t);
    await f.advance(); syncGit(f.other, ["tag", "v-new-release"]); syncGit(f.other, ["push", "origin", "refs/tags/v-new-release"]);
    if (noTags) f.git(["config", "remote.origin.tagOpt", "--no-tags"]);
    const result = await runSyncPull(f.options);
    assert.equal(result.status, "completed", JSON.stringify(result));
    assert.equal(syncGit(f.repo, ["show-ref", "--verify", "--quiet", "refs/tags/v-new-release"], { allowFailure: true }).ok, !noTags);
  }
});

test("sync pull with incomplete fetch coverage stops unpublished replay before backup", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options);
  f.git(["config", "remote.origin.fetch", "+refs/heads/devel:refs/remotes/origin/devel"]);
  await f.commit("own.txt", "shared elsewhere\n"); f.git(["push", "origin", "HEAD:hidden"]);
  await f.write("carry.txt", "pending\n"); const before = await snapshot(await context(f.repo)); await f.advance();
  const result = await runSyncPull(f.options);
  assert.equal(result.status, "not-applied", JSON.stringify(result));
  assert.match(result.reason, /complete publication evidence/); assert.equal(result.backup_branch, null);
  assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
  assert.equal(syncGit(f.repo, ["show-ref", "--verify", "--quiet", "refs/remotes/origin/hidden"], { allowFailure: true }).ok, false);
});

test("sync pull rejects an excluded base before fetching or changing work", async (t) => {
  const f = await fixture(t); await f.write("carry.txt", "pending\n"); await f.advance();
  f.git(["config", "--add", "remote.origin.fetch", "^refs/heads/devel"]);
  const before = await snapshot(await context(f.repo)); const calls = [];
  const result = await runSyncPull(f.options, { git: (cwd, args, options) => { calls.push(args); return syncGit(cwd, args, options); } });
  assert.equal(result.status, "not-applied", JSON.stringify(result)); assert.match(result.reason, /Configured fetch does not update/);
  assert.ok(!calls.some((args) => args[0] === "fetch")); assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("sync locks exclude sibling worktrees and do not linger after prepare-like release", async (t) => {
  const f = await fixture(t); const sibling = path.join(f.directory, "sibling"); f.git(["worktree", "add", "-b", "sibling", sibling, "origin/devel"]);
  const ctx = await context(f.repo); const siblingContext = await context(sibling); const id = newId(); const release = await lock(ctx, id);
  await assert.rejects(lock(siblingContext, newId()), /Another sync holds/); await release(); const other = await lock(siblingContext, newId()); await other();
});

test("sync pull parser rejects command passthrough and ambiguous recovery", () => {
  assert.throws(() => parseArgs(["--apply", "--exec", "anything"]), /Unknown/);
  assert.throws(() => parseArgs(["--apply", "--resume", "x", "--base", "devel"]), /saved remote/);
  assert.throws(() => parseArgs(["--apply", "--resolved-next-work"]), /requires --resume/);
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

