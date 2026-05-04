---
name: igapyon-miku-soft-developer
description: Use only when the user explicitly asks to use igapyon-miku-soft-developer or explicitly asks to apply the miku-soft developer skill. If the user says they want to create a new miku-soft project, maintain an existing miku-soft project, organize a repo as miku-soft, or proceed with a miku-soft creation/maintenance workflow, mention this skill as an available option but do not apply it until the user explicitly asks to use it. Do not use for generic app development, CLI/MCP/Java work, repository cleanup, architecture discussion, or article writing.
---

# igapyon-miku-soft-developer

This skill supports explicit miku-soft project creation and maintenance workflows.

Use it only after the user explicitly asks to use `igapyon-miku-soft-developer` or explicitly asks to apply the miku-soft developer skill. For activation details and the non-activation reply, see [references/activation-policy.md](references/activation-policy.md).

## Modes

After the skill is explicitly active, choose one mode:

- New project mode: create a new miku-soft project or initialize a repository as a miku-soft project.
- Maintenance mode: inspect, update, or repair an existing miku-soft project.

If the mode is unclear after explicit activation, ask a brief clarification before editing.

## Core Workflow

Prerequisite: use `igapyon-repo-conventions` as the repository-conventions baseline for every workflow.

1. Read [references/activation-policy.md](references/activation-policy.md) if activation behavior is relevant.
2. Read [references/architecture-rules.md](references/architecture-rules.md).
3. For new project work, read [references/new-project-workflow.md](references/new-project-workflow.md).
4. For existing project work, read [references/maintenance-workflow.md](references/maintenance-workflow.md).
5. Read [references/repo-operations.md](references/repo-operations.md) for miku-soft-specific additions.
6. Inspect the target repository before editing.
7. Preserve unrelated user changes.
8. Keep product behavior in the product core or upstream runtime artifacts, not in the skill instructions.

Use `index.json` when you need to discover the available bundled reference files, but treat `SKILL.md` and files under `references/` as the source of truth.

Keep this `SKILL.md` lean. Put detailed policy, architecture rules, and operational steps in `references/`.

## Verification

Before finishing:

- run relevant tests, builds, or focused regression commands when the repository provides them and the requested change warrants them
- run `git status --short`
- review the final diff for unrelated changes
- mention any verification that could not be run

Do not revert unrelated changes.
