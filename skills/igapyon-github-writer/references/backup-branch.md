# Backup Branch

Use this workflow when the user explicitly asks `igapyon-github-writer` to create a local backup branch, or when another active `igapyon-github-writer` workflow requires a backup branch before rewriting local history.

This workflow creates a local branch that points at the current `HEAD`. It does not switch branches and it does not preserve uncommitted working-tree or index changes.

## Safety Rules

- Require an explicit user request before creating a standalone backup branch.
- In PR Soft Reset Recommit mode, create the backup branch immediately before `git reset --soft`.
- Inspect `git status -sb` and the current `HEAD` before creating the backup branch.
- Do not run `git fetch`, `git pull`, `git push`, `gh pr create`, or any remote-changing command in this workflow.
- Do not create tags, releases, issues, pull requests, commits, or non-backup branches.
- If the working tree or index has changes, report that the backup branch preserves only committed history at `HEAD`.
- Do not overwrite an existing backup branch. If the generated name exists, add a numeric suffix such as `-2`.
- If backup branch creation fails, stop before any history rewrite.

## Branch Name

Use this branch name pattern by default:

```text
backup/<YYYY-MM-DD-HHMM>
```

Use local time for the timestamp. If the user provides a branch name, use it only when it is under `backup/` and is a valid Git branch name.

## Evidence Commands

Inspect the smallest useful local evidence:

```sh
git status -sb
git branch --show-current
git rev-parse --short HEAD
git log --oneline --decorate -1
git branch --list 'backup/*'
```

## Command Shape

When the backup name is resolved and does not already exist:

```sh
git branch backup/<YYYY-MM-DD-HHMM> HEAD
git rev-parse --short backup/<YYYY-MM-DD-HHMM>
```

If the generated name already exists, choose the next available suffix:

```text
backup/<YYYY-MM-DD-HHMM>-2
backup/<YYYY-MM-DD-HHMM>-3
```

## Output

Return a concise Japanese Markdown report:

```markdown
## バックアップブランチ

- 作成: `backup/<YYYY-MM-DD-HHMM>`
- 指すコミット: `<short-hash>` ...
- 元ブランチ: `...`
- working tree: ...

## 注意点

- 未コミット変更はバックアップブランチには含まれません。
```

Add `## 注意点` only when there is something material to call out, such as dirty working tree, staged changes, untracked files, or a generated name collision.
