---
title: Agent Skill Checklist
description: Checklist for compacting or splitting individual Agent Skills.
topics:
  - checklist
  - agent-skills
  - trigger-behavior
  - progressive-disclosure
category: reference
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
---

# Agent Skill Checklist

Use this checklist when compacting or splitting individual Agent Skills.

For when to apply this checklist, use [checklist-timing.md](checklist-timing.md).

## Activation Contract

- [ ] Keep frontmatter `description` precise because it controls activation.
- [ ] Preserve hard-trigger skills as hard-trigger skills.
- [ ] Preserve broad-trigger skills only when broad activation is intentional.
- [ ] Avoid making descriptions so broad that skills activate for generic tasks.
- [ ] Avoid making descriptions so narrow that the user must repeatedly restate obvious intended use.
- [ ] Check that split skills do not overlap and double-trigger unintentionally.

## `SKILL.md` Placement

- [ ] Keep `SKILL.md` as a concise router, activation contract, and core workflow.
- [ ] Treat a rapidly growing `SKILL.md` line count as a warning signal and inspect whether sections should move to references, distilled files, templates, examples, scripts, assets, or tools.
- [ ] Keep activation gate, core workflow, and critical constraints in `SKILL.md`.
- [ ] Leave detail in `SKILL.md` when it is required every time the skill activates.
- [ ] Preserve safeguards that prevent unsafe or behavior-changing compaction.
- [ ] Do not compact merely because text is long.

## References

- [ ] Follow the search and reading ladder: grep/rg-friendly text, generated `index.json`, `distilled/`, then full references or original sources.
- [ ] Put broad workflow and token-efficiency design references under `references/system/` when they are not Agent Skill-specific.
- [ ] Put concrete Agent Skill maintenance workflows under `references/agent-skill/`.
- [ ] Use generated `index.json` as a file inventory before reading many reference files.
- [ ] Treat very large Markdown reference files as a warning signal and check whether they should be split by viewpoint, distilled, indexed, archived, or converted to line-oriented records.
- [ ] Reference `index.json` from `SKILL.md` when the skill has multiple references or assets.
- [ ] Refresh generated `index.json` with `miku-indexgen`; do not edit it by hand.
- [ ] Prefer grep/rg-friendly generated indexes where each file entry is easy to inspect as a single line; use `miku-indexgen` `index.json` as the nearby example.
- [ ] For generated or maintained record lists, consider JSONL when line-oriented search and partial reading matter.
- [ ] Add concise Markdown front matter to references when it improves generated index summaries or routing.
- [ ] Keep front matter concise enough for routing; do not turn metadata into a second body.
- [ ] Use grep/rg-friendly file names, headings, and literal task terms in references and distilled files.
- [ ] Use file names that express content, purpose, and use case; avoid vague names like `notes.md`, `misc.md`, or generic `prompt.md` when a specific name would route better.
- [ ] When reference or prompt files have a sequence, use zero-padded order markers such as `001-` or `topic-001-purpose.md`; do not rely on numbering without meaningful words.
- [ ] Check that filesystem lexical sort order gives the intended navigation order for both humans and agents.
- [ ] Prefer meaningful English file names for Agent Skill prompts and runtime references unless Japanese better matches the repository convention, source material, or human workflow.
- [ ] Use `##` and `###` headings to create a clear hierarchy so agents can jump to relevant sections instead of reading long undifferentiated prose.
- [ ] Use bullet lists for conditions, constraints, steps, options, examples, and checks when they make item boundaries clearer.
- [ ] Keep thesis, rationale, and caveats in short prose when bullets would lose intent or causality.
- [ ] Separate purpose, constraints, assumptions, procedures, examples, exceptions, and validation by viewpoint when references are meant for runtime use.
- [ ] Preserve nuanced prose only where it carries meaning that would be lost as separate checklist items.
- [ ] Use meaning-preserving local aliases for repeated long terms, paths, concepts, or targets.
- [ ] Skip local aliases for one-off mentions, already short terms, or cases where lookup cost would exceed saved tokens.
- [ ] Avoid opaque aliases like `A`, `B`, `甲`, or `乙` unless the context is short and unambiguous.
- [ ] Check `distilled/` before reading large source materials when distilled files may already answer the task.
- [ ] Use `references/agent-skill/frontmatter-templates.md` when adding or reviewing Markdown front matter.
- [ ] Use `distilled/` for curated Markdown distilled from larger source materials.
- [ ] Prefer top-level `distilled/` when distilled material is a first-class runtime entry point.
- [ ] Use `references/distilled/` only when local placement is clearer for a small or legacy skill.
- [ ] Link distilled files with clear source, purpose, and refresh expectations.
- [ ] For distilled Markdown front matter, include `description`, `updated`, and `sources`.
- [ ] Move detailed guidance from always-loaded `SKILL.md` to conditional references.
- [ ] Keep stable references stable; avoid cosmetic churn that may reduce cache-friendliness.
- [ ] Split stable reusable guidance into coherent, appropriately sized files when repeated use may benefit from cache-friendly handling.
- [ ] Treat cache-friendly stable references as qualitatively lighter only as an expected runtime-efficiency benefit, not a guaranteed billing result.
- [ ] Keep volatile notes out of stable references.
- [ ] Move long examples to references.
- [ ] Move long checklists to references.
- [ ] Commonize near-duplicate text instead of maintaining multiple similar copies.
- [ ] Do not commonize identical text when it has different meaning in different trigger, safety, validation, output, audience, timing, or repository contexts.
- [ ] Preserve local deltas when shared wording only partially overlaps.
- [ ] Put multiple viewpoint-specific checklists under `references/checklists/`.
- [ ] Add a checklist index when there is more than one checklist.
- [ ] Add clear "when to read" rules for every reference.
- [ ] Avoid duplicating the same rule in `SKILL.md` and references.
- [ ] Avoid deep reference chains; link references directly from `SKILL.md`.
- [ ] Avoid Agent Skill-local README files unless the user explicitly requires them; prefer `SKILL.md`, `index.json`, and organized resources.
- [ ] If an Agent Skill-local README is explicitly useful, keep it human-facing and avoid copying its background prose into `SKILL.md`.
- [ ] Move retained but obsolete skill materials to `archive/` rather than leaving them in normal reference paths.

## Templates And Examples

- [ ] Move reusable output skeletons to `templates/`.
- [ ] Move representative completed samples to `examples/`.
- [ ] Use `templates/` for output structure and `examples/` for quality, tone, granularity, and boundaries.
- [ ] Keep `SKILL.md` focused on when to use a template or example, not the full content.
- [ ] Avoid adding examples that are not likely to be reused.

## Tests

- [ ] Put activation, non-activation, behavior, and reference-routing prompts under top-level `tests/` when they are validation assets.
- [ ] Keep test prompts out of `SKILL.md` unless a tiny example is required to explain the runtime contract.
- [ ] Consider JSONL for prompt/expected test records so each case is searchable and independently runnable.
- [ ] Use `examples/` for runtime quality examples, and `tests/` for validation expectations.
- [ ] Add or update prompt tests before compaction when activation gates, routing, output contracts, commonized text, or human-judgment behavior may regress.
- [ ] Run prompt tests before and after risky refactoring so behavior preservation is checked, not assumed.
- [ ] Keep ambiguous expected results explicit and ask the human when the correct expectation cannot be derived from the skill contract.

## Assets, Scripts, And Retrieval

- [ ] Use `assets/` for output resources that should be used or copied without being read as reference prose.
- [ ] Classify the skill as content-only, execution-oriented, or hybrid before adding scripts, CLI, or MCP.
- [ ] Do not add scripts, CLI, or MCP to a content-only skill unless a deterministic repeated operation justifies it.
- [ ] Prefer file-native organization before introducing RAG or database-backed retrieval for Agent Skill-scale material.

## Splitting

- [ ] Split one oversized skill when it contains independent trigger intents or output contracts.
- [ ] Keep shared rules only where each resulting skill actually needs them.
- [ ] Leave a coherent skill unsplit when separate skills would create more activation ambiguity.
- [ ] Do not create many tiny skills when one coherent activation contract is enough.

## Skill Validation

- [ ] Confirm required references are reachable.
- [ ] Run available skill validators.
- [ ] Compare before/after behavior against representative prompts.
- [ ] Summarize prompt-test pass/fail results, ambiguous expectations, and remaining behavior risks.
- [ ] For multi-turn skill maintenance, update a short `TODO.md` or state checkpoint if one is being used.
- [ ] Add reusable token-efficiency findings from the maintenance session to techniques, checklists, templates, examples, tests, or distilled files.
- [ ] Report any behavior intentionally changed or left risky.
