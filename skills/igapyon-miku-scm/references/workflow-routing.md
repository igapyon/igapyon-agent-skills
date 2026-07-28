# Workflow Routing

The canonical migrated-workflow catalog is
`scripts/miku-scm-workflow-manifest.mjs`. Each entry fixes:

- workflow ID
- representative user triggers
- required parameter categories
- mutation level
- approval gate
- static runner entry
- normative contract spec and contract test
- runtime references, separately from design references

The Agent routes intent to one manifest ID and fixed options. It must not
derive a command sequence from the trigger text. The runner checks that every
manifest entry has exactly one implementation and that its mutation level and
approval gate match.

Mechanical requests route to status, preflight, apply, or handoff IDs. Public
prose requests route first to the matching `writing.*.prepare` ID; generative
drafting consumes its bounded evidence, and any later mutation returns to a
mechanical preflight.

Normal migrated execution reads the small safety kernel in `SKILL.md` and only
the selected entry's `runtime_references`. An empty list means that no detailed
Markdown is loaded. `design_references` are for implementation, maintenance,
legacy behavior, recovery, and exceptions; they are not runtime prerequisites.

Each workflow has the same unique workflow and contract ID. The generated lock
binds its contract version, runner, normative spec, contract test, and SHA-256
pair. `scripts/miku-scm-workflow-contracts.mjs --check` fails on missing files,
duplicate IDs, digest drift, or stale generated output.

Adding a workflow requires updating the manifest, runner registry,
documentation, contract test, generated lock/table, and routing/command-surface
tests together.
