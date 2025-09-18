#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PLUGIN_SLUG="$(basename "$ROOT_DIR")" # expect link-fixer
MAIN_FILE="link-fixer.php"

if [[ ! -f "$MAIN_FILE" ]]; then
  echo "Error: $MAIN_FILE not found in $ROOT_DIR" >&2
  exit 1
fi

# Extract version from main plugin file header
VERSION=$(grep -m1 -E "^[[:space:]]*\*[[:space:]]*Version:" "$MAIN_FILE" | sed -E 's/.*Version:[[:space:]]*([^[:space:]]+).*/\1/')
if [[ -z "$VERSION" ]] && [[ -f readme.txt ]]; then
  VERSION=$(grep -m1 -E "^Stable tag:" readme.txt | sed -E 's/.*Stable tag:[[:space:]]*([^[:space:]]+).*/\1/')
fi
if [[ -z "$VERSION" ]]; then
  echo "Warning: could not detect version, defaulting to 0.0.0" >&2
  VERSION="0.0.0"
fi

echo "Packaging $PLUGIN_SLUG v$VERSION"

# Build assets if Vite project is present
if [[ -f package.json ]]; then
  echo "Running build..."
  if command -v npm >/dev/null 2>&1; then
    npm run build --silent || true
  fi
fi

WORKDIR="$(mktemp -d 2>/dev/null || mktemp -d -t linkfixer)"
DEST_DIR="$WORKDIR/$PLUGIN_SLUG"
mkdir -p "$DEST_DIR"

if command -v rsync >/dev/null 2>&1; then
  EXCLUDES=("--exclude" ".git" "--exclude" ".svn")
  if [[ -f .distignore ]]; then
    rsync -a --delete --exclude-from=.distignore ./ "$DEST_DIR/"
  else
    rsync -a --delete "${EXCLUDES[@]}" ./ "$DEST_DIR/"
  fi
else
  # Fallback: copy then prune some known dev folders
  cp -R ./ "$DEST_DIR/"
  rm -rf "$DEST_DIR/.git" "$DEST_DIR/node_modules" "$DEST_DIR/src" || true
fi

ZIP_NAME="$PLUGIN_SLUG-$VERSION.zip"
echo "Creating archive: $ZIP_NAME"
cd "$WORKDIR"
zip -r "$ZIP_NAME" "$PLUGIN_SLUG" >/dev/null

mv "$ZIP_NAME" "$ROOT_DIR/"
echo "Done: $ROOT_DIR/$ZIP_NAME"
