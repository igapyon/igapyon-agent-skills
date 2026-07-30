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

The helper's complete fixed `gh` command surface is:

```text
gh issue view <number> --repo <owner/repo> --json number,url,title,body,state,labels,updatedAt
gh issue comment <number> --repo <owner/repo> --body-file <generated-temporary-body-file>
gh api --method GET repos/<owner/repo>/issues/comments/<comment-id>
```

The first and third commands are READONLY and are separate from the one mutation
command. `<owner/repo>`, `<number>`, and `<comment-id>` are validated values;
the comment ID is accepted only from the exact URL returned by the fixed mutation.

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

Apply requires the exact draft digest, Issue snapshot digest, reviewed Issue
`updated_at`, and reviewed apply workflow contract pair digest. Before
`gh`, the helper records a `pending` attempt and retrieves the Issue again. A
changed `updated_at`, URL, title, body, state, or complete label set is a
conflict and prevents mutation.

After `gh` returns the exact new comment URL, retrieve that comment through the
fixed READONLY `gh api` command. Bounded retries are allowed only for this
READONLY verification; never repeat `gh issue comment`. Require the exact Issue,
comment URL, and approved body before reporting success. A pre-mutation READONLY
failure is recorded as `not-applied`; a post-mutation verification failure is
`unresolved`.

Attempt states are `pending`, `commented`, `conflict`, `not-applied`, and `unresolved`.
Never reuse a draft after any attempt state.

## Completion Report

Report the Issue URL, new comment URL, reviewed draft and digest, verification
attempt count, and local attempt-record path. For conflict or unresolved
results, name the state without implying that another attempt is safe.
