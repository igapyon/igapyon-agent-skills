import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { workflowRegistry } from "../scripts/miku-scm-run.mjs";
import {
  WORKFLOW_MANIFEST,
  WORKFLOW_MANIFEST_VERSION,
  WORKFLOW_CONTRACT_VERSION,
} from "../scripts/miku-scm-workflow-manifest.mjs";

test("workflow manifest is versioned and IDs are unique", () => {
  assert.equal(WORKFLOW_MANIFEST_VERSION, "miku-scm.workflow-manifest/v2");
  assert.equal(WORKFLOW_CONTRACT_VERSION, 1);
  const ids = WORKFLOW_MANIFEST.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every routed workflow fixes safety metadata and separates runtime references", async () => {
  for (const entry of WORKFLOW_MANIFEST) {
    assert.match(entry.id, /^[a-z]+(?:[.-][a-z]+)+$/);
    assert.ok(["readonly", "local", "remote"].includes(entry.mutation_level));
    assert.ok(["none", "preflight", "apply"].includes(entry.approval_gate));
    assert.ok(entry.triggers.length > 0);
    assert.ok(entry.required_parameters.length > 0);
    assert.ok(entry.references.includes("deterministic-workflow-runner.md"));
    assert.equal(entry.contract_id, entry.id);
    const issueWriteContract = entry.id.startsWith("github.issue.") && entry.id !== "github.issue.read";
    const syncVersions = {
      "repository.sync.pull": 4,
      "repository.sync.push.prepare": 5,
      "repository.sync.push.draft.prepare": 1,
      "repository.sync.push.apply": 4,
      "pr.publish.preflight": 3,
      "pr.publish.apply": 4,
      "pr.recommit.push": 3,
      "work.commit": 2,
      "github.issue.read": 3,
      "github.read.batch": 3,
      "github.issue.update.preflight": 3,
      "github.issue.update.apply": 3,
      "github.issue.comment.preflight": 3,
      "github.issue.comment.apply": 3,
      "github.issue.label.preflight": 3,
      "github.issue.label.apply": 3,
      "github.issue.close.preflight": 3,
      "github.issue.close.apply": 3,
      "github.issue.handoff.batch.apply": 3,
      "writing.issue.prepare": 2,
    };
    assert.equal(entry.contract_version, syncVersions[entry.id] ?? (issueWriteContract ? 2 : 1));
    assert.match(entry.contract_spec, /\.md$/);
    assert.match(entry.contract_test, /\.test\.mjs$/);
    const expectedRuntime = entry.id === "repository.sync.pull" ? ["runtime-sync-pull.md"]
      : entry.id.startsWith("repository.sync.push.") ? ["runtime-sync-push.md"]
        : entry.id === "repository.post-merge.next-work" ? ["runtime-post-merge.md"]
          : entry.id.startsWith("github.issue.") && entry.id !== "github.issue.read" ? ["runtime-issue-approval.md"] : [];
    assert.deepEqual(entry.runtime_references, expectedRuntime);
    for (const reference of entry.runtime_references) await access(path.join(import.meta.dirname, "..", "references", reference));
    assert.deepEqual(entry.design_references, entry.references);
    assert.doesNotMatch(entry.runner_entry, /[;&|`$]/);
  }
});

test("runner registry and manifest have exact matching IDs and safety gates", () => {
  const registry = workflowRegistry();
  assert.deepEqual([...registry.keys()], WORKFLOW_MANIFEST.map((entry) => entry.id));
  for (const entry of WORKFLOW_MANIFEST) {
    const workflow = registry.get(entry.id);
    assert.equal(workflow.mutationLevel, entry.mutation_level);
    assert.equal(workflow.approvalGate, entry.approval_gate);
    assert.equal(workflow.contract.contract_id, entry.contract_id);
    assert.match(workflow.contract.pair_sha256, /^[0-9a-f]{64}$/);
  }
});
