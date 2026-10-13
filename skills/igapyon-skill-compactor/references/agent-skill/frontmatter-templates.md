---
title: Front Matter Templates
description: Templates and examples for miku-indexgen-friendly Markdown front matter.
topics:
  - front-matter
  - miku-indexgen
  - templates
  - index-routing
category: template
status: stable
audience:
  - agent
  - maintainer
created: 2026-06-09
updated: 2026-06-09
sources:
  - type: human-input
    label: user requested front matter samples and templates
    role: primary
    checked: 2026-06-09
  - type: local-file
    path: $CODEX_HOME/skills/igapyon-miku-indexgen/references/runtime/miku-indexgen-frontmatter-spec.md
    role: supporting
    checked: 2026-06-09
---

# Front Matter Templates

Use these templates when an adopted `index.json` or another documented
consumer benefits from Markdown front matter. Keep values concise and practical.

## Templates

- [../../templates/frontmatter-minimal.md](../../templates/frontmatter-minimal.md):
  minimal front matter skeleton for ordinary reference Markdown.
- [../../templates/frontmatter-distilled.md](../../templates/frontmatter-distilled.md):
  distilled Markdown skeleton with source, viewpoint, runtime use, and refresh
  rule sections.

## Examples

- [../../examples/frontmatter-reference-example.md](../../examples/frontmatter-reference-example.md):
  completed reference front matter example.
- [../../examples/frontmatter-distilled-example.md](../../examples/frontmatter-distilled-example.md):
  completed distilled front matter example with provenance.

## Distilled Front Matter Minimum

For distilled Markdown, include at least:

- `description`: what the distilled file provides and when to read it
- `updated`: material content update date
- `sources`: source materials or human input used for the distillation

## Authoring Rules

- Use spaces for YAML indentation.
- Prefer short scalar fields and simple string arrays.
- Keep `description` under 256 UTF-16 code units.
- Use practical `topics` when an adopted index or another documented consumer
  uses them to select files.
- Use `created` for original creation date and `updated` for material content updates.
- Do not update `updated` for a purely mechanical refresh of generated metadata.
- Use `sources` when provenance helps maintain distilled or derived documents.
