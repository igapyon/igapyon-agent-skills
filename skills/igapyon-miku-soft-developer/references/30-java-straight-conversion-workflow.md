# Java Straight Conversion Workflow

Use this workflow for creating or maintaining a Java straight-conversion
version of a miku-soft Node.js / TypeScript main application.

In this workflow, `upstream` means the source miku-soft main application that
corresponds to [10-node-app-workflow.md](10-node-app-workflow.md). It is
normally the suffixless Node.js / TypeScript repository, while this workflow
targets the Java companion repository, normally with a `-java` suffix.

Detailed design guidance lives in:

- [miku-soft-basic/miku-soft-20-javaapp-design-v20260506.md](miku-soft-basic/miku-soft-20-javaapp-design-v20260506.md)
- [miku-soft-basic/miku-soft-30-straight-conversion-v20260506.md](miku-soft-basic/miku-soft-30-straight-conversion-v20260506.md)

Keep this file as the execution checklist. Load the detailed design documents
only when a policy decision is unclear.

## Required Initial Input

At the beginning of a new Java straight-conversion task, require the upstream
Node.js / TypeScript main application GitHub repository URL: the repository
that would be maintained using [10-node-app-workflow.md](10-node-app-workflow.md).
If the user has not provided it yet, ask for it before inventory, scaffolding,
or implementation work.

Also confirm the upstream branch, tag, release, commit, or vendored snapshot
that should be treated as the compatibility source. When the exact upstream
state is unknown, use the GitHub repository URL as the first anchor and record
the follow-up needed to pin the precise source revision.

Also require a sister-reference check for one or more similar existing
miku-soft Java companion repositories under `workplace/`. These are `-java`
repositories at the same companion layer as the target Java repository, not the
Node.js / TypeScript upstream. If the user has not provided them yet, ask for
the closest available `-java` sister project source checkout path under
`workplace/`, or inspect the target repository's `workplace/` for likely local
references, before scaffolding or initial implementation work. If no
same-layer sister checkout exists locally, record that explicitly and name the
closest public or documented reference used instead.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the Java application and straight conversion basic documents.
3. Inspect upstream evidence, existing Java source, mapping documents, tests,
   build files, README, docs, TODO, and workplace instructions.
4. For new conversion, inspect the same-layer `-java` sister reference before designing files.
5. For new conversion, before scaffolding or initial file design, summarize
   which sister project was used, which Java product shape it represents, and
   which concrete repository-shape decisions were adopted or rejected.

## Fixed Premises

Confirm these before editing Java code:

- upstream Node.js / TypeScript main application GitHub repository URL, and its
  branch, tag, commit, release, or vendored snapshot
- similar existing `-java` sister project source checkout under `workplace/`
- target Java repository, artifactId, base package, and CLI class
- Java source / target compatibility, normally `1.8`
- Maven as the build tool
- JUnit Jupiter as the test framework
- primary verification command, normally `mvn test`
- runtime packaging shape: executable fat jar, and distribution zip when useful
- Maven plugin support is out of initial scope by default unless the developer
  explicitly requests it at the start
- whether the upstream body is vendored, connected as a remote, or cloned under
  `workplace/`
- the intended compatibility target, such as CLI JSON parity, generated file
  parity, Maven plugin behavior when explicitly requested, or a narrower
  partial conversion

Do not start by redesigning the upstream product for Java. Preserve upstream
file boundaries, vocabulary, request / result shapes, diagnostics, and CLI
behavior unless the user explicitly asks for a separate Java-side extension.

## Sister Java Reference Projects

For initial conversion, use one or more existing
miku-soft `-java` companion repositories expanded under `workplace/` as
sister-project references.

Treat these sister projects as practical shape references for Maven layout,
package naming, CLI entry points, core API boundaries, tests, docs, release
workflows, distribution packaging, and Java-side extension separation. Use the
basic documents as the source of design intent, and use the `workplace/`
sister projects to confirm implementation details that are easy to miss.

When multiple `-java` references are available, prefer the newer project version
or the project closest to the target product shape, such as CLI-only, JSON
contract, generated artifact, Maven plugin, or distribution zip.

Do not copy `workplace/` contents into the target repository wholesale. Copy or
adapt only the necessary patterns, and keep `workplace/` local-only according
to repository convention rules.

## Maven Plugin Scope

Maven plugin support is optional for Java straight-conversion projects, and is
off by default during initial conversion.

The default initial target is to stabilize the runtime core, CLI or batch
adapter, upstream parity, tests, packaging, and documentation. Maven plugin
support adds module structure, Mojo classes, parameters, lifecycle assumptions,
plugin smoke tests, and user-facing docs, so adding it too early can obscure
the straight-conversion boundary.

If the developer explicitly requests Maven plugin support at the start, include
it in scope and fix the plugin artifactId, goal prefix, goals, parameters, and
verification commands early. Otherwise, treat Maven plugin support as a
Java-side extension that can be added after the runtime core contract is stable.

Near the finishing stage, confirm whether Maven plugin support should remain
out of scope, be recorded as a follow-up item, or be added as a final extension.
Prefer adding it only when the product naturally performs build-time generation,
validation, conversion, indexing, or report creation.

## Repository Shape

Prefer this shape unless the target repository already has a consistent local
pattern:

- `.mvn/jvm.config` for repository-local Maven JVM settings when needed
- `pom.xml` at the root, or a root aggregator with runtime and plugin modules
- `src/main/java/` for a single-module runtime
- `<runtime-module>/src/main/java/` for a multi-module runtime
- `src/test/java/` or `<module>/src/test/java/` for focused regressions
- `docs/` for mapping, parity, development, and migration documents
- `vendor/<upstream-name>/` when a checked-in upstream snapshot is used
- `workplace/.gitkeep` only; use other `workplace/` files as local scratch

Keep required fixtures under normal tracked test or docs paths. Do not hide
required implementation inputs under `workplace/`.

Bundled starter templates are available under
`assets/java-straight-conversion/`:

- `.mvn/jvm.config`
  - Maven JVM settings that prefer IPv4 for environments where dependency
    resolution is affected by IPv6 behavior.
- `.github/workflows/release-cli-runtime.yml`
  - GitHub Release asset workflow for a single CLI runtime jar and source jar.
  - Trigger from `push` tags matching `v*` and manual dispatch with an
    explicit `tag_name`.
  - Keep the `push` tag trigger when migrating an existing sister project that
    already releases by running `git push origin vX.Y.Z`.
  - Do not trigger this shared template from GitHub Release `published` events
    by default. When `softprops/action-gh-release` creates or updates the
    GitHub Release from a tag-push workflow, a separate release-published
    trigger can cause a second run for the same tag.
  - Use `workflow_dispatch` with an explicit `tag_name` when release assets need
    to be recreated or attached to an existing GitHub Release manually.
  - The workflow checks the release tag version against `pom.xml`, builds from
    the release tag, stages `<artifact>-<version>.jar` and
    `<artifact>-sources-<version>.jar`, verifies the runtime jar with Java 8
    using `java -jar ... --version`, and uploads only the staged jar assets.
  - The template uses Maven standard output names as its copy source:
    `<artifactId>-<project.version>.jar` and
    `<artifactId>-<project.version>-sources.jar`. Keep this default unless the
    target repository intentionally sets `<finalName>` to a fixed runtime name,
    in which case update the copy source paths explicitly.
  - The template obtains `project.version` with
    `mvn help:evaluate -Dexpression=project.version -q -DforceStdout` rather
    than by reading the first `<version>` tag, so parent POM and multi-module
    layouts are less likely to resolve the wrong version.
  - The template obtains `project.artifactId` with
    `mvn help:evaluate -Dexpression=project.artifactId -q -DforceStdout`, so
    the release asset copy source and staged asset names do not need a
    hard-coded artifactId.
  - Set up the build JDK explicitly, normally Temurin Java 21 with Maven cache,
    before `mvn -B package`; set up Java 8 separately for the packaged runtime
    smoke test.
  - The template uses `softprops/action-gh-release` so tag-push releases can
    create or update the GitHub Release assets for that tag. Keep
    `permissions: contents: write` and explicit asset overwrite behavior.
  - Adjust `RUNTIME_TARGET_DIR` for multi-module runtime repositories so the
    runtime module's `target/` directory, such as `miku-xlsx2md/target`, is used
    instead of the aggregator root `target/`.
- `pom-cli-runtime.xml`
  - Starter `pom.xml` for a single-module CLI runtime jar with Java 1.8,
    JUnit Jupiter, Jackson, source jar, shaded runtime jar, and dist zip.
  - The starter follows Maven standard artifact naming, so the package output
    is normally `target/<artifactId>-<version>.jar` and
    `target/<artifactId>-<version>-sources.jar`.
  - Copy to `pom.xml`, then replace `__ARTIFACT_ID__`, `__VERSION__`,
    `__PROJECT_NAME__`, `__DESCRIPTION__`, `__GITHUB_REPOSITORY__`, and
    `__MAIN_CLASS__`.
  - Remove Jackson if the runtime does not expose or consume JSON.
- `src/assembly/dist.xml`
  - Distribution zip descriptor used by `pom-cli-runtime.xml`.
  - Replace `__CLI_SPEC_DOC__`, or remove that file entry if the repository has
    no CLI spec document yet.

## Required Tracking Documents

Create or maintain the documents that fit the repository's scope:

- `docs/upstream-snapshot.md`
  - Records upstream URL, branch, commit, tag or version, and vendored path.
  - Use when the repository keeps a stable vendored upstream snapshot.
- `docs/upstream-class-mapping.md`
  - Maps `upstream file -> Java class / package`.
  - Include notes when one upstream file becomes multiple Java classes, or when
    multiple upstream files share a Java helper.
- `docs/upstream-test-mapping.md`
  - Maps upstream test intent, fixtures, and contract cases to Java tests or
    smoke scripts.
  - Include focused commands such as `mvn test -Dtest=...`.
- `docs/upstream-cli-mapping.md` or a CLI section in README
  - Use when the upstream CLI has command families, options, stdin / stdout
    behavior, exit codes, or partial implementation status to track.
- `docs/cli-json-parity.md`
  - Use when stdin / stdout JSON compatibility is the primary target.
  - Fix stdout, stderr, exit codes, field names, ordering, defaults,
    diagnostics, pretty printing, and known runtime differences.
- `docs/upstream-followup-log.md`
  - Record concrete upstream diff checks, follow-up decisions, accepted runtime
    differences, and upstream bugs found during conversion.
- `docs/remaining-migration-items.md` or equivalent status document
  - Keep completed preparation, completed implementation, pending units,
    focused regressions, latest verification, and next step.
- `docs/development.md` or `docs/development-status.md`
  - Keep maintainer commands, repository structure, local workspace rules, and
    focused regression flow out of the user-facing README.

Top-level `README.md` should remain user-facing: purpose, usage, build outputs,
runtime differences, and links to deeper development documents.

## Implementation Order

Use this order for initial conversion unless upstream structure suggests a
smaller safe slice:

1. Inventory upstream source files, tests, fixtures, CLI commands, public API,
   generated artifacts, and runtime dependencies.
2. Decide target scope and out-of-scope items before coding.
3. Create the Maven skeleton, package base, test setup, and executable entry
   point.
4. Create model classes that preserve upstream JSON or data contracts.
5. Add JSON, text, binary, path, encoding, glob, regex, or codec helpers needed
   by upstream semantics.
6. Port validation and diagnostic construction before broad processing logic.
7. Port core processing behind a callable core API.
8. Add CLI or batch adapters that delegate to the core API.
9. Add Maven plugin modules only when explicitly in scope, and only after the
   runtime core contract is stable.
10. Add packaging, distribution zip, release workflow, and documentation sync
    tests when they are part of the product contract.

Keep `main(String[] args)` thin. Prefer a testable CLI method such as
`run(String[] args, PrintStream out, PrintStream err)` and confine
`System.exit` to the outermost boundary.

## Compatibility Rules

Treat upstream-derived behavior as the default contract:

- request and result field names
- JSON top-level shape and version fields
- diagnostic codes and severities
- path normalization and absolute-path avoidance
- stdout / stderr roles
- exit codes
- help and version output
- default values, limits, and validation failures
- generated artifact names, contents, and ordering where visible
- fixture behavior and edge cases covered by upstream tests

Document Java-side runtime differences explicitly. Common examples include
Java `Pattern` versus Node.js `RegExp`, Java charset behavior versus Node-side
encoding libraries, ZIP / XML library differences, and Java-side Maven plugin
or batch extensions when they are in scope.

Java-side extensions are allowed when useful, but keep them separate from the
upstream contract in README, CLI specs, mapping documents, and tests.

## Regression Strategy

Prefer focused regression commands that explain the changed area:

- model / JSON shape tests
- request contract and validation tests
- path security, glob, regex, encoding, codec, or parser tests
- core API tests
- CLI stdout / stderr / exit-code tests
- documentation synchronization tests
- Node-vs-Java parity scripts when practical
- packaged jar smoke scripts after `mvn package`
- Maven plugin smoke scripts for plugin modules, when plugin support is in
  scope

When parity scripts generate local fixtures or comparison outputs, write them
under `workplace/` and keep those outputs untracked.

For docs-only changes, additional tests are usually not required. Run focused
tests when the docs change executable commands, public CLI examples, JSON
contract examples, or packaging assumptions.

## Maintenance Flow

When following upstream after the initial conversion:

1. Check the upstream snapshot or latest upstream diff.
2. Find affected Java classes through `docs/upstream-class-mapping.md`.
3. Find focused Java tests through `docs/upstream-test-mapping.md`.
4. Apply the smallest Java change that preserves upstream traceability.
5. Update parity, CLI, README, development, and migration documents if the
   observable contract or scope changed.
6. Record the check in `docs/upstream-followup-log.md`.
7. Run the focused regression command first, then broader `mvn test` or
   `mvn package` when warranted.

Do not silently absorb upstream bugs as Java design changes. Record them as
follow-up or communication items, and only diverge intentionally when the user
confirms the Java side should carry a separate behavior.

## Completion Checklist

Before finishing a conversion task:

- upstream source and target Java repository are clear
- for initial conversion, sister `-java` reference was inspected, or its local absence was recorded
- upstream-derived behavior and Java-side extensions are separated
- mapping documents reflect changed source, tests, or CLI contracts
- README and docs agree with current runtime behavior
- TODO or migration status records remaining work and latest verification
- Maven plugin support is explicitly marked as out of scope, follow-up, or
  implemented extension
- focused regressions were run, or the reason for not running them is clear
- `git status --short` has been checked
- final diff does not include unrelated changes
