---
name: import-state-handler
description: Use when the user asks import-state-handler to process an import job. Do not activate for generic CSV questions.
---

# import-state-handler

Start in `pending`. If schema validation fails, transition to `rejected` and
stop. If validation succeeds but the remote API returns 429, wait for the
`Retry-After` value and retry at most twice. After the second 429, transition to
`deferred`. For any other API error, transition to `failed` without retry. When
all records are accepted, transition to `completed` and write `receipt.json`.

Never write `receipt.json` in `rejected`, `deferred`, or `failed` states. Return
the final state, retry count, and receipt path or absence.
