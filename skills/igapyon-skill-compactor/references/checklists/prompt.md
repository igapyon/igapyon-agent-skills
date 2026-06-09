---
title: Prompt Checklist
description: Checklist for compacting prompts, stable context, and repeated output instructions.
topics:
  - checklist
  - prompt
  - stable-context
  - output-constraints
category: reference
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
---

# Prompt Checklist

Use this checklist when compacting prompts, stable context, or repeated output
instructions around an Agent Skill workflow.

For when to apply this checklist, use [checklist-timing.md](checklist-timing.md).

## Stable Context

- [ ] Put repeated stable instructions where they can remain early and unchanged.
- [ ] Separate changing per-run inputs from stable context.
- [ ] Prefer stable files or stable prefix material over repeatedly pasted, edited prompt text.
- [ ] Keep volatile run-specific content after stable reusable context.
- [ ] Treat stable repeated prompt context as qualitatively lighter when it is expected to be cache-friendly, while avoiding precise billing claims without current product verification.
- [ ] Move repeated prompt guidance into Agent Skills or references when it belongs there.
- [ ] Remove obsolete model-specific workarounds after confirming they are no longer needed.

## Prompt Shape

- [ ] Separate runtime prompts from validation prompts.
- [ ] Put validation prompts under `tests/` when they exist to protect behavior rather than guide ordinary execution.
- [ ] Before compacting prompts that affect activation, routing, or output contracts, add or update representative prompt tests.
- [ ] Use reference-model delta definition when the generative AI is likely to understand the base model accurately and consistently, even if humans may need a short explanation.
- [ ] Include base model, inherit, override, and do-not-infer when using reference-model delta definition.
- [ ] Use bounded prompt loops only with explicit target set, per-iteration action, state record, and stop condition.
- [ ] Avoid unbounded "repeat until perfect" instructions.
- [ ] Convert vague requests into success criteria, non-goals, and output contracts.
- [ ] Keep per-run prompts focused on current inputs and decisions.
- [ ] Avoid repeating long background material already stored in a skill or reference.
- [ ] Avoid asking the model to inspect huge raw logs when a tool can extract the relevant part.

## Output Constraints

- [ ] Limit output to the sections and detail level the runtime task actually needs.
- [ ] Prefer structured output when downstream processing expects stable fields.
- [ ] Avoid repeated explanations when a terse validation summary is enough.
- [ ] Keep verbose explanation only when it is part of the user-facing value.

## Prompt Validation

- [ ] Run baseline prompt tests before risky prompt refactoring.
- [ ] Run the same prompt tests after refactoring.
- [ ] Compare activation, non-activation, behavior, reference routing, and ask-human expectations.
- [ ] Record failures or ambiguous expectations as follow-up work instead of treating shorter text as automatically better.

## Reasoning Load

- [ ] Preserve deep model judgment for ambiguous, risky, or architectural decisions.
- [ ] Move routine extraction, formatting, and verification out of deep reasoning paths.
- [ ] Split hard judgment points from mechanical steps.
- [ ] Stop iterative reasoning when another pass is unlikely to improve the result relative to extra context cost.
- [ ] Avoid reducing context so far that failure and rerun costs increase.
