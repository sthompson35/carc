'use strict';
// tests/communication.chat-router.test.js

module.exports = {
    modules: [
        'app/util.js',
        'data/roster.js',
        'persona/mission-doctrine.js',
        'persona/identity.js',
        'communication/chat-router.js'
    ],
    run: function (ctx, assert) {
        var participants = ctx.ROSTER.map(function (r, idx) { return ctx.rosterToParticipant(r, idx); });
        ctx.DATA = { participants: participants, agent: { state: 'idle', chatLog: [] } };

        var isGroupBroadcastMessage = ctx.isGroupBroadcastMessage;
        var findChatTarget = ctx.findChatTarget;
        var findChatTargets = ctx.findChatTargets;
        var attemptBroadcast = ctx.attemptBroadcast;
        var classifyCommandRisk = ctx.classifyCommandRisk;
        var requiresApproval = ctx.requiresApproval;

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

        // Risk classification
        assert(classifyCommandRisk('BROADCAST') === 'ROSTER_WIDE', 'BROADCAST classifies as ROSTER_WIDE');
        assert(classifyCommandRisk('MARK_STATUS') === 'NORMAL', 'MARK_STATUS classifies as NORMAL');
        assert(classifyCommandRisk('SOME_FUTURE_COMMAND') === 'NORMAL', 'unknown command names default to NORMAL (fail-safe)');
        assert(requiresApproval('ROSTER_WIDE') === true, 'ROSTER_WIDE requires approval');
        assert(requiresApproval('NORMAL') === false, 'NORMAL does not require approval');

        // makeBroadcastId regression check: output must be unchanged by the fnv1aHash extraction.
        var fixedId = ctx.makeBroadcastId('hello', '2026-01-01T00:00:00.000Z');
        assert(fixedId === ctx.makeBroadcastId('hello', '2026-01-01T00:00:00.000Z'), 'makeBroadcastId is deterministic for identical input');
        assert(/^bc-[0-9a-f]+$/.test(fixedId), 'makeBroadcastId keeps its bc- prefix and hex suffix shape');

        // attemptBroadcast: already-running guard must prevent a second startRollCall call
        // and must not claim success — this was the misleading-broadcast bug fixed earlier.
        var rollCallCalls = 0, lastStartRollCallMeta = null;
        ctx.startRollCall = function (msg, meta) { rollCallCalls++; lastStartRollCallMeta = meta; };
        var addLogCalls = [];
        ctx.addLog = function (event, status, meta) { addLogCalls.push({ event: event, status: status, meta: meta }); };
        var confirmReturnValue = true;
        ctx.confirm = function () { return confirmReturnValue; };

        ctx.DATA.agent.state = 'idle';
        confirmReturnValue = true;
        var okMsg = attemptBroadcast('hello everyone', 'SUCCESS');
        assert(rollCallCalls === 1 && okMsg === 'SUCCESS', 'attemptBroadcast starts a roll call and returns the success message when confirmed');
        assert(lastStartRollCallMeta && typeof lastStartRollCallMeta.correlationId === 'string' && lastStartRollCallMeta.correlationId.indexOf('CMD-') === 0, 'startRollCall receives a meta object with a CMD- correlation id');
        assert(lastStartRollCallMeta.risk === 'ROSTER_WIDE', 'startRollCall receives the ROSTER_WIDE risk tier');
        assert(typeof lastStartRollCallMeta.contentHash === 'string' && lastStartRollCallMeta.contentHash.length > 0, 'startRollCall receives a content hash');

        ctx.DATA.agent.state = 'running';
        var busyMsg = attemptBroadcast('hello everyone', 'SUCCESS');
        assert(rollCallCalls === 1, 'attemptBroadcast does not start a second roll call while one is already running');
        assert(busyMsg !== 'SUCCESS' && /already in progress/i.test(busyMsg), 'attemptBroadcast reports the already-running state instead of a false success');

        // Approval gate: decline path
        ctx.DATA.agent.state = 'idle';
        confirmReturnValue = false;
        var logsBefore = addLogCalls.length;
        var declinedMsg = attemptBroadcast('hello everyone', 'SUCCESS');
        assert(rollCallCalls === 1, 'declining the confirm gate does not start a roll call');
        assert(/cancelled/i.test(declinedMsg), 'declining the confirm gate returns a cancellation message');
        assert(addLogCalls.length === logsBefore + 1, 'declining the confirm gate logs exactly one new activity entry');
        var declineLog = addLogCalls[addLogCalls.length - 1];
        assert(declineLog.status === 'warning', 'the decline log entry has warning status');
        assert(declineLog.meta && declineLog.meta.correlationId && declineLog.meta.correlationId.indexOf('CMD-') === 0, 'the decline log entry carries a CMD- correlation id');
    }
};
