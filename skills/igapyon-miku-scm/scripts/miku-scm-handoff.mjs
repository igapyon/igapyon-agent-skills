import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const HANDOFF_SCHEMA_VERSION = "miku-scm.approval-handoff/v1";

const ISSUE_APPLY_WORKFLOWS = new Set([
  "github.issue.create.apply",
  "github.issue.update.apply",
  "github.issue.comment.apply",
  "github.issue.label.apply",
  "github.issue.close.apply",
]);
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

export function parseHandoffApplyArgs(argv, cwd = process.cwd()) {
  const options = {
    root: path.resolve(cwd),
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      options.apply = true;
    } else if (argument === "--root") {
      options.root = path.resolve(argv[++index] ?? "");
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.apply) throw new Error("github.issue.handoff.apply requires --apply");
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
  validateApplyArguments(applyArguments);
  const directory = path.join(path.resolve(root), "workplace", "miku-scm", "handoffs");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `${runId}.json`);
  const relativeFile = path.relative(path.resolve(root), file);
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

async function pendingHandoffs(root) {
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
    if (record.status === "pending") records.push({ file: normalized, record });
  }
  return records;
}

export async function applyPendingIssueHandoff(options, dependencies = {}) {
  const root = path.resolve(options.root);
  const pending = await pendingHandoffs(root);
  if (pending.length === 0) {
    throw new Error("No pending Issue approval handoff exists");
  }
  if (pending.length > 1) {
    throw new Error(
      `Multiple pending Issue approval handoffs exist: ${pending.map(({ record }) => record.id).join(", ")}`,
    );
  }
  const selected = pending[0];
  const runApply = dependencies.runApply;
  if (typeof runApply !== "function") {
    throw new Error("Approval handoff apply runner is unavailable");
  }
  const applyResult = await runApply(
    selected.record.apply_workflow,
    [...selected.record.apply_arguments],
  );
  const completedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
  const status = applyResult.status === "success"
    ? "applied"
    : applyResult.status === "unresolved" || applyResult.mutation_invoked === null
      ? "unresolved"
      : "not-applied";
  const updated = withRecordDigest({
    ...selected.record,
    status,
    updated_at: completedAt,
    apply_run_id: applyResult.run_id ?? null,
    apply_status: applyResult.status,
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
  };
}
