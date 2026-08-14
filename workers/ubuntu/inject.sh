#!/usr/bin/env bash
set -euo pipefail
# Inject Autoinstall nocloud + /isomill into an official Ubuntu Desktop ISO.
# Boot catalog is copied from the source ISO (xorriso -boot_image any replay).
# Usage: inject-ubuntu.sh <source.iso> <user-data> <meta-data> <isomill-tree-dir> <out.iso>

SRC=${1:?source iso}
USER_DATA=${2:?user-data}
META_DATA=${3:?meta-data}
TREE=${4:?isomill tree}
OUT=${5:?output iso}

if ! command -v xorriso >/dev/null; then
  echo "xorriso is required" >&2
  exit 1
fi

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/nocloud" "$STAGE/isomill" "$STAGE/boot"
cp "$USER_DATA" "$STAGE/nocloud/user-data"
cp "$META_DATA" "$STAGE/nocloud/meta-data"
: > "$STAGE/nocloud/vendor-data"
cp -a "$TREE"/. "$STAGE/isomill/"

# Pull installer grub snippets from the *source* ISO and add nocloud ds.
extract_if_present() {
  local path=$1 dest=$2
  if xorriso -indev "$SRC" -md5 "$path" >/dev/null 2>&1; then
    xorriso -osirrox on -indev "$SRC" -extract "$path" "$dest" >/dev/null 2>&1 || true
  fi
}

patch_grub() {
  local f=$1
  if [[ -f $f ]]; then
    # Keep upstream menus; append autoinstall datasource to linux lines that boot the live installer.
    python3 - "$f" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
text = p.read_text()
needle = "ds=nocloud"
if needle not in text:
    text = text.replace(
        "---",
        "autoinstall ds=nocloud\\;s=/cdrom/nocloud/ ---",
        1,
    )
    if needle not in text:
        text = text.replace(
            "quiet splash",
            "quiet splash autoinstall ds=nocloud\\;s=/cdrom/nocloud/",
        )
p.write_text(text)
PY
  fi
}

extract_if_present /boot/grub/grub.cfg "$STAGE/boot/grub.cfg"
extract_if_present /boot/grub/loopback.cfg "$STAGE/boot/loopback.cfg"
mkdir -p "$STAGE/patched"
if [[ -f $STAGE/boot/grub.cfg ]]; then
  cp "$STAGE/boot/grub.cfg" "$STAGE/patched/grub.cfg"
  patch_grub "$STAGE/patched/grub.cfg"
fi
if [[ -f $STAGE/boot/loopback.cfg ]]; then
  cp "$STAGE/boot/loopback.cfg" "$STAGE/patched/loopback.cfg"
  patch_grub "$STAGE/patched/loopback.cfg"
fi

# Replay El Torito / EFI from the source image. Do not invent mkisofs flags.
XORRISO_ARGS=(
  -indev "$SRC"
  -outdev "$OUT"
  -map "$STAGE/nocloud" /nocloud
  -map "$STAGE/isomill" /isomill
  -boot_image any replay
)
if [[ -f $STAGE/patched/grub.cfg ]]; then
  XORRISO_ARGS+=(-map "$STAGE/patched/grub.cfg" /boot/grub/grub.cfg)
fi
if [[ -f $STAGE/patched/loopback.cfg ]]; then
  XORRISO_ARGS+=(-map "$STAGE/patched/loopback.cfg" /boot/grub/loopback.cfg)
fi

xorriso "${XORRISO_ARGS[@]}"
