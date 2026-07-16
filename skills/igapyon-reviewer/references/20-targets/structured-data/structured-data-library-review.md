# Structured Data Library Review

Use this reference to review whether XML, JSON, JSONL, YAML, CSV, or other
structured data generation and parsing code uses an appropriate library and
processing model.

This review focuses on performance, memory use, correctness, maintainability,
streaming behavior, and license compatibility when choosing libraries.

## Review Priority

Use this review when the target includes:

- code that generates XML, JSON, JSONL, YAML, CSV, HTML, or structured metadata
- code that reads large structured input files
- converters such as docx/xlsx/text/JSON/XML/Markdown tools
- CLI tools that emit machine-readable output
- release or index generation tools
- build scripts that create structured artifacts
- library selection or dependency review for structured data handling

Use it together with rights/originality review when OSS dependencies are added,
and with completion, generated artifact, JSON grepability, XML grepability, CLI
UX, and package contents reviews when output files are part of the product
contract.

## Library Selection Criteria

When an OSS library is being selected or added, check criteria in this order:

1. License compatibility with the project's intended license, distribution
   model, and bundled artifact shape
2. Correctness for the target format, escaping rules, encoding, namespaces,
   schemas, ordering, and edge cases
3. Streaming support when inputs or outputs may be large
4. Memory behavior and performance under realistic file sizes
5. Maintenance status, security posture, and ecosystem maturity
6. API simplicity and fit with the project's language and build system
7. Deterministic output when diffs, tests, generated artifacts, or releases
   depend on stable files
8. Documentation and examples that reduce implementation risk

Do not choose a library only because it is popular. License fit and distribution
obligations must be checked before adoption, especially when the dependency is
bundled, shaded, copied into `lib/`, or redistributed in release assets.

## Streaming vs In-Memory Checks

Check whether the code uses the right processing model.

Streaming writers or parsers are often better when:

- input or output files may become large
- data is processed record by record
- JSONL, log, event, report, or index output is appendable or stream-like
- a CLI should start producing output without holding the whole result in memory
- memory use matters in CI, desktop, serverless, plugin, or agent environments
- XML output can be produced with a writer instead of constructing a full DOM
- JSON output can be produced with a generator/writer instead of building a full
  object tree
- generated XML can keep stable search-friendly line boundaries without
  buffering the entire document

In-memory object models are often acceptable or better when:

- files are small and bounded
- the output requires global sorting, cross-reference resolution, or whole-file
  validation
- the code needs schema-level transformations that are simpler with a tree
- readability and maintainability matter more than streaming complexity
- existing tests prove realistic memory use is safe

Flag issues when:

- large XML or JSON is built through string concatenation
- a full DOM/object tree is built for unbounded or user-supplied data without a
  reason
- output generation requires holding all records in memory even though order and
  metadata would allow streaming
- streaming output is used but makes error handling, validation, or deterministic
  ordering incorrect
- code hand-rolls escaping, quoting, namespace handling, or JSON syntax where a
  standard library writer would be safer

## XML Checks

For XML generation or parsing, check:

- XML escaping is handled by a library, not ad hoc string replacement
- encoding declaration and actual output encoding agree
- namespaces, prefixes, attributes, and element ordering are intentional
- large outputs use StAX, SAX, streaming writer APIs, or equivalent when useful
- DOM-style APIs are justified when whole-document operations are needed
- generated XML is validated or smoke-tested when consumers are strict

## JSON and JSONL Checks

For JSON and JSONL generation or parsing, check:

- a JSON library handles quoting, escaping, number/boolean/null values, and UTF-8
- JSONL emits one complete JSON value per line
- large record streams can be written incrementally when appropriate
- output ordering is deterministic when tests, diffs, or agents depend on it
- compact JSON, pretty JSON, or JSONL is chosen intentionally for the access
  pattern
- CLI JSON output does not mix logs with machine-readable stdout

## License and Redistribution Checks

When a structured-data library is OSS, check:

- dependency license is compatible with the project license and distribution
  model
- required notices, attribution, license text, and source availability are
  handled before release
- copied jars or bundled libraries under `lib/` include matching source
  artifacts or provenance where required by convention or license
- transitive dependencies are included in the license review when they are
  redistributed
- security or CVE status is acceptable for the release target

If the license is unclear, report it as a verification need before recommending
the library.

## Severity Guidance

Use these severity levels:

- High: selected OSS library has an incompatible or unchecked license for the
  intended release or redistribution model.
- High: code hand-rolls XML/JSON escaping or syntax in a way likely to produce
  invalid or unsafe output.
- High: implementation loads unbounded user input or large generated output into
  memory where streaming is clearly required.
- Medium: streaming library or writer would materially reduce memory use or
  improve performance, but current input sizes are not yet proven risky.
- Medium: deterministic output, encoding, namespace, or JSONL line contract is
  not tested.
- Medium: notices, source artifacts, or provenance for bundled structured-data
  libraries are missing or unclear.
- Low: library choice is acceptable but could be documented better.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Structured Data Library Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Target format: XML / JSON / JSONL / YAML / CSV / other / unclear
Processing model: streaming / in-memory / mixed / unclear
Library choice: appropriate / questionable / risky / not checked
License fit: compatible / unclear / risky / not checked
```

Do not replace libraries or rewrite generation code during review mode unless
the user explicitly asks to switch to maintenance work.
