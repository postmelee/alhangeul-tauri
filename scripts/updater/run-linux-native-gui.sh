#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -lt 2 ]]; then
  echo "Usage: $0 <openbox-log> <command> [args...]" >&2
  exit 2
fi

openbox_log="$1"
shift
mkdir -p "$(dirname "$openbox_log")"

exec xvfb-run --auto-servernum --server-args='-screen 0 1280x800x24 -nolisten tcp' \
  dbus-run-session -- bash -euo pipefail -c '
    openbox_log="$1"
    shift
    openbox >"$openbox_log" 2>&1 &
    openbox_pid=$!
    trap '\''kill "$openbox_pid" 2>/dev/null || true; wait "$openbox_pid" 2>/dev/null || true'\'' EXIT
    "$@"
  ' bash "$openbox_log" "$@"
