#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -ne 0
test -x "$ALHANGEUL_GUI_APP_PATH"
test -x "$ALHANGEUL_GUI_DRIVER_PATH"
command -v WebKitWebDriver
cat /etc/os-release > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-os-release.txt"
uname -m > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-architecture.txt"
id > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-user.txt"
sha256sum "$ALHANGEUL_GUI_DRIVER_PATH" > "$ALHANGEUL_GUI_OUTPUT_DIR/tauri-driver.sha256"
if [[ "${ALHANGEUL_GUI_FEDORA_SESSION:-0}" == 1 ]]; then
  exec xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24 -nolisten tcp' \
    dbus-run-session -- bash scripts/ci/release-fedora-gui-session.sh
fi
# shellcheck disable=SC2016
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24 -nolisten tcp' \
  dbus-run-session -- bash -euo pipefail -c '
    openbox > "$ALHANGEUL_GUI_OUTPUT_DIR/openbox.log" 2>&1 &
    wm_pid=$!
    bash scripts/ci/release-file-process-probe.sh watch > "$ALHANGEUL_GUI_OUTPUT_DIR/process-probe-errors.log" 2>&1 &
    probe_pid=$!
    finish() {
      local result=$?
      trap - EXIT
      set +e
      bash scripts/ci/release-file-process-probe.sh snapshot "session-exit-$result"
      kill "$probe_pid" "$wm_pid" 2>/dev/null
      wait "$probe_pid" 2>/dev/null
      exit "$result"
    }
    trap finish EXIT
    node node_modules/@wdio/cli/bin/wdio.js run tests/gui/wdio.release-files.conf.ts 2>&1 \
      | tee -a "$ALHANGEUL_GUI_OUTPUT_DIR/session-console.log"
  '
