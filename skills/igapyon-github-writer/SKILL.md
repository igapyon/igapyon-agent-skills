---
name: igapyon-github-writer
description: Use only when the user explicitly asks to draft GitHub PR text, GitHub Release notes, GitHub About text, rebuild local commits with soft reset and a drafted PR text as the commit message, create a local backup branch, or inspect the current branch status using igapyon-github-writer. If the user only asks whether such a skill exists, mention this skill as an available option but do not apply it until asked.
---

# igapyon-github-writer

This skill drafts Markdown text for GitHub surfaces from local repository evidence. It can also save drafted GitHub text to a local Markdown file, rebuild local commits with soft reset and a drafted PR text as the commit message, create a local backup branch at the current `HEAD`, and report the current branch status as preparation for GitHub writing work.

Use it only for GitHub writing text, local draft-file saving for that text, explicit PR soft-reset recommit work, explicit local backup-branch creation, and the local branch-status checks that prepare that writing. Do not create PRs, tags, releases, issues, non-backup branches, commits, or remote changes unless the user separately asks for that operation.

Do not use this skill for generic commit summaries, changelogs, branch inspection, backup operations, or repository cleanup unless the user explicitly asks for GitHub PR, GitHub Release, GitHub About text, PR soft-reset recommit from drafted PR text, local backup-branch creation through this skill, branch status through this skill, or names this skill.

If the user asks whether there is a skill for GitHub PR, Release, or About text, mention this skill as an available option, but do not apply it until the user asks to use it.

## Mode Phrases

After this skill is active, choose the workflow mode from the user's wording. The wording does not need to exactly say `pr text` or `release text`; similar phrases are enough.

Examples:

- PR mode: `pr textつくりたい`, `PR文面を作りたい`, `pull request本文`, `プルリク説明`, `PRタイトルと本文`
- Release mode: `release textつくりたい`, `リリース文を作りたい`, `release notes`, `リリースノート`, `GitHub Release本文`
- About mode: `GitHub Aboutを書きたい`, `About文`, `リポジトリ説明`, `GitHub説明文`
- PR Soft Reset Recommit mode: `PR文面でsoft resetしてcommitし直す`, `PR文面をcommit messageに反映して再コミット`, `作文したPR文面でgit commitし直す`
- Backup Branch mode: `github-writerでバックアップブランチ`, `backup/2026-06-27-2230 みたいなブランチを作る`, `現在HEADをバックアップ`, `soft reset前のバックアップだけ作る`
- Branch Status mode: `github-writerでブランチ状況`, `今のブランチの状況`, `PR前にブランチ状態を見たい`, `現在ブランチの確認`

If the mode is clear but required evidence is missing, do not draft yet. Ask for the missing target, except for PR mode's default target rule:

- PR mode: if the user asks for PR text without specifying a commit ID, Git range, branch comparison, or working-tree target, use the runner's default latest-single-commit target. Do not include uncommitted working-tree changes.
- Release mode: ask for the start commit ID, explicit Git range, or tag/range target.
- About mode: use `README.md` and available `package.json` or `pom.xml` by default. Ask for source text only when repository evidence is not obvious.

## Core Workflow

1. Identify whether the request is for PR, Release, About text, PR Soft Reset Recommit, Backup Branch, or Branch Status.
2. Read [references/deterministic-runner.md](references/deterministic-runner.md) and [references/github-writing-rules.md](references/github-writing-rules.md) before acting.
3. Read the mode-specific reference: [references/pr-writing.md](references/pr-writing.md), [references/release-writing.md](references/release-writing.md), [references/about-writing.md](references/about-writing.md), [references/pr-soft-reset-recommit.md](references/pr-soft-reset-recommit.md), [references/backup-branch.md](references/backup-branch.md), or [references/branch-status.md](references/branch-status.md).
4. Invoke the fixed runner workflow. Use its structured result as the normal evidence source; do not reconstruct the same Git evidence with ad hoc shell commands.
5. For PR, Release, and About, make one AI writing pass from the bounded evidence. Do not repeatedly reread the repository unless evidence is missing or invalid.
6. Validate and save the completed inner Markdown with `draft.validate-and-save` unless the user says not to save.
7. Return the final answer using the format required by the selected reference.

## Reference Use

Use [references/github-writing-rules.md](references/github-writing-rules.md) for shared evidence collection and hallucination-prevention rules.

Use [references/deterministic-runner.md](references/deterministic-runner.md) for the workflow manifest, CLI, result schema, approval gates, and macOS/Windows 11 portability contract.

Use these mode-specific references:

- [references/pr-writing.md](references/pr-writing.md) for GitHub PR title and body drafting
- [references/release-writing.md](references/release-writing.md) for GitHub Release title and body drafting
- [references/about-writing.md](references/about-writing.md) for GitHub About text drafting
- [references/pr-soft-reset-recommit.md](references/pr-soft-reset-recommit.md) for rebuilding local commits with soft reset and a drafted PR text as the commit message
- [references/backup-branch.md](references/backup-branch.md) for creating a local backup branch at the current `HEAD`
- [references/branch-status.md](references/branch-status.md) for current branch status reporting before GitHub writing work

Use `index.json` as the discovery index when you need to confirm the available bundled reference files, but treat `SKILL.md` and files under `references/` as the source of truth.

Keep this `SKILL.md` lean. Put detailed commands, output shapes, and mode-specific rules under `references/`.

## Verification

Before finishing:

- ensure the final answer contains no absolute paths, home directories, or working directories
- ensure unsupported items are marked `未確認`, `要確認`, or omitted
- ensure runner failures are reported according to `mutation_invoked` and `retryability`; never retry an apply plan automatically
- for PR, Release, and About modes, ensure the drafted Markdown is wrapped with `~~~~markdown` and `~~~~`; if a file was saved, mention only the relative saved path outside the wrapped block
