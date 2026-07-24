#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const UPDATE_DRAFT_PATTERN = /^issue-(\d+)-update-\d{12}(?:-\d+)?\.md$/;
const ATTEMPT_STATUSES = new Set([
  "pending",
  "not-applied",
  "updated",
  "conflict",
  "unresolved",
]);
const POST_UPDATE_VERIFICATION_DELAYS_MS = [0, 250, 1_000];
const MAX_LABEL_CHANGES = 20;

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/github-issue-update.mjs \\
    --repo <owner/repo> --issue <number> --draft <path> \\
    [--add-label <existing-label>]... [--remove-label <existing-label>]... \\
    [--root <repository-root>]

  node skills/igapyon-miku-scm/scripts/github-issue-update.mjs \\
    --repo <owner/repo> --issue <number> --draft <path> \\
    [--add-label <existing-label>]... [--remove-label <existing-label>]... \\
    --expected-draft-sha256 <reviewed-draft-sha256> \\
    --expected-update-sha256 <reviewed-update-sha256> \\
    --expected-current-issue-sha256 <reviewed-current-issue-sha256> \\
    --expected-updated-at <reviewed-updated-at> --apply \\
    [--root <repository-root>]

Default mode is a read-only preflight using fixed gh issue view and gh label
list commands.
Apply mode fixes the reviewed title, body, existing-label changes, and current
Issue state; records the attempt; invokes exactly one gh issue edit command;
and verifies the complete resulting title, body, and labels anonymously. It
never retries automatically.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    issueNumber: 0,
    draft: "",
    addLabels: [],
    removeLabels: [],
    root: cwd,
    expectedDraftSha256: "",
    expectedUpdateSha256: "",
    expectedCurrentIssueSha256: "",
    expectedUpdatedAt: "",
    apply: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--repo") {
      options.repository = argv[++index] ?? "";
    } else if (arg === "--issue") {
      options.issueNumber = Number(argv[++index] ?? "");
    } else if (arg === "--draft") {
      options.draft = argv[++index] ?? "";
    } else if (arg === "--add-label") {
      options.addLabels.push(argv[++index] ?? "");
    } else if (arg === "--remove-label") {
      options.removeLabels.push(argv[++index] ?? "");
    } else if (arg === "--root") {
      options.root = argv[++index] ?? "";
    } else if (arg === "--expected-draft-sha256") {
      options.expectedDraftSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-update-sha256") {
      options.expectedUpdateSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-current-issue-sha256") {
      options.expectedCurrentIssueSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-updated-at") {
      options.expectedUpdatedAt = argv[++index] ?? "";
    } else if (arg === "--apply") {
      options.apply = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.help) return options;
  if (!REPOSITORY_PATTERN.test(options.repository)) {
    throw new Error("--repo must be exactly owner/repo");
  }
  if (!Number.isSafeInteger(options.issueNumber) || options.issueNumber < 1) {
    throw new Error("--issue must be a positive integer");
  }
  if (!options.draft) throw new Error("--draft must not be empty");
  if (!options.root) throw new Error("--root must not be empty");
  if (options.addLabels.length + options.removeLabels.length > MAX_LABEL_CHANGES) {
    throw new Error(`At most ${MAX_LABEL_CHANGES} label changes are allowed`);
  }
  for (const [kind, labels] of [["add", options.addLabels], ["remove", options.removeLabels]]) {
    const seen = new Set();
    for (const label of labels) {
      if (!label || label !== label.trim() || /[\r\n]/.test(label)) {
        throw new Error(`--${kind}-label must be a non-empty single exact label name`);
      }
      if (seen.has(label)) throw new Error(`Duplicate --${kind}-label: ${label}`);
      seen.add(label);
    }
  }
  const overlap = options.addLabels.filter((label) => options.removeLabels.includes(label));
  if (overlap.length > 0) {
    throw new Error(`Labels cannot be both added and removed: ${overlap.join(", ")}`);
  }

  for (const [name, value] of [
    ["--expected-draft-sha256", options.expectedDraftSha256],
    ["--expected-update-sha256", options.expectedUpdateSha256],
    ["--expected-current-issue-sha256", options.expectedCurrentIssueSha256],
  ]) {
    if (value && !SHA256_PATTERN.test(value)) {
      throw new Error(`${name} must be a 64-character hexadecimal SHA-256 digest`);
    }
  }

  const applyValues = [
    options.expectedDraftSha256,
    options.expectedUpdateSha256,
    options.expectedCurrentIssueSha256,
    options.expectedUpdatedAt,
  ];
  if (options.apply && applyValues.some((value) => !value)) {
    throw new Error(
      "--apply requires --expected-draft-sha256, --expected-update-sha256, --expected-current-issue-sha256, and --expected-updated-at from the reviewed preflight",
    );
  }
  if (!options.apply && applyValues.some(Boolean)) {
    throw new Error("expected values are used only with --apply");
  }
  return options;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function canonicalLabels(labels) {
  return [...labels].sort((left, right) => left.localeCompare(right, "en"));
}

function labelsSha256(labels) {
  return sha256(JSON.stringify(canonicalLabels(labels)));
}

function issueSnapshotSha256(issue) {
  return sha256(JSON.stringify({
    title: issue.title,
    body: issue.body,
    labels: canonicalLabels(issue.labels),
  }));
}

function updateSha256(draft, options) {
  return sha256(JSON.stringify({
    draft_sha256: draft.digest,
    add_labels: canonicalLabels(options.addLabels),
    remove_labels: canonicalLabels(options.removeLabels),
  }));
}

function targetLabels(currentLabels, options) {
  const removed = new Set(options.removeLabels);
  return [
    ...currentLabels.filter((label) => !removed.has(label)),
    ...options.addLabels,
  ];
}

function validateCurrentLabels(currentLabels, options) {
  const current = new Set(currentLabels);
  const alreadyPresent = options.addLabels.filter((label) => current.has(label));
  const absent = options.removeLabels.filter((label) => !current.has(label));
  if (alreadyPresent.length > 0) {
    throw new Error(`Labels already present cannot be added: ${alreadyPresent.join(", ")}`);
  }
  if (absent.length > 0) {
    throw new Error(`Absent labels cannot be removed: ${absent.join(", ")}`);
  }
}

export function parseDraft(content) {
  if (content.includes("\r")) throw new Error("Draft must use LF line endings");
  const separator = content.indexOf("\n\n");
  if (separator < 1) {
    throw new Error("Draft must contain a title, one blank line, and a body");
  }
  const title = content.slice(0, separator);
  const body = content.slice(separator + 2);
  if (title.includes("\n")) throw new Error("Draft title must be exactly one line");
  if (!title.trim() || title !== title.trim()) {
    throw new Error("Draft title must be non-empty and have no surrounding whitespace");
  }
  if (title.startsWith("#")) throw new Error("Draft title must not use a Markdown heading marker");
  if (!body.trim()) throw new Error("Draft body must not be empty");
  return { title, body };
}

async function resolveDraft(options) {
  const root = await realpath(path.resolve(options.root));
  const draft = await realpath(path.resolve(root, options.draft));
  const draftDirectory = path.join(root, "workplace", "miku-scm", "issue-updates");
  const relative = path.relative(draftDirectory, draft);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new Error("--draft must name one file directly under workplace/miku-scm/issue-updates");
  }
  const match = relative.match(UPDATE_DRAFT_PATTERN);
  if (!match) {
    throw new Error("--draft must use the issue-<number>-update-<YYYYMMDDHHMM>.md naming form");
  }
  if (Number(match[1]) !== options.issueNumber) {
    throw new Error("Draft filename Issue number must match --issue");
  }
  const content = await readFile(draft, "utf8");
  return {
    root,
    draft,
    relativeDraft: path.relative(root, draft),
    content,
    digest: sha256(content),
    ...parseDraft(content),
  };
}

function operationalPaths(draft, repository, issueNumber, digest) {
  const [owner, repo] = repository.split("/");
  const directory = path.join(
    draft.root,
    "workplace",
    "miku-scm",
    "issue-update-attempts",
    owner,
    repo,
    String(issueNumber),
  );
  return {
    directory,
    attempt: path.join(directory, `${digest}.json`),
  };
}

async function readAttemptRecord(attemptPath) {
  let content;
  try {
    content = await readFile(attemptPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  let record;
  try {
    record = JSON.parse(content);
  } catch {
    throw new Error(`Issue update attempt record is unreadable: ${attemptPath}`);
  }
  if (!record || !ATTEMPT_STATUSES.has(record.status)) {
    throw new Error(`Issue update attempt record has an unsupported status: ${attemptPath}`);
  }
  return record;
}

function priorAttemptError(record) {
  return new Error(
    `This Issue update draft already has a ${record.status} attempt for ${record.repository}#${record.issue_number}. Do not retry it; create a new draft from the latest public Issue state.`,
  );
}

function isRetryableNotApplied(record) {
  return record?.status === "not-applied"
    || (record?.status === "unresolved" && record?.stage === "pre-update-read");
}

async function archiveRetryableAttempt(attemptPath, record) {
  if (!isRetryableNotApplied(record)) throw priorAttemptError(record);
  const archive = `${attemptPath}.not-applied-${Date.now()}-${randomUUID()}.json`;
  await rename(attemptPath, archive);
  return archive;
}

async function claimAttempt(attemptPath, record) {
  await mkdir(path.dirname(attemptPath), { recursive: true });
  let handle;
  try {
    handle = await open(attemptPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw priorAttemptError(await readAttemptRecord(attemptPath));
    }
    throw error;
  } finally {
    await handle?.close();
  }
}

async function replaceAttemptRecord(attemptPath, record) {
  const temporary = `${attemptPath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, attemptPath);
  } finally {
    await rm(temporary, { force: true });
  }
}

export function createGhIssueReader(gh = createGhRunner()) {
  return async (repository, issueNumber) => {
    const result = gh([
      "issue", "view", String(issueNumber),
      "--repo", repository,
      "--json", "number,url,title,body,labels,updatedAt",
    ]);
    if (!result?.ok) {
      throw new Error(`gh issue view failed: ${ghDetail(result)}`);
    }
    let issue;
    try {
      issue = JSON.parse(result.stdout);
    } catch {
      throw new Error("gh issue view returned malformed JSON");
    }
    const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}`;
    if (
      issue?.number !== issueNumber
      || issue?.url !== expectedUrl
      || typeof issue?.title !== "string"
      || typeof issue?.body !== "string"
      || !Array.isArray(issue?.labels)
      || issue.labels.some((label) => typeof label?.name !== "string")
      || typeof issue?.updatedAt !== "string"
      || !issue.updatedAt
    ) {
      throw new Error("gh issue view does not exactly identify the requested Issue");
    }
    return {
      number: issue.number,
      url: issue.url,
      title: issue.title,
      body: issue.body,
      labels: issue.labels.map((label) => label.name),
      updatedAt: issue.updatedAt,
    };
  };
}

export function createGhLabelReader(gh = createGhRunner()) {
  return async (repository) => {
    const result = gh([
      "label", "list",
      "--repo", repository,
      "--limit", "1000",
      "--json", "name",
    ]);
    if (!result?.ok) {
      throw new Error(`gh label list failed: ${ghDetail(result)}`);
    }
    let labels;
    try {
      labels = JSON.parse(result.stdout);
    } catch {
      throw new Error("gh label list returned malformed JSON");
    }
    if (!Array.isArray(labels) || labels.some((label) => typeof label?.name !== "string")) {
      throw new Error("gh label list response is malformed");
    }
    return labels.map((label) => label.name);
  };
}

function validateExistingLabels(availableLabels, options) {
  const available = new Set(availableLabels);
  const missing = [...options.addLabels, ...options.removeLabels]
    .filter((label) => !available.has(label));
  if (missing.length > 0) {
    throw new Error(`Requested labels do not exist exactly: ${missing.join(", ")}`);
  }
}

export function createGhRunner() {
  return (args) => {
    const result = spawnSync("gh", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: (result.stdout || "").trim(),
      stderr: (result.stderr || "").trim(),
      error: result.error,
    };
  };
}

export function bodyDiff(currentBody, proposedBody) {
  const before = currentBody.split("\n");
  const after = proposedBody.split("\n");
  const rows = before.length + 1;
  const columns = after.length + 1;
  if (rows * columns > 1_000_000) {
    return "--- current-body\n+++ proposed-body\n@@ full bodies omitted from diff: input is too large @@\n";
  }
  const table = Array.from({ length: rows }, () => new Uint32Array(columns));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const lines = ["--- current-body", "+++ proposed-body", "@@ full body @@"];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      lines.push(` ${before[i]}`);
      i += 1;
      j += 1;
    } else if (j < after.length && (i === before.length || table[i][j + 1] >= table[i + 1][j])) {
      lines.push(`+${after[j]}`);
      j += 1;
    } else {
      lines.push(`-${before[i]}`);
      i += 1;
    }
  }
  return `${lines.join("\n")}\n`;
}

function applyArguments(options, draft, current, digest) {
  const args = [
    "--repo", options.repository,
    "--issue", String(options.issueNumber),
    "--draft", draft.relativeDraft,
    ...options.addLabels.flatMap((label) => ["--add-label", label]),
    ...options.removeLabels.flatMap((label) => ["--remove-label", label]),
    "--expected-draft-sha256", draft.digest,
    "--expected-update-sha256", digest,
    "--expected-current-issue-sha256", issueSnapshotSha256(current),
    "--expected-updated-at", current.updatedAt,
    "--apply",
  ];
  if (path.resolve(options.root) !== process.cwd()) args.push("--root", draft.root);
  return args;
}

function ghDetail(result) {
  return result?.stderr || result?.stdout || result?.error?.message || `exit ${result?.status ?? "unknown"}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function ghArguments(options, draft, current, bodyFile = "<generated-temporary-body-file>") {
  const args = [
    "issue", "edit", String(options.issueNumber),
    "--repo", options.repository,
  ];
  if (draft.title !== current.title) args.push("--title", draft.title);
  if (draft.body !== current.body) args.push("--body-file", bodyFile);
  args.push(
    ...options.addLabels.flatMap((label) => ["--add-label", label]),
    ...options.removeLabels.flatMap((label) => ["--remove-label", label]),
  );
  return args;
}

async function verifyUpdatedIssue({
  readIssue,
  sleep,
  repository,
  issueNumber,
  expectedUrl,
  expectedTitle,
  expectedBody,
  expectedLabels,
}) {
  let lastObserved;
  let lastError;
  for (let index = 0; index < POST_UPDATE_VERIFICATION_DELAYS_MS.length; index += 1) {
    const delay = POST_UPDATE_VERIFICATION_DELAYS_MS[index];
    if (delay > 0) await sleep(delay);
    try {
      const observed = await readIssue(repository, issueNumber, {
        cacheBypass: true,
        verificationAttempt: index + 1,
      });
      lastObserved = observed;
      lastError = undefined;
      if (
        observed.url === expectedUrl
        && observed.number === issueNumber
        && observed.title === expectedTitle
        && observed.body === expectedBody
        && labelsSha256(observed.labels) === labelsSha256(expectedLabels)
      ) {
        return { status: "verified", issue: observed, attempts: index + 1 };
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastObserved) {
    return {
      status: "mismatch",
      issue: lastObserved,
      attempts: POST_UPDATE_VERIFICATION_DELAYS_MS.length,
    };
  }
  return {
    status: "read-error",
    error: lastError,
    attempts: POST_UPDATE_VERIFICATION_DELAYS_MS.length,
  };
}

export async function runIssueUpdate(options, dependencies = {}) {
  const gh = dependencies.gh ?? createGhRunner();
  const readIssue = dependencies.readIssue ?? createGhIssueReader(gh);
  const readLabels = dependencies.readLabels ?? createGhLabelReader(gh);
  const readIssueForApply = dependencies.readIssueWithGh ?? readIssue;
  const applyReadSource = dependencies.readIssueWithGh || !dependencies.readIssue
    ? "gh-issue-view"
    : "injected-test-reader";
  const sleep = dependencies.sleep ?? wait;
  const draft = await resolveDraft(options);
  const updateDigest = updateSha256(draft, options);
  const operational = operationalPaths(
    draft,
    options.repository,
    options.issueNumber,
    updateDigest,
  );
  const priorAttempt = await readAttemptRecord(operational.attempt);
  if (priorAttempt && !isRetryableNotApplied(priorAttempt)) {
    throw priorAttemptError(priorAttempt);
  }

  if (options.addLabels.length + options.removeLabels.length > 0) {
    validateExistingLabels(await readLabels(options.repository), options);
  }
  const common = {
    repository: options.repository,
    issue_number: options.issueNumber,
    draft: draft.relativeDraft,
    draft_sha256: draft.digest,
    update_sha256: updateDigest,
    proposed_title: draft.title,
    proposed_body: draft.body,
    proposed_body_sha256: sha256(draft.body),
    add_labels: options.addLabels,
    remove_labels: options.removeLabels,
    attempt_record: path.relative(draft.root, operational.attempt),
    retrying_not_applied_attempt: Boolean(priorAttempt),
  };

  if (!options.apply) {
    const current = await readIssue(options.repository, options.issueNumber);
    validateCurrentLabels(current.labels, options);
    const resultingLabels = targetLabels(current.labels, options);
    if (
      draft.title === current.title
      && draft.body === current.body
      && options.addLabels.length === 0
      && options.removeLabels.length === 0
    ) {
      throw new Error("Issue update must change the title, body, or labels");
    }
    return {
      status: "preflight-ok",
      ...common,
      issue_url: current.url,
      current_title: current.title,
      current_title_sha256: sha256(current.title),
      current_body: current.body,
      current_body_sha256: sha256(current.body),
      current_labels: current.labels,
      current_labels_sha256: labelsSha256(current.labels),
      resulting_labels: resultingLabels,
      resulting_labels_sha256: labelsSha256(resultingLabels),
      current_issue_sha256: issueSnapshotSha256(current),
      current_updated_at: current.updatedAt,
      body_diff: bodyDiff(current.body, draft.body),
      planned_gh_arguments: ghArguments(options, draft, current),
      apply_arguments: applyArguments(options, draft, current, updateDigest),
    };
  }

  if (draft.digest !== options.expectedDraftSha256.toLowerCase()) {
    throw new Error(
      `Reviewed draft changed: expected ${options.expectedDraftSha256.toLowerCase()}, actual ${draft.digest}`,
    );
  }
  if (updateDigest !== options.expectedUpdateSha256.toLowerCase()) {
    throw new Error(
      `Reviewed update changed: expected ${options.expectedUpdateSha256.toLowerCase()}, actual ${updateDigest}`,
    );
  }

  const pendingRecord = {
    schema_version: 2,
    status: "pending",
    repository: options.repository,
    issue_number: options.issueNumber,
    source_draft: draft.relativeDraft,
    draft_sha256: draft.digest,
    update_sha256: updateDigest,
    proposed_title: draft.title,
    proposed_body_sha256: sha256(draft.body),
    add_labels: options.addLabels,
    remove_labels: options.removeLabels,
    reviewed_current_issue_sha256: options.expectedCurrentIssueSha256.toLowerCase(),
    reviewed_updated_at: options.expectedUpdatedAt,
    attempt_started_at: new Date().toISOString(),
  };
  let archivedNotAppliedAttempt;
  if (priorAttempt) {
    archivedNotAppliedAttempt = await archiveRetryableAttempt(
      operational.attempt,
      priorAttempt,
    );
    pendingRecord.recovered_from_attempt = path.relative(
      draft.root,
      archivedNotAppliedAttempt,
    );
  }
  await claimAttempt(operational.attempt, pendingRecord);

  let current;
  let preUpdateReadSource;
  try {
    current = await readIssueForApply(options.repository, options.issueNumber);
    preUpdateReadSource = applyReadSource;
  } catch (error) {
    const record = {
      ...pendingRecord,
      status: "not-applied",
      stage: "pre-update-read",
      gh_invoked: false,
      detail: error instanceof Error ? error.message : String(error),
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttemptRecord(operational.attempt, record);
    return {
      status: "not-applied",
      ...common,
      stage: record.stage,
      gh_invoked: false,
      detail: record.detail,
    };
  }

  const observedIssueSha256 = issueSnapshotSha256(current);
  if (
    current.updatedAt !== options.expectedUpdatedAt
    || observedIssueSha256 !== options.expectedCurrentIssueSha256.toLowerCase()
  ) {
    const record = {
      ...pendingRecord,
      status: "conflict",
      observed_title: current.title,
      observed_body_sha256: sha256(current.body),
      observed_labels: current.labels,
      observed_labels_sha256: labelsSha256(current.labels),
      observed_issue_sha256: observedIssueSha256,
      observed_updated_at: current.updatedAt,
      pre_update_read_source: preUpdateReadSource,
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttemptRecord(operational.attempt, record);
    return {
      status: "conflict",
      ...common,
      issue_url: current.url,
      observed_title: current.title,
      observed_body_sha256: record.observed_body_sha256,
      observed_labels: current.labels,
      observed_labels_sha256: record.observed_labels_sha256,
      observed_issue_sha256: observedIssueSha256,
      observed_updated_at: current.updatedAt,
      pre_update_read_source: preUpdateReadSource,
    };
  }

  validateCurrentLabels(current.labels, options);
  const resultingLabels = targetLabels(current.labels, options);
  const plannedGhArguments = ghArguments(options, draft, current);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-issue-update-"));
  const bodyFile = path.join(temporary, "body.md");
  try {
    await writeFile(bodyFile, draft.body, { encoding: "utf8", mode: 0o600 });
    let result;
    try {
      result = gh(ghArguments(options, draft, current, bodyFile));
    } catch (error) {
      result = { ok: false, error };
    }
    if (!result?.ok) {
      const record = {
        ...pendingRecord,
        status: "unresolved",
        stage: "gh-issue-edit",
        detail: ghDetail(result),
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttemptRecord(operational.attempt, record);
      return { status: "unresolved", ...common, stage: record.stage, detail: record.detail };
    }

    const verification = await verifyUpdatedIssue({
      readIssue: readIssueForApply,
      sleep,
      repository: options.repository,
      issueNumber: options.issueNumber,
      expectedUrl: current.url,
      expectedTitle: draft.title,
      expectedBody: draft.body,
      expectedLabels: resultingLabels,
    });
    if (verification.status === "read-error") {
      const record = {
        ...pendingRecord,
        status: "unresolved",
        stage: "post-update-read",
        verification_attempts: verification.attempts,
        detail: verification.error instanceof Error
          ? verification.error.message
          : String(verification.error),
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttemptRecord(operational.attempt, record);
      return { status: "unresolved", ...common, stage: record.stage, detail: record.detail };
    }

    const verified = verification.issue;
    if (verification.status === "mismatch") {
      const record = {
        ...pendingRecord,
        status: "unresolved",
        stage: "post-update-verification",
        verification_attempts: verification.attempts,
        observed_url: verified.url,
        observed_title: verified.title,
        observed_body_sha256: sha256(verified.body),
        observed_labels: verified.labels,
        observed_labels_sha256: labelsSha256(verified.labels),
        observed_updated_at: verified.updatedAt,
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttemptRecord(operational.attempt, record);
      return {
        status: "unresolved",
        ...common,
        stage: record.stage,
        observed_url: record.observed_url,
        observed_title: record.observed_title,
        observed_body_sha256: record.observed_body_sha256,
        observed_labels: record.observed_labels,
        observed_labels_sha256: record.observed_labels_sha256,
        observed_updated_at: record.observed_updated_at,
      };
    }

    const updatedRecord = {
      ...pendingRecord,
      status: "updated",
      issue_url: verified.url,
      verified_title: verified.title,
      verified_body_sha256: sha256(verified.body),
      verified_labels: verified.labels,
      verified_labels_sha256: labelsSha256(verified.labels),
      verified_updated_at: verified.updatedAt,
      pre_update_read_source: preUpdateReadSource,
      verification_attempts: verification.attempts,
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttemptRecord(operational.attempt, updatedRecord);
    return {
      status: "updated",
      ...common,
      issue_url: verified.url,
      planned_gh_arguments: plannedGhArguments,
      verified_title: verified.title,
      verified_body_sha256: updatedRecord.verified_body_sha256,
      verified_labels: verified.labels,
      verified_labels_sha256: updatedRecord.verified_labels_sha256,
      verified_updated_at: verified.updatedAt,
      pre_update_read_source: preUpdateReadSource,
      verification_attempts: verification.attempts,
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage}\n`);
      return;
    }
    const result = await runIssueUpdate(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!["preflight-ok", "updated"].includes(result.status)) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}
