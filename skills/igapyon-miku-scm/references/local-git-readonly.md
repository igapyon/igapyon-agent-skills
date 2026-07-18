# Local Git READONLY

Use local Git commands that do not modify the repository when inspecting SCM state.

## Initial Status Command

Start local repository inspection with:

```sh
git status -sb
```

Prefer this command because its short branch format reports, in one compact result:

- the current branch
- the configured upstream branch
- ahead or behind counts when available
- staged, modified, deleted, and untracked paths

Report the command output and summarize those facts without guessing intent.

Use plain `git status` or additional READONLY commands only when the compact result does not provide enough detail for the user's request.

## Remote Freshness Check

When the user asks whether a local repository is current with its remote, first confirm that the current branch has an upstream, then fetch remote state and compare it with `HEAD`:

```sh
git status -sb
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git fetch --prune
git status -sb
git rev-list --left-right --count 'HEAD...@{upstream}'
```

Interpret the final two counts as `<ahead> <behind>`:

- `0 0`: local `HEAD` and its upstream are exactly synchronized.
- positive ahead and `0` behind: local contains the fetched upstream state and has additional local commits.
- `0` ahead and positive behind: local is missing upstream commits and is not current.
- both positive: local and upstream have diverged.

Treat `behind = 0` as confirmation that the local branch contains the latest successfully fetched upstream history. Require `0 0` when the question is whether both tips are exactly identical.

If no upstream is configured or `git fetch --prune` fails, report that freshness could not be confirmed. Do not infer freshness from stale remote-tracking refs.

`git fetch --prune` does not change the working tree or the remote repository, but it does update local remote-tracking refs and may prune stale ones. Run it only for an explicit remote-freshness check, not for a basic status request.

## Boundary

Status inspection does not authorize staging, committing, branch changes, restoration, cleanup, fetch, pull, push, or any other repository mutation.
