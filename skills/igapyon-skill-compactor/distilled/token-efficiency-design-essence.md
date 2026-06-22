---
title: Token Efficiency Design Essence
description: Distilled runtime token-efficiency principles from source articles for igapyon-skill-compactor.
topics:
  - distilled
  - runtime-token-efficiency
  - context-debt
  - meaning-placement
  - agent-skills
category: reference
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
sources:
  - type: local-file
    path: ../mikuku-articles/2026/06/20260607/20260607-general-token-efficiency.md
    role: primary
    checked: 2026-06-09
  - type: local-file
    path: ../mikuku-articles/2026/05/20260531/20260531-token-consumption-02-reduction.md
    role: supporting
    checked: 2026-06-09
  - type: local-file
    path: ../mikuku-articles/2026/05/20260531/20260531-token-consumption-03-agent-skills-reduction.md
    role: primary
    checked: 2026-06-09
  - type: human-input
    label: user-approved viewpoint: distill the article into reusable runtime token-efficiency design essence for igapyon-skill-compactor
    role: primary
    checked: 2026-06-09
---

# Token Efficiency Design Essence

## Source Material

- `../mikuku-articles/2026/06/20260607/20260607-general-token-efficiency.md`
- `../mikuku-articles/2026/05/20260531/20260531-token-consumption-02-reduction.md`
- `../mikuku-articles/2026/05/20260531/20260531-token-consumption-03-agent-skills-reduction.md`

## Distillation Viewpoint

Distill the article into reusable runtime token-efficiency design essence for
`igapyon-skill-compactor`.

The focus is not article style or publication wording. The focus is the design
judgment an agent should use when compacting Agent Skills and adjacent
workflows.

## Intended Runtime Use

Read this distilled file when the original article's philosophy is needed but
the full article would be too large or too narrative for the task.

Use it to guide:

- deciding whether to compact, split, toolize, distill, or leave a workflow as-is
- evaluating whether a change improves repeated runtime efficiency
- avoiding unsafe deletion of useful context
- explaining why a workflow can be treated as lighter

## Refresh Rule

Refresh this file when:

- the source article materially changes
- the user changes the approved distillation viewpoint
- `igapyon-skill-compactor` adds a new major placement layer
- current product rules around cached input or reasoning/output accounting need
  a new caveat

Do not refresh this file for purely mechanical `index.json` regeneration.

## Core Thesis

Token efficiency is not prompt shortening. It is runtime design for producing
the same useful result with less repeated input, less unnecessary output, less
unnecessary reasoning, and fewer reruns.

The practical question is:

```text
For each repeated run, what context is processed, what output is generated,
what reasoning is required, and does that cost match the result?
```

## R&D Versus Stable Runtime

Separate two costs:

- R&D cost: exploration, trial, discovery, prototype execution
- stable runtime cost: repeated cost for an established workflow

It is acceptable for early workflow design to be heavy. The important step is
to avoid carrying prototype-level context into repeated production-style use.

## Meaning Placement

Move meaning instead of erasing meaning.

Prefer this placement logic:

- prompt: current goal, task boundary, success criteria, non-goals
- Agent Skill: repeated judgment, procedure, activation contract, work style
- references: conditional knowledge and detailed guidance
- distilled: curated runtime meaning from larger sources
- templates/examples: reusable shapes and representative samples
- CLI/scripts/tools: deterministic search, extraction, build, test, aggregation
- MCP: external services, shared data, repository state, repeatable integration
- stable prefix/context: repeated stable instructions that should not churn
- output constraints: required sections, verbosity limits, structured result

For Agent Skills specifically, the first token-efficiency question is not
"how short is `SKILL.md`?" but "should this skill activate at all?" A skill is
both a way to add reusable knowledge and a way to avoid reading that knowledge
until the activation contract really matches the task.

Before moving or compacting anything, reduce the task shape when possible:

- narrow the purpose from "everything" to the decision or viewpoint needed now
- select only relevant chapters, files, functions, log ranges, or diffs
- specify output length and format when repeated explanation is unnecessary
- keep essential purpose, constraints, decision criteria, prohibitions, output
  format, and important assumptions visible

Separate storage from access. It can be useful to retain medium-quality bulk
materials such as work logs, past examples, design notes, and failure cases, but
the runtime path should enter through indexes, front matter, distilled files,
or targeted references instead of reading the bulk set by default.

## Search And Reading Ladder

Before reading full source material, use the smallest useful discovery layer:

1. grep/rg-friendly names, headings, front matter, summaries
2. generated `index.json`
3. `distilled/`
4. references
5. original source material

This keeps file discovery and source reading from becoming repeated context
debt.

## Context Debt

Context debt is a workflow structure where the agent can only behave correctly
because large, repeated, unclear instructions are always loaded.

Symptoms:

- every run needs a long background explanation
- old workaround text remains without clear reason
- checks and timing rules are copied into many files
- the same examples are pasted into prompts
- huge logs or source materials are read before filtering
- no one can tell which instruction is still necessary

Reduce context debt by clarifying placement, splitting overloaded skills,
distilling large sources, extracting mechanical work to tools, and validating
behavior before and after changes.

Do not rely on automatic conversation compaction as the primary design. Compact
or summarize can help, but it can drop details, intermediate decisions, and
information that did not look important at the time. Prefer designing the
workflow so broad context is not loaded repeatedly in the first place.

For long sessions, switch sessions only after writing a short carry-forward
state: purpose, decisions, constraints, unresolved points, and next files or
materials. Session switching is useful because it selects context again; it is
not useful if the previous conversation or large sources are pasted back in.

## Cache-Friendly Stable Context

Stable repeated context can be treated as qualitatively lighter when it is
likely to become cache-friendly or otherwise discounted/stabilized by the
runtime environment.

Use this only as an expected runtime-efficiency benefit unless current product
rules confirm exact billing behavior.

Design for cache-friendliness by:

- keeping stable files stable
- avoiding cosmetic churn
- separating volatile run notes from reusable references
- splitting stable guidance by coherent viewpoint
- keeping changing per-run input after stable context

Start with file-native organization before building heavier retrieval systems.
Markdown, front matter, directory structure, generated `index.json`, templates,
examples, and distilled files are often enough for Agent Skill-scale context
engineering. These artifacts can later become input to RAG or database-backed
retrieval if the workflow outgrows file-based navigation.

## Safety Rule

Do not reduce context so far that quality drops and reruns increase. A shorter
single run can be more expensive overall if it causes avoidable failure.

Preserve safeguards, trigger intent, validation rules, and domain constraints
even when they look verbose.

Language changes are an optimization to measure, not a rule to assume. English
may be lighter for some content and models, but translation can add explanation,
ambiguity, or rework. Prefer reducing duplication, narrowing reading scope, and
distilling repeated material before relying on language conversion.
