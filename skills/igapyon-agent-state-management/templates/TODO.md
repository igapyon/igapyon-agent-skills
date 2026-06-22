---
purpose: ai-agent-todo
read_when:
  - before_starting_work
  - during_work
  - before_finishing_work
update_when:
  - task_status_changes
  - new_task_is_found
  - blocker_is_found
  - repeated_failure_is_found
---

# Todo

This file tracks the active tasks, blockers, and repeated failures for the AI agent.
Use `HANDOFF.md` for compact resume notes for the next human or agent.

## AI Agent Current Tasks

This section tracks active work items for AI agents.
Update this section while working. Do not rewrite unrelated TODO items.

### Tasks

- [ ] ((TBD: 最初の作業項目を書く))
- [ ] ((TBD: 必要なら追加する))

### Blockers

- ((TBD: なければ「なし」と書く))

### Retry Log

Use this section only when the same task or error is repeated.
If the same failure appears 3 times, stop and ask the user.

- ((TBD: YYYY-MM-DD / task / failure / changed approach))
