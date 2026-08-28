#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 3 ]]; then
  echo "usage: benchmark-linux-thumbnail-core.sh <repo-root> <fixture-root> <output-directory>" >&2
  exit 64
fi

repo_root="$(cd "$1" && pwd -P)"
fixture_root="$(cd "$2" && pwd -P)"
output_root="$3"
command_timeout_seconds=120

assert_linux_host() {
  [[ "$(uname -s)" == Linux ]] || { echo "Linux host가 필요합니다." >&2; exit 1; }
  case "$(uname -m)" in
    x86_64|aarch64) ;;
    *) echo "Linux x64 또는 arm64 host가 필요합니다." >&2; exit 1 ;;
  esac
}

require_commands() {
  local command
  for command in cargo node sha256sum stat timeout zip base64; do
    command -v "$command" >/dev/null || { echo "$command 명령이 필요합니다." >&2; exit 1; }
  done
  [[ -x /usr/bin/time ]] || { echo "/usr/bin/time 명령이 필요합니다." >&2; exit 1; }
}

lower_sha256() {
  sha256sum "$1" | awk '{print tolower($1)}'
}

write_probe_manifest() {
  local crate_root="$1"
  install -d "$crate_root/src" "$crate_root/workspace/crates" "$crate_root/workspace/third_party"
  ln -s "$repo_root/crates/document-preview" "$crate_root/workspace/crates/document-preview"
  ln -s "$repo_root/third_party/rhwp" "$crate_root/workspace/third_party/rhwp"
  cat > "$crate_root/Cargo.toml" <<'TOML'
[package]
name = "alhangeul-linux-thumbnail-core-probe"
version = "0.0.0"
edition = "2021"
publish = false

[dependencies]
alhangeul-document-preview = { path = "workspace/crates/document-preview", default-features = false, features = ["render"] }
TOML
}

write_probe_source() {
  local crate_root="$1"
  cat > "$crate_root/src/main.rs" <<'RUST'
use alhangeul_document_preview::{
    extract_embedded_preview, rasterize_embedded_preview, rasterize_first_page, Bitmap,
};
use std::{env, fs, process::ExitCode};

fn main() -> ExitCode {
    let args = env::args().collect::<Vec<_>>();
    if args.len() != 4 {
        return ExitCode::from(64);
    }
    let edge = match args[3].parse::<u32>() {
        Ok(value) => value,
        Err(_) => return ExitCode::from(64),
    };
    let bytes = match fs::read(&args[2]) {
        Ok(value) => value,
        Err(_) => return ExitCode::from(66),
    };
    let bitmap = match args[1].as_str() {
        "direct" => rasterize_first_page(&bytes, edge).ok(),
        "preview" => extract_embedded_preview(&bytes)
            .ok()
            .flatten()
            .and_then(|preview| rasterize_embedded_preview(&preview, edge).ok()),
        _ => return ExitCode::from(64),
    };
    print_result(bitmap);
    ExitCode::SUCCESS
}

fn print_result(bitmap: Option<Bitmap>) {
    match bitmap {
        Some(value) => println!(
            "{{\"success\":true,\"width\":{},\"height\":{},\"payloadBytes\":{}}}",
            value.width,
            value.height,
            value.bgra.len()
        ),
        None => println!("{{\"success\":false}}"),
    }
}
RUST
}

build_probe() {
  local crate_root="$1" target_root="$2"
  cargo generate-lockfile --manifest-path "$crate_root/Cargo.toml" >/dev/null
  CARGO_TARGET_DIR="$target_root" cargo build \
    --manifest-path "$crate_root/Cargo.toml" --locked --release >/dev/null
}

create_variants() {
  local source="$1" derived_root="$2"
  local without_preview="$derived_root/without-preview.hwpx"
  local stale_preview="$derived_root/stale-preview.hwpx"
  cp "$source" "$without_preview"
  zip -q -d "$without_preview" 'Preview/PrvImage*' >/dev/null 2>&1 || true
  cp "$source" "$stale_preview"
  zip -q -d "$stale_preview" 'Preview/PrvImage*' >/dev/null 2>&1 || true
  install -d "$derived_root/replacement/Preview"
  printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+wsSFygAAAABJRU5ErkJggg==' \
    | base64 --decode > "$derived_root/replacement/Preview/PrvImage.png"
  (cd "$derived_root/replacement" && zip -q "$stale_preview" Preview/PrvImage.png)
  head -c 128 "$source" > "$derived_root/corrupt.hwpx"
  truncate -s 67108865 "$derived_root/oversize.hwp"
}

json_result() {
  local path="$1"
  if node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$path" \
    >/dev/null 2>&1; then
    tr -d '\r\n' < "$path"
  else
    printf '{"success":false}'
  fi
}

run_measured() {
  local file="$1" class="$2" mode="$3" edge="$4" probe_binary="$5"
  local sha bytes modified start_ms finish_ms status timed_out peak result format
  local record_id stdout_path stderr_path metric_path
  sha="$(lower_sha256 "$file")"
  bytes="$(stat -c '%s' "$file")"
  modified="$(stat -c '%y' "$file")"
  format="${file##*.}"
  record_id="${sha}-${mode}-${edge}"
  stdout_path="$scratch_root/$record_id.stdout"
  stderr_path="$scratch_root/$record_id.stderr"
  metric_path="$scratch_root/$record_id.time"
  start_ms="$(date +%s%3N)"
  set +e
  /usr/bin/time -v -o "$metric_path" timeout --signal=TERM --kill-after=5s \
    "${command_timeout_seconds}s" "$probe_binary" "$mode" "$file" "$edge" \
    > "$stdout_path" 2> "$stderr_path"
  status=$?
  set -e
  finish_ms="$(date +%s%3N)"
  [[ "$(lower_sha256 "$file")" == "$sha" ]]
  [[ "$(stat -c '%s' "$file")" == "$bytes" ]]
  [[ "$(stat -c '%y' "$file")" == "$modified" ]]
  timed_out=false
  [[ "$status" -eq 124 || "$status" -eq 137 ]] && timed_out=true
  peak="$(awk -F: '/Maximum resident set size/{gsub(/[[:space:]]/, "", $2); print $2}' "$metric_path")"
  peak="${peak:-0}"
  result="$(json_result "$stdout_path")"
  printf '{"fixtureId":"fixture-%s","fixtureClass":"%s","format":"%s","mode":"%s","edge":%s,"original":{"sha256":"%s","bytes":%s,"modified":"%s"},"exitCode":%s,"timedOut":%s,"wallMs":%s,"peakRssBytes":%s,"stdoutBytes":%s,"stderrBytes":%s,"result":%s}\n' \
    "$sha" "$class" "${format,,}" "$mode" "$edge" "$sha" "$bytes" "$modified" \
    "$status" "$timed_out" "$((finish_ms - start_ms))" "$((peak * 1024))" \
    "$(stat -c '%s' "$stdout_path")" "$(stat -c '%s' "$stderr_path")" "$result" \
    >> "$records_path"
}

probe_fixture() {
  local file="$1" class="$2" binary="$3" edge mode
  for edge in 128 256 512 1024; do
    for mode in direct preview; do
      run_measured "$file" "$class" "$mode" "$edge" "$binary"
    done
  done
}

write_summary() {
  REPOSITORY_SHA="$repository_sha" RHWP_SHA="$rhwp_sha" node - "$records_path" "$summary_path" <<'NODE'
const fs = require('node:fs');
const os = require('node:os');
const lines = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean);
const records = lines.map((line) => JSON.parse(line));
const number = (field) => records.map((item) => item[field]).sort((a, b) => a - b);
const percentile95 = (values) => values[Math.max(0, Math.ceil(values.length * 0.95) - 1)] ?? 0;
const wall = number('wallMs');
const rss = number('peakRssBytes');
const summary = {
  schemaVersion: 1,
  kind: 'alhangeul-linux-thumbnail-core-probe',
  status: records.length > 0 && records.every((item) => !item.timedOut) ? 'passed' : 'failed',
  repositorySha: process.env.REPOSITORY_SHA,
  rhwpSha: process.env.RHWP_SHA,
  runner: { platform: os.platform(), release: os.release(), architecture: os.arch() },
  observed: {
    recordCount: records.length,
    wallMsP95: percentile95(wall),
    wallMsMax: wall.at(-1) ?? 0,
    peakRssBytesP95: percentile95(rss),
    peakRssBytesMax: rss.at(-1) ?? 0,
  },
  records,
};
fs.writeFileSync(process.argv[3], `${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'passed') process.exitCode = 1;
NODE
}

assert_linux_host
require_commands
[[ -d "$repo_root/.git" || -f "$repo_root/.git" ]]
[[ -d "$fixture_root" ]]
install -d "$output_root"
output_root="$(cd "$output_root" && pwd -P)"
scratch_root="$(mktemp -d "${TMPDIR:-/tmp}/alhangeul-linux-thumbnail-probe.XXXXXX")"
trap 'rm -rf "$scratch_root"' EXIT
records_path="$scratch_root/records.ndjson"
summary_path="$output_root/thumbnail-core-summary.json"
: > "$records_path"
repository_sha="$(git -C "$repo_root" rev-parse HEAD)"
expected_rhwp_sha="$(git -C "$repo_root" rev-parse HEAD:third_party/rhwp)"
rhwp_sha="$(git -C "$repo_root/third_party/rhwp" rev-parse HEAD)"
[[ "$rhwp_sha" == "$expected_rhwp_sha" ]]

probe_crate="$scratch_root/probe-crate"
target_root="${CARGO_TARGET_DIR:-$repo_root/apps/desktop/src-tauri/target}"
write_probe_manifest "$probe_crate"
write_probe_source "$probe_crate"
build_probe "$probe_crate" "$target_root"
probe_binary="$target_root/release/alhangeul-linux-thumbnail-core-probe"
[[ -x "$probe_binary" ]]

mapfile -d '' source_files < <(find "$fixture_root" -type f \( -iname '*.hwp' -o -iname '*.hwpx' \) -print0 | sort -z)
[[ "${#source_files[@]}" -ge 1 && "${#source_files[@]}" -le 28 ]]
for file in "${source_files[@]}"; do
  probe_fixture "$file" "normal-${file##*.}" "$probe_binary"
done

derived_root="$scratch_root/derived"
install -d "$derived_root"
hwpx_source="$(find "$fixture_root" -type f -iname '*.hwpx' -print -quit)"
[[ -n "$hwpx_source" ]]
create_variants "$hwpx_source" "$derived_root"
probe_fixture "$derived_root/without-preview.hwpx" preview-absent "$probe_binary"
probe_fixture "$derived_root/stale-preview.hwpx" preview-stale "$probe_binary"
probe_fixture "$derived_root/corrupt.hwpx" corrupt-truncated "$probe_binary"
probe_fixture "$derived_root/oversize.hwp" size-boundary-64mib-plus-one "$probe_binary"
write_summary
echo "Linux thumbnail core probe passed: $summary_path"
