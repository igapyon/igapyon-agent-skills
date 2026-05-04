# GitHub Writing Rules

Shared writing rules for `igapyon-github-writer`.

## Core Rules

- Write the final answer in Japanese unless the user asks otherwise.
- Do not output absolute paths, home directories, or working directories.
- Use only facts supported by the current conversation, the user's input, and local repository evidence inspected during the task.
- Do not invent intent, benefits, compatibility, version numbers, release dates, test results, package publication status, or external URLs.
- If information is missing, write `未確認`, `要確認`, or omit that claim.
- If making an inference from file names or diffs, mark it with `推測:`.
- The final answer must be one Markdown block wrapped with outer tildes: start with `~~~~markdown` and end with `~~~~`.

## Evidence Workflow

Before drafting, first resolve the exact Git evidence target from the user's wording. Do not draft from an assumed range when the target is ambiguous.

## Target Resolution

Use these interpretations unless the user explicitly says otherwise:

- `対象コミット <commit> における変更内容`: use exactly that single commit.
- `<commit> の変更内容`: use exactly that single commit.
- `<base>..<head>`: use Git's normal exclusive-left range; changes reachable from `<head>` but not from `<base>`.
- `<base>...<head>`: use Git's normal merge-base comparison semantics.
- Release request with only a start commit ID: implicitly treat it as `<start>` through `HEAD`, including the change introduced by `<start>`; use `<start>^..HEAD`.
- `<start> から HEAD まで` with wording that says `<start>` itself is included: use `<start>^..HEAD`.
- `<start> から HEAD まで` in Release mode: treat `<start>` itself as included by default; use `<start>^..HEAD` unless the user explicitly says to exclude `<start>`.
- `<start> から HEAD まで` outside Release mode without clear wording about whether `<start>` is included: ask a brief clarification, or state `要確認` and do not silently choose.
- current uncommitted changes: use `git diff` only when the user explicitly asks for working tree or uncommitted changes.

If the user gives a short hash, use it as provided, but verify that Git resolves it. If Git cannot resolve it, ask for the correct commit or range.

For PR text, a request that says `対象コミット <commit> における変更内容` must not be expanded to a range.

For Release text, a start commit ID implies `from <start> through HEAD, including <start>`. Inspect `<start>^..HEAD` unless the user explicitly provides another range.

After resolving the target, inspect the requested evidence.

For a single commit:

```sh
git show --stat --oneline --no-renames <commit>
git show --no-ext-diff --no-renames --format=fuller --name-only <commit>
git show --no-ext-diff --no-renames <commit>
```

For a commit range:

```sh
git log --oneline --no-decorate <range>
git diff --stat --no-renames <range>
git diff --no-ext-diff --no-renames <range>
```

When the resolved range uses `START^..HEAD` and `START^` is unavailable, inspect the root case explicitly and mark uncertainties as `要確認`.

Prefer concise summaries over copying large diffs. Mention only files, modules, behavior, and documents that are visible in the inspected evidence.
