# GitHub PR Writing

Rules for drafting a GitHub pull request title and body.

## When To Use

Use PR mode when the user asks for a GitHub pull request title and body from a commit, commit range, branch diff, or other Git evidence.

After `igapyon-github-writer` is active, enter PR mode for similar wording such as `pr textつくりたい`, `PR文面を作りたい`, `PRタイトルと本文を作りたい`, `pull request text`, `pull request本文`, `プルリク説明`, or `PR説明文`.

## Target Rules

- A commit ID or explicit Git range is required input for PR drafting.
- If the user asks for PR text without a commit ID, commit range, branch comparison, or explicit working-tree target, ask for the target before drafting.
- In that case, ask briefly in Japanese, for example: `対象コミットID、Git範囲、またはブランチ比較を教えてください。`
- If the user says `対象コミット <commit> における変更内容`, draft from exactly that commit.
- Do not include parent commits, child commits, `HEAD`, or the current working tree unless the user explicitly asks for them.
- If the user gives a commit range, use that range exactly after applying the shared target-resolution rules.
- If the PR target cannot be resolved from the request, ask for the commit, range, or branch comparison before drafting.

## Canonical Request Pattern

This skill must preserve the behavior of this common user request:

```text
対象コミット `<commit>` における変更内容について、PRタイトルとPR本文を markdown テキスト形式で作文してください。
```

Interpret that request as:

- mode: GitHub PR
- target: exactly `<commit>`
- inclusion: only the change introduced by `<commit>`
- output language: Japanese
- output format: Markdown
- required top-level headings: `# PR Title` and `# PR Body`
- final wrapper: one block from `~~~~markdown` to `~~~~`
- source of facts: the current conversation, the user's input, and inspected local Git evidence only

The final Markdown must keep the top-level headings exactly as `# PR Title` and `# PR Body` so downstream tooling can parse the response.

## Drafting Rules

Draft for reviewers:

- summarize what changed
- group related implementation, documentation, and generated-file changes
- mention verification only when evidence shows it was run
- do not add a fixed `テスト実行: 未確認` line by default
- mention missing or uncertain verification only when it is necessary for the PR text
- do not describe user impact, behavior, or motivation unless supported by the inspected evidence or user input

## Output Shape

Use this output shape:

```markdown
# PR Title

...

# PR Body

## 概要

...

## 変更内容

- ...
```

Add a `## 確認事項` section only when there are material unresolved items that should be shown in the PR text.
