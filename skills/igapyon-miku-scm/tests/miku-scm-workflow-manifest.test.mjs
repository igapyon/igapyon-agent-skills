import assert from "node:assert/strict";
import test from "node:test";

import { workflowRegistry } from "../scripts/miku-scm-run.mjs";
import {
  WORKFLOW_MANIFEST,
  WORKFLOW_MANIFEST_VERSION,
  WORKFLOW_CONTRACT_VERSION,
} from "../scripts/miku-scm-workflow-manifest.mjs";

test("workflow manifest is versioned and IDs are unique", () => {
  assert.equal(WORKFLOW_MANIFEST_VERSION, "miku-scm.workflow-manifest/v1");
  assert.equal(WORKFLOW_CONTRACT_VERSION, 1);
  const ids = WORKFLOW_MANIFEST.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every routed workflow fixes safety metadata and separates runtime references", () => {
  for (const entry of WORKFLOW_MANIFEST) {
    assert.match(entry.id, /^[a-z]+(?:[.-][a-z]+)+$/);
    assert.ok(["readonly", "local", "remote"].includes(entry.mutation_level));
    assert.ok(["none", "preflight", "apply"].includes(entry.approval_gate));
    assert.ok(entry.triggers.length > 0);
    assert.ok(entry.required_parameters.length > 0);
    assert.ok(entry.references.includes("deterministic-workflow-runner.md"));
    assert.equal(entry.contract_id, entry.id);
    assert.equal(entry.contract_version, 1);
    assert.match(entry.contract_spec, /\.md$/);
    assert.match(entry.contract_test, /\.test\.mjs$/);
    assert.deepEqual(entry.runtime_references, []);
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
