# Software Completion Review

Use this reference to review whether one software project appears complete
enough to be treated as usable, releasable, or ready for a first public
version.

This review is broader than code review. It checks user-facing readiness,
remaining work, documentation, test sufficiency, implementation cleanup,
packaging, release flow, and whether GitHub release assets can be attached for
version tags such as `v0.5.0`.

## Review Priority

Use this review when the user asks whether a software project is complete,
done, releasable, ready for first release, ready for public use, or ready for a
version tag.

Also use it when the review target is a whole repository and the user wants a
completion judgment rather than only code findings.

Apply repository entrypoint review together with this review when README,
`TODO.md`, Markdown freshness, or file structure are part of the completion
question.

Apply [agent-skill-review.md](../../20-targets/agent-skill/agent-skill-review.md) when the project being
judged is an igapyon-managed Agent Skill.

Before applying miku-soft or igapyon-specific completion checks, classify the
target using
[project-convention-detection-review.md](../../00-start-here/project-convention-detection-review.md).
Use generic completion checks for unrelated OSS, private, proprietary, or
unknown projects unless their own repository conventions say otherwise.

## Completion Dimensions

Review completion across these dimensions:

- user entrypoint: README, examples, usage path, prerequisites, limitations
- remaining work: `TODO.md`, issue tracker, comments, disabled tests, skipped
  checks, placeholder docs
- implementation state: intended features present, no obvious unfinished paths,
  no dead scaffolding in normal flows
- refactoring state: duplicated or temporary code cleaned up where it affects
  maintainability, behavior, or release confidence
- refactoring need: accumulated code, Markdown, references, or generated
  workflows are checked for whether work should pause for reorganization before
  more additions or release
- tests and smoke checks: core behavior covered, public commands or artifacts
  smoke-tested, release assets verified
- documentation freshness: Markdown follows current implementation, commands,
  configuration, output, and artifacts
- packaging: distributable files are built, named, scoped, and reproducible
- release readiness: version, tag, release workflow, asset upload, and release
  notes are aligned
- local safety: generated files, temp files, secrets, and local work folders are
  not accidentally packaged or published
- structured data generation: XML, JSON, JSONL, YAML, CSV, or metadata
  generation uses appropriate libraries and streaming/in-memory processing for
  expected data sizes
- source licensing: miku-soft source files carry the expected license header,
  and non-miku-soft projects follow only their own visible header convention
- OSS redistribution readiness: bundled or vendored OSS binaries have matching
  source availability, notices, and provenance appropriate for release
- Java/Maven local stability: igapyon Java or Maven repositories include
  `.mvn/jvm.config` with required IPv4-preference settings when that convention
  applies
- sibling reference use: related miku-soft or nearby sibling projects are
  consulted when they would make implementation or review safer, faster, or
  more consistent
- Agent Skill readiness: igapyon-managed skills include generated `index.json`
  and `SKILL.md` references it as a discovery index
- Agent Skill maintainability: `SKILL.md` stays lean and delegates detailed
  rules, examples, and long workflows to `references/`
- CLI-backed Agent Skill readiness: bundled or expected CLI runtimes are
  discoverable, smoke-tested, mapped to skill operations, and not silently
  reimplemented by the skill

## README and User Readiness Checks

Check these points:

- root `README.md` exists
- README explains what the software is before explaining how to develop it
- README is usable by a general user, not only by contributors
- primary install, run, or usage path is visible
- examples match current behavior
- requirements and supported environments are stated
- limitations, non-goals, and known constraints are visible when relevant
- release artifact roles are clear, such as CLI, Web App, jar, package, bundle,
  source archive, docs, or installer
- Agent Skill usage guidance includes `index.json` when the project is an
  igapyon-managed skill
- Agent Skill `SKILL.md` is a concise entrypoint rather than a large rulebook,
  with detailed material discoverable under `references/`
- CLI-backed Agent Skill instructions explain how supported operations call the
  intended CLI, where the runtime is found, and what happens when it is missing

If README is missing or developer-first, the project should not be considered
complete for public use even when the implementation works.

## TODO and Remaining Work Checks

Check whether unfinished work remains:

- `TODO.md` is missing when active local tasks clearly exist
- `TODO.md` contains unresolved implementation, documentation, release, or test
  tasks
- completed or obsolete items make current status hard to judge
- source comments contain `TODO`, `FIXME`, `XXX`, `HACK`, or "temporary" in
  release-relevant paths
- docs mention future work as if it is still required for normal use
- tests are skipped, disabled, or marked as temporary without explanation
- issue tracker or release notes mention blockers that are not reflected in
  local docs

Not every TODO blocks release. Classify whether each remaining item is a
release blocker, post-release follow-up, or optional idea.

## Implementation Completion Checks

Check whether the implemented behavior appears finished:

- primary user workflows are implemented end to end
- documented commands, options, files, APIs, UI actions, or tools exist
- unsupported modes fail visibly rather than silently doing partial work
- validation errors are understandable
- output artifacts are deterministic enough for review and tests when relevant
- defaults are documented and match the implementation
- version output, help output, metadata, and package information are consistent
- development scaffolding does not leak into normal user-visible behavior
- structured data generation/parsing code uses library APIs for escaping,
  encoding, namespaces, JSON syntax, and streaming when appropriate, rather than
  unsafe ad hoc string construction
- miku-soft or nearby igapyon project source files follow the confirmed
  repository convention for copyright year or year range, copyright holder,
  and `SPDX-License-Identifier: Apache-2.0` when that convention applies
- non-miku-soft source files are not treated as missing headers unless the
  repository has its own visible header or SPDX convention
- copied or redistributed OSS libraries under `lib/`, `vendor/`, `runtime/`, or
  release assets have visible license, notice, source availability, and
  provenance handling
- Java projects that copy OSS jars into `lib/` include matching `*-sources.jar`
  files when this is the project convention or license expectation
- Java / Maven projects include `.mvn/jvm.config` with:

```text
-Djava.net.preferIPv4Stack=true
-Djava.net.preferIPv6Addresses=false
```

  when following igapyon's Maven local-development convention

Flag incomplete implementation when public docs describe behavior that code
does not provide, or code provides behavior that is invisible to users.

## Refactoring and Maintainability Checks

Completion does not require perfect internals. Review refactoring only where it
affects release confidence or future maintenance.

Use [refactoring-need-review.md](../../10-perspectives/maintenance/refactoring-need-review.md) when the main
question is whether accumulated code, documentation, references, or generated
artifacts should be reorganized before continuing.

Check these points:

- duplicated product logic does not create divergent behavior across CLI, UI,
  API, MCP, Java, Node, or skill surfaces
- temporary adapter code is not left on the primary path
- large functions or modules are not hiding multiple product responsibilities
  that should be tested separately
- error handling and diagnostics are not scattered or inconsistent
- file naming, artifact naming, and domain terms are consistent
- configuration, version, and path constants have a clear source of truth
- generated files and source files are not mixed in a way that makes review or
  release unsafe

Treat refactoring as a blocker when the current structure causes observable
bugs, inconsistent outputs, untestable release behavior, or high risk of
breaking the public contract.

## Sibling Project Reference Checks

For miku-soft and nearby igapyon work, check whether sibling software should be
consulted before judging a new or updated project complete.

Actively prefer referring to sibling project source code, README, release
workflows, tests, CLI behavior, Agent Skills, packaging scripts, or docs when
that would be more efficient or safer than inventing a new pattern.

Check whether:

- a sibling project already solves the same CLI, Web App, MCP, Java, Maven,
  Agent Skill, release, packaging, or documentation problem
- similar repositories use a standard README, TODO, license, notice,
  contributor, or release structure
- tests, smoke checks, generated artifact checks, or bundle checks can be
  modeled after a sibling project
- versioning, tag, artifact naming, and GitHub Release behavior align with
  sibling conventions
- user-facing terms and artifact roles match the sibling series
- differences from sibling behavior are intentional and documented

If the relevant sibling repository, source tree, release artifact, or docs are
not available locally, ask the human to provide or fetch them when the reference
would materially improve safety or consistency. Do not guess sibling behavior
from memory when the decision matters.

Flag issues when:

- a project invents a new structure where a sibling convention exists
- sibling projects clearly use a safer release, packaging, test, or docs pattern
  but the reviewed project diverges without explanation
- review cannot confirm an important convention because the needed sibling
  source or artifact is missing and no request was made
- copied sibling behavior is stale or mismatched because the current sibling
  source was not checked

## Test Sufficiency Checks

Check whether tests are enough for the claimed completion state:

- unit tests cover core logic and edge cases that define product meaning
- integration or smoke tests cover primary user workflows
- CLI tools have `--help` and `--version` smoke checks when applicable
- Web Apps have at least build or static artifact checks, and visual/runtime
  smoke when practical
- MCP servers have startup, tool schema, and representative tool call checks
  when applicable
- release bundles or archives have contents checks
- generated outputs are compared with stable expectations when feasible
- failure cases, validation errors, and unsupported inputs are tested
- tests run through documented commands
- CI or local verification commands are described clearly

For Agent Skills, check whether `index.json` generation is part of the normal
verification or release process when references, assets, or helper files change.
For CLI-backed Agent Skills, check whether the bundled or expected CLI has
`--help` and `--version` smoke checks and whether the skill's operation mapping
matches the CLI contract.

Do not require exhaustive tests for a small project. Require enough tests that
the primary contract can be changed intentionally and verified.

## Release Readiness Checks

Use these checks when GitHub, tags, release pages, packages, or downloadable
files are in scope:

- version source is clear, such as `package.json`, `pom.xml`, skill metadata,
  source constant, or tag
- release tag format is documented, normally a `v` prefix such as `v0.5.0`
- first public or miku-soft-style versions that start at `0.5.0` use that value
  consistently when the repository follows that convention
- runtime `--version`, package metadata, artifact filenames, and release tag
  agree
- GitHub Actions or local scripts can build release artifacts from the tag
- release workflow has a mechanism to attach files to the GitHub Release page
  when release assets are expected
- release assets are named with product and version where practical
- artifact upload globs cannot attach stale, broad, private, or unintended
  files
- release workflow fails when expected artifacts are missing
- release notes or GitHub Release text can be generated or written from actual
  changes
- npm, Maven, GitHub Release assets, source archives, and runtime artifacts are
  treated as distinct roles

For a `v*` tag release, check whether the repository has one of these:

- a GitHub Actions workflow triggered by tag push that builds and uploads assets
- a documented manual release script that creates versioned assets and explains
  how to attach them
- a clear statement that no release assets are expected for the project

If release assets are expected but there is no upload or attachment mechanism,
treat that as a completion gap.

## GitHub Public Readiness Checks

When the repository is intended for GitHub public use, check:

- repository About text can be inferred or is documented
- README first screen works on GitHub without local context
- license is present when reuse or distribution is expected
- `.gitignore` excludes local work folders, generated release staging, secrets,
  and OS/editor files
- GitHub Actions required for verification or release are present and scoped
- release page workflow is documented enough for a maintainer to use
- links in README and docs are valid or intentionally local

## Severity Guidance

Use these severity levels:

- Critical: release or packaging can expose secrets, private files, local work
  folders, or unintended artifacts.
- High: no general-user README exists for a project intended for public or
  external use.
- High: documented primary behavior is not implemented end to end.
- High: release assets are expected, but no tag-based or documented mechanism
  can build and attach them.
- High: version, tag, runtime output, package metadata, or release asset names
  can diverge without failure.
- High: primary workflows lack any meaningful test or smoke coverage.
- Medium: igapyon-managed Agent Skill is missing generated `index.json`, or
  `SKILL.md` does not reference it as a discovery index.
- Medium: Agent Skill `SKILL.md` contains detailed rules or long workflows that
  should be split into `references/`, making the skill harder to maintain.
- Medium: CLI-backed Agent Skill does not clearly document runtime discovery,
  operation mapping, or missing-runtime behavior.
- Medium: CLI-backed Agent Skill lacks smoke checks for the expected CLI
  runtime's `--help` and `--version`.
- Medium: `TODO.md`, source TODOs, skipped tests, or docs show unresolved work
  that may block the claimed completion state.
- Medium: Markdown docs are stale enough to mislead users, maintainers, or
  agents about current behavior.
- Medium: refactoring debt creates visible inconsistency, duplicated product
  semantics, or weak release confidence.
- Medium: miku-soft source files, or source files under another visible
  repository header convention, are missing the expected license header or SPDX
  identifier.
- Medium: igapyon Java / Maven repository is missing required `.mvn/jvm.config`
  IPv4-preference settings.
- Medium: sibling project conventions were relevant but not checked, causing
  avoidable uncertainty or inconsistent structure.
- Medium: release workflow exists but lacks artifact contents checks, smoke
  checks, or missing-file failure behavior.
- Low: remaining polish, naming, structure, or documentation issues do not
  block use but should be cleaned up before broader publication.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Software Completion Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Completion judgment: complete / mostly complete / not complete / unclear
Public readiness: ready / not ready / internal-only / unclear
Release readiness: ready / partial / missing / not applicable
Test confidence: sufficient / partial / weak / not checked
```

If the result is mostly complete, say what remains before a public release or
version tag. If the result is unclear, name the evidence that must be checked
next, such as release workflow, tests, `TODO.md`, package metadata, or GitHub
Release settings.

Do not edit files during review mode unless the user explicitly asks to switch
to maintenance work.
