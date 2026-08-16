'use strict';

module.exports = {
    modules: ['app/util.js', 'persona/identity.js', 'communication/roll-call.js', 'persona/chat-persona.js'],
    run: function (ctx, assert) {
        var participant = { serviceMemberId: 'ATA-VEX-000', callsign: '@VEX', role: 'Viral Hooks Specialist', readiness: 'MISSION_READY', missionProfile: {} };
        ctx.DATA = { participants: [participant], runtimeCanary: { executions: [{ executionId: 'EXEC-1', targetServiceMemberId: 'ATA-VEX-000', runtimeVerified: true, independentVerification: 'RUNTIME_VERIFIED' }] } };

        ctx.governanceGateState = function () { return { complete: false }; };
        var pending = ctx.canonicalStatusFields(participant);
        assert(pending.runtimeVerification === 'RUNTIME_VERIFIED', 'individual runtime verification is reported independently of the global gate');
        assert(pending.productionVerification === 'PENDING_GLOBAL_GATE', 'production verification remains pending while the global gate is HOLD');
        assert(pending.gateDecision === 'HOLD', 'incomplete global gate reports HOLD');
        var pendingText = ctx.chatMissionAnswer(participant, '@VEX status');
        assert(/Runtime Verification: RUNTIME_VERIFIED/.test(pendingText), 'Agent Chat reports the verified runtime evidence');
        assert(/Production Verification: PENDING_GLOBAL_GATE/.test(pendingText), 'Agent Chat does not mislabel a gate hold as NOT_RUNTIME_VERIFIED');

        ctx.governanceGateState = function () { return { complete: true }; };
        var complete = ctx.canonicalStatusFields(participant);
        assert(complete.runtimeVerification === 'RUNTIME_VERIFIED', 'runtime verification stays verified after the global gate passes');
        assert(complete.productionVerification === 'PRODUCTION_VERIFIED', 'verified identity plus complete global gate reports PRODUCTION_VERIFIED');
        assert(complete.gateDecision === 'PASS', 'complete global gate reports PASS');
    }
};
