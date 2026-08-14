'use strict';
// tests/data.reference-profiles.test.js

module.exports = {
    modules: ['data/roster.js', 'data/reference-profiles.js'],
    run: function (ctx, assert) {
        var ROSTER = ctx.ROSTER;
        var buildReferenceProfile = ctx.buildReferenceProfile;

        assert(ROSTER.every(function (r) { return !!ctx.REFERENCE_PROFILES[r.callsign]; }), 'every one of the 66 real callsigns has a REFERENCE_PROFILES entry');

        var vinnie = buildReferenceProfile('@VINNIE');
        assert(vinnie.provenance === 'UNVERIFIED_EXTERNAL_SOURCE', 'buildReferenceProfile stamps the honest UNVERIFIED_EXTERNAL_SOURCE provenance, not a fabricated confirmed source');
        ['authorityNarrative', 'escalation', 'defaultFormat', 'pipelinePosition', 'settings', 'skills', 'operatingStyle', 'tools'].forEach(function (f) {
            assert(typeof vinnie[f] === 'string' && vinnie[f].length > 0, f + ' is a non-empty string for a real callsign');
            assert(vinnie[f].indexOf('**') === -1 && vinnie[f].indexOf('`') === -1, f + ' has markdown formatting stripped');
        });
        assert(Array.isArray(vinnie.handoffTargets) && vinnie.handoffTargets.length > 0, 'handoffTargets is a non-empty array');

        assert(buildReferenceProfile('@NOT_A_REAL_CALLSIGN') === null, 'buildReferenceProfile returns null for an unknown callsign, never fabricates one');
    }
};
