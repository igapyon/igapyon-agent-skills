---
purpose: ai-agent-goal
read_when:
  - before_starting_work
  - before_finishing_work
  - when_scope_is_unclear
update_when:
  - goal_changes
  - done_conditions_change
  - stop_conditions_change
---

# Goal

## Objective

Include the upstream `igapyon-miku-scm` Skill in the release ZIP at a reviewed
full commit SHA. Keep `igapyon-github-writer` separately distributed, and
update the archive catalog and dependent daybook instructions.

## Status

This user-directed packaging task is complete in the worktree. The pin is
`fe551dc33293a53df4e2b929a108f36d1c8b2be1` (miku-scm-skills v0.8.3); the
repository version is `1.20261113.4` / `20261113d`. Maven generated
`target/igapyon-agent-skills-1.20261113.4.zip` with 13 internal and 14
external Skills. The archive checker accepted all 27 Skills, and the staged
miku-scm directory matches the source checkout at that exact SHA.

`npm run test:skill-index-policy` passed 77/77, `npm run
test:version-alignment` passed 5/5, `mvn package` succeeded, the release
archive checker succeeded, and `git diff --check` passed. No commit, push, tag,
or GitHub Release publication was requested or performed.

The previous read-only upstream update collector objective remains incomplete:
BUC-02 through BUC-08 are still open in `TODO.md`. This explicit miku-scm
packaging request was a separate task and does not count as collector work.

## Done Conditions

- [x] Pin only `igapyon-miku-scm` from its canonical upstream repository.
- [x] Keep `igapyon-github-writer` separately distributed.
- [x] Update the root and archive catalogs, install guidance, and daybook Issue-intake prerequisite.
- [x] Generate and verify the 27-Skill ZIP at the aligned repository version.
- [x] Record the upstream SHA and package verification in the release lock and task notes.

## Resume

Review the current worktree diff and generated ZIP if continuing this task.
For the still-open read-only collector work, resume from its current-task entry
in `TODO.md` and follow the implementation plan there. Keep that collector's
scope separate from explicit user-directed release pin changes.

## Stop

- Do not include `igapyon-github-writer` as part of this miku-scm bundle change.
- Do not claim the collector's BUC-02 through BUC-08 are complete.
- Do not infer authorization to commit, push, tag, or publish a Release.
