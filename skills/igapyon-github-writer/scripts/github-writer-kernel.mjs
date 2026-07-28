import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  WORKFLOW_MANIFEST_VERSION,
  workflowById,
} from "./github-writer-workflow-manifest.mjs";

export const RESULT_SCHEMA_VERSION = "github-writer.runner-result/v1";
export const EVIDENCE_SCHEMA_VERSION = "github-writer.evidence/v1";
export const PLAN_SCHEMA_VERSION = "github-writer.plan/v1";
export const ERROR_SCHEMA_VERSION = "github-writer.error/v1";

const MAX_PATCH_CHARS = 120_000;
const MAX_DOCUMENT_CHARS = 40_000;
const MAX_COMMITS = 200;
const TARGET_PATTERN = /^[^\s\u0000-\u001f\u007f]{1,240}$/;
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]{1,240}$/;
const SHA_PATTERN = /^[0-9a-f]{40,64}$/i;
const PLAN_PATH_PATTERN = /^(?:workplace|temp)\/github-writer\/plans\/[A-Za-z0-9._-]+\.json$/;

class MutationFailure extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "MutationFailure";
    this.mutationInvoked = true;
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalText(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

export function normalizeResultPath(value) {
  return String(value).replaceAll("\\", "/");
}

export function isPathInside(root, candidate, platform = process.platform) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const normalizeCase = (value) => (
    platform === "win32" ? value.toLowerCase() : value
  );
  const relative = pathApi.relative(
    normalizeCase(pathApi.resolve(root)),
    normalizeCase(pathApi.resolve(candidate)),
  );
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${pathApi.sep}`)
    && !pathApi.isAbsolute(relative)
  );
}

function redactSensitiveLines(value) {
  return canonicalText(value).split("\n").map((line) => (
    /(?:token|password|secret|api[_-]?key|authorization)\s*[:=]/i.test(line)
      ? "[redacted-sensitive-line]"
      : line
  )).join("\n");
}

function boundedText(value, limit) {
  const redacted = redactSensitiveLines(value);
  if (redacted.length <= limit) return { text: redacted, truncated: false };
  return {
    text: `${redacted.slice(0, limit)}\n[truncated]\n`,
    truncated: true,
  };
}

function formatJst(now, withSeparators = false) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (withSeparators) {
    return `${values.year}-${values.month}-${values.day}-${values.hour}${values.minute}`;
  }
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}`;
}

function branchSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function defaultGit(cwd, args, { allowFailure = false, input = undefined } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    input,
    maxBuffer: 24 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || "unknown failure").trim();
    throw new Error(`git ${args[0]} failed: ${detail}`);
  }
  return {
    ok: result.status === 0,
    status: result.status,
    out: canonicalText(result.stdout || "").trimEnd(),
    err: canonicalText(result.stderr || "").trimEnd(),
  };
}

function repositoryIdentity(repo, git) {
  const root = realpathSync(git(repo, ["rev-parse", "--show-toplevel"]).out);
  const branch = git(root, ["branch", "--show-current"], { allowFailure: true }).out;
  const head = git(root, ["rev-parse", "HEAD"]).out;
  const status = git(root, ["status", "--porcelain=v1"]).out;
  return {
    root,
    repository: path.basename(root),
    branch,
    head,
    dirty: Boolean(status),
    status_porcelain: status,
  };
}

function validateTarget(target) {
  if (!TARGET_PATTERN.test(target) || target.startsWith("-")) {
    throw new Error("Git target must be a bounded ref, commit, or range");
  }
  return target;
}

function emptyTree(root, git) {
  return git(root, ["hash-object", "-t", "tree", "--stdin"], { input: "" }).out;
}

function resolveSingleCommit(root, target, git) {
  const commit = git(root, ["rev-parse", "--verify", `${target}^{commit}`]).out;
  const parent = git(root, ["rev-parse", "--verify", `${commit}^`], { allowFailure: true });
  const commitRange = parent.ok ? `${parent.out}..${commit}` : commit;
  return {
    requested: target,
    log_target: commitRange,
    diff_target: parent.ok ? commitRange : `${emptyTree(root, git)}..${commit}`,
    resolution: "single-commit",
    single_commit: true,
    root_commit: !parent.ok,
  };
}

function resolveEvidenceTarget(root, mode, requested, git) {
  if (mode === "pr" && !requested) {
    const head = git(root, ["rev-parse", "HEAD"]).out;
    return {
      ...resolveSingleCommit(root, head, git),
      requested: "",
      resolution: "default-latest-single-commit",
    };
  }
  if (mode === "release" && !requested) {
    throw new Error("release.evidence requires --target");
  }
  const target = validateTarget(requested);
  if (target.includes("..")) {
    git(root, ["rev-list", "--max-count=1", target]);
    return {
      requested: target,
      log_target: target,
      diff_target: target,
      resolution: "explicit-range",
      single_commit: false,
      root_commit: false,
    };
  }
  if (mode === "release") {
    const commit = git(root, ["rev-parse", "--verify", `${target}^{commit}`]).out;
    const parent = git(root, ["rev-parse", "--verify", `${commit}^`], { allowFailure: true });
    return {
      requested: target,
      log_target: parent.ok ? `${parent.out}..HEAD` : "HEAD",
      diff_target: parent.ok ? `${parent.out}..HEAD` : `${emptyTree(root, git)}..HEAD`,
      resolution: "release-start-through-head",
      single_commit: false,
      root_commit: !parent.ok,
    };
  }
  return resolveSingleCommit(root, target, git);
}

function parseCommits(text) {
  if (!text) return [];
  return text.split("\n").filter(Boolean).slice(0, MAX_COMMITS).map((line) => {
    const tab = line.indexOf("\t");
    return tab === -1
      ? { commit: line, subject: "" }
      : { commit: line.slice(0, tab), subject: line.slice(tab + 1) };
  });
}

export function prepareGitEvidence(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  const target = resolveEvidenceTarget(identity.root, options.mode, options.target, git);
  const log = git(identity.root, [
    "log", "--format=%H%x09%s", "--max-count", String(MAX_COMMITS + 1), target.log_target, "--",
  ]).out;
  const commits = parseCommits(log);
  const diffStat = git(identity.root, [
    "-c", "core.quotePath=false", "diff", "--stat", "--no-renames", target.diff_target, "--",
  ]).out;
  const changedFiles = git(identity.root, [
    "-c", "core.quotePath=false", "diff", "--name-status", "--no-renames", target.diff_target, "--",
  ]).out.split("\n").filter(Boolean);
  const patch = boundedText(git(identity.root, [
    "-c", "core.quotePath=false", "diff", "--no-ext-diff", "--no-renames",
    "--unified=1", target.diff_target, "--",
  ]).out, MAX_PATCH_CHARS);
  const result = {
    schema_version: EVIDENCE_SCHEMA_VERSION,
    mode: options.mode,
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    dirty: identity.dirty,
    platform: process.platform,
    target,
    commit_count: commits.length,
    commits,
    commits_truncated: log.split("\n").filter(Boolean).length > MAX_COMMITS,
    diff_stat: diffStat,
    changed_files: changedFiles,
    patch_excerpt: patch.text,
    patch_truncated: patch.truncated,
    writing_contract: {
      generation_passes: 1,
      source_rule: "Use only this bounded evidence and the current user direction",
      unsupported_claims: "Omit or mark unverified",
    },
  };
  return { ...result, evidence_sha256: sha256(JSON.stringify(result)) };
}

function readBoundedDocument(root, requested) {
  const absolute = realpathSync(path.resolve(root, requested));
  if (!isPathInside(root, absolute)) throw new Error(`Document escapes repository: ${requested}`);
  const stat = statSync(absolute);
  if (!stat.isFile()) throw new Error(`Document is not a file: ${requested}`);
  const content = boundedText(readFileSync(absolute, "utf8"), MAX_DOCUMENT_CHARS);
  return {
    path: normalizeResultPath(path.relative(root, absolute)),
    text: content.text,
    truncated: content.truncated,
  };
}

export function prepareAboutEvidence(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  const requested = options.documents.length > 0
    ? options.documents
    : ["README.md", "package.json", "pom.xml"].filter((entry) => (
      existsSync(path.join(identity.root, entry))
    ));
  if (requested.length === 0) throw new Error("No About evidence documents were found");
  const documents = requested.map((entry) => readBoundedDocument(identity.root, entry));
  const result = {
    schema_version: EVIDENCE_SCHEMA_VERSION,
    mode: "about",
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    dirty: identity.dirty,
    platform: process.platform,
    documents,
    documents_truncated: documents.some((document) => document.truncated),
    writing_contract: {
      generation_passes: 1,
      source_rule: "Use only these bounded documents and the current user direction",
      unsupported_claims: "Omit or mark unverified",
    },
  };
  return { ...result, evidence_sha256: sha256(JSON.stringify(result)) };
}

function tagList(root, pattern, git) {
  return git(root, [
    "tag", "--list", pattern, "--sort=-creatordate",
    "--format=%(creatordate:iso8601-strict)%09%(refname:short)",
  ], { allowFailure: true }).out.split("\n").filter(Boolean).slice(0, 3);
}

export function branchStatus(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  const status = git(identity.root, ["status", "-sb"]).out;
  const upstreamResult = git(identity.root, [
    "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}",
  ], { allowFailure: true });
  const upstream = upstreamResult.ok ? upstreamResult.out : "";
  const counts = upstream
    ? git(identity.root, ["rev-list", "--left-right", "--count", `${upstream}...HEAD`]).out
    : "";
  const [behind = null, ahead = null] = counts
    ? counts.split(/\s+/).map((value) => Number(value))
    : [null, null];
  return {
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    upstream: upstream || null,
    ahead,
    behind,
    dirty: identity.dirty,
    status,
    recent_commits: git(identity.root, [
      "log", "--oneline", "--decorate", "--max-count=20",
    ]).out.split("\n").filter(Boolean),
    tags: {
      operational: tagList(identity.root, "tag*", git),
      version: tagList(identity.root, "v*", git),
    },
    platform: process.platform,
  };
}

function safeRelativeExisting(root, requested, kind) {
  const absolute = realpathSync(path.resolve(root, requested));
  if (!isPathInside(root, absolute)) throw new Error(`${kind} escapes repository`);
  return {
    absolute,
    relative: normalizeResultPath(path.relative(root, absolute)),
  };
}

function operationalBase(root) {
  const workplace = path.join(root, "workplace");
  const temp = path.join(root, "temp");
  if (existsSync(workplace)) return path.join(workplace, "github-writer");
  if (existsSync(temp)) return path.join(temp, "github-writer");
  return path.join(workplace, "github-writer");
}

function uniqueFile(directory, basename) {
  const parsed = path.parse(basename);
  let candidate = path.join(directory, basename);
  if (!existsSync(candidate)) return candidate;
  for (let index = 2; index < 100; index += 1) {
    candidate = path.join(directory, `${parsed.name}-${index}${parsed.ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not resolve an unused file name: ${basename}`);
}

function writeFileAtomic(file, content) {
  if (existsSync(file)) throw new Error(`Refusing to overwrite existing file: ${path.basename(file)}`);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
  );
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, file);
}

function validateDraft(mode, text) {
  const canonical = canonicalText(text);
  const lines = canonical.split("\n");
  if (!lines[0]?.trim()) throw new Error("Draft title or first line is empty");
  if (canonical.length > MAX_DOCUMENT_CHARS) throw new Error("Draft exceeds the size limit");
  if (/\0/.test(canonical)) throw new Error("Draft contains a NUL character");
  if ((mode === "pr" || mode === "release") && !canonical.includes("\n\n")) {
    throw new Error("Draft must contain a first line and Markdown body");
  }
  if (/(?:^|\n)(?:token|password|secret|api[_-]?key|authorization)\s*[:=]/i.test(canonical)) {
    throw new Error("Draft contains a sensitive-looking line");
  }
  return canonical.endsWith("\n") ? canonical : `${canonical}\n`;
}

export function validateAndSaveDraft(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const now = dependencies.now?.() ?? new Date();
  const identity = repositoryIdentity(options.repo, git);
  const input = safeRelativeExisting(identity.root, options.input, "Draft input");
  const content = validateDraft(options.mode, readFileSync(input.absolute, "utf8"));
  const base = operationalBase(identity.root);
  const stamp = formatJst(now);
  const slug = branchSlug(identity.branch);
  const filename = options.mode === "pr"
    ? `pr-${slug ? `${slug}-` : ""}${stamp}.md`
    : `${options.mode}-${stamp}.md`;
  const output = uniqueFile(base, filename);
  writeFileAtomic(output, content);
  return {
    repository: identity.repository,
    mode: options.mode,
    source: input.relative,
    saved_path: normalizeResultPath(path.relative(identity.root, output)),
    draft_sha256: sha256(content),
    platform: process.platform,
  };
}

function chooseBackup(root, requested, now, git) {
  const base = requested || `backup/${formatJst(now, true)}`;
  if (!base.startsWith("backup/") || !BRANCH_PATTERN.test(base)) {
    throw new Error("Backup branch must be a valid name under backup/");
  }
  const valid = git(root, ["check-ref-format", "--branch", base], { allowFailure: true });
  if (!valid.ok) throw new Error("Backup branch name is invalid");
  if (requested) {
    const exists = git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${base}`], {
      allowFailure: true,
    });
    if (exists.ok) throw new Error("Requested backup branch already exists");
    return base;
  }
  for (let index = 1; index < 100; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const exists = git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${candidate}`], {
      allowFailure: true,
    });
    if (!exists.ok) return candidate;
  }
  throw new Error("Could not resolve an unused backup branch");
}

function planDirectory(root) {
  return path.join(operationalBase(root), "plans");
}

function attemptDirectory(root) {
  return path.join(operationalBase(root), "attempts");
}

function savePlan(root, plan, now) {
  const content = `${JSON.stringify(plan, null, 2)}\n`;
  const digest = sha256(content);
  const file = uniqueFile(
    planDirectory(root),
    `${plan.workflow.replaceAll(".", "-")}-${branchSlug(plan.branch)}-${formatJst(now)}.json`,
  );
  writeFileAtomic(file, content);
  return {
    plan_path: normalizeResultPath(path.relative(root, file)),
    plan_sha256: digest,
  };
}

function loadPlan(root, requested, expectedDigest) {
  if (!PLAN_PATH_PATTERN.test(normalizeResultPath(requested))) {
    throw new Error("Plan must be under workplace/github-writer/plans");
  }
  const resolved = safeRelativeExisting(root, requested, "Plan");
  const expectedDirectory = realpathSync(planDirectory(root));
  if (!isPathInside(expectedDirectory, resolved.absolute)) throw new Error("Plan escapes plan directory");
  const content = readFileSync(resolved.absolute, "utf8");
  if (!/^[0-9a-f]{64}$/i.test(expectedDigest) || sha256(content) !== expectedDigest.toLowerCase()) {
    throw new Error("Plan SHA-256 changed");
  }
  const plan = JSON.parse(content);
  if (plan?.schema_version !== PLAN_SCHEMA_VERSION || !workflowById(plan.workflow)) {
    throw new Error("Plan schema or workflow is invalid");
  }
  return { plan, plan_path: resolved.relative, plan_sha256: expectedDigest.toLowerCase() };
}

function attemptPaths(root, digest) {
  return {
    pending: path.join(attemptDirectory(root), `${digest}.pending.json`),
    result: path.join(attemptDirectory(root), `${digest}.result.json`),
  };
}

function beginAttempt(root, loaded) {
  const files = attemptPaths(root, loaded.plan_sha256);
  if (existsSync(files.pending) || existsSync(files.result)) {
    throw new Error("This plan already has an attempt; do not retry it");
  }
  writeFileAtomic(files.pending, `${JSON.stringify({
    schema_version: "github-writer.attempt/v1",
    status: "pending",
    plan: loaded.plan_path,
    plan_sha256: loaded.plan_sha256,
    started_at: new Date().toISOString(),
  }, null, 2)}\n`);
  return files;
}

function finishAttempt(files, value) {
  writeFileAtomic(files.result, `${JSON.stringify(value, null, 2)}\n`);
  return files.result;
}

function mutationFailure(attempt, loaded, error) {
  const message = error instanceof Error ? error.message : String(error);
  let recordFailure = "";
  try {
    finishAttempt(attempt, {
      schema_version: "github-writer.attempt/v1",
      status: "failure",
      plan: loaded.plan_path,
      plan_sha256: loaded.plan_sha256,
      message,
      finished_at: new Date().toISOString(),
      retryable: false,
    });
  } catch (recordError) {
    recordFailure = `; attempt result could not be written: ${
      recordError instanceof Error ? recordError.message : String(recordError)
    }`;
  }
  return new MutationFailure(`${message}${recordFailure}`, error);
}

export function backupPreflight(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const now = dependencies.now?.() ?? new Date();
  const identity = repositoryIdentity(options.repo, git);
  const backup = chooseBackup(identity.root, options.backupName, now, git);
  const plan = {
    schema_version: PLAN_SCHEMA_VERSION,
    workflow: "backup.apply",
    repository: identity.repository,
    branch: identity.branch,
    expected_head: identity.head,
    expected_status_sha256: sha256(identity.status_porcelain),
    backup_branch: backup,
    created_at: now.toISOString(),
    platform: process.platform,
  };
  return {
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    dirty: identity.dirty,
    backup_branch: backup,
    ...savePlan(identity.root, plan, now),
  };
}

function verifyPlanState(identity, plan) {
  if (identity.repository !== plan.repository
    || identity.branch !== plan.branch
    || identity.head !== plan.expected_head
    || sha256(identity.status_porcelain) !== plan.expected_status_sha256) {
    throw new Error("Repository state changed after preflight");
  }
}

export function backupApply(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  const loaded = loadPlan(identity.root, options.plan, options.expectedPlanSha256);
  if (loaded.plan.workflow !== "backup.apply") throw new Error("Plan is not a backup plan");
  verifyPlanState(identity, loaded.plan);
  const attempt = beginAttempt(identity.root, loaded);
  try {
    git(identity.root, ["branch", loaded.plan.backup_branch, "HEAD"]);
    const target = git(identity.root, ["rev-parse", loaded.plan.backup_branch]).out;
    if (target !== identity.head) throw new Error("Backup branch postcondition failed");
    const result = {
      schema_version: "github-writer.attempt/v1",
      status: "success",
      plan: loaded.plan_path,
      plan_sha256: loaded.plan_sha256,
      backup_branch: loaded.plan.backup_branch,
      target,
      finished_at: new Date().toISOString(),
    };
    const resultFile = finishAttempt(attempt, result);
    return { ...result, attempt_record: normalizeResultPath(path.relative(identity.root, resultFile)) };
  } catch (error) {
    throw mutationFailure(attempt, loaded, error);
  }
}

function resolveBase(root, branch, requested, git) {
  const candidates = requested
    ? [{ value: requested, source: "explicit" }]
    : [
      {
        value: git(root, [
          "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}",
        ], { allowFailure: true }).out,
        source: "upstream",
      },
      {
        value: git(root, [
          "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD",
        ], { allowFailure: true }).out,
        source: "origin-head",
      },
      { value: "origin/devel", source: "origin-devel" },
    ];
  for (const candidate of candidates) {
    if (!candidate.value || !TARGET_PATTERN.test(candidate.value)) continue;
    if (candidate.source === "upstream"
      && branch
      && candidate.value.replace(/^refs\/remotes\//, "").endsWith(`/${branch}`)) {
      continue;
    }
    const resolved = git(root, [
      "rev-parse", "--verify", `${candidate.value}^{commit}`,
    ], { allowFailure: true });
    if (resolved.ok) return { base: candidate.value, base_commit: resolved.out, source: candidate.source };
  }
  throw new Error("Could not resolve recommit base");
}

export function recommitPreflight(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const now = dependencies.now?.() ?? new Date();
  const identity = repositoryIdentity(options.repo, git);
  if (identity.dirty) throw new Error("PR recommit requires a clean working tree");
  const base = resolveBase(identity.root, identity.branch, options.base, git);
  const ancestor = git(identity.root, [
    "merge-base", "--is-ancestor", base.base_commit, identity.head,
  ], { allowFailure: true });
  if (!ancestor.ok) throw new Error("Recommit base is not an ancestor of HEAD");
  const draft = safeRelativeExisting(identity.root, options.prDraft, "PR draft");
  const draftContent = validateDraft("pr", readFileSync(draft.absolute, "utf8"));
  const backup = chooseBackup(identity.root, "", now, git);
  const commits = git(identity.root, [
    "log", "--oneline", `${base.base_commit}..${identity.head}`,
  ]).out.split("\n").filter(Boolean);
  if (commits.length === 0) throw new Error("No commits to collapse");
  const plan = {
    schema_version: PLAN_SCHEMA_VERSION,
    workflow: "pr.recommit.apply",
    repository: identity.repository,
    branch: identity.branch,
    expected_head: identity.head,
    expected_status_sha256: sha256(identity.status_porcelain),
    base: base.base,
    base_commit: base.base_commit,
    pr_draft: draft.relative,
    pr_draft_sha256: sha256(draftContent),
    backup_branch: backup,
    commits_to_collapse: commits.length,
    created_at: now.toISOString(),
    platform: process.platform,
  };
  return {
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    base: base.base,
    base_commit: base.base_commit,
    base_source: base.source,
    pr_draft: draft.relative,
    pr_draft_sha256: plan.pr_draft_sha256,
    backup_branch: backup,
    commits_to_collapse: commits.length,
    commits,
    diff_stat: git(identity.root, ["diff", "--stat", `${base.base_commit}..${identity.head}`]).out,
    ...savePlan(identity.root, plan, now),
  };
}

export function recommitApply(options, dependencies = {}) {
  const git = dependencies.git ?? defaultGit;
  const identity = repositoryIdentity(options.repo, git);
  const loaded = loadPlan(identity.root, options.plan, options.expectedPlanSha256);
  const plan = loaded.plan;
  if (plan.workflow !== "pr.recommit.apply") throw new Error("Plan is not a recommit plan");
  verifyPlanState(identity, plan);
  const base = git(identity.root, ["rev-parse", "--verify", `${plan.base}^{commit}`]).out;
  if (base !== plan.base_commit) throw new Error("Base changed after preflight");
  const draft = safeRelativeExisting(identity.root, plan.pr_draft, "PR draft");
  const draftContent = validateDraft("pr", readFileSync(draft.absolute, "utf8"));
  if (sha256(draftContent) !== plan.pr_draft_sha256) throw new Error("PR draft changed after preflight");
  const attempt = beginAttempt(identity.root, loaded);
  try {
    git(identity.root, ["branch", plan.backup_branch, "HEAD"]);
    git(identity.root, ["reset", "--soft", plan.base_commit]);
    git(identity.root, ["commit", "-F", draft.absolute]);
    const finalIdentity = repositoryIdentity(identity.root, git);
    if (finalIdentity.dirty) throw new Error("Recommit postcondition left a dirty working tree");
    const parent = git(identity.root, ["rev-parse", `${finalIdentity.head}^`]).out;
    if (parent !== plan.base_commit) throw new Error("Recommit parent postcondition failed");
    const result = {
      schema_version: "github-writer.attempt/v1",
      status: "success",
      plan: loaded.plan_path,
      plan_sha256: loaded.plan_sha256,
      backup_branch: plan.backup_branch,
      previous_head: plan.expected_head,
      new_head: finalIdentity.head,
      finished_at: new Date().toISOString(),
    };
    const resultFile = finishAttempt(attempt, result);
    return { ...result, attempt_record: normalizeResultPath(path.relative(identity.root, resultFile)) };
  } catch (error) {
    throw mutationFailure(attempt, loaded, error);
  }
}

export function humanOutput(workflow, result) {
  if (workflow.endsWith(".evidence")) {
    return [
      `[SUCCESS] ${workflow}`,
      "",
      `Repository: ${result.repository}`,
      `Branch: ${result.branch || "none"}`,
      `Evidence SHA-256: ${result.evidence_sha256}`,
      `Truncated: ${result.patch_truncated || result.documents_truncated ? "yes" : "no"}`,
      "Writing: not invoked",
    ].join("\n");
  }
  if (workflow === "branch.status") {
    return [
      "[SUCCESS] branch.status",
      "",
      `Repository: ${result.repository}`,
      `Branch: ${result.branch || "none"}`,
      `Upstream: ${result.upstream || "none"}`,
      `Ahead / behind: ${result.ahead ?? "unknown"} / ${result.behind ?? "unknown"}`,
      `Working tree: ${result.dirty ? "dirty" : "clean"}`,
    ].join("\n");
  }
  const lines = [
    `[SUCCESS] ${workflow}`,
    "",
    `Repository: ${result.repository ?? "unknown"}`,
  ];
  for (const [label, key] of [
    ["Plan", "plan_path"],
    ["Plan SHA-256", "plan_sha256"],
    ["Saved draft", "saved_path"],
    ["Draft SHA-256", "draft_sha256"],
    ["Backup branch", "backup_branch"],
    ["New HEAD", "new_head"],
    ["Attempt record", "attempt_record"],
  ]) {
    if (result[key]) lines.push(`${label}: ${result[key]}`);
  }
  return lines.join("\n");
}

export function successEnvelope(workflow, result, startedAt) {
  const metadata = workflowById(workflow);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    workflow,
    workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
    mutation_level: metadata.mutation_level,
    approval_gate: metadata.approval_gate,
    status: "success",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
    },
    mutation_invoked: metadata.mutation_level !== "readonly",
    result,
    human_output: humanOutput(workflow, result),
  };
}

export function failureEnvelope(workflow, error, startedAt) {
  const metadata = workflowById(workflow);
  const mutationInvoked = error?.mutationInvoked === true;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    workflow,
    workflow_manifest_version: WORKFLOW_MANIFEST_VERSION,
    mutation_level: metadata?.mutation_level ?? "unknown",
    approval_gate: metadata?.approval_gate ?? "unknown",
    status: "failure",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
    },
    mutation_invoked: mutationInvoked,
    error: {
      schema_version: ERROR_SCHEMA_VERSION,
      classification: mutationInvoked ? "mutation-state-unconfirmed" : "safe-stop",
      message: error instanceof Error ? error.message : String(error),
      retryability: mutationInvoked || metadata?.mutation_level === "local"
        ? "do-not-retry"
        : "new-preflight-required",
    },
    human_output: [
      `[${mutationInvoked ? "UNCONFIRMED" : "NOT APPLIED"}] ${workflow}`,
      "",
      `Message: ${error instanceof Error ? error.message : String(error)}`,
      `Mutation invoked: ${mutationInvoked ? "yes; inspect repository before any next action" : "no"}`,
    ].join("\n"),
  };
}

export function environmentInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    temp_directory: normalizeResultPath(os.tmpdir()),
  };
}
