# Sync push

An exact `miku-scm sync push` request authorizes one compound workflow:
necessary `work.commit`, one evidence-based PR draft, then the existing
recommit/push transition. It does not increment versions, pull/rebase, create
or merge a PR, or create a tag/Release. `draft recommit push` and its
`pr recommit push` alias keep their existing meaning without an ordinary
commit stage.

## Agent route

1. Invoke `repository.sync.push.prepare --repo <path> --apply`, optionally
   supplying `--remote`, `--base`, and a concise concrete `--message` under
   the same message rules as `work.commit`.
2. Stop on any result other than `prepared`; `up-to-date` needs no draft or
   publication. For `prepared`, compose once from its returned `evidence`
   using the PR writing contract. Save at `suggested_draft_path` and compute
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
remains prepared. `prepare --resume <operation-id> --apply` returns the same
evidence and plan after revalidation, without another commit.
`prepare --cancel <operation-id> --apply` revokes an unapplied plan but retains
all work, ordinary commits and draft files. A new `sync pull` may supersede a
prepared or needs-sync-pull push only when apply has never started.

## Apply contract

Require exact contained plan identity/digest, current apply contract, prepared
unconsumed operation, original clean snapshot, exact suggested draft path and
draft bytes. Expand actual `remote get-url --all` and `--push --all` URLs;
require one fetch and push URL for the same repository and reject mirrors.
Bind their full digest without storing credentials. Revalidate at apply,
inside the recommit core immediately before backup/reset, and before remote
fetch/push/verification. Bind the prepared remote branch expectation too.

Fetch again before apply; a changed base stops with a fresh-evidence /
`sync pull` instruction while preserving the ordinary commit. Delegate to
`pr.recommit.push` with the pinned base and draft. Share its backup, explicit
remote lease/new-branch expectation, publication attempt receipt, exact
post-push `0 0` check and `-done` rename. Do not reconstruct this sequence in
the Agent. Do not retry a consumed plan or an unknown remote mutation.

Results report the ordinary commit as created/skipped, the stopped stage,
backup and final branch. A remote result that cannot be verified is
`unresolved`, requires inspection of the saved publication attempt, and may
not be cleared by a new pull or an automatic resend.
