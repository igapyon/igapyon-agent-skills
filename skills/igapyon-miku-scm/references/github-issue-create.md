# GitHub New Issue Creation

Create a new public GitHub Issue only through the narrowly authorized `gh issue create` workflow. Keep all GitHub inspection on the anonymous REST API workflow. Existing-Issue body updates use the separate workflow in [github-issue-update.md](github-issue-update.md).

## Authorization Boundary

Issue drafting does not authorize Issue creation. After saving the draft, run the bundled helper in its default read-only preflight mode. Show the human:

- exact `owner/repo`
- reviewed title
- complete reviewed body
- complete ordered list of reviewed existing labels, including an empty list when none is justified
- draft path and SHA-256 digest
- label-selection SHA-256 digest
- the single planned `gh issue create` operation

Wait for explicit human approval after this display. Only that approval authorizes one apply attempt using the exact draft and label-selection digests. Earlier requests to draft, general permission to use this skill, or approval of a different Issue do not carry forward.

Preflight must stop when the same repository and draft SHA-256 already has a `pending` or `created` attempt record. A copied or renamed draft with identical reviewed content does not bypass this check.

## Allowed Command Surface

The only authorized `gh` invocation is:

```text
gh issue create --repo <owner/repo> --title <reviewed-title> --body-file <generated-temporary-body-file> [--label <reviewed-existing-label>]...
```

Use [scripts/github-issue-create.mjs](../scripts/github-issue-create.mjs); do not assemble or invoke the command independently. The helper separates the existing paste-ready draft into title and body, validates each requested label against the target repository's complete anonymous public label list, writes only the body to a temporary file, invokes `gh` without a shell, and removes the temporary file afterward.

Before preflight, inspect the repository's labels under [github-anonymous-readonly.md](github-anonymous-readonly.md). Actively select each exact existing label clearly supported by the Issue and repository conventions. Do not omit an evident classification merely because the human did not name a label. Do not infer an unsupported label, substitute a near-match such as `enhance` for an existing `enhancement`, or create a missing label.

Do not use:

- any other `gh issue` subcommand, including `edit`, `comment`, `close`, `reopen`, `delete`, `develop`, `lock`, `pin`, `transfer`, `unlock`, or `unpin`
- `gh api` or any non-Issue `gh` command
- `gh auth`, token inspection, credential requests, or scope changes
- interactive mode, `--web`, templates, assignees, milestones, projects, Issue types, parent/sub-Issue links, blocking relationships, or metadata flags other than the reviewed repeated `--label`
- `gh label` commands or any attempt to create, edit, rename, or delete a label definition

If authentication or authorization is unavailable, stop and report that the human must manage GitHub CLI authentication outside this skill. Do not broaden scopes or fall back to another mutation mechanism.

## Preflight and Apply

From the target repository root, run preflight:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \
  --repo <owner/repo> \
  --draft workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md \
  --label <existing-label>
```

Repeat `--label` for each selected label, or omit it when no existing label is sufficiently supported. The helper accepts only new-Issue drafts beneath `workplace/miku-scm/new-issues/`, validates the paste-ready format and each selected label, checks for prior attempts, and returns both digests and exact apply arguments. It does not invoke `gh` or create attempt records in preflight mode.

After explicit approval, pass the exact preflight digest and apply arguments:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \
  --repo <owner/repo> \
  --draft workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md \
  --label <reviewed-existing-label> \
  --expected-draft-sha256 <reviewed-sha256> \
  --expected-labels-sha256 <reviewed-labels-sha256> \
  --apply
```

Pass exactly the reviewed repeated `--label` arguments, or omit them when the reviewed list was empty. Apply mode must stop if the repository, draft path, either digest, title, body, or ordered label selection cannot be resolved exactly. It revalidates the selected labels against the repository immediately before claiming the attempt. Immediately before invoking `gh`, it atomically creates:

```text
workplace/miku-scm/issue-attempts/<owner>/<repo>/<draft-sha256>.json
```

The initial status is `pending`. It is written and flushed before the remote request so a concurrent, interrupted, or later run cannot silently repeat the same attempt. The helper performs no automatic retry.

After confirmed success, the helper records the Issue number, URL, requested labels, and anonymous label-verification result with status `created`, then moves the unchanged draft to:

```text
workplace/miku-scm/created-issues/<owner>/<repo>/
```

If `gh` fails, is interrupted, or returns no expected URL, keep the `pending` record and the draft under `new-issues/`. Treat the remote outcome as uncertain. Inspect the public repository anonymously for a matching Issue and report the evidence before designing a separately approved recovery; do not delete the record or retry automatically.

## Completion Report

Treat creation as confirmed only when the command succeeds and returns the exact new Issue URL for the selected repository. Report:

- `Issue登録: 完了`
- Issue URL
- target repository
- reviewed draft path and SHA-256 digest
- reviewed labels and label-selection SHA-256 digest
- label verification as `verified`, `mismatch`, `unresolved`, or `not-requested`
- local attempt-record path
- archived draft path, or a warning when local archival failed

If the URL is absent or unexpected, report the outcome as unresolved rather than implying success. When the Issue URL is confirmed but requested-label verification is `mismatch` or `unresolved`, report that the Issue was created and separately warn that its labels were not confirmed; never retry creation. Do not edit the newly created Issue as part of this workflow.

After confirmed creation, GitHub is the source of truth for the Issue and its server-assigned creation timestamp. The local `created` receipt and archived draft are duplicate-prevention and audit artifacts only. Do not treat their timestamps or content as a synchronized replacement for GitHub.
