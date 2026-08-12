import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { runIssueRead } from "./github-issue-read.mjs";
import { jstTimestamp } from "./miku-scm-jst-time.mjs";

export const WRITING_EVIDENCE_SCHEMA_VERSION = "miku-scm.writing-evidence/v2";

const GIT_TARGET = /^[^\s\u0000-\u001f\u007f]{1,240}$/;
const GITHUB_REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ISSUE_OPERATIONS = new Set(["create", "update", "comment"]);
const MAX_PATCH_CHARS = 120_000;
const MAX_DOCUMENT_CHARS = 40_000;
const MAX_LABEL_DESCRIPTION_CHARS = 512;
const MAX_COMMITS = 200;
const GIT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function defaultGit(cwd, args, { allowFailure = false, input } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    input,
    maxBuffer: GIT_MAX_BUFFER_BYTES,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args[0]} failed: ${(result.stderr || result.stdout || "unknown failure").trim()}`);
  }
  return {
    ok: result.status === 0,
    out: (result.stdout || "").trimEnd(),
    err: (result.stderr || "").trimEnd(),
  };
}

function validateTarget(target) {
  if (!GIT_TARGET.test(target) || target.startsWith("-")) {
    throw new Error("Git target must be a bounded ref, commit, or range and must not start with '-'");
  }
  return target;
}

export function parseWritingPrepareArgs(mode, argv, cwd = process.cwd()) {
  const options = {
    mode,
    repo: path.resolve(cwd),
    target: "",
    githubRepository: "",
    issue: null,
    issueOperation: mode === "issue" ? "create" : null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo") options.repo = path.resolve(argv[++index] ?? "");
    else if (argument === "--target") options.target = argv[++index] ?? "";
    else if (argument === "--github-repo") options.githubRepository = argv[++index] ?? "";
    else if (argument === "--issue") options.issue = Number(argv[++index]);
    else if (argument === "--operation") options.issueOperation = argv[++index] ?? "";
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.target) validateTarget(options.target);
  if (mode === "release" && !options.target) {
    throw new Error("writing.release.prepare requires --target");
  }
  if (mode === "issue") {
    if (options.githubRepository && !GITHUB_REPOSITORY.test(options.githubRepository)) {
      throw new Error("--github-repo must use owner/repository when specified");
    }
    if (!ISSUE_OPERATIONS.has(options.issueOperation)) {
      throw new Error("--operation must be create, update, or comment");
    }
    if (options.issueOperation === "create" && options.issue !== null) {
      throw new Error("writing.issue.prepare create does not accept --issue");
    }
    if (options.issueOperation !== "create"
      && (!Number.isSafeInteger(options.issue) || options.issue < 1)) {
      throw new Error(`writing.issue.prepare ${options.issueOperation} requires --issue`);
    }
    if (options.issue !== null && (!Number.isSafeInteger(options.issue) || options.issue < 1)) {
      throw new Error("--issue must be a positive integer");
    }
  } else if (options.githubRepository || options.issue !== null || options.issueOperation !== null) {
    throw new Error("--github-repo, --issue, and --operation are only valid for writing.issue.prepare");
  }
  if ((mode === "about" || mode === "issue") && options.target) {
    throw new Error(`writing.${mode}.prepare does not accept --target`);
  }
  return options;
}

function branchSlug(branch) {
  const value = String(branch || "").toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  return value.replace(/^-+|-+$/g, "");
}

function suggestedPath(mode, branch, now, issueOperation = null, issue = null) {
  const stamp = jstTimestamp(now);
  if (mode === "pr") {
    const slug = branchSlug(branch);
    return `workplace/miku-scm/pr-drafts/pr-${slug ? `${slug}-` : ""}${stamp}.md`;
  }
  if (mode === "release") return `workplace/miku-scm/release-${stamp}.md`;
  if (mode === "about") return `workplace/miku-scm/about-${stamp}.md`;
  if (issueOperation === "update") {
    return `workplace/miku-scm/issue-updates/issue-${issue}-update-${stamp}.md`;
  }
  if (issueOperation === "comment") {
    return `workplace/miku-scm/issue-comments/issue-${issue}-comment-${stamp}.md`;
  }
  return `workplace/miku-scm/new-issues/issue-new-${stamp}.md`;
}

export function canonicalGitHubRepository(remoteUrl) {
  const value = String(remoteUrl || "").trim();
  const scp = value.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
  let owner;
  let repository;
  if (scp) {
    [, owner, repository] = scp;
  } else {
    try {
      const parsed = new URL(value);
      if (parsed.hostname.toLowerCase() !== "github.com") return null;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length !== 2) return null;
      [owner, repository] = parts;
    } catch {
      return null;
    }
  }
  repository = repository.replace(/\.git$/i, "");
  const fullName = `${owner}/${repository}`;
  return GITHUB_REPOSITORY.test(fullName) ? fullName : null;
}

function redactSensitiveLines(value) {
  return String(value).split("\n").map((line) => (
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

async function repositoryIdentity(repo, git) {
  const rootResult = git(repo, ["rev-parse", "--show-toplevel"]);
  const root = path.resolve(rootResult.out);
  const branch = git(root, ["branch", "--show-current"]).out;
  const head = git(root, ["rev-parse", "HEAD"]).out;
  return { root, repository: path.basename(root), branch, head };
}

function resolveSingleCommit(root, target, git) {
  const commit = git(root, ["rev-parse", "--verify", `${target}^{commit}`]).out;
  const parentResult = git(root, ["rev-parse", "--verify", `${commit}^`], { allowFailure: true });
  if (parentResult.ok) {
    const range = `${parentResult.out}..${commit}`;
    return {
      logTarget: commit,
      diffTarget: range,
      rootCommit: false,
    };
  }
  const emptyTree = git(root, ["hash-object", "-t", "tree", "--stdin"], { input: "" }).out;
  return {
    logTarget: commit,
    diffTarget: `${emptyTree}..${commit}`,
    rootCommit: true,
  };
}

function remoteBranchIsCurrentFeature(upstream, branch) {
  if (!upstream || !branch) return false;
  const normalized = upstream.replace(/^refs\/remotes\//, "");
  const slash = normalized.indexOf("/");
  return slash >= 0 && normalized.slice(slash + 1) === branch;
}

function prescribedBaseCandidate(branch) {
  const match = branch.match(/^(.*)-tiga\d{4}[a-x][a-j][a-j]$/);
  return match?.[1] ? `origin/${match[1]}` : "";
}

function resolveDefaultPrBase(root, branch, git) {
  const upstream = git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFailure: true,
  });
  if (upstream.ok && upstream.out && !remoteBranchIsCurrentFeature(upstream.out, branch)) {
    return { base: upstream.out, source: "current branch upstream" };
  }

  const prescribedBase = prescribedBaseCandidate(branch);
  if (prescribedBase) {
    const prescribed = git(root, ["rev-parse", "--verify", `${prescribedBase}^{commit}`], {
      allowFailure: true,
    });
    if (prescribed.ok) {
      return { base: prescribedBase, source: "base encoded by current work-branch name" };
    }
  }

  const remoteHead = git(root, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], {
    allowFailure: true,
  });
  if (remoteHead.ok && remoteHead.out.startsWith("refs/remotes/")) {
    return {
      base: remoteHead.out.replace(/^refs\/remotes\//, ""),
      source: "local origin/HEAD",
    };
  }

  const fallback = git(root, ["rev-parse", "--verify", "origin/devel^{commit}"], {
    allowFailure: true,
  });
  if (fallback.ok) return { base: "origin/devel", source: "local origin/devel fallback" };
  return { base: "", source: "unresolved" };
}

function resolveDefaultPrTarget(root, branch, head, git) {
  const base = resolveDefaultPrBase(root, branch, git);
  if (!base.base) {
    const resolved = resolveSingleCommit(root, head, git);
    return {
      requested: null,
      resolved_log_target: resolved.logTarget,
      resolved_diff_target: resolved.diffTarget,
      resolution: "default-latest-single-commit-base-unresolved",
      root_commit: resolved.rootCommit,
      single_commit: true,
      base: null,
      base_source: base.source,
      base_commit: null,
      ahead_commit_count: null,
      recommit_recommended: false,
    };
  }

  const baseCommitResult = git(root, ["rev-parse", "--verify", `${base.base}^{commit}`], {
    allowFailure: true,
  });
  if (!baseCommitResult.ok) {
    throw new Error(`Default PR base could not be resolved: ${base.base}`);
  }
  const baseCommit = baseCommitResult.out;
  const ancestor = git(root, ["merge-base", "--is-ancestor", baseCommit, head], {
    allowFailure: true,
  });
  if (!ancestor.ok) {
    throw new Error(`Default PR base is not an ancestor of HEAD: ${base.base}`);
  }
  const range = `${baseCommit}..${head}`;
  const count = Number(git(root, ["rev-list", "--count", range]).out);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Could not count commits in default PR range: ${base.base}..HEAD`);
  }
  if (count === 0) {
    throw new Error(`No commits are available for a PR from ${base.base} to HEAD`);
  }
  if (count >= 2) {
    return {
      requested: null,
      resolved_log_target: range,
      resolved_diff_target: range,
      resolution: "default-branch-multi-commit-range",
      root_commit: false,
      single_commit: false,
      base: base.base,
      base_source: base.source,
      base_commit: baseCommit,
      ahead_commit_count: count,
      recommit_recommended: true,
    };
  }

  const resolved = resolveSingleCommit(root, head, git);
  return {
    requested: null,
    resolved_log_target: resolved.logTarget,
    resolved_diff_target: resolved.diffTarget,
    resolution: "default-branch-single-commit",
    root_commit: resolved.rootCommit,
    single_commit: true,
    base: base.base,
    base_source: base.source,
    base_commit: baseCommit,
    ahead_commit_count: count,
    recommit_recommended: false,
  };
}

function resolveGitTarget(mode, root, branch, requested, head, git) {
  if (requested.includes("..")) {
    git(root, ["rev-list", "--count", requested]);
    return {
      requested: requested,
      resolved_log_target: requested,
      resolved_diff_target: requested,
      resolution: "explicit-range",
      root_commit: false,
      single_commit: false,
    };
  }
  if (mode === "release") {
    const start = git(root, ["rev-parse", "--verify", `${requested}^{commit}`]).out;
    const parentResult = git(root, ["rev-parse", "--verify", `${start}^`], { allowFailure: true });
    if (parentResult.ok) {
      return {
        requested,
        resolved_log_target: `${parentResult.out}..${head}`,
        resolved_diff_target: `${parentResult.out}..${head}`,
        resolution: "inclusive-start-through-head",
        root_commit: false,
        single_commit: false,
      };
    }
    const emptyTree = git(root, ["hash-object", "-t", "tree", "--stdin"], { input: "" }).out;
    return {
      requested,
      resolved_log_target: head,
      resolved_diff_target: `${emptyTree}..${head}`,
      resolution: "inclusive-root-through-head",
      root_commit: true,
      single_commit: false,
    };
  }
  if (mode === "pr" && !requested) {
    return resolveDefaultPrTarget(root, branch, head, git);
  }
  const resolved = resolveSingleCommit(root, requested, git);
  return {
    requested,
    resolved_log_target: resolved.logTarget,
    resolved_diff_target: resolved.diffTarget,
    resolution: "explicit-single-commit",
    root_commit: resolved.rootCommit,
    single_commit: true,
  };
}

function writingContract(mode, issueOperation = null) {
  const shared = {
    language: "Japanese unless the user requests otherwise",
    source_rule: "Use only the supplied evidence and current user direction",
    unsupported_claims: "Omit or mark unverified; do not invent intent, effects, versions, dates, tests, or URLs",
    generation_passes: 1,
  };
  if (mode === "pr") {
    return {
      ...shared,
      output: "First line is the PR title; body uses Overview and Changes sections",
      audience: "reviewers",
    };
  }
  if (mode === "release") {
    return {
      ...shared,
      output: "Release title and body with Overview and Main changes sections",
      audience: "users",
    };
  }
  if (mode === "about") {
    return {
      ...shared,
      language: "English primary text with Japanese reference translation",
      output: "Short factual GitHub About text",
      audience: "repository visitors",
    };
  }
  if (mode === "issue" && issueOperation === "comment") {
    return {
      ...shared,
      output: "Complete Issue comment Markdown body without a title line or outer fence",
      audience: "maintainers and contributors",
    };
  }
  if (mode === "issue" && issueOperation === "update") {
    return {
      ...shared,
      output: "First line is the proposed Issue title; remaining Markdown is the complete proposed body",
      audience: "maintainers and contributors",
    };
  }
  return {
    ...shared,
    output: "First line is the Issue title; remaining Markdown is the Issue body",
    audience: "maintainers and contributors",
  };
}

async function prepareGitWriting(options, dependencies) {
  const git = dependencies.git ?? defaultGit;
  const identity = await repositoryIdentity(options.repo, git);
  const target = resolveGitTarget(
    options.mode,
    identity.root,
    identity.branch,
    options.target,
    identity.head,
    git,
  );
  const count = target.single_commit
    ? 1
    : Number(git(identity.root, ["rev-list", "--count", target.resolved_log_target]).out);
  const log = target.single_commit
    ? git(identity.root, [
        "show", "-s", "--format=%H%x09%s", target.resolved_log_target, "--",
      ]).out
    : git(identity.root, [
        "log", `--max-count=${MAX_COMMITS + 1}`, "--format=%H%x09%s",
        target.resolved_log_target, "--",
      ]).out;
  const commits = log.split("\n").filter(Boolean).slice(0, MAX_COMMITS).map((line) => {
    const [commit, ...subject] = line.split("\t");
    return { commit, subject: subject.join("\t") };
  });
  const diffStat = git(identity.root, [
    "diff", "--stat", "--no-renames", "--no-textconv", target.resolved_diff_target, "--",
  ]).out;
  const nameStatus = git(identity.root, [
    "diff", "--name-status", "--no-renames", "--no-textconv", target.resolved_diff_target, "--",
  ]).out;
  const patch = boundedText(git(identity.root, [
    "diff", "--no-ext-diff", "--no-renames", "--no-textconv", "--unified=1",
    target.resolved_diff_target, "--",
  ]).out, MAX_PATCH_CHARS);
  const evidence = {
    schema_version: WRITING_EVIDENCE_SCHEMA_VERSION,
    mode: options.mode,
    status: "prepared",
    repository: identity.repository,
    branch: identity.branch,
    head: identity.head,
    target,
    commit_count: count,
    commits,
    commits_truncated: count > MAX_COMMITS,
    diff_stat: diffStat,
    changed_files: nameStatus.split("\n").filter(Boolean),
    patch_excerpt: patch.text,
    patch_truncated: patch.truncated,
    writing_contract: writingContract(options.mode, options.issueOperation),
    suggested_draft_path: suggestedPath(
      options.mode,
      identity.branch,
      dependencies.now ? dependencies.now() : new Date(),
    ),
  };
  return { ...evidence, evidence_sha256: digest(evidence) };
}

async function readBoundedDocument(root, relative, read = readFile) {
  try {
    const content = await read(path.join(root, relative), "utf8");
    const bounded = boundedText(content, MAX_DOCUMENT_CHARS);
    return { path: relative, ...bounded };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function localDocuments(root, read) {
  const candidates = ["README.md", "package.json", "pom.xml"];
  const documents = await Promise.all(candidates.map(
    (relative) => readBoundedDocument(root, relative, read),
  ));
  return documents.filter(Boolean);
}

function boundedGitHubEvidence(evidence) {
  if (!evidence || evidence.mode !== "issue") return evidence;
  const body = boundedText(evidence.issue.body, MAX_DOCUMENT_CHARS);
  const comments = evidence.issue.comments.slice(0, 100).map((comment) => {
    const content = boundedText(
      comment.body ?? comment.bodyText ?? "",
      Math.floor(MAX_DOCUMENT_CHARS / 4),
    );
    return {
      author: comment.author?.login ?? comment.author ?? null,
      created_at: comment.createdAt ?? comment.created_at ?? null,
      body: content.text,
      truncated: content.truncated,
    };
  });
  return {
    ...evidence,
    issue: {
      ...evidence.issue,
      body: body.text,
      body_truncated: body.truncated,
      comments,
      comments_truncated: evidence.issue.comments.length > comments.length
        || comments.some((comment) => comment.truncated),
    },
  };
}

function boundedLabelEvidence(evidence) {
  if (!evidence || evidence.mode !== "labels") return evidence;
  let labelsTruncated = false;
  const labels = evidence.labels.map((label) => {
    const description = boundedText(label.description ?? "", MAX_LABEL_DESCRIPTION_CHARS);
    labelsTruncated ||= description.truncated;
    return {
      ...label,
      description: description.text,
      description_truncated: description.truncated,
    };
  });
  return { ...evidence, labels, labels_truncated: labelsTruncated };
}

async function prepareDocumentWriting(options, dependencies) {
  const git = dependencies.git ?? defaultGit;
  const identity = await repositoryIdentity(options.repo, git);
  const documents = await localDocuments(identity.root, dependencies.readFile);
  let githubEvidence = null;
  let githubRepository = options.githubRepository;
  let githubRepositorySource = options.githubRepository ? "explicit" : null;
  if (options.mode === "issue") {
    if (!githubRepository) {
      const remoteUrl = git(identity.root, ["remote", "get-url", "origin"], {
        allowFailure: true,
      });
      githubRepository = remoteUrl.ok ? canonicalGitHubRepository(remoteUrl.out) : null;
      githubRepositorySource = githubRepository ? "origin" : null;
      if (!githubRepository) {
        throw new Error(
          "GitHub repository is unresolved; pass --github-repo owner/repository or configure a GitHub origin",
        );
      }
    }
    if (options.issueOperation === "create") {
      githubEvidence = boundedLabelEvidence(runIssueRead({
        repo: githubRepository,
        mode: "labels",
        state: "open",
        issue: null,
      }, { gh: dependencies.gh }));
    } else {
      githubEvidence = boundedGitHubEvidence(runIssueRead({
        repo: githubRepository,
        mode: "issue",
        state: "open",
        issue: options.issue,
      }, { gh: dependencies.gh }));
      if (options.issueOperation === "update") {
        const labelEvidence = boundedLabelEvidence(runIssueRead({
          repo: githubRepository,
          mode: "labels",
          state: "open",
          issue: null,
        }, { gh: dependencies.gh }));
        githubEvidence = {
          ...githubEvidence,
          repository_labels: labelEvidence.labels,
          repository_labels_truncated: labelEvidence.labels_truncated,
        };
      }
    }
  }
  const draftPath = suggestedPath(
    options.mode,
    identity.branch,
    dependencies.now ? dependencies.now() : new Date(),
    options.issueOperation,
    options.issue,
  );
  const nextPreflight = options.mode === "issue"
    ? {
        workflow: `github.issue.${options.issueOperation}.preflight`,
        repository: githubRepository,
        issue: options.issue,
        draft: draftPath,
        reviewed_optional_flags: options.issueOperation === "create"
          ? ["--label", "--parent"]
          : options.issueOperation === "update"
            ? ["--add-label", "--remove-label"]
            : [],
      }
    : null;
  const githubEvidenceTruncated = Boolean(
    githubEvidence?.issue?.body_truncated || githubEvidence?.issue?.comments_truncated
      || githubEvidence?.labels_truncated || githubEvidence?.repository_labels_truncated,
  );
  const evidence = {
    schema_version: WRITING_EVIDENCE_SCHEMA_VERSION,
    mode: options.mode,
    status: "prepared",
    repository: identity.repository,
    github_repository: githubRepository || null,
    github_repository_source: githubRepositorySource,
    issue_operation: options.issueOperation,
    issue: options.issue,
    branch: identity.branch,
    head: identity.head,
    documents,
    documents_truncated: documents.some((document) => document.truncated),
    github_evidence: githubEvidence,
    github_evidence_truncated: githubEvidenceTruncated,
    writing_contract: writingContract(options.mode, options.issueOperation),
    suggested_draft_path: draftPath,
    next_preflight: nextPreflight,
  };
  return { ...evidence, evidence_sha256: digest(evidence) };
}

export async function prepareWritingEvidence(options, dependencies = {}) {
  if (options.mode === "pr" || options.mode === "release") {
    return prepareGitWriting(options, dependencies);
  }
  return prepareDocumentWriting(options, dependencies);
}
