'use strict';
// tests/schemas.migrate.test.js

module.exports = {
    modules: [
        'config/constants.js',
        'config/labels.js',
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
        'persona/identity.js',
        'persona/knowledge-path.js',
        'persona/identity-profiles.js',
        'persona/alias-registry.js',
        'persona/member-registry.js',
        'persona/skills-registry.js',
        'schemas/migrate.js',
        'data/seed.js',
        'communication/chat-router.js',
        'communication/roll-call.js'
    ],
    run: function (ctx, assert) {
        var migrateData = ctx.migrateData;

        var d = migrateData({});
        assert(d.schemaVersion === 21, 'migrateData sets schemaVersion to 21 (got ' + d.schemaVersion + ')');
        assert(Array.isArray(d.participants) && d.participants.length === 66, 'migrateData populates all 66 canonical participants from ROSTER');

        assert(Array.isArray(d.tasks) && d.tasks.length === 0, 'migrateData backfills an empty tasks[] array for a fresh install');
        assert(Array.isArray(d.handoffs) && d.handoffs.length === 0, 'migrateData backfills an empty handoffs[] array for a fresh install');

        var MISSION_FIELDS = ['purpose', 'mission', 'duties', 'tasks', 'outputs'];
        assert(d.participants.every(function (p) { return p.missionProfile.fieldProvenance && MISSION_FIELDS.every(function (f) { return !!p.missionProfile.fieldProvenance[f]; }); }), 'every participant gets a 5-field missionProfile.fieldProvenance via the existing unconditional canonical merge — no schema bump needed for this specific field');

        assert(d.participants.every(function (p) { return Array.isArray(p.aliases) && p.aliases.length === 0; }), 'a fresh migration leaves aliases[] empty for all 66 identities — no fabricated alias data');
        assert(d.participants.every(function (p) { return Array.isArray(p.legacyIds) && p.legacyIds.length === 1 && p.legacyIds[0].value === p.legacyAlias; }), 'a fresh migration seeds exactly one real legacyIds[] entry from the existing legacyAlias value');
        assert(d.participants.every(function (p) { return p.legacyIds[0].status === 'ACTIVE' && p.legacyIds[0].type === 'LEGACY_ID'; }), 'the seeded legacyIds entry has ACTIVE status and LEGACY_ID type');

        assert(d.participants.every(function (p) { return p.knowledgePath && p.knowledgePath.stages.length === 10; }), 'every canonical participant gets a 10-stage knowledge path');
        assert(d.participants.every(function (p) { return p.knowledgePath.stages.every(function (s) { return s.status === 'PENDING'; }); }), 'a fresh migration backfills every knowledge-path stage as empty/PENDING, never pre-filled');

        var IDENTITY_PROFILE_KEYS = ['personaProfile', 'communicationProfile', 'handoffProfile'];
        assert(d.participants.every(function (p) { return IDENTITY_PROFILE_KEYS.every(function (k) { return p[k] && p[k].status === 'PENDING' && p[k].evidence === '' && p[k].verifier === ''; }); }), 'a fresh migration backfills persona/communication/handoff profiles as empty/PENDING, never pre-filled');
        assert(d.participants.every(function (p) { return p.authorityProfile && p.authorityProfile.gate.allowed === true; }), 'every clean, active canonical participant has an authorized authorityProfile');
        assert(d.participants.every(function (p) { return p.runtimeVerification && p.runtimeVerification.verified === false; }), 'every canonical participant starts runtimeVerification.verified === false (no canary has run yet)');

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

        // authorityProfile/runtimeVerification must be freshly recomputed on every pass, never
        // preserved — same isolated-run pattern as the knowledge-path check above.
        var apD = migrateData({});
        var apTarget = apD.participants[0];
        apTarget.status = 'inactive';
        apD.schemaVersion = 17;
        var apD2 = migrateData(apD);
        var apReMigrated = apD2.participants.find(function (p) { return p.serviceMemberId === apTarget.serviceMemberId; });
        assert(apReMigrated.authorityProfile.gate.allowed === false && apReMigrated.authorityProfile.gate.reason === 'TARGET_INACTIVE', 'authorityProfile is freshly recomputed on re-migration, reflecting the now-inactive status');

        // Identity profiles (persona/communication/handoff) must NOT be clobbered on re-migration —
        // they carry real hand-attested evidence once used, unlike authorityProfile/runtimeVerification.
        var ipD = migrateData({});
        var ipTarget = ipD.participants[0];
        ipTarget.personaProfile = { status: 'VERIFIED', evidence: 'real evidence', verifier: 'real verifier', updatedAt: new Date().toISOString() };
        ipD.schemaVersion = 17;
        var ipD2 = migrateData(ipD);
        var ipReMigrated = ipD2.participants.find(function (p) { return p.serviceMemberId === ipTarget.serviceMemberId; });
        assert(ipReMigrated.personaProfile.status === 'VERIFIED', 're-running migration does not clobber already-recorded persona profile progress');

        // Re-migration must not clobber or duplicate legacyIds/aliases progress — same isolated-
        // run pattern as the knowledge-path/identity-profile checks above.
        var aliasD = migrateData({});
        var aliasTarget = aliasD.participants[0];
        aliasTarget.legacyIds.push({ value: 'ATA-HAND-ADDED-000', normalizedValue: 'ATA-HAND-ADDED-000', type: 'LEGACY_ID', canonicalTargetId: aliasTarget.callsignId, status: 'ACTIVE', reason: 'manually added' });
        aliasD.schemaVersion = 18;
        var aliasD2 = migrateData(aliasD);
        var aliasReMigrated = aliasD2.participants.find(function (p) { return p.serviceMemberId === aliasTarget.serviceMemberId; });
        assert(aliasReMigrated.legacyIds.length === 2, 're-running migration preserves a hand-added legacyIds entry alongside the seeded one, not duplicated');
        assert(aliasReMigrated.legacyIds.filter(function (l) { return l.value === aliasReMigrated.legacyAlias; }).length === 1, 're-running migration does not duplicate the originally-seeded legacyIds entry');
    }
};
