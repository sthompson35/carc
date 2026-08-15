#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${CARC_FRONTEND_PORT:-8080}"
cd "$ROOT"
echo "CARC frontend: http://localhost:${PORT}/index.html"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
