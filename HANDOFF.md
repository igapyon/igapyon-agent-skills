---
purpose: ai-agent-handoff
read_when:
  - before_resuming_work
  - before_handing_off_work
  - when_context_is_missing
update_when:
  - work_is_paused
  - handoff_summary_changes
  - verification_status_changes
---

# Handoff

This file summarizes the current working state for the next human or AI agent.
Keep it concise. Do not use this as a full work log or a replacement for `TODO.md` and `DECISIONS.md`.

## Current State

- AI agent state management has been initialized for this repository.
- Root `TODO.md` remains the repository's existing task memo.
- `GOAL.md`, `DECISIONS.md`, and `HANDOFF.md` provide agent-oriented state, decisions, and resume context.

## Next Action

- For new work, read `GOAL.md`, then check `TODO.md` and update `## AI Agent Current Tasks` with the active task.

## Relevant Files

- `GOAL.md`: Current agent objective, done conditions, and stop conditions.
- `TODO.md`: Existing repository TODO plus AI agent current tasks.
- `DECISIONS.md`: Important decisions and reasons.
- `HANDOFF.md`: Compact resume notes.
- `README.md`: Repository operating rules and conventions.

## Watch Outs

- Do not rewrite unrelated existing `TODO.md` sections while updating agent task state.
- Keep state files concise; use repository documentation for durable project rules.

## Last Verification

- 2026-06-22: Inspected `git status --short`, `README.md`, existing `TODO.md`, and state-management templates.
