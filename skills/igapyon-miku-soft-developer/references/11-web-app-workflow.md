# Web App Workflow

Use this workflow for creating or maintaining a miku-soft Web App surface.

Detailed design guidance lives in
[miku-soft-basic/miku-soft-11-web-design.md](miku-soft-basic/miku-soft-11-web-design.md).
Keep this file as the execution checklist.

## Required Initial Input

At the beginning of new Web App creation, require the upstream `10 main
application` repository or local checkout that owns the product semantics,
TypeScript / Node.js core, CLI, structured artifacts, diagnostics, and runtime
contracts.

Also require one or more similar Web App references under `workplace/`, or
inspect the target repository's `workplace/` for likely local references. If no
same-layer Web App checkout exists locally, record that explicitly and name the
closest public or documented reference used instead.

These references are practical shape references for browser UI layout,
`lht-cmn` usage, source and generated HTML roles, build scripts, browser
adapters, release assets, Web smoke tests, README structure, and documentation
split. They do not replace the upstream `10` product contract or the Web basic
design document.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the Web App basic document.
3. Inspect the upstream `10` README, docs, CLI/API contracts, diagnostics,
   artifact vocabulary, package metadata, and runtime bundle shape.
4. Inspect existing Web App README, docs, TODO, source HTML, generated HTML,
   `src/`, `lht-cmn/`, build scripts, browser tests, release workflows, and
   generated indexes.
5. For new creation, inspect the same-layer Web App sister reference before
   designing files.
6. For new creation, before scaffolding or initial file design, summarize which
   sister project was used, which Web product shape it represents, and which
   concrete repository-shape decisions were adopted or rejected.

## Shape Detection

Before editing, identify which Web App shape the repository currently uses:

- Separated `11 Web App` repository: upstream `10` repository is external or
  referenced through a local checkout, package dependency, runtime artifact, or
  documented API contract.
- Historical combined repository: Web UI, TypeScript / Node.js core, CLI, and
  generated Web artifacts are colocated. Keep the ownership split visible even
  if the files are not yet physically separated.
- Source/generated HTML split: source template HTML and generated product HTML
  are distinct.
- Single-file Web App release artifact: generated product HTML opens directly
  from the local filesystem and has no required remote runtime dependencies.

Use the detected shape to decide which contracts must be preserved. Do not
force a CLI-only `10` repository to grow Web files unless the requested work is
explicitly an `11 Web App` surface.

## Checklist

1. Keep the semantic center in the upstream `10` product core.
2. Keep the Web App as a browser surface over upstream behavior, not a second
   implementation.
3. Preserve the dependency direction `11 Web App -> 10 Main Application`.
4. Use `lht-cmn` as the shared component layer unless the repository documents
   a product-specific reason to differ.
5. Keep browser-specific behavior in adapters: File API, Blob, object URLs,
   DOM preview, download, browser XML parsing, and browser encoding.
6. Keep normal Web operation local-first and offline; do not add remote runtime
   dependencies for normal load, conversion, preview, diagnostics, or download.
7. Keep source HTML and generated HTML roles clear; do not hand-edit generated
   distribution HTML when the repository has a build path.
8. Keep diagnostics, summaries, modes, and artifact names aligned with the
   upstream `10` contract.
9. Update README, docs, TODO, tests, release workflows, and indexes when the Web
   surface contract changes.
10. Treat the sister-reference summary as required implementation context for
    new creation work.

## Web-Specific Checklist

When a Web App change touches executable behavior, check the relevant local
contracts:

- generated Single-file Web App opens locally
- generated HTML has no required CDN, remote font, remote script, remote style,
  remote WASM, or remote API dependency for normal operation
- build date placeholders are replaced with the documented date convention
- browser adapters do not leak product logic into DOM event handlers
- primary load, inspect, preview, diagnostics, and download flow remains
  discoverable
- large or invalid local inputs have visible busy, error, warning, or size-limit
  behavior where risk is material
- output artifacts, sidecars, manifests, and diagnostics use upstream artifact
  vocabulary
- generated artifacts are rebuilt instead of hand-edited

Run the smallest relevant browser, build, or smoke command first, then broader
build or release checks when the changed contract warrants them.
