# Node App Workflow

Use this workflow for creating or maintaining a miku-soft Node.js / TypeScript
main application: product core, CLI, structured artifacts, diagnostics, and
runtime bundles.

Detailed design guidance lives in [miku-soft-basic/miku-soft-10-mainapp-design.md](miku-soft-basic/miku-soft-10-mainapp-design.md). Keep this file as the execution checklist.

For Web App surface work, use [11-web-app-workflow.md](11-web-app-workflow.md)
and [miku-soft-basic/miku-soft-11-web-design.md](miku-soft-basic/miku-soft-11-web-design.md).

## Required Initial Input

At the beginning of new main application creation, require one or more similar
suffixless miku main application source checkout paths under `workplace/`, or
inspect the target repository's `workplace/` for likely local references. If no
same-layer sister checkout exists locally, record that explicitly and name the
closest public or documented reference used instead.

These references are practical shape references for repository layout, package
metadata, CLI contracts, tests, docs, release assets, and generated runtime
artifacts. They do not replace the product-specific concept or the basic design
document. For Web surface references, use the `11 Web App` workflow.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the main application basic document.
3. Inspect existing README, docs, TODO, package metadata, source layout, CLI scripts, tests, runtime bundle scripts, and generated indexes.
4. For new creation, inspect the same-layer sister main application reference before designing files.
5. For new creation, before scaffolding or initial file design, summarize which sister project was used, which product shape it represents, and which concrete repository-shape decisions were adopted or rejected.

## Reference Projects

For new Node app creation, start from one or more similar existing miku-soft projects expanded under `workplace/`.

If the user has not provided reference projects, ask them to provide the closest existing miku-soft examples before scaffolding the new app. Treat those examples as shape references for repository layout, package metadata, CLI contracts, tests, docs, and build artifacts.

When multiple references are available, prefer the newer project version or the project closest to the requested product shape. Use the basic documents as the source of design intent, and use `workplace/` references to confirm practical implementation details that are easy to miss.

Do not copy `workplace/` contents into the target repository wholesale. Copy or adapt only the necessary patterns, and keep `workplace/` local-only according to repository convention rules.

## Shape Detection

Before editing, identify which Node app shape the repository currently uses:

- CLI / structured JSON tool: check `src/main.ts`, `src/*types.ts`, CLI specs under `docs/`, `bin`, `exports`, `types`, and stdout / stderr contract tests.
- Bundled runtime artifact: check `bundle/`, `scripts/build-cli-bundle.mjs`, `scripts/build-cli-runtime.mjs`, smoke scripts, and package `files`.
- Historical combined repository with Web surface: keep `10` ownership focused on product core, CLI, diagnostics, and runtime bundles; use the `11` workflow for `index.html`, product-named HTML, `index-src.html`, `lht-cmn/`, browser adapters, generated Web artifacts, and browser or UI tests.
- GitHub Actions workflow intent: distinguish CI baseline, release asset workflow, and publish workflow before creating or editing workflow files.
- Release CLI/runtime bundle: check
  `.github/workflows/release-cli-runtime-bundles.yml`,
  release asset naming, version checks, `bundle/<product>.mjs`,
  `bundle/<product>-runtime.mjs`, `bundle/*-sources.tgz`, `smoke:bundle`,
  and `smoke:runtime`.
- AI-facing operation surface: check projection, patch, validation, summary, diagnostics, or state-oriented docs and tests.

Use the detected shape to decide which contracts must be preserved. Do not force every repository into every shape.

## GitHub Actions Intent Resolution

When the user mentions GitHub Actions, first identify which workflow category they mean before creating files.

Categories:

- CI baseline:
  - pull request / push verification
  - separate quality gate category, not part of the standard release asset workflow

- Release asset workflow:
  - GitHub Release `published`
  - `v*` release tag
  - attach generated files to a GitHub Release
  - check tag version against `package.json` version
  - build from the release tag
  - upload only prepared release assets

- Publish workflow:
  - `npm publish`
  - package registry publication
  - token and registry policy

If the user says `v* tag`, `release`, `attach files`, `release asset`, or `GitHub Release`, do not add or modify CI baseline as the primary action. Use the Release Bundle Workflow section first. Do not create a pull-request or normal-push CI baseline workflow unless the user explicitly asks for CI baseline work.

The default miku-soft release asset operation is publishing a GitHub Release
with a `v*` tag from the GitHub UI. Treat branch pushes, tag-push-only release
workflows, and manual dispatch as repository-specific exceptions that require
an explicit reason. In maintenance mode, if the release workflow is not based
on `release: published`, normally adjust it to the GitHub Release publish
shape before changing release asset contents.

Do not include merge-time, pull-request, or branch-push test automation in the
release asset workflow template. Keep CI baseline workflows separate and add
them only when the user asks for CI baseline work or the repository already has
a documented CI baseline policy.

If the repository does not yet have a bundle artifact script, do not assume the asset type silently. Report the available artifact candidates, such as:

- npm pack tarball
- single-file CLI runtime artifact
- source archive
- generated documentation bundle

Then ask or record which release asset should be attached, unless the user has clearly specified it. Do not treat `npm pack` output as the default release CLI bundle. An npm pack tarball is a package publication artifact named by npm as `<package-name>-<version>.tgz`; it is not the same artifact role as a single-file CLI runtime plus source archive.

Creating or editing a local workflow file is allowed repository work. Pushing branches, opening pull requests, publishing releases, running `npm publish`, configuring secrets, or uploading release assets remains a human GitHub or registry operation as described in [repo-operations.md](repo-operations.md).

## Release Bundle Workflow

When a Node CLI main app publishes runtime artifacts through GitHub Releases,
inspect the release workflow before changing build, bundle, version, or package
metadata.

For miku-soft Node main applications, the standard release shape is to produce
both an executable CLI bundle and an importable runtime bundle:

- `bundle/<product>.mjs`
  - Executable CLI bundle.
  - Must support `--version` and `--help` without requiring input files.
- `bundle/<product>-runtime.mjs`
  - Importable runtime bundle for Agent Skills, Web Apps, MCP servers, tests,
    or other JavaScript callers.
  - Must expose documented product API exports, but is not required to support
    CLI options such as `--help`.

Omitting either artifact requires an explicit repository-specific reason. In
maintenance mode, if a repository does not follow this two-artifact standard,
first inspect the current build shape and then normally adjust it toward the
standard unless the repository documents a deliberate exception.

Check these points:

- The standard workflow is triggered by GitHub Release `published`; this is the
  default release operation for miku-soft Node main applications.
- The release tag name must start with `v`, and the workflow must check that
  tag version against `package.json`.
- Do not use tag-push-only release workflows as the standard trigger. Use them
  only when the repository has a documented repository-specific reason.
- Use `workflow_dispatch` with an explicit `tag_name` only when the repository
  needs a documented manual rerun path for recreating or attaching release
  assets.
- If `workflow_dispatch` is used, guard the job so only `v*` tags proceed.
- The checkout ref uses `github.event.release.tag_name` or an explicit manual
  tag, not an unrelated branch tip.
- The workflow runs dependency install, build, smoke, release asset staging, and upload in that order.
- Build and smoke are delegated to local `npm scripts`; release tag validation and asset staging may be in the workflow template when they only adapt local build outputs into GitHub Release asset names.
- The `smoke:bundle` command verifies that the generated CLI bundle starts and
  responds to both `--version` and `--help`.
- The `smoke:runtime` command verifies that the import runtime bundle can be
  imported and exposes its documented metadata and core API functions.
- The release tag version is checked against `package.json` `version`; if patch suffix tags are allowed, the accepted suffix rule is explicit.
- Runtime and source assets are staged into `release-assets/`, with product and version in the filename.
- Upload uses the GitHub Release tag and only files already prepared under `release-assets/*`.
- Do not implement a Release CLI/runtime bundle workflow by running `npm pack`
  and uploading `release-assets/*.tgz` unless the user explicitly asked for
  the npm package tarball as the release asset.
- Do not add a broad repository source ZIP or generic source archive as a custom uploaded release asset.
- Actions runtime compatibility settings, such as Node.js version or JavaScript action runtime flags, are kept only when the reference project or current repository needs them.

For a Release CLI/runtime bundle request, the expected release assets are normally:

- `<product>-<version>.mjs`
- `<product>-runtime-<version>.mjs`
- `<product>-sources-<version>.tgz`

When a GitHub Release with a `v*` tag is published, the workflow must build the
executable module and source bundle from that checked-out tag before uploading
them. Do not upload stale local artifacts or npm package tarballs as substitutes
for these release assets.

If the package version is `0.5.0`, accepted release tags include `v0.5.0`, `v0.5.0.1`, and `v0.5.0.2`. Reject unrelated version tags such as `v0.5.1` and `v0.6.0`. Use the tag version, without the leading `v`, in release asset filenames so a patch suffix tag such as `v0.5.0.1` produces assets such as `<product>-0.5.0.1.mjs`.

If the current repository only has `npm pack` and does not yet generate
`bundle/<product>.mjs`, `bundle/<product>-runtime.mjs`, and
`bundle/<product>-sources.tgz`, first report that gap and add or propose the
bundle build / smoke path before wiring the GitHub Release upload.

The bundle smoke path should include metadata checks for both generated runtime
artifacts. At minimum, run the bundled CLI with `--version` and `--help`
without requiring normal input files or stdin payloads, then import the runtime
bundle and verify documented metadata and core API exports. Product-specific
smoke checks may add a small real operation after those metadata checks.

When the repository has a documented bundle build and smoke script, the
expected local workflow file is normally
`.github/workflows/release-cli-runtime-bundles.yml` with this shape, adapted to
the product name, package scripts, and artifact paths:

```yaml
name: Release CLI/runtime bundles

on:
  release:
    types: [published]

permissions:
  contents: write

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  release-cli-runtime-bundles:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.release.tag_name }}

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate release tag
        env:
          TAG_NAME: ${{ github.event.release.tag_name }}
        run: |
          set -euo pipefail
          case "${TAG_NAME}" in
            v*) ;;
            *)
              echo "Release tag must start with v: ${TAG_NAME}" >&2
              exit 1
              ;;
          esac

          VERSION="${TAG_NAME#v}"
          PACKAGE_VERSION="$(node -p "require('./package.json').version")"
          case "${VERSION}" in
            "${PACKAGE_VERSION}"|"${PACKAGE_VERSION}".*) ;;
            *)
              echo "Release tag version (${VERSION}) must match package.json version (${PACKAGE_VERSION}) or add a dot suffix such as ${PACKAGE_VERSION}.2." >&2
              exit 1
              ;;
          esac

          echo "RELEASE_VERSION=${VERSION}" >> "${GITHUB_ENV}"

      - name: Build
        run: npm run build

      - name: Build release bundles
        run: npm run build:bundle

      - name: Verify release bundle files
        run: |
          set -euo pipefail
          test -s bundle/<product>.mjs
          test -s bundle/<product>-runtime.mjs
          test -s bundle/<product>-sources.tgz

      - name: Smoke test CLI bundle
        run: npm run smoke:bundle

      - name: Smoke test runtime bundle
        run: npm run smoke:runtime

      - name: Prepare release assets
        run: |
          set -euo pipefail
          mkdir -p release-assets
          cp bundle/<product>.mjs "release-assets/<product>-${RELEASE_VERSION}.mjs"
          cp bundle/<product>-runtime.mjs "release-assets/<product>-runtime-${RELEASE_VERSION}.mjs"
          cp bundle/<product>-sources.tgz "release-assets/<product>-sources-${RELEASE_VERSION}.tgz"

      - name: Upload release assets
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.event.release.tag_name }}
          files: release-assets/*
          overwrite_files: true
```

If a repository needs a manual rerun path, add `workflow_dispatch` with a required `tag_name`, check out that explicit tag, and use it for release asset upload; keep a `v*` guard on the job. Do not add manual dispatch by default.

If the repository does not require an Actions runtime compatibility environment
variable, omit `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`. If the bundle files or
smoke scripts use different names, adapt only those paths and commands while
preserving the GitHub Release publish asset upload contract and the
two-artifact CLI/runtime distinction.

Do not treat Release asset upload as a substitute for local bundle verification. The local build and smoke contract should remain valid without GitHub Actions.

For new Node main application scaffolding that needs a release asset workflow,
use the starter template at
`assets/node-main-app/.github/workflows/release-cli-runtime-bundles.yml` and
adapt its product name, bundle paths, and script names to the target
repository.

## Checklist

1. Keep the semantic center in product code, not in Web App code or skill prose.
2. Separate product core, CLI, tests, docs, runtime bundles, and downstream Web surface files when the repository structure supports it.
3. Define CLI inputs, outputs, exit behavior, diagnostics, and artifact roles when CLI behavior exists.
4. Keep local-first behavior and avoid adding network assumptions unless the product explicitly requires them.
5. Treat the sister-reference summary as required implementation context for new creation work.
6. For Node main applications, produce both `bundle/<product>.mjs` and
   `bundle/<product>-runtime.mjs` by default; document any exception.
7. In maintenance mode, normally adjust repositories that lack either standard
   artifact toward the two-artifact shape before updating release automation.
8. Update README, docs, TODO, tests, and indexes when the main application contract changes.

## Node-Specific Checklist

When a Node app change touches executable behavior, check the relevant local contracts:

- `package.json` scripts such as `build`, `test`, `cli`, `typecheck`, `smoke`,
  `smoke:bundle`, `smoke:runtime`, and `pack:check`
- TypeScript configuration and emitted runtime paths such as `dist/`, CLI
  entrypoints, `bundle/<product>.mjs`, and `bundle/<product>-runtime.mjs`
- CLI metadata such as `bin`, `exports`, `types`, `engines`, and package `files`
- CLI behavior for `--help`, `--version`, stdin, stdout, stderr, exit code, diagnostics, and usage errors
- CLI bundle smoke behavior for both `--version` and `--help`
- import runtime bundle smoke behavior for metadata and core API exports
- tests for core API, CLI subprocess behavior, encoding, path security, limits, diagnostics, fixtures, golden output, or roundtrip behavior
- generated artifacts that should be rebuilt instead of hand-edited

Run the smallest relevant command first, then broader build or smoke commands when the changed contract warrants them.
