#!/usr/bin/env bash
set -euo pipefail
mapfile -t images < <(find artifacts/linux-x64 -type f -name '*.AppImage')
[[ ${#images[@]} == 1 ]]
image=$(realpath "${images[0]}")
chmod +x "$image"
mkdir -p privacy-evidence/package-extract
(cd privacy-evidence/package-extract && "$image" --appimage-extract > /dev/null)
node scripts/privacy/verify-installed-notices.mjs product-source privacy-evidence/package-extract/squashfs-root privacy-evidence/linux-installed-notices.json

export DISPLAY=:99 APPIMAGE_EXTRACT_AND_RUN=1
export PRIVACY_APP="$image"
cleanup() {
  kill "${driver_pid:-}" "${xvfb_pid:-}" "${openbox_pid:-}" 2>/dev/null || true
}
trap cleanup EXIT
Xvfb :99 -screen 0 1280x900x24 >"$RUNNER_TEMP/privacy-font-xvfb.log" 2>&1 &
xvfb_pid=$!
sleep 2
openbox >"$RUNNER_TEMP/privacy-font-openbox.log" 2>&1 &
openbox_pid=$!
tauri-driver >"$RUNNER_TEMP/privacy-font-driver.log" 2>&1 &
driver_pid=$!
sleep 2
node scripts/privacy/capture-bundled-fonts.mjs appimage
