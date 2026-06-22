# Checklist Timing

Use this reference to decide when to apply checklists without repeating timing
instructions in every checklist.

Centralizing checklist timing reduces prompt size, avoids duplicated `SKILL.md`
or reference text, and prevents maintenance drift when the workflow changes.

## Standard Passes

1. Pre-work pass:
   - choose the smallest applicable checklist
   - identify applicable techniques
   - identify risks, safeguards, and leave-as-is candidates
   - decide whether human confirmation is needed before editing
2. During-work pass:
   - keep the selected checklist available as a guardrail
   - update placement decisions when new context appears
   - avoid expanding scope merely because another checklist item exists
3. Post-work pass:
   - verify which checklist items were applied
   - mark intentionally unchecked items as intentional when relevant
   - confirm behavior, references, triggers, and validation still work
   - summarize only highlights and unresolved risks, not the full checklist

## Optional Passes

- Discovery pass: use before reading many files when the right layer is unclear.
- Split-design pass: use before creating or separating skills.
- Regression pass: use after later edits to confirm the same safeguards still hold.

## Reporting Rule

Do not paste whole checklists into final reports. Report the selected checklist,
the important checked items, intentionally skipped items, validation performed,
and remaining risks.
