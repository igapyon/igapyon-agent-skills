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
inventory rather than evidence for the maintained target. The exact Node.js
22/24 allocation remains a semantic-policy gate; using a Node 24-aware Action
major does not by itself make the product Node 24-only.

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
