# Sync push

An exact `miku-scm sync push` request authorizes one compound workflow:
necessary `work.commit`, one evidence-based PR draft, then the existing
recommit/push transition. It does not increment versions, pull/rebase, create
or merge a PR, or create a tag/Release. `draft recommit push` and its
`pr recommit push` alias keep their existing meaning without an ordinary
commit stage.

## Requirements and scope

Use Node.js and Git on macOS or native Windows, with an active work branch
and an already Git-ignored `workplace/miku-scm/sync/` in the target repository.
The default remote is `origin`; shared-base selection follows
[sync-pull.md](sync-pull.md#requirements-and-base-selection). Require a single
fetch URL and a single push URL that identify the same repository. A local
`-done` branch is frozen and cannot start this operation.

Fetch honors the remote's branch refspecs and tag settings under the
[pull mapping rules](sync-pull.md#requirements-and-base-selection). Both the
shared base and, when publication is needed, the work branch must map to their
expected remote-tracking refs. A clean no-op needs only the base mapping.
An unfetchable publication branch stops before an
ordinary commit; sync does not expand the configured fetch range to repair it.

The ordinary commit stage includes all current ordinary non-ignored staged,
unstaged and untracked changes, including work outside the latest request;
the existing `work.commit` sensitive-path and validation checks still apply.
This is a composite workflow, not an alias that changes `draft recommit push`.
When work is already committed, it skips the ordinary commit. When there are
no commits above the base, it returns `up-to-date` without PR drafting,
recommit, push or local `-done` rename.

## Agent route

1. Invoke `repository.sync.push.prepare --repo <path> --apply`, optionally
   supplying `--remote`, `--base`, and a concise concrete `--message` under
   the same message rules as `work.commit`.
2. Stop on any result other than `prepared`; `up-to-date` needs no draft or
   publication. For `prepared`, compose once from its returned `evidence`
   using its returned `writing_contract`. Save at `suggested_draft_path` and compute
   the SHA-256 of those exact bytes. Do not reuse an unbound older draft.
3. In the same requested workflow, invoke
   `repository.sync.push.apply --repo <path> --operation <operation-id>
   --expected-plan-sha256 <prepare-plan-digest> --pr-draft <suggested-path>
   --expected-draft-sha256 <saved-bytes-digest> --apply` once. Carry the IDs
   and digests from this conversation; do not choose a global latest plan.
   Return the fixed final human output unchanged.

Successful steps need no extra conversational confirmation. The Agent writes
PR prose; fixed helpers own all Git mechanics. A writing failure leaves the
ordinary commit and prepared operation intact.

## Prepare contract

Resolve real worktree/common Git directory, branch, remote and shared base.
Require supported macOS/native Windows, an active work branch, no conflicting
Git operation and no other pending sync. Fetch once and stop **before an
ordinary commit** if the fetched base is not an ancestor of HEAD. Run fixed
publication preflight (allow dirty only for this read-only preparation) to
check the destination/upstream/completion branch before committing.

Dirty work calls existing `work.commit` once; carry its scope, sensitive-path
checks, version notice, title fallback and repository checks unchanged.
`committed` is the only result that advances; partial/not-applied/conflict or
an exception stops. Clean work skips this commit. No commits above base is
`up-to-date`. Otherwise bind clean branch/HEAD, base SHA, remote expectation,
bounded exact-range PR evidence, draft path and apply contract to a plan
digest stored in ignored `workplace/miku-scm/sync/operations/<id>/`.

Prepare releases the execution lock while awaiting prose. The operation
remains prepared; the recovery routes below can return its saved evidence or
cancel it. A new explicitly requested `sync pull` may supersede a prepared or
needs-sync-pull push only when apply has never started.

## Apply contract

Require exact contained plan identity/digest, current apply contract, prepared
unconsumed operation, original clean snapshot, exact suggested draft path and
draft bytes. Expand actual `remote get-url --all` and `--push --all` URLs;
require one fetch and push URL for the same repository and reject mirrors.
Bind their full digest and the fetch/tag configuration without storing
credentials. Revalidate at apply,
inside the recommit core immediately before backup/reset, and before remote
fetch/push/verification. Bind the prepared remote branch expectation too.

Fetch again before apply; a changed base stops with a fresh-evidence /
`sync pull` instruction while preserving the ordinary commit. Delegate to
`pr.recommit.push` with the pinned base and draft. Share its backup, explicit
remote lease/new-branch expectation, publication attempt receipt, exact
post-push `0 0` check and `-done` rename. Do not reconstruct this sequence in
the Agent. Do not retry a consumed plan or an unknown remote mutation.
The remote branch keeps its published name; only the local branch receives
`-done`. The human creates and merges the PR using the saved title/body.
Afterward, explicit `sync pull` can verify the merge and create the next work
branch, or the human can report it with the existing `github merge done`.

Results report the ordinary commit as created/skipped, the stopped stage,
backup and final branch. A remote result that cannot be verified is
`unresolved`, requires inspection of the saved publication attempt, and may
not be cleared by a new pull or an automatic resend.

## Recovery

Carry the returned operation ID in the conversation. Pass these workflow
arguments to the fixed runner only after an explicit resume/cancel request:

```text
repository.sync.push.prepare --repo <path> --resume <operation-id> --apply
repository.sync.push.prepare --repo <path> --cancel <operation-id> --apply
```

Resume returns the same completed evidence and plan after validating the
saved branch, HEAD, local base ref and remote, without another commit. It
requires a saved complete plan; an interrupted preparation without one must
be cancelled before starting a new preparation. Cancellation is available
only before apply starts and preserves all work, ordinary commits and draft
files; it does not undo the ordinary commit.

If the base advanced, run `sync pull` only when explicitly requested, then
prepare again and write a fresh bound draft. Do not reuse the old plan/draft
digests. If apply started or the remote outcome is unknown, these preparation
routes cannot cancel or replay it; inspect the saved publication result and
retained backup before choosing a separate recovery action.
