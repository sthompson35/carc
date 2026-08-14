'use strict';
// tests/app.activity-log.test.js

module.exports = {
    modules: ['app/util.js', 'app/activity-log.js'],
    run: function (ctx, assert) {
        ctx.DATA = { activityLog: [] };
        var addLog = ctx.addLog;

        addLog('legacy 2-arg event', 'info');
        var e1 = ctx.DATA.activityLog[0];
        assert(e1.event === 'legacy 2-arg event' && e1.status === 'info', '2-arg addLog still works (backward compatible)');
        assert(!('correlationId' in e1) && !('risk' in e1) && !('contentHash' in e1), '2-arg addLog does not add meta fields');

        addLog('governed command', 'warning', { correlationId: 'CMD-TEST-1', risk: 'ROSTER_WIDE', contentHash: 'abc123' });
        var e2 = ctx.DATA.activityLog[0];
        assert(e2.correlationId === 'CMD-TEST-1', '3-arg addLog stores correlationId');
        assert(e2.risk === 'ROSTER_WIDE', '3-arg addLog stores risk');
        assert(e2.contentHash === 'abc123', '3-arg addLog stores contentHash');

        addLog('partial meta', 'info', { correlationId: 'CMD-TEST-2' });
        var e3 = ctx.DATA.activityLog[0];
        assert(e3.correlationId === 'CMD-TEST-2' && !('risk' in e3), 'meta fields are added independently, not all-or-nothing');
    }
};
