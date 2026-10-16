---
title: miku-soft maintenance adoption workflow
description: "Routine application of approved miku-soft improvements during repository maintenance, with an explicit urgent-change skip path."
topics:
  - miku-soft
  - maintenance
  - adoption
  - exceptions
category: workflow
status: stable
audience:
  - maintainer
  - agent
created: 2026-07-31
updated: 2026-07-31
sources:
  - type: human-input
    role: primary
    label: request to apply approved findings during routine maintenance while allowing urgent narrow changes to skip the uplift pass
    checked: 2026-07-31
  - type: human-input
    role: primary
    label: request to advance approved maintenance when no specific repair or change has been named
    checked: 2026-07-31
  - type: local-file
    role: supporting
    path: docs/maintenance/2026-07-31-reference-actions-audit/implementation-backlog.md
    checked: 2026-07-31
---

# miku-soft Maintenance Adoption Workflow

## Purpose

Use ordinary maintenance as the main opportunity to apply approved miku-soft
improvements gradually. Do not wait for one estate-wide bulk rewrite.

When a repository change is requested, that change remains the primary task.
The adoption pass checks whether one or more already-approved improvements fit
naturally into the same maintenance scope.

When maintenance mode is active but no specific repair or change is requested,
the adoption pass becomes the primary task: select and complete one bounded,
approved maintenance slice containing one or more compatible improvements
instead of stopping because there is no reported defect.

## Default Rule

For every existing miku-soft repository maintenance task, perform the
Maintenance Uplift Check unless the Urgent or Narrow Change Skip applies. If no
specific change was requested, continue with Maintenance Opportunity Selection.

The uplift check is required. Applying an improvement is conditional.

## Maintenance Uplift Check

1. Identify the repository's miku-soft layer and workflow profile.
2. Read the applicable approved items in this maintenance directory and the
   relevant dated implementation backlog.
3. Inspect the repository's current implementation and worktree state.
4. Classify each noticed item as:
   - approved and applicable now;
   - approved but requires a separate change;
   - pending policy decision;
   - repository-specific exception; or
   - evidence only, with no action.
5. Apply an approved item in the current change only when all of these hold:
   - it is within or immediately adjacent to the requested scope, or it is the
     bounded slice selected by Maintenance Opportunity Selection;
   - it does not change an unrelated public compatibility contract;
   - affected consumers are known;
   - focused verification is available; and
   - it does not make the requested maintenance materially slower or riskier.
6. Verify the requested change, when present, and every adopted item.
7. Record applied, deferred, exceptional, or skipped items in the repository's
   existing TODO/worklog or in the dated maintenance backlog.

Do not perform an estate-wide search-and-replace from one repository task.

## Maintenance Opportunity Selection

Use this branch when maintenance mode is active for a known repository but the
user has not named a defect, feature, or maintenance item.

1. Build a candidate list from the repository's existing TODO/worklog, the
   applicable approved items in this directory, and observable drift from the
   approved repository profile.
2. Exclude candidates that:
   - still require a product-owner policy decision;
   - change public compatibility, artifact names, checksum formats, or runtime
     minimums without a dedicated migration;
   - require mutation of another repository or external GitHub state outside
     the active scope;
   - overlap unsafe unrelated worktree changes; or
   - lack a focused verification route.
3. Rank the remaining candidates by:
   - correctness or source-identity risk;
   - an approved missing verification or release control;
   - compatibility-neutral runtime, CI, or tooling alignment;
   - deterministic packaging and exact staged-file checks; then
   - documentation or generated-index drift.
4. Select one bounded, coherent slice containing one or more mutually
   compatible candidates.
5. Implement the slice, run focused verification for every included item,
   review the combined diff, and record the results and next ready candidates.

Multiple improvements belong in the same slice when all of these hold:

- every item is independently approved and applicable;
- they affect the same repository and compatible profile boundaries;
- they share edited files, setup work, or a natural verification path;
- combining them does not introduce a public-contract migration or obscure a
  failure source; and
- the combined diff remains bounded and reviewable.

There is no fixed one-item limit. Split the work when items are unrelated,
have different consumer risks, need different approvals, or cannot be verified
clearly as a group. The boundary is coherence and verifiability, not count.

Do not answer only that there is nothing to maintain merely because no defect
was supplied. If no safe approved mutation is ready, perform a read-only
assessment and report the exact pending decision, evidence gap, or dedicated
migration that blocks the next change.

The target repository must still be known. Use an explicitly named repository,
or the current repository when it is clearly the active miku-soft target. Do
not silently choose an arbitrary sibling repository.

## Improvements Suitable for Routine Adoption

After their governing policy is approved, these are usually suitable when they
touch the same files or verification path as the requested maintenance, or
when they are selected as part of the bounded maintenance opportunity:

- Node 22/24 CI alignment;
- explicit build JDK selection;
- least-authority CI permissions;
- tag, checkout ref, package/POM version, and Release target alignment;
- clean Release staging and exact final-file assertions;
- smoke tests against final staged artifacts;
- deterministic archive controls where reproducibility is claimed; and
- documentation corrections at already-edited paths.

Suitability still depends on the repository profile and consumer contract.

## Improvements Requiring a Separate Change

Do not add these opportunistically to an unrelated maintenance task:

- public Release artifact renaming;
- checksum-format migration;
- public Node or Java minimum-version changes;
- Web manifest publication/removal;
- Maven or npm native-name changes;
- shared runtime/vendor upgrades with exact digest consumers;
- reference path migration across sibling repositories; and
- reusable/generated workflow adoption across a repository family.

Create or retain a dedicated backlog item with its consumer and verification
plan.

## Urgent or Narrow Change Skip

The uplift pass may be skipped when any of these apply:

- the user explicitly requests an urgent, minimal, or narrowly scoped change;
- the task is an incident fix, security fix, release blocker, or production
  recovery;
- broadening scope would delay the requested outcome materially;
- the required product-owner policy decision is not available;
- safe verification would require unavailable external state; or
- unrelated worktree changes make adjacent maintenance unsafe.

When skipping:

1. complete only the requested change and its required verification;
2. do not make the uplift pass a prerequisite for the urgent result;
3. state briefly that routine miku-soft uplift was skipped and why;
4. record a follow-up only when an existing TODO/worklog is available and doing
   so does not delay the urgent task; and
5. do not mark any deferred improvement as applied or verified.

The skip applies only to additional maintenance improvements. It never removes
the need to verify the requested change in proportion to its risk.

## Decision Table

| Question | Yes | No |
| --- | --- | --- |
| Was a specific change requested? | Keep it primary; check adjacent uplift | Select a bounded slice of ready opportunities |
| Is the task urgent or explicitly narrow? | Skip uplift; complete requested work | Continue |
| Is the improvement already approved? | Continue | Record/defer |
| Is it within the same files and contract? | Continue | Separate change |
| Does it alter public compatibility or artifact names? | Dedicated migration | Continue |
| Are consumers and focused verification known? | Apply if low-risk | Record/defer |
| Would it materially delay the requested work? | Record/defer or skip | Apply and verify |

## Record Format

Use a compact row when a repository already has a suitable TODO or worklog:

    checked date | repository | profile | requested maintenance
    applied improvements | deferred improvements | exception or skip reason
    verification | next action

Do not create a new long-lived project document solely to record that no
additional improvement was applicable.

## Feedback Loop

After several repositories have adopted the same item successfully:

1. compare their verification evidence and exceptions;
2. refine the canonical profile;
3. promote stable language into references/ or assets/;
4. keep product-specific exceptions in profiles or repository TODOs; and
5. update the dated backlog so future maintenance does not repeat discovery.

This turns routine maintenance evidence into tested miku-soft guidance.
