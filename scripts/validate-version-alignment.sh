#!/bin/sh
set -eu

PROJECT_VERSION=$1
VERSION_FILE=$2

if [ ! -f "$VERSION_FILE" ]; then
  echo "Version file not found: $VERSION_FILE" >&2
  exit 1
fi

MIKUKU_VERSION=$(awk -F': *' '/^Version: / { print $2; exit }' "$VERSION_FILE")
PROJECT_DATE=$(printf '%s\n' "$PROJECT_VERSION" | sed -n 's/^1\.\([0-9]\{8\}\)\.\([0-9][0-9]*\)$/\1/p')
PROJECT_NUMBER=$(printf '%s\n' "$PROJECT_VERSION" | sed -n 's/^1\.\([0-9]\{8\}\)\.\([0-9][0-9]*\)$/\2/p')
MIKUKU_DATE=$(printf '%s\n' "$MIKUKU_VERSION" | sed -n 's/^\([0-9]\{8\}\)\([a-z][a-z]*\)$/\1/p')
MIKUKU_SUFFIX=$(printf '%s\n' "$MIKUKU_VERSION" | sed -n 's/^\([0-9]\{8\}\)\([a-z][a-z]*\)$/\2/p')

if [ -z "$PROJECT_DATE" ] || [ -z "$PROJECT_NUMBER" ]; then
  echo "Invalid project version format: $PROJECT_VERSION" >&2
  echo "Expected format: 1.YYYYMMDD.N" >&2
  exit 1
fi

if [ -z "$MIKUKU_DATE" ] || [ -z "$MIKUKU_SUFFIX" ]; then
  echo "Invalid mikuku version format: $MIKUKU_VERSION" >&2
  echo "Expected format: YYYYMMDDx" >&2
  exit 1
fi

MIKUKU_NUMBER=$(awk -v suffix="$MIKUKU_SUFFIX" '
function suffix_to_number(suffix,    i, ch, n, value) {
  n = 0
  for (i = 1; i <= length(suffix); i++) {
    ch = substr(suffix, i, 1)
    value = index("abcdefghijklmnopqrstuvwxyz", ch)
    if (value == 0) {
      return -1
    }
    n = (n * 26) + value
  }
  return n
}

BEGIN {
  number = suffix_to_number(suffix)
  if (number < 1) {
    print "Invalid mikuku version suffix: " suffix > "/dev/stderr"
    exit 1
  }
  print number
}
')

if [ "$PROJECT_DATE" != "$MIKUKU_DATE" ] || [ "$PROJECT_NUMBER" -ne "$MIKUKU_NUMBER" ]; then
  echo "Version mismatch:" >&2
  echo "  pom.xml project.version: $PROJECT_VERSION" >&2
  echo "  VERSION.md Version:      $MIKUKU_VERSION" >&2
  echo "Expected matching date and update number, e.g. 1.20260604.1 with 20260604a." >&2
  exit 1
fi

echo "Version alignment OK: $PROJECT_VERSION / $MIKUKU_VERSION"
