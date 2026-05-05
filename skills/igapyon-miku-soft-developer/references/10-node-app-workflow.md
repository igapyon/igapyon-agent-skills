# Node App Workflow

Use this workflow for creating or maintaining a miku-soft Node.js / TypeScript main application.

Detailed design guidance lives in [miku-soft-basic/miku-soft-10-mainapp-design-v20260505.md](miku-soft-basic/miku-soft-10-mainapp-design-v20260505.md). Keep this file as the execution checklist.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the main application basic document.
3. Inspect existing README, docs, TODO, package metadata, source layout, CLI scripts, tests, and generated indexes.

## Reference Projects

For new Node app creation, prefer starting from one or more similar existing miku-soft projects expanded under `workplace/`.

If the user has not provided reference projects, ask them to provide the closest existing miku-soft examples before scaffolding the new app. Treat those examples as shape references for repository layout, package metadata, CLI contracts, tests, docs, and build artifacts.

When multiple references are available, prefer the newer project version or the project closest to the requested product shape. Use the basic documents as the source of design intent, and use `workplace/` references to confirm practical implementation details that are easy to miss.

Do not copy `workplace/` contents into the target repository wholesale. Copy or adapt only the necessary patterns, and keep `workplace/` local-only according to repository convention rules.

## Shape Detection

Before editing, identify which Node app shape the repository currently uses:

- Single-file Web App plus CLI: check `index.html`, product-named HTML, `index-src.html`, `src/`, `lht-cmn/`, build scripts, CLI scripts, and browser or UI tests.
- CLI / structured JSON tool: check `src/main.ts`, `src/*types.ts`, CLI specs under `docs/`, `bin`, `exports`, `types`, and stdout / stderr contract tests.
- Bundled runtime artifact: check `bundle/`, `scripts/build-cli-bundle.mjs`, `scripts/build-cli-runtime.mjs`, smoke scripts, and package `files`.
- AI-facing operation surface: check projection, patch, validation, summary, diagnostics, or state-oriented docs and tests.

Use the detected shape to decide which contracts must be preserved. Do not force every repository into every shape.

## Checklist

1. Keep the semantic center in product code, not in Web UI event handlers or skill prose.
2. Separate product core, Web UI, CLI, tests, docs, and generated artifacts when the repository structure supports it.
3. Define CLI inputs, outputs, exit behavior, diagnostics, and artifact roles when CLI behavior exists.
4. Keep local-first behavior and avoid adding network assumptions unless the product explicitly requires them.
5. Update README, docs, TODO, tests, and indexes when the main application contract changes.

## Node-Specific Checklist

When a Node app change touches executable behavior, check the relevant local contracts:

- `package.json` scripts such as `build`, `test`, `cli`, `typecheck`, `smoke`, `smoke:bundle`, and `pack:check`
- TypeScript configuration and emitted runtime paths such as `dist/`, `src/js/`, generated HTML, or `bundle/*.mjs`
- CLI metadata such as `bin`, `exports`, `types`, `engines`, and package `files`
- CLI behavior for `--help`, `--version`, stdin, stdout, stderr, exit code, diagnostics, and usage errors
- tests for core API, CLI subprocess behavior, encoding, path security, limits, diagnostics, fixtures, golden output, roundtrip behavior, or UI wiring
- generated artifacts that should be rebuilt instead of hand-edited

Run the smallest relevant command first, then broader build or smoke commands when the changed contract warrants them.
