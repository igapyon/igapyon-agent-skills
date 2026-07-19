---
name: igapyon-miku-scm
description: Use only when the user explicitly names `igapyon-miku-scm`, explicitly asks to apply the miku SCM workflow, or explicitly asks to perform Git, GitHub, GitHub Release, or version-management work under miku-soft SCM rules. Supports date-based and Semantic Version increments, public GitHub Issue rewrite handoffs, and READONLY audits that compare committed package or Maven versions with tags, Releases, and required distribution assets. Do not activate for generic Git or GitHub questions, ordinary repository inspection, or release-note writing.
---

# igapyon-miku-scm

Guide source control management for miku-soft projects.

Keep this skill small and add concrete workflows incrementally. Put detailed Git, GitHub, release, and version-management rules under `references/` instead of expanding this file.

## Current Scope

Support documented workflows and read-only inspection for:

- Git operations
- GitHub operations
- local repository GitHub URL resolution
- public GitHub Issue rewrite handoff for human updates
- GitHub Releases
- version, tag, Release, and distribution-asset consistency audits
- date-based and semantic version increment workflows

Do not perform remote mutations, history rewrites, tag changes, release publication, or version changes until the relevant workflow is explicitly documented under `references/` and the user explicitly requests the operation.

## Core Workflow

1. Identify the requested SCM area and exact target repository.
2. Inspect repository state before proposing or performing work.
3. Read [references/scm-rules.md](references/scm-rules.md).
4. For local Git status inspection, read [references/local-git-readonly.md](references/local-git-readonly.md).
5. For a local repository GitHub URL query, read [references/github-repository-url.md](references/github-repository-url.md).
6. For a public GitHub Issue rewrite that a human will paste into GitHub, read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md) and [references/github-issue-rewrite-handoff.md](references/github-issue-rewrite-handoff.md).
7. For a version, tag, Release, and distribution-asset consistency audit, read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md) and [references/version-tag-release-audit.md](references/version-tag-release-audit.md).
8. For a requested version increment, read [references/version-increment.md](references/version-increment.md).
9. For other public GitHub source, branch, Issue, or Release inspection, read [references/github-anonymous-readonly.md](references/github-anonymous-readonly.md).
10. Before any requested `git add` or `git commit`, read and follow [references/version-increment-confirmation.md](references/version-increment-confirmation.md).
11. Preserve unrelated user changes.
12. Separate local preparation from remote GitHub operations.
13. Report what was inspected, changed, and left pending.

## Boundaries

- Handle only the documented public GitHub Issue rewrite handoff in this skill. Treat commit-message composition and other SCM-facing writing, including GitHub PR, Release, and About text, as the responsibility of `igapyon-github-writer`. Use that skill only when it is explicitly requested and within its supported workflow contract.
- Use `igapyon-repo-conventions` for repository layout and repository-side convention work when that skill is explicitly requested.
- Keep SCM policy and SCM execution rules in this skill.

## Verification

Before finishing, run `git status -sb` and review any relevant diff. Do not revert unrelated changes.
