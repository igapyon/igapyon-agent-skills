# Approval Handoff

Issue mutation preflights save one immutable approval handoff under
`workplace/miku-scm/handoffs/`. The handoff fixes the preflight and apply
workflow IDs, reviewed apply arguments, workflow contract digest, reviewed
summary, and relevant Issue or draft digests.

List pending handoffs after an exact `miku-scm pending` request with:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.handoff.list
```

The READONLY list returns stable full handoff IDs, bounded review summaries,
and a 12-character approval suffix when the ID has one. It does not return
reviewed apply arguments. A human may use the listed suffix as a selector; the
helper resolves it only against pending handoffs in the current repository and
only when exactly one record matches. The Agent must not choose, invent, or
reconstruct a selector for the human.

After the human reviews the complete preflight and explicitly replies
`miku-scm approve` (or the legacy `miku-scm 承認` input), invoke:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.handoff.apply --apply
```

This compatibility form accepts no handoff ID or apply argument from the Agent.
It requires exactly one pending Issue handoff in the current repository. Zero
or multiple pending handoffs stop safely.

When multiple handoffs are pending, the human may copy either a full ID or its
listed 12-character approval suffix from the preflight or pending list and
reply `miku-scm approve <handoff-selector>`. Invoke:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.handoff.apply --handoff <handoff-selector> --apply
```

The fixed workflow matches a full ID exactly, or resolves a listed suffix only
when exactly one pending record ends with it, and applies only that matching
record. A missing or ambiguous suffix stops without a mutation. The Agent must
never infer a selector from Issue content, order, recency, or intent.

For a reviewed batch, the human must supply two to twenty full IDs or listed
suffixes that resolve to unique pending handoffs, in the intended execution
order, with `miku-scm approve batch <handoff-selector> <handoff-selector> [...]`. Invoke one fixed
batch workflow, repeating `--handoff` in that same order:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.handoff.batch.apply \
  --handoff <first-handoff-selector> \
  --handoff <second-handoff-selector> \
  --apply
```

Before the first remote mutation, the helper validates that every supplied ID
is unique, pending, digest-valid, and unchanged. It applies one handoff at a
time in the supplied order and revalidates each record immediately before use.
The first mutation for each repository Issue consumes the unchanged reviewed
apply arguments.

When a later selected handoff mutates the same existing Issue, an earlier
approved step can invalidate its reviewed snapshot. After the earlier step is
successfully verified, the batch invokes the later handoff's fixed preflight
workflow with exactly its reviewed semantic options and without creating
another approval handoff. It compares the returned apply arguments with the
reviewed arguments and permits changes only to these state expectations:

| Later operation | Dependency-refreshed expectations |
| --- | --- |
| comment | Issue snapshot SHA-256 and `updated_at` after any earlier same-Issue mutation |
| content update | `updated_at`; current Issue SHA-256 only after an earlier content or label update |
| label update | `updated_at`; current-label SHA-256 only after an earlier content or label update |
| close | `updated_at`; current-body SHA-256 only after an earlier content update |

Repository, Issue number, draft and draft digest, update or operation digest,
requested labels, close reason, duplicate target and snapshot, workflow
contract digest, and all other options must remain equivalent. A changed
non-allowlisted value records the later handoff as `conflict` and stops the
batch before its mutation. Every dependency preflight has its own run artifact,
does not create another pending handoff, and its original/refreshed argument
digests and changed option names are recorded on the applied handoff.

A dependency preflight READONLY failure records the later handoff as
`not-applied`, not `conflict`. The earlier successful mutation remains applied,
and a new preflight is required for the stopped operation.

Any `not-applied`, `conflict`, `unresolved`, changed, or missing result stops
the batch before all later handoffs. Earlier successful mutations remain
applied and are reported as a partial result; the workflow never rolls them
back or retries them. A vague approval such as `all` does not authorize the
Agent to select or order handoffs.

After an exact `miku-scm dismiss <handoff-selector>` request, mark only that pending
handoff as `not-applied` with:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.handoff.dismiss --handoff <handoff-selector> --apply
```

Dismissal changes only the local approval handoff record and performs no
GitHub or Git mutation. A missing, non-pending, malformed, or ambiguous
selector stops without changing another record.

The helper validates the record digest, immutable-content digest, workflow
pair, apply workflow allowlist, `--apply` gate, and reviewed workflow contract
digest before passing the unchanged argument array to the registered apply
workflow. The apply workflow remains authoritative for conflict detection,
attempt records, mutation non-retry, and postcondition verification.

Successful apply changes the handoff state to `applied`. A reviewed-snapshot
change reported by the delegate changes it to `conflict`; another known safe
apply stop or explicit dismissal changes it to `not-applied`; an uncertain
mutation changes it to `unresolved`. Batch human output preserves the stopped
delegate status and available reviewed-versus-observed timestamps. The
workflow never automatically retries any non-pending state.
