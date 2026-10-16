# Install

This archive contains complete Agent Skill directories under `skills/`.
Install one skill at a time from the extracted archive root.

## Install or Update One Skill

Choose a name from the `skills/` directory and set it below. The example
installs `igapyon-mikuku-agent`. The destination defaults to `$CODEX_HOME` when
set, or `$HOME/.codex`.

~~~sh
SKILL_NAME=igapyon-mikuku-agent
SKILL_CODEX_HOME=${CODEX_HOME:-"$HOME/.codex"}
SKILL_SOURCE_DIR="skills/$SKILL_NAME"
SKILL_DEST_PARENT="$SKILL_CODEX_HOME/skills"
SKILL_DEST_DIR="$SKILL_DEST_PARENT/$SKILL_NAME"

case "$SKILL_NAME" in
  ""|-*|*-|*--*|*[!a-z0-9-]*)
    echo "Invalid skill name: $SKILL_NAME" >&2
    exit 1
    ;;
esac

if [ "${#SKILL_NAME}" -gt 64 ]; then
  echo "Skill name is too long: $SKILL_NAME" >&2
  exit 1
fi

if [ ! -d "$SKILL_SOURCE_DIR" ] || [ ! -f "$SKILL_SOURCE_DIR/SKILL.md" ] || [ -L "$SKILL_SOURCE_DIR" ]; then
  echo "Skill source not found: $SKILL_SOURCE_DIR" >&2
  exit 1
fi

case "$SKILL_CODEX_HOME" in
  /*) ;;
  *)
    echo "SKILL_CODEX_HOME must be an absolute path" >&2
    exit 1
    ;;
esac

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required" >&2
  exit 1
fi

if [ -L "$SKILL_DEST_PARENT" ]; then
  echo "Skills destination must not be a symbolic link" >&2
  exit 1
fi
mkdir -p "$SKILL_DEST_PARENT"
if [ -L "$SKILL_DEST_DIR" ]; then
  echo "Skill destination must not be a symbolic link" >&2
  exit 1
fi

mkdir -p "$SKILL_DEST_DIR"
rsync -a --delete --exclude='.DS_Store' "$SKILL_SOURCE_DIR/" "$SKILL_DEST_DIR/"
~~~

This mirrors the selected skill directory. Files previously installed there
but absent from the archive copy are removed. Other installed skills are not
changed.

To install a different skill, set `SKILL_NAME` to its directory name under
`skills/` and rerun the commands.

For a custom Codex home, replace the `SKILL_CODEX_HOME` assignment with an
absolute path, for example `SKILL_CODEX_HOME=/absolute/path/to/codex-home`.

## Check For Drift

Run this from the extracted archive root after setting `SKILL_NAME`,
`SKILL_CODEX_HOME`, `SKILL_SOURCE_DIR`, and `SKILL_DEST_DIR` as above. It
compares without changing the installation. An empty filtered result means
the file contents and directory entries match.

~~~sh
DRIFT_FILE=$(mktemp "${TMPDIR:-/tmp}/skill-drift.XXXXXX")
trap 'rm -f "$DRIFT_FILE"' EXIT HUP INT TERM
rsync -nrlci --delete --exclude='.DS_Store' "$SKILL_SOURCE_DIR/" "$SKILL_DEST_DIR/" >"$DRIFT_FILE"
if awk '$1 != ".f..T...." { print; found=1 } END { exit !found }' "$DRIFT_FILE"; then
  echo "Installed skill differs from source."
else
  echo "No content drift."
fi
~~~

The filter ignores the mtime-only `.f..T....` line emitted by macOS rsync
2.6. An rsync error still stops the check.

## Reload And Verify

Reload the Codex host application after syncing. Then verify the selected
skill's entry point:

~~~sh
test -f "$SKILL_DEST_DIR/SKILL.md"
~~~
