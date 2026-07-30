# Rights and Originality Review

Use this reference to review visible risks that text, code, images, assets,
documentation, names, logos, examples, or repository contents may infringe
someone else's rights or rely too heavily on an existing work.

This is not a legal opinion. The reviewer should not claim that something is or
is not copyright infringement, trademark infringement, plagiarism, or license
violation unless the evidence is explicit and straightforward. Report visible
red flags, uncertainty, and recommended verification steps.

## Review Priority

Use this review when the target includes:

- article drafts, documentation, README text, or quoted material
- code, scripts, templates, or generated files
- images, icons, screenshots, audio, video, fonts, datasets, or other assets
- project names, product names, logos, slogans, package names, or domains
- examples or sample files that may come from third-party sources
- release bundles, npm packages, jars, skill bundles, or downloadable archives

Use this review before release readiness when rights issues could affect
publication, distribution, or GitHub Release assets.

When applying miku-soft or igapyon-specific license, notice, and source-header
checks, first classify the target using
[project-convention-detection-review.md](../../00-start-here/project-convention-detection-review.md).
Do not impose igapyon-specific copyright headers or Apache-2.0 choices on
unrelated generic OSS, private, proprietary, or unknown projects.

Use [official-terminology-review.md](../provenance-and-officialness/official-terminology-review.md) when
technology, product, provider, organization, API, standard, or license names may
need official spelling, capitalization, or compatibility wording.

## Core Checks

Look for visible signs of rights or originality risk:

- large copied passages without attribution or license
- text that closely tracks a known article, documentation page, README, book,
  lyrics, blog post, or marketing copy
- code copied from a third-party source without license header, attribution, or
  compatible license
- examples, templates, or assets that look like they came from another product
  or repository without provenance
- images, icons, screenshots, fonts, audio, video, datasets, or logos without
  source, license, or generation/provenance notes
- project names, package names, logos, or slogans that are extremely close to
  an existing product, company, open source project, or trademarked term
- character, brand, mascot, or UI design that appears intentionally close to an
  existing recognizable work
- generated content that may have been prompted to imitate a living artist,
  proprietary brand, copyrighted character, or specific commercial style
- repository bundles that include dependency source, vendor files, generated
  archives, screenshots, or downloaded files without clear licensing
- copied sample data that may contain personal, customer, or proprietary
  information

Do not overstate similarity. A common idea, generic UI pattern, ordinary
technical phrase, or standard project structure is not enough by itself.

## Copyright and Plagiarism Checks

Flag these when visible:

- long verbatim or near-verbatim text from a likely external source
- paraphrase that follows the original structure, examples, and sequence too
  closely
- copied code with identifiers, comments, formatting, or bugs that suggest a
  third-party origin
- missing attribution for copied or adapted material
- copied documentation examples that retain product-specific names from another
  project
- song lyrics, poems, fiction excerpts, article bodies, book passages, or other
  expressive text included beyond short necessary quotation

Prefer safer directions:

- summarize in original words
- quote only the minimum necessary excerpt
- add source attribution and license notes when permitted
- replace copied examples with project-specific examples
- remove material when provenance or permission is unclear

## Trademark and Brand Confusion Checks

Check whether names, logos, or branding could confuse users:

- product name differs from an existing well-known product by only a small
  spelling change
- package or repository name implies affiliation with another project or
  company
- logo, color, mascot, or visual identity is extremely close to another brand
- README or release text could be read as official, endorsed, or affiliated
  when it is not
- compatibility wording is unclear, such as "for X" versus "compatible with X"

Prefer explicit wording such as "unofficial", "compatible with", or "inspired
by" only when accurate and appropriate. Do not use those phrases to excuse a
confusing name or copied branding.

## License and Dependency Checks

When reviewing repositories or release bundles, check:

- third-party files have license headers or provenance where expected
- `LICENSE`, `THIRD_PARTY_NOTICES.md`, package metadata, About dialogs,
  documentation, or distribution notices mention bundled third-party material
  when relevant
- dependencies with restrictive licenses are not copied into runtime bundles
  without review
- new OSS libraries selected for XML, JSON, JSONL, YAML, CSV, or other
  structured data handling have license compatibility checked before adoption
- generated release assets do not include `node_modules`, local caches,
  downloaded archives, or vendored source unintentionally
- copied templates, icons, fonts, or datasets are covered by compatible licenses
- source archives and runtime artifacts are clearly separated when licenses or
  provenance differ
- bundled OSS binaries under `lib/`, `vendor/`, `runtime/`, release assets, or
  package contents have corresponding source availability, source artifacts, or
  source/provenance URLs when the license or project convention requires it

If the license status is unclear, report it as a verification need rather than
as a confirmed violation.

## OSS Notice Checks

For software projects, explicitly check whether open source software usage is
acknowledged in the required place for the way the software is distributed.

Check these points:

- the project has its own `LICENSE` when it is distributed or intended for reuse
- third-party OSS dependencies are identified through package metadata,
  lockfiles, build files, vendored source, bundled runtime files, or generated
  artifacts
- required copyright notices, license texts, and attribution statements are
  included when dependencies are bundled, copied, modified, or redistributed
- `THIRD_PARTY_NOTICES.md`, `NOTICE`, documentation, About screen, CLI
  `--license` output, release notes, or distribution package includes the
  necessary notices for the target surface
- release bundles, jars, npm packages, Web App artifacts, skill bundles, and
  desktop or CLI distributions do not omit required third-party notices
- license obligations that affect distribution are understood before release,
  especially copyleft, attribution, notice preservation, source availability,
  patent, trademark, or non-code asset terms
- generated single-file artifacts preserve required license banners when
  third-party code is embedded
- vendored files keep original license headers when required
- dependency licenses are compatible with the project's intended license and
  distribution model, or the uncertainty is recorded

Flag OSS notice issues when:

- OSS is bundled or redistributed but no third-party notice mechanism exists
- a release asset contains third-party code or assets without corresponding
  license text or attribution
- copied source keeps no upstream license header or provenance
- docs claim the project is under one license while bundled material requires
  additional notices
- dependency license status has not been checked before a public release

Do not require a large notice file for every project. If dependencies are only
used during development and not redistributed, the notice requirement may be
different. Report what needs verification instead of making a legal conclusion.

## OSS Binary and Source Pair Checks

When Java, Node, CLI, or Agent Skill projects include OSS runtime binaries or
vendored library artifacts, check that the source side is handled together with
the binary side.

Check these points:

- binary libraries under `lib/`, `vendor/`, `runtime/`, `assets/`, or release
  bundles are identified as third-party or generated project artifacts
- Java jars copied into `lib/` have a matching `*-sources.jar` when that is the
  project convention or license expectation
- Node or bundled JavaScript dependencies include enough source, package
  metadata, license text, and source URL/provenance to understand redistribution
- release assets that redistribute OSS binaries also include or clearly point to
  required source code, source archives, source jars, or upstream source
  locations
- `THIRD_PARTY_NOTICES.md`, `NOTICE`, package metadata, or README explains the
  license and source/provenance of redistributed OSS components
- vendored upstream source keeps original license headers and notices
- source availability expectations are checked separately from normal package
  manager dependencies that are not redistributed by the project

For miku-soft and nearby igapyon repositories, a practical Java example is:

```text
lib/example-1.2.3.jar
lib/example-1.2.3-sources.jar
```

Flag issues when:

- an OSS binary is bundled but no corresponding source artifact, source URL, or
  provenance note is visible
- a release package contains third-party runtime code but omits license and
  source availability information
- source jars or source archives are stale compared with the binary version
- copied source and binary artifacts disagree on version, license, or origin

Severity depends on the license and distribution surface. Missing source
availability for redistributed OSS binaries is usually Medium or High; treat it
as High when the license appears to require source availability or the project
is preparing a public release.

## Source File License Header Checks

First decide whether the reviewed source code belongs to a miku-soft or nearby
igapyon repository convention. This reviewer may also review non-miku-soft
source code and non-OSS private/proprietary source code, so do not require the
miku-soft header merely because source files exist.

For miku-soft and nearby igapyon source files, the standard header shape is:

```text
/*
 * Copyright <YEAR> Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
```

`<YEAR>` may be a single original year or a documented year range. Do not
substitute the current year from memory. Confirm the year or range, copyright
holder, and SPDX identifier from the target repository's documented convention
or authoritative existing headers. If no convention is visible, do not treat a
different year or year range as a defect by itself.

When the repository is miku-soft or explicitly follows the nearby igapyon
convention, actively apply this check to source files such as:

- TypeScript and JavaScript source files
- Java source files
- CLI runtime source files
- shared core modules
- generated JavaScript when the repository intentionally commits generated JS
  alongside TypeScript

Flag issues when:

- miku-soft project source files are missing the standard miku-soft header
- only some source files have the header, creating inconsistent licensing
  signals inside a miku-soft repository
- generated committed source drops the header from its source counterpart
- copied or vendored files replace upstream license headers with the miku-soft
  header incorrectly
- year, year range, copyright holder, or SPDX identifier differs from the
  confirmed repository convention without a documented reason

For non-miku-soft repositories, only check for the repository's own documented
license-header convention if one is visible. If no such convention is visible,
do not flag missing file headers as a problem. Still flag copied third-party
source that lost required upstream license headers or provenance.

Do not require the miku-soft header on third-party vendored files when their
upstream license header must be preserved. Do not require it on non-OSS private
or proprietary source unless that repository explicitly requires such headers.
Do not require it on small generated metadata, JSON, lockfiles, binary files, or
Markdown unless the repository has a specific convention for those files.

## miku-soft Notice Document Pattern

For miku-soft and nearby igapyon repositories, use this document set as a
practical review baseline when the project is public, distributable, or accepts
outside feedback:

- `LICENSE`: the repository's own license
- `THIRD_PARTY_NOTICES.md`: third-party software and reference materials used
  or referred to by the project
- `CONTRIBUTORS.md`: people whose contributions, feedback, or improvement
  suggestions should be acknowledged
- `CONTRIBUTING.md`: contribution rules, contribution license, PR expectations,
  and third-party dependency update rules
- `NOTICE` files inside copied or embedded components when those components
  carry their own notice requirements

Good `THIRD_PARTY_NOTICES.md` entries normally identify:

- dependency or reference material name
- usage in this project
- license or policy
- source URL

Good `CONTRIBUTING.md` content normally states:

- accepted contribution types
- issue and pull request expectations
- tests or docs expected for behavior changes
- generated-file editing rules when applicable
- third-party dependency license checks and notice updates
- contribution license terms, especially when the project uses Apache License
  2.0 and treats intentional submissions as contributions
- respectful collaboration expectations

Good `CONTRIBUTORS.md` content normally records:

- contributor name or handle
- concrete contribution, feedback, or improvement summary
- acknowledgements without exposing unnecessary private details

Flag miku-soft notice document issues when:

- `THIRD_PARTY_NOTICES.md` is missing even though runtime, UI, test, bundled, or
  reference dependencies are explicitly used or discussed
- `CONTRIBUTING.md` does not tell contributors to check licenses and update
  third-party notices when adding or replacing dependencies
- `CONTRIBUTORS.md` is missing or still contains placeholders after known
  external contributions or feedback
- embedded component `NOTICE` files exist but the root-level notice story does
  not make their role discoverable
- template placeholders such as `PROJECT_NAME`, `DEPENDENCY_NAME`,
  `NAME_OR_HANDLE`, or `CONTRIBUTION_SUMMARY` remain in real project files

## AI-Generated or Inspired Content Checks

For AI-assisted writing, images, names, and designs, check:

- the content appears to imitate a specific living artist, copyrighted
  character, commercial brand, or proprietary style too closely
- prompts or docs say the output should be "in the style of" a specific
  protected creator, product, or character
- generated assets are used as if they were official brand assets
- the output combines recognizable elements from existing works in a way that
  may be confusing or too close
- provenance is unclear for assets that will be distributed

Prefer describing the intended mood, medium, era, technique, or generic visual
traits rather than naming a living artist, protected character, or brand style
when creating new assets.

## Similarity Review Cautions

Similarity review is approximate. The reviewer may not know all existing works,
and the available files may not include provenance.

Use careful language:

- "This looks close to..."
- "This may need a source or license check..."
- "I cannot confirm infringement from this alone, but this is a red flag..."
- "The risk is lower if this is original, licensed, or intentionally compatible
  with documented attribution..."

Avoid legal conclusions:

- Do not say "this is illegal" unless the user has provided decisive evidence.
- Do not say "this is safe" just because no issue is visible.
- Do not provide legal advice. Recommend checking source, license, permission,
  or counsel when the risk is material.

## Severity Guidance

Use these severity levels:

- Critical: release or publication appears to include private, proprietary, or
  clearly third-party material with no permission or license, especially in a
  downloadable artifact.
- High: visible near-copy of a specific existing work, brand, logo, character,
  article, codebase, or documentation page without attribution or permission.
- High: third-party assets or copied code are included in release artifacts
  with unclear or incompatible licensing.
- High: OSS dependencies, vendored files, or embedded third-party code are
  redistributed without an apparent notice, license text, or attribution
  mechanism.
- Medium: source files in a miku-soft or explicitly compatible igapyon
  repository are missing the standard copyright and
  `SPDX-License-Identifier: Apache-2.0` header.
- Medium: naming, branding, text structure, examples, or generated assets are
  close enough to an existing work that provenance or permission should be
  checked before publication.
- Medium: attribution, license notes, or third-party notices are missing or
  incomplete for bundled material.
- Medium: dependency license status or OSS notice requirements are not checked
  before a public release.
- Low: minor similarity, generic phrasing, or unclear provenance that should be
  cleaned up but does not obviously block internal review.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Rights and Originality Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Visible risk: low / medium / high / critical / unclear
```

Do not rewrite, remove, or replace material during review mode unless the user
explicitly asks for revision or cleanup.
