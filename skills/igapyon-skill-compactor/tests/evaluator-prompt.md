---
title: Compaction Artifact Evaluator
description: Evaluates a raw compaction result after the SUT run; expectations are never sent to the SUT.
topics:
  - tests
  - independent-evaluation
  - agent-skills
category: test
status: stable
audience:
  - agent
  - maintainer
updated: 2026-07-17
---

# Compaction Artifact Evaluator

Evaluate only the supplied source artifact, result artifact, SUT response, and
semantic checks. Do not apply or load `igapyon-skill-compactor`. Do not edit
files or infer private reasoning.

For every semantic check ID, return exactly one assertion with concise evidence
from the supplied artifacts. A check passes only when the result preserves the
required meaning; a claim in the SUT response without supporting artifact
evidence is insufficient. Return `verdict: fail` if any required assertion is
missing, unsupported, or false.

Return only JSON matching `expected-result-schema.json`.
