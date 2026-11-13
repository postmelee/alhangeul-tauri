#!/usr/bin/env bash
set -euo pipefail
out="$PWD/privacy-evidence"
app="$out/Alhangeul_0.1.3_amd64.AppImage"
chmod +x "$app"
export DISPLAY=:99
Xvfb :99 -screen 0 1280x900x24 > /tmp/privacy-xvfb.log 2>&1 &
xvfb_pid=$!
cleanup() { kill "${trace_pid:-}" "$xvfb_pid" 2>/dev/null || true; }
trap cleanup EXIT
sleep 2
openbox >/tmp/privacy-openbox.log 2>&1 &
# Observe the unmodified public AppImage, including startup update check.
strace -f -e trace=connect -o /tmp/privacy-connect.log "$app" --appimage-extract-and-run >/tmp/privacy-app.log 2>&1 &
trace_pid=$!
sleep 45
if ! kill -0 "$trace_pid" 2>/dev/null; then
  tail -30 /tmp/privacy-app.log | sed "s|$PWD|<workspace>|g" > "$out/startup-error.txt"
  exit 1
fi
pgrep -af 'Alhangeul|alhangeul|WebKit' | sed "s|$PWD|<workspace>|g" > "$out/processes.txt"
import -window root "$out/app-linux.png"
grep -E 'AF_INET6?|sin_port' /tmp/privacy-connect.log > "$out/connections.txt" || true
find "$HOME/.local/share/io.github.postmelee.alhangeul" "$HOME/.cache/io.github.postmelee.alhangeul" -type f -name '*.log*' -printf '%f %s bytes\n' > "$out/log-inventory.txt" 2>/dev/null || true
getent ahosts postmelee.github.io > "$out/pages-dns-after.txt"
# Raw console and Unix-socket traces remain on the disposable runner.
test -s "$out/connections.txt"
