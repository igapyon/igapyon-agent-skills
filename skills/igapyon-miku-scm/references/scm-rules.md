# SCM Rules

This is the initial rule entry point for `igapyon-miku-scm`. Add detailed rules incrementally as concrete workflows are decided.

## Current Development Policy

- Keep public GitHub inspection READONLY by default.
- Implement public GitHub inspection through the anonymous REST API workflow.
- Defer general GitHub write operations, authentication, credential handling, and mutation workflows except for an explicitly documented human-approved workflow.
- Do not add, infer, or execute write behavior beyond an explicitly documented workflow unless the user explicitly resumes its design in a future task.
- Keep each write workflow separate from anonymous READONLY rules and give it its own authorization and safety boundaries.

## PR Soft Reset Recommit Delegation

- Treat `pr soft reset recommit` and `pr reset recommit` as explicit requests to run the PR Soft Reset Recommit workflow built into `igapyon-miku-scm`.
- Use [github-writing-rules.md](github-writing-rules.md), [github-pr-writing.md](github-pr-writing.md), [github-pr-soft-reset-recommit.md](github-pr-soft-reset-recommit.md), and [github-backup-branch.md](github-backup-branch.md) for PR draft composition, backup-branch creation, soft reset, and recommit behavior. Use the bundled `scripts/pr-soft-reset-recommit-preflight.mjs`; do not invoke `igapyon-github-writer`.
- Do not invalidate a verified same-session version increment merely because this workflow starts. Re-read the version sources and rerun their alignment check before recommit; when they still match the session record, continue without the version reminder.
- Before delegating, require a clean working tree and run `git fetch origin` so the reset base is not resolved from stale remote-tracking information.
- Resolve the reset base, then require it to be an ancestor of the current `HEAD`:

```sh
git merge-base --is-ancestor <base> HEAD
```

- If the ancestry check fails, stop. Do not soft-reset onto the advanced base because preserving the old index can accidentally record removal of changes that exist only on the new base. Recover by starting from the refreshed base and carrying forward only the new work, or use a separately approved rebase workflow.
- Do not run this workflow from a branch ending in `-done`. Treat that branch as frozen and move legitimate follow-up work to a new branch from the refreshed base.
- After the delegated workflow succeeds, immediately run:

```sh
git log -1 | head -n 20
```

- Show the command output so the user can confirm the new commit hash, author, date, title, and the beginning of the PR-derived commit message.
- Run this post-check only after successful recommit. If recommit fails, report the failure instead of presenting the previous commit log as the new result.
- Do not push or create a Pull Request as part of this delegated workflow.

## Human-Approved Post-Recommit Publication On macOS

After a successful PR Soft Reset Recommit and the required `git log -1 | head -n 20` display, stop and wait for the human to inspect the commit log.

Proceed only when all of these conditions hold:

- the environment is macOS
- the working tree is clean
- the human explicitly says the displayed commit is OK and authorizes publication
- the target `<current-branch>-done` local branch does not already exist

After explicit approval, run `git fetch origin`, resolve `<current-branch>`, and determine whether `origin/<current-branch>` already exists.

- For a new remote branch, use normal initial publication and establish its upstream:

```sh
git push -u origin HEAD
```

- Only when the same remote branch already exists and the reviewed recommit intentionally rewrote its history, use:

```sh
git push --force-with-lease origin HEAD
```

Treat `git push --force-with-lease origin HEAD` as an authorized remote history update only for this reviewed rewrite case. Do not replace it with plain `--force`, and do not use force for a new remote branch.

After a successful push, do not run `git pull`. Fetch and compare the pushed remote feature branch with local `HEAD` instead:

```sh
git fetch origin
git rev-list --left-right --count HEAD...origin/<current-branch>
```

Require the comparison result to be `0 0`. Only after it matches, run:

```sh
git branch -m "<current-branch>" "<current-branch>-done"
git status -sb
```

Run the selected push, remote verification, rename, and status steps in order and stop immediately if any step fails. Do not treat earlier approval to run PR Soft Reset Recommit as approval to publish. Require the human's OK after displaying the new commit log. If push or remote verification fails, do not rename the branch. Do not create a Pull Request in this sequence.

## Next Work Branch After PR Completion

Run this workflow when the human explicitly reports that the Pull Request was merged. Treat a clear report such as `GitHubでマージした`, `PRをマージした`, or `マージ完了` as both confirmation of the merge and authorization to refresh the base and create the next work branch; do not require a second instruction to create it. Do not infer merge completion from local Git state, push output, or branch naming. Do not create the next work branch immediately after push or local `-done` rename while the PR is still open or its merge is unconfirmed.

Interpret a local branch name ending in `-done` only as an operational marker that the post-recommit publication sequence probably reached the rename performed after push. It does not prove that a Pull Request was created or merged. Never use `-done` alone to decide that PR work is complete; require the human's explicit statement that the PR was merged before running this workflow.

Treat a `-done` branch as frozen: do not add new work, stage changes, create commits, or run PR Soft Reset Recommit on it. After receiving the human's merge report, refresh the base and create the next work branch before continuing. If the prior PR was not merged but a correction is required, stop and require an explicitly designed recovery path instead of silently continuing on `-done`.

Build the new branch name as:

```text
<base>-tiga<MMDD><hour-code><minute-tens-code><minute-ones-code>
```

Use these naming rules:

- `<base>` is the base branch name, such as `devel`.
- `tiga` identifies the user.
- `<MMDD>` is the local month and day, such as `0718` for July 18.
- Encode hour `0` through `23` with one zero-origin alphabet character: `a=0`, `b=1`, through `x=23`.
- Encode the two decimal minute digits separately with zero-origin alphabet characters: `a=0`, `b=1`, through `j=9`.
- Therefore minute `00` is `aa`, minute `45` is `ef`, and minute `59` is `fj`.

For example, `devel-tiga0718tef` means base `devel`, user `tiga`, July 18, 19:45.

After resolving a unique branch name from the current local date and time, run:

```sh
git fetch origin
git switch -c devel-tiga0718tef origin/devel
git status -sb
```

Replace the example branch and base with the resolved values. Stop if fetch fails or if the resolved local branch already exists. Report the final branch and status.

For follow-up work accidentally committed after the previous PR content, prefer this recovery shape after human authorization:

1. Preserve the current `HEAD` with a local backup branch.
2. Run `git fetch origin` and create a new work branch from the refreshed base.
3. Carry forward only commits or patches that contain work not already merged into the base.
4. Verify the resulting diff against the base before publication.
5. Publish the new remote branch with `git push -u origin HEAD`; do not force-push it.

## Initial Safety Rules

- Inspect before changing.
- Before `git add` or `git commit`, apply the mandatory human confirmation gate in [version-increment-confirmation.md](version-increment-confirmation.md).
- Resolve the exact repository, branch, remote, commit, tag, release, and version target needed for the request.
- Preserve unrelated working-tree changes.
- Treat local Git work and remote GitHub work as separate operations.
- Require an explicit user request before any remote mutation.
- Do not rewrite history, force-push, move or delete tags, publish or delete releases, or change versions without a documented workflow and explicit authorization.
- Verify repository state after an operation.

## Planned Rule Areas

- Git rules
- GitHub operation rules
- GitHub Release rules
- version-management rules
