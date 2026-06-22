---
purpose: ai-agent-decisions
read_when:
  - before_starting_work
  - when_making_decision
  - when_looping_or_repeating_work
update_when:
  - important_decision_is_made
  - option_is_rejected
  - work_is_deferred
---

# Decisions

This file records important decisions for the AI agent.
Read this before making or revisiting decisions, especially when the work seems to loop.

## 2026-06-22: Preserve The Existing Root TODO

理由:
The repository already uses root `TODO.md` as a broad project work memo. Replacing it or forcing front matter into it would mix repository planning with agent-state metadata.

影響:
AI agent task tracking is added under `## AI Agent Current Tasks` inside the existing `TODO.md`. Repository-level TODO content remains unchanged.

## 2026-06-22: Stop Instead Of Repeating External-Wait Messages

理由:
When progress depends on user-side work or an external state change, repeated waiting messages do not advance the task and consume context unnecessarily.

影響:
`GOAL.md` now treats external wait states as a stop condition. The agent should state the stop reason, resume condition, and first resume check once, then end the turn.
