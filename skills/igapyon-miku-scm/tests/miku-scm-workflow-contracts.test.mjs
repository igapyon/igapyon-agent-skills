import assert from "node:assert/strict";
import test from "node:test";

import {
  WORKFLOW_CONTRACT_LOCK,
  WORKFLOW_CONTRACT_LOCK_VERSION,
  workflowContractById,
} from "../scripts/miku-scm-workflow-contract-lock.mjs";
import {
  canonicalContractText,
  contractSha256,
  runtimeContractSha256,
  calculateWorkflowContracts,
  updateWorkflowContracts,
} from "../scripts/miku-scm-workflow-contracts.mjs";
import { WORKFLOW_MANIFEST } from "../scripts/miku-scm-workflow-manifest.mjs";

test("generated workflow contract lock matches every runner and normative spec", async () => {
  const calculated = await calculateWorkflowContracts();
  assert.deepEqual(calculated, WORKFLOW_CONTRACT_LOCK);
  assert.equal(WORKFLOW_CONTRACT_LOCK_VERSION, "miku-scm.workflow-contract-lock/v1");
  assert.equal(workflowContractById().size, WORKFLOW_MANIFEST.length);
  for (const contract of calculated) {
    assert.equal(contract.workflow, contract.contract_id);
    assert.match(contract.runner_sha256, /^[0-9a-f]{64}$/);
    assert.match(contract.spec_sha256, /^[0-9a-f]{64}$/);
    assert.match(contract.pair_sha256, /^[0-9a-f]{64}$/);
  }
});

test("generated lock and human management table have no drift", async () => {
  assert.deepEqual(
    await updateWorkflowContracts({ check: true }),
    { status: "current", contracts: WORKFLOW_MANIFEST.length },
  );
});

test("workflow contract hashes ignore checkout line-ending representation", () => {
  const lf = "first\nsecond\nthird\n";
  const crlf = "first\r\nsecond\r\nthird\r\n";
  const cr = "first\rsecond\rthird\r";

  assert.equal(canonicalContractText(crlf), lf);
  assert.equal(canonicalContractText(cr), lf);
  assert.equal(contractSha256(crlf), contractSha256(lf));
  assert.equal(contractSha256(cr), contractSha256(lf));
});

test("declared runtime sources affect only workflows that declare them", () => {
  const approvalEntry = WORKFLOW_MANIFEST.find((entry) => entry.id === "github.issue.handoff.apply");
  const baseSources = new Map([
    ["miku-scm-human-output.mjs", "renderer-v1\n"],
    ["miku-scm-issue-approval.mjs", "approval-v1\n"],
  ]);
  const before = runtimeContractSha256(approvalEntry, "handoff-v1\n", baseSources);
  const after = runtimeContractSha256(approvalEntry, "handoff-v1\n", new Map([
    ...baseSources,
    ["miku-scm-issue-approval.mjs", "approval-v2\n"],
  ]));
  assert.notEqual(after, before);

  const unrelatedEntry = WORKFLOW_MANIFEST.find((entry) => entry.id === "repository.status");
  assert.equal(
    runtimeContractSha256(unrelatedEntry, "snapshot-v1\n", baseSources),
    runtimeContractSha256(unrelatedEntry, "snapshot-v1\n", new Map()),
  );
  assert.throws(() => runtimeContractSha256({
    id: "bad.workflow",
    runner_entry: "handoff.mjs",
    contract_runtime_sources: ["../outside.mjs"],
  }, "runner", new Map()), /safe basename/);
});
