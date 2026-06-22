---
name: igapyon-agent-state-management
description: Use only when the user explicitly names igapyon-agent-state-management or uses an igapyon-prefixed trigger phrase such as igapyon 状態管理, igapyon agent 状態管理, igapyon 作業状態, igapyon 作業再開, igapyon goal, igapyon todo, igapyon handoff, or igapyon GOAL TODO DECISIONS HANDOFF. Do not trigger for generic TODO.md maintenance, ordinary project planning, vague handoff discussion, ordinary work resumption, broad Context Engineering talk, or even the GOAL.md + TODO.md + DECISIONS.md + HANDOFF.md workflow unless the user also says igapyon or explicitly names this skill.
---

# Igapyon Agent State Management

This skill helps set up and maintain a small Markdown-based state-management convention for AI agent work.

The default convention uses these repository-local files:

- `GOAL.md`: define the objective, completion conditions, and stop conditions
- `TODO.md`: track active tasks, blockers, and repeated failures
- `DECISIONS.md`: record important decisions and reasons
- `HANDOFF.md`: summarize the current state for the next human or agent

Use this as a repository workflow skill. It is not tied to a specific character agent, model, editor, or vendor.

## Trigger Phrases

This skill intentionally uses hard triggers. Prefer these phrases when the user has forgotten the exact skill name:

- `igapyon 状態管理`
- `igapyon 作業状態`
- `igapyon 作業再開`
- `igapyon goal`
- `igapyon todo`
- `igapyon handoff`
- `igapyon GOAL TODO DECISIONS HANDOFF`

When answering a general question such as "what skills are available?", describe this skill as the one for `igapyon 状態管理` and `igapyon 作業再開`.

## Core Workflow

1. Inspect the repository before editing.
2. Check whether `GOAL.md`, `TODO.md`, `DECISIONS.md`, or `HANDOFF.md` already exist.
3. Do not overwrite existing files without reading them first.
4. If `TODO.md` already exists, preserve its existing purpose and add or update only `## AI Agent Current Tasks` when appropriate.
5. Use [references/markdown-state-files.md](references/markdown-state-files.md) for the detailed setup rules and initial prompt.
6. Use templates from [templates/](templates/) when creating new files.
7. Keep the state files lightweight. Do not turn them into long work logs or broad project documentation.

## Resume Workflow

When the user says `igapyon 作業再開`, treat it as a request to recover the current repository working state, not necessarily to create new files.

1. Inspect the repository state with ordinary local context such as `git status --short`, `README.md`, existing `TODO.md`, and any existing `GOAL.md`, `DECISIONS.md`, or `HANDOFF.md`.
2. If the state files already exist, read them and summarize the current objective, next tasks, blockers, relevant decisions, and handoff notes.
3. If they do not exist, do not create them automatically unless the user asks. Briefly mention that this skill can set up `GOAL.md`, `TODO.md`, `DECISIONS.md`, and `HANDOFF.md` if needed.
4. Keep the output focused on what to do next and any uncertainty that needs user confirmation.

## File Roles

Read `GOAL.md` before starting work, before declaring completion, and whenever scope becomes unclear.

Read and update `TODO.md` during work when task status changes, blockers appear, new work is found, or the same failure repeats.

Read `DECISIONS.md` before making or revisiting important decisions, especially when the work appears to loop.

Read and update `HANDOFF.md` when pausing work, handing work to another agent, or preparing a compact resume summary. Keep it as a concise current-state summary, not a full work log.

## Existing Files

If a repository already has a human-oriented `TODO.md`, do not replace it and do not force front matter into it.

Instead, add or update this section only:

```markdown
## AI Agent Current Tasks
```

If the section already exists, update it in place. Do not duplicate it.

If `GOAL.md`, `DECISIONS.md`, or `HANDOFF.md` already exists, read it and propose a scoped change or add compatible sections. Do not assume it is an AI-agent state file unless the contents indicate that role.

## Templates

- [templates/GOAL.md](templates/GOAL.md)
- [templates/TODO.md](templates/TODO.md)
- [templates/DECISIONS.md](templates/DECISIONS.md)
- [templates/HANDOFF.md](templates/HANDOFF.md)

Replace `((TBD: ...))` placeholders with concrete details when the current work is known. Leave them only when the user has not provided enough information.
