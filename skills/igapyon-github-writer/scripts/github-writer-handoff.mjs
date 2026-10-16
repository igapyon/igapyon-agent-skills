import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  isPathInside,
  normalizeResultPath,
  operationalBase,
  replaceFileAtomic,
  repositoryIdentity,
  sha256,
  writeFileAtomic,
} from "./github-writer-core.mjs";
import { workflowContractById } from "./github-writer-workflow-contract-lock.mjs";
import { backupApply, recommitApply } from "./github-writer-operations.mjs";

export const HANDOFF_SCHEMA_VERSION = "github-writer.handoff/v1";

const HANDOFF_ID = /^[0-9a-f]{64}$/;
const APPLY_WORKFLOW = Object.freeze({
  "backup.preflight": "backup.apply",
  "pr.recommit.preflight": "pr.recommit.apply",
});

function handoffDirectory(root) {
  return path.join(operationalBase(root), "handoffs");
}

function handoffPath(root, id) {
  if (!HANDOFF_ID.test(id)) throw new Error("Handoff ID must be one full SHA-256 value");
  const file = path.join(handoffDirectory(root), `${id}.json`);
  if (!isPathInside(handoffDirectory(root), file)) throw new Error("Handoff path escapes handoff directory");
  return file;
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readHandoff(root, id) {
  const file = handoffPath(root, id);
  if (!existsSync(file)) throw new Error(`Pending handoff was not found: ${id}`);
  const handoff = JSON.parse(readFileSync(file, "utf8"));
  if (handoff?.schema_version !== HANDOFF_SCHEMA_VERSION || handoff.id !== id) {
    throw new Error("Handoff schema or identity is invalid");
  }
  return { file, handoff };
}

function writeHandoff(file, handoff) {
  replaceFileAtomic(file, serialize(handoff));
  return handoff;
}

function publicHandoff(root, handoff) {
  return {
    id: handoff.id,
    state: handoff.state,
    apply_workflow: handoff.apply_workflow,
    repository: handoff.repository,
    plan_path: handoff.plan_path,
    created_at: handoff.created_at,
    path: normalizeResultPath(path.relative(root, handoffPath(root, handoff.id))),
  };
}

export function createPendingHandoff(options, preflightWorkflow, result, dependencies = {}) {
  const git = dependencies.git;
  const identity = repositoryIdentity(options.repo, git);
  const applyWorkflow = APPLY_WORKFLOW[preflightWorkflow];
  if (!applyWorkflow || !result?.plan_path || !result?.plan_sha256) return null;
  const contract = workflowContractById(applyWorkflow);
  if (!contract) throw new Error(`Apply workflow contract is missing: ${applyWorkflow}`);
  const id = sha256([
    identity.root,
    applyWorkflow,
    result.plan_path,
    result.plan_sha256,
    contract.contract_pair_sha256,
  ].join("\n"));
  const handoff = {
    schema_version: HANDOFF_SCHEMA_VERSION,
    id,
    state: "pending",
    preflight_workflow: preflightWorkflow,
    apply_workflow: applyWorkflow,
    repository: identity.repository,
    repository_root_sha256: sha256(identity.root),
    plan_path: result.plan_path,
    plan_sha256: result.plan_sha256,
    apply_arguments: {
      repo: options.repo,
      plan: result.plan_path,
      expectedPlanSha256: result.plan_sha256,
    },
    contract_pair_sha256: contract.contract_pair_sha256,
    created_at: new Date().toISOString(),
  };
  const file = handoffPath(identity.root, id);
  if (!existsSync(file)) writeFileAtomic(file, serialize(handoff));
  return publicHandoff(identity.root, handoff);
}

function pending(root) {
  const directory = handoffDirectory(root);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      try {
        return readHandoff(root, entry.name.slice(0, -5)).handoff;
      } catch {
        return null;
      }
    })
    .filter((entry) => entry?.state === "pending")
    .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id));
}

export function listPendingHandoffs(options, dependencies = {}) {
  const identity = repositoryIdentity(options.repo, dependencies.git);
  return {
    repository: identity.repository,
    pending: pending(identity.root).map((handoff) => publicHandoff(identity.root, handoff)),
  };
}

function selectedHandoff(root, requested) {
  if (requested) return readHandoff(root, requested);
  const candidates = pending(root);
  if (candidates.length !== 1) {
    throw new Error(`Exactly one pending handoff is required; found ${candidates.length}`);
  }
  return readHandoff(root, candidates[0].id);
}

function statusAfterFailure(error) {
  if (error?.mutationInvoked === true) return "unresolved";
  if (/changed|conflict/i.test(error instanceof Error ? error.message : String(error))) return "conflict";
  return "not-applied";
}

export function applyPendingHandoff(options, dependencies = {}) {
  if (options.apply !== true) throw new Error("approval.handoff.apply requires --apply");
  const identity = repositoryIdentity(options.repo, dependencies.git);
  const { file, handoff } = selectedHandoff(identity.root, options.handoff);
  if (handoff.state !== "pending") throw new Error(`Handoff is not pending: ${handoff.id}`);
  if (handoff.repository !== identity.repository || handoff.repository_root_sha256 !== sha256(identity.root)) {
    throw new Error("Handoff repository changed");
  }
  const contract = workflowContractById(handoff.apply_workflow);
  if (!contract || contract.contract_pair_sha256 !== handoff.contract_pair_sha256) {
    throw new Error("Handoff workflow contract changed; create a new preflight");
  }
  const applying = { ...handoff, state: "applying", started_at: new Date().toISOString() };
  writeHandoff(file, applying);
  try {
    const apply = handoff.apply_workflow === "backup.apply" ? backupApply : recommitApply;
    const applyResult = apply(handoff.apply_arguments, dependencies);
    const completed = {
      ...applying,
      state: "applied",
      finished_at: new Date().toISOString(),
      result: applyResult,
    };
    writeHandoff(file, completed);
    return {
      repository: identity.repository,
      handoff: publicHandoff(identity.root, completed),
      apply_result: applyResult,
    };
  } catch (error) {
    writeHandoff(file, {
      ...applying,
      state: statusAfterFailure(error),
      finished_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function dismissPendingHandoff(options, dependencies = {}) {
  if (options.apply !== true) throw new Error("approval.handoff.dismiss requires --apply");
  const identity = repositoryIdentity(options.repo, dependencies.git);
  const { file, handoff } = readHandoff(identity.root, options.handoff);
  if (handoff.state !== "pending") throw new Error(`Handoff is not pending: ${handoff.id}`);
  const dismissed = {
    ...handoff,
    state: "dismissed",
    finished_at: new Date().toISOString(),
  };
  writeHandoff(file, dismissed);
  return { repository: identity.repository, handoff: publicHandoff(identity.root, dismissed) };
}
