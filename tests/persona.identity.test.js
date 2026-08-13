'use strict';
// tests/persona.identity.test.js

module.exports = {
    modules: [
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
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
    }
};
