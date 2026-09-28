#!/usr/bin/env bash
set -euo pipefail
phase=architecture
record_outcome() {
  local code=$?
  printf '{"lastPhase":"%s","exitCode":%s}\n' "$phase" "$code" > "$ALHANGEUL_GUI_OUTPUT_DIR/package-acceptance.json"
}
trap record_outcome EXIT
test "$(uname -m)" = aarch64
test "$(dpkg --print-architecture)" = arm64
phase=install
sudo apt-get update
sudo apt-get install -y "$INSTALLER_PATH" 2>&1 | tee "$ALHANGEUL_GUI_OUTPUT_DIR/install.log"
package_name=$(dpkg-deb -f "$INSTALLER_PATH" Package)
test "$(dpkg-query -W -f='${Architecture} ${Version}' "$package_name")" = 'arm64 0.1.0'
dpkg-query -W -f='${Package} ${Architecture} ${Version}\n' "$package_name" > "$ALHANGEUL_GUI_OUTPUT_DIR/installed-package.txt"
dpkg-query -W > "$ALHANGEUL_GUI_OUTPUT_DIR/packages.txt"
phase=gui-dependencies
sudo apt-get install -y at-spi2-core dbus-x11 fonts-noto-cjk fonts-unfonts-core \
  gir1.2-gtk-3.0 openbox python3-gi python3-pyatspi scrot webkit2gtk-driver xdotool xvfb
dpkg-query -W > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-packages.txt"
phase=gui
bash scripts/ci/run-release-file-gui.sh
phase=complete
