import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { stringify as stringifyYaml } from "yaml";
import { parseFrontMatter, todayInTokyo, validateIsoDate } from "./day-plan.mjs";

export const ISSUE_IMPORT_SCHEMA_VERSION = 1;
export const ISSUE_IMPORT_MARKER = "daybook-issue-import:v1";
export const ISSUE_IMPORT_DATA_MARKER = "daybook-issue-import-data:v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const RECORD_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ACTIVITY_MARKER_PATTERN = /^<!-- daybook-issue-record:v1 (\{.*\}) -->$/;
const ACTIVITY_CLOSE_MARKER = "<!-- /daybook-issue-record:v1 -->";
const ISSUE_RESULT_STATUSES = new Set([
  "blocked", "pending", "pending-gh", "sending", "posted", "already-posted", "failed", "uncertain",
]);
const CLOSE_RESULT_STATUSES = new Set([
  "blocked", "pending", "pending-gh", "closing", "closed", "already-closed", "failed", "uncertain",
]);

export class IssueImportError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "IssueImportError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new IssueImportError(code, message, details);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashJson(value) {
  return sha256(stableStringify(value));
}

function normalizedTimestamp(value, label, allowNull = true) {
  if (value === null && allowNull) return null;
  const match = typeof value === "string"
    ? /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
    : null;
  if (!match || !Number.isFinite(Date.parse(value))) {
    fail("INVALID_SOURCE", `${label} must be an ISO timestamp or null`);
  }
  validateIsoDate(match[1], label);
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) {
    fail("INVALID_SOURCE", `${label} must be an ISO timestamp or null`);
  }
  return new Date(value).toISOString();
}

function normalizeIssueUrl(value, repo, number) {
  if (typeof value !== "string") fail("INVALID_SOURCE", "Issue URL must be a string", { number });
  let parsed;
  try { parsed = new URL(value); } catch { fail("INVALID_SOURCE", "Issue URL is malformed", { number }); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || parsed.search || parsed.hash) {
    fail("INVALID_SOURCE", "Issue URL must be a canonical public GitHub URL", { number });
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 4 && segments[0] === repo.split("/")[0]
    && segments[1] === repo.split("/")[1] && segments[2] === "pull") {
    fail("PULL_REQUEST_SOURCE", "Pull Requests cannot be imported as Issues", { number, url: value });
  }
  if (parsed.pathname !== `/${repo}/issues/${number}`) {
    fail("INVALID_SOURCE", "Issue URL does not match the requested repository and number", { number, url: value });
  }
  return `https://github.com/${repo}/issues/${number}`;
}

function normalizeCommentUrl(value, issueUrl, issueNumber) {
  if (typeof value !== "string") fail("INVALID_SOURCE", "Issue comment URL is missing", { issue: issueNumber });
  let parsed;
  try { parsed = new URL(value); } catch { fail("INVALID_SOURCE", "Issue comment URL is malformed", { issue: issueNumber }); }
  const match = parsed.hash.match(/^#issuecomment-([1-9]\d*)$/);
  if (parsed.origin !== "https://github.com" || parsed.pathname !== new URL(issueUrl).pathname
    || parsed.search || !match) {
    fail("INVALID_SOURCE", "Issue comment URL does not match the Issue", { issue: issueNumber, url: value });
  }
  return { id: match[1], url: `${issueUrl}#issuecomment-${match[1]}` };
}

function normalizeComment(comment, issueUrl, issueNumber, index) {
  if (!isObject(comment)) fail("INVALID_SOURCE", "Issue comment must be an object", { issue: issueNumber, index });
  const { id, url } = normalizeCommentUrl(comment.url, issueUrl, issueNumber);
  const author = comment.author_login ?? null;
  if (author !== null && (typeof author !== "string" || !/^[A-Za-z0-9-]+$/.test(author))) {
    fail("INVALID_SOURCE", "Issue comment author_login must be a login or null", { issue: issueNumber, index });
  }
  if (comment.body !== null && comment.body !== undefined && typeof comment.body !== "string") {
    fail("INVALID_SOURCE", "Issue comment body must be a string or null", { issue: issueNumber, index });
  }
  return {
    id,
    url,
    author_login: author,
    created_at: normalizedTimestamp(comment.created_at ?? null, "comment.created_at"),
    updated_at: normalizedTimestamp(comment.updated_at ?? null, "comment.updated_at"),
    body: comment.body ?? "",
  };
}

function normalizeReceiptAuthors(value) {
  if (!Array.isArray(value) || value.some((login) => typeof login !== "string" || !/^[A-Za-z0-9-]+$/.test(login))) {
    fail("INVALID_SOURCE", "receipt_author_logins must be an array of GitHub logins");
  }
  return [...new Set(value.map((login) => login.toLowerCase()))].sort();
}

export function validateIssueSource(source) {
  if (!isObject(source) || source.schema_version !== ISSUE_IMPORT_SCHEMA_VERSION) {
    fail("INVALID_SOURCE", "Unsupported or malformed Issue source schema");
  }
  if (typeof source.repo !== "string" || !REPO_PATTERN.test(source.repo)) {
    fail("INVALID_SOURCE", "repo must use owner/repository form");
  }
  validateIsoDate(source.import_date, "import_date");
  const receiptAuthors = normalizeReceiptAuthors(source.receipt_author_logins);
  if (!Array.isArray(source.excluded_issue_numbers)
    || source.excluded_issue_numbers.some((number) => !Number.isSafeInteger(number) || number < 1)) {
    fail("INVALID_SOURCE", "excluded_issue_numbers must contain positive integers");
  }
  if (!Array.isArray(source.issues)) fail("INVALID_SOURCE", "issues must be an array");
  const seen = new Set();
  const issues = source.issues.map((issue) => {
    if (!isObject(issue) || !Number.isSafeInteger(issue.number) || issue.number < 1) {
      fail("INVALID_SOURCE", "Issue number must be a positive integer");
    }
    if (seen.has(issue.number)) fail("INVALID_SOURCE", "Issue number is duplicated", { issue: issue.number });
    seen.add(issue.number);
    const url = normalizeIssueUrl(issue.url, source.repo, issue.number);
    if (typeof issue.title !== "string" || (issue.body !== null && issue.body !== undefined && typeof issue.body !== "string")) {
      fail("INVALID_SOURCE", "Issue title and body must be strings", { issue: issue.number });
    }
    const state = typeof issue.state === "string" ? issue.state.toLowerCase() : "";
    if (state !== "open" && state !== "closed") fail("INVALID_SOURCE", "Issue state must be open or closed", { issue: issue.number });
    if (issue.is_pull_request !== false) fail("PULL_REQUEST_SOURCE", "Source is not a confirmed Issue", { issue: issue.number });
    if (issue.comments_scope !== "helper-returned" || !Array.isArray(issue.comments)) {
      fail("INVALID_SOURCE", "comments_scope must be helper-returned and comments must be an array", { issue: issue.number });
    }
    const comments = issue.comments.map((comment, index) => normalizeComment(comment, url, issue.number, index));
    if (new Set(comments.map((comment) => comment.id)).size !== comments.length) {
      fail("INVALID_SOURCE", "Issue comment IDs must be unique", { issue: issue.number });
    }
    comments.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    return {
      number: issue.number,
      url,
      title: issue.title,
      body: issue.body ?? "",
      state,
      is_pull_request: false,
      created_at: normalizedTimestamp(issue.created_at ?? null, "issue.created_at"),
      updated_at: normalizedTimestamp(issue.updated_at, "issue.updated_at", false),
      comments_scope: "helper-returned",
      comments,
    };
  });
  return {
    schema_version: ISSUE_IMPORT_SCHEMA_VERSION,
    repo: source.repo,
    import_date: source.import_date,
    receipt_author_logins: receiptAuthors,
    excluded_issue_numbers: [...new Set(source.excluded_issue_numbers)].sort((a, b) => a - b),
    issues: issues.sort((left, right) => left.number - right.number),
  };
}

export function normalizeIssueHelperPayload(payload, { repo, number, importDate, receiptAuthorLogins = [], excludedIssueNumbers = [] } = {}) {
  let helper = payload;
  if (isObject(helper?.snapshot?.delegate_result)) helper = helper.snapshot.delegate_result;
  else if (isObject(helper?.delegate_result)) helper = helper.delegate_result;
  if (isObject(payload?.error) || payload?.status && payload.status !== "success") {
    fail("INVALID_SOURCE", "miku-scm Issue read did not succeed; do not treat a failed read as an empty Issue", { number });
  }
  if (!isObject(helper) || helper.mode !== "issue" || helper.repository !== repo || !isObject(helper.issue)) {
    fail("INVALID_SOURCE", "miku-scm payload must be a successful individual Issue read for the requested repository", { repo, number });
  }
  const issue = helper.issue;
  if (issue.number !== number) fail("INVALID_SOURCE", "miku-scm returned a different Issue number", { expected: number, actual: issue.number });
  if (!Array.isArray(issue.comments)) fail("INVALID_SOURCE", "miku-scm did not return a comments array", { number });
  const comments = issue.comments.map((comment) => {
    if (!isObject(comment)) fail("INVALID_SOURCE", "miku-scm returned a malformed comment", { number });
    const authorLogin = comment.author_login ?? comment.author?.login ?? null;
    return {
      url: comment.url ?? comment.html_url,
      author_login: authorLogin,
      created_at: comment.created_at ?? comment.createdAt ?? null,
      updated_at: comment.updated_at ?? comment.updatedAt ?? null,
      body: comment.body ?? "",
    };
  });
  return validateIssueSource({
    schema_version: ISSUE_IMPORT_SCHEMA_VERSION,
    repo,
    import_date: importDate,
    receipt_author_logins: receiptAuthorLogins,
    excluded_issue_numbers: excludedIssueNumbers,
    issues: [{
      number,
      url: issue.html_url ?? issue.url,
      title: issue.title,
      body: issue.body ?? "",
      state: issue.state,
      is_pull_request: false,
      created_at: null,
      updated_at: issue.updated_at ?? issue.updatedAt,
      comments_scope: "helper-returned",
      comments,
    }],
  });
}

function receiptMarkers(comment, repo, number) {
  const header = `<!-- ${ISSUE_IMPORT_MARKER}:${repo}:${number} -->`;
  if (!comment.body.includes(header)) return null;
  const expression = new RegExp(`<!-- ${ISSUE_IMPORT_DATA_MARKER.replaceAll(":", "\\:")}\\s+(\\{[^\\n]*\\})\\s+-->`);
  const match = comment.body.match(expression);
  if (!match) return { malformed: true };
  let data;
  try { data = JSON.parse(match[1]); } catch { return { malformed: true }; }
  if (!isObject(data) || !HASH_PATTERN.test(data.import_id ?? "") || !Array.isArray(data.records)
    || !data.records.length || data.records.some((record) => !isObject(record) || typeof record.key !== "string"
      || !RECORD_KEY_PATTERN.test(record.key) || typeof record.id !== "string" || typeof record.path !== "string")) return { malformed: true };
  try {
    const keys = new Set();
    for (const record of data.records) {
      if (keys.has(record.key)) return { malformed: true };
      keys.add(record.key);
      const recordPath = safeRelativeWritePath(record.path);
      const task = /\/tasks\/(task-\d{6}-\d{5}-.+\.md)$/.exec(recordPath);
      const other = /\/(?:schedules|activities)\/([^/]+\.md)$/.exec(recordPath);
      const expectedId = task?.[1].match(/^(task-\d{6}-\d{5})-/)?.[1] ?? other?.[1].replace(/\.md$/, "");
      if (!expectedId || record.id !== expectedId) return { malformed: true };
    }
  } catch { return { malformed: true }; }
  return { data };
}

export function isImportReceipt(comment, repo, number, receiptAuthorLogins) {
  const marker = receiptMarkers(comment, repo, number);
  if (!marker) return null;
  if (marker.malformed) return { verified: false, code: "UNVERIFIED_RECEIPT", comment };
  const allowed = normalizeReceiptAuthors(receiptAuthorLogins);
  if (!comment.author_login || !allowed.includes(comment.author_login.toLowerCase())) {
    return { verified: false, code: "UNVERIFIED_RECEIPT", data: marker.data, comment };
  }
  return { verified: true, data: marker.data, comment };
}

export function hashIssueSource(issue, context = {}) {
  const repo = context.repo;
  const authors = context.receipt_author_logins ?? [];
  const comments = [];
  for (const comment of [...issue.comments].sort((left, right) => String(left.id) < String(right.id) ? -1 : String(left.id) > String(right.id) ? 1 : 0)) {
    const receipt = repo ? isImportReceipt(comment, repo, issue.number, authors) : null;
    if (receipt?.verified) continue;
    comments.push({
      id: comment.id,
      body: comment.body,
      author_login: comment.author_login,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    });
  }
  return hashJson({
    number: issue.number,
    url: issue.url,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    created_at: issue.created_at,
    comments,
  });
}

function requireEvidence(value, field, number, key) {
  if (!isObject(value)) fail("INVALID_MANIFEST", `${field} must be an object`, { issue: number, key });
  return value;
}

function validateRecord(record, issueNumber) {
  if (!isObject(record) || typeof record.key !== "string" || record.key.length > 80
    || !RECORD_KEY_PATTERN.test(record.key)) {
    fail("INVALID_MANIFEST", "record key must be a short lowercase slug", { issue: issueNumber });
  }
  if (!new Set(["task", "schedule", "activity"]).has(record.type)
    || !new Set(["create", "link-existing"]).has(record.action)) {
    fail("INVALID_MANIFEST", "record type or action is unsupported", { issue: issueNumber, key: record.key });
  }
  if (record.action === "link-existing" && (record.type === "activity" || typeof record.target_path !== "string")) {
    fail("INVALID_MANIFEST", "link-existing requires a task or schedule target_path", { issue: issueNumber, key: record.key });
  }
  if (typeof record.title !== "string" || !record.title.trim() || /[\r\n]/.test(record.title)) {
    fail("INVALID_MANIFEST", "record title must be a nonempty single line", { issue: issueNumber, key: record.key });
  }
  if (record.action === "create" && (typeof record.content !== "string"
    || record.content.includes(ISSUE_IMPORT_MARKER) || record.content.includes(ISSUE_IMPORT_DATA_MARKER)
    || record.content.includes("daybook-issue-record:v1"))) {
    fail("INVALID_MANIFEST", "created record content must be a string", { issue: issueNumber, key: record.key });
  }
  if (record.action === "link-existing") return { ...record };
  if (record.type === "task") {
    if (record.priority !== undefined && (!Number.isInteger(record.priority) || record.priority < 1 || record.priority > 9)) {
      fail("INVALID_MANIFEST", "priority must be an integer from 1 to 9", { issue: issueNumber, key: record.key });
    }
    for (const field of ["planned_start_date", "planned_end_date"]) {
      if (record[field] !== null && record[field] !== undefined) validateIsoDate(record[field], field);
    }
    if (record.planned_action !== undefined && typeof record.planned_action !== "string") {
      fail("INVALID_MANIFEST", "planned_action must be a string", { issue: issueNumber, key: record.key });
    }
    if (record.checklist !== undefined && (!Array.isArray(record.checklist)
      || record.checklist.some((item) => typeof item !== "string" || /[\r\n]/.test(item)))) {
      fail("INVALID_MANIFEST", "checklist must be an array of strings", { issue: issueNumber, key: record.key });
    }
    if (record.date_evidence !== undefined) requireEvidence(record.date_evidence, "date_evidence", issueNumber, record.key);
    for (const [dateField, evidenceField] of [["planned_start_date", "planned_start_date"], ["planned_end_date", "planned_end_date"]]) {
      if (record[dateField] && (typeof record.date_evidence?.[evidenceField] !== "string"
        || !record.date_evidence[evidenceField].trim())) {
        fail("INVALID_MANIFEST", `${dateField} requires date_evidence`, { issue: issueNumber, key: record.key });
      }
    }
    if (record.deadline_note !== undefined && record.deadline_note !== null && typeof record.deadline_note !== "string") {
      fail("INVALID_MANIFEST", "deadline_note must be a string or null", { issue: issueNumber, key: record.key });
    }
    if (record.due_month !== undefined && record.due_month !== null
      && (typeof record.due_month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(record.due_month))) {
      fail("INVALID_MANIFEST", "due_month must use YYYY-MM form", { issue: issueNumber, key: record.key });
    }
  } else if (record.type === "schedule") {
    validateIsoDate(record.date, "schedule.date");
    if (!isObject(record.date_evidence) || Object.values(record.date_evidence).every((value) => typeof value !== "string" || !value.trim())) {
      fail("INVALID_MANIFEST", "schedule date_evidence must include a text source", { issue: issueNumber, key: record.key });
    }
    if (record.status !== undefined && !new Set(["scheduled", "cancelled"]).has(record.status)) {
      fail("INVALID_MANIFEST", "schedule status must be scheduled or cancelled", { issue: issueNumber, key: record.key });
    }
    for (const field of ["start", "end", "doors", "place", "participation_note"]) {
      if (record[field] !== undefined && typeof record[field] !== "string") {
        fail("INVALID_MANIFEST", `${field} must be a string`, { issue: issueNumber, key: record.key });
      }
    }
  } else {
    validateIsoDate(record.date, "activity.date");
    if (!isObject(record.date_evidence) || Object.values(record.date_evidence).every((value) => typeof value !== "string" || !value.trim())) {
      fail("INVALID_MANIFEST", "activity date_evidence must include a text source", { issue: issueNumber, key: record.key });
    }
  }
  return { ...record };
}

export function validateImportManifest(manifest, source) {
  const normalizedSource = validateIssueSource(source);
  if (!isObject(manifest) || manifest.schema_version !== ISSUE_IMPORT_SCHEMA_VERSION || !Array.isArray(manifest.issues)) {
    fail("INVALID_MANIFEST", "Unsupported or malformed import manifest schema");
  }
  const sourceIssues = new Map(normalizedSource.issues.map((issue) => [issue.number, issue]));
  const seen = new Set();
  const issues = manifest.issues.map((entry) => {
    if (!isObject(entry) || !Number.isSafeInteger(entry.number) || !sourceIssues.has(entry.number)) {
      fail("INVALID_MANIFEST", "Manifest Issue is missing from source", { issue: entry?.number });
    }
    if (seen.has(entry.number)) fail("INVALID_MANIFEST", "Manifest Issue is duplicated", { issue: entry.number });
    seen.add(entry.number);
    if (!new Set(["import", "needs-info", "skip"]).has(entry.decision)) {
      fail("INVALID_MANIFEST", "decision must be import, needs-info, or skip", { issue: entry.number });
    }
    if (entry.decision === "needs-info") {
      if (!Array.isArray(entry.questions) || !entry.questions.length
        || entry.questions.some((question) => typeof question !== "string" || !question.trim())) {
        fail("INVALID_MANIFEST", "needs-info requires concrete questions", { issue: entry.number });
      }
      return { number: entry.number, decision: entry.decision, questions: [...entry.questions] };
    }
    if (entry.decision === "skip") {
      if (typeof entry.reason !== "string" || !entry.reason.trim()) {
        fail("INVALID_MANIFEST", "skip requires a reason", { issue: entry.number });
      }
      return { number: entry.number, decision: entry.decision, reason: entry.reason };
    }
    if (!Array.isArray(entry.records) || entry.records.length < 1) {
      fail("INVALID_MANIFEST", "import requires at least one record", { issue: entry.number });
    }
    const keys = new Set();
    const records = entry.records.map((record) => {
      const normalized = validateRecord(record, entry.number);
      if (keys.has(normalized.key)) fail("INVALID_MANIFEST", "record key is duplicated within Issue", { issue: entry.number, key: normalized.key });
      keys.add(normalized.key);
      return normalized;
    });
    return { number: entry.number, decision: "import", reason: entry.reason ?? "", records };
  });
  return { schema_version: ISSUE_IMPORT_SCHEMA_VERSION, issues };
}

export function deriveTaskDates(record, importDate) {
  validateIsoDate(importDate, "import_date");
  const start = record.planned_start_date ?? null;
  const end = record.planned_end_date ?? null;
  if (start) validateIsoDate(start, "planned_start_date");
  if (end) validateIsoDate(end, "planned_end_date");
  if (start && end && start > end) fail("INVALID_DATE_RANGE", "planned_start_date must not be after planned_end_date", { key: record.key });
  if (start && end) return { start, end, status: "confirmed", reasons: [] };
  if (!start && !end) return {
    start: importDate,
    end: importDate,
    status: "provisional",
    reasons: [`作業予定期間が未指定のため、開始・終了を取り込み日の${importDate}に暫定設定した`],
  };
  if (start) return {
    start,
    end: start,
    status: "provisional",
    reasons: [`終了日が未指定のため、開始日${start}と同日に暫定設定した`],
  };
  return {
    start: end < importDate ? end : importDate,
    end,
    status: "provisional",
    reasons: [`開始日が未指定のため、${end < importDate ? "終了日" : "取り込み日"}を暫定設定した`],
  };
}

function recordReference(record, issueNumber, createdPath) {
  const recordPath = createdPath ?? record.target_path;
  const id = record.type === "task"
    ? recordPath.match(/task-(\d{6}-\d{5})-/)?.[0].slice(0, -1)
    : path.posix.basename(recordPath, ".md");
  return { key: record.key, type: record.type, id, path: recordPath, issue: issueNumber };
}

function canonicalDirectories(repoRoot) {
  const roots = [];
  for (const year of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    const yearPath = path.join(repoRoot, year.name);
    for (const month of fs.readdirSync(yearPath, { withFileTypes: true })) {
      if (!month.isDirectory() || !new RegExp(`^${year.name}(0[1-9]|1[0-2])$`).test(month.name)) continue;
      const monthPath = path.join(yearPath, month.name);
      for (const kind of ["tasks", "schedules", "activities"]) {
        const directory = path.join(monthPath, kind);
        if (fs.existsSync(directory) && fs.lstatSync(directory).isDirectory() && !fs.lstatSync(directory).isSymbolicLink()) {
          roots.push({ directory, kind });
        }
      }
    }
  }
  return roots;
}

function sourceKey(number, url, key) {
  return `${url}\0${number}\0${key}`;
}

function issueSourceFromFrontMatter(frontMatter, relativePath) {
  const number = frontMatter.source_issue_number;
  const url = frontMatter.source_issue_url;
  const key = frontMatter.source_issue_key;
  const importId = frontMatter.source_issue_import_id;
  if (number === undefined && url === undefined && key === undefined && importId === undefined) return null;
  if (!Number.isSafeInteger(Number(number)) || Number(number) < 1 || typeof url !== "string"
    || typeof key !== "string" || !RECORD_KEY_PATTERN.test(key) || !HASH_PATTERN.test(importId ?? "")) {
    fail("SOURCE_CONFLICT", "Existing record has incomplete Issue source fields", { path: relativePath });
  }
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { fail("SOURCE_CONFLICT", "Existing record has an invalid Issue source URL", { path: relativePath }); }
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com"
    || !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9]\d*$/.test(parsedUrl.pathname)
    || parsedUrl.search || parsedUrl.hash || Number(parsedUrl.pathname.split("/").at(-1)) !== Number(number)) {
    fail("SOURCE_CONFLICT", "Existing record has a noncanonical Issue source URL", { path: relativePath });
  }
  return { number: Number(number), url, key, import_id: importId, id: frontMatter.id ?? path.posix.basename(relativePath, ".md"), path: relativePath };
}

function parseActivityMarkers(text, relativePath) {
  const lines = text.split(/\r?\n/);
  const results = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = ACTIVITY_MARKER_PATTERN.exec(lines[index]);
    if (!match) continue;
    let metadata;
    try { metadata = JSON.parse(match[1]); } catch { fail("SOURCE_CONFLICT", "Activity source marker JSON is invalid", { path: relativePath, line: index + 1 }); }
    if (!isObject(metadata) || !Number.isSafeInteger(metadata.source_issue_number)
      || typeof metadata.source_issue_url !== "string" || typeof metadata.source_issue_key !== "string"
      || !RECORD_KEY_PATTERN.test(metadata.source_issue_key) || !HASH_PATTERN.test(metadata.source_issue_import_id ?? "")) {
      fail("SOURCE_CONFLICT", "Activity source marker is incomplete", { path: relativePath, line: index + 1 });
    }
    const closeIndex = lines.indexOf(ACTIVITY_CLOSE_MARKER, index + 1);
    const nextMarker = lines.findIndex((line, lineIndex) => lineIndex > index && ACTIVITY_MARKER_PATTERN.test(line));
    if (closeIndex < 0 || (nextMarker >= 0 && closeIndex > nextMarker)) {
      fail("SOURCE_CONFLICT", "Activity source marker has no closing marker", { path: relativePath, line: index + 1 });
    }
    let issueUrl;
    try { issueUrl = new URL(metadata.source_issue_url); } catch { fail("SOURCE_CONFLICT", "Activity source marker has an invalid Issue URL", { path: relativePath, line: index + 1 }); }
    const issuePath = /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/([1-9]\d*)$/.exec(issueUrl.pathname);
    if (issueUrl.protocol !== "https:" || issueUrl.hostname !== "github.com" || issueUrl.search || issueUrl.hash
      || !issuePath || Number(issuePath[1]) !== metadata.source_issue_number) {
      fail("SOURCE_CONFLICT", "Activity source marker has a noncanonical Issue URL", { path: relativePath, line: index + 1 });
    }
    results.push({
      number: metadata.source_issue_number,
      url: metadata.source_issue_url,
      key: metadata.source_issue_key,
      import_id: metadata.source_issue_import_id,
      id: path.posix.basename(relativePath, ".md"),
      path: relativePath,
    });
  }
  return results;
}

export function scanIssueSources(repoRoot) {
  const byKey = new Map();
  const byUrl = new Map();
  const add = (item) => {
    const key = sourceKey(item.number, item.url, item.key);
    const existing = byKey.get(key) ?? [];
    existing.push(item);
    byKey.set(key, existing);
    const urls = byUrl.get(item.url) ?? [];
    urls.push(item);
    byUrl.set(item.url, urls);
  };
  for (const { directory, kind } of canonicalDirectories(repoRoot)) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (kind === "activities" && !/^activity-\d{8}\.md$/.test(entry.name)) continue;
      if (kind === "tasks" && !/^task-\d{6}-\d{5}-.+\.md$/.test(entry.name)) continue;
      if (kind === "schedules" && !/^schedule-\d{8}-.+\.md$/.test(entry.name)) continue;
      const filePath = path.join(directory, entry.name);
      const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
      const text = fs.readFileSync(filePath, "utf8");
      if (kind === "activities") {
        for (const item of parseActivityMarkers(text, relativePath)) add(item);
        continue;
      }
      const parsed = parseFrontMatter(text, relativePath);
      const expected = kind === "tasks" ? "task" : "schedule";
      if (parsed.frontMatter.type !== expected) continue;
      const item = issueSourceFromFrontMatter(parsed.rawFrontMatter, relativePath);
      if (item) add(item);
    }
  }
  for (const [key, items] of byKey) {
    if (items.length > 1) fail("SOURCE_CONFLICT", "The same Issue and record key appear in multiple records", { key, paths: items.map((item) => item.path) });
  }
  return { byKey, byUrl };
}

function markdownEscape(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("]", "\\]");
}

function yamlFrontMatter(fields) {
  return `---\n${stringifyYaml(fields, { lineWidth: 0 }).trimEnd()}\n---\n`;
}

function dateHistory(date, message, issueNumber) {
  return `- ${date}：Issue #${issueNumber}から取り込み。${message}`;
}

function renderTask(record, context, id, targetPath) {
  const period = deriveTaskDates(record, context.importDate);
  const plannedAction = record.planned_action?.trim() || record.title;
  const fields = {
    type: "task",
    id,
    status: "todo",
    priority: record.priority ?? 5,
    created: context.importDate,
    planned_start_date: period.start,
    planned_end_date: period.end,
    planned_dates_status: period.status,
    planned_action: plannedAction,
    source_issue_number: context.issue.number,
    source_issue_url: context.issue.url,
    source_issue_key: record.key,
    source_issue_import_id: context.importId,
  };
  if (record.due_month) fields.due_month = record.due_month;
  if (record.deadline_note) fields.deadline_note = record.deadline_note;
  const checklist = record.checklist?.length ? record.checklist.map((item) => `- [ ] ${item}`) : ["- [ ] 作業を進める"];
  const history = period.reasons.length
    ? period.reasons.map((reason) => dateHistory(context.importDate, `${reason}。日程要確認。`, context.issue.number))
    : [dateHistory(context.importDate, "作業予定期間をIssue本文・コメントに基づき登録した。", context.issue.number)];
  const body = [
    "",
    `# ${record.title}`,
    "",
    "## 状態",
    "",
    "- [x] 未着手",
    "- [ ] 進行中",
    "- [ ] 完了",
    "- [ ] 中止",
    "",
    "## 内容",
    "",
    record.content,
    "",
    "## チェックリスト",
    "",
    ...checklist,
    "",
    "## 関連",
    "",
    `- [元Issue #${context.issue.number}](${context.issue.url})`,
    "",
    "## 履歴",
    "",
    ...history,
    "",
  ].join("\n");
  return { path: targetPath, content: `${yamlFrontMatter(fields)}${body}`, record: recordReference(record, context.issue.number, targetPath), period };
}

function renderSchedule(record, context, targetPath) {
  const stem = path.posix.basename(targetPath, ".md");
  const fields = {
    type: "schedule",
    date: record.date,
    status: record.status ?? "scheduled",
    source_issue_number: context.issue.number,
    source_issue_url: context.issue.url,
    source_issue_key: record.key,
    source_issue_import_id: context.importId,
  };
  for (const field of ["start", "end", "doors", "place", "participation_note"]) {
    if (record[field] !== undefined && record[field] !== "") fields[field] = record[field];
  }
  const details = [record.content, record.place && `場所：${record.place}`, record.participation_note]
    .filter(Boolean).join("\n\n");
  const content = `${yamlFrontMatter(fields)}\n# ${record.title}\n\n${details}\n\n## 関連\n\n- [元Issue #${context.issue.number}](${context.issue.url})\n`;
  return { path: targetPath, content, record: { key: record.key, type: "schedule", id: stem, path: targetPath, issue: context.issue.number } };
}

function renderActivityBlock(record, context) {
  const metadata = {
    source_issue_number: context.issue.number,
    source_issue_url: context.issue.url,
    source_issue_key: record.key,
    source_issue_import_id: context.importId,
  };
  return [
    `<!-- daybook-issue-record:v1 ${stableStringify(metadata)} -->`,
    `### ${record.title}`,
    "",
    record.content,
    "",
    `- [元Issue #${context.issue.number}](${context.issue.url})`,
    ACTIVITY_CLOSE_MARKER,
  ].join("\n");
}

function issueReceiptBody(issue, records, importId, repo, importDate) {
  const recordLines = records.map((record) => {
    const period = record.period;
    const dateInfo = period
      ? `\n  - 作業予定：${period.start}〜${period.end}${period.status === "provisional" ? "（暫定）" : ""}`
      : record.date ? `\n  - 日付：${record.date}` : "";
    const reason = period?.reasons.length ? `\n  - ${period.reasons.join(" / ")}` : "";
    return `- ${record.id}：${markdownEscape(record.title)}\n  - パス：${record.path}${dateInfo}${reason}`;
  });
  const provisional = records.some((record) => record.period?.status === "provisional");
  const receipt = {
    import_id: importId,
    records: records.map(({ key, id, path: recordPath }) => ({ key, id, path: recordPath })),
  };
  const marker = `<!-- ${ISSUE_IMPORT_MARKER}:${repo}:${issue.number} -->`;
  const data = `<!-- ${ISSUE_IMPORT_DATA_MARKER} ${stableStringify(receipt)} -->`;
  const lines = [
    marker,
    "",
    "daybookのローカル作業ツリーに、次の記録を作成または関連付けました。",
    "",
    ...recordLines,
  ];
  if (provisional) lines.push("", `作業予定日が未確定のため、${importDate}などを暫定設定しました。日程表では「日程要確認」として扱います。予定日が決まったらdaybookを更新してください。`);
  lines.push(
    "",
    "このコメント時点ではローカル反映です。GitHub上の記録への反映は、別途commit・pushまたはPRの操作を行った時点になります。",
    "",
    "結果コメントの投稿を確認した後、このIssueを取り込み受付完了としてcloseします。closeはdaybook記録の作業完了状態を変更しません。",
    "",
    data,
  );
  return lines.join("\n");
}

function renderImportComment(issue, records, importId, repo, importDate) {
  return issueReceiptBody(issue, records, importId, repo, importDate);
}

export { renderImportComment, renderActivityBlock, renderTask, renderSchedule };

function canonicalTaskPath(importDate, id, key) {
  const month = importDate.slice(0, 7).replace("-", "");
  return `${importDate.slice(0, 4)}/${month}/tasks/${id}-${key}.md`;
}

function canonicalSchedulePath(date, number, key) {
  return `${date.slice(0, 4)}/${date.slice(0, 7).replace("-", "")}/schedules/schedule-${date.replaceAll("-", "")}-issue-${number}-${key}.md`;
}

function canonicalActivityPath(date) {
  return `${date.slice(0, 4)}/${date.slice(0, 7).replace("-", "")}/activities/activity-${date.replaceAll("-", "")}.md`;
}

function appendActivity(existingText, block, recordPath) {
  if (!existingText) {
    const date = path.posix.basename(recordPath).match(/activity-(\d{8})/)?.[1];
    const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    return `---\ntype: activity\ndate: ${isoDate}\n---\n\n# ${Number(isoDate.slice(5, 7))}月${Number(isoDate.slice(8, 10))}日の活動\n\n## やったこと\n\n${block}\n`;
  }
  const newline = existingText.includes("\r\n") ? "\r\n" : "\n";
  let text = existingText.replace(/\r?\n/g, newline);
  if (text.includes(block)) return text;
  const section = /^## やったこと\s*$/m.exec(text);
  if (!section) {
    text = `${text.trimEnd()}${newline}${newline}## やったこと${newline}${newline}${block}${newline}`;
    return text;
  }
  const sectionStart = section.index + section[0].length;
  const nextHeading = /^## /gm;
  nextHeading.lastIndex = sectionStart;
  const next = nextHeading.exec(text);
  const insertionAt = next ? next.index : text.length;
  const before = text.slice(0, insertionAt).replace(/\s*$/, "");
  const after = text.slice(insertionAt).replace(/^\s*/, "");
  return `${before}${newline}${newline}${block}${newline}${after ? `${newline}${after}` : ""}`;
}

function taskSequencePrefix(month) {
  return new RegExp(`^task-${month}-(\\d{5})-.+\\.md$`);
}

export function nextTaskSequence(repoRoot, month, dependencies = {}) {
  if (!/^\d{6}$/.test(month)) fail("INVALID_SOURCE", "Task creation month must use YYYYMM");
  const used = new Set();
  const filenamePattern = taskSequencePrefix(month);
  const monthRoot = path.join(repoRoot, month.slice(0, 4), month);
  const taskDirectory = path.join(monthRoot, "tasks");
  if (fs.existsSync(taskDirectory) && fs.lstatSync(taskDirectory).isDirectory() && !fs.lstatSync(taskDirectory).isSymbolicLink()) {
    for (const entry of fs.readdirSync(taskDirectory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const match = filenamePattern.exec(entry.name);
      if (match) used.add(Number(match[1]));
    }
  }
  let history;
  try {
    history = dependencies.gitLog
      ? dependencies.gitLog(repoRoot, month)
      : execFileSync("git", ["log", "--all", "--format=", "--name-only", "--", `:(glob)${month.slice(0, 4)}/${month}/tasks/task-${month}-*.md`], { cwd: repoRoot, encoding: "utf8" });
  } catch (error) {
    fail("ID_HISTORY_UNAVAILABLE", "Could not read local Git history for task IDs", { month, detail: error.message });
  }
  for (const line of String(history).split(/\r?\n/)) {
    const basename = path.posix.basename(line.trim());
    const match = filenamePattern.exec(basename);
    if (match) used.add(Number(match[1]));
  }
  const maximum = used.size ? Math.max(...used) : 0;
  if (maximum >= 99999) fail("ID_EXHAUSTED", "No task IDs remain in this month", { month });
  return maximum + 1;
}

function manifestByIssue(manifest) {
  return new Map(manifest.issues.map((issue) => [issue.number, issue]));
}

function findVerifiedReceipts(issue, source) {
  const receipts = [];
  const unverified = [];
  for (const comment of issue.comments) {
    const receipt = isImportReceipt(comment, source.repo, issue.number, source.receipt_author_logins);
    if (receipt?.verified) receipts.push(receipt);
    else if (receipt) unverified.push(receipt);
  }
  return { receipts, unverified };
}

function validateLinkTarget(repoRoot, record) {
  const value = record.target_path;
  if (path.posix.isAbsolute(value) || value.includes("\\") || path.posix.normalize(value) !== value
    || value.split("/").some((part) => !part || part === "..")) {
    fail("PATH_OUTSIDE_REPO", "link-existing target_path must stay inside canonical records", { path: value });
  }
  const resolved = path.resolve(repoRoot, value);
  const relative = path.relative(repoRoot, resolved).split(path.sep).join("/");
  const typeOk = record.type === "task"
    ? /^\d{4}\/\d{6}\/tasks\/task-\d{6}-\d{5}-.+\.md$/.test(relative)
    : /^\d{4}\/\d{6}\/schedules\/schedule-\d{8}-.+\.md$/.test(relative);
  if (!typeOk || !fs.existsSync(resolved)) {
    fail("INVALID_MANIFEST", "link-existing target must be an existing canonical record of the requested type", { path: value, type: record.type });
  }
  assertSafeRepoPath(repoRoot, relative, { allowMissing: false });
  const contents = fs.readFileSync(resolved, "utf8");
  const parsed = parseFrontMatter(contents, relative);
  if (parsed.frontMatter.type !== record.type) fail("INVALID_MANIFEST", "link-existing target type does not match", { path: value });
  const segments = relative.split("/");
  if (record.type === "task") {
    const filename = /^task-(\d{6})-(\d{5})-.+\.md$/.exec(path.posix.basename(relative));
    if (!filename || filename[1] !== segments[1] || parsed.frontMatter.id !== `task-${filename[1]}-${filename[2]}`) {
      fail("INVALID_MANIFEST", "link-existing task path, filename, and ID must agree", { path: value });
    }
  } else {
    const filename = /^schedule-(\d{8})-.+\.md$/.exec(path.posix.basename(relative));
    const expectedDate = filename && `${filename[1].slice(0, 4)}-${filename[1].slice(4, 6)}-${filename[1].slice(6, 8)}`;
    if (!filename || parsed.frontMatter.date !== expectedDate || filename[1].slice(0, 6) !== segments[1]) {
      fail("INVALID_MANIFEST", "link-existing schedule path and date must agree", { path: value });
    }
  }
  const existingSource = issueSourceFromFrontMatter(parsed.rawFrontMatter, relative);
  if (existingSource) fail("SOURCE_CONFLICT", "link-existing target already has an Issue source", { path: value, issue: existingSource.number });
  return { relative, resolved, contents, parsed };
}

function addSourceToExisting(target, record, context) {
  const fields = {
    source_issue_number: context.issue.number,
    source_issue_url: context.issue.url,
    source_issue_key: record.key,
    source_issue_import_id: context.importId,
  };
  const frontMatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(target.contents);
  if (!frontMatterMatch) fail("INVALID_MANIFEST", "link-existing target front matter is malformed", { path: target.relative });
  const keys = Object.keys(target.parsed.rawFrontMatter);
  if (keys.some((key) => Object.hasOwn(fields, key))) fail("SOURCE_CONFLICT", "link-existing target already contains Issue source fields", { path: target.relative });
  const newline = frontMatterMatch[0].includes("\r\n") ? "\r\n" : "\n";
  const additions = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(newline);
  const end = frontMatterMatch[0].lastIndexOf(`${newline}---`) + newline.length;
  let content = `${target.contents.slice(0, end)}${additions}${newline}${target.contents.slice(end)}`;
  const historyHeading = /^## 履歴\s*$/m.exec(content);
  const historyLine = `${context.importDate}：Issue #${context.issue.number}を既存記録へ関連付けた。`;
  if (historyHeading) {
    const at = historyHeading.index + historyHeading[0].length;
    const suffix = content.slice(at);
    const trimmed = suffix.replace(/^\s*/, "");
    content = `${content.slice(0, at)}${newline}${newline}${historyLine}${newline}${newline}${trimmed}`;
  } else {
    content = `${content.trimEnd()}${newline}${newline}## 履歴${newline}${newline}${historyLine}${newline}`;
  }
  const id = target.parsed.frontMatter.id || path.posix.basename(target.relative, ".md");
  return { path: target.relative, content, record: { key: record.key, type: record.type, id, path: target.relative, issue: context.issue.number } };
}

function sourceCheckHash(issue, source) {
  return hashIssueSource(issue, { repo: source.repo, receipt_author_logins: source.receipt_author_logins });
}

function makeImportId(source, issue, records) {
  const normalizedRecords = records.map((record) => stableValue(record)).sort((left, right) => left.key.localeCompare(right.key));
  return hashJson({
    repo: source.repo,
    number: issue.number,
    import_date: source.import_date,
    source_hash: sourceCheckHash(issue, source),
    records: normalizedRecords,
  });
}

function emptyPlan(source) {
  return {
    schema_version: ISSUE_IMPORT_SCHEMA_VERSION,
    plan_id: "",
    repo: source.repo,
    repo_root: "",
    receipt_author_logins: source.receipt_author_logins,
    import_date: source.import_date,
    issues: [],
    writes: [],
  };
}

function safeRelativeWritePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value || value.split("/").some((part) => part === ".." || part === "")) {
    fail("PATH_OUTSIDE_REPO", "Write path must be a normalized repository-relative path", { path: value });
  }
  const task = /^(\d{4})\/(\d{6})\/tasks\/task-(\d{6})-\d{5}-.+\.md$/.exec(value);
  const schedule = /^(\d{4})\/(\d{6})\/schedules\/schedule-(\d{8})-.+\.md$/.exec(value);
  const activity = /^(\d{4})\/(\d{6})\/activities\/activity-(\d{8})\.md$/.exec(value);
  const directories = [task && [task[1], task[2]], schedule && [schedule[1], schedule[2]], activity && [activity[1], activity[2]]].filter(Boolean);
  for (const [year, month] of directories) {
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(month) || year !== month.slice(0, 4)) {
      fail("PATH_OUTSIDE_REPO", "Write path has an invalid year/month directory", { path: value });
    }
  }
  if (schedule) validateIsoDate(`${schedule[3].slice(0, 4)}-${schedule[3].slice(4, 6)}-${schedule[3].slice(6, 8)}`, "schedule path date");
  if (activity) validateIsoDate(`${activity[3].slice(0, 4)}-${activity[3].slice(4, 6)}-${activity[3].slice(6, 8)}`, "activity path date");
  const valid = (task && task[1] === task[2].slice(0, 4) && task[2] === task[3] && task[3].slice(0, 4) === task[1])
    || (schedule && schedule[1] === schedule[2].slice(0, 4) && schedule[2] === schedule[3].slice(0, 6))
    || (activity && activity[1] === activity[2].slice(0, 4) && activity[2] === activity[3].slice(0, 6));
  if (!valid) fail("PATH_OUTSIDE_REPO", "Write path is outside canonical record directories", { path: value });
  return value;
}

function assertSafeRepoPath(repoRoot, relativePath, { allowMissing = true } = {}) {
  const relative = safeRelativeWritePath(relativePath);
  const parts = relative.split("/");
  let current = repoRoot;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (!allowMissing) fail("PATH_OUTSIDE_REPO", "Expected path does not exist", { path: relative });
      continue;
    }
    if (stat.isSymbolicLink()) fail("PATH_OUTSIDE_REPO", "Symbolic links are not allowed in record paths", { path: relative });
    if (index < parts.length - 1 && !stat.isDirectory()) {
      fail("PATH_OUTSIDE_REPO", "A record path parent is not a directory", { path: relative });
    }
    if (index === parts.length - 1 && !stat.isFile()) {
      fail("PATH_OUTSIDE_REPO", "A record path target is not a regular file", { path: relative });
    }
  }
  return path.join(repoRoot, ...parts);
}

function addWrite(writeMap, repoRoot, pathValue, content, issueNumber, { append = false, allowExisting = false } = {}) {
  const relative = safeRelativeWritePath(pathValue);
  const absolute = assertSafeRepoPath(repoRoot, relative);
  if (!writeMap.has(relative) && fs.existsSync(absolute) && !allowExisting) {
    fail("SOURCE_CONFLICT", "A newly generated record path already exists", { path: relative });
  }
  const existing = writeMap.get(relative);
  if (existing) {
    if (existing.content !== content && !append) fail("SOURCE_CONFLICT", "Two records target the same path with different content", { path: relative });
    if (append) existing.content = content;
    existing.issue_numbers.add(issueNumber);
    return;
  }
  writeMap.set(relative, { path: relative, content, issue_numbers: new Set([issueNumber]), allowExisting });
}

function materializeCreateRecord(record, context, taskSequences, writeMap) {
  if (record.action === "link-existing") {
    const target = validateLinkTarget(context.repoRoot, record);
    const write = addSourceToExisting(target, record, context);
    addWrite(writeMap, context.repoRoot, write.path, write.content, context.issue.number, { allowExisting: true });
    return write.record;
  }
  if (record.type === "task") {
    const month = context.source.import_date.slice(0, 7).replace("-", "");
    if (!taskSequences.has(month)) taskSequences.set(month, nextTaskSequence(context.repoRoot, month, context.dependencies));
    const sequence = taskSequences.get(month);
    if (sequence > 99999) fail("ID_EXHAUSTED", "No task IDs remain in this month", { month });
    taskSequences.set(month, sequence + 1);
    const id = `task-${month}-${String(sequence).padStart(5, "0")}`;
    const pathValue = canonicalTaskPath(context.source.import_date, id, record.key);
    const write = renderTask(record, context, id, pathValue);
    addWrite(writeMap, context.repoRoot, pathValue, write.content, context.issue.number);
    write.period = deriveTaskDates(record, context.source.import_date);
    write.record.id = id;
    return write.record;
  }
  if (record.type === "schedule") {
    const pathValue = canonicalSchedulePath(record.date, context.issue.number, record.key);
    const write = renderSchedule(record, context, pathValue);
    addWrite(writeMap, context.repoRoot, pathValue, write.content, context.issue.number);
    return write.record;
  }
  const pathValue = canonicalActivityPath(record.date);
  const absolute = path.join(context.repoRoot, ...pathValue.split("/"));
  const staged = writeMap.get(pathValue);
  let existing = staged?.content ?? "";
  if (!staged && fs.existsSync(absolute)) {
    if (fs.lstatSync(absolute).isSymbolicLink() || !fs.lstatSync(absolute).isFile()) {
      fail("PATH_OUTSIDE_REPO", "Activity target must be a regular file", { path: pathValue });
    }
    existing = fs.readFileSync(absolute, "utf8");
  }
  const block = renderActivityBlock(record, context);
  const content = appendActivity(existing, block, pathValue);
  addWrite(writeMap, context.repoRoot, pathValue, content, context.issue.number, { append: true, allowExisting: true });
  return { key: record.key, type: "activity", id: path.posix.basename(pathValue, ".md"), path: pathValue, issue: context.issue.number };
}

function issueOutcome(issue, decision, detail = {}) {
  return { number: issue.number, url: issue.url, title: issue.title, state: issue.state, outcome: decision, ...detail };
}

function getExistingIssueSource(index, issue) {
  const matches = index.byUrl.get(issue.url) ?? [];
  if (matches.length) return matches;
  return [];
}

function provisionalQuestions(records) {
  return records.flatMap((record) => record.period?.reasons.map((reason) => `${record.title}：${reason}`) ?? []);
}

function renderPreview(plan) {
  const lines = ["# Issue取り込みプレビュー", "", `対象repo：${plan.repo}`, `取り込み日：${plan.import_date}`, "", "## Issueごとの結果", ""];
  for (const issue of plan.issues) {
    lines.push(`### #${issue.number} ${issue.title ?? ""}`, "", `- 判定：${issue.outcome}`);
    if (issue.reason) lines.push(`- 理由：${issue.reason}`);
    if (issue.questions?.length) lines.push("- 確認事項：", ...issue.questions.map((question) => `  - ${question}`));
    for (const record of issue.records ?? []) {
      const period = record.period;
      const date = period ? `${period.start}〜${period.end}${period.status === "provisional" ? "（暫定）" : ""}`
        : record.date ?? "";
      lines.push(`- ${record.action} ${record.type} ${record.id}：${record.title}${date ? `（${date}）` : ""}`);
      if (record.period?.reasons?.length) lines.push(...record.period.reasons.map((reason) => `  - ${reason}`));
      lines.push(`  - パス：${record.path}`);
    }
    if (issue.comment_body) lines.push("", "投稿予定コメント：", "", ...issue.comment_body.split("\n").map((line) => `    ${line}`));
    lines.push("");
  }
  lines.push("## ファイル変更", "", ...(plan.writes.length
    ? plan.writes.map((write) => `- ${write.path}（Issue ${write.issue_numbers.join(", ")}）`)
    : ["- なし"]), "");
  lines.push("Source comments scope: `helper-returned`。miku-scmから確認できる範囲を示し、全履歴取得を保証しません。", "");
  return lines.join("\n");
}

function planDigest(plan) {
  const { plan_id: ignored, ...content } = plan;
  return hashJson(content);
}

export function prepareIssueImport({ repoRoot, source: sourceInput, manifest: manifestInput, dependencies = {} }) {
  const realRoot = fs.realpathSync(repoRoot);
  const source = validateIssueSource(sourceInput);
  const manifest = validateImportManifest(manifestInput, source);
  const manifestIssues = manifestByIssue(manifest);
  const index = scanIssueSources(realRoot);
  const taskSequences = new Map();
  const writeMap = new Map();
  const plan = emptyPlan(source);
  plan.repo_root = realRoot;
  const excluded = new Set(source.excluded_issue_numbers);

  for (const issue of source.issues) {
    const decision = manifestIssues.get(issue.number);
    if (!decision) fail("INVALID_MANIFEST", "Every source Issue requires a manifest decision", { issue: issue.number });
    if (excluded.has(issue.number)) {
      plan.issues.push(issueOutcome(issue, "excluded", { reason: "configured_system_issue" }));
      continue;
    }
    if (decision.decision === "needs-info") {
      plan.issues.push(issueOutcome(issue, "needs-info", { questions: decision.questions }));
      continue;
    }
    if (decision.decision === "skip") {
      plan.issues.push(issueOutcome(issue, "skipped", { reason: decision.reason }));
      continue;
    }
    const existing = getExistingIssueSource(index, issue);
    if (existing.length) {
      plan.issues.push(issueOutcome(issue, "already-imported", {
        records: existing.map(({ key, type, id, path: recordPath }) => ({ key, type, id, path: recordPath })),
      }));
      continue;
    }
    const receiptState = findVerifiedReceipts(issue, source);
    if (receiptState.unverified.length) {
      plan.issues.push(issueOutcome(issue, "needs-info", {
        code: "UNVERIFIED_RECEIPT",
        questions: ["取り込み結果markerがありますが投稿者を確認できません。正規receiptか既存daybook記録を確認してください。"],
      }));
      continue;
    }
    if (receiptState.receipts.length) {
      plan.issues.push(issueOutcome(issue, "remote-only-import", {
        reason: "正規取り込みコメントはありますが、このcheckoutに対応するローカル記録がありません。",
        records: receiptState.receipts.flatMap((receipt) => receipt.data.records),
      }));
      continue;
    }
    const importId = makeImportId(source, issue, decision.records);
    const context = { source, issue, importDate: source.import_date, importId, repoRoot: realRoot, dependencies };
    const records = decision.records.slice().sort((left, right) => left.key.localeCompare(right.key))
      .map((record) => materializeCreateRecord(record, context, taskSequences, writeMap));
    const periods = records.map((record, indexInRecords) => {
      const sourceRecord = decision.records.find((item) => item.key === record.key);
      return sourceRecord.type === "task" && sourceRecord.action === "create"
        ? deriveTaskDates(sourceRecord, source.import_date)
        : null;
    });
    const recordsWithPeriod = records.map((record, indexInRecords) => ({
      ...record,
      ...(periods[indexInRecords] ? { period: periods[indexInRecords] } : {}),
      ...(decision.records.find((item) => item.key === record.key)?.date
        ? { date: decision.records.find((item) => item.key === record.key).date } : {}),
      action: decision.records.find((item) => item.key === record.key).action,
      title: decision.records.find((item) => item.key === record.key).title,
    }));
    const questions = provisionalQuestions(recordsWithPeriod);
    const commentBody = renderImportComment(issue, recordsWithPeriod, importId, source.repo, source.import_date);
    plan.issues.push(issueOutcome(issue, "create", {
      import_id: importId,
      source_hash: sourceCheckHash(issue, source),
      records: recordsWithPeriod,
      questions,
      comment_body: commentBody,
    }));
  }
  plan.writes = [...writeMap.values()].map((write) => {
    const absolute = path.join(realRoot, ...write.path.split("/"));
    const beforeHash = fs.existsSync(absolute) ? sha256(fs.readFileSync(absolute)) : null;
    if (beforeHash !== null && !write.issue_numbers.size) fail("SOURCE_CONFLICT", "Existing target has no matching source", { path: write.path });
    return {
      path: write.path,
      issue_numbers: [...write.issue_numbers].sort((a, b) => a - b),
      before_hash: beforeHash,
      after_hash: sha256(write.content),
      content: write.content,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  plan.plan_id = planDigest(plan);
  return { plan, preview: renderPreview(plan) };
}

export function detectIssueCapabilities(options = {}, dependencies = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const delimiter = platform === "win32" ? ";" : ":";
  const executableNames = platform === "win32" ? ["gh.exe"] : ["gh"];
  const exists = dependencies.isExecutable ?? ((filePath) => {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return false;
      if (platform === "win32") return true;
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch { return false; }
  });
  const paths = String(env.PATH ?? env.Path ?? "").split(delimiter).filter(Boolean);
  const found = paths.some((directory) => executableNames.some((name) => exists(path.join(directory, name))));
  return found ? {
    issue_reception: "available",
    issue_comment_posting: "available",
    issue_closure: "available",
    reason: null,
    message: "ghの実行ファイルが見つかりました。認証と通信はmiku-scmの実行時に確認します。",
  } : {
    issue_reception: "disabled",
    issue_comment_posting: "disabled",
    issue_closure: "disabled",
    reason: "GH_NOT_FOUND",
    message: "Issue受信は無効です（ghが見つかりません）。daybookの通常操作は利用できます。",
  };
}

function validatePlan(plan, repoRoot) {
  if (!isObject(plan) || plan.schema_version !== ISSUE_IMPORT_SCHEMA_VERSION
    || typeof plan.plan_id !== "string" || !HASH_PATTERN.test(plan.plan_id)
    || !Array.isArray(plan.issues) || !Array.isArray(plan.writes)) {
    fail("INVALID_MANIFEST", "Plan schema is malformed or unsupported");
  }
  if (plan.plan_id !== planDigest(plan)) fail("PLAN_CHANGED", "plan_id does not match plan contents");
  const realRoot = fs.realpathSync(repoRoot);
  if (plan.repo_root !== realRoot) fail("PLAN_CHANGED", "Plan belongs to a different repository root", { expected: realRoot, actual: plan.repo_root });
  if (typeof plan.repo !== "string" || !REPO_PATTERN.test(plan.repo)) fail("INVALID_MANIFEST", "Plan repository is malformed");
  validateIsoDate(plan.import_date, "plan.import_date");
  normalizeReceiptAuthors(plan.receipt_author_logins);
  const issueNumbers = new Set();
  for (const issue of plan.issues) {
    if (!isObject(issue) || !Number.isSafeInteger(issue.number) || issue.number < 1 || issueNumbers.has(issue.number)) {
      fail("INVALID_MANIFEST", "Plan contains an invalid or duplicated Issue");
    }
    if (!new Set(["create", "needs-info", "skipped", "excluded", "already-imported", "remote-only-import"]).has(issue.outcome)) {
      fail("INVALID_MANIFEST", "Plan has an unsupported Issue outcome", { issue: issue.number, outcome: issue.outcome });
    }
    issueNumbers.add(issue.number);
    normalizeIssueUrl(issue.url, plan.repo, issue.number);
    if (issue.outcome === "create" && (!HASH_PATTERN.test(issue.import_id ?? "") || !HASH_PATTERN.test(issue.source_hash ?? "")
      || !Array.isArray(issue.records) || !issue.records.length || typeof issue.comment_body !== "string")) {
      fail("INVALID_MANIFEST", "Plan create outcome is incomplete", { issue: issue.number });
    }
    if (issue.outcome === "create") {
      const receipt = receiptMarkers({ body: issue.comment_body }, plan.repo, issue.number);
      if (receipt?.malformed || !receipt || receipt.data.import_id !== issue.import_id) {
        fail("INVALID_MANIFEST", "Plan comment receipt does not match its import", { issue: issue.number });
      }
      const recordKeys = new Set();
      for (const record of issue.records) {
        if (!isObject(record) || typeof record.key !== "string" || !RECORD_KEY_PATTERN.test(record.key)
          || recordKeys.has(record.key) || !new Set(["task", "schedule", "activity"]).has(record.type)
          || typeof record.id !== "string" || typeof record.path !== "string" || record.issue !== issue.number) {
          fail("INVALID_MANIFEST", "Plan contains an invalid or duplicated record reference", { issue: issue.number });
        }
        recordKeys.add(record.key);
        const recordPath = safeRelativeWritePath(record.path);
        const kind = recordPath.includes("/tasks/") ? "task" : recordPath.includes("/schedules/") ? "schedule" : "activity";
        const filename = path.posix.basename(recordPath, ".md");
        const expectedId = kind === "task" ? filename.match(/^(task-\d{6}-\d{5})-/)?.[1] : filename;
        if (record.type !== kind || record.id !== expectedId
          || !plan.writes.some((write) => write.path === recordPath && write.issue_numbers.includes(issue.number))) {
          fail("INVALID_MANIFEST", "Plan record has no matching canonical write", { issue: issue.number, key: record.key, path: recordPath });
        }
      }
      if (stableStringify(receipt.data.records) !== stableStringify(issue.records.map(({ key, id, path: recordPath }) => ({ key, id, path: recordPath })))) {
        fail("INVALID_MANIFEST", "Plan receipt record references do not match planned records", { issue: issue.number });
      }
    }
  }
  const paths = new Set();
  for (const write of plan.writes) {
    if (!isObject(write) || typeof write.content !== "string" || !HASH_PATTERN.test(write.after_hash ?? "")
      || sha256(Buffer.from(write.content, "utf8")) !== write.after_hash
      || (write.before_hash !== null && !HASH_PATTERN.test(write.before_hash))
      || !Array.isArray(write.issue_numbers) || !write.issue_numbers.length
      || new Set(write.issue_numbers).size !== write.issue_numbers.length
      || write.issue_numbers.some((number) => !issueNumbers.has(number))) {
      fail("INVALID_MANIFEST", "Plan contains an invalid write", { path: write?.path });
    }
    const relative = safeRelativeWritePath(write.path);
    if (paths.has(relative)) fail("INVALID_MANIFEST", "Plan contains a duplicate write path", { path: relative });
    paths.add(relative);
    assertSafeRepoPath(realRoot, relative);
    verifyWriteSourceContent(write, plan);
  }
  return realRoot;
}

function recordsForResult(issue) {
  return (issue.records ?? []).map(({ key, type, id, path: recordPath }) => ({ key, type, id, path: recordPath }));
}

function createInitialResult(plan) {
  const hasImports = plan.issues.some((issue) => issue.outcome === "create");
  return {
    schema_version: ISSUE_IMPORT_SCHEMA_VERSION,
    plan_id: plan.plan_id,
    repo: plan.repo,
    repo_root: plan.repo_root,
    status: hasImports ? "prepared" : "complete",
    writes: plan.writes.map((write) => ({
      path: write.path, before_hash: write.before_hash, after_hash: write.after_hash, status: "queued",
    })),
    issues: plan.issues.map((issue) => {
      const importing = issue.outcome === "create";
      return {
        number: issue.number,
        url: issue.url,
        outcome: issue.outcome,
        import_id: issue.import_id ?? null,
        source_hash: issue.source_hash ?? null,
        local_status: importing ? "prepared" : issue.outcome,
        write_paths: plan.writes.filter((write) => write.issue_numbers.includes(issue.number)).map((write) => write.path),
        records: recordsForResult(issue),
        comment_body: importing ? issue.comment_body : null,
        comment_file: importing ? `comment-${issue.number}.md` : null,
        comment: { status: "blocked", url: null, reason: null, message: null, handoff_id: null, attempt_path: null },
        close: { status: "blocked", url: null, close_reason: "completed", reason: null, message: null, handoff_id: null, attempt_path: null },
      };
    }),
  };
}

function validateStoredResult(result, plan) {
  if (!isObject(result) || result.schema_version !== ISSUE_IMPORT_SCHEMA_VERSION
    || result.plan_id !== plan.plan_id || result.repo !== plan.repo || result.repo_root !== plan.repo_root
    || !Array.isArray(result.writes) || !Array.isArray(result.issues)) {
    fail("PLAN_CHANGED", "Existing result does not belong to this plan and repository");
  }
  if (result.writes.length !== plan.writes.length || result.issues.length !== plan.issues.length) {
    fail("PLAN_CHANGED", "Existing result does not match plan items");
  }
  if (!new Set(["prepared", "partial", "local-written", "complete"]).has(result.status)) {
    fail("PLAN_CHANGED", "Existing result has an unsupported run status");
  }
  for (let index = 0; index < plan.writes.length; index += 1) {
    const expected = plan.writes[index];
    const actual = result.writes[index];
    if (!isObject(actual) || actual.path !== expected.path || actual.before_hash !== expected.before_hash
      || actual.after_hash !== expected.after_hash || !new Set(["queued", "written"]).has(actual.status)) {
      fail("PLAN_CHANGED", "Existing write result does not match plan", { path: expected.path });
    }
  }
  for (let index = 0; index < plan.issues.length; index += 1) {
    const expected = plan.issues[index];
    const actual = result.issues[index];
    if (!isObject(actual) || actual.number !== expected.number || actual.url !== expected.url
      || actual.outcome !== expected.outcome || actual.import_id !== (expected.import_id ?? null)
      || actual.source_hash !== (expected.source_hash ?? null)
      || stableStringify(actual.records) !== stableStringify(recordsForResult(expected))
      || !Array.isArray(actual.write_paths)
      || stableStringify(actual.write_paths) !== stableStringify(plan.writes.filter((write) => write.issue_numbers.includes(expected.number)).map((write) => write.path))) {
      fail("PLAN_CHANGED", "Existing Issue result does not match plan", { issue: expected.number });
    }
    if (expected.outcome === "create") {
      if (actual.comment_body !== expected.comment_body || actual.comment_file !== `comment-${expected.number}.md`
        || !isObject(actual.comment) || !isObject(actual.close)
        || !ISSUE_RESULT_STATUSES.has(actual.comment.status) || !CLOSE_RESULT_STATUSES.has(actual.close.status)
        || actual.close.close_reason !== "completed") {
        fail("PLAN_CHANGED", "Existing remote result does not match the import plan", { issue: expected.number });
      }
      const dependentWrites = result.writes.filter((write) => actual.write_paths.includes(write.path));
      const expectedLocal = dependentWrites.every((write) => write.status === "written")
        ? "local-written" : dependentWrites.some((write) => write.status === "written") ? "partial" : "prepared";
      if (actual.local_status !== expectedLocal) fail("PLAN_CHANGED", "Issue local status does not match write journal", { issue: expected.number });
      const commentPosted = ["posted", "already-posted"].includes(actual.comment.status);
      if (commentPosted !== (typeof actual.comment.url === "string")) fail("PLAN_CHANGED", "Comment URL does not match its verification status", { issue: expected.number });
      if (commentPosted) validateCommentResultUrl(actual.comment.url, actual);
      if (["failed", "uncertain"].includes(actual.comment.status) && !actual.comment.message) fail("PLAN_CHANGED", "Failed or uncertain comment has no explanation", { issue: expected.number });
      if (actual.comment.status === "pending-gh" && actual.comment.reason !== "GH_NOT_FOUND") fail("PLAN_CHANGED", "pending-gh comment has no GH_NOT_FOUND reason", { issue: expected.number });
      const closeSucceeded = ["closed", "already-closed"].includes(actual.close.status);
      if (closeSucceeded !== (typeof actual.close.url === "string")) fail("PLAN_CHANGED", "Close URL does not match its verification status", { issue: expected.number });
      if (closeSucceeded) validateIssueResultUrl(actual.close.url, actual);
      if (actual.close.status !== "blocked" && !commentPosted) fail("PLAN_CHANGED", "Close state is not blocked before verified comment", { issue: expected.number });
      if (["failed", "uncertain"].includes(actual.close.status) && !actual.close.message) fail("PLAN_CHANGED", "Failed or uncertain close has no explanation", { issue: expected.number });
      if (actual.close.status === "pending-gh" && actual.close.reason !== "GH_NOT_FOUND") fail("PLAN_CHANGED", "pending-gh close has no GH_NOT_FOUND reason", { issue: expected.number });
      for (const value of [actual.comment.handoff_id, actual.comment.attempt_path, actual.close.handoff_id, actual.close.attempt_path]) {
        if (value !== null && value !== undefined && typeof value !== "string") fail("PLAN_CHANGED", "Remote attempt references must be strings or null", { issue: expected.number });
      }
    }
  }
  if (result.status !== resultStatus(result)) fail("PLAN_CHANGED", "Run status does not match the saved result states");
  return result;
}

function resultStatus(result) {
  const importing = result.issues.filter((issue) => issue.outcome === "create");
  if (!importing.length) return "complete";
  if (result.writes.some((write) => write.status !== "written")) {
    return result.writes.some((write) => write.status === "written") ? "partial" : "prepared";
  }
  return importing.every((issue) => issue.comment.status === "posted" || issue.comment.status === "already-posted")
    && importing.every((issue) => issue.close.status === "closed" || issue.close.status === "already-closed")
    ? "complete" : "local-written";
}

function updateIssueLocalStates(result, recoveredWithoutResult = new Set()) {
  for (const issue of result.issues.filter((item) => item.outcome === "create")) {
    const statuses = result.writes.filter((write) => issue.write_paths.includes(write.path)).map((write) => write.status);
    if (statuses.every((status) => status === "written")) {
      issue.local_status = "local-written";
      if (issue.comment.status === "blocked") {
        issue.comment.status = recoveredWithoutResult.has(issue.number) ? "uncertain" : "pending";
        if (recoveredWithoutResult.has(issue.number)) issue.comment.reason = "RESULT_RECOVERED";
      }
    } else if (statuses.some((status) => status === "written")) issue.local_status = "partial";
    else issue.local_status = "prepared";
  }
  result.status = resultStatus(result);
  return result;
}

function assertRunFilePath(repoRoot, filePath) {
  if (typeof filePath !== "string" || filePath.split(/[\\/]/).includes("..")) {
    fail("PATH_OUTSIDE_REPO", "Issue import run paths must not contain parent-directory segments", { path: filePath });
  }
  const absolute = path.resolve(filePath);
  const relative = path.relative(repoRoot, absolute).split(path.sep).join("/");
  if (relative.startsWith("../") || relative === ".." || path.posix.isAbsolute(relative)
    || !relative.startsWith("workplace/issue-import/") || !relative.endsWith("/result.json")) {
    fail("PATH_OUTSIDE_REPO", "result.json must be inside workplace/issue-import/<run>/", { path: filePath });
  }
  let current = repoRoot;
  const parts = relative.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) fail("PATH_OUTSIDE_REPO", "Issue import run paths cannot contain symbolic links", { path: relative });
      if (index < parts.length - 1 && !stat.isDirectory()) fail("PATH_OUTSIDE_REPO", "Issue import run parent is not a directory", { path: relative });
      if (index === parts.length - 1 && !stat.isFile()) fail("PATH_OUTSIDE_REPO", "Issue import result is not a regular file", { path: relative });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { absolute, relative, runDirectory: path.dirname(absolute) };
}

async function atomicWrite(filePath, content, { exclusive = false } = {}) {
  const directory = path.dirname(filePath);
  await fsp.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fsp.open(temporary, "wx", 0o600);
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    if (exclusive && fs.existsSync(filePath)) fail("LOCAL_CONFLICT", "Output file already exists", { path: filePath });
    if (exclusive) await fsp.link(temporary, filePath);
    else await fsp.rename(temporary, filePath);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await fsp.unlink(temporary).catch(() => {});
  }
}

async function saveResult(resultPath, result) {
  await atomicWrite(resultPath, `${JSON.stringify(result, null, 2)}\n`);
}

function getCurrentHash(repoRoot, relativePath) {
  const absolute = assertSafeRepoPath(repoRoot, relativePath);
  return fs.existsSync(absolute) ? sha256(fs.readFileSync(absolute)) : null;
}

function verifyWriteSourceContent(write, plan) {
  const expected = plan.issues.filter((issue) => issue.outcome === "create" && write.issue_numbers.includes(issue.number))
    .flatMap((issue) => issue.records.filter((record) => record.path === write.path)
      .map((record) => ({ number: issue.number, url: issue.url, key: record.key, import_id: issue.import_id })));
  if (!expected.length) fail("PLAN_CHANGED", "Write has no matching Issue record", { path: write.path });
  const expectedIssueNumbers = [...new Set(expected.map((item) => item.number))].sort((a, b) => a - b);
  if (stableStringify(expectedIssueNumbers) !== stableStringify(write.issue_numbers)) {
    fail("PLAN_CHANGED", "Write issue_numbers do not match its record references", { path: write.path });
  }
  let actual;
  if (write.path.includes("/activities/")) actual = parseActivityMarkers(write.content, write.path);
  else {
    const parsed = parseFrontMatter(write.content, write.path);
    const item = issueSourceFromFrontMatter(parsed.rawFrontMatter, write.path);
    actual = item ? [item] : [];
  }
  for (const item of expected) {
    if (!actual.some((found) => found.number === item.number && found.url === item.url
      && found.key === item.key && found.import_id === item.import_id)) {
      fail("PLAN_CHANGED", "Write content is missing its planned Issue source marker", { path: write.path, issue: item.number, key: item.key });
    }
  }
}

function validateRefreshSource(refreshSourceInput, plan) {
  const refresh = validateIssueSource(refreshSourceInput);
  if (refresh.repo !== plan.repo || refresh.import_date !== plan.import_date
    || stableStringify(refresh.receipt_author_logins) !== stableStringify(plan.receipt_author_logins)) {
    fail("SOURCE_CHANGED", "Refreshed source does not match plan repository or run settings");
  }
  const byNumber = new Map(refresh.issues.map((issue) => [issue.number, issue]));
  for (const planned of plan.issues.filter((issue) => issue.outcome === "create")) {
    const current = byNumber.get(planned.number);
    if (!current || sourceCheckHash(current, refresh) !== planned.source_hash) {
      fail("SOURCE_CHANGED", "Issue source changed after prepare; do not apply this plan", { issue: planned.number });
    }
  }
}

async function createRepoLock(repoRoot, planId) {
  const workplace = path.join(repoRoot, "workplace");
  if (fs.existsSync(workplace) && (fs.lstatSync(workplace).isSymbolicLink() || !fs.lstatSync(workplace).isDirectory())) {
    fail("PATH_OUTSIDE_REPO", "workplace must be a regular directory");
  }
  await fsp.mkdir(workplace, { recursive: true });
  const lockPath = path.join(workplace, "issue-import.lock");
  let handle;
  try { handle = await fsp.open(lockPath, "wx", 0o600); } catch (error) {
    if (error.code === "EEXIST") fail("BUSY", "Another Issue import is running or left a lock for manual recovery", { path: "workplace/issue-import.lock" });
    throw error;
  }
  await handle.writeFile(`${JSON.stringify({ pid: process.pid, plan_id: planId })}\n`, "utf8");
  await handle.close();
  return async () => fsp.unlink(lockPath).catch(() => {});
}

async function ensureRecordParents(repoRoot, relativePath) {
  const parts = relativePath.split("/").slice(0, -1);
  let current = repoRoot;
  for (const part of parts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) await fsp.mkdir(current);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail("PATH_OUTSIDE_REPO", "Record parent is not a safe directory", { path: relativePath });
  }
}

async function applyOneWrite(repoRoot, write) {
  const destination = assertSafeRepoPath(repoRoot, write.path);
  await ensureRecordParents(repoRoot, write.path);
  const before = getCurrentHash(repoRoot, write.path);
  if (before !== write.before_hash) fail("LOCAL_CONFLICT", "Record changed after apply preflight", { path: write.path });
  if (write.before_hash === null) {
    let handle;
    try {
      handle = await fsp.open(destination, "wx", 0o600);
      await handle.writeFile(write.content, "utf8");
      await handle.sync();
    } catch (error) {
      if (error.code === "EEXIST") fail("LOCAL_CONFLICT", "New record path appeared during apply", { path: write.path });
      throw error;
    } finally { if (handle) await handle.close(); }
  } else {
    const directory = path.dirname(destination);
    const temporary = path.join(directory, `.${path.basename(destination)}.${process.pid}.${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await fsp.open(temporary, "wx", 0o600);
      await handle.writeFile(write.content, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      if (getCurrentHash(repoRoot, write.path) !== write.before_hash) {
        fail("LOCAL_CONFLICT", "Existing record changed before atomic replacement", { path: write.path });
      }
      await fsp.rename(temporary, destination);
    } finally {
      if (handle) await handle.close().catch(() => {});
      await fsp.unlink(temporary).catch(() => {});
    }
  }
  if (getCurrentHash(repoRoot, write.path) !== write.after_hash) {
    fail("LOCAL_CONFLICT", "Written record hash does not match plan", { path: write.path });
  }
}

export async function applyIssueImport({ repoRoot, plan, refreshSource, resultPath, dependencies = {} }) {
  const realRoot = validatePlan(plan, repoRoot);
  const paths = assertRunFilePath(realRoot, resultPath);
  const releaseLock = await createRepoLock(realRoot, plan.plan_id);
  try {
    const resultExisted = fs.existsSync(paths.absolute);
    let result;
    if (resultExisted) {
      try { result = JSON.parse(await fsp.readFile(paths.absolute, "utf8")); }
      catch { fail("PLAN_CHANGED", "Existing result.json is not valid JSON", { path: paths.relative }); }
      validateStoredResult(result, plan);
    } else {
      result = createInitialResult(plan);
      await saveResult(paths.absolute, result);
      for (const issue of result.issues.filter((item) => item.outcome === "create")) {
        const commentPath = path.join(paths.runDirectory, issue.comment_file);
        const expected = `${issue.comment_body}\n`;
        if (fs.existsSync(commentPath)) {
          if (await fsp.readFile(commentPath, "utf8") !== expected) fail("LOCAL_CONFLICT", "Comment draft already exists with different content", { issue: issue.number });
        } else await atomicWrite(commentPath, expected, { exclusive: true });
      }
    }
    const currentStates = [];
    let everyWriteAlreadyApplied = true;
    for (let index = 0; index < plan.writes.length; index += 1) {
      const write = plan.writes[index];
      const stored = result.writes[index];
      const currentHash = getCurrentHash(realRoot, write.path);
      if (currentHash === write.after_hash) {
        verifyWriteSourceContent(write, plan);
        if (stored.status === "written") currentStates.push("written");
        else currentStates.push("recover-written");
        continue;
      }
      everyWriteAlreadyApplied = false;
      if (stored.status === "written") fail("LOCAL_CONFLICT", "A previously written record was edited or removed", { path: write.path });
      if (currentHash !== write.before_hash) fail("LOCAL_CONFLICT", "Record no longer matches its before_hash", { path: write.path });
      currentStates.push("queued");
    }
    if (!everyWriteAlreadyApplied) {
      if (!refreshSource) fail("SOURCE_CHANGED", "refresh-source.json is required while writes remain unapplied");
      validateRefreshSource(refreshSource, plan);
    }
    const recoveredIssues = new Set();
    if (!resultExisted) {
      for (let index = 0; index < plan.writes.length; index += 1) {
        if (currentStates[index] === "recover-written") {
          for (const issueNumber of plan.writes[index].issue_numbers) recoveredIssues.add(issueNumber);
        }
      }
    }
    for (let index = 0; index < plan.writes.length; index += 1) {
      const write = plan.writes[index];
      const stored = result.writes[index];
      if (currentStates[index] === "recover-written") {
        stored.status = "written";
        updateIssueLocalStates(result, recoveredIssues);
        await saveResult(paths.absolute, result);
        continue;
      }
      if (currentStates[index] === "written") continue;
      try {
        if (dependencies.beforeWrite) await dependencies.beforeWrite(write, index);
        await applyOneWrite(realRoot, write);
        if (dependencies.afterWriteBeforeResult) await dependencies.afterWriteBeforeResult(write, index);
        verifyWriteSourceContent(write, plan);
        stored.status = "written";
        updateIssueLocalStates(result, recoveredIssues);
        await saveResult(paths.absolute, result);
      } catch (error) {
        result.last_error = { code: error.code ?? "PARTIAL_WRITE", message: error.message, path: write.path };
        updateIssueLocalStates(result, recoveredIssues);
        await saveResult(paths.absolute, result);
        if (error instanceof IssueImportError) throw error;
        fail("PARTIAL_WRITE", "Issue import stopped after a local write failure; keep completed records and resume this run", { path: write.path, detail: error.message });
      }
    }
    updateIssueLocalStates(result, recoveredIssues);
    delete result.last_error;
    await saveResult(paths.absolute, result);
    return result;
  } finally {
    await releaseLock();
  }
}

function resultAndPlanPaths(resultPath, repoRoot) {
  const paths = assertRunFilePath(repoRoot, resultPath);
  const planPath = path.join(paths.runDirectory, "plan.json");
  try {
    const stat = fs.lstatSync(planPath);
    if (stat.isSymbolicLink() || !stat.isFile()) fail("PATH_OUTSIDE_REPO", "plan.json must be a regular file in the run directory");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    fail("PLAN_CHANGED", "plan.json is missing from the result run directory");
  }
  return { ...paths, planPath };
}

async function withResultAndPlan({ repoRoot, resultPath }, callback) {
  const realRoot = fs.realpathSync(repoRoot);
  const paths = resultAndPlanPaths(resultPath, realRoot);
  let plan;
  let result;
  try {
    [plan, result] = await Promise.all([
      fsp.readFile(paths.planPath, "utf8").then(JSON.parse),
      fsp.readFile(paths.absolute, "utf8").then(JSON.parse),
    ]);
  } catch {
    fail("PLAN_CHANGED", "Could not read matching plan.json and result.json in this run directory");
  }
  validatePlan(plan, realRoot);
  validateStoredResult(result, plan);
  const releaseLock = await createRepoLock(realRoot, plan.plan_id);
  try {
    // Re-read after locking so another process cannot overwrite newer remote state.
    result = JSON.parse(await fsp.readFile(paths.absolute, "utf8"));
    validateStoredResult(result, plan);
    const updated = await callback(result, plan);
    updated.status = resultStatus(updated);
    await saveResult(paths.absolute, updated);
    return updated;
  } finally { await releaseLock(); }
}

function transitionStatus(current, next, allowed, label, issueNumber) {
  if (current === next) return;
  if (new Set(["posted", "already-posted", "closed", "already-closed"]).has(current)) {
    fail("INVALID_RESULT_TRANSITION", `${label} success state cannot be changed`, { issue: issueNumber, current, next });
  }
  if (!allowed[current]?.has(next)) fail("INVALID_RESULT_TRANSITION", `Invalid ${label} status transition`, { issue: issueNumber, current, next });
}

const COMMENT_TRANSITIONS = {
  pending: new Set(["pending-gh", "sending", "failed", "uncertain", "already-posted"]),
  "pending-gh": new Set(["pending", "sending", "failed", "uncertain", "already-posted"]),
  sending: new Set(["posted", "already-posted", "failed", "uncertain"]),
  failed: new Set(["pending", "sending", "already-posted"]),
  uncertain: new Set(["sending", "posted", "already-posted"]),
};
const CLOSE_TRANSITIONS = {
  pending: new Set(["pending-gh", "closing", "failed", "uncertain", "already-closed"]),
  "pending-gh": new Set(["pending", "closing", "failed", "uncertain", "already-closed"]),
  closing: new Set(["closed", "already-closed", "failed", "uncertain"]),
  failed: new Set(["pending", "closing", "already-closed"]),
  uncertain: new Set(["closing", "closed", "already-closed"]),
};

function findImportIssue(result, issueNumber, label) {
  const issue = result.issues.find((entry) => entry.number === issueNumber);
  if (!issue || issue.outcome !== "create" || issue.local_status !== "local-written") {
    fail("INVALID_RESULT_TRANSITION", `${label} requires a locally completed Issue import`, { issue: issueNumber });
  }
  if (issue.write_paths.some((writePath) => !result.writes.some((write) => write.path === writePath && write.status === "written"))) {
    fail("INVALID_RESULT_TRANSITION", `${label} requires every local write to be recorded as written`, { issue: issueNumber });
  }
  return issue;
}

function verifyIssueLocalIntegrity(repoRoot, issue, plan, result) {
  for (const writePath of issue.write_paths) {
    const planned = plan.writes.find((write) => write.path === writePath);
    const recorded = result.writes.find((write) => write.path === writePath);
    if (!planned || !recorded || recorded.status !== "written" || getCurrentHash(repoRoot, writePath) !== planned.after_hash) {
      fail("LOCAL_CONFLICT", "An imported record changed after local apply; remote operations are blocked", { issue: issue.number, path: writePath });
    }
    verifyWriteSourceContent(planned, plan);
  }
}

function validateCommentResultUrl(value, issue) {
  const comment = normalizeCommentUrl(value, issue.url, issue.number);
  return comment.url;
}

export async function recordIssueCommentResult({ repoRoot, resultPath, issueNumber, status, url = null, message = null, reason = null, handoffId = null, attemptPath = null }) {
  if (!ISSUE_RESULT_STATUSES.has(status)) fail("INVALID_RESULT_TRANSITION", "Unsupported comment status", { issue: issueNumber, status });
  return withResultAndPlan({ repoRoot, resultPath }, async (result, plan) => {
    const issue = findImportIssue(result, issueNumber, "Comment result");
    verifyIssueLocalIntegrity(fs.realpathSync(repoRoot), issue, plan, result);
    if (issue.comment.status === "blocked") fail("INVALID_RESULT_TRANSITION", "Comment is still blocked", { issue: issueNumber });
    transitionStatus(issue.comment.status, status, COMMENT_TRANSITIONS, "comment", issueNumber);
    if (["posted", "already-posted"].includes(status)) {
      if (typeof url !== "string") fail("INVALID_RESULT_TRANSITION", "Verified comment status requires a comment URL", { issue: issueNumber });
      issue.comment.url = validateCommentResultUrl(url, issue);
    } else if (url !== null && url !== undefined) fail("INVALID_RESULT_TRANSITION", "Only a verified posted comment may have a URL", { issue: issueNumber });
    if (["failed", "uncertain"].includes(status) && (typeof message !== "string" || !message.trim())) {
      fail("INVALID_RESULT_TRANSITION", "Failed and uncertain comments require a message", { issue: issueNumber });
    }
    if (status === "pending-gh") {
      if (reason !== "GH_NOT_FOUND") fail("INVALID_RESULT_TRANSITION", "pending-gh requires reason GH_NOT_FOUND", { issue: issueNumber });
      issue.comment.reason = reason;
    } else issue.comment.reason = reason;
    issue.comment.status = status;
    issue.comment.message = message;
    issue.comment.handoff_id = handoffId;
    issue.comment.attempt_path = attemptPath;
    return result;
  });
}

function validateIssueResultUrl(value, issue) {
  if (typeof value !== "string") fail("INVALID_RESULT_TRANSITION", "Verified close status requires the Issue URL", { issue: issue.number });
  let parsed;
  try { parsed = new URL(value); } catch { fail("INVALID_RESULT_TRANSITION", "Issue URL is malformed", { issue: issue.number }); }
  if (parsed.href !== `${issue.url}` || parsed.search || parsed.hash) {
    fail("INVALID_RESULT_TRANSITION", "Close result URL must identify exactly the target Issue", { issue: issue.number });
  }
  return parsed.href;
}

export async function recordIssueCloseResult({ repoRoot, resultPath, issueNumber, status, url = null, message = null, reason = null, handoffId = null, attemptPath = null }) {
  if (!CLOSE_RESULT_STATUSES.has(status)) fail("INVALID_RESULT_TRANSITION", "Unsupported close status", { issue: issueNumber, status });
  return withResultAndPlan({ repoRoot, resultPath }, async (result, plan) => {
    const issue = findImportIssue(result, issueNumber, "Close result");
    verifyIssueLocalIntegrity(fs.realpathSync(repoRoot), issue, plan, result);
    if (!new Set(["posted", "already-posted"]).has(issue.comment.status)) {
      fail("INVALID_RESULT_TRANSITION", "Issue close is blocked until its result comment is verified", { issue: issueNumber });
    }
    if (issue.close.status === "blocked") {
      if (status !== "pending" && status !== "already-closed") fail("INVALID_RESULT_TRANSITION", "Close must enter pending after a verified comment", { issue: issueNumber });
    } else transitionStatus(issue.close.status, status, CLOSE_TRANSITIONS, "close", issueNumber);
    if (["closed", "already-closed"].includes(status)) issue.close.url = validateIssueResultUrl(url, issue);
    else if (url !== null && url !== undefined) fail("INVALID_RESULT_TRANSITION", "Only a verified close status may have an Issue URL", { issue: issueNumber });
    if (["failed", "uncertain"].includes(status) && (typeof message !== "string" || !message.trim())) {
      fail("INVALID_RESULT_TRANSITION", "Failed and uncertain close results require a message", { issue: issueNumber });
    }
    if (status === "pending-gh") {
      if (reason !== "GH_NOT_FOUND") fail("INVALID_RESULT_TRANSITION", "pending-gh requires reason GH_NOT_FOUND", { issue: issueNumber });
      issue.close.reason = reason;
    } else issue.close.reason = reason;
    issue.close.status = status;
    issue.close.message = message;
    issue.close.handoff_id = handoffId;
    issue.close.attempt_path = attemptPath;
    return result;
  });
}
