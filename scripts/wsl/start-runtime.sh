#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/runtime"
if [ ! -d node_modules ]; then
  echo "runtime/node_modules is missing. Run scripts/wsl/setup-wsl.sh first." >&2
  exit 1
fi
exec npm start
