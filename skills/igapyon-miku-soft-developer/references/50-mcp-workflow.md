# MCP Workflow

Use this workflow for creating or maintaining a miku-soft MCP server.

Detailed design guidance lives in [miku-soft-basic/miku-soft-50-mcp-design.md](miku-soft-basic/miku-soft-50-mcp-design.md). Keep this file as the execution checklist.

## Required Initial Input

At the beginning of new MCP server creation, require the
upstream miku main application GitHub repository URL and the upstream branch,
tag, release, commit, or runtime artifact version that should be treated as the
compatibility source.

Also require a sister-reference check for one or more similar existing miku
`-mcp` repositories under `workplace/` or `workplace/upstream/`. When the MCP
surface must align with an Agent Skills operation map or artifact vocabulary,
also inspect the related `-skills` sister repository. If no same-layer MCP
sister checkout exists locally, record that explicitly and name the closest
public or documented reference used instead.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the MCP basic document.
3. Inspect upstream product contracts, existing MCP tools/resources/prompts, schemas, runtime artifacts, tests, README, docs, TODO, and generated indexes.
4. For new creation, inspect the same-layer `-mcp` sister reference, and the related `-skills` reference when operation vocabulary must align, before designing files.
5. For new creation, before scaffolding or initial file design, summarize which sister project was used, which MCP product shape it represents, and which concrete protocol, repository-shape, runtime, or test decisions were adopted or rejected.

## Checklist

1. Treat the MCP server as a protocol adapter over upstream product APIs, CLI runtime, or local files.
2. Keep tool names, input schemas, result schemas, resource URI roles, artifact roles, and error categories stable and documented.
3. Prefer local stdio execution as the first target unless the repository explicitly targets another transport.
4. Do not let client-specific compatibility behavior redefine product semantics or the core MCP contract.
5. Preserve diagnostics, warnings, and artifact roles in structured results.
6. Treat the sister-reference summary as required implementation context for new creation work.
7. Update README, docs, TODO, tests, contract files, and indexes when MCP surface changes.
