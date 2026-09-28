#!/usr/bin/env bash
set -euo pipefail
phase=environment
record_outcome() {
  local code=$?
  printf '{"lastPhase":"%s","exitCode":%s}\n' "$phase" "$code" > "$ALHANGEUL_GUI_OUTPUT_DIR/package-acceptance.json"
}
trap record_outcome EXIT
test "$(uname -m)" = x86_64
test "$(rpm -E '%{fedora}')" = 44
cat /etc/os-release > "$ALHANGEUL_GUI_OUTPUT_DIR/package-os-release.txt"
phase=install
dnf install -y "$INSTALLER_PATH" 2>&1 | tee "$ALHANGEUL_GUI_OUTPUT_DIR/install.log"
package_name=$(rpm -qp --qf '%{NAME}' "$INSTALLER_PATH")
test "$(rpm -q --qf '%{ARCH} %{VERSION}-%{RELEASE}' "$package_name")" = 'x86_64 0.1.0-1'
rpm -q --qf '%{NAME} %{ARCH} %{VERSION}-%{RELEASE}\n' "$package_name" > "$ALHANGEUL_GUI_OUTPUT_DIR/installed-package.txt"
rpm -qa | sort > "$ALHANGEUL_GUI_OUTPUT_DIR/packages.txt"
phase=gui-dependencies
dnf install -y xorg-x11-server-Xvfb xorg-x11-xauth openbox dbus-x11 at-spi2-core \
  python3-gobject python3-pyatspi xdotool scrot google-noto-sans-cjk-fonts webkitgtk6.0 shadow-utils util-linux
rpm -qa | sort > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-packages.txt"
command -v WebKitWebDriver
useradd --create-home --uid "$ACCEPTANCE_UID" acceptance
chown -R acceptance:acceptance "$ALHANGEUL_GUI_OUTPUT_DIR"
phase=gui
runuser -u acceptance -- env "PATH=$PATH" bash scripts/ci/run-release-file-gui.sh
phase=complete
