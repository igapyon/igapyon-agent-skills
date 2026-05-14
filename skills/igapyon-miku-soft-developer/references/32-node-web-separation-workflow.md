# Node Web Separation Workflow

Use this workflow when an existing miku-soft repository colocates the
TypeScript / Node.js product core, CLI, and Web App surface, and the Web App
surface should be separated into its own `11 Web App` repository.

This workflow is for migration of an existing repository shape. For new
TypeScript / Node.js main application work, start from
[10-node-app-workflow.md](10-node-app-workflow.md). For new Web App surface
work, start from [11-web-app-workflow.md](11-web-app-workflow.md).

For design principles, use:

- [miku-soft-basic/miku-soft-10-mainapp-design.md](miku-soft-basic/miku-soft-10-mainapp-design.md)
- [miku-soft-basic/miku-soft-11-web-design.md](miku-soft-basic/miku-soft-11-web-design.md)

## Purpose

Separate these responsibilities:

- `<product>`
  - TypeScript / Node.js product core, CLI, public APIs, structured artifacts,
    diagnostics, tests, CLI runtime bundle, Node package metadata, and
    downstream runtime contracts.
- `<product>-web`
  - browser UI, Single-file Web App distribution, source and generated HTML,
    browser adapters, `lht-cmn`, preview, diagnostics inspection, download
    behavior, Web tests, and Web release assets.

The Web App repository must remain a thin browser surface over the `10` main
application. Do not move product core behavior into the Web repository, and do
not duplicate conversion, validation, diagnostics, artifact assembly, or
runtime-bundle logic there.

## Cross-Repository Editing Boundary

During this workflow, treat the `10` main application repository and the `11`
Web App repository as separate work targets.

- While working in `<product>-web`, do not modify `<product>`. The main
  application repository may be cloned under `workplace/<product>` for
  reference, but use it as read-only context unless the user explicitly starts
  the main-application-side work.
- While working in `<product>`, do not modify `<product>-web`. The Web
  repository may be referenced for URL, ownership, compatibility, or release
  status, but use it as read-only context unless the user explicitly starts the
  Web-side work.
- Do not make cross-repository cleanup opportunistically. Finish and verify the
  current repository's step, then switch work targets deliberately.
- If a needed change is discovered in the other repository, record it as a
  follow-up item in TODO or the migration worklog instead of editing the other
  repository immediately.

## Checkpoint Flow

Use the following checkpoints as explicit pause-and-confirm points during the
separation work. Do not collapse the migration into one large edit.

### Checkpoint 1: Scope and Ownership Fixed

Confirm before moving or deleting files:

- `[Human]` GitHub repository creation policy is clear if `<product>-web` does
  not exist yet
- main application repository and Web App repository are identified
- existing Web files and directories are identified
- product core behavior is confirmed to remain in `<product>`
- Web repository responsibility is limited to browser surface behavior
- upstream API, package dependency, runtime artifact, or local development link
  from `<product>-web` to `<product>` is identified
- CLI runtime bundle role and Web App HTML artifact role are identified as
  separate release artifacts
- runtime artifact role for Web or other adapters is identified separately
  from the CLI bundle when the Web repository should consume a generated
  upstream bundle instead of source files
- local reference checkout paths under `workplace/` are identified when needed
- the current work target is identified, and the other repository is treated as
  read-only context

### Checkpoint 2: Web Repository Established

Confirm before editing the main application repository:

- `[Human]` `<product>-web` GitHub repository has been created when this is a
  new separated repository
- Web repository has been cloned locally as the work target
- Web repository has repository convention files if needed:
  - `.gitignore`
  - `workplace/.gitkeep`
  - README and TODO or worklog files
- Web repository records the upstream `<product>` repository URL
- Web repository has a documented dependency, vendored runtime artifact,
  package/API contract, or local development link to the upstream `10` contract
- browser UI files, Web adapters, source HTML, generated HTML build scripts,
  `lht-cmn`, and Web tests have been copied or recreated as Web-surface code
- copied files that are generated artifacts are either rebuilt through Web
  scripts or explicitly recorded as prebuilt migration inputs
- Web repository tracked files are pruned so it keeps Web-owned source,
  fixtures, docs, and intentional release artifacts only. Remove copied main
  application generated output, CLI artifacts, private runtime intermediates,
  caches, or historical migration debris from Git unless a file is an explicit
  Web release artifact or a documented vendored upstream runtime artifact.
- Web README explains the browser artifact, local/offline behavior, upstream
  dependency, and local unreleased setup before maintainer development notes
- Web build or smoke check passes, or failures are recorded before proceeding

### Checkpoint 3: Web Smoke Verified

Confirm before removing old Web files from the main application repository:

- compatible upstream `10` API, package, or runtime artifact is available to
  the Web repository
- if the Web repository vendors a release runtime artifact, its source release,
  asset name, digest when available, and refresh command are recorded
- generated Single-file Web App opens locally or passes the repository's Web
  smoke equivalent
- generated HTML has no required remote runtime dependencies for normal
  operation
- representative load, diagnostics, preview, and download behavior is checked
  enough to prove the Web surface calls the upstream contract
- Web release artifact naming is documented and distinct from CLI runtime
  bundle naming
- Web repository changes are locally committed, or the reason for delaying the
  commit is recorded
- `[Human]` push, tag creation, and GitHub Release policy for the Web
  repository is clear before moving to main application cleanup

### Checkpoint 4: Main Application Repository Cleaned

Confirm after Web repository verification:

- old Web-only files are removed from the `10` repository or marked as
  historical migration inputs when they must temporarily remain
- product core, CLI, public APIs, diagnostics, tests, and CLI runtime bundle
  remain in the `10` repository
- Web-only package scripts, browser tests, generated HTML paths, `lht-cmn`
  files, Web release workflows, and Web docs are removed from the `10`
  repository unless they are intentionally retained as historical combined
  compatibility
- Web UI component libraries such as `lht-cmn` are owned by the Web repository
  after separation. Remove them from the Node/CLI repository unless the `10`
  product has an explicit non-Web runtime use for them.
- tracked generated files that existed only to serve the combined Web surface,
  such as browser-oriented `src/js/*.js` or other generated browser output, are
  removed from the `10` repository after equivalent generated runtime output
  paths or Web-owned artifacts are available
- generated files no longer owned by the current repository are removed from
  Git on both sides of the split. Keep generated `.mjs` files only when they
  are intentional release/runtime contract artifacts, such as CLI bundles,
  adapter runtime bundles, or vendored upstream runtime assets.
- README and docs no longer present Web App behavior as `10`-owned behavior
- README and docs cross-link to the separated Web repository
- release automation distinguishes CLI runtime assets from Web App HTML assets
- generated indexes and TODO or worklog files record Web checks as
  separated-repository concerns
- CLI-only implementation files do not contain browser-only behavior that the
  Web App needs
- shared conversion, validation, diagnostics, mode defaults, and artifact
  serialization needed by CLI and Web are available through product core API or
  a runtime helper

### Checkpoint 5: Main Application Layout Finalized

Confirm when the `10` repository is flattened or otherwise reshaped:

- package metadata exposes the intended CLI, exports, types, files, and engine
  constraints
- source and test paths match the intended TypeScript / Node.js core and CLI
  shape
- release workflows and scripts point at current `src/`, `dist/`, `bundle/`,
  and package paths
- expected CLI runtime artifacts are documented with current paths
- generated JavaScript needed by the `10` runtime is not kept as Web
  distribution source; prefer ignored generated output such as `dist/js/` over
  tracked browser-oriented `src/js/` after Web separation
- obsolete tracked generated JavaScript and other generated output are deleted
  from Git, not left as stale compatibility artifacts, unless a temporary
  historical reason is recorded
- Web App HTML artifacts are no longer listed as `10` release assets unless a
  temporary historical compatibility reason is recorded
- focused core or CLI tests cover any behavior extracted from Web-only code
  during separation
- Git move/rename detection is preserved where practical by staging old and new
  paths together

### Checkpoint 6: Independent Verification Complete

Finish only after both repositories are verified independently:

- main application repository verification passes with its documented test,
  build, typecheck, CLI smoke, or bundle smoke commands
- product-specific CLI or artifact verification passes or is explicitly
  recorded as not run
- Web repository verification passes with its documented build and browser or
  HTML smoke checks
- generated Web artifact and CLI runtime artifact roles are current in both
  repositories
- both repositories have ownership notes and cross-links
- remaining follow-up items are recorded in TODO or worklog files
- `[Human]` any required GitHub push, tag creation, release publication,
  release asset upload, npm publication, or other remote operation is listed
  separately from local repository work

## Required Initial Input

Before editing files, identify:

- main application repository: `<product>`
- separated Web App repository: `<product>-web`
- existing Web paths in the main application repository, such as `index.html`,
  product-named HTML, source HTML, browser adapters, `lht-cmn/`, Web tests, Web
  build scripts, generated HTML, Web release workflows, and Web docs
- upstream API, package dependency, runtime artifact, or local development link
  that the Web repository should use
- CLI command and runtime bundle contract that remains in `<product>`
- Web or adapter runtime bundle contract that remains in `<product>`, when the
  Web repository should consume a generated upstream artifact
- Web release artifact contract that moves to `<product>-web`
- local reference checkout path under `workplace/`, when one repository needs
  to inspect the other

If either repository does not exist yet, create or prepare it as a separate
repository task. Do not use a source-tree copy, submodule, subtree, or
workspace-relative source dependency as the target shape unless an explicit
non-default decision is recorded.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the `10` main application and `11` Web App basic documents.
3. Inspect both repositories' README, docs, TODO, package metadata, tests,
   scripts, release workflows, generated artifacts, and current git status.
4. Inspect the existing Web surface or Web-like adapter code in `<product>`.
5. Inspect a completed same-layer Web example when available, such as a
   previously separated `<product>-web` repository under `workplace/`, or a
   historical combined repository with a comparable Web surface.

## Separation Policy

Use the upstream `10` contract as the boundary.

- Establish and verify the separated Web repository first, then remove or
  de-own Web material from the `10` repository.
- The Web repository depends on upstream product APIs, package exports,
  documented runtime artifacts, or a documented local development link.
- A vendored upstream release runtime artifact is an acceptable normal Web
  dependency when it is documented, refreshed by a command, and verified before
  Web release. Do not leave a migration-time `file:` dependency or source-tree
  path as the normal dependency unless that is an explicit non-default choice.
- The `10` repository does not keep Web App generated HTML as a normal product
  release asset after separation.
- The Web repository does not depend on private `10` source paths as normal
  runtime inputs.
- Web tests may keep only the fixtures needed to test browser-surface behavior.
- Core and CLI tests remain in the `10` repository.
- Browser smoke checks belong to the Web repository.
- CLI and runtime-bundle verification belong to the `10` repository.
- `workplace/` or `../<product>` checkouts are reference checkouts only; they
  are not submodules, subtrees, copied runtime directories, or normal build
  inputs unless an explicit non-default decision is recorded.

If browser behavior needs conversion, validation, diagnostics, mode defaults,
or artifact serialization that currently exists only in Web event handlers,
extract that behavior into the `10` product core or a public runtime helper.
Then add focused `10` tests before the Web repository calls that contract.

Do not use the CLI implementation as the primary integration point for Web
code. If the Web App needs behavior that currently exists only in CLI code,
extract the behavior into product core or a runtime helper, add focused tests,
and let both CLI and Web adapters call the same contract.

## Main Application Generated Output Shape

After Web separation, the `10` main application should normally treat
TypeScript source as the only tracked product-core source and move ordinary
generated JavaScript out of Git.

Recommended shape:

```text
src/ts/        tracked source of truth
dist/js/       generated by build, ignored by Git
bundle/*.mjs   release or runtime contract artifacts, when intentionally built
```

This means tracked generated JavaScript such as old `src/js/*.js` output should
be removed after the Node runtime, CLI bundle builder, tests, docs, and release
checks use the generated runtime directory consistently.

Generated `.mjs` files are the main exception only when they are intentional
release or runtime contract artifacts, such as CLI bundles, Web or adapter
runtime bundles, or vendored upstream runtime assets. Do not keep ordinary
generated JavaScript in Git only because it existed in the historical combined
repository.

## Web Repository Work

In `<product>-web`:

1. `[Human]` Create the GitHub repository when `<product>-web` does not exist
   yet.
2. Confirm repository naming:
   - main application repository: `<product>`
   - Web repository: `<product>-web`
3. Clone the Web repository locally and use it as the work target.
4. Create repository convention files if missing:
   - `.gitignore`
   - `workplace/.gitkeep`
5. Record the upstream main application repository URL in README, docs, or the
   migration worklog.
6. Clone or place the main application repository under `workplace/<product>`
   when local inspection is needed. Treat this checkout as read-only context
   during Web-side work.
7. Copy or recreate only Web-surface material from the old combined repository:
   - browser UI source
   - browser adapters
   - source HTML
   - generated HTML build scripts
   - `lht-cmn` or local Web components
   - Web-specific tests and fixtures
   - Web release workflow
   - Web documentation
8. Replace copied source-tree assumptions with the documented upstream `10`
   contract.
   - Prefer a public API, package export, or generated runtime artifact.
   - If using a release runtime artifact, commit or otherwise pin the artifact
     metadata needed for reproducible Web builds, such as source repository,
     release tag, asset name, digest when available, and download URL.
   - Keep local unreleased development paths documented as optional maintainer
     setup, not as the normal build contract.
   - Remove copied main-application generated output from Git after the Web
     repository has its own build path. Keep only Web-owned source, Web
     generated release artifacts, fixtures, docs, and explicitly vendored
     upstream runtime artifacts.
9. Keep Web mode names, diagnostics, artifact names, and output roles aligned
   with upstream `10` vocabulary.
10. Document:
    - upstream dependency or local development setup
    - runtime artifact refresh command, when the Web repository vendors an
      upstream runtime
    - Single-file Web App artifact path
    - offline/no-network behavior
    - generated HTML build command
    - browser smoke command
    - release asset role and naming
11. Add or update a smoke script that verifies the generated Web artifact.
12. Commit the local Web repository changes after build and smoke pass.
13. `[Human]` Push the Web repository branch.
14. `[Human]` Create the Web repository tag and GitHub Release when the
    repository is ready for release.

## Main Application Repository Work

In `<product>`:

1. Confirm that the Web repository work is complete enough to treat
   `<product>-web` as the owner of browser-surface behavior.
2. Record the separated Web repository URL in README, docs, or the migration
   worklog.
3. Remove Web-only files from the `10` repository:
   - source HTML and generated HTML
   - `lht-cmn` when it is Web-only
   - Web UI component libraries and catalogs, including `lht-cmn`, when they do
     not serve the Node/CLI product core
   - browser adapters
   - browser-only or obsolete tracked generated output, such as old
     `src/js/*.js` files replaced by ignored `dist/js/`
   - Web-only tests and fixtures
   - Web-only build scripts
   - Web release workflows
   - Web-only docs
4. Keep product core, CLI, public APIs, diagnostics, runtime bundle scripts,
   tests, and Node package metadata in the `10` repository.
5. Remove Web App examples and browser smoke instructions from the `10` README
   and development docs.
6. Add cross-links to the separated Web repository.
7. Update package metadata so `files`, `exports`, `bin`, `types`, and scripts
   reflect the `10` runtime and CLI role.
8. Update release automation so it produces CLI runtime artifacts, source
   archives, npm package artifacts, or docs artifacts only as documented for
   `10`.
   - When generated JavaScript has moved to ignored output such as `dist/js/`,
     use generated-file existence or smoke checks in CI instead of expecting a
     Git diff check against tracked generated JavaScript.
   - Remove old tracked generated output paths from repository files, docs,
     tests, package scripts, and release checks after the new generated path is
     verified.
   - Keep the Web or adapter runtime bundle name distinct from the CLI bundle
     name, for example `<product>-runtime-<version>.mjs` versus
     `<product>-<version>.mjs`.
9. Check whether browser event handlers or adapters contained product behavior
   now needed by CLI, Web, Agent Skills, or MCP.
10. Move shared behavior into product core API or a runtime helper, then add
    focused tests for the extracted contract.
11. Treat the separated Web repository as read-only context during
    main-application-side work.
12. Commit the local main application repository changes after tests and build
    checks pass.
13. `[Human]` Push the main application repository branch.
14. `[Human]` Create the main application repository tag and GitHub Release
    when the repository is ready for release.

## Documentation To Keep

Prefer a short worklog in both repositories while performing the migration.

Main application repository worklog should record:

- separated Web repository URL
- removed Web paths
- intentionally deleted paths
- intentionally moved paths
- new CLI/runtime artifact output paths
- generated runtime JavaScript output location, especially when it changed
  from tracked `src/js/` to ignored `dist/js/` or an equivalent directory
- generated or copied files removed from Git on each side of the split, with
  any intentionally retained generated `.mjs` release/runtime artifacts called
  out separately
- main application verification commands and results
- product core API extraction performed for Web compatibility, if any
- package metadata or runtime bundle changes
- follow-up items that belong to the Web repository

Web repository worklog should record:

- upstream main application repository URL
- local upstream checkout path
- copied browser UI files
- copied Web tests and fixtures
- generated HTML build setup
- upstream dependency or local development link
- vendored upstream runtime source release, asset name, digest when available,
  metadata file, and refresh command when that dependency shape is used
- Web smoke command and result
- release asset naming
- whether the upstream API/runtime artifact was verified against the current
  Web surface
- follow-up items that belong to the main application repository

## Verification

Verify the main application repository independently with the commands it
documents, such as:

```bash
npm test
npm run build
npm run smoke:bundle
```

Use the exact repository commands. Do not invent missing scripts as if they
were standard.

Verify the Web repository independently with the commands it documents, such
as:

```bash
npm test
npm run build
```

Also run product-specific browser or generated-HTML smoke checks when the
repository provides them.

When the upstream `10` API, package exports, runtime artifact, or diagnostics
change during this work, confirm one of the following before treating the
affected repository as complete:

- the Web repository has been updated and verified against the new upstream
  contract
- a TODO or worklog item records the required Web follow-up
- the upstream change is confirmed not to affect Web compilation, build, smoke,
  or artifact behavior

## Completion Checklist

- main application repository no longer treats Web App behavior as `10`-owned
  behavior
- main application repository builds as the intended TypeScript / Node.js core,
  CLI, and runtime-bundle product
- CLI runtime artifact paths in README, docs, scripts, and workflows are
  current
- generated runtime JavaScript paths and release workflow checks match the
  post-separation layout, such as ignored `dist/js/` plus smoke or existence
  checks
- Web repository builds as the intended browser surface
- Web repository depends on the upstream `10` contract instead of duplicating
  product logic
- Web repository no longer uses migration-time source-tree or `file:`
  dependencies as its normal build contract unless explicitly documented
- browser adapters call product core APIs or public runtime helpers instead of
  carrying conversion logic
- shared behavior needed by CLI and Web adapters is not left only in CLI
  implementation classes or browser event handlers
- focused `10` tests cover any product core extraction performed during
  separation
- Web tests and fixtures are limited to Web surface behavior
- Web smoke verifies generated HTML or the repository's equivalent browser
  artifact
- both repositories document ownership and cross-link to each other
- upstream API or runtime changes have corresponding Web compatibility
  follow-up recorded or verified
- TODO or worklog files record any remaining main-application-side or Web-side
  follow-up items
