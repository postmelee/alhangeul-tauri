#!/usr/bin/env bash
set -euo pipefail
out="$PWD/privacy-evidence"
export PRIVACY_OUT="$out"
conf="$RUNNER_TEMP/privacy-ca"
app="$out/Alhangeul_0.1.3_amd64.AppImage"
profile="$HOME/.local/share/io.github.postmelee.alhangeul"
cache="$HOME/.cache/io.github.postmelee.alhangeul"
inventory() {
  find "$profile" "$cache" -type f -name '*.log*' -printf '%P %s bytes\n' > "$out/lifecycle-$1.txt" 2>/dev/null || true
}
cleanup() {
  kill "${app_pid:-}" "${proxy_pid:-}" "${xvfb_pid:-}" 2>/dev/null || true
  sudo rm -f /usr/local/share/ca-certificates/task135-test.crt
  sudo update-ca-certificates >/dev/null
  rm -rf "$conf"
}
trap cleanup EXIT
mitmdump -q --listen-host 127.0.0.1 --listen-port 8080 --set "confdir=$conf" -s scripts/privacy/tls-observer.py >/tmp/privacy-proxy.log 2>&1 &
proxy_pid=$!
for n in $(seq 1 30); do test -f "$conf/mitmproxy-ca-cert.pem" && break; sleep 1; done
sudo cp "$conf/mitmproxy-ca-cert.pem" /usr/local/share/ca-certificates/task135-test.crt
sudo update-ca-certificates >/dev/null
export HTTPS_PROXY=http://127.0.0.1:8080 HTTP_PROXY=http://127.0.0.1:8080
export https_proxy="$HTTPS_PROXY" http_proxy="$HTTP_PROXY" no_proxy=localhost,127.0.0.1 NO_PROXY=localhost,127.0.0.1
export DISPLAY=:99
Xvfb :99 -screen 0 1280x900x24 >/tmp/privacy-xvfb.log 2>&1 &
xvfb_pid=$!
sleep 2
openbox >/tmp/privacy-openbox.log 2>&1 &
chmod +x "$app"
printf startup > "$out/phase"
"$app" --appimage-extract-and-run >/tmp/privacy-deep-app.log 2>&1 &
app_pid=$!
sleep 45
kill -0 "$app_pid"
import -window root "$out/tls-linux.png"
inventory running
pkill -x Alhangeul || true
kill "$app_pid" 2>/dev/null || true
sleep 3
inventory exit
printf restart > "$out/phase"
"$app" --appimage-extract-and-run >/tmp/privacy-deep-restart.log 2>&1 &
app_pid=$!
sleep 30
kill -0 "$app_pid"
pkill -x Alhangeul || true
kill "$app_pid" 2>/dev/null || true
sleep 3
inventory restart
rm "$app"
inventory appimage-delete
find "$profile" "$cache" -type f -name '*.log*' -delete 2>/dev/null || true
inventory manual-log-delete
test ! -s "$out/lifecycle-manual-log-delete.txt"
