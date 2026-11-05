import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fixture } from "./sync-fixture.mjs";
import { runSyncPull } from "../scripts/sync-pull.mjs";
import { prepareSyncPush, applySyncPush } from "../scripts/sync-push.mjs";
import { context, newId, loadOperation, readJson, hash, lock, newOperation } from "../scripts/miku-scm-sync-state.mjs";

const stateUrl = new URL("../scripts/miku-scm-sync-state.mjs", import.meta.url).href;
const pullUrl = new URL("../scripts/sync-pull.mjs", import.meta.url).href;
const pushUrl = new URL("../scripts/sync-push.mjs", import.meta.url).href;

async function crash(t, mode = "pull") {
  const f = await fixture(t);
  const code = `import {existsSync} from 'node:fs';
    import {syncGit} from ${JSON.stringify(stateUrl)};
    import {runSyncPull} from ${JSON.stringify(pullUrl)};
    import {prepareSyncPush} from ${JSON.stringify(pushUrl)};
    const repo=process.argv[1];
    const git=(cwd,args,options)=>{
      if(args[0]==='branch' && existsSync(repo+'/.git/miku-scm-sync.lock')) process.exit(93);
      return syncGit(cwd,args,options);
    };
    await ${mode === "pull" ? "runSyncPull" : "prepareSyncPush"}({repo,remote:'origin',base:'devel',apply:true},{git});`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", code, f.repo], { encoding: "utf8" });
  assert.equal(child.status, 93, child.stderr);
  const file = path.join(f.repo, ".git", "miku-scm-sync.lock");
  const record = JSON.parse(await readFile(file, "utf8"));
  assert.equal(record.schema_version, 2);
  assert.equal(record.phase, "initializing");
  return { ...f, file, record };
}

test("initializing lock from a dead process can be explicitly cancelled", async (t) => {
  for (const mode of ["pull", "push"]) await t.test(mode, async (sub) => {
    const f = await crash(sub, mode);
    await assert.rejects(runSyncPull(f.options), /Another sync/);
    const r = mode === "pull" ? await runSyncPull({ ...f.options, abort: f.record.operation })
      : await prepareSyncPush({ ...f.options, cancel: f.record.operation });
    assert.equal(r.status, "cancelled");
    assert.equal(r.mutation_invoked, false);
    await assert.rejects(access(f.file));
    assert.equal((await runSyncPull(f.options)).status, "up-to-date");
  });
});

test("initializing lock cancellation rejects unsafe evidence", async (t) => {
  for (const kind of ["live", "root", "id", "legacy", "recorded", "directory", "malformed", "resume"]) await t.test(kind, async (sub) => {
    const f = await crash(sub);
    const record = { ...f.record };
    if (kind === "live") record.pid = process.pid;
    if (kind === "root") record.root += "/different";
    if (kind === "legacy") { delete record.schema_version; delete record.phase; }
    if (kind === "recorded") record.phase = "operation-recorded";
    if (kind === "directory") await mkdir(path.join(f.repo, "workplace/miku-scm/sync/operations", record.operation), { recursive: true });
    await writeFile(f.file, kind === "malformed" ? "{" : JSON.stringify(record));
    const options = { ...f.options, [kind === "resume" ? "resume" : "abort"]: kind === "id" ? newId() : record.operation };
    await assert.rejects(runSyncPull(options));
    assert.equal(await readFile(f.file, "utf8"), kind === "malformed" ? "{" : JSON.stringify(record));
  });
});

test("existing operation apply lock is recorded rather than initializing", async (t) => {
  const f = await fixture(t);
  await f.commit("own.txt", "work\n");
  const prepared = await prepareSyncPush(f.options);
  await f.write(prepared.suggested_draft_path, "Reviewed work\n\nDetails\n");
  let observed;
  const r = await applySyncPush({ repo: f.repo, operation: prepared.operation_id, apply: true,
    prDraft: prepared.suggested_draft_path, expectedPlanSha256: prepared.plan_sha256, expectedDraftSha256: hash("Reviewed work\n\nDetails\n") }, {
    beforeCheckpoint: async (phase, ctx) => {
      if (phase === "pre-apply") {
        observed = await readJson(ctx.syncLock.file);
        throw new Error("Inspection complete; stop before apply");
      }
    },
  });
  assert.equal(r.status, "not-applied");
  const ctx = await context(f.repo);
  assert.equal(observed.phase, "operation-recorded");
  assert.equal((await loadOperation(ctx, prepared.operation_id)).status, "prepared");
});

test("a fresh operation replaces the owned lock operation identity", async (t) => {
  const f = await fixture(t);
  await f.commit("own.txt", "work\n");
  const prepared = await prepareSyncPush(f.options);
  const ctx = await context(f.repo);
  const previous = await loadOperation(ctx, prepared.operation_id);
  const release = await lock(ctx, previous.id);
  try {
    const id = newId();
    await newOperation(ctx, "push", id, previous.original, previous.remote, previous.base, previous.base_sha);
    const record = await readJson(ctx.syncLock.file);
    assert.equal(record.operation, id);
    assert.equal(record.phase, "operation-recorded");
  } finally { await release(); }
});
