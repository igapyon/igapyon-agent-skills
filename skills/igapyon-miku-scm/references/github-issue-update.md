# GitHub Existing Issue Body Update

Update the body of one existing public GitHub Issue only through the narrowly authorized, human-approved workflow in this document. Keep inspection anonymous and READONLY. Do not treat drafting or preflight as approval to mutate GitHub.

## Scope

This workflow permits only:

```text
gh issue edit <number> --repo <owner/repo> --body-file <generated-temporary-body-file>
```

Use [scripts/github-issue-update.mjs](../scripts/github-issue-update.mjs); do not assemble or invoke the command independently. The helper may update the body of exactly one Issue. It must not update the title, labels, assignees, milestone, project, Issue type, state, comments, relationships, or any other metadata.

Do not use `gh` for inspection, authentication, token or scope management, or fallback mutation. If authentication or authorization is unavailable, stop and let the human manage GitHub CLI authentication outside this skill.

## Draft and Preflight

First retrieve the current Issue and comments under [github-anonymous-readonly.md](github-anonymous-readonly.md), prepare the paste-ready update under [github-issue-rewrite-handoff.md](github-issue-rewrite-handoff.md), and save it as:

```text
workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md
```

Run the helper without `--apply`:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-update.mjs \
  --repo <owner/repo> \
  --issue <number> \
  --draft workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md
```

Preflight is READONLY. It rejects Pull Requests, a draft whose filename identifies another Issue, and any title that differs from the current Issue title. Show the human:

- exact `owner/repo#number` and Issue URL
- current title and complete current body
- proposed title and complete proposed body
- current-to-proposed body diff
- draft SHA-256 digest
- current body SHA-256 digest
- current `updated_at`
- the single planned `gh issue edit --body-file` operation

Wait for explicit human approval after displaying all of this evidence. Approval authorizes one attempt for only the displayed repository, Issue, draft digest, current body digest, and `updated_at`. Editing the draft or observing a changed Issue invalidates that approval.

## Apply and Conflict Detection

After explicit approval, use the exact `apply_arguments` returned by preflight:

```sh
node skills/igapyon-miku-scm/scripts/github-issue-update.mjs \
  --repo <owner/repo> \
  --issue <number> \
  --draft workplace/miku-scm/issue-updates/issue-<number>-update-<YYYYMMDDHHMM>.md \
  --expected-draft-sha256 <reviewed-draft-sha256> \
  --expected-current-body-sha256 <reviewed-current-body-sha256> \
  --expected-updated-at <reviewed-updated-at> \
  --apply
```

Before invoking `gh`, the helper atomically claims:

```text
workplace/miku-scm/issue-update-attempts/<owner>/<repo>/<number>/<draft-sha256>.json
```

It then retrieves the Issue again through the anonymous API. The title must still equal the unchanged draft title, and both of these reviewed values must still match:

```text
current updated_at == reviewed updated_at
current body digest == reviewed current body digest
```

If any comparison fails, record `conflict`, do not invoke `gh`, and require a new draft from the latest public Issue state. Do not merge or overwrite the intervening change automatically.

When the comparisons succeed, the helper writes only the proposed body to a private temporary file, invokes the one allowed `gh` command without a shell, and removes the temporary file. It performs no automatic retry.

## Post-Update Verification

After `gh` succeeds, retrieve the Issue through the anonymous API with cache bypass and require:

- the exact requested Issue number and URL
- a body exactly equal to the approved proposed body
- a valid resulting `updated_at`

Because a shared anonymous API cache can briefly return the pre-update representation, the helper may repeat only this READONLY verification a bounded number of times with short delays and a unique cache-busting request. It must never repeat `gh issue edit`. Record the number of verification attempts.

Only after exact verification record and report `updated`. If `gh` fails, every post-update read fails, or the body still cannot be confirmed exactly after bounded verification, record and report `unresolved`. Do not retry an `unresolved` mutation attempt because GitHub may already have accepted it.

## Attempt Records

Supported terminal states are:

- `updated`: the exact approved body was confirmed
- `conflict`: the Issue changed after review and `gh` was not invoked
- `unresolved`: the remote outcome or verification could not be established

`pending` is persisted before the mutation sequence. A pre-existing `pending`, `updated`, `conflict`, or `unresolved` record for the same repository, Issue, and draft digest blocks reuse of that draft. For a conflict, retrieve the latest Issue and create a new draft with a new digest. For pending or unresolved outcomes, inspect GitHub anonymously and design a separately approved recovery; never delete the record to enable an automatic retry.

## Completion Report

For a confirmed update, report:

- `Issue更新: 完了`
- Issue URL and target repository
- reviewed draft path and SHA-256 digest
- verified body SHA-256 digest and resulting `updated_at`
- local attempt-record path

For `conflict` or `unresolved`, name the state and evidence without implying success.
