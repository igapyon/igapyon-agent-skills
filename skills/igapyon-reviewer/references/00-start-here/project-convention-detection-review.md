# Project Convention Detection Review

Use this reference before applying repository, software completion, license,
packaging, Agent Skill, CLI, or handoff checks that may depend on project
conventions.

The reviewer was shaped by miku-soft and nearby igapyon work, but it must also
work for non-miku-soft, private, proprietary, experimental, or third-party
repositories. Do not impose igapyon-specific rules unless the target appears to
use those conventions or the user explicitly asks for that style.

## Review Priority

Use this review when the target is:

- a repository
- source code
- a software package
- an Agent Skill
- a release artifact
- a Java, Node.js, CLI, Maven, Gradle, npm, or bundled tool project
- documentation that describes repository or release conventions

This review should run before checks that mention miku-soft, igapyon, Apache
License 2.0, source file headers, `.mvn/jvm.config`, `index.json`,
`THIRD_PARTY_NOTICES.md`, `CONTRIBUTORS.md`, `*-done` branches, or
`lib/*-sources.jar`.

## Classification Dimensions

Record these dimensions separately before applying convention-specific findings.
Do not collapse project family, artifact type, and distribution status into one
label because they can coexist.

- Project family: `miku-soft / nearby igapyon`, `other`, or `unknown`
- Artifact type: `igapyon-managed Agent Skill`, software package, repository,
  release artifact, document, or other relevant type
- Distribution and license context: `public OSS`, `private/proprietary`,
  internal-only, mixed, or `unknown`

For example, an `igapyon-managed Agent Skill` may also be `public OSS` or
`private/proprietary`; that artifact type alone does not imply miku-soft source
headers, Apache-2.0, Maven configuration, or public release obligations.

If any dimension is uncertain, say what evidence is missing and use generic
checks. Do not infer miku-soft conventions merely from Java, Node.js, Markdown,
CLI, Maven, npm, README presence, or an `index.json` file.

## Evidence to Check

Look for visible evidence such as:

- repository or package name, for example `miku-*`, `mikuscore`, or other
  nearby igapyon naming
- README, About text, package metadata, Maven coordinates, npm scope, release
  tags, or artifact names
- existing `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `CONTRIBUTORS.md`,
  `CONTRIBUTING.md`, or TODO conventions
- existing source file headers and SPDX identifiers
- `.mvn/jvm.config`, `lib/*-sources.jar`, generated `index.json`, skill bundle
  scripts, or other igapyon-specific repository patterns
- branch names and local workflow notes
- explicit user instruction to apply or not apply miku-soft / igapyon
  conventions

## Generic Checks

These checks can apply broadly, regardless of project convention:

- safety, respect, privacy, and human-rights concerns
- visible copyright, plagiarism, trademark, provenance, and license red flags
- secret, credential, token, private path, private URL, or personal data leaks
- README usability and user-facing entrypoint quality
- TODO and handoff clarity
- large uncommitted change warnings
- Markdown structure and public Japanese text polish when requested
- version consistency when the project has versions
- package/archive contents matching the artifact role
- CLI usability when the project provides a CLI
- quickstart examples being copy-pasteable

## Convention-Specific Checks

Apply each rule only when its own condition is met. Do not treat an
`igapyon-managed Agent Skill` as evidence that every miku-soft repository rule
applies.

For `miku-soft / nearby igapyon` projects, or when the user explicitly asks for
that convention, check:

- miku-soft source file headers such as:

```text
/*
 * Copyright <YEAR> Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
```

Treat `<YEAR>` as a placeholder, not as the current year by default. Confirm
the exact year, year range, copyright holder, and SPDX identifier from the
target repository's documented convention or authoritative existing headers.

- Apache-2.0 repository licensing when that is the project convention
- `THIRD_PARTY_NOTICES.md`, `CONTRIBUTORS.md`, `CONTRIBUTING.md`, and related
  notice structure used by nearby igapyon repositories
- Java / Maven `.mvn/jvm.config` IPv4-preference settings
- copied Java `lib/*.jar` artifacts paired with matching `lib/*-sources.jar`
  when that convention or license expectation applies
- `*-done` branch warning for nearby igapyon workflows
- first-release or artifact naming conventions used by the miku-soft series

For an `igapyon-managed Agent Skill`, check independently of its distribution
or project family:

- `index.json` is present and referenced from `SKILL.md` as a discovery index
- `SKILL.md` stays lean and places detailed material under `references/`
- no runtime instruction reaches another skill's private files through a
  cross-skill relative path such as `../other-skill/...`

For other projects, report miku-soft practices only as optional inspiration
unless the target's own documentation adopts them.

## Distribution and License Context

Do not require a project to be open source merely because it contains source
code.

For public OSS projects:

- check whether the project has a license if it is intended for reuse or public
  distribution
- check third-party notices and source availability only to the extent required
  by the dependencies, bundled assets, and distribution model
- do not require Apache-2.0 unless the project already uses it or the user asks

For private or proprietary projects:

- do not require public OSS license files or igapyon source headers by default
- check for third-party OSS obligations when OSS dependencies or binaries are
  redistributed, bundled, copied, modified, or included in release artifacts
- check whether the repository's own internal copyright, SPDX, notice, or
  attribution convention is being followed if it is visible

For unknown distribution or license context:

- avoid strong findings based on igapyon-specific preferences
- phrase convention-specific gaps as questions or verification needs
- prefer generic safety, rights, secrets, docs, test, package, and handoff
  findings

## Severity Guidance

Use these severity levels:

- High: a convention-specific rule is applied to the wrong project family,
  artifact type, or distribution context in a way that would mislead the user,
  for example requiring Toshiki Iga copyright headers on unrelated private
  source.
- High: the target is clearly miku-soft / nearby igapyon and misses a convention
  that affects release legality, package safety, or Agent Skill activation.
- Medium: the project classification is unclear and a convention-dependent
  finding cannot be judged without more evidence.
- Medium: the target appears to follow a documented convention but applies it
  inconsistently.
- Low: an igapyon convention could be useful as optional inspiration, but the
  target does not claim to follow it.

## Review Output

Contribute findings to the [Consolidated Review Report](../templates/consolidated-review-report.md). Do not emit a standalone `Project Convention Detection Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Project family: miku-soft / nearby igapyon / other / unknown
Artifact type: igapyon-managed Agent Skill / software package / repository / release artifact / document / other
Distribution and license context: public OSS / private-proprietary / internal-only / mixed / unknown
Evidence: ...
Convention-specific checks applied: ...
Convention-specific checks not applied: ...
```

Do not let this section dominate the review when the classification is obvious.
Use it to prevent over-applying miku-soft rules to non-miku-soft targets.
