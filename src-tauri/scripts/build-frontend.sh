#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export VITE_DESKTOP_BUILD=true
export VITE_API_URL="${VITE_API_URL:-https://api.safe-node.app}"

cd "$PROJECT_ROOT/frontend"
npm run build
