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
updated: 2026-07-17
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
- [expected-result-schema.json](expected-result-schema.json): required schema
  for the independent evaluator result.
- [evaluator-prompt.md](evaluator-prompt.md): prompt used by `codex exec` to
  evaluate a single test case.
- [run-codex-prompt-tests.mjs](run-codex-prompt-tests.mjs): local runner that
  invokes `codex exec` first for the raw SUT and then for an independent evaluator.
- [harness-lib.test.mjs](harness-lib.test.mjs): deterministic failure-detection,
  mutation, leakage, and sandbox regression tests for the runner itself.
- `fixtures/`: disposable Agent Skill artifacts and hidden expectations.

## Rules

- Keep each JSONL record one line.
- Keep prompts representative, not exhaustive.
- Prefer meaningful IDs such as `activate-001`.
- Add cases only when they protect trigger intent, output contract, routing, or
  behavior that could regress.
- Never put `expected`, semantic checks, or the expected target into the raw SUT
  prompt. Expectations remain runner-side and reach only the evaluator.
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

Repeat the selected case in independent ephemeral sessions:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs --case activate-001 --repeat 3
```

Run all cases after source and installed hashes agree:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs
```

During source development, explicitly allow drift:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs --source-only --case activate-001
```

Each invocation creates a unique run directory under the repository-local,
Git-ignored `workplace/skill-compactor-tests/`. It saves
metadata, raw JSON events, stderr, tool trace, fixture before/after, diff,
deterministic assertions, and the evaluator result. Missing output, malformed
events, wrong activation/routing, forbidden reads or writes, lost critical
content, or any evaluator failure makes the command exit nonzero.

## Suggested Report

The independent evaluator must return records matching
[expected-result-schema.json](expected-result-schema.json), for example:

```json
{"verdict":"pass","assertions":[{"id":"critical-command","pass":true,"evidence":"The exact command remains."}],"reason":"All requested semantic checks passed.","notes":[]}
```
