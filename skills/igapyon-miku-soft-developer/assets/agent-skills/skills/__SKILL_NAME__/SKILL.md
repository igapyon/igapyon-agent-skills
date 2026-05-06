---
name: __SKILL_NAME__
description: Use only when the user explicitly names `__PRODUCT_NAME__` or `__SKILL_NAME__` for __PRODUCT_NAME__-specific agent workflows. Do not auto-activate it for generic requests that merely mention the domain or output formats.
---

# __SKILL_TITLE__

Use this skill for `__PRODUCT_NAME__`-specific agent workflows.
Keep the focus on the upstream product contract, structured artifacts,
runtime diagnostics, and installable skill operation.

## Activation

Start this skill only when at least one of these explicit triggers is present:

- the user names `__PRODUCT_NAME__`
- the user names `__SKILL_NAME__`
- the recent conversation is already inside an active `__PRODUCT_NAME__` workflow

Without one of these triggers, answer normally or ask a brief clarification if
using this skill would materially change the result.

## Core Rules

- keep the skill as a workflow adapter over upstream `__PRODUCT_NAME__`
- prefer declared runtime artifacts under `runtime/` when the workflow is CLI-backed
- keep required helper code under `lib/`
- keep detailed workflow material under `references/`
- preserve runtime diagnostics and do not hide upstream limitations
- do not duplicate upstream product logic in this skill layer

## References

Read these only when needed:

- [references/INDEX.md](references/INDEX.md) for workflow, runtime, and example references
