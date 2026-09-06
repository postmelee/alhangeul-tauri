#!/bin/sh
set -eu

# A private database compatibility canary, not evidence of package-installed GUI.
repository=${1:?repository is required}
output=${2:?evidence output is required}
exec node "$repository/scripts/linux-thumbnail-mime-contract.mjs" "$repository" "$output"
