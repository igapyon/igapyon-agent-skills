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

## Repository state (2026-11-13)

The worktree is on branch `devel-tiga1113jeb`, one commit ahead of
`origin/devel`, at HEAD `9b576ad96cc1fcbc44fb15a645921ba80ffd3345`. The current
packaging changes are uncommitted. `pom.xml` is now `1.20261113.4`, aligned
with Mikuku `20261113d`.

## Completed in the worktree: miku-scm bundle inclusion

The canonical source, tests, and CI for `igapyon-miku-scm` remain in
[miku-scm-skills](https://github.com/igapyon/miku-scm-skills). At the user's
explicit request, only `igapyon-miku-scm` is bundled again, pinned to v0.8.3 at
`fe551dc33293a53df4e2b929a108f36d1c8b2be1`; `igapyon-github-writer` remains
separately distributed. Root and archive catalogs, INSTALL, and the daybook
Issue-intake instructions are aligned.

`mvn package` generated
`target/igapyon-agent-skills-1.20261113.4.zip`. The archive checker accepted
13 internal + 14 external = 27 Skills (timestamp `2026-11-13T00:00:00Z`), and
the staged miku-scm directory matched the pinned source tree. Policy tests
passed 77/77, version alignment 5/5, and `git diff --check` passed. No commit,
push, tag, or Release publication was performed.

Earlier migration history remains in `TODO.md`. Do not modify miku-scm's
canonical source from this repository.

## Active work: upstream Skill update collector

PR #444 added `scripts/check-bundled-updates.mjs`, its configuration and
GitHub helpers, focused tests, and implementation plans. The collector reads
the declared upstream pins, checks default-branch HEAD and latest Release,
compares distributed Skill files from Git trees, and saves run evidence and a
short summary. Self-review fixes cover input snapshot/hash checks, response
size bounds, metadata validation, invalid distributed materials, and partial
results.

The collector implementation record reports these checks passing:

- `npm run test:bundled-updates` — 8/8
- `npm run test:skill-index-policy` — 77/77
- `npm run test:version-alignment` — 5/5
- `git diff --check`

They were not rerun for the miku-scm bundle task. BUC-02 through BUC-08 remain
open, including paired-SHA caching, broader concurrency and failure fixtures,
CI and `DEVELOPMENT.md` integration, a live-repository smoke run, and effect
measurements. No live upstream check, pin update, or Maven package was done for
PR #444; the later miku-scm package update is a separate explicit task. Resume
from the collector entry in `TODO.md` and the
[implementation plan](docs/plans/bundled-skill-update-check-node-luna-implementation.md).
Keep this collector read-only: do not apply discovered pin updates as part of
its implementation.

## Daybook context

The November 11 URL/conversation capture and one-way repository-reference
updates are in source. Real-dialogue behavior remains unverified; see
`TODO.md` and `docs/plans/daybook-url-and-conversation-activity-capture.md`.
The November 8 Node.js-only runtime and YAML compatibility work is also in
source; its recorded verification status is in `TODO.md`.

Do not delete installed Skills or unrelated local `workplace/` data.
