# CLI and Tool UX Review

Use this reference to review whether a CLI or local tool is easy to use for
humans, scripts, and AI agents.

This review focuses on `--help`, `--version`, `--verbose`, exit codes, stdout
and stderr behavior, diagnostics, JSON output, examples, and whether the tool's
contract is readable without inspecting source code.

## Review Priority

Use this review when a repository exposes a CLI, local command, script, Maven
plugin, Java jar entrypoint, Node runtime, MCP helper command, or agent-facing
tool.

Use it together with software completion, generated artifact, version
consistency, and repository entrypoint reviews when judging release readiness.

## Required Metadata Commands

Check these commands when applicable:

- `--help`
- `--version`
- `--verbose`

For released tools, `--help` and `--version` should normally work without
requiring input files, stdin payloads, network access, workspace state, or
environment secrets.

## `--help` Checks

Review whether help output is useful to both humans and AI agents:

- states what the tool does in concrete terms
- shows the primary usage form
- lists required arguments and options
- explains default values when they affect output
- identifies input and output roles
- shows copy-pasteable examples
- describes stdin/stdout behavior when relevant
- distinguishes human-readable output from JSON or machine-readable modes
- mentions important limitations, unsafe cases, or unsupported inputs
- uses stable option names that match README and implementation
- is concise enough to scan but complete enough to use without reading source

AI-agent-readable help should make the command contract explicit. An agent
should be able to infer which files or JSON fields to provide, what output to
expect, and which errors are expected validation failures.

Flag help issues when:

- help only lists flags without explaining workflow
- examples are missing, stale, or not copy-pasteable
- options appear in README but not help, or help but not implementation
- required input/output semantics are unclear
- help output is too conversational or decorative for automation use

## `--version` Checks

Check whether version output:

- works without normal inputs
- is stable and parseable enough for smoke tests
- agrees with package metadata, Maven metadata, release tag, artifact filename,
  and generated runtime metadata
- does not include noisy logs or warnings on stdout
- includes product name when multiple tools may be installed

Plain text is acceptable for `--version`. It should not require JSON unless the
tool is explicitly machine-only.

## `--verbose` Checks

Check whether verbose mode:

- is optional and off by default
- explains what additional diagnostics will be shown
- sends progress or diagnostic logs to stderr when stdout is primary data
- does not leak secrets, private file contents, full local paths, or large input
  data
- is useful for troubleshooting without changing product semantics
- has stable enough prefixes or structure when downstream agents may parse it

Verbose output should clarify execution. It should not become the only way to
understand normal failures.

## stdout, stderr, and Exit Code Checks

Check:

- success and failure are distinguishable by exit code
- stdout contains the primary output or documented machine-readable result
- stderr contains progress, warnings, verbose logs, and unexpected runtime
  errors when stdout must stay parseable
- JSON stdout is not mixed with plain logs
- validation errors are clear and identify the affected option, file, field, or
  input when practical
- expected partial, skipped, unsupported, or lossy behavior is visible
- binary output is written to files unless explicitly requested otherwise

## JSON and Agent-Facing Output Checks

When a CLI supports JSON:

- JSON shape is documented
- unknown request fields are rejected or clearly ignored
- result includes status, diagnostics, generated artifacts, and warnings when
  relevant
- pretty-printing and trailing newline are stable when useful for diffs
- schema or contract version is present for agent-heavy workflows
- failures remain machine-understandable when possible

Do not require JSON for every human-facing CLI. Require it when the primary
consumer is automation or an AI agent and scraping prose would be fragile.

## Severity Guidance

Use these severity levels:

- High: `--help` or `--version` fails for a released CLI or runtime artifact.
- High: stdout mixes JSON or primary output with logs, making automation
  unreliable.
- High: exit codes do not distinguish success from failure.
- Medium: `--help` is not sufficient for an AI agent or first-time user to infer
  required inputs, outputs, and examples.
- Medium: `--version` disagrees with package metadata, tag, runtime artifact, or
  release asset name.
- Medium: `--verbose` leaks private paths, secrets, or input contents, or is the
  only way to understand ordinary validation failures.
- Medium: README and CLI help describe different options or defaults.
- Low: help wording, examples, or verbose prefixes are mildly unclear but do not
  block ordinary use.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `CLI and Tool UX Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Entrypoint: ...
Help readiness: ready / partial / weak / not checked
Version readiness: ready / inconsistent / missing / not checked
Verbose behavior: useful / risky / missing / not applicable
Automation readiness: ready / partial / weak / not checked
```

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

Do not modify CLI code, docs, or tests during review mode unless the user
explicitly asks to switch to maintenance work.
