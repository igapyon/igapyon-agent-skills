# Diary Writer Workflow

## Boundary

- `diary`: igapyon's own diary data repository and diary content source of truth.
- `igapyonv3`: Java processing and generation system for `diary`.
- `mikuku-articles`: Mikuku-authored article repository, not diary data.
- `igapyon-note-writer`: Note article management for Mikuku-authored articles, not igapyon diary writing.

Do not use this skill for Mikuku-authored Note articles. Do not read `mikuku-articles` or `igapyon-note-writer` as diary style references unless the user explicitly asks to compare repository boundaries.

## Canonical Local Layout

Use repository-relative paths from `igapyon-agent-skills`:

- diary data: `../diary/`
- diary source entries: `../diary/YYYY/igYYMMDD.src.md`
- generated diary Markdown: `../diary/YYYY/igYYMMDD.md`
- generated fake HTML Markdown: `../diary/YYYY/igYYMMDD.html.md`
- processing system: `../igapyonv3/`

When working from this repository's `workplace/` clones during investigation, treat them as temporary inspection copies only. Do not treat `workplace/diary` or `workplace/igapyonv3` as the canonical write target.

## Core Workflow

1. Identify the target date and diary file name.
   - `YYYY-MM-DD` maps to `../diary/YYYY/igYYMMDD.src.md`.
   - Example: `2026-01-03` maps to `../diary/2026/ig260103.src.md`.
2. Inspect the existing diary entry for that date if it exists.
3. Read [diary-structure.md](diary-structure.md) when creating a new entry, creating a year index, checking repository structure, or reasoning from the 2025/2026 diary patterns.
4. Inspect nearby diary entries when style continuity is needed.
5. For processing-rule questions, inspect `../igapyonv3/` source or docs.
6. Write or revise only the `.src.md` source unless the user explicitly asks to handle generated files.
7. If generation is requested or needed for verification, use the diary repository's established Maven flow.
8. Report modified source files and any generation or verification results.

## Diary Source Rules

Diary entries are `.src.md` files and may include `igapyonv3` FreeMarker directives. Keep diary source compatible with `igapyonv3`.

Common patterns:

- Start content sections with `## ` headings.
- Keep the first meaningful `## ` heading suitable as the entry title because `igapyonv3` title parsing relies on it.
- Use `<@lastmodified date="YYYY-MM-DD"/>` when an entry needs an explicit last-modified marker.
- Use `## 関連する日記` or `### 関連する日記` with `<@linkdiary date="YYYY-MM-DD" />` for related diary links when applicable.
- Preserve existing directives, keyword links, memo links, and local navigation conventions.
- Do not edit generated `.md`, `.html.md`, `.html`, Atom, index, or keyword files unless the user explicitly asks or generation produces them.

For details about observed 2025/2026 structure, related diary links, and igapyonv3 custom tags/methods, read [diary-structure.md](diary-structure.md).

## Style Guidance

Write as igapyon's diary, not as Mikuku.

- Prefer concise diary prose grounded in actual events, work, observations, and technical notes.
- Do not add Mikuku markers, virtual character phrasing, or Note article voice.
- Do not invent events, dates, URLs, releases, results, or personal observations.
- If source facts are missing, ask briefly or mark the gap as unresolved.

## Verification

For diary source-only edits, at minimum confirm:

- target file path
- first `## ` heading exists and matches the intended diary title
- no accidental Mikuku/Note framing was introduced

When processing verification is requested, run from `../diary/`:

```sh
mvn clean exec:java@igdiary antrun:run
```

If the command fails because dependencies or network access are unavailable, report the failure and the exact verification gap.

## Do Not

- Do not use `diary` as a source of truth for Mikuku-authored articles.
- Do not use `igapyonv3` as a Mikuku article processing system.
- Do not move content between `diary` and `mikuku-articles` without an explicit user request.
- Do not overwrite generated files by hand when the proper path is to regenerate them.
- Do not change `igapyonv3` processing code unless the user explicitly asks for processing-system changes.
