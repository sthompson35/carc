'use strict';
// tests/persona.mission-doctrine.test.js

module.exports = {
    modules: ['app/util.js', 'data/roster.js', 'persona/mission-doctrine.js'],
    run: function (ctx, assert) {
        var participants = ctx.ROSTER.map(function (r, idx) { return ctx.rosterToParticipant(r, idx); });
        var FIELDS = ['purpose', 'mission', 'duties', 'tasks', 'outputs'];

        var grant = participants.find(function (p) { return p.serviceMemberId === 'ATA-GRANT-000'; });
        var derived = participants.find(function (p) { return p.serviceMemberId === 'ATA-VINNIE-000'; });

        assert(grant.missionProfile.fieldProvenance, 'GRANT has a fieldProvenance object');
        FIELDS.forEach(function (f) {
            var fp = grant.missionProfile.fieldProvenance[f];
            assert(fp.authority === 'CONVERSATION_CONFIRMED', f + ' fieldProvenance.authority is CONVERSATION_CONFIRMED for GRANT');
            assert(fp.sourceRecordId === 'ATA-GRANT-000', f + ' fieldProvenance.sourceRecordId is the real serviceMemberId, not a fabricated ID');
            assert(fp.confidence === 'CONFIRMED', f + ' fieldProvenance.confidence is CONFIRMED');
            assert(fp.establishedAt === '' && fp.lastReviewedAt === '', f + ' fieldProvenance leaves unknown timestamps empty, never fabricated');
        });

        FIELDS.forEach(function (f) {
            var fp = derived.missionProfile.fieldProvenance[f];
            assert(fp.authority === 'ROLE_DERIVED_WORKING', f + ' fieldProvenance.authority is ROLE_DERIVED_WORKING for a non-confirmed member');
            assert(fp.confidence === 'TEMPLATE_DERIVED', f + ' fieldProvenance.confidence is honestly TEMPLATE_DERIVED, not fabricated');
            assert(fp.sourceRecordId === '', f + ' fieldProvenance has no fabricated sourceRecordId for template-derived text');
            assert(fp.establishedBy === 'ROLE_DERIVED_TEMPLATE_ENGINE', f + ' fieldProvenance honestly attributes template-derived text to the template engine, not a person');
        });

        // Existing call sites must be untouched — this is additive, not a wrapper.
        assert(typeof derived.missionProfile.purpose === 'string', 'purpose remains a plain string');
        assert(typeof derived.missionProfile.mission === 'string', 'mission remains a plain string');
        assert(Array.isArray(derived.missionProfile.duties) && Array.isArray(derived.missionProfile.tasks) && Array.isArray(derived.missionProfile.outputs), 'duties/tasks/outputs remain plain arrays');
    }
};
