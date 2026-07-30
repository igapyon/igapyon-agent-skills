# Repository-Declared Pre-Commit Checks

Run repository-declared consistency checks after staging the intended content and immediately before every `git commit`. This gate complements the version confirmation gate; neither replaces the other.

## Detection

Inspect the repository's tracked manifests and documentation for a commit-time consistency command. Prefer an explicit repository declaration over a guessed generic build.

For an npm repository, inspect `package.json.scripts`. When both of these conditions are present, `npm run check:index` is mandatory:

- `package.json.mikuIndex.required` is `true`
- `package.json.scripts.check:index` exists

This detects a stale generated `index.json`, including a file-set or indexed-size mismatch, before the commit reaches CI.

If `mikuIndex.required` is `true` but `check:index` is absent, look for the repository-documented index alignment command. If no authoritative command can be resolved, stop before committing and report the missing check instead of guessing a generator command.

Apply the same pattern to other explicitly declared commit-time alignment checks, such as coupled-version validation or generated-file freshness checks, when the repository documents them.

## Required Order

1. Complete all intended file edits and generated-artifact refreshes.
2. Run the version confirmation workflow.
3. Stage only the intended files with `git add`.
4. Inspect `git status --short` and the staged diff.
5. Run every resolved repository-declared pre-commit check against the final working tree.
6. Confirm that no unstaged change affects a checked source or generated artifact.
7. Run `git commit` only after every required check succeeds.

Do not reuse a successful check after any subsequent edit, formatter, newline cleanup, generator run, merge, reset, or other content-changing operation. Restage the affected files and rerun the check immediately before committing.

## Failure Handling

When a required check fails:

- do not commit
- report the exact failing command and diagnostic
- use the repository-declared generator or refresh command when the failure is a stale generated artifact
- stage the refreshed artifact together with its source change
- rerun the same check after the final staging operation
- continue to commit only after the check succeeds

Do not bypass, delete, or weaken an existing consistency check merely to make the commit pass unless the user explicitly requests a policy change.

## PR Soft Reset Recommit

Before applying PR Soft Reset Recommit, rerun the resolved repository-declared pre-commit checks when the recommitted tree differs from the last verified tree or when no reusable same-session result exists. A successful earlier build is not reusable after a later content edit.

If the helper will run `git commit -F`, complete this gate before invoking helper apply mode. Stop before the history rewrite when a required check fails.

## Report

After committing, include the required pre-commit command and its success in the completion report when it materially explains repository consistency. If no repository-declared check was found, do not claim that one ran.
