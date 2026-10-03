#!/usr/bin/env bash
# Public-fixture CI only: no argv, environment dump, or document text.
set -euo pipefail
mode=${1:-snapshot}
label=${2:-sample}
[[ "$label" =~ ^[a-z0-9-]+$ ]]
root="$ALHANGEUL_GUI_OUTPUT_DIR/process-diagnostics"
mkdir -p "$root"
snapshot() {
  {
    printf '\n--- %s %s ---\n' "$(date -u +%FT%TZ)" "$label"
    ps -eo pid,ppid,stat,wchan:24,comm | awk 'NR==1 || $NF ~ /^(Alhangeul|tauri-driver|WebKit|Xvfb|openbox|dbus-daemon)/'
    if command -v ss >/dev/null; then
      ss -ltnp '( sport = :4444 or sport = :4445 )'
    fi
    df -k /dev/shm
    if [[ -r /sys/fs/cgroup/memory.events ]]; then cat /sys/fs/cgroup/memory.events; fi
  } >> "$root/processes.log" 2>&1
}
if [[ "$mode" == watch ]]; then
  while true; do snapshot; sleep 1; done
elif [[ "$mode" == snapshot ]]; then
  snapshot
  timeout 5s scrot --overwrite "$root/$label.png" 2> "$root/$label-capture.log" || true
else
  exit 2
fi
