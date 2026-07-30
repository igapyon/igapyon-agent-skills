# PR Soft Reset Recommit

Use this workflow only when the user explicitly asks to rebuild local commits by
soft-resetting to a base and recommitting with a saved PR draft as the commit
message. It is not `git commit --amend`, and it changes local Git history.

## Safety Rules

- Require an explicit user request for the recommit.
- Require a clean working tree and index; there is no `allow-dirty` path.
- The PR draft must be inside the repository and contain inner Markdown without
  the outer `~~~~markdown` wrapper.
- Resolve the base locally in this order when `--base` is omitted: a distinct
  current-branch upstream, `origin/HEAD`, then `origin/devel`.
- Require the base to be an ancestor of `HEAD`.
- Create and verify a unique `backup/<YYYY-MM-DD-HHMM>` branch before soft reset.
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
Preflight verifies a clean repository, base ancestry, draft content and digest,
commit count, diff stat, and backup name. It writes an immutable plan and returns
`plan_path` and `plan_sha256`. Report these results before apply.

## Apply

After the explicit apply request, pass the exact plan identity:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json pr.recommit.apply --plan <plan_path> --expected-plan-sha256 <plan_sha256>
```

The runner rechecks repository state, base commit, and draft digest; writes a
pending attempt record; creates the backup; performs `git reset --soft` and
`git commit -F` with argument arrays and `shell:false`; then verifies the new
commit parent and clean working tree. It retains immutable pending and result
records so the plan cannot be silently repeated.

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
