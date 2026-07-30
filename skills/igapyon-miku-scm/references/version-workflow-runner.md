# Version Status and Increment Validation Runner

Use the deterministic runner to collect local version state or validate the
next version candidate without editing repository content.

## Workflow IDs

- `version.status`: READONLY source discovery, format candidates, and configured
  coupling/alignment inspection
- `version.increment.validate`: READONLY calculation of the next candidate from
  an explicit repository policy

Both delegate to `scripts/miku-scm-version.mjs`. Neither workflow edits, stages,
commits, tags, pushes, publishes, or runs a repository build.

## Status

When the authoritative file is not supplied, status checks top-level
`package.json`, `pom.xml`, and `VERSION.md` in that order and includes only
files from which a version can be read:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  version.status
```

Automatic discovery reports syntactic `format_candidates`; it does not declare
the repository policy resolved from the version's numeric shape. Supply the
documented policy and source paths when alignment must be evaluated:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  version.status \
  --version-file pom.xml \
  --coupled-version-file skills/igapyon-mikuku-agent/references/VERSION.md \
  --policy miku-date-coupled
```

## Increment Validation

Use the repository's documented policy. Do not infer it from the current value.

For coupled miku-soft date versions:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  version.increment.validate \
  --version-file pom.xml \
  --coupled-version-file skills/igapyon-mikuku-agent/references/VERSION.md \
  --policy miku-date-coupled \
  --timezone Asia/Tokyo \
  --validate-increment
```

For a content repository:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  version.increment.validate \
  --version-file VERSION.md \
  --policy content-date \
  --timezone Asia/Tokyo \
  --validate-increment
```

For Semantic Versioning:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  version.increment.validate \
  --version-file package.json \
  --policy semver \
  --level patch \
  --validate-increment
```

Date policies require an explicit IANA timezone and reject a SemVer level.
SemVer requires explicit `major`, `minor`, or `patch` and rejects a timezone.
The current stable SemVer implementation accepts `MAJOR.MINOR.PATCH`; it stops
on prerelease or build metadata rather than inventing repository policy.
`miku-date-coupled` also requires at least one coupled source and stops while
the current authoritative and coupled values are mismatched. Other policies
reject coupled-source options. Date validation also stops when the maintenance
date would precede the current version date.

The result contains repository/branch/HEAD/dirty state, source paths and values,
alignment, proposed authoritative and coupled values, and a stable identity
digest. Treat `proposed` as verified input to the separately authorized version
increment workflow, not as permission to edit.

## Boundary

`version.increment.validate` is a preflight, not an apply operation. After the
human explicitly requests the actual increment, follow
[version-increment.md](version-increment.md), update every documented coupled
source, run the repository validation command, and leave changes unstaged
unless staging or committing was separately requested.
