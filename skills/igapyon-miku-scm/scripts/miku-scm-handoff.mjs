import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { relativeOperationalPath } from "./miku-scm-operational-path.mjs";
import { workflowContractById } from "./miku-scm-workflow-contract-lock.mjs";
import {
  ISSUE_APPROVAL_CONTRACTS,
  ISSUE_REVIEW_SCHEMA_VERSION,
  buildIssueReviewBinding,
  normalizeIssueReview,
  validateIssueApprovalBinding,
} from "./miku-scm-issue-approval.mjs";

export const HANDOFF_SCHEMA_VERSION = "miku-scm.approval-handoff/v2";
export const LEGACY_HANDOFF_SCHEMA_VERSION = "miku-scm.approval-handoff/v1";

const ISSUE_APPLY_WORKFLOWS = new Set([
  "github.issue.create.apply",
  "github.issue.update.apply",
  "github.issue.comment.apply",
  "github.issue.label.apply",
  "github.issue.close.apply",
]);
const HANDOFF_STATUSES = new Set([
  "pending",
  "applying",
  "applied",
  "conflict",
  "not-applied",
  "unresolved",
  "dismissed",
]);
const LEGACY_HANDOFF_STATUSES = new Set([
  "pending", "applied", "conflict", "not-applied", "unresolved",
]);
const HANDOFF_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const HANDOFF_SHORT_ID = /^[0-9a-f]{12}$/;
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

function validateHandoffSelector(value) {
  if (typeof value !== "string" || !HANDOFF_ID.test(value)) {
    throw new Error("--handoff must be a full approval handoff ID or a 12-character approval suffix");
  }
  return value;
}

export function shortHandoffId(value) {
  if (typeof value !== "string" || !HANDOFF_ID.test(value)) return null;
  const suffix = value.slice(-12);
  return HANDOFF_SHORT_ID.test(suffix) ? suffix : null;
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
    expectedReviewSha256: null,
    approvalCommand: null,
    resume: false,
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
      options.handoff = validateHandoffSelector(optionValue(argv, index, "--handoff"));
      index += 1;
    } else if (argument === "--expected-review-sha256") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.expectedReviewSha256 = optionValue(argv, index, argument);
      if (!SHA256.test(options.expectedReviewSha256)) {
        throw new Error("--expected-review-sha256 must be a lowercase SHA-256 digest");
      }
      index += 1;
    } else if (argument === "--approval-command") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.approvalCommand = optionValue(argv, index, argument);
      index += 1;
    } else if (argument === "--resume") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.resume = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.apply) throw new Error("github.issue.handoff.apply requires --apply");
  if (!options.handoff) throw new Error("github.issue.handoff.apply requires --handoff");
  if (!options.expectedReviewSha256) {
    throw new Error("github.issue.handoff.apply requires --expected-review-sha256");
  }
  if (options.resume === Boolean(options.approvalCommand)) {
    throw new Error("Specify exactly one of --approval-command or --resume");
  }
  return options;
}

export function parseHandoffBatchApplyArgs(argv, cwd = process.cwd()) {
  const options = {
    root: path.resolve(cwd),
    handoffs: [],
    expectedReviewSha256: null,
    approvalCommand: null,
    resume: false,
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
      const handoff = validateHandoffSelector(optionValue(argv, index, "--handoff"));
      if (options.handoffs.includes(handoff)) {
        throw new Error(`Duplicate batch approval handoff selector: ${handoff}`);
      }
      options.handoffs.push(handoff);
      index += 1;
    } else if (argument === "--expected-review-sha256") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.expectedReviewSha256 = optionValue(argv, index, argument);
      if (!SHA256.test(options.expectedReviewSha256)) {
        throw new Error("--expected-review-sha256 must be a lowercase SHA-256 digest");
      }
      index += 1;
    } else if (argument === "--approval-command") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.approvalCommand = optionValue(argv, index, argument);
      index += 1;
    } else if (argument === "--resume") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.resume = true;
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
  if (!options.expectedReviewSha256) {
    throw new Error("github.issue.handoff.batch.apply requires --expected-review-sha256");
  }
  if (options.resume === Boolean(options.approvalCommand)) {
    throw new Error("Specify exactly one of --approval-command or --resume");
  }
  return options;
}

export function parseHandoffReviewArgs(argv, cwd = process.cwd()) {
  const options = { root: path.resolve(cwd), handoffs: [] };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
      seen.add(argument);
      options.root = path.resolve(cwd, optionValue(argv, index, argument));
      index += 1;
    } else if (argument === "--handoff") {
      const selector = validateHandoffSelector(optionValue(argv, index, argument));
      if (options.handoffs.includes(selector)) throw new Error(`Duplicate handoff selector: ${selector}`);
      options.handoffs.push(selector);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.handoffs.length < 1 || options.handoffs.length > MAX_BATCH_HANDOFFS) {
    throw new Error(`github.issue.handoff.review requires 1..${MAX_BATCH_HANDOFFS} --handoff values`);
  }
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
      options.handoff = validateHandoffSelector(optionValue(argv, index, "--handoff"));
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
  validateHandoffSelector(runId);
  validateApplyArguments(applyArguments);
  const directory = path.join(path.resolve(root), "workplace", "miku-scm", "handoffs");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `${runId}.json`);
  const relativeFile = relativeOperationalPath(path.resolve(root), file);
  const review = normalizeIssueReview(preflightWorkflow, reviewedResult);
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
    ...(shortHandoffId(runId) ? { short_id: shortHandoffId(runId) } : {}),
    status: "pending",
    path: relativeFile,
    immutable_sha256: record.immutable_sha256,
    record_sha256: record.record_sha256,
  };
}

export function validateHandoffRecord(record) {
  if (!record || !new Set([HANDOFF_SCHEMA_VERSION, LEGACY_HANDOFF_SCHEMA_VERSION])
    .has(record.schema_version)) {
    throw new Error("Unsupported approval handoff schema");
  }
  if (!ISSUE_APPLY_WORKFLOWS.has(record.apply_workflow)) {
    throw new Error("Approval handoff names an unsupported apply workflow");
  }
  if (!HANDOFF_ID.test(record.id ?? "")) {
    throw new Error("Approval handoff has an invalid ID");
  }
  const validStatuses = record.schema_version === HANDOFF_SCHEMA_VERSION
    ? HANDOFF_STATUSES
    : LEGACY_HANDOFF_STATUSES;
  if (!validStatuses.has(record.status)) {
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
  if (record.schema_version === HANDOFF_SCHEMA_VERSION) {
    if (record.review?.schema_version !== ISSUE_REVIEW_SCHEMA_VERSION
      || typeof record.review.operation !== "string"
      || typeof record.review.repository !== "string"
      || typeof record.review.proposal !== "object" || record.review.proposal === null
      || typeof record.review.context !== "object" || record.review.context === null) {
      throw new Error("Approval handoff has an invalid complete Issue review");
    }
    if (record.status === "applying" && !record.approval_receipt) {
      throw new Error("Applying approval handoff is missing its approval receipt");
    }
    if (record.approval_receipt
      && (!SHA256.test(record.approval_receipt.review_sha256 ?? "")
        || !Array.isArray(record.approval_receipt.handoff_ids))) {
      throw new Error("Approval handoff has an invalid approval receipt");
    }
  }
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
  const review = record.review ?? {};
  const context = review.context ?? {};
  return {
    id: record.id,
    ...(shortHandoffId(record.id) ? { short_id: shortHandoffId(record.id) } : {}),
    status: record.status,
    created_at: record.created_at,
    updated_at: record.updated_at,
    apply_workflow: record.apply_workflow,
    repository: review.repository ?? null,
    issue: review.issue_number ?? review.issue ?? null,
    title: review.issue_title ?? review.proposal?.title ?? review.proposal?.proposed_title ?? null,
    draft: context.draft ?? review.draft ?? null,
    path: file,
    immutable_sha256: record.immutable_sha256,
  };
}

function resolveContractPairs(contracts) {
  if (contracts === undefined || contracts === null) contracts = workflowContractById();
  if (typeof contracts === "function") contracts = contracts();
  if (contracts instanceof Map) {
    return ISSUE_APPROVAL_CONTRACTS.map((workflow) => {
      const contract = contracts.get(workflow);
      if (!contract?.pair_sha256) throw new Error(`Current workflow contract is unavailable: ${workflow}`);
      return { workflow, pair_sha256: contract.pair_sha256 };
    });
  }
  if (Array.isArray(contracts)) return contracts;
  throw new Error("Current Issue approval workflow contracts are unavailable");
}

function selectedBySelectors(entries, selectors, statuses = new Set(["pending"])) {
  if (!Array.isArray(selectors) || selectors.length < 1 || selectors.length > MAX_BATCH_HANDOFFS) {
    throw new Error(`Review requires 1..${MAX_BATCH_HANDOFFS} explicit handoff selectors`);
  }
  const selected = selectors.map((selector) => {
    validateHandoffSelector(selector);
    const matches = entries.filter(({ record }) => statuses.has(record.status)
      && (record.id === selector || (HANDOFF_SHORT_ID.test(selector) && record.id.endsWith(selector))));
    if (matches.length !== 1) {
      throw new Error(matches.length > 1
        ? `Ambiguous Issue approval handoff selector: ${selector}`
        : `Issue approval handoff not found for selector: ${selector}`);
    }
    return matches[0];
  });
  if (new Set(selected.map(({ record }) => record.id)).size !== selected.length) {
    throw new Error("Issue approval handoff selectors must resolve to unique records");
  }
  return selected;
}

export async function reviewIssueApprovalHandoffs(options, dependencies = {}) {
  const root = await realpath(path.resolve(options.root));
  const records = await readHandoffs(root);
  const selected = selectedBySelectors(records, options.handoffs);
  if (selected.some(({ record }) => record.schema_version !== HANDOFF_SCHEMA_VERSION)) {
    throw new Error("Legacy approval handoff requires a fresh Issue preflight before review");
  }
  const binding = buildIssueReviewBinding(
    root,
    selected,
    resolveContractPairs(dependencies.approvalContracts),
  );
  return {
    status: "reviewed",
    repository_root: root,
    handoff_count: selected.length,
    handoffs: selected.map(({ record }) => ({
      id: record.id,
      apply_workflow: record.apply_workflow,
      review: record.review,
    })),
    review_binding: binding,
  };
}

function selectPendingHandoff(pending, handoffId = null) {
  if (handoffId) {
    validateHandoffSelector(handoffId);
    const exactMatches = pending.filter(({ record }) => record.id === handoffId);
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1) {
      throw new Error(`Duplicate pending Issue approval handoff ID: ${handoffId}`);
    }
    if (HANDOFF_SHORT_ID.test(handoffId)) {
      const suffixMatches = pending.filter(({ record }) => record.id.endsWith(handoffId));
      if (suffixMatches.length === 1) return suffixMatches[0];
      if (suffixMatches.length > 1) {
        throw new Error(`Ambiguous pending Issue approval suffix: ${handoffId}`);
      }
    }
    throw new Error(`Pending Issue approval handoff not found: ${handoffId}`);
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
    throw new Error("Batch approval requires at least two handoff selectors");
  }
  if (handoffIds.length > MAX_BATCH_HANDOFFS) {
    throw new Error(`Batch approval accepts at most ${MAX_BATCH_HANDOFFS} handoffs`);
  }
  if (new Set(handoffIds).size !== handoffIds.length) {
    throw new Error("Batch approval handoff selectors must be unique");
  }
  const selected = handoffIds.map((handoffId) => selectPendingHandoff(pending, handoffId));
  if (new Set(selected.map(({ record }) => record.id)).size !== selected.length) {
    throw new Error("Batch approval handoff selectors must resolve to unique pending handoffs");
  }
  return selected;
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
    if (priorWorkflows.includes("github.issue.comment.apply")) {
      options.add("--expected-comments-sha256");
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

function delegateApplyResult(record) {
  const result = record.apply_result;
  return result?.result && typeof result.result === "object" ? result.result : result;
}

function snapshotCommentsForCompare(comments) {
  if (!Array.isArray(comments)) throw new Error("Issue comment snapshot is incomplete");
  return comments.map((entry) => ({ url: entry.url, body: entry.body }))
    .sort((left, right) => left.url.localeCompare(right.url, "en"));
}

function assertDependencySnapshot(selected, preflightResult, priorEntries) {
  const baseline = selected.record.review?.context?.issue_snapshot;
  if (!baseline || !Array.isArray(baseline.comments)) {
    throw dependencyRefreshError("Reviewed Issue snapshot is incomplete for safe dependency refresh", "conflict");
  }
  const observed = preflightResult;
  const expected = {
    title: baseline.title,
    body: baseline.body,
    state: baseline.state,
    labels: baseline.labels,
    comments: snapshotCommentsForCompare(baseline.comments),
  };
  for (const prior of priorEntries) {
    const operation = prior.record.review.operation;
    const proposal = prior.record.review.proposal;
    const result = delegateApplyResult(prior.record);
    if (operation === "update") {
      expected.title = proposal.proposed_title;
      expected.body = proposal.proposed_body;
      expected.labels = proposal.resulting_labels;
    } else if (operation === "label") {
      expected.labels = proposal.resulting_labels;
    } else if (operation === "comment") {
      const commentUrl = result?.comment_url;
      if (result?.status !== "commented" || typeof commentUrl !== "string"
        || !commentUrl.endsWith(`#issuecomment-${result.comment_id}`)
        || result.verified_body_sha256 !== sha256(proposal.comment_body)) {
        throw dependencyRefreshError("Earlier Issue comment lacks an exact verified receipt", "conflict");
      }
      expected.comments.push({ url: commentUrl, body: proposal.comment_body });
      expected.comments.sort((left, right) => left.url.localeCompare(right.url, "en"));
    } else {
      throw dependencyRefreshError(`Unsupported earlier Issue operation in dependency sequence: ${operation}`, "conflict");
    }
  }
  if (observed.current_title !== expected.title
    || observed.current_body !== expected.body
    || observed.current_state !== expected.state
    || JSON.stringify(observed.current_labels) !== JSON.stringify(expected.labels)) {
    throw dependencyRefreshError("Issue title, body, state, or labels changed outside the approved sequence", "conflict");
  }
  let observedComments;
  try {
    observedComments = snapshotCommentsForCompare(observed.current_comments);
  } catch (error) {
    throw dependencyRefreshError(error.message, "conflict");
  }
  if (JSON.stringify(observedComments) !== JSON.stringify(expected.comments)) {
    throw dependencyRefreshError("Issue comments changed outside the approved sequence", "conflict");
  }
}

async function refreshSelectedIssueHandoff(selected, priorEntries, dependencies = {}) {
  const priorWorkflows = priorEntries.map(({ record }) => record.apply_workflow);
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
    assertDependencySnapshot(selected, delegate, priorEntries);
  } catch (error) {
    if (error?.handoffStatus) throw error;
    throw dependencyRefreshError(error.message, "conflict", refreshResult);
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
  const all = await readHandoffs(root);
  const pending = all.filter(({ record }) => record.status === "pending");
  const attention = all.filter(({ record }) => (
    ["applying", "not-applied", "conflict", "unresolved"].includes(record.status)
  ));
  return {
    status: "listed",
    pending_count: pending.length,
    handoffs: pending.map(publicHandoff),
    attention_count: attention.length,
    attention_handoffs: attention.map(publicHandoff),
  };
}

function timestamp(dependencies) {
  return (dependencies.now ? dependencies.now() : new Date()).toISOString();
}

function handoffFile(root, selected) {
  return path.join(root, selected.file);
}

async function writeHandoffRecord(root, selected, record) {
  const updated = withRecordDigest(record);
  await writeJsonAtomic(handoffFile(root, selected), updated);
  selected.record = updated;
  return updated;
}

function handoffStatusForApplyResult(applyResult) {
  if (applyResult?.status === "success" && applyResult.mutation_invoked === true) return "applied";
  if (applyResult?.status === "conflict" && applyResult.mutation_invoked === false) return "conflict";
  if (applyResult?.status === "not-applied" && applyResult.mutation_invoked === false) return "not-applied";
  return "unresolved";
}

async function applySelectedIssueHandoff(root, selected, dependencies = {}, refresh = null) {
  const runApply = dependencies.runApply;
  if (typeof runApply !== "function") throw new Error("Approval handoff apply runner is unavailable");
  let applyResult;
  try {
    applyResult = await runApply(
      selected.record.apply_workflow,
      refresh?.applyArguments ?? [...selected.record.apply_arguments],
    );
  } catch (error) {
    applyResult = {
      status: "unresolved",
      mutation_invoked: Object.hasOwn(error ?? {}, "mutationInvoked")
        ? error.mutationInvoked
        : null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const status = handoffStatusForApplyResult(applyResult);
  const completedAt = timestamp(dependencies);
  await writeHandoffRecord(root, selected, {
    ...selected.record,
    status,
    updated_at: completedAt,
    apply_run_id: applyResult?.run_id ?? null,
    apply_status: applyResult?.status ?? "unknown",
    mutation_invoked: applyResult?.mutation_invoked ?? null,
    apply_result: applyResult ?? null,
    ...(refresh ? { dependency_refresh: refresh.audit } : {}),
  });
  return {
    status,
    mutation_invoked: applyResult?.mutation_invoked ?? null,
    handoff: {
      id: selected.record.id,
      path: selected.file,
      immutable_sha256: selected.record.immutable_sha256,
      status,
    },
    apply_workflow: selected.record.apply_workflow,
    handoff_review: selected.record.review,
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
  await writeHandoffRecord(root, selected, {
    ...selected.record,
    status,
    updated_at: completedAt,
    mutation_invoked: false,
    apply_status: `dependency-refresh-${status}`,
    dependency_refresh: audit,
  });
  return {
    status,
    mutation_invoked: false,
    handoff: {
      id: selected.record.id,
      path: selected.file,
      immutable_sha256: selected.record.immutable_sha256,
      status,
    },
    apply_workflow: selected.record.apply_workflow,
    handoff_review: selected.record.review,
    apply_result: null,
    dependency_refresh: audit,
  };
}

function approvalReceipt(record) {
  const receipt = record.approval_receipt;
  if (!receipt || typeof receipt.approval_command !== "string"
    || !Array.isArray(receipt.handoff_ids)) {
    throw new Error(`Handoff has no resumable approval receipt: ${record.id}`);
  }
  return receipt;
}

async function acquireClaims(root, selected, executionId, dependencies) {
  const acquired = [];
  try {
    for (const entry of [...selected].sort((left, right) => left.record.id.localeCompare(right.record.id, "en"))) {
      const claimPath = path.join(root, entry.file.replace(/\.json$/, ".claim"));
      await mkdir(claimPath, { recursive: false, mode: 0o700 });
      acquired.push(claimPath);
      await writeFile(path.join(claimPath, "claim.json"), `${JSON.stringify({
        execution_id: executionId,
        handoff_id: entry.record.id,
        claimed_at: timestamp(dependencies),
      }, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    }
    return acquired;
  } catch (error) {
    await Promise.all(acquired.map((claimPath) => rm(claimPath, { recursive: true, force: true })));
    if (error?.code === "EEXIST") {
      throw new Error("An Issue approval handoff is already claimed for execution or reconciliation");
    }
    throw error;
  }
}

async function releaseClaims(claims) {
  await Promise.all(claims.map((claimPath) => rm(claimPath, { recursive: true, force: true })));
}

function reviewBindingFor(root, selected, dependencies) {
  return buildIssueReviewBinding(root, selected, resolveContractPairs(dependencies.approvalContracts));
}

function assertCurrentReview(options, root, selected, dependencies) {
  if (selected.some(({ record }) => record.schema_version !== HANDOFF_SCHEMA_VERSION)) {
    throw new Error("Legacy approval handoff requires a fresh Issue preflight and review");
  }
  const binding = reviewBindingFor(root, selected, dependencies);
  if (binding.review_sha256 !== options.expectedReviewSha256) {
    throw new Error("Issue review binding changed; run review again and obtain a new approve");
  }
  return binding;
}

function assertResumeOrder(selected) {
  let phase = "applied";
  for (const { record } of selected) {
    if (record.status === "applied" && phase === "applied") continue;
    if (record.status === "not-applied" && phase === "applied") {
      if (record.mutation_invoked !== false) {
        throw new Error(`Handoff is not proven safe to resume: ${record.id}`);
      }
      phase = "retry";
      continue;
    }
    if (record.status === "pending" && (phase === "applied" || phase === "retry" || phase === "pending")) {
      phase = "pending";
      continue;
    }
    throw new Error("Resume requires an applied prefix, at most one known not-applied step, and pending suffix");
  }
}

function validateReviewSequence(selected) {
  const byTarget = new Map();
  for (const entry of selected) {
    const target = existingIssueTarget(entry);
    if (!target) continue;
    const prior = byTarget.get(target.key) ?? [];
    prior.push(entry.record.review.operation);
    byTarget.set(target.key, prior);
  }
  for (const operations of byTarget.values()) {
    const rank = { update: 0, label: 1, comment: 2, close: 3 };
    if (operations.some((operation) => !(operation in rank))) {
      throw new Error("Create cannot be combined with operations whose Issue number is not yet known");
    }
    if (new Set(operations).size !== operations.length) {
      throw new Error("A reviewed Issue sequence may contain each operation type only once");
    }
    const ranks = operations.map((operation) => rank[operation]);
    if (ranks.some((value, index) => index > 0 && value <= ranks[index - 1])) {
      throw new Error("Same-Issue operations must be ordered update, label, comment, then close");
    }
  }
}

async function applyReviewedHandoffs(options, dependencies = {}, batch = false) {
  const root = await realpath(path.resolve(options.root));
  const selectors = batch ? options.handoffs : [options.handoff];
  let selected;
  let binding;
  let command;
  let receipt;
  try {
    selected = selectedBySelectors(
      await readHandoffs(root),
      selectors,
      options.resume
        ? new Set(["applied", "not-applied", "pending"])
        : new Set(["pending"]),
    );
    validateReviewSequence(selected);
    binding = assertCurrentReview(options, root, selected, dependencies);
    if (options.resume) {
      assertResumeOrder(selected);
      const receipts = selected.map(({ record }) => approvalReceipt(record));
      receipt = receipts[0];
      if (receipts.some((entry) => entry.review_sha256 !== binding.review_sha256
        || entry.approval_command !== receipt.approval_command
        || JSON.stringify(entry.handoff_ids) !== JSON.stringify(selected.map(({ record }) => record.id)))) {
        throw new Error("Stored approval receipts do not match this exact ordered review");
      }
      command = receipt.approval_command;
    } else {
      if (selected.some(({ record }) => record.status !== "pending")) {
        throw new Error("Only pending reviewed Issue handoffs can use a new approve command");
      }
      command = options.approvalCommand;
      validateIssueApprovalBinding(command, binding, selected);
      receipt = {
        approval_command: command,
        review_sha256: binding.review_sha256,
        handoff_ids: selected.map(({ record }) => record.id),
        approved_at: timestamp(dependencies),
        execution_id: randomUUID(),
      };
    }
    if (options.resume) validateIssueApprovalBinding(command, binding, selected);
  } catch (error) {
    throw asHandoffFailure(error, false);
  }

  const executionId = randomUUID();
  let claims;
  try {
    claims = await acquireClaims(root, selected, executionId, dependencies);
    const latest = await readHandoffs(root);
    for (let index = 0; index < selected.length; index += 1) {
      const current = latest.find(({ record }) => record.id === selected[index].record.id);
      if (!current || current.record.record_sha256 !== selected[index].record.record_sha256) {
        throw new Error(`Issue approval handoff changed before its execution claim: ${selected[index].record.id}`);
      }
      selected[index].record = current.record;
      selected[index].file = current.file;
    }
    if (!options.resume) {
      for (const entry of selected) {
        await writeHandoffRecord(root, entry, {
          ...entry.record,
          status: "applying",
          updated_at: timestamp(dependencies),
          execution_id: executionId,
          approval_receipt: receipt,
          mutation_invoked: false,
        });
      }
    } else {
      for (const entry of selected) {
        if (entry.record.status === "applied") continue;
        await writeHandoffRecord(root, entry, {
          ...entry.record,
          status: "applying",
          updated_at: timestamp(dependencies),
          execution_id: executionId,
          approval_receipt: receipt,
        });
      }
    }
  } catch (error) {
    if (claims) await releaseClaims(claims);
    throw asHandoffFailure(error, false);
  }

  const results = [];
  const appliedWorkflowsByTarget = new Map();
  let unresolved = false;
  for (let index = 0; index < selected.length; index += 1) {
    const entry = selected[index];
    if (entry.record.status === "applied" && options.resume) {
      results.push({
        status: "applied",
        mutation_invoked: false,
        skipped: true,
        handoff: { id: entry.record.id, status: "applied", immutable_sha256: entry.record.immutable_sha256 },
        apply_workflow: entry.record.apply_workflow,
        handoff_review: entry.record.review,
        apply_result: entry.record.apply_result ?? null,
      });
      const target = existingIssueTarget(entry);
      if (target) {
        appliedWorkflowsByTarget.set(target.key, [
          ...(appliedWorkflowsByTarget.get(target.key) ?? []),
          entry,
        ]);
      }
      continue;
    }
    const target = existingIssueTarget(entry);
    const priorEntries = target ? appliedWorkflowsByTarget.get(target.key) ?? [] : [];
    let refresh;
    if (priorEntries.length > 0) {
      try {
        refresh = await refreshSelectedIssueHandoff(entry, priorEntries, dependencies);
      } catch (error) {
        const stopped = await recordDependencyRefreshStop(root, entry, error, dependencies);
        results.push(stopped);
        break;
      }
    }
    const result = await applySelectedIssueHandoff(root, entry, dependencies, refresh);
    results.push(result);
    if (result.status === "applied" && target) {
      appliedWorkflowsByTarget.set(target.key, [
        ...priorEntries,
        entry,
      ]);
    }
    if (result.status === "unresolved") {
      unresolved = true;
      break;
    }
    if (result.status !== "applied") break;
  }

  const allApplied = results.length === selected.length
    && results.every((result) => result.status === "applied");
  if (!unresolved) {
    for (const entry of selected) {
      if (entry.record.status === "applying") {
        await writeHandoffRecord(root, entry, {
          ...entry.record,
          status: "pending",
          updated_at: timestamp(dependencies),
          mutation_invoked: false,
        });
      }
    }
    await releaseClaims(claims);
  }
  const appliedCount = results.filter((result) => result.status === "applied").length;
  const stopped = results.find((result) => result.status !== "applied");
  const output = {
    status: allApplied ? "applied" : appliedCount > 0 ? "partial" : stopped?.status ?? "unresolved",
    batch_status: allApplied ? "applied" : appliedCount > 0
      ? `partial-${stopped?.status ?? "stopped"}`
      : `stopped-${stopped?.status ?? "unresolved"}`,
    requested_count: selected.length,
    processed_count: results.filter((result) => !result.skipped).length,
    applied_count: appliedCount,
    stopped_handoff: stopped?.handoff?.id ?? null,
    stopped_status: stopped?.status ?? null,
    mutation_invoked: results.some((result) => result.mutation_invoked === true)
      ? true
      : results.some((result) => result.mutation_invoked === null) ? null : false,
    remaining_handoffs: stopped
      ? selected.slice(selected.findIndex(({ record }) => record.id === stopped.handoff?.id) + 1)
        .map(({ record }) => record.id)
      : [],
    stop_reason: stopped?.dependency_refresh?.detail
      ?? stopped?.apply_result?.error
      ?? null,
    review_binding: binding,
    results,
  };
  if (!batch && results[0]) {
    output.handoff = results[0].handoff;
    output.apply_workflow = results[0].apply_workflow;
    output.handoff_review = results[0].handoff_review;
    output.apply_result = results[0].apply_result;
  }
  return output;
}

export async function applyPendingIssueHandoff(options, dependencies = {}) {
  return applyReviewedHandoffs(options, dependencies, false);
}

export async function applyPendingIssueHandoffBatch(options, dependencies = {}) {
  return applyReviewedHandoffs(options, dependencies, true);
}

export async function dismissPendingIssueHandoff(options, dependencies = {}) {
  if (!options.handoff) {
    throw new Error("github.issue.handoff.dismiss requires a full handoff ID or a 12-character approval suffix");
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
    status: selected.record.schema_version === HANDOFF_SCHEMA_VERSION ? "dismissed" : "not-applied",
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
      status: updated.status,
    },
  };
}
