---
title: Test Prompt Index
description: Validation prompt index for igapyon-skill-compactor trigger and behavior checks.
topics:
  - tests
  - activation
  - validation
  - agent-skills
category: test
status: draft
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
---

# Test Prompt Index

Use this directory only for validation. Do not load test prompts during normal
runtime unless validating trigger behavior, routing, or output contracts.

## Files

- [activation-prompts.jsonl](activation-prompts.jsonl): representative prompts
  for activation, non-activation, and mention-only behavior.
- [behavior-prompts.jsonl](behavior-prompts.jsonl): representative prompts for
  compaction behavior, safety, and output-contract checks.
- [reference-routing-prompts.jsonl](reference-routing-prompts.jsonl):
  representative prompts for choosing the correct reference, distilled,
  checklist, template, example, or test material.
- [expected-result-schema.json](expected-result-schema.json): suggested JSON
  shape for non-interactive or subagent test reports.
- [evaluator-prompt.md](evaluator-prompt.md): prompt used by `codex exec` to
  evaluate a single test case.
- [run-codex-prompt-tests.mjs](run-codex-prompt-tests.mjs): local runner that
  invokes `codex exec` for JSONL test cases.

## Rules

- Keep each JSONL record one line.
- Keep prompts representative, not exhaustive.
- Prefer meaningful IDs such as `activate-001`.
- Add cases only when they protect trigger intent, output contract, routing, or
  behavior that could regress.
- Prefer expected values from a small enum such as `activate`,
  `do-not-activate`, `mention-only`, `preserve`, `conservative`,
  `structural`, `summary`, `route`, or `ask-human`.
- Run test prompts in read-only or no-edit mode unless the test explicitly
  checks editing behavior in a disposable copy.

## Prompt-Test-Driven Refactoring

Use these tests before risky compaction, not only after it.

1. Add or update the smallest representative cases that protect the behavior
   being refactored.
2. Run a baseline before changing `SKILL.md`, references, routing, or
   commonized text.
3. Refactor for progressive disclosure and token efficiency.
4. Run the same cases after refactoring.
5. Treat changed results, ambiguous expectations, and ask-human cases as
   review findings.

## Local Runner

Dry run without invoking Codex:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs --dry-run
```

Run one case:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs --case activate-001
```

Run all cases and write JSON results under `tests/results/`:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs
```

The runner uses `codex exec --output-schema` and should be used only during
validation, not normal runtime. It passes `--ephemeral` by default so test runs
do not persist Codex session rollout files unless `--persist-session` is used.

## Suggested Report

Each test run should return compact records matching
[expected-result-schema.json](expected-result-schema.json), for example:

```json
{"id":"activate-001","actual":"activate","pass":true,"reason":"Explicit skill name and Agent Skill compaction request."}
```
