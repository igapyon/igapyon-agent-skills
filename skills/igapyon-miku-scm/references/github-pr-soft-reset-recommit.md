# PR Soft Reset Recommit

Use this workflow only when the user explicitly asks to rebuild local commits by soft-resetting to a base and recommitting with a saved PR draft as the commit message.

This is not `git commit --amend`. It resets `HEAD` back to a confirmed base while preserving the index and working tree, then creates a new commit from the preserved changes.

This mode changes local Git history. Do not run it automatically after drafting PR text. Do not run it for generic commit summaries or ordinary PR drafting.

This workflow may automate the local-only history rewrite with the bundled Node helper when the user explicitly asks for PR Soft Reset Recommit. The human review gates are expected at push, PR creation, and PR merge. The helper must not push, create PRs, merge PRs, or change remotes.

## Safety Rules

- Require an explicit user request before running Git commands that rewrite the current commit state.
- Inspect `git status -sb` before changing anything.
- Inspect the commits that would be collapsed with `git log --oneline --decorate <base>..HEAD`.
- Inspect the change size with `git diff --stat <base>...HEAD` or another appropriate diff command before resetting.
- Create a local backup branch at the current `HEAD` immediately before running `git reset --soft`, using [github-backup-branch.md](github-backup-branch.md).
- Do not proceed to `git reset --soft` if backup branch creation fails.
- Prefer running backup branch creation and `git reset --soft` as one shell command joined with `&&`, so a single approval can cover the local history rewrite while still stopping if backup creation fails.
- Do not proceed if there are unrelated uncommitted changes unless the user explicitly confirms how to handle them.
- Do not run `git reset --hard`, `git checkout --`, `git push`, `gh pr create`, or any remote-changing command in this workflow.
- `git fetch origin` is allowed only to refresh local remote-tracking information.
- Do not ask the version-increment reminder again merely because this workflow will replace an already confirmed commit. Reuse a valid same-session version check under [version-increment-confirmation.md](version-increment-confirmation.md) after re-reading the version sources and rerunning their alignment check. Ask again if the content to recommit changed after the confirmation.
- `git reset --soft <base>` rewrites `HEAD` while preserving index and working tree changes. Treat it as a history-rewrite operation and mention that clearly before running it.
- Resolve the base from local Git before asking the user. Accept the current branch upstream only when it is not the remote counterpart of the current feature branch. Otherwise prefer the base encoded by a prescribed `<base>-tiga...` branch name, then local `origin/HEAD`, then local `origin/devel`. Ask for `--base` when the result is ambiguous.
- Require the resolved base to be an ancestor of `HEAD`, require at least one commit in `<base>..HEAD`, and refuse a branch ending in `-done`. Enforce these checks both in the documented workflow and inside the helper immediately before apply mode.

## Inputs

This workflow has two required inputs:

- `BASE`: the confirmed reset base, such as `origin/devel`
- `PR_DRAFT`: the saved PR draft file, preferably under `workplace/miku-scm/pr-drafts/` or `temp/miku-scm/pr-drafts/`

The PR draft file must contain the inner Markdown draft, without the outer `~~~~markdown` wrapper.

In this mode, the PR draft must be based on the exact `<base>..HEAD` range shown by preflight. It must cover every material change group in `Commits To Collapse` and `Diff Stat`; a draft based only on the latest commit is invalid when multiple commits will be collapsed.

If there is no saved PR draft file, stop this workflow and first create or save the PR draft through PR mode. Do not use `mktemp`, inline heredoc, or `cat <<EOF` as a fallback.

## PR Draft Resolution

When the user asks to reuse the PR draft created by PR mode but does not provide `PR_DRAFT`, prefer using the bundled Node helper in default read-only mode to resolve the candidate from the standard draft-save locations:

```sh
node skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs
```

If `PR_DRAFT` is already known, pass it explicitly:

```sh
node skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs --pr-draft workplace/miku-scm/pr-drafts/pr-devel-YYYYMMDDHHMM.md
```

Without `--apply`, the helper is read-only. It may run local Git inspection commands, resolve the current-branch PR draft candidate, choose a backup branch candidate, and print the final command shape. It must not create branches, reset commits, commit changes, push, or modify files in default mode.

If Node is unavailable or the helper fails, resolve the candidate manually:

1. Determine the current branch with `git branch --show-current`.
2. Sanitize it with the same `<branch-slug>` rules from `github-writing-rules.md`.
3. Look for PR draft files in `workplace/miku-scm/pr-drafts/` and `temp/miku-scm/pr-drafts/`, preferring files named `pr-<branch-slug>-<YYYYMMDDHHMM>.md`. During migration, use `workplace/miku-scm/`, `temp/miku-scm/`, `workplace/github-writer/`, and `temp/github-writer/` only as legacy fallback locations.
4. If multiple branch-matching drafts exist, choose the newest by the 12-digit timestamp embedded in the filename.
5. If filename timestamps are missing or tied, use file modification time as a fallback and mention the ambiguity.

Do not automatically choose a PR draft for another branch. If no current-branch match exists, report the available PR drafts and ask the user to confirm which one to use.

Before running `git reset --soft`, report the resolved `PR_DRAFT` path and treat it as the confirmed draft only when the user clearly asked to use the latest matching PR draft, or when the branch match and newest timestamp make the choice unambiguous.

## Command Shape

When the user explicitly asks to apply the saved PR draft as the commit message and both inputs are confirmed, first run the helper without `--apply` unless it was already run during PR draft resolution:

```sh
node skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs --pr-draft workplace/miku-scm/pr-drafts/pr-devel-YYYYMMDDHHMM.md
```

Review the preflight output before any history rewrite:

- confirm `base` exists
- confirm `base source` is appropriate
- confirm `base` is an ancestor of `HEAD`
- confirm at least one commit will be collapsed
- confirm `PR draft` is the intended saved draft
- confirm `backup branch candidate`
- confirm `Commits To Collapse`
- confirm `Diff Stat`
- compare the saved draft with the complete collapsed range and confirm every material change group is represented
- confirm `git status -sb` does not show unrelated uncommitted changes

After that, prefer applying the local-only rewrite with the Node helper:

```sh
node skills/igapyon-miku-scm/scripts/pr-soft-reset-recommit-preflight.mjs --pr-draft workplace/miku-scm/pr-drafts/pr-devel-YYYYMMDDHHMM.md --apply
```

The helper will:

- create the backup branch at current `HEAD`
- run `git reset --soft <base>`
- run `git commit -F <PR_DRAFT>`
- report the new `HEAD` and final `git status -sb`

The helper refuses `--apply` when there are existing uncommitted changes unless `--allow-dirty` is also passed. Use `--allow-dirty` only when the user has explicitly confirmed that those uncommitted changes are intentional and should participate in the recommit context.

If Node is unavailable or the helper fails before changing history, use this manual shape:

The example is POSIX-shell style for clarity. When running on Windows PowerShell, cmd.exe, or another shell, translate variable assignment, quoting, and path syntax to the active shell while preserving the same Git steps.

```sh
BASE=origin/devel
PR_DRAFT=workplace/miku-scm/pr-drafts/pr-devel-YYYYMMDDHHMM.md

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

The Node helper replaces the manual local rewrite only when invoked with `--apply`. It still must not push, create a PR, merge a PR, or change remotes.

## Output

After execution, report:

- the base used for `git reset --soft`
- the backup branch created before `git reset --soft`
- the saved PR draft path used for `git commit -F`
- whether `git commit -F` succeeded
- the new commit hash if available
- the final `git status -sb`

Do not include absolute paths.
