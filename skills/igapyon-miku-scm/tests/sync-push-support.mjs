import assert from "node:assert/strict";
import { applySyncPush, prepareSyncPush } from "../scripts/sync-push.mjs";
import { hash } from "../scripts/miku-scm-sync-state.mjs";

export async function draft(f, prepared) {
  const prose = "Improve example behavior\n\nPreserve the requested change and its verification.\n";
  await f.write(prepared.suggested_draft_path, prose);
  return { repo: f.repo, operation: prepared.operation_id, expectedPlanSha256: prepared.plan_sha256, prDraft: prepared.suggested_draft_path, expectedDraftSha256: hash(prose), apply: true };
}

export async function preflightPartial(f, dependencies = {}) {
  await f.commit("own.txt", "work\n");
  const p = await prepareSyncPush(f.options);
  const stopped = await applySyncPush(await draft(f, p), {
    recommitPushDependencies: { savePublicationPlan: async () => { throw new Error("injected storage failure"); }, ...dependencies },
  });
  assert.equal(stopped.status, "partial", JSON.stringify(stopped));
  assert.equal(stopped.publication.push_started, false);
  assert.equal(stopped.next_command, "miku-scm sync push");
  assert.equal(f.git(["ls-remote", "--heads", "origin", "refs/heads/" + stopped.branch]), "");
  return { p, stopped };
}
