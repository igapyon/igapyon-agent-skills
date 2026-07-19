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

Treat general requests for repository or branch status as requests to verify remote freshness unless the user explicitly limits the request to local state. This includes phrases such as:

- `リポジトリ状態`
- `このリポジトリの状態`
- `ブランチ状況`
- `repository state`
- `branch status`

## Remote Freshness Check

For a general repository or branch status request, or when the user asks whether a local repository is current with its remote, first inspect the working tree and confirm that the current branch has an upstream. Then fetch remote state and compare it with `HEAD`:

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

If the user explicitly asks for local-only status, do not fetch. Clearly label ahead / behind information based on existing remote-tracking refs as not freshness-verified.

`git fetch --prune` does not change the working tree or the remote repository, but it does update local remote-tracking refs and may prune stale ones. General repository and branch status requests authorize this limited local metadata update; they do not authorize any other repository mutation.

## Boundary

Status inspection authorizes `git fetch --prune` only when remote freshness is in scope under this workflow. It does not authorize staging, committing, branch changes, restoration, cleanup, pull, push, or any other repository mutation.
