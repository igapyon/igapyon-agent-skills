import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { relativeOperationalPath } from "./miku-scm-operational-path.mjs";

export const HANDOFF_SCHEMA_VERSION = "miku-scm.approval-handoff/v1";

const ISSUE_APPLY_WORKFLOWS = new Set([
  "github.issue.create.apply",
  "github.issue.update.apply",
  "github.issue.comment.apply",
  "github.issue.label.apply",
  "github.issue.close.apply",
]);
const HANDOFF_STATUSES = new Set([
  "pending",
  "applied",
  "conflict",
  "not-applied",
  "unresolved",
]);
const HANDOFF_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_BATCH_HANDOFFS = 20;
const SHA256 = /^[0-9a-f]{64}$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function handoffPayload(record) {
  const { record_sha256: _ignored, ...payload } = record;
  return payload;
}

function withRecordDigest(record) {
  const payload = handoffPayload(record);
  return {
    ...payload,
    record_sha256: sha256(JSON.stringify(payload)),
  };
}

function asHandoffFailure(error, mutationInvoked) {
  const failure = error instanceof Error ? error : new Error(String(error));
  failure.mutationInvoked = mutationInvoked;
  return failure;
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, file);
}

function assertRelativeOperationalPath(value, name) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) {
    throw new Error(`${name} must be a non-empty relative path`);
  }
  const normalized = path.normalize(value);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`${name} must stay inside the repository`);
  }
  return normalized;
}

function expectedContractDigest(args) {
  const index = args.indexOf("--expected-contract-pair-sha256");
  if (index < 0 || !SHA256.test(args[index + 1] ?? "")) {
    throw new Error("Approval handoff requires a reviewed workflow contract digest");
  }
  return args[index + 1];
}

function validateApplyArguments(args) {
  if (!Array.isArray(args) || args.length === 0
    || args.some((value) => typeof value !== "string")) {
    throw new Error("Approval handoff apply arguments must be a non-empty string array");
  }
  if (!args.includes("--apply")) {
    throw new Error("Approval handoff apply arguments must include --apply");
  }
}

function validateHandoffId(value) {
  if (typeof value !== "string" || !HANDOFF_ID.test(value)) {
    throw new Error("--handoff must be an exact approval handoff ID");
  }
  return value;
}

function optionValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

export function parseHandoffListArgs(argv, cwd = process.cwd()) {
  const options = { root: path.resolve(cwd) };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.root = path.resolve(cwd, optionValue(argv, index, "--root"));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

export function parseHandoffApplyArgs(argv, cwd = process.cwd()) {
  const options = {
    root: path.resolve(cwd),
    handoff: null,
    apply: false,
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.apply = true;
    } else if (argument === "--root") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.root = path.resolve(cwd, optionValue(argv, index, "--root"));
      index += 1;
    } else if (argument === "--handoff") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.handoff = validateHandoffId(optionValue(argv, index, "--handoff"));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.apply) throw new Error("github.issue.handoff.apply requires --apply");
  return options;
}

export function parseHandoffBatchApplyArgs(argv, cwd = process.cwd()) {
  const options = {
    root: path.resolve(cwd),
    handoffs: [],
    apply: false,
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.apply = true;
    } else if (argument === "--root") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.root = path.resolve(cwd, optionValue(argv, index, "--root"));
      index += 1;
    } else if (argument === "--handoff") {
      const handoff = validateHandoffId(optionValue(argv, index, "--handoff"));
      if (options.handoffs.includes(handoff)) {
        throw new Error(`Duplicate batch approval handoff ID: ${handoff}`);
      }
      options.handoffs.push(handoff);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.handoffs.length < 2) {
    throw new Error("github.issue.handoff.batch.apply requires at least two --handoff values");
  }
  if (options.handoffs.length > MAX_BATCH_HANDOFFS) {
    throw new Error(`github.issue.handoff.batch.apply accepts at most ${MAX_BATCH_HANDOFFS} handoffs`);
  }
  if (!options.apply) throw new Error("github.issue.handoff.batch.apply requires --apply");
  return options;
}

export function parseHandoffDismissArgs(argv, cwd = process.cwd()) {
  const options = {
    root: path.resolve(cwd),
    handoff: null,
    apply: false,
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.apply = true;
    } else if (argument === "--root") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.root = path.resolve(cwd, optionValue(argv, index, "--root"));
      index += 1;
    } else if (argument === "--handoff") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.handoff = validateHandoffId(optionValue(argv, index, "--handoff"));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.handoff) throw new Error("github.issue.handoff.dismiss requires --handoff");
  if (!options.apply) throw new Error("github.issue.handoff.dismiss requires --apply");
  return options;
}

export async function createIssueApprovalHandoff({
  root,
  runId,
  preflightWorkflow,
  applyWorkflow,
  applyArguments,
  reviewedResult,
  humanSummary,
  createdAt,
}) {
  if (!ISSUE_APPLY_WORKFLOWS.has(applyWorkflow)) {
    throw new Error(`Unsupported Issue approval handoff workflow: ${applyWorkflow}`);
  }
  if (`${applyWorkflow.slice(0, -".apply".length)}.preflight` !== preflightWorkflow) {
    throw new Error("Issue approval handoff workflow pair is inconsistent");
  }
  validateHandoffId(runId);
  validateApplyArguments(applyArguments);
  const directory = path.join(path.resolve(root), "workplace", "miku-scm", "handoffs");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `${runId}.json`);
  const relativeFile = relativeOperationalPath(path.resolve(root), file);
  const review = {
    repository: reviewedResult.repository ?? null,
    issue: reviewedResult.issue_number ?? reviewedResult.issue ?? null,
    title: reviewedResult.title ?? null,
    draft: reviewedResult.draft ?? null,
    draft_sha256: reviewedResult.draft_sha256 ?? null,
    labels: reviewedResult.labels ?? null,
    labels_sha256: reviewedResult.labels_sha256 ?? null,
    parent_issue: reviewedResult.parent_issue ?? null,
    parent_sha256: reviewedResult.parent_sha256 ?? null,
    issue_sha256: reviewedResult.issue_sha256 ?? null,
    planned_gh_arguments: reviewedResult.planned_gh_arguments ?? null,
  };
  const immutable = {
    preflight_workflow: preflightWorkflow,
    apply_workflow: applyWorkflow,
    apply_workflow_contract_pair_sha256: expectedContractDigest(applyArguments),
    apply_arguments: applyArguments,
    review,
    human_summary: humanSummary,
  };
  const record = withRecordDigest({
    schema_version: HANDOFF_SCHEMA_VERSION,
    id: runId,
    status: "pending",
    created_at: createdAt,
    updated_at: createdAt,
    immutable_sha256: sha256(JSON.stringify(immutable)),
    ...immutable,
  });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  return {
    schema_version: HANDOFF_SCHEMA_VERSION,
    id: runId,
    status: "pending",
    path: relativeFile,
    immutable_sha256: record.immutable_sha256,
    record_sha256: record.record_sha256,
  };
}

export function validateHandoffRecord(record) {
  if (!record || record.schema_version !== HANDOFF_SCHEMA_VERSION) {
    throw new Error("Unsupported approval handoff schema");
  }
  if (!ISSUE_APPLY_WORKFLOWS.has(record.apply_workflow)) {
    throw new Error("Approval handoff names an unsupported apply workflow");
  }
  if (!HANDOFF_ID.test(record.id ?? "")) {
    throw new Error("Approval handoff has an invalid ID");
  }
  if (!HANDOFF_STATUSES.has(record.status)) {
    throw new Error("Approval handoff has an unsupported status");
  }
  validateApplyArguments(record.apply_arguments);
  if (record.apply_workflow_contract_pair_sha256 !== expectedContractDigest(record.apply_arguments)) {
    throw new Error("Approval handoff workflow contract digest is inconsistent");
  }
  const immutable = {
    preflight_workflow: record.preflight_workflow,
    apply_workflow: record.apply_workflow,
    apply_workflow_contract_pair_sha256: record.apply_workflow_contract_pair_sha256,
    apply_arguments: record.apply_arguments,
    review: record.review,
    human_summary: record.human_summary,
  };
  if (record.immutable_sha256 !== sha256(JSON.stringify(immutable))) {
    throw new Error("Approval handoff immutable content changed");
  }
  if (record.record_sha256 !== sha256(JSON.stringify(handoffPayload(record)))) {
    throw new Error("Approval handoff record changed without a matching digest");
  }
  return record;
}

async function readHandoffs(root) {
  const directory = path.join(root, "workplace", "miku-scm", "handoffs");
  let files;
  try {
    files = await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const records = [];
  for (const file of files.filter((entry) => entry.endsWith(".json")).sort()) {
    const relativeFile = path.join("workplace", "miku-scm", "handoffs", file);
    const normalized = assertRelativeOperationalPath(relativeFile, "handoff path");
    const record = validateHandoffRecord(JSON.parse(
      await readFile(path.join(root, normalized), "utf8"),
    ));
    if (`${record.id}.json` !== file) {
      throw new Error("Approval handoff ID does not match its file name");
    }
    records.push({ file: normalized, record });
  }
  return records;
}

async function pendingHandoffs(root) {
  return (await readHandoffs(root)).filter(({ record }) => record.status === "pending");
}

function publicHandoff({ file, record }) {
  return {
    id: record.id,
    status: record.status,
    created_at: record.created_at,
    updated_at: record.updated_at,
    apply_workflow: record.apply_workflow,
    repository: record.review?.repository ?? null,
    issue: record.review?.issue ?? null,
    title: record.review?.title ?? null,
    draft: record.review?.draft ?? null,
    path: file,
    immutable_sha256: record.immutable_sha256,
  };
}

function selectPendingHandoff(pending, handoffId = null) {
  if (handoffId) {
    validateHandoffId(handoffId);
    const matches = pending.filter(({ record }) => record.id === handoffId);
    if (matches.length === 0) {
      throw new Error(`Pending Issue approval handoff not found: ${handoffId}`);
    }
    if (matches.length > 1) {
      throw new Error(`Duplicate pending Issue approval handoff ID: ${handoffId}`);
    }
    return matches[0];
  }
  if (pending.length === 0) {
    throw new Error("No pending Issue approval handoff exists");
  }
  if (pending.length > 1) {
    throw new Error(
      `Multiple pending Issue approval handoffs exist: ${pending.map(({ record }) => record.id).join(", ")}`,
    );
  }
  return pending[0];
}

function selectPendingHandoffBatch(pending, handoffIds) {
  if (!Array.isArray(handoffIds) || handoffIds.length < 2) {
    throw new Error("Batch approval requires at least two exact handoff IDs");
  }
  if (handoffIds.length > MAX_BATCH_HANDOFFS) {
    throw new Error(`Batch approval accepts at most ${MAX_BATCH_HANDOFFS} handoffs`);
  }
  if (new Set(handoffIds).size !== handoffIds.length) {
    throw new Error("Batch approval handoff IDs must be unique");
  }
  return handoffIds.map((handoffId) => selectPendingHandoff(pending, handoffId));
}

function applyArgumentValue(record, option) {
  const index = record.apply_arguments.indexOf(option);
  return index >= 0 ? record.apply_arguments[index + 1] ?? null : null;
}

function existingIssueTarget(selected) {
  if (selected.record.apply_workflow === "github.issue.create.apply") return null;
  const repository = applyArgumentValue(selected.record, "--repo");
  const issue = Number(applyArgumentValue(selected.record, "--issue"));
  if (typeof repository !== "string" || !repository || !Number.isSafeInteger(issue) || issue < 1) {
    return null;
  }
  return {
    key: `${repository.toLowerCase()}#${issue}`,
    display: `${repository}#${issue}`,
  };
}

function preflightArguments(applyArguments) {
  const output = [];
  for (let index = 0; index < applyArguments.length; index += 1) {
    const argument = applyArguments[index];
    if (argument === "--apply") continue;
    if (argument.startsWith("--expected-")) {
      index += 1;
      continue;
    }
    output.push(argument);
  }
  return output;
}

function refreshableExpectations(applyWorkflow, priorWorkflows) {
  const options = new Set(["--expected-updated-at"]);
  if (applyWorkflow === "github.issue.comment.apply") {
    options.add("--expected-issue-sha256");
  } else if (applyWorkflow === "github.issue.update.apply") {
    if (priorWorkflows.some((workflow) => (
      workflow === "github.issue.update.apply" || workflow === "github.issue.label.apply"
    ))) {
      options.add("--expected-current-issue-sha256");
    }
  } else if (applyWorkflow === "github.issue.label.apply") {
    if (priorWorkflows.some((workflow) => (
      workflow === "github.issue.update.apply" || workflow === "github.issue.label.apply"
    ))) {
      options.add("--expected-current-labels-sha256");
    }
  } else if (applyWorkflow === "github.issue.close.apply") {
    if (priorWorkflows.includes("github.issue.update.apply")) {
      options.add("--expected-current-body-sha256");
    }
  }
  return options;
}

function normalizeRefreshedArguments(args, refreshable) {
  const output = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    output.push(argument);
    if (refreshable.has(argument)) {
      if (index + 1 >= args.length) {
        throw new Error(`Dependency refresh is missing a value for ${argument}`);
      }
      output.push("<dependency-refreshed>");
      index += 1;
    }
  }
  return output;
}

function optionValueFromArguments(args, option) {
  const index = args.indexOf(option);
  return index >= 0 ? args[index + 1] ?? null : null;
}

function changedRefreshOptions(reviewed, refreshed, refreshable) {
  return [...refreshable].filter((option) => (
    optionValueFromArguments(reviewed, option) !== optionValueFromArguments(refreshed, option)
  ));
}

function dependencyRefreshError(message, status, refreshResult = null) {
  const error = new Error(message);
  error.handoffStatus = status;
  error.preflightRunId = refreshResult?.run_id ?? null;
  return error;
}

async function refreshSelectedIssueHandoff(selected, priorWorkflows, dependencies = {}) {
  const runPreflight = dependencies.runPreflight;
  if (typeof runPreflight !== "function") {
    throw dependencyRefreshError(
      "Approval handoff dependency preflight runner is unavailable",
      "not-applied",
    );
  }
  const refreshResult = await runPreflight(
    selected.record.preflight_workflow,
    preflightArguments(selected.record.apply_arguments),
  );
  const delegate = refreshResult?.result ?? refreshResult;
  const successful = refreshResult?.status === "success"
    ? delegate?.status === "preflight-ok"
    : refreshResult?.status === "preflight-ok";
  if (!successful || !Array.isArray(delegate?.apply_arguments)) {
    const detail = refreshResult?.error?.message
      ?? delegate?.detail
      ?? `dependency preflight returned ${refreshResult?.status ?? "unknown"}`;
    throw dependencyRefreshError(
      `Dependency refresh failed for ${selected.record.id}: ${detail}`,
      refreshResult?.status === "conflict" ? "conflict" : "not-applied",
      refreshResult,
    );
  }
  try {
    validateApplyArguments(delegate.apply_arguments);
  } catch (error) {
    throw dependencyRefreshError(
      `Dependency refresh returned invalid apply arguments for ${selected.record.id}: ${error.message}`,
      "not-applied",
      refreshResult,
    );
  }
  const refreshable = refreshableExpectations(
    selected.record.apply_workflow,
    priorWorkflows,
  );
  const reviewedShape = normalizeRefreshedArguments(
    selected.record.apply_arguments,
    refreshable,
  );
  const refreshedShape = normalizeRefreshedArguments(
    delegate.apply_arguments,
    refreshable,
  );
  if (JSON.stringify(reviewedShape) !== JSON.stringify(refreshedShape)) {
    throw dependencyRefreshError(
      `Dependency refresh changed reviewed operation content for ${selected.record.id}`,
      "conflict",
      refreshResult,
    );
  }
  return {
    applyArguments: [...delegate.apply_arguments],
    audit: {
      status: "refreshed",
      preflight_workflow: selected.record.preflight_workflow,
      preflight_run_id: refreshResult?.run_id ?? null,
      reviewed_apply_arguments_sha256: sha256(JSON.stringify(selected.record.apply_arguments)),
      refreshed_apply_arguments_sha256: sha256(JSON.stringify(delegate.apply_arguments)),
      refreshed_options: changedRefreshOptions(
        selected.record.apply_arguments,
        delegate.apply_arguments,
        refreshable,
      ),
    },
  };
}

export async function listPendingIssueHandoffs(options) {
  const root = path.resolve(options.root);
  const pending = await pendingHandoffs(root);
  return {
    status: "listed",
    pending_count: pending.length,
    handoffs: pending.map(publicHandoff),
  };
}

async function applySelectedIssueHandoff(root, selected, dependencies = {}, refresh = null) {
  const runApply = dependencies.runApply;
  if (typeof runApply !== "function") {
    throw new Error("Approval handoff apply runner is unavailable");
  }
  const applyResult = await runApply(
    selected.record.apply_workflow,
    refresh?.applyArguments ?? [...selected.record.apply_arguments],
  );
  const completedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
  const status = applyResult.status === "success"
    ? "applied"
    : applyResult.status === "conflict"
      ? "conflict"
      : applyResult.status === "unresolved" || applyResult.mutation_invoked === null
      ? "unresolved"
      : "not-applied";
  const updated = withRecordDigest({
    ...selected.record,
    status,
    updated_at: completedAt,
    apply_run_id: applyResult.run_id ?? null,
    apply_status: applyResult.status,
    ...(refresh ? { dependency_refresh: refresh.audit } : {}),
  });
  await writeJsonAtomic(path.join(root, selected.file), updated);
  return {
    status,
    handoff: {
      id: selected.record.id,
      path: selected.file,
      immutable_sha256: selected.record.immutable_sha256,
      status,
    },
    apply_workflow: selected.record.apply_workflow,
    apply_result: applyResult,
    dependency_refresh: refresh?.audit ?? null,
  };
}

async function recordDependencyRefreshStop(root, selected, error, dependencies = {}) {
  const completedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
  const detail = error instanceof Error ? error.message : String(error);
  const status = error?.handoffStatus === "conflict" ? "conflict" : "not-applied";
  const audit = {
    status,
    detail,
    preflight_run_id: error?.preflightRunId ?? null,
  };
  const updated = withRecordDigest({
    ...selected.record,
    status,
    updated_at: completedAt,
    apply_status: `dependency-refresh-${status}`,
    dependency_refresh: audit,
  });
  await writeJsonAtomic(path.join(root, selected.file), updated);
  return {
    status,
    handoff: {
      id: selected.record.id,
      path: selected.file,
      immutable_sha256: selected.record.immutable_sha256,
      status,
    },
    apply_workflow: selected.record.apply_workflow,
    apply_result: null,
    dependency_refresh: audit,
  };
}

export async function applyPendingIssueHandoff(options, dependencies = {}) {
  const root = path.resolve(options.root);
  let selected;
  try {
    const pending = await pendingHandoffs(root);
    selected = selectPendingHandoff(pending, options.handoff);
  } catch (error) {
    throw asHandoffFailure(error, false);
  }
  return applySelectedIssueHandoff(root, selected, dependencies);
}

export async function applyPendingIssueHandoffBatch(options, dependencies = {}) {
  const root = path.resolve(options.root);
  let reviewed;
  try {
    const selected = selectPendingHandoffBatch(
      await pendingHandoffs(root),
      options.handoffs,
    );
    reviewed = selected.map((entry) => ({
      ...entry,
      reviewed_record_sha256: entry.record.record_sha256,
    }));
  } catch (error) {
    throw asHandoffFailure(error, false);
  }

  const results = [];
  const appliedWorkflowsByTarget = new Map();
  for (let index = 0; index < reviewed.length; index += 1) {
    const expected = reviewed[index];
    let selected;
    try {
      selected = selectPendingHandoff(
        await pendingHandoffs(root),
        expected.record.id,
      );
      if (selected.record.record_sha256 !== expected.reviewed_record_sha256) {
        throw new Error(`Pending Issue approval handoff changed during batch: ${expected.record.id}`);
      }
    } catch (error) {
      if (results.length === 0) throw asHandoffFailure(error, false);
      return {
        status: "partial",
        batch_status: "partial-selection-stop",
        requested_count: reviewed.length,
        processed_count: results.length,
        applied_count: results.filter((entry) => entry.status === "applied").length,
        stopped_handoff: expected.record.id,
        stopped_status: "selection-conflict",
        stop_reason: error instanceof Error ? error.message : String(error),
        remaining_handoffs: reviewed.slice(index).map(({ record }) => record.id),
        results,
      };
    }

    const target = existingIssueTarget(selected);
    const priorWorkflows = target
      ? appliedWorkflowsByTarget.get(target.key) ?? []
      : [];
    let refresh;
    if (priorWorkflows.length > 0) {
      try {
        refresh = await refreshSelectedIssueHandoff(
          selected,
          priorWorkflows,
          dependencies,
        );
      } catch (error) {
        const result = await recordDependencyRefreshStop(
          root,
          selected,
          error,
          dependencies,
        );
        results.push(result);
        const appliedCount = results.filter((entry) => entry.status === "applied").length;
        return {
          status: appliedCount > 0 ? "partial" : result.status,
          batch_status: appliedCount > 0
            ? `partial-${result.status}`
            : `stopped-${result.status}`,
          requested_count: reviewed.length,
          processed_count: results.length,
          applied_count: appliedCount,
          stopped_handoff: expected.record.id,
          stopped_status: result.status,
          stop_reason: result.dependency_refresh.detail,
          remaining_handoffs: reviewed.slice(index + 1).map(({ record }) => record.id),
          results,
        };
      }
    }

    let result;
    try {
      result = await applySelectedIssueHandoff(root, selected, dependencies, refresh);
    } catch (error) {
      if (results.length === 0) throw error;
      return {
        status: "partial",
        batch_status: "partial-apply-error",
        requested_count: reviewed.length,
        processed_count: results.length,
        applied_count: results.filter((entry) => entry.status === "applied").length,
        stopped_handoff: expected.record.id,
        stopped_status: "apply-error",
        stop_reason: error instanceof Error ? error.message : String(error),
        remaining_handoffs: reviewed.slice(index).map(({ record }) => record.id),
        results,
      };
    }
    results.push(result);
    if (result.status === "applied" && target) {
      appliedWorkflowsByTarget.set(target.key, [
        ...priorWorkflows,
        selected.record.apply_workflow,
      ]);
    }
    if (result.status !== "applied") {
      const appliedCount = results.filter((entry) => entry.status === "applied").length;
      return {
        status: appliedCount > 0 ? "partial" : result.status,
        batch_status: appliedCount > 0 ? `partial-${result.status}` : `stopped-${result.status}`,
        requested_count: reviewed.length,
        processed_count: results.length,
        applied_count: appliedCount,
        stopped_handoff: expected.record.id,
        stopped_status: result.status,
        remaining_handoffs: reviewed.slice(index + 1).map(({ record }) => record.id),
        results,
      };
    }
  }

  return {
    status: "applied",
    batch_status: "applied",
    requested_count: reviewed.length,
    processed_count: results.length,
    applied_count: results.length,
    stopped_handoff: null,
    stopped_status: null,
    remaining_handoffs: [],
    results,
  };
}

export async function dismissPendingIssueHandoff(options, dependencies = {}) {
  if (!options.handoff) {
    throw new Error("github.issue.handoff.dismiss requires an exact handoff ID");
  }
  const root = path.resolve(options.root);
  let selected;
  try {
    const pending = await pendingHandoffs(root);
    selected = selectPendingHandoff(pending, options.handoff);
  } catch (error) {
    throw asHandoffFailure(error, false);
  }
  const completedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
  const updated = withRecordDigest({
    ...selected.record,
    status: "not-applied",
    updated_at: completedAt,
    disposition: "dismissed-by-human",
  });
  await writeJsonAtomic(path.join(root, selected.file), updated);
  return {
    status: "dismissed",
    handoff: {
      id: selected.record.id,
      path: selected.file,
      immutable_sha256: selected.record.immutable_sha256,
      status: "not-applied",
    },
  };
}
