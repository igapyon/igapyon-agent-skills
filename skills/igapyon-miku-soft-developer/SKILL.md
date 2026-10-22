---
name: igapyon-miku-soft-developer
description: Plan, create, review, or maintain miku-soft projects only when explicitly asked to use igapyon-miku-soft-developer or the miku-soft developer skill. For an unnamed miku-soft workflow, offer this skill without activating it. Generic development and meta work about this skill do not start a project workflow.
---

# igapyon-miku-soft-developer

This skill supports explicit miku-soft project creation and maintenance workflows.

Use it only after the user explicitly asks to use `igapyon-miku-soft-developer` or explicitly asks to apply the miku-soft developer skill. For activation details and the non-activation reply, see [references/activation-policy.md](references/activation-policy.md).

## Modes

Choose a mode from the user's requested task and existing conversation:

- Concept and naming mode: clarify the app concept and decide the miku-soft base repository name before creating files.
- New project mode: create a new miku-soft project or initialize a repository as a miku-soft project.
- Maintenance mode: implement requested maintenance or repairs in an existing miku-soft project.
- Review mode: assess a named project or artifact using [references/review/README.md](references/review/README.md); edit only when corrections are also requested.

A bare invocation establishes availability; ask briefly what work is wanted.
Do not infer a maintenance assignment from the current directory alone. Continue
an agreed workflow without asking for activation or mode selection again.

Requests to explain, review, or update this skill itself are meta work. Read the
requested skill material directly; do not require project mode selection or
start a product maintenance uplift. For a project task, ask only when the target
or intended outcome remains unclear after using available context.

## Core Workflow

For repository creation or edits, read the installed `igapyon-repo-conventions`
skill as the repository-conventions baseline. Concept discussions and read-only
reviews do not require applying repository conventions.

1. Read [references/activation-policy.md](references/activation-policy.md) if activation behavior is relevant.
2. Read [references/architecture-rules.md](references/architecture-rules.md).
3. For concept and naming work, read [references/00-concept-naming-workflow.md](references/00-concept-naming-workflow.md).
4. For new project work, read [references/new-project-workflow.md](references/new-project-workflow.md).
5. For project maintenance, read [references/maintenance-workflow.md](references/maintenance-workflow.md).
6. Read the specific workflow reference when relevant: [references/10-node-app-workflow.md](references/10-node-app-workflow.md), [references/11-web-app-workflow.md](references/11-web-app-workflow.md), [references/30-java-straight-conversion-workflow.md](references/30-java-straight-conversion-workflow.md), [references/31-java-maven-plugin-separation-workflow.md](references/31-java-maven-plugin-separation-workflow.md), [references/32-node-web-separation-workflow.md](references/32-node-web-separation-workflow.md), [references/40-agent-skills-workflow.md](references/40-agent-skills-workflow.md), or [references/50-mcp-workflow.md](references/50-mcp-workflow.md).
7. For repository work, read [references/repo-operations.md](references/repo-operations.md) for miku-soft-specific additions.
8. Inspect the target repository before editing.
9. Preserve unrelated user changes.
10. Keep product behavior in the product core or upstream runtime artifacts, not in the skill instructions.

When maintaining this shared skill's own reference taxonomy, starter policy,
or cross-repository GitHub Actions guidance, read
[docs/maintenance/README.md](docs/maintenance/README.md). Dated audits preserve
evidence and pending proposals; they do not override current references. The
maintenance adoption workflow linked there governs only maintenance work.

Keep this `SKILL.md` lean. Put detailed policy, architecture rules, and operational steps in `references/`.

## Verification

For repository changes, before finishing:

- run relevant tests, builds, or focused regression commands when the repository provides them and the requested change warrants them
- run `git status --short`
- review the final diff for unrelated changes
- mention any verification that could not be run

Do not revert unrelated changes.
