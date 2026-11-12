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

Remove `igapyon-miku-scm` and `igapyon-github-writer` from this repository after
their migration to [miku-scm-skills](https://github.com/igapyon/miku-scm-skills).
Keep the daybook's explicit GitHub Issue dependency working through the
separately installed miku-scm Skill.

## Status

The v0.8.1 Release is public. Its ZIP and SHA-256 sidecar were downloaded; the
checksum matched, and the ZIP verifier passed against the v0.8.1 tag source with
2 Skills and 203 files. The migration PR's Miku SCM required gate and all
platform jobs passed in [Actions run 43258029683](https://github.com/igapyon/miku-scm-skills/actions/runs/43258029683).

Source cleanup is complete in the working tree on branch `devel-tiga1112wfh`,
starting at `23a2e492fd957d1ac051943fce341689ec1025a1`. The old repository has
no rulesets and no branch protection on `devel`. No installed user Skill or
`workplace/` data was changed.

After the cleanup, the user explicitly requested a version increment. The
current source values are `1.20261113.1` / `20261113a`; candidate tag
`v20261113a` was absent from the public tags checked. No tag or Release was
created.

## Done Conditions

- [x] The two Skill directories, their dedicated CI and tests, and their
  repository-maintenance references are removed from this source repository.
- [x] The release catalog and archive describe 13 internal plus 13 external Skills.
- [x] Daybook Issue intake names the separate miku-scm installation as a prerequisite.
- [x] The root/Mikuku version check remains valid without either migrated Skill.
- [x] The remaining 12 representative Skill routes and source/archive checks pass.
- [x] The worktree is reviewed. Commit, push, Release, and user Skill sync remain
  separate operations.

## Resume

The cleanup and follow-up version increment are complete in the working tree.
Version alignment passed 5/5; index-policy/routes 77/77; daybook 79/79; isolated
Maven package and archive verification passed for 13 internal plus 13 external
Skills, with 12 representative routes. Text-bundle generation and diff checks
also passed. The `.1` archive was built in `/private/tmp`; `mvn validate` had
refreshed only the in-checkout generated timestamp record for the earlier `.4`
version. Existing ZIPs and external staging were preserved. Existing
`workplace/` records were retained; version validation added its normal local
run artifact under `workplace/miku-scm/runs/`.
Do not treat the new repository's Skill full suites as old-repository tests.

## Stop

- If the source Skills or their dedicated documents differ from the published
  migration, retain the old source and resolve the discrepancy first.
- Do not delete the user's installed Skills or local operational data.
- The separately requested version increment is complete and unstaged. This
  does not authorize commit, push, tag, or Release operations.
