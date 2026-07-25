# Version Increment

Increment a project's version only when the user explicitly requests it. Resolve the repository's version policy and authoritative files before editing; do not choose a rule from the numeric shape alone.

## Common Workflow

1. Inspect `git status -sb` and preserve unrelated staged and unstaged changes.
2. Read repository documentation, build files, manifests, and recent version history to identify the authoritative version source, coupled version files, format, timezone, and validation command.
3. Classify the version as repository-defined date-based versioning or Semantic Versioning. If the convention is ambiguous, stop and ask which convention applies.
4. Derive the candidate version using the matching rule below and show the current and proposed values when human input is required.
5. Update every repository-defined coupled version source in one batch. Do not update dependency or tool versions that merely appear in the same manifest.
6. Run the repository's version-alignment check, build, or package command and confirm any versioned artifact name.
7. Review the relevant diff and run `git status -sb`. Record the verified repository, branch, version-source paths and values, and successful validation in the current session so a later add or commit need not repeat the reminder. Leave the changes unstaged unless the user separately requests staging or committing.

## Date-Based Versions

Use the repository's documented date, timezone, prefix, separators, sequence, and coupled-file mapping. Do not treat every version containing eight digits as date-based.

For the miku-soft form `1.YYYYMMDD.N`:

- Use the maintenance date in the repository's configured or documented local timezone.
- When the date differs from the existing version date, replace `YYYYMMDD` and reset `N` to `1`.
- When the date is unchanged, keep `YYYYMMDD` and increment `N` by one.
- Preserve the leading `1.` unless the repository explicitly defines another prefix.
- Check current committed versions and relevant existing tags or Releases before finalizing when a collision is possible.

When the repository couples `1.YYYYMMDD.N` to `YYYYMMDDx`, keep the date equal and map the positive sequence number using `1=a`, `2=b`, through `26=z`, then `27=aa`, `28=ab`, and so on. Therefore:

```text
1.20260718.3 / 20260718c
  -> 1.20260719.1 / 20260719a  # first update on a new date
  -> 1.20260719.2 / 20260719b  # next update on the same date
```

If the repository uses a different date form or suffix mapping, follow its documented rule instead of this example.

## Content-Repository `VERSION.md` Date Versions

For a repository that is neither an application nor an Agent Skill and whose primary deliverable is content, the repository may explicitly adopt a root `VERSION.md` as its authoritative version source. Do not infer this convention merely because a repository happens to contain a file named `VERSION.md`; repository documentation or established history must identify it as the version source.

The value is one date identifier in this form:

```text
YYYYMMDD<suffix>
```

`YYYYMMDD` is the repository's documented local maintenance date. `<suffix>` is a lowercase alphabetic sequence where `a` is the first update of the date, followed by `b` through `z`, then `aa`, `ab`, and so on. The suffix resets when the maintenance date changes:

```text
20260721a
  -> 20260721b   # next update on the same date
  -> 20260721z
  -> 20260721aa  # same date: continue past z
  -> 20260722a   # first update on a new date: reset the suffix
```

When this convention is explicitly adopted, increment it as follows:

1. Determine the maintenance date in the repository's documented timezone.
2. If it differs from the date in the current `VERSION.md`, replace the date and set the suffix to `a`.
3. If it is the same date, retain the date and advance the alphabetic suffix using `a` through `z`, then `aa`, `ab`, and so on.
4. Keep `VERSION.md` as a single authoritative value unless the repository explicitly documents coupled version sources.

The matching release-tag convention is `v<VERSION>`. For example, `VERSION.md` value `20260721a` corresponds to tag `v20260721a`, and `20260721z` corresponds to `v20260721z`. A new-day value `20260722a` corresponds to `v20260722a`; do not carry `z` into the next day's tag. Apply this tag derivation only where the repository has explicitly adopted this content-repository convention.

## Semantic Versions

Treat `MAJOR.MINOR.PATCH` and a tag such as `vMAJOR.MINOR.PATCH` as Semantic Versioning only when repository policy or consistent history supports that interpretation.

- Increment `PATCH` for a backward-compatible fix and reset no higher component: `1.2.3` to `1.2.4`.
- Increment `MINOR` for backward-compatible functionality and reset `PATCH` to zero: `1.2.3` to `1.3.0`.
- Increment `MAJOR` for a breaking change and reset `MINOR` and `PATCH` to zero: `1.2.3` to `2.0.0`.
- Follow the repository's explicit pre-release and build-metadata policy; do not invent one.

An instruction that only says "increment the version" is insufficient for Semantic Versioning unless the repository explicitly defines a default increment level. Ask the user to choose major, minor, or patch. Do not infer the level solely from the current diff.

Keep a tag prefix such as `v` separate from the manifest value unless the repository explicitly stores the prefix in its authoritative version source. For example, a manifest value `1.2.4` may correspond to tag `v1.2.4`.

## Boundaries

A version increment does not authorize `git add`, `git commit`, tag creation, push, or GitHub Release publication. Before a separately requested add or commit, apply [version-increment-confirmation.md](version-increment-confirmation.md). Perform tag, push, or Release work only under a separately documented workflow with explicit authorization.
