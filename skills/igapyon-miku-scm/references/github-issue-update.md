# GitHub Existing Issue Content Update

Update the title, body, and existing labels of one public GitHub Issue through the narrowly authorized, human-approved static-helper workflow in this document. Follow [github-cli-static-helper-policy.md](github-cli-static-helper-policy.md). The AI Agent must not invoke `gh` directly. Keep drafting and preflight READONLY, and do not treat either as approval to mutate GitHub.

## Scope

This workflow's static helper permits only these READONLY commands:

```text
gh issue view <number> --repo <owner/repo> --json number,url,title,body,labels,updatedAt
gh label list --repo <owner/repo> --limit 1000 --json name
```

and this one mutation command:

```text
gh issue edit <number> --repo <owner/repo> \
  [--title <reviewed-title>] \
  [--body-file <generated-temporary-body-file>] \
  [--add-label <reviewed-existing-label>]... \
  [--remove-label <reviewed-existing-label>]...
```

Use [scripts/github-issue-update.mjs](../scripts/github-issue-update.mjs); do not assemble or invoke the command independently. The helper may update the title, body, and existing-label membership of exactly one Issue in one command. It must not create or edit label definitions or update assignees, milestone, project, Issue type, state, comments, relationships, or any other metadata.

At least one of the title, body, or label membership must change. Every requested label must already exist exactly in the repository. Reject overlap, adding a present label, removing an absent label, and more than 20 label changes.

Use the fixed READONLY commands from preflight through post-update verification. Validate every complete response. Do not assemble these commands outside the helper, add fields, enter interactive mode, or use them for authentication management. If a read fails before `gh issue edit`, record `not-applied`; do not imply an uncertain remote result.

## Draft and Preflight

Prepare the paste-ready update under [github-issue-rewrite-handoff.md](github-issue-rewrite-handoff.md), including relevant current Issue and comment evidence, and save it as:

```text
workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md
```

Run the helper without `--apply`:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-update.mjs \
  --repo <owner/repo> \
  --issue <number> \
  --draft workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md \
  [--add-label <existing-label>]... \
  [--remove-label <existing-label>]...
```

Preflight is READONLY and uses only the fixed `gh issue view` and, when label changes are requested, `gh label list` commands. It rejects Pull Requests and a draft whose filename identifies another Issue. Show the human:

- exact `owner/repo#number` and Issue URL
- current title and complete current body
- proposed title and complete proposed body
- current-to-proposed body diff
- current labels, label additions and removals, and complete resulting labels
- draft SHA-256 digest
- complete update SHA-256 digest
- current title, body, labels, and complete Issue snapshot SHA-256 digests
- current `updated_at`
- the single exact planned `gh issue edit` operation

Wait for explicit human approval after displaying all of this evidence. Approval authorizes one attempt for only the displayed repository, Issue, draft digest, current body digest, `updated_at`, and apply workflow contract pair. Editing the draft, changing the workflow contract, or observing a changed Issue invalidates that approval.

When this handoff is a later step in one explicitly ordered approval batch for the same Issue, the batch runner may perform the dependency preflight defined in [approval-handoff.md](approval-handoff.md). It may refresh only the state expectations permitted there; the reviewed repository, Issue, draft and operation digests, label operations, and contract pair remain fixed.

## Apply and Conflict Detection

After explicit approval, use the exact `apply_arguments` returned by preflight:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-update.mjs \
  --repo <owner/repo> \
  --issue <number> \
  --draft workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md \
  [--add-label <existing-label>]... \
  [--remove-label <existing-label>]... \
  --expected-draft-sha256 <reviewed-draft-sha256> \
  --expected-update-sha256 <reviewed-update-sha256> \
  --expected-current-issue-sha256 <reviewed-current-issue-sha256> \
  --expected-updated-at <reviewed-updated-at> \
  --expected-contract-pair-sha256 <reviewed-contract-sha256> \
  --apply
```

Before invoking `gh`, the helper atomically claims:

```text
workplace/miku-scm/issue-update-attempts/<owner>/<repo>/<number>/<update-sha256>.json
```

It then retrieves the Issue through the fixed READONLY `gh issue view` command. Both reviewed values must still match:

```text
current updated_at == reviewed updated_at
current title/body/labels snapshot digest == reviewed snapshot digest
```

If any comparison fails, record `conflict`, do not invoke `gh`, and require a new draft from the latest public Issue state. Do not merge or overwrite the intervening change automatically.

If `gh issue view` fails, record `not-applied` with `gh_invoked: false`. A later invocation may archive that safe record and retry the same reviewed operation because the draft, update digest, current snapshot digest, and `updated_at` remain fixed and are all checked again before mutation. Preserve the archived record; do not delete it.

When the comparisons succeed, the helper writes the proposed body to a private temporary file when needed, invokes the one allowed `gh` command without a shell, and removes the temporary file. It performs no automatic retry.

## Post-Update Verification

After `gh issue edit` succeeds, retrieve the Issue through the same fixed READONLY `gh issue view` command and require:

- the exact requested Issue number and URL
- a title and body exactly equal to the approved proposal
- a complete label set exactly equal to the approved result
- a valid resulting `updated_at`

Because GitHub's read representation can briefly lag the mutation, the helper may repeat only `gh issue view` a bounded number of times with short delays. It must never repeat `gh issue edit`. Record the number of verification attempts.

Only after exact verification record and report `updated`. If `gh` fails, every post-update read fails, or the body still cannot be confirmed exactly after bounded verification, record and report `unresolved`. Do not retry an `unresolved` mutation attempt because GitHub may already have accepted it.

## Attempt Records

Supported terminal states are:

- `not-applied`: every failure occurred before `gh issue edit`; no remote mutation was invoked
- `updated`: the exact approved title, body, and labels were confirmed
- `conflict`: the Issue changed after review and `gh` was not invoked
- `unresolved`: the remote outcome or verification could not be established

`pending` is persisted before the mutation sequence. A pre-existing `pending`, `updated`, `conflict`, or post-mutation `unresolved` record for the same repository, Issue, and update digest blocks reuse. A `not-applied` record, including the legacy equivalent `unresolved` at stage `pre-update-read`, may be archived and followed by one new atomic attempt for the same reviewed operation. For a conflict, retrieve the latest Issue and create a new draft. Never retry a pending or post-mutation unresolved result.

## Completion Report

For a confirmed update, report:

- `Issue更新: 完了`
- Issue URL and target repository
- reviewed draft path, draft digest, and complete update digest
- verified title, body digest, labels digest, and resulting `updated_at`
- local attempt-record path

For `not-applied`, `conflict`, or `unresolved`, name the state and evidence without implying success. For `not-applied`, explicitly report `gh issue edit: 未実行`.
