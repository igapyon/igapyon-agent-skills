# GitHub Issue Close

Close one existing public GitHub Issue only through the narrowly authorized,
human-approved static-helper workflow in this document. Follow
[github-cli-static-helper-policy.md](github-cli-static-helper-policy.md).
The AI Agent must not invoke `gh` directly.

## Scope

The only allowed mutation is:

```text
gh issue close <number> --repo <owner/repo> --reason <completed|not planned|duplicate> [--duplicate-of <number>]
```

Use [scripts/github-issue-close.mjs](../scripts/github-issue-close.mjs).
Do not assemble or invoke `gh` independently. Do not add a closing comment in
this command. Use the separately approved
Issue-comment workflow when a comment is needed. Reopen is outside this scope.

## Preflight

Retrieve the target Issue anonymously and require it to be Open. Show its
repository, number, URL, title, complete body, state, `updated_at`, selected
reason, operation digest, and planned command.

For `duplicate`, require exactly one different Issue number and retrieve that
Issue anonymously. Show its URL, title, state, and snapshot SHA-256. Fix that
snapshot in the apply arguments and stop on an intervening change. Reject
`--duplicate-of` for other reasons.

Wait for explicit human approval after displaying all evidence.

## Apply and Verification

Apply requires the reviewed operation digest, target body digest, and
`updated_at`. Persist `pending`, retrieve the target again, and record
`conflict` without `gh` if it is no longer Open or the reviewed state changed.

Invoke `gh issue close` once. Then retrieve the target anonymously with cache
bypass and bounded READONLY retries. Require `closed` plus the selected state
reason. Never retry the mutation.

Attempt states are `pending`, `closed`, `conflict`, and `unresolved`.

## Completion Report

Report the Issue URL, selected and verified reason, duplicate target when
applicable, operation digest, verification attempts, and attempt-record path.
Never imply success for conflict or unresolved results.
