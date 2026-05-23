# miku-soft Review Notes

This directory contains review notes for miku-soft repositories and artifacts.
Use these notes after classifying the target repository layer and visible
product surfaces.

## Review Selection

Choose the applicable notes by repository shape:

- `single-file-web-app.md`: `11 Web App` repositories, or historical combined
  repositories, that provide a browser-based single-file Web App.
- `node-cli.md`: `10 Main Application` repositories that provide a Node.js CLI.
- `release-automation.md`: repositories that build, package, publish, or attach
  release artifacts through local scripts or GitHub Actions.
- `agent-skills.md`: `40 Agent Skills` repositories.
- `mcp-server.md`: `50 MCP` repositories.

Apply more than one note when the repository exposes more than one surface. For
example, a historical combined repository with both a Web App and CLI should
use both the Web App and CLI review notes. If the repository has release
scripts, workflows, package publication, or release assets, also apply the
release automation review.

## Cross-cutting Review Order

Use this order for broad reviews:

1. Classify the repository layer and product surfaces.
2. Check local-first and no-surprise execution behavior for each surface.
3. Check shared product semantics and artifact vocabulary across surfaces.
4. Check deterministic ordering where outputs, diagnostics, generated indexes,
   or packaged file lists are compared across runtimes.
5. Check release automation, version consistency, and packaged artifacts.
6. Report findings in severity order using the relevant review output block.

Release automation is a common implementation gap in miku-soft repositories.
Treat it as a cross-cutting review area whenever the repository has tags,
packages, generated bundles, release assets, or GitHub Actions workflows.

## Version Baseline

Newly created miku-soft repositories normally start at version `0.5.0`.
Package metadata, Maven metadata, runtime `--version` output, skill bundle
metadata, generated release names, and release workflow checks should agree on
that initial version.

Normal miku-soft project versions should not use a `-SNAPSHOT` suffix unless
the repository documents a product-specific reason.

## Sort Order Baseline

Node.js and Java runtimes can produce different string ordering when one side
uses locale-aware collation and the other side uses natural language, Unicode,
or platform defaults. Treat sorting as a product contract whenever ordered
paths, diagnostics, generated indexes, archive entries, reports, or JSON arrays
are user-visible or used for parity tests.

The repository should choose and document one string ordering rule for each
ordered artifact:

- deterministic UTF-16 code unit order, equivalent to Java
  `String.compareTo`, for machine-facing paths, diagnostic codes, stable JSON,
  and automation contracts
- explicit locale collation, such as Japanese collation, only when the product
  intentionally presents human-facing Japanese order
- numeric or domain-specific comparators for positions, line numbers, dates,
  ticks, outline numbers, and other structured values

Do not rely on JavaScript `localeCompare` without an explicit locale and
tie-breaker, Java `Collator` without an explicit locale and tie-breaker, raw
filesystem traversal order, default `Map` or object key order, or platform
locale defaults when cross-runtime parity matters.

When locale collation is intentional, add a deterministic tie-breaker such as
UTF-16 code unit comparison so Node.js and Java can agree on equal collation
groups. Parity tests should include mixed ASCII and Japanese names when the
product sorts user-facing paths or labels.

## Shared Terms

Use these terms consistently across review notes:

- Runtime artifact: a file used for normal local execution, such as a
  single-file `.mjs`, Java jar, Web App HTML file, or installable skill bundle.
- Source archive: a source or provenance package, separate from runtime
  execution.
- npm package: package-manager distribution output, including `npm pack`
  tarballs. Do not treat this as the same role as a single-file CLI runtime.
- Backend pattern: an Agent Skills execution policy such as `handoff-only`,
  `cli-only`, `cli-preferred`, `mcp-only`, or `mcp-preferred`.
- Transport: an MCP server communication mode such as stdio, local HTTP, or
  network-exposed HTTP.
- HTTP fallback: a change from local CLI or local stdio execution to HTTP MCP.
  This must be visible to the user or agent when it is allowed.

## Review Mode

During Review mode, do not edit the target repository unless the user explicitly
asks to switch from review to maintenance work. Findings should lead the
response, ordered by severity, with a short classification block before the
findings when a review note provides one.
