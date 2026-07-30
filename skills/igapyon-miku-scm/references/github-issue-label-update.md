# GitHub Existing Issue Label Update

Change labels on one existing public GitHub Issue only through the narrowly
authorized, human-approved static-helper workflow in this document. Follow
[github-cli-static-helper-policy.md](github-cli-static-helper-policy.md).
The AI Agent must not invoke `gh` directly.

## Scope

The only allowed mutation is one command containing reviewed existing labels:

```text
gh issue edit <number> --repo <owner/repo> [--add-label <name>]... [--remove-label <name>]...
```

Use
[scripts/github-issue-label-update.mjs](../scripts/github-issue-label-update.mjs).
Do not assemble or invoke `gh` independently.
The helper must not change the title, body, assignees, milestone, project,
Issue type, relationships, state, or label definitions.

The helper's complete fixed `gh` command surface is:

```text
gh label list --repo <owner/repo> --limit 1000 --json name
gh issue view <number> --repo <owner/repo> --json number,url,title,state,labels,updatedAt
gh issue edit <number> --repo <owner/repo> [--add-label <name>]... [--remove-label <name>]...
```

The first two commands are READONLY and are distinct from the single mutation.
Every variable is validated, and no arbitrary argument is accepted.

## Preflight

Retrieve the Issue and complete repository label list with the fixed READONLY
commands above. Reject:

- labels that do not exist exactly in the repository
- a label requested for both addition and removal
- adding an already-present label or removing an absent label
- an empty or otherwise no-op change

Show the exact Issue, current labels, additions, removals, complete resulting
labels, operation digest, current-label digest, `updated_at`, and planned
command. Wait for explicit human approval.

## Apply and Verification

Apply requires the reviewed operation digest, current-label digest,
`updated_at`, and reviewed apply workflow contract pair digest. Persist
`pending`, retrieve the Issue again, and record
`conflict` without `gh` if the reviewed state changed.

Invoke `gh` once. Then retrieve the Issue with fixed READONLY `gh issue view`
and bounded verification retries. Require the complete resulting label set to
match. A pre-mutation READONLY failure is `not-applied`; a post-mutation
verification failure is `unresolved`. Never repeat the mutation.

Attempt states are `pending`, `updated`, `conflict`, `not-applied`, and `unresolved`.

## Completion Report

Report the Issue URL, complete verified labels, operation digest, verification
attempt count, and attempt-record path. Never imply success for a conflict or
unresolved result.
