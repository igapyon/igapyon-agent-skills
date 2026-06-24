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
- 2026-06-23 skill discovery maintenance is implemented, copied into `/Users/igapyon/.codex/skills`, and verified in a fresh Codex session.
- `policy.allow_implicit_invocation: false` was removed from `igapyon-agent-state-management` and `igapyon-skill-compactor` `agents/openai.yaml` files.
- The miku-soft Agent Skill starter skeleton was moved from `assets/agent-skills/skills/__SKILL_NAME__/SKILL.md` to `assets/agent-skills/templates/skill/SKILL.md.template`.
- `DECISIONS.md` records the durable policy: avoid hidden discovery controls and keep skill templates outside discovery shapes.

## Next Action

- Resume later with the open `TODO.md` AI Agent task: update bundled skills after identifying the affected bundled skills and source of truth.
- For any later new work, read `GOAL.md`, then check `TODO.md` and update `## AI Agent Current Tasks` with the active task.

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
- 2026-06-23: `mvn generate-resources` and `mvn package` passed.
- 2026-06-23: Source and installed copies were checked: no `allow_implicit_invocation` remained in the two affected skills.
- 2026-06-23: Source and installed `igapyon-miku-soft-developer/assets/agent-skills` trees were checked: no real `SKILL.md` template remained under the starter assets.
- 2026-06-23: Fresh Codex session skill list includes `igapyon-agent-state-management` and `igapyon-skill-compactor`, and does not include `__SKILL_NAME__`.
