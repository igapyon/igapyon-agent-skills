# Java Maven Plugin Separation Workflow

Use this workflow when an existing miku-soft Java runtime repository already
contains a Maven plugin module, and the plugin adapter should be separated into
its own `<product>-java-maven` repository.

This workflow is for migration of an existing repository shape. For new Java
straight-conversion work, start from
[30-java-straight-conversion-workflow.md](30-java-straight-conversion-workflow.md).
For Maven plugin repository design principles, use
[miku-soft-basic/miku-soft-21-java-maven-design-v20260514.md](miku-soft-basic/miku-soft-21-java-maven-design-v20260514.md).

## Purpose

Separate these responsibilities:

- `<product>-java`
  - Java runtime, CLI, core API, parsing, conversion, rendering, batch behavior,
    diagnostics, runtime tests, runtime packaging, and distribution artifacts.
- `<product>-java-maven`
  - Maven plugin coordinates, Mojo classes, goal names, Maven parameters,
    plugin descriptor generation, plugin tests, plugin examples, smoke scripts,
    and runtime dependency compatibility notes.

The Maven plugin repository must remain a thin adapter over the runtime
artifact. Do not move product core behavior into the plugin repository, and do
not duplicate runtime conversion logic there.

## Cross-Repository Editing Boundary

During this workflow, treat the runtime repository and the Maven plugin
repository as separate work targets.

- While working in `<product>-java-maven`, do not modify `<product>-java`.
  The runtime repository may be cloned under `workplace/<product>-java` for
  reference, but use it as read-only context unless the user explicitly starts
  the runtime-side work.
- While working in `<product>-java`, do not modify `<product>-java-maven`.
  The plugin repository may be referenced for URL, ownership, compatibility,
  or release status, but use it as read-only context unless the user explicitly
  starts the plugin-side work.
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

- `[Human]` GitHub repository creation policy is clear if
  `<product>-java-maven` does not exist yet
- runtime repository and plugin repository are identified
- existing plugin module path is identified
- runtime artifact coordinates and version are identified
- plugin artifact coordinates, goal prefix, goals, and major parameters are
  identified
- product core behavior is confirmed to remain in `<product>-java`
- plugin repository responsibility is limited to Maven adapter behavior
- local reference checkout paths under `workplace/` are identified when needed
- the current work target is identified, and the other repository is treated as
  read-only context

### Checkpoint 2: Plugin Repository Established

Confirm before editing the runtime repository:

- `[Human]` `<product>-java-maven` GitHub repository has been created when this
  is a new separated repository
- plugin repository has been cloned locally as the work target
- `<product>-java-maven` has a standalone Maven plugin POM
- Mojo classes have been copied or recreated as adapter code
- plugin tests and only necessary fixtures have been moved or copied
- the plugin POM depends on `jp.igapyon:<product>` by normal Maven coordinates
- no runtime source-tree dependency remains
- full-coordinate plugin invocation is documented or scripted
- `mvn test` passes in the plugin repository, or failures are recorded before
  proceeding

### Checkpoint 3: Plugin Smoke Verified

Confirm before removing the old plugin module from the runtime repository:

- compatible runtime artifact is available through local install or repository
  resolution
- smoke execution runs from a minimal Maven project context when needed
- smoke execution uses full coordinates
- smoke covers each separated goal at least once
- generated artifacts and diagnostics are checked enough to prove the Mojo calls
  the runtime contract
- plugin repository changes are locally committed, or the reason for delaying
  the commit is recorded
- `[Human]` push, tag creation, and GitHub Release policy for the plugin
  repository is clear before moving to runtime repository cleanup

### Checkpoint 4: Runtime Repository Cleaned

Confirm after plugin repository verification:

- old plugin module is removed from the runtime reactor
- plugin-only POM settings, dependencies, scripts, and docs are removed from the
  runtime repository
- runtime docs no longer present plugin usage as runtime-owned behavior
- runtime docs cross-link to the separated plugin repository
- mapping, status, and worklog documents record Maven plugin checks as
  separated-repository concerns

### Checkpoint 5: Runtime Layout Finalized

Confirm when the runtime repository is flattened or otherwise reshaped:

- root `pom.xml` has the intended runtime artifact packaging
- source and test paths match the intended single-module or multi-module shape
- release workflows and scripts point at current `src/` and `target/` paths
- expected runtime artifacts are documented with current paths
- Git move/rename detection is preserved where practical by staging old and new
  paths together

### Checkpoint 6: Independent Verification Complete

Finish only after both repositories are verified independently:

- runtime repository verification passes with `mvn test` and `mvn package`
- product-specific runtime verification, such as CLI comparison, passes or is
  explicitly recorded as not run
- plugin repository verification passes with `mvn test`
- plugin smoke script passes with full-coordinate execution
- both repositories have current ownership notes and cross-links
- remaining follow-up items are recorded in TODO or worklog files
- `[Human]` any required GitHub push, tag creation, release publication, release
  asset upload, and registry publication steps are listed separately from local
  repository work

## Required Initial Input

Before editing files, identify:

- runtime repository: `<product>-java`
- separated Maven plugin repository: `<product>-java-maven`
- existing plugin module path in the runtime repository, when present
- runtime Maven artifact coordinates, normally `jp.igapyon:<product>`
- plugin Maven artifact coordinates, normally
  `jp.igapyon:<product>-maven-plugin`
- plugin goal prefix, goals, and required Maven parameters
- runtime version that the separated plugin should depend on
- local reference checkout path under `workplace/`, when one repository needs
  to inspect the other

If either repository does not exist yet, create or prepare it as a separate
repository task. Do not use a source-tree reactor relationship as the target
shape.

## First Reads

1. Read [architecture-rules.md](architecture-rules.md).
2. Read the Java runtime and Java Maven plugin basic documents.
3. Inspect both repositories' README, docs, TODO, Maven POMs, tests, scripts,
   release workflows, and current git status.
4. Inspect the existing plugin module or plugin-like adapter code in
   `<product>-java`.
5. Inspect a completed same-layer sister example when available, such as a
   previously separated `<product>-java-maven` repository under `workplace/`.

## Separation Policy

Use the runtime artifact dependency as the boundary.

- Establish and verify the separated plugin repository first, then remove the
  old plugin module and plugin-only material from the runtime repository.
- The separated plugin POM depends on `jp.igapyon:<product>` by normal Maven
  coordinates.
- The runtime repository does not keep the plugin module in its root reactor.
- The plugin repository does not depend on runtime source paths.
- Plugin tests may keep only the fixtures needed to test Mojo behavior.
- Runtime tests remain in the runtime repository.
- Maven plugin smoke checks belong to the plugin repository.
- Runtime CLI and package verification belong to the runtime repository.

If directory or batch processing is shared by CLI and Maven plugin goals, keep
that behavior in the runtime API or runtime helper. The Mojo should call it as
an adapter.

## Plugin Repository Work

In `<product>-java-maven`:

1. `[Human]` Create the GitHub repository when `<product>-java-maven` does not
   exist yet.
2. Confirm the repository name and Maven naming:
   - repository: `<product>-java-maven`
   - plugin artifactId: `<product>-maven-plugin`
   - groupId: `jp.igapyon`
   - goal prefix: `<product>`
3. Clone the plugin repository locally and use it as the work target.
4. Create repository convention files if missing:
   - `.gitignore`
   - `.mvn/jvm.config` when needed
   - `workplace/.gitkeep`
5. Record the CLI / core runtime repository URL in README, docs, or the
   migration worklog.
6. Clone or place the runtime repository under `workplace/<product>-java` when
   local inspection is needed. Treat this checkout as read-only context during
   plugin-side work.
7. Copy only Maven adapter code from the old plugin module:
   - Mojo classes
   - plugin-specific tests
   - plugin-specific test fixtures
   - plugin examples
   - plugin smoke scripts
   - plugin documentation
8. Replace the copied module POM with a standalone Maven plugin POM.
9. Add a normal dependency on the runtime artifact:
   - `jp.igapyon:<product>:<compatible-version>`
10. Configure plugin descriptor generation and the explicit goal prefix when
   needed.
11. Keep goal names and parameter names aligned with the runtime API and CLI
   vocabulary where practical.
12. Add a minimal Maven example project under `examples/` when full-coordinate
   goal execution needs a project context.
13. Document:
   - full-coordinate invocation
   - short-form invocation prerequisites, if documented at all
   - runtime artifact compatibility
   - local install requirement when the runtime artifact is not published
   - plugin parameters and generated artifacts
14. Add or update a smoke script that executes goals with full coordinates.
15. Commit the local plugin repository changes after tests and smoke pass.
16. `[Human]` Push the plugin repository branch.
17. `[Human]` Create the plugin repository tag and GitHub Release when the
    repository is ready for release.

## Runtime Repository Work

In `<product>-java`:

1. Confirm that the plugin repository work is complete enough to treat
   `<product>-java-maven` as the owner of Maven plugin behavior.
2. Record the separated Maven plugin repository URL in README, docs, or the
   migration worklog.
3. Remove the Maven plugin module from the root Maven reactor.
4. Remove plugin-only POM properties, plugin management entries, dependencies,
   and build settings.
5. Remove plugin invocation examples and plugin smoke instructions from runtime
   README and development docs.
6. Remove plugin smoke scripts from the runtime repository.
7. Update mapping, status, and development documents so Maven plugin tests and
   smoke checks are separated-repository concerns.
8. Add cross-links to the separated plugin repository.
9. Keep runtime docs focused on runtime artifact coordinates, CLI usage, core
   API, runtime tests, packaging, and release assets.
10. Treat the separated plugin repository as read-only context during
    runtime-side work.
11. Commit the local runtime repository changes after tests and package checks
    pass.
12. `[Human]` Push the runtime repository branch.
13. `[Human]` Create the runtime repository tag and GitHub Release when the
    repository is ready for release.

If the runtime module is the only remaining module after plugin removal:

1. Move runtime sources from `<runtime-module>/src/` to repository-root `src/`.
2. Move assembly descriptors such as `<runtime-module>/src/assembly/dist.xml`
   to `src/assembly/dist.xml`.
3. Merge the former runtime module POM into the root `pom.xml`.
4. Change the root project from aggregator POM to the runtime jar artifact.
5. Update artifact paths from `<runtime-module>/target/...` to `target/...`.
6. Update release workflows, scripts, README, and docs for the root-level
   `src/` and `target/` layout.

When staging this kind of flattening, stage the old and new paths together so
Git can detect source and test moves as renames where possible.

## Documentation To Keep

Prefer a short worklog in both repositories while performing the migration.

Runtime repository worklog should record:

- separated plugin repository URL
- removed plugin module path
- runtime layout changes
- intentionally deleted paths
- intentionally moved paths
- new runtime artifact output paths
- runtime verification commands and results
- follow-up items that belong to the plugin repository

Plugin repository worklog should record:

- runtime repository URL
- local runtime checkout path
- copied Mojo classes
- copied plugin tests and fixtures
- standalone plugin POM creation
- runtime dependency coordinates
- smoke example project
- plugin verification commands and results
- follow-up items that belong to the runtime repository

## Verification

Verify the runtime repository independently:

```bash
mvn test
mvn package
```

Also run product-specific runtime checks, such as CLI comparison scripts, when
the repository already documents them.

Verify the plugin repository independently after the compatible runtime
artifact is available through local install or a repository:

```bash
mvn test
sh scripts/smoke-maven-plugin.sh
```

Use full-coordinate plugin execution in permanent smoke checks. Short-form
execution depends on Maven plugin group resolution and should be documented as
optional or environment-dependent.

## Completion Checklist

- runtime repository no longer contains the Maven plugin module
- runtime repository builds as the intended runtime artifact
- runtime artifact paths in README, docs, scripts, and workflows are current
- plugin repository builds as a standalone Maven plugin artifact
- plugin repository depends on the runtime artifact by Maven coordinates
- Mojo classes call runtime APIs or runtime contracts instead of duplicating
  product logic
- plugin tests and fixtures are limited to plugin behavior
- plugin smoke executes from a minimal Maven project with full coordinates
- both repositories document ownership and cross-link to each other
- TODO or worklog files record any remaining runtime-side or plugin-side
  follow-up items
