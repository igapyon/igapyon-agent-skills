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
