import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

import {
  MAX_DOCUMENT_CHARS,
  TARGET_PATTERN,
  boundedText,
  defaultGit,
  isPathInside,
  normalizeResultPath,
  repositoryIdentity,
  sha256,
} from "./github-writer-core.mjs";

export const EVIDENCE_SCHEMA_VERSION = "github-writer.evidence/v1";

const MAX_PATCH_CHARS = 120_000;
const MAX_COMMITS = 200;

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
  const real = realpathSync(path.resolve(root, requested));
  if (!isPathInside(root, real)) throw new Error(`Document escapes repository: ${requested}`);
  const stat = statSync(real);
  if (!stat.isFile()) throw new Error(`Document is not a file: ${requested}`);
  const content = boundedText(readFileSync(real, "utf8"), MAX_DOCUMENT_CHARS);
  return {
    path: normalizeResultPath(path.relative(root, real)),
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
