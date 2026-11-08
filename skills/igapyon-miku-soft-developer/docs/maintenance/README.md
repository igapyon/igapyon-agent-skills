---
title: miku-soft developer maintenance documents
description: "Maintainer-only plans, audits, and migration records for the shared miku-soft developer skill."
topics:
  - miku-soft
  - maintenance
  - audit
  - roadmap
category: guide
status: stable
audience:
  - maintainer
  - agent
created: 2026-07-31
updated: 2026-10-22
sources:
  - type: human-input
    role: primary
    label: request to preserve the reference and GitHub Actions audit inside the skill
    checked: 2026-07-31
---

# miku-soft Developer Maintenance Documents

This directory contains maintainer-facing plans and audit records for
igapyon-miku-soft-developer itself.

Dated plans and audits here are evidence, not normative miku-soft product
rules. Normal project work uses SKILL.md and references/. The
[maintenance adoption workflow](adoption-workflow.md) is an operational
workflow explicitly referenced by the maintenance entry point; it applies
already-approved rules, not pending audit proposals. A proposed product rule
moves into references/ or assets/ only after approval and verification.

## Current Dated Work

- [2026-10-22 skill review and correctness repairs](2026-10-22-skill-review.md)
- [2026-10-22 Luna implementation plan](2026-10-22-luna-implementation-plan.md) — implemented slice and gated follow-ups.
- [Rule ownership inventory](2026-10-22-rule-ownership.md) — current owners, retained callsite summaries, and deduplication decisions.
- [Luna execution record](2026-10-22-luna-execution-record.md) — scope, environment, verification results, and remaining gates.
- [2026-07-31 reference and GitHub Actions audit](2026-07-31-reference-actions-audit/README.md)

## Routine Adoption

Use the [maintenance adoption workflow](adoption-workflow.md) whenever an
existing miku-soft repository is maintained. It turns approved findings into a
small applicability check so that suitable improvements can be adopted along
with nearby work rather than through one estate-wide rewrite.

If maintenance mode is active for a known repository and no particular change
was requested, the same workflow selects a bounded slice of one or more
compatible, approved, and locally verifiable maintenance items and carries the
slice through. The boundary is a coherent reviewable diff and clear
verification, not an arbitrary one-item limit. It does not treat the lack of a
reported defect as proof that no maintenance is available.

An urgent, minimal, or explicitly narrow change may skip the additional
uplift pass when it would delay or endanger the requested result. The skip does
not apply to verification of the requested change, and public compatibility
changes still require a dedicated migration.

## Placement Rules

Use this directory for:

- dated reference-system audits;
- proposed document taxonomy and path migrations;
- cross-repository GitHub Actions normalization plans;
- pending policy decisions and implementation backlogs; and
- evidence summaries needed to resume maintenance safely.

Do not use this directory for:

- ordinary product-specific TODO items;
- current normative architecture rules;
- copied sibling repository documentation;
- generated build artifacts; or
- scratch evidence that belongs in workplace/.

The repository-root TODO.md remains the current execution-state source of
truth. Dated maintenance documents preserve the reasoning and migration plan
behind those TODO items.

## Promotion Rule

When a proposal is approved:

1. update the owning file under references/ or assets/;
2. retain compatibility stubs when an old public path has consumers;
3. regenerate an index only when the target skill has adopted one;
4. run focused documentation, starter, and workflow verification; and
5. update the dated audit status and repository-root TODO/HANDOFF records.

Do not silently turn a dated observation into a normative rule.
