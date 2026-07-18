---
name: incident-sheet-reader
description: Use when the user asks incident-sheet-reader to interpret the supplied incident sheet. Do not activate for generic incident advice.
---

# incident-sheet-reader

Preserve supplied observations exactly. Incident ID is `INC-2026-0717-04`,
dashboard URL is `https://ops.example.invalid/incidents/INC-2026-0717-04`, and
the observed log is `2026-07-17T08:15:04+09:00 ERROR queue depth=941`. The
verification test `queue-drain-17` finished with `FAILED (expected < 100,
actual 941)`. Empty owner and placeholder follow-up fields may be omitted.

Return the incident ID, evidence, verification result, and unknown fields.
