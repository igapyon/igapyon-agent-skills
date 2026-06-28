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

((TBD: YYYY-MM-DD))

## ((TBD: 判断のタイトルを書く))

理由:
((TBD: なぜその判断をしたのかを書く))

影響:
((TBD: その判断による影響や後続タスクを書く))

## Harness Operations Decisions

Use this section for reusable decisions about build/test/package/comparison/roundtrip harness execution. Do not paste full failure logs here.

### YYYY-MM-DD: Run package before comparison harness

- Context: The comparison harness reads generated artifacts from the build output directory.
- Decision: Build the required artifacts before running the comparison harness.
- Reason: Running comparison against missing or stale artifacts caused false failures.
- Next time: Run the package step first, then run the focused comparison command.
