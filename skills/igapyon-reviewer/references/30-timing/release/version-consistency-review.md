# Version Consistency Review

Use this reference to review whether version numbers and release identities are
consistent across source metadata, runtime output, documentation, tags, package
artifacts, and release assets.

This review is especially useful before a version tag, GitHub Release, package
publication, or software completion judgment.

## Review Priority

Use this review when the target includes release readiness, package metadata,
version tags, generated artifacts, runtime files, or documentation that names a
version.

## Core Checks

Check whether version values agree across relevant files and surfaces:

- `package.json`
- `package-lock.json` or other lockfiles when applicable
- Maven `pom.xml`
- Gradle metadata
- skill metadata or bundle metadata
- source constants
- generated runtime files
- CLI `--version`
- UI About text or footer version
- README and docs
- changelog or release notes
- GitHub tag such as `v0.5.0`
- GitHub Release title and asset names
- npm package tarball names
- jar, zip, bundle, or single-file runtime filenames

## Version Source Checks

Review whether the repository has a clear version source of truth:

- one file or metadata source owns the version
- generated files copy the version from the source of truth
- release scripts validate tag and metadata agreement
- runtime `--version` or equivalent output is smoke-tested
- docs do not mention old versions as if they are current
- initial version conventions, such as `0.5.0` for miku-soft style projects, are
  applied consistently when relevant
- `-SNAPSHOT` or pre-release suffixes are intentional and documented when used

## Tag and Artifact Checks

For `v*` tag releases, check:

- tag version matches package or build metadata
- artifact filenames use the tag version consistently
- release workflow builds from the tag, not an unrelated branch tip
- generated build metadata does not keep an old version
- release notes describe the same version being released
- asset upload fails when expected versioned files are missing

## Severity Guidance

Use these severity levels:

- High: tag, package metadata, runtime `--version`, and release asset filenames
  can diverge without workflow failure.
- High: release assets are built or named with a different version than the tag.
- Medium: README, docs, changelog, generated files, or bundle metadata contain
  stale version references.
- Medium: no clear version source of truth exists for a releasable project.
- Medium: first-release or miku-soft version conventions are inconsistent
  without explanation.
- Low: minor version wording or old example version remains where it is unlikely
  to mislead users.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Version Consistency Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Version source: package.json / pom.xml / metadata / tag / unclear
Observed version: ...
Release tag: ...
Consistency: consistent / inconsistent / partial / not checked
```

Do not bump versions or edit generated files during review mode unless the user
explicitly asks to switch to maintenance work.
