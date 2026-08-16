#!/usr/bin/env bash
set -euo pipefail

# Runs the runtime backend's smoke + e2e suites natively inside WSL, in a Linux-native copy
# outside /mnt/c — never against the Windows-mounted runtime/node_modules directly.
#
# Why: better-sqlite3 compiles a real native .node binary. runtime/node_modules lives under
# /mnt/c, shared byte-for-byte between Windows and WSL — rebuilding it for one OS breaks it
# for the other (this is exactly the ABI-mismatch/"port mystery" this project already hit
# once on the Windows side). setup-wsl.sh's `rm -rf node_modules && npm ci` accepts that
# tradeoff for someone committing to WSL-only use; this script doesn't, so a WSL verification
# run never costs you a "npm rebuild better-sqlite3" the next time you start the Windows side.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE="${CARC_WSL_VERIFY_DIR:-$HOME/.cache/carc-runtime-verify}"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required (>=18) inside WSL." >&2
  exit 1
fi

echo "== CARC runtime WSL verification =="
echo "Source: $ROOT/runtime (untouched)"
echo "Stage:  $STAGE (WSL-native filesystem, rebuilt fresh each run)"

rm -rf "$STAGE"
mkdir -p "$STAGE"
# Exclude node_modules/data/.env/*.db* — all rebuilt or regenerated fresh in the stage.
rsync -a --exclude 'node_modules' --exclude 'data' --exclude '.env' --exclude '*.db*' \
  "$ROOT/runtime/" "$STAGE/"

cd "$STAGE"
echo "\n[1/3] Installing dependencies (compiling better-sqlite3 for Linux)..."
if ! npm install; then
  echo "ERROR: npm install failed. For better-sqlite3 you may need:" >&2
  echo "  sudo apt update && sudo apt install -y build-essential python3 make g++" >&2
  exit 2
fi

cp .env.example .env

echo "\n[2/3] Running smoke tests..."
npm run smoke

echo "\n[3/3] Running e2e tests..."
npm run e2e

echo "\nWSL verification complete. Windows-side $ROOT/runtime/node_modules was never touched."
