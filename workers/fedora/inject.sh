#!/usr/bin/env bash
set -euo pipefail
# Inject Kickstart + /isomill into an official Fedora installer ISO using mkksiso.
# Usage: inject-fedora.sh <source.iso> <ks.cfg> <isomill-tree-dir> <out.iso>

SRC=${1:?source iso}
KS=${2:?kickstart}
TREE=${3:?isomill tree}
OUT=${4:?output iso}

if ! command -v mkksiso >/dev/null; then
  echo "mkksiso (lorax) is required" >&2
  exit 1
fi

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/add/isomill"
cp -a "$TREE"/. "$STAGE/add/isomill/"
cp "$KS" "$STAGE/ks.cfg"

# -a copies the directory tree onto the ISO root so /isomill is present at install time.
mkksiso --ks "$STAGE/ks.cfg" -a "$STAGE/add" "$SRC" "$OUT"
