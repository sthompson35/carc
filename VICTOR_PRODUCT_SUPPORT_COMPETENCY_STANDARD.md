# @VICTOR — Product Support Competency Standard

**Service Member ID:** `ATA-VICTOR-000` · **Division:** Academy Support Operations · **Role:** Product Support & Client Query Resolution Specialist

## Provenance

This document formalizes what already exists as real, structured data in CARC (`persona/member-registry.js`, `persona/skills-registry.js`, `app/pages/helpdesk.js`) — it does not introduce new criteria, thresholds, or scoring rubrics that aren't already coded, except where a field below is explicitly marked **PROPOSED**. Every field is either:

- **`OPERATOR_DEFINED_WORKING`** — the working profile and skill list already assigned to @VICTOR, `verified: false`. This is the current draft standard, not an independently confirmed one.
- **Code-enforced** — the verification mechanism (below) is real, running logic in `persona/skills-registry.js`, not a proposed process.
- **PROPOSED** — CARC has no code path for this yet (training curricula, exercise design, numeric scoring). Marked explicitly rather than presented as already-established fact.

No skill listed here has been verified yet. This standard defines what verification *requires*, not a claim that it has happened.

## Purpose & Mission

> Resolve product-related client questions through accurate diagnosis, guidance, escalation, and documented resolution.

> Diagnose and resolve client product queries accurately while documenting unresolved defects and routing them to the appropriate owner.

## Standard Definition

### 1. Standard ID and version
`ATA-STD-VICTOR-PS-001`, **v1.1 (DRAFT)** — v1.0 overstated `@TROOPER_YANKEE`/`@HELIX` as code-enforced roles (fields 7, 10); v1.1 corrects both to editorial proposals backed by real roster identities, not enforced code. Not yet independently reviewed.

### 2. Owner
**CARC Operator (Shylow Thompson).** CARC's data model has no field for "who owns a competency standard document" distinct from who defines a working profile — but it does already record, on @VICTOR's real profile, `provenance.status: OPERATOR_DEFINED_WORKING`, and `app/pages/helpdesk.js`/`data/seed.js` already use the literal actor strings `'CARC Operator'` and `'Shylow Thompson'` for the human running this system. Ownership is assigned to that same real, coded identity rather than an invented management title CARC doesn't have.

### 3. Applicable role
Product Support & Client Query Resolution Specialist — **@VICTOR** (`ATA-VICTOR-000`), Academy Support Operations.

### 4. Required competencies
Seven skills currently assigned, all at `WORKING` proficiency target, all `ROLE_ALIGNED` category, all currently `ASSIGNED` (not yet verified), all `missionEligibilityImpact: REQUIRED`:

| Skill ID | Competency | Status |
|---|---|---|
| `ATA-SKL-VICTOR-001` | Product support | ASSIGNED |
| `ATA-SKL-VICTOR-002` | Query diagnosis | ASSIGNED |
| `ATA-SKL-VICTOR-003` | Troubleshooting | ASSIGNED |
| `ATA-SKL-VICTOR-004` | Client guidance | ASSIGNED |
| `ATA-SKL-VICTOR-005` | Defect identification | ASSIGNED |
| `ATA-SKL-VICTOR-006` | Escalation | ASSIGNED |
| `ATA-SKL-VICTOR-007` | Resolution documentation | ASSIGNED |

### 5. Training method — **PROPOSED**
CARC's `SKILL_STATUS` enum tracks the *states* `TRAINING_REQUIRED` → `TRAINING_COMPLETE`, but no specific curriculum or method is coded anywhere. Proposed default: supervised, on-the-job application of each competency using @VICTOR's real assigned tools — product knowledge base, ticketing, diagnostic logs, issue tracker, documentation, engineering handoff, customer-support systems — advancing one skill at a time through the real status lifecycle. Pending operator approval before treated as official.

### 6. Practical exercise — **PROPOSED**
Diagnose and resolve a set of real or simulated product-support tickets end-to-end through CARC's actual Help Desk system (`app/pages/helpdesk.js`), including at least one `RUNTIME`/`DATA`-category or `CRITICAL`-priority ticket (the tickets that route to @VICTOR by design) — following @VICTOR's real operating format `Product Query → Symptoms → Diagnosis → Resolution → Evidence → Escalation → Outcome`. Uses a real system as the exercise vehicle; the exercise design itself is new, not extracted from existing code.

### 7. Assessment method
Evaluation of the practical exercise against each competency, recorded using CARC's real evidence structure (`assessmentId` + `verifier` + `evidence[]`, per `persona/skills-registry.js`). **Correction from v1.0 draft:** `@TROOPER_YANKEE` is a real roster identity (`ATA-TROOPER_YANKEE-000`, role "Education Command") and a plausible fit by role narrative — but `verifySkillRecord()` treats `verifier` as a free-text string with **zero identity or role enforcement**; nothing in the codebase designates `@TROOPER_YANKEE`, or anyone, as an enforced assessment authority. Naming them here is an editorial proposal, not a code-backed fact.

### 8. Passing score
CARC's real verification gate (`verifySkillRecord()`) is **binary, not numeric** — there is no percentage or point threshold anywhere in the codebase. A skill passes when `assessmentId`, `verifier`, and at least one real `evidence[]` record are all present; it does not pass otherwise. This document does not invent a numeric passing score CARC has no mechanism to check.

### 9. Required evidence
At least one real `evidence[]` record per skill, a named `verifier`, and an `assessmentId` — all required before `skillSatisfiesMission()` treats a skill as mission-eligible — plus a current, non-lapsed `reviewDueAt` per `skillReviewCurrent()`. `auditSkills()` flags any `VERIFIED` skill missing evidence, assessment, or verifier as a blocker, and any lapsed review as a warning.

### 10. Independent reviewer
**@HELIX** — a real roster identity (`ATA-HELIX-000`, role "Readiness & Verification", command "Independent Assurance"). **Correction from v1.0 draft:** this role narrative is a strong fit by name, but is not code-enforced — `verifySkillRecord()` has no check that `verifier` differs from the skill's own subject, and no code anywhere requires the verifier to specifically be `@HELIX`. Naming them here is an editorial proposal consistent with their real division, not a code-backed guarantee of independence.

### 11. Effective and review dates
**Effective:** 2026-08-15 (this document's creation date). **Review:** 2027-02-11 (+180 days) — **PROPOSED**. CARC tracks a real `reviewDueAt` per skill in code, but no standard review interval is encoded anywhere; 180 days is an editorial default pending a real policy decision, not an extracted value.

## Verification mechanics (supporting detail for fields 6–10)

`persona/skills-registry.js`'s `verifySkillRecord()` will only move a skill from `ASSIGNED` to `VERIFIED` if **all** of the following are supplied — it throws otherwise:

1. **`assessmentId`** — a real assessment reference (`SKILL_ASSESSMENT_REQUIRED` if missing)
2. **`verifier`** — a named, independent verifier (`SKILL_VERIFIER_REQUIRED` if missing)
3. **`evidence[]`** — at least one real evidence record (`SKILL_EVIDENCE_REQUIRED` if empty)

`skillSatisfiesMission()` additionally requires a `verifiedAt` timestamp and a **current** review window (`reviewDueAt` in the future — `skillReviewCurrent()`). A skill that passes its review-due date is no longer treated as satisfying mission eligibility even if it was previously verified.

Assignment alone — being on this list — never implies verification, and never by itself grants mission eligibility. This mirrors the exact discipline CARC already applies to `readiness`, `authorityProfile`, and `knowledgePath`: computed and gated, never self-attested.

## Operating Standard (current working profile)

| Parameter | Value |
|---|---|
| **Operating style** | Diagnostic, concise, technical-support oriented |
| **Default response format** | `Product Query → Symptoms → Diagnosis → Resolution → Evidence → Escalation → Outcome` |
| **Working authority** | *Diagnose / Delegated Resolve* — may investigate and resolve supported product queries. Engineering changes and unresolved defects route to technical ownership. Cannot self-verify, bypass evidence, or bypass verification. |
| **Escalation policy** | Escalate reproducible defects, unresolved technical failures, security implications, missing product authority, or engineering-required remediation. Mode: `FAIL_CLOSED` — recipient acknowledgement required before continuing. |
| **Pipeline position** | `PRODUCT_QUERY → DIAGNOSIS → RESOLUTION/ESCALATION` |
| **Assigned tools** *(assignment ≠ connection or authorization)* | Product knowledge base, ticketing, diagnostic logs, issue tracker, documentation, engineering handoff, customer-support systems |
| **Handoff targets** | `@CINDY`, `@DIPEDI`, `@TROOPER_ROMEO`, `@ARCHITECT` |

## Help Desk Role

Per `app/pages/helpdesk.js`'s real routing logic (`helpDeskOwnerFor`), @VICTOR is the **owner for `RUNTIME`/`DATA`-category tickets and any `CRITICAL`-priority ticket regardless of category** — these route to @VICTOR automatically instead of the default @CINDY. `@TANGO` and `@HELIX` are visible in the ticket detail view as the quality-review and independent-verification escalation chain, though nothing currently auto-routes to them.

SLA targets that apply to any ticket @VICTOR owns (shared policy, not role-specific): Critical 4h · High 8h · Medium 24h · Low 72h. Given @VICTOR owns all `CRITICAL` tickets by design, the 4-hour SLA applies disproportionately to this role.

## What this document is not

- **Not** an independently verified competency certification — no skill above has an `assessmentId`, `verifier`, or `evidence` recorded yet.
- **Not** a claim of runtime or production verification — those are entirely separate CARC gates (`authorityProfile`, `runtimeVerification`) with their own evidence requirements.
- **Not** a fixed/final standard — it reflects `CARC-ROLLCALL-SKILLS-20260814`'s current assignment and will change if the working profile in `persona/member-registry.js` changes.
- **Not** a claim that training method, practical exercise, passing criteria, or review interval already exist as approved CARC policy — those fields are marked PROPOSED above and need explicit sign-off before they're official.
