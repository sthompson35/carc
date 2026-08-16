---
name: carc-cina
description: Apply the CARC Canonical Identity and Contract Authority capability when work requires resolve every reference to one immutable canonical identity and authoritative issuer. Use for authorized identity governance planning, analysis, coordination, or evidence; do not invoke it to bypass another domain owner.
---

# Canonical Identity and Contract Authority

Read `../../shared/CARC-OPERATING-DOCTRINE.md` before acting.

## Mission

Resolve every reference to one immutable canonical identity and authoritative issuer.

## Core capabilities

- Identity resolution
- Id issuance
- Alias mapping
- Collision detection
- Provenance
- Quarantine
- Schema versioning
- Compatibility testing

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

Unknown, conflicting, or ambiguous references are DENY and QUARANTINE. IDs are immutable and never recycled.

Never invent missing records, silently reconcile conflicts, erase lineage, treat a draft as approved, or report an external action without runtime evidence.

## Required output

Produce: **canonical resolution record or fail-closed quarantine decision**. Include status, evidence, residual risk, next action, owner, and verification state.

## Escalation

- Identity conflict -> @CINA
- Architecture or contract conflict -> @ARCHITECT
- Mission dependency or ownership conflict -> @ATLAS
- Portfolio or schedule conflict -> @MAPE
- Governance or compliance exception -> @VEX
- Test failure -> @TANGO
- Verification dispute -> @HELIX
