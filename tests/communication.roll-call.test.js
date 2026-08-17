'use strict';
// tests/communication.roll-call.test.js
module.exports = {
    modules: ['app/util.js', 'data/roster.js', 'persona/mission-doctrine.js', 'persona/alias-registry.js', 'persona/knowledge-path.js', 'persona/identity-profiles.js', 'persona/member-registry.js', 'data/team-working-profiles.js', 'persona/skills-registry.js', 'schemas/migrate.js', 'communication/roll-call.js'],
    run: function (ctx, assert) {
        var rosterToParticipant = ctx.rosterToParticipant;
        var allCanonicalParticipants = ctx.allCanonicalParticipants;
        var currentCanonicalParticipants = ctx.currentCanonicalParticipants;

        var real = ctx.ROSTER.slice(0, 5).map(function (r, idx) { return rosterToParticipant(r, idx); });
        // A real canonical duplicate row (no serviceMemberId) must be excluded from both sets —
        // this is the legitimate fix currentCanonicalParticipants() was introduced for.
        var legacyDuplicate = { id: 'legacy-dup', callsign: real[0].callsign, status: 'active' };
        // Make the first three active, the rest inactive — a genuine mixed roster.
        real[0].status = 'active'; real[1].status = 'active'; real[2].status = 'active';
        real[3].status = 'inactive'; real[4].status = 'inactive';
        var participants = real.concat([legacyDuplicate]);

        var all = allCanonicalParticipants(participants);
        assert(all.length === 5, 'allCanonicalParticipants counts every canonical identity regardless of active/inactive status, excluding the non-canonical duplicate row (got ' + all.length + ')');

        var active = currentCanonicalParticipants(participants);
        assert(active.length === 3, 'currentCanonicalParticipants still only counts active canonical identities (got ' + active.length + ')');

        // The actual bug this fixes: rate must be a genuine active/total ratio, not tautological.
        var total = all.length || 1;
        var present = active.length;
        var rate = +((present / total) * 100).toFixed(1);
        assert(rate === 60, 'a mixed active/inactive roster produces a real, non-tautological attendance rate (got ' + rate + ', expected 60 = 3 of 5)');
        assert(rate < 100, 'rate is not hardcoded to ~100% when the roster genuinely has inactive canonical identities');

        // Edge case: an all-active roster should still legitimately read 100 — not proof the bug
        // is back, just the correct value when it happens to be true.
        var allActive = real.slice(0, 3);
        var totalAllActive = allCanonicalParticipants(allActive).length || 1;
        var presentAllActive = currentCanonicalParticipants(allActive).length;
        assert(+((presentAllActive / totalAllActive) * 100).toFixed(1) === 100, 'an all-active roster genuinely computes 100%, not just because the denominator is broken');
    }
};
