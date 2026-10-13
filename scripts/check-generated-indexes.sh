#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)
exec node "$BASE_DIR/scripts/check-generated-indexes.mjs" "$@"
