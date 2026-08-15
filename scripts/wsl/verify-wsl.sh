#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "== CARC WSL verification =="
printf "Node: "; node -v
printf "npm:  "; npm -v
printf "Python: "; python3 --version

echo "\nFrontend/unit suite:"
npm test

echo "\nVersion markers:"
grep -n "CARC v3.26.1" index.html | head -3
grep -n "schemaVersion = 20\|schemaVersion = 20\|schemaVersion.*20" schemas/migrate.js | tail -3 || true

echo "\nCanonical cutover markers:"
grep -n "canonical participant cutover\|currentCanonicalParticipants" schemas/migrate.js communication/roll-call.js | head -10

echo "\nRuntime dependencies:"
if [ -d runtime/node_modules ]; then
  (cd runtime && npm run smoke)
else
  echo "SKIP: runtime/node_modules not installed in this WSL tree yet."
fi
