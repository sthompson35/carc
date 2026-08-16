Production Activation Gate

This describes the real, already-implemented gate — not an aspirational chain. See
`README.md`'s "Production Verification Gate" section and `runtime/routes/sources.js` /
`runtime/routes/verify.js` / `persona/skills-registry.js` for the code this reflects.

The Governance page's Production Verification Gate badge stays `HOLD` until all six of
these independently read `VERIFIED`. None of them promotes another; each requires its own
real, retained evidence.

System-managed (computed only — never self-attested, the UI shows a read-only
"View (System-Managed)" button instead of "Record Evidence"):

- `source_access` — a real source registered (`POST /api/sources`) and its access
  explicitly validated (`POST /api/sources/:id/access`), not expired; computed by
  `GET /api/governance/control-status`.
- `permissions` — computed from the requesting token's real scope. A standard-scope token
  being genuinely denied at the admin-only `/api/tokens` endpoint IS the retained
  least-privilege evidence — there is no separate "permissions test" to pass.
- `independent_verification` — a real canary run submitted to a running `runtime/`
  instance; `runtime/routes/verify.js` validates and HMAC-signs the response. Nothing is
  fabricated client-side.

Self-attested (Governance page → "Record Evidence" on each card — requires a real evidence
reference plus a named independent verifier; `PENDING` is the honest default until both
are genuinely entered):

- `workflow` — e.g. the Task & Handoff Ledger's real ownership-only transitions and
  approval-gated hand-offs.
- `telemetry` — e.g. the runtime's own per-request logging and the `sync_events` table's
  real duration/result records.
- `audit_trail` — e.g. `command_audit_events`, `knowledge_path_events`, and
  `DATA.governance.ledger` — real, append-only, durably retained records.

A skill assignment (`persona/skills-registry.js`'s `SKILL_STATUS.ASSIGNED`) is likewise
never itself evidence of readiness — `verifySkillRecord()` only accepts `VERIFIED` given a
real `assessmentId`, `verifier`, and non-empty `evidence[]`. The honest default everywhere
in this system is `PENDING` / `HOLD` until genuine evidence exists, never a polished claim.
