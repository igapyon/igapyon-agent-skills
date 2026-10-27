# GitHub Issue Close

**Agent approval path:** run preparation through the fixed miku-scm runner,
save the returned handoff, display its complete content with
`github.issue.handoff.review`, then stop and wait for the user's exact
`approve` message. Apply only through `github.issue.handoff.apply` or the
reviewed batch workflow. The helper command examples below describe the
internal operation contract; the Agent must not invoke this script's `--apply`
mode directly.

Close one existing public GitHub Issue only through the narrowly authorized,
human-approved static-helper workflow in this document. Follow
[github-cli-static-helper-policy.md](github-cli-static-helper-policy.md).
The AI Agent must not invoke `gh` directly.

## Scope

The only allowed mutation is:

```text
gh issue close <number> --repo <[host/]owner/repo> --reason <completed|not planned|duplicate> [--duplicate-of <number>]
```

Use [scripts/github-issue-close.mjs](../scripts/github-issue-close.mjs).
Do not assemble or invoke `gh` independently. Do not add a closing comment in
this command. Use the separately approved
Issue-comment workflow when a comment is needed. Reopen is outside this scope.
An ordered approval-handoff batch may run that separately reviewed comment
first and then dependency-refresh this close operation under
[approval-handoff.md](approval-handoff.md); it still invokes two distinct fixed
helpers and never adds a comment to `gh issue close`.

Its fixed READONLY command is `gh issue view <number> --repo <[host/]owner/repo> --json number,url,title,body,state,stateReason,updatedAt,labels,comments`; it is distinct from the one close mutation.

## Preflight

Retrieve the target Issue with that fixed READONLY command and inspect its state. An already Closed target returns `up-to-date`
without mutation or an approval handoff; its existing close reason is retained. The handoff retains its
repository, number, URL, title, complete body, state, `updated_at`, selected
reason, operation digest, and planned command.

For `duplicate`, require exactly one different Issue number and retrieve that
Issue with that fixed READONLY command. Retain its URL, title, state, and snapshot SHA-256. Fix that
snapshot in the apply arguments and stop on an intervening change. Reject
`--duplicate-of` for other reasons.

The preflight is not approval. Display the complete operation with
`github.issue.handoff.review`, then wait for a separate user message whose
full trimmed text is exactly `approve` or `miku-scm approve`.

## Apply and Verification

Apply requires the reviewed operation digest, target body digest, exact current-comments digest, `updated_at`,
and reviewed apply workflow contract pair digest. Persist `pending`, retrieve
the target again, and record
`up-to-date` without mutation if it is already Closed. Other reviewed-state
changes remain `conflict` before a close mutation.

A `conflict` or pre-mutation `not-applied` attempt proves that `gh issue close`
was not invoked. A later preflight may therefore read and display the latest
Open Issue state. After a new human approval, apply archives the prior safe
attempt record and claims a new `pending` record before revalidation. Preserve
the archived record path in the new attempt. A `pending`, `closed`, or
`unresolved` attempt remains a hard stop and must never be retried or replaced.

Invoke `gh issue close` once. Then retrieve the target with fixed READONLY `gh issue view` and bounded retries. Require `closed` plus the selected state reason. A pre-mutation read failure is `not-applied`; never retry the mutation.

Attempt states are `pending`, `closed`, `conflict`, `not-applied`, and `unresolved`.

## Completion Report

Report the Issue URL, selected and verified reason, duplicate target when
applicable, operation digest, verification attempts, and attempt-record path.
Never imply success for conflict or unresolved results.
