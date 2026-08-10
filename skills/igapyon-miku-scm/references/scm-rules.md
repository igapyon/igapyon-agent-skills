# SCM Rules

This is the initial rule entry point for `igapyon-miku-scm`. Add detailed rules incrementally as concrete workflows are decided.

## Current Development Policy

- Keep public GitHub inspection READONLY by default.
- Outside a documented helper, implement public GitHub inspection through the anonymous REST API workflow.
- Inside a dedicated deterministic helper, prefer fixed `gh` commands for READONLY checks and authorized mutations under [github-cli-static-helper-policy.md](github-cli-static-helper-policy.md).
- Never let the AI Agent invoke `gh` directly. Do not assemble free-form `gh` commands, use a shell, accept arbitrary pass-through arguments, or expand one helper's allowlist implicitly.
- Defer general GitHub write operations, authentication, credential handling, and mutation workflows except for an explicitly documented human-approved workflow. Direct `gh` mutation is limited to the dedicated reviewed Issue or optional sub-Issue creation, content update, comment, existing-label update, and close workflows documented in this skill.
- Do not add, infer, or execute write behavior beyond an explicitly documented workflow unless the user explicitly resumes its design in a future task.
- Keep each write workflow separate and give it its own fixed helper, command allowlist, authorization boundary, and failure semantics.

## Graduated Authorization Model

Do not treat SCM safety as a single READONLY-versus-write boundary. Classify each operation by its impact and require the corresponding authorization level:

1. **Implicit inspection**: Run non-mutating local evidence commands such as `git status`, `git log`, and `git diff` when needed for an active SCM request.
2. **Implicit freshness refresh**: For a general repository or branch status request, run `git fetch --prune` under [local-git-readonly.md](local-git-readonly.md). This may update local remote-tracking refs and prune stale ones, but it must not change the working tree or the remote repository.
3. **Explicit local mutation**: Require an explicit user request and the operation-specific documented workflow before creating or renaming branches, changing versions, staging, committing, resetting, or otherwise changing local repository state. Apply any additional confirmation gate required by that workflow.
4. **Human-approved remote mutation**: Require an explicitly documented remote workflow and a human approval at the workflow's designated checkpoint immediately before pushing or performing another remote mutation. Earlier approval for preparation does not carry forward across that checkpoint.

Use the least-authorized level sufficient for the request. A lower level never implies authorization for a higher one. Preserve stricter workflow-specific prohibitions and confirmation gates when they apply.

Repository maintenance uses levels 1 and 3: diagnosis is implicit inspection,
plan saving writes only ignored operational data, and local branch deletion
requires an explicitly reviewed saved plan under
[repository-maintenance.md](repository-maintenance.md). General status,
diagnosis, plan creation, `すすめて`, and `整理して` never authorize deletion.

## Startup Work Branch Checkout

After the user identifies a concrete SCM task for a local repository, inspect the current branch before beginning that workflow:

```sh
git branch --show-current
git status --porcelain
```

Activation alone does not require repository inspection and does not authorize branch creation or switching. Apply this section only when the user's requested workflow explicitly requires modifying tracked content or creating an ordinary commit and no more specific branch/history workflow owns the operation.

Do not apply Startup Work Branch Checkout for:

- READONLY inspection, status, URL, tag, Release, asset, source, branch, Issue, or Actions queries
- PR, Release, About, or Issue drafting that writes only under `workplace/` or `temp/`
- standalone backup-branch creation
- PR Soft Reset Recommit, post-recommit publication, or Next Work Branch After PR Completion, which have their own branch rules

For these excluded workflows, keep the current branch checked out and apply only their operation-specific rules.

Apply these rules in order:

1. If the current branch ends in `-done`, do not create or switch branches under this section. Apply the Startup Frozen Branch Guard.
2. If the current branch already matches the prescribed `<base>-tiga<MMDD><hour-code><minute-tens-code><minute-ones-code>` work-branch form, keep it checked out and continue.
3. If the current branch is the base branch, normally `devel`, require a clean working tree. If it is not clean, stop before switching and report the paths that prevent startup preparation.
4. Fetch the selected remote, normally `origin`, and compare the local base with its remote-tracking branch:

```sh
git fetch origin
git rev-list --left-right --count HEAD...origin/<base>
```

5. Require the comparison result to be `0 0`. If the local base is ahead, behind, diverged, or the fetch fails, stop without changing branches and report the state. Do not pull, reset, or discard commits automatically.
6. Build a unique work-branch name using the naming rules under Next Work Branch After PR Completion. Confirm that the candidate does not already exist locally.
7. Create the branch from the verified remote base and switch to it, then verify status:

```sh
git switch -c <resolved-work-branch> origin/<base>
git status -sb
```

8. If the current branch is neither the base branch nor a prescribed work branch, do not switch automatically. Report the branch and wait for an explicit choice.

Use `switch` as the preferred modern Git term for this operation. The resulting repository must be left with the prescribed work branch checked out before ordinary requested work begins.

## Startup Frozen Branch Guard

After the user identifies a concrete SCM task for a local repository, inspect the current branch with `git branch --show-current` before beginning the requested workflow. Classify the workflow before deciding whether the frozen branch blocks it.

When the branch name ends in `-done`:

- Treat it as frozen. Do not edit files, stage, commit, reset, recommit, or begin other new work on that branch.
- Allow READONLY inspection and local GitHub draft writing under `workplace/` or `temp/` without asking whether the Pull Request was merged.
- Treat `-done` only as evidence that the post-recommit publication flow probably reached its local rename. It does not prove that GitHub received a Pull Request or that the Pull Request was merged.
- If the user's activating message explicitly reports that the Pull Request was merged, run the Next Work Branch After PR Completion workflow before doing any new work.
- If merge completion has not been explicitly reported, stop only before a tracked-content or history-mutating workflow and ask `GitHubのPRはマージ済みですか？` Do not infer the answer from local Git state, remote branch state, or the `-done` suffix.
- If the user says the Pull Request is not merged, keep the branch frozen. Allow read-only inspection and reporting, but require an explicitly documented recovery path before applying a correction.

After the human confirms that the Pull Request was merged, treat that confirmation as authorization to refresh the base and create the next work branch under the documented workflow. Continue other requested work only after switching to that new branch.

## PR Soft Reset Recommit Delegation

- Treat bare `recommit`, `pr recommit`, `pr soft reset recommit`, and `pr reset recommit` as explicit requests to run the PR Soft Reset Recommit workflow built into `igapyon-miku-scm`. Bare `recommit` implicitly includes PR writing; do not require a separate PR request.
- Treat the exact request `pr recommit push` as the distinct one-shot local
  rewrite and conditional-publication workflow in
  [github-pr-recommit-push.md](github-pr-recommit-push.md). It still requires
  the one PR-writing step, but the exact `push` token authorizes the fixed
  remote transition after the reviewed draft is available.
- Use [github-writing-rules.md](github-writing-rules.md), [github-pr-writing.md](github-pr-writing.md), [github-pr-soft-reset-recommit.md](github-pr-soft-reset-recommit.md), and [github-backup-branch.md](github-backup-branch.md) for PR draft composition, backup-branch creation, soft reset, and recommit behavior. Use the bundled `scripts/pr-soft-reset-recommit-preflight.mjs`; do not invoke `igapyon-github-writer`.
- Resolve the reset base before drafting and use the exact `<base>..HEAD` commit range that the helper will collapse. Inspect every commit and the complete diff for that range. For ordinary PR writing without an explicit target, use the same range by default when it contains two or more commits; keep an exactly one-commit branch as a single-commit PR.
- Before apply mode, compare the saved draft with `Commits To Collapse` and `Diff Stat`; require the title and body to cover every material change group in the collapsed range. If the draft covers a different scope, regenerate it before rewriting history.
- Do not invalidate a verified same-session version check merely because this workflow starts. This includes a completed increment and an explicit no-increment confirmation for the same content. Re-read the version sources, rerun their alignment check, and confirm that the recommit content has not changed; when they still match the session record, continue without the version reminder.
- Before delegating, require a clean working tree and run `git fetch origin` so the reset base is not resolved from stale remote-tracking information.
- Resolve the reset base, then require it to be an ancestor of the current `HEAD`:

```sh
git merge-base --is-ancestor <base> HEAD
```

- If the ancestry check fails, stop. Do not soft-reset onto the advanced base because preserving the old index can accidentally record removal of changes that exist only on the new base. Recover by starting from the refreshed base and carrying forward only the new work, or use a separately approved rebase workflow.
- Do not run this workflow from a branch ending in `-done`. Treat that branch as frozen and move legitimate follow-up work to a new branch from the refreshed base.
- After the delegated workflow succeeds, immediately run:

```sh
git log -1 | head -n 20
```

- Show the command output so the user can confirm the new commit hash, author, date, title, and the beginning of the PR-derived commit message.
- Run this post-check only after successful recommit. If recommit fails, report the failure instead of presenting the previous commit log as the new result.
- Do not push or create a Pull Request as part of this delegated workflow.

## One-Shot PR Recommit Push On macOS

Use the fixed `pr.recommit.push` runner workflow after the reviewed PR draft is
available. It validates the local candidate and fixes the remote branch state
before backup. After backup succeeds, it continues through recommit,
publication-plan creation, exact-lease or new-branch push, post-push equality,
and `-done` rename without another conversational approval.

If the remote expectation changes after recommit, it returns `partial` before
a remote mutation and leaves the ordinary work branch checked out. Do not retry
or force-push automatically. Use the reported backup and candidate HEAD for a
separately authorized recovery.

Current apply support is macOS only. Other platforms stop before backup; do not
remove that guard until the shared Windows platform migration is complete.

## Human-Approved Post-Recommit Publication On macOS

After a successful PR Soft Reset Recommit and the required `git log -1 | head -n 20` display, stop and wait for the human to inspect the commit log.

Use [github-post-recommit-publish.md](github-post-recommit-publish.md) and the bundled `scripts/post-recommit-publish.mjs` as the authoritative implementation. Before asking for publication approval, run its read-only preflight with the reviewed full local commit SHA. Show the resulting exact remote state and apply arguments with the commit log. For an existing remote branch, the preflight full remote SHA is part of the human-reviewed publication plan; for a new remote branch, the reviewed plan records that the exact destination branch is absent.

Proceed only when all of these conditions hold:

- the environment is macOS
- the working tree is clean
- the human explicitly says the displayed commit is OK and authorizes publication
- the target `<current-branch>-done` local branch does not already exist

After explicit approval, pass the exact preflight `apply_arguments` and `--apply` to the helper. Do not request another conversational approval after `ok push` while the reviewed local HEAD, branch, remote, and remote expectation remain unchanged. The helper must stop instead of guessing when any reviewed state changed.

For a new remote branch, the helper uses `git push -u origin HEAD:refs/heads/<current-branch>`. For an existing reviewed recommit branch, it requires `--expected-remote-head <reviewed-full-sha>` and uses `git push --force-with-lease=refs/heads/<current-branch>:<reviewed-full-sha> origin HEAD:refs/heads/<current-branch>`. Never use a remote-tracking ref updated by the helper's own fetch as an implicit lease expectation. Do not replace the explicit lease with plain `--force`, and do not use force for a new remote branch.

The helper runs fetch, push, post-push fetch, `0 0` comparison, rename, and status steps in order and stops immediately if any step fails. Do not run `git pull`. Only a successful `0 0` comparison permits the local `<current-branch>-done` rename. Do not treat earlier approval to run PR Soft Reset Recommit as approval to publish. Require the human's OK after displaying the new commit log and publication preflight. Do not create a Pull Request in this sequence.

After a successful push, remote verification, and local `-done` rename:

- Resolve the canonical GitHub browser URL from the selected repository remote under [github-repository-url.md](github-repository-url.md). Include `GitHubリポジトリ: <url>` in the push completion report. If it cannot be resolved safely, report `GitHubリポジトリ: 未解決` instead of guessing.
- Preserve the actual remote destination branch used by the successful push before renaming the local branch. Under [github-post-push-pr-url.md](github-post-push-pr-url.md), use that pushed branch—not a later local `-done` name or a differently named recovery branch—to resolve an existing Open PR URL or derive a PR creation URL. Include either `PR: <url>` or `PR作成URL: <url>` in the push completion report.
- Derive the recommended tag name from the committed authoritative version and the repository's resolved tag convention. Include `推奨タグ名: <tag>` in the push completion report. If the convention cannot be resolved, report `推奨タグ名: 未解決` instead of guessing.
- Always include the recommended-tag line in a successful push completion report, then end with the exact sentence `PRとタグはgithub上で操作してください。` Do not end with `PRとタグはまだ作成していません。` or omit the tag merely because it is unresolved.

This report does not authorize creating a Pull Request or creating or pushing the tag. Apply [github-release-tag-handoff.md](github-release-tag-handoff.md): the normal miku-soft next step is a human handoff to GitHub's Release creation screen, not a local `git tag` or tag push.

## GitHub UI-First Release Tag Handoff

When a recommended tag is reported after push or merge, use [github-release-tag-handoff.md](github-release-tag-handoff.md). Keep these facts distinct in user-facing reports:

- whether the feature branch was pushed
- whether the Pull Request was merged
- whether the recommended release tag exists
- whether a GitHub Release exists or is published

Do not collapse them into an ambiguous statement such as `まだpushしていません`. If only the tag remains, say `推奨タグはまだ作成されていません` or `タグのGitHub UI handoffが未実施です`.

Do not present local tag creation and push as the default continuation. Normally give the exact recommended tag name and let the human create or select it in GitHub's Release UI. Existing-tag movement or deletion is not part of this handoff.

## Next Work Branch After PR Completion

The fixed helper `scripts/post-merge-next-work.mjs --confirmed-merged --apply` is the authoritative one-command implementation of this workflow. It requires a clean `-done` branch, fetches the base, performs the advisory exact-tag check, creates the prescribed next branch, and verifies `0 0`. Do not run a separate `git switch -c` when this helper is available.

Run this workflow when the human explicitly reports that the Pull Request was merged. Treat a clear report such as `GitHubでマージした`, `PRをマージした`, or `マージ完了` as both confirmation of the merge and authorization to refresh the base and create the next work branch; do not require a second instruction to create it. Do not infer merge completion from local Git state, push output, or branch naming. Do not create the next work branch immediately after push or local `-done` rename while the PR is still open or its merge is unconfirmed.

Interpret a local branch name ending in `-done` only as an operational marker that the post-recommit publication sequence probably reached the rename performed after push. It does not prove that a Pull Request was created or merged. Never use `-done` alone to decide that PR work is complete; require the human's explicit statement that the PR was merged before running this workflow.

Treat a `-done` branch as frozen: do not add new work, stage changes, create commits, or run PR Soft Reset Recommit on it. After receiving the human's merge report, refresh the base, run the non-blocking recommended-tag check below, and create the next work branch before continuing. If the prior PR was not merged but a correction is required, stop and require an explicitly designed recovery path instead of silently continuing on `-done`.

When `--base` is omitted, first infer the base from a current branch that
matches the prescribed `<base>-tiga<MMDD><hour-code><minute-codes>-done`
shape. For a legacy or otherwise non-prescribed `-done` branch such as
`tiga0501xea-done`, fetch the selected remote and resolve its remote-tracking
`HEAD`, such as `origin/HEAD -> origin/devel`, as the base. Never treat the
feature branch's upstream (for example `origin/tiga0501xea`) or the full local
`-done` name as the next-work base. If neither the prescribed name nor the
selected remote's `HEAD` resolves a valid base, stop and require an explicit
`--base` without creating a branch.

### Non-Blocking Recommended Tag Check

After `git fetch origin` succeeds and before creating the next work branch:

1. Resolve the refreshed base commit, such as `origin/devel`.
2. Read the authoritative version source from that exact base commit without switching or editing the frozen branch. Do not derive the version from the frozen working tree when it may differ from the refreshed base.
3. Resolve the repository tag convention under [version-tag-release-audit.md](version-tag-release-audit.md) and derive the recommended tag. If the version source or convention cannot be resolved, report `推奨タグ確認: 未解決` with a warning and continue.
4. Check the selected remote for an exact tag ref. Do not accept a prefix match or a similarly named operational tag. A suitable read-only command shape is:

```sh
git ls-remote --tags origin "refs/tags/<recommended-tag>" "refs/tags/<recommended-tag>^{}"
```

5. When the exact tag is absent, report `注意: 推奨タグ <recommended-tag> がリモートにありません。GitHubのRelease作成画面で人が新しいタグとして作成する想定です。` Do not stop the next-work-branch workflow and do not propose a local tag push as the default repair.
6. When the tag exists, resolve its effective target commit, peeling an annotated tag when necessary, and compare it with the refreshed base commit. Report the tag as confirmed when they match. When they do not match, report both commit IDs as a warning and continue.
7. When the remote tag query fails, report `注意: 推奨タグ <recommended-tag> のリモート確認に失敗しました。` and continue. Do not silently treat a failed query as an absent tag.

Classify the structured `tag_status` as `confirmed`, `absent`, `mismatch`,
`lookup-failed`, or `unresolved`. These states are advisory and do not block
creation of the next work branch.

After successful branch creation and `0 0` verification, the fixed English
human output must report the previous branch, remote, base branch and commit,
version and source, recommended tag and its classified status, resolved tag
target when present, next and final branches, comparison, and tag and Release
mutation boundaries. End with the exact structured handoff:

```text
Next work branch is ready: <next-branch>
```

The renderer uses the structured result values and does not re-resolve branch,
version, tag, or commit information.

This check is advisory. A missing, mismatched, unresolved, or temporarily unqueryable recommended tag must never block creation of the next work branch. It does not authorize creating, moving, or pushing a tag, and it does not replace the fuller Release and distribution-asset audit.

Build the new branch name as:

```text
<base>-tiga<MMDD><hour-code><minute-tens-code><minute-ones-code>
```

Use these naming rules:

- `<base>` is the base branch name, such as `devel`.
- `tiga` identifies the user.
- `<MMDD>` is the local month and day, such as `0718` for July 18.
- Encode hour `0` through `23` with one zero-origin alphabet character: `a=0`, `b=1`, through `x=23`.
- Encode the two decimal minute digits separately with zero-origin alphabet characters: `a=0`, `b=1`, through `j=9`.
- Therefore minute `00` is `aa`, minute `45` is `ef`, and minute `59` is `fj`.

For example, `devel-tiga0718tef` means base `devel`, user `tiga`, July 18, 19:45.

After resolving a unique branch name from the current local date and time, fetch the base, perform the non-blocking recommended-tag check, then run:

```sh
git switch -c devel-tiga0718tef origin/devel
git status -sb
```

Replace the example branch and base with the resolved values. Stop if the base fetch fails or if the resolved local branch already exists. Do not stop for a tag-check warning. Report the recommended tag check result, final branch, and status.

For follow-up work accidentally committed after the previous PR content, prefer this recovery shape after human authorization:

1. Preserve the current `HEAD` with a local backup branch.
2. Run `git fetch origin` and create a new work branch from the refreshed base.
3. Carry forward only commits or patches that contain work not already merged into the base.
4. Verify the resulting diff against the base before publication.
5. Publish the new remote branch with `git push -u origin HEAD`; do not force-push it.

## Initial Safety Rules

- Inspect before changing.
- Route exact `miku-scm git add commit` to the fixed [work-commit.md](work-commit.md) runner. Its version notice is non-blocking; do not recreate a human confirmation gate or a sequence of ordinary Git commands around it.
- The legacy ordinary `git add` or `git commit` path retains [version-increment-confirmation.md](version-increment-confirmation.md) until it is replaced by `work.commit`.
- After staging and immediately before `git commit`, run the repository-declared consistency gates in [repository-precommit-checks.md](repository-precommit-checks.md). Do not commit after a failed or invalidated check.
- Resolve the exact repository, branch, remote, commit, tag, release, and version target needed for the request.
- Preserve unrelated working-tree changes.
- Treat local Git work and remote GitHub work as separate operations.
- Require an explicit user request before any remote mutation.
- Do not rewrite history, force-push, move or delete tags, publish or delete releases, or change versions without a documented workflow and explicit authorization.
- Verify repository state after an operation.

## Human-Approved New Issue Creation

- Keep drafting and label discovery READONLY. The creation helper uses fixed `gh label list` and `gh issue view` reads plus its fixed `gh issue create` mutation; any future command-surface additions require matching code, documentation, and tests.
- Use [github-issue-rewrite-handoff.md](github-issue-rewrite-handoff.md) to create the local paste-ready draft.
- Inspect the target repository's existing labels with the documented fixed Issue READONLY helper while drafting. When one or more labels clearly match the Issue evidence and repository semantics, actively propose them instead of omitting labels by default. Do not guess when classification is ambiguous, and never create or edit label definitions.
- When the user explicitly requests registration, use [github-issue-create.md](github-issue-create.md) and the bundled `scripts/github-issue-create.mjs` preflight/apply workflow.
- Require approval after displaying the exact repository, title, body, selected labels, optional parent Issue snapshot, every required digest, and planned operation. The helper may invoke only `gh issue create` with the reviewed title, body file, selected existing labels, and optional same-repository `--parent`, and must not retry automatically.
- For sub-Issue creation, require one positive same-repository parent Issue number. Retrieve and fix the Open parent snapshot during preflight, revalidate it immediately before mutation, and verify the created Issue's exact parent afterward through documented fixed `gh issue view` commands.
- Require the helper to verify every selected label through fixed `gh label list` before creating the attempt record. Fix the ordered label selection with its own SHA-256 digest, then verify the exact created Issue, requested labels, and optional parent together through one fixed `gh issue view` after successful creation.
- Require the helper to persist a `pending` attempt before the remote request, block repeated repository-plus-digest attempts, record the confirmed Issue URL plus label and parent verification, and archive the unchanged draft under `created-issues/`. A pending or malformed attempt record is a stop condition, not permission to retry.
- The AI Agent must not use `gh` directly. The current creation helper's fixed allowlist excludes inspection, authentication, existing-Issue changes, lifecycle changes, and non-Issue operations.

## Human-Approved Existing Issue Content Update

- Keep drafting evidence READONLY. The content-update helper uses its documented fixed READONLY `gh` commands from preflight through verification.
- Create the local paste-ready update under [github-issue-rewrite-handoff.md](github-issue-rewrite-handoff.md).
- When the user explicitly requests application, use [github-issue-update.md](github-issue-update.md) and the bundled `scripts/github-issue-update.mjs` preflight/apply workflow.
- Require approval after displaying the exact Issue; complete current and proposed titles and bodies; body diff; current, added, removed, and resulting labels; draft and update digests; current Issue snapshot digest; current `updated_at`; and planned command.
- Permit only one `gh issue edit` call containing reviewed changes to the title, body, and existing-label membership. Do not create or edit label definitions or change other Issue metadata.
- Immediately before `gh`, require the public Issue title/body/labels snapshot and `updated_at` to equal the reviewed values. Record `conflict` and stop without mutation when they differ.
- Use fixed READONLY `gh issue view --json number,url,title,body,labels,updatedAt` and `gh label list --limit 1000 --json name` inside the helper from preflight through post-update verification.
- Persist a `pending` attempt before mutation and verify the exact title, body, and complete label set afterward. Record a `gh issue view` failure before `gh issue edit` as `not-applied` with `gh_invoked: false`; preserve and archive that safe record when retrying the same reviewed operation. Record only post-mutation uncertainty as `unresolved`, and never retry it automatically.

## Human-Approved Issue Comment

- Use [github-issue-comment.md](github-issue-comment.md) and the bundled `scripts/github-issue-comment.mjs`.
- Permit only one `gh issue comment <number> --repo <owner/repo> --body-file <temporary-file>` call using the complete reviewed comment draft.
- Require approval after displaying the exact Issue state, complete comment, draft digest, Issue snapshot digest, `updated_at`, and planned command.
- Use fixed READONLY `gh issue view --json number,url,title,body,state,labels,updatedAt` for the reviewed Issue snapshot and `gh api --method GET repos/<owner/repo>/issues/comments/<comment-id>` for post-comment verification. Persist `pending`, detect an intervening Issue update as `conflict`, and verify the exact new comment URL and body. A pre-mutation READONLY failure is `not-applied`; bounded READONLY verification retries must never repeat the mutation.
- Do not edit or delete comments, use interactive or browser modes, or combine a comment with another mutation in one helper or `gh` command. The exact ordered handoff batch may orchestrate separately reviewed helpers and dependency-refresh only the allowlisted snapshot expectations in [approval-handoff.md](approval-handoff.md).

## Human-Approved Existing Issue Label Update

- Use [github-issue-label-update.md](github-issue-label-update.md) and the bundled `scripts/github-issue-label-update.mjs`.
- Permit one `gh issue edit` containing only reviewed repeated `--add-label` and `--remove-label` arguments for one Issue.
- Require every label to exist exactly in the repository. Reject overlap, no-op additions or removals, and label-definition changes.
- Require approval after displaying current, added, removed, and complete resulting labels plus operation, current-label, and resulting-label digests.
- Use fixed READONLY `gh label list --limit 1000 --json name` and `gh issue view --json number,url,title,state,labels,updatedAt` from preflight through verification. Persist `pending`, detect an intervening Issue change as `conflict`, and verify the complete resulting label set. A pre-mutation READONLY failure is `not-applied`; never retry the mutation.

## Human-Approved Issue Close

- Use [github-issue-close.md](github-issue-close.md) and the bundled `scripts/github-issue-close.mjs`.
- Permit one `gh issue close` for an Open Issue with exact reason `completed`, `not planned`, or `duplicate`.
- For `duplicate`, require and display one different, fixed-`gh issue view` verified target Issue and fix its reviewed snapshot digest through apply. Reject a duplicate target for other reasons.
- Require approval after displaying the complete current Issue, reason, duplicate target when applicable, operation digest, body digest, `updated_at`, and planned command.
- Use fixed READONLY `gh issue view --json number,url,title,body,state,stateReason,updatedAt` from preflight through verification. Persist `pending`, detect a non-Open or changed Issue as `conflict`, and verify the closed state and reason. A pre-mutation READONLY failure is `not-applied`; never retry the mutation.
- Permit a fresh close preflight after a recorded `conflict` or pre-mutation `not-applied`. A newly approved apply archives that safe no-mutation record before claiming a new attempt. Never archive, replace, or retry a `pending`, `closed`, or `unresolved` attempt.
- Do not add a closing comment in the close command and do not permit reopen under this workflow.

## Planned Rule Areas

- Git rules
- GitHub operation rules
- GitHub Release rules
- version-management rules
