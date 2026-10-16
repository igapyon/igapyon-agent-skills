---
title: miku-soft developer audit decisions and roadmap
description: "Durable design principles, pending policy choices, and authorized-order roadmap for reference and workflow normalization."
topics:
  - miku-soft
  - decisions
  - roadmap
  - compatibility
category: workflow
status: draft
audience:
  - maintainer
  - agent
created: 2026-07-31
updated: 2026-07-31
sources:
  - type: local-file
    role: primary
    path: workplace/miku-soft-reference-audit/wave-c-integration.md
    checked: 2026-07-31
  - type: local-file
    role: supporting
    path: workplace/miku-soft-reference-audit/decision-brief.md
    checked: 2026-07-31
---

# Decision and Roadmap

## Design Principles Already Selected

These principles govern the next work even while numeric policy values remain
pending.

1. Separate implementation practice, target-state guidance, and dated external
   constraints.
2. Normalize GitHub Actions by product and Release contract, not exact YAML
   text.
3. Give product-layer numbers one meaning and represent workflows, methods,
   migrations, reviews, profiles, and baselines as different document roles.
4. Repair semantic conflicts before moving reference paths.
5. Keep time-sensitive runtime and Action values in dated baselines.
6. Keep the Markdown/JSON discovery index separate from executable starter
   asset verification.
7. Collect evidence in parallel, but integrate centrally and mutate public
   Release contracts serially.
8. Migrate public Release names consumer-first.
9. Treat published Release assets, URLs, checksums, vendor metadata, and
   released Skill ZIPs as immutable historical records.

## Pending Product-Owner Decision Packet

| Decision | Leading recommendation | Explicit alternatives |
| --- | --- | --- |
| Node product baseline | product >=22; CI 22/24; Release build 24; final staged runtime smoke 22 | justified Node 24-only, browser build-tool-only, Java/non-Node |
| Release integrity | one SHA256SUMS for future multi-asset Releases | documented singleton sidecar exception |
| Custom asset naming | retain role-before-version grammar | documented compatibility exception |
| Native artifact names | retain Maven classifier and npm pack names | none without a concrete ecosystem migration |
| Web JSON | stable public manifest or no uploaded JSON | product-specific manifest only with a declared consumer |
| Action references | select reviewed major tags or immutable SHA pins | hybrid only with explicit ownership/update rules |
| Release orchestration | declare human attachment, tag create/update, or draft-first per profile | no implicit mixed ownership |
| Java compatibility | newer build JDK with Java 8 product smoke until separately raised | explicit product-specific runtime target |
| Path migration | additive canonical paths plus old-path compatibility stubs | stub removal only through later approval |

## Recommended Approval Order

1. numbering and typed taxonomy;
2. Release orchestration profiles;
3. Node and Java baselines;
4. artifact roles, naming, checksum, and reproducibility;
5. MCP baseline and evidence-strength rules;
6. starter asset and discovery contracts; and
7. path migration timing.

## Implementation Sequence

### Phase 0: standalone correctness repair

Prepare the miku-indexgen-java manual Release source-identity correction. The
manual input tag, checkout SHA, POM version, staged artifact names, and target
Release tag must be one tested identity.

This repair is independent of the Node and filename policy packet, but editing
the sibling repository still requires explicit authorization.

### Phase 1: first-party semantic repair

After policy approval, update the current reference paths without moving them.

- change the maintained Node baseline coherently across prose and starter
  metadata;
- separate product runtime, CI, Release host, final artifact smoke, compiler
  target, and Action-internal runtime;
- clarify layer defaults and exceptions;
- correct Java compatibility mechanics;
- align review terminology and starter contracts; and
- add dated baseline ownership.

### Phase 2: missing controls

- add naming authority;
- add layer 20, layer 21, and straight-conversion review coverage;
- add starter asset inventory and fixture checks;
- define Release artifact fixtures and checksum verification; and
- add consumer registers where names/digests are public contracts.

### Phase 3: canonical paths

Add role-based reference paths, update the router, then turn old paths into
compatibility stubs. Do not combine this with semantic repair.

### Phase 4: representative repository pilots

Run one profile at a time:

1. miku-text-file-ops for Node 22 final-artifact smoke;
2. miku-text-file-ops-skills for isolated ZIP/runtime proof;
3. miku-json2xlsx for a real Node 20-to-22 migration;
4. miku-xlsx2md for Node CLI/runtime artifact staging and integrity;
5. miku-docx2md-java for custom Java runtime staging/smoke;
6. miku-docx2md-web for Web manifest and exact-set behavior; and
7. Maven/npm native profiles after their exception contract is frozen.

miku-ms-office-core requires an expanded authoritative consumer inventory
before any public bundle or source-map name change.

### Phase 5: family rollout and consumer migration

Roll out only after a pilot has:

- an exact profile fixture;
- local build/test evidence;
- final staged artifact smoke;
- final-byte checksum verification;
- consumer compatibility evidence; and
- an isolated reviewed diff.

## Routine Maintenance Adoption

After a policy or profile item is approved, use ordinary repository
maintenance as its default adoption path. Apply it in the same change only
when it is adjacent to the requested scope, has known consumers and focused
verification, and does not alter an unrelated compatibility contract.

Use the [maintenance adoption workflow](../adoption-workflow.md) to record
applied, deferred, exceptional, and skipped items. Urgent, minimal, and
explicitly narrow maintenance may skip the additional uplift pass. Public
artifact renaming, checksum migration, minimum-runtime changes, and shared
consumer migrations remain dedicated changes even during routine maintenance.

## Stop Boundary

The audit/design phase is complete. A state-changing phase starts only after
the product owner approves the relevant policy packet and names the first
serial implementation scope.
