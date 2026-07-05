#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Engine classes go to app/lib/swiftlatex (bundled by webpack)
APP_TARGET_DIR="$SCRIPT_DIR/../app/lib/swiftlatex"

# Worker scripts and WASM go to public/lib/swiftlatex (served as static assets)
PUBLIC_TARGET_DIR="$SCRIPT_DIR/../public/lib/swiftlatex"

# Files for app/lib (Engine classes)
APP_FILES=(
  "dvipdfm.wasm/DvipdfmxEngine.tsx"
  "dvipdfm.wasm/DvipdfmxEngine.js"
  "xetex.wasm/XeTeXEngine.tsx"
  "xetex.wasm/XeTeXEngine.js"
)

# Files for public/lib (worker scripts + WASM)
PUBLIC_FILES=(
  "dvipdfm.wasm/swiftlatexdvipdfm.js"
  "dvipdfm.wasm/swiftlatexdvipdfm.wasm"
  "xetex.wasm/swiftlatexxetex.js"
  "xetex.wasm/swiftlatexxetex.wasm"
)

# Load a pinned emscripten toolchain from the vendored emsdk submodule (vendor/emsdk).
# The emsdk repo is just installer scripts; `emsdk install` downloads the actual toolchain
# into vendor/emsdk (gitignored by emsdk), so it's fetched once per machine, not committed.
# Pin the version deliberately: emsdk's "latest" has since moved to 6.x, but the committed
# engines were built with 4.0.21 — building against a newer emscripten can change the WASM.
EMSDK_VERSION="4.0.21"
EMSDK_DIR="$SCRIPT_DIR/emsdk"
if [[ ! -x "$EMSDK_DIR/emsdk" ]]; then
  echo "error: vendored emsdk missing — run: git submodule update --init vendor/emsdk" >&2
  exit 1
fi
"$EMSDK_DIR/emsdk" install "$EMSDK_VERSION"
"$EMSDK_DIR/emsdk" activate "$EMSDK_VERSION"
source "$EMSDK_DIR/emsdk_env.sh"

cd "$SCRIPT_DIR/SwiftLaTeX"

# build
make clean
make

# Transpile TypeScript files
echo "Transpiling TypeScript files..."
# --ignoreConfig: the per-engine tsconfig.json trips TS5112 ("won't be loaded if files
# are specified on commandline") on TS 5.6+, which silently blocks emit and leaves stale
# .js. --lib replaces the DOM types that tsconfig used to provide.
"$SCRIPT_DIR/../node_modules/.bin/tsc" dvipdfm.wasm/DvipdfmxEngine.tsx --ignoreConfig --outDir dvipdfm.wasm --target es2020 --module es2020 --lib dom,es2020 --skipLibCheck
"$SCRIPT_DIR/../node_modules/.bin/tsc" xetex.wasm/XeTeXEngine.tsx --ignoreConfig --outDir xetex.wasm --target es2020 --module es2020 --lib dom,es2020 --skipLibCheck

# clean + recreate target dirs
rm -rf "$APP_TARGET_DIR"
rm -rf "$PUBLIC_TARGET_DIR"
mkdir -p "$APP_TARGET_DIR"
mkdir -p "$PUBLIC_TARGET_DIR"

# copy engine classes to app/lib
for f in "${APP_FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "error: expected output file not found: $f" >&2
    exit 1
  fi
  cp -a "$f" "$APP_TARGET_DIR/"
done

# copy worker scripts + WASM to public/lib
for f in "${PUBLIC_FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "error: expected output file not found: $f" >&2
    exit 1
  fi
  cp -a "$f" "$PUBLIC_TARGET_DIR/"
done

echo "copied ${#APP_FILES[@]} engine files to: $APP_TARGET_DIR"
echo "copied ${#PUBLIC_FILES[@]} worker/wasm files to: $PUBLIC_TARGET_DIR"
