# Concept and Naming Workflow

Use this workflow after `igapyon-miku-soft-developer` has been explicitly activated and before creating a 10 main application repository.

This phase supports deciding what the app should be and what the project should be called. It may end with only a decided product concept and repository name.

During this phase, the target repository does not exist or is not yet the working target. Do not create, edit, or write files for the future target project while running this workflow. Present the result to the user as Markdown text in the conversation instead.

## Goal

Before scaffolding a repository, establish:

- the app's practical user problem
- the target input and output
- the smallest useful first version
- the likely 10 main application shape
- the base repository name

## Workflow

1. Ask for or infer the rough app idea in one or two sentences.
2. Clarify the core workflow: what the user gives the app, what the app does, and what artifact or view the user gets back.
3. Identify whether the first deliverable should be a 10 main application. Do not jump to 20 Java, 40 Agent Skills, or 50 MCP unless the user explicitly asks for those companion layers first.
4. Propose one to three repository names using the `miku-<domain>` pattern.
5. Compare candidates with [existing-miku-soft-repositories.md](existing-miku-soft-repositories.md) and current GitHub information when exact current availability matters.
6. Select a final base name with the user.
7. Only after the name is decided and the user asks to proceed with creation, continue to [new-project-workflow.md](new-project-workflow.md) for repository location, first delivery surface details, docs, TODO, workplace conventions, and scaffolding.

## Naming Rules

- New base application repositories should start with `miku-`.
- Older compact names such as `mikuproject` and `mikuscore` are historical names, not the preferred pattern for new projects.
- Avoid names already used by existing `igapyon` `miku*` repositories.
- Avoid names that would make a base application look like a companion repository.
- Reserve `-java` for 20 Java applications.
- Reserve `-skills` for 40 Agent Skills repositories.
- Reserve `-mcp` for 50 MCP server repositories.

## Output Shape

When this phase completes, summarize the decision as Markdown text in the conversation. Do not write this summary into a file during the 00 phase.

```md
## Concept and Naming Result

- App concept:
- Input:
- Output:
- First target layer: 10 main application
- Repository name:
- Reasoning:
```
