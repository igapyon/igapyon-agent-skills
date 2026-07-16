# Repository Work Handoff Review

Use this reference when reviewing whether repository work can be safely paused,
handed off, resumed later, or closed for the current session.

This review focuses on next-session recoverability, `TODO.md` continuity, git
status, uncommitted changes, untracked files, generated artifacts, and whether
the repository tells the next worker what remains.

## Review Priority

Use this review for repository-type work when the user asks whether work is
done, ready to stop, ready to commit, ready to hand off, or ready for the next
session.

Use it together with software completion review when the question is both
"is the software complete?" and "can we end this work safely?"

## Continuity Checks

Check whether the next session can resume without relying on chat memory:

- `TODO.md` captures remaining tasks, follow-ups, blockers, and deferred review
  findings
- active tasks are specific enough to continue, not vague notes such as
  "finish docs" or "fix tests"
- completed tasks are removed, marked done, or clearly separated from active
  work
- known failures, skipped checks, or unverified areas are recorded
- next commands or verification steps are documented when not obvious
- important decisions made during the session are captured in repository docs
  when they affect future work
- temporary assumptions are marked as assumptions, not facts
- links or file paths in TODO entries point to the relevant area when useful

If a future agent or maintainer would need the previous conversation to know
what to do next, treat that as a handoff gap.

## Git State Checks

Check the repository state before declaring work ready to stop:

- `git status --short` has been inspected
- the amount of modified, staged, and untracked files is understood, not only
  whether the worktree is dirty
- current branch name has been inspected when branch workflow matters
- intended changes are tracked or intentionally left untracked
- untracked files are either added, ignored, documented, or explicitly left as
  local-only material
- generated files, build outputs, local caches, logs, archives, `.DS_Store`, and
  workspace files are not accidentally left for commit
- modified files are related to the completed work or identified as unrelated
  pre-existing changes
- staged changes match the intended commit scope
- no important file is modified but forgotten outside the stated work area
- submodule, nested repository, or vendored directory changes are noticed when
  present

Do not require a clean worktree if the user intentionally keeps local changes.
The review should make the state visible and judge whether there is a risk of
commit leakage or forgotten work.

## Large Uncommitted Change Checks

When there are many uncommitted files or a large diff, explicitly warn the user
and ask whether that state is intentional before treating the repository as safe
to stop, commit, or hand off.

Check:

- `git status --short` output is long enough that individual changes are easy
  to overlook
- many files are modified across unrelated directories
- large generated files, archives, bundles, lockfiles, or package artifacts are
  mixed with source or documentation edits
- many untracked files exist and their intended tracking or ignore status is
  unclear
- staged and unstaged changes differ in a way that could cause a partial or
  accidental commit
- the user has not explicitly confirmed that the large dirty state is expected

Do not assume that many uncommitted files are wrong. The purpose is to make the
risk visible and confirm intent. Phrase the warning as a caution, such as:

```text
There are many uncommitted changes. Before commit or handoff, confirm that this
large diff is intentional and that unrelated/local/generated files are not mixed
in.
```

Treat a large uncommitted state as higher risk when it includes untracked files,
release artifacts, generated outputs, secrets-like files, private paths, or
changes outside the task's expected scope.

## Branch Workflow Checks

For igapyon's miku-soft and nearby repository work, branch names ending with
`-done` have a special meaning: the local branch likely represents completed
work and the next operation normally requires pulling or synchronizing the
corresponding upstream state before continuing.

Check these points:

- current branch name is known when reviewing handoff or resume readiness
- branch names ending in `-done` are reported as a warning
- the warning says that the next worker may need to pull, sync, or switch to the
  appropriate active branch before starting new work
- local uncommitted changes on a `*-done` branch are treated as higher risk
  because the branch name suggests the work should already be complete

Do not automatically run `git pull`, switch branches, or rename branches during
review mode. Report the branch workflow risk and the likely next action.

## Commit Readiness Checks

When commit readiness is in scope, check:

- the diff has been reviewed
- unrelated changes are not mixed into the same commit
- new files that should be tracked are included
- generated or local-only files are excluded
- tests or verification relevant to the change have been run, or the gap is
  stated
- documentation and `TODO.md` reflect the final state
- commit message scope can be described from the diff
- there are no obvious secret, credential, token, private path, or personal data
  leaks in the diff
- no local absolute paths are introduced into committed source, docs, generated
  metadata, test fixtures, release notes, or examples unless they are clearly
  intentional placeholders or platform-generic examples

If the repository uses versioning or release workflows, also check whether
version, changelog, release notes, or generated indexes need updating before
commit.

## Absolute Path Leakage Checks

Before commit, scan the diff and new files for local absolute paths that should
not become part of the repository.

Flag examples such as:

- `/Users/<name>/...`
- `/home/<name>/...`
- `/private/tmp/...`
- `/var/folders/...`
- local workspace paths
- local build cache paths
- local editor, browser, or tool profile paths
- machine-specific temporary directories
- absolute paths embedded in generated JSON, Markdown, logs, screenshots, or
  test fixtures

Absolute paths may be acceptable when they are explicit examples, generic
documentation, or test cases. Prefer placeholders such as:

- `/path/to/project`
- `/tmp/example`
- `<workspace>`
- `<repo>`
- `<absolute-path>`

Treat unexpected absolute paths as a privacy and portability risk. They can
expose a user name, local project layout, machine-specific state, or paths that
make examples unusable for other users.

## Handoff Artifact Checks

Check whether the repository contains the right handoff artifacts:

- `README.md` for public or user-facing entrypoint
- `TODO.md` for active local planning and deferred work
- issue tracker references when external tracking is the source of truth
- generated discovery indexes such as `index.json` when the repository uses
  them
- updated docs for changed behavior
- verification notes in final response or TODO when tests were not run

Generated indexes are especially easy to forget. If references, skills, docs,
or assets were added and the repository normally regenerates an index, check
whether that index is current or record the need to regenerate it.

## Severity Guidance

Use these severity levels:

- High: git state includes untracked or modified files that could be forgotten,
  accidentally committed, or lost, and the intended state is unclear.
- High: many uncommitted files or a large diff exist, and the user has not
  confirmed that this dirty state is intentional.
- High: work cannot be resumed without chat memory because remaining tasks,
  blockers, or verification gaps are not captured.
- High: likely secret, private file, local path dump, build output, or
  generated archive is staged or ready to be committed unintentionally.
- High: local absolute paths expose private user, machine, workspace, temporary,
  or generated locations in committed files.
- Medium: current branch ends with `-done`, so the next worker likely needs to
  pull, sync, or switch branch before continuing.
- Medium: current branch ends with `-done` and still has local uncommitted
  changes, making the intended handoff state unclear.
- Medium: `TODO.md` exists but does not identify active follow-ups, blockers, or
  verification gaps well enough for next-session work.
- Medium: intended commit scope is mixed with unrelated changes.
- Medium: many uncommitted files exist but the broad scope appears intentional
  and still needs explicit commit or handoff care.
- Medium: generated indexes, docs, or release notes are stale after the change.
- Low: minor TODO wording, commit-message scope, or local cleanup issue remains
  but does not block safe handoff.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Repository Work Handoff Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Resume readiness: ready / partial / weak / not checked
Git state: clean / dirty-intentional / dirty-risky / not checked
Commit readiness: ready / partial / not ready / not requested
```

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

Do not stage, commit, clean, delete, or ignore files during review mode unless
the user explicitly asks to switch to maintenance work.
