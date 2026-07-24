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
const NEW_DRAFT_PATTERN = /^issue-new-\d{12}(?:-\d+)?\.md$/;
const MAX_LABELS = 20;
const MAX_ISSUE_NUMBER = Number.MAX_SAFE_INTEGER;

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \\
    --repo <owner/repo> --draft <path> [--label <existing-label>]... [--parent <number>] \\
    [--root <repository-root>]

  node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \\
    --repo <owner/repo> --draft <path> [--label <reviewed-label>]... [--parent <number>] \\
    --expected-draft-sha256 <reviewed-sha256> \\
    --expected-labels-sha256 <reviewed-labels-sha256> \\
    [--expected-parent-sha256 <reviewed-parent-sha256>] --apply \\
    [--root <repository-root>]

Default mode is a read-only preflight. Apply mode requires the reviewed
draft and label-selection digests. When --parent is present, it also requires
the reviewed parent snapshot digest. The helper invokes fixed non-interactive
gh label list and gh issue view reads and exactly one gh issue create mutation.
Requested labels must already exist in the target repository. The helper
persists a pending attempt before the mutation, archives confirmed drafts, and
never authenticates, changes scopes, edits an existing Issue, or retries the
mutation.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    draft: "",
    root: cwd,
    labels: [],
    parent: null,
    expectedDraftSha256: "",
    expectedLabelsSha256: "",
    expectedParentSha256: "",
    apply: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--repo") {
      options.repository = argv[++index] ?? "";
    } else if (arg === "--draft") {
      options.draft = argv[++index] ?? "";
    } else if (arg === "--root") {
      options.root = argv[++index] ?? "";
    } else if (arg === "--label") {
      options.labels.push(argv[++index] ?? "");
    } else if (arg === "--parent") {
      const value = argv[++index] ?? "";
      if (!/^[1-9]\d*$/.test(value)) {
        throw new Error("--parent must be a positive decimal Issue number");
      }
      const parent = Number(value);
      if (!Number.isSafeInteger(parent) || parent > MAX_ISSUE_NUMBER) {
        throw new Error("--parent must be a safe positive Issue number");
      }
      options.parent = parent;
    } else if (arg === "--expected-draft-sha256") {
      options.expectedDraftSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-labels-sha256") {
      options.expectedLabelsSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-parent-sha256") {
      options.expectedParentSha256 = argv[++index] ?? "";
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
  if (!options.draft) throw new Error("--draft must not be empty");
  if (!options.root) throw new Error("--root must not be empty");
  if (options.labels.length > MAX_LABELS) {
    throw new Error(`At most ${MAX_LABELS} --label values are allowed`);
  }
  const seenLabels = new Set();
  for (const label of options.labels) {
    if (!label || label !== label.trim()) {
      throw new Error("--label must be non-empty and have no surrounding whitespace");
    }
    if (label.includes("\n") || label.includes("\r")) {
      throw new Error("--label must be exactly one line");
    }
    if (seenLabels.has(label)) throw new Error(`Duplicate --label value: ${label}`);
    seenLabels.add(label);
  }
  if (options.expectedDraftSha256 && !SHA256_PATTERN.test(options.expectedDraftSha256)) {
    throw new Error("--expected-draft-sha256 must be a 64-character hexadecimal SHA-256 digest");
  }
  if (options.expectedLabelsSha256 && !SHA256_PATTERN.test(options.expectedLabelsSha256)) {
    throw new Error("--expected-labels-sha256 must be a 64-character hexadecimal SHA-256 digest");
  }
  if (options.expectedParentSha256 && !SHA256_PATTERN.test(options.expectedParentSha256)) {
    throw new Error("--expected-parent-sha256 must be a 64-character hexadecimal SHA-256 digest");
  }
  if (options.apply && (!options.expectedDraftSha256 || !options.expectedLabelsSha256)) {
    throw new Error(
      "--apply requires --expected-draft-sha256 and --expected-labels-sha256 from the reviewed preflight",
    );
  }
  if (options.apply && options.parent && !options.expectedParentSha256) {
    throw new Error("--apply with --parent requires --expected-parent-sha256 from preflight");
  }
  if (options.apply && !options.parent && options.expectedParentSha256) {
    throw new Error("--expected-parent-sha256 requires --parent");
  }
  if (
    !options.apply
    && (options.expectedDraftSha256 || options.expectedLabelsSha256 || options.expectedParentSha256)
  ) {
    throw new Error("expected digests are used only with --apply");
  }
  return options;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function labelsSha256(labels) {
  return sha256(JSON.stringify(labels));
}

function parentSha256(parent) {
  return parent ? sha256(JSON.stringify(parent)) : null;
}

export function parseDraft(content) {
  if (content.includes("\r")) {
    throw new Error("Draft must use LF line endings");
  }
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
  const draftDirectory = path.join(root, "workplace", "miku-scm", "new-issues");
  const relative = path.relative(draftDirectory, draft);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new Error("--draft must name one file directly under workplace/miku-scm/new-issues");
  }
  if (!NEW_DRAFT_PATTERN.test(relative)) {
    throw new Error("--draft must use the issue-new-<YYYYMMDDHHMM>.md naming form");
  }
  const content = await readFile(draft, "utf8");
  const parsed = parseDraft(content);
  return {
    root,
    draft,
    relativeDraft: path.relative(root, draft),
    content,
    digest: sha256(content),
    ...parsed,
  };
}

function issueOperationalPaths(draft, repository) {
  const [owner, repo] = repository.split("/");
  const attemptsDirectory = path.join(
    draft.root,
    "workplace",
    "miku-scm",
    "issue-attempts",
    owner,
    repo,
  );
  const createdDirectory = path.join(
    draft.root,
    "workplace",
    "miku-scm",
    "created-issues",
    owner,
    repo,
  );
  return {
    attemptsDirectory,
    attempt: path.join(attemptsDirectory, `${draft.digest}.json`),
    createdDirectory,
    createdDraft: path.join(createdDirectory, path.basename(draft.draft)),
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
    throw new Error(`Issue attempt record is unreadable: ${attemptPath}`);
  }
  if (!record || !["pending", "created"].includes(record.status)) {
    throw new Error(`Issue attempt record has an unsupported status: ${attemptPath}`);
  }
  return record;
}

function priorAttemptError(record) {
  if (record.status === "created") {
    return new Error(
      `This reviewed draft was already registered for ${record.repository}: ${record.issue_url || "URL unresolved"}`,
    );
  }
  return new Error(
    `A prior Issue creation attempt is pending or uncertain for ${record.repository}. Do not retry; inspect GitHub anonymously first.`,
  );
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
      const existing = await readAttemptRecord(attemptPath);
      throw priorAttemptError(existing);
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

async function pathExists(target) {
  try {
    await realpath(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
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

function parseGhJson(result, command) {
  if (!result.ok) {
    const detail = result.stderr || result.stdout || result.error?.message || `exit ${result.status}`;
    throw new Error(`${command} failed: ${detail}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${command} returned malformed JSON`);
  }
}

export function createGhParentReader(gh = createGhRunner()) {
  return async (repository, issueNumber) => {
    const result = gh([
      "issue", "view", String(issueNumber),
      "--repo", repository,
      "--json", "number,url,title,state,updatedAt",
    ]);
    const issue = parseGhJson(result, "gh issue view parent");
    const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}`;
    if (
      issue?.number !== issueNumber
      || issue?.url !== expectedUrl
      || typeof issue?.title !== "string"
      || !["OPEN", "CLOSED"].includes(issue?.state)
      || typeof issue?.updatedAt !== "string"
      || !issue.updatedAt
    ) {
      throw new Error("gh issue view does not exactly identify the requested parent Issue");
    }
    return {
      number: issue.number,
      url: issue.url,
      title: issue.title,
      state: issue.state,
      updated_at: issue.updatedAt,
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
    const labels = parseGhJson(result, "gh label list");
    if (
      !Array.isArray(labels)
      || labels.some((label) => typeof label?.name !== "string" || !label.name)
    ) {
      throw new Error("gh label list returned malformed label metadata");
    }
    const names = labels.map((label) => label.name);
    if (new Set(names).size !== names.length) {
      throw new Error("gh label list returned duplicate label names");
    }
    return names;
  };
}

export function createGhCreatedIssueReader(gh = createGhRunner()) {
  return async (repository, issueNumber) => {
    const result = gh([
      "issue", "view", String(issueNumber),
      "--repo", repository,
      "--json", "number,url,labels,parent",
    ]);
    const issue = parseGhJson(result, "gh issue view created Issue");
    const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}`;
    if (
      issue?.number !== issueNumber
      || issue?.url !== expectedUrl
      || !Array.isArray(issue?.labels)
      || issue.labels.some((label) => typeof label?.name !== "string" || !label.name)
    ) {
      throw new Error("gh issue view does not exactly identify the created Issue");
    }
    const labels = issue.labels.map((label) => label.name);
    if (new Set(labels).size !== labels.length) {
      throw new Error("gh issue view returned duplicate label names");
    }
    const parent = issue.parent == null
      ? null
      : {
          number: issue.parent.number,
          url: issue.parent.url,
        };
    if (
      parent
      && (
        !Number.isSafeInteger(parent.number)
        || parent.number <= 0
        || typeof parent.url !== "string"
        || parent.url !== `https://github.com/${repository}/issues/${parent.number}`
      )
    ) {
      throw new Error("gh issue view returned malformed parent metadata");
    }
    return {
      number: issue.number,
      url: issue.url,
      labels,
      parent,
    };
  };
}

async function validateRequestedLabels(options, readLabels) {
  if (options.labels.length === 0) return [];
  const available = await readLabels(options.repository);
  if (!Array.isArray(available) || available.some((label) => typeof label !== "string")) {
    throw new Error("Label reader returned malformed data");
  }
  const availableSet = new Set(available);
  const missing = options.labels.filter((label) => !availableSet.has(label));
  if (missing.length > 0) {
    throw new Error(
      `Requested labels do not exist exactly in ${options.repository}: ${missing.join(", ")}`,
    );
  }
  return options.labels;
}

function applyArguments(options, draft, parent) {
  const args = [
    "--repo", options.repository,
    "--draft", draft.relativeDraft,
    ...options.labels.flatMap((label) => ["--label", label]),
    ...(options.parent ? ["--parent", String(options.parent)] : []),
    "--expected-draft-sha256", draft.digest,
    "--expected-labels-sha256", labelsSha256(options.labels),
    ...(parent ? ["--expected-parent-sha256", parentSha256(parent)] : []),
    "--apply",
  ];
  if (path.resolve(options.root) !== process.cwd()) {
    args.push("--root", draft.root);
  }
  return args;
}

export async function runIssueCreate(options, dependencies = {}) {
  const gh = dependencies.gh ?? createGhRunner();
  const readLabels = dependencies.readLabels ?? createGhLabelReader(gh);
  const readParent = dependencies.readParent ?? createGhParentReader(gh);
  const readCreatedIssue = dependencies.readCreatedIssue ?? createGhCreatedIssueReader(gh);
  const draft = await resolveDraft(options);
  const operational = issueOperationalPaths(draft, options.repository);
  const priorAttempt = await readAttemptRecord(operational.attempt);
  if (priorAttempt) throw priorAttemptError(priorAttempt);
  if (await pathExists(operational.createdDraft)) {
    throw new Error(`Created-Issue draft destination already exists: ${operational.createdDraft}`);
  }
  await validateRequestedLabels(options, readLabels);
  const parent = options.parent ? await readParent(options.repository, options.parent) : null;
  if (parent && parent.state !== "OPEN") {
    throw new Error(`Parent Issue must be OPEN: ${options.repository}#${options.parent}`);
  }
  const plannedGhArguments = [
    "issue", "create",
    "--repo", options.repository,
    "--title", draft.title,
    "--body-file", "<generated-temporary-body-file>",
    ...options.labels.flatMap((label) => ["--label", label]),
    ...(options.parent ? ["--parent", String(options.parent)] : []),
  ];

  const common = {
    repository: options.repository,
    draft: draft.relativeDraft,
    draft_sha256: draft.digest,
    labels: options.labels,
    labels_sha256: labelsSha256(options.labels),
    parent_issue: parent,
    parent_sha256: parentSha256(parent),
    title: draft.title,
    body: draft.body,
    attempt_record: path.relative(draft.root, operational.attempt),
    created_draft: path.relative(draft.root, operational.createdDraft),
    planned_gh_arguments: plannedGhArguments,
  };

  if (!options.apply) {
    return {
      status: "preflight-ok",
      ...common,
      apply_arguments: applyArguments(options, draft, parent),
    };
  }

  if (draft.digest !== options.expectedDraftSha256.toLowerCase()) {
    throw new Error(
      `Reviewed draft changed: expected ${options.expectedDraftSha256.toLowerCase()}, actual ${draft.digest}`,
    );
  }
  const actualLabelsSha256 = labelsSha256(options.labels);
  if (actualLabelsSha256 !== options.expectedLabelsSha256.toLowerCase()) {
    throw new Error(
      `Reviewed label selection changed: expected ${options.expectedLabelsSha256.toLowerCase()}, actual ${actualLabelsSha256}`,
    );
  }
  if (parent) {
    const actualParentSha256 = parentSha256(parent);
    if (actualParentSha256 !== options.expectedParentSha256.toLowerCase()) {
      throw new Error(
        `Reviewed parent Issue changed: expected ${options.expectedParentSha256.toLowerCase()}, actual ${actualParentSha256}`,
      );
    }
  }

  const pendingRecord = {
    schema_version: 4,
    status: "pending",
    repository: options.repository,
    source_draft: draft.relativeDraft,
    planned_created_draft: path.relative(draft.root, operational.createdDraft),
    draft_sha256: draft.digest,
    labels: options.labels,
    labels_sha256: actualLabelsSha256,
    parent_issue: parent,
    parent_sha256: parentSha256(parent),
    title: draft.title,
    attempt_started_at: new Date().toISOString(),
  };
  await claimAttempt(operational.attempt, pendingRecord);

  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-issue-create-"));
  const bodyFile = path.join(temporary, "body.md");
  try {
    await writeFile(bodyFile, draft.body, { encoding: "utf8", mode: 0o600 });
    const ghArguments = [
      "issue", "create",
      "--repo", options.repository,
      "--title", draft.title,
      "--body-file", bodyFile,
      ...options.labels.flatMap((label) => ["--label", label]),
      ...(options.parent ? ["--parent", String(options.parent)] : []),
    ];
    const result = gh(ghArguments);
    if (!result.ok) {
      const detail = result.stderr || result.stdout || result.error?.message || `exit ${result.status}`;
      throw new Error(
        `gh issue create failed or had an uncertain outcome: ${detail}. Do not retry automatically; inspect Issues anonymously first.`,
      );
    }
    const escapedRepository = options.repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const issueUrlPattern = new RegExp(`https://github\\.com/${escapedRepository}/issues/\\d+`, "i");
    const issueUrl = result.stdout.match(issueUrlPattern)?.[0] ?? "";
    if (!issueUrl) {
      throw new Error(
        "gh issue create returned success without the expected Issue URL. Treat the remote outcome as unresolved and inspect anonymously before any retry.",
      );
    }
    const issueNumber = Number(issueUrl.match(/\/issues\/(\d+)$/)?.[1]);
    if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
      throw new Error(
        "gh issue create returned an Issue URL with an invalid Issue number. Treat the remote outcome as unresolved and do not retry automatically.",
      );
    }
    let observedCreatedIssue = null;
    let createdIssueReadError = null;
    try {
      observedCreatedIssue = await readCreatedIssue(options.repository, issueNumber);
    } catch (error) {
      createdIssueReadError = error instanceof Error ? error.message : String(error);
    }
    const issueVerification = observedCreatedIssue
      ? {
          status: "verified",
          observed_issue: {
            number: observedCreatedIssue.number,
            url: observedCreatedIssue.url,
          },
        }
      : {
          status: "unresolved",
          detail: createdIssueReadError,
        };
    let labelVerification = {
      status: options.labels.length === 0 ? "not-requested" : "unresolved",
      requested_labels: options.labels,
    };
    if (options.labels.length > 0) {
      if (observedCreatedIssue) {
        const observedSet = new Set(observedCreatedIssue.labels);
        const missing = options.labels.filter((label) => !observedSet.has(label));
        labelVerification = {
          status: missing.length === 0 ? "verified" : "mismatch",
          requested_labels: options.labels,
          observed_labels: observedCreatedIssue.labels,
          missing_labels: missing,
        };
      } else {
        labelVerification = {
          status: "unresolved",
          requested_labels: options.labels,
          detail: createdIssueReadError,
        };
      }
    }
    let parentVerification = {
      status: options.parent ? "unresolved" : "not-requested",
      requested_parent: parent,
    };
    if (options.parent) {
      if (observedCreatedIssue) {
        const expectedParentUrl = `https://github.com/${options.repository}/issues/${options.parent}`;
        const matches = (
          observedCreatedIssue.parent?.number === options.parent
          && observedCreatedIssue.parent?.url === expectedParentUrl
        );
        parentVerification = {
          status: matches ? "verified" : "mismatch",
          requested_parent: parent,
          observed_parent: observedCreatedIssue.parent,
        };
      } else {
        parentVerification = {
          status: "unresolved",
          requested_parent: parent,
          detail: createdIssueReadError,
        };
      }
    }
    const createdRecord = {
      ...pendingRecord,
      status: "created",
      issue_number: issueNumber,
      issue_url: issueUrl,
      issue_verification: issueVerification,
      label_verification: labelVerification,
      parent_verification: parentVerification,
      result_recorded_at: new Date().toISOString(),
    };
    try {
      await replaceAttemptRecord(operational.attempt, createdRecord);
    } catch (error) {
      throw new Error(
        `Issue creation succeeded at ${issueUrl}, but the local created receipt could not be finalized: ${error instanceof Error ? error.message : String(error)}. Do not retry.`,
      );
    }

    let archive = { status: "archived", path: path.relative(draft.root, operational.createdDraft) };
    try {
      await mkdir(operational.createdDirectory, { recursive: true });
      await rename(draft.draft, operational.createdDraft);
      await replaceAttemptRecord(operational.attempt, {
        ...createdRecord,
        archived_draft: path.relative(draft.root, operational.createdDraft),
      });
    } catch (error) {
      archive = {
        status: "warning",
        path: path.relative(draft.root, operational.createdDraft),
        message: error instanceof Error ? error.message : String(error),
      };
    }
    return {
      status: "created",
      ...common,
      issue_url: issueUrl,
      issue_number: issueNumber,
      issue_verification: issueVerification,
      label_verification: labelVerification,
      parent_verification: parentVerification,
      draft_archive: archive,
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
    const result = await runIssueCreate(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}
