# Markdown Structure Review

Use this reference to review whether Markdown documents are structurally valid,
readable, and safe to publish or commit.

This review focuses on Markdown mechanics and agent-readable structure rather
than wording. It checks title lines, heading hierarchy, fenced code blocks,
lists, tables, links, front matter, and other syntax-like structure.

## Review Priority

Use this review when the target is Markdown and the user asks for publication,
documentation, README, article, release note, final check, or repository review.

Use it before final publication when broken Markdown would affect rendering.

## Heading Checks

Check whether headings are well formed:

- one top-level `#` title when the document expects a single title
- the first visible title line is present, specific, and useful for identifying
  the document in search results, tabs, snippets, and agent context
- the top-level title describes the actual artifact, article, README, reference,
  review, or task rather than using a vague label such as "Notes" or "Draft"
- heading levels do not skip unexpectedly, such as `#` directly to `###`
- heading hierarchy reflects document structure
- headings are not empty
- headings do not include accidental punctuation such as `##.` unless intended
- duplicate headings are acceptable only when the context makes them clear
- title and section names match the content below them

Do not require a single `#` for all Markdown. Some fragments, issue comments,
release notes, and embedded sections may intentionally start at `##` or lower.

## AI Agent Readability Checks

Check whether an AI agent can understand the document's structure without
loading excessive context.

Good agent-readable Markdown usually:

- starts with a clear title or front matter title when the file is a standalone
  document
- has headings that work as a table of contents when skimmed with `rg "^#"`
- uses section titles that name the subject, not only the rhetorical flow
- keeps related instructions under the most specific relevant heading
- avoids long heading-free stretches where an agent cannot cheaply locate the
  right section
- uses stable, searchable terms in headings for important concepts, commands,
  file names, formats, or review areas
- avoids repeating identical generic headings such as "Details", "Notes", or
  "Other" when more specific headings would help navigation
- places summaries or overview sections before dense reference material when the
  document is large

For reference-heavy Agent Skills, README files, or long technical documents,
the title and headings should help an agent decide what to read next. If the
document has many sections, consider whether an index, summary, or map section
is needed.

When Markdown is used as input to a generated discovery index such as
`index.json`, check whether titles and first headings produce useful generated
summaries. A valid Markdown file can still be weak for agent discovery if its
first heading is vague, duplicated across many files, or unrelated to the
file's actual purpose.

Use [refactoring-need-review.md](../../10-perspectives/maintenance/refactoring-need-review.md) when Markdown has
grown by repeated additions and the issue is no longer one heading or fence, but
whether the document should be split, merged, summarized, renamed, or
reorganized.

Do not over-structure short notes, issue comments, or small fragments. The goal
is navigability, not ceremony.

## Fence and Block Checks

Check paired block markers:

- fenced code blocks using triple backticks are closed
- fenced code blocks using tildes are closed
- nested or adjacent fences do not confuse the intended block
- language identifiers are present when useful, such as `sh`, `json`,
  `markdown`, `text`, or `java`
- blockquotes do not accidentally swallow following sections
- HTML comments, details blocks, or raw HTML tags are closed when used
- front matter starts and ends correctly when required

Flag unclosed fences as high-priority Markdown issues because they can break the
rest of the rendered document.

## List, Table, and Link Checks

Check:

- list indentation is consistent
- nested lists render as intended
- numbered lists are not accidentally reset or mixed
- task list markers are valid, such as `- [ ]` and `- [x]`
- tables have matching column counts where practical
- table separator rows are valid
- links have labels and targets
- reference-style links have matching definitions
- images have usable alt text or clear purpose when public-facing
- relative links point to plausible repository paths

## Markdown Safety Checks

Check for Markdown content that may render unexpectedly:

- accidental autolinks exposing private URLs
- raw HTML that may be stripped or unsafe on the target platform
- unescaped angle brackets that look like tags
- accidental emphasis or strikethrough from underscores, asterisks, or tildes
- code fences inside Markdown examples that need longer fences
- front matter values containing colons or special characters that need quoting

## Severity Guidance

Use these severity levels:

- High: unclosed code fence, malformed front matter, or broken block structure
  changes rendering for a large part of the document.
- Medium: heading hierarchy, table syntax, link definitions, or list structure
  is likely to render differently than intended.
- Medium: a standalone Markdown document lacks a useful title or has headings
  too vague for agents to navigate reliably.
- Medium: long Markdown content has too few headings or no overview, making the
  intended structure hard to search or summarize.
- Low: minor heading level, language identifier, alt text, or formatting issue
  affects polish but not meaning.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Markdown Structure Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Structure readiness: ready / partial / broken / not checked
Agent readability: good / partial / weak / not checked
```

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

Do not reformat the whole document during review mode unless the user asks for
revision.
