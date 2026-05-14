# Miku Software Java Maven Plugin Design

This memo organizes design characteristics commonly expected for Maven plugin
repositories in the `miku` software series.

The initial versions of the related tools were created by `Mikuku` and Toshiki
Iga.

This document starts from the Java application design memo and the straight
conversion guide, but separates Maven plugin concerns from the Java runtime
repository.

## Design Summary

Maven plugin repositories in the `miku` software series can be summarized as
follows.

> Build-tool adapter repositories that expose a miku Java runtime through Maven
> goals while keeping product processing, artifact semantics, diagnostics, and
> reproducibility owned by the corresponding Java runtime repository.

A Maven plugin repository is not a second Java implementation of the product.
It is an adapter around the public API and runtime contracts of the
corresponding `<product>-java` repository.

What characterizes Maven plugin repositories is a repeated set of constraints.

- Keep product core logic in `<product>-java`
- Keep the Maven plugin repository focused on Maven goals, parameters, logging,
  execution context, examples, and plugin tests
- Depend on the published Java runtime/core artifact instead of copying source
  code
- Keep Maven parameter vocabulary aligned with the Java runtime API and CLI
  where practical
- Make plugin execution reproducible and testable in normal Maven projects
- Keep lifecycle binding opt-in
- Document full-coordinate invocation separately from short-form prefix usage

## Role of This Document

This document describes the design of separated Maven plugin repositories such
as `<product>-java-maven`.

It does not define the Java runtime repository itself. The runtime repository is
described by the Java application design memo.

It does not define the straight-conversion procedure from Node.js /
TypeScript to Java. That procedure is described by the straight-conversion
guide.

Use the related design documents together as follows.

- main-application design memo
  - describes the upstream miku main application
- Java application design memo
  - describes `<product>-java`, the Java runtime / CLI / core API repository
- Java Maven plugin design memo
  - describes `<product>-java-maven`, the Maven plugin adapter repository
- straight-conversion guide
  - describes how Java runtime behavior is created and maintained from the
    upstream product

This document separates the following levels.

- **Cross-cutting principles**: design policies that should generally be kept
  for Maven plugin repositories.
- **Recommended conventions**: repository shape, naming, parameters, testing,
  documentation, and release shapes that make maintenance easier.
- **Observed tendencies**: design habits visible in current Maven plugin work.
- **Product-specific notes**: concrete examples for specific plugin
  repositories when available.

When a specification is unclear, first check whether the decision keeps the
plugin as a thin Maven adapter over the Java runtime. Maven convenience is
important, but it should not create a separate product meaning or duplicate
core processing.

## Scope

This document focuses on separated Maven plugin repositories for miku Java
runtime products.

The target repository shape is:

- `<product>-java`
  - Java runtime / CLI / core API / jar / distribution zip
- `<product>-java-maven`
  - Maven plugin adapter over `<product>-java`

The Maven plugin repository usually exposes one or more Maven goals for:

- generation
- validation
- conversion
- report creation
- index creation
- documentation artifact creation

Out of scope:

- Web UI and Single-file Web App behavior
- Node.js / TypeScript main application packaging
- Java runtime core implementation
- duplicating product conversion, parsing, validation, or artifact assembly
  logic inside the plugin repository

## Relationship to Java Runtime Repositories

The corresponding `<product>-java` repository owns the product processing
contract.

It should provide:

- public Java API
- CLI
- reusable options and result objects
- runtime jar
- sources jar
- distribution zip when useful
- tests for core behavior and CLI behavior
- mapping and compatibility documents

The `<product>-java-maven` repository owns the Maven adapter contract.

It should provide:

- Maven plugin artifact
- Mojo classes
- goal names
- parameter names and defaults
- Maven logging behavior
- skip behavior
- plugin examples
- plugin integration or smoke tests
- plugin-facing documentation

The Maven plugin repository depends on the Java runtime artifact. It should not
copy Java runtime source files into the plugin repository as normal
implementation code.

Repository separation does not change the product contract. It only separates
release cadence, maintenance focus, Maven-specific documentation, and Maven
plugin test environments from the runtime repository.

## Cross-Cutting Principles

Maven plugin repositories emphasize the following cross-cutting principles.

1. Treat the plugin as a thin adapter over the Java runtime/core API.
2. Keep product semantics, artifact roles, validation, and conversion logic in
   `<product>-java`.
3. Use Maven parameters to map build configuration into Java runtime options.
4. Keep Maven logging separate from generated artifacts and primary outputs.
5. Make plugin execution deterministic from the same project inputs and plugin
   configuration.
6. Prefer explicit invocation first; lifecycle binding should be opt-in.
7. Keep full-coordinate invocation documented because short-form prefix
   resolution depends on Maven configuration.
8. Test plugin behavior in a Maven-like execution context, not only by unit
   testing helper methods.
9. Keep plugin version and runtime dependency version alignment explicit.

### Basic Philosophy of Maven Plugin Repositories

The value of a Maven plugin repository is not that the product becomes a Maven
product. It is that the existing Java runtime becomes easy to use inside Maven
builds without changing the product meaning.

Maven plugin repositories emphasize the following philosophy.

- Use Maven as an adapter layer, not as the semantic center
- Keep build inputs, outputs, and failure behavior explicit
- Keep plugin parameters close to Java runtime options and upstream vocabulary
- Keep generated artifact paths predictable
- Make skip, verbose, overwrite, recursive, and output-directory behavior
  documented where they exist
- Avoid lifecycle side effects unless the consuming project opts in
- Keep examples small and executable
- Record runtime dependency version expectations

### Repository Separation Principles

The Java runtime repository should remain a single-module Maven project.
Maven plugin support should be kept in a separated GitHub repository when a
plugin is needed.

The normal repository name is:

```text
<product>-java-maven
```

This repository separation keeps Maven-specific concerns from reshaping the
runtime repository.

The separated Maven plugin repository may have its own examples, smoke tests,
release workflow, and plugin documentation. It still depends on the Java
runtime artifact and should not become a second product implementation.

### Runtime Dependency Principles

The plugin should depend on the released runtime/core artifact from
`<product>-java`.

The dependency should be ordinary Maven dependency metadata, not a source-tree
relative dependency on a local checkout.

During local development, the runtime artifact may be installed into the local
Maven repository, but published plugin behavior should be explainable through
normal Maven coordinates.

For unreleased local use, users normally install both artifacts into their
local Maven repository:

1. install the runtime artifact from `<product>-java`
2. install the plugin artifact from `<product>-java-maven`
3. execute the plugin from the consuming project with full coordinates

The consuming project normally should not declare the runtime artifact only to
make the plugin work. The runtime is resolved as a Maven dependency of the
plugin artifact.

When the `<product>-java` jar is both executable and reusable, document both
roles clearly:

- CLI jar for `java -jar`
- runtime library artifact used by the Maven plugin dependency

The plugin documentation should state:

- required runtime artifact coordinates
- expected compatible runtime version
- how the plugin version relates to the runtime version
- local development command for installing or resolving the runtime dependency

### Runtime Core API Principles

The Java runtime/core API should be the stable integration point shared by CLI
and Maven plugin adapters.

Plugin-facing product behavior should not exist only inside CLI implementation
classes. Check especially:

- file conversion
- batch conversion
- diagnostics and progress reporting
- output path decisions
- overwrite, recursive, and failure behavior

When the Maven plugin needs one of these behaviors, provide it through the
runtime core API or a runtime helper. The Mojo should call that API as a thin
adapter, not invoke CLI implementation classes as its primary integration
point and not duplicate product behavior.

When behavior is extracted from CLI-only code into the runtime API, add focused
runtime-side tests for that contract before relying on it from the plugin
repository.

### Goal and Parameter Principles

Goal names should describe the build operation, not the internal Java class.

Good goal names are short and concrete, such as:

- `convert`
- `validate`
- `generate`
- `index`
- `report`
- `bundle`

Parameter names should map clearly to Java runtime options and CLI vocabulary.
Do not rename product concepts only because they are configured through Maven
XML.

Examples of stable parameter vocabulary:

- `inputFile`
- `inputDirectory`
- `outputFile`
- `outputDirectory`
- `recursive`
- `overwrite`
- `skip`
- `verbose`

When single-file and directory modes have incompatible options, reject invalid
combinations at plugin execution and document the constraint.

### Maven Logging and Diagnostics Principles

Maven plugin logging is an adapter-level diagnostic surface.

Use Maven logs for:

- progress
- skipped execution
- selected inputs
- generated output paths
- warnings
- timing where useful
- failure summaries

Do not emit generated artifact bodies through Maven logs.

The Java runtime result object should remain the source of structured warnings,
changes, and output summaries. The plugin maps those results into Maven logs
and build failures.

### Lifecycle Binding Principles

The plugin should work through explicit invocation first.

Lifecycle binding examples may be provided, but they should be opt-in examples
for consuming projects. The plugin should not assume that every use belongs in
the same lifecycle phase.

When lifecycle examples are documented, state the intended phase and why it is
appropriate for the product.

Common candidate phases include:

- `generate-resources`
- `process-resources`
- `verify`
- `site`

### Reproducibility Principles

Plugin execution should be reproducible from the same consuming project,
configuration, runtime version, and inputs.

Pay attention to:

- stable input traversal order
- stable output path mapping
- explicit encoding
- no accidental use of temporary paths in generated artifacts
- no current date or clock value unless declared as part of the artifact
- predictable overwrite behavior
- deterministic archive entry order when archives are generated

The Maven plugin should not weaken reproducibility guarantees already provided
by the Java runtime.

### Testing Principles

Maven plugin repositories need tests at two levels.

- unit tests for parameter mapping and helper behavior
- Maven execution tests or smoke tests for real plugin invocation

Plugin tests should cover:

- goal execution
- parameter mapping
- skip behavior
- invalid parameter combinations
- generated output files
- warning and failure behavior
- dependency resolution assumptions
- examples that appear in README or docs

When possible, keep at least one smoke project under a test or examples path so
that plugin usage can be checked as a consuming Maven project.

### Documentation Principles

The Maven plugin repository README should remain user-facing.

It should explain:

- what Maven goal the plugin provides
- required plugin coordinates
- required runtime/core dependency relationship when relevant
- full-coordinate invocation
- short-form invocation prerequisites
- basic configuration example
- lifecycle binding example when useful
- main parameters
- generated outputs
- failure behavior

Detailed maintenance notes, compatibility notes, and development commands
should live under `docs/`.

Recommended README order:

1. usage
2. local unreleased setup
3. configuration
4. development
5. release or publication notes

Usage should show full-coordinate invocation first. Short-form prefix
invocation may be documented afterward, with Maven plugin group resolution
prerequisites called out.

### `workplace/` Directory Principles

Maven plugin repositories use `workplace/` for local runtime checkouts,
temporary consuming projects, smoke inputs, generated outputs, and similar
local work.

Rules:

- keep `workplace/.gitkeep` tracked
- do not track normal files under `workplace/`
- do not depend on `workplace/` for normal build or test inputs
- keep required fixtures under tracked test, example, or docs paths
- treat runtime checkouts under `workplace/` or `../runtime` as reference
  checkouts, not reactor modules or build inputs
- use artifact-only resolution as the default; submodules, subtrees, copied
  `runtime/` directories, or source-tree reactor relationships require an
  explicit product-specific decision and should be recorded as non-default

## Recommended Conventions

### Repository Shape

A separated Maven plugin repository should normally be a single Maven plugin
project.

Representative shape:

```text
repository root
  pom.xml
  README.md
  LICENSE
  docs/
  examples/
  workplace/.gitkeep
  src/main/java/...
  src/test/java/...
```

Use `examples/` for small consuming project examples when they are maintained
as documentation or smoke-test inputs.

Do not place the Java runtime implementation in this repository.

### Maven Coordinates

Use the normal reverse-domain style for `groupId`.

The plugin artifactId should follow third-party Maven plugin conventions.

Preferred direction:

```text
<product>-maven-plugin
```

Do not use:

```text
maven-<product>-plugin
```

The `maven-<prefix>-plugin` form is reserved by convention for official Apache
Maven plugins and should not be used for normal miku plugin repositories.

The GitHub repository name and Maven artifactId do not need to be identical.
For example:

```text
GitHub repository: <product>-java-maven
Maven artifactId:  <product>-maven-plugin
```

This keeps the repository role explicit while keeping Maven plugin coordinates
familiar to Maven users.

### Plugin Prefix and Invocation

Align the desired command prefix with the plugin artifactId and explicitly set
`goalPrefix` in `maven-plugin-plugin` when needed.

For example, if the artifactId is:

```text
miku-indexgen-maven-plugin
```

then the expected prefix is:

```text
miku-indexgen
```

and a short-form invocation may look like:

```text
mvn miku-indexgen:index
```

Short-form invocation can fail when Maven cannot resolve the plugin group.
Therefore README and development docs should also include a full-coordinate
example such as:

```text
mvn jp.igapyon:miku-indexgen-maven-plugin:<version>:index
```

### Version Alignment

Plugin version alignment with the Java runtime version should be explicit.

The simplest policy is to keep the plugin version aligned with the compatible
runtime version.

When versions intentionally differ, document:

- compatible runtime version range
- reason for the mismatch
- minimum runtime version required by the plugin
- verification command used for the compatibility check

### Parameter Conventions

Use simple Maven parameter fields that map to runtime options.

Representative parameter names:

```text
inputFile
inputDirectory
outputFile
outputDirectory
recursive
overwrite
skip
verbose
```

Use `skip` as the normal Maven-facing skip parameter when a goal may be
disabled from configuration.

Use explicit defaults and keep them synchronized with README, plugin help, and
runtime defaults.

### Mojo Implementation Conventions

Mojo classes should be thin.

The typical flow is:

```text
Mojo parameters
  -> validate parameter combinations
  -> build runtime options object
  -> call runtime/core API
  -> map result warnings and summaries to Maven logs
  -> fail the build when runtime result indicates failure
```

Mojo classes should not duplicate:

- parsing
- conversion
- validation
- directory traversal
- artifact assembly
- deterministic output formatting

Those responsibilities belong to the Java runtime repository.

### Release and Publication Conventions

The Maven plugin repository should define release behavior separately from the
Java runtime repository.

Release checks should verify at least:

- plugin version
- runtime dependency version
- plugin descriptor generation
- unit tests
- smoke execution with full coordinates
- source jar publication when applicable

If the plugin is published to a Maven repository, document the publication
command and the human-owned publication steps separately from local build and
test commands.

### Required Tracking Documents

Create or maintain the documents that fit the repository's scope.

- `docs/development.md`
  - maintainer commands, local runtime dependency setup, smoke test commands
- `docs/plugin-parameters.md`
  - goals, parameters, defaults, invalid combinations, output paths
- `docs/runtime-compatibility.md`
  - compatible `<product>-java` versions and verification notes
- `docs/release.md`
  - release asset, publication, and version alignment notes

The exact file names may vary by product, but the information should remain
discoverable.

## Common Patterns Observed Across Maven Plugin Repositories

### Plugin as Build Adapter

The Maven plugin is most useful when the product naturally participates in
build-time work.

Examples:

- generate indexes
- validate local files
- convert source documents into generated artifacts
- create reports
- prepare documentation artifacts

The plugin should make those operations convenient in Maven without changing
the product's canonical meaning.

### Runtime API as the Center

The runtime/core API remains the center of behavior.

This lets:

- CLI and Maven plugin share the same processing behavior
- plugin tests focus on Maven configuration and execution
- runtime tests remain the primary guard for product semantics
- plugin repositories remain small and inspectable

### Full Coordinates for Reliable Smoke Tests

Short plugin prefix invocation is convenient for users, but it depends on
plugin group resolution.

Smoke tests and documentation should include full-coordinate invocation because
it is more reliable and makes the tested plugin version explicit.

### Directory and Batch Workflows

Maven plugins often process directories because Maven projects are directory
structured.

Directory and batch behavior should still be implemented in the Java runtime
API when it is shared with CLI or other automation. The plugin should configure
and call that behavior, not reimplement traversal rules.

## Product-Specific Notes

Product-specific sections may be added when Maven plugin repositories exist.

For each product, record:

- corresponding Java runtime repository
- plugin repository name
- Maven coordinates
- goal prefix
- goals
- main parameters
- runtime dependency version policy
- smoke verification command
- known runtime differences or plugin-only extensions

## Maintenance Policy

After a Maven plugin repository exists, maintenance should begin by checking
the corresponding Java runtime repository.

When runtime options, result objects, artifact roles, diagnostics, or batch
helpers change, update the Maven plugin mapping, tests, and documentation.

When plugin-specific behavior changes, keep the change documented as Maven
adapter behavior unless it also requires a runtime contract change.

Do not silently patch product behavior inside the plugin repository to work
around runtime behavior. If the runtime contract is wrong or insufficient, fix
or extend the runtime repository first, then update the plugin adapter.

## Summary

miku Maven plugin repositories are separated adapter repositories for Java
runtime products.

They make miku Java runtimes usable from Maven builds while keeping product
processing, artifact semantics, diagnostics, and reproducibility owned by the
corresponding `<product>-java` repository.

The guiding question is:

> Is this Maven behavior a thin, testable adapter over the Java runtime, or is
> it becoming a second implementation of the product?
