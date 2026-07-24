---
name: igapyon-miku-scm
description: Use only when the user explicitly names `igapyon-miku-scm`, explicitly asks to apply the miku SCM workflow, or explicitly asks to perform Git, GitHub writing, GitHub Release, or version-management work under miku-soft SCM rules. Supports PR, Release, About, and public GitHub Issue drafting; human-approved Issue creation, title/body/existing-label updates, comments, standalone existing-label changes, and closure through narrowly documented `gh` workflows; PR soft-reset recommit; backup and branch-status workflows; date-based and Semantic Version increments; and READONLY version, tag, Release, and asset audits. Do not activate for generic Git or GitHub questions, ordinary repository inspection, or release-note writing outside an explicit miku-soft SCM request.
---

# igapyon-miku-scm

Guide source control management for miku-soft projects.

Keep this skill small and add concrete workflows incrementally. Put detailed Git, GitHub, release, and version-management rules under `references/` instead of expanding this file.

## Current Scope

Support documented workflows and read-only inspection for:

- Git operations
- GitHub operations
- local repository GitHub URL resolution
- public GitHub Issue drafting and human-approved creation, title/body/existing-label updates, comments, standalone existing-label changes, and closure
- GitHub PR, Release, and About drafting from repository evidence
- PR soft-reset recommit, local backup branch, and branch-status workflows
- GitHub Releases
- GitHub UI-first Release tag handoff for human publication
- version, tag, Release, and distribution-asset consistency audits
- date-based and semantic version increment workflows

Do not perform remote mutations, history rewrites, tag changes, release publication, or version changes until the relevant workflow is explicitly documented under `references/` and the user explicitly requests the operation.

## Activation-Only Fast Path

When the user explicitly activates `igapyon-miku-scm` but does not yet identify a concrete SCM task, repository question, or operation:

1. Acknowledge that the skill is active and ask what SCM work the user wants to perform.
2. Do not yet read [references/scm-rules.md](references/scm-rules.md) or inspect the repository branch and working tree.
3. After the user supplies a concrete request, resume at Core Workflow step 1 and complete all required reading and repository checks before inspecting further or making changes.

This fast path only defers initialization until there is enough information to classify the workflow. It does not waive any safety check or authorize local or remote mutation.

## Core Workflow

1. Identify the requested SCM area and exact target repository.
2. Read [references/scm-rules.md](references/scm-rules.md).
3. Before any GitHub CLI-backed helper workflow, read [references/github-cli-static-helper-policy.md](references/github-cli-static-helper-policy.md). Treat the helper—not `gh` itself—as the authorized command surface.
4. Immediately inspect the current branch with `git branch --show-current` and the working tree with `git status --porcelain`. Classify the requested workflow before changing branches.
5. Apply Startup Work Branch Checkout in [references/scm-rules.md](references/scm-rules.md) only before an explicitly requested workflow that will modify tracked content or create an ordinary commit. Do not create or switch branches for READONLY inspection, GitHub writing drafts saved under local operational directories, or a branch/history/publication workflow that has its own branch rules.
6. If the current branch ends in `-done`, apply the Startup Frozen Branch Guard in [references/scm-rules.md](references/scm-rules.md). READONLY inspection and local draft writing may continue there; tracked-content mutation must wait for the documented merge or recovery path.
7. Inspect repository state before proposing or performing work. Do not edit tracked files or begin a mutating workflow until the applicable branch check has completed successfully.
8. Treat general repository or branch status requests, including `リポジトリ状態`, `このリポジトリの状態`, `ブランチ状況`, `repository state`, and `branch status`, as remote-freshness checks unless the user explicitly asks for local-only inspection. Read [references/local-git-readonly.md](references/local-git-readonly.md); for the fuller branch-status report, also read [references/github-branch-status.md](references/github-branch-status.md).
9. For the integrated GitHub writing modes, read [references/github-writing-rules.md](references/github-writing-rules.md), then the requested mode: [references/github-pr-writing.md](references/github-pr-writing.md), [references/github-release-writing.md](references/github-release-writing.md), or [references/github-about-writing.md](references/github-about-writing.md). For PR Issue matching, also read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md) and use [scripts/github-issues-cache.mjs](scripts/github-issues-cache.mjs).
10. For PR soft-reset recommit, read [references/github-pr-soft-reset-recommit.md](references/github-pr-soft-reset-recommit.md) and [references/github-backup-branch.md](references/github-backup-branch.md), then use [scripts/pr-soft-reset-recommit-preflight.mjs](scripts/pr-soft-reset-recommit-preflight.mjs). After the reviewed recommit, read [references/github-post-recommit-publish.md](references/github-post-recommit-publish.md) and use [scripts/post-recommit-publish.mjs](scripts/post-recommit-publish.mjs) for the separately approved publication. For standalone backup or branch-status work, read [references/github-backup-branch.md](references/github-backup-branch.md) or [references/github-branch-status.md](references/github-branch-status.md).
11. For a local repository GitHub URL query, read [references/github-repository-url.md](references/github-repository-url.md). For a post-push PR URL report, also read [references/github-post-push-pr-url.md](references/github-post-push-pr-url.md).
12. For a new public GitHub Issue draft or an existing Issue rewrite, read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md) and [references/github-issue-rewrite-handoff.md](references/github-issue-rewrite-handoff.md). For a requested remote Issue mutation, read and use only its dedicated workflow and helper: [references/github-issue-create.md](references/github-issue-create.md) with [scripts/github-issue-create.mjs](scripts/github-issue-create.mjs), [references/github-issue-update.md](references/github-issue-update.md) with [scripts/github-issue-update.mjs](scripts/github-issue-update.mjs), [references/github-issue-comment.md](references/github-issue-comment.md) with [scripts/github-issue-comment.mjs](scripts/github-issue-comment.mjs), [references/github-issue-label-update.md](references/github-issue-label-update.md) with [scripts/github-issue-label-update.mjs](scripts/github-issue-label-update.mjs), or [references/github-issue-close.md](references/github-issue-close.md) with [scripts/github-issue-close.mjs](scripts/github-issue-close.mjs).
13. Treat a request about GitHub tag status, including short phrases such as `タグ状況` or `tag status`, as a version, tag, Release, and distribution-asset consistency audit unless the user explicitly narrows the scope. Read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md) and [references/version-tag-release-audit.md](references/version-tag-release-audit.md).
14. For recommended-tag guidance after push or merge, read [references/github-release-tag-handoff.md](references/github-release-tag-handoff.md). Treat GitHub Release UI creation by the human as the normal miku-soft handoff; do not present local `git tag` and tag push as the default next operation.
15. For a requested version increment, read [references/version-increment.md](references/version-increment.md).
16. For other public GitHub source, branch, Issue, or Release inspection, read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md).
17. Before any requested `git add` or `git commit`, read and follow [references/version-increment-confirmation.md](references/version-increment-confirmation.md) and [references/repository-precommit-checks.md](references/repository-precommit-checks.md). Read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md) when resolving the latest public GitHub version tag for the confirmation display.
18. Preserve unrelated user changes.
19. Separate local preparation from remote GitHub operations.
20. Report what was inspected, changed, and left pending.

## Boundaries

- Use the GitHub writing references and helper bundled in this skill when `igapyon-miku-scm` is active. Do not read, call, or depend on `skills/igapyon-github-writer` for the integrated workflow.
- Keep the standalone `igapyon-github-writer` active and unchanged for requests that explicitly invoke that skill. Treat the two implementations as independent during coexistence; improve the miku-scm copy without silently synchronizing or overwriting the standalone skill.
- Use `igapyon-repo-conventions` for repository layout and repository-side convention work when that skill is explicitly requested.
- Keep SCM policy and SCM execution rules in this skill.
- Never invoke `gh` directly as the AI Agent. Prefer fixed `gh` subcommands inside documented deterministic Node helpers; READONLY commands may run at the helper's documented inspection points, while mutations remain behind the workflow's approval boundary. Follow [references/github-cli-static-helper-policy.md](references/github-cli-static-helper-policy.md).
- Keep tag recommendation separate from tag mutation. The normal handoff is for the human to create or select the recommended tag in GitHub's Release UI.

## Verification

Before finishing, run `git status -sb` and review any relevant diff. Do not revert unrelated changes.
