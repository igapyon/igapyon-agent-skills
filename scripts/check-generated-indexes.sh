#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)
INDEX_PATHSPEC=':(glob)skills/*/index.json'

cd "$BASE_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Generated-index drift checking requires a Git working tree." >&2
  exit 1
fi

INDEX_STATUS=$(git status --short --untracked-files=all -- "$INDEX_PATHSPEC")

if [ -n "$INDEX_STATUS" ]; then
  echo "Generated index drift detected." >&2
  echo "Run 'mvn generate-resources' and commit the resulting index.json files." >&2
  git diff -- "$INDEX_PATHSPEC"
  git diff --cached -- "$INDEX_PATHSPEC"
  printf '%s\n' "$INDEX_STATUS" >&2
  exit 1
fi

echo "Generated indexes match the committed files."
