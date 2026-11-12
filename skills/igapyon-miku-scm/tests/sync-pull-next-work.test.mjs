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

test("human-confirmed sync pull on private GHE retains staged, unstaged and untracked work", async (t) => {
  const f = await doneFixture(t, {}, true, "ghe.example.test:8443");
  await f.write("carry.txt", "staged\n"); f.git(["add", "carry.txt"]);
  await f.write("carry.txt", "staged\nunstaged\n"); await f.write("untracked.txt", "new\n");
  const before = await snapshot(await context(f.repo));
  const dependencies = withoutGh(f, async () => new Response("", { status: 404 }));
  const pending = await runSyncPull(f.options, dependencies);
  assert.equal(pending.confirmation_required, true);
  assert.equal(pending.mutation_invoked, false);
  assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
  assert.equal(pending.merge_confirmation.repository, "ghe.example.test:8443/owner/repo");
  const latest = await f.advance();
  const noPr = () => { throw new Error("Confirmation must not require PR access"); };
  const confirmed = await runSyncPull({ repo: f.repo, apply: true, confirmMerged: pending.operation_id }, { ...dependencies, gh: noPr, fetch: noPr });
  assert.equal(confirmed.status, "completed", JSON.stringify(confirmed));
  assert.equal(confirmed.head, latest);
  assert.equal(confirmed.merge_verification.source, "human");
  assert.equal(f.git(["show", ":carry.txt"]), "staged");
  assert.equal(await f.read("carry.txt"), "staged\nunstaged\n");
  assert.equal(await f.read("untracked.txt"), "new\n");
  assert.ok(confirmed.stash_retained);
  const output = renderHumanOutput({ workflow: "repository.sync.pull", status: "success", approvalGate: "apply", result: confirmed });
  assert.match(output, /Merge confirmation: human report/);
  assert.doesNotMatch(output, /Verified merged PR/);
  const replay = await runSyncPull({ repo: f.repo, apply: true, confirmMerged: pending.operation_id }, dependencies);
  assert.equal(replay.status, "not-applied");
  assert.equal((await loadOperation(await context(f.repo), pending.operation_id)).status, "completed");
});

for (const change of ["worktree", "index", "head", "remote", "base-history"]) {
  test(`human merge confirmation rejects changed ${change}`, async (t) => {
    const f = await doneFixture(t);
    await f.advance();
    const dependencies = withoutGh(f, async () => new Response("", { status: 403 }));
    const pending = await runSyncPull(f.options, dependencies);
    if (change === "worktree") await f.write("edit.txt", "changed\n");
    if (change === "index") { await f.write("edit.txt", "changed\n"); f.git(["add", "edit.txt"]); }
    if (change === "head") await f.commit("edit.txt", "changed\n");
    if (change === "remote") f.git(["config", "remote.origin.tagOpt", "--no-tags"]);
    if (change === "base-history") syncGit(f.other, ["push", "--force", "origin", "HEAD~1:devel"]);
    const before = await snapshot(await context(f.repo));
    const result = await runSyncPull({ repo: f.repo, apply: true, confirmMerged: pending.operation_id }, dependencies);
    assert.equal(result.status, "not-applied", JSON.stringify(result));
    assert.equal(result.mutation_invoked, false);
    assert.equal(result.backup_branch, null);
    assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
  });
}

test("a fresh pull supersedes the old merge question and a pending question can be cancelled", async (t) => {
  const f = await doneFixture(t);
  const dependencies = withoutGh(f, async () => new Response("", { status: 404 }));
  const old = await runSyncPull(f.options, dependencies);
  const fresh = await runSyncPull(f.options, dependencies);
  assert.equal((await loadOperation(await context(f.repo), old.operation_id)).status, "superseded");
  const cancelled = await runSyncPull({ repo: f.repo, apply: true, abort: fresh.operation_id }, dependencies);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.mutation_invoked, false);
  for (const pending of [old, fresh]) {
    const result = await runSyncPull({ repo: f.repo, apply: true, confirmMerged: pending.operation_id }, dependencies);
    assert.equal(result.status, "not-applied");
    assert.equal(result.mutation_invoked, false);
  }
});

test("unmerged PR evidence cannot be overridden by human-confirmation recovery", async (t) => {
  const f = await doneFixture(t, { merged: false });
  const pending = await runSyncPull(f.options, f.dependencies);
  assert.equal(pending.confirmation_required, undefined);
  const result = await runSyncPull({ repo: f.repo, apply: true, confirmMerged: pending.operation_id }, f.dependencies);
  assert.equal(result.status, "not-applied");
  assert.match(result.reason, /not awaiting human merge confirmation/);
});

test("TLS failures retain a bounded diagnostic and offer human merge confirmation", async (t) => {
  const f = await doneFixture(t, {}, false, "ghe.example.test");
  const result = await runSyncPull(f.options, withoutGh(f, async () => {
    throw new TypeError("private transport details", { cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" } });
  }));
  assert.equal(result.confirmation_required, true);
  assert.match(result.reason, /SELF_SIGNED_CERT_IN_CHAIN/);
  assert.doesNotMatch(result.reason, /private transport details/);
});

test("sync pull next-work resumes a prepared branch without another branch or stash", async (t) => {
  const f = await doneFixture(t);
  f.git(["config", "branch.autoSetupMerge", "true"]);
  await f.write("carry.txt", "preserve me\n");
  const stopped = await runSyncPull(f.options, {
    ...f.dependencies,
    beforeAction: (phase) => { if (phase === "next-work-switch") throw new Error("Interrupted before checkout"); },
  });
  assert.equal(stopped.status, "partial", JSON.stringify(stopped));
  assert.equal(stopped.final_branch, "devel-tiga1026aaa-done");
  assert.equal(f.git(["rev-parse", "HEAD"]), f.pull.merge_commit_sha);
  assert.equal(f.git(["rev-parse", "--symbolic-full-name", "devel-tiga1026mef@{upstream}"]), "refs/remotes/origin/devel");
  await assert.rejects(f.read("carry.txt"), { code: "ENOENT" });
  const calls = [];
  const resumed = await runSyncPull({ repo: f.repo, resume: stopped.operation_id, apply: true }, {
    ...f.dependencies,
    git: (cwd, args, options) => { calls.push(args); return f.dependencies.git(cwd, args, options); },
  });
  assert.equal(resumed.status, "completed", JSON.stringify(resumed));
  assert.equal(resumed.stash_sha, stopped.stash_sha);
  assert.equal(f.git(["rev-parse", "--symbolic-full-name", "@{upstream}"]), "refs/remotes/origin/devel");
  assert.equal(await f.read("carry.txt"), "preserve me\n");
  assert.ok(!calls.some((args) => args[0] === "fetch" || (args[0] === "branch" && args[1] === "devel-tiga1026mef") || (args[0] === "stash" && args[1] === "push")));
  assert.equal(calls.filter((args) => args[0] === "switch").length, 1);
});

test("sync pull never retries an unconfirmed checkout hook without explicit resolution", async (t) => {
  const f = await doneFixture(t);
  await f.write("carry.txt", "preserve me\n");
  f.git(["config", "core.hooksPath", path.join(f.repo, ".git/hooks")]);
  await writeFile(path.join(f.repo, ".git/hooks/post-checkout"), "#!/bin/sh\nprintf x >> .git/checkout-count\nexit 1\n", { mode: 0o755 });
  const stopped = await runSyncPull(f.options, f.dependencies);
  assert.equal(stopped.status, "partial", JSON.stringify(stopped));
  assert.equal(stopped.final_branch, "devel-tiga1026mef");
  const output = renderHumanOutput({ workflow: "repository.sync.pull", status: "partial", approvalGate: "apply", delegateStatus: stopped.status, mutationInvoked: stopped.mutation_invoked, result: stopped });
  assert.match(output, /^Current branch: devel-tiga1026mef$/m);
  assert.doesNotMatch(output, /New work branch:/);
  const plain = await runSyncPull({ repo: f.repo, resume: stopped.operation_id, apply: true }, f.dependencies);
  assert.equal(plain.status, "partial"); assert.match(plain.reason, /--resolved-next-work/);
  await assert.rejects(f.read("carry.txt"), { code: "ENOENT" });
  const resolved = await runSyncPull({ repo: f.repo, resume: stopped.operation_id, resolvedNextWork: true, apply: true }, f.dependencies);
  assert.equal(resolved.status, "completed", JSON.stringify(resolved));
  assert.equal(await f.read("carry.txt"), "preserve me\n");
  assert.equal(await readFile(path.join(f.repo, ".git/checkout-count"), "utf8"), "x");
});

test("sync pull recovers an unconfirmed branch preparation only after explicit review", async (t) => {
  const f = await doneFixture(t); await f.write("carry.txt", "pending\n");
  const stopped = await runSyncPull(f.options, {
    ...f.dependencies,
    git: (cwd, args, options) => {
      const result = f.dependencies.git(cwd, args, options);
      if (args[0] === "branch" && args[1] === "devel-tiga1026mef") throw new Error("Lost branch preparation receipt");
      return result;
    },
  });
  assert.equal(stopped.status, "partial", JSON.stringify(stopped));
  assert.equal(stopped.final_branch, "devel-tiga1026aaa-done");
  const plain = await runSyncPull({ repo: f.repo, resume: stopped.operation_id, apply: true }, f.dependencies);
  assert.equal(plain.status, "partial"); assert.match(plain.reason, /no complete receipt/);
  const calls = [];
  const resolved = await runSyncPull({ repo: f.repo, resume: stopped.operation_id, resolvedNextWork: true, apply: true }, {
    ...f.dependencies, git: (cwd, args, options) => { calls.push(args); return f.dependencies.git(cwd, args, options); },
  });
  assert.equal(resolved.status, "completed", JSON.stringify(resolved));
  assert.equal(await f.read("carry.txt"), "pending\n");
  assert.equal(resolved.stash_sha, stopped.stash_sha);
  assert.ok(!calls.some((args) => args[0] === "fetch" || (args[0] === "branch" && args[1] === "devel-tiga1026mef") || (args[0] === "stash" && args[1] === "push")));
});

