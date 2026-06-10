---
title: Compaction Modes
description: Defines conservative, structural, and summary compaction modes for Agent Skill maintenance.
topics:
  - compaction-modes
  - agent-skills
  - behavior-preservation
  - token-efficiency
category: reference
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-10
updated: 2026-06-10
sources:
  - type: human-input
    label: user-defined compaction mode policy for igapyon-skill-compactor
    role: primary
    checked: 2026-06-10
---

# Compaction Modes

Use these modes when compacting Agent Skills or skill-adjacent runtime
instructions. If the user does not specify a mode, use `conservative`.

## Mode Summary

- `conservative`: minimize information loss; omit only material a generative
  AI can reliably reconstruct from common knowledge.
- `structural`: preserve lists, conditions, steps, prohibitions, criteria, and
  other explicit structures; remove connective prose and obvious in-between
  explanation that a generative AI can reasonably fill.
- `summary`: compress by summary; preserve the target's distinctive traits,
  activation boundaries, risks, and unique judgment rules, but do not aim for
  full reconstruction.

For a small before/after example of all three modes, read
[../../examples/compaction-modes-example.md](../../examples/compaction-modes-example.md).

## Structured Inventory Rule

For Agent Skills, prompts, workflows, repository procedures, writing guidance,
review criteria, and other structured knowledge, extract an inventory before
compacting. Incomplete inventories reduce reproducibility.

Inventory extraction is not limited to existing Markdown lists. Also extract
embedded list items from prose, then consolidate them with nearby explicit
lists into one typed inventory. Commands, paths, source code examples,
conditions, prohibitions, exceptions, fallback behavior, validation steps,
generated artifacts, tone rules, review criteria, examples, and decision
boundaries often appear inside sentences or code fences; losing those embedded
items is still information loss.

Inventory candidates include:

- activation and non-activation triggers
- inputs, outputs, preconditions, and postconditions
- required steps, optional steps, and fallback steps
- commands, file paths, source code examples, tool names, runtime artifacts,
  and generated artifacts
- roles, audiences, tone rules, style constraints, and writing boundaries
- review criteria, checklist items, scoring axes, and severity rules
- lists, tables, matrices, option sets, and checklists
- prohibitions, exceptions, thresholds, warnings, and human-confirmation points
- validation commands, expected results, and known risks
- reference-routing rules and required examples

Choose the inventory representation independently from compaction mode. The
mode controls how much information to preserve; the representation controls how
the preserved structure is expressed.

Use the representation that preserves the source structure with the least
ambiguity and reasonable token cost:

- unordered lists for independent items such as constraints, prohibitions,
  files, references, tone rules, and review criteria
- ordered lists for steps, priority order, fallback order, and check sequence
- tables for comparisons, option sets, matrices, and repeated attributes
- Mermaid diagrams for branching flows, state transitions, dependencies,
  reference routing, complex fallback paths, and decision logic that would be
  longer or less clear as bullets
- short prose for surrounding context that is not itself structural

Mermaid is not tied to `conservative`, `structural`, or `summary`. Use it in
any mode when the source relationship is better represented as a diagram than
as bullets, a table, or prose. Do not use Mermaid when it adds tokens without
making ordering, branching, dependency, or state meaning clearer.

Apply the inventory by mode:

- `conservative`: preserve the inventory items unless they are clearly generic
  and reconstructable from nearby context.
- `structural`: treat the inventory as the main output; remove prose around it
  before removing any item.
- `summary`: use the inventory as the selection input, assign importance, keep
  representative high-value items, then write the summary.

Do not summarize structured material directly from prose when an inventory can
be extracted first.

If an apparent list is split between bullets and prose, merge both sources into
one inventory before deciding what to preserve, restructure, or summarize.

## Source Code Example Rule

Treat source code examples, code fences, command examples, configuration
snippets, JSON/XML/YAML examples, and API call samples as structured inventory,
not as ordinary explanatory prose.

In `conservative` mode:

- do not delete a source code example just because it is long
- do not replace a source code example with prose such as "the code does X"
  unless the user explicitly accepts that loss
- preserve exact code examples when they define syntax, API shape, file format,
  invocation order, expected output, edge cases, or behavior boundaries
- when a long code example should not remain in `SKILL.md`, move it to
  `examples/`, `templates/`, `references/`, or `assets/` and leave a clear
  routing instruction instead of summarizing it away
- if only part of a code example is reusable boilerplate, preserve the
  behavior-bearing lines and state what was intentionally omitted

In `structural` mode, code examples may be shortened only when the retained
snippet still preserves the syntax, API shape, and behavior boundary being
taught.

In `summary` mode, code examples may be summarized only when exact code fidelity
is not required for the user's requested output. If exact code is needed for
reconstruction, keep a minimal representative snippet or route to the full
example.

## Round-Trip Check Rule

When compaction may affect reproducibility, validate the result by
extracting an inventory from the compacted output and comparing it with the
source inventory.

Expected comparison by mode:

- `conservative`: source inventory and compacted-output inventory should
  substantially match. Any missing command, path, prohibition, validation step,
  activation boundary, output contract, tone rule, review criterion, or hard
  condition is a regression unless the user explicitly accepted that loss.
- `structural`: all explicit structural items should remain present, though
  surrounding prose may be gone.
- `summary`: critical and high-importance inventory items should remain
  represented. Supporting details may be omitted, but the summary must not hide
  a lost critical fact.

If the round-trip comparison exposes a missing or weakened critical item,
revise the compaction before reporting success.

## Conservative Mode

Use `conservative` as the default.

Conservative mode is not summary mode. Do not compress by replacing concrete
material with a general description. The expected result is a lower-token
version that preserves source-specific facts, examples, code, conditions, and
behavior contracts. Rewording, local deduplication, moving long material with
clear routing, and deleting generic explanation are allowed; information loss is
not.

Preserve:

- activation triggers and non-triggers
- structured inventory items from the Structured Inventory Rule
- safety, refusal, repository, and domain constraints
- output contracts, required sections, and validation surfaces
- lists, enumerations, option sets, required files, command shapes, and
  reference-routing rules
- uncommon domain facts, local conventions, and project-specific vocabulary
- examples when they carry behavior, tone, boundary, or quality information
- source code examples and code fences unless they are explicitly non-normative
  and safely reconstructable, or are moved with a clear reference route

May omit:

- generic explanation that a generative AI can reproduce with high reliability
- redundant connective prose that does not affect decisions
- adjacent near-duplicate sentences when they share the same local context and
  no trigger, safety, validation, output, audience, timing, or repository
  distinction is lost
- ordinary Markdown, filesystem, or Agent Skill conventions already clear from
  surrounding structure

If unsure whether omission is safe, preserve the material or move it to a
reference instead of deleting it.

## Structural Mode

Use `structural` when the user wants stronger compaction while keeping the
operational skeleton reliable.

Preserve:

- structured inventory items from the Structured Inventory Rule
- lists, tables, ordered steps, matrices, option sets, and required checklists
- all explicit criteria, thresholds, exceptions, warnings, and hard boundaries
- names of files, directories, tools, commands, references, and generated
  artifacts

May omit:

- prose between list items
- explanatory paragraphs that only restate the visible structure
- general rationale that can be reconstructed from the preserved headings and
  bullets

Do not flatten a structured list into vague prose. The structure is the payload.

## Summary Mode

Use `summary` only when the user explicitly wants a summary-like compact form
or accepts lower reconstruction fidelity.

Preserve:

- the target skill's distinctive purpose and behavior
- the high-importance structured inventory items needed to preserve distinctive
  behavior
- activation and non-activation boundaries
- safety-critical and behavior-critical constraints
- unusual local rules that would not be recovered from common knowledge
- the main workflow shape and validation expectations

May omit:

- most examples
- repeated rationale
- detailed operational variants
- secondary references that are not needed to understand the target's
  distinctive behavior

Do not summarize so far that the target becomes generic. If the distinctive
behavior cannot be preserved at the requested size, report that limit.

## Mode Selection Rules

- If the user says only "compact", "shorten", "slim", or similar, choose
  `conservative`.
- If the user asks to preserve lists, steps, options, or exact structure while
  removing prose, choose `structural`.
- If the user asks for a digest, overview, outline, very small version, or
  accepts feature-level compression, choose `summary`.
- If the user asks for data loss, deletion, or aggressive reduction without
  naming what may be lost, ask for confirmation or propose `summary` with a
  visible loss boundary.
- Never allow any mode to silently weaken activation, safety, output contracts,
  or required validation.

## Validation Examples

Use the representative mode cases in
[../../tests/behavior-prompts.jsonl](../../tests/behavior-prompts.jsonl) when
checking whether default and explicit mode selection still behave as intended.
