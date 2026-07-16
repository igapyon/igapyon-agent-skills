# Archive and Package Contents Review

Use this reference to review the contents of distributable archives and
packages before publication or release.

This review focuses on what is inside zip files, jars, npm packages, skill
bundles, release assets, source archives, and other downloadable artifacts.

## Review Priority

Use this review when the target includes:

- GitHub Release assets
- zip or tar archives
- npm package tarballs
- Java jars or distribution zips
- Maven plugin packages
- Agent Skill bundles or bundle zips
- single-file runtime bundles and accompanying docs
- source archives when they are prepared by local scripts

Use it together with generated artifact, rights/originality, secrets, version
consistency, and software completion reviews.

## Required or Expected Contents

Check whether the archive or package includes the files needed for its role:

- runtime artifact, executable, jar, bundled `.mjs`, HTML file, skill files, or
  other primary deliverable
- `README.md` or equivalent usage entrypoint when users inspect the artifact
- `LICENSE`
- `THIRD_PARTY_NOTICES.md`, `NOTICE`, or equivalent third-party attribution
  files when needed
- `CONTRIBUTORS.md` or acknowledgements when project convention expects them
- package metadata, manifest, skill metadata, Maven metadata, or npm metadata
- source artifacts, source archives, source jars, or documented source URLs for
  redistributed OSS binaries when license obligations or project convention
  require them
- `index.json` for igapyon-managed Agent Skill packages
- examples or docs that are intentionally part of the distribution
- required assets, templates, references, schemas, or runtime support files

The required set depends on artifact role. A runtime-only single file may not
need every repository document embedded, but release bundles and skill bundles
usually need enough context to be used outside the source checkout.

## Exclusion Checks

Check that the artifact does not include accidental or development-only files:

- `node_modules`
- `workplace/`
- `.git/`
- `.github/` when not intended for the package role
- `.DS_Store`
- local logs
- local caches
- temporary files
- release staging leftovers
- old archives
- test-only fixtures when not intended
- coverage reports
- editor settings or machine-local files
- secrets, `.env`, credentials, tokens, private keys, local config
- private absolute paths, private URLs, or personal data

## Artifact Role Checks

Check whether artifact contents match the documented role:

- source archive is not confused with runtime artifact
- npm package tarball is not described as a single-file CLI runtime unless it is
  actually that role
- jar contains expected classes, metadata, and license/notice files
- skill bundle includes `SKILL.md`, needed references, assets, helper files, and
  runtime artifacts if required
- igapyon-managed skill bundle includes `index.json`, and `SKILL.md` references
  it as a discovery index
- Web App release asset includes the intended generated HTML and assets, not
  source-only placeholders
- CLI runtime asset includes the intended executable file and version metadata
- docs bundle includes docs and examples but not local work folders

## OSS Library Source Pair Checks

When an archive or package contains OSS library binaries, check whether the
source side is packaged or documented consistently.

Check:

- `lib/` or equivalent directories do not contain unexplained third-party
  binaries
- Java jars that are intentionally redistributed have matching `*-sources.jar`
  files when the repository convention expects binary/source pairs
- source jar versions match the binary jar versions
- Node bundles or copied packages include license, package metadata, and source
  provenance rather than only minified runtime output when redistribution
  requires source availability
- release archives include `THIRD_PARTY_NOTICES.md`, `NOTICE`, or README
  source/provenance links for bundled OSS components
- source artifacts are not accidentally omitted from release packages while
  present in the repository

For example, this is a good binary/source pair shape for a copied Java
dependency:

```text
lib/miku-indexgen-1.2.1.jar
lib/miku-indexgen-1.2.1-sources.jar
```

Do not require source jars for every dependency resolved through Maven, npm, or
another package manager when the dependency is not copied into the distributed
artifact. Focus on redistributed or vendored OSS contents.

## Version and Naming Checks

Check:

- archive filename includes product and version when appropriate
- internal metadata agrees with the release tag and filename
- stale files from older versions are not present
- package root directory name is stable and useful
- duplicate artifacts with different versions are not mixed
- generated timestamps or build metadata are intentional

## Contents Verification Checks

Prefer evidence from artifact listing commands or package inspection commands
when available, such as:

- `unzip -l`
- `jar tf`
- `tar tf`
- `npm pack --dry-run`
- package-specific bundle contents tests

Do not run destructive extraction or publish commands during review mode. If
inspection was not performed, report contents as not checked.

## Severity Guidance

Use these severity levels:

- Critical: archive or package contains secrets, private keys, credentials,
  private data, or unintended private local files.
- High: required runtime artifact, `SKILL.md`, license, notice, metadata, or
  primary deliverable is missing from a distributable artifact.
- High: igapyon-managed Agent Skill package is missing `index.json` or the
  bundled `SKILL.md` does not tell agents to use it as a discovery index.
- High: artifact includes broad development directories such as `node_modules`,
  `workplace/`, `.git/`, local caches, or stale release staging contents.
- High: artifact role is mislabeled, such as source archive treated as runtime
  artifact or npm package treated as single-file CLI runtime.
- High: redistributed OSS binary dependencies are present but required source
  availability, source artifacts, or source/provenance information is missing.
- Medium: third-party notices, contributors, README, examples, or required
  support files are incomplete for the artifact's role.
- Medium: artifact filename, internal metadata, and release version disagree.
- Low: minor packaging polish, ordering, duplicated docs, or naming issue does
  not block use.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Archive and Package Contents Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Artifact: ...
Artifact role: runtime / source / npm package / jar / skill bundle / docs / unclear
Contents checked by: listing / dry-run / tests / not checked
Distribution readiness: ready / partial / risky / not checked
```

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

Do not create, extract, delete, upload, or publish artifacts during review mode
unless the user explicitly asks to switch to maintenance work.
