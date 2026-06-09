#!/bin/sh
set -eu

BASE_DIR=$(cd "$(dirname "$0")/.." && pwd)
WORKPLACE_DIR="$BASE_DIR/workplace"
DIST_DIR="$WORKPLACE_DIR/text-bundle-dist"
PROJECT_VERSION=$(sed -n 's/.*<version>\(1\.[0-9][0-9]*\.[0-9][0-9]*\)<\/version>.*/\1/p' "$BASE_DIR/pom.xml" | head -n 1)

if [ -z "$PROJECT_VERSION" ]; then
  echo "Project version not found in pom.xml" >&2
  exit 1
fi

TEXT_BUNDLE_RUNTIME=$(find "$BASE_DIR/target/release-staging/skills/igapyon-miku-text-bundle/runtime" -name 'miku-text-bundle-*.mjs' -type f 2>/dev/null | sort | tail -n 1 || true)

if [ -z "$TEXT_BUNDLE_RUNTIME" ]; then
  echo "miku-text-bundle runtime not found. Running mvn package to prepare release staging..." >&2
  mvn -f "$BASE_DIR/pom.xml" package
  TEXT_BUNDLE_RUNTIME=$(find "$BASE_DIR/target/release-staging/skills/igapyon-miku-text-bundle/runtime" -name 'miku-text-bundle-*.mjs' -type f | sort | tail -n 1 || true)
fi

if [ -z "$TEXT_BUNDLE_RUNTIME" ] || [ ! -f "$TEXT_BUNDLE_RUNTIME" ]; then
  echo "miku-text-bundle runtime still not found after staging preparation" >&2
  exit 1
fi

ZIP_PATH="$WORKPLACE_DIR/igapyon-agent-skills-bundle-selection-$PROJECT_VERSION.zip"

rm -rf "$DIST_DIR" "$ZIP_PATH"
mkdir -p "$DIST_DIR"

generate_bundle() {
  input_dir=$1
  output_name=$2
  prefix=$3

  node "$TEXT_BUNDLE_RUNTIME" \
    --input "$input_dir" \
    --output "$DIST_DIR/$output_name" \
    --filename-prefix "$prefix"
}

generate_bundle \
  "$BASE_DIR/skills/igapyon-mikuku-agent" \
  "mikuku-agent-text-bundle" \
  "mikuku-agent-text-bundle"

generate_bundle \
  "$BASE_DIR/skills/igapyon-repo-conventions" \
  "miku-repo-conventions-text-bundle" \
  "miku-repo-conventions-text-bundle"

generate_bundle \
  "$BASE_DIR/skills/igapyon-skill-compactor" \
  "miku-skill-compactor-text-bundle" \
  "miku-skill-compactor-text-bundle"

(cd "$WORKPLACE_DIR" && zip -r "$(basename "$ZIP_PATH")" text-bundle-dist)

echo "generated: $DIST_DIR"
echo "generated: $ZIP_PATH"
