'use strict';
// tests/schemas.migrate.test.js

module.exports = {
    modules: [
        'config/constants.js',
        'config/labels.js',
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
        'schemas/migrate.js',
        'data/seed.js',
        'communication/chat-router.js',
        'communication/roll-call.js'
    ],
    run: function (ctx, assert) {
        var migrateData = ctx.migrateData;

        var d = migrateData({});
        assert(d.schemaVersion === 16, 'migrateData sets schemaVersion to 16 (got ' + d.schemaVersion + ')');
        assert(Array.isArray(d.participants) && d.participants.length === 66, 'migrateData populates all 66 canonical participants from ROSTER');

        var allReady = d.participants.every(function (p) { return p.readiness === 'MISSION_READY'; });
        assert(allReady, 'every clean, active canonical participant is recomputed as MISSION_READY');

        // Flip one participant inactive and re-run the migration as if from schemaVersion 15,
        // to exercise the v16 per-identity eligibility recompute in isolation.
        var target = d.participants[0];
        target.status = 'inactive';
        d.schemaVersion = 15;
        var d2 = migrateData(d);
        var reEvaluated = d2.participants.find(function (p) { return p.serviceMemberId === target.serviceMemberId; });
        assert(reEvaluated.readiness === 'READINESS_UNKNOWN', 'an inactive participant is recomputed as READINESS_UNKNOWN, not MISSION_READY');

        var stillActive = d2.participants.find(function (p) { return p.serviceMemberId !== target.serviceMemberId; });
        assert(stillActive.readiness === 'MISSION_READY', 'unaffected active participants remain MISSION_READY after a partial-state recompute');
    }
};
