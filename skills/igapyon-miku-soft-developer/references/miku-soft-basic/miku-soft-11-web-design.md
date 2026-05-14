# Miku Software Web Application Design

This memo organizes design characteristics commonly expected for Web
application versions in the `miku` software series.

This document is split from the main-application design memo. The Web
application layer depends on the TypeScript / Node.js main application layer
described in `miku-soft-10-mainapp-design.md`.

## Design Summary

The Web application versions in the `miku` software series can be summarized as
follows.

> Local-first Single-file Web App surfaces that let humans load, inspect,
> convert, preview, diagnose, and download artifacts produced by the upstream
> TypeScript / Node.js product core.

What characterizes this layer is not that it owns a separate product. It is a
human-facing surface over the upstream main application.

- Depend on the `10 main application` product core and artifact vocabulary
- Keep product semantics in the upstream TypeScript / Node.js main application
- Provide a browser-local operation surface for humans
- Distribute as a Single-file Web App when practical
- Use `lht-cmn` Web Components as the shared UI component layer
- Preserve local-first, offline, no-network behavior for normal operation
- Keep browser-specific concerns in adapters
- Keep generated HTML artifacts reproducible and reviewable

## Role of This Document

This document describes the `11 Web App` layer. It does not define the product
semantic center, core API, CLI contract, Node package surface, or downstream
runtime artifacts. Those belong to the `10 main application` layer.

Use the documents together as follows.

- `miku-soft-10-mainapp-design.md`
  - owns TypeScript / Node.js product core, CLI, artifact vocabulary,
    diagnostics, runtime bundle, and downstream contracts
- `miku-soft-11-web-design.md`
  - owns browser UI, Single-file Web App distribution, browser adapters,
    `lht-cmn` usage, offline behavior, and generated HTML artifacts

When a specification is unclear, first check whether the decision preserves the
product semantics and artifact roles owned by the `10` layer. Web convenience
is important, but it should not redefine the product meaning.

## Scope

This document applies to miku-soft repositories or companion repositories that
provide a browser-based Web UI for a miku main application.

The normal separated repository shape is:

```text
miku-foo       # 10 main application: TypeScript / Node.js core and CLI
miku-foo-web   # 11 Web App: Single-file Web App surface over miku-foo
```

Historical repositories may keep `10` and `11` surfaces together. Treat those
as combined repositories during migration. New design should keep the
dependency direction clear even when the files are temporarily colocated.

## Dependency Direction

The `11 Web App` layer depends on `10`.

```text
11 Web App -> 10 Main Application
```

The reverse dependency should not exist.

The Web application may call:

- upstream TypeScript product core APIs
- stable public browser-compatible APIs exposed by the main application
- documented generated runtime artifacts when the repository intentionally uses
  that shape

The Web application should not:

- own product semantics independently from `10`
- duplicate conversion, validation, artifact assembly, or diagnostics logic
- create a separate artifact vocabulary for the same product behavior
- make the CLI or downstream Java / Skills / MCP layers depend on Web UI state

## Relationship to Main Applications

The `10 main application` is the semantic center. The `11 Web App` is a
human-facing surface.

The Web App should expose the same core product meaning as the CLI where their
operation ranges overlap. Differences are allowed when they come from browser
runtime constraints or from human-facing workflow needs, but they should be
documented as Web-surface behavior rather than hidden as product semantics.

Typical Web App responsibilities:

- load local files through browser APIs
- call upstream core conversion, validation, import, export, or report
  functions
- show previews, summaries, diagnostics, and warnings
- let users download generated artifacts
- provide mode controls for product-supported options
- adapt file I/O, download, DOM preview, and browser encoding behavior

Typical non-responsibilities:

- command-line option parsing
- stdout, stderr, and process exit contracts
- Node.js package metadata
- Java straight conversion
- Agent Skills operation policy
- MCP tool and resource protocol contracts

## Cross-Cutting Principles

miku Web applications emphasize the following cross-cutting principles.

1. Preserve the product semantics owned by the `10` main application.
2. Run normal operations locally in the browser without server communication.
3. Distribute the user-facing runtime as a Single-file Web App where practical.
4. Use browser UI for load, inspect, preview, diagnostics, and download.
5. Keep browser-specific APIs out of product core logic.
6. Keep Web UI controls aligned with the upstream artifact vocabulary.
7. Make unsupported, lossy, fallback, skipped, or approximate behavior visible.
8. Keep generated Web artifacts deterministic enough for release review.

### Basic Philosophy of Web Applications

The Web App is an operation surface for humans.

It should make the mainstream workflow short:

1. load a local input
2. run conversion, analysis, preview, or report generation
3. inspect summaries and diagnostics
4. download the needed artifacts

The Web App should not behave as a hosted service for normal product
functionality. User-selected files and generated artifacts stay local unless
the user explicitly chooses a documented remote or URL-based operation.

### Common Principles for Web Applications

Web applications use the following principles as defaults.

- Work from local browser files
- Require no server for core functionality
- Avoid network calls during normal load, conversion, preview, diagnostics, and
  download
- Avoid CDN scripts, remote stylesheets, remote fonts, remote images, remote
  WASM, and remote APIs in the production artifact
- Use `lht-cmn` Web Components when they fit the UI need
- Keep app-specific UI components thin over product core and shared UI
- Prefer clear local workflows over marketing-style landing pages
- Keep important output artifacts savable as files
- Use the same diagnostics and artifact vocabulary as `10`

Remote project links in README, metadata, Open Graph tags, or ordinary anchor
elements are not by themselves violations. They become product concerns only
when normal Web App operation depends on loading or calling remote resources.

## Repository Shape

When the Web App is separated from the main application, prefer this shape:

```text
repository root
  README.md
  LICENSE
  package.json
  docs/
  src/
  lht-cmn/
  index.html
  <product>-src.html
  <product>.html
  scripts/
  tests/
  workplace/.gitkeep
```

Exact filenames may vary by product, but the roles should remain clear.

- source HTML is edited by humans
- generated HTML is the distributable Single-file Web App
- `index.html` may act as a local entry page
- product-named HTML is the main generated app artifact
- `src/` contains TypeScript or JavaScript UI adapters and Web-specific code
- `lht-cmn/` contains local shared Web Components
- `workplace/` is local scratch and should not be packaged as a release input

## Distribution and Build Principles

### Single-file Web App Contract

For Web distribution, the normal artifact is a Single-file Web App.

The generated HTML should:

- open directly from the local filesystem
- include the JavaScript, CSS, shared components, and local assets needed for
  normal operation
- work offline for normal operations
- avoid remote runtime dependencies
- be clear enough for users to identify its product and build date

If a product intentionally ships a multi-file Web runtime, document the reason.
Do not describe it as a Single-file Web App unless the normal distributed
artifact is actually a single local HTML file.

### Generated Web Artifacts

Use a build process to separate editable source from generated distribution
artifacts.

Recommended shape:

- edit source template HTML and Web source files
- treat generated product HTML as a build artifact
- do not hand-edit generated distribution HTML
- bundle local JavaScript, CSS, shared components, and required local assets
  into the generated artifact
- make build output deterministic where practical
- fail checks when build placeholders remain unreplaced

Generated artifacts should be rebuilt through documented commands.

### Build Date

When generated Web Apps show an updated or build date, make the convention
explicit.

Recommended behavior:

- source HTML uses an explicit placeholder such as `{{BUILD_DATE}}`
- generated HTML replaces the placeholder
- date format is stable, normally `YYYY-MM-DD`
- timezone is explicit when a local release cadence depends on it
- Japan-local release dates should use an explicit `Asia/Tokyo` calculation or
  an explicitly supplied build date

Do not silently depend on the host machine timezone when the intended date is
Japan-local.

## Browser Adapter Principles

Browser-specific behavior should be contained in Web adapters.

Examples of browser-specific concerns:

- File API
- Blob and object URL handling
- download links
- DOM preview rendering
- browser XML parser and serializer
- browser encoding behavior
- UI event handling
- clipboard behavior
- drag-and-drop behavior

Product core should receive and return ordinary product data such as strings,
bytes, structured objects, diagnostics, and artifact descriptors. File handles,
DOM nodes, and download behavior should stay at the Web boundary.

This keeps `10` usable by CLI, tests, Java straight conversion, Agent Skills,
and MCP without depending on browser state.

## UI Design Principles

### UI Role

The UI should be centered on the actual work surface.

For most miku Web Apps, the first useful action is selecting or dropping a
local file, choosing a small number of product-supported modes, and running the
operation. The UI should not make users pass through a marketing-style page
before using the tool.

### Mainstream Flow

The mainstream flow should be discoverable without external instructions.

Check that:

- the primary local action is visible on the first screen
- controls appear in the order users need them
- the next available action becomes clear after each state change
- optional modes and advanced settings do not obscure the normal path
- labels use product artifact vocabulary
- diagnostics, preview, and download controls appear when relevant
- empty, loading, success, warning, and failure states are understandable

### lht-cmn Usage

Use `lht-cmn` as the standard shared component layer unless the repository has
a product-specific reason not to.

Shared UI components help keep miku Web Apps consistent. App-local components
are acceptable for product-specific interactions, but they should remain thin
and should not become a parallel UI framework when `lht-cmn` would fit.

### UI Boundary

Important product state should not exist only in UI widgets.

Avoid:

- product logic trapped in DOM event handlers
- important state that cannot be exported or reproduced
- UI-only defaults that differ from CLI/core defaults without documentation
- hidden conversion behavior in preview code

The UI is allowed to simplify or stage human operations, but the product
meaning should remain traceable to the `10` core.

## Diagnostics and Preview Principles

Diagnostics are part of the Web App contract.

The Web App should expose:

- fatal errors
- warnings
- unsupported content
- skipped content
- lossy conversion
- fallback decisions
- suspicious input
- output constraints

Where practical, diagnostics should include source locations such as file,
sheet, range, anchor, node, measure, task ID, or command. The vocabulary should
match the `10` core and CLI diagnostics.

Previews are inspection surfaces, not replacement canonical artifacts. A
preview should help the user judge the output, but it should not become the
only place where product meaning exists.

## Responsiveness Principles

The Web App should remain understandable while processing local files.

Check especially:

- initial page load does not run heavy work before file selection
- file loading, conversion, preview generation, diagnostics, and download
  preparation show a busy or progress state when they may take noticeable time
- primary controls avoid ambiguous clickable states during processing
- parse errors, unsupported inputs, size limits, and conversion failures recover
  predictably
- large-file handling has documented or tested limits when risk is material
- repeated operations do not accumulate stale state, duplicate event handlers,
  leaked object URLs, or runaway memory growth

Deep optimization is not required for every small tool. The contract is that
the user can understand what is happening and recover from realistic local
inputs.

## Web and CLI Alignment

When both Web App and CLI exist, they should align where they overlap.

Check these points:

- both call the same product core or a clearly shared product contract
- conversion defaults are aligned, or differences are documented
- output modes use the same names and meanings
- artifact roles use the same vocabulary
- diagnostics and warning codes remain recognizable across surfaces
- generated artifacts are comparable where practical

The Web App may expose interaction-heavy features that do not belong in CLI.
The CLI may expose batch, directory, stdout/stderr, or automation-heavy
features that do not belong in the Web App. Those differences are surface
differences, not product semantic differences.

## Local Data Feedback

Web Apps often reveal issues through real local files. Private data should stay
outside git, but the observed behavior should be returned to the product when
it matters.

Preferred flow:

1. investigate real data under ignored local work areas such as `workplace/`
2. reduce the issue into a minimal synthetic fixture when possible
3. add focused tests or golden outputs for the behavior
4. update README, docs, TODO, or diagnostics when the product boundary changes

Do not commit private customer or personal files only to prove coverage.

## Release Review Principles

Release artifacts for Web Apps should be checked as artifacts, not only as
source code.

Review:

- generated HTML exists and opens locally
- generated HTML has no required remote runtime dependencies
- build date placeholders are replaced
- release asset name includes product and version where practical
- README and workflow agree on the distributed artifact name
- Web release assets are not confused with Node CLI runtime bundles, npm pack
  tarballs, Java jars, Agent Skills bundles, or source archives

## Product-Specific Notes

### Notes Specific to `mikuscore` Web Apps

The Web surface should keep `mikuscore` centered on score conversion,
inspection, preview, diagnostics, and handoff.

MusicXML remains the semantic anchor. ABC, MEI, MuseScore, MIDI, SVG, PNG, AI
JSON, and similar outputs are import, export, preview, or handoff views around
that center. The Web UI should not present itself as a full notation editor.

### Notes Specific to `miku-abc-player` Web Apps

The Web surface should keep `miku-abc-player` playback-first and
preview-first.

It may inherit conversion and export capabilities from `mikuscore` when that
keeps upstream intake practical, but product messaging and mainstream UI should
remain centered on opening ABC, previewing it, playing it, and making small
corrections.

### Notes Specific to `mikuproject` Web Apps

The Web surface should expose `mikuproject` as a bridge around `MS Project XML`
and `ProjectModel`.

It is useful for loading, previewing, exporting projections, downloading
reports, and inspecting results. AI editing workflows should still remain
artifact-based, using projections, patch JSON, validation, apply, and diff
where the upstream `10` core supports them.

### Notes Specific to `miku-xlsx2md` Web Apps

The Web surface should keep `.xlsx` workbook-to-Markdown extraction at the
center.

It should help humans load a workbook, inspect converted Markdown, diagnostics,
assets, and summaries, then download the outputs. It should not become an
Excel-like renderer or spreadsheet automation environment.

### Notes Specific to `miku-docx2md` Web Apps

The Web surface should keep `.docx` document-to-Markdown extraction at the
center.

It should help humans inspect document structure, extracted Markdown,
sidecar assets, manifests, and unsupported content diagnostics. It should not
become a Word layout engine.

## Minimal Checklist for a New Web App Repository

Before treating a new `11 Web App` repository as usable, confirm at least the
following.

- Upstream `10` repository and product core contract are named
- Dependency direction is `11 -> 10`
- Product semantics are not duplicated in Web UI code
- Mainstream local workflow is visible
- `lht-cmn` use or exception is decided
- Browser adapters are separated from product core
- Generated Single-file Web App artifact exists, or the non-single-file reason
  is documented
- Normal operation is offline and no-network
- Diagnostics and artifact vocabulary match `10`
- Build date and generated artifact policy are explicit
- README names the distributed Web artifact
- `workplace/` or local scratch policy is present

## Summary

The `11 Web App` layer is the human-facing browser surface for miku-soft
products.

It should make local product workflows easy to use from a browser while keeping
the product meaning, core API, CLI contract, artifact vocabulary, and
downstream runtime relationship owned by the `10 main application` layer.

The guiding question is:

> Is this Web behavior a local, human-facing surface over the `10` product
> core, or is it becoming a second implementation of the product?
