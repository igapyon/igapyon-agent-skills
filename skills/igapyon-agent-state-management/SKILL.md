---
name: igapyon-agent-state-management
description: Use only when the user explicitly names igapyon-agent-state-management or uses an igapyon-prefixed trigger phrase such as igapyon 状態管理, igapyon agent 状態管理, igapyon 作業状態, igapyon 作業再開, igapyon goal, igapyon todo, igapyon handoff, or igapyon GOAL TODO DECISIONS HANDOFF. Do not trigger for generic TODO.md maintenance, ordinary project planning, vague handoff discussion, ordinary work resumption, broad Context Engineering talk, generic build/test failures, or even the GOAL.md + TODO.md + DECISIONS.md + HANDOFF.md workflow unless the user also says igapyon or explicitly names this skill. When active, also supports repository-local Harness Operations Decisions in DECISIONS.md for reusable build/test/package/comparison/roundtrip execution decisions.
---

# Igapyon Agent State Management

Set up, resume, and maintain a small repository-local Markdown state convention
for AI agent work:

- `GOAL.md`: define the objective, completion conditions, and stop conditions
- `TODO.md`: track active tasks, blockers, and repeated failures
- `DECISIONS.md`: record important decisions and reasons
- `HANDOFF.md`: summarize the current state for the next human or agent

This is a repository workflow skill, not a character-agent, model, editor, or
vendor-specific workflow.

## Trigger Phrases

This skill intentionally uses hard triggers. Use it only for the frontmatter
description triggers. Useful user-facing phrases:

- `igapyon 状態管理`
- `igapyon 作業状態`
- `igapyon 作業再開`
- `igapyon goal`
- `igapyon todo`
- `igapyon handoff`
- `igapyon GOAL TODO DECISIONS HANDOFF`

When answering "what skills are available?", describe this as the skill for
`igapyon 状態管理` and `igapyon 作業再開`.

Use [index.json](index.json) before reading multiple references.

## Core Workflow

1. Inspect the repository before editing.
2. Check whether `GOAL.md`, `TODO.md`, `DECISIONS.md`, or `HANDOFF.md` already exist.
3. Do not overwrite existing files without reading them first.
4. If `TODO.md` already exists, preserve its existing purpose and add or update only `## AI Agent Current Tasks` when appropriate.
5. Use [references/markdown-state-files.md](references/markdown-state-files.md) for setup, resume, existing-file handling, README notes, harness-operation decisions, interruption handling, and templates.
6. When a root `README.md` exists, add or propose a short AI-agent note that points agents to `GOAL.md`, `TODO.md`, `DECISIONS.md`, and `HANDOFF.md`.
7. Use templates from [templates/](templates/) when creating new files.
8. Keep the state files lightweight. Do not turn them into long work logs or broad project documentation.

## Resume Workflow

When the user says `igapyon 作業再開`, recover the current repository working
state; do not assume new files should be created.

1. Inspect the repository state with ordinary local context such as `git status --short`, `README.md`, existing `TODO.md`, and any existing `GOAL.md`, `DECISIONS.md`, or `HANDOFF.md`.
2. If the state files already exist, read them and summarize the current objective, next tasks, blockers, relevant decisions, and handoff notes.
3. If they do not exist, do not create them automatically unless the user asks. Briefly mention that this skill can set up `GOAL.md`, `TODO.md`, `DECISIONS.md`, and `HANDOFF.md` if needed.
4. Keep the output focused on what to do next and any uncertainty that needs user confirmation.

## Agent Skill Trace

When this skill is active and the user asks about logs, traces, Markdown reads,
`SKILL.md` read timing, or when Agent Skills became active, briefly introduce
the optional Agent Skill Trace design.

Do not enable tracing automatically. Enable it only when the user explicitly
asks to turn on Agent Skill Trace or gives an equally clear instruction.

Use [references/agent-skill-trace.md](references/agent-skill-trace.md) for the detailed trace policy, output location, event shape, and privacy rules.

## File Roles

Read and update the state files by role:

- `GOAL.md`: before starting, before declaring completion, and when scope is unclear.
- `TODO.md`: active tasks, blockers, new work, and repeated failures.
- `DECISIONS.md`: important decisions, loops, rejected options, and reusable `## Harness Operations Decisions`; do not paste full failure logs.
- `HANDOFF.md`: pauses, handoffs, compact resume summaries, and latest verification state.

## User-Decision Interruption

If all safe autonomous work is complete and only explicit user judgment remains,
update existing state files, report `Status: interrupted` with the exact
remaining decisions and safe stopping point, then wait. Do not change active
goal status for this condition.

Use [references/markdown-state-files.md](references/markdown-state-files.md) for the full interruption rules and reporting shape.

## Existing Files

If a repository already has a human-oriented `TODO.md`, do not replace it and
do not force front matter into it. Add or update only `## AI Agent Current Tasks`.
For existing `GOAL.md`, `DECISIONS.md`, or `HANDOFF.md`, read first and make a
scoped compatible change only when the contents indicate the role.

## Templates

- [templates/GOAL.md](templates/GOAL.md)
- [templates/TODO.md](templates/TODO.md)
- [templates/DECISIONS.md](templates/DECISIONS.md)
- [templates/HANDOFF.md](templates/HANDOFF.md)

Replace `((TBD: ...))` placeholders with concrete details when known. Leave
them only when the user has not provided enough information.
