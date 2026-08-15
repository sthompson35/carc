#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "== CARC WSL setup =="
echo "Project: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required (>=18). Install Node 20/22 in WSL first." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js >=18 required; found $(node -v)" >&2
  exit 1
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

# Root has no external dependencies; this validates the frontend logic immediately.
echo "\n[1/4] Running CARC frontend/unit tests..."
npm test

# Native dependencies must be built inside WSL, never copied from Windows.
echo "\n[2/4] Preparing runtime dependencies for Linux/WSL..."
cd "$ROOT/runtime"
rm -rf node_modules
if npm ci; then
  echo "Runtime dependencies installed."
else
  echo "WARNING: npm ci failed (usually network/build-tool availability)." >&2
  echo "Run again after network is available. For better-sqlite3 you may need:" >&2
  echo "  sudo apt update && sudo apt install -y build-essential python3 make g++" >&2
  exit 2
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created runtime/.env from .env.example"
fi

echo "\n[3/4] Running runtime smoke test..."
npm run smoke

echo "\n[4/4] Setup complete."
echo "Start frontend: $ROOT/scripts/wsl/start-frontend.sh"
echo "Start runtime:  $ROOT/scripts/wsl/start-runtime.sh"
echo "Start both:     $ROOT/scripts/wsl/start-all.sh"
