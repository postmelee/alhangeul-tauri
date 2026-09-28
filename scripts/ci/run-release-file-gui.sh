#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -ne 0
test -x "$ALHANGEUL_GUI_APP_PATH"
test -x "$ALHANGEUL_GUI_DRIVER_PATH"
command -v WebKitWebDriver
cat /etc/os-release > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-os-release.txt"
uname -m > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-architecture.txt"
id > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-user.txt"
"$ALHANGEUL_GUI_DRIVER_PATH" --version > "$ALHANGEUL_GUI_OUTPUT_DIR/tauri-driver-version.txt"
# shellcheck disable=SC2016
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24 -nolisten tcp' \
  dbus-run-session -- bash -euo pipefail -c '
    openbox > "$ALHANGEUL_GUI_OUTPUT_DIR/openbox.log" 2>&1 &
    wm_pid=$!
    trap '\''kill "$wm_pid" 2>/dev/null || true'\'' EXIT
    node node_modules/@wdio/cli/bin/wdio.js run tests/gui/wdio.release-files.conf.ts
  '
