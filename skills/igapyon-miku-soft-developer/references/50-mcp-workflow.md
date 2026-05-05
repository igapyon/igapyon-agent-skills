# MCP Workflow

Use this workflow for creating or maintaining a miku-soft MCP server.

Detailed design guidance lives in [miku-soft-basic/miku-soft-50-mcp-design-v20260501.md](miku-soft-basic/miku-soft-50-mcp-design-v20260501.md). Keep this file as the execution checklist.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the MCP basic document.
3. Inspect upstream product contracts, existing MCP tools/resources/prompts, schemas, runtime artifacts, tests, README, docs, TODO, and generated indexes.

## Checklist

1. Treat the MCP server as a protocol adapter over upstream product APIs, CLI runtime, or local files.
2. Keep tool names, input schemas, result schemas, resource URI roles, artifact roles, and error categories stable and documented.
3. Prefer local stdio execution as the first target unless the repository explicitly targets another transport.
4. Do not let client-specific compatibility behavior redefine product semantics or the core MCP contract.
5. Preserve diagnostics, warnings, and artifact roles in structured results.
6. Update README, docs, TODO, tests, contract files, and indexes when MCP surface changes.
