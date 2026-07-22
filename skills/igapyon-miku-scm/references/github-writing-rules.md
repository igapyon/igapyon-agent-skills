# GitHub Writing Rules

Shared writing rules for the GitHub writing modes built into `igapyon-miku-scm`.

## Core Rules

- Write the final answer in Japanese unless the user asks otherwise.
- Do not output absolute paths, home directories, or working directories.
- Use only facts supported by the current conversation, the user's input, and local repository evidence inspected during the task.
- Do not invent intent, benefits, compatibility, version numbers, release dates, test results, package publication status, or external URLs.
- If information is missing, write `未確認`, `要確認`, or omit that claim.
- If making an inference from file names or diffs, mark it with `推測:`.
- The drafted GitHub text in the final answer must be wrapped with outer tildes: start with `~~~~markdown` and end with `~~~~`.
- If the draft was saved to a file, mention only the relative saved path outside the wrapped block. Do not include absolute paths.

## Evidence Workflow

Before drafting, first resolve the exact Git evidence target from the user's wording. Do not draft from an assumed range when the target is ambiguous.

## Target Resolution

Use these interpretations unless the user explicitly says otherwise:

- PR Soft Reset Recommit: resolve the reset base first and use exactly `<base>..HEAD`, covering every commit that will be collapsed. This mode overrides the generic PR latest-single-commit default.
- `対象コミット <commit> における変更内容`: use exactly that single commit.
- `<commit> の変更内容`: use exactly that single commit.
- `<base>..<head>`: use Git's normal exclusive-left range; changes reachable from `<head>` but not from `<base>`.
- `<base>...<head>`: use Git's normal merge-base comparison semantics.
- PR request without a commit ID, explicit Git range, branch comparison, or working-tree target: first run `git log --oneline --decorate -1` to resolve the current latest commit ID, then use that single commit as the PR target. Inspect it as `<resolved-commit>` / `<resolved-commit>^..<resolved-commit>` and do not include uncommitted working-tree changes.
- Release request with only a start commit ID: implicitly treat it as `<start>` through `HEAD`, including the change introduced by `<start>`; use `<start>^..HEAD`.
- `<start> から HEAD まで` with wording that says `<start>` itself is included: use `<start>^..HEAD`.
- `<start> から HEAD まで` in Release mode: treat `<start>` itself as included by default; use `<start>^..HEAD` unless the user explicitly says to exclude `<start>`.
- `<start> から HEAD まで` outside Release mode without clear wording about whether `<start>` is included: ask a brief clarification, or state `要確認` and do not silently choose.
- current uncommitted changes: use `git diff` only when the user explicitly asks for working tree or uncommitted changes.

If the user gives a short hash, use it as provided, but verify that Git resolves it. If Git cannot resolve it, ask for the correct commit or range.

For PR text, a request that says `対象コミット <commit> における変更内容` must not be expanded to a range.

For Release text, a start commit ID implies `from <start> through HEAD, including <start>`. Inspect `<start>^..HEAD` unless the user explicitly provides another range.

After resolving the target, inspect the requested evidence.

For a PR request without an explicit target:

```sh
git log --oneline --decorate -1
```

Use the commit ID shown by that command as the single commit target for the following inspection commands. Do not silently use an older commit ID from the conversation when the user's latest request omits the target.

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

## Draft Save Rules

For PR, Release, and About modes, save the final drafted Markdown to a local file unless the user explicitly says not to save.

Do not save Branch Status output by default. Branch Status is a report, not GitHub paste-ready drafted text.

Save only the inner Markdown draft, without the outer `~~~~markdown` wrapper.

Resolve the save base in this order:

1. Determine the repository root with `git rev-parse --show-toplevel`. If that fails, use the current working directory as the project-equivalent root.
2. If `<root>/workplace/` exists, use `<root>/workplace/miku-scm/` as the operational base.
3. If `<root>/temp/` exists, use `<root>/temp/miku-scm/` as the operational base.
4. If neither exists, create and use `<root>/workplace/miku-scm/`.

For PR mode, create `pr-drafts/` under the resolved operational base and save there. Keep Release and About drafts directly under the operational base unless their workflow later defines a dedicated directory.

Do not save outside the project-equivalent root unless the user explicitly provides an output path.

Use safe, lowercase filenames based on local time. Include a 12-digit year-month-day-hour-minute timestamp (`YYYYMMDDHHMM`) in PR draft filenames so repeated drafts on the same branch remain sortable and easy to resolve:

- PR mode: `pr-drafts/pr-<branch-slug>-<YYYYMMDDHHMM>.md` when the current branch name is available; otherwise `pr-drafts/pr-<YYYYMMDDHHMM>.md`
- Release mode: `release-<YYYYMMDDHHMM>.md`
- About mode: `about-<YYYYMMDDHHMM>.md`

For `<branch-slug>`, use the current branch from `git branch --show-current`. Sanitize it by lowercasing it and replacing characters outside `[a-z0-9._-]` with `-`. If the sanitized branch is empty, omit it.

Do not overwrite an existing draft file. If a generated path already exists, add another short suffix such as `-2`.

After saving, report the saved path relative to the repository root or current working directory. Never report a home directory or absolute path.

After a Pull Request is created, GitHub is the source of truth for the PR. Keep the local file unchanged under `pr-drafts/` as the reviewed writing artifact; do not treat it as a synchronized copy of later GitHub edits or state.
