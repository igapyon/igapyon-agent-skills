# Node.js CLI Review

Use this review note for miku-soft `10 Main Application` repositories that
provide a Node.js CLI.

This review perspective is specific to the miku-soft series. The CLI is a
formal local entry point for scripts, AI agents, tests, downstream Agent
Skills, Java straight conversion, and later protocol adapters.

## Classification

Apply this review when the target repository or artifact has this shape:

- layer: `10 Main Application`
- CLI shape: Node.js CLI
- expected use: local batch execution, automation, or AI-agent workflow
- runtime artifact: source CLI, package CLI, bundled single-file `.mjs`, or a
  documented build path that produces one of these

If the repository also has a Single-file Web App, review the Web App separately
with `single-file-web-app.md`. This is common in historical combined
repositories. The CLI review focuses on command contracts, local execution,
structured artifacts, diagnostics, and downstream runtime usability.

## Core Contract

A miku-soft Node.js CLI should satisfy these principles:

- It runs locally without requiring a hosted backend.
- During normal operation, it does not communicate over the network unless the
  user explicitly requested a URL or remote operation.
- It is a first-class product surface.
- It preserves the product's semantic center and artifact vocabulary.
- It has clear input, output, diagnostics, and failure contracts.
- It is usable from automation and AI agents without interactive prompts for
  normal operations.
- It keeps product semantics in shared core logic, with CLI code limited to
  option parsing, file I/O, stdout, stderr, process exit, and runtime adapters.

## Input and Option Checks

Check these points:

- required inputs are explicit through arguments, options, files, or stdin
- optional modes have documented defaults and stable accepted values
- mutually exclusive options are validated before processing starts
- unsafe combinations, such as directory mode plus single-output-file semantics,
  are rejected or clearly defined
- path inputs have clear base-directory semantics
- relative paths, absolute paths, and `..` handling are documented and tested
  when the CLI reads local files
- stdin JSON contracts, when present, have documented schema, examples, and
  validation behavior
- text encodings, BOM behavior, line endings, and binary-safe paths are
  explicit when they affect outputs
- `--help` describes the real contract rather than only listing flags
- `--version` and `--help` work without normal input files or stdin payloads

## Primary User Interface Style Checks

Choose CLI interface style from the primary user, not from implementation
convenience.

For human-primary CLIs:

- prefer ordinary command arguments and options for the mainstream workflow
- keep common examples copy-pasteable from README
- use stdin only when it is natural for the domain, such as piping text
- keep JSON modes available only when they add automation value
- make help concise enough for humans while still documenting defaults and
  output locations

For AI-agent-primary or automation-primary CLIs:

- prefer request JSON on stdin and result JSON on stdout for the mainstream
  workflow
- include a top-level schema or contract version such as `version: 1`
- reject unknown request fields instead of silently ignoring likely agent typos
- return expected validation failures, skips, truncation, unsafe requests, and
  domain warnings in structured result JSON whenever possible
- pretty-print stdout JSON with stable formatting, normally two-space
  indentation and a trailing newline
- keep `--version` and `--help` as plain-text stdout exceptions so runtime
  artifacts can be smoke-tested without preparing request JSON

Hybrid CLIs may support both styles, but one mainstream style should be clear.
Do not make humans hand-write large JSON for a human-primary tool, and do not
make agents scrape human-formatted text for an agent-primary tool.

## Output and Artifact Checks

Check these points:

- primary output is written to stdout or an explicitly specified output path
- warnings, progress, and diagnostics do not corrupt primary stdout output
- binary artifacts are written to files by default, not printed raw to stdout
- JSON output has stable object shape, field names, ordering rules where
  relevant, and documented diagnostics
- Markdown, HTML, SVG, ZIP, XLSX, XML, or other generated artifacts have stable
  naming and role definitions
- sidecar artifacts such as asset directories or manifest files are documented
  and traceable to the input
- output filenames are predictable from product name, input name, mode, or
  explicitly supplied paths
- generated outputs are deterministic enough for tests, diffs, and release
  review when the format allows it

## Diagnostics and Exit Code Checks

Diagnostics are formal output surfaces in miku-soft CLIs. They are not just
debug logs.

Check these points:

- success and failure are judgeable by exit code
- validation errors fail before producing misleading partial output
- skipped, unsupported, lossy, fallback, approximate, or limit-reached behavior
  is visible through diagnostics
- diagnostics can be emitted as structured JSON when the product has AI-facing
  or automation-heavy workflows
- verbose or progress output is clearly separated from primary output and
  structured diagnostics
- progress logs use recognizable prefixes or channels and are fixed in tests
  when they are part of the contract
- error messages identify the affected input path, option, artifact, or
  operation when practical

## stderr Style Checks

Use stderr deliberately. The expected stderr style depends on whether stdout is
machine-readable JSON or a human-facing primary artifact.

For JSON-stdout CLIs:

- stdout remains parseable as the result JSON
- progress, verbose logs, and unexpected runtime-level messages go to stderr
- expected validation failures, unsafe requests, skipped files, decode errors,
  truncation, and domain warnings are represented in stdout result JSON when a
  reliable result object can be built
- malformed stdin, invalid CLI invocation, or unexpected runtime errors may use
  stderr-only reporting when result JSON cannot be built reliably
- exit code remains authoritative even when stdout JSON is present

For file-output or human-argument CLIs:

- stderr carries warnings, progress, and error summaries that should not be
  written into output files
- stdout is used only for the primary text artifact, summaries requested by the
  user, or explicit machine-readable modes
- verbose output has a recognizable prefix or option gate such as `--verbose`
- stderr content is stable enough for smoke tests when downstream tools rely on
  it

Avoid a half-structured style where stdout contains partial JSON mixed with
plain logs, or stderr contains important machine-readable diagnostics that
agents must scrape to understand expected failures.

## Web App and Core Alignment Checks

When the repository also has a Web App surface, check these points:

- Web App and CLI call the same core logic or a clearly shared product contract
- defaults that affect conversion meaning are aligned, or documented as
  intentionally different
- output modes, diagnostics, warnings, summaries, and artifact roles use the
  same vocabulary
- runtime-specific differences stay in adapters for file I/O, DOM, download,
  encoding, XML parsing, ZIP saving, stdout, stderr, and exit code
- CLI code does not duplicate business logic that should belong to product core

The CLI may expose batch, directory, or automation-oriented features that do not
belong in the Web App. Treat those as CLI-side operational extensions only when
their semantics and artifact roles are documented.

## Node and Java Sort Parity Checks

Some miku-soft Node.js products later receive Java straight conversions. Review
string sorting as an explicit compatibility contract because JavaScript and
Java defaults can differ.

Check these points:

- ordered paths, diagnostics, generated indexes, archive entries, reports, and
  JSON arrays have documented sort keys and comparator semantics
- machine-facing path and diagnostic-code ordering uses deterministic UTF-16
  code unit order when Java parity is expected, equivalent to Java
  `String.compareTo`
- human-facing Japanese ordering uses an explicit locale collation rule and a
  deterministic tie-breaker, not ambient runtime defaults
- JavaScript code does not use bare `localeCompare`, `Array.prototype.sort()`
  on strings, object key iteration, `Map` insertion order, or filesystem
  traversal order as an implicit product order
- Java code does not use `Collator`, `Collections.sort`, `TreeMap`, `TreeSet`,
  `Path.compareTo`, or filesystem traversal order without checking that the
  resulting order matches the Node contract
- numeric, date, tick, position, line, column, and outline ordering use numeric
  or domain-specific comparators rather than string comparison
- parity tests include names that reveal ordering differences, such as mixed
  ASCII and Japanese filenames or labels, when sorted output is part of the
  contract

If the repository intentionally changes sort behavior in the Java version,
review whether README, CLI docs, golden outputs, and migration notes describe
the difference as a product decision. Otherwise, treat Node/Java sort drift as
a parity defect.

## Local Safety Checks

Several miku-soft CLIs are intended for AI agents reading or searching local
workspaces. Review local safety as part of the product contract.

Check these points:

- local file access is scoped by explicit user input such as a root directory,
  input file, or allowlisted path
- the CLI does not silently expand from an explicit target to unrelated
  repository or home-directory content
- ignored files, binary files, size limits, and decode failures are handled
  intentionally
- absolute paths and parent-directory traversal are rejected or documented when
  the product allows them
- private or sensitive content is not sent to network services during normal
  operation
- output diagnostics make skipped files and safety decisions visible

## Network Policy Checks

Like miku-soft Single-file Web Apps, miku-soft CLIs are local-first tools.
Normal CLI operations should not communicate over the network.

Check these points:

- the CLI does not call remote APIs during normal conversion, search, read,
  validation, diagnostics, or artifact generation
- local input files and derived artifacts are not uploaded
- package registry, GitHub, CDN, update-check, telemetry, or model-provider
  access is not required during normal CLI execution
- any URL input mode is explicit in the command name, option name, or request
  schema
- optional network features are disabled by default and documented as such
- tests and smoke checks do not require network access unless they are clearly
  marked as integration or maintenance checks

Development-time dependency installation is not a normal CLI operation. Do not
confuse `npm install` or maintenance scripts with the product execution
contract.

## File I/O Predictability Checks

A miku-soft CLI should not perform surprising file input or output. Users and
AI agents should be able to predict which files will be read and written from
the command line, request JSON, and documentation.

Check these points:

- input files, input directories, roots, and stdin payloads are explicit
- output files, output directories, sidecar directories, and manifests are
  explicit or derived by a documented naming rule
- default output location is stdout or a clearly documented path, not an
  unexpected working-directory write
- generated sidecar files, such as assets or manifests, are named and placed
  predictably
- overwrite behavior is documented and guarded when destructive replacement is
  possible
- directory traversal, symlink handling, ignored files, and hidden files are
  documented or tested when relevant
- recursive directory processing has clear scope, exclusion, and limit rules
- dry-run, summary, or diagnostics make broad file effects visible when the CLI
  can touch many files
- errors identify which file or directory caused the problem

Treat unintuitive file I/O as a product risk even when the implementation is
technically correct. Local-first tools often handle private workspaces, so
surprise reads and writes are review findings.

## Runtime Bundle Checks

Some miku-soft CLIs produce a single-file Node.js runtime artifact for
downstream Agent Skills or local handoff.

Check these points when the repository has or should have such an artifact:

- the bundle artifact has a product-specific name such as
  `bundle/<product>.mjs`
- the source archive, when present, has a separate role such as
  `bundle/<product>-sources.tgz`
- runtime bundle and source archive are not confused with `npm pack` output
- the bundle starts without `npm install` in normal use
- `smoke:bundle` or equivalent verifies at least `--version` and `--help`
- release asset names include product and version
- README explains where downstream Agent Skills or local handoff should place
  or execute the runtime artifact

## Test and Documentation Checks

Check these points:

- README includes basic CLI examples for common local workflows
- strict contract details live in docs when the CLI surface is large
- tests cover option parsing, validation, success output, error output,
  diagnostics, and representative real or synthetic inputs
- package metadata exposes `bin`, `exports`, `types`, `files`, and Node engine
  constraints consistently when the repository is package-shaped
- TODO records known gaps in CLI contract, artifact roles, bundle generation,
  diagnostics, or downstream compatibility

## Severity Guidance

Use this severity guidance during Review mode:

- Critical: local input file contents or derived artifacts are sent to a remote
  service during normal CLI operation.
- High: the CLI performs network access during normal operation without an
  explicit user-requested remote mode.
- High: primary stdout output is mixed with warnings, progress logs, or
  diagnostics in a way that breaks automation.
- High: failures cannot be reliably detected by exit code.
- High: CLI behavior changes product semantics instead of calling or preserving
  shared product core.
- High: local file access escapes the documented root, input path, or safety
  boundary.
- High: the CLI writes, overwrites, or deletes files outside the documented
  output path, output directory, or sidecar location.
- Medium: `--help` or README examples do not describe the real input/output
  contract.
- Medium: the CLI interface style does not match the primary user, such as
  requiring large JSON for a human-primary workflow or emitting human text that
  agents must scrape for an agent-primary workflow.
- Medium: diagnostics for unsupported, skipped, lossy, fallback, or limit
  behavior are missing or too vague for users and agents to act on.
- Medium: stderr usage is ambiguous, making it unclear whether diagnostics,
  progress, expected failures, or runtime errors belong in stdout JSON, stderr,
  or output files.
- Medium: file input or output locations are technically valid but surprising,
  implicit, or hard to infer from the command and docs.
- Medium: Web App and CLI defaults or artifact vocabulary diverge without a
  documented runtime or workflow reason.
- Medium: Node and Java versions can emit different sorted paths, diagnostics,
  generated indexes, archive entries, reports, or JSON arrays because the sort
  order is undocumented or relies on runtime defaults.
- Medium: bundle artifacts are present but lack smoke checks, clear naming, or
  downstream placement instructions.
- Low: minor naming, docs, or package metadata issues make the CLI harder to
  discover without changing behavior.

## Review Output

When this review applies, include a short classification before findings:

```text
Node.js CLI Review

Layer: 10 Main Application
CLI shape: Node.js CLI
Execution contract: local batch / automation / AI-agent workflow
Primary output contract: stdout or explicit output files
Diagnostics contract: stderr or structured diagnostics
Runtime artifact: source CLI / package CLI / bundled single-file mjs
```

Then report findings in severity order. Do not edit files during Review mode
unless the user explicitly asks to switch from review to maintenance work.
