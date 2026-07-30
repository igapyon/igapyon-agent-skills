#!/bin/sh
set -eu

usage() {
  echo "Usage: sh scripts/sync-codex-skill.sh [--check] <skill-name>" >&2
}

MODE=sync

if [ "${1:-}" = "--check" ]; then
  MODE=check
  shift
fi

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

SKILL_NAME=$1

case "$SKILL_NAME" in
  ""|-*|*-|*--*|*[!a-z0-9-]*)
    echo "Invalid skill name: $SKILL_NAME" >&2
    echo "Expected lowercase hyphen-case, for example igapyon-mikuku-agent." >&2
    exit 2
    ;;
esac

if [ "${#SKILL_NAME}" -gt 64 ]; then
  echo "Invalid skill name: exceeds 64 characters" >&2
  exit 2
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required" >&2
  exit 1
fi

BASE_DIR=$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)
SOURCE_DIR="$BASE_DIR/skills/$SKILL_NAME"

if [ ! -d "$SOURCE_DIR" ] || [ ! -f "$SOURCE_DIR/SKILL.md" ]; then
  echo "Skill source not found or missing SKILL.md: $SOURCE_DIR" >&2
  exit 1
fi

if [ -L "$SOURCE_DIR" ]; then
  echo "Skill source must not be a symbolic link: $SOURCE_DIR" >&2
  exit 1
fi

if [ "$(sed -n '1p' "$SOURCE_DIR/SKILL.md")" != "---" ]; then
  echo "SKILL.md is missing YAML frontmatter: $SOURCE_DIR/SKILL.md" >&2
  exit 1
fi

DECLARED_NAME=$(sed -n '2,/^---$/s/^name:[[:space:]]*//p' "$SOURCE_DIR/SKILL.md" | head -n 1)
if [ -z "$DECLARED_NAME" ] || [ "$DECLARED_NAME" != "$SKILL_NAME" ]; then
  echo "Skill name mismatch:" >&2
  echo "  requested/directory: $SKILL_NAME" >&2
  echo "  SKILL.md name:       ${DECLARED_NAME:-<missing>}" >&2
  exit 1
fi

CODEX_HOME=${CODEX_HOME:-"${HOME:?HOME must be set when CODEX_HOME is unset}/.codex"}

case "$CODEX_HOME" in
  /*) ;;
  *)
    echo "CODEX_HOME must be an absolute path: $CODEX_HOME" >&2
    exit 2
    ;;
esac

if [ "$MODE" = check ]; then
  if [ ! -d "$CODEX_HOME" ]; then
    echo "CODEX_HOME directory not found: $CODEX_HOME" >&2
    exit 1
  fi
else
  mkdir -p "$CODEX_HOME"
fi

CODEX_HOME=$(CDPATH= cd "$CODEX_HOME" && pwd -P)
DEST_PARENT="$CODEX_HOME/skills"
DEST_DIR="$DEST_PARENT/$SKILL_NAME"

if [ "$DEST_DIR" = "$SOURCE_DIR" ]; then
  echo "Skill source and destination must be different: $SOURCE_DIR" >&2
  exit 1
fi

if [ -L "$DEST_PARENT" ]; then
  echo "Skills destination must not be a symbolic link: $DEST_PARENT" >&2
  exit 1
fi

if [ -L "$DEST_DIR" ]; then
  echo "Skill destination must not be a symbolic link: $DEST_DIR" >&2
  exit 1
fi

if [ -e "$DEST_DIR" ] && [ ! -d "$DEST_DIR" ]; then
  echo "Skill destination is not a directory: $DEST_DIR" >&2
  exit 1
fi

if [ "$MODE" = check ]; then
  if [ ! -d "$DEST_DIR" ]; then
    echo "Installed skill not found: $DEST_DIR" >&2
    exit 1
  fi

  TMP_FILE=$(mktemp "${TMPDIR:-/tmp}/sync-codex-skill.XXXXXX")
  FILTERED_FILE=$(mktemp "${TMPDIR:-/tmp}/sync-codex-skill-filtered.XXXXXX")
  trap 'rm -f "$TMP_FILE" "$FILTERED_FILE"' EXIT HUP INT TERM

  LC_ALL=C rsync -nrlci --delete --exclude='.DS_Store' \
    "$SOURCE_DIR/" "$DEST_DIR/" >"$TMP_FILE"

  # macOS rsync 2.6 emits `.f..T....` for content-identical files whose only
  # difference is mtime when --times is intentionally not part of the check.
  awk '$1 != ".f..T...."' "$TMP_FILE" >"$FILTERED_FILE"

  if [ -s "$FILTERED_FILE" ]; then
    echo "Installed skill differs from source: $SKILL_NAME" >&2
    sed 's/^/  /' "$FILTERED_FILE" >&2
    exit 1
  fi

  echo "Skill is in sync: $SKILL_NAME"
  exit 0
fi

mkdir -p "$DEST_PARENT" "$DEST_DIR"
rsync -a --delete --exclude='.DS_Store' \
  "$SOURCE_DIR/" "$DEST_DIR/"

echo "Synced skill: $SKILL_NAME"
echo "  source:      $SOURCE_DIR"
echo "  destination: $DEST_DIR"
