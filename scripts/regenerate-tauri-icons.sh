#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICON_SOURCE="$ROOT_DIR/frontend/public/SafeNodelogo.png"
ICON_DIR="$ROOT_DIR/src-tauri/icons"

if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "Missing icon source: $ICON_SOURCE" >&2
  exit 1
fi

mkdir -p "$ICON_DIR"

cd "$ROOT_DIR"
if npx @tauri-apps/cli@1.5.14 icon "$ICON_SOURCE"; then
  echo "Tauri icons regenerated with @tauri-apps/cli."
else
  echo "Falling back to local icon generation (no npm registry required)..."

  sips -z 32 32 "$ICON_SOURCE" --out "$ICON_DIR/32x32.png" >/dev/null
  sips -z 128 128 "$ICON_SOURCE" --out "$ICON_DIR/128x128.png" >/dev/null
  sips -z 256 256 "$ICON_SOURCE" --out "$ICON_DIR/128x128@2x.png" >/dev/null
  sips -z 1024 1024 "$ICON_SOURCE" --out "$ICON_DIR/icon.png" >/dev/null

  ICON_SOURCE_ENV="$ICON_SOURCE" ICON_DIR_ENV="$ICON_DIR" python3 - <<'PY'
from PIL import Image
import os

src = os.environ["ICON_SOURCE_ENV"]
out = os.environ["ICON_DIR_ENV"]
img = Image.open(src).convert("RGBA")

icns_sizes = [(16, 16), (32, 32), (128, 128), (256, 256), (512, 512), (1024, 1024)]
ico_sizes = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (72, 72), (96, 96), (128, 128), (256, 256)]

img.save(os.path.join(out, "icon.icns"), format="ICNS", sizes=icns_sizes)
img.save(os.path.join(out, "icon.ico"), format="ICO", sizes=ico_sizes)
PY

  echo "Tauri icons regenerated with local toolchain."
fi

echo "Source: $ICON_SOURCE"
echo "Output: $ICON_DIR"
