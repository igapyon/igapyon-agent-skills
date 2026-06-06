# miku-soft Architecture Rules

This file is the short entry point for explicit `igapyon-miku-soft-developer` workflows.

Detailed miku-soft design rules live under [miku-soft-basic/](miku-soft-basic/). Do not duplicate those rules here.

Do not copy the shared basic documents into each miku-soft project repository.
Project repositories should link to the installed `igapyon-miku-soft-developer`
skill through `docs/miku-soft-reference.md` and keep project-specific
reference revisions in development or worklog documents.

## Basic Document Selection

Read only the document needed for the current task:

- [miku-soft-basic/miku-soft-00-overview-design.md](miku-soft-basic/miku-soft-00-overview-design.md): overall miku-soft stance and product-type overview
- [miku-soft-basic/miku-soft-10-mainapp-design.md](miku-soft-basic/miku-soft-10-mainapp-design.md): TypeScript / Node.js main application, product core, CLI, diagnostics, structured artifacts, and runtime bundles
- [miku-soft-basic/miku-soft-11-web-design.md](miku-soft-basic/miku-soft-11-web-design.md): Web App surface, Single-file Web App distribution, browser adapters, `lht-cmn`, preview, diagnostics, and download behavior
- [miku-soft-basic/miku-soft-20-javaapp-design.md](miku-soft-basic/miku-soft-20-javaapp-design.md): Java CLI, Java runtime boundary, packaging, and Java-side maintenance
- [miku-soft-basic/miku-soft-21-java-maven-design.md](miku-soft-basic/miku-soft-21-java-maven-design.md): separated Maven plugin repositories for Java runtimes
- [miku-soft-basic/miku-soft-30-straight-conversion.md](miku-soft-basic/miku-soft-30-straight-conversion.md): Node.js / TypeScript to Java straight conversion
- [miku-soft-basic/miku-soft-40-agentskills-design.md](miku-soft-basic/miku-soft-40-agentskills-design.md): Agent Skills versions and agent-facing local workflow packages
- [miku-soft-basic/miku-soft-50-mcp-design.md](miku-soft-basic/miku-soft-50-mcp-design.md): MCP server versions, tools, resources, prompts, transport, and protocol adapter boundaries

Use [miku-soft-ai-era-cli-interface.md](miku-soft-ai-era-cli-interface.md)
when designing or reviewing CLI help, runtime contracts, machine-readable
outputs, generated artifacts, overwrite behavior, and AI-agent-facing execution
boundaries across any miku-soft layer.

Use
[miku-soft-ai-era-markdown-front-matter.md](miku-soft-ai-era-markdown-front-matter.md)
when designing or reviewing Markdown front matter, document metadata,
provenance fields, generated index contracts, and agent-readable Markdown
authoring conventions across any miku-soft layer.

## Short Rule

Keep product semantics in the product core or upstream runtime artifacts. Treat
Web Apps, CLI, Java CLI, Agent Skills, and MCP as entrypoints or adapters
unless the relevant basic document says otherwise.

## Cross-Runtime Ordering Rule

When a miku-soft product needs deterministic ordering for file paths,
generated artifacts, reports, indexes, bundle contents, diagnostics, or other
user-visible structured output, prefer comparing normalized relative path
strings by UTF-16 code unit order.

Normalize local paths to POSIX-style `/` separators before comparing. Do not
use locale collation, language-specific sort order, natural sort, or numeric
sort unless the product-specific specification explicitly requires it.

This rule is preferred because UTF-16 string comparison is available and
straightforward to align across Node.js, browser JavaScript, and Java. It keeps
Node / Java straight-conversion output parity easier to test and avoids hidden
differences caused by platform locale, ICU / CLDR version, or runtime-specific
collation behavior.

## Early Sister Reference Rule

For new creation in any miku-soft layer, inspect the closest same-layer sister
repository early, before designing repository shape, runtime layout, release
assets, tests, or public contracts.

Use the matching layer as the first reference:

- 10 main application work: similar suffixless `miku` main applications with TypeScript / Node.js core or CLI shape
- 11 Web App work: similar Web App repositories or historical combined repositories with a comparable Web surface
- 20 Java application work: similar `-java` companion repositories
- 40 Agent Skills work: similar `-skills` companion repositories
- 50 MCP work: similar `-mcp` companion repositories, and the related
  `-skills` repository when tool and artifact vocabulary must align

Prefer local checkouts under `workplace/` or `workplace/upstream/`. If no
same-layer sister checkout exists locally, record that absence and name the
closest public or documented reference used instead. Before scaffolding or
initial file design, summarize which sister project was checked and which
concrete decisions it influenced. Do not copy a sister repository wholesale
into the target.

## Separation Workflow Rule

When separating a historical combined repository, use the layer-specific
separation workflow before moving or deleting files:

- [31-java-maven-plugin-separation-workflow.md](31-java-maven-plugin-separation-workflow.md): split a Maven plugin adapter from a Java runtime repository
- [32-node-web-separation-workflow.md](32-node-web-separation-workflow.md): split a Web App surface from a TypeScript / Node.js main application repository
