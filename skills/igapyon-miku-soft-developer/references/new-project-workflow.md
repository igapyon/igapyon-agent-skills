# New miku-soft Project Workflow

Use this short workflow only after `igapyon-miku-soft-developer` has been explicitly activated.

Detailed design guidance lives under [miku-soft-basic/](miku-soft-basic/). Keep this file as a routing checklist, not a second copy of the basic documents.

## Before Creating Files

If the app concept or repository name is not decided yet, first use [00-concept-naming-workflow.md](00-concept-naming-workflow.md). Do not ask for full scaffolding details until the app specification outline and base repository name are settled.

Start with project naming before asking for the full scaffolding details. Discuss the intended product concept, propose or validate the repository name, and compare it with [existing-miku-soft-repositories.md](existing-miku-soft-repositories.md) and current GitHub information when exact current availability matters. New base application names should start with `miku-`; older compact `miku...` names are existing historical names, not the preferred pattern for new projects. Avoid duplicate names and avoid names that would confuse a base application with its `-java`, `-skills`, or `-mcp` companion repository.

Resolve the minimum facts needed to start:

- project name and repository location
- primary input and output
- first delivery surface: main app, Java app, Agent Skill, MCP server, or a combination
- whether README, docs, TODO, and workplace conventions should be initialized now

Do not ask whether the agent should perform GitHub repository creation or other GitHub operations. Those operations are handled by the human, as defined in [repo-operations.md](repo-operations.md).

Then read the relevant basic document selected by [architecture-rules.md](architecture-rules.md).

For first delivery surface details, read the relevant specific workflow:

- [10-node-app-workflow.md](10-node-app-workflow.md): Node.js / TypeScript main application
- [30-java-straight-conversion-workflow.md](30-java-straight-conversion-workflow.md): Java straight conversion
- [40-agent-skills-workflow.md](40-agent-skills-workflow.md): Agent Skills package
- [50-mcp-workflow.md](50-mcp-workflow.md): MCP server

When showing a generic new-project example, use the Node.js / TypeScript main application form from `10-node-app-workflow.md` first. Do not use an MCP server example unless the user has already asked for MCP or the surrounding context clearly points to MCP.

## Basic Document Copy

When creating a new miku-soft project or initializing a repository as miku-soft, copy the bundled basic documents from [miku-soft-basic/](miku-soft-basic/) into the target repository's `docs/` directory.

- Copy the current newest file for each numbered topic.
- Keep the `miku-soft-*.md` filenames unchanged.
- Do not create a synchronization script.
- After copying, mention the copied source and destination files.
- If the target repository already has `miku-soft-*.md` files, compare versions and ask before replacing materially different same-version files.

## Creation Checklist

1. Inspect the target directory and git status.
2. Create only the repository skeleton needed for the requested first delivery surface.
3. Follow the specific workflow for the selected first delivery surface.
4. Put product behavior in product code, public APIs, CLI, or bundled runtime artifacts, not in skill prose.
5. Copy the miku-soft basic documents into `docs/` when initializing a miku-soft repository.
6. Add README and TODO entries that match the actual initial state.
7. Add focused tests or regression commands when there is executable behavior to protect.
8. Regenerate any repository indexes required by the target repository.
