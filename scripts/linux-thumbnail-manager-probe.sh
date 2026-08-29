#!/usr/bin/env bash
set -euo pipefail

readonly helper_source="${1:-}"
readonly evidence_root="${THUMBNAIL_EVIDENCE_ROOT:-}"
readonly runner_temp="${RUNNER_TEMP:-}"
readonly installed_dir=/usr/lib/alhangeul
readonly installed_helper="$installed_dir/alhangeul-thumbnailer"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly script_dir
repository_root="$(cd "$script_dir/.." && pwd)"
readonly repository_root
readonly registration_source="$repository_root/apps/desktop/src-tauri/linux/alhangeul.thumbnailer"
readonly session_script="$script_dir/linux-thumbnail-manager-session.sh"
probe_root=

require_inputs() {
  [[ "$helper_source" == /* && -f "$helper_source" && -x "$helper_source" ]]
  [[ "$evidence_root" == /* && "$runner_temp" == /* ]]
  [[ -f "$registration_source" && -x "$session_script" ]]
  [[ ! -e "$installed_helper" ]]
}

create_preview_fixture() {
  local destination="$1"
  python3 - "$destination" <<'PY'
import base64
import sys
import zipfile

png = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUB"
    "AScY42YAAAAASUVORK5CYII="
)
with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as archive:
    archive.writestr("Preview/PrvImage.png", png)
PY
}

create_mime_database() {
  local data_root="$1"
  cat > "$data_root/mime/packages/alhangeul-probe.xml" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-hwp"><glob pattern="*.hwp" weight="100"/></mime-type>
  <mime-type type="application/vnd.hancom.hwpx"><glob pattern="*.hwpx" weight="100"/></mime-type>
</mime-info>
XML
  XDG_DATA_HOME="$data_root" update-mime-database "$data_root/mime"
}

validate_png() {
  local path="$1" edge="$2"
  python3 - "$path" "$edge" <<'PY'
import struct
import sys

data = open(sys.argv[1], "rb").read(33)
assert data[:8] == b"\x89PNG\r\n\x1a\n"
assert data[12:16] == b"IHDR"
width, height = struct.unpack(">II", data[16:24])
assert max(width, height) == int(sys.argv[2])
assert data[24] == 8 and data[25] == 6
PY
}

validate_edge_matrix() {
  local source_root="$1" output_root="$2" edge kind extension output
  for edge in 128 256 512 1024 333; do
    for kind in direct preview; do
      extension=hwp
      [[ "$kind" == preview ]] && extension=hwpx
      output="$output_root/$kind-$edge.png"
      "$installed_helper" "$source_root/$kind.$extension" "$output" "$edge"
      validate_png "$output" "$edge"
    done
  done
}

cleanup() {
  sudo rm -f "$installed_helper"
  sudo rmdir "$installed_dir" 2>/dev/null || true
  [[ -z "$probe_root" ]] || rm -rf "$probe_root"
}

run_manager() {
  local manager="$1" probe_root="$2"
  "$session_script" "$manager" "$probe_root/$manager" "$probe_root/data" \
    "$probe_root/source" "$evidence_root"
}

record_environment() {
  local data_root="$1" hwp_type="$2" hwpx_type="$3"
  {
    dpkg-query -W -f='nautilus ${Version}\n' nautilus
    dpkg-query -W -f='thunar ${Version}\n' thunar
    dpkg-query -W -f='tumbler ${Version}\n' tumbler
    dpkg-query -W -f='strace ${Version}\n' strace
    printf 'hwp %s\n' "$hwp_type"
    printf 'hwpx %s\n' "$hwpx_type"
    printf 'thumbnailer %s\n' "$installed_helper"
    sha256sum "$installed_helper" "$data_root/thumbnailers/alhangeul.thumbnailer"
    printf 'gnome_probe_sandbox product-helper-no-bypass\n'
  } > "$evidence_root/environment.txt"
}

main() {
  require_inputs
  local source_root data_root source_hashes_before source_hashes_after
  local hwp_type hwpx_type
  probe_root="$(mktemp -d "$runner_temp/alhangeul-thumbnail-manager.XXXXXX")"
  trap cleanup EXIT
  source_root="$probe_root/source"
  data_root="$probe_root/data"
  install -d "$evidence_root/edge-matrix" "$data_root/mime/packages" \
    "$data_root/thumbnailers" "$probe_root/cache" "$source_root"
  sudo install -d -m 0755 "$installed_dir"
  sudo install -m 0755 "$helper_source" "$installed_helper"
  cp third_party/rhwp/saved/blank2010.hwp "$source_root/direct.hwp"
  create_preview_fixture "$source_root/preview.hwpx"
  head -c 64 "$source_root/direct.hwp" > "$source_root/fail.hwp"
  source_hashes_before="$(sha256sum "$source_root"/*)"
  create_mime_database "$data_root"
  cp "$registration_source" "$data_root/thumbnailers/alhangeul.thumbnailer"
  printf sentinel > "$data_root/thumbnailers/unrelated.sentinel"
  printf sentinel > "$probe_root/cache/unrelated.sentinel"
  hwp_type="$(XDG_DATA_HOME="$data_root" gio info -a standard::content-type \
    "$source_root/direct.hwp" | sed -n 's/.*standard::content-type: //p')"
  hwpx_type="$(XDG_DATA_HOME="$data_root" gio info -a standard::content-type \
    "$source_root/preview.hwpx" | sed -n 's/.*standard::content-type: //p')"
  [[ "$hwp_type" == application/x-hwp && "$hwpx_type" == application/vnd.hancom.hwpx ]]
  validate_edge_matrix "$source_root" "$evidence_root/edge-matrix"
  run_manager nautilus "$probe_root"
  run_manager thunar "$probe_root"
  source_hashes_after="$(sha256sum "$source_root"/*)"
  [[ "$source_hashes_before" == "$source_hashes_after" ]]
  [[ "$(< "$data_root/thumbnailers/unrelated.sentinel")" == sentinel ]]
  [[ "$(< "$probe_root/cache/unrelated.sentinel")" == sentinel ]]
  record_environment "$data_root" "$hwp_type" "$hwpx_type"
}

main "$@"
