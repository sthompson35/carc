# CARC — Council Agent Roll Call

A standalone, single-file admin dashboard for managing AI agent / council
participants, conversations, and automated roll calls. No build step, no
dependencies, no backend — open `index.html` in a browser and it runs.

> **Note:** the old `index.pre_v3.15.0_backup.html` v3.14.0 snapshot has been
> moved to `_archive/` (no longer needed for diffing against the pre-canary
> baseline).

## What it is

CARC tracks the "roll call" of a group of participants — a mix of AI agents,
council members, human users, and (as of v3.1.0) a canonical roster of
bots/troopers/assistants — across conversations, and includes a lightweight
autonomous agent that runs roll calls on a schedule and can answer questions
about the live data.

## Changelog

**Project note (no `index.html` version bump — the app's code did not
change)** — Full project scan beyond the single HTML file. Found and
verified two things that had never been examined before:
- **`runtime/pdfs/` and `runtime/excel/`** — the source documents behind the
  earlier roster-reconciliation report. Read directly (via `pdftotext`,
  since the PDF page-renderer wasn't installed): all three PDFs and the
  Excel workbook consistently self-report as unapproved drafts (`DESIGN
  BASELINE`, `RECONSTRUCTED — NOT APPROVED`, `Source Authenticity: NOT
  ESTABLISHED`). Confirmed directly, not secondhand: the Roster PDF contains
  zero occurrences of "Service Member ID," "Callsign ID," or "Agent ID" —
  this app's canonical IDs are synthesized locally, not sourced from the
  PDF. The Manual PDF's Trooper-audit doctrine (`MISSING ROLE`, `DUPLICATE
  ROLE`, `AUTHORITY CONFLICT`, etc., and "do not list a member as
  operational when readiness is unknown") matches verbatim what the earlier
  report quoted — that report's citations were accurate even though its
  origin (an upload this session never received) couldn't be verified. The
  Excel is a separate institutional governance-artifact tracker (37
  policy/brand/curriculum documents), not roster data — out of CARC's scope,
  not imported.
- **`runtime/`** — a complete, previously unexamined Express + SQLite
  backend explicitly built as *"Governed external runtime endpoint for CARC
  v3.16.0+ canary verification."* Audited the full source (server, db,
  auth/validate middleware, health/verify/api routes, setup/token scripts) —
  clean, no bugs found, `npm run smoke` passes all checks. Its request
  payload/validation contract matches CARC's `submitForExternalVerification()`
  exactly (`source: 'CARC_LOCAL_CANARY'`, `authorization: 'PASS'`,
  `executionResult: 'LOCAL_CANARY_COMPLETE'`) — this was correctly
  hand-built for CARC from the start, just never connected. Started it,
  generated a bearer token, configured it in Governance → Configure
  Endpoint, and ran a real end-to-end test: `Test Connection` → `CONNECTED`,
  then a live canary run against `@VEX` submitted for verification came back
  genuinely `runtimeVerified: true` — the first non-simulated, non-local
  verification in this project's history. See the new **External Runtime
  (optional)** section above for setup/run instructions.

**v3.22.0** — Individual Readiness & Production Verification Reconciliation
(schema 16). Prompted by a reconciliation report claiming analysis of an
`AI Training Academy Roster.pdf` — no such file was ever uploaded to this
session, so its source claims (30 AI Service Members / 36 Troopers, per-field
provenance, etc.) could not be independently verified. However, its numeric
roster split checks out exactly against the live data already in this app
(`ASSISTANT/AI BOT` + `AI BOT` = 30, `TROOPER` + `AI AGENT` = 36, both
totaling the existing 66), and its core technical claim was independently
confirmed true by reading the code: individual participant readiness was
being derived from the global governance gate alone, not from any real
per-identity evidence. That's a genuine, serious bug, fixed here regardless
of the report's unverifiable origin:
- **The bug**: `reconcileProductionState()` ran
  `p.readiness = gate.complete ? 'PRODUCTION_VERIFIED' : 'MISSION_READY'` for
  every canonical participant. The moment the *system-wide* governance gate
  completed (6 abstract requirement categories, satisfiable via evidence text
  plus **one** canary run for **one** identity), all 66 identities would
  instantly and falsely inherit `PRODUCTION_VERIFIED` — 65 of them with zero
  individual runtime evidence. This is the same class of self-attestation gap
  v3.18.0 closed at the system level, just reappearing at the individual
  level.
- **The fix**: added `evaluateIndividualReadiness()` (an identity reaches
  `MISSION_READY` only via real structural evidence — canonical identity
  complete, mission profile present, active status, registry integrity valid
  — reusing the same criteria the canary authorization check already
  enforces) and `hasVerifiedCanaryExecutionFor()` (an identity reaches
  `PRODUCTION_VERIFIED` only if it individually has a runtime-verified canary
  execution on record, **and** the global gate is complete). The global gate
  decision itself (PASS/HOLD) remains legitimately shared — there is only one
  system-wide gate — but the production-verification *claim* is now always
  per-identity.
- **New default**: rostered participants now start at `READINESS_UNKNOWN`
  rather than assuming `MISSION_READY` — a rostered identity is not
  automatically ready. Schema-16 migration recomputes every existing
  participant's readiness with the corrected logic (migration-safe: computed
  from the local data being migrated, never the global `DATA`, to avoid
  reintroducing the v3.19.0 crash).
- **Role Overlap Audit** added to the Admin Tools collision checker —
  flags participants sharing the exact same role, alongside the existing
  callsign/ID collision checks.
- Added `READINESS_UNKNOWN` to the Participants readiness filter.
- Verified live: all 7 pages render with zero console errors; a fresh Roll
  Call now correctly reports `Status: MISSION_READY. Production
  Verification: NOT_RUNTIME_VERIFIED. Gate Decision: HOLD.` for every
  identity (no fabricated verification); an isolated reproduction of the old
  vs. new logic confirms that when the global gate completes with only one
  identity individually verified, the old code would have marked all 66
  `PRODUCTION_VERIFIED` while the new code correctly marks exactly 1
  `PRODUCTION_VERIFIED` and 65 `MISSION_READY`.

**v3.21.1** — Full-project audit: found and fixed the codebase's "hidden
pieces" — computed data that was silently going nowhere:
- **`productionReason` was write-only** — `reconcileProductionState()` set
  `DATA.governance.productionReason` on every recompute (e.g.
  `RUNTIME_EVIDENCE_AND_INDEPENDENT_VERIFICATION_REQUIRED`), explaining
  exactly *why* the production gate is on HOLD, but nothing ever read it —
  the Governance page just showed `HOLD` with no reason. It's now appended
  (humanized) to the existing gate summary line under the Production
  Verification Gate panel.
- **`canonicalRosterExpected` (66) was set but never used** — the "Canonical
  Identities" KPI tile and the Registry Integrity panel both hardcoded the
  literal number `66` separately instead of reading this field, so the two
  would silently disagree if the expected roster size ever changed. Both now
  read `DATA.governance.canonicalRosterExpected`, and the KPI tile shows
  `controlled/expected` (e.g. "66/66") instead of just the raw count.
- **Removed `hoursAgo()`** — a dead helper function, defined but never
  called anywhere in the file.
- Audited the whole file for other classes of hidden defects — missing
  `getElementById` targets, duplicate HTML ids, orphaned CSS classes,
  un-wired `wire*Page()` calls, stub/TODO markers, permanently-disabled
  controls, localStorage key drift — all came back clean; this pass found
  exactly what's listed above, nothing more.
- Verified live: all 7 pages render with zero console errors; the Governance
  page now visibly shows "66/66" on the Canonical Identities tile and the
  registry panel, and the gate summary line reads "...Registry PASS ·
  Runtime evidence and independent verification required."

**v3.21.0** — "Add all tools": three tool surfaces added across the app —
Admin Tools panel, global toolbar, and Agent Chat command router:
- **Admin → 🧰 Tools panel** (5 new utilities):
  - **Canonical ID Lookup** — search any Service Member ID, Callsign ID,
    Agent ID, callsign, or legacy alias and see the full identity record.
  - **Duplicate/Collision Checker** — scans all 66 canonical identities for
    duplicate callsigns, Service Member IDs, Callsign IDs, or Agent IDs.
  - **Bulk Department Find & Replace** — rename a department across every
    matching participant in one confirmed action.
  - **Storage Cleanup** — lists every `carc_`-prefixed `localStorage` key
    with its size (including stale migration-failure backups from earlier
    crash recovery) and lets you delete orphaned ones; the main data key is
    always protected from deletion here — use Danger Zone → Reset for that.
  - **Backup Diff** — compare a JSON backup file against current data
    (added/removed/changed counts per collection) without importing it.
- **Global toolbar** — added 👤 **Add Person** (previously only reachable
  from the Dashboard's Quick Actions or the Participants page) and 🔔
  **Alerts**, both now available from every page. Alerts opens the same
  "Needs Attention" items shown on the Dashboard (logic extracted into a
  shared `computeAttentionItems()` so the two views can't drift apart) and
  shows a small red dot on the toolbar icon whenever there's anything
  unresolved.
- **Agent Chat command router — new action commands**: the router could
  previously only answer questions; it can now execute commands:
  `"@CALLSIGN mark present/absent"`, `"create conversation: <title>"`,
  `"set alert threshold to N"`, `"pause/resume auto mode"`, `"export data"`,
  `"export participants"`. Conversation creation was extracted into a shared
  `createConversation()` helper so the chat command and the New Conversation
  modal can't drift apart either.
- Verified live: all 7 pages still render cleanly with zero console errors;
  every new Admin tool tested individually (ID lookup resolves real records,
  collision checker correctly reports zero collisions on the clean roster,
  bulk replace validates empty/no-match inputs correctly, storage scan lists
  real keys, backup diff correctly rejects malformed JSON and reports 0/0/0
  on a genuine self-diff); every new chat command tested and confirmed to
  mutate the right data without disturbing existing Q&A routing.

**v3.20.1** — Fixed and configured the Agent Chat command router (the
"Canonical command router · identity-aware · mission-aware" panel):
- **Routing precedence bug** — `findChatTarget()` only special-cased an
  explicit single-identity target selection; selecting **ALL · broadcast to
  active roster** and then typing a message that happened to contain an
  `@callsign` (e.g. `"@VEX are you all set for today?"`) fell through to the
  text-scanning branch and silently hijacked the broadcast into a private
  reply to that one identity — the explicit ALL selection was being ignored.
  `findChatTarget()` now returns `null` immediately when `ALL` is selected,
  so the broadcast path is always honored regardless of message content.
- **Over-broad "identity-aware" matching** — the identity-question detector
  was `/id|identity/.test(q)`, an unanchored substring match: any message
  containing "id" anywhere ("provide", "consider", "avoid", "video", "guide")
  was misrouted to the identity-disclosure response instead of a real
  answer. Same defect in the tasks detector (`/task|...|work/` matched
  "network", "framework", etc.). Both now use word-boundary regexes
  (`/\bidentity\b|\bid\b/`, `/\btask(s)?\b|...|\bwork\b/`) so only the actual
  word triggers the response.
- **Configured target persistence** — the AUTO/ALL/@callsign target selector
  previously reset to AUTO on every page load with no way to keep a chosen
  routing target. It's now saved to `DATA.agent.chatTarget` and restored on
  load (falling back to AUTO if the saved identity no longer exists).
- Verified live: selecting ALL and sending a message containing `@VEX` now
  correctly produces a roster-wide broadcast (roll call count increments,
  reply confirms "Broadcast routed to ALL active canonical identities");
  "provide an update" and "how is the network" no longer trigger the
  identity/tasks responses while "what is your identity" and "what are your
  tasks" still do; all 7 pages still render cleanly with zero console errors.

**v3.20.0** — New Admin page (7th nav route), replacing the old Settings modal:
- **System Overview** — clickable KPI tiles (participants, conversations, roll
  calls run, governance gate progress, log event count, schema version), each
  routing to the relevant page.
- **Preferences** — dark theme and agent auto-mode toggles (moved here from
  the old ⚙️ Settings modal, which is now retired), a new **default rows per
  page** setting (`DATA.settings.defaultPageSize`, persisted), and the
  low-attendance alert threshold (previously only editable on the Agent
  page — same field, now also editable here).
- **Participant Types & Roles Registry** — a live table of every participant
  `type` with its count and the distinct departments using it.
- **Data Management** — storage size, participant/conversation counts,
  registry integrity, production state, and schema version at a glance, plus
  one-click full JSON backup export/import and a Participants CSV shortcut
  (all reusing the existing export/import engine — nothing new to trust).
- **Activity / Audit Log** — the Dashboard's small 20-row activity widget is
  now backed by a full searchable, sortable, paginated table with CSV export.
  This required adding a real `at` (ISO timestamp) field to activity log
  entries — the existing `time` field was HH:MM:SS only, with no date, which
  would have sorted incorrectly across multiple days. A schema-15 migration
  backfills `at` on existing entries.
- **Danger Zone** — clear activity log, clear roll call history, delete all
  conversations, and reset to canonical baseline (moved from the old Settings
  modal, and fixed to run the reset dataset through `migrateData()` — the old
  modal's reset skipped migration entirely and could leave the app on a
  schema below current).
- **Fixed a real keyboard-shortcut bug found while wiring this up**: the
  number-key page-jump handler was hardcoded to `/^[1-5]$/`, so pressing `6`
  never navigated to Analytics even though the Settings modal's own
  documentation claimed "Jump to page 1–6." Replaced with a range derived
  from `ROUTES.length` so it can't drift out of sync again as pages are
  added.
- Verified live: all 7 pages navigate and render with real data and zero
  console errors; preference changes persist to `localStorage`; a full Roll
  Call still completes cleanly post-migration (schema 15, `settings` present,
  every activity log entry carries `at`).

**v3.19.1** — Roll Call responses no longer read as boilerplate:
- **Individualized responses** — `rollCallResponseFor()` previously produced
  a response that only varied by callsign and role title; the operational
  status, verification, and gate fields are legitimately identical for every
  identity (they reflect one shared, honest production gate — not per-agent
  claims), but with nothing else varying, all 66 responses in a roll call
  read as the same templated sentence copy-pasted 66 times.
- Each response now also surfaces the participant's real `dept` (command)
  and the first duty from their actual `missionProfile` (`"Current focus:
  ..."`) — data that already existed per-participant but was never
  surfaced in the chat text. Nothing was fabricated: the three confirmed
  profiles (GRANT/SALLY/MAPE) show their specific duties, and the other 63
  role-derived profiles show their role-substituted duty text.
- Verified live: running a full Roll Call now produces 66/66 distinct
  "Current focus" clauses (previously 0 varying fields beyond name/role),
  with zero console errors.

**v3.19.0** — Critical fix: app failed to start for any returning user who had
ever run Roll Call:
- **Root cause** — `DATA = migrateData(loadData());` ran with no error
  handling around `migrateData()` itself. Two of its migration steps
  (schema `< 9` and `< 10`) reconcile broadcast-style conversations via
  `reconcileLocalBroadcastConversation()` → `buildParticipantResponses()` →
  `rollCallResponseFor()` → `canonicalStatusFields()`, which calls
  `governanceGateState()`. That function read `DATA.governance` and
  `DATA.participants` off the **global** `DATA` variable — but at that exact
  point in script execution, `DATA` is still `undefined`, because
  `migrateData()` is itself part of the expression that assigns `DATA`. Any
  stored conversation containing a broadcast-triggering message (e.g. the
  literal Roll Call seed text, "Say hello everyone!") threw a `TypeError`
  during migration, before `init()`/`wireChrome()` ever ran — which is why
  nothing was wired up: no nav, no buttons, no data, on every subsequent
  load for anyone who had ever run a roll call.
- **Fix** — `governanceGateState()` and `reconcileProductionState()` now
  guard against `DATA` not being ready yet and return a safe empty/default
  result instead of throwing. Additionally, `DATA` initialization is now
  wrapped in a `try/catch`: if migration fails for any reason, the
  unmigratable data is backed up to a timestamped `localStorage` key
  (`carc_dashboard_v3_migration_failed_backup_<timestamp>`) so nothing is
  silently lost, and the app falls back to a fresh default dataset instead
  of a blank, dead page.
- Verified via an isolated reproduction of the exact crash (confirms the old
  code throws `TypeError: Cannot read properties of undefined (reading
  'governance')` and the fixed code returns a safe fallback instead), a
  direct read of the live file confirming both guards are in place and
  syntactically valid, and a full live-browser pass clicking through all six
  pages plus a real Roll Call run with zero console errors and zero failed
  requests.

**v3.18.0** — System-Managed Independent Verification & Registry Sweep:
- **Closed a self-attestation gap** — the "Independent Verification" production
  requirement could previously be flipped to `VERIFIED` by typing any text into
  the evidence form, with no actual connection to whether a real canary or
  external verifier had ever run. It is now **system-managed**: it can only
  reach `VERIFIED` when `submitForExternalVerification()` receives a genuine
  `verified: true` response from the configured external endpoint
  (`syncIndependentVerificationRequirement()`), and a rejected/absent
  verification keeps it at `PENDING` regardless of prior state. The evidence
  modal for this requirement is now a read-only explainer instead of an
  editable form; the requirements list shows a 🔒 and "View (System-Managed)"
  instead of "Record Evidence."
- **Registry Canary Sweep** — a **🧪 Run Full Sweep (66)** button runs the
  authorization check (identity resolution + canonical ID completeness +
  mission profile + registry integrity) across all 66 canonical identities in
  one action, without generating 66 full mission executions and evidence
  records. Reports pass/fail counts and lists exactly which identities failed
  and why.
- **Canary Execution History table** — a proper sortable table (Started,
  Target, Result, Runtime Verified, Execution ID) replacing the previous
  view, which only showed the most recent run's summary and a flat mixed
  telemetry log.
- **Dashboard integration** — the Needs Attention panel's governance item now
  shows the actual gate progress (`N/M requirements verified`) computed from
  `governanceGateState()`, instead of a static message that never changed.
- Schema version bumped to 14; fixed the release badge, footer, console
  branding, and JSON export version string, which had drifted out of sync
  with each other (`v3.17.0` / `v3.15.0` / `v3.5.0` all appeared
  simultaneously before this pass) — the release badge is now derived live
  from `DATA.governance.release` so it can't go stale again.

**v3.17.0** — Admin Dashboard & Canary CSV:
- **Open Admin shortcut** — when an External Runtime Endpoint URL is configured on the
  Governance page, a **🌐 Open Admin** link appears inline, opening the runtime admin
  dashboard (`/admin`) in a new tab without leaving CARC.
- **Canary CSV export** — the canary panel now has an **⬇️ Export CSV** button alongside
  the existing JSON export. The CSV contains one row per execution: `executionId`,
  `missionId`, `evidenceId`, `targetServiceMemberId`, `startedAt`, `result`,
  `runtimeVerified`, `independentVerification`.
- Schema version bumped to 13.

**v3.16.0** — External Runtime Endpoint added to the Governance page, closing the
gap identified in v3.15.0 ("cannot be promoted into production evidence until a
real governed external runtime and independent verifier are connected"):
- **External Runtime Endpoint panel** — configure a runtime endpoint URL and
  bearer token. URL is validated via the browser's `URL` constructor; token is
  stored in a separate `localStorage` key (`carc_endpoint_token`) and is never
  included in any evidence export or JSON data export.
- **Test Connection** — sends a `HEAD` request to the configured URL (8 s timeout
  via `AbortController`); records `CONNECTED` or `ERROR` + timestamp in the
  endpoint status row and the Change & Evidence Ledger.
- **Submit for Verification** — POSTs a structured canary evidence payload
  (`executionId`, `evidenceId`, `serviceMemberId`, `capturedAt`, `authorization`,
  `executionResult`) to the endpoint (15 s timeout). On a successful response
  the evidence record is updated to `RUNTIME_VERIFIED`, the canary state
  transitions to `RUNTIME_VERIFIED`, and `reconcileProductionState()` re-evaluates
  the production gate — making a `PASS` possible for the first time. On rejection
  or network error the state remains `BLOCKED` / `PENDING` and the user can retry.
- **External Verification Response panel** — shows the verifier's response fields:
  verification state, verifier ID, verified-at timestamp, execution ID, optional
  signature, and rejection reason.
- **Canary state badge** now renders `RUNTIME_VERIFIED` (green) as a distinct
  state above `CANARY_COMPLETE` (blue) and `BLOCKED` (red). The Runtime
  Verification and Independent Verification rows in the summary table are now
  dynamic (green `RUNTIME_VERIFIED` / grey `NOT_RUNTIME_VERIFIED`).
- **Export Canary** now includes the `externalVerification` record and
  `endpointUrl` in the evidence package; the `warning` field is omitted once
  the canary is `RUNTIME_VERIFIED`.
- Schema version bumped to 12; migration initializes `DATA.governance.endpoint`
  on existing sessions.

**v3.15.0** — Runtime Execution Canary added to the Governance page:
- **Runtime Execution Canary panel** — select any canonical service member, run a
  local canary that resolves their identity, evaluates authorization, executes a
  mission response against the local engine, and captures structured telemetry +
  evidence. A state badge (`NOT_RUN` / `CANARY_COMPLETE` / `BLOCKED`) and a
  summary table (target, authorization, execution result, execution ID,
  runtime/independent verification state) are live-rendered after each run.
- **Canary Telemetry & Evidence panel** — event-by-event log of the canary
  pipeline: `CANARY_RECEIVED`, `IDENTITY_RESOLVED`, `AUTHORIZATION_PASS/FAIL`,
  `MISSION_RESOLVED`, `LOCAL_EXECUTION_COMPLETE`, `EVIDENCE_CAPTURED` — each
  entry carrying a timestamp and execution ID.
- **Run Canary** and **Export Canary** controls. The export produces a JSON
  evidence package containing execution history, telemetry, evidence records,
  production state, and gate decision, plus an explicit `warning` field stating
  that `LOCAL_CANARY_ENGINE` evidence is `NOT_RUNTIME_VERIFIED` and
  not production-eligible without an external governed runtime and independent
  verifier. Each canary run is written automatically to the Change & Evidence
  Ledger.

The constraint is surfaced directly in the UI: the local canary proves the CARC
execution contract works in this browser environment, but it cannot be promoted
into production evidence until a real governed external runtime and an
independent verifier are connected.

**v3.14.0** — Operational Status & Verification Semantics — unified the three-field
canonical status format (`MISSION_READY` · `NOT_RUNTIME_VERIFIED` · `HOLD`) used
everywhere responses, roll-call transcripts, and governance decisions emit status:
- **Canonical status formatter** — `canonicalStatusFields()` / `canonicalStatusSentence()`
  replace the former `PENDING_RUNTIME_EVIDENCE` readiness state throughout; every
  participant response and roll-call entry now carries `operationalStatus`,
  `productionVerification`, and `gateDecision` as first-class fields.
- **Broadcast transcript reconciliation** — a one-time migration (schema v9 → v10)
  walks every stored conversation that contains a `LOCAL_RULE_ENGINE` broadcast
  block, retires stale/duplicate responses, and regenerates exactly one current
  canonical response per active identity per broadcast. Reports removed and
  regenerated counts in the governance ledger.
- **Message count repair** — total message count recalculated from actual
  `messagesList` lengths to fix counters that had drifted from the stored source
  of truth.
- `PENDING_RUNTIME_EVIDENCE` readiness values normalized to `MISSION_READY` on
  migration so no participant is stuck in an undefined transitional state.

**v3.13.0** — Broadcast command routing and mission-aware Agent Chat:
- **Chat target selector** — a dropdown above the chat window lets you route a
  message to `AUTO` (resolve `@callsign` / intent from the text), `ALL` (broadcast
  to every active canonical identity), or a specific service member. A badge next
  to the selector reflects the current route.
- **Mission-aware chat replies** — addressing `@CALLSIGN` now returns a structured
  answer from that identity's mission profile: role, purpose, mission statement,
  duties, recurring tasks, required outputs, operating doctrine, and production rule.
  Broadcast intent classification (`greeting` / `wellbeing` / `status` / `rollcall` /
  `general`) shapes the response prefix.
- **Broadcast auto-responses** — messages containing "everyone", "all agents",
  "all service members", etc. automatically generate one `LOCAL_RULE_ENGINE`
  participant response per active canonical identity, each carrying its canonical
  status fields. Adding a message to a conversation detail also triggers broadcast
  responses where applicable.
- **Roll-call transcripts** — `startRollCall()` now stores a full `messagesList`
  in the generated conversation: one operator message + one `rollCallResponseFor()`
  entry per active identity, so conversations opened from Roll Call History show the
  actual per-participant exchange rather than a message count.
- **Broadcast ID** — `makeBroadcastId()` hashes message + timestamp to a stable
  `bc-…` identifier that deduplicates responses across reconciliation passes.

**v3.12.0** — Mission doctrine surfaced in participant UI:
- **Mission profile detail section** — the participant detail modal gained a
  Mission Doctrine block: Profile Authority (`CONVERSATION_CONFIRMED` /
  `ROLE_DERIVED_WORKING`), Profile Status, Purpose, Mission, Duties, Recurring
  Tasks, Required Outputs, Operating Doctrine principles, and Production Rule.
- **Readiness filter** — Participants grid toolbar gained a Readiness selector
  (`MISSION_READY` / `PRODUCTION_VERIFIED`) to isolate the two production states
  at a glance; filter is persisted with the grid state.
- **Extended search** — participant search now resolves against all mission profile
  fields (purpose, mission text, duties, tasks, outputs) in addition to the
  existing canonical identity fields.
- **Mission profile CSV export** — seven new columns added to the Participants CSV:
  Mission Profile Authority, Purpose, Mission, Duties, Recurring Tasks, Required
  Outputs, and Mission Profile Status.
- **Canonical status info banner** on the Participants page — a persistent header
  strip showing the broadcast registry state: `MISSION_READY` ·
  `NOT_RUNTIME_VERIFIED` · `HOLD`, with the production-verification rule stated in
  full.
- **Working profiles attention item** — Dashboard Needs Attention now flags
  participants whose mission profile has `profileStatus === WORKING_PROFILE_REVIEW_REQUIRED`.

**v3.11.0** — Governance page introduced as a new sixth page:
- **Lifecycle strip** — three-stage progress indicator: `DESIGN_BASELINE`
  (complete) → `MISSION_READY` (current) → `PRODUCTION_VERIFIED` (locked until
  evidence gates pass).
- **Production Verification Gate** — a progress bar and per-requirement card grid
  tracking each named production requirement. Recording evidence requires both an
  evidence reference and an independent verifier; bare status flips to `VERIFIED`
  are rejected. Gate progress unlocks `PRODUCTION_VERIFIED` only when all
  requirements are independently verified and the registry audit passes.
- **Canonical Registry Integrity audit** — `auditCanonicalRegistry()` checks all
  66 controlled identities for missing IDs, format violations (`ATA-*-000` /
  `ATA-SM-*-001`), callsign collisions, and duplicates. Results surface in a
  PASS/FAIL badge with an issue list.
- **Identity Composition** — bar chart of controlled participants by type (Bot,
  Trooper, Assistant, Agent).
- **Change & Evidence Ledger** — append-only log of audit runs, evidence records,
  release markers, and operator notes; every governance action writes an entry
  automatically.
- **Run Integrity Audit** and **Export Evidence** toolbar actions; evidence export
  is a CSV with requirements + ledger.
- Dashboard Needs Attention gained a production-state check: a `NOT_RUNTIME_VERIFIED`
  gate surfaces as an attention item linking to the Governance page.

**v3.10.0** — Conversations page button audit and configuration pass, prompted
by the participant picker no longer being usable at the roster's current
scale (91 participants in a plain scrolling checkbox list, no way to find
anyone):
- **Searchable participant pickers** — New Conversation and Bulk Add
  Participants both gained a live search box above the checkbox list, plus a
  running "N selected" counter. Factored into shared `participantPickerHtml()`
  / `wireParticipantPicker()` helpers so both stay in sync.
- **Change Status is now explicit** — replaced the blind 🔁 cycle-through
  button (active → completed → archived → active, with no indication of what
  clicking it would do) with a small modal showing all three statuses and
  which one is current; you choose directly instead of guessing how many
  times to click.
- **Roll Call quick action** added directly to the Conversations page toolbar
  — roll calls create conversation entries, so triggering one from here
  (in addition to the Agent page and global toolbar) avoids a page hop.

Verified every named action end-to-end in a real browser: New Conversation,
Roll Call, Change Status, Delete+undo, Import CSV, Export CSV, and View —
16/16 checks passed, plus a full-app regression across all five pages.

**v3.9.0** — Conversations page deep-dive:
- **Stat chips** — Total / Active / Completed / Archived / Avg messages, at a
  glance above the grid.
- **Select all matching filters** — the same fix applied to Participants
  (v3.5.0) is now on Conversations too: checking every row on the page offers
  "Select all N matching conversations."
- **Recency filter** and a now-sortable **Participants** column (sorted via a
  locally decorated copy of the array — `DATA.conversations` itself is never
  mutated with derived fields).
- **CSV import** — round-trips with the existing export; the optional
  Participants column takes semicolon-separated names matched against
  existing participants.
- **Bulk Add Participants** — add one or more participants to every selected
  conversation in one action.
- **Conversation detail** — participant chips are now clickable, jumping to
  that participant's profile (closing the loop with the reverse link added on
  the Participants page in v3.5.0); added a per-conversation **Export
  Transcript** action.

Refactored the conversation search/filter/sort logic (previously duplicated
across the grid and CSV export) into one shared `getConversationFilterConfig()`,
following the same pattern used for Participants.

**v3.8.0** — Agent page deep-dive:
- **Typing indicator** — the chat now shows an animated "…" bubble while the
  agent is composing a reply, using CSS (`.typing-dots`) that had been
  defined since the original build but never actually wired up.
- **Roll Call History is now a real grid** — search by conversation, sortable
  Date/Present/Rate columns, pagination, per-row delete with undo, and CSV
  export — bringing it to parity with the Participants/Conversations grids
  instead of a static 15-row table.
- **Chat Clear and Export Transcript** actions.
- **Editable agent name** via a small rename modal.
- **Configurable attendance alert threshold** — the "below 70%" figure in
  Dashboard's Needs Attention panel is now a number input on the Agent page
  (`DATA.agent.alertThreshold`) instead of a hardcoded constant.
- **Upcoming schedule preview** — shows the next 3 scheduled run times when
  auto mode is on.

Found and fixed a real bug while wiring the alert threshold: the input's
`change` handler updated and saved the new value but never re-rendered
anything that displays it, so Dashboard's Needs Attention panel kept showing
the old threshold until an unrelated render happened to run.

Also surfaced a limitation in this project's own browser-based QA process:
this session's automated testing tool does not reliably capture console
errors, `console.error()` calls, or uncaught exceptions — verified with
several positive-control tests that a deliberate, guaranteed JS error still
reports "0 console errors." All actual verification in this codebase has
relied on direct DOM assertions (element counts, text content, class names),
which remain reliable and unaffected — but the "0 console errors" framing
used throughout this project's history should be read as "no errors this
testing approach can detect," not an absolute guarantee.

**v3.7.0** — Analytics page deep-dive, turning it from a passive report into
a tool you can act on:
- **Drill-down navigation** — the Department donut, Participant Types chart,
  and Conversation Status chart are now clickable (mouse or keyboard):
  clicking a segment jumps to Participants/Conversations pre-filtered to
  match, instead of just displaying a static breakdown.
- **KPI summary row** — six clickable tiles (Participants, Conversations, Avg
  Attendance, Roll Calls, Departments, Messages) reusing the same stat-card
  component as the Dashboard, each linking to its source page.
- **Participant Growth chart** — new: cumulative participant count by month,
  built from `joined` dates — an insight not shown anywhere else in the app.
- **Attendance Trend range selector** — Last 5 / 10 / 20 / All time, instead
  of a hardcoded last-10; trend bars are clickable through to the Agent
  page's roll-call history.
- **Export Report** — bundles KPIs, department/type/status breakdowns, and
  full roll-call history into one CSV.
- **Refresh** action and a last-updated indicator.

Extended the shared `renderBarList()`/`renderDonutInto()` helpers with an
optional `onClick`, kept fully backward-compatible — Dashboard's Message
Activity and Peak Hours charts (which don't pass a click handler) render
exactly as before; verified they stayed non-clickable after the change.

**v3.6.0** — Dashboard page deep-dive, turning the landing page from a static
overview into something actionable:
- **Needs Attention panel** — computed insights, not just raw data: stale
  active participants (no activity in 72h), roll calls with attendance below
  70% in the last 5, active conversations with zero messages, and a high
  inactive-participant share. Each item links straight to the relevant page;
  shows an all-clear state when there's nothing to flag.
- **Next Roll Call widget** — the agent's live countdown and status surfaced
  right on the dashboard, with a **Run Now** button that triggers a real roll
  call without leaving the page.
- **Clickable stat cards** — Conversations, Participants, Messages,
  Attendance, and Roll Calls Today now navigate to their page on click (mouse
  or keyboard); Session Uptime stays informational since it has no page to
  link to.
- **Attendance sparkline** — a tiny inline trend chart on the Attendance stat
  card, built from the same roll-call history Analytics uses.
- **Time-of-day greeting** and a **last-updated** indicator next to Quick
  Actions.

**v3.5.0** — Participants page deep-dive:
- **Detail view** (👁️) — a rich profile modal per participant: canonical identity
  block, joined/last-active, and its linked conversations (click one to jump
  straight to that conversation's detail view).
- **Stat chips** — Total / Active / Inactive / Online now / New (48h) / top
  types, at a glance above the grid.
- **Online indicator** — a small green dot on the avatar for anyone active in
  the last 15 minutes; a **NEW** badge next to names added in the last 48h.
- **Select all matching filters** — checking every row on the current page now
  offers "Select all N matching participants," not just the visible page
  (a real gap in the original bulk-select implementation).
- **CSV import** — round-trips with the existing CSV export: upload a CSV,
  preview the parsed rows, confirm before anything is added.
- **Bulk change department** — move multiple selected participants to a
  department in one action, with autocomplete against existing departments.
- **Recency filter** and a now-sortable **Callsign** column.

Refactored the participant search/filter/sort logic (previously copy-pasted
across the grid, CSV export, and select-all) into one shared
`getParticipantFilterConfig()` — while doing so, found and fixed a real bug:
the "select all" header checkbox updated selection state directly without
ever calling the hint-update function, so the new "select all matching"
banner would only appear as an accidental side effect of an unrelated
re-render, never from the primary interaction path.

**v3.4.0** — Grid usability polish, prompted by the Participants table growing to
12 columns after the v3.3.0 canonical-identity expansion:
- **Column visibility toggle** (⚙️ Columns) — show/hide the five canonical identity
  columns (Callsign, TROOPER, AGENT ID, Service Member ID, Callsign ID)
  independently; choice persists across reloads.
- **Sticky Name column** — the checkbox and Name columns stay pinned while
  scrolling a wide table horizontally, in both themes.
- **Copy-to-clipboard** on AGENT ID / Service Member ID / Callsign ID — click any
  of these technical identifiers to copy the raw value, with toast confirmation.
- **Conversations bulk actions** — select-all, bulk Archive, and bulk Delete
  (with undo), bringing Conversations to parity with the Participants grid.

**v3.3.0** — Canonical identity roll-call upgrade:
- Expanded the Participants registry to surface exact **Callsign**, **TROOPER: ""**, **AGENT: (id)**, **Service Member ID**, and **Callsign ID** fields for Academy identities.
- Preserves all 66 controlled R2 roster entries already embedded in CARC while keeping council/user records clearly separate.
- Participant search now resolves against callsign, Trooper designation, Agent ID, Service Member ID, Callsign ID, role, department, and legacy alias.
- Participant CSV export now includes canonical identity, legacy alias, canonical status, and runtime-readiness fields.
- Dashboard preview now shows canonical callsign + Service Member ID for Academy members.
- Added an explicit governance notice: canonical identity does **not** by itself assert production readiness.
- Preserved v3.2 accessibility, undo, CSV export, persisted-grid-state, and import-preview behavior.

**v3.2.0** — Professional-grade polish pass:
- **CSV export** for Participants and Conversations grids (respects current search/filter/sort), alongside the existing full-data JSON export.
- **Import safety preview** — importing a JSON file now shows a confirmation modal with new/updated record counts before anything is merged, instead of merging silently.
- **Undo** — deleting a participant (single or bulk) or a conversation now shows a toast with an inline **Undo** button instead of only a blocking confirm dialog, restoring the exact removed record(s).
- **Accessibility** — `aria-label`s on all icon-only buttons, a real modal focus trap (focus enters the dialog on open, cycles with Tab, and returns to the triggering element on close), `aria-live` toast region, and keyboard-operable sortable column headers (`Tab` + `Enter`/`Space`).
- **Persisted grid state** — Participants/Conversations search, filters, sort, and page size now survive a reload (separate `carc_grid_state_v1` key so it can be cleared independently of the dataset).

CSV export reuses the exact same `filterSortPaginate()` logic as the on-screen grid, so exports can never silently diverge from what's currently displayed.

**v3.1.0** — Imported the 66-identity "AI Training Academy" canonical service
member roster as real CARC participants (previously found dropped into
`index.html` and `README.md` as an unrelated standalone HTML page, and again
in `README_UPDATE.md`). Roster kinds map onto participant types as:
`AI BOT` → **Bot**, `TROOPER` → **Trooper**, `ASSISTANT / AI BOT` →
**Assistant**, `AI AGENT` → **Agent** (merged with CARC's existing agent
type, since both represent command-tier AI agents). Each roster participant
carries its original `role` and `callsign` for search and tooltips. Existing
saved sessions get the roster merged in automatically via a one-time
`schemaVersion` migration on load, so no one loses local data. The wrapper
HTML/CSS from the source file was discarded — only the roster data itself
was kept — and `README_UPDATE.md` has been removed since it was fully
consumed by this import. Also fixed a real bug found while wiring this up: an
operator-precedence error in `renderBarList()` was silently blanking every
bar-chart value (Message Activity, Peak Hours, and three Analytics charts).

**v3.0.0** — Full rebuild from a corrupted, triplicated `index.html` into the
multi-page dashboard described below.

## Pages

| Page | Purpose |
|---|---|
| **Dashboard** | Clickable stat cards (with an attendance sparkline), computed Needs Attention insights, Next Roll Call widget with a live Run Now shortcut, greeting + last-updated indicator, live previews of participants/conversations, sentiment, message activity, peak hours, quick actions, activity log |
| **Participants** | Full CRUD grid — search, filter (type/department/status/recency), sort, detail view, stat chips, online/NEW indicators, bulk activate/deactivate/change-dept/delete with select-all-matching, add/edit/delete, CSV import & export, undo on delete |
| **Conversations** | Stat chips, full CRUD grid — search, filter (status/recency), sort (incl. participant count), bulk archive/add-participants/delete with select-all-matching, searchable participant pickers, explicit change-status modal, a page-level Roll Call shortcut, detail view with clickable participant chips and transcript export, CSV import & export, undo on delete |
| **Agent** | Roll-call agent status & controls (run now, pause/resume auto mode, interval, editable name, alert threshold, upcoming schedule), a searchable/sortable/exportable roll-call history grid with undo, and a rule-based chat assistant (with typing indicator, clear, export transcript) that answers questions from live data |
| **Governance** | Lifecycle strip, KPI stats, Production Verification Gate with per-requirement evidence tracking, Canonical Registry Integrity audit, Identity Composition breakdown, Change & Evidence Ledger, Runtime Execution Canary (Run/Export controls, telemetry log), External Runtime Endpoint (configure URL + bearer token, test connection, submit for external verification), External Verification Response (verifier ID, signature, RUNTIME_VERIFIED / REJECTED state) |
| **Analytics** | KPI summary row, message activity, peak hours, sentiment, department/type/status breakdowns (click-through to filtered Participants/Conversations), participant growth over time, attendance trend with range selector, CSV report export |

## Global toolbar

Available from every page: **New Conv**, **Roll Call**, **Import** (JSON),
**Export** (JSON), **Refresh**, theme toggle (light/dark), settings, and a
command-palette search (`Ctrl+K`).

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+R` | Refresh |
| `Ctrl+E` | Export data as JSON |
| `Ctrl+I` | Import data from JSON |
| `Ctrl+N` | New conversation |
| `Ctrl+K` | Search / command palette |
| `1`–`6` | Jump to Dashboard / Participants / Conversations / Agent / Governance / Analytics |
| `Esc` | Close open modal |

## Data & persistence

All data is generated from realistic seed defaults and persisted to
`localStorage` in the browser (key `carc_dashboard_v3`) — no server, no
account, nothing leaves the machine. Use **Settings → Reset Demo Data** to
wipe local changes and restore the seed dataset.

Data carries a `schemaVersion` field so future structural changes (like the
v3.1.0 roster import) can migrate existing saved sessions automatically on
load, without the user losing local edits.

Export produces a JSON file compatible with Import, so data can be moved
between browsers/machines manually.

## External Runtime (optional)

`runtime/` is a small, real Express + SQLite server — *not* part of the
single-file CARC app, and not required to use it. It exists purely to answer
the Governance page's **External Runtime Endpoint** panel honestly: local
canary runs are marked `NOT_RUNTIME_VERIFIED` unless a real, separate server
independently verifies them, and this is that server.

```
cd runtime
npm install          # already done if node_modules/ is present
cp .env.example .env # already done if .env is present — edit PORT if needed
npm run setup        # creates the SQLite DB + prints a one-time bearer token
npm start             # starts the server (default port 3000; this repo's .env uses 3001)
```

Paste the printed token and the server URL (e.g. `http://localhost:3001/`)
into Governance → **⚙️ Configure**, then **🔌 Test** to confirm connectivity
and **📤 Submit for Verification** after running a local canary. A genuine
`RUNTIME_VERIFIED` response only ever comes from this server actually
running — CARC never fabricates one.

Routes: `GET /health`, `HEAD /` (connectivity test), `POST /` (bearer-auth'd
verification submission), `GET/POST/DELETE /api/tokens`, `GET
/api/verifications`, `GET /api/stats`, `GET /admin` (a small dashboard over
the verification log). `npm run smoke` runs a fast route/auth-guard check;
`npm run e2e` exercises the full submit → verify → duplicate-detection flow.

Confirmed live end-to-end during development: a real canary run against
`@VEX`, submitted to a running instance of this server, came back
`runtimeVerified: true` / `independentVerification: "RUNTIME_VERIFIED"` with
a real verifier ID — the first genuinely non-simulated verification in this
project's history. It correctly did *not* cascade into `PRODUCTION_VERIFIED`
for VEX, because the other five system-wide governance requirements were
still unattested — exactly the intended behavior (see v3.22.0 below).

## Architecture notes

- Single HTML file: inline `<style>` and `<script>`, zero external
  dependencies or CDN calls — works fully offline.
- Client-side hash routing (`#dashboard`, `#participants`, `#conversations`,
  `#agent`, `#analytics`).
- Grids use a shared `filterSortPaginate()` helper, event delegation for row
  actions, and debounced search input.
- Charts (activity bars, donuts) are pure CSS/DOM — no charting library.
- The "Agent" chat is an honest, rule-based responder scoped to this
  dashboard's own data (participant counts, attendance, etc.) — it is not a
  hosted LLM integration.
- All dynamic text is HTML-escaped before insertion to avoid XSS via
  imported/typed data.
- Modals implement a real focus trap (focus enters on open, `Tab` cycles
  within the dialog, focus returns to the triggering element on close);
  icon-only buttons carry `aria-label`s; toasts live in an `aria-live`
  region.
- Destructive actions favor an undo-toast pattern over blocking `confirm()`
  dialogs for single-row deletes; bulk delete keeps `confirm()` *and* offers
  undo, since it affects more records at once.
