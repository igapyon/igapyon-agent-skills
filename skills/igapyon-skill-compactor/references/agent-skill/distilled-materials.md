---
title: Distilled Materials
description: Rules for creating and maintaining curated runtime summaries under distilled.
topics:
  - distilled
  - runtime-token-efficiency
  - source-summaries
---

# Distilled Materials

Use `distilled/` for curated Markdown distilled from larger source materials
when repeated runtime work needs the distilled meaning rather than the full
source documents.

Distilled files should state:

- source material
- distillation viewpoint
- intended runtime use
- refresh trigger or owner expectation

Distilled Markdown front matter should include at least:

- `title`: short distilled topic name
- `description`: what distilled meaning the file provides and when it is useful
- `updated`: when the distilled content was materially updated
- `sources`: what source material or human input the distillation used

The distillation viewpoint is important. If it is not obvious, ask the human
before creating a distilled file. If the viewpoint is obvious from the task,
create the distilled file and report the viewpoint used.

When typical topics emerge across repeated work, propose distilled Markdown for
those topics. Ask the human to confirm the topic boundary and viewpoint before
placing files under `distilled/`, unless the topic and viewpoint are already
explicit in the user's request.

After creating distilled material, keep it maintainable:

- link it from `SKILL.md`, a reference file, or `index.json`-discoverable
  navigation
- refresh it when source material changes
- refresh it when human decisions change the intended viewpoint
- do not use `distilled/` as a dumping ground for arbitrary notes
