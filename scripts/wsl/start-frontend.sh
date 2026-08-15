#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${CARC_FRONTEND_PORT:-8080}"
cd "$ROOT"

if python3 - "$PORT" <<'PY'
import socket, sys
port = int(sys.argv[1])
with socket.socket() as sock:
    sock.settimeout(0.25)
    raise SystemExit(0 if sock.connect_ex(('127.0.0.1', port)) == 0 else 1)
PY
then
  if curl -fsS --max-time 2 "http://localhost:${PORT}/index.html" 2>/dev/null | grep -q "Council Agent Roll Call"; then
    echo "CARC frontend is already running: http://localhost:${PORT}/index.html"
    echo "No duplicate server was started. Use Ctrl+Shift+R in the browser after an update."
    exit 0
  fi
  echo "ERROR: Port ${PORT} is already used by another service." >&2
  echo "Inspect it with: ss -ltnp 'sport = :${PORT}'" >&2
  echo "Or choose another port: CARC_FRONTEND_PORT=$((PORT + 1)) npm run wsl:frontend" >&2
  exit 98
fi

echo "Starting CARC frontend: http://localhost:${PORT}/index.html"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
