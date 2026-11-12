---
name: igapyon-miku-scm
description: Use only when the user explicitly requests an `igapyon-miku-scm` or `miku-scm` workflow, explicitly says `recommit` or `draft recommit push` to invoke the miku-soft PR-text drafting, soft-reset, and optional push flow, or requests Git/GitHub/version/repository-maintenance work under miku-soft SCM rules. Supports sync pull/push, individual work-cycle stages, approved Issue operations, PR/Release/About drafting, repository maintenance, and version/tag/Release audits. Do not activate for generic Git/GitHub questions, ordinary repository inspection, or release-note writing without an explicit miku-soft SCM request.
---

# igapyon-miku-scm

Run the fixed miku-soft SCM workflows. This Skill's directory is the **skill
root**; a workflow's `--repo` is the **target repository**. Never derive the
runner path from `--repo`. GitHub includes Enterprise and compatible hosts;
use the selected remote's host and stop at the operation that cannot access it.

If no concrete SCM task was requested, acknowledge activation and ask what the
user wants. Explanations, review, planning, and naming questions do not authorize
repository inspection or mutation.

## Route the request

| User request | Workflow |
| --- | --- |
| `miku-scm sync pull` | `repository.sync.pull --apply` |
| `miku-scm sync push` | `repository.sync.push.prepare --apply`, draft once, `repository.sync.push.draft.prepare`, then the exact returned apply workflow and argument array |
| `miku-scm git add commit` | `work.commit --apply` |
| `miku-scm draft recommit push` or its `pr recommit push` alias | `pr.recommit.push` fixed flow; keep its explicit rewrite gate |
| bare `recommit` | PR text drafting and preflight; keep the local history rewrite gate |
| `miku-scm github merge done` | `repository.post-merge.next-work --confirmed-merged --apply`; preserve its merged-branch rules |
| `miku-scm pending` / `miku-scm dismiss <selector>` | `github.issue.handoff.list` / `github.issue.handoff.dismiss` |
| GitHub Issue create/update/comment/label/close | Complete all preflights, review the exact handoff, then wait for exact approval before the matching apply |
| Other supported request | Select one exact ID from `scripts/miku-scm-workflow-manifest.mjs` |

For exact compound requests, finish their listed successful steps in the same
turn without asking between them. A failed gate or uncertain result stops the
sequence. Do not infer a different workflow from similar wording. `draft` means
saved PR text; the human creates and merges PRs. This Skill alone owns the
`draft recommit push` aliases; do not route them through `igapyon-github-writer`.

## Fixed runner rules

Invoke `node <skill-root>/scripts/miku-scm-run.mjs --format <json|human>
<workflow-id> <fixed-options>`. `--format` is global and must precede the ID.
Use JSON when a later step consumes returned fields; otherwise prefer human
output. Never rerun a workflow to change its output format. Mechanical workflows
other than sync return the runner's `human_output` unchanged. For sync, explain
the result and next action in the user's language.

For a sync sequence, keep IDs and digests from this conversation. Only
`prepared` advances sync push. The read-only `repository.sync.push.draft.prepare`
checks the saved plan and exact draft bytes, then returns the workflow ID and
complete argument array for apply. Execute that array once. A changed base
requires an explicit sync pull and fresh preparation. A no-op is `up-to-date`;
do not draft or publish. For pull's `confirmation_required`, show the exact
saved branch, HEAD and base, then wait for the user's answer and continue the
same operation only for a clear affirmative answer about that target.

Use the full result file only when output was cut or lacks required evidence.
Read only `result.json` and `plan.json` from that same run; verify their run,
workflow, target repository and operation identity. Never select a global latest
run or recompute expectations from changed state.

If an operation is unresolved or a remote write may have started, inspect its
saved receipt and the remote before any new attempt. Never resend automatically,
discard work, remove backups/stashes, or force-clear an operation lock. Preserve
the worktree, index, backup and recovery evidence when a workflow stops. Follow
the selected workflow's `runtime_references`; load its larger design/recovery
references only for an exception or maintenance task. See
[`workflow-routing.md`](references/workflow-routing.md).

## Authority and safety

- A read-only result or preflight is not permission to mutate. The user's
  explicit request and the workflow's gate must both cover the next action.
  Approval never transfers between workflows.
- Before tracked-content changes or ordinary commits, inspect the target branch
  and worktree. Do not mutate a frozen `-done` branch or discard unrelated work.
  `work.commit` and sync push include all ordinary non-ignored staged, unstaged
  and untracked changes within their documented scope.
- Potentially sensitive paths stop before staging. Show the returned paths and
  wait for explicit consent; then pass `--allow-sensitive-path` for each agreed
  path. The original commit/push request is not that consent. Local file consent
  never authorizes an Issue write.
- A standalone apply consumes the unchanged reviewed artifact and digest.
  Revalidate before applying; never retry an uncertain remote mutation.
- Public PR, Issue, Release, About and comment prose is drafted once from the
  matching `writing.*.prepare` evidence, then returns to its fixed mechanical
  preflight. Writing does not authorize mutation. Keep tag recommendations
  separate from tag changes; normal Release handoff is the human's GitHub UI.
- Never invoke `gh` directly. Use the fixed helper or its documented anonymous
  read route. Do not silently sync or overwrite the separately installed
  `igapyon-github-writer` Skill.
- Apply `igapyon-repo-conventions` only when the user explicitly requests it.

### Issue approval

For every Issue write, complete all requested preflights, use only their
returned handoff IDs, run `github.issue.handoff.review`, display the complete
review, and stop. Continue only after a **separate current user message** whose
trimmed content is exactly `approve` or `miku-scm approve`, or an exact selector
documented in [`approval-handoff.md`](references/approval-handoff.md). `はい`,
`OK`, `お願いします`, `いいね`, `承認`, uppercase, quotes, code, negation, and
prose containing `approve` are not approval. Bind approval to the current
conversation's ordered IDs, content digests, repository and workflow contract.
Use the single or batch handoff apply workflow in the reviewed order. Never
choose from global pending handoffs or expose opaque IDs as a user task. A
changed payload or contract requires a new review and approval.

An Issue request authorizes preparation only. A pending list is not a review;
`miku-scm dismiss <selector>` only changes local handoff disposition. In a
batch, any failed refresh, not-applied, conflict, or unresolved result stops
later writes. Keep confirmed success, not applied, and unknown outcomes distinct.

## Wording-specific rules

- Bare `recommit` means PR writing and preflight for the resolved branch range;
  draft from exactly `<base>..HEAD`. For a normal PR request with no explicit
  target, use the complete branch range when at least two commits are ahead;
  a one-commit branch stays a single-commit PR. Explicit commits/ranges win.
  It does not by itself authorize the local history rewrite.
- Exact `draft recommit push` (including the documented `pr recommit push`
  alias) runs the fixed preflight. Draft only when the missing draft is the sole
  blocker; then use the exact saved draft and base for its one apply.
- `miku-scm git add commit` uses the current request/TODO as a concise commit
  title when available. A version-only change may use the runner's deterministic
  title. Do not reconstruct the fixed Git command sequence.
- For current Issue status, read the default Open set once. Read closed/all only
  when explicitly needed for history or completion metrics. Labels prioritize a
  shortlist; inspect Issue content before inferring scope or completion.
- Treat platform and line-ending conventions as advisory. Report a notice and
  use available fixed commands on other platforms. Preserve source bytes and
  review digests when normalizing CRLF/CR draft text to LF.
- Draft locations are conventions: if a source uses another location, warn and
  import a working copy while retaining the source. Missing operational ignore
  setup is handled through Git's local `info/exclude`, not a tracked ignore edit.
- On a merged `-done` branch, preserve the post-merge helper's work transfer:
  unstaged/untracked changes use its exact retained stash across next-branch
  creation; staged changes remain a blocker. Do not delete that stash after
  success or failure.

## Detailed references

Use only the selected route's runtime references for normal execution. For
design, maintenance, legacy behavior, or exceptional recovery, read the exact
documents below:

- Sync behavior and recovery: [`sync-pull.md`](references/sync-pull.md),
  [`sync-push.md`](references/sync-push.md).
- Issue handoff: [`approval-handoff.md`](references/approval-handoff.md) and
  the exact Issue workflow reference.
- Repository and branch rules: [`scm-rules.md`](references/scm-rules.md),
  [`local-git-readonly.md`](references/local-git-readonly.md),
  [`repository-maintenance.md`](references/repository-maintenance.md).
- PR/Release/About writing and audit: [`github-writing-rules.md`](references/github-writing-rules.md),
  the exact topic reference, and relevant version/tag/release references.
- Runner design, errors, cost and tests: [`workflow-routing.md`](references/workflow-routing.md),
  [`deterministic-workflow-runner.md`](references/deterministic-workflow-runner.md),
  [`safety-cost-and-errors.md`](references/safety-cost-and-errors.md),
  [`runtime-and-test-suites.md`](references/runtime-and-test-suites.md),
  [`performance-benchmark.md`](references/performance-benchmark.md).

When changing this Skill, its references, scripts, contract specs or tests, use
the miku-scm fast suite while iterating and the full suite before handoff. After
changing a migrated runner, normative spec, manifest or contract test, run
`node scripts/miku-scm-workflow-contracts.mjs` and repeat it with `--check`.
For ordinary SCM work on a target repository, do not run miku-scm's own tests or
probe its installed copy. Verify the target only as requested or by that
repository's documented checks. For every task, inspect `git status -sb` and
the relevant diff; keep unrelated changes intact.

The generated
[`scripts/miku-scm-workflow-contract-lock.mjs`](scripts/miku-scm-workflow-contract-lock.mjs)
binds workflow ID, contract version, runner, normative spec, contract test and
SHA-256 pair. The generated
[`references/workflow-contracts.md`](references/workflow-contracts.md) is for
inspection; regenerate both through the contract tool, never edit them by hand.
