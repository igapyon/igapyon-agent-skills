# New miku-soft Project Workflow

Use this short workflow only after `igapyon-miku-soft-developer` has been explicitly activated.

Detailed design guidance lives under [miku-soft-basic/](miku-soft-basic/). Keep this file as a routing checklist, not a second copy of the basic documents.

## Before Creating Files

Resolve the minimum facts needed to start:

- project name and repository location
- primary input and output
- first delivery surface: main app, Java app, Agent Skill, MCP server, or a combination
- whether README, docs, TODO, and workplace conventions should be initialized now

Then read the relevant basic document selected by [architecture-rules.md](architecture-rules.md).

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
3. Put product behavior in product code, public APIs, CLI, or bundled runtime artifacts, not in skill prose.
4. Copy the miku-soft basic documents into `docs/` when initializing a miku-soft repository.
5. Add README and TODO entries that match the actual initial state.
6. Add focused tests or regression commands when there is executable behavior to protect.
7. Regenerate any repository indexes required by the target repository.
