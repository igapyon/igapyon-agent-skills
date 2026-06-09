---
title: Workflow Checklist
description: Checklist for the outer runtime token-efficiency workflow before editing individual skills or prompts.
topics:
  - checklist
  - workflow
  - runtime-token-efficiency
category: reference
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
---

# Workflow Checklist

Use this checklist for the outer runtime token-efficiency workflow before
editing individual Agent Skills or prompts.

For when to apply this checklist, use [checklist-timing.md](checklist-timing.md).

## Human Discussion

- [ ] Confirm what repeated runtime task is being optimized.
- [ ] Narrow broad requests from "everything" to the smallest useful purpose, viewpoint, decision, or output shape.
- [ ] Confirm who or what invokes the workflow.
- [ ] Confirm what output must stay stable.
- [ ] Confirm which failures are costly.
- [ ] Decide whether this is still R&D or already stable runtime use.
- [ ] Ask the human about unclear system boundaries before editing.

## System Inventory

- [ ] Follow the search and reading ladder: grep/rg-friendly text, generated `index.json`, `distilled/`, then full references or original sources.
- [ ] List Agent Skills involved.
- [ ] List prompts, templates, examples, and repeated instructions.
- [ ] Identify near-duplicate paragraphs, warnings, examples, output formats, and checklist timing rules.
- [ ] Check whether any Markdown file has grown large enough that line count itself is a warning signal for splitting, distillation, indexing, archiving, or toolization.
- [ ] Check whether Markdown uses `##` and `###` headings to expose a clear hierarchy instead of long undifferentiated prose.
- [ ] Check whether conditions, constraints, steps, options, examples, and checks are represented as clear bullet lists where that improves parsing.
- [ ] Avoid replacing necessary rationale with context-free bullets, overly long flat lists, or deep nesting.
- [ ] Check whether purpose, constraints, assumptions, procedures, examples, exceptions, and validation are separated by viewpoint instead of woven into dense paragraphs.
- [ ] Keep nuanced background or rationale as short prose, then expose actionable runtime items with headings or bullets.
- [ ] Define meaning-preserving local aliases for repeated long terms, paths, concepts, or targets.
- [ ] Use local aliases only when repeated-use savings greatly outweigh definition, lookup, and confusion cost.
- [ ] Avoid opaque symbolic aliases such as `A`, `B`, `甲`, or `乙` when a short meaningful alias would reduce confusion.
- [ ] Check whether a stable reference model plus delta can replace a full explanation.
- [ ] Use reference-model delta definition only when the generative AI is likely to understand the base model accurately and consistently.
- [ ] Check whether stable formats or examples should move to `templates/` or `examples/`.
- [ ] List CLI commands, scripts, tools, MCP servers, and external services.
- [ ] Check whether scripts, CLI, MCP, or tool calls return more data than the agent needs.
- [ ] Use generated `index.json` files when available to choose files before reading them in full.
- [ ] Check whether file names, headings, front matter, and summaries use stable terms that are easy to find with `rg`.
- [ ] Check whether file names express topic, purpose, and use case clearly enough to support selection from file lists or generated indexes.
- [ ] When files have an intended order, use zero-padded order markers such as `001-` or `topic-001-purpose.md` while keeping meaningful routing words.
- [ ] Check whether filesystem lexical sort order matches the intended human and agent navigation order.
- [ ] For prompt and runtime reference files, prefer meaningful English file names unless repository convention, source material, or human workflow favors Japanese.
- [ ] Check whether heading levels are consistent enough for agents to jump to the right section without reading the whole file.
- [ ] Check whether a concise project/repository README would reduce repeated discovery work.
- [ ] Keep README as an entry map and move detailed explanations to `docs/`.
- [ ] Check `distilled/` before reading large original source materials.
- [ ] Check whether Markdown front matter would improve generated `index.json` routing.
- [ ] Use `references/agent-skill/frontmatter-templates.md` when creating front matter for references or distilled files.
- [ ] Check whether representative prompt tests should live under top-level `tests/` instead of `SKILL.md`, `references/`, or `examples/`.
- [ ] Before risky prompt or Agent Skill refactoring, create or update compact representative prompt tests.
- [ ] Run a baseline prompt-test pass before compaction when activation, routing, or output contracts may change.
- [ ] Separate changing per-run inputs from stable context.
- [ ] Identify which purpose, constraints, decision criteria, prohibitions, output format, and assumptions must not be removed.
- [ ] Identify required outputs versus explanatory noise.
- [ ] Check whether output can be short, bullet-only, code-only, diff-only, table-free, or validation-summary-only without losing required evidence.
- [ ] Identify steps that require deep model judgment versus routine execution.

## Placement Decisions

- [ ] Keep user judgment or policy preference in human procedure when it should not be automated.
- [ ] Separate broad system workflow references from concrete Agent Skill maintenance references when both exist.
- [ ] Split independent trigger intents, audiences, domains, workflows, or output contracts into separate skills.
- [ ] Split repeated checklists by viewpoint and place them under `references/checklists/`.
- [ ] Commonize near-duplicate text into the smallest shared reference, checklist, template, example, distilled file, or script that preserves meaning.
- [ ] Do not commonize identical wording when activation contract, audience, timing, safety constraint, validation duty, output contract, or repository boundary gives it different meaning.
- [ ] When commonizing, preserve local deltas for behavior that must remain different.
- [ ] When using reference-model delta definition, state base model, inherit, override, and do-not-infer.
- [ ] Add a human-facing explanation of the base model when humans may not understand it.
- [ ] Avoid reference-model delta definition when the base model is ambiguous, version-sensitive, disputed, unreliable for the model, or risky to inherit incorrectly.
- [ ] Create `distilled/` Markdown when large source materials are repeatedly consulted but only curated meaning is needed at runtime.
- [ ] Prefer top-level `distilled/` when distilled material is a first-class runtime entry point.
- [ ] Use `references/distilled/` only when a small or legacy skill is clearer with local placement.
- [ ] When typical topics emerge, ask the human whether to create topic-specific distilled Markdown.
- [ ] Ask the human for the distillation viewpoint when it is not obvious.
- [ ] Define how distilled files are refreshed when source materials or decisions change.
- [ ] Move deterministic repeated operations to scripts.
- [ ] Generate or refresh directory `index.json` with `miku-indexgen` when file discovery itself is repeated or costly.
- [ ] Prefer generated index formats where each file entry is grep/rg-friendly, ideally one file per line; use `miku-indexgen` `index.json` as the nearby example.
- [ ] For true record lists, consider JSONL instead of JSON arrays to support one-record-per-line search and partial reading.
- [ ] Add concise `miku-indexgen`-friendly Markdown front matter when it helps file selection.
- [ ] Use CLI/tools for search, extraction, build, test, aggregation, and log filtering.
- [ ] Use MCP for external services, shared data, repository state, or repeatable integration.
- [ ] When tool results are large, filter before accepting them into context whenever the workflow allows it.
- [ ] Ask whether the script, CLI, MCP server, or tool provider can add output-limiting options such as `--limit`, `--fields`, `--format`, `--summary`, pagination, or server-side filtering.
- [ ] Encode stable formats, required sections, verbosity limits, and validation summaries as output constraints.
- [ ] Use `templates/` for reusable output skeletons and `examples/` for representative completed examples.
- [ ] Use top-level `tests/` for activation, non-activation, behavior, and reference-routing prompts that are validation assets rather than runtime examples.
- [ ] Consider JSONL for prompt/expected test records when line-oriented search and partial execution matter.
- [ ] Keep prompt tests separate from runtime prompts so validation cases do not inflate always-loaded context.
- [ ] Use a human-facing README only when it reduces repeated orientation or preserves background that should not live in runtime instructions.
- [ ] Use README as an entry map for repositories or larger projects, but avoid duplicating maintained details.
- [ ] Put long design notes, operations, and detailed references under `docs/` with searchable names and headings.
- [ ] Move obsolete, superseded, or historical materials to `archive/` when they should be retained but kept out of the normal reading path.
- [ ] Mark archived files clearly, for example with `status: archived` or `status: deprecated` front matter when useful.
- [ ] Do not use `archive/` for unresolved current work.
- [ ] Preserve safeguards even when they look verbose.
- [ ] Do not rely on automatic compact/summarization as the primary architecture when better placement, filtering, or distillation is possible.

## Bounded Loops

- [ ] Use prompt loops only when there is an explicit target set and a bounded stop condition.
- [ ] Define maximum passes or a concrete stop condition before starting a loop.
- [ ] In each loop pass, read only the smallest useful context.
- [ ] Keep a short state record of checked, changed, skipped, or blocked items.
- [ ] Stop when complete, human input is needed, no new useful change appears, the same blocker repeats, or the pass limit is reached.
- [ ] Do not continue a loop when extra context cost is unlikely to improve the result.

## State Checkpoints

- [ ] Use `TODO.md` or another short state checkpoint file for multi-pass or multi-turn work.
- [ ] Record only current unfinished tasks, completion conditions, blockers, decisions needed, next action, and last material update.
- [ ] Remove or archive stale completed items.
- [ ] Do not use `TODO.md` as a general notes dump or long history.
- [ ] Prefer reading the state checkpoint over reconstructing state from long conversation history.
- [ ] For session switches, prepare a short handoff with purpose, decisions, constraints, unresolved points, next action, and files or materials to inspect.
- [ ] Do not carry a whole previous conversation into a new session unless the full transcript is genuinely the source material.

## Runtime Cost Boundaries

- [ ] Check where repeated input context can be reduced.
- [ ] Check where output length can be constrained.
- [ ] Check where tool-result volume can be constrained before it reaches the agent.
- [ ] Check where stable input can remain early and unchanged.
- [ ] Check whether stable reusable context is split into appropriately sized cache-friendly files.
- [ ] Report cache-friendly stable context as "lighter" only as an expected runtime-efficiency benefit, not a guaranteed billing result.
- [ ] Verify that cache-friendly files avoid unnecessary churn, mixed volatile notes, and unrelated concerns.
- [ ] Keep volatile per-run notes separate from stable references.
- [ ] Treat language conversion as something to measure, not an assumed token-saving rule.
- [ ] Check where reasoning depth is genuinely needed.
- [ ] Avoid reducing context so far that failure and rerun costs increase.

## Workflow Validation

- [ ] Compare before/after behavior against representative runtime requests.
- [ ] Run the same prompt tests after compaction and compare results with the baseline.
- [ ] Record ambiguous prompt-test expectations, failures, or behavior changes instead of hiding them in a summary.
- [ ] Report expected changes to repeated runtime input, output, and always-loaded context.
- [ ] Report whether the treatment was compaction, split, toolization, MCP, output constraints, or no change.
- [ ] Report unresolved boundary risks.
- [ ] Record newly discovered reusable token-efficiency patterns in the smallest appropriate shared place.
