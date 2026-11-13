#!/usr/bin/env bash
set -euo pipefail
mapfile -t images < <(find artifacts/linux-x64 -type f -name '*.AppImage')
[[ ${#images[@]} == 1 ]]
image=$(realpath "${images[0]}")
chmod +x "$image"
mkdir -p privacy-evidence/package-extract
(cd privacy-evidence/package-extract && "$image" --appimage-extract > /dev/null)
node scripts/privacy/verify-installed-notices.mjs product-source privacy-evidence/package-extract/squashfs-root privacy-evidence/linux-installed-notices.json
