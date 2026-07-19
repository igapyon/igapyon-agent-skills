# Version Increment Check Before Add or Commit

Check for a required version increment before running `git add` or `git commit` under the miku SCM workflow. Do not repeatedly remind the human when an increment already completed in the same continuous session remains valid.

## Session Increment Record

After performing or verifying a version increment, retain this session-scoped record in the working context:

- repository top-level path
- current branch
- authoritative and coupled version-source paths
- the verified value in each source
- the alignment, build, or package check that succeeded

Do not create a repository file solely to persist this record. The record applies only to the current continuous agent session.

## Reuse an Existing Session Check

Before `git add` or `git commit`, treat the version check as already satisfied without asking the reminder when all of these conditions hold:

1. A session increment record exists for the same repository and branch.
2. Every recorded authoritative or coupled version source still contains its recorded value and remains mutually aligned.
3. No content-replacing operation such as pull, merge, rebase, cherry-pick, mixed or hard reset, branch switch, or checkout of versioned content has occurred since the record was established.
4. There is no evidence that repository version policy or the authoritative version source changed in a way that affects the recorded target version.

Use read-only checks such as `git rev-parse --show-toplevel`, `git branch --show-current`, `git status -sb`, direct reads of the version sources, and the repository's alignment command. Use known actions in the current session to evaluate invalidating operations; do not rely on `git reflog` alone because it cannot reveal remote PR activity.

Unrelated working-tree changes, staging, or an ordinary local commit do not invalidate a verified session increment record. PR drafting, read-only preflight, backup-branch creation, and the documented PR soft-reset recommit also do not invalidate it because they preserve the versioned content. Before the recommit, re-read every recorded version source and rerun the alignment check; when the values remain valid, continue without asking the reminder. Do not ask merely because the PR workflow began or a new add or commit batch started. If a version value changed after the record, revalidate it against repository policy and refresh the record when the new value is valid; otherwise ask the reminder.

## Reminder Gate

When no reusable session record can be verified:

1. Inspect the intended staging or commit scope and preserve unrelated changes.
2. Before the first `git add` or `git commit` in that batch, ask the human explicitly:

```text
バージョンのインクリメント忘れはありませんか？
```

3. Wait for the human's answer. Do not run `git add` or `git commit` while the answer is pending.
4. Proceed only after the human confirms that no required increment was forgotten, or after any required version change has been handled and the human confirms it.
5. If the human says an increment is needed, stop the add/commit sequence. Do not change a version automatically unless a separately documented workflow and explicit instruction authorize it.

An explicit human confirmation satisfies the current batch even when no version increment is required. Ask again for a later batch unless a valid session increment record exists.

This gate governs whether staging and committing may proceed. For a PR-derived commit message under this skill, use [github-writing-rules.md](github-writing-rules.md), [github-pr-writing.md](github-pr-writing.md), and [github-pr-soft-reset-recommit.md](github-pr-soft-reset-recommit.md).
