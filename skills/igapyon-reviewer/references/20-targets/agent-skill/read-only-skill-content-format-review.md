# Read-Only Skill Content Format Review

Use this reference to review whether a read-only or reference-only Agent Skill
stores bundled knowledge in the right content format.

Read-only skills usually do not bundle an MCP server, CLI runtime, Java jar,
Node `.mjs`, helper command, or executable tool. Their behavior depends on
bundled references, examples, templates, indexes, domain notes, writing
guidance, or review criteria.

## Review Priority

Use this review when an Agent Skill mainly packages information and the content
could be stored as Markdown, JSON, JSONL, XML, generated indexes, templates, or
converted source documents.

Use it together with:

- [Agent Skill Review](agent-skill-review.md)
- [Markdown Structure Review](../markdown/markdown-structure-review.md)
- [JSON Agent Grepability Review](../structured-data/json-agent-grepability-review.md)
- [XML Agent Grepability Review](../structured-data/xml-agent-grepability-review.md)
- [Generated Artifact Review](../artifacts/generated-artifact-review.md)

## Format Choice Checks

Check whether the file format matches the content's access pattern.

Markdown is usually better when:

- the content is explanatory guidance, policy, review criteria, examples, or
  long-form instructions
- headings, paragraphs, lists, and code fences help agents understand context
- the source came from document formats such as `.docx` or `.xlsx` that have
  already been converted for agent reading
- humans will review or maintain the content directly
- `index.json` can summarize the first heading or title usefully
- an intermediate `references/INDEX.md`, `SUMMARY.md`, or map file is needed

JSON is usually better when:

- the content is structured metadata, an index, a compact manifest, or a small
  machine-readable document
- one root object with shared metadata is useful
- the whole file is normally loaded or validated at once
- generated `index.json`-style discovery is the intended role

JSONL is usually better when:

- the content is a list of independent records
- records are appended incrementally
- agents or shell tools should search one line and get one full record
- the file may become large enough that streaming or partial processing matters
- logs, examples, findings, datasets, or event-like entries are stored

XML is usually better only when:

- an upstream format, schema, ecosystem, or tool contract requires XML
- Maven, plugin descriptors, manifests, or standards-based metadata are the
  actual source or target format

Do not choose JSON or JSONL merely because the data is "structured". If the
content is mostly human/agent guidance, Markdown is often the better primary
format, with `index.json` serving as generated discovery metadata.

## Source Document Conversion Checks

When the original input is `.docx`, `.xlsx`, or another office/document format,
check whether the skill stores the agent-readable converted form.

For read-only skills, Markdown is usually the stable target for converted
documents because it preserves enough structure for headings, tables, lists,
links, and examples while remaining easy for agents to inspect.

Flag issues when:

- source office documents are bundled without an agent-readable converted form
- converted Markdown loses important headings, tables, examples, or context
- the converted files are not discoverable from `SKILL.md`, `references/INDEX.md`,
  or `index.json`
- regenerated converted files are stale compared with the source documents

## Index and Auxiliary Data Checks

Check whether indexes and auxiliary files use the right format.

- generated discovery indexes are normally JSON, such as `index.json`
- append-only record collections may be better as JSONL
- human navigation maps are usually better as Markdown, such as
  `references/INDEX.md`
- templates intended for copying may be Markdown, text, JSON, XML, or another
  exact target format depending on what will be copied
- large generated indexes should be formatted for line-oriented search or split
  into a summary Markdown plus machine-readable metadata

## Flag Issues When

- explanatory guidance is stored in JSON or JSONL when Markdown would be easier
  for agents and humans to read
- independent appendable records are forced into a large JSON array when JSONL
  would be easier to append, stream, search, or diff
- an index or manifest is written as Markdown when agents or tools need stable
  machine-readable fields
- `.docx` or `.xlsx` source content is not converted into Markdown or another
  agent-readable format
- generated `index.json` exists but the actual reference content uses formats
  that make useful summaries impossible
- the chosen format is convenient for a generator but inconvenient for the
  agents that must use the skill

## Severity Guidance

Use these severity levels:

- High: the chosen format prevents agents from accessing important bundled
  knowledge or causes required generated discovery to fail.
- Medium: the chosen format is usable but creates avoidable search, append,
  streaming, or maintenance cost.
- Medium: source documents are bundled without a reliable agent-readable
  converted representation.
- Low: format choice is acceptable but could be documented or indexed better.

## Review Output

Use this format when content format choice is in scope:

```text
Read-Only Skill Content Format Review

Skill type: read-only / reference-only / mixed / unclear
Primary content format: Markdown / JSON / JSONL / XML / mixed / unclear
Format choice: appropriate / questionable / risky / not checked

Findings:
- Severity: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...
```

Do not convert or reformat content during review mode unless the user explicitly
asks to switch to maintenance work.
