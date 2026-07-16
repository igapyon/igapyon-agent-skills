# Official Terminology Review

Use this reference to review whether technology names, product names, project
names, organization names, standards, APIs, licenses, file formats, and service
names use the official or commonly accepted expression from the provider or
maintaining organization.

This review is about precision, trust, searchability, and avoiding accidental
brand or technical confusion. It is not a trademark legal opinion.

## Review Priority

Use this review when the target includes:

- README, docs, release notes, articles, blog posts, GitHub text, or package
  metadata
- CLI `--help`, `--version`, examples, or error messages
- dependency, runtime, platform, API, or standards descriptions
- license, notice, contributor, or attribution text
- product comparison or compatibility wording
- public Japanese or English text that mentions third-party technologies

Use it together with rights/originality review when naming could affect brand,
trademark, attribution, or affiliation risk.

## Official Name Checks

Check whether names match provider or maintainer usage.

Examples of things to verify:

- language, runtime, and platform names such as `Java`, `Node.js`,
  `JavaScript`, `TypeScript`, `Maven`, `Gradle`, `npm`, `GitHub`, `OpenAI`,
  `Microsoft`, `Google`, `Apache Maven`, or `Apache License 2.0`
- product and service capitalization, spacing, punctuation, and suffixes
- organization names versus product names
- project names versus package names
- API names, model names, command names, and file format names
- standards bodies and specifications
- license names and SPDX identifiers

Flag issues when:

- capitalization or punctuation differs from official usage, such as `nodejs`
  when `Node.js` is intended
- an organization name is used where a product name is meant, or the reverse
- a package name is confused with the upstream project name
- a license is named imprecisely, such as saying `Apache license` when the
  intended formal text is `Apache License 2.0`
- a trademarked or provider-specific term is generalized in a way that could
  confuse users
- compatibility wording implies official affiliation, endorsement, or ownership
  when it should only say compatibility

## Provider Expression Checks

When a provider uses a particular expression, prefer that expression in public
or user-facing text.

Check:

- official spelling and capitalization from the provider's docs or website
- whether the provider includes punctuation, such as `.js`, `.NET`, or `macOS`
- whether the provider prefers a full name on first mention and a short name
  later
- whether product names have changed, been deprecated, or renamed
- whether a term should be written in English even inside Japanese text
- whether Japanese transliteration is appropriate or the official English name
  is clearer

Do not overcorrect internal notes or code identifiers where exact official
branding would reduce clarity. Public text, README text, release notes, and
notices deserve stricter checks than throwaway local notes.

## Verification Guidance

Use local context first:

- existing repository wording
- `package.json`, `pom.xml`, lockfiles, dependency coordinates, or module names
- upstream URLs already present in docs or notices
- official docs linked from the repository
- sibling miku-soft / nearby igapyon repositories when the project follows that
  series

If the official expression matters and is not locally clear, recommend verifying
against the provider's official documentation or website. Do not invent a
"correct" spelling when uncertain.

## Japanese Text Checks

For Japanese text, check whether technical names remain recognizable and
searchable.

Prefer:

- official English names for product, organization, API, package, and license
  names when that is how users search for them
- Japanese explanation around the official term when needed
- consistent spacing and punctuation around English product names
- one chosen notation across README, docs, release notes, and examples

Flag issues when:

- the same technology appears under several inconsistent Japanese/English forms
- katakana or abbreviation makes the provider or product ambiguous
- an unofficial translation of an organization, license, API, or service name
  could mislead readers

## Severity Guidance

Use these severity levels:

- High: naming implies false affiliation, ownership, endorsement, or a wrong
  legal/license identity.
- Medium: public docs, README, release notes, package metadata, or notices use
  incorrect provider, product, license, or standard names.
- Medium: terminology inconsistency could confuse users, searches, dependency
  identification, or compatibility claims.
- Low: minor capitalization, spacing, or notation polish that does not change
  meaning.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Official Terminology Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Scope: technology names / provider names / licenses / products / APIs / mixed
Verification basis: local docs / official source checked / not checked
```

Do not browse or claim an official spelling was verified unless it was actually
checked. When uncertain, report the item as "verify official expression" rather
than as a confirmed error.
