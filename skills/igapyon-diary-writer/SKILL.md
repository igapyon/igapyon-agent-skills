---
name: igapyon-diary-writer
description: Use only when the user explicitly asks for igapyon-diary-writer, asks to create or update igapyon diary entries, asks to work with the diary repository as igapyon's own diary data, or asks for diary content that must follow igapyonv3 .src.md conventions. Do not use for Mikuku-authored Note articles, mikuku-articles, generic Japanese writing, or ordinary Markdown unless the diary repository or this skill is explicitly involved.
---

# igapyon-diary-writer

This skill handles igapyon's own diary data.

Use it for writing, updating, checking, or preparing entries in the `diary` repository. The canonical diary content is the GitHub repository `https://github.com/igapyon/diary`. In local work, assume the sibling path `../diary/` exists relative to this `igapyon-agent-skills` repository.

`igapyonv3` is the processing system for `diary`. Its GitHub repository is `https://github.com/igapyon/igapyonv3`; locally, assume sibling path `../igapyonv3/` exists when inspection is needed. Use `igapyonv3` only to understand or verify diary processing rules, such as `.src.md` conversion, generated `.md` / `.html.md`, index generation, keywords, and supported FreeMarker directives.

## When To Use

Use this skill when the user asks for:

- `igapyon-diary-writer`
- an igapyon diary entry
- `diary/YYYY/igYYMMDD.src.md` creation or revision
- checking diary source, generated Markdown, keyword, memo, index, or RSS behavior
- applying `igapyonv3` conventions to diary content
- preparing a diary entry from notes, events, repository work, release work, or daily observations

Do not use this skill for:

- Mikuku Note articles or `mikuku-articles`
- generic blog posts not intended for `diary`
- Qiita, Note, GitHub PR, GitHub Release, or social post writing unless the user explicitly connects it to diary content

## Workflow

Read [references/workflow.md](references/workflow.md) before creating, revising, checking, or verifying diary content.

Read [references/diary-structure.md](references/diary-structure.md) when you need the observed 2025/2026 diary structure, related diary section patterns, year index shape, keyword markers, or igapyonv3 custom directive list.

Read [references/igapyon-mikuku-writing-relationship.md](references/igapyon-mikuku-writing-relationship.md) when comparing igapyon and Mikuku writing, reasoning about their shared editorial origin, or deciding which Mikuku-specific traits must stay out of diary prose. Treat it as design background; reading it does not activate the Mikuku persona or make Mikuku articles the primary diary-style source.

Read [references/igapyon-diary-style-example.md](references/igapyon-diary-style-example.md) when drafting or substantially revising a reflective diary essay that combines personal experience, technical explanation, and a tentative hypothesis. Treat it as a user-approved style calibration example, not as a fixed template or a source of facts for other topics.

## Templates

- [templates/diary-entry-template.md](templates/diary-entry-template.md): normal diary source entry starting point
- [templates/year-index-template.md](templates/year-index-template.md): new year index starting point

The templates are starting shapes, not mandatory output text. Fill only sections supported by the user's facts. Remove optional placeholders when they are not needed.
