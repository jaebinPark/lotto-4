#!/usr/bin/env bash
# scripts/patch_app_bundle.sh
set -euo pipefail
SRC="js/ui.v013.inline.js"
DST="js/app.bundle.js"
[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }
[ -f "$DST" ] || { echo "missing $DST"; exit 1; }
printf "\n\n/* appended UI/UX patch v0.013 */\n" >> "$DST"
cat "$SRC" >> "$DST"
echo "OK: appended UI patch into $DST"
