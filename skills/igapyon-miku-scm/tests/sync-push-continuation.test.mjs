import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { applySyncPush, prepareSyncPush, prepareSyncPushDraft, parseArgs } from "../scripts/sync-push.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { context, hash, loadOperation, snapshot } from "../scripts/miku-scm-sync-state.mjs";
import { fixture } from "./sync-fixture.mjs";
import { draft, preflightPartial } from "./sync-push-support.mjs";

test("sync push no-op needs only the configured base fetch mapping", async (t) => {
  const f = await fixture(t);
  f.git(["config", "remote.origin.fetch", "+refs/heads/devel:refs/remotes/origin/devel"]);
  const result = await prepareSyncPush(f.options);
  assert.equal(result.status, "up-to-date", JSON.stringify(result));
  assert.equal(result.mutation_invoked, false);
});

test("sync push parser requires immutable apply evidence and no arbitrary options", () => {
  assert.throws(() => parseArgs("apply", ["--operation", "x", "--apply"]), /complete sync operation/);
  assert.throws(() => parseArgs("prepare", ["--exec", "git push", "--apply"]), /Unknown/);
});

test("sync push preserves a prepared dirty commit after a draft rejection and permits cancel", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "own\n"); const p = await prepareSyncPush({ ...f.options, message: "Own work" }); await draft(f, p);
  const ready = await prepareSyncPushDraft({ repo: f.repo, operation: p.operation_id, expectedPlanSha256: p.plan_sha256 });
  await f.write(ready.draft_path, "Changed\n");
  const options = { repo: f.repo, operation: p.operation_id, expectedPlanSha256: p.plan_sha256, prDraft: ready.draft_path, expectedDraftSha256: ready.draft_sha256, apply: true };
  const r = await applySyncPush(options); assert.equal(r.status, "not-applied"); assert.equal(r.commit.status, "created"); assert.equal(f.git(["rev-parse", "HEAD"]), p.head);
  assert.equal((await prepareSyncPush({ repo: f.repo, cancel: p.operation_id, apply: true })).status, "cancelled");
});

test("sync push unknown publication cannot be cleared by pull or a resend", async (t) => {
  const f = await fixture(t); await f.commit("own.txt", "own\n"); const p = await prepareSyncPush(f.options); const options = await draft(f, p); let sends = 0;
  const dependencies = { recommitPush: async () => { sends++; const error = new Error("Unknown publication result"); error.mutationInvoked = null; throw error; } };
  const r = await applySyncPush(options, dependencies); assert.equal(r.status, "unresolved"); assert.equal(r.mutation_invoked, null);
  await assert.rejects(prepareSyncPushDraft({ repo: f.repo, operation: p.operation_id, expectedPlanSha256: p.plan_sha256 }), /unused prepared operation/);
  const pull = await runSyncPull(f.options); assert.equal(pull.status, "not-applied"); assert.match(pull.reason, /requires explicit recovery/);
  const again = await applySyncPush(options, dependencies); assert.equal(again.status, "not-applied"); assert.equal(sends, 1);
  assert.equal((await loadOperation(await context(f.repo), p.operation_id)).status, "unresolved");
  const repeat = await prepareSyncPush(f.options);
  assert.equal(repeat.status, "not-applied"); assert.equal(repeat.publication_state, "unknown");
  assert.equal(repeat.pending_status, "unresolved"); assert.match(repeat.next_action, /verify the remote/);
  assert.doesNotMatch(repeat.reason, /requires explicit recovery|[0-9a-f]{8}-[0-9a-f]{4}-/);
  assert.equal(sends, 1);
});

test("repeated sync push reuses the exact preparation and saved draft", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "work\n");
  const p = await prepareSyncPush({ ...f.options, message: "Work" }); const options = await draft(f, p);
  const state = await f.read(`workplace/miku-scm/sync/operations/${p.operation_id}/state.json`);
  const resumed = await prepareSyncPush(f.options);
  assert.equal(resumed.operation_id, p.operation_id); assert.equal(resumed.plan_sha256, p.plan_sha256);
  assert.equal(resumed.continuation, "resumed-preparation"); assert.equal(resumed.mutation_invoked, false);
  assert.equal(resumed.existing_draft_sha256, options.expectedDraftSha256);
  assert.equal(await f.read(`workplace/miku-scm/sync/operations/${p.operation_id}/state.json`), state);
  assert.equal((await applySyncPush(options)).status, "published");
});

test("changed work supersedes an unapplied plan and preserves its old draft", async (t) => {
  const f = await fixture(t); await f.commit("own.txt", "first\n");
  const p = await prepareSyncPush(f.options); const oldApply = await draft(f, p);
  const oldDraft = await f.read(p.suggested_draft_path);
  await f.write("own.txt", "latest\n");
  const next = await prepareSyncPush({ ...f.options, message: "Latest work" });
  assert.equal(next.status, "prepared", JSON.stringify(next)); assert.notEqual(next.operation_id, p.operation_id);
  assert.notEqual(next.suggested_draft_path, p.suggested_draft_path);
  assert.equal(next.continuation, "refreshed-preparation");
  assert.equal((await loadOperation(await context(f.repo), p.operation_id)).status, "superseded");
  assert.equal(await f.read(p.suggested_draft_path), oldDraft);
  assert.equal((await applySyncPush(oldApply)).status, "not-applied");
  assert.equal((await applySyncPush(await draft(f, next))).status, "published");
  assert.equal(f.git(["show", "HEAD:own.txt"]), "latest");
});
