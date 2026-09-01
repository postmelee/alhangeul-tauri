#!/usr/bin/env bash
set -euo pipefail

readonly installed_helper=/usr/lib/alhangeul/alhangeul-thumbnailer
self_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
readonly self_path
window_manager_pid=

window_phase() {
  local manager="$1" files="$2" screenshot="$3" stdout_log="$4" stderr_log="$5" wait_seconds="$6"
  openbox > "$stdout_log.openbox" 2>&1 &
  window_manager_pid=$!
  trap 'kill "$window_manager_pid" 2>/dev/null || true' EXIT
  if [[ "$manager" == nautilus ]]; then
    gsettings set org.gnome.nautilus.preferences show-image-thumbnails always
    gsettings set org.gnome.desktop.thumbnailers disable-all false
  fi
  G_MESSAGES_DEBUG=all "$manager" "$files" > "$stdout_log" 2> "$stderr_log" &
  local manager_pid=$!
  sleep "$wait_seconds"
  scrot "$screenshot"
  "$manager" --quit >/dev/null 2>&1 || true
  wait "$manager_pid" || true
}

run_phase() {
  local manager="$1" manager_root="$2" data_root="$3" phase="$4" wait_seconds="$5"
  local phase_timeout=$((wait_seconds + 10)) trace_status=0
  HOME="$manager_root/home" XDG_CONFIG_HOME="$manager_root/config" \
    XDG_DATA_HOME="$data_root" XDG_CACHE_HOME="$manager_root/cache" \
    XDG_RUNTIME_DIR="$manager_root/runtime" \
    xvfb-run --auto-servernum --server-args='-screen 0 1280x800x24 -nolisten tcp' \
    timeout --signal=TERM --kill-after=5s "${phase_timeout}s" \
    strace -ff -qq -s 4096 -e trace=execve -o "$manager_root/traces/$phase" \
    dbus-run-session -- "$self_path" --window "$manager" "$manager_root/files" \
      "$manager_root/$phase.png" "$manager_root/logs/$phase.stdout.log" \
      "$manager_root/logs/$phase.stderr.log" "$wait_seconds" || trace_status=$?
  [[ "$trace_status" -eq 0 || "$trace_status" -eq 124 || "$trace_status" -eq 137 ]]
  [[ -s "$manager_root/$phase.png" ]]
  printf '%s traceStatus=%s timeoutSeconds=%s\n' "$phase" "$trace_status" "$phase_timeout" \
    >> "$manager_root/logs/trace-status.txt"
}

count_invocations() {
  local trace_root="$1" file_name="$2"
  awk -v helper="$installed_helper" -v input="/$file_name" \
    'index($0, "execve(\"" helper "\"") && index($0, input) { count += 1 }
     END { print count + 0 }' "$trace_root"/*
}

assert_screenshot() {
  local path="$1"
  [[ -s "$path" ]]
  [[ "$(od -An -tx1 -N8 "$path" | tr -d ' \n')" == 89504e470d0a1a0a ]]
  python3 - "$path" <<'PY'
import gi
import sys

gi.require_version("GdkPixbuf", "2.0")
from gi.repository import GdkPixbuf

pixbuf = GdkPixbuf.Pixbuf.new_from_file(sys.argv[1])
pixels = bytes(pixbuf.get_pixels())
assert pixbuf.get_width() == 1280 and pixbuf.get_height() == 800
assert len(set(pixels[::max(1, len(pixels) // 4096)])) > 8
PY
}

copy_evidence() {
  local manager="$1" manager_root="$2" evidence_root="$3"
  cp "$manager_root"/*.png "$evidence_root/"
  cp "$manager_root/invocations.txt" "$evidence_root/$manager-invocations.txt"
  cp "$manager_root/summary.json" "$evidence_root/$manager.json"
  find "$manager_root/cache" -type f -printf '%P %s\n' | sort \
    > "$evidence_root/$manager-cache.txt"
  record_cache_metadata "$manager_root/cache" \
    > "$evidence_root/$manager-cache-metadata.txt"
  cp -R "$manager_root/logs" "$evidence_root/$manager-logs"
}

record_cache_metadata() {
  local cache_root="$1"
  python3 - "$cache_root" <<'PY'
from pathlib import Path
import struct
import sys

root = Path(sys.argv[1])
for path in sorted(root.rglob("*.png")):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        continue
    offset, values = 8, {}
    while offset + 12 <= len(data):
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        body = data[offset + 8:offset + 8 + size]
        if kind == b"tEXt" and b"\0" in body:
            key, value = body.split(b"\0", 1)
            values[key.decode("latin-1")] = value.decode("latin-1")
        offset += size + 12
    relative = path.relative_to(root).as_posix()
    uri = values.get("Thumb::URI", "-")
    mtime = values.get("Thumb::MTime", "-")
    print(f"{relative}\t{uri}\t{mtime}")
PY
}

count_success_thumbnails() {
  local cache_root="$1" file_name="$2"
  python3 - "$cache_root" "$file_name" <<'PY'
from hashlib import md5
from pathlib import Path
import sys

root, name = Path(sys.argv[1]), sys.argv[2]
uri = (root.parent / "files" / name).resolve().as_uri()
key = md5(uri.encode()).hexdigest() + ".png"
print(sum("fail" not in path.relative_to(root).parts for path in root.rglob(key)))
PY
}

copy_fixtures() {
  local source_root="$1" destination="$2"
  cp "$source_root/direct.hwp" "$destination/direct.hwp"
  cp "$source_root/preview.hwpx" "$destination/preview.hwpx"
  cp "$source_root/fail.hwp" "$destination/fail.hwp"
  cp "$source_root/real-onsaemiro.hwp" "$destination/real-onsaemiro.hwp"
  cp "$source_root/real-form-002.hwpx" "$destination/real-form-002.hwpx"
}

assert_lifecycle() {
  [[ "$first_direct" -ge 1 && "$first_preview" -ge 1 && "$first_failure" -ge 1 ]]
  [[ "$first_real_hwp" -ge 1 && "$first_real_hwpx" -ge 1 ]]
  [[ "$cached_direct" -eq "$first_direct" && "$cached_preview" -eq "$first_preview" ]]
  [[ "$cached_real_hwp" -eq "$first_real_hwp" && "$cached_real_hwpx" -eq "$first_real_hwpx" ]]
  [[ "$changed_direct" -gt "$cached_direct" && "$changed_preview" -gt "$cached_preview" ]]
  [[ "$changed_real_hwp" -gt "$cached_real_hwp" && "$changed_real_hwpx" -gt "$cached_real_hwpx" ]]
  [[ "$failure_success_pngs" -eq 0 ]]
  grep -F 'real-onsaemiro.hwp' "$evidence_root/$manager-cache-metadata.txt"
  grep -F 'real-form-002.hwpx' "$evidence_root/$manager-cache-metadata.txt"
  for phase in first cached changed; do assert_screenshot "$manager_root/$phase.png"; done
  [[ "$cache_pngs" -ge 4 ]]
}

main() {
  [[ "$#" -eq 5 ]]
  local manager="$1" manager_root="$2" data_root="$3" source_root="$4" evidence_parent="$5"
  [[ "$manager" == nautilus || "$manager" == thunar ]]
  [[ "$manager_root" == /* && "$data_root" == /* && "$source_root" == /* && "$evidence_parent" == /* ]]
  local evidence_root="$evidence_parent/$manager" first_direct first_preview first_failure
  local first_real_hwp first_real_hwpx cached_real_hwp cached_real_hwpx
  local cached_direct cached_preview cached_failure changed_direct changed_preview changed_failure cache_pngs
  local changed_real_hwp changed_real_hwpx failure_success_pngs
  install -d "$evidence_root" "$manager_root/cache" "$manager_root/config" \
    "$manager_root/files" "$manager_root/home" "$manager_root/logs" \
    "$manager_root/runtime" "$manager_root/traces"
  chmod 0700 "$manager_root/runtime"
  touch "$manager_root/home/.gtk-bookmarks"
  copy_fixtures "$source_root" "$manager_root/files"
  run_phase "$manager" "$manager_root" "$data_root" first 20
  first_direct="$(count_invocations "$manager_root/traces" direct.hwp)"
  first_preview="$(count_invocations "$manager_root/traces" preview.hwpx)"
  first_failure="$(count_invocations "$manager_root/traces" fail.hwp)"
  first_real_hwp="$(count_invocations "$manager_root/traces" real-onsaemiro.hwp)"
  first_real_hwpx="$(count_invocations "$manager_root/traces" real-form-002.hwpx)"
  run_phase "$manager" "$manager_root" "$data_root" cached 8
  cached_direct="$(count_invocations "$manager_root/traces" direct.hwp)"
  cached_preview="$(count_invocations "$manager_root/traces" preview.hwpx)"
  cached_failure="$(count_invocations "$manager_root/traces" fail.hwp)"
  cached_real_hwp="$(count_invocations "$manager_root/traces" real-onsaemiro.hwp)"
  cached_real_hwpx="$(count_invocations "$manager_root/traces" real-form-002.hwpx)"
  touch "$manager_root/files/direct.hwp" "$manager_root/files/preview.hwpx" \
    "$manager_root/files/fail.hwp" "$manager_root/files/real-onsaemiro.hwp" \
    "$manager_root/files/real-form-002.hwpx"
  run_phase "$manager" "$manager_root" "$data_root" changed 20
  changed_direct="$(count_invocations "$manager_root/traces" direct.hwp)"
  changed_preview="$(count_invocations "$manager_root/traces" preview.hwpx)"
  changed_failure="$(count_invocations "$manager_root/traces" fail.hwp)"
  changed_real_hwp="$(count_invocations "$manager_root/traces" real-onsaemiro.hwp)"
  changed_real_hwpx="$(count_invocations "$manager_root/traces" real-form-002.hwpx)"
  cache_pngs="$(find "$manager_root/cache" -type f -name '*.png' | wc -l)"
  failure_success_pngs="$(count_success_thumbnails "$manager_root/cache" fail.hwp)"
  grep -hF "execve(\"$installed_helper\"" "$manager_root"/traces/* \
    > "$manager_root/invocations.txt" || true
  printf '{"manager":"%s","first":{"direct":%s,"preview":%s,"failure":%s},"cached":{"direct":%s,"preview":%s,"failure":%s},"changed":{"direct":%s,"preview":%s,"failure":%s},"realUse":{"first":{"hwp":%s,"hwpx":%s},"cached":{"hwp":%s,"hwpx":%s},"changed":{"hwp":%s,"hwpx":%s}},"cachePngs":%s,"failureSuccessPngs":%s}\n' \
    "$manager" "$first_direct" "$first_preview" "$first_failure" \
    "$cached_direct" "$cached_preview" "$cached_failure" \
    "$changed_direct" "$changed_preview" "$changed_failure" \
    "$first_real_hwp" "$first_real_hwpx" "$cached_real_hwp" "$cached_real_hwpx" \
    "$changed_real_hwp" "$changed_real_hwpx" "$cache_pngs" "$failure_success_pngs" \
    > "$manager_root/summary.json"
  copy_evidence "$manager" "$manager_root" "$evidence_root"
  assert_lifecycle
}

if [[ "${1:-}" == --window ]]; then
  shift
  window_phase "$@"
else
  main "$@"
fi
