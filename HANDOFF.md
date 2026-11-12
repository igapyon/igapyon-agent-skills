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

## Current: complete the two-Skill repository separation (2026-11-13)

The canonical source for `igapyon-miku-scm` and `igapyon-github-writer` is now
[miku-scm-skills](https://github.com/igapyon/miku-scm-skills). The v0.8.1 Release
ZIP and SHA-256 sidecar were downloaded and verified against the tag source:
2 Skills, 203 files. The migration PR's required gate and platform jobs passed
in [Actions run 43258029683](https://github.com/igapyon/miku-scm-skills/actions/runs/43258029683).

The old-repository cleanup commit `e400291ce85a3ed117d9f114f25d8465a222ee14`
was merged by [PR #442](https://github.com/igapyon/igapyon-agent-skills/pull/442)
at `b20a37b9690fa54984c0432a72a810f695b7ac18`. Both Skill trees, their
dedicated workflows and tests, and their maintenance references are removed.
Catalog/archive counts are 13 internal plus 13 external Skills; daybook Issue
intake names the separate miku-scm prerequisite. Current work branch:
`devel-tiga1113hcc`, based on `devel` at the merge commit.

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
The public v0.8.1 Release ZIP and sidecar were verified, and the migration PR's
required gate and platform jobs passed in Actions run 43258029683. The installed
`igapyon-miku-scm` and `igapyon-github-writer` directories have since been
synchronized one way from the `miku-scm-skills` source; all four source/installed
runner version checks report `0.8.2`, and the follow-up rsync dry-run reports no
content differences. The `miku-scm-skills` README's documented
`scripts/sync-codex-skill.sh` is absent from that repository and should be fixed
there before relying on that command again.

After cleanup, the user requested another version increment. Current values are
`pom.xml` `1.20261113.2` and Mikuku `VERSION.md` `20261113b`. The miku-scm
candidate validation produced these values; direct version alignment and
`git diff --check` passed. Remote tag `v20261113b` is absent. The `.2` package
was not built, and no tag or Release was created. The version changes remain
unstaged on `devel-tiga1113hcc`.

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

The cleanup is merged; the `.2` version increment remains unstaged. Review the
diff before any separately requested commit, push, tag, or Release. The
remaining migration-related follow-up is to restore the one-way sync helper
that the new repository README documents but does not contain.

Do not delete the user's installed Skills or unrelated local `workplace/` data.
