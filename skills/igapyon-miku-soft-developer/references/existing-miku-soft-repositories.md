# Existing igapyon miku-soft Repositories

This file summarizes public `igapyon` GitHub repositories whose names start with `miku`, checked on 2026-05-05.

Use this list as a naming reference before creating a new miku-soft project. Treat GitHub as the source of truth when exact current availability matters.

Source:

- https://api.github.com/users/igapyon/repos?per_page=100&sort=full_name
- https://api.github.com/users/igapyon/repos?per_page=100&page=2&sort=full_name

## Naming Pattern

- Older base applications may use compact `miku...` names, such as `mikuproject` and `mikuscore`.
- New base applications should start with `miku-` and use the `miku-<domain>` pattern.
- Java companion repositories use `-java`.
- Agent Skill companion repositories use `-skills`.
- MCP companion repositories use `-mcp`.
- Avoid using a companion suffix for the first base application unless that repository is specifically the companion layer.

## Repository List by miku-soft Layer

### 10 Main Applications

These are base product repositories. New repositories in this layer should prefer `miku-<domain>`.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-abc-player` | HTML | ABC-centered single-file web app for ABC, MusicXML, MIDI, and MuseScore preview, playback, editing, and export. |
| `miku-docx2md` | HTML | Browser-local DOCX to Markdown conversion. |
| `miku-grep` | TypeScript | Grep-style text search tool. |
| `miku-indexgen` | TypeScript | Generates flat `index.json` and optional `index.md` for reference discovery. |
| `miku-readfile` | TypeScript | Local-first CLI for reading explicitly selected text files as JSON. |
| `miku-unicode-guard` | TypeScript | CLI tool for detecting suspicious Unicode characters in Markdown and source files. |
| `miku-xlsx2md` | JavaScript | Single-file Web App for extracting Excel workbook content as Markdown. |
| `mikuproject` | JavaScript | Single-file Web App for MS Project XML conversion, WBS reports, and AI-facing JSON views. |
| `mikuscore` | JavaScript | MusicXML-first score converter for notation and AI workflow bridges. |

### 20 Java Applications

These are Java companion repositories and use the `-java` suffix.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-grep-java` | Java | Java companion for `miku-grep`. |
| `miku-indexgen-java` | Java | Java companion for `miku-indexgen`, including CLI and Maven plugin support. |
| `miku-readfile-java` | Java | Java companion for `miku-readfile`. |
| `miku-xlsx2md-java` | Java | Java companion for `miku-xlsx2md`. |
| `mikuproject-java` | Java | Java companion for `mikuproject`. |
| `mikuscore-java` | Java | Java companion for `mikuscore`, currently in progress. |

### 40 Agent Skills

These are Agent Skills companion repositories and use the `-skills` suffix.

| Repository | Language | Notes |
| --- | --- | --- |
| `miku-grep-skills` | JavaScript | Agent Skills package for structured local grep workflows. |
| `miku-readfile-skills` | JavaScript | Agent Skills package for `miku-readfile`. |
| `mikuproject-skills` | JavaScript | Agent Skills package for `mikuproject` workflows. |
| `mikuproject-skills-java` | JavaScript | Abandoned project. Out of maintenance scope and not an active naming precedent. |
| `mikuscore-skills` | JavaScript | Agent Skills package for `mikuscore` music and score workflows. |

### 50 MCP Servers

These are MCP server companion repositories and use the `-mcp` suffix.

| Repository | Language | Notes |
| --- | --- | --- |
| `mikuproject-mcp` | JavaScript | Local stdio MCP server adapter for `mikuproject`. |
