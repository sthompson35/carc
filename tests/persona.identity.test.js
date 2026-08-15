'use strict';
// tests/persona.identity.test.js

module.exports = {
    modules: [
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
        'persona/alias-registry.js',
        'schemas/migrate.js',
        'persona/identity.js'
    ],
    run: function (ctx, assert) {
        var participants = ctx.ROSTER.map(function (r, idx) { return ctx.rosterToParticipant(r, idx); });
        ctx.DATA = { participants: participants };

        var evaluateCanaryAuthorization = ctx.evaluateCanaryAuthorization;
        var evaluateIndividualReadiness = ctx.evaluateIndividualReadiness;

        var clean = participants[0];
        var pass = evaluateCanaryAuthorization(clean);
        assert(pass.allowed === true && pass.reason === 'LOCAL_CANARY_AUTHORIZATION_PASS', 'a clean canonical participant passes canary authorization');
        assert(evaluateIndividualReadiness(clean) === 'MISSION_READY', 'a clean canonical participant is MISSION_READY');

        assert(evaluateCanaryAuthorization(null).reason === 'TARGET_NOT_FOUND', 'null target is rejected as TARGET_NOT_FOUND');

        var inactive = Object.assign({}, clean, { status: 'inactive' });
        assert(evaluateCanaryAuthorization(inactive).reason === 'TARGET_INACTIVE', 'inactive status is rejected as TARGET_INACTIVE');
        assert(evaluateIndividualReadiness(inactive) === 'READINESS_UNKNOWN', 'inactive status yields READINESS_UNKNOWN');

        var noIds = Object.assign({}, clean, { callsignId: '' });
        assert(evaluateCanaryAuthorization(noIds).reason === 'CANONICAL_IDENTITY_INCOMPLETE', 'missing canonical ID is rejected as CANONICAL_IDENTITY_INCOMPLETE');

        var noMission = Object.assign({}, clean, { missionProfile: { authority: 'x' } });
        assert(evaluateCanaryAuthorization(noMission).reason === 'MISSION_PROFILE_MISSING', 'missing mission profile is rejected as MISSION_PROFILE_MISSING');

        // Corrupt the registry (duplicate serviceMemberId) without touching `clean` itself —
        // authorization must fail on registry integrity even though this identity is individually fine.
        var dupe = Object.assign({}, participants[1], { serviceMemberId: clean.serviceMemberId });
        ctx.DATA = { participants: participants.concat([dupe]) };
        assert(evaluateCanaryAuthorization(clean).reason === 'REGISTRY_INTEGRITY_FAILED', 'a registry-wide integrity failure blocks authorization even for an individually valid identity');

        // Reset DATA to a clean, uncorrupted registry for the AUTHORITY_PROFILE/RUNTIME_VERIFICATION
        // checks below.
        ctx.DATA = { participants: participants, runtimeCanary: { executions: [] } };

        var evaluateAuthorityProfile = ctx.evaluateAuthorityProfile;
        var evaluateRuntimeVerification = ctx.evaluateRuntimeVerification;

        var authClean = evaluateAuthorityProfile(clean);
        assert(authClean.provenance === clean.missionProfile.authority, 'evaluateAuthorityProfile carries the missionProfile.authority provenance label');
        assert(authClean.gate.allowed === true, 'evaluateAuthorityProfile wraps a passing gate for a clean canonical participant');

        var authInactive = evaluateAuthorityProfile(inactive);
        assert(authInactive.gate.reason === 'TARGET_INACTIVE', 'evaluateAuthorityProfile reflects the underlying gate rejection reason');

        // participantsOverride keeps evaluateCanaryAuthorization (and therefore evaluateAuthorityProfile)
        // callable without touching global DATA — the exact property that makes it migration-safe.
        var authOverride = evaluateAuthorityProfile(clean, participants);
        assert(authOverride.gate.allowed === true, 'evaluateAuthorityProfile accepts an explicit participantsOverride instead of reading global DATA');

        var rvNone = evaluateRuntimeVerification(clean, []);
        assert(rvNone.verified === false && rvNone.lastExecutionId === '', 'evaluateRuntimeVerification with no executions reports unverified and no execution id');

        var rvVerified = evaluateRuntimeVerification(clean, [
            { targetServiceMemberId: clean.serviceMemberId, executionId: 'E1', startedAt: '2026-01-01T00:00:00.000Z', runtimeVerified: true, independentVerification: 'RUNTIME_VERIFIED' }
        ]);
        assert(rvVerified.verified === true && rvVerified.lastExecutionId === 'E1' && rvVerified.independentVerification === 'RUNTIME_VERIFIED', 'evaluateRuntimeVerification finds a verified execution for this identity in an explicit executions override');

        var rvUnverifiedOnly = evaluateRuntimeVerification(clean, [
            { targetServiceMemberId: clean.serviceMemberId, executionId: 'E2', startedAt: '2026-01-02T00:00:00.000Z', runtimeVerified: false, independentVerification: 'PENDING' }
        ]);
        assert(rvUnverifiedOnly.verified === false && rvUnverifiedOnly.lastExecutionId === 'E2', 'evaluateRuntimeVerification falls back to the most recent unverified execution when none are verified');
    }
};
