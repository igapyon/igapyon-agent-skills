# Version Increment Check Before Add or Commit

Check for a required version increment before running `git add` or `git commit` under the miku SCM workflow. Do not repeatedly remind the human when a completed increment or an explicit no-increment confirmation remains valid in the same continuous session.

## Session Version Check Record

After performing or verifying a version increment, or after the human explicitly confirms that no required increment was forgotten, retain this session-scoped record in the working context:

- repository top-level path
- current branch
- authoritative and coupled version-source paths
- the verified value in each source
- the alignment, build, or package check that succeeded
- whether the record came from a completed increment or an explicit no-increment confirmation
- the confirmed commit or content scope

Do not create a repository file solely to persist this record. The record applies only to the current continuous agent session.

## Reuse an Existing Session Check

Before `git add` or `git commit`, treat the version check as already satisfied without asking the reminder when all of these conditions hold:

1. A session increment record exists for the same repository and branch.
2. Every recorded authoritative or coupled version source still contains its recorded value and remains mutually aligned.
3. No content-replacing operation such as pull, merge, rebase, cherry-pick, mixed or hard reset, branch switch, or checkout of versioned content has occurred since the record was established.
4. There is no evidence that repository version policy or the authoritative version source changed in a way that affects the recorded target version.
5. When the record came from an explicit no-increment confirmation, the next commit operation only rebuilds the same confirmed content through the documented PR Soft Reset Recommit workflow. Do not reuse that confirmation for newly added or changed content.

Use read-only checks such as `git rev-parse --show-toplevel`, `git branch --show-current`, `git status -sb`, direct reads of the version sources, and the repository's alignment command. Use known actions in the current session to evaluate invalidating operations; do not rely on `git reflog` alone because it cannot reveal remote PR activity.

Unrelated working-tree changes, staging, or an ordinary local commit do not invalidate a record created by a completed increment. PR drafting, read-only preflight, backup-branch creation, and the documented PR soft-reset recommit do not invalidate a reusable record because they preserve the versioned content. Before the recommit, re-read every recorded version source and rerun the alignment check; when the values and confirmed content scope remain valid, continue without asking the reminder. Do not treat the recommit itself as a new batch. If a version value or the content scope changed after the record, revalidate it against repository policy and refresh the record when appropriate; otherwise ask the reminder.

## Reminder Gate

When no reusable session record can be verified:

1. Inspect the intended staging or commit scope and preserve unrelated changes.
2. Read the repository's authoritative and coupled version sources. Derive the corresponding tag candidate only when the repository convention is already resolved; otherwise report it as `未解決` instead of guessing.
3. For a public GitHub repository, use the anonymous REST API workflow in [github-anonymous-readonly.md](github-anonymous-readonly.md) to list tags. Filter out tags that do not match the resolved version-tag convention, then identify the greatest version tag using the repository-defined ordering. For date-identifier tags, compare the date and decoded alphabetic sequence; for Semantic Versions, compare semantic version components. Do not use API response order, tagger date, or unrelated operational tags to decide which version tag is latest.
4. If the GitHub repository or tag list cannot be resolved anonymously, show the latest GitHub version tag as `未確認`. A failed lookup does not by itself block the human confirmation gate.
5. Before the first `git add` or `git commit` in that batch, show the current version information and ask the human explicitly. Use repository-defined labels when available; for the `igapyon-agent-skills` coupled versions, use this shape:

```text
現在のバージョン:
- リポジトリ: <authoritative-version>
- みくく: <coupled-version>
- 対応タグ候補: <tag-or-未解決>
- GitHub最新バージョンタグ: <tag-or-未確認>

バージョンのインクリメント忘れはありませんか？
```

6. If a version source cannot be read, show that value as `未確認`. Do not omit the current-version block or substitute a guessed value.
7. Wait for the human's answer. Do not run `git add` or `git commit` while the answer is pending.
8. Proceed only after the human confirms that no required increment was forgotten, or after any required version change has been handled and the human confirms it.
9. If the human says an increment is needed, stop the add/commit sequence. Do not change a version automatically unless a separately documented workflow and explicit instruction authorize it.

An explicit human confirmation satisfies the current batch even when no version increment is required. It also satisfies a later PR Soft Reset Recommit of that same confirmed content when the session record remains valid. Ask again for other later batches unless a reusable session version check record exists.

This gate governs whether staging and committing may proceed. For a PR-derived commit message under this skill, use [github-writing-rules.md](github-writing-rules.md), [github-pr-writing.md](github-pr-writing.md), and [github-pr-soft-reset-recommit.md](github-pr-soft-reset-recommit.md).
