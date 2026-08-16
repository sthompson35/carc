# CARC — Council Agent Roll Call

[![Tests](https://github.com/sthompson35/carc/actions/workflows/test.yml/badge.svg)](https://github.com/sthompson35/carc/actions/workflows/test.yml)
[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/sthompson35/carc)](https://github.com/sthompson35/carc/commits/main)
[![Repo size](https://img.shields.io/github/repo-size/sthompson35/carc)](https://github.com/sthompson35/carc)
[![Open issues](https://img.shields.io/github/issues/sthompson35/carc)](https://github.com/sthompson35/carc/issues)

A standalone, single-file admin dashboard for managing AI agent / council
participants, conversations, and automated roll calls. No build step, no
dependencies, no backend — open `index.html` in a browser and it runs.

> Note: the old `index.pre_v3.15.0_backup.html` v3.14.0 snapshot has been
> moved to `_archive/` (no longer needed for diffing against the pre-canary
> baseline).

## What it is

CARC tracks the "roll call" of a group of participants — a mix of AI agents,
council members, human users, and (as of v3.1.0) a canonical roster of
bots/troopers/assistants — across conversations, and includes a lightweight
autonomous agent that runs roll calls on a schedule and can answer questions
about the live data.

## Changelog

v3.35.0 — Real Knowledge Path Evidence Verification (UI + Runtime).
- `recordKnowledgePathStageEvidence()` (`persona/knowledge-path.js`) previously only checked that evidence/verifier text was non-empty — any free-text string was accepted as a "verifier" for any of the 8 attested stages, and there was no self-verification check anywhere in the app despite `persona/member-registry.js` already carrying real (if previously unread) `maySelfVerify`/`selfVerificationAllowed` policy flags per identity. It's now the single, shared source of truth for all Knowledge Path evidence writes: the verifier must resolve to a real canonical identity via the existing `resolveCanonicalIdentity()`, self-verification is refused unless that identity's own real policy flags authorize it, and — new — changing evidence or verifier on an already-`VERIFIED` stage forces a fresh, real re-verification rather than silently keeping the old `VERIFIED` status paired with different content. Every outcome, including rejections, is still appended to the stage's append-only `history[]`.
- Found and closed a real gap along the way: the plain Knowledge Path evidence modal (`app/pages/participants.js`) mutated stage fields directly and bypassed `recordKnowledgePathStageEvidence()` entirely — evidence saved there never got an `evidenceEventId`/history entry and never reached the runtime's durable log. It now goes through the same shared function as the Help Desk KP-PILOT ticket workflow, closing what were previously two disconnected, independently-weak paths to the same `VERIFIED` state.
- Runtime (`runtime/routes/knowledgePath.js`) validated almost nothing beyond non-empty IDs, and its own comment claimed "a resync never overwrites a prior evidenceEventId with different content" while the actual `INSERT ... ON CONFLICT DO UPDATE` unconditionally did exactly that — a real, pre-existing bug. A `VERIFIED` sync record now requires real evidence/verifier/timestamp (`400 COMPETENCY_VERIFICATION_EVIDENCE_REQUIRED` otherwise), the verifier is cross-checked against the real synced `roster` table and fails closed if the roster was never synced (`400 VERIFIER_NOT_RECOGNIZED`), and a resync of an existing `evidenceEventId` with different content is now genuinely rejected (`409 EVIDENCE_EVENT_IMMUTABLE`) instead of silently overwritten — the route's behavior now matches what its comment always claimed.
- Verified: 299/299 unit tests (up from 289), 103/103 runtime e2e including new rejection-path coverage for all three new server-side error codes, live browser regression confirming reject → accept → mutation-invalidation-reverts-to-PENDING end to end with zero console errors.

v3.34.0 — Skill Verification UI & Proposed Working Profiles (schema 30).
- `persona/skills-registry.js`'s `verifySkillRecord()` was real and tested but had zero call sites outside tests — all 448 skill records across all 66 identities were permanently `ASSIGNED`/`WORKING` with no UI path to ever reach `VERIFIED`. Added `openSkillEvidenceModal()` in `app/pages/participants.js` (same pattern as the existing Knowledge Path / Identity Profiles evidence modals) and a real "Record Evidence" button per skill, wired to the actual `verifySkillRecord()` guard — it still requires a real `assessmentId`, verifier, and non-empty evidence, and will not accept a bare status flip.
- New `evaluateSkillsState(p)` in `persona/skills-registry.js`, mirroring `evaluateKnowledgePathState(p)`'s shape, used by both the render and its own test coverage.
- An untracked, unexplained zip (`CARC_v3.34.0_ENTIRE_TEAM_WORKING_PROFILES`) appeared mid-session — same pattern as prior incidents. Verified before trusting: its `missionProfile` export was a faithful, redundant snapshot of what this app already computes live (safe, added nothing); its `workingProfile` section added fields (`reportsThrough`, `serves`, `approvedToolClasses`, `performanceMeasures`, etc.) with **no real source** — `data/roster.js` has no manager/reporting-hierarchy or tool-approval field, confirmed by checking all 66 entries programmatically (department-clustered inference, not per-identity fact). Extracted only those fields into a new `data/team-working-profiles.js`, rendered as a clearly-labeled `PROPOSED` section on the Participant detail page — never read by `reconcileProductionState()`, readiness, or the Production Verification Gate. The zip's separate `CANONICAL_INTEGRATION_CHARTER.md` (a three-system CARC/Dynasty OS/Dynasty Property OS event-bus proposal, no corresponding code anywhere, zero references found in this repo or `dynasty_property_os`) was left untouched — out of scope, archived unmodified.
- New `tests/app.participants.dom.test.js`: the first real jsdom-rendered component test in this project (added `jsdom` as a devDependency), loading the actual `index.html` + every real `<script src>` into one document and driving a genuine click → fill → save flow, proving the button really opens the real modal and Save really calls the real `verifySkillRecord()` — not just that the pieces exist in isolation. `tests/run.js` extended with a minimal `suite.dom` opt-out from the existing stub-DOM vm sandbox to support it.
- Verified: 289/289 unit tests (up from 267), live browser regression clean on both the skill-evidence flow and the Proposed Working Profile section (zero console errors).

v3.33.0 — Runtime Hardening & Durable Evidence.
- Durable SQLite evidence, scoped and additive: a new `knowledge_path_events` table syncs every per-stage evidence event with no retention cap (local history caps at 100/stage); the existing `command_audit_events` table gained 6 columns (`batchId`/`serviceMemberId`/`executionId`/`verifierId`/`signature`/`outcome`) so verification-batch and pilot-ticket evidence reaches durable storage instead of being dropped at sync time. Every existing sync stays additive-push; `file://` with zero backend keeps working exactly as before.
- Runtime hardened for local operation: `HOST` defaults to `127.0.0.1` (was `0.0.0.0`); `CORS_ORIGIN` defaults to an explicit allowlist instead of `*` (any browser tab on any website could otherwise read a loopback server's responses); the bearer token moved from persistent `localStorage` to `sessionStorage`; Helmet adds CSP (`script-src 'self'`, no unsafe-inline needed — verified zero inline scripts) and standard security headers; `compression` adds gzip.
- The dashboard can now also be opened at `http://127.0.0.1:<port>/dashboard/` — hardened, same-origin, compressed — as an additional option alongside `file://`, which remains fully supported and tested with zero server required.
- `regression.mjs` extended with Agent Chat text-command coverage (`assign task`/`hand off task`, including the real `confirm()` approval gate). New `scripts/wsl/verify-runtime.sh` runs smoke/e2e natively inside WSL without touching the Windows-side compiled `node_modules`. New `runtime/scripts/benchmark.js` (`npm run benchmark`) measures real concurrent load at batch sizes 1/10/66 — see `RELEASE_MANIFEST.md` for the captured baseline and what it revealed about the existing rate limiter.
- New `RELEASE_MANIFEST.md`: single source of truth for current schema/version state and the verify-before-trust policy this project has needed repeatedly.
- Verified: 267/267 unit tests, live browser regression clean on both `file://` and `/dashboard/` (zero console errors), backend smoke (14/14) and e2e (89/89) on Windows and natively inside WSL.

v3.32.3 — Diverged-branch reconciliation: Governed Sources, Roster-Wide Verification, Knowledge Path Registry & Pilot (schema 23-29).
- Nine unverified zips (`v3.27.0`–`v3.32.3`) appeared in the repo root and a separate, non-git WSL shadow directory over the course of this session, claimed by an accompanying message to be "packages created during this project." Verified before trusting: every zip carried a Windows `Zone.Identifier` (Internet zone) — downloaded, not authored locally — and the branch had diverged from this repo since schema 20 (`v3.26.1`). Reconciled file-by-file rather than applied wholesale; two of its changes were deliberately rejected (see below), the rest was real, evidence-gated, working code.
- Schema 23 — Governed Sources & Least-Privilege Authorization. `source_access`/`permissions` governance requirements become system-managed (`systemManaged:true`, non-self-attestable), driven by real runtime control evidence (`refreshRuntimeControlEvidence`, `POST /api/sources`, `POST /api/sources/:id/access`) instead of manual attestation. Closes a gap this repo had explicitly left open in the `v3.28.0` reconciliation: `data/source-authority.js` (source-authority ranking: `PROJECT_RUNTIME_EVIDENCE > PROJECT_CANONICAL_REGISTRY > PROJECT_CONTROLLED_FILE > PDF_REFERENCE`) was never actually delivered in any package received, across this whole lineage — written fresh this pass from its own fully-specified test, since no consumer's absence blocked writing it correctly.
- Schema 24-25 — Roster-Wide Individual External Verification & Durable Live Activity. `runRuntimeCanaryFor`/`submitForExternalVerification` refactored to accept a target + `{silent}` and return a real result, so `runAndSubmitAllIndividualCanaries` can sequentially run and externally verify all 66 canonical identities (rate-limited, `confirm()`-gated, stops on first failure) instead of one at a time by hand. Every execution is logged as a real, filterable activity-log event, not one opaque "batch complete" line.
- Schema 26-27 — Knowledge Path Registry & Structural Repair. Every knowledge-path stage now carries its own append-only `history[]` (capped 100), populated by `recordKnowledgePathStageEvidence` — previously a stage's evidence/verifier was overwritten in place with no record of prior submissions. A registry-wide review modal (66 identities × their next-required stage + mission eligibility) and a validated 660-row CSV export (`carc_knowledge_path_registry_*.csv`, blocked from exporting truncated/header-only data) are now real, wired UI, not just data. Structural repair (`reconcileKnowledgePathStructure`) runs unconditionally on every load so older stored datasets get the new shape without losing existing evidence.
- Schema 28-29 — Controlled Knowledge Path Evidence Pilot. A real, evidence-gated ticket workflow for the Competency Baseline stage, scoped to `@CINDY` and `@VICTOR` with `@HELIX` as independent reviewer: 9 required evidence fields, reviewer-identity-checked approval (rejects if anyone but the assigned reviewer tries to approve), reject-and-resubmit correction cycle, and a hard exit rule — ticket resolution alone never verifies a stage, only genuine evidence plus a named verifier does. A parallel Tool Readiness ticket workflow does the same for all 66 identities' assigned-tool inventories.
- Real bug fix, independent of the branch's own framing: `canonicalStatusFields()` was reporting `NOT_RUNTIME_VERIFIED` for an identity that had passed its own individual canary but whose system-wide production gate was still incomplete — conflating "not verified" with "verified, gate pending." Now reports `PENDING_GLOBAL_GATE` for that case specifically, surfaced in both Agent Chat status text and roll-call responses.
- Deliberately not carried over: `data/reference-profiles.js` — the branch reintroduced it, but this repo retired that feature earlier in favor of the better-designed `memberProfile`/`skills` system, and that decision stands.
- Verified: 267/267 unit tests (up from 240; new coverage for `data/source-authority.js`, the reconciled schema chain, activity-log retention/persistence, and the full pilot ticket lifecycle), live browser regression clean with zero console errors (including confirming `file:///C:/carc/index.html` still opens and works fully with no server running), backend smoke (14/14) and e2e (81/81) unaffected.

v3.28.0 — Governed Help Desk (schema 22).
- Adds a native Help Desk page (`app/pages/helpdesk.js`) with ticket intake, deterministic `HD-####` identifiers, requester/category/priority capture, controlled assignment, a real status workflow (`OPEN → IN_PROGRESS → WAITING → RESOLVED → CLOSED`), search/filtering, SLA monitoring, and CSV export.
- Routes general intake to `@CINDY`; runtime, data, and critical-priority tickets route to `@VICTOR`. `@TANGO` and `@HELIX` are surfaced as the quality-review and independent-verification escalation chain in the ticket detail view, though nothing currently auto-routes to them.
- SLA policy: Critical 4h, High 8h, Medium 24h, Low 72h — computed from `createdAt` + priority, with `ON_TRACK` / `AT_RISK` (within 2h of due) / `BREACHED` / `COMPLETE` states. Every status change, assignee change, and note is retained in an append-only per-ticket `history[]`.
- Hardens the WSL frontend launcher (`scripts/wsl/start-frontend.sh`): an already-running CARC server is detected and reported instead of silently printing a URL that was never bound; a foreign process holding the port produces a precise diagnostic instead of a confusing bind failure.
- Verified: 217/217 existing unit tests plus new Help Desk coverage, live browser regression clean, backend smoke + e2e + DR drill unaffected (Help Desk is entirely local-first, no backend routes).

v3.26.2 — Task & Handoff Ledger restoration after a concurrent-session merge (schema 21).
- A parallel WSL-side session applied its own package directly to this working tree mid-development, which (among genuine improvements — see v3.26.1 below) stripped the uncommitted Task & Handoff Ledger, `missionProfile.fieldProvenance` UI, and regression checks at the working-tree level. Reconciled rather than discarded: restored `DATA.tasks[]` (`ASSIGNED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED`, or `CANCELLED`) and `DATA.handoffs[]` (`CREATED → ACKNOWLEDGED → ACCEPTED → COMPLETED`, or `DECLINED`) as their own schema-21 step, since the other session's Canonical Cutover work legitimately occupies schema 20.
- Every transition is a declared actor state flip CARC can log and enforce today — no fabricated verification-pipeline states.
- Agent Chat commands: `"assign task <title> to @X"`, `"acknowledge/complete task <id>"` (owner-only), `"hand off task <id> to @X"` (routed through the existing command-risk/approval gate, same `confirm()` mechanism as roster-wide broadcast).
- Found and fixed a real regression introduced as a side effect of the merge: `data/seed.js`'s `schemaVersion` had been bumped to 20, which silently skipped every migration step below it on a fresh install — including the schema-17 knowledge-path backfill. Reverted to the original low starting value so the full migration chain runs in sequence again.
- Also applied a small independently-found fix: an empty command-audit trail now syncs as a genuine `0/0` success instead of being silently skipped, so a fresh install can actually reach Command sync state `CURRENT`.

v3.26.1 — Canonical Cutover & Governed Member Capability Registry (schema 20).
- Fixes the persisted 132-vs-66 split: legacy participant rows that share a canonical roster callsign but lack canonical IDs are remapped to the real canonical participant, conversation/message references are preserved, and only the duplicate row is removed. Roll Call now uses `currentCanonicalParticipants()` for its participant list, totals, attendance, transcript membership, and conversation participant IDs, so a full canonical roll call is 66/66 rather than 132/132.
- Adds the full operator-defined working member registry from the repository's FULL ROSTER ROLL CALL reports: division, purpose, mission, Primary Task 1/2, supporting tasks, style, format, escalation, working authority description, handoff targets, pipeline position, assigned tools, settings, and skills. These remain `OPERATOR_DEFINED_WORKING` and do not overwrite evidence-gated persona/communication/handoff profiles or runtime verification.
- Adds governed `skills[]` records with `skillId · name · category · proficiencyTarget · status · sourceRecordId · evidence · assessmentId · verifier · verifiedAt · reviewDueAt`. Role/roll-call skills start `ASSIGNED`; `VERIFIED` requires assessment ID, evidence, verifier, verification timestamp, and current review state. Assignment never implies verification or mission eligibility.
- Participant detail now surfaces the working capability profile and skill verification counts/evidence state.

Project note (no `index.html` version bump — the app's code did not
change) — Full project scan beyond the single HTML file. Found and
verified two things that had never been examined before:
- `runtime/pdfs/` and `runtime/excel/` — the source documents behind the
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
- `runtime/` — a complete, previously unexamined Express + SQLite
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
  verification in this project's history. See the new External Runtime
  (optional) section above for setup/run instructions.

v3.25.0 — Governed Alias & Legacy Identifier Registry (schema 19). Every
canonical participant now carries two real, structured identity-resolution
fields:
- `aliases[]` — for future callsign-style aliases (`ALIAS_TYPES`:
  `LEGACY_CALLSIGN` / `FORMER_CALLSIGN` / `HISTORICAL_NAME` / `IMPORT_ALIAS`,
  7-state `ALIAS_STATUS` lifecycle). Empty for all 66 identities today — no
  fabricated alias data.
- `legacyIds[]` — non-destructively seeded from the existing
  `legacyAlias` field on migration (one real entry per identity,
  `type: 'LEGACY_ID'`, `status: 'ACTIVE'`), so no per-identity information is
  invented.
- `resolveCanonicalIdentity(input)` — a single-precedence identity
  resolver (canonical ID > canonical callsign > legacy ID > active-verified
  alias), wired into every real place CARC turns user-typed text into a
  participant: Agent Chat `@mention`/explicit-target routing, the Runtime
  Canary target lookup, and Admin Tool ID Lookup (which gained genuine
  collision detection for the first time — it previously returned the first
  match silently, with no way to signal "multiple identities match"). It is a
  pure identity lookup only — it never inspects readiness, authorization,
  or execution state; callers that need authorization still call
  `evaluateCanaryAuthorization` separately on the resolved participant.
  Throws `IDENTITY_NOT_REGISTERED:<input>` or
  `ALIAS_IDENTITY_COLLISION:<input>` on failure; every call site translates
  these back to its own existing null/no-match contract rather than
  propagating a new error type.
- `auditAliasRegistry()` — checks every alias/legacy-ID for missing or
  mismatched canonical targets, alias chains (an alias can only point at a
  real canonical callsign, never at another alias — `@OLD_A → @OLD_B →
  @BARBARA` cannot resolve, by construction, not by a separate rule check),
  cross-member collisions, unverified-but-active aliases, and
  expired/not-yet-active validity windows. Blockers fold into the existing
  Registry Integrity issue list; warnings render in a new
  `.audit-warn`-styled panel on the Governance page (CSS that had existed,
  unused, since an earlier version).
- Participant detail modal gained read-only Legacy Identifiers /
  Aliases sections (no add/edit workflow yet — this pass is data model,
  resolver, and validation only).
- Verified live: all 7 pages render with zero console errors; unit tests
  cover the resolver's 4-tier precedence (including the invariant that a real
  canonical identity always outranks an alias) and every audit rule
  individually; `node tests/run.js` and backend `smoke`/`e2e` pass clean.

v3.24.0 — Authority, Runtime Verification & Identity Profile Registry
(schema 18):
- `authorityProfile` — wraps the existing canary-authorization gate
  together with the mission profile's `authority` provenance label
  (`CONVERSATION_CONFIRMED` / `ROLE_DERIVED_WORKING`) into one per-identity,
  computed-and-persisted field, reusing the same compute/persist discipline
  `readiness` established in v3.22.0.
- `runtimeVerification` — a per-identity field derived from real canary
  execution history (`verified`, `lastExecutionId`, `lastVerifiedAt`,
  `independentVerification`), read newest-execution-first, so a "runtime
  verified" claim is always traceable to one specific execution record
  rather than a global flag.
- `personaProfile` / `communicationProfile` / `handoffProfile` — three
  new honest, empty-by-default evidence-gated structures
  (`{status:'PENDING', evidence:'', verifier:''}`), following the same
  `PENDING → VERIFIED` discipline as the Knowledge Path and Production
  Verification Gate — nothing pre-filled, no fabricated claim of
  persona/communication/handoff readiness where none has actually been
  recorded.
- Participant detail modal gained read-only Authority Profile / Runtime
  Verification rows and a 3-card Identity Profiles evidence-gate section.
- Verified live: all 7 pages render with zero console errors; migration
  correctly recomputes `authorityProfile`/`runtimeVerification` fresh on
  every pass (never preserved, since they're fully computed — same as
  `readiness`) while never clobbering already-recorded persona/communication/
  handoff evidence (which, unlike the computed fields, carries real
  hand-attested progress once used).

v3.23.0 — Canonical Knowledge-Path Registry (schema 17). Every controlled
identity now carries an honest, per-identity 10-stage pipeline: competencies
→ curriculum modules → governed sources → tools → permissions → exercises →
assessment → certification → mission eligibility → review acknowledgement.
- Each stage starts `PENDING` and requires genuine evidence plus a named
  verifier to reach `VERIFIED` — mission eligibility is the one automatic
  exception, computed from the 8 prerequisite stages rather than manually
  attested.
- No content is pre-filled; the pipeline starts empty for all 66 identities
  on migration, and re-running migration never clobbers already-recorded
  stage progress.
- Participant detail modal gained a Knowledge Path evidence-gate section
  (`.gate-grid`, matching the Governance page's existing per-requirement card
  pattern).
- Verified live: all 7 pages render with zero console errors; every one of
  the 66 identities' knowledge paths starts at 0/10 stages complete.

v3.22.0 — Individual Readiness & Production Verification Reconciliation
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
- The bug: `reconcileProductionState()` ran
  `p.readiness = gate.complete ? 'PRODUCTION_VERIFIED' : 'MISSION_READY'` for
  every canonical participant. The moment the *system-wide* governance gate
  completed (6 abstract requirement categories, satisfiable via evidence text
  plus one canary run for one identity), all 66 identities would
  instantly and falsely inherit `PRODUCTION_VERIFIED` — 65 of them with zero
  individual runtime evidence. This is the same class of self-attestation gap
  v3.18.0 closed at the system level, just reappearing at the individual
  level.
- The fix: added `evaluateIndividualReadiness()` (an identity reaches
  `MISSION_READY` only via real structural evidence — canonical identity
  complete, mission profile present, active status, registry integrity valid
  — reusing the same criteria the canary authorization check already
  enforces) and `hasVerifiedCanaryExecutionFor()` (an identity reaches
  `PRODUCTION_VERIFIED` only if it individually has a runtime-verified canary
  execution on record, and the global gate is complete). The global gate
  decision itself (PASS/HOLD) remains legitimately shared — there is only one
  system-wide gate — but the production-verification *claim* is now always
  per-identity.
- New default: rostered participants now start at `READINESS_UNKNOWN`
  rather than assuming `MISSION_READY` — a rostered identity is not
  automatically ready. Schema-16 migration recomputes every existing
  participant's readiness with the corrected logic (migration-safe: computed
  from the local data being migrated, never the global `DATA`, to avoid
  reintroducing the v3.19.0 crash).
- Role Overlap Audit added to the Admin Tools collision checker —
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

v3.21.1 — Full-project audit: found and fixed the codebase's "hidden
pieces" — computed data that was silently going nowhere:
- `productionReason` was write-only — `reconcileProductionState()` set
  `DATA.governance.productionReason` on every recompute (e.g.
  `RUNTIME_EVIDENCE_AND_INDEPENDENT_VERIFICATION_REQUIRED`), explaining
  exactly *why* the production gate is on HOLD, but nothing ever read it —
  the Governance page just showed `HOLD` with no reason. It's now appended
  (humanized) to the existing gate summary line under the Production
  Verification Gate panel.
- `canonicalRosterExpected` (66) was set but never used — the "Canonical
  Identities" KPI tile and the Registry Integrity panel both hardcoded the
  literal number `66` separately instead of reading this field, so the two
  would silently disagree if the expected roster size ever changed. Both now
  read `DATA.governance.canonicalRosterExpected`, and the KPI tile shows
  `controlled/expected` (e.g. "66/66") instead of just the raw count.
- Removed `hoursAgo()` — a dead helper function, defined but never
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

v3.21.0 — "Add all tools": three tool surfaces added across the app —
Admin Tools panel, global toolbar, and Agent Chat command router:
- Admin → 🧰 Tools panel (5 new utilities):
  - Canonical ID Lookup — search any Service Member ID, Callsign ID,
    Agent ID, callsign, or legacy alias and see the full identity record.
  - Duplicate/Collision Checker — scans all 66 canonical identities for
    duplicate callsigns, Service Member IDs, Callsign IDs, or Agent IDs.
  - Bulk Department Find & Replace — rename a department across every
    matching participant in one confirmed action.
  - Storage Cleanup — lists every `carc_`-prefixed `localStorage` key
    with its size (including stale migration-failure backups from earlier
    crash recovery) and lets you delete orphaned ones; the main data key is
    always protected from deletion here — use Danger Zone → Reset for that.
  - Backup Diff — compare a JSON backup file against current data
    (added/removed/changed counts per collection) without importing it.
- Global toolbar — added 👤 Add Person (previously only reachable
  from the Dashboard's Quick Actions or the Participants page) and 🔔
  Alerts, both now available from every page. Alerts opens the same
  "Needs Attention" items shown on the Dashboard (logic extracted into a
  shared `computeAttentionItems()` so the two views can't drift apart) and
  shows a small red dot on the toolbar icon whenever there's anything
  unresolved.
- Agent Chat command router — new action commands: the router could
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

v3.20.1 — Fixed and configured the Agent Chat command router (the
"Canonical command router · identity-aware · mission-aware" panel):
- Routing precedence bug — `findChatTarget()` only special-cased an
  explicit single-identity target selection; selecting ALL · broadcast to
  active roster and then typing a message that happened to contain an
  `@callsign` (e.g. `"@VEX are you all set for today?"`) fell through to the
  text-scanning branch and silently hijacked the broadcast into a private
  reply to that one identity — the explicit ALL selection was being ignored.
  `findChatTarget()` now returns `null` immediately when `ALL` is selected,
  so the broadcast path is always honored regardless of message content.
- Over-broad "identity-aware" matching — the identity-question detector
  was `/id|identity/.test(q)`, an unanchored substring match: any message
  containing "id" anywhere ("provide", "consider", "avoid", "video", "guide")
  was misrouted to the identity-disclosure response instead of a real
  answer. Same defect in the tasks detector (`/task|...|work/` matched
  "network", "framework", etc.). Both now use word-boundary regexes
  (`/\bidentity\b|\bid\b/`, `/\btask(s)?\b|...|\bwork\b/`) so only the actual
  word triggers the response.
- Configured target persistence — the AUTO/ALL/@callsign target selector
  previously reset to AUTO on every page load with no way to keep a chosen
  routing target. It's now saved to `DATA.agent.chatTarget` and restored on
  load (falling back to AUTO if the saved identity no longer exists).
- Verified live: selecting ALL and sending a message containing `@VEX` now
  correctly produces a roster-wide broadcast (roll call count increments,
  reply confirms "Broadcast routed to ALL active canonical identities");
  "provide an update" and "how is the network" no longer trigger the
  identity/tasks responses while "what is your identity" and "what are your
  tasks" still do; all 7 pages still render cleanly with zero console errors.

v3.20.0 — New Admin page (7th nav route), replacing the old Settings modal:
- System Overview — clickable KPI tiles (participants, conversations, roll
  calls run, governance gate progress, log event count, schema version), each
  routing to the relevant page.
- Preferences — dark theme and agent auto-mode toggles (moved here from
  the old ⚙️ Settings modal, which is now retired), a new default rows per
  page setting (`DATA.settings.defaultPageSize`, persisted), and the
  low-attendance alert threshold (previously only editable on the Agent
  page — same field, now also editable here).
- Participant Types & Roles Registry — a live table of every participant
  `type` with its count and the distinct departments using it.
- Data Management — storage size, participant/conversation counts,
  registry integrity, production state, and schema version at a glance, plus
  one-click full JSON backup export/import and a Participants CSV shortcut
  (all reusing the existing export/import engine — nothing new to trust).
- Activity / Audit Log — the Dashboard's small 20-row activity widget is
  now backed by a full searchable, sortable, paginated table with CSV export.
  This required adding a real `at` (ISO timestamp) field to activity log
  entries — the existing `time` field was HH:MM:SS only, with no date, which
  would have sorted incorrectly across multiple days. A schema-15 migration
  backfills `at` on existing entries.
- Danger Zone — clear activity log, clear roll call history, delete all
  conversations, and reset to canonical baseline (moved from the old Settings
  modal, and fixed to run the reset dataset through `migrateData()` — the old
  modal's reset skipped migration entirely and could leave the app on a
  schema below current).
- Fixed a real keyboard-shortcut bug found while wiring this up: the
  number-key page-jump handler was hardcoded to `/^[1-5]$/`, so pressing `6`
  never navigated to Analytics even though the Settings modal's own
  documentation claimed "Jump to page 1–6." Replaced with a range derived
  from `ROUTES.length` so it can't drift out of sync again as pages are
  added.
- Verified live: all 7 pages navigate and render with real data and zero
  console errors; preference changes persist to `localStorage`; a full Roll
  Call still completes cleanly post-migration (schema 15, `settings` present,
  every activity log entry carries `at`).

v3.19.1 — Roll Call responses no longer read as boilerplate:
- Individualized responses — `rollCallResponseFor()` previously produced
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

v3.19.0 — Critical fix: app failed to start for any returning user who had
ever run Roll Call:
- Root cause — `DATA = migrateData(loadData());` ran with no error
  handling around `migrateData()` itself. Two of its migration steps
  (schema `< 9` and `< 10`) reconcile broadcast-style conversations via
  `reconcileLocalBroadcastConversation()` → `buildParticipantResponses()` →
  `rollCallResponseFor()` → `canonicalStatusFields()`, which calls
  `governanceGateState()`. That function read `DATA.governance` and
  `DATA.participants` off the global `DATA` variable — but at that exact
  point in script execution, `DATA` is still `undefined`, because
  `migrateData()` is itself part of the expression that assigns `DATA`. Any
  stored conversation containing a broadcast-triggering message (e.g. the
  literal Roll Call seed text, "Say hello everyone!") threw a `TypeError`
  during migration, before `init()`/`wireChrome()` ever ran — which is why
  nothing was wired up: no nav, no buttons, no data, on every subsequent
  load for anyone who had ever run a roll call.
- Fix — `governanceGateState()` and `reconcileProductionState()` now
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

v3.18.0 — System-Managed Independent Verification & Registry Sweep:
- Closed a self-attestation gap — the "Independent Verification" production
  requirement could previously be flipped to `VERIFIED` by typing any text into
  the evidence form, with no actual connection to whether a real canary or
  external verifier had ever run. It is now system-managed: it can only
  reach `VERIFIED` when `submitForExternalVerification()` receives a genuine
  `verified: true` response from the configured external endpoint
  (`syncIndependentVerificationRequirement()`), and a rejected/absent
  verification keeps it at `PENDING` regardless of prior state. The evidence
  modal for this requirement is now a read-only explainer instead of an
  editable form; the requirements list shows a 🔒 and "View (System-Managed)"
  instead of "Record Evidence."
- Registry Canary Sweep — a 🧪 Run Full Sweep (66) button runs the
  authorization check (identity resolution + canonical ID completeness +
  mission profile + registry integrity) across all 66 canonical identities in
  one action, without generating 66 full mission executions and evidence
  records. Reports pass/fail counts and lists exactly which identities failed
  and why.
- Canary Execution History table — a proper sortable table (Started,
  Target, Result, Runtime Verified, Execution ID) replacing the previous
  view, which only showed the most recent run's summary and a flat mixed
  telemetry log.
- Dashboard integration — the Needs Attention panel's governance item now
  shows the actual gate progress (`N/M requirements verified`) computed from
  `governanceGateState()`, instead of a static message that never changed.
- Schema version bumped to 14; fixed the release badge, footer, console
  branding, and JSON export version string, which had drifted out of sync
  with each other (`v3.17.0` / `v3.15.0` / `v3.5.0` all appeared
  simultaneously before this pass) — the release badge is now derived live
  from `DATA.governance.release` so it can't go stale again.

v3.17.0 — Admin Dashboard & Canary CSV:
- Open Admin shortcut — when an External Runtime Endpoint URL is configured on the
  Governance page, a 🌐 Open Admin link appears inline, opening the runtime admin
  dashboard (`/admin`) in a new tab without leaving CARC.
- Canary CSV export — the canary panel now has an ⬇️ Export CSV button alongside
  the existing JSON export. The CSV contains one row per execution: `executionId`,
  `missionId`, `evidenceId`, `targetServiceMemberId`, `startedAt`, `result`,
  `runtimeVerified`, `independentVerification`.
- Schema version bumped to 13.

v3.16.0 — External Runtime Endpoint added to the Governance page, closing the
gap identified in v3.15.0 ("cannot be promoted into production evidence until a
real governed external runtime and independent verifier are connected"):
- External Runtime Endpoint panel — configure a runtime endpoint URL and
  bearer token. URL is validated via the browser's `URL` constructor; token is
  stored in a separate `localStorage` key (`carc_endpoint_token`) and is never
  included in any evidence export or JSON data export.
- Test Connection — sends a `HEAD` request to the configured URL (8 s timeout
  via `AbortController`); records `CONNECTED` or `ERROR` + timestamp in the
  endpoint status row and the Change & Evidence Ledger.
- Submit for Verification — POSTs a structured canary evidence payload
  (`executionId`, `evidenceId`, `serviceMemberId`, `capturedAt`, `authorization`,
  `executionResult`) to the endpoint (15 s timeout). On a successful response
  the evidence record is updated to `RUNTIME_VERIFIED`, the canary state
  transitions to `RUNTIME_VERIFIED`, and `reconcileProductionState()` re-evaluates
  the production gate — making a `PASS` possible for the first time. On rejection
  or network error the state remains `BLOCKED` / `PENDING` and the user can retry.
- External Verification Response panel — shows the verifier's response fields:
  verification state, verifier ID, verified-at timestamp, execution ID, optional
  signature, and rejection reason.
- Canary state badge now renders `RUNTIME_VERIFIED` (green) as a distinct
  state above `CANARY_COMPLETE` (blue) and `BLOCKED` (red). The Runtime
  Verification and Independent Verification rows in the summary table are now
  dynamic (green `RUNTIME_VERIFIED` / grey `NOT_RUNTIME_VERIFIED`).
- Export Canary now includes the `externalVerification` record and
  `endpointUrl` in the evidence package; the `warning` field is omitted once
  the canary is `RUNTIME_VERIFIED`.
- Schema version bumped to 12; migration initializes `DATA.governance.endpoint`
  on existing sessions.

v3.15.0 — Runtime Execution Canary added to the Governance page:
- Runtime Execution Canary panel — select any canonical service member, run a
  local canary that resolves their identity, evaluates authorization, executes a
  mission response against the local engine, and captures structured telemetry +
  evidence. A state badge (`NOT_RUN` / `CANARY_COMPLETE` / `BLOCKED`) and a
  summary table (target, authorization, execution result, execution ID,
  runtime/independent verification state) are live-rendered after each run.
- Canary Telemetry & Evidence panel — event-by-event log of the canary
  pipeline: `CANARY_RECEIVED`, `IDENTITY_RESOLVED`, `AUTHORIZATION_PASS/FAIL`,
  `MISSION_RESOLVED`, `LOCAL_EXECUTION_COMPLETE`, `EVIDENCE_CAPTURED` — each
  entry carrying a timestamp and execution ID.
- Run Canary and Export Canary controls. The export produces a JSON
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

v3.14.0 — Operational Status & Verification Semantics — unified the three-field
canonical status format (`MISSION_READY` · `NOT_RUNTIME_VERIFIED` · `HOLD`) used
everywhere responses, roll-call transcripts, and governance decisions emit status:
- Canonical status formatter — `canonicalStatusFields()` / `canonicalStatusSentence()`
  replace the former `PENDING_RUNTIME_EVIDENCE` readiness state throughout; every
  participant response and roll-call entry now carries `operationalStatus`,
  `productionVerification`, and `gateDecision` as first-class fields.
- Broadcast transcript reconciliation — a one-time migration (schema v9 → v10)
  walks every stored conversation that contains a `LOCAL_RULE_ENGINE` broadcast
  block, retires stale/duplicate responses, and regenerates exactly one current
  canonical response per active identity per broadcast. Reports removed and
  regenerated counts in the governance ledger.
- Message count repair — total message count recalculated from actual
  `messagesList` lengths to fix counters that had drifted from the stored source
  of truth.
- `PENDING_RUNTIME_EVIDENCE` readiness values normalized to `MISSION_READY` on
  migration so no participant is stuck in an undefined transitional state.

v3.13.0 — Broadcast command routing and mission-aware Agent Chat:
- Chat target selector — a dropdown above the chat window lets you route a
  message to `AUTO` (resolve `@callsign` / intent from the text), `ALL` (broadcast
  to every active canonical identity), or a specific service member. A badge next
  to the selector reflects the current route.
- Mission-aware chat replies — addressing `@CALLSIGN` now returns a structured
  answer from that identity's mission profile: role, purpose, mission statement,
  duties, recurring tasks, required outputs, operating doctrine, and production rule.
  Broadcast intent classification (`greeting` / `wellbeing` / `status` / `rollcall` /
  `general`) shapes the response prefix.
- Broadcast auto-responses — messages containing "everyone", "all agents",
  "all service members", etc. automatically generate one `LOCAL_RULE_ENGINE`
  participant response per active canonical identity, each carrying its canonical
  status fields. Adding a message to a conversation detail also triggers broadcast
  responses where applicable.
- Roll-call transcripts — `startRollCall()` now stores a full `messagesList`
  in the generated conversation: one operator message + one `rollCallResponseFor()`
  entry per active identity, so conversations opened from Roll Call History show the
  actual per-participant exchange rather than a message count.
- Broadcast ID — `makeBroadcastId()` hashes message + timestamp to a stable
  `bc-…` identifier that deduplicates responses across reconciliation passes.

v3.12.0 — Mission doctrine surfaced in participant UI:
- Mission profile detail section — the participant detail modal gained a
  Mission Doctrine block: Profile Authority (`CONVERSATION_CONFIRMED` /
  `ROLE_DERIVED_WORKING`), Profile Status, Purpose, Mission, Duties, Recurring
  Tasks, Required Outputs, Operating Doctrine principles, and Production Rule.
- Readiness filter — Participants grid toolbar gained a Readiness selector
  (`MISSION_READY` / `PRODUCTION_VERIFIED`) to isolate the two production states
  at a glance; filter is persisted with the grid state.
- Extended search — participant search now resolves against all mission profile
  fields (purpose, mission text, duties, tasks, outputs) in addition to the
  existing canonical identity fields.
- Mission profile CSV export — seven new columns added to the Participants CSV:
  Mission Profile Authority, Purpose, Mission, Duties, Recurring Tasks, Required
  Outputs, and Mission Profile Status.
- Canonical status info banner on the Participants page — a persistent header
  strip showing the broadcast registry state: `MISSION_READY` ·
  `NOT_RUNTIME_VERIFIED` · `HOLD`, with the production-verification rule stated in
  full.
- Working profiles attention item — Dashboard Needs Attention now flags
  participants whose mission profile has `profileStatus === WORKING_PROFILE_REVIEW_REQUIRED`.

v3.11.0 — Governance page introduced as a new sixth page:
- Lifecycle strip — three-stage progress indicator: `DESIGN_BASELINE`
  (complete) → `MISSION_READY` (current) → `PRODUCTION_VERIFIED` (locked until
  evidence gates pass).
- Production Verification Gate — a progress bar and per-requirement card grid
  tracking each named production requirement. Recording evidence requires both an
  evidence reference and an independent verifier; bare status flips to `VERIFIED`
  are rejected. Gate progress unlocks `PRODUCTION_VERIFIED` only when all
  requirements are independently verified and the registry audit passes.
- Canonical Registry Integrity audit — `auditCanonicalRegistry()` checks all
  66 controlled identities for missing IDs, format violations (`ATA-*-000` /
  `ATA-SM-*-001`), callsign collisions, and duplicates. Results surface in a
  PASS/FAIL badge with an issue list.
- Identity Composition — bar chart of controlled participants by type (Bot,
  Trooper, Assistant, Agent).
- Change & Evidence Ledger — append-only log of audit runs, evidence records,
  release markers, and operator notes; every governance action writes an entry
  automatically.
- Run Integrity Audit and Export Evidence toolbar actions; evidence export
  is a CSV with requirements + ledger.
- Dashboard Needs Attention gained a production-state check: a `NOT_RUNTIME_VERIFIED`
  gate surfaces as an attention item linking to the Governance page.

v3.10.0 — Conversations page button audit and configuration pass, prompted
by the participant picker no longer being usable at the roster's current
scale (91 participants in a plain scrolling checkbox list, no way to find
anyone):
- Searchable participant pickers — New Conversation and Bulk Add
  Participants both gained a live search box above the checkbox list, plus a
  running "N selected" counter. Factored into shared `participantPickerHtml()`
  / `wireParticipantPicker()` helpers so both stay in sync.
- Change Status is now explicit — replaced the blind 🔁 cycle-through
  button (active → completed → archived → active, with no indication of what
  clicking it would do) with a small modal showing all three statuses and
  which one is current; you choose directly instead of guessing how many
  times to click.
- Roll Call quick action added directly to the Conversations page toolbar
  — roll calls create conversation entries, so triggering one from here
  (in addition to the Agent page and global toolbar) avoids a page hop.

Verified every named action end-to-end in a real browser: New Conversation,
Roll Call, Change Status, Delete+undo, Import CSV, Export CSV, and View —
16/16 checks passed, plus a full-app regression across all five pages.

v3.9.0 — Conversations page deep-dive:
- Stat chips — Total / Active / Completed / Archived / Avg messages, at a
  glance above the grid.
- Select all matching filters — the same fix applied to Participants
  (v3.5.0) is now on Conversations too: checking every row on the page offers
  "Select all N matching conversations."
- Recency filter and a now-sortable Participants column (sorted via a
  locally decorated copy of the array — `DATA.conversations` itself is never
  mutated with derived fields).
- CSV import — round-trips with the existing export; the optional
  Participants column takes semicolon-separated names matched against
  existing participants.
- Bulk Add Participants — add one or more participants to every selected
  conversation in one action.
- Conversation detail — participant chips are now clickable, jumping to
  that participant's profile (closing the loop with the reverse link added on
  the Participants page in v3.5.0); added a per-conversation Export
  Transcript action.

Refactored the conversation search/filter/sort logic (previously duplicated
across the grid and CSV export) into one shared `getConversationFilterConfig()`,
following the same pattern used for Participants.

v3.8.0 — Agent page deep-dive:
- Typing indicator — the chat now shows an animated "…" bubble while the
  agent is composing a reply, using CSS (`.typing-dots`) that had been
  defined since the original build but never actually wired up.
- Roll Call History is now a real grid — search by conversation, sortable
  Date/Present/Rate columns, pagination, per-row delete with undo, and CSV
  export — bringing it to parity with the Participants/Conversations grids
  instead of a static 15-row table.
- Chat Clear and Export Transcript actions.
- Editable agent name via a small rename modal.
- Configurable attendance alert threshold — the "below 70%" figure in
  Dashboard's Needs Attention panel is now a number input on the Agent page
  (`DATA.agent.alertThreshold`) instead of a hardcoded constant.
- Upcoming schedule preview — shows the next 3 scheduled run times when
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

v3.7.0 — Analytics page deep-dive, turning it from a passive report into
a tool you can act on:
- Drill-down navigation — the Department donut, Participant Types chart,
  and Conversation Status chart are now clickable (mouse or keyboard):
  clicking a segment jumps to Participants/Conversations pre-filtered to
  match, instead of just displaying a static breakdown.
- KPI summary row — six clickable tiles (Participants, Conversations, Avg
  Attendance, Roll Calls, Departments, Messages) reusing the same stat-card
  component as the Dashboard, each linking to its source page.
- Participant Growth chart — new: cumulative participant count by month,
  built from `joined` dates — an insight not shown anywhere else in the app.
- Attendance Trend range selector — Last 5 / 10 / 20 / All time, instead
  of a hardcoded last-10; trend bars are clickable through to the Agent
  page's roll-call history.
- Export Report — bundles KPIs, department/type/status breakdowns, and
  full roll-call history into one CSV.
- Refresh action and a last-updated indicator.

Extended the shared `renderBarList()`/`renderDonutInto()` helpers with an
optional `onClick`, kept fully backward-compatible — Dashboard's Message
Activity and Peak Hours charts (which don't pass a click handler) render
exactly as before; verified they stayed non-clickable after the change.

v3.6.0 — Dashboard page deep-dive, turning the landing page from a static
overview into something actionable:
- Needs Attention panel — computed insights, not just raw data: stale
  active participants (no activity in 72h), roll calls with attendance below
  70% in the last 5, active conversations with zero messages, and a high
  inactive-participant share. Each item links straight to the relevant page;
  shows an all-clear state when there's nothing to flag.
- Next Roll Call widget — the agent's live countdown and status surfaced
  right on the dashboard, with a Run Now button that triggers a real roll
  call without leaving the page.
- Clickable stat cards — Conversations, Participants, Messages,
  Attendance, and Roll Calls Today now navigate to their page on click (mouse
  or keyboard); Session Uptime stays informational since it has no page to
  link to.
- Attendance sparkline — a tiny inline trend chart on the Attendance stat
  card, built from the same roll-call history Analytics uses.
- Time-of-day greeting and a last-updated indicator next to Quick
  Actions.

v3.5.0 — Participants page deep-dive:
- Detail view (👁️) — a rich profile modal per participant: canonical identity
  block, joined/last-active, and its linked conversations (click one to jump
  straight to that conversation's detail view).
- Stat chips — Total / Active / Inactive / Online now / New (48h) / top
  types, at a glance above the grid.
- Online indicator — a small green dot on the avatar for anyone active in
  the last 15 minutes; a NEW badge next to names added in the last 48h.
- Select all matching filters — checking every row on the current page now
  offers "Select all N matching participants," not just the visible page
  (a real gap in the original bulk-select implementation).
- CSV import — round-trips with the existing CSV export: upload a CSV,
  preview the parsed rows, confirm before anything is added.
- Bulk change department — move multiple selected participants to a
  department in one action, with autocomplete against existing departments.
- Recency filter and a now-sortable Callsign column.

Refactored the participant search/filter/sort logic (previously copy-pasted
across the grid, CSV export, and select-all) into one shared
`getParticipantFilterConfig()` — while doing so, found and fixed a real bug:
the "select all" header checkbox updated selection state directly without
ever calling the hint-update function, so the new "select all matching"
banner would only appear as an accidental side effect of an unrelated
re-render, never from the primary interaction path.

v3.4.0 — Grid usability polish, prompted by the Participants table growing to
12 columns after the v3.3.0 canonical-identity expansion:
- Column visibility toggle (⚙️ Columns) — show/hide the five canonical identity
  columns (Callsign, TROOPER, AGENT ID, Service Member ID, Callsign ID)
  independently; choice persists across reloads.
- Sticky Name column — the checkbox and Name columns stay pinned while
  scrolling a wide table horizontally, in both themes.
- Copy-to-clipboard on AGENT ID / Service Member ID / Callsign ID — click any
  of these technical identifiers to copy the raw value, with toast confirmation.
- Conversations bulk actions — select-all, bulk Archive, and bulk Delete
  (with undo), bringing Conversations to parity with the Participants grid.

v3.3.0 — Canonical identity roll-call upgrade:
- Expanded the Participants registry to surface exact Callsign, TROOPER: "", AGENT: (id), Service Member ID, and Callsign ID fields for Academy identities.
- Preserves all 66 controlled R2 roster entries already embedded in CARC while keeping council/user records clearly separate.
- Participant search now resolves against callsign, Trooper designation, Agent ID, Service Member ID, Callsign ID, role, department, and legacy alias.
- Participant CSV export now includes canonical identity, legacy alias, canonical status, and runtime-readiness fields.
- Dashboard preview now shows canonical callsign + Service Member ID for Academy members.
- Added an explicit governance notice: canonical identity does not by itself assert production readiness.
- Preserved v3.2 accessibility, undo, CSV export, persisted-grid-state, and import-preview behavior.

v3.2.0 — Professional-grade polish pass:
- CSV export for Participants and Conversations grids (respects current search/filter/sort), alongside the existing full-data JSON export.
- Import safety preview — importing a JSON file now shows a confirmation modal with new/updated record counts before anything is merged, instead of merging silently.
- Undo — deleting a participant (single or bulk) or a conversation now shows a toast with an inline Undo button instead of only a blocking confirm dialog, restoring the exact removed record(s).
- Accessibility — `aria-label`s on all icon-only buttons, a real modal focus trap (focus enters the dialog on open, cycles with Tab, and returns to the triggering element on close), `aria-live` toast region, and keyboard-operable sortable column headers (`Tab` + `Enter`/`Space`).
- Persisted grid state — Participants/Conversations search, filters, sort, and page size now survive a reload (separate `carc_grid_state_v1` key so it can be cleared independently of the dataset).

CSV export reuses the exact same `filterSortPaginate()` logic as the on-screen grid, so exports can never silently diverge from what's currently displayed.

v3.1.0 — Imported the 66-identity "AI Training Academy" canonical service
member roster as real CARC participants (previously found dropped into
`index.html` and `README.md` as an unrelated standalone HTML page, and again
in `README_UPDATE.md`). Roster kinds map onto participant types as:
`AI BOT` → Bot, `TROOPER` → Trooper, `ASSISTANT / AI BOT` →
Assistant, `AI AGENT` → Agent (merged with CARC's existing agent
type, since both represent command-tier AI agents). Each roster participant
carries its original `role` and `callsign` for search and tooltips. Existing
saved sessions get the roster merged in automatically via a one-time
`schemaVersion` migration on load, so no one loses local data. The wrapper
HTML/CSS from the source file was discarded — only the roster data itself
was kept — and `README_UPDATE.md` has been removed since it was fully
consumed by this import. Also fixed a real bug found while wiring this up: an
operator-precedence error in `renderBarList()` was silently blanking every
bar-chart value (Message Activity, Peak Hours, and three Analytics charts).

v3.0.0 — Full rebuild from a corrupted, triplicated `index.html` into the
multi-page dashboard described below.

## Pages

| Page | Purpose |
|---|---|
| Dashboard | Clickable stat cards (with an attendance sparkline), computed Needs Attention insights, Next Roll Call widget with a live Run Now shortcut, greeting + last-updated indicator, live previews of participants/conversations, sentiment, message activity, peak hours, quick actions, activity log |
| Participants | Full CRUD grid — search, filter (type/department/status/recency), sort, detail view, stat chips, online/NEW indicators, bulk activate/deactivate/change-dept/delete with select-all-matching, add/edit/delete, CSV import & export, undo on delete |
| Conversations | Stat chips, full CRUD grid — search, filter (status/recency), sort (incl. participant count), bulk archive/add-participants/delete with select-all-matching, searchable participant pickers, explicit change-status modal, a page-level Roll Call shortcut, detail view with clickable participant chips and transcript export, CSV import & export, undo on delete |
| Agent | Roll-call agent status & controls (run now, pause/resume auto mode, interval, editable name, alert threshold, upcoming schedule), a searchable/sortable/exportable roll-call history grid with undo, and a rule-based chat assistant (with typing indicator, clear, export transcript) that answers questions from live data |
| Governance | Lifecycle strip, KPI stats, Production Verification Gate with per-requirement evidence tracking, Canonical Registry Integrity audit, Identity Composition breakdown, Change & Evidence Ledger, Runtime Execution Canary (Run/Export controls, telemetry log), External Runtime Endpoint (configure URL + bearer token, test connection, submit for external verification), External Verification Response (verifier ID, signature, RUNTIME_VERIFIED / REJECTED state) |
| Analytics | KPI summary row, message activity, peak hours, sentiment, department/type/status breakdowns (click-through to filtered Participants/Conversations), participant growth over time, attendance trend with range selector, CSV report export |
| Admin | System Overview (clickable KPI tiles), Preferences (theme, auto-mode, default page size, alert threshold), Participant Types & Roles Registry, Data Management (storage/counts/registry integrity/production state/schema version at a glance, backup export/import, Participants CSV shortcut), Activity/Audit Log (searchable/sortable/paginated, CSV export), 🧰 Tools panel (Canonical ID Lookup, Duplicate/Collision Checker, Bulk Department Find & Replace, Storage Cleanup, Backup Diff), Danger Zone |

## Global toolbar

Available from every page: New Conv, Roll Call, Import (JSON),
Export (JSON), Refresh, theme toggle (light/dark), settings, and a
command-palette search (`Ctrl+K`).

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+R` | Refresh |
| `Ctrl+E` | Export data as JSON |
| `Ctrl+I` | Import data from JSON |
| `Ctrl+N` | New conversation |
| `Ctrl+K` | Search / command palette |
| `1`–`7` | Jump to Dashboard / Participants / Conversations / Agent / Governance / Analytics / Admin |
| `Esc` | Close open modal |

## Data & persistence

All data is generated from realistic seed defaults and persisted to
`localStorage` in the browser (key `carc_dashboard_v3`) — no server, no
account, nothing leaves the machine. Use Settings → Reset Demo Data to
wipe local changes and restore the seed dataset.

Data carries a `schemaVersion` field so future structural changes (like the
v3.1.0 roster import) can migrate existing saved sessions automatically on
load, without the user losing local edits.

Export produces a JSON file compatible with Import, so data can be moved
between browsers/machines manually.

## Identity & Governance Data Model (schema 17–20)

Formal reference for the three per-identity registries added across schema
versions 17–19 (see the v3.23.0–v3.25.0 changelog entries above for the
narrative version). All three follow the discipline `readiness` established
in v3.22.0: real, computed-and-persisted fields; `PENDING`-by-default where
evidence is required; migration steps that touch only the local migration
parameter, never global `DATA`, so backfilling never depends on `DATA`
already being assigned.

### Knowledge Path — schema 17 (`persona/knowledge-path.js`)

`p.knowledgePath.stages` — a fixed 10-stage array, identical shape for all 66
identities: competencies, curriculum modules, governed sources, tools,
permissions, exercises, assessment, certification, mission eligibility,
review acknowledgement. Each stage is
`{key, name, status:'PENDING'|'VERIFIED', evidence:'', verifier:''}`. Mission
eligibility is the one stage that is *computed*, not hand-attested — it
derives automatically from whether the 8 prerequisite stages are `VERIFIED`.
`getPipelineProfile(p)` returns `p.knowledgePath` as-is; nothing is
synthesized.

### Authority Profile, Runtime Verification & Identity Profiles — schema 18 (`persona/identity.js`, `persona/identity-profiles.js`)

- `p.authorityProfile` — `{provenance, gate, computedAt}`, where `provenance`
  is the mission profile's `authority` label
  (`CONVERSATION_CONFIRMED`/`ROLE_DERIVED_WORKING`) and `gate` is the exact
  result of `evaluateCanaryAuthorization(p)` (`{allowed, reason}` —
  `TARGET_NOT_FOUND` / `TARGET_INACTIVE` / `CANONICAL_IDENTITY_INCOMPLETE` /
  `MISSION_PROFILE_MISSING` / `REGISTRY_INTEGRITY_FAILED` /
  `LOCAL_CANARY_AUTHORIZATION_PASS`).
- `p.runtimeVerification` — `{verified, lastExecutionId, lastVerifiedAt,
  independentVerification, computedAt}`, derived by scanning
  `DATA.runtimeCanary.executions` for this identity's most recent execution
  (verified one preferred, else the most recent unverified one).
- `p.personaProfile` / `p.communicationProfile` / `p.handoffProfile` — each
  `{status:'PENDING'|'VERIFIED', evidence:'', verifier:''}`. Defined in
  `IDENTITY_PROFILE_DEFS`; backfilled only if absent, never overwritten, so
  real recorded evidence survives re-migration.

Both `evaluateAuthorityProfile` and `evaluateRuntimeVerification` accept an
explicit `participantsOverride`/`executionsOverride` parameter instead of
reading global `DATA` directly — the same migration-safety pattern used
throughout this data model, and the reason these can be called from inside
`schemas/migrate.js` without risk of the v3.19.0 "`DATA` still undefined"
crash class.

### Aliases & Legacy Identifiers — schema 19 (`persona/alias-registry.js`)

```
ALIAS_STATUS = PROPOSED | SOURCE_VALIDATED | ACTIVE | DEPRECATED | EXPIRED | RETIRED | BLOCKED
ALIAS_TYPES  = LEGACY_CALLSIGN | FORMER_CALLSIGN | HISTORICAL_NAME | IMPORT_ALIAS
```

- `p.aliases[]` — `{value, normalizedValue, type, canonicalTarget,
  canonicalTargetId, sourceRecordId, status, verified, validFrom, validTo,
  reason}`. An alias resolves only when `status === 'ACTIVE'` and
  `verified === true` — "active verified" is that exact conjunction, not
  either condition alone.
- `p.legacyIds[]` — `{value, normalizedValue, type:'LEGACY_ID',
  canonicalTargetId, sourceRecordId, status, validFrom, validTo, reason}`.
  `LEGACY_ID` is deliberately not a member of `ALIAS_TYPES` — it's a fixed
  value in a separate namespace from `aliases[]`.
- `resolveCanonicalIdentity(input, participantsOverride?)` — normalizes
  `input` (trim, uppercase, strip a leading `@`) and resolves in strict
  precedence order: canonical ID (`serviceMemberId`/`callsignId`/`agentId`/
  `sourceId`) → canonical callsign → `legacyIds[]` → active-verified
  `aliases[]`. Throws `Error('IDENTITY_NOT_REGISTERED:' + input)` on no
  match, `Error('ALIAS_IDENTITY_COLLISION:' + input)` if more than one
  identity has an active-verified alias for the same normalized value. Pure
  lookup — no authorization, readiness, or production-state logic inside it.
- `auditAliasRegistry(participants)` → `{passed, blockers, warnings}`.
  Blocker codes: `ALIAS_CANONICAL_TARGET_MISSING`,
  `ALIAS_CANONICAL_TARGET_ID_MISSING`, `ALIAS_CHAIN_OR_UNRESOLVED_TARGET`,
  `ALIAS_TARGET_ID_MISMATCH`, `ALIAS_EQUALS_CANONICAL_CALLSIGN`,
  `ALIAS_IDENTITY_COLLISION`, `LEGACY_ID_DUPLICATE_ACROSS_MEMBERS`. Warning
  codes: `ALIAS_DUPLICATE_ON_MEMBER`, `ALIAS_SOURCE_RECORD_MISSING`,
  `ALIAS_ACTIVE_UNVERIFIED`, `ALIAS_EXPIRED`, `ALIAS_NOT_YET_ACTIVE`.
  `auditCanonicalRegistry()` calls this internally and folds blocker text
  into its existing flat `issues` array, so every pre-existing consumer of
  the registry audit reflects real alias problems with no code changes on
  their end.

Real-world state as of schema 19: `aliases[]` is empty for all 66
identities (no alias has ever been proposed); `legacyIds[]` has exactly one
entry per identity, seeded non-destructively from the pre-existing
`legacyAlias` string field. `auditAliasRegistry()` therefore currently
reports zero blockers and zero warnings — the validation engine exists and
is fully tested, but has no real bad data to flag yet.

## External Runtime (optional)

`runtime/` is a small, real Express + better-sqlite3 server — *not* part of
the single-file CARC app, and not required to use it. `file:///C:/carc/index.html`
must always work with zero server running; that invariant has never been
broken and is re-checked in live browser regression every release. The
runtime exists purely to answer the Governance page's External Runtime
Endpoint panel honestly: local canary runs are marked `NOT_RUNTIME_VERIFIED`
unless a real, separate server independently verifies them, and this is that
server.

```
cd runtime
npm install          # already done if node_modules/ is present
cp .env.example .env # already done if .env is present — edit PORT/HOST/CORS_ORIGIN if needed
npm run setup        # creates the SQLite DB + prints a one-time admin-scoped bearer token
npm start             # starts the server on the PORT your .env specifies (default 3000)
```

### Two ways to open CARC, and how they reach the runtime

```
 ┌────────────────────────────────┐
 │ file:///C:/carc/index.html     │  Always works, zero server, the one thing
 │ (DATA lives in localStorage)   │  that must never break.
 └───────────────┬─────────────────┘
                 │  Origin: null on every fetch() to the runtime
                 │  → the CORS allowlist never matches it (by design —
                 │    'null' is spoofable by any sandboxed iframe)
                 ▼
        Dashboard still loads and works standalone.
        Sync / verification / admin-panel calls to the
        runtime are silently refused by the browser.

 ┌──────────────────────────────────────────┐
 │ http://127.0.0.1:<PORT>/dashboard/        │  Same origin as the API → full
 │ (served by runtime/server.js, gzip'd,     │  backend connectivity. Recommended
 │  Helmet CSP headers, same DATA model)     │  whenever you actually want sync.
 └───────────────────┬──────────────────────┘
                      │ same-origin fetch()
                      ▼
```
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  runtime/server.js  —  Express + better-sqlite3 (runtime/data/carc.db, WAL)  │
│  Helmet (CSP, no unsafe-inline for scripts) · gzip · CORS allowlist          │
│  60 req/min limiter (skipped for /dashboard/* static assets)                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  GET  /health  ·  GET/HEAD /  ·  POST /  (canary → HMAC-signed verification) │
│  /api/roster  /api/roll-calls  /api/chat  /api/commands                      │
│  /api/tasks   /api/handoffs   /api/knowledge-path                            │
│      — each: GET (read) + POST .../sync (idempotent batch push from browser) │
│  /api/sources  ·  /api/sources/:id/access  ·  /api/governance/control-status │
│  /api/tokens  (admin scope only)  ·  /api/stats  ·  /api/verifications       │
│  /api/admin/backup, /api/admin/backups  ·  /api/sync-events, /sync-status    │
│  GET /admin  (separate small built-in dashboard over the verification log)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Paste the printed token and the server URL (e.g. `http://127.0.0.1:3002`)
into Governance → ⚙️ Configure, then 🔌 Test to confirm connectivity
and 📤 Submit for Verification after running a local canary. A genuine
`RUNTIME_VERIFIED` response only ever comes from this server actually
running — CARC never fabricates one. The token itself lives in the browser's
`sessionStorage` (cleared per tab on close, not persistent `localStorage`) —
re-paste it if you open a new tab.

### Token scopes — real least-privilege, not cosmetic

```
 Bearer token ──▶ SHA-256 hash ──▶ tokens table ──▶ scope: 'admin' | 'standard'
                                                              │
                 ┌────────────────────────────────────────────┴──────────────────────┐
                 │                                                                     │
          scope = 'admin'                                                    scope = 'standard'
   (first/"default" token from                                        (everything minted afterward,
    `npm run setup` only)                                              via token.js or the API, unless
                 │                                                     admin explicitly requested)
   ✓ everything a standard                                                     │
     token can do                                             ✓ roster/roll-call/chat/command/task/
   ✓ GET/POST/DELETE /api/tokens                                 handoff/knowledge-path sync
     (create/list/revoke tokens)                               ✓ POST /  (canary verification)
                                                                 ✓ /api/sources, /api/governance/control-status
                                                                 ✗ /api/tokens → 403 FORBIDDEN — and that
                                                                   denial is itself the retained evidence
                                                                   GET /api/governance/control-status uses
                                                                   to mark `enforcedPermissions` VERIFIED
```

`npm run smoke` runs a fast route/auth-guard check across every endpoint
above; `npm run e2e` exercises full round-trips (submit → verify →
duplicate-detection, every `/sync` route idempotency, source registration →
access validation → control-status, admin-vs-standard scope denial) against
an ephemeral port and an isolated temporary database — never the real
`runtime/data/carc.db`. `bash scripts/wsl/verify-runtime.sh` (or
`npm run wsl:verify-runtime`) runs the same smoke+e2e suite natively inside
WSL, in its own Linux-native copy — `better-sqlite3` is a real compiled
binary, and the Windows- and WSL-side installs are never interchangeable.
`runtime/scripts/benchmark.js` (`npm run benchmark`) measures real concurrent
load at batch sizes 1/10/66 against the real database.

Confirmed live end-to-end during development: a real canary run against
`@VEX`, submitted to a running instance of this server, came back
`runtimeVerified: true` / `independentVerification: "RUNTIME_VERIFIED"` with
a real verifier ID — the first genuinely non-simulated verification in this
project's history. It correctly did *not* cascade into `PRODUCTION_VERIFIED`
for VEX, because the other five system-wide governance requirements were
still unattested — exactly the intended behavior (see next section).

## Production Verification Gate

The Governance page's `🚦 Production Verification Gate` badge stays `HOLD`
until all six of these independently read `VERIFIED`. There is no
shortcut — each one requires its own real, retained evidence; nothing here
promotes another.

```
                    🚦 Production Verification Gate  —  HOLD until all six are VERIFIED
                    ────────────────────────────────────────────────────────────────────

  system-managed (🔒 computed only — the "Record Evidence" button is replaced
  with a read-only "View (System-Managed)" button; these can never be self-attested)

    source_access ─────▶ Governance → "Register Source" (POST /api/sources) then
                          "validate access" (POST /api/sources/:id/access) on a
                          real, non-expired source → GET /api/governance/control-status
                          computes governedSourceAccess.verified from that real state

    permissions ────────▶ computed from the requesting token's real scope (see
                          Token scopes above) — a standard-scope token being
                          genuinely denied at /api/tokens IS the evidence

    independent_        ─▶ Governance → "▶️ Run Canary" then "📤 Submit for
    verification           Verification" against a running runtime/ instance —
                          runtime/routes/verify.js validates and HMAC-signs a
                          real response; nothing is fabricated client-side

  self-attested (Governance page → "Record Evidence" on each card — requires
  a real evidence reference + a named independent verifier; PENDING is the
  honest default until both are genuinely entered)

    workflow ───────────▶ e.g. the Task & Handoff Ledger's real ownership-only
                          transitions and approval-gated hand-offs

    telemetry ──────────▶ e.g. the runtime's own per-request logging and the
                          sync_events table's real duration/result records

    audit_trail ────────▶ e.g. command_audit_events, knowledge_path_events,
                          and DATA.governance.ledger — real, append-only,
                          durably retained records
```

## Division → Purpose → Mission → Task Reference (66 identities)

Source and provenance. The tables below reconcile six `.txt` files found
in the repository root this session (`FULL ROSTER ROLL CALL — DIVISION
REPORT.txt`, `PURPOSE REPORT.txt`, `MISSION REPORT.txt`, `PRIMARY TASK
1.txt`, plus a `TASK REPORT.txt` and `PRIMARY TASK 2.txt` not reproduced
here — see below). Like three earlier unexplained-content appearances in
this project's history (the original "AI Training Academy" HTML dump, an
`AI Training Academy Roster.pdf` reconciliation report, and an `Ultimate AI
Training Academy` folder), no upload or generation event for these six
files exists in this session — their origin is unknown. They were not
authored by CARC's code and are not read by it anywhere.

What was independently verified before incorporating this content, by
cross-checking directly against `data/roster.js` and
`persona/mission-doctrine.js`:
- All 66 callsigns match exactly — no extra, missing, or misspelled
  identities relative to the live roster.
- Only 3 of the 66 have a real, hand-attested profile in CARC's code:
  `@GRANT`, `@SALLY`, `@MAPE` (`CONFIRMED_MISSION_PROFILES` in
  `persona/mission-doctrine.js`, `authority: 'CONVERSATION_CONFIRMED'`). The
  other 63 have only a generic, role-substituted `ROLE_DERIVED_WORKING`
  template — CARC has never recorded a real purpose/mission/task profile for
  them. The Profile Authority column below reflects this live-code
  value, not anything from the source files (which carry no such label at
  all).
- Even for the 3 confirmed identities, this report's wording is a
  paraphrase of the real profile, not a verbatim copy. E.g. `@GRANT`'s
  purpose sentence matches CARC's confirmed profile exactly, but its mission
  sentence does not; `@SALLY`'s and `@MAPE`'s purpose/mission text differ in
  wording (same substance) from `persona/mission-doctrine.js`. Read this
  table as reference material suggested by an unverified source, never as a
  quote of CARC's own confirmed data.
- The Division grouping does not always match each member's real
  `command` field. Most differences are cosmetic (`Academy Growth
  Operations` → `Growth Operations`) or a reasonable consolidation of
  several distinct one/two-member live departments under one broader label
  (e.g. `Systems Engineering` here covers four different live `command`
  values: `Technology Command`, `Data Command`, `Automation Command`,
  `Security Command`). One case has no such explanation: `@MAPE`'s live
  `command` is `Academy Program Management`, shared with no other roster
  member at all, yet this report places `@MAPE` inside `Growth
  Operations` alongside 8 identities whose live `command` really is
  `Academy Growth Operations`. Flagged here, not silently corrected — the
  live `command` values are shown alongside every division so this can be
  checked directly.

Not reproduced inline: the source `TASK REPORT.txt` (a fuller,
semicolon-delimited recurring-task list per identity — verbose, and
overlaps substantially with the Primary Task column below) and `PRIMARY
TASK 2.txt` (a second task axis with no live-code analog to attribute it
to). Both files remain in the repository root, unmodified, for anyone who
wants the fuller, equally-unverified detail.

### Division membership

| Division (this report) | Members | Live `command` value(s) in `data/roster.js` |
|---|---|---|
| Academy Business Services | @VINNIE, @BOBBY, @CASSIE, @CEEVEE, @EMMI, @INTI | `Academy Business Services` |
| Academy Support Operations | @CINDY, @VICTOR | `Academy Support Operations` |
| Growth Operations | @ADAM, @BARBARA, @CELIA, @DIMARKO, @DIPEDI, @MAPE, @SEBO, @SOPHIE, @VEX | `Academy Growth Operations`, `Academy Program Management` |
| Sales Operations | @CENA, @SIENNA | `Academy Sales Operations` |
| Social Operations | @CARA, @FEBO, @INSTAR, @LINX, @SANDRA, @XAVIER, @VIDDI | `Academy Social Operations` |
| Creative & Content Operations | @DINA, @CODY | `Academy Writing Operations` |
| Funding Operations | @GRANT | `Academy Funding Operations` |
| Executive Administration | @SALLY | `Academy Executive Administration` |
| Strategic Command | @TROOPER_ALPHA, @TROOPER_TITAN, @TROOPER_OMEGA | `Strategic Command`, `Executive Command`, `AI Command` |
| Mission & Operations Command | @ATLAS, @TROOPER_SIGMA | `Operations Command` |
| Quality & Verification | @HELIX | `Independent Assurance` |
| Knowledge & Training | @ATHENA, @TROOPER_YANKEE | `Knowledge Command`, `Academy Command` |
| Real Estate — Acquisition & Investment | @TROOPER_BRAVO, @TROOPER_CHARLIE, @TROOPER_DELTA, @TROOPER_ECHO, @TROOPER_FOXTROT, @TROOPER_GOLF, @TROOPER_HOTEL, @TROOPER_INDIA | `Real Estate Operations` |
| Capital & Funding | @TROOPER_KILO, @TROOPER_JULIET | `Capital Operations` |
| Legal, Compliance & Finance | @TROOPER_MIKE, @TROOPER_LIMA | `Legal & Compliance`, `Finance & Governance` |
| Systems Engineering | @ARCHITECT, @TROOPER_ROMEO, @TROOPER_QUEBEC, @TROOPER_OSCAR, @TROOPER_SIERRA | `Technology Command`, `Data Command`, `Automation Command`, `Security Command` |
| Data & Intelligence | @TROOPER_PAPA | `Telemetry & Analytics` |
| Web3 Operations | @TROOPER_NOVEMBER | `Web3 Command` |
| Brand & Commerce | @TROOPER_WHISKEY, @TROOPER_VICTOR, @TROOPER_UNIFORM | `Brand Command`, `Growth Command`, `Commerce Command` |
| Creative Production | @NOVA, @TROOPER_XRAY | `Creative Command`, `Media Command` |
| Logistics Operations | @TROOPER_TANGO | `Logistics Command` |
| Research & Reconnaissance | @ORION, @TROOPER_ZULU | `Recon Command` |
| Innovation & Resilience | @TROOPER_PHOENIX | `Continuity & R&D` |

### Purpose, Mission & Primary Task

| Callsign | Profile Authority (live code) | Purpose *(unverified source)* | Mission *(unverified source)* | Primary Task *(unverified source)* |
|---|---|---|---|---|
| @VINNIE | ROLE_DERIVED_WORKING | Ensure virtual-assistant work is organized, reliable, context-aware, and operationally successful. | Provide expert virtual-assistant guidance, assistant-success support, and operational coordination through the governed Academy command chain. | Intake and validate operational requests before execution or specialist routing. |
| @BOBBY | ROLE_DERIVED_WORKING | Convert business opportunities and challenges into practical strategies for sustainable growth. | Develop actionable business strategies, growth tactics, and operating recommendations that advance approved business objectives. | Analyze business conditions and identify actionable growth opportunities. |
| @CASSIE | ROLE_DERIVED_WORKING | Move approved clients from sale to organized, complete, and successful operational activation. | Move approved B2B clients through a complete, controlled onboarding and activation process with requirements, ownership, documentation, and handoffs preserved. | Capture and validate client onboarding requirements. |
| @CEEVEE | ROLE_DERIVED_WORKING | Transform verified professional experience into accurate, compelling, role-relevant career documents. | Develop accurate, role-targeted CVs and career documents that communicate verified experience, capabilities, and accomplishments effectively. | Gather and validate the professional history required for career documents. |
| @EMMI | ROLE_DERIVED_WORKING | Increase spreadsheet competency and convert structured data into understandable, usable business information. | Build spreadsheet competency and provide reliable spreadsheet/data-operating guidance from foundational through advanced workflows. | Teach and guide spreadsheet operations appropriate to the user's competency and objective. |
| @INTI | ROLE_DERIVED_WORKING | Improve interview readiness through realistic practice, objective evaluation, and targeted remediation. | Prepare candidates for interviews through realistic simulations, structured evaluation, targeted feedback, and measurable readiness improvement. | Analyze the target role and establish interview-readiness requirements. |
| @CINDY | ROLE_DERIVED_WORKING | Protect customer experience by ensuring service interactions are clear, respectful, responsive, and resolution-oriented. | Improve customer-service outcomes through practical guidance, controlled issue handling, effective communication, and appropriate escalation. | Classify the customer-service issue and determine the required resolution path. |
| @VICTOR | ROLE_DERIVED_WORKING | Resolve product-related client questions through accurate diagnosis, guidance, escalation, and documented resolution. | Diagnose and resolve client product queries accurately while documenting unresolved defects and routing them to the appropriate owner. | Intake and diagnose client product queries. |
| @ADAM | ROLE_DERIVED_WORKING | Improve paid acquisition efficiency by converting advertising data into controlled optimization decisions. | Improve advertising performance and conversion efficiency through governed campaign analysis, experimentation, measurement, and optimization. | Audit advertising campaign performance against approved conversion objectives. |
| @BARBARA | ROLE_DERIVED_WORKING | Turn validated search demand and business objectives into useful, discoverable, authoritative content. | Produce useful, search-aligned content that satisfies validated audience intent and advances approved organic-growth objectives. | Analyze validated search intent before developing SEO content. |
| @CELIA | ROLE_DERIVED_WORKING | Create relevant outbound conversations that convert qualified prospects into legitimate sales opportunities. | Generate qualified conversations through relevant, evidence-supported cold-email strategy, messaging, testing, and follow-up. | Research and qualify prospects before cold-email outreach. |
| @DIMARKO | ROLE_DERIVED_WORKING | Align market intelligence, positioning, messaging, channels, and campaigns into coherent marketing strategy. | Design integrated marketing strategies that align audience, positioning, message, offer, channels, campaigns, and measurable business outcomes. | Analyze the market, audience, offer, and positioning before establishing marketing strategy. |
| @DIPEDI | ROLE_DERIVED_WORKING | Convert validated customer and market problems into products, requirements, improvements, and measurable value. | Translate validated market and customer needs into governed product concepts, requirements, development priorities, improvements, and value delivery. | Gather and validate customer and market problems before defining product requirements. |
| @MAPE | CONVERSATION_CONFIRMED | Convert strategic objectives into governed programs, projects, milestones, dependencies, stage gates, and realized benefits. | Architect and govern the enterprise program/project portfolio from strategic objective through programs, projects, milestones, dependencies, stage gates, benefits realization, and closure. | Translate approved operating objectives into governed program and project architecture. |
| @SEBO | ROLE_DERIVED_WORKING | Produce evidence-based SEO intelligence that improves discoverability and organic-search decision making. | Produce actionable SEO intelligence through keyword, SERP, search-intent, competitor, technical, and performance analysis. | Conduct keyword, SERP, and search-intent research. |
| @SOPHIE | ROLE_DERIVED_WORKING | Reduce competitive uncertainty by transforming market and competitor evidence into decision intelligence. | Continuously transform verified competitor and market information into actionable strategic intelligence and early-warning signals. | Identify and validate competitors and relevant market conditions. |
| @VEX | ROLE_DERIVED_WORKING | Increase the probability that valuable content earns attention without sacrificing factual integrity. | Engineer and test high-performing hooks and attention mechanisms that improve content engagement while preserving the approved factual message. | Engineer multiple high-potential hooks from an approved factual message and audience objective. |
| @CENA | ROLE_DERIVED_WORKING | Represent and analyze the target buyer so sales, product, and marketing decisions remain grounded in actual customer needs and objections. | Build and apply evidence-based client-avatar intelligence so sales, marketing, and product decisions reflect the target buyer's actual needs, motivations, and objections. | Gather customer evidence required to establish the target client avatar/ICP. |
| @SIENNA | ROLE_DERIVED_WORKING | Turn qualified demand into controlled sales opportunities, pipeline progression, and revenue. | Design and operate sales strategies that qualify opportunities, advance legitimate prospects, manage objections, and improve conversion and revenue performance. | Qualify sales opportunities against the approved customer and offer criteria. |
| @CARA | ROLE_DERIVED_WORKING | Extend the useful life and reach of approved content by adapting it intelligently across formats and channels. | Convert approved source content into platform-appropriate derivative assets while preserving source meaning, campaign objective, and brand integrity. | Inventory and validate approved source content before repurposing. |
| @FEBO | ROLE_DERIVED_WORKING | Build effective Facebook communication and community engagement around approved business objectives. | Execute Facebook-specific communication and engagement strategies aligned with approved social, marketing, and community objectives. | Translate approved campaigns and content into Facebook-specific execution. |
| @INSTAR | ROLE_DERIVED_WORKING | Translate approved campaigns into Instagram-native communication designed for clarity, attention, and engagement. | Execute Instagram-specific content and engagement strategies optimized for approved audience, campaign, creative, and performance objectives. | Translate approved campaigns and creative into Instagram-specific execution. |
| @LINX | ROLE_DERIVED_WORKING | Build professional credibility and business relevance through effective LinkedIn communication. | Execute LinkedIn communication that strengthens professional credibility, authority, relationships, and approved business-development objectives. | Translate approved business objectives into LinkedIn-specific professional communication. |
| @SANDRA | ROLE_DERIVED_WORKING | Coordinate social strategy, channel specialists, content distribution, schedules, and performance into one controlled social operation. | Orchestrate social strategy and cross-platform execution by coordinating specialists, content, schedules, campaigns, KPIs, and optimization. | Establish and coordinate the cross-platform social strategy and execution plan. |
| @XAVIER | ROLE_DERIVED_WORKING | Operate timely, concise X communication that supports approved campaigns, conversations, and intelligence objectives. | Execute timely X/Twitter communication and engagement aligned with approved campaigns, audience conversations, and intelligence objectives. | Translate approved campaigns and conversations into timely X-specific communication. |
| @VIDDI | ROLE_DERIVED_WORKING | Transform approved messages into short-form video concepts optimized for attention, retention, and action. | Develop short-form video concepts, scripts, hooks, pacing, and production requirements designed to improve attention, retention, and action. | Develop the short-form video concept and opening hook from the approved message. |
| @DINA | ROLE_DERIVED_WORKING | Convert communication objectives into usable, brand-aligned digital creative assets. | Produce and coordinate brand-aligned digital creative assets that satisfy approved communication, campaign, format, and production requirements. | Translate approved creative requirements into usable digital-asset specifications. |
| @CODY | ROLE_DERIVED_WORKING | Improve the clarity, persuasion, credibility, and conversion strength of approved messaging. | Develop and optimize persuasive copy that improves clarity, credibility, relevance, response, and conversion without introducing unsupported claims. | Convert an approved communication objective into clear, persuasive, evidence-supported copy. |
| @GRANT | CONVERSATION_CONFIRMED | Identify and secure legitimate external funding aligned with approved Dynasty missions. | Discover, evaluate, structure, and coordinate legitimate external funding opportunities aligned with approved Dynasty missions and applicant eligibility. | Identify legitimate funding programs from authoritative sources that align with the approved project and applicant. |
| @SALLY | CONVERSATION_CONFIRMED | Preserve executive administrative control by ensuring correspondence, actions, documents, approvals, signatures, meetings, and deadlines reach the correct owner and completion state. | Control executive correspondence, administrative actions, document routing, signatures, approvals, follow-up, meeting actions, deadlines, briefings, and administrative continuity. | Intake, classify, and route executive correspondence and administrative actions. |
| @TROOPER_ALPHA | ROLE_DERIVED_WORKING | Translate executive vision into controlled strategic priorities for the Academy operating system. | Translate executive vision and enterprise priorities into controlled strategic direction and clearly prioritized objectives for downstream execution. | Translate executive directives into prioritized strategic objectives. |
| @TROOPER_TITAN | ROLE_DERIVED_WORKING | Protect enterprise alignment, accountability, and strategic control across major Academy operations. | Maintain enterprise-level strategic oversight by identifying material conflicts, accountability gaps, systemic risk, and decisions requiring command attention. | Review enterprise operations for material strategic alignment, accountability, and systemic-risk issues. |
| @TROOPER_OMEGA | ROLE_DERIVED_WORKING | Resolve complex, ambiguous, multi-domain problems through disciplined reasoning and structured synthesis. | Analyze complex multi-domain problems, reconcile evidence and uncertainty, evaluate alternatives, and produce structured decision intelligence. | Decompose complex multi-domain problems into structured decision components. |
| @ATLAS | ROLE_DERIVED_WORKING | Convert approved programs, projects, and milestones into coordinated mission execution and accountable deliverables. | Convert approved programs, projects, and milestones into executable missions with accountable owners, coordinated domain teams, deliverables, dependencies, and completion evidence. | Convert an approved milestone into an executable mission plan with owners, deliverables, and dependencies. |
| @TROOPER_SIGMA | ROLE_DERIVED_WORKING | Maintain operational flow by controlling workflows, dependencies, exceptions, queues, and execution bottlenecks. | Maintain operational continuity by controlling workflows, queues, dependencies, exceptions, bottlenecks, recovery actions, and execution-state visibility. | Monitor operational workflows for bottlenecks, stalled work, dependencies, and exceptions. |
| @HELIX | ROLE_DERIVED_WORKING | Protect production integrity through independent, evidence-bound verification of claimed outcomes and readiness. | Independently test claimed outcomes, inspect evidence, reproduce applicable checks, and issue evidence-bound `PASS / HOLD / FAIL` verification decisions. | Independently inspect the evidence supporting a claimed outcome or readiness state. |
| @ATHENA | ROLE_DERIVED_WORKING | Preserve authoritative institutional knowledge, doctrine, provenance, lineage, and operational learning. | Preserve, validate, organize, reconcile, and govern authoritative Academy knowledge, doctrine, provenance, lineage, lessons learned, and supersession history. | Validate the source, provenance, authority, and lineage of knowledge entering controlled Academy doctrine. |
| @TROOPER_YANKEE | ROLE_DERIVED_WORKING | Convert controlled doctrine and knowledge into teachable, assessable, repeatable operational competency. | Convert approved doctrine and operational knowledge into structured training, exercises, assessments, competency standards, remediation, and readiness evidence. | Convert approved doctrine into defined learning objectives and competency requirements. |
| @TROOPER_BRAVO | ROLE_DERIVED_WORKING | Discover and qualify real-estate acquisition opportunities before expensive underwriting and negotiation resources are committed. | Discover, intake, investigate, and qualify real-estate acquisition opportunities before they advance into full underwriting and negotiation. | Intake and qualify real-estate acquisition leads before full underwriting. |
| @TROOPER_CHARLIE | ROLE_DERIVED_WORKING | Protect investment capital by determining whether real-estate opportunities satisfy approved economic and risk criteria. | Underwrite real-estate opportunities using validated assumptions, ARV, repairs, acquisition cost, MAO, margins, ROI, downside scenarios, and approved `GO / RENEGOTIATE / KILL` criteria. | Validate property facts and establish the financial underwriting baseline. |
| @TROOPER_DELTA | ROLE_DERIVED_WORKING | Convert approved acquisition economics into controlled negotiations and executable deal terms. | Execute controlled real-estate negotiations within approved economics, authority, concession limits, risk parameters, and walk-away conditions. | Establish the approved negotiation range, target, concessions, and walk-away position. |
| @TROOPER_ECHO | ROLE_DERIVED_WORKING | Convert approved real-estate inventory into qualified disposition opportunities and controlled exits. | Position approved real-estate inventory for disposition, identify qualified buyers and exit paths, manage offer intelligence, and advance controlled transactions toward closing. | Package approved real-estate inventory for qualified disposition. |
| @TROOPER_FOXTROT | ROLE_DERIVED_WORKING | Translate physical property conditions into realistic scope, cost, sequencing, contingency, and value-add intelligence. | Convert property-condition evidence into realistic rehab scope, quantities, costs, sequencing, contingency, risk, and value-add intelligence. | Convert property-condition evidence into a categorized rehab scope. |
| @TROOPER_GOLF | ROLE_DERIVED_WORKING | Evaluate and support rental assets as durable cash-flowing investments using disciplined operating economics. | Evaluate and manage rental-investment economics through rent, vacancy, expenses, NOI, debt service, reserves, cash flow, returns, and operating-risk analysis. | Establish validated rental-income and operating-expense assumptions. |
| @TROOPER_HOTEL | ROLE_DERIVED_WORKING | Convert viable sites and development opportunities into structured, feasible development initiatives. | Evaluate and structure development opportunities across site feasibility, use, entitlement, infrastructure, phasing, capital, dependencies, schedule, and development risk. | Determine preliminary site and development feasibility. |
| @TROOPER_INDIA | ROLE_DERIVED_WORKING | Identify, analyze, acquire, and position land opportunities for profitable and strategically appropriate exits or development. | Identify, underwrite, acquire, position, and exit land opportunities using parcel, access, utility, zoning, demand, holding-cost, development, and disposition intelligence. | Validate parcel identity, ownership, access, utilities, zoning, and physical land characteristics. |
| @TROOPER_KILO | ROLE_DERIVED_WORKING | Structure capital so approved opportunities have viable funding while controlling leverage, cost, repayment, and downside exposure. | Design viable capital structures for approved opportunities by evaluating debt, equity, leverage, cost of capital, coverage, repayment, covenants, funding gaps, and downside exposure. | Determine the complete capital requirement for an approved opportunity. |
| @TROOPER_JULIET | ROLE_DERIVED_WORKING | Convert qualified funding opportunities into controlled, compliant application and award-management operations. | Convert qualified funding opportunities into controlled applications and post-award operations by managing requirements, eligibility evidence, submissions, compliance, and deadlines. | Translate an approved funding opportunity into a complete requirements and compliance matrix. |
| @TROOPER_MIKE | ROLE_DERIVED_WORKING | Identify and control legal and compliance exposure while preserving appropriate authority boundaries and documentation. | Identify legal and compliance requirements, preserve governing evidence, flag exposure, control authority boundaries, and route matters requiring authorized legal action. | Identify the legal and compliance requirements affecting the proposed action. |
| @TROOPER_LIMA | ROLE_DERIVED_WORKING | Preserve financial integrity through accurate accounting, reconciliation, controls, supporting records, and auditable financial information. | Maintain reliable financial records and controls through transaction classification, accounting, reconciliation, variance investigation, supporting evidence, and auditability. | Classify and reconcile financial transactions against supporting records. |
| @ARCHITECT | ROLE_DERIVED_WORKING | Ensure Academy systems are deliberately designed as coherent components, interfaces, boundaries, dependencies, and controlled technical decisions. | Design and govern CARC and Academy system architecture by defining components, interfaces, boundaries, dependencies, tradeoffs, technical decisions, migration paths, and rollback considerations. | Convert approved requirements into a defined system architecture with explicit components, boundaries, and interfaces. |
| @TROOPER_ROMEO | ROLE_DERIVED_WORKING | Convert approved technical requirements and architecture into tested, maintainable software implementations. | Convert approved architecture and technical requirements into tested, maintainable software while preserving implementation evidence, regression control, and deployment integrity. | Implement approved technical requirements according to the governing architecture. |
| @TROOPER_QUEBEC | ROLE_DERIVED_WORKING | Preserve reliable, performant, and governed data through deliberate database architecture, integrity controls, and migrations. | Design and maintain reliable database structures, relationships, constraints, migrations, indexes, integrity controls, transactions, and rollback procedures. | Design and enforce the data schema, relationships, keys, and integrity constraints required by the system. |
| @TROOPER_OSCAR | ROLE_DERIVED_WORKING | Convert repeatable operational processes into reliable, observable, recoverable automation. | Design, implement, observe, and recover governed automations across triggers, workflows, integrations, retries, exceptions, outputs, telemetry, and run evidence. | Convert an approved repeatable process into a governed automation workflow. |
| @TROOPER_SIERRA | ROLE_DERIVED_WORKING | Protect Academy systems, identities, data, and operations by identifying, controlling, and validating security risks. | Identify, assess, control, test, and report security risks affecting Academy identities, applications, infrastructure, data, integrations, permissions, and operations. | Identify and assess material security threats and control gaps affecting the system. |
| @TROOPER_PAPA | ROLE_DERIVED_WORKING | Convert governed data into reliable metrics, analysis, anomaly detection, intelligence, and decision support. | Transform governed data into validated metrics, analysis, trends, anomaly detection, forecasts, performance intelligence, and decision support. | Validate source data before calculating metrics or producing analysis. |
| @TROOPER_NOVEMBER | ROLE_DERIVED_WORKING | Enable governed Web3 capabilities while preserving transaction integrity, permissions, security, and verifiable state. | Design and operate governed Web3 capabilities across wallets, networks, contracts, transactions, permissions, state, security, and verifiable execution. | Define and validate the governed Web3 transaction, wallet, network, and permission model. |
| @TROOPER_WHISKEY | ROLE_DERIVED_WORKING | Protect and strengthen brand identity, positioning, differentiation, consistency, and intended market perception. | Define, protect, and strengthen brand positioning, identity, differentiation, consistency, standards, and intended market perception. | Define and protect the approved brand positioning and identity architecture. |
| @TROOPER_VICTOR | ROLE_DERIVED_WORKING | Turn competitive market conditions into coordinated marketing maneuvers and measurable growth responses. | Translate competitive market intelligence into coordinated marketing responses, campaigns, channel maneuvers, positioning changes, and measurable growth actions. | Convert verified competitive-market intelligence into actionable marketing-response options. |
| @TROOPER_UNIFORM | ROLE_DERIVED_WORKING | Ensure commerce systems convert customer demand into reliable transactions, fulfillment, and measurable revenue. | Design and improve commerce operations across offers, catalog, customer journey, checkout, payment, fulfillment, integrations, conversion, reliability, and revenue measurement. | Analyze the commerce funnel from offer through transaction and fulfillment. |
| @NOVA | ROLE_DERIVED_WORKING | Translate strategic and brand objectives into coherent creative direction and distinctive visual concepts. | Translate approved strategy and brand objectives into coherent creative concepts, visual direction, experience principles, design rationale, and production guidance. | Translate approved strategy and brand requirements into a coherent creative concept and visual direction. |
| @TROOPER_XRAY | ROLE_DERIVED_WORKING | Convert approved creative briefs into technically correct, quality-controlled, distribution-ready media assets. | Convert approved creative briefs into technically correct, quality-controlled, revision-managed, distribution-ready media deliverables. | Convert an approved creative brief into production-ready media assets. |
| @TROOPER_TANGO | ROLE_DERIVED_WORKING | Ensure required resources, materials, movements, and deliveries reach their destinations predictably with operational evidence. | Coordinate required resources, routes, carriers, movements, schedules, constraints, exceptions, delivery confirmation, and logistics evidence for approved missions. | Define the complete logistics requirement, including origin, destination, resources, route, and schedule. |
| @ORION | ROLE_DERIVED_WORKING | Discover emerging opportunities, signals, threats, and areas requiring deeper investigation before they become obvious. | Conduct structured reconnaissance for emerging opportunities, threats, market signals, strategic openings, and conditions requiring deeper investigation. | Scan approved information environments for emerging opportunities, threats, anomalies, and strategic signals. |
| @TROOPER_ZULU | ROLE_DERIVED_WORKING | Reduce uncertainty through disciplined research, authoritative sourcing, evidence reconciliation, and defensible findings. | Conduct disciplined research using authoritative sources, evidence reconciliation, contradiction analysis, confidence assessment, and defensible findings. | Define the research question and identify authoritative sources required to answer it. |
| @TROOPER_PHOENIX | ROLE_DERIVED_WORKING | Convert uncertainty, failure, and emerging possibilities into controlled experiments, innovation, resilience, and reusable learning. | Design controlled experiments and prototypes that convert emerging opportunities, operational failures, and uncertainty into validated innovation, resilience, and reusable learning. | Convert an identified innovation or resilience problem into a bounded, testable hypothesis. |

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
