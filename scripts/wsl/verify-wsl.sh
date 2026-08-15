#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "== CARC WSL verification =="
printf "Node: "; node -v
printf "npm:  "; npm -v
printf "Python: "; python3 --version

printf "\nFrontend/unit suite:\n"
npm test

printf "\nVersion markers:\n"
grep -n "CARC v3.28.0" index.html | head -3
grep -n "d.schemaVersion = 22" schemas/migrate.js | tail -3 || true

printf "\nHelp Desk markers:\n"
grep -n "page-helpdesk\|app/pages/helpdesk.js" index.html
grep -n "d.helpDesk\|Governed Help Desk" schemas/migrate.js | tail -5

printf "\nCanonical cutover markers:\n"
grep -n "canonical participant cutover\|currentCanonicalParticipants" schemas/migrate.js communication/roll-call.js | head -10

printf "\nTask/Handoff Ledger markers:\n"
grep -n "d.tasks\|d.handoffs\|Task & Handoff Ledger" schemas/migrate.js | head -5

printf "\nRuntime dependencies:\n"
if [ -d runtime/node_modules ]; then
  (cd runtime && npm run smoke)
else
  echo "SKIP: runtime/node_modules not installed in this WSL tree yet."
fi
