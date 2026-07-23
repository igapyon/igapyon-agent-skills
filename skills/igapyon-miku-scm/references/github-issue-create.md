# GitHub New Issue Creation

Create a new public GitHub Issue only through the narrowly authorized `gh issue create` workflow. Keep all GitHub inspection on the anonymous REST API workflow. Existing-Issue body updates use the separate workflow in [github-issue-update.md](github-issue-update.md).

## Authorization Boundary

Issue drafting does not authorize Issue creation. After saving the draft, run the bundled helper in its default read-only preflight mode. Show the human:

- exact `owner/repo`
- reviewed title
- complete reviewed body
- draft path and SHA-256 digest
- the single planned `gh issue create` operation

Wait for explicit human approval after this display. Only that approval authorizes one apply attempt using the exact preflight digest. Earlier requests to draft, general permission to use this skill, or approval of a different Issue do not carry forward.

Preflight must stop when the same repository and draft SHA-256 already has a `pending` or `created` attempt record. A copied or renamed draft with identical reviewed content does not bypass this check.

## Allowed Command Surface

The only authorized `gh` invocation is:

```text
gh issue create --repo <owner/repo> --title <reviewed-title> --body-file <generated-temporary-body-file>
```

Use [scripts/github-issue-create.mjs](../scripts/github-issue-create.mjs); do not assemble or invoke the command independently. The helper separates the existing paste-ready draft into title and body, writes only the body to a temporary file, invokes `gh` without a shell, and removes the temporary file afterward.

Do not use:

- any other `gh issue` subcommand, including `edit`, `comment`, `close`, `reopen`, `delete`, `develop`, `lock`, `pin`, `transfer`, `unlock`, or `unpin`
- `gh api` or any non-Issue `gh` command
- `gh auth`, token inspection, credential requests, or scope changes
- interactive mode, `--web`, templates, labels, assignees, milestones, projects, Issue types, parent/sub-Issue links, blocking relationships, or other metadata flags

If authentication or authorization is unavailable, stop and report that the human must manage GitHub CLI authentication outside this skill. Do not broaden scopes or fall back to another mutation mechanism.

## Preflight and Apply

From the target repository root, run preflight:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \
  --repo <owner/repo> \
  --draft workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md
```

The helper accepts only new-Issue drafts beneath `workplace/miku-scm/new-issues/`, validates the paste-ready format, checks for prior attempts, and returns the digest and exact apply arguments. It does not invoke `gh` or create attempt records in preflight mode.

After explicit approval, pass the exact preflight digest and apply arguments:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-create.mjs \
  --repo <owner/repo> \
  --draft workplace/miku-scm/new-issues/issue-new-<YYYYMMDDHHMM>.md \
  --expected-draft-sha256 <reviewed-sha256> \
  --apply
```

Apply mode must stop if the repository, draft path, digest, title, or body cannot be resolved exactly. Immediately before invoking `gh`, it atomically creates:

```text
workplace/miku-scm/issue-attempts/<owner>/<repo>/<draft-sha256>.json
```

The initial status is `pending`. It is written and flushed before the remote request so a concurrent, interrupted, or later run cannot silently repeat the same attempt. The helper performs no automatic retry.

After confirmed success, the helper records the Issue number and URL with status `created`, then moves the unchanged draft to:

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
- local attempt-record path
- archived draft path, or a warning when local archival failed

If the URL is absent or unexpected, report the outcome as unresolved rather than implying success. Do not edit the newly created Issue as part of this workflow.

After confirmed creation, GitHub is the source of truth for the Issue and its server-assigned creation timestamp. The local `created` receipt and archived draft are duplicate-prevention and audit artifacts only. Do not treat their timestamps or content as a synchronized replacement for GitHub.
