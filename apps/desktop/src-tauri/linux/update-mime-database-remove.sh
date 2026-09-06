#!/bin/sh
set -eu

# post-remove may run after package dependencies are unavailable.
command -v update-mime-database >/dev/null 2>&1 || exit 0
exec update-mime-database /usr/share/mime
