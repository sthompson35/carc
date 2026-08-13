'use strict';
// persona/identity.js

    function canaryId(prefix) {
        return prefix + '-' + new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14) + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
    }


    function evaluateCanaryAuthorization(p) {
        if (!p) return { allowed:false, reason:'TARGET_NOT_FOUND' };
        if (p.status !== 'active') return { allowed:false, reason:'TARGET_INACTIVE' };
        if (!p.serviceMemberId || !p.callsignId || !p.agentId) return { allowed:false, reason:'CANONICAL_IDENTITY_INCOMPLETE' };
        if (!p.missionProfile || !p.missionProfile.mission) return { allowed:false, reason:'MISSION_PROFILE_MISSING' };
        var registry = auditCanonicalRegistry(DATA.participants);
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

