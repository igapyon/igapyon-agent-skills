# Existing igapyon miku-soft Repositories

This file summarizes public `igapyon` GitHub repositories in the miku-soft
family, checked on 2026-05-17.

Use this list as a naming reference before creating a new miku-soft project.
Treat GitHub as the source of truth when exact current availability matters.

Source:

- https://api.github.com/users/igapyon/repos?per_page=100&sort=full_name
- https://api.github.com/users/igapyon/repos?per_page=100&page=2&sort=full_name
- local sibling checkouts under `/Users/igapyon/Documents/git`

## Naming Pattern

- Older base applications may use compact `miku...` names, such as
  `mikuproject` and `mikuscore`.
- New base applications should start with `miku-` and use the
  `miku-<domain>` pattern.
- Web App companion repositories use `-web`.
- Java companion repositories use `-java`.
- Separated Java Maven plugin repositories use `-java-maven`.
- Agent Skills companion repositories use `-skills`.
- MCP companion repositories use `-mcp`.
- Avoid using a companion suffix for the first base application unless that
  repository is specifically the companion layer.
- Catalog, documentation, or support repositories may use a descriptive
  `miku-soft-*` name when they are not a product runtime layer.

## Repository List by miku-soft Layer

### 10 Main Applications

These are base product repositories. New repositories in this layer should
prefer `miku-<domain>`.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-abc-player` | HTML | Historical combined / Web-centered repository for ABC, MusicXML, MIDI, and MuseScore preview, playback, editing, and export. |
| `miku-docx2md` | TypeScript | Node.js product core, CLI, CLI bundle, Web / adapter runtime bundle, tests, and upstream contract for DOCX to Markdown conversion. |
| `miku-grep` | TypeScript | Grep-style local text search tool. |
| `miku-indexgen` | TypeScript | Generates flat `index.json` and optional `index.md` for reference discovery. |
| `miku-md2docx` | TypeScript | Node.js product core and CLI for converting Markdown files into editable Word `.docx` files; Web surface is separated into `miku-md2docx-web`. |
| `miku-readfile` | TypeScript | Local-first CLI for reading explicitly selected text files as JSON. |
| `miku-text-bundle` | TypeScript | Collects repository text files into split Markdown bundles for generative AI handoff. |
| `miku-unicode-guard` | TypeScript | CLI tool for detecting suspicious Unicode characters in Markdown and source files. |
| `miku-xlsx2md` | JavaScript | Node.js product core, CLI, runtime bundle, tests, and upstream contract for extracting Excel workbook content as Markdown; Web surface is separated into `miku-xlsx2md-web`. |
| `mikuproject` | JavaScript | Historical combined repository for MS Project XML conversion, WBS reports, and AI-facing JSON views. |
| `mikuscore` | JavaScript | Historical combined repository for MusicXML-first score conversion and AI workflow bridges. |

### 11 Web Apps

These are Web App surfaces that depend on `10 Main Applications`. New
repositories in this layer should normally use a product-derived Web companion
name such as `<product>-web` when separated.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-docx2md-web` | TypeScript / HTML | Separated browser UI, Single-file Web App generation, `lht-cmn`, browser adapters, browser tests, and Web release artifact for `miku-docx2md`. |
| `miku-md2docx-web` | HTML | Separated browser UI, Single-file Web App generation, `lht-cmn`, browser adapters, browser tests, and Web release artifact for `miku-md2docx`. |
| `miku-xlsx2md-web` | HTML | Separated browser UI, Single-file Web App generation, `lht-cmn`, browser adapters, browser tests, and Web release artifact for `miku-xlsx2md`. |

Some historical combined repositories listed under `10 Main Applications` still
own their Web surface in the same repository. During future separation work,
treat browser UI, Single-file HTML artifacts, browser adapters, `lht-cmn`,
preview, and download behavior as `11 Web App` concerns.

As of the checked date, the remaining Web-surface historical combined
repositories are `mikuproject` and `mikuscore`.

### 20 Java Applications

These are Java companion repositories and use the `-java` suffix.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-docx2md-java` | Java | Java companion for `miku-docx2md`. |
| `miku-grep-java` | Java | Java companion for `miku-grep`. |
| `miku-indexgen-java` | Java | Java companion for `miku-indexgen`. |
| `miku-javaclass2json-java` | Java | Java-side tool for converting Java class structure to JSON; currently no separate suffixless main repository is tracked in this list. |
| `miku-md2docx-java` | Java | Java companion for `miku-md2docx`. |
| `miku-readfile-java` | Java | Java companion for `miku-readfile`. |
| `miku-text-bundle-java` | Java | Java companion for `miku-text-bundle`. |
| `miku-xlsx2md-java` | Java | Java companion for `miku-xlsx2md`. |
| `mikuproject-java` | Java | Java companion for `mikuproject`. |
| `mikuscore-java` | Java | Java companion for `mikuscore`. |

### 21 Java Maven Plugins

These are separated Maven plugin repositories for Java runtimes. Use this layer
when Maven plugin behavior should be maintained and released separately from
the Java CLI/runtime repository.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-docx2md-java-maven` | Java | Separated Maven plugin adapter for the `miku-docx2md-java` runtime. |
| `miku-indexgen-java-maven` | Java | Separated Maven plugin adapter for the `miku-indexgen-java` runtime. |
| `miku-xlsx2md-java-maven` | Java | Separated Maven plugin adapter for the `miku-xlsx2md-java` runtime. |

If an older Java repository still contains Maven plugin support internally,
treat plugin extraction as `21 Java Maven Plugin` separation work rather than a
new `20 Java Application` concern.

As of the checked date, no active Java repository in this list is known to
still contain an internal Maven plugin surface that should be separated.

### 40 Agent Skills

These are Agent Skills companion repositories and use the `-skills` suffix.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-grep-skills` | JavaScript | Agent Skills package for structured local grep workflows. |
| `miku-readfile-skills` | JavaScript | Agent Skills package for `miku-readfile`. |
| `miku-text-bundle-skills` | JavaScript | Agent Skills package for `miku-text-bundle`. |
| `mikuproject-skills` | JavaScript | Agent Skills package for `mikuproject` workflows. |
| `mikuscore-skills` | JavaScript | Agent Skills package for `mikuscore` music and score workflows. |

### 50 MCP Servers

These are MCP server companion repositories and use the `-mcp` suffix.

| Repository | Language | Notes |
| --- | --- | --- |
| `mikuproject-mcp` | JavaScript | Local stdio MCP server adapter for `mikuproject`. |

### Catalog and Support

These repositories are part of the miku-soft ecosystem but are not product
runtime layers.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-soft-catalog` | Markdown | Catalog / documentation repository for miku-soft design references and maintenance material. |

## Renamed or Removed Historical Names

These names are not active current repositories, but may appear in old notes,
worklogs, or local references.

| Repository | Status | Notes |
| --- | --- | --- |
| `mikuproject-skills-java` | Removed / renamed | Former abandoned Agent Skills-related name. It is not an active naming precedent. |
