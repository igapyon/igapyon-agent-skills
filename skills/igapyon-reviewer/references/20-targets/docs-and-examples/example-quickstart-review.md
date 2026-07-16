# Example and Quickstart Review

Use this reference to review whether README quickstarts, examples, tutorials,
sample commands, and minimal workflows are actually usable by a first-time user
or AI agent.

This review focuses on copy-pasteability, missing prerequisites, current
command names, expected outputs, example files, and whether examples match the
implemented behavior.

## Review Priority

Use this review when README, docs, release notes, CLI help, examples, or
repository entrypoints include commands or step-by-step usage.

Use it with repository entrypoint and CLI/tool UX reviews when judging whether a
project is usable from its public docs.

## Core Checks

Check whether examples:

- start from a realistic clean checkout or installation state
- state prerequisites before commands that need them
- use current package names, binary names, file names, and option names
- include required input files or explain where to get them
- create output directories before writing into them, or use commands that do
  so
- show expected output, generated file names, or success criteria when useful
- avoid relying on hidden local files, maintainer-only paths, prior build
  artifacts, or unpublished release assets
- are copy-pasteable without editing many placeholders
- use placeholders clearly when user-specific values are required
- match the behavior documented by `--help`

## Quickstart Flow Checks

A good quickstart should usually answer:

1. What do I install or open?
2. What input do I provide?
3. What command or action do I run?
4. What output should I see?
5. Where is the generated file or result?
6. What should I try next?

Flag quickstart issues when:

- first command is a developer build command rather than user usage
- steps assume dependencies are already installed without saying so
- examples require files that are not present
- output path differs from current implementation
- commands work only from a specific directory but do not say so
- examples use old option names or old artifact names
- success is not judgeable from the example

## AI-Agent Usability Checks

For agent-facing workflows, check whether examples:

- make file roles explicit, such as input, output, config, report, bundle, or
  runtime artifact
- avoid ambiguous "run this" instructions without target directory
- describe expected diagnostics or JSON fields when relevant
- provide enough structure for an agent to choose commands without browsing
  source code
- distinguish destructive, write-producing, network, and local-only commands

## Severity Guidance

Use these severity levels:

- High: quickstart cannot run from documented prerequisites, or points to
  missing commands, files, packages, or artifacts.
- Medium: examples are stale, incomplete, or require hidden assumptions that
  first-time users or agents are unlikely to infer.
- Medium: README quickstart and CLI help disagree.
- Low: examples work but need clearer expected output, placeholders, or next
  steps.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Example and Quickstart Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Copy-paste readiness: ready / partial / broken / not checked
Prerequisites: clear / partial / missing / not checked
```

Do not rewrite examples during review mode unless the user asks for revision.
