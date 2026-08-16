'use strict';
// Benchmarks real API latency and batch reliability at 1, 10, and 66 concurrent requests
// (66 = the actual canonical roster size, not an arbitrary round number — this is the real
// concurrency the roster-wide individual-verification and knowledge-path sync features can
// produce). Same ephemeral-port-plus-teardown pattern as smoke.js/e2e.js.
const net    = require('net');
const crypto = require('crypto');

function freePort() {
    return new Promise((res, rej) => {
        const s = net.createServer();
        s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
        s.on('error', rej);
    });
}

function timedReq(opts, body) {
    const http = require('http');
    const t0 = process.hrtime.bigint();
    return new Promise((res) => {
        const r = http.request(opts, (resp) => {
            let d = '';
            resp.on('data', (c) => { d += c; });
            resp.on('end', () => {
                const ms = Number(process.hrtime.bigint() - t0) / 1e6;
                res({ ok: resp.statusCode >= 200 && resp.statusCode < 300, status: resp.statusCode, ms });
            });
        });
        r.on('error', () => {
            const ms = Number(process.hrtime.bigint() - t0) / 1e6;
            res({ ok: false, status: 0, ms });
        });
        if (body) r.write(body);
        r.end();
    });
}

function percentile(sortedMs, p) {
    if (!sortedMs.length) return 0;
    const idx = Math.min(sortedMs.length - 1, Math.ceil((p / 100) * sortedMs.length) - 1);
    return sortedMs[Math.max(0, idx)];
}

async function runBatch(label, batchSize, buildRequest) {
    const results = await Promise.all(Array.from({ length: batchSize }, () => buildRequest()));
    const succeeded = results.filter((r) => r.ok);
    const rateLimited = results.filter((r) => r.status === 429);
    // A 429 here is the rate limiter correctly doing its job under concurrent load, not an
    // infra failure — only a genuine error (network failure or 5xx) counts as a real failure.
    const failed = results.filter((r) => !r.ok && r.status !== 429);
    const sortedMs = results.map((r) => r.ms).sort((a, b) => a - b);
    const summary = {
        label, batchSize,
        succeeded: succeeded.length, rateLimited: rateLimited.length, failed: failed.length,
        p50Ms: Math.round(percentile(sortedMs, 50) * 10) / 10,
        p95Ms: Math.round(percentile(sortedMs, 95) * 10) / 10,
        maxMs: Math.round(sortedMs[sortedMs.length - 1] * 10) / 10
    };
    console.log(
        '  ' + label.padEnd(28) + ' n=' + String(batchSize).padStart(2) +
        '  ok=' + String(summary.succeeded).padStart(2) + '/' + batchSize +
        (rateLimited.length ? '  429=' + rateLimited.length : '') +
        '  p50=' + summary.p50Ms.toFixed(1).padStart(7) + 'ms' +
        '  p95=' + summary.p95Ms.toFixed(1).padStart(7) + 'ms' +
        '  max=' + summary.maxMs.toFixed(1).padStart(7) + 'ms'
    );
    if (failed.length) console.log('    ' + failed.length + ' genuine failure(s) (statuses: ' + failed.map((f) => f.status).join(', ') + ')');
    return summary;
}

async function main() {
    const port = await freePort();
    process.env.PORT = String(port);
    process.env.SIGNING_SECRET = 'benchmark-' + crypto.randomBytes(8).toString('hex');
    require('../server');
    await new Promise((r) => setTimeout(r, 250));

    const { getDb } = require('../db/database');
    const { hashToken } = require('../middleware/auth');
    const token = 'bench-' + crypto.randomBytes(20).toString('hex');
    const db = getDb();
    db.prepare('INSERT INTO tokens (token_hash, description) VALUES (?, ?)').run(hashToken(token), 'benchmark-temp');

    const base = { hostname: '127.0.0.1', port };
    const BATCH_SIZES = [1, 10, 66];
    const allResults = [];

    console.log('== CARC runtime benchmark ==');
    console.log('Port: ' + port + ' (ephemeral, this run only)\n');

    console.log('Read endpoint: GET /health (no auth, representative of a cheap status check)');
    for (const n of BATCH_SIZES) {
        allResults.push(await runBatch('GET /health', n, () =>
            timedReq({ ...base, path: '/health', method: 'GET' })));
    }

    // The read section above can consume most of the 60-req/min budget on its own (batch-66
    // alone is more than the whole budget) — without a cooldown, the write section would start
    // already rate-limited and its latency numbers would be meaningless. 61s clears the window.
    console.log('\nWaiting 61s for the rate-limit window to clear before the write benchmark...');
    await new Promise((r) => setTimeout(r, 61000));

    console.log('\nWrite endpoint: POST /api/knowledge-path/sync (auth + DB upsert, representative of a real sync)');
    for (const n of BATCH_SIZES) {
        allResults.push(await runBatch('POST /api/knowledge-path/sync', n, () => {
            const id = 'BENCH-' + crypto.randomBytes(8).toString('hex');
            const body = JSON.stringify({ records: [{ evidenceEventId: id, serviceMemberId: 'ATA-BENCH-000', stageId: 'competencies', status: 'PENDING', at: new Date().toISOString() }] });
            return timedReq({ ...base, path: '/api/knowledge-path/sync', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Content-Length': Buffer.byteLength(body) } }, body);
        }));
    }

    db.prepare("DELETE FROM knowledge_path_events WHERE id LIKE 'BENCH-%'").run();
    db.prepare('DELETE FROM tokens WHERE description = ?').run('benchmark-temp');

    console.log('\n== Summary (JSON) ==');
    console.log(JSON.stringify(allResults, null, 2));

    const anyRateLimited = allResults.some((r) => r.rateLimited > 0);
    if (anyRateLimited) {
        console.log('\nNote: batch-size-66 runs hit the 60-req/min rate limiter (by design — it protects');
        console.log('the API from abuse). This is exactly why the real roster-wide individual-verification');
        console.log('feature (runAndSubmitAllIndividualCanaries) runs its 66 requests sequentially with a');
        console.log('1.1s delay between each rather than firing them concurrently.');
    }
    const anyFailed = allResults.some((r) => r.failed > 0);
    process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
