#!/bin/sh
set -eu

BASE_DIR=$1
STAGING_DIR=$2
shift 2

rm -rf "$STAGING_DIR" "$BASE_DIR/target/external"
mkdir -p "$STAGING_DIR" "$STAGING_DIR/skills" "$BASE_DIR/target/external"

cp "$BASE_DIR/README.md" "$STAGING_DIR/"
cp "$BASE_DIR/INSTALL.md" "$STAGING_DIR/"
cp "$BASE_DIR/LICENSE" "$STAGING_DIR/"
cp "$BASE_DIR/pom.xml" "$STAGING_DIR/"
cp -R "$BASE_DIR/.mvn" "$STAGING_DIR/"
cp -R "$BASE_DIR/lib" "$STAGING_DIR/"
cp -R "$BASE_DIR/skills/." "$STAGING_DIR/skills/"

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

  git clone --depth 1 --branch "$EXTERNAL_REF" "$EXTERNAL_REPO_URL" "$EXTERNAL_WORK_DIR"

  if [ ! -d "$EXTERNAL_WORK_DIR/skills/$EXTERNAL_SKILL_NAME" ]; then
    echo "External skill not found: skills/$EXTERNAL_SKILL_NAME" >&2
    exit 1
  fi

  if [ -e "$STAGING_DIR/skills/$EXTERNAL_SKILL_NAME" ]; then
    echo "Skill already exists in staging: $EXTERNAL_SKILL_NAME" >&2
    exit 1
  fi

  cp -R "$EXTERNAL_WORK_DIR/skills/$EXTERNAL_SKILL_NAME" "$STAGING_DIR/skills/"
done

find "$STAGING_DIR" -name .DS_Store -type f -delete
