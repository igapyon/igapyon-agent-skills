# GitHub Release Writing

Rules for drafting a GitHub Release title and body.

## When To Use

Use Release mode when the user asks for a GitHub Release title and body from commits or a commit range.

After `igapyon-github-writer` is active, enter Release mode for similar wording such as `release textつくりたい`, `リリース文を作りたい`, `GitHub Release文を作りたい`, `release notes`, `リリースノート`, `リリース本文`, or `GitHub Release本文`.

## Target Rules

- A start commit ID, commit range, or explicit tag/range target is required input for Release drafting.
- If the user asks for Release text without a start commit, commit range, tag range, or other explicit Git target, ask for the target before drafting.
- In that case, ask briefly in Japanese, for example: `開始コミットID、Git範囲、またはタグ範囲を教えてください。`
- If the user provides only a start commit ID, implicitly draft from `<start>` through `HEAD`, including the change introduced by `<start>`.
- In Release mode, `から HEAD まで` is implicit when a start commit is provided.
- Use `<start>^..HEAD` for the implicit start-through-HEAD range unless the user explicitly provides another range.
- If the user says `<start> から HEAD まで`, treat `<start>` itself as included by default unless the user explicitly says to exclude `<start>`.
- If the user gives an explicit Git range, use that range exactly after applying the shared target-resolution rules.
- If `<start>^` does not resolve because `<start>` is the root commit, inspect the root case explicitly and mark any uncertainty as `要確認`.
- Do not use the latest tag, all history, or the current working tree unless the user explicitly asks for that target.

## Canonical Request Pattern

This skill must preserve the behavior of this common user request:

```text
`<start>` から HEAD までに行われた変更(`<start>`での変更内容も含む)について、GitHub Release 用のリリースタイトルとリリース本文を markdown テキスト形式で作文してください。
```

Interpret that request as:

- mode: GitHub Release
- target: `<start>^..HEAD`
- inclusion: include the change introduced by `<start>`
- output language: Japanese
- output format: Markdown
- final wrapper: one block from `~~~~markdown` to `~~~~`
- source of facts: the current conversation, the user's input, and inspected local Git evidence only

If the request gives only `<start>` for Release drafting, apply the same target interpretation as the canonical pattern: `<start>^..HEAD`, including `<start>`.

## Drafting Rules

Draft for users:

- focus on user-visible additions, fixes, documentation, and operational changes when the evidence supports them
- avoid excessive internal implementation detail unless it is the only visible change
- do not create a version number or tag name unless the user or repository evidence provides one
- do not claim breaking changes, compatibility, migration steps, or release dates without evidence
- mention verification only when evidence shows it was run
- do not add fixed `テスト実行: 未確認` or `バージョン番号: 要確認` lines by default
- mention missing or uncertain information only when it is necessary for the release text

## Output Shape

Use this output shape:

```markdown
# Release Title

...

# Release Body

## 概要

...

## 主な変更

- ...
```

Add a `## 確認事項` section only when there are material unresolved items that should be shown in the release text.
