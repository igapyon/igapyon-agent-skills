# PR Soft Reset Recommit

Use this workflow only when the user explicitly asks to rebuild local commits by
soft-resetting to a base and recommitting with a saved PR draft as the commit
message. It is not `git commit --amend`, and it changes local Git history.

## Safety Rules

- Require an explicit user request for the recommit.
- Require a clean working tree and index; there is no `allow-dirty` path.
- Refuse a branch whose name ends in `-done`; start a new working branch instead.
- The PR draft must be inside the repository and contain inner Markdown without
  the outer `~~~~markdown` wrapper.
- Resolve the base locally in this order when `--base` is omitted: a distinct
  current-branch upstream, `origin/HEAD`, then `origin/devel`.
- Require the base to be an ancestor of `HEAD`.
- Create and verify a unique `backup/<YYYY-MM-DD-HHMM>` branch resolves to the reviewed old `HEAD` before soft reset.
- Never fetch, pull, push, create or merge a PR, publish a release, or change a
  remote in this workflow.
- Never retry an apply plan. If apply reports `UNCONFIRMED`, inspect the branch,
  `HEAD`, working tree, backup branch, and attempt record first.

## Preflight

Run the fixed workflow with the saved draft:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json pr.recommit.preflight --pr-draft workplace/github-writer/pr-<branch>-<timestamp>.md
```

Use `--base <ref>` when the user supplied or confirmed a particular base.
Preflight verifies a clean repository, branch eligibility, base ancestry, draft
content and digest, commit count, diff stat, and backup name. It writes an
immutable plan and returns `plan_path` and `plan_sha256`. The fixed runner also
creates a pending immutable approval handoff containing the exact plan identity
and apply arguments. Report the `READY FOR APPROVAL` result and handoff ID.

## Apply

After a later explicit approval, consume the pending handoff rather than
reconstructing the plan identity:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json approval.handoff.apply --apply
```

Use `--handoff <full-id>` only when more than one pending handoff exists. The
runner rechecks repository state, base commit, and draft digest; writes a pending
attempt record; creates and verifies the backup; performs `git reset --soft` and
`git commit -F` with argument arrays and `shell:false`; then verifies the new
commit parent and clean working tree. It retains immutable pending and result
records so the plan cannot be silently repeated. To cancel a pending handoff,
use `approval.handoff.dismiss --handoff <full-id> --apply`; cancellation never
changes Git history.

The compatibility entry point under `references/scripts/` remains for existing
callers, but new work must use `scripts/github-writer-run.mjs`.

## Output

After execution, report:

- base commit
- backup branch
- relative PR draft path
- previous and new `HEAD`
- relative attempt-record path
- final success, safe-stop, or unconfirmed status

Do not include absolute paths.
