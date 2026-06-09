---
title: Compaction Modes Example
description: Small before and after examples for conservative, structural, and summary compaction modes.
topics:
  - compaction-modes
  - examples
  - conservative
  - structural
  - summary
category: example
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-10
updated: 2026-06-10
sources:
  - type: human-input
    label: user proposed examples and tests for the three compaction modes
    role: primary
    checked: 2026-06-10
---

# Compaction Modes Example

Use this example to distinguish the three modes. It is illustrative, not a
replacement for [../references/agent-skill/compaction-modes.md](../references/agent-skill/compaction-modes.md).

## Source Text

```markdown
## Release Checks

Before publishing a release, run the build, inspect the generated archive, and
confirm that the README still describes the install path. This is important
because users often install from the archive rather than from the repository.
Use `npm test` first, and use `npm run build` before inspecting the archive.

- Confirm `bundle/example-skill.zip` exists.
- Confirm `skills/example-skill/SKILL.md` is included.
- Do not publish if runtime artifacts are missing.

If any check fails, stop and fix the repository before creating the release.
```

## Extracted Structured Inventory

- Commands:
  - `npm test`
  - `npm run build`
- Required artifact:
  - `bundle/example-skill.zip`
- Required archive content:
  - `skills/example-skill/SKILL.md`
- Documentation condition:
  - README describes the install path.
- Prohibition:
  - Do not publish if runtime artifacts are missing.
- Stop condition:
  - If any check fails, stop and fix the repository before creating the release.

Why: the commands come from prose, while archive requirements come from bullets.
Both are part of the same structured inventory.

## Representation Choice

Use the simplest representation that keeps the structure clear.

- Independent constraints can stay as unordered bullets.
- Required execution order should stay as ordered steps.
- Repeated attributes or mode comparisons can become tables.
- Branching, fallback paths, state transitions, dependency graphs, and
  reference-routing logic may become Mermaid when a diagram is shorter or less
  ambiguous than bullets.

Mermaid choice is independent of compaction mode. `conservative`, `structural`,
and `summary` decide how much inventory remains; the source structure decides
whether bullets, tables, Mermaid, or short prose represent it best.

## Conservative Output

```markdown
## Release Checks

Before publishing a release, run the build, inspect the archive, and confirm
that README still describes the install path.

- Run `npm test`.
- Run `npm run build`.
- Confirm `bundle/example-skill.zip` exists.
- Confirm `skills/example-skill/SKILL.md` is included.
- Do not publish if runtime artifacts are missing.

If any check fails, stop and fix the repository before creating the release.
```

Why: removes only generic rationale that a generative AI can reconstruct from
the preserved release-check context.

## Structural Output

```markdown
## Release Checks

- Run `npm test`.
- Run `npm run build`.
- Confirm `bundle/example-skill.zip` exists.
- Confirm `skills/example-skill/SKILL.md` is included.
- Do not publish if runtime artifacts are missing.
- If any check fails, stop and fix the repository before creating the release.
```

Why: keeps the checklist and hard stop condition, but removes connective prose.

## Summary Output

```markdown
## Release Checks

Build and inspect the release archive before publishing. Preserve README install
path accuracy, required skill files, and runtime artifacts. Stop on any failed
check.
```

Why: preserves distinctive release requirements but no longer keeps exact
commands or file list fidelity.

## Round-Trip Check

After compaction, re-extract the structured inventory from the selected output.

- `conservative`: commands, artifact path, `SKILL.md` archive content, README
  install-path condition, missing-runtime prohibition, and stop condition should
  all still be recoverable.
- `structural`: the same checklist items should remain as explicit structure.
- `summary`: the exact commands may be absent, but release archive inspection,
  README install-path accuracy, required skill files, runtime artifacts, and
  stop-on-failure behavior should still be represented.

## Boundary Notes

- Extract the structured inventory before choosing what to remove.
- Adjacent near-duplicate sentences may be merged when they have the same local
  context and no behavioral distinction is lost.
- `conservative` should keep exact commands and file names.
- `structural` should keep explicit lists, criteria, and hard boundaries.
- `summary` may drop exact list fidelity, but must keep distinctive risks and
  release-blocking constraints.
