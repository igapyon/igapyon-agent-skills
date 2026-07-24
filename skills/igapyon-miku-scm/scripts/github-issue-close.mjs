#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const REASONS = new Set(["completed", "not planned", "duplicate"]);
const ATTEMPT_STATUSES = new Set(["pending", "closed", "conflict", "not-applied", "unresolved"]);
const VERIFICATION_DELAYS_MS = [0, 250, 1_000];

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/github-issue-close.mjs \\
    --repo <owner/repo> --issue <number> --reason <completed|not planned|duplicate> \\
    [--duplicate-of <number>] [--root <root>]

Apply mode additionally requires --expected-operation-sha256,
--expected-current-body-sha256, --expected-updated-at, and --apply.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    issueNumber: 0,
    reason: "",
    duplicateOf: 0,
    root: cwd,
    expectedOperationSha256: "",
    expectedCurrentBodySha256: "",
    expectedDuplicateSha256: "",
    expectedUpdatedAt: "",
    apply: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repository = argv[++index] ?? "";
    else if (arg === "--issue") options.issueNumber = Number(argv[++index] ?? "");
    else if (arg === "--reason") options.reason = argv[++index] ?? "";
    else if (arg === "--duplicate-of") options.duplicateOf = Number(argv[++index] ?? "");
    else if (arg === "--root") options.root = argv[++index] ?? "";
    else if (arg === "--expected-operation-sha256") {
      options.expectedOperationSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-current-body-sha256") {
      options.expectedCurrentBodySha256 = argv[++index] ?? "";
    } else if (arg === "--expected-duplicate-sha256") {
      options.expectedDuplicateSha256 = argv[++index] ?? "";
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
  if (!REASONS.has(options.reason)) {
    throw new Error("--reason must be completed, not planned, or duplicate");
  }
  if (options.reason === "duplicate") {
    if (!Number.isSafeInteger(options.duplicateOf) || options.duplicateOf < 1) {
      throw new Error("duplicate reason requires --duplicate-of");
    }
    if (options.duplicateOf === options.issueNumber) {
      throw new Error("An Issue cannot be a duplicate of itself");
    }
  } else if (options.duplicateOf) {
    throw new Error("--duplicate-of is allowed only with duplicate reason");
  }
  if (!options.root) throw new Error("--root must not be empty");
  for (const [name, value] of [
    ["--expected-operation-sha256", options.expectedOperationSha256],
    ["--expected-current-body-sha256", options.expectedCurrentBodySha256],
    ["--expected-duplicate-sha256", options.expectedDuplicateSha256],
  ]) {
    if (value && !SHA256_PATTERN.test(value)) throw new Error(`${name} must be a SHA-256 digest`);
  }
  const expected = [
    options.expectedOperationSha256,
    options.expectedCurrentBodySha256,
    options.expectedUpdatedAt,
  ];
  if (options.apply && expected.some((value) => !value)) {
    throw new Error("--apply requires all reviewed expected values");
  }
  if (options.apply && options.reason === "duplicate" && !options.expectedDuplicateSha256) {
    throw new Error("duplicate apply requires --expected-duplicate-sha256");
  }
  if (options.reason !== "duplicate" && options.expectedDuplicateSha256) {
    throw new Error("--expected-duplicate-sha256 is used only for duplicate");
  }
  if (!options.apply && (expected.some(Boolean) || options.expectedDuplicateSha256)) {
    throw new Error("expected values are used only with --apply");
  }
  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function operationSha256(options) {
  return sha256(JSON.stringify({
    reason: options.reason,
    duplicate_of: options.duplicateOf || null,
  }));
}

function expectedStateReason(reason) {
  return reason.replaceAll(" ", "_").toUpperCase();
}

function issueSnapshotSha256(issue) {
  return sha256(JSON.stringify({
    url: issue.url,
    title: issue.title,
    body_sha256: sha256(issue.body),
    state: issue.state,
    state_reason: issue.stateReason,
    updated_at: issue.updatedAt,
  }));
}

function ghDetail(result) { return result?.stderr || result?.stdout || result?.error?.message || `exit ${result?.status}`; }

export function createGhIssueReader(gh = createGhRunner()) {
  return async (repository, issueNumber) => {
    const result = gh(["issue", "view", String(issueNumber), "--repo", repository,
      "--json", "number,url,title,body,state,stateReason,updatedAt"]);
    if (!result?.ok) throw new Error(`gh issue view failed: ${ghDetail(result)}`);
    let issue;
    try { issue = JSON.parse(result.stdout); } catch { throw new Error("gh issue view returned malformed JSON"); }
    const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}`;
    if (
      issue?.number !== issueNumber || issue?.url !== expectedUrl
      || typeof issue?.title !== "string"
      || (typeof issue?.body !== "string" && issue?.body !== null)
      || !["OPEN", "CLOSED"].includes(issue?.state)
      || typeof issue?.updatedAt !== "string" || !issue.updatedAt
      || (typeof issue?.stateReason !== "string" && issue?.stateReason !== null)
    ) {
      throw new Error("gh issue view does not exactly identify the requested Issue");
    }
    return {
      number: issue.number, url: issue.url, title: issue.title, body: issue.body ?? "",
      state: issue.state, stateReason: issue.stateReason, updatedAt: issue.updatedAt,
    };
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

function attemptPath(root, repository, issueNumber, digest) {
  const [owner, repo] = repository.split("/");
  return path.join(
    root,
    "workplace",
    "miku-scm",
    "issue-close-attempts",
    owner,
    repo,
    String(issueNumber),
    `${digest}.json`,
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
  const record = JSON.parse(content);
  if (!ATTEMPT_STATUSES.has(record?.status)) throw new Error("Unsupported close attempt record");
  return record;
}

async function claimAttempt(file, record) {
  await mkdir(path.dirname(file), { recursive: true });
  let handle;
  try {
    handle = await open(file, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    if (error?.code === "EEXIST") {
      const existing = await readAttempt(file);
      throw new Error(`This close operation already has a ${existing.status} attempt. Do not retry it.`);
    }
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

function ghArguments(options) {
  return [
    "issue", "close", String(options.issueNumber),
    "--repo", options.repository,
    "--reason", options.reason,
    ...(options.reason === "duplicate" ? ["--duplicate-of", String(options.duplicateOf)] : []),
  ];
}

function applyArguments(options, digest, current, duplicate) {
  const args = [
    "--repo", options.repository,
    "--issue", String(options.issueNumber),
    "--reason", options.reason,
    ...(options.reason === "duplicate" ? ["--duplicate-of", String(options.duplicateOf)] : []),
    "--expected-operation-sha256", digest,
    "--expected-current-body-sha256", sha256(current.body),
    ...(duplicate ? ["--expected-duplicate-sha256", issueSnapshotSha256(duplicate)] : []),
    "--expected-updated-at", current.updatedAt,
    "--apply",
  ];
  if (path.resolve(options.root) !== process.cwd()) args.push("--root", path.resolve(options.root));
  return args;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function verifyClosed(readIssue, sleep, repository, issueNumber, reason) {
  let last;
  let error;
  for (let index = 0; index < VERIFICATION_DELAYS_MS.length; index += 1) {
    if (VERIFICATION_DELAYS_MS[index] > 0) await sleep(VERIFICATION_DELAYS_MS[index]);
    try {
      last = await readIssue(repository, issueNumber, {
        cacheBypass: true,
        verificationAttempt: index + 1,
      });
      error = undefined;
      if (last.state === "CLOSED" && last.stateReason === expectedStateReason(reason)) {
        return { status: "verified", issue: last, attempts: index + 1 };
      }
    } catch (caught) {
      error = caught;
    }
  }
  return {
    status: last ? "mismatch" : "read-error",
    issue: last,
    error,
    attempts: VERIFICATION_DELAYS_MS.length,
  };
}

export async function runIssueClose(options, dependencies = {}) {
  const root = await realpath(path.resolve(options.root));
  const ghRead = dependencies.ghRead ?? createGhRunner();
  const ghMutation = dependencies.ghMutation ?? dependencies.gh ?? createGhRunner();
  const readIssue = dependencies.readIssue ?? createGhIssueReader(ghRead);
  const sleep = dependencies.sleep ?? wait;
  const digest = operationSha256(options);
  const attempt = attemptPath(root, options.repository, options.issueNumber, digest);
  const prior = await readAttempt(attempt);
  if (prior) throw new Error(`This close operation already has a ${prior.status} attempt. Do not retry it.`);
  const common = {
    repository: options.repository,
    issue_number: options.issueNumber,
    reason: options.reason,
    duplicate_of: options.duplicateOf || null,
    operation_sha256: digest,
    attempt_record: path.relative(root, attempt),
    planned_gh_arguments: ghArguments(options),
  };

  if (!options.apply) {
    const current = await readIssue(options.repository, options.issueNumber);
    if (current.state !== "OPEN") throw new Error("Only an Open Issue can be closed");
    let duplicate;
    if (options.reason === "duplicate") {
      duplicate = await readIssue(options.repository, options.duplicateOf);
    }
    return {
      status: "preflight-ok",
      ...common,
      issue_url: current.url,
      issue_title: current.title,
      current_body: current.body,
      current_body_sha256: sha256(current.body),
      current_state: current.state,
      current_updated_at: current.updatedAt,
      duplicate_target: duplicate
        ? {
          number: duplicate.number,
          url: duplicate.url,
          title: duplicate.title,
          state: duplicate.state,
          snapshot_sha256: issueSnapshotSha256(duplicate),
        }
        : null,
      apply_arguments: applyArguments(options, digest, current, duplicate),
    };
  }
  if (digest !== options.expectedOperationSha256.toLowerCase()) {
    throw new Error("Reviewed close operation changed");
  }
  const pending = {
    schema_version: 1,
    status: "pending",
    repository: options.repository,
    issue_number: options.issueNumber,
    reason: options.reason,
    duplicate_of: options.duplicateOf || null,
    operation_sha256: digest,
    reviewed_current_body_sha256: options.expectedCurrentBodySha256.toLowerCase(),
    reviewed_duplicate_sha256: options.expectedDuplicateSha256
      ? options.expectedDuplicateSha256.toLowerCase()
      : null,
    reviewed_updated_at: options.expectedUpdatedAt,
    attempt_started_at: new Date().toISOString(),
  };
  await claimAttempt(attempt, pending);
  let current;
  try {
    current = await readIssue(options.repository, options.issueNumber);
  } catch (error) {
    const record = {
      ...pending,
      status: "not-applied",
      stage: "pre-close-read",
      detail: error instanceof Error ? error.message : String(error),
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "not-applied", ...common, ...record };
  }
  if (
    current.state !== "OPEN"
    || current.updatedAt !== options.expectedUpdatedAt
    || sha256(current.body) !== options.expectedCurrentBodySha256.toLowerCase()
  ) {
    const record = {
      ...pending,
      status: "conflict",
      observed_state: current.state,
      observed_body_sha256: sha256(current.body),
      observed_updated_at: current.updatedAt,
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "conflict", ...common, issue_url: current.url, ...record };
  }
  if (options.reason === "duplicate") {
    let duplicate;
    try {
      duplicate = await readIssue(options.repository, options.duplicateOf);
    } catch (error) {
      const record = {
        ...pending,
        status: "not-applied",
        stage: "duplicate-target-read",
        detail: error instanceof Error ? error.message : String(error),
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttempt(attempt, record);
      return { status: "not-applied", ...common, ...record };
    }
    const observedDuplicateSha256 = issueSnapshotSha256(duplicate);
    if (observedDuplicateSha256 !== options.expectedDuplicateSha256.toLowerCase()) {
      const record = {
        ...pending,
        status: "conflict",
        stage: "duplicate-target-conflict",
        observed_duplicate_sha256: observedDuplicateSha256,
        result_recorded_at: new Date().toISOString(),
      };
      await replaceAttempt(attempt, record);
      return { status: "conflict", ...common, ...record };
    }
  }
  let result;
  try {
    result = ghMutation(ghArguments(options));
  } catch (error) {
    result = { ok: false, error };
  }
  if (!result?.ok) {
    const record = {
      ...pending,
      status: "unresolved",
      stage: "gh-issue-close",
      detail: result?.stderr || result?.stdout || result?.error?.message || "unknown failure",
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "unresolved", ...common, ...record };
  }
  const verification = await verifyClosed(
    readIssue,
    sleep,
    options.repository,
    options.issueNumber,
    options.reason,
  );
  if (verification.status !== "verified") {
    const record = {
      ...pending,
      status: "unresolved",
      stage: "post-close-verification",
      verification_attempts: verification.attempts,
      observed_state: verification.issue?.state,
      observed_state_reason: verification.issue?.stateReason,
      detail: verification.error instanceof Error
        ? verification.error.message
        : "closed state or reason mismatch",
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "unresolved", ...common, ...record };
  }
  const record = {
    ...pending,
    status: "closed",
    issue_url: verification.issue.url,
    verified_state: verification.issue.state,
    verified_state_reason: verification.issue.stateReason,
    verification_attempts: verification.attempts,
    result_recorded_at: new Date().toISOString(),
  };
  await replaceAttempt(attempt, record);
  return { status: "closed", ...common, ...record };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify(await runIssueClose(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main();
