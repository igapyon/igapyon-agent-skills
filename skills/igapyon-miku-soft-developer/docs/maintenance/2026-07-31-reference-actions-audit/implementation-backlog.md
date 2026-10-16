---
title: miku-soft reference and workflow implementation backlog
description: "Prioritized implementation items and verification gates derived from the 2026-07-31 audit."
topics:
  - miku-soft
  - backlog
  - github-actions
  - migration
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
    path: workplace/miku-soft-reference-audit/migration-backlog.md
    checked: 2026-07-31
  - type: local-file
    role: supporting
    path: workplace/miku-soft-reference-audit/wave-c-exception-control-register.md
    checked: 2026-07-31
---

# Implementation Backlog

This backlog is a planning record. It is not permission to change sibling
repositories or publish GitHub state.

## Decision Gates

- [ ] Approve typed numbering and role-based document structure.
- [ ] Approve product Node >=22, CI 22/24, Release build 24, and staged Node 22
  artifact smoke.
- [ ] Decide whether the two current >=24 <25 Skill products are intentional
  Node 24-only exceptions.
- [ ] Approve SHA256SUMS or a documented profile split.
- [ ] Approve custom role-before-version naming and native Maven/npm exceptions.
- [ ] Decide whether Web JSON is a stable public manifest or should not be
  uploaded.
- [ ] Select Action major-tag versus immutable-SHA policy.
- [ ] Declare Release creation/attachment owner per profile.
- [ ] Approve additive path migration and compatibility-stub duration.

## P0: Correct Before Reuse

### P0-1 miku-indexgen-java manual source identity

Current static evidence shows that workflow_dispatch resolves its input tag
after a default checkout and performs no later checkout before POM evaluation
and build.

Required result:

- resolve and validate the tag;
- check out the exact tag before Maven evaluation;
- bind checkout SHA, POM version, final names, and Release target; and
- test push-tag and manual-tag paths separately.

This is the first recommended sibling implementation, but it needs explicit
authorization.

## P1: Contract Ownership and Determinism

### P1-1 miku-docx2md Release owner

Choose and document one model:

- human-created Release followed by asset attachment; or
- tag-driven create/update with deterministic rerun behavior.

Do not assume the missing create step is a defect until the owner is known.

### P1-2 Java custom CLI build JDK

Configure an explicit build JDK before Maven package in:

- miku-grep-java;
- miku-javaclass2json-java;
- miku-readfile-java; and
- mikuproject-java.

Retain the separately declared Java 8 staged-runtime smoke where it is the
product compatibility promise.

### P1-3 mikuproject-mcp package version authority

Confirm that packages/node/package.json owns the published npm version. Add a
tag-to-package relation check before npm pack and keep the existing packed
surface verification.

### P1-4 first artifact-control pilot

After checksum approval, add:

- clean staging;
- exact final file fixture;
- staged-byte behavior/content verification;
- final-byte checksum generation and verification; and
- bounded upload selection.

Do not combine this pilot with a public filename rename.

## P2: First-Party and Representative Migration

### P2-1 references and starters

Update the current paths as one coherent semantic change:

- references/10-node-app-workflow.md;
- references/40-agent-skills-workflow.md;
- references/miku-soft-basic/miku-soft-40-agentskills-design.md;
- assets/agent-skills/package.json;
- assets/agent-skills CI and Release templates;
- assets/node-main-app Release template; and
- assets/web-app metadata and Release guidance.

Keep product runtime, repository tooling, browser runtime, build host, compiler
target, final artifact smoke, and Action runtime distinct.

### P2-2 Node final-artifact pilot

Use miku-text-file-ops first because it already declares >=22, targets node22,
and builds Releases with Node 24. Add ordinary 22/24 CI where appropriate and
smoke the final staged CLI/runtime bytes on Node 22 without renaming them.

### P2-3 Skill ZIP pilot

Use miku-text-file-ops-skills to prove an isolated staged/extracted runtime,
Node 22 execution, ZIP content, and approved checksum behavior.

### P2-4 real Node 20-to-22 pilot

Use miku-json2xlsx to change engines, documentation, CI, bundle targets, and
final artifact smoke as one compatibility unit. Keep its public artifact names
unchanged during this migration.

### P2-5 artifact profile pilots

Run serially:

1. miku-xlsx2md: Node CLI/runtime/source set;
2. miku-ms-office-core: library plus source-map pair, only after expanding its
   authoritative consumer list;
3. miku-docx2md-java: custom Java runtime;
4. miku-docx2md-web: Web app/index/manifest decision; and
5. miku-prompt-lint-skills: Skill reproducibility and checksum migration.

## P3: Estate Reliability and Explicit Exceptions

- preserve Maven classifier and npm pack names;
- test Node 22 before retaining or removing each Node 24-only declaration;
- define Action update/pinning ownership;
- add explicit CI read permissions where missing;
- define profile-level timeout and concurrency behavior;
- record miku-javaclass2json source-jar naming as a compatibility exception;
- evaluate reusable workflow, generated workflow, or copied local profile only
  after representative pilots show the stable boundary.

## Required Verification for Every Pilot

1. Freeze the selected profile and exception fixture.
2. Inspect the repository's pre-existing worktree state.
3. Build/test using the approved host runtime.
4. Recreate a clean staging directory.
5. Assert exact final basenames and non-empty files.
6. Verify final executable/package/archive behavior.
7. Generate and verify the selected checksum from final bytes.
8. Run affected consumer resolver/import/digest/bundle tests.
9. Review the isolated diff and status.
10. Leave dispatch, upload, release, tag, push, and publication to a separately
    approved human-controlled step.

## Adoption During Routine Maintenance

- [ ] On each ordinary miku-soft maintenance task, identify the repository
  layer/profile and check approved backlog items that touch the same scope.
- [ ] When no particular change is requested for a known target repository,
  select and complete a bounded slice of one or more mutually compatible,
  approved, and locally verifiable backlog items instead of stopping after
  inspection.
- [ ] Apply only low-coupling items whose consumers and focused verification
  are known.
- [ ] Keep public artifact names, checksum formats, runtime minimums, and
  shared-consumer migrations in dedicated changes.
- [ ] Record repository-specific exceptions and useful verification evidence
  so the canonical profile can improve.
- [ ] For an urgent, minimal, or explicitly narrow request, allow the
  additional uplift pass to be skipped; briefly record the reason when doing
  so does not delay the requested result.

The detailed decision rule is the
[maintenance adoption workflow](../adoption-workflow.md). Skipping uplift does
not skip verification of the requested change.

## Completion Definition

A profile is ready for family rollout only when its representative pilot has:

- one documented contract;
- one exact staged-file fixture;
- one local verification route;
- explicit exceptions;
- consumer impact evidence; and
- a reviewed migration result recorded here and in repository-root TODO.md.
