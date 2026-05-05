# Agent Skills Workflow

Use this workflow for creating or maintaining a miku-soft Agent Skills package.

Detailed design guidance lives in [miku-soft-basic/miku-soft-40-agentskills-design-v20260501.md](miku-soft-basic/miku-soft-40-agentskills-design-v20260501.md). Keep this file as the execution checklist.

## First Reads

1. Read [activation-policy.md](activation-policy.md) for strict activation behavior.
2. Read [architecture-rules.md](architecture-rules.md).
3. Read the Agent Skills basic document.
4. Inspect the upstream product README, runtime artifacts, CLI/API contracts, existing skill files, references, assets, tests, README, docs, TODO, and generated indexes.

## Checklist

1. Keep the skill as a workflow adapter over upstream product behavior.
2. Do not duplicate product logic in `SKILL.md` or references.
3. Keep `SKILL.md` lean and put detailed workflow material under `references/`.
4. Define activation behavior narrowly when the skill can affect broad repository work.
5. Describe runtime artifact lookup, artifact roles, diagnostics, and handoff points when relevant.
6. Update indexes and validation output after adding or changing skill files.
