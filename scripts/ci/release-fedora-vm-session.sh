#!/usr/bin/env bash
# Xfce autostart: inherit the real LightDM/logind desktop environment.
set -euo pipefail
cd /home/acceptance/payload
exec > evidence/desktop-session.log 2>&1
phase=desktop-environment
capture_pid=''
finish() {
  local result=$?
  trap - EXIT
  if [[ -n "$capture_pid" ]]; then kill "$capture_pid" 2>/dev/null || true; fi
  scrot evidence/desktop-at-exit.png || true
  ps -eo pid,ppid,stat,comm > evidence/processes-at-exit.txt || true
  printf '{"lastPhase":"%s","exitCode":%s}\n' "$phase" "$result" > evidence/outcome.tmp
  mv evidence/outcome.tmp evidence/package-acceptance.json
  exit "$result"
}
trap finish EXIT
test "$(id -u)" -ne 0
test "$(id -un)" = acceptance
test "${XDG_SESSION_TYPE:-}" = x11
test -n "${DISPLAY:-}"
test -n "${DBUS_SESSION_BUS_ADDRESS:-}"
loginctl show-session "$XDG_SESSION_ID" > evidence/login-session.txt
id > evidence/gui-user.txt
printf 'DISPLAY=%s\nXDG_CURRENT_DESKTOP=%s\nXDG_SESSION_TYPE=%s\nXDG_RUNTIME_DIR=%s\n' \
  "$DISPLAY" "${XDG_CURRENT_DESKTOP:-}" "$XDG_SESSION_TYPE" "${XDG_RUNTIME_DIR:-}" > evidence/desktop-environment.txt
export PATH="/usr/local/bin:$PATH"
read -r ALHANGEUL_GUI_BUILD_REF ALHANGEUL_GUI_NATIVE_RUN_ID ALHANGEUL_GUI_APP_VERSION candidate_sha < <(
  ./node scripts/ci/release-candidate-input.mjs identity.json
)
export ALHANGEUL_GUI_BUILD_REF ALHANGEUL_GUI_NATIVE_RUN_ID ALHANGEUL_GUI_APP_VERSION
export ALHANGEUL_GUI_APP_PATH=/usr/bin/Alhangeul ALHANGEUL_GUI_DRIVER_PATH=/usr/local/bin/tauri-driver
export ALHANGEUL_GUI_DRIVER_VERSION='tauri-driver 2.0.6' ALHANGEUL_GUI_TIMEOUT_MS=120000
export ALHANGEUL_GUI_FIXTURE_ROOT="$PWD" ALHANGEUL_GUI_OUTPUT_DIR="$PWD/evidence"
export NO_AT_BRIDGE=0 GTK_MODULES=gail:atk-bridge LANG=C.UTF-8
# Independent snapshots survive a WebDriver hang and show whether a chooser exists.
(
  for ((index=0; index<60; index++)); do
    sleep 10
    scrot "evidence/desktop-$index.png" || true
    ps -eo pid,ppid,stat,comm > "evidence/processes-$index.txt"
    timeout 5s python3 -c 'import json,pyatspi; d=pyatspi.Registry.getDesktop(0); print(json.dumps([{"name":a.name,"role":a.getRoleName()} for a in d]))' \
      > "evidence/accessibility-apps-$index.json" 2> "evidence/accessibility-apps-$index.log" || true
  done
) &
capture_pid=$!
phase=gui
node node_modules/@wdio/cli/bin/wdio.js run tests/gui/wdio.release-files.conf.ts
phase=complete
