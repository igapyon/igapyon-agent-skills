# AI-Era CLI Interface Principles

This document defines common CLI interface principles for miku-soft
repositories in the AI-agent era.

It applies to command-line tools that may be executed by humans, scripts, CI
jobs, Agent Skills, MCP servers, or generative AI agents.

## Purpose

miku-soft tools are often called by humans and by automation. A CLI contract
therefore has to be clear enough for repeated non-interactive execution, not
only readable as a traditional option list.

Treat `--help` as a short runtime contract. It should state the implemented
behavior needed to run the command safely, identify generated artifacts, and
point to detailed specifications when the details are too large for help text.

## Scope

These principles apply to CLI surfaces across miku-soft layers, including:

- TypeScript / Node.js main applications
- Java CLI companion applications
- Maven plugin adapter goals when they expose CLI-like parameters or behavior
- Agent Skills that wrap a local CLI
- MCP server tools that call or mirror CLI behavior

The exact format can differ by runtime, but the public contract should remain
consistent enough that humans, scripts, and AI agents do not need to infer
behavior from vague screen-oriented text.

## Core Principles

- Treat `--help` as a short runtime contract, not only as an option list.
- Describe current implemented behavior only; do not document future behavior
  as if it already exists.
- Make input range, defaults, output destinations, generated artifacts, and
  overwrite behavior explicit.
- Distinguish generated artifacts from hand-maintained source files.
- State the machine-readable output contract briefly, and link to detailed
  specifications when needed.
- Describe unknown, unsupported, partial, and lossy behavior.
- Make destructive operations and overwriting behavior visible at the CLI
  level.
- Do not require agents to depend on screen layout, terminal decoration, or
  brittle parsing of ambiguous human text.
- Keep detailed specifications in `docs/` or Agent Skills references; keep
  `--help` short enough to support safe execution.

## Standard Help Structure

Prefer this order for `--help` when the CLI is substantial enough to need a
multi-section help text:

```text
Usage
Description
Default behavior
Inputs
Outputs
Generated artifacts
Overwrite behavior
Machine-readable output contract
Diagnostics / warnings
Exit codes
Options
Examples
References
```

Small CLIs may combine sections, but they should still cover the same contract
points when those points affect safe execution.

## Runtime Contract Content

### Usage

Show the canonical command form and the minimum required arguments.

Do not make agents infer required inputs from examples alone.

### Description

Describe what the command does in operational terms. Prefer concrete verbs such
as scan, convert, validate, generate, normalize, or inspect.

### Default Behavior

State what happens when optional parameters are omitted.

Defaults that affect file selection, output location, overwrite behavior,
network use, or generated artifact shape should be explicit.

### Inputs

State accepted input kinds and ranges, such as file paths, directories, stdin,
extensions, encodings, or supported domain formats.

If dotfiles, dot-directories, binary files, symlinks, hidden files, or generated
files are skipped, say so.

### Outputs

State the destination and form of outputs. Separate terminal output from files
written to disk.

If stdout is intended for humans and a file is intended for machine use, say
that directly.

### Generated Artifacts

List generated files and directories. State whether they are meant to be
regenerated and whether humans should hand-maintain them.

Generated artifacts should be easy to identify from the CLI help, README, and
repository documentation.

### Overwrite Behavior

State whether existing files are overwritten, merged, skipped, or require an
explicit flag.

Destructive and overwriting operations should not be hidden behind generic
phrases such as "writes output".

### Machine-Readable Output Contract

State the stable machine-readable outputs and their intended consumer.

Examples:

- `index.json` is the primary machine-readable output.
- JSON fields not documented in `docs/*-spec.md` are not part of the stable
  contract.
- Terminal progress messages are not a machine-readable API.

When the format is non-trivial, link to the detailed schema or spec instead of
embedding the whole spec in `--help`.

### Diagnostics / Warnings

State where warnings appear and whether they are also represented in structured
output.

Warnings should make unsupported, unknown, partial, fallback, and lossy cases
visible enough for humans and AI agents to avoid treating incomplete output as
complete.

### Exit Codes

State exit code behavior when it is stable enough to be part of the public
contract.

At minimum, distinguish successful execution, invalid usage, and processing
failure when the CLI is intended for scripts or agents.

### Options

List options after the runtime contract sections. Options are important, but
they should not be the only contract.

For each option, make defaults and side effects clear when they affect inputs,
outputs, generated artifacts, diagnostics, or overwrite behavior.

### Examples

Provide examples that are safe to run and that match implemented behavior.

Avoid examples that imply unsupported future behavior.

### References

Link to detailed specifications, README sections, Agent Skills, or design notes.

References should let an agent move from short execution contract to detailed
format contract without guessing where the authoritative information lives.

## Future Behavior

Do not describe planned behavior in `--help` as if it already exists.

If future behavior must be mentioned in documentation, keep it outside the
runtime help contract and label it clearly as planned, proposed, or not yet
implemented.

## Agent Skill Boundary

Agent Skills may explain workflow strategy, repository-specific conventions,
multi-step usage, and decision rules. The CLI should still expose enough
runtime contract for direct safe execution.

Do not push basic execution facts only into Agent Skills. A human, script, or
MCP server that only has the CLI help should still be able to identify inputs,
outputs, generated artifacts, overwrite behavior, and machine-readable output.

At the same time, do not turn `--help` into a full Agent Skill. Keep long
workflow guidance and detailed format interpretation in references.

## Example: miku-indexgen

For `miku-indexgen`, the help contract should make points like these explicit
when they match the implemented behavior:

- Default included extensions are `md,json`.
- Dotfiles and dot-directories are skipped.
- Generated `index.json` and `index.md` are generated artifacts, not
  hand-maintained source files.
- The current run's output files are excluded from `files[]`.
- Markdown front matter is YAML only after YAML support is implemented.
- Only documented metadata fields are copied into `index.json`.
- Detailed format specifications live under `docs/*-spec.md`.

This lets an AI agent run the tool without accidentally editing generated
artifacts, trusting undocumented JSON fields, or assuming that planned parsing
behavior already exists.

## Review Checklist

When reviewing a miku-soft CLI, check whether `--help` answers these questions:

- What command should be run?
- What inputs are accepted and what inputs are skipped?
- What defaults apply?
- What files or streams are produced?
- Which outputs are generated artifacts?
- Are existing files overwritten, merged, skipped, or protected?
- Which output is stable for machine use?
- Where are warnings and diagnostics reported?
- What behavior is unknown, unsupported, partial, or lossy?
- Which details are delegated to `docs/` or Agent Skills?

If these answers are missing, the CLI help is probably still an option list
rather than an AI-era runtime contract.
