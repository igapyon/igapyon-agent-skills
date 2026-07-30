# Repository Maintenance

Use this workflow when the user asks `igapyon-miku-scm` to diagnose, plan, or
apply local repository maintenance.

## Contents

- [Helper](#helper)
- [`-done` Branches](#-done-branches)
- [Backup Branches](#backup-branches)
- [Plan and Apply Safety](#plan-and-apply-safety)
- [Reporting](#reporting)

Keep the three stages separate:

1. **Diagnosis**: inspect and classify without deleting refs.
2. **Saved plan**: write the exact reviewed branch names, full object IDs, and
   evidence under `workplace/miku-scm/maintenance/plans/`.
3. **Apply**: require explicit human approval of the saved plan path and
   SHA-256, revalidate every candidate, then delete exactly those local refs.

Phrases such as `すすめて`, `整理して`, or a general repository-status request
do not authorize deletion. Treat an instruction naming the reviewed plan, such
as `削除計画 <ID> を実行して`, as approval only when the complete plan has
already been shown to the human.

## Helper

Use only the bundled helper:

```sh
node skills/igapyon-miku-scm/scripts/repository-maintenance.mjs --repo <path>
node skills/igapyon-miku-scm/scripts/repository-maintenance.mjs --repo <path> --save-plan
node skills/igapyon-miku-scm/scripts/repository-maintenance.mjs \
  --repo <path> \
  --apply-plan workplace/miku-scm/maintenance/plans/<plan>.json \
  --expected-plan-sha256 <reviewed-sha256>
```

Default mode is READONLY. `--save-plan` writes only local operational data.
`--apply-plan` is the only deletion mode. Do not replace it with ad hoc
`git branch -D`, `git update-ref`, or shell loops.

The fixed policy is:

- keep the newest three valid `backup/*` branches
- keep every valid backup no more than 168 hours old
- classify a backup for deletion only when it is outside the newest three and
  older than 168 hours

Do not expose policy-changing CLI arguments. A policy change requires a
reviewed skill change with matching tests.

## `-done` Branches

Treat GitHub as the authoritative merge source. `git branch --merged` is not
sufficient because squash and rebase merges need not make the local branch tip
an ancestor of the base branch.

Classify a local `*-done` branch for deletion only when all of these hold:

- it is not the current branch
- no linked worktree has it checked out
- its pushed remote branch can be resolved
- exactly one Pull Request has the same repository, head branch, and full head
  object ID
- that Pull Request has a non-null `merged_at`

Prefer a successful saved publication plan from
`workplace/miku-scm/ok-push/` when resolving the pushed branch. For legacy
branches, remove the final `-done` only as a lookup candidate, then require the
exact GitHub head ref and head SHA match. Classify zero or multiple exact
matches, unavailable GitHub data, malformed responses, and unresolved
repository URLs as `要確認`; never delete them.

The helper uses these fixed authenticated READONLY `gh` command surfaces
without a shell:

```text
gh api --method GET repos/{owner}/{repo}/pulls \
  -f state=all -f head={owner}:{branch} -f per_page=100

gh api --method GET repos/{owner}/{repo}/pulls/{reviewed-positive-number}
```

Query only the pushed branch corresponding to each local `-done` candidate.
Never enumerate the repository's complete Pull Request history and never use
`--paginate`. If one exact head query returns 100 entries, classify the branch
as `要確認`; under the unique miku work-branch naming convention, that result is
an anomaly rather than permission to retrieve more pages. Require one exact
repository, head ref, and head SHA match.

During plan apply, repeat GitHub inspection only for `-done` branches included
in the reviewed plan, using its reviewed positive PR number. Do not re-query
unrelated local `-done` branches or repeat head discovery during apply.

Each fixed `gh` invocation has a 15-second timeout. After a timeout,
authentication failure, repository-access failure, rate-limit failure, or
malformed response, stop issuing further Pull Request requests in that
diagnosis and classify every uninspected `-done` candidate as `要確認`. Do not
fall back to anonymous REST. Authentication setup and credential handling
remain outside this workflow.

## Backup Branches

Inspect only local branches matching:

```text
backup/YYYY-MM-DD-HHMM
backup/YYYY-MM-DD-HHMM-2
backup/YYYY-MM-DD-HHMM-3
```

Interpret the timestamp in local time. Treat the unsuffixed branch as sequence
1 and numeric suffixes as later branches in the same minute. Sort by timestamp,
then by sequence, newest first.

Keep the newest three valid backup names regardless of age. Keep every other
valid backup until its age is strictly greater than 168 hours. Preserve
unparseable names, the current branch, and branches checked out in any
worktree.

First classify every backup by parsed time and retention rank. Only for each
deletion candidate, report whether another local branch, remote-
tracking ref, or tag contains the commit. Always retain the full object ID in
the saved plan and result record. This reachability report is informational;
deleting the last ref may allow a future Git garbage collection to make the
commit unrecoverable.

## Plan and Apply Safety

The saved plan must include:

- schema version and repository root
- creation time and fixed retention policy
- every deletion candidate's kind, branch name, full ref, and full object ID
- PR URL, number, merge time, head branch, and head SHA for each `-done`
- parsed creation time, age, and retention rank for each backup
- the diagnosis classifications shown to the human

Compute SHA-256 over the exact saved bytes. During apply:

1. Require the plan path to remain under the maintenance plan directory.
2. Require the exact reviewed SHA-256.
3. Re-run diagnosis, including fresh GitHub PR reads.
4. Require every planned candidate to remain a deletion candidate at the same
   full object ID.
5. Recheck current-branch and worktree protection.
6. Persist a `pending` attempt before deleting refs.
7. Delete all reviewed refs in one `git update-ref --stdin` transaction using
   their reviewed old object IDs.
8. Verify every ref is absent and record `applied`; on uncertainty record
   `unresolved` and never retry the same plan automatically.

Do not delete remote branches, tags, stashes, worktrees, files, or Git objects.
Do not run `git gc`. These require separately designed workflows.

During apply, restrict GitHub reads, backup reachability checks, and returned
classifications to branches already fixed by the reviewed plan. Still parse
all backup names to recompute newest-three rank and age correctly.

## Reporting

Report three groups for both `-done` and backup branches:

- `削除候補`
- `保持`
- `要確認`

Show the branch, full or abbreviated object ID, classification reason, and
relevant PR or retention evidence. End diagnosis with the exact fact that no
branches were deleted. Before apply, show the plan path, SHA-256, exact branch
list, and recovery commands of the form:

```sh
git branch <branch-name> <full-object-id>
```

Explain that these commands are best-effort recovery only until Git garbage
collection removes otherwise unreachable objects.
