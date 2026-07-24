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
const DRAFT_PATTERN = /^issue-(\d+)-comment-\d{12}(?:-\d+)?\.md$/;
const ATTEMPT_STATUSES = new Set(["pending", "commented", "conflict", "unresolved"]);
const VERIFICATION_DELAYS_MS = [0, 250, 1_000];

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/github-issue-comment.mjs \\
    --repo <owner/repo> --issue <number> --draft <path> [--root <root>]

  node skills/igapyon-miku-scm/scripts/github-issue-comment.mjs \\
    --repo <owner/repo> --issue <number> --draft <path> \\
    --expected-draft-sha256 <sha256> --expected-issue-sha256 <sha256> \\
    --expected-updated-at <timestamp> \\
    --apply [--root <root>]`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    issueNumber: 0,
    draft: "",
    root: cwd,
    expectedDraftSha256: "",
    expectedIssueSha256: "",
    expectedUpdatedAt: "",
    apply: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repository = argv[++index] ?? "";
    else if (arg === "--issue") options.issueNumber = Number(argv[++index] ?? "");
    else if (arg === "--draft") options.draft = argv[++index] ?? "";
    else if (arg === "--root") options.root = argv[++index] ?? "";
    else if (arg === "--expected-draft-sha256") {
      options.expectedDraftSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-issue-sha256") {
      options.expectedIssueSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-updated-at") {
      options.expectedUpdatedAt = argv[++index] ?? "";
    } else if (arg === "--apply") options.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
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
  if (options.expectedDraftSha256 && !SHA256_PATTERN.test(options.expectedDraftSha256)) {
    throw new Error("--expected-draft-sha256 must be a SHA-256 digest");
  }
  if (options.expectedIssueSha256 && !SHA256_PATTERN.test(options.expectedIssueSha256)) {
    throw new Error("--expected-issue-sha256 must be a SHA-256 digest");
  }
  if (
    options.apply
    && (!options.expectedDraftSha256 || !options.expectedIssueSha256 || !options.expectedUpdatedAt)
  ) {
    throw new Error("--apply requires all reviewed expected values");
  }
  if (
    !options.apply
    && (options.expectedDraftSha256 || options.expectedIssueSha256 || options.expectedUpdatedAt)
  ) {
    throw new Error("expected values are used only with --apply");
  }
  return options;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function issueSha256(issue) {
  return sha256(JSON.stringify({
    url: issue.url,
    title: issue.title,
    state: issue.state,
    updated_at: issue.updatedAt,
  }));
}

async function resolveDraft(options) {
  const root = await realpath(path.resolve(options.root));
  const draft = await realpath(path.resolve(root, options.draft));
  const directory = path.join(root, "workplace", "miku-scm", "issue-comments");
  const relative = path.relative(directory, draft);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new Error("--draft must name one file directly under workplace/miku-scm/issue-comments");
  }
  const match = relative.match(DRAFT_PATTERN);
  if (!match || Number(match[1]) !== options.issueNumber) {
    throw new Error("Comment draft filename must identify the exact --issue");
  }
  const body = await readFile(draft, "utf8");
  if (body.includes("\r")) throw new Error("Comment draft must use LF line endings");
  if (!body.trim()) throw new Error("Comment draft must not be empty");
  return {
    root,
    draft,
    relativeDraft: path.relative(root, draft),
    body,
    digest: sha256(body),
  };
}

function attemptPath(draft, repository, issueNumber) {
  const [owner, repo] = repository.split("/");
  return path.join(
    draft.root,
    "workplace",
    "miku-scm",
    "issue-comment-attempts",
    owner,
    repo,
    String(issueNumber),
    `${draft.digest}.json`,
  );
}

async function readAttempt(file) {
  let content;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  let record;
  try {
    record = JSON.parse(content);
  } catch {
    throw new Error(`Issue comment attempt record is unreadable: ${file}`);
  }
  if (!ATTEMPT_STATUSES.has(record?.status)) {
    throw new Error(`Issue comment attempt record has an unsupported status: ${file}`);
  }
  return record;
}

function priorAttemptError(record) {
  return new Error(
    `This comment draft already has a ${record.status} attempt for ${record.repository}#${record.issue_number}. Do not retry it.`,
  );
}

async function claimAttempt(file, record) {
  await mkdir(path.dirname(file), { recursive: true });
  let handle;
  try {
    handle = await open(file, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    if (error?.code === "EEXIST") throw priorAttemptError(await readAttempt(file));
    throw error;
  } finally {
    await handle?.close();
  }
}

async function replaceAttempt(file, record) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

function requestHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "igapyon-miku-scm",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function createAnonymousIssueReader(request = globalThis.fetch) {
  return async (repository, issueNumber) => {
    const response = await request(
      `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
      { method: "GET", headers: requestHeaders() },
    );
    if (!response?.ok) throw new Error(`Anonymous Issue GET failed: HTTP ${response?.status}`);
    const issue = await response.json();
    const url = `https://github.com/${repository}/issues/${issueNumber}`;
    if (
      issue?.pull_request
      || issue?.number !== issueNumber
      || issue?.html_url !== url
      || typeof issue?.title !== "string"
      || !["open", "closed"].includes(issue?.state)
      || typeof issue?.updated_at !== "string"
      || !issue.updated_at
    ) {
      throw new Error("Anonymous response does not identify the requested Issue");
    }
    return {
      number: issue.number,
      url: issue.html_url,
      title: issue.title,
      state: issue.state,
      updatedAt: issue.updated_at,
    };
  };
}

export function createAnonymousCommentReader(request = globalThis.fetch) {
  return async (repository, issueNumber, commentId, options = {}) => {
    const url = new URL(`https://api.github.com/repos/${repository}/issues/comments/${commentId}`);
    if (options.cacheBypass) url.searchParams.set("miku_scm_cache_bust", randomUUID());
    const headers = requestHeaders();
    if (options.cacheBypass) {
      headers["Cache-Control"] = "no-cache";
      headers.Pragma = "no-cache";
    }
    const response = await request(url.href, {
      method: "GET",
      headers,
      ...(options.cacheBypass ? { cache: "no-store" } : {}),
    });
    if (!response?.ok) throw new Error(`Anonymous comment GET failed: HTTP ${response?.status}`);
    const comment = await response.json();
    const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}#issuecomment-${commentId}`;
    if (
      comment?.id !== commentId
      || comment?.html_url !== expectedUrl
      || typeof comment?.body !== "string"
    ) {
      throw new Error("Anonymous response does not identify the requested Issue comment");
    }
    return { id: comment.id, url: comment.html_url, body: comment.body };
  };
}

export function createGhRunner() {
  return (args) => {
    const result = spawnSync("gh", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: (result.stdout || "").trim(),
      stderr: (result.stderr || "").trim(),
      error: result.error,
    };
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function verifyComment(readComment, sleep, repository, issueNumber, commentId, body) {
  let lastError;
  let lastComment;
  for (let index = 0; index < VERIFICATION_DELAYS_MS.length; index += 1) {
    if (VERIFICATION_DELAYS_MS[index] > 0) await sleep(VERIFICATION_DELAYS_MS[index]);
    try {
      lastComment = await readComment(repository, issueNumber, commentId, {
        cacheBypass: true,
        verificationAttempt: index + 1,
      });
      lastError = undefined;
      if (lastComment.body === body) {
        return { status: "verified", comment: lastComment, attempts: index + 1 };
      }
    } catch (error) {
      lastError = error;
    }
  }
  return {
    status: lastComment ? "mismatch" : "read-error",
    comment: lastComment,
    error: lastError,
    attempts: VERIFICATION_DELAYS_MS.length,
  };
}

function applyArguments(options, draft, issue) {
  const args = [
    "--repo", options.repository,
    "--issue", String(options.issueNumber),
    "--draft", draft.relativeDraft,
    "--expected-draft-sha256", draft.digest,
    "--expected-issue-sha256", issueSha256(issue),
    "--expected-updated-at", issue.updatedAt,
    "--apply",
  ];
  if (path.resolve(options.root) !== process.cwd()) args.push("--root", draft.root);
  return args;
}

export async function runIssueComment(options, dependencies = {}) {
  const readIssue = dependencies.readIssue ?? createAnonymousIssueReader(dependencies.request);
  const readComment = dependencies.readComment ?? createAnonymousCommentReader(dependencies.request);
  const gh = dependencies.gh ?? createGhRunner();
  const sleep = dependencies.sleep ?? wait;
  const draft = await resolveDraft(options);
  const attempt = attemptPath(draft, options.repository, options.issueNumber);
  const prior = await readAttempt(attempt);
  if (prior) throw priorAttemptError(prior);
  const common = {
    repository: options.repository,
    issue_number: options.issueNumber,
    draft: draft.relativeDraft,
    draft_sha256: draft.digest,
    comment_body: draft.body,
    attempt_record: path.relative(draft.root, attempt),
    planned_gh_arguments: [
      "issue", "comment", String(options.issueNumber),
      "--repo", options.repository,
      "--body-file", "<generated-temporary-body-file>",
    ],
  };

  if (!options.apply) {
    const issue = await readIssue(options.repository, options.issueNumber);
    return {
      status: "preflight-ok",
      ...common,
      issue_url: issue.url,
      issue_title: issue.title,
      issue_state: issue.state,
      current_issue_sha256: issueSha256(issue),
      current_updated_at: issue.updatedAt,
      apply_arguments: applyArguments(options, draft, issue),
    };
  }
  if (draft.digest !== options.expectedDraftSha256.toLowerCase()) {
    throw new Error("Reviewed comment draft changed");
  }
  const pending = {
    schema_version: 1,
    status: "pending",
    repository: options.repository,
    issue_number: options.issueNumber,
    source_draft: draft.relativeDraft,
    draft_sha256: draft.digest,
    reviewed_issue_sha256: options.expectedIssueSha256.toLowerCase(),
    reviewed_updated_at: options.expectedUpdatedAt,
    attempt_started_at: new Date().toISOString(),
  };
  await claimAttempt(attempt, pending);

  let issue;
  try {
    issue = await readIssue(options.repository, options.issueNumber);
  } catch (error) {
    const record = {
      ...pending,
      status: "unresolved",
      stage: "pre-comment-read",
      detail: error instanceof Error ? error.message : String(error),
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "unresolved", ...common, stage: record.stage, detail: record.detail };
  }
  if (
    issue.updatedAt !== options.expectedUpdatedAt
    || issueSha256(issue) !== options.expectedIssueSha256.toLowerCase()
  ) {
    const record = {
      ...pending,
      status: "conflict",
      observed_issue_sha256: issueSha256(issue),
      observed_updated_at: issue.updatedAt,
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "conflict", ...common, issue_url: issue.url, ...record };
  }

  const temporary = await mkdtemp(path.join(os.tmpdir(), "miku-scm-issue-comment-"));
  const bodyFile = path.join(temporary, "comment.md");
  try {
    await writeFile(bodyFile, draft.body, { encoding: "utf8", mode: 0o600 });
    let result;
    try {
      result = gh([
        "issue", "comment", String(options.issueNumber),
        "--repo", options.repository,
        "--body-file", bodyFile,
      ]);
    } catch (error) {
      result = { ok: false, error };
    }
    if (!result?.ok) {
      const detail = result?.stderr || result?.stdout || result?.error?.message || "unknown failure";
      const record = {
        ...pending,
        status: "unresolved",
        stage: "gh-issue-comment",
        detail,
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttempt(attempt, record);
      return { status: "unresolved", ...common, stage: record.stage, detail };
    }
    const escaped = options.repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `https://github\\.com/${escaped}/issues/${options.issueNumber}#issuecomment-(\\d+)`,
      "i",
    );
    const match = result.stdout?.match(pattern);
    if (!match) {
      const record = {
        ...pending,
        status: "unresolved",
        stage: "comment-url",
        detail: "gh returned no exact Issue comment URL",
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttempt(attempt, record);
      return { status: "unresolved", ...common, stage: record.stage, detail: record.detail };
    }
    const commentId = Number(match[1]);
    const verification = await verifyComment(
      readComment,
      sleep,
      options.repository,
      options.issueNumber,
      commentId,
      draft.body,
    );
    if (verification.status !== "verified") {
      const record = {
        ...pending,
        status: "unresolved",
        stage: "post-comment-verification",
        comment_id: commentId,
        comment_url: match[0],
        verification_attempts: verification.attempts,
        detail: verification.error instanceof Error
          ? verification.error.message
          : "comment body mismatch",
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttempt(attempt, record);
      return { status: "unresolved", ...common, ...record };
    }
    const record = {
      ...pending,
      status: "commented",
      issue_url: issue.url,
      comment_id: commentId,
      comment_url: verification.comment.url,
      verified_body_sha256: sha256(verification.comment.body),
      verification_attempts: verification.attempts,
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "commented", ...common, ...record };
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
    process.stdout.write(`${JSON.stringify(await runIssueComment(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main();
