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

## Initial Safety Rules

- Inspect before changing.
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
