'use strict';
// tests/communication.chat-router.test.js

module.exports = {
    modules: [
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
        'communication/chat-router.js'
    ],
    run: function (ctx, assert) {
        var participants = ctx.ROSTER.map(function (r, idx) { return ctx.rosterToParticipant(r, idx); });
        ctx.DATA = { participants: participants, agent: { state: 'idle', chatLog: [] } };

        var isGroupBroadcastMessage = ctx.isGroupBroadcastMessage;
        var findChatTarget = ctx.findChatTarget;
        var findChatTargets = ctx.findChatTargets;
        var attemptBroadcast = ctx.attemptBroadcast;

        assert(isGroupBroadcastMessage('hello everyone') === true, '"hello everyone" is a group broadcast');
        assert(isGroupBroadcastMessage('tell all agents to report') === true, '"tell all agents to report" is a group broadcast');
        assert(isGroupBroadcastMessage('@VEX status') === false, 'a single @mention is not a group broadcast');
        assert(isGroupBroadcastMessage('') === false, 'empty message is not a group broadcast');

        var vex = participants.find(function (p) { return p.callsign === '@VEX'; });
        assert(findChatTarget('@VEX hi there', 'AUTO').id === vex.id, 'findChatTarget resolves an @mention from the message text');
        assert(findChatTarget('no mention here', 'AUTO') === null, 'findChatTarget returns null with no mention and no explicit target');
        assert(findChatTarget('irrelevant', 'ALL') === null, 'findChatTarget returns null for explicit ALL');
        assert(findChatTarget('irrelevant', vex.serviceMemberId).id === vex.id, 'findChatTarget resolves an explicit serviceMemberId target');

        var mape = participants.find(function (p) { return p.callsign === '@MAPE'; });
        var multi = findChatTargets('@VEX @MAPE status', 'AUTO');
        assert(multi.length === 2 && multi[0].id === vex.id && multi[1].id === mape.id, 'findChatTargets resolves multiple @mentions in message order');
        assert(findChatTargets('@VEX @VEX status', 'AUTO').length === 1, 'findChatTargets de-duplicates repeated mentions of the same identity');
        assert(findChatTargets('no mentions', 'AUTO').length === 0, 'findChatTargets returns empty array with no mentions');
        assert(findChatTargets('irrelevant', 'ALL').length === 0, 'findChatTargets returns empty array for explicit ALL');

        // attemptBroadcast: already-running guard must prevent a second startRollCall call
        // and must not claim success — this was the misleading-broadcast bug fixed earlier.
        var rollCallCalls = 0;
        ctx.startRollCall = function () { rollCallCalls++; };

        ctx.DATA.agent.state = 'idle';
        var okMsg = attemptBroadcast('hello everyone', 'SUCCESS');
        assert(rollCallCalls === 1 && okMsg === 'SUCCESS', 'attemptBroadcast starts a roll call and returns the success message when idle');

        ctx.DATA.agent.state = 'running';
        var busyMsg = attemptBroadcast('hello everyone', 'SUCCESS');
        assert(rollCallCalls === 1, 'attemptBroadcast does not start a second roll call while one is already running');
        assert(busyMsg !== 'SUCCESS' && /already in progress/i.test(busyMsg), 'attemptBroadcast reports the already-running state instead of a false success');
    }
};
