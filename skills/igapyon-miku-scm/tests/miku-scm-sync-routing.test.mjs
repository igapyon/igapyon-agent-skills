import test from "node:test";
import assert from "node:assert/strict";
import { runWorkflow, workflowRegistry } from "../scripts/miku-scm-run.mjs";
import { renderHumanOutput } from "../scripts/miku-scm-human-output.mjs";
import { parseArgs as parsePull } from "../scripts/sync-pull.mjs";
import { parseArgs as parsePush } from "../scripts/sync-push.mjs";
import { fixture } from "./sync-fixture.mjs";
import { syncGit } from "../scripts/miku-scm-sync-state.mjs";

test("sync routes keep separate local prepare and remote apply gates", () => {
  const registry = workflowRegistry();
  assert.equal(registry.get("repository.sync.pull").mutationLevel, "local");
  assert.equal(registry.get("repository.sync.push.prepare").mutationLevel, "local");
  assert.equal(registry.get("repository.sync.push.apply").mutationLevel, "remote");
  assert.throws(() => parsePull([]), /requires/);
  assert.throws(() => parsePush("prepare", []), /requires/);
  assert.throws(() => parsePush("apply", ["--apply"]), /operation ID/);
  assert.equal(parsePull(["--apply", "--confirm-merged", "saved-id"]).confirmMerged, "saved-id");
  assert.throws(() => parsePull(["--apply", "--confirm-merged", "saved-id", "--resume", "other-id"]), /cannot be combined/);
  assert.throws(() => parsePull(["--apply", "--confirm-merged", "saved-id", "--base", "main"]), /saved remote and base/);
});

test("runner presents unreadable PRs as a merge question, not completed sync", async (t) => {
  const f = await fixture(t);
  f.git(["branch", "-m", "devel-tiga1026aaa-done"]);
  const result = await runWorkflow("repository.sync.pull", ["--repo", f.repo, "--apply"], {
    cwd: f.repo,
    syncPullDependencies: {
      git: (cwd, args, options) => args[0] === "remote" && args[1] === "get-url"
        ? { ...syncGit(cwd, args, options), out: "https://ghe.example.test/owner/repo.git" } : syncGit(cwd, args, options),
      gh: () => ({ ok: false, status: 1 }),
    },
  });
  assert.equal(result.status, "not-applied", JSON.stringify(result));
  assert.equal(result.mutation_invoked, false);
  assert.match(result.human_output, /Human merge confirmation required/);
  assert.match(result.human_output, /Repository: ghe.example.test\/owner\/repo/);
  assert.match(result.human_output, /Merge destination: devel/);
  assert.match(result.human_output, /Has the PR containing/);
  assert.doesNotMatch(result.human_output, /New work branch:|Verified merged PR:/);
});

test("sync pull runner reports a genuine no-op as no work mutation", async (t) => {
  const f = await fixture(t);
  const r = await runWorkflow("repository.sync.pull", ["--repo", f.repo, "--base", "devel", "--apply"], { cwd: f.repo });
  assert.equal(r.status, "success", JSON.stringify(r)); assert.equal(r.delegate_status, "up-to-date"); assert.equal(r.mutation_invoked, false);
  assert.match(r.human_output, /Result: up-to-date/); assert.match(r.human_output, /Base: devel/);
  assert.match(r.human_output, /^Current branch: devel-tiga1026aaa$/m);
  assert.doesNotMatch(r.human_output, /New work branch:/);
});

test("sync fixed output makes partial work and exact recovery visible", () => {
  const output = renderHumanOutput({ workflow: "repository.sync.pull", status: "partial", approvalGate: "apply", delegateStatus: "partial", mutationInvoked: true, result: { status: "partial", operation_id: "saved-operation", final_branch: "work", stage: "stash-restore", stash_sha: "a".repeat(40), reason: "Resolve carryover", next_action: "Review retained stash" } });
  assert.match(output, /\[PARTIAL\] Sync pull/); assert.match(output, /Retained carryover stash: a{40}/); assert.match(output, /Recovery operation: saved-operation/); assert.match(output, /Stage: stash-restore/);
  const push = renderHumanOutput({ workflow: "repository.sync.push.apply", status: "partial", approvalGate: "apply", delegateStatus: "partial", mutationInvoked: true, result: { status: "partial", publication: { status: "conflict", stage: "publication-preflight", message: "Remote expectation changed" } } });
  assert.match(push, /Publication detail: Remote expectation changed/); assert.doesNotMatch(push, /Pushed branch:/);
});
