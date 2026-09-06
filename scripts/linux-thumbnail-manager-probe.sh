#!/usr/bin/env bash
set -euo pipefail

readonly helper_source="${1:-}"
readonly evidence_root="${THUMBNAIL_EVIDENCE_ROOT:-}"
readonly runner_temp="${RUNNER_TEMP:-}"
readonly installed_dir=/usr/lib/alhangeul
readonly installed_helper="$installed_dir/alhangeul-thumbnailer"
readonly installed_registration=/usr/share/thumbnailers/alhangeul.thumbnailer
readonly installed_mime_xml=/usr/share/mime/packages/alhangeul-hwpx.xml
readonly system_data_dirs="${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly script_dir
repository_root="$(cd "$script_dir/.." && pwd)"
readonly repository_root
readonly registration_source="$repository_root/apps/desktop/src-tauri/linux/alhangeul.thumbnailer"
readonly mime_source="$repository_root/apps/desktop/src-tauri/linux/alhangeul-hwpx.xml"
readonly session_script="$script_dir/linux-thumbnail-manager-session.sh"
readonly real_hwp_source="$repository_root/third_party/rhwp/samples/[2027] 온새미로 1 본교재.hwp"
readonly real_hwpx_source="$repository_root/third_party/rhwp/samples/hwpx/form-002.hwpx"
readonly real_hwp_sha=e8592e74c9a8425c4ee2c5824d012ebe45e9f6dd36880b784ba594b4fd0a31ce
readonly real_hwpx_sha=5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4
probe_root=

require_inputs() {
  [[ "$helper_source" == /* && -f "$helper_source" && -x "$helper_source" ]]
  [[ "$evidence_root" == /* && "$runner_temp" == /* ]]
  [[ -f "$registration_source" && -x "$session_script" ]]
  [[ -f "$installed_helper" && -x "$installed_helper" ]]
  [[ -f "$installed_registration" && -f "$installed_mime_xml" ]]
  [[ -f "$real_hwp_source" && -f "$real_hwpx_source" ]]
  [[ "$(sha256sum "$real_hwp_source" | awk '{print $1}')" == "$real_hwp_sha" ]]
  [[ "$(sha256sum "$real_hwpx_source" | awk '{print $1}')" == "$real_hwpx_sha" ]]
  [[ "$(sha256sum "$helper_source" | awk '{print $1}')" == \
    "$(sha256sum "$installed_helper" | awk '{print $1}')" ]]
  cmp "$registration_source" "$installed_registration"
  cmp "$mime_source" "$installed_mime_xml"
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

content_type() {
  local data_root="$1" path="$2"
  XDG_DATA_HOME="$data_root" XDG_DATA_DIRS="$system_data_dirs" \
    gio info -a standard::content-type "$path" \
    | sed -n 's/.*standard::content-type: //p'
}

record_private_mime_state() {
  local data_root="$1" phase="$2"
  [[ ! -e "$data_root/mime" ]]
  printf '%s privateMimePath absent\n' "$phase" \
    >> "$evidence_root/private-mime-state.txt"
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

validate_real_fixtures() {
  local source_root="$1" output_root="$2"
  "$installed_helper" "$source_root/real-onsaemiro.hwp" \
    "$output_root/real-onsaemiro-512.png" 512
  "$installed_helper" "$source_root/real-form-002.hwpx" \
    "$output_root/real-form-002-512.png" 512
  validate_png "$output_root/real-onsaemiro-512.png" 512
  validate_png "$output_root/real-form-002-512.png" 512
}

cleanup() {
  [[ -z "$probe_root" ]] || rm -rf "$probe_root"
}

run_manager() {
  local manager="$1" probe_root="$2"
  "$session_script" "$manager" "$probe_root/$manager" "$probe_root/data" \
    "$probe_root/source" "$evidence_root"
}

record_environment() {
  local hwp_type="$1" hwpx_type="$2" real_hwp_type="$3" real_hwpx_type="$4"
  {
    dpkg-query -W -f='nautilus ${Version}\n' nautilus
    dpkg-query -W -f='thunar ${Version}\n' thunar
    dpkg-query -W -f='tumbler ${Version}\n' tumbler
    dpkg-query -W -f='strace ${Version}\n' strace
    dpkg-query -W -f='shared-mime-info ${Version}\n' shared-mime-info
    printf 'hwp %s\n' "$hwp_type"
    printf 'hwpx %s\n' "$hwpx_type"
    printf 'realHwp %s\n' "$real_hwp_type"
    printf 'realHwpx %s\n' "$real_hwpx_type"
    printf 'xdgDataHome %s\n' "$probe_root/data"
    printf 'xdgDataDirs %s\n' "$system_data_dirs"
    printf 'systemMimeRoot /usr/share/mime\n'
    printf 'realHwpSha256 %s\n' "$real_hwp_sha"
    printf 'realHwpxSha256 %s\n' "$real_hwpx_sha"
    printf 'thumbnailer %s\n' "$installed_helper"
    sha256sum "$installed_helper" "$installed_registration" "$installed_mime_xml"
    printf 'gnome_probe_sandbox product-helper-no-bypass\n'
  } > "$evidence_root/environment.txt"
}

main() {
  require_inputs
  local source_root data_root source_hashes_before source_hashes_after
  local hwp_type hwpx_type real_hwp_type real_hwpx_type
  probe_root="$(mktemp -d "$runner_temp/alhangeul-thumbnail-manager.XXXXXX")"
  trap cleanup EXIT
  source_root="$probe_root/source"
  data_root="$probe_root/data"
  install -d "$evidence_root/edge-matrix" "$data_root" \
    "$probe_root/cache" "$source_root"
  cp third_party/rhwp/saved/blank2010.hwp "$source_root/direct.hwp"
  create_preview_fixture "$source_root/preview.hwpx"
  head -c 64 "$source_root/direct.hwp" > "$source_root/fail.hwp"
  cp "$real_hwp_source" "$source_root/real-onsaemiro.hwp"
  cp "$real_hwpx_source" "$source_root/real-form-002.hwpx"
  source_hashes_before="$(sha256sum "$source_root"/*)"
  export XDG_DATA_DIRS="$system_data_dirs"
  record_private_mime_state "$data_root" before
  printf sentinel > "$probe_root/unrelated-thumbnailer.sentinel"
  printf sentinel > "$probe_root/cache/unrelated.sentinel"
  hwp_type="$(content_type "$data_root" "$source_root/direct.hwp")"
  hwpx_type="$(content_type "$data_root" "$source_root/preview.hwpx")"
  real_hwp_type="$(content_type "$data_root" "$source_root/real-onsaemiro.hwp")"
  real_hwpx_type="$(content_type "$data_root" "$source_root/real-form-002.hwpx")"
  [[ "$hwp_type" == application/x-hwp && "$real_hwp_type" == application/x-hwp ]]
  [[ "$hwpx_type" == application/x-hwpx && "$real_hwpx_type" == application/x-hwpx ]]
  validate_edge_matrix "$source_root" "$evidence_root/edge-matrix"
  validate_real_fixtures "$source_root" "$evidence_root/edge-matrix"
  run_manager nautilus "$probe_root"
  run_manager thunar "$probe_root"
  record_private_mime_state "$data_root" after
  source_hashes_after="$(sha256sum "$source_root"/*)"
  [[ "$source_hashes_before" == "$source_hashes_after" ]]
  [[ "$(< "$probe_root/unrelated-thumbnailer.sentinel")" == sentinel ]]
  [[ "$(< "$probe_root/cache/unrelated.sentinel")" == sentinel ]]
  record_environment "$hwp_type" "$hwpx_type" "$real_hwp_type" "$real_hwpx_type"
}

main "$@"
