---
name: igapyon-github-writer
description: Use only when the user explicitly asks to draft GitHub PR text, GitHub Release notes, or GitHub About text from repository evidence, or explicitly mentions igapyon-github-writer. If the user only asks whether such a skill exists, mention this skill as an available option but do not apply it until asked.
---

# igapyon-github-writer

This skill drafts Markdown text for GitHub surfaces from local repository evidence.

Use it only for writing text to paste into GitHub. Do not create PRs, tags, releases, issues, branches, commits, or remote changes unless the user separately asks for that operation.

Do not use this skill for generic commit summaries, changelogs, or repository cleanup unless the user explicitly asks for GitHub PR, GitHub Release, GitHub About text, or names this skill.

If the user asks whether there is a skill for GitHub PR, Release, or About text, mention this skill as an available option, but do not apply it until the user asks to use it.

## Mode Phrases

After this skill is active, choose the workflow mode from the user's wording. The wording does not need to exactly say `pr text` or `release text`; similar phrases are enough.

Examples:

- PR mode: `pr textつくりたい`, `PR文面を作りたい`, `pull request本文`, `プルリク説明`, `PRタイトルと本文`
- Release mode: `release textつくりたい`, `リリース文を作りたい`, `release notes`, `リリースノート`, `GitHub Release本文`
- About mode: `GitHub Aboutを書きたい`, `About文`, `リポジトリ説明`, `GitHub説明文`

If the mode is clear but required evidence is missing, do not draft yet. Ask for the missing target:

- PR mode: ask for the target commit ID, explicit Git range, or branch comparison.
- Release mode: ask for the start commit ID, explicit Git range, or tag/range target.
- About mode: ask whether to use `README.md` and project metadata, or ask for the source text when repository evidence is not obvious.

## Core Workflow

1. Identify whether the request is for PR, Release, or About text.
2. Read [references/github-writing-rules.md](references/github-writing-rules.md) before drafting.
3. Read the mode-specific reference: [references/pr-writing.md](references/pr-writing.md), [references/release-writing.md](references/release-writing.md), or [references/about-writing.md](references/about-writing.md).
4. Inspect only the repository evidence needed for the requested mode.
5. Draft from evidence without inventing unsupported facts.
6. Return the final Markdown block using the format required by the references.

## Reference Use

Use [references/github-writing-rules.md](references/github-writing-rules.md) for shared evidence collection and hallucination-prevention rules.

Use these mode-specific references:

- [references/pr-writing.md](references/pr-writing.md) for GitHub PR title and body drafting
- [references/release-writing.md](references/release-writing.md) for GitHub Release title and body drafting
- [references/about-writing.md](references/about-writing.md) for GitHub About text drafting

Use `index.json` as the discovery index when you need to confirm the available bundled reference files, but treat `SKILL.md` and files under `references/` as the source of truth.

Keep this `SKILL.md` lean. Put detailed commands, output shapes, and mode-specific rules under `references/`.

## Verification

Before finishing:

- ensure the final answer contains no absolute paths, home directories, or working directories
- ensure unsupported items are marked `未確認`, `要確認`, or omitted
- ensure the final answer is wrapped with `~~~~markdown` and `~~~~`
