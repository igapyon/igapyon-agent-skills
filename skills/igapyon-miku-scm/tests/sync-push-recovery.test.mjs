import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { applySyncPush, prepareSyncPush, parseArgs } from "../scripts/sync-push.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { context, hash, loadOperation, snapshot } from "../scripts/miku-scm-sync-state.mjs";
import { fixture } from "./sync-fixture.mjs";
import { draft, preflightPartial } from "./sync-push-support.mjs";

test("repeating sync push automatically recovers a structured preflight partial and publishes current work", async (t) => {
  const f = await fixture(t); const { p, stopped } = await preflightPartial(f);
  const backup = f.git(["rev-parse", stopped.backup_branch]);
  await f.commit("later.txt", "later committed work\n"); await f.write("pending.txt", "latest pending work\n");
  const next = await prepareSyncPush({ ...f.options, message: "Latest work" });
  assert.equal(next.status, "prepared", JSON.stringify(next)); assert.equal(next.continuation, "recovered-before-push");
  assert.equal((await loadOperation(await context(f.repo), p.operation_id)).status, "recovered");
  assert.equal(f.git(["rev-parse", stopped.backup_branch]), backup);
  const published = await applySyncPush(await draft(f, next));
  assert.equal(published.status, "published", JSON.stringify(published));
  assert.equal(f.git(["show", "HEAD:later.txt"]), "later committed work");
  assert.equal(f.git(["show", "HEAD:pending.txt"]), "latest pending work");
});

test("storage failure before reset retains the original plan for the same sync push command", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "work\n");
  const p = await prepareSyncPush(f.options); const options = await draft(f, p);
  const stopped = await applySyncPush(options, { recommitPushDependencies: { checkPublicationStorage: async () => { throw new Error("storage not writable"); } } });
  assert.equal(stopped.status, "not-applied"); assert.equal(stopped.publication_state, "not-started");
  assert.equal(stopped.next_command, "miku-scm sync push"); assert.equal(stopped.mutation_invoked, false);
  assert.equal(f.git(["rev-parse", "HEAD"]), p.head); assert.equal(f.git(["branch", "--list", "backup/*"]), "");
  const state = await loadOperation(await context(f.repo), p.operation_id);
  assert.equal(state.status, "prepared"); assert.equal(state.apply_started, false);
  assert.equal((await prepareSyncPush(f.options)).operation_id, p.operation_id);
  assert.equal((await applySyncPush(options)).status, "published");
});

test("a safe partial can be retired when the base advanced so sync pull is not deadlocked", async (t) => {
  const f = await fixture(t); await runSyncPull(f.options);
  const { p } = await preflightPartial(f); await f.advance();
  const stopped = await prepareSyncPush(f.options);
  assert.equal(stopped.status, "not-applied"); assert.equal(stopped.next_command, "miku-scm sync pull");
  assert.equal(stopped.publication_state, "not-started");
  assert.equal((await loadOperation(await context(f.repo), p.operation_id)).status, "recovered");
  const repeated = await prepareSyncPush(f.options);
  assert.equal(repeated.next_command, "miku-scm sync pull");
  assert.equal((await runSyncPull(f.options)).status, "completed");
  assert.equal((await prepareSyncPush(f.options)).status, "prepared");
});

for (const mismatch of ["remote-branch", "backup", "plan", "branch"]) test(`automatic recovery preserves partial evidence on ${mismatch} mismatch`, async (t) => {
  const f = await fixture(t); const { p, stopped } = await preflightPartial(f);
  if (mismatch === "remote-branch") f.git(["push", "origin", `HEAD:refs/heads/${stopped.branch}`]);
  if (mismatch === "backup") f.git(["branch", "-f", stopped.backup_branch, "origin/devel"]);
  if (mismatch === "plan") await f.write(`workplace/miku-scm/sync/operations/${p.operation_id}/plan.json`, "{}\n");
  if (mismatch === "branch") f.git(["switch", "-c", "another-work-branch"]);
  const stateFile = `workplace/miku-scm/sync/operations/${p.operation_id}/state.json`;
  const state = await f.read(stateFile); const before = await snapshot(await context(f.repo));
  const result = await prepareSyncPush(f.options);
  assert.equal(result.status, "not-applied", JSON.stringify(result)); assert.equal(result.mutation_invoked, false);
  assert.equal(await f.read(stateFile), state); assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("slash-bearing branch publishes with a safe publication filename", async (t) => {
  const f = await fixture(t); f.git(["branch", "-m", "fix/daybook-concurrent-writes"]);
  await f.commit("own.txt", "work\n"); const p = await prepareSyncPush(f.options);
  const r = await applySyncPush(await draft(f, p));
  assert.equal(r.status, "published", JSON.stringify(r));
  assert.match(r.plan_path, /^workplace\/miku-scm\/ok-push\/[A-Za-z0-9._-]+\.json$/);
  assert.equal(r.final_branch, "fix/daybook-concurrent-writes-done");
});

test("a legacy branch-path ENOENT is recovered by the ordinary sync push command", async (t) => {
  const f = await fixture(t); f.git(["branch", "-m", "fix/legacy"]);
  const { p } = await preflightPartial(f, {
    savePublicationPlan: async (root, result) => { throw new Error(`ENOENT: no such file or directory, open '${path.join(root, "workplace/miku-scm/ok-push", `ok-push-${result.branch}-${result.head.slice(0, 12)}-202611030900.json`)}'`); },
  });
  const stateFile = `workplace/miku-scm/sync/operations/${p.operation_id}/state.json`;
  const saved = JSON.parse(await f.read(stateFile));
  delete saved.delegate.publication.push_started; delete saved.delegate.publication.evidence_version;
  await f.write(stateFile, JSON.stringify(saved));
  const next = await prepareSyncPush(f.options);
  assert.equal(next.status, "prepared", JSON.stringify(next)); assert.equal(next.continuation, "recovered-before-push");
  assert.equal((await applySyncPush(await draft(f, next))).status, "published");
});
