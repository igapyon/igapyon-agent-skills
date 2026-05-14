# Node App Workflow

Use this workflow for creating or maintaining a miku-soft Node.js / TypeScript main application.

Detailed design guidance lives in [miku-soft-basic/miku-soft-10-mainapp-design.md](miku-soft-basic/miku-soft-10-mainapp-design.md). Keep this file as the execution checklist.

## Required Initial Input

At the beginning of new main application creation, require one or more similar
suffixless miku main application source checkout paths under `workplace/`, or
inspect the target repository's `workplace/` for likely local references. If no
same-layer sister checkout exists locally, record that explicitly and name the
closest public or documented reference used instead.

These references are practical shape references for repository layout, package
metadata, UI or CLI contracts, tests, docs, release assets, and generated
artifacts. They do not replace the product-specific concept or the basic design
document.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the main application basic document.
3. Inspect existing README, docs, TODO, package metadata, source layout, CLI scripts, tests, and generated indexes.
4. For new creation, inspect the same-layer sister main application reference before designing files.
5. For new creation, before scaffolding or initial file design, summarize which sister project was used, which product shape it represents, and which concrete repository-shape decisions were adopted or rejected.

## Reference Projects

For new Node app creation, start from one or more similar existing miku-soft projects expanded under `workplace/`.

If the user has not provided reference projects, ask them to provide the closest existing miku-soft examples before scaffolding the new app. Treat those examples as shape references for repository layout, package metadata, CLI contracts, tests, docs, and build artifacts.

When multiple references are available, prefer the newer project version or the project closest to the requested product shape. Use the basic documents as the source of design intent, and use `workplace/` references to confirm practical implementation details that are easy to miss.

Do not copy `workplace/` contents into the target repository wholesale. Copy or adapt only the necessary patterns, and keep `workplace/` local-only according to repository convention rules.

## Shape Detection

Before editing, identify which Node app shape the repository currently uses:

- Single-file Web App plus CLI: check `index.html`, product-named HTML, `index-src.html`, `src/`, `lht-cmn/`, build scripts, CLI scripts, and browser or UI tests.
- CLI / structured JSON tool: check `src/main.ts`, `src/*types.ts`, CLI specs under `docs/`, `bin`, `exports`, `types`, and stdout / stderr contract tests.
- Bundled runtime artifact: check `bundle/`, `scripts/build-cli-bundle.mjs`, `scripts/build-cli-runtime.mjs`, smoke scripts, and package `files`.
- GitHub Actions workflow intent: distinguish CI baseline, release asset workflow, and publish workflow before creating or editing workflow files.
- Release CLI bundle: check `.github/workflows/release-cli-bundle.yml`, release asset naming, version checks, `bundle/*.mjs`, `bundle/*-sources.tgz`, and `smoke:bundle`.
- AI-facing operation surface: check projection, patch, validation, summary, diagnostics, or state-oriented docs and tests.

Use the detected shape to decide which contracts must be preserved. Do not force every repository into every shape.

## GitHub Actions Intent Resolution

When the user mentions GitHub Actions, first identify which workflow category they mean before creating files.

Categories:

- CI baseline:
  - pull request / push verification
  - separate quality gate category, not part of the standard release asset workflow

- Release asset workflow:
  - `v*` tag push
  - attach generated files to a GitHub Release
  - check tag version against `package.json` version
  - build from the release tag
  - upload only prepared release assets

- Publish workflow:
  - `npm publish`
  - package registry publication
  - token and registry policy

If the user says `v* tag`, `release`, `attach files`, `release asset`, or `GitHub Release`, do not add or modify CI baseline as the primary action. Use the Release Bundle Workflow section first. Do not create a pull-request or normal-push CI baseline workflow unless the user explicitly asks for CI baseline work.

If the repository does not yet have a bundle artifact script, do not assume the asset type silently. Report the available artifact candidates, such as:

- npm pack tarball
- single-file CLI runtime artifact
- source archive
- generated documentation bundle

Then ask or record which release asset should be attached, unless the user has clearly specified it. Do not treat `npm pack` output as the default release CLI bundle. An npm pack tarball is a package publication artifact named by npm as `<package-name>-<version>.tgz`; it is not the same artifact role as a single-file CLI runtime plus source archive.

Creating or editing a local workflow file is allowed repository work. Pushing branches, opening pull requests, publishing releases, running `npm publish`, configuring secrets, or uploading release assets remains a human GitHub or registry operation as described in [repo-operations.md](repo-operations.md).

## Release Bundle Workflow

When a Node CLI main app publishes a single-file runtime artifact through GitHub Releases, inspect the release workflow before changing build, bundle, version, or package metadata.

Check these points:

- The standard workflow is triggered by `push` tags matching `v*`.
- Do not use GitHub Release `published` as the standard trigger. Use it only when the repository has a documented repository-specific reason.
- Use `workflow_dispatch` with an explicit `tag_name` only when the repository needs a manual rerun path for recreating or attaching release assets.
- If `workflow_dispatch` is used, guard the job so only `v*` tags proceed.
- The checkout ref uses the pushed release tag or explicit manual tag, not an unrelated branch tip.
- The workflow runs dependency install, build, smoke, release asset staging, and upload in that order.
- Build and smoke are delegated to local `npm scripts`; release tag validation and asset staging may be in the workflow template when they only adapt local build outputs into GitHub Release asset names.
- The `smoke:bundle` command verifies that the generated single-file runtime starts and responds to both `--version` and `--help`.
- The release tag version is checked against `package.json` `version`; if patch suffix tags are allowed, the accepted suffix rule is explicit.
- Runtime and source assets are staged into `release-assets/`, with product and version in the filename.
- Upload uses the GitHub Release tag and only files already prepared under `release-assets/*`.
- Do not implement a Release CLI bundle workflow by running `npm pack` and uploading `release-assets/*.tgz` unless the user explicitly asked for the npm package tarball as the release asset.
- Do not add a broad repository source ZIP or generic source archive as a custom uploaded release asset.
- Actions runtime compatibility settings, such as Node.js version or JavaScript action runtime flags, are kept only when the reference project or current repository needs them.

For a Release CLI bundle request, the expected release assets are usually:

- `<product>-<version>.mjs`
- `<product>-sources-<version>.tgz`

If the package version is `0.5.0`, accepted release tags include `v0.5.0`, `v0.5.0.1`, and `v0.5.0.2`. Reject unrelated version tags such as `v0.5.1` and `v0.6.0`. Use the tag version, without the leading `v`, in release asset filenames so a patch suffix tag such as `v0.5.0.1` produces assets such as `<product>-0.5.0.1.mjs`.

If the current repository only has `npm pack` and does not yet generate `bundle/<product>.mjs` and `bundle/<product>-sources.tgz`, first report that gap and add or propose the bundle build / smoke path before wiring the GitHub Release upload.

The bundle smoke path should include metadata checks for the generated runtime artifact. At minimum, run the bundled CLI with `--version` and `--help` without requiring normal input files or stdin payloads. Product-specific smoke checks may add a small real operation after those metadata checks.

When the repository has a documented bundle build and smoke script, the expected local workflow file is normally `.github/workflows/release-cli-bundle.yml` with this shape, adapted to the product name, package scripts, and artifact paths:

```yaml
name: Release CLI bundle

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  release-cli-bundle:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Smoke test
        run: npm run smoke:bundle

      - name: Prepare release assets
        env:
          TAG_NAME: ${{ github.ref_name }}
        run: |
          set -euo pipefail
          VERSION="${TAG_NAME#v}"
          PACKAGE_VERSION="$(node -p "require('./package.json').version")"
          case "${VERSION}" in
            "${PACKAGE_VERSION}"|"${PACKAGE_VERSION}".*) ;;
            *)
              echo "Release tag version (${VERSION}) must match package.json version (${PACKAGE_VERSION}) or add a dot suffix such as ${PACKAGE_VERSION}.2." >&2
              exit 1
              ;;
          esac

          mkdir -p release-assets
          cp bundle/<product>.mjs "release-assets/<product>-${VERSION}.mjs"
          cp bundle/<product>-sources.tgz "release-assets/<product>-sources-${VERSION}.tgz"

      - name: Upload CLI bundle to GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          files: release-assets/*
          overwrite_files: true
          draft: false
          prerelease: false
```

If a repository needs a manual rerun path, add `workflow_dispatch` with a required `tag_name`, check out that explicit tag, and use it for release asset upload; keep a `v*` guard on the job. Do not add manual dispatch by default.

If the repository does not require an Actions runtime compatibility environment variable, omit `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`. If the bundle files or smoke script use different names, adapt only those paths and commands while preserving the tag-push asset upload contract.

Do not treat Release asset upload as a substitute for local bundle verification. The local build and smoke contract should remain valid without GitHub Actions.

For new Node main application scaffolding that needs a release asset workflow, use the starter template at `assets/node-main-app/.github/workflows/release-cli-bundle.yml` and adapt its product name, bundle paths, and script names to the target repository.

## Checklist

1. Keep the semantic center in product code, not in Web UI event handlers or skill prose.
2. Separate product core, Web UI, CLI, tests, docs, and generated artifacts when the repository structure supports it.
3. Define CLI inputs, outputs, exit behavior, diagnostics, and artifact roles when CLI behavior exists.
4. Keep local-first behavior and avoid adding network assumptions unless the product explicitly requires them.
5. Treat the sister-reference summary as required implementation context for new creation work.
6. Update README, docs, TODO, tests, and indexes when the main application contract changes.

## Node-Specific Checklist

When a Node app change touches executable behavior, check the relevant local contracts:

- `package.json` scripts such as `build`, `test`, `cli`, `typecheck`, `smoke`, `smoke:bundle`, and `pack:check`
- TypeScript configuration and emitted runtime paths such as `dist/`, `src/js/`, generated HTML, or `bundle/*.mjs`
- CLI metadata such as `bin`, `exports`, `types`, `engines`, and package `files`
- CLI behavior for `--help`, `--version`, stdin, stdout, stderr, exit code, diagnostics, and usage errors
- bundled runtime smoke behavior for both `--version` and `--help`
- tests for core API, CLI subprocess behavior, encoding, path security, limits, diagnostics, fixtures, golden output, roundtrip behavior, or UI wiring
- generated artifacts that should be rebuilt instead of hand-edited

Run the smallest relevant command first, then broader build or smoke commands when the changed contract warrants them.
