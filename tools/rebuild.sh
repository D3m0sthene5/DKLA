#!/bin/sh
# Rebuild DKLA-r8.html from the revision-10 file through the whole chain (about seven seconds).
# Usage: DKLA_BASE=/path/to/revision-10-DKLA-r8.html sh tools/rebuild.sh   (run from any directory; builds in this checkout)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
BASE="${DKLA_BASE:-$ROOT/../DKLA-r10-base.html}"
[ -f "$BASE" ] || { echo "revision-10 base file not found: set DKLA_BASE" >&2; exit 1; }
cp "$BASE" DKLA-r8.html
python3 tools/r11_route_layout.py >/dev/null
python3 tools/r12_layout.py >/dev/null
python3 tools/r11_apply_renderer.py && python3 tools/r11_sources.py >/dev/null && python3 tools/r11_apply_sources.py
python3 tools/r12_fix_sources.py | tail -1
python3 tools/r14_wex_cases.py
python3 tools/r12_glossary.py && python3 tools/r12_apply.py
python3 tools/r13_apply.py
echo "rebuilt $(stat -c %s DKLA-r8.html) bytes"
