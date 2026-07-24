# GitHub Issue Comment

Add one comment to one existing public GitHub Issue only through the narrowly
authorized, human-approved static-helper workflow in this document. Follow
[github-cli-static-helper-policy.md](github-cli-static-helper-policy.md).
The AI Agent must not invoke `gh` directly. Drafting or preflight never
authorizes publication.

## Scope

The only allowed mutation is:

```text
gh issue comment <number> --repo <owner/repo> --body-file <generated-temporary-body-file>
```

Use [scripts/github-issue-comment.mjs](../scripts/github-issue-comment.mjs).
Do not assemble or invoke `gh` independently. Comment editing, deletion, interactive
editing, browser mode, and comments combined with another Issue mutation are
outside this workflow.

## Draft and Preflight

Save only the complete comment Markdown under:

```text
workplace/miku-scm/issue-comments/issue-<number>-comment-<YYYYMMDDHHMM>.md
```

Run preflight without `--apply`. Show the human:

- exact repository, Issue number, URL, title, state, `updated_at`, and Issue snapshot SHA-256
- complete proposed comment body
- draft path and SHA-256 digest
- the single planned `gh issue comment --body-file` operation

Wait for explicit approval after displaying this evidence.

## Apply and Verification

Apply requires the exact draft digest, Issue snapshot digest, and reviewed
Issue `updated_at`. Before
`gh`, the helper records a `pending` attempt and retrieves the Issue again. A
changed `updated_at`, URL, title, or state is a conflict and prevents mutation.

After `gh` returns the exact new comment URL, retrieve that comment anonymously
with cache bypass. Bounded retries are allowed only for this READONLY
verification; never repeat `gh issue comment`. Require the exact Issue,
comment URL, and approved body before reporting success.

Attempt states are `pending`, `commented`, `conflict`, and `unresolved`.
Never reuse a draft after any attempt state.

## Completion Report

Report the Issue URL, new comment URL, reviewed draft and digest, verification
attempt count, and local attempt-record path. For conflict or unresolved
results, name the state without implying that another attempt is safe.
