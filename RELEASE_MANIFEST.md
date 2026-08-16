# CARC Release Manifest

This file is the single source of truth for "what version is this repo, right now." It
exists because this project has repeatedly received external zips/patches whose own
filenames, internal version strings, and even accompanying "audit" messages claimed
things about their own legitimacy and content that turned out to be wrong on inspection
— sometimes by a little (a stale version number), sometimes by a lot (a fully diverged
branch, or files proven to be downloaded from the internet despite being described as
"created during this project"). See `README.md`'s Changelog and `_archive/README.md` for
the full incident history.

## Policy

**This repository's own committed state is always the source of truth.** Any external
zip, patch, or package — regardless of what its filename, internal comments, or an
accompanying message claims — is verified before being trusted, every time:

1. Extract to a scratch directory. Never extract directly into the working tree.
2. Diff every touched file against the live repo before changing anything.
3. Check for `Zone.Identifier` sidecars (Windows marks internet-downloaded files this
   way) — a claim like "created during this project" is a claim to verify, not accept.
4. Reconcile file-by-file: adopt what's genuinely new and non-conflicting, reject what
   collides with decisions already made here, take the next free schema-version slot for
   anything real rather than adopting a package's own numbering.
5. Archive the original source under `_archive/`, never delete it — so the disposition is
   always reversible if it turns out to be wrong.
6. Re-run the full three-layer verification (below) before committing.

## Current state

- **Tag**: `v3.32.3`
- **Schema version**: 29 (`schemas/migrate.js`, `d.schemaVersion`)
- **`governance.release`**: `CARC v3.32.0 — Structured Training Evidence Workflow`
- **Frontend**: classic `<script src>` modules, no build step, works fully at
  `file:///C:/carc/index.html` with zero server running — the one invariant this whole
  app must never break (verified every release).
- **Backend**: Express + better-sqlite3 at `runtime/`, optional — the frontend never
  requires it to load or function, only to sync/verify.

## Verification, every release

1. `node tests/run.js` — frontend unit tests (pure logic, `vm`-sandboxed, no DOM/network).
2. Live browser regression: `.claude/skills/carc-verify/regression.mjs`, run against both
   `file:///C:/carc/index.html` (must stay zero-server-required) and, since v3.33.0, the
   hardened `http://127.0.0.1:<port>/dashboard/` path.
3. `runtime`: `npm run smoke` and `npm run e2e` — real HTTP round-trips against an
   ephemeral-port server instance, torn down after.
4. Since v3.33.0: `npm run wsl:verify-runtime` (or `bash scripts/wsl/verify-runtime.sh`)
   — runs smoke/e2e natively inside WSL, in an isolated Linux-native copy so the
   Windows-side `runtime/node_modules` (a compiled native binary) is never touched.

## v3.33.0 — Runtime Hardening & Durable Evidence

Ten engineering priorities, layered on top of the `v3.32.3` reconciliation:

- **Durable SQLite evidence** (scoped, not a wholesale architecture change — every
  existing sync stays additive-push, `localStorage` stays authoritative, `file://` with
  zero backend keeps working exactly as before): new `knowledge_path_events` table +
  `syncKnowledgePathHistoryToRuntime`, syncing every per-stage evidence event
  (`p.knowledgePath.stages[].history[]`, added in the `v3.32.3` reconciliation) to durable
  storage with no retention cap, unlike the local 100-per-stage cap. Extended the existing
  `command_audit_events` table (rather than building a parallel, redundant table) with 6
  new columns — `batch_id`, `service_member_id`, `execution_id`, `verifier_id`,
  `signature`, `outcome` — so the richer verification-batch and pilot-ticket evidence
  `addLog()` already captures actually reaches durable storage instead of being dropped
  at sync time.
- **This manifest.**
- **Loopback bind + CORS allowlist**: `HOST` now defaults to `127.0.0.1` (was `0.0.0.0`).
  `CORS_ORIGIN` now defaults to an explicit allowlist (`http://127.0.0.1:8080,
  http://localhost:8080`) instead of `*` — a browser tab on any website can still reach a
  loopback server, so `*` let any of them read the response even on a purely local
  install. A `file://`-opened dashboard can no longer reach the runtime backend directly
  (no `Origin` match); the new `/dashboard/` HTTP path (below) is the way to get full
  backend connectivity, same-origin.
- **Bearer token → `sessionStorage`**: was persistent `localStorage` (survived browser
  restarts indefinitely); now cleared when the tab closes.
- **Helmet/CSP**: `script-src 'self'` with no `'unsafe-inline'` (index.html has zero
  inline `<script>`/`on*` handlers — verified, not assumed). `style-src` does need
  `'unsafe-inline'` — the dashboard uses real inline `style=""` for dynamic progress bars
  etc. `frame-ancestors 'none'`, `object-src 'none'`, standard hardening headers.
- **Compression + static frontend serving**: `runtime/server.js` now also serves the main
  dashboard at `/dashboard/` (not `/` — that path was already a real, tested API-identity
  endpoint; `smoke.js` asserts `GET /` returns JSON) with gzip compression. `file://`
  remains a fully-supported, always-tested fallback — this is an additional, hardened way
  to open CARC, not a replacement.
- **Browser test coverage**: `regression.mjs` extended with the one genuinely-missing
  area — Agent Chat text commands (`assign task ... to @X`, `hand off task ... to @X`)
  routed through `chat-router.js`'s parser, including the real `confirm()` approval gate
  for hand-offs. Page load, Governance, Help Desk, and evidence submission were already
  covered.
- **WSL-native smoke/e2e**: `scripts/wsl/verify-runtime.sh` — see Verification above.
- **Benchmark**: `runtime/scripts/benchmark.js` (`npm run benchmark`), real concurrent
  HTTP load at batch sizes 1, 10, 66 (66 = the actual canonical roster size) against a
  cheap read (`GET /health`) and a real authenticated write
  (`POST /api/knowledge-path/sync`). Baseline captured 2026-08-16 on this machine:

  | Endpoint | n | ok | rate-limited (429) | p50 | p95 | max |
  |---|---:|---:|---:|---:|---:|---:|
  | GET /health | 1 | 1 | 0 | 7.8ms | 7.8ms | 7.8ms |
  | GET /health | 10 | 10 | 0 | 7.1ms | 7.1ms | 7.1ms |
  | GET /health | 66 | 49 | 17 | 22.0ms | 22.6ms | 22.6ms |
  | POST /api/knowledge-path/sync | 1 | 1 | 0 | 7.6ms | 7.6ms | 7.6ms |
  | POST /api/knowledge-path/sync | 10 | 10 | 0 | 8.2ms | 8.2ms | 8.2ms |
  | POST /api/knowledge-path/sync | 66 | 49 | 17 | 36.0ms | 36.1ms | 36.1ms |

  The n=66 rate-limiting isn't a bug — it's the existing 60-req/min limiter correctly
  protecting the API from abuse, and it's exactly *why* the real roster-wide
  individual-verification feature (`runAndSubmitAllIndividualCanaries`) runs its 66
  requests sequentially with a 1.1s delay between each rather than firing them
  concurrently. This benchmark run empirically confirms that design choice was necessary,
  not just cautious.

Verified: 267/267 frontend unit tests, live browser regression clean on both `file://`
and the new `/dashboard/` path (zero console errors either way), backend smoke (14/14)
and e2e (89/89) — both on Windows and, separately, natively inside WSL.
