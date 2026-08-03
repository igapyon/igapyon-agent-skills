---
name: igapyon-miku-scm
description: Use only when the user explicitly names `igapyon-miku-scm`, explicitly asks to apply the miku SCM workflow, or explicitly asks to perform Git, GitHub writing, GitHub Release, repository-maintenance, or version-management work under miku-soft SCM rules. Supports PR, Release, About, and public GitHub Issue drafting; human-approved Issue and optional sub-Issue creation, title/body/existing-label updates, comments, standalone existing-label changes, and closure through narrowly documented `gh` workflows; PR soft-reset recommit; backup, branch-status, and three-stage local repository-maintenance workflows; date-based and Semantic Version increments; and READONLY version, tag, Release, and asset audits. Do not activate for generic Git or GitHub questions, ordinary repository inspection, or release-note writing outside an explicit miku-soft SCM request.
---

# igapyon-miku-scm

Run documented miku-soft source-control workflows with a small runtime context.
Detailed policy remains under `references/` for design, maintenance, legacy
operations, and exceptions; migrated workflows execute through the fixed runner.

## Current Scope

Support repository status and maintenance; PR, Release, About, and Issue work;
recommit, publication, backup, and post-merge work; version and release audits;
and deterministic READONLY, preflight, and apply workflows.

## Activation-Only Fast Path

If no concrete SCM task is given, acknowledge activation and ask what is wanted.
Do not inspect the repository or load detailed references yet.

## Runtime Kernel

1. Identify the exact repository and classify the request with
   [scripts/miku-scm-workflow-manifest.mjs](scripts/miku-scm-workflow-manifest.mjs).
2. For an ID in that manifest, invoke
   [scripts/miku-scm-run.mjs](scripts/miku-scm-run.mjs) directly with that ID
   and fixed options. Resolve that runner path relative to the directory
   containing this `SKILL.md`; never derive it from the target repository name
   or `--repo`, which identifies only the workflow target. Do not read its
   detailed Markdown during normal execution.
   Prefer `--format human` for a mechanical workflow when no structured field
   is needed for a subsequent step. Return the runner's `human_output`
   unchanged instead of paraphrasing it.
3. For a current Issue status, backlog, or progress request, invoke
   `github.issue.read --list` once with its default Open state. Do not add a
   second `--state all` read merely to calculate an Open/Closed breakdown.
   Use `--state closed` or `--state all` only when the user explicitly needs
   closed or historical Issues, completion metrics, or comparison with a
   closed Issue.
4. Never issue `gh` directly. GitHub CLI access is allowed only inside the
   fixed bundled helpers. If no fixed helper or anonymous REST route exists,
   stop instead of inventing a command.
5. A READONLY result or preflight does not authorize mutation. Local rewrite,
   tracked-content change, remote mutation, deletion, tag change, Release
   publication, and version change each require the matching explicit request
   and workflow gate. Approval never transfers between workflows.
6. Before tracked-content mutation or an ordinary commit, inspect the current
   branch and worktree. Do not mutate a `-done` branch. Preserve unrelated
   changes. Operational drafts and workflows with their own branch checks keep
   those documented rules.
7. A standalone apply must consume the unchanged reviewed artifact and
   expected digest when its workflow defines one. In an exact ordered batch,
   a later mutation for the same Issue may use the fixed preflight helper to
   refresh only the snapshot expectations allowlisted by the batch contract
   after an earlier approved step succeeds. Its repository, Issue, operation,
   draft and digest, requested labels, close reason, duplicate target, and
   workflow contract must remain byte-for-byte equivalent. Never retry an
   unresolved mutation automatically.
8. Report inspected, changed, and pending work. Keep tag recommendation
   separate from tag mutation; normal tag handoff is GitHub's Release UI.
9. Route an exact `miku-scm pending` request to
   `github.issue.handoff.list`. After a reviewed Issue preflight, an exact
   `miku-scm approve` request routes to `github.issue.handoff.apply --apply`
   and still requires exactly one pending handoff. The legacy `miku-scm 承認`
   input remains accepted.
10. When the human supplies an exact handoff ID from the preflight or pending
    list, route `miku-scm approve <id>` to
    `github.issue.handoff.apply --handoff <id> --apply`, or route
    `miku-scm dismiss <id>` to
    `github.issue.handoff.dismiss --handoff <id> --apply`. Never choose,
    abbreviate, or reconstruct the ID or reviewed apply arguments. These exact
    commands are fast paths and do not require loading detailed references.
11. Route an exact `miku-scm approve batch <id> <id> [...]` request to
    `github.issue.handoff.batch.apply`, repeating `--handoff <id>` in the exact
    human-supplied order and ending with `--apply`. Require two to twenty
    unique pending IDs. Never infer membership or order from `all`, recency,
    Issue numbers, or prior prose. The fixed workflow validates the complete
    batch before the first mutation. For later mutations to the same Issue,
    the fixed workflow runs a handoff-free dependency preflight after each
    preceding success and accepts only allowlisted snapshot-expectation
    changes caused by the ordered sequence. Any semantic change, failed
    refresh, `not-applied`, `conflict`, or `unresolved` result stops every
    later handoff. Preserve a delegate `conflict` as a distinct terminal state.

Mechanical workflows retrieve, validate, mutate, and render stable results.
Writing mode is limited to evidence-based Issue, PR, Release, About, and
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
