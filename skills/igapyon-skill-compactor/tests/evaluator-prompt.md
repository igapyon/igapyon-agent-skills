---
title: Codex Test Evaluator Prompt
description: Prompt used by codex exec to evaluate igapyon-skill-compactor test cases.
topics:
  - tests
  - codex-exec
  - evaluation
  - agent-skills
category: test
status: draft
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
---

# Codex Test Evaluator Prompt

You are evaluating one `igapyon-skill-compactor` test case.

Do not edit files. Do not apply the skill. Decide what the skill should do
according to the local files in `skills/igapyon-skill-compactor/`.

## Evaluation Rules

- For activation tests, decide whether the prompt should:
  - `activate`
  - `do-not-activate`
  - `mention-only`
- For behavior tests, decide whether the expected behavior is preserved,
  requires a human decision, or should not apply the requested shape.
- For routing tests, decide which local file should be read first.
- Prefer the trigger and non-trigger wording in `SKILL.md`.
- If the case is ambiguous, use `ask-human` rather than inventing certainty.
- Return only JSON matching `tests/expected-result-schema.json`.

## Required Local Context

Read only the smallest necessary local files:

- `SKILL.md` for trigger and non-trigger behavior.
- `index.json` when choosing a reference route.
- A specific reference only if the route cannot be decided from `SKILL.md` and
  `index.json`.

## Result Fields

- `id`: copied from the test case.
- `actual`: one enum value from the schema.
- `pass`: whether `actual` matches the test case `expected`.
- `reason`: one concise sentence.
- `target`: include when the case has or implies a routed file.
- `notes`: optional short caveats.
