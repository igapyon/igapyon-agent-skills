---
purpose: ai-agent-decisions
read_when:
  - before_starting_work
  - when_making_decision
  - when_looping_or_repeating_work
update_when:
  - important_decision_is_made
  - option_is_rejected
  - work_is_deferred
---

# Decisions

This file records important decisions for the AI agent.
Read this before making or revisiting decisions, especially when the work seems to loop.

## 2026-10-23: Require approve After A Concrete Issue Operation Preview

利用者合意:
Issueへの書き込みは完成した作業案を提示した後、利用者の `approve` で承認する。「文面は任せるので登録まで」や明確なclose指示でも確認を省略しない。「はい」「OK」「お願いします」「いいね」「承認」および説明・引用中のapproveは書き込み承認にしない。一つの作業案にコメントとclose等をまとめ、承認は案全体に一度とする。

設計:
通常操作では利用者にIDをコピーさせず、提示した対象・内容・順序のID/digestへAgentが正確に束縛する。global pendingの件数や最新時刻から選ばない。変更された案には新しいapproveが必要。既存handoffを拡張し、固定helper・attempt・postconditionを活かす。

実施状態:
[計画と実施記録](skills/igapyon-miku-scm/docs/2026-10-23-issue-approval-implementation-plan.md)のUX-00〜08をsource skill、fixed helper、runner、contract、テストへ実装した。Issue書き込みは完全表示した一意な案への独立した完全一致 `approve` のみで許可し、複合操作は一回の承認でレビュー順に実行する。現在の利用者メッセージと提示済みreviewの対応はAgentが担い、runnerがID/digest/順序/契約と実行状態を検証する。本決定の記録だけを根拠に承認経路を迂回しない。競合判定の緩和、正当な同内容操作の再実行identity、動的な作成後操作は後続課題とする。検証と未実施事項は計画・実施記録とroot TODOに記録した。

## 2026-10-22: Set Java 8 As The Compatibility Floor And Test The Newest LTS

理由:
Java 8 remains a practical compatibility target, and distributions such as
Eclipse Temurin continue to publish Java 8 updates. Support duration is
distribution-specific, so a Java version number alone does not establish a
universal support commitment.

影響:
Use Java 8 as the default minimum runtime for miku Java CLI products. Verify
packaged behavior on Java 8 and the newest LTS of the declared distribution;
include both in an existing CI matrix and add intermediate maintained LTS
lines when justified. Choose and document the build JDK separately from the
product runtime. As of 2026-10-22, Java 25 is the newest LTS and Oracle lists
Java 29 as the next planned LTS for September 2027. Eclipse Temurin lists Java
8 availability through at least December 2030. Recheck the selected
distribution's roadmap when refreshing the newest-LTS value.

根拠:
[Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
and [Eclipse Temurin Support](https://adoptium.net/support/).

## 2026-08-10: Make The miku-scm Work Cycle Responsive Without Removing Its Safety Model

理由:
The user identified excessive conversational waiting as a quality risk in the
normal branch-to-PR flow. The merged Work Cycle design separates checks that a
deterministic runner can complete from genuine human authorization boundaries.

影響:
Keep `-done`, backup creation, exact remote expectations, `force-with-lease`,
post-push comparison, and human GitHub tag/Release work. Introduce a clearly
named `pr recommit push` operation rather than changing the meaning of
`pr recommit`. After a successful backup and expected fixed checks, the runner
should continue locally and, when authorized, through its fixed publication
checks without returning to the AI agent between each successful command.
Version-increment reminders are informational, not a hard gate. Implement one
Node.js workflow core with platform adapters; make `rg` optional so Windows 11
does not require a separate full workflow implementation.

## 2026-07-31: Separate Practice, Target State, And External Constraint

理由:
A repository pattern can be common without being a good universal rule, and a
sound target architecture can be uncommon because migration is incomplete.
Time-sensitive external facts such as supported Node.js versions or MCP
protocol behavior are a third kind of evidence and should not be inferred from
local repository prevalence.

影響:
The audit records implementation fit, design rationale/testability, and
external primary-source currency separately. Rules describing normal or common
practice need repository evidence. Desired future defaults are labeled
target-state guidance. Time-sensitive claims require dated primary-source
verification. A single implementation, especially the sole local MCP server,
is evidence for feasibility and concrete behavior but not ecosystem prevalence.

## 2026-07-31: Normalize GitHub Actions By Contract Profile

理由:
The initial read-only scan found 57 direct workflow files across 47 sibling
repositories, but 54 exact file contents. Exact-text uniformity would erase
real differences among Node CLI, Web asset, Java runtime, Maven plugin, Agent
Skill, MCP, and library products, while a line-by-line comparison would also
overstate harmless differences in product names and artifact paths. What must
be consistent is the release and verification contract: event, source ref,
version, artifact, permissions, checks, and publication target.

影響:
Do not select or roll out a shared workflow solely from filename or textual
similarity. First inventory and cluster workflows by normalized structure and
contract fingerprint. Classify differences as intended profile, repository
parameter, supported option, drift, conflict, missing control, exception, or
insufficient evidence. Then define a small versioned profile set, shared
invariants, an exception registry, and a prioritized migration backlog. The
choice among copied templates, reusable workflows, local wrappers, or generated
YAML remains open until the clustering evidence is available. Sibling workflow
changes remain a separate authorized SCM phase.

For Node-backed profiles, record the product minimum, CI build/test matrix,
release-build runtime, released-artifact smoke runtime, and each JavaScript
Action's internal runtime separately. Node.js 20 occurrences are migration
inventory rather than evidence for the maintained target. The approved
compatibility rule is to use the oldest upstream-maintained LTS as the product
floor and verify that floor plus the newest LTS; include maintained LTS lines
between them when practical. The 2026-10-22 starter snapshot is Node.js 22 as
the floor and Node.js 24 as the newest LTS / Release build host. Refresh those
values against the official release schedule. A Node 24-aware Action major
does not by itself make the product Node 24-only.

Release files are normalized by artifact role and lifecycle, not merely by file
extension. A CLI module, standalone runtime, curated sources archive, Java
sources jar, npm pack tarball, Skill installation zip, and Web asset set have
different consumer contracts. Candidate shared controls are a clean staging
directory, final versioned names, exact expected-file checks, behavior/content
smoke, checksums calculated from the final staged bytes, and a bounded upload
selector. The choice between per-file `.sha256`, aggregate `SHA256SUMS`, and an
optional release manifest remains a product-policy gate. A digest is an
integrity value and must not be described as proof of publisher authenticity.

Release asset filenames are public API and user-interface text. The audit must
evaluate their appearance as a sorted Release-page set, not only whether each
path exists. The leading candidate for custom miku assets is
`<release-family>[-<role>][-<platform>-<arch>]-<release-version>.<ext>`, using
lowercase kebab-case and a controlled role vocabulary. This is not yet approval
to rename files: existing Web downloaders, Agent Skill resolvers, documentation,
and published links consume role-before-version names. Ecosystem-generated npm
and Maven names may remain explicit profile exceptions when that is clearer to
their users.

## 2026-07-31: Separate Immediate Contract Corrections From Estate Policy Gates

理由:
Wave B established that some workflow defects are independent of the future
normalization policy, while others cannot safely be changed until public
compatibility and Release-interface decisions are made. Treating both groups as
one bulk cleanup would either delay a source-identity correction unnecessarily
or make a public filename/runtime change without a consumer plan.

影響:
Record source/tag/ref identity conflicts such as the manual checkout path in
`miku-indexgen-java` as P0 correction candidates with local acceptance
fixtures. Keep the candidate Node baseline, checksum shape, source-archive
roles, Web manifest visibility, custom filename grammar, and Maven/npm
exceptions as explicit product-owner gates. Evidence collection may proceed in
parallel, but changes to sibling workflows remain serial representative pilots
after those gates are decided.

## 2026-07-31: Migrate Public Release Names Consumer-First

理由:
Wave C found exact file/digest locks, runtime resolver patterns, vendored
imports, Web metadata, archive-content tests, direct URLs, and historic
documentation across sibling repositories. The versioned miku-ms-office-core
bundle/map alone has at least seven fixed local vendor/import consumers, while
the producer-side verifier currently knows only three. A visually nicer
producer filename is not safe evidence of a compatible distribution change.

影響:
Existing Release assets, URLs, checksums, vendor metadata, and published Skill
ZIPs are immutable historical records. Before changing a future public
filename, checksum shape, or role, create a producer/consumer row, classify the
consumer as exact, digest-locked, regex, metadata, documentation, or historic,
and run the affected consumer's acceptance test. Maven classifier names and
native npm pack names remain explicit profile exceptions. Do not bulk rename
Release assets or publish dual aliases without an approved, bounded transition
rule.

## 2026-07-31: Parallelize Evidence Collection, Serialize Integration

理由:
The GitHub Actions audit spans independent concerns—Node runtime roles,
artifact and filename contracts, and event/ref/authority structure—across many
read-only sibling repositories. These can be investigated concurrently. The
same worktree and central planning files are shared, however, so concurrent
edits would make evidence attribution and final decisions harder to review.

影響:
Use one coordinator and, with the current four execution slots, at most three
bounded audit workers per wave. Give every worker a separate read-only scope
and uniquely named ignored report under `workplace/miku-soft-reference-audit/`.
Only the coordinator merges findings into central matrices and state files.
Do not use the parallel audit to authorize sibling changes, GitHub dispatches,
or publication. Once a profile is approved, make workflow mutations in a
serial representative pilot before any family rollout.

## 2026-07-31: Give Product-Layer Numbers One Meaning

理由:
The current top-level reference names mix product layers (`10`, `11`, `40`,
`50`) with a conversion method (`30`) and repository-separation workflows
(`31`, `32`). This makes `30/31/32` look like peer product types and hides the
absence of ordinary `20 Java Runtime` and `21 Java Maven Plugin` workflows.

影響:
Keep `10`, `11`, `20`, `21`, `40`, and `50` as stable product-layer codes.
Treat concept/naming as a pre-layer workflow, straight conversion as a method
from `10` to `20`, and Java/Maven and Node/Web separation as migrations between
named layers. `00` is overview/concept work rather than a layer. Use typed IDs
such as `L10`, `W-L10`, `M-L10-L20`, and `G-L10-L10+L11` when an unambiguous
machine/audit identifier is useful. The preferred future layout separates
`layers/`, `workflows/`, `methods/`, `migrations/`, `review/`, `profiles/`,
`catalog/`, and `baselines/`.

## 2026-07-31: Audit Content Before Renaming References

理由:
Renaming documents while simultaneously changing their normative content would
make review evidence difficult to follow and could break links from installed
skills or sibling project documentation.

影響:
Perform the validity audit against current paths first. Prepare semantic
changes and path migration as separate reviewable proposals. If path migration
is approved, retain small old-path compatibility stubs unless an explicit
later decision allows their removal. A 2026-07-31 read-only scan found 38 files
across 25 sibling repositories that name current paths, so consumer migration
must be treated as a separate authorized SCM phase.

## 2026-07-31: Give Time-Sensitive Values One Dated Owner

理由:
Node support, GitHub Action majors, Java build mechanics, dependency versions,
and MCP protocol revisions change on a different cadence from durable product
layer architecture. Copying those values into layer, workflow, review, and
starter documents creates silent drift.

影響:
Create dated baseline documents for Node/Actions, Java, and MCP. Durable layer
documents explain the invariant and link to the baseline. Workflows and starter
assets consume one approved value. Each baseline records primary sources,
checked date, compatibility range, affected assets, and the next review trigger.
The externally latest version is evidence and does not automatically become the
miku-soft approved value.

## 2026-07-31: Separate Reference Discovery From Starter Asset Verification

理由:
The generated `index.json` intentionally indexes Markdown and JSON, while the
starter system also contains YAML, MJS, XML, and JVM configuration files. An
index useful for selecting reference text is not by itself proof that a starter
set is coherent or copyable.

影響:
Keep `index.json` as the Markdown/JSON discovery artifact. Add an indexed asset
manifest that states applicability, completeness, substitutions, and companion
files. Verify executable starter files through focused temporary rendering,
syntax, build, and smoke checks instead of silently broadening the discovery
index.

## 2026-06-22: Preserve The Existing Root TODO

理由:
The repository already uses root `TODO.md` as a broad project work memo. Replacing it or forcing front matter into it would mix repository planning with agent-state metadata.

影響:
AI agent task tracking is added under `## AI Agent Current Tasks` inside the existing `TODO.md`. Repository-level TODO content remains unchanged.

## 2026-06-22: Stop Instead Of Repeating External-Wait Messages

理由:
When progress depends on user-side work or an external state change, repeated waiting messages do not advance the task and consume context unnecessarily.

影響:
`GOAL.md` now treats external wait states as a stop condition. The agent should state the stop reason, resume condition, and first resume check once, then end the turn.

## 2026-06-23: Avoid Hidden Skill Discovery Controls

理由:
`policy.allow_implicit_invocation: false` may prevent installed skills from
appearing in Codex's available-skills list. For hard-trigger skills, activation
should be controlled by explicit trigger wording in `SKILL.md` instead of
metadata that may affect discovery.

影響:
Do not add `policy.allow_implicit_invocation: false` to hard-trigger skills.
Use clear `SKILL.md` activation and non-activation wording to prevent accidental
use.

## 2026-06-23: Keep Skill Templates Outside Discovery Shapes

理由:
Template files under a path like `*/skills/*/SKILL.md` can be discovered as real
Codex skills, causing placeholder skills such as `__SKILL_NAME__` to appear in
the available-skills list.

影響:
Store starter skill skeletons under template-oriented paths such as
`assets/agent-skills/templates/skill/`, and name the template instruction file
`SKILL.md.template`. Rename it to `SKILL.md` only after copying it into a real
target skill directory.
