#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICON_SOURCE="$ROOT_DIR/frontend/resources/safenode-app-icon.svg"
ICON_DIR="$ROOT_DIR/src-tauri/icons"

if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "Missing icon source: $ICON_SOURCE" >&2
  exit 1
fi

mkdir -p "$ICON_DIR"

cd "$ROOT_DIR"
npm run tauri -- icon "$ICON_SOURCE"

echo "Source: $ICON_SOURCE"
echo "Output: $ICON_DIR"
