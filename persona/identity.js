'use strict';
// persona/identity.js

    function canaryId(prefix) {
        return prefix + '-' + new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14) + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
    }


    // `participantsOverride` lets this run safely during migration, where the global DATA isn't
    // assigned yet — without it, calling this from migrateData() would reintroduce the exact
    // v3.19.0 crash class (something reaching global DATA mid-migration). All existing zero-arg
    // call sites are unaffected — they fall through to DATA.participants exactly as before.
    function evaluateCanaryAuthorization(p, participantsOverride) {
        if (!p) return { allowed:false, reason:'TARGET_NOT_FOUND' };
        if (p.status !== 'active') return { allowed:false, reason:'TARGET_INACTIVE' };
        if (!p.serviceMemberId || !p.callsignId || !p.agentId) return { allowed:false, reason:'CANONICAL_IDENTITY_INCOMPLETE' };
        if (!p.missionProfile || !p.missionProfile.mission) return { allowed:false, reason:'MISSION_PROFILE_MISSING' };
        var registry = auditCanonicalRegistry(participantsOverride || DATA.participants);
        if (!registry.valid) return { allowed:false, reason:'REGISTRY_INTEGRITY_FAILED' };
        return { allowed:true, reason:'LOCAL_CANARY_AUTHORIZATION_PASS' };
    }

    // A rostered identity is not automatically ready. MISSION_READY requires the same
    // structural evidence the canary authorization already checks (canonical identity,
    // mission profile, active status, registry integrity) — short of that, readiness is
    // honestly unknown rather than assumed.

    function evaluateIndividualReadiness(p) {
        return evaluateCanaryAuthorization(p).allowed ? 'MISSION_READY' : 'READINESS_UNKNOWN';
    }

    // PRODUCTION_VERIFIED must never cascade from the global gate alone — it requires this
    // specific identity to have an individually runtime-verified canary execution on record.

    function hasVerifiedCanaryExecutionFor(serviceMemberId) {
        var executions = (DATA.runtimeCanary && DATA.runtimeCanary.executions) || [];
        return executions.some(function (e) { return e.targetServiceMemberId === serviceMemberId && e.runtimeVerified === true; });
    }

    // AUTHORITY_PROFILE unifies two previously-disconnected concepts: missionProfile.authority
    // (a static provenance label — how this identity's mission profile was sourced) and the real
    // authorization gate (evaluateCanaryAuthorization — whether this identity is actually eligible
    // right now). Computed fresh every time, like readiness — never hand-edited, never preserved
    // across a recompute.
    function evaluateAuthorityProfile(p, participantsOverride) {
        return {
            provenance: (p && p.missionProfile && p.missionProfile.authority) || 'UNKNOWN',
            gate: evaluateCanaryAuthorization(p, participantsOverride),
            computedAt: new Date().toISOString()
        };
    }

    // RUNTIME_VERIFICATION is a per-identity view over the shared canary execution history
    // (DATA.runtimeCanary.executions, or an explicit override during migration). Executions are
    // unshifted newest-first, so the first VERIFIED match (or failing that, the most recent
    // attempt) represents current state.
    function evaluateRuntimeVerification(p, executionsOverride) {
        var sid = p && p.serviceMemberId;
        var executions = executionsOverride || (typeof DATA !== 'undefined' && DATA && DATA.runtimeCanary && DATA.runtimeCanary.executions) || [];
        var mine = executions.filter(function (e) { return e.targetServiceMemberId === sid; });
        var verifiedExec = mine.find(function (e) { return e.runtimeVerified === true; });
        var match = verifiedExec || mine[0] || null;
        return {
            verified: !!verifiedExec,
            lastExecutionId: match ? match.executionId : '',
            lastVerifiedAt: verifiedExec ? verifiedExec.startedAt : '',
            independentVerification: match ? (match.independentVerification || 'PENDING') : 'PENDING',
            computedAt: new Date().toISOString()
        };
    }

