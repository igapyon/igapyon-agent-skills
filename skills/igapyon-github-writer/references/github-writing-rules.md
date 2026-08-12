# GitHub Writing Rules

Shared writing rules for `igapyon-github-writer`.

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

Use the fixed workflows in [deterministic-runner.md](deterministic-runner.md).
`pr.evidence`, `release.evidence`, and `about.evidence` return bounded, redacted,
structured evidence plus an evidence SHA-256. The normal writing path is one AI
pass over that result. Do not duplicate the runner's inspection with ad hoc Git
commands unless the runner is unavailable or its result proves insufficient.

## Target Resolution

Use these interpretations unless the user explicitly says otherwise:

- `対象コミット <commit> における変更内容`: use exactly that single commit.
- `<commit> の変更内容`: use exactly that single commit.
- `<base>..<head>`: use Git's normal exclusive-left range; changes reachable from `<head>` but not from `<base>`.
- `<base>...<head>`: use Git's normal merge-base comparison semantics.
- PR request without a commit ID, explicit Git range, branch comparison, or working-tree target: invoke `pr.evidence` without `--target`. The runner resolves a distinct current-branch upstream, `origin/HEAD`, or `origin/devel` when available. One commit ahead becomes a single-commit target; two or more commits ahead become the complete base-to-`HEAD` range. It excludes uncommitted changes and reports its resolution and `recommit_recommended` flag in the evidence target.
- Release request with only a start commit ID: implicitly treat it as `<start>` through `HEAD`, including the change introduced by `<start>`; use `<start>^..HEAD`.
- `<start> から HEAD まで` with wording that says `<start>` itself is included: use `<start>^..HEAD`.
- `<start> から HEAD まで` in Release mode: treat `<start>` itself as included by default; use `<start>^..HEAD` unless the user explicitly says to exclude `<start>`.
- `<start> から HEAD まで` outside Release mode without clear wording about whether `<start>` is included: ask a brief clarification, or state `要確認` and do not silently choose.
- current uncommitted changes: use `git diff` only when the user explicitly asks for working tree or uncommitted changes.

If the user gives a short hash, use it as provided, but verify that Git resolves it. If Git cannot resolve it, ask for the correct commit or range.

For PR text, a request that says `対象コミット <commit> における変更内容` must not be expanded to a range.

For Release text, a start commit ID implies `from <start> through HEAD, including <start>`. Inspect `<start>^..HEAD` unless the user explicitly provides another range.

After resolving the target, pass it through the corresponding runner workflow.
The runner handles single-commit, range, and root-commit evidence consistently.

Prefer concise summaries over copying large diffs. Mention only files, modules, behavior, and documents that are visible in the inspected evidence.

## Draft Save Rules

For PR, Release, and About modes, save the final drafted Markdown to a local file unless the user explicitly says not to save.

Do not save Branch Status output by default. Branch Status is a report, not GitHub paste-ready drafted text.

Save only the inner Markdown draft, without the outer `~~~~markdown` wrapper.
Use `draft.validate-and-save` with a repository-relative input path. The runner
chooses `workplace/github-writer/`, then `temp/github-writer/`, creates a
timestamped safe filename, normalizes line endings, and refuses overwrite.

After saving, report the saved path relative to the repository root or current working directory. Never report a home directory or absolute path.
