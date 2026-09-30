#!/usr/bin/env bash
set -euo pipefail
evidence="$PWD/candidate-evidence"
files="$PWD/capture-samples"
mkdir -p "$evidence" "$XDG_CACHE_HOME"
test -x /usr/lib/alhangeul/alhangeul-thumbnailer
test "$(dpkg-query -W -f='${Version}' alhangeul)" = 0.1.0
openbox > "$evidence/gallery-openbox.log" 2>&1 &
wm_pid=$!
finish() {
  nautilus --quit >/dev/null 2>&1 || true
  kill "$wm_pid" 2>/dev/null || true
}
trap finish EXIT
gsettings set org.gnome.nautilus.preferences show-image-thumbnails always
gsettings set org.gnome.nautilus.preferences default-folder-viewer icon-view
gsettings set org.gnome.nautilus.icon-view default-zoom-level larger
gsettings set org.gnome.desktop.thumbnailers disable-all false
nautilus "$files" > "$evidence/nautilus.log" 2>&1 &
window=$(timeout 30 xdotool search --sync --onlyvisible --class 'org.gnome.Nautilus' | head -1)
xdotool windowmove "$window" 30 30 windowsize "$window" 1180 780
xdotool mousemove 1390 990
# The real file manager generates thumbnails asynchronously. Never seed the cache.
for ((attempt=0; attempt<60; attempt++)); do
  count=$(python3 scripts/site-capture/thumbnail-status.py "$files" "$XDG_CACHE_HOME" "$evidence/thumbnail-status.json")
  if [[ "$count" == 8 ]]; then break; fi
  sleep 2
done
scrot "$evidence/linux-desktop.png"
# Include the actual window-manager decorations, without drawing a fake frame.
import -window "$window" -frame "$evidence/linux-explorer.png"
test "$count" == 8
