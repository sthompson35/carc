'use strict';
// tests/data.roster.test.js

module.exports = {
    modules: ['data/roster.js'],
    run: function (ctx, assert) {
        var ROSTER = ctx.ROSTER;

        assert(Array.isArray(ROSTER), 'ROSTER is an array');
        assert(ROSTER.length === 66, 'ROSTER has exactly 66 entries (got ' + (ROSTER && ROSTER.length) + ')');

        var seenService = {}, seenCallsign = {}, seenAgent = {};
        var allUnique = true, allShaped = true, allCallsignFormat = true;
        ROSTER.forEach(function (r) {
            if (!r.serviceMemberId || !r.callsign || !r.displayName || !r.kind || !r.agentId || !r.role || !r.command) allShaped = false;
            if (String(r.callsign || '').charAt(0) !== '@') allCallsignFormat = false;
            if (seenService[r.serviceMemberId]) allUnique = false; seenService[r.serviceMemberId] = true;
            if (seenCallsign[r.callsign]) allUnique = false; seenCallsign[r.callsign] = true;
            if (seenAgent[r.agentId]) allUnique = false; seenAgent[r.agentId] = true;
        });

        assert(allShaped, 'every roster entry has serviceMemberId/callsign/displayName/kind/agentId/role/command');
        assert(allCallsignFormat, 'every callsign starts with @');
        assert(allUnique, 'serviceMemberId/callsign/agentId are unique across the roster');
    }
};
