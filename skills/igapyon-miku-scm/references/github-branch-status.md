# GitHub Branch Status

Use this workflow when the user asks only to understand the current branch state before PR or release writing.

This mode reports repository evidence. It does not draft PR text, release notes, or About text unless the user separately asks for that mode.

## Safety Rules

- For a general repository or branch status request, run `git fetch --prune` after confirming the current branch has an upstream. This is the only implicit local metadata update authorized by this workflow.
- Do not run `git pull`, `git push`, `gh pr create`, or any remote-changing command unless the user explicitly asks.
- Do not create branches, commits, tags, releases, issues, or pull requests.
- Do not modify files.
- Use local Git evidence refreshed by the fetch. If the user explicitly requests local-only status, do not fetch and label remote comparisons as not freshness-verified.
- If upstream tracking is missing, report it as `未設定` or `未確認`.

## Basic Behavior

By default, first inspect the current branch state with `git status -sb`, resolve its upstream, run `git fetch --prune`, and then report the refreshed branch relationship and uncommitted files. If upstream resolution or fetch fails, continue with local evidence and clearly report that remote freshness could not be confirmed.

Also report the newest three `tag*` tags and newest three `v*` tags. These tag groups are checked separately because repositories may use both local operation tags such as `tagYYYYMMDD` and release-style version tags such as `vX.Y.Z`.

Optionally report the counts of local `*-done` and `backup/*` branches as
maintenance signals. Do not call them deletion candidates or query their PR
merge state in this status workflow. Direct the user to the dedicated
repository-maintenance diagnosis when cleanup assessment is wanted.

If a tag group has no matches, report that clearly instead of omitting it.

## Evidence Commands

Inspect the smallest useful local evidence:

```sh
git status -sb
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{u}
git fetch --prune
git status -sb
git rev-list --left-right --count HEAD...@{u}
git log --oneline --decorate --max-count=20
git diff --stat
git diff --cached --stat
git tag --list 'tag*' --sort=-creatordate --format='%(creatordate:iso8601-strict) %(refname:short)'
git tag --list 'v*' --sort=-creatordate --format='%(creatordate:iso8601-strict) %(refname:short)'
```

If an upstream command fails because no upstream is configured, continue without treating it as a fatal error.

Interpret `git rev-list --left-right --count HEAD...@{u}` as `<ahead> <behind>`. Do not claim that the branch is current with its remote unless fetch succeeded in the same inspection.

For tag output, show only the newest three `tag*` tags and newest three `v*` tags in the report. If either pattern has no matches, report that clearly.

When an upstream exists, inspect the ahead / behind commits only when useful:

```sh
git log --oneline --decorate @{u}..HEAD
git log --oneline --decorate HEAD..@{u}
```

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
