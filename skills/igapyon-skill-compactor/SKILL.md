---
name: igapyon-skill-compactor
description: Use only when the user explicitly names `igapyon-skill-compactor`, explicitly asks to compact or slim down an Agent Skill, or asks to reduce token bloat in a specific Skill while preserving behavior. Do not use for ordinary skill creation, generic refactoring, proofreading, repository cleanup, documentation editing, or broad token-efficiency discussion unless the user clearly asks to compact an Agent Skill.
---

# igapyon-skill-compactor

## Overview

Use this skill to compact oversized Agent Skills or skill-adjacent workflows for
runtime token efficiency while preserving trigger intent, behavior, validation
surface, and progressive disclosure. It is not a generic editor.

## Reference Navigation

Use [index.json](index.json) as the generated file inventory for this skill
before reading multiple reference files. Refresh it with `miku-indexgen`; do
not edit it by hand.

Read only what the task needs:

- [references/system/design-philosophy.md](references/system/design-philosophy.md):
  ambiguous, risky, architectural, split/tool/MCP decisions.
- [references/agent-skill/compaction-workflow.md](references/agent-skill/compaction-workflow.md):
  substantial edits, split/toolization decisions, or behavior-risking removals.
- [references/system/token-efficiency-techniques.md](references/system/token-efficiency-techniques.md):
  choose the smallest checklist before implementation and summarize highlights
  after implementation.
- [references/checklists/checklist-timing.md](references/checklists/checklist-timing.md):
  checklist timing or new checklist maintenance.
- [references/agent-skill/compaction-modes.md](references/agent-skill/compaction-modes.md):
  choose or explain `conservative`, `structural`, or `summary` mode.
- [references/agent-skill/distilled-materials.md](references/agent-skill/distilled-materials.md):
  creating or updating `distilled/` Markdown.
- [distilled/token-efficiency-design-essence.md](distilled/token-efficiency-design-essence.md):
  runtime token-efficiency philosophy without reading source articles.
- [references/agent-skill/frontmatter-templates.md](references/agent-skill/frontmatter-templates.md):
  `miku-indexgen`-friendly Markdown front matter.
- [tests/INDEX.md](tests/INDEX.md): validating trigger behavior, reference
  routing, or output contracts.

## Activation Gate

Use this skill only when the user explicitly asks for:

- `igapyon-skill-compactor`
- compacting, slimming, pruning, or restructuring an Agent Skill
- reducing token bloat in a specific `SKILL.md` or skill directory
- moving oversized skill instructions into references, scripts, or assets

Do not activate this skill for generic requests such as "make this better",
"review this skill", "create a skill", "optimize this repo", "reduce tokens",
or "clean up documentation" unless the user clearly says the target is an
Agent Skill and the requested action is compaction.

If the user only asks whether such a skill exists, mention this skill as an
available option, but do not apply it until the user asks to use it.

When asking the human to specify a target skill path, prefer repository-local
examples such as
`/Users/UserName/Documents/git/igapyon-agent-skills/skills/igapyon-xxx/` or
`/Users/UserName/Documents/git/igapyon-agent-skills/skills/igapyon-xxx/SKILL.md`
over installed-skill paths, unless the installed copy is explicitly the target.

## Compacting Workflow

1. Frame the repeated runtime task with the human when boundaries are unclear.
2. Read the target `SKILL.md` or skill directory, then map triggers,
   non-triggers, behavior, output style, references, validation, safeguards,
   and separable responsibilities.
3. Inventory stable context, changing inputs, required outputs, examples,
   templates, scripts, tools, MCP, tests, and judgment-heavy steps.
4. Decide placement before editing: keep in `SKILL.md`, move to references,
   distilled, templates, examples, tests, scripts, assets, MCP/tooling, output
   constraints, human procedure, split skill, or delete.
5. Default to `conservative` mode unless the user specifies another mode.
6. Add or update representative prompt tests before risky trigger, routing,
   output-contract, commonization, or human-judgment changes; run a baseline
   when feasible.
7. Rewrite for progressive disclosure while preserving behavior and avoiding
   accidental overlap or double-triggering.
8. Validate reference reachability, representative prompts or available
   validators, and expected repeated runtime context reduction.

## Compaction Rules

- Compaction is runtime token-efficiency design, not mere shortening.
- Preserve behavior before reducing tokens; move meaning instead of erasing it.
- Keep activation gates, core workflow, and critical constraints in `SKILL.md`.
- Move detailed guidance, long examples, checklists, and tests out of
  always-loaded context with clear "when to read" routes.
- Prefer deleting generic explanation over deleting task-specific rules.
- Discuss unclear boundaries, risky commonization, splitting, deletion, or
  workflow changes with the human before editing.
- Split only when independent jobs have distinct trigger intent, audience,
  domain, workflow, or output contract.
- Toolize or use MCP only when deterministic or external work justifies it.
- In `conservative` mode, do not summarize away source code examples, code
  fences, configuration snippets, or API examples; preserve them or move them
  with a clear reference route unless the user explicitly accepts that loss.
- Keep frontmatter `description` precise because it controls activation.
- Do not add README, changelog, install guide, or auxiliary documentation unless
  the user explicitly requires human-facing maintenance context.
- Do not rewrite a skill into a different workflow unless the user asks.

## Output

When editing a skill, summarize:

- system-level decisions made with the human
- treatment used: compaction, splitting, toolization, MCP, output constraints,
  or no change
- pre-work and post-work checklist highlights
- how repeated runtime input/output/context load is expected to change
- what stayed in `SKILL.md`
- what moved to references, scripts, or assets
- what was deleted and why
- prompt-test baseline and post-change validation performed
- remaining risks or follow-up checks
