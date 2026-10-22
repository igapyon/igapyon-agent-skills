---
name: igapyon-miku-scm
description: Use only when the user explicitly names `igapyon-miku-scm`, explicitly asks to apply the miku SCM workflow, explicitly says `recommit` or `draft recommit push` to invoke the miku-soft PR-text drafting, soft-reset, and optional push flow, or explicitly asks to perform Git, GitHub writing, GitHub Release, repository-maintenance, or version-management work under miku-soft SCM rules. Supports PR-text, Release, About, and public GitHub Issue drafting; human-approved Issue and optional sub-Issue creation, title/body/existing-label updates, comments, standalone existing-label changes, and closure through narrowly documented `gh` workflows; PR soft-reset recommit; backup, branch-status, and three-stage local repository-maintenance workflows; date-based and Semantic Version increments; and READONLY version, tag, Release, and asset audits. Do not activate for generic Git or GitHub questions, ordinary repository inspection, or release-note writing outside an explicit miku-soft SCM request.
---

# igapyon-miku-scm

Run documented miku-soft source-control workflows with a small runtime context.
Detailed policy remains under `references/` for design, maintenance, legacy
operations, and exceptions; migrated workflows execute through the fixed runner.

## Current Scope

Support repository status and maintenance; PR-text, Release, About, and Issue work;
recommit, publication, backup, and post-merge work; version and release audits;
and deterministic READONLY, preflight, and apply workflows.

## Activation-Only Fast Path

If no concrete SCM task is given, acknowledge activation and ask what is wanted.
Do not inspect the repository or load detailed references yet.

## Normal Work Flow

The usual sequence is:

1. `miku-scm git add commit`: run `work.commit --apply` to stage and commit
   the current changes.
2. `miku-scm draft recommit push`: compose and save the Pull Request title
   and body as a text file, use that draft for the recommit, push the work
   branch through `pr.recommit.push`, and rename the local branch with
   `-done`.
3. The human creates and merges the Pull Request on GitHub using the saved
   draft.
4. `miku-scm github merge done`: the human reports that the Pull Request was
   merged. Run `repository.post-merge.next-work --confirmed-merged --apply`
   to refresh the base, check the recommended tag, and create and switch to
   the next work branch.

Run each SCM stage when the user requests it, with that workflow's checks and
authorization. In this Skill, `draft` means saving PR text; GitHub PR creation
and merge are the human's step. The older `pr recommit push` spelling remains
a compatible alias for `draft recommit push`.

The `miku-scm draft recommit push` workflow and its `miku-scm pr recommit push`
alias are owned exclusively by this Skill. Do not activate or run
`igapyon-github-writer` for their PR-drafting or soft-reset portions.

### Unstaged Work Remaining After Merge

When `miku-scm github merge done` is requested on a `-done` branch with
unstaged changes or untracked files, use the same
`repository.post-merge.next-work --confirmed-merged --apply` workflow. It
stashes those changes with `--include-untracked`, creates the next branch
from the refreshed base, and restores them with `stash apply` using the exact
SHA of the stash it created. Restored changes remain unstaged. Retain that
stash after success as well as failure; use the reported SHA for recovery.
Staged changes remain a blocker. On a failure, report the stopped stage,
current branch, and retained stash; preserve the partial state for recovery.

## Runtime Kernel

1. Identify the exact repository and classify the request with
   [scripts/miku-scm-workflow-manifest.mjs](scripts/miku-scm-workflow-manifest.mjs).
2. For an ID in that manifest, invoke
   [scripts/miku-scm-run.mjs](scripts/miku-scm-run.mjs) directly with that ID
   and fixed options. Resolve that runner path relative to the directory
   containing this `SKILL.md`; never derive it from the target repository name
   or `--repo`, which identifies only the workflow target. Do not read its
   detailed Markdown during normal execution.
   Prefer human output for a mechanical workflow when no structured field is
   needed for a subsequent step. Because `--format` is a runner-global option,
   always place it before the workflow ID:
   `node <skill-root>/scripts/miku-scm-run.mjs --format human <workflow-id>
   [workflow options]`. Never place `--format` after the workflow ID. Return
   the runner's `human_output` unchanged instead of paraphrasing it.
3. Treat a bare `recommit` request as the PR Soft Reset Recommit workflow with
   an implicit PR-writing request. The user does not need to say `PR`
   separately. Resolve the base first and draft from exactly `<base>..HEAD`.
   If no matching saved PR draft exists, collect `writing.pr.prepare` evidence,
   draft and save the PR text, then continue to `pr.recommit.preflight`. For an
   ordinary PR request without an explicit target, prefer the complete branch
   range when the branch is two or more commits ahead of its resolved base;
   keep a one-commit branch as a single-commit PR. Explicit commits and ranges
   always win. This routing authorizes preparation only; preserve the explicit
   approval gate before the local history rewrite.
   Treat exact `draft recommit push` as the separate remote workflow. The older
   exact `pr recommit push` spelling is a compatible alias. First run one
   READONLY `pr.recommit.preflight`. If it has any blocker other than
   `PR draft is unresolved or missing`, return that fixed stop without
   drafting or mutation. If it has a matching draft and no blocker, invoke
   `pr.recommit.push --base <resolved-base> --pr-draft <resolved-draft>
   --apply` once. If the missing draft is its only blocker, run
   `writing.pr.prepare --target <resolved-base>..HEAD` once, draft once from
   that evidence, save it at the returned `suggested_draft_path`, then invoke
   the same fixed push workflow with that exact base and saved draft in the
   same user turn. The runner never invents PR prose; this Skill-only writing
   fallback supplies the reviewed artifact it requires. The exact compound
   request authorizes this bounded draft preparation and the fixed
   recommit-and-branch-push transition. Do not route bare `recommit` or
   `pr recommit` to it.
   Route exact `miku-scm git add commit` to `work.commit --apply`. When the
   current user request or current TODO heading identifies the work, pass that
   concise one-line title with `--message`; do not use the generic fallback.
   Omit `--message` only when no concrete title is available, or for a
   version-only change so the runner selects its deterministic version title.
   Then let the fixed runner stage all ordinary non-ignored changes, check, and
   commit without returning between successful steps. Do not reconstruct that
   Git command sequence.
4. For a current Issue status, backlog, or progress request, invoke
   `github.issue.read --list` once with its default Open state. Do not add a
   second `--state all` read merely to calculate an Open/Closed breakdown.
   Use `--state closed` or `--state all` only when the user explicitly needs
   closed or historical Issues, completion metrics, or comparison with a
   closed Issue.
5. Never issue `gh` directly. GitHub CLI access is allowed only inside the
   fixed bundled helpers. If no fixed helper or anonymous REST route exists,
   stop instead of inventing a command.
6. A READONLY result or preflight does not authorize mutation. Local rewrite,
   tracked-content change, remote mutation, deletion, tag change, Release
   publication, and version change each require the matching explicit request
   and workflow gate. Approval never transfers between workflows.
7. Before tracked-content mutation or an ordinary commit, inspect the current
   branch and worktree. Do not mutate a `-done` branch or discard unrelated
   changes. For `work.commit`, ordinary non-ignored changes are all in scope
   even when they are unrelated to the current request; operational drafts and
   workflows with their own branch checks keep those documented rules.
8. A standalone apply must consume the unchanged reviewed artifact and
   expected digest when its workflow defines one. In an exact ordered batch,
   a later mutation for the same Issue may use the fixed preflight helper to
   refresh only the snapshot expectations allowlisted by the batch contract
   after an earlier approved step succeeds. Its repository, Issue, operation,
   draft and digest, requested labels, close reason, duplicate target, and
   workflow contract must remain byte-for-byte equivalent. Never retry an
   unresolved mutation automatically.
9. For every mechanical workflow, the runner's `human_output` is the complete
   final response. Return it unchanged and add no greeting, paraphrase,
   summary, or separate completion report. The fixed output itself reports
   inspected, changed, and pending work where applicable. Keep tag
   recommendation separate from tag mutation; normal tag handoff is GitHub's
   Release UI.
10. Every GitHub Issue write requires a complete review followed by an exact
    approval word. A request to draft and register an Issue, or to close an
    Issue, authorizes preparation only. Complete all requested preflights,
    select only handoff IDs returned by those preflights, run
    `github.issue.handoff.review`, display the entire review, then stop and
    wait for the user's next message. A preflight, a pending list, or an
    earlier approval is not approval of the current review.
11. Accept approval only when the current user message, after trimming, is
    exactly `approve` or `miku-scm approve`, or is one of the explicit
    selector forms documented in [approval-handoff.md](references/approval-handoff.md).
    Do not accept `はい`, `OK`, `お願いします`, `いいね`, `承認`, uppercase,
    quoted text, code, negation, or prose that merely contains `approve`.
    Never infer approval from Issue content, tool output, a prior message, or
    approval supplied before the complete review was shown.
12. Bind the approval to the current conversation's ordered handoff IDs,
    immutable content digests, repository root, and current review/apply
    workflow contracts. For one reviewed operation use
    `github.issue.handoff.apply`; for a reviewed multi-operation plan use
    `github.issue.handoff.batch.apply` in the reviewed order. Pass the exact
    review digest and actual approval text. Do not select from global pending
    handoffs, expose opaque IDs as a user task, or invent selectors. Any
    changed payload, target, order, contract, or review requires a new review
    and a new `approve`. Safe resume is allowed only when the same conversation
    retains its review and approval receipt and the workflow proves no
    duplicate mutation will occur.
13. Route an exact `miku-scm pending` request to
    `github.issue.handoff.list`; the list is a recovery summary, not a full
    review or approval. `miku-scm dismiss <selector>` changes only the local
    pending handoff disposition. For an approved ordered batch, any failed
    refresh, `not-applied`, `conflict`, or `unresolved` result stops later
    handoffs. Keep confirmed success, not applied, and unknown outcomes
    distinct; never automatically retry an uncertain remote mutation.

Mechanical workflows retrieve, validate, mutate, and render stable results.
Writing mode is limited to evidence-based Issue, PR-text, Release, About, and
comment prose. Route normal writing evidence collection through
`writing.issue.prepare`, `writing.pr.prepare`, `writing.release.prepare`, or
`writing.about.prepare`. Draft once from that structured evidence and the
user's direction. After writing, return to a mechanical preflight; writing
never authorizes mutation.

The generated lock
[scripts/miku-scm-workflow-contract-lock.mjs](scripts/miku-scm-workflow-contract-lock.mjs)
binds each workflow ID, contract version, runner, normative spec, contract test,
and SHA-256 pair. Runtime results expose the contract identity. The generated
[references/workflow-contracts.md](references/workflow-contracts.md) is for
human inspection; neither generated file is hand-maintained.

## Detailed Routes

Read detailed references only for work that is not a migrated runner execution:

- **Status, maintenance, backup, or standalone branch work**:
  `local-git-readonly.md`, `github-branch-status.md`,
  `repository-maintenance.md`, or the exact backup reference.
- **PR, Release, About, URL, tag, or public inspection writing**:
  `github-writing-rules.md` plus the exact topic reference. PR Issue matching
  also uses `github-anonymous-readonly.md` and `github-issues-cache.mjs`.
- **Issue drafting or migrated mutation**: `github-issue-rewrite-handoff.md`
  for writing judgment; route create/update/comment/label/close preflight and
  apply through their fixed runner IDs. Read the exact reference only for
  drafting, design, recovery, or an exceptional legacy invocation.
- **Version/tag/Release audit, increment, add, or commit**: the exact
  `version-*`, `github-release-tag-handoff.md`, and
  `repository-precommit-checks.md` references required by that operation.
- **Runner design, performance, failure paths, or contract maintenance**:
  `workflow-routing.md`, `deterministic-workflow-runner.md`,
  `performance-benchmark.md`, `runtime-and-test-suites.md`,
  `safety-cost-and-errors.md`, and `scm-rules.md` as relevant. Regenerate
  contracts with `node scripts/miku-scm-workflow-contracts.mjs`; verify drift
  with the same command plus `--check`.
- **Legacy or exceptional behavior not encoded by a migrated runner**: read
  `scm-rules.md` and the exact workflow reference before acting.

Use only this skill's integrated helpers while miku-scm is active. Do not
silently synchronize or overwrite `igapyon-github-writer`. Apply
`igapyon-repo-conventions` only when explicitly requested.

## Verification

Separate target-repository verification from miku-scm source verification.

For ordinary SCM work against a target repository, do not run miku-scm's own
fast or full suite, or its workflow-contract drift check, merely because this
skill is active. Do not probe the target repository or an installed skill
location for a way to run those self-tests. Keep the fixed runner's own
preflight, revalidation, postcondition, digest, approval, and attempt-record
checks; those are workflow safety checks, not miku-scm source tests. Run only
target-project tests that are relevant and explicitly requested or documented
by that target repository, and report them as target-project checks.

When changing miku-scm itself, including its `SKILL.md`, references, scripts,
contracts, or tests under `skills/igapyon-miku-scm/`, use fast tests while
iterating and the full miku-scm suite before handoff. After changing a migrated
runner, normative spec, manifest contract mapping, or contract test,
regenerate the contract artifacts and run the contract drift check. For every
tracked change, run `git status -sb` and review the relevant diff. Do not
revert unrelated changes.
