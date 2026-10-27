# Sync pull

An exact `miku-scm sync pull` request authorizes
`repository.sync.pull --repo <path> --apply`. Optional fixed options are
`--remote <name>` and `--base <branch>`. This fetches the shared base into the
local work branch; it never pushes or increments a version. Do not activate
the operation for naming, design, or explanation requests.

## Requirements and base selection

Use Node.js and Git 2.45 or newer in an existing work branch. Operation and branch-base records are retained under
`workplace/miku-scm/sync/`. If they are not ignored, report a warning and add
`/workplace/miku-scm/` to Git's local `info/exclude`, then continue. No tracked
`.gitignore` edit or prior setup is required.
The automatic `-done` transition additionally requires a hosted remote with a compatible PR API and
GitHub CLI access that can read its PRs. A normal branch does not require PR
access.

The default remote is `origin`. Resolve the shared base in this order:

1. Explicit `--base <branch>` (also accepts `<remote>/<branch>`).
2. The current branch's upstream on that remote, unless it is the published
   work branch itself.
3. The base prefix of a standard miku work-branch name.
4. The selected remote's local symbolic `HEAD`.

If unresolved, stop and request the intended `--base`; do not guess a
different branch. The current branch must differ from the base branch.

Fetch uses `git fetch <remote>` and honors the configured branch refspecs and
`remote.<name>.tagOpt`, including normal automatic tag following. Supported
refspecs map `refs/heads/` into the selected remote's `refs/remotes/` namespace,
using exact names or one wildcard, with optional negative branch refspecs.
The base must map to its expected remote-tracking ref and must not be excluded;
unsupported mappings stop before fetch. No excluded branch is fetched by override.
Narrowed mappings support no-op, fast-forward and verified next-work transitions.
Divergent replay requires complete remote-head coverage without exclusions;
otherwise stop before backup/stash because publication evidence is incomplete.

## Transition

The helper fixes the real worktree, remote identity and expanded fetch/push
URL digests and fetch/tag configuration, branch, HEAD, binary index/working
diffs and untracked contents.
It uses a common-Git-directory execution lock and a persistent operation
journal under ignored `workplace/miku-scm/sync/`. Existing merge, rebase,
cherry-pick, conflicts, detached HEAD, shallow history, sparse checkout and
submodules stop before work mutation.

For a normal branch there are **no GitHub PR reads**. Fetch once, then:

- base already included: preserve the worktree/index without a stash;
- HEAD behind base: fast-forward with `--no-overwrite-ignore`;
- divergent unpublished work: replay only the commits after the independently
  recorded branch creation/sync base. Require that base to remain an ancestor
  of both HEAD and the fetched base. Missing provenance, local merges, fetched
  refs sharing replay commits, or publication receipts stop automatic replay.

An exact-base no-op or safe FF records provenance. An ahead no-op with no
record does not invent one. Verified successful runner records from the older
`repository.post-merge.next-work` workflow can supply the original base.
For an ordinary manually created branch without that record, an initial pull
while HEAD still equals the shared base can establish it. Once histories have
diverged without provenance, stop for separate recovery; do not infer a
creation base from the current upstream or merge-base.
Only fetched refs and local receipts are checked for publication; do not claim
knowledge of every remote repository.

Before integration, check ignored file/directory/symlink and case collisions
in the base **and every intermediate replay tree**. An ignored directory that
contains tracked descendants is not itself a collision; ignored untracked paths
that intersect a checkout path remain blockers. Keep ignored contents out of
the stash. Create a unique backup at the old HEAD, stash staged/unstaged
and untracked work once, identify that stash by its unique message and exact
SHA, and retain it. Restore with `stash apply --index <exact-sha>` once.
Restoration conflicts are partial completion, never success.

Replay uses exactly:

```text
git -c merge.renames=false -c merge.directoryRenames=false rebase --merge --reapply-cherry-picks --empty=stop --keep-empty --no-autostash --no-autosquash --no-update-refs --no-fork-point --onto <fetched-base-sha> <recorded-base-sha>
```

This keeps original empty commits, other branch refs and backups. A commit
that becomes empty stops for an explicit keep/drop choice.
The same two configuration overrides apply to rebase recovery and stash
restoration. Automatic rename/directory relocation can write paths absent
from the checked trees and overwrite ignored files. Preserve the original
paths and stop on any resulting conflict instead of inferring that relocation.

## Done branch exception

Only on `-done`, invoke the tracked `miku-scm-sync-merge-check.mjs` read-only
helper. Its complete GitHub command surface is:

```text
gh api --method GET repos/<owner>/<repo>/pulls [--hostname <selected-host>] -f state=all -f head=<owner>:<published-branch> -f base=<base-branch> -f per_page=100
gh api --method GET repos/<owner>/<repo>/pulls/<positive-number> [--hostname <selected-host>]
```

The API host and repository names come from the selected remote, branch/base from
validated Git refs, and the PR number from the unique exact match. Use a
15-second timeout, no pagination, arbitrary fields or passthrough. There is no
`github.com` host restriction; API requests use the selected host. A result of
100 entries is incomplete and stops. Auth/JSON/API failures stop before
stash or branch creation.

Require exact head repository/ref/SHA and base repository/ref, then detailed
`merged: true`, `state: closed`, a valid `merged_at`, and a full
`merge_commit_sha` contained in the fetched base. This also supports squash
and rebase merges and deleted remote work branches. The suffix alone is not
merge evidence. Create one next branch from the pinned fetched base through
the shared next-work core, then carry work over; never replay the old PR.
Prepare the branch and its configuration before checkout so post-checkout
hooks see the final tracking configuration. Git's `branch.autoSetupMerge` and
`branch.autoSetupRebase` settings are preserved. Under the normal tracking
default, `git status -sb` reports `## <next-branch>...<remote>/<base>`; settings
that disable or restrict tracking are respected. Verify the shared ref before
branch creation and the created branch's SHA before checkout; a moved ref
stops the transition before switching to an unreviewed commit.
An already recorded transition cannot create more next branches.

This is a narrow frozen-branch exception authorized by `sync pull`. The
explicit `github merge done` route keeps its human confirmation and staged
change blocker. Never synthesize its `--confirmed-merged` flag.
Successful push renames only the local branch with `-done`; PR lookup uses
the published branch name without that suffix. An open PR, an unmerged closed
PR, or unavailable matching evidence stops before stash or branch creation.
This transition also returns the version/recommended-tag check from the
shared next-work core; creating a tag or Release remains a separate operation.

Successful next-work output shows `Previous branch: <old-branch>` and
`New work branch: <created-branch>` so the newly created work branch is explicit.
Up-to-date, fast-forward, rebase and incomplete results show
`Current branch: <branch>`; they do not claim a completed new-branch transition.

## Recovery

Report the retained operation, branch, backup and exact stash. The Agent
carries the returned operation ID; the user normally need not copy it.
Only an explicit recovery request authorizes one of:

```text
repository.sync.pull --repo <path> --resume <operation-id> --apply
repository.sync.pull --repo <path> --resume <operation-id> --empty <keep|drop> --apply
repository.sync.pull --repo <path> --resume <operation-id> --resolved-carryover --apply
repository.sync.pull --repo <path> --resume <operation-id> --resolved-next-work --apply
repository.sync.pull --repo <path> --abort <operation-id> --apply
```

For an interrupted next-work transition with a complete preparation receipt,
resume verifies and switches to the same prepared branch without creating
another branch, fetching or stashing again. If preparation has no complete
receipt, or a checkout/hook outcome is unconfirmed, inspect the saved branch,
pinned HEAD, tracking configuration and hook outcome first. Only an explicit
confirmation of that resolution authorizes `--resolved-next-work`. When
already on the verified next branch, this continues without rerunning its hook.
This flag does not confirm a carryover resolution; that still requires
`--resolved-carryover` when applicable.
Resume verifies the same rebase original HEAD, branch and onto SHA, requires
conflicts resolved/staged, and continues without fetching or stashing again.
For an empty stopped commit require the explicit keep/drop selection. Abort
only the same rebase, verify the original HEAD, then restore its carryover.
`--abort` is not a general undo for an already completed fast-forward or
next-work transition; when rewinding cannot be proven safe, the helper stops
for inspection of the retained backup and stash.
After restoration starts, never reapply automatically or discard resolution
work. Inspect all paths in the retained stash, restore/resolve and stage them
as intended, then explicitly resume with `--resolved-carryover` only after the
user confirms that every carryover path is resolved. Ordinary resume never
assumes a failed or interrupted stash restoration succeeded.
An interrupted integration whose completion cannot be proven requires manual
inspection of the backup/stash. Do not guess or repeat a mutation. A stale
execution lock can be reclaimed only for the same saved operation with a
provably dead process; elapsed time alone is insufficient.
