---
name: carc-verify
description: "Full regression check for the CARC dashboard (c:\carc): frontend unit tests, a real headless-browser pass over index.html driven by real clicks (not window/state reads, which are unreliable in this environment), and the backend's smoke/e2e/dr-drill suites. Use after any change to index.html, the app/*.js, communication/*.js, config/*.js, data/*.js, persona/*.js, schemas/*.js modules, or runtime/. Triggers on: verify CARC, run CARC tests, check the dashboard still works, regression test, did I break anything."
---

# carc-verify

Runs the same three-layer verification pass used throughout this project's
history — unit tests, live browser, backend — instead of re-deriving it from
scratch or reasoning from working directory contents. Layer 2 exists because
[[feedback_frontend_verification_doctrine]]: HTTP/parse checks aren't enough,
the page has to actually be driven in a browser.

## 1. Frontend unit tests

```bash
cd c:/carc && node tests/run.js
```

Zero-dependency `vm`-based runner (same `assert()`-counter style as
`runtime/scripts/e2e.js`). Covers `migrateData()`, `filterSortPaginate()`,
canary/readiness evaluation, ROSTER shape, and chat routing/broadcast logic.
All must pass before moving on.

## 2. Live browser regression

Uses the `browser-automation` skill's `--script` mode with the
`regression.mjs` script that sits beside this file. On this Windows/git-bash
setup, `--script` paths need the `/C:/...` form plus `MSYS_NO_PATHCONV=1`
(see [[reference_browser_automation_windows_script_path]] for why):

```bash
MSYS_NO_PATHCONV=1 node "C:\Users\sdtho\.claude\skills\browser-automation\browser.mjs" \
  "file:///C:/carc/index.html" \
  --script "/C:/carc/.claude/skills/carc-verify/regression.mjs" \
  --timeout 45000
```

This drives all 7 routes, participant search, targeted + multi-target chat,
chat search, the broadcast approval gate (a native `confirm()` dialog, both
decline and accept paths — a different Playwright mechanism, `page.on('dialog')`,
than the custom `#modalOverlay` handling used for the roll-call button), roll
call, and confirms Governance/Admin render with no backend reachable — using
only real clicks and DOM reads
(`.innerHTML`/`.getAttribute`/`.count`/`page.title()`), never
`page.evaluate()` reads of app globals or `location.hash =` assignment. Both
are unreliable here: `page.evaluate()` runs in an isolated JS world that
never sees the main page's `window`, so `typeof window.DATA` etc. reads back
`undefined` even when the app is working correctly, and uncaught script
errors don't reliably surface via `page.on('pageerror')` either. A prior run
of this exact confusion cost a long debugging session before being pinned
down — don't reintroduce evaluate()-based app-state checks into
`regression.mjs` without re-reading this warning.

Read the script's PASS/FAIL output directly — a FAIL here on the initial
participants-grid-renders-on-load check is the signature of the specific
load-order bug this project hit once already (a `communication/*.js`
function called synchronously by `app/persistence.js`'s `DATA` bootstrap,
loading after the file that needs it — check `<script src>` order in
`index.html` first if this fails).

Also confirm manually that `file:///C:/carc/index.html` opens with **no
server running** — that's the one behavior this whole app must never break.

## 3. Backend regression

Only needed if `runtime/` changed, but cheap enough to always run:

```bash
cd c:/carc/runtime && npm run smoke && npm run e2e && node scripts/dr-drill.js
```

## Reporting

Summarize pass/fail per layer. If layer 2 fails, don't guess — the isolated-
world quirk above means you can't trust a quick `page.evaluate()` diagnostic;
bisect with real DOM-visible probes (e.g. a temporary `document.title`
marker) the way this bug was originally found, and check `<script src>`
order in `index.html` before anything else.
