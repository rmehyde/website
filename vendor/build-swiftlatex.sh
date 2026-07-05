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

# load emscripten env
source "$HOME/Projects/emsdk/emsdk_env.sh"

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
