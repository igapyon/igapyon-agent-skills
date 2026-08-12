---
name: igapyon-github-writer
description: Use only when the user explicitly asks to draft GitHub PR text, GitHub Release notes, GitHub About text, rebuild local commits with soft reset and a drafted PR text as the commit message, create a local backup branch, or inspect the current branch status using igapyon-github-writer. If the user only asks whether such a skill exists, mention this skill as an available option but do not apply it until asked.
---

# igapyon-github-writer

This skill drafts Markdown text for GitHub surfaces from local repository evidence. It can also save drafted GitHub text to a local Markdown file, rebuild local commits with soft reset and a drafted PR text as the commit message, create a local backup branch at the current `HEAD`, and report the current branch status as preparation for GitHub writing work.

Use it only for GitHub writing text, local draft-file saving for that text, explicit PR soft-reset recommit work, explicit local backup-branch creation, and the local branch-status checks that prepare that writing. Do not create PRs, tags, releases, issues, non-backup branches, or remote changes. Local commits are allowed only inside the explicit PR Soft Reset Recommit workflow.

## GitHub CLI And Network Boundary

Never invoke `gh`, either directly or through a bundled helper. This skill has
no network workflow and no remote-mutation workflow. A user request for remote
GitHub inspection or mutation does not relax this boundary; stop this skill's
workflow and report that the operation is unsupported here. Read and apply
[references/github-cli-prohibition.md](references/github-cli-prohibition.md).

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

- PR mode: if the user asks for PR text without specifying a commit ID, Git range, branch comparison, or working-tree target, run the fixed `pr.evidence` workflow without `--target`. It selects a distinct local upstream or `origin/HEAD`/`origin/devel` base when available; one commit ahead becomes a single-commit target, and two or more commits ahead become the full base-to-`HEAD` range. Do not include uncommitted working-tree changes.
- Release mode: ask for the start commit ID, explicit Git range, or tag/range target.
- About mode: use `README.md` and available `package.json` or `pom.xml` by default. Ask for source text only when repository evidence is not obvious.

## Core Workflow

1. Identify whether the request is for PR, Release, About text, PR Soft Reset Recommit, Backup Branch, or Branch Status.
2. Invoke the fixed runner workflow declared by [references/deterministic-runner.md](references/deterministic-runner.md). Treat its JSON result, fixed human summary, and returned relative paths as authoritative. Do not reconstruct its Git sequence with ad hoc shell commands.
3. For PR, Release, and About only, read the one corresponding writing reference and make exactly one AI writing pass from the bounded runner evidence. Use [references/github-writing-rules.md](references/github-writing-rules.md) only for shared writing constraints.
4. Validate and save the completed inner Markdown with `draft.validate-and-save` unless the user says not to save.
5. For backup or recommit, present the `READY FOR APPROVAL` preflight result. A later explicit approval is consumed only through the fixed approval handoff workflow; never reconstruct plan arguments or retry an apply.
6. Return the final answer using the selected mode's output requirements.

## Reference Use

Normal execution should not load detailed reference files pre-emptively. The fixed
runner carries the executable workflow contract. Open a detailed reference only
when its specific output rule, recovery rule, or a human explanation is needed.

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
- for `READY FOR APPROVAL`, show the returned handoff ID and state; use `approval.handoff.apply --apply` only after an explicit later approval, and `approval.handoff.dismiss --handoff <full-id> --apply` only to cancel it
- verify workflow contract drift with `node scripts/github-writer-workflow-contracts.mjs --check`
- ensure the static policy test proves that no runtime path invokes `gh`
- ensure successful and failed execution paths write the documented run records without changing Git evidence
- for PR, Release, and About modes, ensure the drafted Markdown is wrapped with `~~~~markdown` and `~~~~`; if a file was saved, mention only the relative saved path outside the wrapped block
