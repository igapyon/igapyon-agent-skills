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

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \\
    --repo <owner/repo> --draft <path> [--root <repository-root>]

  node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \\
    --repo <owner/repo> --draft <path> \\
    --expected-draft-sha256 <reviewed-sha256> --apply \\
    [--root <repository-root>]

Default mode is a read-only preflight. Apply mode requires the reviewed
draft digest and invokes exactly one non-interactive gh issue create command.
It persists a pending attempt before the request, archives confirmed drafts,
and never authenticates, changes scopes, edits an Issue, or retries.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repository: "",
    draft: "",
    root: cwd,
    expectedDraftSha256: "",
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
    } else if (arg === "--expected-draft-sha256") {
      options.expectedDraftSha256 = argv[++index] ?? "";
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
  if (options.expectedDraftSha256 && !SHA256_PATTERN.test(options.expectedDraftSha256)) {
    throw new Error("--expected-draft-sha256 must be a 64-character hexadecimal SHA-256 digest");
  }
  if (options.apply && !options.expectedDraftSha256) {
    throw new Error("--apply requires --expected-draft-sha256 from the reviewed preflight");
  }
  if (!options.apply && options.expectedDraftSha256) {
    throw new Error("--expected-draft-sha256 is used only with --apply");
  }
  return options;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
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

function applyArguments(options, draft) {
  const args = [
    "--repo", options.repository,
    "--draft", draft.relativeDraft,
    "--expected-draft-sha256", draft.digest,
    "--apply",
  ];
  if (path.resolve(options.root) !== process.cwd()) {
    args.push("--root", draft.root);
  }
  return args;
}

export async function runIssueCreate(options, dependencies = {}) {
  const gh = dependencies.gh ?? createGhRunner();
  const draft = await resolveDraft(options);
  const operational = issueOperationalPaths(draft, options.repository);
  const priorAttempt = await readAttemptRecord(operational.attempt);
  if (priorAttempt) throw priorAttemptError(priorAttempt);
  if (await pathExists(operational.createdDraft)) {
    throw new Error(`Created-Issue draft destination already exists: ${operational.createdDraft}`);
  }
  const plannedGhArguments = [
    "issue", "create",
    "--repo", options.repository,
    "--title", draft.title,
    "--body-file", "<generated-temporary-body-file>",
  ];

  const common = {
    repository: options.repository,
    draft: draft.relativeDraft,
    draft_sha256: draft.digest,
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
      apply_arguments: applyArguments(options, draft),
    };
  }

  if (draft.digest !== options.expectedDraftSha256.toLowerCase()) {
    throw new Error(
      `Reviewed draft changed: expected ${options.expectedDraftSha256.toLowerCase()}, actual ${draft.digest}`,
    );
  }

  const pendingRecord = {
    schema_version: 1,
    status: "pending",
    repository: options.repository,
    source_draft: draft.relativeDraft,
    planned_created_draft: path.relative(draft.root, operational.createdDraft),
    draft_sha256: draft.digest,
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
    const createdRecord = {
      ...pendingRecord,
      status: "created",
      issue_number: issueNumber,
      issue_url: issueUrl,
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
