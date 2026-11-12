---
purpose: ai-agent-handoff
read_when:
  - before_resuming_work
  - before_handing_off_work
  - when_context_is_missing
update_when:
  - work_is_paused
  - handoff_summary_changes
  - verification_status_changes
---

# Handoff

## Current: move two Skills to their independent repository (2026-11-13)

The canonical source for `igapyon-miku-scm` and `igapyon-github-writer` is now
[miku-scm-skills](https://github.com/igapyon/miku-scm-skills). The v0.8.1 Release
ZIP and SHA-256 sidecar were downloaded and verified against the tag source:
2 Skills, 203 files. The migration PR's required gate and platform jobs passed
in [Actions run 43258029683](https://github.com/igapyon/miku-scm-skills/actions/runs/43258029683).

This source checkout is branch `devel-tiga1112wfh`, starting at
`23a2e492fd957d1ac051943fce341689ec1025a1`. Both Skill trees, their dedicated
workflows and tests, and their maintenance references have been removed from
the worktree. Catalog/archive counts are 13 internal plus 13 external Skills;
daybook Issue intake names the separate miku-scm prerequisite.

Verification passed: version alignment 5/5, index-policy and route checks
77/77, daybook 79/79, `mvn validate`, and isolated `mvn package`. The generated
archive passed with 13 internal, 13 external, 26 total, 13 source-checked, and
12 representative routes; text-bundle generation and `git diff --check` also
passed. Package/archive and text-bundle checks used an isolated copy under
`/private/tmp`. `mvn validate` refreshed only the generated
`target/release-archive-timestamp.json` for the existing version/date; existing
ZIPs and external staging were preserved. Existing `workplace/` records were
retained; version validation added its normal result files under
`workplace/miku-scm/runs/20261112221012406-edd4b141-6ae7-4339-ab4e-d98c3e829a3e/`.
The old-repository changes remain uncommitted. No push, Release, or
installed-Skill sync has been performed.

After cleanup, the user explicitly requested a version increment. Current
values are `pom.xml` `1.20261113.1` and Mikuku `VERSION.md` `20261113a`.
`version.increment.validate`, the five alignment tests, and direct alignment
check passed. Candidate tag `v20261113a` was not present in the public tag list.
An isolated Maven package produced
`igapyon-agent-skills-1.20261113.1.zip`; the archive checker accepted it with
the same 13+13=26 counts and 12 routes. The in-checkout timestamp record still
describes the earlier `.4` build; no tag or Release was created.

The old repository has no rulesets and `devel` has no branch protection. The new
repository owns both Skills' source, tests, contracts, and CI. Do not resume
old-repository miku-scm implementation work from historical notes below
`TODO.md` or in dated maintenance records.

## Daybook context

The November 11 URL/conversation capture and one-way repository-reference
changes are implemented. Real-dialogue behavior remains unverified; see the
[daybook plan and execution record](docs/plans/daybook-url-and-conversation-activity-capture.md).
The November 8 Node.js-only runtime and YAML compatibility updates are also in
source; see [TODO.md](TODO.md) for retained verification status.

## Next

The migration cleanup and version increment are complete in the worktree.
Review the diff before any separately requested commit, push, tag, or Release.

Do not change the user's installed Skills or local `workplace/` data as part of
this repository migration.
