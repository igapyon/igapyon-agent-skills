import { createHash } from "node:crypto";

export const ISSUE_REVIEW_SCHEMA_VERSION = "miku-scm.issue-review/v1";
export const ISSUE_REVIEW_BINDING_SCHEMA_VERSION = "miku-scm.issue-review-binding/v1";
export const ISSUE_APPROVAL_CONTRACTS = Object.freeze([
  "github.issue.handoff.review",
  "github.issue.handoff.apply",
  "github.issue.handoff.batch.apply",
]);

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SUFFIX = /^[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_HANDOFFS = 20;

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeIssueComments(comments) {
  if (!Array.isArray(comments)) throw new Error("Issue comment evidence is missing or incomplete");
  return comments.map((comment) => {
    const url = comment?.url ?? comment?.html_url;
    if (typeof url !== "string" || !url || typeof comment?.body !== "string") {
      throw new Error("Issue comment evidence contains an incomplete comment");
    }
    return {
      url,
      body: comment.body,
      created_at: comment.createdAt ?? comment.created_at ?? null,
      author: comment.author?.login ?? comment.author ?? null,
    };
  }).sort((left, right) => left.url.localeCompare(right.url, "en"));
}

export function normalizeIssueCommentConnection(connection) {
  const nodes = connection?.nodes ?? connection?.Nodes;
  const totalCount = connection?.totalCount ?? connection?.total_count ?? connection?.TotalCount;
  const pageInfo = connection?.pageInfo ?? connection?.PageInfo;
  const hasNextPage = pageInfo?.hasNextPage ?? pageInfo?.HasNextPage;
  if (
    !Array.isArray(nodes)
    || !Number.isSafeInteger(totalCount)
    || totalCount < 0
    || nodes.length !== totalCount
    || hasNextPage === true
  ) {
    throw new Error("Issue comment evidence is missing or incomplete");
  }
  return normalizeIssueComments(nodes);
}

export function issueCommentsSha256(comments) {
  return sha256(JSON.stringify(normalizeIssueComments(comments)));
}

function validSelector(value) {
  return ID.test(value) || SUFFIX.test(value);
}

function resultValue(result, ...keys) {
  for (const key of keys) {
    if (result[key] !== undefined && result[key] !== null) return result[key];
  }
  return null;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Issue review is missing ${label}`);
  }
  return value;
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Issue review is missing ${label}`);
  }
  return [...value];
}

function operationForWorkflow(workflow) {
  const match = /^github\.issue\.(create|update|comment|label|close)\.preflight$/.exec(workflow);
  if (!match) throw new Error(`Unsupported Issue review workflow: ${workflow}`);
  return match[1];
}

export function parseIssueApprovalCommand(value) {
  if (typeof value !== "string") return { accepted: false, reason: "command-must-be-text" };
  const text = value.trim();
  if (text === "approve" || text === "miku-scm approve") {
    return { accepted: true, kind: "approve", selectors: [] };
  }
  let match = /^miku-scm approve ([A-Za-z0-9][A-Za-z0-9._-]{0,127}|[0-9a-f]{12})$/.exec(text);
  if (match) return { accepted: true, kind: "single", selectors: [match[1]] };
  match = /^miku-scm approve batch ((?:[A-Za-z0-9][A-Za-z0-9._-]{0,127}|[0-9a-f]{12})(?: (?:[A-Za-z0-9][A-Za-z0-9._-]{0,127}|[0-9a-f]{12})){1,19})$/.exec(text);
  if (!match) return { accepted: false, reason: "command-does-not-match-approval-grammar" };
  const selectors = match[1].split(" ");
  if (new Set(selectors).size !== selectors.length) {
    return { accepted: false, reason: "duplicate-selector" };
  }
  return { accepted: true, kind: "batch", selectors };
}

export function normalizeIssueReview(preflightWorkflow, result) {
  if (!result || result.status !== "preflight-ok") {
    throw new Error("Issue review requires a successful preflight result");
  }
  const operation = operationForWorkflow(preflightWorkflow);
  const repository = requireString(result.repository, "repository");
  const issueNumber = resultValue(result, "issue_number", "issue");
  const issue = issueNumber === null ? null : Number(issueNumber);
  if (operation !== "create" && (!Number.isSafeInteger(issue) || issue < 1)) {
    throw new Error("Issue review is missing a valid Issue number");
  }
  const proposal = {};
  if (operation === "create") {
    proposal.title = requireString(result.title, "new Issue title");
    proposal.body = requireString(result.body, "new Issue body");
    proposal.labels = requireStringArray(result.labels, "complete label selection");
    proposal.parent_issue = result.parent_issue ?? null;
  } else if (operation === "update") {
    proposal.current_title = requireString(result.current_title, "current title");
    proposal.proposed_title = requireString(result.proposed_title ?? result.title, "proposed title");
    proposal.current_body = requireString(result.current_body, "current body");
    proposal.proposed_body = requireString(result.proposed_body ?? result.body, "proposed body");
    proposal.body_diff = requireString(result.body_diff, "body diff");
    proposal.current_labels = requireStringArray(result.current_labels, "current labels");
    proposal.resulting_labels = requireStringArray(result.resulting_labels, "resulting labels");
    proposal.add_labels = requireStringArray(result.add_labels, "labels to add");
    proposal.remove_labels = requireStringArray(result.remove_labels, "labels to remove");
  } else if (operation === "comment") {
    proposal.comment_body = requireString(result.comment_body, "complete comment body");
    proposal.issue_state = requireString(result.issue_state, "current Issue state");
  } else if (operation === "label") {
    proposal.current_labels = requireStringArray(result.current_labels, "current labels");
    proposal.resulting_labels = requireStringArray(result.resulting_labels, "resulting labels");
    proposal.add_labels = requireStringArray(result.add_labels, "labels to add");
    proposal.remove_labels = requireStringArray(result.remove_labels, "labels to remove");
  } else {
    proposal.current_state = requireString(result.current_state, "current Issue state");
    proposal.reason = requireString(result.reason, "close reason");
    proposal.duplicate_target = result.duplicate_target ?? null;
  }
  const context = {
    issue_sha256: result.current_issue_sha256 ?? result.issue_sha256 ?? null,
    current_body_sha256: result.current_body_sha256 ?? null,
    current_labels_sha256: result.current_labels_sha256 ?? null,
    updated_at: result.current_updated_at ?? null,
    draft: result.draft ?? null,
    draft_sha256: result.draft_sha256 ?? null,
    labels_sha256: result.labels_sha256 ?? null,
    parent_sha256: result.parent_sha256 ?? null,
    operation_sha256: result.operation_sha256 ?? null,
    issue_snapshot: operation === "create" ? null : {
      title: result.current_title ?? result.issue_title ?? null,
      body: result.current_body ?? null,
      state: result.current_state ?? result.issue_state ?? null,
      labels: Array.isArray(result.current_labels) ? [...result.current_labels] : null,
      updated_at: result.current_updated_at ?? null,
      comments: Array.isArray(result.current_comments)
        ? normalizeIssueComments(result.current_comments)
        : null,
    },
    planned_gh_arguments: Array.isArray(result.planned_gh_arguments)
      ? [...result.planned_gh_arguments]
      : null,
  };
  return {
    schema_version: ISSUE_REVIEW_SCHEMA_VERSION,
    operation,
    repository,
    issue_number: issue,
    issue_url: result.issue_url ?? null,
    issue_title: result.issue_title ?? (operation === "create" ? null : result.current_title ?? result.title ?? null),
    proposal,
    ...(result.warnings?.length ? { warnings: result.warnings.filter((warning) => typeof warning === "string") } : {}),
    context,
  };
}

export function buildIssueReviewBinding(canonicalRoot, records, approvalContracts) {
  if (typeof canonicalRoot !== "string" || canonicalRoot.length === 0) {
    throw new Error("Issue review binding requires a canonical repository root");
  }
  if (!Array.isArray(records) || records.length < 1 || records.length > MAX_HANDOFFS) {
    throw new Error(`Issue review binding requires 1..${MAX_HANDOFFS} handoffs`);
  }
  if (!Array.isArray(approvalContracts) || approvalContracts.length !== ISSUE_APPROVAL_CONTRACTS.length
    || approvalContracts.some((entry, index) => entry?.workflow !== ISSUE_APPROVAL_CONTRACTS[index]
      || !SHA256.test(entry?.pair_sha256 ?? ""))) {
    throw new Error("Issue review binding has incomplete or invalid approval workflow contracts");
  }
  const handoffs = records.map(({ record }) => {
    if (!record || typeof record.id !== "string" || !SHA256.test(record.immutable_sha256 ?? "")) {
      throw new Error("Issue review binding contains an invalid handoff record");
    }
    return { id: record.id, immutable_sha256: record.immutable_sha256 };
  });
  if (new Set(handoffs.map(({ id }) => id)).size !== handoffs.length) {
    throw new Error("Issue review binding handoffs must have unique IDs");
  }
  const binding = {
    schema_version: ISSUE_REVIEW_BINDING_SCHEMA_VERSION,
    root: canonicalRoot,
    approval_contracts: approvalContracts.map(({ workflow, pair_sha256 }) => ({ workflow, pair_sha256 })),
    handoffs,
  };
  return { ...binding, review_sha256: sha256(JSON.stringify(binding)) };
}

function selectorMatches(selector, record) {
  return selector === record.id || (SUFFIX.test(selector) && record.id.endsWith(selector));
}

export function validateIssueApprovalBinding(command, binding, records) {
  const parsed = parseIssueApprovalCommand(command);
  if (!parsed.accepted) throw new Error("Issue approval command is not an exact approve command");
  if (!binding || binding.schema_version !== ISSUE_REVIEW_BINDING_SCHEMA_VERSION
    || !SHA256.test(binding.review_sha256 ?? "")) {
    throw new Error("Issue approval review binding is missing or invalid");
  }
  if (!Array.isArray(records) || records.length !== binding.handoffs?.length) {
    throw new Error("Issue approval handoff count does not match the reviewed binding");
  }
  for (let index = 0; index < records.length; index += 1) {
    const { record } = records[index];
    const expected = binding.handoffs[index];
    if (record?.id !== expected?.id || record?.immutable_sha256 !== expected?.immutable_sha256) {
      throw new Error("Issue approval handoff order or immutable content changed");
    }
  }
  if (parsed.kind === "single" && records.length !== 1) {
    throw new Error("A selector-based approval names exactly one reviewed handoff");
  }
  if (parsed.kind === "batch" && records.length < 2) {
    throw new Error("A batch approval requires at least two reviewed handoffs");
  }
  if (parsed.selectors.length > 0) {
    if (parsed.selectors.length !== records.length
      || parsed.selectors.some((selector, index) => !selectorMatches(selector, records[index].record))) {
      throw new Error("Approval command selectors do not match the reviewed handoffs in order");
    }
  }
  return parsed;
}
