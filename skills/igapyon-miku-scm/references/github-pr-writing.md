# GitHub PR Writing

Rules for drafting a GitHub pull request title and body.

## When To Use

Use PR mode when the user asks for a GitHub pull request title and body from a commit, commit range, branch diff, or other Git evidence.

After `igapyon-miku-scm` is active, enter PR mode for similar wording such as `pr textつくりたい`, `PR文面を作りたい`, `PRタイトルと本文を作りたい`, `pull request text`, `pull request本文`, `プルリク説明`, or `PR説明文`.

## Target Rules

- If the user asks for PR text without a commit ID, commit range, branch comparison, or explicit working-tree target, first run `git log --oneline --decorate -1` to resolve the current latest commit ID.
- Use the commit ID shown by that command as the single commit PR target.
- Interpret that default as `<resolved-commit>^..<resolved-commit>` for the change content, and inspect the single commit `<resolved-commit>`.
- This default means committed history only. Do not include uncommitted working-tree changes unless the user explicitly asks for them.
- If the user says `対象コミット <commit> における変更内容`, draft from exactly that commit.
- Do not include parent commits, child commits, additional ranges, or the current working tree unless the user explicitly asks for them.
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
- first line: PR title text only, without a heading marker or label
- following content: PR body Markdown
- final wrapper: one block from `~~~~markdown` to `~~~~`
- source of facts: the current conversation, the user's input, and inspected local Git evidence only

Do not add artificial labels or headings such as `# PR Title`, `# PR Body`, `PR Title:`, or `PR Body:`. The drafted text should be directly usable as the PR title and PR body content.

## Drafting Rules

Draft for reviewers:

- summarize what changed
- group related implementation, documentation, and generated-file changes
- mention verification only when evidence shows it was run
- do not add a fixed `テスト実行: 未確認` line by default
- mention missing or uncertain verification only when it is necessary for the PR text
- do not describe user impact, behavior, or motivation unless supported by the inspected evidence or user input

## Issue Linking

- Read [github-anonymous-readonly.md](github-anonymous-readonly.md) and use its local open-Issue cache before downloading Issue data. Compare the resolved PR evidence with cached Issue titles, bodies, and stated completion conditions.
- When the evidence clearly completes an Issue, add a final `## 関連Issue` section containing `Closes #<issue-number>`, even when the user did not supply the number.
- When the evidence only partially addresses or otherwise relates to an Issue, use `Refs #<issue-number>` instead of a closing keyword.
- When multiple Issues are plausible or completion is ambiguous, show the candidates and ask the human before adding a closing reference. Do not silently choose one.
- When no Issue matches, omit `## 関連Issue`. When matching is unavailable or based on a stale fallback cache, disclose that limitation instead of guessing a closing reference.
- Use one reference for each Issue independently supported by the inspected evidence. Do not infer Issue numbers from branch names, commit messages, diffs alone, or nearby GitHub activity; the Issue title or body must substantively match the change.
- An Issue explicitly identified by the user still requires classifying the change as completing or merely relating to it before choosing `Closes` or `Refs`.
- Treat automatic Issue closure as best effort. Do not require confirmation that GitHub closed the Issue before completing the PR drafting workflow; the user may close it manually if necessary.

## Output Shape

Use this output shape:

```markdown
...

## 概要

...

## 変更内容

- ...
```

Add a `## 確認事項` section only when there are material unresolved items that should be shown in the PR text.

When an Issue link applies, place `## 関連Issue` after the other PR body sections:

```markdown
## 関連Issue

Closes #11
```
