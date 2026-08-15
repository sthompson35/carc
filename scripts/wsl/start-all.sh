#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_PORT="${CARC_FRONTEND_PORT:-8080}"

cleanup() {
  jobs -pr | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$ROOT/scripts/wsl/start-runtime.sh" &
RUNTIME_PID=$!
"$ROOT/scripts/wsl/start-frontend.sh" &
FRONTEND_PID=$!

echo ""
echo "CARC is starting in WSL"
echo "Frontend: http://localhost:${FRONTEND_PORT}/index.html"
echo "Runtime:  see runtime/.env for PORT (project default commonly 3001)"
echo "Press Ctrl+C to stop both."

wait -n "$RUNTIME_PID" "$FRONTEND_PID"
