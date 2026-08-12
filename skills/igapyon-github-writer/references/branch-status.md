# GitHub Branch Status

Use this workflow when the user asks only to understand the current branch state before PR or release writing.

This mode reports repository evidence. It does not draft PR text, release notes, or About text unless the user separately asks for that mode.

## Safety Rules

- Never run `gh`, `git fetch`, `git pull`, `git push`, or any network or remote-changing command in this skill.
- Do not create branches, commits, tags, releases, issues, or pull requests.
- Do not modify files.
- Use local Git evidence only.
- If upstream tracking is missing, report it as `未設定` or `未確認`.

## Basic Behavior

By default, first report the current branch state with `git status -sb`, including the branch relationship and uncommitted files.

Also report the newest three `tag*` tags and newest three `v*` tags. These tag groups are checked separately because repositories may use both local operation tags such as `tagYYYYMMDD` and release-style version tags such as `vX.Y.Z`.

If a tag group has no matches, report that clearly instead of omitting it.

## Evidence Runner

Use:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json branch.status
```

The fixed workflow gathers local status, branch, `HEAD`, upstream ahead/behind,
20 recent commits, and the newest three tags in each tag group. Missing upstream
is a successful result with null counts.

For tag output, show only the newest three `tag*` tags and newest three `v*` tags in the report. If either pattern has no matches, report that clearly.

When an upstream exists, use the runner's returned ahead / behind counts and
recent local commits. Do not reconstruct additional Git inspection commands.

## Report Shape

Return a concise Japanese Markdown report. Do not wrap the report in `~~~~markdown` unless the user asks for paste-ready Markdown.

Use this shape:

```markdown
## ブランチ状況

- 現在ブランチ: ...
- upstream: ...
- ahead / behind: ...
- working tree: ...
- staged: ...
- untracked: ...

## 直近コミット

- ...

## 最近のタグ

- `tag*`: ...
- `v*`: ...

## 注意点

- ...
```

Omit sections that have no useful content. Add `## 注意点` only when there is something material to call out, such as no upstream, dirty working tree, staged changes, untracked files, or local commits not on upstream.
