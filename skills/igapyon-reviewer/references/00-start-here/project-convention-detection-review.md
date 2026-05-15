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

## Classification

Classify the target before applying convention-specific findings:

- `miku-soft / nearby igapyon`: clearly part of the miku-soft series or nearby
  igapyon repositories, or the user says to apply that convention
- `igapyon-managed Agent Skill`: an Agent Skill managed in igapyon's local skill
  style, especially under `skills/` with `SKILL.md` and `index.json`
- `generic OSS`: public or reusable open source project, but not clearly
  miku-soft
- `private/proprietary`: private, internal, commercial, or non-OSS source
- `unknown`: not enough information to classify safely

If classification is uncertain, say what evidence is missing and use generic
checks. Do not infer miku-soft conventions merely from Java, Node.js, Markdown,
CLI, Maven, npm, or README presence.

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

## miku-soft and Nearby igapyon Checks

Apply these actively only when the target is classified as `miku-soft / nearby
igapyon`, `igapyon-managed Agent Skill`, or the user explicitly asks for those
conventions:

- miku-soft source file headers such as:

```text
/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
```

- Apache-2.0 repository licensing when that is the project convention
- `THIRD_PARTY_NOTICES.md`, `CONTRIBUTORS.md`, `CONTRIBUTING.md`, and related
  notice structure used by nearby igapyon repositories
- Java / Maven `.mvn/jvm.config` IPv4-preference settings
- copied Java `lib/*.jar` artifacts paired with matching `lib/*-sources.jar`
  when that convention or license expectation applies
- `index.json` required and referenced from `SKILL.md` for igapyon-managed
  Agent Skills
- lean `SKILL.md` with detailed rules under `references/`
- no cross-skill relative references such as `../other-skill/...`
- `*-done` branch warning for nearby igapyon workflows
- first-release or artifact naming conventions used by the miku-soft series

For non-miku-soft targets, these are not default requirements. They may still
be useful examples, but report them as optional inspiration unless the target's
own docs adopt them.

## OSS and Proprietary Distinction

Do not require a project to be open source merely because it contains source
code.

For generic OSS projects:

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

For unknown projects:

- avoid strong findings based on igapyon-specific preferences
- phrase convention-specific gaps as questions or verification needs
- prefer generic safety, rights, secrets, docs, test, package, and handoff
  findings

## Severity Guidance

Use these severity levels:

- High: a convention-specific rule is applied to the wrong project type in a
  way that would mislead the user, for example requiring Toshiki Iga copyright
  headers on unrelated private source.
- High: the target is clearly miku-soft / nearby igapyon and misses a convention
  that affects release legality, package safety, or Agent Skill activation.
- Medium: the project classification is unclear and a convention-dependent
  finding cannot be judged without more evidence.
- Medium: the target appears to follow a documented convention but applies it
  inconsistently.
- Low: an igapyon convention could be useful as optional inspiration, but the
  target does not claim to follow it.

## Review Output

When convention choice matters, include a short classification before findings:

```text
Project convention: miku-soft / nearby igapyon / generic OSS / private-proprietary / unknown
Evidence: ...
Convention-specific checks applied: ...
Convention-specific checks not applied: ...
```

Do not let this section dominate the review when the classification is obvious.
Use it to prevent over-applying miku-soft rules to non-miku-soft targets.
