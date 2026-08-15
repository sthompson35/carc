# CARC v3.26.1 — WSL Build & Run

This tree is prepared for WSL/Linux. Do **not** copy `runtime/node_modules` from Windows into WSL: `better-sqlite3` is a native module and must be installed/compiled for Linux.

## Recommended location

Keep the active project inside the WSL filesystem for faster file I/O:

```bash
mkdir -p ~/projects
cp -a /mnt/c/carc ~/projects/carc
cd ~/projects/carc
```

If you extracted the supplied WSL package directly, just `cd` into its `carc` directory.

## Prerequisites

```bash
sudo apt update
sudo apt install -y python3 build-essential make g++
```

Install Node.js 18+ (Node 20 or 22 recommended).

## One-time setup

```bash
chmod +x scripts/wsl/*.sh
./scripts/wsl/setup-wsl.sh
```

The setup script:
1. verifies Node/npm;
2. runs the frontend/unit suite;
3. removes any non-Linux runtime `node_modules`;
4. runs `npm ci` inside `runtime/` so `better-sqlite3` is Linux-native;
5. creates `.env` from `.env.example` if needed;
6. runs the runtime smoke test.

## Start CARC

Frontend only:

```bash
./scripts/wsl/start-frontend.sh
```

Open from Windows:

```text
http://localhost:8080/index.html
```

Runtime only:

```bash
./scripts/wsl/start-runtime.sh
```

Both:

```bash
./scripts/wsl/start-all.sh
```

## Verify

```bash
./scripts/wsl/verify-wsl.sh
```

Expected frontend/unit result for this release:

```text
149 passed, 0 failed
```

## Existing Windows browser state

The browser screenshots showed an old persisted v19/132-row state. v3.26.1/schema 20 includes canonical cutover logic to reconcile duplicate legacy rows into the 66 canonical identities while preserving references/history. After opening the new build, allow migration to complete, then verify Admin/Governance report schema 20 and canonical roll calls use 66 participants.

## Runtime endpoint

After `runtime/npm run setup`, configure the endpoint URL/token in CARC Governance. When WSL runtime is on port 3001, Windows browsers can normally reach:

```text
http://localhost:3001/
```

Runtime verification remains evidence-dependent. Local frontend execution does not make a member `RUNTIME_VERIFIED` or `PRODUCTION_VERIFIED`.
