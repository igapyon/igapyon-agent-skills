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

The cleanup commit `e400291ce85a3ed117d9f114f25d8465a222ee14` was merged by PR
[#442](https://github.com/igapyon/igapyon-agent-skills/pull/442) into `devel`
at `b20a37b9690fa54984c0432a72a810f695b7ac18`. The current old-repository
work branch is `devel-tiga1113hcc` at that base.

The follow-up version values are `1.20261113.2` / `20261113b`; alignment and
`git diff --check` passed. Remote tag `v20261113b` is absent. No old-repository
tag or Release was created; the version change is unstaged.

Both Skills were synchronized one way from the `miku-scm-skills` source to the
user's `~/.codex/skills/`. Both source and installed runners report `0.8.2`,
and a follow-up dry-run found no content differences. The new repository README
refers to `scripts/sync-codex-skill.sh`, which is absent from that checkout; a
reproducible sync-command fix remains a separate follow-up.

## Done Conditions

- [x] The two Skill directories, their dedicated CI and tests, and their
  repository-maintenance references are removed from this source repository.
- [x] The release catalog and archive describe 13 internal plus 13 external Skills.
- [x] Daybook Issue intake names the separate miku-scm installation as a prerequisite.
- [x] The root/Mikuku version check remains valid without either migrated Skill.
- [x] The remaining 12 representative Skill routes and source/archive checks pass.
- [x] The cleanup was merged, and both migrated Skills were synchronized to the
  user Skill directory from the new canonical source.
- [x] The old-repository follow-up version values are aligned at
  `1.20261113.2` / `20261113b`.
- [ ] Commit and publish the follow-up version change through a separately
  requested miku-scm workflow; do not create a tag or Release here.
- [ ] Repair the new repository's documented but missing one-way sync helper.

## Resume

The cleanup is merged as PR #442. Before that merge, version alignment passed
5/5; index-policy/routes 77/77; daybook 79/79; isolated Maven package and archive
verification passed for 13 internal plus 13 external Skills, with 12
representative routes. The `.1` archive was built in `/private/tmp`; `mvn
validate` had refreshed only the in-checkout generated timestamp record for the
earlier `.4` version. For the current `.2` increment, `node
scripts/validate-version-alignment.mjs --repo .` and `git diff --check` passed;
the full suites and package were not rerun. The installed Skill pair now matches
the new repository's `0.8.2` source. The new repository README's sync helper
reference is currently unresolved. Do not treat the new repository's Skill full
suites as old-repository tests.

## Stop

- If the source Skills or their dedicated documents differ from the published
  migration, retain the old source and resolve the discrepancy first.
- Do not delete the user's installed Skills or local operational data.
- The `1.20261113.2` / `20261113b` increment is complete and unstaged. This
  does not authorize commit, push, tag, or Release operations.
