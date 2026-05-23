# JSON Agent Grepability Review

Use this reference to review whether JSON, JSONL, generated indexes, metadata
files, or machine-readable reports are easy for AI agents and command-line
tools to inspect with line-oriented search such as `rg` or `grep`.

This review is about operational readability, searchability, and choosing the
right JSON-family format, not just JSON validity or human pretty-printing.

## Review Priority

Use this review when the target includes:

- `index.json`
- `.jsonl` or newline-delimited JSON files
- generated discovery indexes
- JSON metadata files
- JSON reports intended for agents
- package or release metadata where line-oriented search is expected
- CLI JSON output examples that may be saved and searched
- small to medium JSON files committed to the repository

Use it together with generated artifact, Agent Skill, CLI UX, version
consistency, and repository handoff reviews when JSON is part of the workflow.

## JSON vs JSONL Format Choice Checks

Check whether the file uses the right format for its intended access pattern.

JSON is usually better when:

- the file represents one cohesive document or configuration
- there is important nested structure under a single root object
- tooling expects a normal JSON object or array
- the whole file is normally loaded and validated at once
- comments are not needed and a strict structured document is preferred
- stable pretty or compact formatting is enough for review

JSONL is often better when:

- the file is a stream, log, event list, report list, search index, or dataset
- each record can be processed independently
- agents or shell tools are expected to search, filter, append, split, or diff
  records line by line
- a single `rg` hit should return exactly one record
- large files should be processed without loading the entire file
- records are produced incrementally by a tool or pipeline

Flag format-choice issues when:

- a large array of independent records is stored as JSON even though JSONL would
  make search, append, streaming, or partial processing much easier
- JSONL is used for data that really needs one validated document with shared
  metadata, ordering semantics, or nested structure
- a file extension says `.json` but the content is JSONL, or `.jsonl` but the
  content is one JSON document
- docs, examples, or CLI output names do not make clear whether the format is
  JSON or JSONL
- downstream commands assume the wrong format, such as `jq '.files[]'` for JSONL
  or line filters for a normal JSON array

For JSONL, also check:

- each non-empty line is a complete valid JSON value, normally an object
- no trailing commas or array brackets are used
- one record per line is stable
- record keys are consistent enough for search and automation
- long text fields do not make grep results unusably large without a reason

Do not require JSONL merely because grep is useful. A compact one-record-per-line
JSON array can be the better choice when a file needs a root object with metadata
and also needs searchable entries.

## JSON Line-Oriented Search Checks

Check whether the JSON is formatted so important search hits appear at a useful
line granularity.

Good JSON for agent grepability usually:

- places one logical record or object on one line when line-level hits should
  identify that record
- keeps related fields on the same line when searching for one field should show
  the useful surrounding context
- breaks lines between records, groups, or array entries when separate hits
  should be reviewed independently
- avoids giant one-line JSON files when a hit would return too much unrelated
  content
- avoids overly expanded multi-line objects when a hit on a filename, key, or
  identifier loses nearby fields such as path, type, summary, or version

For example, a generated index may be easier for agents to search when each file
entry is one line:

```json
{
 "files": [
  {"name":"README.md","path":"README.md","ext":"md","summary":"Project README"},
  {"name":"SKILL.md","path":"SKILL.md","ext":"md","summary":"Agent Skill entrypoint"}
 ]
}
```

This style lets `rg "SKILL.md" index.json` return the whole useful record.

## Whitespace and Size Checks

Check whether indentation and whitespace are appropriate for the file's role.

Prefer:

- small indentation such as one or two spaces for generated JSON that is read by
  agents and committed often
- no unnecessary blank lines inside compact metadata arrays
- stable key ordering when diffs and grep results matter
- trailing newline at EOF for repository hygiene
- compact records when repeated entries are numerous

Avoid:

- four-space or deeply nested pretty-printing when it adds significant size
  without improving review
- minified one-line JSON when line-oriented search and diff review are expected
- inconsistent indentation that makes generated artifacts look hand-edited
- whitespace churn from changing formatters without a reason

Size is not the only concern. Compactness should not make records ambiguous or
hard to diff.

## Intentional One-Line Units

Some JSON should intentionally keep a unit on one line.

This is useful when:

- each array entry is an independently searchable record
- a hit on `name`, `path`, `id`, `version`, or `summary` should show the whole
  entry
- an agent is expected to use `rg` output directly to choose the next file or
  reference
- generated indexes would otherwise require loading the full file into context

One-line records are not the same as fully minified JSON. Keep structural lines
around arrays or top-level objects when they help orientation.

## When Pretty JSON Is Better

Prefer normal pretty JSON when:

- nested object structure is the main thing being reviewed
- values are long, multiline, or complex enough that one-line records become
  hard to read
- humans are expected to edit the file by hand
- tooling requires a conventional formatter
- line-oriented search is not a primary use case

When the role is unclear, preserve the existing project convention rather than
reformatting only for taste.

## Agent Skill `index.json` Checks

For igapyon-managed Agent Skills, generated `index.json` should normally be
easy to search by file name, path, extension, and summary.

Check whether:

- the generator scanned the intended directories and file types; `miku-indexgen`
  can be configured, so a present `index.json` is not enough by itself
- each file entry is searchable as one useful line, or there is an equally
  usable convention
- indentation is compact enough for frequent agent use
- entries include the fields agents need to choose references without opening
  everything
- summaries are meaningful and specific, not empty, duplicated, generic, or
  accidentally derived from a weak Markdown title
- important references, templates, assets, helper scripts, and metadata are
  present or intentionally excluded according to the skill's discovery model
- generated output is stable and not hand-edited
- JSON, compact JSON, or JSONL is chosen intentionally for the generator's
  access pattern
- `SKILL.md` tells agents to use `index.json` as a discovery index when needed
- a large reference-only skill has an intermediate Markdown overview when
  `index.json` alone is not enough to choose the right reference

## Severity Guidance

Use these severity levels:

- High: JSON is invalid, generated incorrectly, or too hard to inspect for its
  required automation role.
- Medium: JSON is used where JSONL would materially improve independent record
  search, streaming, appending, or partial processing.
- Medium: JSONL is used where a single JSON document is required for validation,
  shared metadata, or nested structure.
- Medium: file extension, docs, examples, or downstream commands disagree about
  whether the format is JSON or JSONL.
- Medium: JSON formatting prevents effective line-oriented search for files,
  records, versions, IDs, or summaries that agents need to find.
- Medium: `index.json` is present but lacks meaningful summaries or misses files
  that agents need for discovery.
- Medium: JSON is minified into one line even though it is committed for review,
  diffing, or agent discovery.
- Medium: repeated records are expanded across many lines, making grep hits lose
  the useful record context.
- Low: indentation or whitespace is larger than necessary but does not block
  agent use.

## Review Output

Use this format when JSON grepability is in scope:

```text
JSON Agent Grepability Review

Target: ...
Format: JSON / JSONL / unclear
Primary use: generated index / metadata / report / CLI output / package data / dataset / unclear
Format choice: appropriate / questionable / wrong / not checked
Line-oriented search readiness: good / partial / weak / not checked

Findings:
- Severity: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...
```

Do not reformat JSON during review mode unless the user explicitly asks to
switch to maintenance work.
