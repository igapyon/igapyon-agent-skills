# GitHub Existing Issue Label Update

Change labels on one existing public GitHub Issue only through the narrowly
authorized, human-approved workflow in this document.

## Scope

The only allowed mutation is one command containing reviewed existing labels:

```text
gh issue edit <number> --repo <owner/repo> [--add-label <name>]... [--remove-label <name>]...
```

Use
[scripts/github-issue-label-update.mjs](../scripts/github-issue-label-update.mjs).
The helper must not change the title, body, assignees, milestone, project,
Issue type, relationships, state, or label definitions.

## Preflight

Retrieve the Issue and complete repository label list anonymously. Reject:

- labels that do not exist exactly in the repository
- a label requested for both addition and removal
- adding an already-present label or removing an absent label
- an empty or otherwise no-op change

Show the exact Issue, current labels, additions, removals, complete resulting
labels, operation digest, current-label digest, `updated_at`, and planned
command. Wait for explicit human approval.

## Apply and Verification

Apply requires the reviewed operation digest, current-label digest, and
`updated_at`. Persist `pending`, retrieve the Issue again, and record
`conflict` without `gh` if the reviewed state changed.

Invoke `gh` once. Then retrieve the Issue anonymously with cache bypass and
bounded READONLY retries. Require the complete resulting label set to match.
Never repeat the mutation.

Attempt states are `pending`, `updated`, `conflict`, and `unresolved`.

## Completion Report

Report the Issue URL, complete verified labels, operation digest, verification
attempt count, and attempt-record path. Never imply success for a conflict or
unresolved result.
