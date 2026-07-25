# GitHub New Issue Creation

Create a new public GitHub Issue only through the narrowly authorized static-helper workflow. Follow [github-cli-static-helper-policy.md](github-cli-static-helper-policy.md). The AI Agent must not invoke `gh` directly. Existing-Issue title, body, and existing-label updates use the separate workflow in [github-issue-update.md](github-issue-update.md).

## Authorization Boundary

Issue drafting does not authorize Issue creation. After saving the draft, run the bundled helper in its default read-only preflight mode. Show the human:

- exact `owner/repo`
- reviewed title
- complete reviewed body
- complete ordered list of reviewed existing labels, including an empty list when none is justified
- optional parent Issue number, complete parent snapshot, and parent snapshot SHA-256 digest
- draft path and SHA-256 digest
- label-selection SHA-256 digest
- the single planned `gh issue create` operation

Wait for explicit human approval after this display. Only that approval authorizes one apply attempt using the exact draft and label-selection digests. Earlier requests to draft, general permission to use this skill, or approval of a different Issue do not carry forward.

Preflight must stop when the same repository and draft SHA-256 already has a `pending` or `created` attempt record. A copied or renamed draft with identical reviewed content does not bypass this check.

## Allowed Command Surface

The current helper permits these fixed READONLY commands:

```text
gh label list --repo <owner/repo> --limit 1000 --json name

gh issue view <parent-number> --repo <owner/repo> \
  --json number,url,title,state,updatedAt

gh issue view <created-number> --repo <owner/repo> \
  --json number,url,labels,parent
```

Its only authorized mutation command is:

```text
gh issue create --repo <owner/repo> --title <reviewed-title> \
  --body-file <generated-temporary-body-file> \
  [--label <reviewed-existing-label>]... [--parent <reviewed-parent-number>]
```

Use [scripts/github-issue-create.mjs](../scripts/github-issue-create.mjs); do not assemble or invoke the commands independently. The helper separates the existing paste-ready draft into title and body, validates each requested label through the fixed `gh label list`, accepts at most one positive same-repository parent Issue number, writes only the body to a temporary file, invokes `gh` without a shell, and removes the temporary file afterward. After creation, it retrieves the exact Issue, complete labels, and optional parent in one fixed `gh issue view` call.

When `--parent` is present, require the parent to be an exact Open Issue in the same repository. Fix its number, URL, title, state, and `updated_at` as one snapshot digest during preflight. Apply mode must retrieve that exact parent again and stop before mutation when the digest changes.

During drafting, inspect the repository's public labels with the fixed `github-issue-read.mjs --labels` helper documented in [github-cli-static-helper-policy.md](github-cli-static-helper-policy.md) and actively select each exact existing label clearly supported by the Issue and repository conventions. During registration preflight and apply, the helper independently validates the reviewed labels with its fixed `gh label list`. Do not omit an evident classification merely because the human did not name a label. Do not infer an unsupported label, substitute a near-match such as `enhance` for an existing `enhancement`, or create a missing label.

Do not use:

- any other `gh issue` subcommand, including `edit`, `comment`, `close`, `reopen`, `delete`, `develop`, `lock`, `pin`, `transfer`, `unlock`, or `unpin`
- `gh api` or any non-Issue/non-label-list `gh` command
- `gh auth`, token inspection, credential requests, or scope changes
- interactive mode, `--web`, templates, assignees, milestones, projects, Issue types, blocking relationships, or metadata flags other than the reviewed repeated `--label` and optional single `--parent`
- adding, removing, or replacing the parent of an existing Issue; adding or removing an existing sub-Issue
- any `gh label` command other than the fixed READONLY `gh label list`, or any attempt to create, edit, rename, or delete a label definition

If authentication or authorization is unavailable, stop and report that the human must manage GitHub CLI authentication outside this skill. Do not broaden scopes or fall back to another mutation mechanism.

## Preflight and Apply

From the target repository root, run preflight:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \
  --repo <owner/repo> \
  --draft workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md \
  [--label <existing-label>]... \
  [--parent <parent-issue-number>]
```

Repeat `--label` for each selected label, or omit it when no existing label is sufficiently supported. Add `--parent` only when the new Issue must be created as a reviewed sub-Issue. The helper accepts only new-Issue drafts beneath `workplace/miku-scm/new-issues/`, validates the paste-ready format and each selected label through fixed READONLY `gh`, checks for prior attempts, retrieves an optional parent through its fixed `gh issue view`, and returns every digest and exact apply arguments. It does not create attempt records or invoke the mutation command in preflight mode.

After explicit approval, pass the exact preflight digest and apply arguments:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \
  --repo <owner/repo> \
  --draft workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md \
  [--label <reviewed-existing-label>]... \
  [--parent <reviewed-parent-number>] \
  --expected-draft-sha256 <reviewed-sha256> \
  --expected-labels-sha256 <reviewed-labels-sha256> \
  [--expected-parent-sha256 <reviewed-parent-sha256>] \
  --apply
```

Pass exactly the reviewed repeated `--label` arguments and optional parent, or omit them when they were absent in the reviewed preflight. Apply mode must stop if the repository, draft path, any required digest, title, body, ordered label selection, or parent snapshot cannot be resolved exactly. It revalidates the selected labels and optional parent through the same fixed READONLY commands before claiming the attempt. Immediately before invoking the mutation, it atomically creates:

```text
workplace/miku-scm/issue-attempts/<owner>/<repo>/<draft-sha256>.json
```

The initial status is `pending`. It is written and flushed before the remote request so a concurrent, interrupted, or later run cannot silently repeat the same attempt. The helper performs no automatic retry.

After the mutation returns the exact Issue URL, the helper uses one fixed `gh issue view --json number,url,labels,parent` call to verify the created Issue and derive both the label- and parent-verification results. It records the Issue-verification, requested labels, label-verification, and parent-verification results with status `created`, then moves the unchanged draft to:

```text
workplace/miku-scm/created-issues/<owner>/<repo>/
```

If `gh` fails, is interrupted, or returns no expected URL, keep the `pending` record and the draft under `new-issues/`. Treat the remote outcome as uncertain. Inspect the public repository with the fixed Issue READONLY helper for a matching Issue and report the evidence before designing a separately approved recovery; do not delete the record or retry automatically.

## Completion Report

Treat creation as confirmed only when the command succeeds and returns the exact new Issue URL for the selected repository. Report:

- `Issue登録: 完了`
- Issue URL
- target repository
- reviewed draft path and SHA-256 digest
- reviewed labels and label-selection SHA-256 digest
- label verification as `verified`, `mismatch`, `unresolved`, or `not-requested`
- parent snapshot and digest, plus parent verification as `verified`, `mismatch`, `unresolved`, or `not-requested`
- created-Issue verification as `verified` or `unresolved`
- local attempt-record path
- archived draft path, or a warning when local archival failed

If the URL is absent or unexpected, report the outcome as unresolved rather than implying success. When the Issue URL is confirmed but requested-label or parent verification is `mismatch` or `unresolved`, report that the Issue was created and separately warn which metadata was not confirmed; never retry creation. Do not edit the newly created Issue as part of this workflow.

After confirmed creation, GitHub is the source of truth for the Issue and its server-assigned creation timestamp. The local `created` receipt and archived draft are duplicate-prevention and audit artifacts only. Do not treat their timestamps or content as a synchronized replacement for GitHub.
