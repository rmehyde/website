#!/usr/bin/env bash
# Regenerate the site favicon set from the generated logo.
#
# Source : graphics/logogen/logo.svg  (square, dark-mode-aware SVG from logogen.py)
# Outputs: app/  (Next.js App Router icon file conventions — auto-linked, no <head> edits)
#   icon.svg        scalable, transparent, dark-mode aware  -> modern browsers
#   favicon.ico     16/32/48 multi-res, transparent          -> legacy fallback
#   apple-icon.png  180x180 on a white tile                  -> iOS home screen
#
# Note: apple-icon gets a solid background because iOS composites any alpha over
# black, which would make the black strokes invisible. There is intentionally no
# icon.png — the SVG supersedes it for every browser that matters.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
src="$here/logo.svg"
app="$repo/app"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 1. SVG primary — copy as-is (transparent, dark-mode aware)
cp "$src" "$app/icon.svg"

# 2. favicon.ico — render each size crisply, then bundle
for s in 16 32 48; do
  rsvg-convert -w "$s" -h "$s" "$src" -o "$tmp/ico-$s.png"
done
magick "$tmp/ico-16.png" "$tmp/ico-32.png" "$tmp/ico-48.png" "$app/favicon.ico"

# 3. apple-icon.png — 180x180 flattened onto a white tile
rsvg-convert -w 180 -h 180 "$src" -o "$tmp/apple.png"
magick "$tmp/apple.png" -background white -flatten "$app/apple-icon.png"

echo "Wrote: app/icon.svg, app/favicon.ico, app/apple-icon.png"
