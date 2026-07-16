#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v cargo >/dev/null || { echo "Rust is required" >&2; exit 1; }
command -v npm >/dev/null || { echo "Node.js and npm are required" >&2; exit 1; }

npm ci
npm ci --prefix frontend
VITE_API_URL="${VITE_API_URL:-https://api.safe-node.app}" npm run tauri:build

echo "Desktop bundles: src-tauri/target/release/bundle/"
echo "These are preview artifacts until the passkey browser-handoff release gate passes."
