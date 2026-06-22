---
purpose: ai-agent-goal
read_when:
  - before_starting_work
  - before_finishing_work
  - when_scope_is_unclear
update_when:
  - goal_changes
  - done_conditions_change
  - stop_conditions_change
---

# Goal

This file defines what the AI agent is trying to accomplish.
Read this before starting work, before deciding that work is complete, and whenever scope becomes unclear.

## Objective

Maintain this repository's AI agent work state with lightweight Markdown files:

- `GOAL.md`
- `TODO.md`
- `DECISIONS.md`
- `HANDOFF.md`

For ordinary repository work, keep the active objective here concise and use `TODO.md` for current tasks.

## Done

- Root-level AI agent state files exist where appropriate.
- Existing repository TODO content is preserved.
- AI-agent-only task tracking lives in `TODO.md` under `## AI Agent Current Tasks`.
- Important future decisions can be recorded in `DECISIONS.md`.
- A compact resume summary can be recorded in `HANDOFF.md`.

## Stop

- Existing human-oriented repository notes would need to be rewritten instead of extended.
- The current work objective is unclear enough that `GOAL.md` cannot be updated concretely.
- User-side work or external state changes are required, such as push, release, manual confirmation, or external service operation. In that case, state the stop reason, resume condition, and first resume check once, then end the turn.
- Do not repeat waiting messages such as "waiting", "still waiting", or "waiting for resume" while blocked on user-side work or an external state change.
- `TODO.md` の `Retry Log` に同じ原因の失敗が3回記録された
