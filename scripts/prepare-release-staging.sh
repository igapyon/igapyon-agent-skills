#!/bin/sh
set -eu

BASE_DIR=$1
STAGING_DIR=$2
shift 2

rm -rf "$STAGING_DIR" "$BASE_DIR/target/external"
mkdir -p "$STAGING_DIR" "$STAGING_DIR/skills" "$STAGING_DIR/scripts" "$STAGING_DIR/src" "$BASE_DIR/target/external"

cp "$BASE_DIR/README.md" "$STAGING_DIR/"
cp "$BASE_DIR/INSTALL.md" "$STAGING_DIR/"
cp "$BASE_DIR/LICENSE" "$STAGING_DIR/"
cp "$BASE_DIR/pom.xml" "$STAGING_DIR/"
cp -R "$BASE_DIR/.mvn" "$STAGING_DIR/"
cp -R "$BASE_DIR/lib" "$STAGING_DIR/"
cp -R "$BASE_DIR/skills/." "$STAGING_DIR/skills/"
cp -R "$BASE_DIR/scripts/." "$STAGING_DIR/scripts/"
cp -R "$BASE_DIR/src/assembly" "$STAGING_DIR/src/"

SOURCE_EXTERNAL_LOCK="$BASE_DIR/EXTERNAL_SKILLS.lock"
STAGING_EXTERNAL_LOCK="$STAGING_DIR/EXTERNAL_SKILLS.lock"
: > "$STAGING_EXTERNAL_LOCK"

while [ "$#" -gt 0 ]; do
  if [ "$#" -lt 3 ]; then
    echo "External skill arguments must be repo/ref/skillName triples" >&2
    exit 1
  fi

  EXTERNAL_REPO_URL=$1
  EXTERNAL_REF=$2
  EXTERNAL_SKILL_NAME=$3
  shift 3

  EXTERNAL_WORK_DIR="$BASE_DIR/target/external/$EXTERNAL_SKILL_NAME"

  LOCK_ENTRY=$(printf '%s\t%s\t%s' "$EXTERNAL_REPO_URL" "$EXTERNAL_REF" "$EXTERNAL_SKILL_NAME")

  if [ -e "$STAGING_DIR/skills/$EXTERNAL_SKILL_NAME" ]; then
    if [ -f "$SOURCE_EXTERNAL_LOCK" ] && grep -Fqx "$LOCK_ENTRY" "$SOURCE_EXTERNAL_LOCK"; then
      echo "Reusing bundled external skill: $EXTERNAL_SKILL_NAME ($EXTERNAL_REF)"
      printf '%s\n' "$LOCK_ENTRY" >> "$STAGING_EXTERNAL_LOCK"
      continue
    fi

    echo "Skill already exists in staging without matching locked provenance: $EXTERNAL_SKILL_NAME" >&2
    exit 1
  fi

  git clone --depth 1 --branch "$EXTERNAL_REF" "$EXTERNAL_REPO_URL" "$EXTERNAL_WORK_DIR"

  if [ ! -d "$EXTERNAL_WORK_DIR/skills/$EXTERNAL_SKILL_NAME" ]; then
    echo "External skill not found: skills/$EXTERNAL_SKILL_NAME" >&2
    exit 1
  fi

  cp -R "$EXTERNAL_WORK_DIR/skills/$EXTERNAL_SKILL_NAME" "$STAGING_DIR/skills/"
  printf '%s\n' "$LOCK_ENTRY" >> "$STAGING_EXTERNAL_LOCK"
done

java -jar "$STAGING_DIR/lib/miku-indexgen-1.5.1.jar" \
  --input-parent-directory "$STAGING_DIR/skills"

find "$STAGING_DIR" -name .DS_Store -type f -delete
