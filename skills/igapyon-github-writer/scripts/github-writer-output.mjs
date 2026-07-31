import os from "node:os";

import { normalizeResultPath, sha256 } from "./github-writer-core.mjs";
import {
  WORKFLOW_CONTRACT_LOCK_VERSION,
  workflowContractById,
} from "./github-writer-workflow-contract-lock.mjs";
import {
  WORKFLOW_MANIFEST_VERSION,
  workflowById,
} from "./github-writer-workflow-manifest.mjs";

export const RESULT_SCHEMA_VERSION = "github-writer.runner-result/v1";
export const ERROR_SCHEMA_VERSION = "github-writer.error/v2";

export function humanOutput(workflow, result) {
  if (workflow.endsWith(".evidence")) {
    return [
      `[SUCCESS] ${workflow}`,
      "",
      `Repository: ${result.repository}`,
      `Branch: ${result.branch || "none"}`,
      `Evidence SHA-256: ${result.evidence_sha256}`,
      `Truncated: ${result.patch_truncated || result.documents_truncated ? "yes" : "no"}`,
      "Writing: not invoked",
    ].join("\n");
  }
  if (workflow === "branch.status") {
    return [
      "[SUCCESS] branch.status",
      "",
      `Repository: ${result.repository}`,
      `Branch: ${result.branch || "none"}`,
      `Upstream: ${result.upstream || "none"}`,
      `Ahead / behind: ${result.ahead ?? "unknown"} / ${result.behind ?? "unknown"}`,
      `Working tree: ${result.dirty ? "dirty" : "clean"}`,
    ].join("\n");
  }
  const lines = [
    `[SUCCESS] ${workflow}`,
    "",
    `Repository: ${result.repository ?? "unknown"}`,
  ];
  for (const [label, key] of [
    ["Plan", "plan_path"],
    ["Plan SHA-256", "plan_sha256"],
    ["Saved draft", "saved_path"],
    ["Draft SHA-256", "draft_sha256"],
    ["Backup branch", "backup_branch"],
    ["New HEAD", "new_head"],
    ["Attempt record", "attempt_record"],
  ]) {
    if (result[key]) lines.push(`${label}: ${result[key]}`);
  }
  return lines.join("\n");
}

export function successEnvelope(workflow, result, startedAt) {
  const metadata = workflowById(workflow);
  const contract = workflowContractById(workflow);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    workflow,
    workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
    workflow_contract_lock_version: WORKFLOW_CONTRACT_LOCK_VERSION,
    workflow_contract: contract.id,
    contract_version: contract.contract_version,
    contract_pair_sha256: contract.contract_pair_sha256,
    mutation_level: metadata.mutation_level,
    approval_gate: metadata.approval_gate,
    status: "success",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
    },
    mutation_invoked: metadata.approval_gate === "apply" && metadata.mutation_level === "local",
    result,
    human_output: humanOutput(workflow, result),
  };
}

function errorCode(message, mutationInvoked) {
  if (mutationInvoked) return "MUTATION_STATE_UNCONFIRMED";
  if (/changed|already has an attempt|conflict/i.test(message)) return "REVIEWED_STATE_CONFLICT";
  if (/^git .* failed:/i.test(message)) return "LOCAL_GIT_FAILURE";
  if (/requires|does not accept|must be|invalid|outside|unknown workflow|usage:/i.test(message)) {
    return "INVALID_INPUT";
  }
  return "WORKFLOW_FAILURE";
}

export function failureEnvelope(workflow, error, startedAt, context = {}) {
  const metadata = workflowById(workflow);
  const contract = workflowContractById(workflow);
  const mutationInvoked = error?.mutationInvoked === true;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = context.repository_root
    ? rawMessage.replaceAll(context.repository_root, "<repository>")
    : rawMessage;
  const code = errorCode(message, mutationInvoked);
  const classification = mutationInvoked
    ? "mutation-state-unconfirmed"
    : code === "REVIEWED_STATE_CONFLICT" ? "conflict" : "safe-stop";
  const retryability = mutationInvoked
    ? "do-not-retry"
    : code === "REVIEWED_STATE_CONFLICT" ? "new-preflight-required" : "correct-input-and-retry";
  const signature = sha256([workflow, context.phase ?? "unknown", code, classification, message].join("\n"));
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    workflow,
    workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
    workflow_contract_lock_version: WORKFLOW_CONTRACT_LOCK_VERSION,
    workflow_contract: contract?.id ?? null,
    contract_version: contract?.contract_version ?? null,
    contract_pair_sha256: contract?.contract_pair_sha256 ?? null,
    mutation_level: metadata?.mutation_level ?? "unknown",
    approval_gate: metadata?.approval_gate ?? "unknown",
    status: "failure",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
    },
    mutation_invoked: mutationInvoked,
    error: {
      schema_version: ERROR_SCHEMA_VERSION,
      code,
      phase: context.phase ?? "unknown",
      classification,
      message,
      retryability,
      signature_sha256: signature,
      help_command: context.help_command ?? null,
    },
    human_output: [
      `[${mutationInvoked ? "UNCONFIRMED" : "NOT APPLIED"}] ${workflow}`,
      "",
      `Code: ${code}`,
      `Message: ${message}`,
      `Mutation invoked: ${mutationInvoked ? "yes; inspect repository before any next action" : "no"}`,
    ].join("\n"),
  };
}

export function environmentInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    temp_directory: normalizeResultPath(os.tmpdir()),
  };
}
