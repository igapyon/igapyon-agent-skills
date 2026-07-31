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

This file summarizes the current working state for the next human or AI agent.
Keep it concise. Do not use this as a full work log or a replacement for `TODO.md` and `DECISIONS.md`.

## Current State

- AI agent state management has been initialized for this repository.
- Root `TODO.md` remains the repository's existing task memo.
- `GOAL.md`, `DECISIONS.md`, and `HANDOFF.md` provide agent-oriented state, decisions, and resume context.
- The active objective is now the validity audit and structural improvement of
  `skills/igapyon-miku-soft-developer/references/`.
- The numbered references have been classified: product-layer codes are
  `10/11/20/21/40/50`; `30` is a conversion method; `31/32` are separation
  workflows; `00` is overview/concept work rather than a product layer.
- The preferred future direction keeps layer numbers stable and separates
  layers, workflows, methods, migrations, reviews, profiles, catalogs, and
  dated baselines into explicit document roles. Typed IDs such as `L10`,
  `M-L10-L20`, and `G-L10-L10+L11` remove cross-role ambiguity.
- No product reference has been renamed or semantically changed yet. Content
  validity is to be audited before any path migration.
- The claim-evidence matrix contract and pilot repository set are now recorded
  under `TODO.md`.
- The local-only inventory found 56 direct sibling candidates. The primary
  pilots are the `miku-indexgen`, `miku-xlsx2md`, and `miku-md2docx` families,
  with explicit Java-only, Skill-only, minimal-Skill, combined-Web, and MCP
  contrasts.
- Detailed ignored working evidence is stored in
  `workplace/miku-soft-reference-audit/`; the matrix currently contains 23
  claims, with target structure, phased revision plan, and decision brief in
  separate files.
- Full reads are complete for all `00/10/11/20/21/30/40/50` basic documents
  and all top-level numbered workflows.
- High-confidence conflicts include layer 10 and Java release defaults,
  release-review wording, straight-conversion multi-module Maven allowance,
  and Java 8 compatibility versus source/target-only compilation.
- High-confidence stale findings include the `miku-xlsx2md-java`
  multi-module note, volatile product inventories, and Node.js 20 as the
  maintained starter minimum.
- Dated primary-source checks were completed for Node.js lifecycle, current
  GitHub Action lines, Maven/JUnit Java compatibility, and MCP specification
  revision 2025-11-25.
- A read-only compatibility scan found 38 files across 25 sibling repositories
  naming current reference paths; old-path stubs are therefore required for
  any later migration.
- GitHub Actions normalization is now an explicit audit track. The initial
  read-only scan found 57 direct workflows in 47 of 56 sibling candidates:
  10 CI and 47 release-oriented files, with 54 distinct exact contents.
  Differences must be classified by product profile and contract before they
  are treated as drift or defects.
- The workflow plan defines a per-workflow inventory, normalized structural and
  contract clustering, canonical profile candidates, shared invariants, an
  exception registry, and a P0-P3 migration backlog. No sibling workflow has
  been changed, fetched, dispatched, or published.
- Node.js baseline migration is a named sub-track. A literal scan found Node 20
  on `node-version` lines in 29 direct sibling workflow files, compared with
  Node 22 in 3 and Node 24 in 14; matrix files can appear in two counts. The
  maintained candidate to test is product minimum 22, CI on 22/24, release
  build on 24, and a Node 22 smoke of released runtimes that claim `>=22`.
- Release artifact normalization is also a named sub-track. Initial signals
  include 13 workflows staging/copying `.mjs`, 14 staging/copying `.jar`, 15
  referring to `sources*.tgz`, 10 referring to Skill bundle `.zip`, and only 3
  uploading `.zip.sha256`. Counts overlap and artifact meaning still requires
  profile-level classification.
- The candidate lifecycle is build, verify, stage under final names, checksum
  final bytes, verify the expected set, then upload. Reproducible Skill zip,
  Node module/source staging, Java minimum-runtime smoke, npm pack surface
  verification, and Web staging are exemplar controls rather than one universal
  workflow template.
- Release-page filename quality is now an explicit design concern. Node custom
  assets mostly use role-before-version names, while Java sources jars mix
  role-before-version and Maven-style version-before-classifier forms. Existing
  download scripts, runtime resolvers, docs, and articles consume these names,
  so filename cleanup requires a producer/consumer compatibility map.
- The leading custom-asset grammar to evaluate is
  `<release-family>[-<role>][-<platform>-<arch>]-<release-version>.<ext>`, with
  sorted per-profile Release-page fixtures and narrow npm/Maven exceptions.
- The next audit execution is intentionally parallel: one coordinator plus up
  to three read-only subagents per wave. Workers receive disjoint scopes and
  unique ignored reports; only the coordinator merges results. Actual workflow
  changes remain serial representative pilots after approval.
- Wave A is complete and integrated in
  `workplace/miku-soft-reference-audit/wave-a-integration.md`. Its three
  reports confirm the Node/asset/workflow evidence tracks and identify two
  contract candidates for follow-up: manual tag checkout in `miku-indexgen-java`
  and tag-driven Release creation in `miku-docx2md`.
- Wave B is complete and integrated in
  `workplace/miku-soft-reference-audit/wave-b-integration.md`. It groups all
  direct workflows into 11 Release and 4 CI profile proposals, separates P0
  source-identity corrections from estate policy gates, and records a
  candidate Node/artifact/naming contract plus serial pilot order. The
  candidate defaults remain unapproved; no sibling has been mutated.
- Wave C is complete and integrated in the ignored audit workspace. It provides
  a cross-checked W01–W57 workflow TSV, P0/P1 exception/control register,
  producer/consumer evidence, and a 15-item Node reference/starter register.
  The highest-impact naming finding is miku-ms-office-core: at least seven
  fixed vendor/import consumers exist while its producer verifier names only
  three. No public artifact name may be changed producer-first.
- The durable audit/roadmap summary is now tracked under
  `skills/igapyon-miku-soft-developer/docs/maintenance/2026-07-31-reference-actions-audit/`.
  Raw Wave reports remain ignored workplace provenance; ordinary project
  workflows continue to use `references/` as the normative source.
- Routine miku-soft maintenance now includes an uplift check for approved,
  adjacent improvements. Urgent, minimal, or explicitly narrow work may skip
  only that additional uplift pass; the requested change and its verification
  remain required. Public compatibility changes stay in dedicated migrations.
- When maintenance mode has a known target repository but no named change, it
  now selects and completes a bounded slice of one or more mutually compatible,
  approved, locally verifiable improvements. The slice is limited by coherence
  and verification rather than item count. If none is ready, it performs a
  read-only assessment and identifies the exact pending decision instead of
  claiming there is no maintenance work.
- 2026-06-23 skill discovery maintenance is implemented, copied into `/Users/igapyon/.codex/skills`, and verified in a fresh Codex session.
- `policy.allow_implicit_invocation: false` was removed from `igapyon-agent-state-management` and `igapyon-skill-compactor` `agents/openai.yaml` files.
- The miku-soft Agent Skill starter skeleton was moved from `assets/agent-skills/skills/__SKILL_NAME__/SKILL.md` to `assets/agent-skills/templates/skill/SKILL.md.template`.
- `DECISIONS.md` records the durable policy: avoid hidden discovery controls and keep skill templates outside discovery shapes.
- 2026-06-29 release-bundled external skill refs were checked against upstream tags.
  Only `miku-ms-office-skills` needed an update; `pom.xml` and README now pin
  it at `v0.4.2`.

## Next Action

- Wave C is complete. Review the integrated decision packet in
  `workplace/miku-soft-reference-audit/wave-c-integration.md`: Node roles,
  checksum shape, custom/native naming rules, Web JSON visibility, Action
  pinning, and Release ownership.
- If authorized, prepare only the standalone P0 `miku-indexgen-java`
  source-identity correction first; its acceptance fixture must bind manual
  input tag, checkout SHA, POM version, staged names, and Release target.
- After policy approval, update this repository's developer references/starters
  as one coherent Node baseline change, then run exactly one serial profile
  pilot. Do not parallelize sibling mutations that share templates, consumers,
  release names, or GitHub state.
- Continue systematic extraction for remaining product-specific/current-state
  claims, but do not delay obvious conflict classification already backed by
  the matrix.
- After decisions, prepare semantic edits at current paths as a separate diff;
  do not start the path migration in the same change set.

## Relevant Files

- `GOAL.md`: Current agent objective, done conditions, and stop conditions.
- `TODO.md`: Existing repository TODO plus AI agent current tasks.
- `DECISIONS.md`: Important decisions and reasons.
- `HANDOFF.md`: Compact resume notes.
- `README.md`: Repository operating rules and conventions.
- `skills/igapyon-miku-soft-developer/SKILL.md`: Workflow router.
- `skills/igapyon-miku-soft-developer/references/architecture-rules.md`: Basic-document selector and shared architecture rules.
- `skills/igapyon-miku-soft-developer/references/miku-soft-basic/`: Current type-specific design documents.
- `skills/igapyon-miku-soft-developer/references/review/`: Current review notes.
- `workplace/miku-soft-reference-audit/claim-matrix.md`: Detailed audit claims.
- `workplace/miku-soft-reference-audit/target-structure.md`: Candidate taxonomy
  and target tree.
- `workplace/miku-soft-reference-audit/revision-plan.md`: Phased implementation
  and verification plan.
- `workplace/miku-soft-reference-audit/decision-brief.md`: Pending product-owner
  choices and recommendations.
- `workplace/miku-soft-reference-audit/github-actions-audit-plan.md`:
  Cross-repository workflow inventory, classification, profile, and migration
  plan.

## Watch Outs

- Do not rewrite unrelated existing `TODO.md` sections while updating agent task state.
- Keep state files concise; use repository documentation for durable project rules.

## Last Verification

- 2026-07-31: Read the numbered workflows, architecture router, new-project
  router, current basic-document map, Git history for numbered workflows, and
  the local sibling miku-soft directory inventory. Confirmed the worktree was
  clean before updating these state files.
- 2026-07-31: Completed full reads through layers 40/50, inspected bundled
  starters and representative Skill/MCP repositories, checked current primary
  sources, and scanned sibling hard links. Product references and sibling
  repositories remain unmodified.
- 2026-07-31: Completed the first read-only GitHub Actions inventory across all
  56 direct sibling candidates and recorded the normalization audit plan.
- 2026-07-31: Added the Node 20-to-22/24 decision track and recorded the first
  workflow, package-engine, reference, and starter-assumption counts.
- 2026-07-31: Added the release-artifact normalization track and recorded the
  initial module, source, jar, Skill zip, Web, npm pack, and checksum patterns.
- 2026-07-31: Elevated Release-page filename consistency to a public UX/API
  contract and added producer/consumer compatibility planning.
- 2026-07-31: Added the parallel subagent execution protocol: parallel
  read-only evidence waves, serial integration, and serial mutation pilots.
- 2026-07-31: Completed and integrated Wave A. The detailed reports and
  evidence reconciliation are retained in the ignored audit workspace.
- 2026-07-31: Completed and integrated Wave B. Its canonical-profile proposal,
  migration backlog, and product-owner decision gates are retained in the
  ignored audit workspace; the completed Wave C registers supply the remaining
  machine-readable evidence.
- 2026-07-31: Completed and integrated Wave C. The audit/design phase now has
  complete direct-workflow rows and focused public-asset consumer evidence;
  the next state-changing step needs an explicit decision packet and named
  serial pilot authorization.
- 2026-07-31: Added the routine maintenance adoption workflow and connected it
  to the normative maintenance checklist, dated roadmap, and implementation
  backlog, including the urgent/narrow uplift skip boundary.
- 2026-07-31: Added Maintenance Opportunity Selection for maintenance sessions
  with a known repository but no specific requested change.
- 2026-06-22: Inspected `git status --short`, `README.md`, existing `TODO.md`, and state-management templates.
- 2026-06-23: `mvn generate-resources` and `mvn package` passed.
- 2026-06-23: Source and installed copies were checked: no `allow_implicit_invocation` remained in the two affected skills.
- 2026-06-23: Source and installed `igapyon-miku-soft-developer/assets/agent-skills` trees were checked: no real `SKILL.md` template remained under the starter assets.
- 2026-06-23: Fresh Codex session skill list includes `igapyon-agent-state-management` and `igapyon-skill-compactor`, and does not include `__SKILL_NAME__`.
- 2026-06-29: `mvn package` passed after updating the release-bundled
  `miku-ms-office-skills` ref to `v0.4.2`; the generated zip includes
  `skills/igapyon-miku-ms-office/runtime/miku-xlsx2md-1.2.3.mjs`.
