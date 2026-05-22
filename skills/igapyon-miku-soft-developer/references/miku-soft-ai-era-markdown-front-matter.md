# AI-Era Markdown Front Matter Principles

This document defines common Markdown front matter principles for miku-soft
repositories in the AI-agent era.

It applies to Markdown documents that may be read by humans, scripts, indexers,
Agent Skills, MCP servers, or generative AI agents.

## Purpose

Markdown front matter is authoring metadata for humans, tools, and AI agents.
It helps readers and automation understand a document before reading the full
body.

In the AI-agent era, front matter is not only a publishing convenience. It can
help agents decide whether a document is worth reading, whether the document is
current, who the intended reader is, and which sources were used to create or
materially update it.

At the same time, front matter must not become an uncontrolled machine-readable
contract. A downstream tool may parse front matter as YAML, but it should treat
only documented fields and supported value shapes as part of its stable
contract.

## Scope

These principles apply to Markdown documents across miku-soft repositories,
including:

- README files
- design notes
- specifications
- workflow documents
- Agent Skills references
- generated or maintained documentation inputs
- article drafts when they are kept in repository form

Product-specific tools such as `miku-indexgen` may define narrower extraction
rules. Those tool-specific specifications should refer back to this document
instead of redefining the general front matter philosophy.

## Core Principles

- Treat Markdown front matter as authoring metadata, not as an open-ended
  indexed database.
- Parse front matter as YAML when a tool supports front matter parsing.
- Let authors use ordinary YAML forms for documented fields.
- Extract only documented metadata fields into downstream machine-readable
  artifacts.
- Ignore unknown fields unless a tool explicitly documents support for them.
- Ignore unsupported value shapes for documented fields.
- Prefer top-level scalar fields and string-array fields for common metadata.
- Allow explicitly documented structured fields when flattening would lose
  important meaning.
- Do not mirror arbitrary nested objects into generated indexes.
- Distinguish source Markdown from generated artifacts such as `index.json`.
- Keep generated index contracts compact, predictable, and stable enough for
  agents and scripts.

## Authoring Metadata vs Indexing Contract

Front matter belongs first to the source Markdown document. It may contain
metadata that is useful to authors even when no downstream tool indexes it.

A generated index or machine-readable artifact has a narrower contract. It
should include only documented fields whose names, value shapes, and semantics
are stable enough for consumers.

This boundary is intentional:

```text
Markdown front matter is authoring metadata.
Generated indexes expose only documented supported metadata.
```

Unknown front matter fields may remain useful to authors, but they must not
silently become indexed or agent-facing contract fields.

## Recommended Common Fields

Use these fields when they fit the document:

| Field | Recommended shape | Meaning |
|---|---|---|
| `title` | string | Human-readable document title. |
| `description` | string | Short explicit summary written by the author. |
| `topics` | string array | Practical search and grouping terms. |
| `category` | string | Document kind, such as `reference`, `guide`, `workflow`, `example`, `template`, or `spec`. |
| `status` | string | Document state, such as `draft`, `stable`, or `deprecated`. |
| `audience` | string array | Intended readers, such as `agent`, `user`, `maintainer`, or `developer`. |
| `created` | `YYYY-MM-DD` string | Date when the document was first created. |
| `updated` | `YYYY-MM-DD` string | Date when the document content was materially updated. |
| `sources` | object array | Primary inputs used to create or materially update the document. |

Tool-specific specifications may support only a subset of these fields.

## YAML Authoring Rules

Use spaces for indentation. Tab characters in indentation are not supported and
may cause Markdown preview tools or YAML parsers to reject the document.

Use ordinary YAML scalar and array forms:

```yaml
title: Runtime operations map
topics:
  - miku-indexgen
  - runtime
  - command-line
```

Inline arrays are acceptable when they remain readable:

```yaml
topics: [miku-indexgen, runtime, command-line]
```

Folded strings are acceptable for fields such as `description`:

```yaml
description: >
  CLI runtime selection, command examples, and backend policy for miku-indexgen.
```

## Date Metadata

Use `created` and `updated` instead of a generic `date` field when the document
needs lifecycle metadata.

- `created`: the date when the document was first created; normally stable
- `updated`: the date when the document content was materially updated

Use `YYYY-MM-DD` for both fields. Treat these as date-only values without a
time zone.

Do not update `updated` for purely mechanical changes such as regenerating an
index file.

## Sources Metadata

`sources` records the primary inputs used to create or materially update the
document. It is provenance metadata, not a complete citation database.

This field should support more than external URLs. Agent-facing documents are
often based on upstream documentation, source code, local runtime artifacts,
generated outputs, manual verification, and human-provided requirements from
prompts.

Use `sources` as an object array when source provenance matters.

Recommended source object fields:

| Field | Shape | Meaning |
|---|---|---|
| `type` | string | Required source kind. |
| `role` | string | Optional role such as `primary`, `supporting`, or `verification`. |
| `label` | string | Optional human-readable source label. |
| `url` | string | Optional external source URL. |
| `path` | string | Optional repository or local path. |
| `version` | string | Optional version, tag, release, or artifact identifier. |
| `checked` | `YYYY-MM-DD` string | Optional date when the source was accepted or verified. |

Recommended `type` values:

- `upstream-doc`
- `upstream-release`
- `source-code`
- `local-file`
- `local-runtime`
- `generated-output`
- `manual-verification`
- `human-input`

Recommended `role` values:

- `primary`
- `supporting`
- `verification`

Example:

```yaml
sources:
  - type: human-input
    label: user-provided front matter design requirements
    role: primary
    checked: 2026-05-22
  - type: local-runtime
    path: skills/igapyon-miku-indexgen/runtime/miku-indexgen-1.2.1.jar
    version: 1.2.1
    role: verification
  - type: upstream-release
    url: https://github.com/igapyon/miku-indexgen-java/releases/tag/v1.2.1
    version: v1.2.1
    role: supporting
    checked: 2026-05-22
```

`sources` is an intentional exception to the shallow-field preference. It is
structured because source provenance loses important meaning when represented
as a plain string array.

Avoid free-form `sources[].notes` in the first version of a tool contract. It
can be added later if there is a concrete consumer and a documented shape.

## Unsupported Shapes

YAML validity does not automatically imply indexing support.

For example, this may be valid YAML, but it should not become supported indexed
metadata unless a downstream tool explicitly documents it:

```yaml
topics:
  - name: runtime
    weight: 10
```

Likewise, nested metadata objects should not be mirrored into generated indexes
by default:

```yaml
metadata:
  category: reference
  status: stable
```

The intended boundary is:

```text
Front matter may be valid YAML.
Generated indexes include only documented fields with documented value shapes.
```

## Generated Artifacts

Generated artifacts such as `index.json` are downstream outputs. They should
not be hand-maintained as the source of truth for front matter metadata.

When generated artifacts include front matter-derived metadata, the artifact
specification should state which fields are included and how unsupported values
are handled.

Agents should edit source Markdown when changing metadata, then regenerate the
generated artifact with the documented command.

## Relation to miku-indexgen

`miku-indexgen` front matter support is a product-specific application of this
document.

The `miku-indexgen` specification should define:

- which front matter fields are extracted into `index.json`
- which YAML value shapes are supported
- how unsupported shapes are ignored
- whether values are normalized
- which generated fields are stable for consumers
- where detailed JSON and front matter specs live

This document defines the broader miku-soft policy. The `miku-indexgen`
specification defines the concrete runtime contract for that tool.

## Review Checklist

When reviewing Markdown front matter use in a miku-soft repository, check:

- Does front matter help agents and humans decide whether to read the document?
- Are common fields named consistently?
- Are dates explicit as `created` and `updated`?
- Is source provenance represented when it matters?
- Are generated artifacts clearly separated from source Markdown?
- Does any tool extract only documented fields?
- Are unknown fields and unsupported shapes ignored rather than mirrored?
- Is the downstream contract compact enough for scripts and agents?

If these answers are unclear, the repository probably needs either a narrower
tool-specific specification or a clearer documentation convention.
