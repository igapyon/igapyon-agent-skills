# Agent Skills Workflow

Use this workflow for creating or maintaining a miku-soft Agent Skills package.

Detailed design guidance lives in [miku-soft-basic/miku-soft-40-agentskills-design-v20260506.md](miku-soft-basic/miku-soft-40-agentskills-design-v20260506.md). Keep this file as the execution checklist.

## Required Initial Input

At the beginning of an Agent Skills creation or substantial maintenance task,
require the upstream miku main application GitHub repository URL: the product
repository whose behavior, APIs, CLI contracts, runtime artifacts, diagnostics,
and limitations the skill should expose to agents.

Also confirm the upstream branch, tag, release, commit, or received runtime
artifact version that should be treated as the compatibility source. When the
exact upstream state is unknown, use the GitHub repository URL as the first
anchor and record the follow-up needed to pin the precise source revision or
artifact version.

For CLI-backed work, require the needed upstream runtime artifacts to be placed
by a human under `skills/<skill-name>/runtime/` before runtime wiring,
packaging, or smoke-test work. These artifacts should normally be downloaded
from the upstream GitHub Releases page or another documented upstream release
channel, then renamed to the skill's declared versioned runtime artifact names.

When available, also require one or more similar existing miku `-skills`
sister project source checkout paths under `workplace/`. These are practical
shape references for the Agent Skills layer, not replacements for the upstream
product source.

## First Reads

1. Read [activation-policy.md](activation-policy.md) for strict activation behavior.
2. Read [architecture-rules.md](architecture-rules.md).
3. Read the Agent Skills basic document.
4. Inspect the upstream product README, runtime artifacts, CLI/API contracts, existing skill files, references, assets, tests, README, docs, TODO, and generated indexes.
5. When available, inspect existing `-skills` sister application checkouts under `workplace/` for the same maturity pattern, especially `SKILL.md`, `runtime/`, `lib/`, `scripts/`, `tests/`, `references/runtime/`, and bundle output.

## Checklist

1. Keep the skill as a workflow adapter over upstream product behavior.
2. Do not duplicate product logic in `SKILL.md` or references.
3. Keep `SKILL.md` lean and put detailed workflow material under `references/`.
4. Define activation behavior narrowly when the skill can affect broad repository work.
5. Fix the upstream URL and compatibility source before designing runtime lookup or tests.
6. For CLI-backed work, confirm that required runtime artifacts have been placed under `skills/<skill-name>/runtime/`.
7. Decide the implementation maturity pattern: handoff-only, CLI-backed, or CLI plus MCP-backed.
8. Describe runtime artifact lookup, artifact roles, diagnostics, and handoff points when relevant.
9. Keep backend policy strict: `*-only` policies must not silently fallback, and `handoff-only` must not execute runtime operations.
10. Verify bundle contents include required skill files and runtime artifacts while excluding development-only files.
11. Use sister projects as shape references only; do not copy `workplace/` contents into the target repository wholesale.
12. Update indexes and validation output after adding or changing skill files.
