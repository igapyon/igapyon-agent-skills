# PR Soft Reset Recommit

Use this workflow only when the user explicitly asks to rebuild local commits by soft-resetting to a base and recommitting with a saved PR draft as the commit message.

This is not `git commit --amend`. It resets `HEAD` back to a confirmed base while preserving the index and working tree, then creates a new commit from the preserved changes.

This mode changes local Git history. Do not run it automatically after drafting PR text. Do not run it for generic commit summaries or ordinary PR drafting.

## Safety Rules

- Require an explicit user request before running Git commands that rewrite the current commit state.
- Inspect `git status -sb` before changing anything.
- Inspect the commits that would be collapsed with `git log --oneline --decorate <base>..HEAD`.
- Inspect the change size with `git diff --stat <base>...HEAD` or another appropriate diff command before resetting.
- Create a local backup branch at the current `HEAD` immediately before running `git reset --soft`, using [backup-branch.md](backup-branch.md).
- Do not proceed to `git reset --soft` if backup branch creation fails.
- Prefer running backup branch creation and `git reset --soft` as one shell command joined with `&&`, so a single approval can cover the local history rewrite while still stopping if backup creation fails.
- Do not proceed if there are unrelated uncommitted changes unless the user explicitly confirms how to handle them.
- Do not run `git reset --hard`, `git checkout --`, `git push`, `gh pr create`, or any remote-changing command in this workflow.
- `git fetch origin` is allowed only to refresh local remote-tracking information.
- `git reset --soft <base>` rewrites `HEAD` while preserving index and working tree changes. Treat it as a history-rewrite operation and mention that clearly before running it.
- Default base is `origin/devel` only when the user asks for that base or the repository convention clearly uses it. Otherwise ask for the base branch or remote-tracking ref.

## Inputs

This workflow has two required inputs:

- `BASE`: the confirmed reset base, such as `origin/devel`
- `PR_DRAFT`: the saved PR draft file, preferably under `workplace/github-writer/` or `temp/github-writer/`

The PR draft file must contain the inner Markdown draft, without the outer `~~~~markdown` wrapper.

If there is no saved PR draft file, stop this workflow and first create or save the PR draft through PR mode. Do not use `mktemp`, inline heredoc, or `cat <<EOF` as a fallback.

## PR Draft Resolution

When the user asks to reuse the PR draft created by PR mode but does not provide `PR_DRAFT`, resolve the candidate lightly from the standard draft-save locations before asking:

1. Determine the current branch with `git branch --show-current`.
2. Sanitize it with the same `<branch-slug>` rules from `github-writing-rules.md`.
3. Look for PR draft files in the standard GitHub writer draft directories, preferring files named `pr-<branch-slug>-<YYYYMMDDHHMM>.md`.
4. If multiple branch-matching drafts exist, choose the newest by the 12-digit timestamp embedded in the filename.
5. If filename timestamps are missing or tied, use file modification time as a fallback and mention the ambiguity.

Do not automatically choose a PR draft for another branch. If no current-branch match exists, report the available PR drafts and ask the user to confirm which one to use.

Before running `git reset --soft`, report the resolved `PR_DRAFT` path and treat it as the confirmed draft only when the user clearly asked to use the latest matching PR draft, or when the branch match and newest timestamp make the choice unambiguous.

## Command Shape

When the user explicitly asks to apply the saved PR draft as the commit message and both inputs are confirmed, use this shape:

The example is POSIX-shell style for clarity. When running on Windows PowerShell, cmd.exe, or another shell, translate variable assignment, quoting, and path syntax to the active shell while preserving the same Git steps.

```sh
BASE=origin/devel
PR_DRAFT=workplace/github-writer/pr-devel-YYYYMMDDHHMM.md

git status -sb
git fetch origin
git log --oneline --decorate "$BASE"..HEAD
git diff --stat "$BASE"...HEAD
git branch backup/<YYYY-MM-DD-HHMM> HEAD && git reset --soft "$BASE"
git commit -F "$PR_DRAFT"
git log --oneline --decorate -3
git status -sb
```

Replace the example `BASE` and `PR_DRAFT` values with the confirmed values before running.

## Output

After execution, report:

- the base used for `git reset --soft`
- the backup branch created before `git reset --soft`
- the saved PR draft path used for `git commit -F`
- whether `git commit -F` succeeded
- the new commit hash if available
- the final `git status -sb`

Do not include absolute paths.
