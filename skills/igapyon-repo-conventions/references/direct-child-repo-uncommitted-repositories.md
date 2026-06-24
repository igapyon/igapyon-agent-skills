# Direct Child Repository Uncommitted Repositories

Use this rule when the user wants to list direct child Git repositories that have uncommitted materials under the current directory.

## Scope

Treat the current directory as the parent directory.

Only inspect Git repositories that are direct child directories of the current directory.

A target repository is a directory that satisfies both conditions:

- `./<repo>/.git` exists.
- `<repo>` is a direct child directory of the current directory.

Do not inspect nested Git repositories below those direct child repositories.

Example nested repository to ignore:

```text
./some-repo/references/raw/nested-repo/.git
```

## Excluded Paths

Within each target repository, exclude changes under these directory names at any depth:

- `workplace/`
- `vendor/`
- `tmp/`
- `temp/`

The exclusion applies both at repository root and under nested directories:

```text
workplace/**
**/workplace/**
vendor/**
**/vendor/**
tmp/**
**/tmp/**
temp/**
**/temp/**
```

## Dirty Repository Judgment

For each target repository, run `git status --porcelain=v1` after applying the excluded paths.

If the filtered status output is not empty, judge that repository as having uncommitted materials.

Include all of these states in the judgment:

- modified files
- added files
- deleted files
- untracked files
- staged changes
- unstaged changes

## Reference Command

Run this from the parent directory whose direct children are repositories:

```sh
find . -mindepth 2 -maxdepth 2 -type d -name .git -print |
while IFS= read -r gitdir; do
  repo=${gitdir%/.git}
  stat_out=$(git -C "$repo" status --porcelain=v1 -- . \
    ':(exclude)workplace/**' \
    ':(exclude)**/workplace/**' \
    ':(exclude)vendor/**' \
    ':(exclude)**/vendor/**' \
    ':(exclude)tmp/**' \
    ':(exclude)**/tmp/**' \
    ':(exclude)temp/**' \
    ':(exclude)**/temp/**' \
    2>/dev/null)

  if [ -n "$stat_out" ]; then
    printf '%s\n' "$repo"
    printf '%s\n' "$stat_out" | sed 's/^/  /'
  fi
done
```

Report only repositories that have non-empty filtered status output.
