---
title: 2026-07-31 miku-soft reference and GitHub Actions audit
description: "Durable summary and reading order for the reference taxonomy, Node baseline, Release artifact, and workflow normalization work."
topics:
  - miku-soft
  - reference-taxonomy
  - github-actions
  - nodejs
  - release-artifacts
category: reference
status: draft
audience:
  - maintainer
  - agent
created: 2026-07-31
updated: 2026-07-31
sources:
  - type: local-file
    role: primary
    path: workplace/miku-soft-reference-audit
    checked: 2026-07-31
  - type: source-code
    role: supporting
    label: direct local miku-soft sibling repositories and workflows
    checked: 2026-07-31
---

# 2026-07-31 Reference and GitHub Actions Audit

## Status

The read-only audit and design phase is complete. Policy approval and serial
implementation pilots remain pending.

Approved findings are intended to move into repositories gradually through
the [routine maintenance adoption workflow](../adoption-workflow.md). An
urgent or explicitly narrow maintenance request may skip that additional
uplift pass without skipping verification of the requested change.

No sibling repository was fetched or changed during the audit. No workflow was
dispatched, and no Release, package, tag, branch, or public asset was created or
updated.

## Durable Reading Order

1. [Decision and roadmap](decision-and-roadmap.md)
   - selected design principles;
   - product-owner decision packet; and
   - safe implementation sequence.
2. [Numbering and structure plan](numbering-and-structure-plan.md)
   - meaning of 00, 10, 11, 20, 21, 30, 31, 32, 40, and 50;
   - typed identifiers; and
   - proposed role-based reference tree.
3. [GitHub Actions profile plan](github-actions-profile-plan.md)
   - 57-workflow evidence summary;
   - canonical CI and Release profiles;
   - Node 22/24 and artifact contracts; and
   - P0/P1 findings.
4. [Implementation backlog](implementation-backlog.md)
   - decision gates;
   - P0-P3 work items;
   - serial pilots; and
   - verification requirements.

## Audit Coverage

The static local workflow scope contained:

- 56 direct sibling candidates;
- 47 repositories with direct GitHub Actions workflows;
- 57 direct workflow files;
- 47 Release-oriented workflows;
- 10 CI workflows;
- 11 proposed Release profiles; and
- 4 proposed CI profiles.

A machine-readable W01-W57 TSV, producer/consumer register, exception register,
claim matrix, and Wave A/B/C worker reports were retained in the ignored local
workplace/miku-soft-reference-audit workspace during the audit. They are raw
provenance, not shipped normative references. This tracked directory is the
curated durable result.

## Main Conclusions

- Product-layer numbers should have one stable meaning.
- 00 is overview/concept work, 30 is a cross-layer method, and 31/32 are
  migrations rather than peer product layers.
- GitHub Actions should be normalized by contract profile, not by identical
  YAML text.
- The leading Node policy is product minimum 22, CI on 22 and 24, Release build
  on 24, and final staged JavaScript artifact smoke on Node 22.
- Release artifact filenames are public API and UI. Existing names and URLs are
  immutable historical records.
- Public filename and checksum changes must be consumer-first.
- Read-only evidence collection can run in parallel; public workflow and
  artifact mutations must use serial representative pilots.

## Raw Audit Manifest

The local audit workspace contained the following source groups:

- claim-matrix, target-structure, revision-plan, and decision-brief;
- github-actions-audit-plan and canonical-workflow-profiles;
- Wave A Node, artifact, and workflow-contract evidence;
- Wave B workflow-profile, Node-migration, and artifact-contract proposals;
- Wave C workflow inventory, producer/consumer register, exception/control
  register, and reference/starter Node register; and
- coordinator integration records for Waves A, B, and C.

If those raw files are unavailable in a future checkout, the documents in this
directory remain the implementation planning authority.
