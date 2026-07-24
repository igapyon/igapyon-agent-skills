#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const ATTEMPT_STATUSES = new Set(["pending", "updated", "conflict", "unresolved"]);
const VERIFICATION_DELAYS_MS = [0, 250, 1_000];
const MAX_CHANGES = 20;

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/github-issue-label-update.mjs \\
    --repo <owner/repo> --issue <number> \\
    [--add-label <existing-label>]... [--remove-label <existing-label>]...

Apply mode additionally requires --expected-operation-sha256,
--expected-current-labels-sha256, --expected-updated-at, and --apply.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    issueNumber: 0,
    addLabels: [],
    removeLabels: [],
    root: cwd,
    expectedOperationSha256: "",
    expectedCurrentLabelsSha256: "",
    expectedUpdatedAt: "",
    apply: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repository = argv[++index] ?? "";
    else if (arg === "--issue") options.issueNumber = Number(argv[++index] ?? "");
    else if (arg === "--add-label") options.addLabels.push(argv[++index] ?? "");
    else if (arg === "--remove-label") options.removeLabels.push(argv[++index] ?? "");
    else if (arg === "--root") options.root = argv[++index] ?? "";
    else if (arg === "--expected-operation-sha256") {
      options.expectedOperationSha256 = argv[++index] ?? "";
    } else if (arg === "--expected-current-labels-sha256") {
      options.expectedCurrentLabelsSha256 = argv[++index] ?? "";
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
  if (!options.root) throw new Error("--root must not be empty");
  if (options.addLabels.length + options.removeLabels.length === 0) {
    throw new Error("At least one --add-label or --remove-label is required");
  }
  if (options.addLabels.length + options.removeLabels.length > MAX_CHANGES) {
    throw new Error(`At most ${MAX_CHANGES} label changes are allowed`);
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
  if (overlap.length > 0) throw new Error(`Labels cannot be both added and removed: ${overlap.join(", ")}`);
  for (const [name, value] of [
    ["--expected-operation-sha256", options.expectedOperationSha256],
    ["--expected-current-labels-sha256", options.expectedCurrentLabelsSha256],
  ]) {
    if (value && !SHA256_PATTERN.test(value)) throw new Error(`${name} must be a SHA-256 digest`);
  }
  const expected = [
    options.expectedOperationSha256,
    options.expectedCurrentLabelsSha256,
    options.expectedUpdatedAt,
  ];
  if (options.apply && expected.some((value) => !value)) {
    throw new Error("--apply requires all reviewed expected values");
  }
  if (!options.apply && expected.some(Boolean)) {
    throw new Error("expected values are used only with --apply");
  }
  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalLabels(labels) {
  return [...labels].sort((left, right) => left.localeCompare(right, "en"));
}

function labelsSha256(labels) {
  return sha256(JSON.stringify(canonicalLabels(labels)));
}

function operationSha256(options) {
  return sha256(JSON.stringify({
    add: canonicalLabels(options.addLabels),
    remove: canonicalLabels(options.removeLabels),
  }));
}

function targetLabels(current, options) {
  const removed = new Set(options.removeLabels);
  return [
    ...current.filter((label) => !removed.has(label)),
    ...options.addLabels,
  ];
}

function validateExistingLabels(available, options) {
  const availableSet = new Set(available);
  const requested = [...options.addLabels, ...options.removeLabels];
  const missing = requested.filter((label) => !availableSet.has(label));
  if (missing.length > 0) {
    throw new Error(`Requested labels do not exist exactly: ${missing.join(", ")}`);
  }
}

function validateCurrentLabels(current, options) {
  const set = new Set(current);
  const alreadyPresent = options.addLabels.filter((label) => set.has(label));
  const absent = options.removeLabels.filter((label) => !set.has(label));
  if (alreadyPresent.length > 0) {
    throw new Error(`Labels already present cannot be added: ${alreadyPresent.join(", ")}`);
  }
  if (absent.length > 0) {
    throw new Error(`Absent labels cannot be removed: ${absent.join(", ")}`);
  }
}

function requestHeaders(cacheBypass = false) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "igapyon-miku-scm",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (cacheBypass) {
    headers["Cache-Control"] = "no-cache";
    headers.Pragma = "no-cache";
  }
  return headers;
}

export function createAnonymousIssueReader(request = globalThis.fetch) {
  return async (repository, issueNumber, options = {}) => {
    const url = new URL(`https://api.github.com/repos/${repository}/issues/${issueNumber}`);
    if (options.cacheBypass) url.searchParams.set("miku_scm_cache_bust", randomUUID());
    const response = await request(url.href, {
      method: "GET",
      headers: requestHeaders(options.cacheBypass),
      ...(options.cacheBypass ? { cache: "no-store" } : {}),
    });
    if (!response?.ok) throw new Error(`Anonymous Issue GET failed: HTTP ${response?.status}`);
    const issue = await response.json();
    const expectedUrl = `https://github.com/${repository}/issues/${issueNumber}`;
    if (
      issue?.pull_request
      || issue?.number !== issueNumber
      || issue?.html_url !== expectedUrl
      || typeof issue?.title !== "string"
      || !["open", "closed"].includes(issue?.state)
      || typeof issue?.updated_at !== "string"
      || !Array.isArray(issue?.labels)
      || issue.labels.some((label) => typeof label?.name !== "string")
    ) {
      throw new Error("Anonymous response does not identify the requested Issue");
    }
    return {
      number: issue.number,
      url: issue.html_url,
      title: issue.title,
      state: issue.state,
      updatedAt: issue.updated_at,
      labels: issue.labels.map((label) => label.name),
    };
  };
}

export function createAnonymousLabelReader(request = globalThis.fetch) {
  return async (repository) => {
    const labels = [];
    let page = 1;
    while (true) {
      const response = await request(
        `https://api.github.com/repos/${repository}/labels?per_page=100&page=${page}`,
        { method: "GET", headers: requestHeaders() },
      );
      if (!response?.ok) throw new Error(`Anonymous labels GET failed: HTTP ${response?.status}`);
      const entries = await response.json();
      if (!Array.isArray(entries) || entries.some((entry) => typeof entry?.name !== "string")) {
        throw new Error("Anonymous labels response is malformed");
      }
      labels.push(...entries.map((entry) => entry.name));
      if (!/<[^>]+>;\s*rel="next"/.test(response.headers?.get?.("link") ?? "")) return labels;
      page += 1;
    }
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

function operationalPath(root, repository, issueNumber, digest) {
  const [owner, repo] = repository.split("/");
  return path.join(
    root,
    "workplace",
    "miku-scm",
    "issue-label-attempts",
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
  if (!ATTEMPT_STATUSES.has(record?.status)) throw new Error("Unsupported label attempt record");
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
      throw new Error(`This label operation already has a ${existing.status} attempt. Do not retry it.`);
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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function verifyLabels(readIssue, sleep, repository, issueNumber, expected) {
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
      if (labelsSha256(last.labels) === labelsSha256(expected)) {
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

function ghArguments(options) {
  return [
    "issue", "edit", String(options.issueNumber),
    "--repo", options.repository,
    ...options.addLabels.flatMap((label) => ["--add-label", label]),
    ...options.removeLabels.flatMap((label) => ["--remove-label", label]),
  ];
}

function applyArguments(options, operationDigest, current) {
  const args = [
    "--repo", options.repository,
    "--issue", String(options.issueNumber),
    ...options.addLabels.flatMap((label) => ["--add-label", label]),
    ...options.removeLabels.flatMap((label) => ["--remove-label", label]),
    "--expected-operation-sha256", operationDigest,
    "--expected-current-labels-sha256", labelsSha256(current.labels),
    "--expected-updated-at", current.updatedAt,
    "--apply",
  ];
  if (path.resolve(options.root) !== process.cwd()) args.push("--root", path.resolve(options.root));
  return args;
}

export async function runIssueLabelUpdate(options, dependencies = {}) {
  const root = await realpath(path.resolve(options.root));
  const readIssue = dependencies.readIssue ?? createAnonymousIssueReader(dependencies.request);
  const readLabels = dependencies.readLabels ?? createAnonymousLabelReader(dependencies.request);
  const gh = dependencies.gh ?? createGhRunner();
  const sleep = dependencies.sleep ?? wait;
  const digest = operationSha256(options);
  const attempt = operationalPath(root, options.repository, options.issueNumber, digest);
  const prior = await readAttempt(attempt);
  if (prior) throw new Error(`This label operation already has a ${prior.status} attempt. Do not retry it.`);
  const available = await readLabels(options.repository);
  validateExistingLabels(available, options);
  const common = {
    repository: options.repository,
    issue_number: options.issueNumber,
    add_labels: options.addLabels,
    remove_labels: options.removeLabels,
    operation_sha256: digest,
    attempt_record: path.relative(root, attempt),
    planned_gh_arguments: ghArguments(options),
  };

  if (!options.apply) {
    const current = await readIssue(options.repository, options.issueNumber);
    validateCurrentLabels(current.labels, options);
    const target = targetLabels(current.labels, options);
    return {
      status: "preflight-ok",
      ...common,
      issue_url: current.url,
      issue_title: current.title,
      issue_state: current.state,
      current_labels: current.labels,
      current_labels_sha256: labelsSha256(current.labels),
      resulting_labels: target,
      resulting_labels_sha256: labelsSha256(target),
      current_updated_at: current.updatedAt,
      apply_arguments: applyArguments(options, digest, current),
    };
  }
  if (digest !== options.expectedOperationSha256.toLowerCase()) {
    throw new Error("Reviewed label operation changed");
  }
  const pending = {
    schema_version: 1,
    status: "pending",
    repository: options.repository,
    issue_number: options.issueNumber,
    add_labels: options.addLabels,
    remove_labels: options.removeLabels,
    operation_sha256: digest,
    reviewed_current_labels_sha256: options.expectedCurrentLabelsSha256.toLowerCase(),
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
      status: "unresolved",
      stage: "pre-update-read",
      detail: error instanceof Error ? error.message : String(error),
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "unresolved", ...common, ...record };
  }
  if (
    current.updatedAt !== options.expectedUpdatedAt
    || labelsSha256(current.labels) !== options.expectedCurrentLabelsSha256.toLowerCase()
  ) {
    const record = {
      ...pending,
      status: "conflict",
      observed_labels: current.labels,
      observed_labels_sha256: labelsSha256(current.labels),
      observed_updated_at: current.updatedAt,
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "conflict", ...common, issue_url: current.url, ...record };
  }
  validateCurrentLabels(current.labels, options);
  const target = targetLabels(current.labels, options);
  let result;
  try {
    result = gh(ghArguments(options));
  } catch (error) {
    result = { ok: false, error };
  }
  if (!result?.ok) {
    const record = {
      ...pending,
      status: "unresolved",
      stage: "gh-issue-edit-labels",
      detail: result?.stderr || result?.stdout || result?.error?.message || "unknown failure",
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "unresolved", ...common, ...record };
  }
  const verification = await verifyLabels(
    readIssue,
    sleep,
    options.repository,
    options.issueNumber,
    target,
  );
  if (verification.status !== "verified") {
    const record = {
      ...pending,
      status: "unresolved",
      stage: "post-label-verification",
      verification_attempts: verification.attempts,
      observed_labels: verification.issue?.labels,
      detail: verification.error instanceof Error
        ? verification.error.message
        : "resulting labels mismatch",
      result_recorded_at: new Date().toISOString(),
    };
    await replaceAttempt(attempt, record);
    return { status: "unresolved", ...common, ...record };
  }
  const record = {
    ...pending,
    status: "updated",
    issue_url: verification.issue.url,
    verified_labels: verification.issue.labels,
    verified_labels_sha256: labelsSha256(verification.issue.labels),
    verification_attempts: verification.attempts,
    result_recorded_at: new Date().toISOString(),
  };
  await replaceAttempt(attempt, record);
  return { status: "updated", ...common, ...record };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify(await runIssueLabelUpdate(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main();
