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
test "$(rpm -q --qf '%{ARCH} %{VERSION}-%{RELEASE}' "$package_name")" = "x86_64 $ALHANGEUL_GUI_APP_VERSION-1"
rpm -q --qf '%{NAME} %{ARCH} %{VERSION}-%{RELEASE}\n' "$package_name" > "$ALHANGEUL_GUI_OUTPUT_DIR/installed-package.txt"
rpm -qa | sort > "$ALHANGEUL_GUI_OUTPUT_DIR/packages.txt"
phase=gui-dependencies
dnf install -y xorg-x11-server-Xvfb xorg-x11-xauth openbox dbus-x11 at-spi2-core \
  python3-gobject python3-pyatspi xdotool scrot google-noto-sans-cjk-fonts webkitgtk6.0 shadow-utils util-linux which procps-ng
rpm -qa | sort > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-packages.txt"
command -v WebKitWebDriver
useradd --create-home --uid "$ACCEPTANCE_UID" acceptance
chown -R acceptance:acceptance "$ALHANGEUL_GUI_OUTPUT_DIR"
export XDG_RUNTIME_DIR="/tmp/alhangeul-runtime-$ACCEPTANCE_UID"
install -d -m 0700 -o acceptance -g acceptance "$XDG_RUNTIME_DIR"
export XDG_CURRENT_DESKTOP=Openbox XDG_SESSION_TYPE=x11 GDK_BACKEND=x11
export ALHANGEUL_GUI_FEDORA_SESSION=1
phase=gtk-icon-loader
# Exercise Fedora's real SVG loader as the same unprivileged GUI user.
runuser -u acceptance -- cat /proc/self/attr/current > "$ALHANGEUL_GUI_OUTPUT_DIR/container-apparmor.txt"
runuser -u acceptance -- python3 - "$ALHANGEUL_GUI_OUTPUT_DIR" <<'PYICON'
from pathlib import Path
import json
import sys
import gi

gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf

root = Path(sys.argv[1])
source = '/usr/share/icons/Adwaita/scalable/status/image-missing.svg'
image = GdkPixbuf.Pixbuf.new_from_file(source)
assert image.get_width() > 0 and image.get_height() > 0
image.savev(str(root / 'fedora-gtk-icon.png'), 'png', [], [])
(root / 'fedora-gtk-icon.json').write_text(json.dumps({
    'source': source, 'width': image.get_width(), 'height': image.get_height(),
    'status': 'passed',
}) + '\n')
PYICON
phase=gui
runuser -u acceptance -- env "PATH=$PATH" bash scripts/ci/run-release-file-gui.sh
phase=complete
