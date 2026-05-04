# miku-soft Architecture Rules

This file is the short entry point for explicit `igapyon-miku-soft-developer` workflows.

Detailed miku-soft design rules live under [miku-soft-basic/](miku-soft-basic/). Do not duplicate those rules here.

Do not create or rely on a synchronization script for these documents. When a task requires copying or updating them, perform the copy as part of the explicit workflow and report the source and destination files.

## Basic Document Selection

Read only the document needed for the current task:

- [miku-soft-basic/miku-soft-00-overview-design-v20260427.md](miku-soft-basic/miku-soft-00-overview-design-v20260427.md): overall miku-soft stance and product-type overview
- [miku-soft-basic/miku-soft-10-mainapp-design-v20260501.md](miku-soft-basic/miku-soft-10-mainapp-design-v20260501.md): main application, Web UI, CLI, local-first behavior, diagnostics, and shared conventions
- [miku-soft-basic/miku-soft-20-javaapp-design-v20260501.md](miku-soft-basic/miku-soft-20-javaapp-design-v20260501.md): Java CLI, Maven, Java runtime boundary, packaging, and Java-side maintenance
- [miku-soft-basic/miku-soft-30-straight-conversion-v20260425.md](miku-soft-basic/miku-soft-30-straight-conversion-v20260425.md): Node.js / TypeScript to Java straight conversion
- [miku-soft-basic/miku-soft-40-agentskills-design-v20260501.md](miku-soft-basic/miku-soft-40-agentskills-design-v20260501.md): Agent Skills versions and agent-facing local workflow packages
- [miku-soft-basic/miku-soft-50-mcp-design-v20260501.md](miku-soft-basic/miku-soft-50-mcp-design-v20260501.md): MCP server versions, tools, resources, prompts, transport, and protocol adapter boundaries

When multiple basic documents have the same numbered topic, prefer the file with the newest `-v2026...` suffix.

## Short Rule

Keep product semantics in the product core or upstream runtime artifacts. Treat Web UI, CLI, Java CLI, Agent Skills, and MCP as entrypoints or adapters unless the relevant basic document says otherwise.
