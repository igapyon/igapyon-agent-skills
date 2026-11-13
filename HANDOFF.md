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

## Completed: miku-scm and GitHub Writer separation (2026-11-13)

The canonical source for `igapyon-miku-scm` and `igapyon-github-writer` is
[miku-scm-skills](https://github.com/igapyon/miku-scm-skills). The initial v0.8.1
Release ZIP and SHA-256 sidecar were verified against the tag source: 2 Skills,
203 files. The migration PR's required gate and platform jobs passed in
[Actions run 43258029683](https://github.com/igapyon/miku-scm-skills/actions/runs/43258029683).
The repository has since published v0.8.3. Its README and INSTALL.md describe
manual one-way copying from `skills/` to `$CODEX_HOME/skills/`; a sync helper is
not part of the repository.

The old-repository cleanup commit `e400291ce85a3ed117d9f114f25d8465a222ee14`
was merged by [PR #442](https://github.com/igapyon/igapyon-agent-skills/pull/442)
at `b20a37b9690fa54984c0432a72a810f695b7ac18`. The follow-up version and
catalog update was merged by PR #443 at `c9036cc`. Both Skill trees, their
dedicated workflows and tests, and their maintenance references are removed.
Catalog/archive counts are 13 internal plus 13 external Skills; daybook Issue
intake names the separately installed miku-scm prerequisite. The current `devel`
branch is at `c9036cc` (`v20261113b`). Its GitHub Release is published with
package version `1.20261113.2`.

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
`igapyon-miku-scm` and `igapyon-github-writer` directories were synchronized
one way from the new source at v0.8.2 at that time. As of this handoff check,
the installed runners remain at v0.8.2 while the new repository is at v0.8.3;
copy from the new source only if updating the installed Skills is desired.

After cleanup, the user requested another version increment. `pom.xml`
`1.20261113.2` and Mikuku `VERSION.md` `20261113b` were merged by PR #443; tag
`v20261113b` and its GitHub Release are published.

The new repository owns both Skills' source, tests, contracts, and CI. Its
GitHub rulesets list is empty and `devel` has no branch protection; this was
checked and is not a migration blocker. Do not resume old-repository miku-scm
implementation work from historical notes below `TODO.md` or in dated
maintenance records.

## Daybook context

The November 11 URL/conversation capture and one-way repository-reference
changes are implemented. Real-dialogue behavior remains unverified; see the
[daybook plan and execution record](docs/plans/daybook-url-and-conversation-activity-capture.md).
The November 8 Node.js-only runtime and YAML compatibility updates are also in
source; see [TODO.md](TODO.md) for retained verification status.

## Next

The miku-scm separation and old-repository cleanup are complete. No miku-scm
implementation work remains in this repository. The installed copies are still
v0.8.2; update them from the v0.8.3 source only when a local Skill refresh is
wanted. For other active work, resume from the daybook context and current tasks
in `TODO.md`.

Do not delete the user's installed Skills or unrelated local `workplace/` data.
