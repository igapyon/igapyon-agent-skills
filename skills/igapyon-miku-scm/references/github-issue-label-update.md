# GitHub Existing Issue Label Update

**Agent approval path:** run preparation through the fixed miku-scm runner,
save the returned handoff, display its complete content with
`github.issue.handoff.review`, then stop and wait for the user's exact
`approve` message. Apply only through `github.issue.handoff.apply` or the
reviewed batch workflow. The helper command examples below describe the
internal operation contract; the Agent must not invoke this script's `--apply`
mode directly.

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
gh issue view <number> --repo <owner/repo> --json number,url,title,body,state,labels,updatedAt,comments
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

The handoff retains the exact Issue, current labels, additions, removals,
complete resulting labels, operation digest, current-label digest, `updated_at`,
and planned command. The preflight is not approval. Display the complete
operation with
`github.issue.handoff.review`, then wait for a separate user message whose
full trimmed text is exactly `approve` or `miku-scm approve`.

When this handoff is a later step in one explicitly ordered approval batch for
the same Issue, the batch runner may perform the dependency preflight defined
in [approval-handoff.md](approval-handoff.md). It may refresh only the state
expectations permitted there; the reviewed repository, Issue, label operations,
operation digest, and contract pair remain fixed.

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
