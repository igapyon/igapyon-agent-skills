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

## Release Web Assets Workflow

For separated `11 Web App` repositories that publish a generated Single-file
Web App through GitHub Releases, provide a Web release asset workflow.

The expected local files and contracts are:

- `.github/workflows/release-web-assets.yml`
- `scripts/stage-web-release-assets.mjs`, or an equivalent local staging script
- a `package.json` script such as `stage:web-release`
- a `.gitignore` entry for `release-assets/`

The standard workflow is triggered by `push` tags matching `v*`. It should
install dependencies, run the documented Web build, run the documented Web
tests or smoke checks, stage versioned Web release assets under
`release-assets/`, and upload only those staged assets to the matching GitHub
Release.

The primary release asset is the generated Single-file Web App HTML:

- `<product>-web-<version>.html`

A small metadata JSON asset may also be published when it helps downstream
automation or release review. `index.html` is optional as a GitHub Release
asset; treat it primarily as the GitHub Pages entry point unless the repository
explicitly documents that `index.html` is also a release asset.

Keep Web release assets distinct from the upstream `10` CLI runtime bundle,
npm package tarball, Java jar, Agent Skills bundle, MCP package, or generated
source archive. The Web repository should not publish the `10` CLI release
asset, and the `10` repository should not keep Web App HTML as a normal release
asset after separation.

Document the Web release asset names, staging command, GitHub Pages policy, and
GitHub Release policy in README, TODO, or the migration worklog.

When creating a new separated Web repository, adapt the starter files under
`assets/web-app/` if the repository does not already have an equivalent local
workflow. The starter follows the `miku-xlsx2md-web` release workflow shape:
`npm run build:all`, `npm run stage:web-release`, staged `release-assets/*`,
and `softprops/action-gh-release`.

## Reference-Derived Repository Shape

Use completed same-layer Web repositories such as `miku-xlsx2md-web` as shape
references when creating or repairing separated `11 Web App` repositories. Do
not copy product-specific conversion behavior, fixtures, or product names, but
do reuse the repository contracts that are independent of the product domain.

A separated Web repository should normally document this information near the
top of README:

- repository role: browser UI, Single-file Web App generation, browser
  adapters, `lht-cmn`, Web tests, and Web release assets
- upstream `10` main application repository URL
- Web App repository URL
- upstream dependency type: package API, public browser-compatible API,
  generated runtime asset, or documented local development link
- generated Single-file Web App artifact name
- offline/no-network behavior for normal use
- build, test, runtime refresh, and release staging commands
- generated-file editing rule: rebuild generated HTML or browser JS instead of
  hand-editing it
- local scratch policy for `workplace/`

When the Web repository consumes a vendored upstream runtime artifact, keep the
contract explicit:

- commit the vendored runtime files only when they are intentional Web build
  inputs
- provide a refresh command such as `refresh:runtime`
- record the upstream release tag, asset name, URL, and digest when available
- keep normal Web builds independent from upstream source-tree paths
- make local unreleased upstream checkouts optional maintainer setup, not the
  normal build contract

The common generated Web file shape is:

- `index-src.html`: editable source for the Pages entry point
- `index.html`: generated GitHub Pages entry point
- `<product>-src.html`: editable source for the product Web App
- `<product>.html`: generated Single-file Web App release source
- `src/ts/`: Web-specific TypeScript source when needed
- `src/js/`: generated browser JavaScript when the repository intentionally
  commits generated Web output for review or release
- `vendor/`: pinned upstream runtime artifacts when the Web build depends on a
  released upstream runtime bundle
- `lht-cmn/`: local shared Web components
- `tests/`: browser UI, generated HTML, or Web adapter smoke tests

Generated distribution files may be committed in separated Web repositories
when the repository explicitly treats them as reviewable release inputs. In
that shape, README or TODO must say which files are generated and which command
rebuilds them.

Use `docs/miku-soft-reference.md` to link the repository back to the installed
`igapyon-miku-soft-developer` skill and list the specific miku-soft references
used. Do not copy the shared miku-soft basic documents into the product
repository. Use `docs/migration-worklog.md` or TODO for project-specific
separation decisions, including checked sister references, dependency
decisions, GitHub Pages policy, and release policy.

## GitHub Pages Publication

For separated `11 Web App` repositories, GitHub Pages publication should be
enabled. Treat `index.html` as the normal Pages entry point for trying the
current Web App in a browser.

Document the Pages URL and publication source in README, TODO, or the
migration worklog. The normal policy is:

- GitHub Pages is ON for separated `-web` repositories.
- `index.html` is the Pages entry point.
- Versioned GitHub Release assets remain separate from the Pages entry point.
- Pages publication does not replace the downloadable Single-file Web App
  release asset.

Enabling or changing GitHub Pages repository settings is a human-owned GitHub
operation. The skill workflow may prepare the local files and documentation,
but should list the remote setting change separately when it is still needed.

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
11. For separated Web repositories, provide or explicitly defer the Web release
    asset workflow and documentation described above.
12. For separated Web repositories, document that GitHub Pages publication is
    enabled, or record the remaining human-owned settings step.

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
