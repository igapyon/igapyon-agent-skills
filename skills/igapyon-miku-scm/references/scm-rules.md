# SCM Rules

This is the initial rule entry point for `igapyon-miku-scm`. Add detailed rules incrementally as concrete workflows are decided.

## Current Development Policy

- Keep public GitHub inspection READONLY by default.
- Implement public GitHub inspection through the anonymous REST API workflow.
- Defer general GitHub write operations, authentication, credential handling, and mutation workflows except for an explicitly documented human-approved workflow.
- Do not add, infer, or execute write behavior beyond an explicitly documented workflow unless the user explicitly resumes its design in a future task.
- Keep each write workflow separate from anonymous READONLY rules and give it its own authorization and safety boundaries.

## PR Soft Reset Recommit Delegation

- Treat `pr soft reset recommit` and `pr reset recommit` as explicit requests to run the `igapyon-github-writer` PR Soft Reset Recommit workflow.
- Delegate PR draft composition, backup-branch creation, soft reset, and recommit behavior to `igapyon-github-writer`; do not duplicate that implementation in this skill.
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

After explicit approval, run these commands in order and stop immediately if any command fails:

```sh
git push --force-with-lease origin HEAD
git pull
git branch -m "$(git branch --show-current)" "$(git branch --show-current)-done"
git status -sb
```

Treat `git push --force-with-lease origin HEAD` as an authorized remote history update only for this post-review workflow. Do not replace it with plain `--force`.

Do not treat earlier approval to run PR Soft Reset Recommit as approval to publish. Require the human's OK after displaying the new commit log. If push is rejected by the lease check, stop without pulling or renaming the branch and report the rejection. Do not create a Pull Request in this sequence.

## Next Work Branch After PR Completion

Run this workflow only after the Pull Request has been created and merged, and then the human explicitly instructs the agent to create the next work branch. Do not infer merge completion from local Git state, push output, or branch naming. Do not create the next work branch immediately after push or local `-done` rename while the PR is still open or its merge is unconfirmed.

Interpret a local branch name ending in `-done` only as an operational marker that the post-recommit publication sequence probably reached the rename performed after push. It does not prove that a Pull Request was created or merged. Never use `-done` alone to decide that PR work is complete; require the human's explicit statement that the PR was merged before running this workflow.

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
