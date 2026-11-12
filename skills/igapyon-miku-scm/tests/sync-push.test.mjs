import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { applySyncPush, prepareSyncPush, parseArgs } from "../scripts/sync-push.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { context, hash, loadOperation, snapshot } from "../scripts/miku-scm-sync-state.mjs";
import { fixture } from "./sync-fixture.mjs";
import { draft, preflightPartial } from "./sync-push-support.mjs";

test("sync push repeats fresh checks after a known pre-commit failure", async (t) => {
  const f = await fixture(t);
  await f.write("own.txt", "pending\n");
  const before = f.git(["rev-parse", "HEAD"]);
  let checks = 0;
  const dependencies = { workCommitDependencies: {
    resolveChecks: async () => [{ command: "check", args: [], label: "Repository check" }],
    command: () => ({ ok: ++checks > 1, stderr: "Fix validation" }),
  } };
  const stopped = await prepareSyncPush(f.options, dependencies);
  assert.equal(stopped.status, "partial");
  assert.match(stopped.reason, /Fix validation/);
  assert.equal(stopped.next_command, "miku-scm sync push");
  assert.equal(f.git(["rev-parse", "HEAD"]), before);
  const prepared = await prepareSyncPush(f.options, dependencies);
  assert.equal(prepared.status, "prepared", JSON.stringify(prepared));
  assert.equal(prepared.continuation, "refreshed-after-check-failure");
  assert.equal(checks, 2);
  assert.equal(f.git(["rev-list", "--count", `${before}..HEAD`]), "1");
  assert.equal((await loadOperation(await context(f.repo), stopped.operation_id)).status, "superseded");
});

test("sync push check recovery rechecks sensitive paths and rejects changed history", async (t) => {
  for (const change of ["sensitive", "head", "branch", "commit-stage"]) await t.test(change, async (sub) => {
    const f = await fixture(sub);
    await f.write("own.txt", "pending\n");
    const stopped = await prepareSyncPush(f.options, { workCommitDependencies: {
      resolveChecks: async () => [{ command: "check", args: [], label: "Check" }], command: () => ({ ok: false, stderr: "bad" }),
    } });
    if (change === "sensitive") await f.write("token.ts", "sensitive candidate\n");
    if (change === "head") f.git(["commit", "-m", "Concurrent work"]);
    if (change === "branch") f.git(["switch", "-c", "other-work"]);
    if (change === "commit-stage") {
      const ctx = await context(f.repo);
      const op = await loadOperation(ctx, stopped.operation_id);
      op.commit.result.stage = "commit";
      const { saveOperation } = await import("../scripts/miku-scm-sync-state.mjs");
      await saveOperation(ctx, op);
    }
    const r = await prepareSyncPush(f.options);
    assert.equal(r.status, "not-applied");
    if (change === "sensitive") assert.deepEqual(r.sensitive_paths, ["token.ts"]);
    else assert.equal((await loadOperation(await context(f.repo), stopped.operation_id)).status, "partial");
  });
});

test("sync push dirty commits once, prepares evidence, recommits and pushes to done", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "work\n");
  await f.write(".gitignore", "ignored/\n*.cache\n");
  const p = await prepareSyncPush({ ...f.options, message: "Implement work" });
  assert.equal(p.status, "prepared", JSON.stringify(p)); assert.equal(p.commit.status, "created");
  assert.equal(p.warnings.length, 1);
  assert.equal(p.evidence.commit_count, 1); assert.equal(p.evidence.head, p.head);
  const resumed = await prepareSyncPush({ repo: f.repo, resume: p.operation_id, apply: true });
  assert.equal(resumed.status, "prepared", JSON.stringify(resumed)); assert.equal(resumed.plan_sha256, p.plan_sha256); assert.equal(resumed.head, p.head);
  assert.deepEqual(resumed.warnings, p.warnings);
  const options = await draft(f, p);
  const r = await applySyncPush(options);
  assert.equal(r.status, "published", JSON.stringify(r)); assert.equal(r.commit.status, "created"); assert.ok(r.final_branch.endsWith("-done"));
  assert.deepEqual(r.warnings, p.warnings);
  assert.ok(!f.git(["ls-tree", "-r", "--name-only", "HEAD"]).includes("workplace/miku-scm/"));
  assert.equal(f.git(["rev-list", "--left-right", "--count", "HEAD...origin/devel-tiga1026aaa"]).replace(/\s+/g, " "), "0 0");
  assert.equal(f.git(["rev-parse", r.backup_branch]), p.head);
  const again = await applySyncPush(options); assert.equal(again.status, "not-applied");
  assert.equal((await loadOperation(await context(f.repo), p.operation_id)).status, "completed");
});

test("sync push clean committed work skips ordinary commit; empty branch is no-op", async (t) => {
  const f = await fixture(t);
  const empty = await prepareSyncPush(f.options); assert.equal(empty.status, "up-to-date"); assert.equal(empty.mutation_invoked, false);
  await f.commit("own.txt", "own\n"); const before = f.git(["rev-parse", "HEAD"]);
  const p = await prepareSyncPush(f.options); assert.equal(p.status, "prepared", JSON.stringify(p)); assert.equal(p.commit.status, "skipped"); assert.equal(p.head, before);
});

test("sync push detects base advance before ordinary commit and pull supersedes its preparation", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n"); await f.advance();
  const before = await snapshot(await context(f.repo));
  const p = await prepareSyncPush(f.options); assert.equal(p.status, "not-applied", JSON.stringify(p)); assert.match(p.reason, /sync pull/);
  assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
  const pull = await runSyncPull(f.options); assert.equal(pull.status, "completed", JSON.stringify(pull)); assert.equal(await f.read("own.txt"), "pending\n");
  assert.equal((await loadOperation(await context(f.repo), p.operation_id)).status, "superseded");
});

test("sync push detects later base advance and preserves the created commit for pull", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options); await f.write("own.txt", "pending\n");
  const p = await prepareSyncPush({ ...f.options, message: "Work" }); const options = await draft(f, p); await f.advance();
  const r = await applySyncPush(options); assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.match(r.reason, /Base advanced/); assert.equal(f.git(["rev-parse", "HEAD"]), p.head);
  const pull = await runSyncPull(f.options); assert.equal(pull.status, "completed", JSON.stringify(pull));
  const old = await applySyncPush(options); assert.equal(old.status, "not-applied"); assert.match(old.reason, /not available/);
});
