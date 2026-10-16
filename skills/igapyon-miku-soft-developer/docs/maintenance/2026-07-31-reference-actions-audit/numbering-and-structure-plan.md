---
title: miku-soft reference numbering and structure plan
description: "Proposed stable layer identifiers and role-based reference layout derived from the 2026-07-31 audit."
topics:
  - miku-soft
  - taxonomy
  - documentation
  - migration
category: spec
status: draft
audience:
  - maintainer
  - agent
created: 2026-07-31
updated: 2026-07-31
sources:
  - type: local-file
    role: primary
    path: workplace/miku-soft-reference-audit/target-structure.md
    checked: 2026-07-31
  - type: local-file
    role: supporting
    path: workplace/miku-soft-reference-audit/claim-matrix.md
    checked: 2026-07-31
---

# Numbering and Structure Plan

## Numbering Decision Candidate

Keep the familiar product numbers, but give them one meaning only.

| Typed ID | Existing number | Meaning |
| --- | ---: | --- |
| L10 | 10 | TypeScript / Node.js main application |
| L11 | 11 | separated Web application surface |
| L20 | 20 | Java runtime / Java CLI |
| L21 | 21 | separated Java Maven plugin adapter |
| L40 | 40 | Agent Skills package |
| L50 | 50 | MCP server / protocol adapter |

The following numbers are not product layers:

| Existing number | Document role | Suggested typed ID |
| ---: | --- | --- |
| 00 | overview plus concept/naming workflow | overview or workflow identifier |
| 30 | L10 to L20 straight-conversion method | M-L10-L20-java-straight-conversion |
| 31 | split historical L20 into L20 plus L21 | G-L20-L20+L21-java-maven-separation |
| 32 | split historical L10 into L10 plus L11 | G-L10-L10+L11-node-web-separation |

Additional typed identifiers may be used in audit metadata without forcing
long identifiers into every human-facing filename:

- W-L10: workflow for a product layer;
- R-L20-java-runtime: review lens;
- P-miku-xlsx2md: product profile;
- B-node-actions: dated external baseline.

Do not allocate a new layer number merely because a new workflow, review note,
or migration guide is created. A new layer number requires a durable product
ownership boundary.

## Proposed Reference Tree

    references/
      README.md
      architecture-rules.md
      naming.md
      layers/
        10-main-app.md
        11-web-app.md
        20-java-runtime.md
        21-java-maven-plugin.md
        40-agent-skills.md
        50-mcp-server.md
      workflows/
        concept-and-naming.md
        new-project.md
        maintenance.md
        10-main-app.md
        11-web-app.md
        20-java-runtime.md
        21-java-maven-plugin.md
        40-agent-skills.md
        50-mcp-server.md
      methods/
        10-to-20-java-straight-conversion.md
      migrations/
        10-11-node-web-separation.md
        20-21-java-maven-separation.md
      review/
        README.md
        10-node-cli.md
        11-single-file-web-app.md
        20-java-runtime.md
        21-java-maven-plugin.md
        40-agent-skills.md
        50-mcp-server.md
        straight-conversion.md
        release-automation.md
      profiles/
      catalog/
        repositories.md
      baselines/
        node-and-github-actions.md
        java-build-and-runtime.md
        mcp-protocol.md
      assets.md

Directory names communicate document role. Numbers communicate product-layer
identity only.

## Document Ownership Rules

- layers/: durable architecture, ownership, invariants, artifact roles, and
  verification expectations.
- workflows/: ordered execution steps and completion checks.
- methods/: repeatable derivation from one layer to another.
- migrations/: checkpointed transitions between repository shapes.
- review/: focused audit lenses.
- profiles/: durable product-specific exceptions or examples.
- catalog/: volatile repository inventory.
- baselines/: dated runtime, Action, Java, and protocol values.
- assets.md: starter completeness, substitutions, and focused verification.

Volatile repository lists, Action majors, runtime support dates, and product
histories should not remain embedded inside layer documents.

## Compatibility Requirement

The current paths are already consumers' public reference interface. A
2026-07-31 local scan found 38 files in 25 sibling repositories naming one or
more existing numbered/basic paths.

Therefore path migration must be additive:

1. repair semantics at the current paths;
2. create canonical role-based files;
3. update internal routing;
4. replace old files with small compatibility stubs only after canonical
   ownership is complete;
5. regenerate the discovery index and check links;
6. migrate sibling references as a separately authorized SCM task; and
7. remove stubs only through a later compatibility decision.

## Missing Coverage to Add

The first structural implementation should add or explicitly account for:

- layer 20 Java runtime workflow and review lens;
- layer 21 Java Maven plugin workflow and review lens;
- straight-conversion review lens;
- dated Node/Actions, Java, and MCP baselines;
- one central repository naming authority; and
- an asset manifest that distinguishes complete starters, overlays, and
  fragments.

This plan does not authorize moving existing reference files yet.
