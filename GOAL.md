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

This file defines what the AI agent is trying to accomplish.
Read this before starting work, before deciding that work is complete, and whenever scope becomes unclear.

## Objective

Validate and improve the type-specific design and workflow references under
`skills/igapyon-miku-soft-developer/references/`.

Use local sibling miku-soft repositories as implementation evidence, distinguish
descriptive practice from normative design, and prepare a clearer document
structure in which product-layer numbers have one stable meaning. Track the
executable work breakdown in `TODO.md` under `## AI Agent Current Tasks`.
Use typed layer identifiers and role-based paths so overview, methods,
migrations, profiles, catalogs, and dated external baselines are not mistaken
for product layers. Treat the sibling repositories' GitHub Actions as a
separate cross-repository contract audit: describe the current variation,
separate intentional profile differences from historical drift, and propose
canonical profiles before changing any workflow.

## Done

- The current numbering and routing model is documented accurately.
- Type-specific design, workflow, migration, and review documents are checked
  for internal consistency, implementation fit, design rationale, and temporal
  currency.
- Representative and exceptional sibling repositories are used as evidence for
  every applicable product layer; evidence gaps are stated explicitly.
- Findings are classified as valid, conditionally valid, target-state guidance,
  stale, conflicting, or evidence-insufficient.
- A reviewed migration proposal separates product layers, workflows, methods,
  migrations, reviews, product profiles, catalogs, and dated baselines without
  silently breaking existing document links.
- Starter assets have an explicit completeness/substitution contract and a
  focused verification route independent of the Markdown/JSON discovery index.
- GitHub Actions variation is recorded at workflow and contract level, with
  canonical CI/release profiles, shared invariants, explicit exceptions, and a
  prioritized migration backlog proposed from evidence rather than filename
  similarity.
- The maintained Node.js baseline no longer assumes Node.js 20. Product
  minimum, ordinary CI matrix, release-build runtime, released-artifact smoke
  runtime, and GitHub JavaScript Action runtime are inventoried separately;
  Node.js 22/24 responsibilities and any Node 24-only exception are explicitly
  decided and testable.
- Release artifact roles have a profile-specific contract covering modules,
  executable runtimes, source archives, Java artifacts, Skill bundles, Web
  assets, npm packages, final filenames, staged-file verification, SHA-256,
  reproducibility, and exact upload selection. The contract reuses proven
  sibling patterns without treating every product as the same artifact type.
- Each GitHub Release page presents a deliberate, visually coherent public
  asset set. Filenames follow one reviewed identity/role/version grammar and a
  controlled vocabulary, sort naturally as a family, and remain compatible
  with documented downloaders or receive an explicit consumer migration.
- Any user-approved document changes are followed by index regeneration,
  relevant tests, Git status inspection, and final diff review.

## Stop

- Existing human-oriented repository notes would need to be rewritten instead of extended.
- A proposed rule cannot be classified as descriptive or normative without a
  product-owner decision.
- Broad renaming, deletion of compatibility stubs, or sibling-repository
  mutation would be required without explicit user approval.
- User-side work or external state changes are required, such as push, release, manual confirmation, or external service operation. In that case, state the stop reason, resume condition, and first resume check once, then end the turn.
- Do not repeat waiting messages such as "waiting", "still waiting", or "waiting for resume" while blocked on user-side work or an external state change.
- `TODO.md` の `Retry Log` に同じ原因の失敗が3回記録された
