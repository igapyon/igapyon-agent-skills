---
name: igapyon-miku-scm
description: Use only when the user explicitly names `igapyon-miku-scm`, explicitly asks to apply the miku SCM workflow, or explicitly asks to perform Git, GitHub writing, GitHub Release, repository-maintenance, or version-management work under miku-soft SCM rules. Supports PR, Release, About, and public GitHub Issue drafting; human-approved Issue and optional sub-Issue creation, title/body/existing-label updates, comments, standalone existing-label changes, and closure through narrowly documented `gh` workflows; PR soft-reset recommit; backup, branch-status, and three-stage local repository-maintenance workflows; date-based and Semantic Version increments; and READONLY version, tag, Release, and asset audits. Do not activate for generic Git or GitHub questions, ordinary repository inspection, or release-note writing outside an explicit miku-soft SCM request.
---

# igapyon-miku-scm

Run documented miku-soft source-control workflows with a small runtime context.
Detailed policy remains under `references/` for design, maintenance, legacy
operations, and exceptions; migrated workflows execute through the fixed runner.

## Current Scope

Support repository status and maintenance; PR, Release, About, and Issue work;
recommit, publication, backup, and post-merge work; version and release audits;
and deterministic READONLY, preflight, and apply workflows.

## Activation-Only Fast Path

If no concrete SCM task is given, acknowledge activation and ask what is wanted.
Do not inspect the repository or load detailed references yet.

## Runtime Kernel

1. Identify the exact repository and classify the request with
   [scripts/miku-scm-workflow-manifest.mjs](scripts/miku-scm-workflow-manifest.mjs).
2. For an ID in that manifest, invoke
   [scripts/miku-scm-run.mjs](scripts/miku-scm-run.mjs) directly with that ID
   and fixed options. Do not read its detailed Markdown during normal execution.
3. Never issue `gh` directly. GitHub CLI access is allowed only inside the
   fixed bundled helpers. If no fixed helper or anonymous REST route exists,
   stop instead of inventing a command.
4. A READONLY result or preflight does not authorize mutation. Local rewrite,
   tracked-content change, remote mutation, deletion, tag change, Release
   publication, and version change each require the matching explicit request
   and workflow gate. Approval never transfers between workflows.
5. Before tracked-content mutation or an ordinary commit, inspect the current
   branch and worktree. Do not mutate a `-done` branch. Preserve unrelated
   changes. Operational drafts and workflows with their own branch checks keep
   those documented rules.
6. Apply must consume the unchanged reviewed artifact and expected digest when
   its workflow defines one. Never retry an unresolved mutation automatically.
7. Report inspected, changed, and pending work. Keep tag recommendation
   separate from tag mutation; normal tag handoff is GitHub's Release UI.

The generated lock
[scripts/miku-scm-workflow-contract-lock.mjs](scripts/miku-scm-workflow-contract-lock.mjs)
binds each workflow ID, contract version, runner, normative spec, contract test,
and SHA-256 pair. Runtime results expose the contract identity. The generated
[references/workflow-contracts.md](references/workflow-contracts.md) is for
human inspection; neither generated file is hand-maintained.

## Detailed Routes

Read detailed references only for work that is not a migrated runner execution:

- **Status, maintenance, backup, or standalone branch work**:
  `local-git-readonly.md`, `github-branch-status.md`,
  `repository-maintenance.md`, or the exact backup reference.
- **PR, Release, About, URL, tag, or public inspection writing**:
  `github-writing-rules.md` plus the exact topic reference. PR Issue matching
  also uses `github-anonymous-readonly.md` and `github-issues-cache.mjs`.
- **Issue drafting or migrated mutation**: `github-issue-rewrite-handoff.md`
  for writing judgment; route create/update/comment/label/close preflight and
  apply through their fixed runner IDs. Read the exact reference only for
  drafting, design, recovery, or an exceptional legacy invocation.
- **Version/tag/Release audit, increment, add, or commit**: the exact
  `version-*`, `github-release-tag-handoff.md`, and
  `repository-precommit-checks.md` references required by that operation.
- **Runner design, performance, failure paths, or contract maintenance**:
  `workflow-routing.md`, `deterministic-workflow-runner.md`,
  `performance-benchmark.md`, `runtime-and-test-suites.md`,
  `safety-cost-and-errors.md`, and `scm-rules.md` as relevant. Regenerate
  contracts with `node scripts/miku-scm-workflow-contracts.mjs`; verify drift
  with the same command plus `--check`.
- **Legacy or exceptional behavior not encoded by a migrated runner**: read
  `scm-rules.md` and the exact workflow reference before acting.

Use only this skill's integrated helpers while miku-scm is active. Do not
silently synchronize or overwrite `igapyon-github-writer`. Apply
`igapyon-repo-conventions` only when explicitly requested.

## Verification

Use fast tests while iterating and the full miku-scm suite before handoff.
Run the contract drift check, `git status -sb`, and review the relevant diff.
Do not revert unrelated changes.
