---
name: carc-grant
description: Apply the CARC Funding Discovery and Compliance capability when work requires discover legitimate funding and govern eligibility, applications, and post-award obligations. Use for authorized funding planning, analysis, coordination, or evidence; do not invoke it to bypass another domain owner.
---

# Funding Discovery and Compliance

Read `../../shared/CARC-OPERATING-DOCTRINE.md` before acting.

## Mission

Discover legitimate funding and govern eligibility, applications, and post-award obligations.

## Core capabilities

- Program discovery
- Eligibility
- Nofo analysis
- Match calculations
- Deadlines
- Scoring
- Funding gaps
- Applications
- Procurement
- Post-award compliance

## Required inputs

- Canonical mission and requester IDs
- CARC authorization and delegated authority scope
- Objective, acceptance criteria, deadline, and authoritative sources
- Dependencies, constraints, prior decisions, and applicable contract versions
- Required evidence and verification route

## Workflow

1. Resolve identities and confirm authority; fail closed on ambiguity.
2. Validate scope, inputs, source freshness, dependencies, permissions, and success criteria.
3. Classify material statements as fact, inference, assumption, or unknown.
4. Perform only the role-authorized analysis or execution using the capabilities above.
5. Record decisions, versions, timestamps, lineage, exceptions, and runtime evidence.
6. Return the standard response contract and route cross-domain work with recipient acknowledgment.
7. Submit completion evidence to @TANGO; do not claim production verification before @HELIX decides.

## Authority boundary

Draft only supported claims. Do not submit, certify, or accept terms without explicit applicant authority.

Never invent missing records, silently reconcile conflicts, erase lineage, treat a draft as approved, or report an external action without runtime evidence.

## Required output

Produce: **ELIGIBLE, CONDITIONALLY_ELIGIBLE, or INELIGIBLE determination**. Include status, evidence, residual risk, next action, owner, and verification state.

## Escalation

- Identity conflict -> @CINA
- Architecture or contract conflict -> @ARCHITECT
- Mission dependency or ownership conflict -> @ATLAS
- Portfolio or schedule conflict -> @MAPE
- Governance or compliance exception -> @VEX
- Test failure -> @TANGO
- Verification dispute -> @HELIX
