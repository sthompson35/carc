'use strict';
// tests/app.util.test.js

module.exports = {
    modules: ['app/util.js'],
    run: function (ctx, assert) {
        var fnv1aHash = ctx.fnv1aHash;
        assert(typeof fnv1aHash('abc') === 'string', 'fnv1aHash returns a string');
        assert(/^[0-9a-f]+$/.test(fnv1aHash('abc')), 'fnv1aHash output is lowercase hex');
        assert(fnv1aHash('abc') === fnv1aHash('abc'), 'fnv1aHash is deterministic for identical input');
        assert(fnv1aHash('abc') !== fnv1aHash('abd'), 'fnv1aHash differs for different input');
        assert(fnv1aHash('') === fnv1aHash(''), 'fnv1aHash handles empty string without throwing');
        assert(fnv1aHash(null) === fnv1aHash(''), 'fnv1aHash treats null like empty string (String(str||\'\') coercion)');

        var d = { agent:{state:'running'}, runtimeCanary:{batchVerification:{status:'RUNNING',current:'@ADAM'}} };
        assert(ctx.recoverInterruptedClientState(d,'2026-08-16T00:00:00.000Z') === true, 'interrupted browser operations are detected');
        assert(d.agent.state === 'idle', 'stale roll-call lock is released');
        assert(d.runtimeCanary.batchVerification.status === 'INTERRUPTED' && d.runtimeCanary.batchVerification.current === null, 'stale verification batch is marked interrupted');
        assert(d.runtimeCanary.batchVerification.finishedAt === '2026-08-16T00:00:00.000Z' && /interrupted/i.test(d.runtimeCanary.batchVerification.error), 'interruption evidence is retained');
        assert(ctx.recoverInterruptedClientState(d,'later') === false, 'interruption recovery is idempotent');
    }
};
