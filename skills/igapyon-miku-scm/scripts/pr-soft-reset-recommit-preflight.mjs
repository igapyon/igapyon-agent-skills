#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { jstDashedTimestamp } from "./miku-scm-jst-time.mjs";
import { relativeOperationalPath } from "./miku-scm-operational-path.mjs";

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs [--base <base>] [--pr-draft <path>] [--repo <path>] [--remote <name>] [--apply] [--allow-dirty]

By default this is a read-only helper. It resolves PR draft candidates, backup
branch names, and Git evidence for PR Soft Reset Recommit mode.

With --apply, it performs the local-only rewrite:
  git branch <backup> HEAD
  git reset --soft <base>
  git commit -F <pr-draft>

It never pushes, creates PRs, merges PRs, or changes remotes.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const args = { repo: cwd, remote: "origin", base: "", prDraft: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--base") {
      args.base = argv[++i] ?? "";
    } else if (arg === "--pr-draft") {
      args.prDraft = argv[++i] ?? "";
    } else if (arg === "--repo") {
      args.repo = argv[++i] ?? "";
    } else if (arg === "--remote") {
      args.remote = argv[++i] ?? "";
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--allow-dirty") {
      args.allowDirty = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.help && !/^[A-Za-z0-9._-]+$/.test(args.remote)) {
    throw new Error("--remote must be a Git remote name");
  }
  return args;
}

function git(repo, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    input: options.input,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0 && !options.allowFailure) {
    const message = (result.stderr || result.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed${message ? `: ${message}` : ""}`);
  }
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trimEnd(),
    stderr: (result.stderr || "").trimEnd(),
  };
}

function remoteBranchIsCurrentFeature(upstream, branch) {
  if (!upstream || !branch) return false;
  const normalized = upstream.replace(/^refs\/remotes\//, "");
  const slash = normalized.indexOf("/");
  return slash >= 0 && normalized.slice(slash + 1) === branch;
}

function prescribedBaseCandidate(branch, remote) {
  const match = branch.match(/^(.*)-tiga\d{4}[a-x][a-j][a-j]$/);
  return match?.[1] ? `${remote}/${match[1]}` : "";
}

function remoteFromTrackingRef(value) {
  const normalized = String(value).replace(/^refs\/remotes\//, "");
  return normalized.split("/", 1)[0] || "";
}

function refExists(root, ref, runGit = git) {
  return runGit(root, ["rev-parse", "--verify", "--quiet", ref], { allowFailure: true }).ok;
}

function resolveDefaultBase(root, branch, remote, runGit = git) {
  const upstream = runGit(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFailure: true,
  });
  if (upstream.ok && upstream.stdout && remoteFromTrackingRef(upstream.stdout) === remote
    && !remoteBranchIsCurrentFeature(upstream.stdout, branch)) {
    return { base: upstream.stdout, source: "current branch upstream" };
  }

  const prescribedBase = prescribedBaseCandidate(branch, remote);
  if (prescribedBase && refExists(root, prescribedBase, runGit)) {
    return { base: prescribedBase, source: "base encoded by current work-branch name" };
  }

  const remoteHead = runGit(root, ["symbolic-ref", "--quiet", `refs/remotes/${remote}/HEAD`], {
    allowFailure: true,
  });
  if (remoteHead.ok && remoteHead.stdout.startsWith("refs/remotes/")) {
    return {
      base: remoteHead.stdout.replace(/^refs\/remotes\//, ""),
      source: `local ${remote}/HEAD`,
    };
  }

  if (refExists(root, `${remote}/devel`, runGit)) {
    return { base: `${remote}/devel`, source: `local ${remote}/devel fallback` };
  }

  return { base: "", source: "unresolved" };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function slugBranch(branch) {
  return branch.toLowerCase().replaceAll(/[^a-z0-9._-]/g, "-");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findDrafts(root, branch) {
  const slug = slugBranch(branch);
  if (!slug) return { slug, drafts: [] };

  const dirs = [
    { rel: "workplace/miku-scm/pr-drafts", priority: 0 },
    { rel: "temp/miku-scm/pr-drafts", priority: 0 },
    { rel: "workplace/miku-scm", priority: 1 },
    { rel: "temp/miku-scm", priority: 1 },
    { rel: "workplace/github-writer", priority: 2 },
    { rel: "temp/github-writer", priority: 2 },
  ];
  const drafts = [];
  const pattern = new RegExp(`^pr-${escapeRegExp(slug)}-(\\d{12})(?:-[a-z0-9._-]+)?\\.md$`);

  for (const { rel: dir, priority } of dirs) {
    const fullDir = path.join(root, dir);
    if (!existsSync(fullDir)) continue;
    for (const name of readdirSync(fullDir)) {
      const match = name.match(pattern);
      if (!match) continue;
      const absolute = path.join(fullDir, name);
      const st = statSync(absolute);
      drafts.push({
        rel: relativeOperationalPath(root, absolute),
        priority,
        timestamp: match[1],
        mtimeMs: st.mtimeMs,
      });
    }
  }

  drafts.sort((a, b) => {
    const byPriority = a.priority - b.priority;
    if (byPriority !== 0) return byPriority;
    const byTimestamp = b.timestamp.localeCompare(a.timestamp);
    if (byTimestamp !== 0) return byTimestamp;
    return b.mtimeMs - a.mtimeMs;
  });

  return { slug, drafts };
}

function chooseBackup(existingBranches, now = new Date()) {
  const base = `backup/${jstDashedTimestamp(now)}`;
  const existing = new Set(
    existingBranches
      .split("\n")
      .map((line) => line.replace(/^\*?\s*/, "").trim())
      .filter(Boolean),
  );
  if (!existing.has(base)) return base;
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error(`Could not find an available backup branch name for ${base}`);
}

function hasDirtyStatus(status) {
  return status
    .split("\n")
    .slice(1)
    .some((line) => line.trim() !== "");
}

function listBlock(lines) {
  return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : "- none";
}

function digest(content) {
  return createHash("sha256").update(content).digest("hex");
}

function asFailure(error, mutationInvoked) {
  const failure = error instanceof Error ? error : new Error(String(error));
  failure.mutationInvoked = mutationInvoked;
  return failure;
}

export function runRecommit(args, dependencies = {}) {
  const runGit = dependencies.git ?? git;
  const now = dependencies.now ? dependencies.now() : new Date();
  const remote = args.remote ?? "origin";
  let mutationInvoked = false;
  try {
    const root = runGit(args.repo, ["rev-parse", "--show-toplevel"]).stdout;
    const resolvedRoot = path.resolve(root);
    const rootPrefix = `${resolvedRoot}${path.sep}`;
    const realRootPrefix = `${realpathSync(root)}${path.sep}`;
    const explicitDraftAbs = args.prDraft ? path.resolve(root, args.prDraft) : "";
    const explicitDraftSafe = !args.prDraft || explicitDraftAbs.startsWith(rootPrefix);
    const explicitDraftExists = explicitDraftSafe && existsSync(explicitDraftAbs);
    const explicitDraftRealSafe = !explicitDraftExists
      || realpathSync(explicitDraftAbs).startsWith(realRootPrefix);
    if (args.apply && args.prDraft && (!explicitDraftSafe || !explicitDraftRealSafe)) {
      throw new Error("PR draft must stay inside the repository");
    }
    if (args.apply && args.prDraft && !explicitDraftExists) {
      throw new Error(`PR draft is missing: ${args.prDraft}`);
    }

    const branch = runGit(root, ["branch", "--show-current"], { allowFailure: true }).stdout;
    const resolvedBase = args.base
      ? { base: args.base, source: "explicit --base" }
      : resolveDefaultBase(root, branch, remote, runGit);
    if (!resolvedBase.base) {
      throw new Error(`Could not resolve base from --base, current ${remote} branch upstream, local ${remote}/HEAD, or ${remote}/devel.`);
    }
    const status = runGit(root, ["status", "-sb"]).stdout;
    const headSummary = runGit(root, ["log", "--oneline", "--decorate", "-1"]).stdout;
    const baseOk = runGit(root, ["rev-parse", "--verify", "--quiet", resolvedBase.base], { allowFailure: true }).ok;
    const baseCommit = baseOk ? runGit(root, ["rev-parse", resolvedBase.base]).stdout : "";
    const headCommit = runGit(root, ["rev-parse", "HEAD"]).stdout;
    const baseIsAncestor = baseOk
      ? runGit(root, ["merge-base", "--is-ancestor", resolvedBase.base, "HEAD"], { allowFailure: true }).ok
      : false;
    const collapsedLog = baseOk
      ? runGit(root, ["log", "--oneline", "--decorate", `${resolvedBase.base}..HEAD`], { allowFailure: true }).stdout
      : "";
    const collapsedCount = collapsedLog ? collapsedLog.split("\n").filter(Boolean).length : 0;
    const diffStat = baseOk
      ? runGit(root, ["diff", "--stat", `${resolvedBase.base}...HEAD`], { allowFailure: true }).stdout
      : "";
    const existingBackups = runGit(root, ["branch", "--list", "backup/*"], { allowFailure: true }).stdout;
    const backup = chooseBackup(existingBackups, now);

    const { slug, drafts } = findDrafts(root, branch);
    const explicitDraft = args.prDraft && explicitDraftSafe
      ? relativeOperationalPath(root, explicitDraftAbs)
      : "";
    const resolvedDraft = args.prDraft ? explicitDraft : drafts[0]?.rel || "";
    const resolvedDraftAbs = resolvedDraft ? path.resolve(root, resolvedDraft) : "";
    const draftExists = resolvedDraftAbs ? existsSync(resolvedDraftAbs) : false;
    const realDraftSafe = !draftExists
      || realpathSync(resolvedDraftAbs).startsWith(realRootPrefix);
    const draftSafe = explicitDraftSafe && realDraftSafe;
    const draftContent = draftExists && draftSafe ? readFileSync(resolvedDraftAbs) : null;
    const draftSha256 = draftContent ? digest(draftContent) : "";
    const draftStatus = explicitDraft
      ? draftExists ? "The explicitly selected PR draft exists." : "The explicitly selected PR draft was not found."
      : resolvedDraft
        ? "Resolved the latest PR draft candidate matching the current branch."
        : "No PR draft candidate matching the current branch was found.";
    const dirty = hasDirtyStatus(status);
    const frozen = branch.endsWith("-done");
    const blockers = [];
    if (!baseOk) blockers.push(`base was not found: ${resolvedBase.base}`);
    if (!branch) blockers.push("current branch is detached or unresolved");
    if (frozen) blockers.push(`current branch is frozen: ${branch}`);
    if (!baseIsAncestor) blockers.push(`base is not an ancestor of HEAD: ${resolvedBase.base}`);
    if (collapsedCount === 0) blockers.push(`no commits to collapse from ${resolvedBase.base} to HEAD`);
    if (!draftSafe) blockers.push("PR draft must stay inside the repository");
    if (!resolvedDraft || !draftExists) blockers.push("PR draft is unresolved or missing");
    if (dirty && !args.allowDirty) blockers.push("working tree contains unconfirmed changes");

    const common = {
      status: blockers.length === 0 ? "preflight-ok" : "not-applied",
      mode: args.apply ? "apply" : "preflight",
      readonly: !args.apply,
      repository: path.basename(root),
      remote,
      base: resolvedBase.base,
      base_source: resolvedBase.source,
      base_commit: baseCommit || null,
      base_exists: baseOk,
      base_is_ancestor: baseIsAncestor,
      head: headCommit,
      head_summary: headSummary,
      commits_to_collapse: collapsedCount,
      commits_log: collapsedLog,
      diff_stat: diffStat,
      branch: branch || null,
      frozen,
      branch_slug: slug || null,
      pr_draft: resolvedDraft || null,
      pr_draft_sha256: draftSha256 || null,
      pr_draft_status: draftStatus,
      pr_draft_safe: draftSafe,
      backup_branch: backup,
      dirty,
      status_summary: status,
      draft_candidates: drafts.slice(0, 10).map(({ rel, timestamp }) => ({ path: rel, timestamp })),
      blockers,
      apply_arguments: resolvedDraft && baseOk
        ? ["--remote", remote, "--base", resolvedBase.base, "--pr-draft", resolvedDraft, "--apply"]
        : [],
      mutation_invoked: false,
    };
    if (!args.apply) return common;
    if (blockers.length > 0) throw new Error(`Cannot apply: ${blockers.join("; ")}`);

    const applyBranch = runGit(root, ["branch", "--show-current"], { allowFailure: true }).stdout;
    const applyHead = runGit(root, ["rev-parse", "HEAD"]).stdout;
    const applyBase = runGit(root, ["rev-parse", resolvedBase.base]).stdout;
    const applyBaseIsAncestor = runGit(root, ["merge-base", "--is-ancestor", resolvedBase.base, "HEAD"], {
      allowFailure: true,
    }).ok;
    const applyStatus = runGit(root, ["status", "-sb"]).stdout;
    const applyDraftContent = readFileSync(resolvedDraftAbs);
    const applyDraftSha256 = digest(applyDraftContent);
    if (applyBranch !== branch || applyHead !== headCommit || applyBase !== baseCommit
      || !applyBaseIsAncestor || applyStatus !== status || applyDraftSha256 !== draftSha256) {
      throw new Error("Cannot apply because branch, HEAD, base, ancestry, worktree, index, or PR draft changed after preflight.");
    }

    runGit(root, ["branch", backup, "HEAD"]);
    mutationInvoked = true;
    const backupHead = runGit(root, ["rev-parse", backup]).stdout;
    if (backupHead !== applyHead) {
      throw new Error("Backup branch does not point to the reviewed pre-reset HEAD");
    }
    runGit(root, ["reset", "--soft", baseCommit]);
    runGit(root, ["commit", "-F", "-"], { input: applyDraftContent });

    return {
      ...common,
      status: "recommitted",
      readonly: false,
      mutation_invoked: true,
      new_head: runGit(root, ["rev-parse", "HEAD"]).stdout,
      new_head_summary: runGit(root, ["log", "--oneline", "--decorate", "-1"]).stdout,
      final_status: runGit(root, ["status", "-sb"]).stdout,
    };
  } catch (error) {
    throw asFailure(error, mutationInvoked);
  }
}

function formatResult(result) {
  const candidates = result.draft_candidates.map(
    (draft) => `\`${draft.path}\` (${draft.timestamp})`,
  );
  const text = `# PR Soft Reset Recommit ${result.mode === "apply" ? "Apply" : "Preflight"}

${result.mode === "apply"
  ? "Apply mode was requested. This helper may perform a local-only history rewrite after validation. It never pushes, creates a PR, merges a PR, or changes remotes."
  : "This helper is read-only. It did not create branches, reset commits, commit changes, push, or modify files."}

## Resolved Inputs

- base: \`${result.base}\` (${result.base_exists ? "exists" : "not found"})
- base resolution remote: \`${result.remote}\`
- base source: ${result.base_source}
- base commit: \`${result.base_commit || "unresolved"}\`
- HEAD commit: \`${result.head}\`
- base is ancestor of HEAD: ${result.base_is_ancestor ? "`yes`" : "`no`"}
- commits to collapse: \`${result.commits_to_collapse}\`
- current branch: \`${result.branch || "(detached or unknown)"}\`
- frozen branch: ${result.frozen ? "`yes`" : "`no`"}
- branch slug: \`${result.branch_slug || "(none)"}\`
- PR draft: ${result.pr_draft ? `\`${result.pr_draft}\`` : "`unresolved`"}
- PR draft SHA-256: \`${result.pr_draft_sha256 || "unresolved"}\`
- PR draft status: ${result.pr_draft_status}
- backup branch candidate: \`${result.backup_branch}\`
- dirty status: ${result.dirty ? "`yes`" : "`no`"}

## Status

\`\`\`text
${result.status_summary || "(empty)"}
\`\`\`

## HEAD

\`\`\`text
${result.head_summary || "(empty)"}
\`\`\`

## Commits To Collapse

\`\`\`text
${result.base_exists ? result.commits_log || "(none)" : "base was not found; skipped"}
\`\`\`

## Diff Stat

\`\`\`text
${result.base_exists ? result.diff_stat || "(empty)" : "base was not found; skipped"}
\`\`\`

## Branch-Matching PR Draft Candidates

${listBlock(candidates)}

## Command Shape After Explicit Approval

\`\`\`sh
git branch ${shellQuote(result.backup_branch)} HEAD && git reset --soft ${shellQuote(result.base)}
git commit -F ${result.pr_draft ? shellQuote(result.pr_draft) : "<PR_DRAFT>"}
\`\`\`
`;
  if (result.mode !== "apply" || result.status !== "recommitted") return text;
  return `${text}
## Apply Result

- backup branch created: \`${result.backup_branch}\`
- committed with PR draft: \`${result.pr_draft}\`
- new HEAD:

\`\`\`text
${result.new_head_summary || "(empty)"}
\`\`\`

- final status:

\`\`\`text
${result.final_status || "(empty)"}
\`\`\`
`;
}

export function main(argv = process.argv.slice(2), dependencies = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage);
    return;
  }
  console.log(formatResult(runRecommit(args, dependencies)));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error(usage);
    process.exitCode = 1;
  }
}
