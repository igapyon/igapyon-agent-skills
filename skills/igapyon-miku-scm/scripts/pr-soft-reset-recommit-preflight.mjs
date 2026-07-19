#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs [--base <base>] [--pr-draft <path>] [--repo <path>] [--apply] [--allow-dirty]

By default this is a read-only helper. It resolves PR draft candidates, backup
branch names, and Git evidence for PR Soft Reset Recommit mode.

With --apply, it performs the local-only rewrite:
  git branch <backup> HEAD
  git reset --soft <base>
  git commit -F <pr-draft>

It never pushes, creates PRs, merges PRs, or changes remotes.`;

function parseArgs(argv) {
  const args = { repo: process.cwd(), base: "", prDraft: "" };
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
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--allow-dirty") {
      args.allowDirty = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function git(repo, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8",
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

function prescribedBaseCandidate(branch) {
  const match = branch.match(/^(.*)-tiga\d{4}[a-x][a-j][a-j]$/);
  return match?.[1] ? `origin/${match[1]}` : "";
}

function refExists(root, ref) {
  return git(root, ["rev-parse", "--verify", "--quiet", ref], { allowFailure: true }).ok;
}

function resolveDefaultBase(root, branch) {
  const upstream = git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFailure: true,
  });
  if (upstream.ok && upstream.stdout && !remoteBranchIsCurrentFeature(upstream.stdout, branch)) {
    return { base: upstream.stdout, source: "current branch upstream" };
  }

  const prescribedBase = prescribedBaseCandidate(branch);
  if (prescribedBase && refExists(root, prescribedBase)) {
    return { base: prescribedBase, source: "base encoded by current work-branch name" };
  }

  const remoteHead = git(root, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], {
    allowFailure: true,
  });
  if (remoteHead.ok && remoteHead.stdout.startsWith("refs/remotes/")) {
    return {
      base: remoteHead.stdout.replace(/^refs\/remotes\//, ""),
      source: "local origin/HEAD",
    };
  }

  if (refExists(root, "origin/devel")) {
    return { base: "origin/devel", source: "local origin/devel fallback" };
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

function ymdhm(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

function findDrafts(root, branch) {
  const slug = slugBranch(branch);
  if (!slug) return { slug, drafts: [] };

  const dirs = [
    { rel: "workplace/miku-scm", priority: 0 },
    { rel: "temp/miku-scm", priority: 0 },
    { rel: "workplace/github-writer", priority: 1 },
    { rel: "temp/github-writer", priority: 1 },
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
        rel: path.relative(root, absolute),
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

function chooseBackup(existingBranches) {
  const base = `backup/${ymdhm(new Date())}`;
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
  return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : "- なし";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage);
    return;
  }

  const root = git(args.repo, ["rev-parse", "--show-toplevel"]).stdout;
  const branch = git(root, ["branch", "--show-current"], { allowFailure: true }).stdout;
  const resolvedBase = args.base
    ? { base: args.base, source: "explicit --base" }
    : resolveDefaultBase(root, branch);
  if (!resolvedBase.base) {
    throw new Error("Could not resolve base from --base, current branch upstream, local origin/HEAD, or origin/devel.");
  }
  const status = git(root, ["status", "-sb"]).stdout;
  const head = git(root, ["log", "--oneline", "--decorate", "-1"]).stdout;
  const baseOk = git(root, ["rev-parse", "--verify", "--quiet", resolvedBase.base], { allowFailure: true }).ok;
  const baseCommit = baseOk ? git(root, ["rev-parse", resolvedBase.base]).stdout : "";
  const headCommit = git(root, ["rev-parse", "HEAD"]).stdout;
  const baseIsAncestor = baseOk
    ? git(root, ["merge-base", "--is-ancestor", resolvedBase.base, "HEAD"], { allowFailure: true }).ok
    : false;
  const collapsedLog = baseOk
    ? git(root, ["log", "--oneline", "--decorate", `${resolvedBase.base}..HEAD`], { allowFailure: true }).stdout
    : "";
  const collapsedCount = collapsedLog ? collapsedLog.split("\n").filter(Boolean).length : 0;
  const diffStat = baseOk
    ? git(root, ["diff", "--stat", `${resolvedBase.base}...HEAD`], { allowFailure: true }).stdout
    : "";
  const existingBackups = git(root, ["branch", "--list", "backup/*"], { allowFailure: true }).stdout;
  const backup = chooseBackup(existingBackups);

  const { slug, drafts } = findDrafts(root, branch);
  const explicitDraft = args.prDraft ? path.relative(root, path.resolve(root, args.prDraft)) : "";
  const resolvedDraft = explicitDraft || drafts[0]?.rel || "";
  const resolvedDraftAbs = resolvedDraft ? path.resolve(root, resolvedDraft) : "";
  const draftExists = resolvedDraftAbs ? existsSync(resolvedDraftAbs) : false;
  const draftStatus = explicitDraft
    ? draftExists ? "明示指定された PR draft が存在します。" : "明示指定された PR draft が見つかりません。"
    : resolvedDraft
      ? "現在ブランチに一致する最新 PR draft 候補を解決しました。"
      : "現在ブランチに一致する PR draft 候補が見つかりません。";
  const dirty = hasDirtyStatus(status);
  const frozen = branch.endsWith("-done");

  console.log(`# PR Soft Reset Recommit ${args.apply ? "Apply" : "Preflight"}

${args.apply
  ? "Apply mode was requested. This helper may perform a local-only history rewrite after validation. It never pushes, creates a PR, merges a PR, or changes remotes."
  : "This helper is read-only. It did not create branches, reset commits, commit changes, push, or modify files."}

## Resolved Inputs

- base: \`${resolvedBase.base}\` (${baseOk ? "exists" : "not found"})
- base source: ${resolvedBase.source}
- base commit: \`${baseCommit || "unresolved"}\`
- HEAD commit: \`${headCommit}\`
- base is ancestor of HEAD: ${baseIsAncestor ? "`yes`" : "`no`"}
- commits to collapse: \`${collapsedCount}\`
- current branch: \`${branch || "(detached or unknown)"}\`
- frozen branch: ${frozen ? "`yes`" : "`no`"}
- branch slug: \`${slug || "(none)"}\`
- PR draft: ${resolvedDraft ? `\`${resolvedDraft}\`` : "`未解決`"}
- PR draft status: ${draftStatus}
- backup branch candidate: \`${backup}\`
- dirty status: ${dirty ? "`yes`" : "`no`"}

## Status

\`\`\`text
${status || "(empty)"}
\`\`\`

## HEAD

\`\`\`text
${head || "(empty)"}
\`\`\`

## Commits To Collapse

\`\`\`text
${baseOk ? collapsedLog || "(none)" : "base was not found; skipped"}
\`\`\`

## Diff Stat

\`\`\`text
${baseOk ? diffStat || "(empty)" : "base was not found; skipped"}
\`\`\`

## Branch-Matching PR Draft Candidates

${listBlock(drafts.slice(0, 10).map((draft) => `\`${draft.rel}\` (${draft.timestamp})`))}

## Command Shape After Explicit Approval

\`\`\`sh
git branch ${shellQuote(backup)} HEAD && git reset --soft ${shellQuote(resolvedBase.base)}
git commit -F ${resolvedDraft ? shellQuote(resolvedDraft) : "<PR_DRAFT>"}
\`\`\`
`);

  if (!args.apply) return;

  if (!baseOk) {
    throw new Error(`Cannot apply because base was not found: ${resolvedBase.base}`);
  }
  if (!branch) {
    throw new Error("Cannot apply from a detached or unresolved branch.");
  }
  if (frozen) {
    throw new Error(`Cannot apply from frozen branch: ${branch}`);
  }
  if (!baseIsAncestor) {
    throw new Error(`Cannot apply because base is not an ancestor of HEAD: ${resolvedBase.base}`);
  }
  if (collapsedCount === 0) {
    throw new Error(`Cannot apply because there are no commits to collapse from ${resolvedBase.base} to HEAD.`);
  }
  if (!resolvedDraft || !draftExists) {
    throw new Error("Cannot apply because PR draft is unresolved or missing.");
  }
  if (dirty && !args.allowDirty) {
    throw new Error("Cannot apply with existing uncommitted changes. Re-run with --allow-dirty only if those changes are intentional.");
  }

  const applyBranch = git(root, ["branch", "--show-current"], { allowFailure: true }).stdout;
  const applyHead = git(root, ["rev-parse", "HEAD"]).stdout;
  const applyBase = git(root, ["rev-parse", resolvedBase.base]).stdout;
  const applyBaseIsAncestor = git(root, ["merge-base", "--is-ancestor", resolvedBase.base, "HEAD"], {
    allowFailure: true,
  }).ok;
  if (applyBranch !== branch || applyHead !== headCommit || applyBase !== baseCommit || !applyBaseIsAncestor) {
    throw new Error("Cannot apply because branch, HEAD, base, or ancestry changed after preflight.");
  }

  git(root, ["branch", backup, "HEAD"]);
  git(root, ["reset", "--soft", resolvedBase.base]);
  git(root, ["commit", "-F", resolvedDraft]);

  const newHead = git(root, ["log", "--oneline", "--decorate", "-1"]).stdout;
  const finalStatus = git(root, ["status", "-sb"]).stdout;

  console.log(`## Apply Result

- backup branch created: \`${backup}\`
- committed with PR draft: \`${resolvedDraft}\`
- new HEAD:

\`\`\`text
${newHead || "(empty)"}
\`\`\`

- final status:

\`\`\`text
${finalStatus || "(empty)"}
\`\`\`
`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error(usage);
  process.exitCode = 1;
}
