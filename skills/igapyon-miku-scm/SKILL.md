---
name: igapyon-miku-scm
description: Use only when the user explicitly names `igapyon-miku-scm`, explicitly asks to apply the miku SCM workflow, or explicitly asks to perform Git, GitHub writing, GitHub Release, repository-maintenance, or version-management work under miku-soft SCM rules. Supports PR, Release, About, and public GitHub Issue drafting; human-approved Issue and optional sub-Issue creation, title/body/existing-label updates, comments, standalone existing-label changes, and closure through narrowly documented `gh` workflows; PR soft-reset recommit; backup, branch-status, and three-stage local repository-maintenance workflows; date-based and Semantic Version increments; and READONLY version, tag, Release, and asset audits. Do not activate for generic Git or GitHub questions, ordinary repository inspection, or release-note writing outside an explicit miku-soft SCM request.
---

# igapyon-miku-scm

Guide source control management for miku-soft projects.

Keep this skill small and add concrete workflows incrementally. Put detailed Git, GitHub, release, and version-management rules under `references/` instead of expanding this file.

## Current Scope

Support the documented Git and GitHub workflows: repository inspection and
maintenance; PR, Release, About, and Issue writing or mutation; PR recommit,
publication, backup, and post-merge work; version increment and release
consistency audits; URL and tag handoff; and deterministic one-shot routing for
migrated READONLY, preflight, and apply operations.

Do not perform remote mutations, history rewrites, tag changes, release publication, or version changes until the relevant workflow is explicitly documented under `references/` and the user explicitly requests the operation.

## Activation-Only Fast Path

When the user explicitly activates `igapyon-miku-scm` but does not yet identify a concrete SCM task, repository question, or operation:

1. Acknowledge activation and ask what SCM work is wanted.
2. Do not read [references/scm-rules.md](references/scm-rules.md) or inspect the repository yet.
3. Once the request is concrete, follow the complete Core Workflow.

This fast path only defers initialization until there is enough information to classify the workflow. It does not waive any safety check or authorize local or remote mutation.

## Core Workflow

1. Identify the requested SCM area and exact target repository.
2. Read [references/scm-rules.md](references/scm-rules.md).
3. Before any GitHub CLI-backed workflow, read [references/github-cli-static-helper-policy.md](references/github-cli-static-helper-policy.md). The documented helper—not direct `gh`—is the authorized command surface.
4. Inspect `git branch --show-current` and `git status --porcelain`, then classify the workflow before changing branches or tracked content.
5. Apply Startup Work Branch Checkout and the `-done` Frozen Branch Guard from [references/scm-rules.md](references/scm-rules.md). Only tracked-content mutation or an ordinary commit needs startup checkout; READONLY work, operational drafts, and workflows with their own branch rules do not.
6. Do not mutate tracked content until the applicable branch check succeeds. Read the matching route below before acting. A preflight never authorizes apply, and explicit mutation approval never transfers to another workflow.
7. Preserve unrelated changes, separate local preparation from remote operations, and report inspected, changed, and pending work.

## Routing

- **Repository or branch status** (`リポジトリ状態`, `このリポジトリの状態`,
  `ブランチ状況`, `repository state`, `branch status`): assume remote freshness
  unless explicitly local-only. Read
  [references/local-git-readonly.md](references/local-git-readonly.md), plus
  [references/github-branch-status.md](references/github-branch-status.md) for
  the full report.
- **Repository maintenance**: read
  [references/repository-maintenance.md](references/repository-maintenance.md)
  and use
  [scripts/repository-maintenance.mjs](scripts/repository-maintenance.mjs).
  Diagnosis, planning, `すすめて`, and `整理して` never approve deletion.
- **Migrated runner workflow**: read
  [references/workflow-routing.md](references/workflow-routing.md) and
  [references/deterministic-workflow-runner.md](references/deterministic-workflow-runner.md);
  invoke [scripts/miku-scm-run.mjs](scripts/miku-scm-run.mjs) with one
  documented ID and fixed options. Legacy helpers remain authoritative.
  `repository.status` additionally routes to
  [references/local-git-snapshot.md](references/local-git-snapshot.md);
  `github.read.batch` to
  [references/github-readonly-cache.md](references/github-readonly-cache.md).
- **Runner performance or implementation**: for measurement, read
  [references/performance-benchmark.md](references/performance-benchmark.md)
  and use
  [scripts/miku-scm-benchmark.mjs](scripts/miku-scm-benchmark.mjs), keeping
  scenarios remote-free and cold/warm results separate. For code changes, read
  [references/runtime-and-test-suites.md](references/runtime-and-test-suites.md),
  use fast tests while iterating and the full suite before handoff, and also
  read [references/safety-cost-and-errors.md](references/safety-cost-and-errors.md)
  for command-cost or failure-path changes.
- **PR, Release, or About writing**: read
  [references/github-writing-rules.md](references/github-writing-rules.md),
  then [references/github-pr-writing.md](references/github-pr-writing.md),
  [references/github-release-writing.md](references/github-release-writing.md),
  or [references/github-about-writing.md](references/github-about-writing.md).
  PR Issue matching also requires
  [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md)
  and [scripts/github-issues-cache.mjs](scripts/github-issues-cache.mjs).
- **PR recommit and publication**: read
  [references/github-pr-soft-reset-recommit.md](references/github-pr-soft-reset-recommit.md)
  and [references/github-backup-branch.md](references/github-backup-branch.md).
  Route inspection to `pr.recommit.preflight` and the explicit rewrite to
  `pr.recommit.apply`; the authoritative delegate is
  [scripts/pr-soft-reset-recommit-preflight.mjs](scripts/pr-soft-reset-recommit-preflight.mjs).
  Then read
  [references/github-post-recommit-publish.md](references/github-post-recommit-publish.md):
  create the saved plan with `pr.publish.preflight`, and only after `ok push`
  apply that unchanged reviewed plan with `pr.publish.apply`. The delegate is
  [scripts/post-recommit-publish.mjs](scripts/post-recommit-publish.mjs).
  Standalone backup or branch status uses its matching reference.
- **Post-merge next work**: only after the human reports the PR merged, route
  `repository.post-merge.next-work` through the runner with
  `--confirmed-merged --apply`. Its authoritative delegate is
  [scripts/post-merge-next-work.mjs](scripts/post-merge-next-work.mjs); do not
  issue a separate `git switch -c`.
- **Issue work**: generic retrieval uses the fixed helper from
  [references/github-cli-static-helper-policy.md](references/github-cli-static-helper-policy.md).
  Drafting or rewriting also reads
  [references/github-issue-rewrite-handoff.md](references/github-issue-rewrite-handoff.md).
  Remote mutation must use only the matching pair:
  [create](references/github-issue-create.md) /
  [scripts/github-issue-create.mjs](scripts/github-issue-create.mjs),
  [update](references/github-issue-update.md) /
  [scripts/github-issue-update.mjs](scripts/github-issue-update.mjs),
  [comment](references/github-issue-comment.md) /
  [scripts/github-issue-comment.mjs](scripts/github-issue-comment.mjs),
  [label](references/github-issue-label-update.md) /
  [scripts/github-issue-label-update.mjs](scripts/github-issue-label-update.mjs),
  or [close](references/github-issue-close.md) /
  [scripts/github-issue-close.mjs](scripts/github-issue-close.mjs).
- **Version and release state**: `タグ状況` or `tag status` means the full
  version/tag/Release/asset audit unless narrowed. Read
  [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md)
  and [references/version-tag-release-audit.md](references/version-tag-release-audit.md).
  Local version status or candidate validation first uses
  [references/version-workflow-runner.md](references/version-workflow-runner.md).
  An explicitly requested version increment then uses
  [references/version-increment.md](references/version-increment.md).
  Recommended-tag guidance uses
  [references/github-release-tag-handoff.md](references/github-release-tag-handoff.md);
  GitHub Release UI is the normal human handoff, not local tag creation/push.
- **Add or commit**: first read
  [references/version-increment-confirmation.md](references/version-increment-confirmation.md)
  and [references/repository-precommit-checks.md](references/repository-precommit-checks.md);
  use the anonymous-read reference to resolve the latest public version tag.
- **URL or other public GitHub inspection**: local repository URL uses
  [references/github-repository-url.md](references/github-repository-url.md);
  post-push PR URL also uses
  [references/github-post-push-pr-url.md](references/github-post-push-pr-url.md).
  Other public source, branch, or Release inspection uses
  [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md).

## Boundaries

- Use the GitHub writing references and helper bundled in this skill when `igapyon-miku-scm` is active. Do not read, call, or depend on `skills/igapyon-github-writer` for the integrated workflow.
- Keep the standalone `igapyon-github-writer` active and unchanged for requests that explicitly invoke that skill. Treat the two implementations as independent during coexistence; improve the miku-scm copy without silently synchronizing or overwriting the standalone skill.
- Use `igapyon-repo-conventions` for repository layout and repository-side convention work when that skill is explicitly requested.
- Keep SCM policy and SCM execution rules in this skill.
- `gh` is prohibited as a direct AI Agent command in every workflow, including READONLY inspection. Do not use direct `gh` as a fallback when no helper exists. Invoke `gh` only indirectly through a documented deterministic Node helper with a fixed, validated command surface; otherwise use the documented anonymous REST route or stop and report that no authorized helper exists. Before using any GitHub CLI capability, read [references/github-cli-static-helper-policy.md](references/github-cli-static-helper-policy.md). READONLY commands may run only at the helper's documented inspection points, while mutations remain behind the workflow's approval boundary.
- Keep tag recommendation separate from tag mutation. The normal handoff is for the human to create or select the recommended tag in GitHub's Release UI.

## Verification

Before finishing, run `git status -sb` and review any relevant diff. Do not revert unrelated changes.
