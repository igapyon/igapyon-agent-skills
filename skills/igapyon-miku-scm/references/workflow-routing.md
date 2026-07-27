# Workflow Routing

The canonical migrated-workflow catalog is
`scripts/miku-scm-workflow-manifest.mjs`. Each entry fixes:

- workflow ID
- representative user triggers
- required parameter categories
- mutation level
- approval gate
- static runner entry
- references needed for that workflow

The Agent routes intent to one manifest ID and fixed options. It must not
derive a command sequence from the trigger text. The runner checks that every
manifest entry has exactly one implementation and that its mutation level and
approval gate match.

Read only the references named by the selected manifest entry plus the small
common SCM safety entry point. Do not load unrelated Issue, PR, Release,
maintenance, or version references after routing.

Adding a workflow requires updating the manifest, runner registry,
documentation, and routing/command-surface tests together.
