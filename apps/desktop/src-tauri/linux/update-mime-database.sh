#!/bin/sh
set -eu

# The package manager owns the XML; refresh derived data without changing defaults.
# Do not accept a caller-selected root or hide a missing/failed refresh command.
exec update-mime-database /usr/share/mime
