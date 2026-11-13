#!/usr/bin/env bash
set -euo pipefail
out="$PWD/privacy-evidence"
export PRIVACY_OUT="$out"
conf="$RUNNER_TEMP/privacy-preferences-ca"
version="$(node -p 'require("./package.json").version')"
export PRIVACY_APP="$out/Alhangeul_${version}_amd64.AppImage"
export APPIMAGE_EXTRACT_AND_RUN=1 DISPLAY=:99
profile="$HOME/.local/share/io.github.postmelee.alhangeul"
cleanup() {
  pkill -x Alhangeul || true
  kill "${driver_pid:-}" "${proxy_pid:-}" "${xvfb_pid:-}" 2>/dev/null || true
  sudo rm -f /usr/local/share/ca-certificates/task135-preferences.crt
  sudo update-ca-certificates >/dev/null
  rm -rf "$conf"
}
trap cleanup EXIT
test ! -e "$profile/updater-preferences.json"
mitmdump -q --listen-host 127.0.0.1 --listen-port 8080 --set "confdir=$conf" -s scripts/privacy/tls-observer.py >"$RUNNER_TEMP/privacy-preferences-proxy.log" 2>&1 &
proxy_pid=$!
for n in $(seq 1 30); do test -f "$conf/mitmproxy-ca-cert.pem" && break; sleep 1; done
sudo cp "$conf/mitmproxy-ca-cert.pem" /usr/local/share/ca-certificates/task135-preferences.crt
sudo update-ca-certificates >/dev/null
export HTTPS_PROXY=http://127.0.0.1:8080 HTTP_PROXY=http://127.0.0.1:8080
export https_proxy="$HTTPS_PROXY" http_proxy="$HTTP_PROXY" no_proxy=localhost,127.0.0.1 NO_PROXY=localhost,127.0.0.1
Xvfb :99 -screen 0 1280x900x24 >"$RUNNER_TEMP/privacy-preferences-xvfb.log" 2>&1 &
xvfb_pid=$!
sleep 2
openbox >"$RUNNER_TEMP/privacy-preferences-openbox.log" 2>&1 &
chmod +x "$PRIVACY_APP"
tauri-driver >"$RUNNER_TEMP/privacy-preferences-driver.log" 2>&1 &
driver_pid=$!
sleep 2
for phase in default enabled disabled corrupt; do
  if test "$phase" = corrupt; then
    test -f "$profile/updater-preferences.json"
    printf '{invalid' > "$profile/updater-preferences.json"
  fi
  printf '%s' "$phase" > "$out/phase"
  node scripts/privacy/preferences-cdp.mjs "$phase"
  pkill -x Alhangeul || true
  sleep 2
done
