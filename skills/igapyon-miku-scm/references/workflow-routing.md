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

Exact `sync pull` routes to `repository.sync.pull --apply`; its fixed helper
alone chooses whether the current `-done` branch needs PR verification.
Exact `sync push` routes to `repository.sync.push.prepare --apply`, one
Agent-authored draft from the returned evidence, then
`repository.sync.push.apply` with that same operation and plan/draft digests.
Only `prepared` advances to drafting/apply; other results stop, including an
`up-to-date` result that needs no publication. A changed base requires an
explicit `sync pull` request and fresh push preparation, while preserving any
ordinary commit already made. No intermediate success confirmation is needed.
Explanations about these commands do not execute them. See [sync-pull.md](sync-pull.md) and
[sync-push.md](sync-push.md) for exceptions/recovery.

Every GitHub Issue write follows this sequence: complete all requested
preflights, collect only their returned handoff IDs, run
`github.issue.handoff.review`, display its complete content, and wait for a
separate exact `approve` or `miku-scm approve` message. Then pass the actual
message and the review binding to the single or batch apply workflow. A
preflight, pending list, initial request, `はい`, `OK`, `お願いします`, `いいね`,
`承認`, quoted text, or prose containing `approve` does not satisfy the gate.
The Agent carries IDs and digests from the current review; the user normally
does not type them. Never choose from global pending handoffs or call a
low-level Issue apply workflow directly. See
[approval-handoff.md](approval-handoff.md).

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
