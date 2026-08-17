'use strict';
// tests/app.charts.test.js
module.exports = {
    modules: ['app/charts.js'],
    run: function (ctx, assert) {
        var computeMessageActivity = ctx.computeMessageActivity;

        ctx.DATA = { conversations: [] };
        var empty = computeMessageActivity();
        assert(empty.length === 12, 'computeMessageActivity always returns 12 two-hour buckets, even with zero messages');
        assert(empty.every(function (b) { return b.count === 0; }), 'zero messages produces genuine all-zero buckets, not fabricated placeholder counts');
        assert(empty[0].hour === '00:00' && empty[11].hour === '22:00', 'buckets cover the full 24h day in 2h increments, 00:00 through 22:00');

        // Real messages at known hours must land in the correct bucket, from real timestamps.
        // Built from local Date construction (matching computeMessageActivity's own getHours()
        // use — the correct choice for a real user's dashboard, local time not UTC) rather than
        // fixed UTC ISO strings, so this test is not itself timezone-dependent.
        function localIso(hour, minute) {
            var d = new Date(); d.setHours(hour, minute, 0, 0); return d.toISOString();
        }
        var sameHourBucketIdx = Math.floor(9 / 2);
        var lateHourBucketIdx = Math.floor(23 / 2);
        ctx.DATA = {
            conversations: [
                { messagesList: [
                    { role: 'user', text: 'a', time: localIso(9, 15) },
                    { role: 'user', text: 'b', time: localIso(9, 45) },
                    { role: 'user', text: 'c', time: localIso(23, 0) },
                    { role: 'user', text: 'd', time: 'not-a-real-date' },           // invalid, must be skipped, not crash
                    { role: 'user', text: 'e' }                                     // missing time entirely, must be skipped
                ] },
                { messagesList: [
                    { role: 'user', text: 'f', time: localIso(9, 5) }               // same hour, different conversation
                ] }
            ]
        };
        var real = computeMessageActivity();
        assert(real[sameHourBucketIdx].count === 3, 'three real messages in the same local hour, across two conversations, aggregate into the same real bucket (got ' + real[sameHourBucketIdx].count + ')');
        assert(real[lateHourBucketIdx].count === 1, 'a real message at a late hour lands in the correct bucket (got ' + real[lateHourBucketIdx].count + ')');
        var totalCounted = real.reduce(function (a, b) { return a + b.count; }, 0);
        assert(totalCounted === 4, 'invalid/missing timestamps are silently skipped, not counted or crashed on (got ' + totalCounted + ', expected 4 of the 6 real+invalid entries)');
    }
};
