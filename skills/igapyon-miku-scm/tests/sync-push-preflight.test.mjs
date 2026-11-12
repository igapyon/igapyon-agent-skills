import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { applySyncPush, prepareSyncPush, parseArgs } from "../scripts/sync-push.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { context, hash, loadOperation, snapshot } from "../scripts/miku-scm-sync-state.mjs";
import { fixture } from "./sync-fixture.mjs";
import { draft, preflightPartial } from "./sync-push-support.mjs";

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
