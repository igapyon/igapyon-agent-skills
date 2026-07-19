# Version, Tag, Release, and Asset Audit

Check whether committed project versions, Git tags, GitHub Releases, and downloadable distribution assets correspond without changing the repository or GitHub.

## Default Interpretation of Tag Status

When the user asks about GitHub tag status, including short phrases such as `タグ状況` or `tag status`, assume they also want the current committed project version compared with the corresponding GitHub tag and Release. Run the full current release status and distribution-asset checks unless the user explicitly limits the request to tag names, tag refs, or local-versus-remote tag synchronization.

Do not stop after listing tags or comparing tag commit SHAs. Report the authoritative local version, expected tag, actual GitHub tag and target commit, corresponding Release, and expected distribution assets.

## Resolve the Version Source

1. Resolve the exact repository and target branch. For a public GitHub repository, use the repository's default branch unless the user names another branch.
2. Find the authoritative version source from repository documentation and build files.
3. Read the top-level `version` from `package.json` or the effective project version represented by `pom.xml`. Resolve a simple Maven version property when its value is present in the repository; otherwise report it as unresolved rather than guessing.
4. When multiple authoritative manifests exist, compare them and report any mismatch.

## Determine the Tag Convention

Prefer, in order:

1. an explicit repository rule
2. a consistent pattern in recent tags and Releases whose tagged commits contain matching versions
3. the common miku-soft default `v<VERSION>`

Known miku-soft patterns include:

- common version form: `0.4.3` becomes `v0.4.3`
- date-identifier form: `1.20260719.3` becomes `v20260719c`, using `1=a`, `2=b`, `3=c`, and so on
- repository-specific direct date tags such as `20260719` or `20260719a`

Use the date-identifier form for repositories whose versions primarily identify when a build was made rather than express a meaningful semantic version. Do not select it from the numeric shape alone; require repository rules or consistent history. Preserve the observed prefix. If the convention is ambiguous, report it as unresolved and do not label a tag incorrect. Do not extrapolate an alphabetic sequence beyond its documented or observed range.

## Run Two Independent Checks

### Existing Tag Integrity

For each relevant tag:

1. Resolve the commit identified by the tag.
2. Read the authoritative version file from that exact commit.
3. Derive the expected tag using the resolved repository convention.
4. Compare the expected tag with the actual tag.
5. Confirm that a GitHub Release exists whose `tag_name` is that tag.

Never validate a historical tag only against the current branch version.

### Current Release Status

1. Resolve the latest commit SHA of the target branch.
2. Read the authoritative version from that exact commit.
3. Derive the expected tag.
4. Check whether the tag exists, whether it identifies that commit, and whether a corresponding GitHub Release exists.
5. When the tag exists at an older commit but the branch has advanced without a version change, report that code changed after the tag while the version stayed the same.

A newer committed version without its tag or Release can be normal work in progress. Report it as unreleased, not automatically as an error.

## Check Distribution Assets

Determine the expected Release assets from repository documentation, build configuration, release scripts, and consistent recent Releases.

- For an Agent Skill distribution, expect the installable distribution ZIP, such as `igapyon-miku-ai-assistant-builder-skills-0.7.1.zip`.
- For a Node.js module or CLI distributed as a single-file runtime, expect its `.mjs` asset.
- For a Java module or CLI, expect its `.jar` asset.
- When a project intentionally distributes multiple runtimes, require every artifact named by its build or release contract.

Inspect the selected Release's `assets[]` or assets endpoint. For each expected asset, check:

- exact asset name according to the repository's naming convention
- `state` is `uploaded`
- `size` is greater than zero
- digest or companion checksum asset when the repository produces one
- browser download URL is present

Do not count GitHub's automatic source-code ZIP or tarball as a project distribution asset. Do not require both `.mjs` and `.jar` unless the repository actually publishes both. Report unexpected assets separately without treating them as a failure by default.

## Report

Show the evidence and conclusion separately. Include:

- target branch and latest commit SHA
- version source path and committed version
- inferred tag convention and its evidence
- expected tag and actual matching tag
- tag commit SHA and version at that commit
- corresponding GitHub Release state
- expected distribution asset type and name
- each asset's presence, upload state, size, checksum or digest when available, and download URL
- one of: aligned, unreleased, version mismatch, tag target mismatch, Release missing, distribution asset missing, distribution asset invalid, manifest mismatch, or convention unresolved

State whether the result is about historical tag integrity or current release status.

## Boundary

Keep this audit READONLY. Do not edit a version, create or move a tag, publish a Release, push, or request credentials. A detected mismatch is a report, not authorization to repair it.
