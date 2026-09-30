#!/usr/bin/env bash
set -euo pipefail
dbus-update-activation-environment DISPLAY XAUTHORITY XDG_CURRENT_DESKTOP XDG_RUNTIME_DIR GDK_BACKEND
openbox > "$ALHANGEUL_GUI_OUTPUT_DIR/openbox.log" 2>&1 &
wm_pid=$!
(
  sleep 8
  timeout 10 scrot --overwrite "$ALHANGEUL_GUI_OUTPUT_DIR/desktop-early.png"
  ps -eo pid,ppid,stat,comm > "$ALHANGEUL_GUI_OUTPUT_DIR/processes-early.txt"
) > "$ALHANGEUL_GUI_OUTPUT_DIR/early-capture.log" 2>&1 &
capture_pid=$!
finish() {
  local result=$?
  # Diagnostics must not replace the GUI result, including when its session dies.
  set +e
  timeout 10 scrot --overwrite "$ALHANGEUL_GUI_OUTPUT_DIR/desktop-at-exit.png" \
    2> "$ALHANGEUL_GUI_OUTPUT_DIR/desktop-capture.log"
  ps -eo pid,ppid,stat,comm > "$ALHANGEUL_GUI_OUTPUT_DIR/processes-at-exit.txt"
  df -k /dev/shm > "$ALHANGEUL_GUI_OUTPUT_DIR/shm-at-exit.txt"
  if [[ -r /sys/fs/cgroup/memory.events ]]; then
    cat /sys/fs/cgroup/memory.events > "$ALHANGEUL_GUI_OUTPUT_DIR/memory-events.txt"
  fi
  kill "$wm_pid" 2>/dev/null
  kill "$capture_pid" 2>/dev/null
  exit "$result"
}
trap finish EXIT
df -k /dev/shm > "$ALHANGEUL_GUI_OUTPUT_DIR/shm-before.txt"
printf 'DISPLAY=%s\nXDG_RUNTIME_DIR=%s\nXDG_CURRENT_DESKTOP=%s\nGDK_BACKEND=%s\n' \
  "$DISPLAY" "$XDG_RUNTIME_DIR" "$XDG_CURRENT_DESKTOP" "$GDK_BACKEND" > "$ALHANGEUL_GUI_OUTPUT_DIR/gui-session.txt"
node node_modules/@wdio/cli/bin/wdio.js run tests/gui/wdio.release-files.conf.ts
