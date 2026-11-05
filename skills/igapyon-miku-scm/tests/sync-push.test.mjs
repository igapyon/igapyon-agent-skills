import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { applySyncPush, prepareSyncPush, parseArgs } from "../scripts/sync-push.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { context, hash, loadOperation, snapshot } from "../scripts/miku-scm-sync-state.mjs";
import { fixture } from "./sync-fixture.mjs";

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

async function draft(f, prepared) {
  const prose = "Improve example behavior\n\nPreserve the requested change and its verification.\n";
  await f.write(prepared.suggested_draft_path, prose);
  return { repo: f.repo, operation: prepared.operation_id, expectedPlanSha256: prepared.plan_sha256, prDraft: prepared.suggested_draft_path, expectedDraftSha256: hash(prose), apply: true };
}

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

for (const change of ["draft", "plan", "head", "push-url", "fetch-refspec", "tag-policy"]) test(`sync push rejects changed ${change} before recommit`, async (t) => {
  const f = await fixture(t); await f.commit("own.txt", "pending\n"); const p = await prepareSyncPush(f.options); const options = await draft(f, p);
  if (change === "draft") await f.write(options.prDraft, "Changed prose\n");
  if (change === "plan") await f.write(`workplace/miku-scm/sync/operations/${p.operation_id}/plan.json`, "{}\n");
  if (change === "head") await f.commit("later.txt", "later\n");
  if (change === "push-url") f.git(["remote", "set-url", "--push", "origin", path.join(f.directory, "other.git")]);
  if (change === "fetch-refspec") f.git(["config", "--add", "remote.origin.fetch", "^refs/heads/excluded"]);
  if (change === "tag-policy") f.git(["config", "remote.origin.tagOpt", "--no-tags"]);
  const head = f.git(["rev-parse", "HEAD"]); const r = await applySyncPush(options);
  assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal(f.git(["rev-parse", "HEAD"]), head); assert.equal(f.git(["branch", "--list", "backup/*"]), "");
});

for (const stop of ["not-applied", "partial", "conflict"]) test(`sync push does not draft or publish after work.commit ${stop}`, async (t) => {
  const f = await fixture(t); await f.write("own.txt", "work\n"); let evidence = 0;
  const r = await prepareSyncPush(f.options, { workCommit: async () => ({ status: stop, mutation_invoked: stop === "partial", reason: "fixed stop" }), prepareWriting: async () => { evidence++; throw new Error("must not draft"); } });
  assert.equal(r.status, stop, JSON.stringify(r)); assert.equal(evidence, 0); assert.equal(r.stage, "work-commit");
});

test("sync push can restart preparation after consent for the displayed sensitive paths", async (t) => {
  const f = await fixture(t);
  await f.write("token.ts", "export const kind = 'word';\n");
  const stopped = await prepareSyncPush({ ...f.options, message: "Add token type" });
  assert.equal(stopped.status, "not-applied", JSON.stringify(stopped));
  assert.deepEqual(stopped.sensitive_paths, ["token.ts"]);
  const prepared = await prepareSyncPush({ ...f.options, message: "Add token type", allowSensitivePaths: ["token.ts"] });
  assert.equal(prepared.status, "prepared", JSON.stringify(prepared));
  assert.equal(prepared.commit.status, "created");
  assert.equal(f.git(["show", "HEAD:token.ts"]), "export const kind = 'word';");
});

test("sync push prepare cancel retains work and releases its claim", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n"); const p = await prepareSyncPush({ ...f.options, message: "Work" }); const options = await draft(f, p);
  const r = await prepareSyncPush({ repo: f.repo, cancel: p.operation_id, apply: true }); assert.equal(r.status, "cancelled"); assert.equal(f.git(["rev-parse", "HEAD"]), p.head);
  assert.equal((await applySyncPush(options)).status, "not-applied");
  const next = await prepareSyncPush(f.options); assert.equal(next.status, "prepared", JSON.stringify(next)); assert.equal(next.commit.status, "skipped");
});

for (const configuration of ["multiple", "different", "mirror"]) test(`sync push refuses ${configuration} destinations before commit`, async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n");
  if (configuration === "multiple") { f.git(["remote", "set-url", "--add", "--push", "origin", f.remote]); f.git(["remote", "set-url", "--add", "--push", "origin", f.remote]); }
  if (configuration === "different") f.git(["remote", "set-url", "--push", "origin", path.join(f.directory, "different.git")]);
  if (configuration === "mirror") f.git(["config", "remote.origin.mirror", "true"]);
  const before = await snapshot(await context(f.repo)); const r = await prepareSyncPush(f.options); assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("sync push checks URL again inside the delegate before backup/reset", async (t) => {
  const f = await fixture(t); await f.commit("own.txt", "pending\n"); const p = await prepareSyncPush(f.options); const options = await draft(f, p);
  const r = await applySyncPush(options, { beforeCheckpoint: (phase) => { if (phase === "pre-backup") f.git(["remote", "set-url", "--push", "origin", path.join(f.directory, "changed.git")]); } });
  assert.equal(r.status, "not-applied", JSON.stringify(r)); assert.equal(f.git(["rev-parse", "HEAD"]), p.head); assert.equal(f.git(["branch", "--list", "backup/*"]), "");
});

test("sync push frozen branch stops before commit", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n"); const before = f.git(["rev-parse", "HEAD"]);
  f.git(["branch", "-m", `${f.git(["branch", "--show-current"])}-done`]);
  const done = await prepareSyncPush(f.options);
  assert.equal(done.status, "not-applied");
  assert.equal(done.next_command, "miku-scm sync pull");
  assert.equal(f.git(["rev-parse", "HEAD"]), before);
});

test("sync push continues on Linux through preparation and publication with a notice", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n");
  const prepared = await prepareSyncPush(f.options, { platform: "linux" });
  assert.equal(prepared.status, "prepared", JSON.stringify(prepared));
  assert.ok(prepared.warnings.some((warning) => warning.includes("linux")));
  const result = await applySyncPush(await draft(f, prepared), { platform: "linux" });
  assert.equal(result.status, "published", JSON.stringify(result));
  assert.ok(result.warnings.some((warning) => warning.includes("linux")));
  assert.equal(f.git(["rev-parse", "origin/devel-tiga1026aaa"]), result.new_head);
});

test("sync push refuses an unfetchable publication branch before ordinary commit", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n");
  f.git(["config", "remote.origin.fetch", "+refs/heads/devel:refs/remotes/origin/devel"]);
  const before = await snapshot(await context(f.repo));
  const result = await prepareSyncPush(f.options);
  assert.equal(result.status, "not-applied", JSON.stringify(result)); assert.match(result.reason, /Configured fetch does not update/);
  assert.equal((await snapshot(await context(f.repo))).digest, before.digest);
});

test("sync push publishes through configured base and work-branch fetch mappings", async (t) => {
  const f = await fixture(t); await f.write("own.txt", "pending\n");
  f.git(["config", "remote.origin.fetch", "+refs/heads/devel:refs/remotes/origin/devel"]);
  f.git(["config", "--add", "remote.origin.fetch", "+refs/heads/devel-tiga*:refs/remotes/origin/devel-tiga*"]);
  const prepared = await prepareSyncPush({ ...f.options, message: "Publish configured work branch" });
  assert.equal(prepared.status, "prepared", JSON.stringify(prepared));
  const result = await applySyncPush(await draft(f, prepared));
  assert.equal(result.status, "published", JSON.stringify(result));
  assert.equal(f.git(["rev-list", "--left-right", "--count", "HEAD...origin/devel-tiga1026aaa"]).replace(/\s+/g, " "), "0 0");
});

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
  const f = await fixture(t); await f.write("own.txt", "own\n"); const p = await prepareSyncPush({ ...f.options, message: "Own work" }); const options = await draft(f, p);
  await f.write(options.prDraft, "Changed\n"); const r = await applySyncPush(options); assert.equal(r.status, "not-applied"); assert.equal(r.commit.status, "created"); assert.equal(f.git(["rev-parse", "HEAD"]), p.head);
  assert.equal((await prepareSyncPush({ repo: f.repo, cancel: p.operation_id, apply: true })).status, "cancelled");
});

test("sync push unknown publication cannot be cleared by pull or a resend", async (t) => {
  const f = await fixture(t); await f.commit("own.txt", "own\n"); const p = await prepareSyncPush(f.options); const options = await draft(f, p); let sends = 0;
  const dependencies = { recommitPush: async () => { sends++; const error = new Error("Unknown publication result"); error.mutationInvoked = null; throw error; } };
  const r = await applySyncPush(options, dependencies); assert.equal(r.status, "unresolved"); assert.equal(r.mutation_invoked, null);
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

async function preflightPartial(f, dependencies = {}) {
  await f.commit("own.txt", "work\n");
  const p = await prepareSyncPush(f.options);
  const stopped = await applySyncPush(await draft(f, p), {
    recommitPushDependencies: { savePublicationPlan: async () => { throw new Error("injected storage failure"); }, ...dependencies },
  });
  assert.equal(stopped.status, "partial", JSON.stringify(stopped));
  assert.equal(stopped.publication.push_started, false); assert.equal(stopped.next_command, "miku-scm sync push");
  assert.equal(f.git(["ls-remote", "--heads", "origin", `refs/heads/${stopped.branch}`]), "");
  return { p, stopped };
}

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
