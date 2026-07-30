---
name: igapyon-skill-compactor
description: Use when the user explicitly asks to use or apply `igapyon-skill-compactor`, or clearly asks to compact, slim, prune, or restructure a specific Agent Skill while preserving behavior. Do not activate for a mere name mention, existence question, explanation or design discussion, meta review/audit/debug/update of this skill, ordinary Skill creation, generic refactoring, documentation editing, repository cleanup, or broad token-efficiency discussion. Meta work about this skill uses the normal maintenance workflow unless the user explicitly asks to compact this skill itself.
---

# igapyon-skill-compactor

Compact Agent Skills for repeated runtime efficiency without silently changing
activation, behavior, safety, output, or validation contracts.

## Core Execution Contract

Follow this loop for every compaction. Do not require a reference file to carry
these steps.

1. Establish the target, optimization surface, mode, allowed loss, and writable
   scope. If the user supplied them clearly, proceed without another question.
2. Extract the source contract and a typed structured inventory.
3. Make a placement map: `keep`, `move`, `rewrite`, `delete`, `split`, or
   `no change`.
4. Change only the authorized target and preserve the selected mode's contract.
5. Re-extract the inventory from the result and compare it with the source.
6. Repair critical regressions, then report measured change and validation.

The source contract includes:

- activation and non-activation boundaries
- inputs, outputs, required order, conditions, and postconditions
- commands, paths, IDs, URLs, code/config/API examples, and concrete evidence
- prohibitions, exceptions, fallbacks, safety rules, and human confirmations
- validation steps, expected results, references, and output contracts

Treat any missing critical item as a regression unless the user explicitly
accepted that loss.

## Mode And Loss Boundary

- `conservative` is the default. Preserve all critical inventory and ambiguous
  source-specific meaning. Prefer local deduplication or moving long material
  with a direct route over deletion.
- `structural` applies only when the user wants stronger compaction while
  retaining explicit lists, steps, criteria, and operational structure.
- `summary` applies only when the user requests summary-like compression or
  accepts lower reconstruction fidelity. Never weaken activation, safety,
  required validation, or output contracts silently.
- `no change` is valid when the target is already compact or when added
  references and maintenance cost would outweigh the reduction.

Read [references/agent-skill/compaction-modes.md](references/agent-skill/compaction-modes.md)
only when detailed inventory treatment, code/example preservation, round-trip
criteria, representation selection, or mode ambiguity matters. Do not read it
for a small local conservative edit when the core contract above is sufficient.

## Measurement And Acceptance

Choose the optimization surface before editing:

- always-loaded `SKILL.md`
- Skill-local context normally read per invocation
- total Skill directory
- end-to-end input, cached input, output, reasoning, and rerun cost

Record before/after UTF-8 bytes, line count, always-loaded files, and added or
removed references. Record token counts only with the model/runtime/tokenizer
used. Also report preserved critical inventory, accepted loss, added lookup
steps, and new normal-path reference reads.

Do not use a fixed reduction percentage as the only success criterion. Prefer
`no change` when the likely repeated benefit does not justify the change.

## Placement And Human Decisions

Keep activation, the core loop, and critical safeguards in `SKILL.md`. Move
conditional detail, long examples, checklists, tests, and background to a
directly routed resource.

Ask the human before:

- changing architecture, workflow intent, or an activation/output contract
- splitting the Skill or introducing scripts, tools, or MCP
- commonizing text whose meaning differs by context
- deleting critical or source-specific material

Proceed without another question for safe, local, conservative compaction when
the target, scope, and behavior-preservation goal are already clear.

## Conditional References

When a condition below matches, read the named reference before deciding or
answering. Resolve every relative reference against the directory containing
this loaded `SKILL.md`, never against the target workspace or current working
directory. Do not substitute memory or the core loop for that required read.
Use a known direct route without reading `index.json`. Use
[index.json](index.json) only to discover an unknown Markdown or JSON resource;
it is not a complete Skill file inventory or a task-to-resource router. Reach
the runner and case files through `tests/INDEX.md`, and reach agent metadata
directly through `agents/openai.yaml` when maintaining integration metadata.

- [references/agent-skill/compaction-workflow.md](references/agent-skill/compaction-workflow.md):
  read for substantial edits, architecture, splitting, toolization, MCP, or
  behavior-risking placement decisions; do not read for small local edits.
- [references/system/design-philosophy.md](references/system/design-philosophy.md):
  read only for ambiguous system boundaries or architectural tradeoffs.
- [references/system/checklist-selection.md](references/system/checklist-selection.md):
  read only when a checklist is actually needed; it selects the smallest one.
- [references/system/token-efficiency-techniques.md](references/system/token-efficiency-techniques.md):
  read only when choosing advanced system-level techniques, not as a checklist
  entry point and not for routine compaction.
- [references/checklists/checklist-timing.md](references/checklists/checklist-timing.md):
  read only when applying or maintaining checklists.
- [references/agent-skill/distilled-materials.md](references/agent-skill/distilled-materials.md):
  read before creating or updating `distilled/` material.
- [distilled/token-efficiency-design-essence.md](distilled/token-efficiency-design-essence.md):
  read only when the distilled design philosophy is needed.
- [references/agent-skill/frontmatter-templates.md](references/agent-skill/frontmatter-templates.md):
  read only when adding index-friendly Markdown front matter.
- [tests/INDEX.md](tests/INDEX.md): read only when validating this Skill.

## Editing Rules

- Preserve behavior before reducing tokens; move meaning instead of erasing it.
- Prefer deleting generic explanation over task-specific rules.
- Do not turn one coherent Skill into many tiny overlapping Skills.
- Toolize only deterministic repeated work; use MCP only for external/shared
  access that justifies it.
- Do not add auxiliary documentation unless the user explicitly needs it.
- Do not rewrite the target into a different workflow without authorization.

## Result

Report only:

- mode and treatment, including `no change` when selected
- before/after measurements for the chosen optimization surface
- critical contracts preserved and any explicitly accepted loss
- material moved, rewritten, or deleted
- validation performed and remaining risk

Include system decisions or checklist highlights only when they actually
affected the work.
