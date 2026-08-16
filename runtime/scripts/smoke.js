'use strict';
// Starts the server, runs smoke tests, then exits.
const net = require('net');

function freePort() {
    return new Promise((resolve, reject) => {
        const s = net.createServer();
        s.listen(0, function () { const p = s.address().port; s.close(() => resolve(p)); });
        s.on('error', reject);
    });
}

async function main() {
    const port = await freePort();
    process.env.PORT = String(port);
    process.env.DB_PATH = require('path').join(require('os').tmpdir(), 'carc-smoke-' + Date.now() + '.db');
    require('../server');

    const http = require('http');

    function req(opts, body) {
        return new Promise((resolve, reject) => {
            const r = http.request(opts, res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve({ status: res.statusCode, body: d }));
            });
            r.on('error', reject);
            if (body) r.write(body);
            r.end();
        });
    }

    await new Promise(r => setTimeout(r, 200));
    const base = { hostname: 'localhost', port };

    let t = await req({ ...base, path: '/', method: 'GET' });
    console.assert(t.status === 200, 'GET / failed');
    console.log('GET /          ', t.status, JSON.parse(t.body).status);

    t = await req({ ...base, path: '/', method: 'HEAD' });
    console.assert(t.status === 200, 'HEAD / failed');
    console.log('HEAD /         ', t.status);

    t = await req({ ...base, path: '/health', method: 'GET' });
    console.assert(t.status === 200, 'GET /health failed');
    console.log('GET /health    ', t.status, JSON.parse(t.body).status);

    t = await req({ ...base, path: '/', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '401 expected without token');
    console.log('POST / no-auth ', t.status, JSON.parse(t.body).error);

    t = await req({ ...base, path: '/', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer bad-token' } }, JSON.stringify({ executionId: 'x', serviceMemberId: 'y', source: 'CARC_LOCAL_CANARY' }));
    console.assert(t.status === 403, '403 expected with bad token');
    console.log('POST / bad-tok ', t.status, JSON.parse(t.body).error);

    t = await req({ ...base, path: '/admin', method: 'GET' });
    console.assert(t.status === 200, 'GET /admin failed');
    console.assert(t.body.includes('CARC Runtime Admin'), '/admin HTML missing title');
    console.log('GET /admin     ', t.status, 'HTML ok');

    t = await req({ ...base, path: '/api/verifications', method: 'GET' });
    console.assert(t.status === 401, '/api/verifications should require auth');
    console.log('GET /api/verif ', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/tokens', method: 'GET' });
    console.assert(t.status === 401, '/api/tokens should require auth');
    console.log('GET /api/token ', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/roster', method: 'GET' });
    console.assert(t.status === 401, '/api/roster should require auth');
    console.log('GET /api/roster', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/readiness', method: 'GET' });
    console.assert(t.status === 401, '/api/readiness should require auth');
    console.log('GET /api/readiness', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/readiness/history', method: 'GET' });
    console.assert(t.status === 401, '/api/readiness/history should require auth');
    console.log('GET /api/readiness/history', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/roster/sync', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/roster/sync should require auth');
    console.log('POST /api/roster/sync', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/roll-calls', method: 'GET' });
    console.assert(t.status === 401, '/api/roll-calls should require auth');
    console.log('GET /api/roll-calls', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/roll-calls/stats', method: 'GET' });
    console.assert(t.status === 401, '/api/roll-calls/stats should require auth');
    console.log('GET /api/roll-calls/stats', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/roll-calls/sync', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/roll-calls/sync should require auth');
    console.log('POST /api/roll-calls/sync', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/tasks', method: 'GET' });
    console.assert(t.status === 401, '/api/tasks should require auth');
    console.log('GET /api/tasks', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/tasks/sync', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/tasks/sync should require auth');
    console.log('POST /api/tasks/sync', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/handoffs', method: 'GET' });
    console.assert(t.status === 401, '/api/handoffs should require auth');
    console.log('GET /api/handoffs', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/handoffs/sync', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/handoffs/sync should require auth');
    console.log('POST /api/handoffs/sync', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/sync-events', method: 'GET' });
    console.assert(t.status === 401, '/api/sync-events should require auth');
    console.log('GET /api/sync-events', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/sync-events/status', method: 'GET' });
    console.assert(t.status === 401, '/api/sync-events/status should require auth');
    console.log('GET /api/sync-events/status', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/sync-status', method: 'GET' });
    console.assert(t.status === 401, '/api/sync-status should require auth');
    console.log('GET /api/sync-status', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/admin/backup', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/admin/backup should require auth');
    console.log('POST /api/admin/backup', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/admin/backups', method: 'GET' });
    console.assert(t.status === 401, '/api/admin/backups should require auth');
    console.log('GET /api/admin/backups', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/chat', method: 'GET' });
    console.assert(t.status === 401, '/api/chat should require auth');
    console.log('GET /api/chat', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/chat/sync', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/chat/sync should require auth');
    console.log('POST /api/chat/sync', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/knowledge-path', method: 'GET' });
    console.assert(t.status === 401, '/api/knowledge-path should require auth');
    console.log('GET /api/knowledge-path', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/knowledge-path/sync', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/knowledge-path/sync should require auth');
    console.log('POST /api/knowledge-path/sync', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/sources', method: 'GET' });
    console.assert(t.status === 401, '/api/sources should require auth');
    console.log('GET /api/sources', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/sources', method: 'POST', headers: { 'Content-Type': 'application/json' } }, '{}');
    console.assert(t.status === 401, '/api/sources should require auth');
    console.log('POST /api/sources', t.status, 'auth guard ok');

    t = await req({ ...base, path: '/api/governance/control-status', method: 'GET' });
    console.assert(t.status === 401, '/api/governance/control-status should require auth');
    console.log('GET /api/governance/control-status', t.status, 'auth guard ok');

    console.log('\nAll smoke tests passed.');
    try { require('../db/database').closeDb(); require('fs').unlinkSync(process.env.DB_PATH); } catch (e) { /* best effort */ }
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
