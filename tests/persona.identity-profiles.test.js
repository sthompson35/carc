'use strict';
// tests/persona.identity-profiles.test.js

module.exports = {
    modules: ['app/util.js', 'data/roster.js', 'persona/mission-doctrine.js', 'persona/identity-profiles.js'],
    run: function (ctx, assert) {
        var IDENTITY_PROFILE_DEFS = ctx.IDENTITY_PROFILE_DEFS;
        var buildDefaultIdentityProfile = ctx.buildDefaultIdentityProfile;
        var evaluateIdentityProfilesState = ctx.evaluateIdentityProfilesState;

        assert(IDENTITY_PROFILE_DEFS.length === 3, 'IDENTITY_PROFILE_DEFS has exactly 3 entries');
        var keys = IDENTITY_PROFILE_DEFS.map(function (d) { return d.key; });
        assert(keys.indexOf('personaProfile') !== -1 && keys.indexOf('communicationProfile') !== -1 && keys.indexOf('handoffProfile') !== -1, 'IDENTITY_PROFILE_DEFS has exactly the persona/communication/handoff keys');

        var fresh = buildDefaultIdentityProfile();
        assert(fresh.status === 'PENDING' && fresh.evidence === '' && fresh.verifier === '', 'buildDefaultIdentityProfile starts PENDING with nothing pre-filled');

        var stateEmpty = evaluateIdentityProfilesState({});
        assert(stateEmpty.total === 3 && stateEmpty.defined === 0 && stateEmpty.complete === false, 'evaluateIdentityProfilesState on a bare participant reports 0/3, not complete');

        var partial = { personaProfile: { status: 'VERIFIED' }, communicationProfile: { status: 'PENDING' } };
        var statePartial = evaluateIdentityProfilesState(partial);
        assert(statePartial.defined === 1 && statePartial.complete === false, 'evaluateIdentityProfilesState counts only VERIFIED profiles as defined');

        var full = {
            personaProfile: { status: 'VERIFIED' },
            communicationProfile: { status: 'VERIFIED' },
            handoffProfile: { status: 'VERIFIED' }
        };
        var stateFull = evaluateIdentityProfilesState(full);
        assert(stateFull.defined === 3 && stateFull.complete === true, 'evaluateIdentityProfilesState reports complete once all 3 profiles are VERIFIED');
    }
};
