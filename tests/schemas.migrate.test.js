'use strict';
// tests/schemas.migrate.test.js

module.exports = {
    modules: [
        'config/constants.js',
        'config/labels.js',
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
        'persona/knowledge-path.js',
        'schemas/migrate.js',
        'data/seed.js',
        'communication/chat-router.js',
        'communication/roll-call.js'
    ],
    run: function (ctx, assert) {
        var migrateData = ctx.migrateData;

        var d = migrateData({});
        assert(d.schemaVersion === 17, 'migrateData sets schemaVersion to 17 (got ' + d.schemaVersion + ')');
        assert(Array.isArray(d.participants) && d.participants.length === 66, 'migrateData populates all 66 canonical participants from ROSTER');

        assert(d.participants.every(function (p) { return p.knowledgePath && p.knowledgePath.stages.length === 10; }), 'every canonical participant gets a 10-stage knowledge path');
        assert(d.participants.every(function (p) { return p.knowledgePath.stages.every(function (s) { return s.status === 'PENDING'; }); }), 'a fresh migration backfills every knowledge-path stage as empty/PENDING, never pre-filled');

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

        // Re-migration must not clobber real knowledge-path progress. Uses its own isolated
        // migration run (not `d`/`d2` above) — re-migrating from schemaVersion 16 also re-triggers
        // the unconditional canonical-merge step, which resets readiness fields; isolating this
        // check avoids that unrelated side effect leaking into the readiness assertions above.
        var kpD = migrateData({});
        var kpTarget = kpD.participants[0];
        var firstStage = kpTarget.knowledgePath.stages[0];
        firstStage.status = 'VERIFIED'; firstStage.evidence = 'real evidence'; firstStage.verifier = 'real verifier';
        kpD.schemaVersion = 16;
        var kpD2 = migrateData(kpD);
        var reMigrated = kpD2.participants.find(function (p) { return p.serviceMemberId === kpTarget.serviceMemberId; });
        assert(reMigrated.knowledgePath.stages[0].status === 'VERIFIED', 're-running migration does not clobber already-recorded knowledge-path progress');
    }
};
