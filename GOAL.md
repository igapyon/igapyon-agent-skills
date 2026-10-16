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

Implement the user-approved miku-scm Work Cycle redesign under
`skills/igapyon-miku-scm/`. The target is a responsive normal workflow that
keeps the existing safety boundaries and the `-done` lifecycle while reducing
unnecessary AI-agent round trips.

The accepted design is
`skills/igapyon-miku-scm/docs/work-cycle-lifecycle-redesign.md`. The earlier
miku-soft developer-reference audit remains recorded in `TODO.md` and
`HANDOFF.md`, but is not the active objective.

## Done

- `pr recommit push` is implemented as a distinct, documented transition that
  safely chains recommit and conditional publication.
- Expected fixed Git, GitHub, and search checks run inside deterministic Node
  runners; human or agent intervention is requested only for an actual safety
  boundary, ambiguity, or failure.
- Version-increment reminders remain visible but do not block ordinary work.
- The runner has one shared workflow core with platform adapters; `rg` is an
  optional accelerator rather than a macOS or Windows prerequisite.
- Existing `-done`, backup, exact remote expectation, `force-with-lease`, and
  post-push verification guarantees remain intact.
- Changed miku-scm source, references, contracts, and tests are regenerated
  and verified with the required fast/full suites before handoff.

## Stop

- The user must choose whether local version commit `27a2ed7` is its own PR or
  the first commit of the implementation PR before publication is prepared.
- A required workflow safety policy, public compatibility decision, or
  platform-specific behavior cannot be resolved from the redesign and needs a
  user decision.
- Remote mutation, tag creation or movement, or GitHub Release publication is
  required; these remain separately authorized human workflows.
- `TODO.md` の `Retry Log` に同じ原因の失敗が3回記録された。
