'use strict';
// Full end-to-end test: starts server, exercises real auth + canary verification flow, tears down.
const net    = require('net');
const crypto = require('crypto');

function freePort() {
    return new Promise((res, rej) => {
        const s = net.createServer();
        s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
        s.on('error', rej);
    });
}

function req(opts, body) {
    const http = require('http');
    return new Promise((res, rej) => {
        const r = http.request(opts, resp => {
            let d = '';
            resp.on('data', c => d += c);
            resp.on('end', () => res({ status: resp.statusCode, body: d, json: () => JSON.parse(d) }));
        });
        r.on('error', rej);
        if (body) r.write(body);
        r.end();
    });
}

function authReq(port, path, method, token, body) {
    return req({
        hostname: 'localhost', port, path, method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    }, body ? JSON.stringify(body) : undefined);
}

async function run() {
    const port = await freePort();
    process.env.PORT = String(port);
    process.env.SIGNING_SECRET = 'e2e-test-secret-' + crypto.randomBytes(8).toString('hex');
    require('../server');
    await new Promise(r => setTimeout(r, 250));

    const base = { hostname: 'localhost', port };
    let t, data, pass = 0, fail = 0;

    function assert(cond, label) {
        if (cond) { console.log('  PASS  ' + label); pass++; }
        else       { console.error('  FAIL  ' + label); fail++; }
    }

    // ── create a temporary token directly in the DB ──────────────
    const { getDb, hashToken } = (() => {
        const { getDb } = require('../db/database');
        const { hashToken } = require('../middleware/auth');
        return { getDb, hashToken };
    })();
    const tmpToken  = 'e2e-' + crypto.randomBytes(20).toString('hex');
    const tmpHash   = hashToken(tmpToken);
    const db = getDb();
    const ins = db.prepare('INSERT INTO tokens (token_hash, description) VALUES (?, ?)').run(tmpHash, 'e2e-temp');
    const tmpId = ins.lastInsertRowid;
    console.log('\n[E2E] Temporary token created (id=' + tmpId + ')');

    // ── 1. health ────────────────────────────────────────────────
    console.log('\n[1] Health');
    t = await req({ ...base, path: '/health', method: 'GET' });
    data = t.json();
    assert(t.status === 200 && data.status === 'OK', 'GET /health → 200 OK');

    // ── 2. stats (auth) ──────────────────────────────────────────
    console.log('\n[2] Stats');
    t = await authReq(port, '/api/stats', 'GET', tmpToken);
    data = t.json();
    assert(t.status === 200 && typeof data.total === 'number', 'GET /api/stats → 200, has total');
    const statsBefore = data.total;
    console.log('     total verifications before: ' + statsBefore);

    // ── 3. submit canary evidence → VERIFIED ────────────────────
    console.log('\n[3] Submit canary evidence (should VERIFY)');
    const execId = 'E2E-EXEC-' + Date.now();
    const evidId = 'E2E-EVID-' + Date.now();
    t = await authReq(port, '/', 'POST', tmpToken, {
        executionId:     execId,
        evidenceId:      evidId,
        serviceMemberId: 'ATA-VEX-000',
        capturedAt:      new Date().toISOString(),
        source:          'CARC_LOCAL_CANARY',
        authorization:   'PASS',
        executionResult: 'LOCAL_CANARY_COMPLETE'
    });
    data = t.json();
    assert(t.status === 200,            'POST / → 200');
    assert(data.verified === true,      'verified: true');
    assert(!!data.verifierId,           'verifierId present');
    assert(!!data.signature,            'HMAC signature present (SIGNING_SECRET active)');
    assert(data.executionId === execId, 'executionId echoed');
    console.log('     verifierId: ' + data.verifierId);
    console.log('     signature:  ' + (data.signature || '—'));

    // ── 4. duplicate execution → already verified ────────────────
    console.log('\n[4] Re-submit same executionId (dedup check)');
    t = await authReq(port, '/', 'POST', tmpToken, {
        executionId: execId, evidenceId: evidId,
        serviceMemberId: 'ATA-VEX-000', capturedAt: new Date().toISOString(),
        source: 'CARC_LOCAL_CANARY', authorization: 'PASS', executionResult: 'LOCAL_CANARY_COMPLETE'
    });
    data = t.json();
    assert(data.reason === 'ALREADY_VERIFIED', 'dedup: reason=ALREADY_VERIFIED');

    // ── 5. submit BLOCKED evidence → REJECTED ───────────────────
    console.log('\n[5] Submit blocked authorization (should REJECT)');
    t = await authReq(port, '/', 'POST', tmpToken, {
        executionId:     'E2E-BLOCKED-' + Date.now(),
        evidenceId:      'E2E-EVID-BLOCKED',
        serviceMemberId: 'ATA-VEX-000',
        capturedAt:      new Date().toISOString(),
        source:          'CARC_LOCAL_CANARY',
        authorization:   'FAIL',
        executionResult: 'BLOCKED'
    });
    data = t.json();
    assert(data.verified === false,                    'verified: false for blocked canary');
    assert(data.reason === 'LOCAL_CANARY_AUTHORIZATION_FAIL', 'correct rejection reason');

    // ── 6. stats after ──────────────────────────────────────────
    console.log('\n[6] Stats after');
    t = await authReq(port, '/api/stats', 'GET', tmpToken);
    data = t.json();
    assert(data.total === statsBefore + 2,  'total increased by 2');
    assert(data.verified >= 1,              'verified count ≥ 1');
    assert(data.rejected >= 1,              'rejected count ≥ 1');
    console.log('     passRate: ' + data.passRate + '%');

    // ── 7. verifications list ────────────────────────────────────
    console.log('\n[7] List verifications');
    t = await authReq(port, '/api/verifications?limit=5', 'GET', tmpToken);
    data = t.json();
    assert(Array.isArray(data.rows) && data.rows.length > 0, 'rows returned');

    // ── 8. verification detail ───────────────────────────────────
    console.log('\n[8] Verification detail');
    const firstId = data.rows[0].id;
    t = await authReq(port, '/api/verifications/' + firstId, 'GET', tmpToken);
    data = t.json();
    assert(data.id === firstId, 'correct id returned');
    assert('execution_id' in data, 'full record returned');

    // ── 9. token management ──────────────────────────────────────
    console.log('\n[9] Token management');
    t = await authReq(port, '/api/tokens', 'GET', tmpToken);
    data = t.json();
    assert(Array.isArray(data.tokens), 'tokens array returned');
    const activeCount = data.tokens.filter(t => t.active).length;
    console.log('     active tokens: ' + activeCount);

    // create a new token via API
    t = await authReq(port, '/api/tokens', 'POST', tmpToken, { description: 'e2e-api-created' });
    data = t.json();
    assert(t.status === 201,        'POST /api/tokens → 201');
    assert(data.token.startsWith('carc-'), 'token has carc- prefix');
    const newId = data.id;

    // revoke the new token
    t = await authReq(port, '/api/tokens/' + newId, 'DELETE', tmpToken);
    data = t.json();
    assert(data.revoked === true, 'DELETE /api/tokens/:id → revoked');

    // ── 10. roster sync round-trip ────────────────────────────────
    console.log('\n[10] Roster sync round-trip');
    const rosterId = 'E2E-ROSTER-' + Date.now();
    db.prepare(`
        INSERT INTO roster (service_member_id, callsign, display_name, kind, agent_id, role, command, readiness, canonical_status, updated_at)
        VALUES (?, '@E2E', 'E2E Test', 'bot', ?, 'E2E Role', 'E2E Command', 'READINESS_UNKNOWN', 'CANONICAL_RECONCILED', datetime('now'))
    `).run(rosterId, rosterId);

    t = await authReq(port, '/api/roster/sync', 'POST', tmpToken, {
        records: [{ serviceMemberId: rosterId, status: 'active', readiness: 'MISSION_READY', missionProfile: { mission: 'e2e drill' } }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1, 'POST /api/roster/sync → 1 record matched');

    t = await authReq(port, '/api/roster/' + rosterId, 'GET', tmpToken);
    data = t.json();
    assert(data.readiness === 'MISSION_READY', 'GET /api/roster/:id reflects synced readiness');
    assert(data.missionProfile && data.missionProfile.mission === 'e2e drill', 'missionProfile round-trips as JSON');

    t = await authReq(port, '/api/readiness', 'GET', tmpToken);
    data = t.json();
    const readyBucket = (data.byReadiness || []).find(r => r.readiness === 'MISSION_READY');
    assert(!!readyBucket && readyBucket.n >= 1, 'GET /api/readiness counts the synced record');

    t = await authReq(port, '/api/readiness/history?days=1', 'GET', tmpToken);
    data = t.json();
    const historyHit = (data.rows || []).find(r => r.readiness === 'MISSION_READY');
    assert(!!historyHit && historyHit.n >= 1, 'GET /api/readiness/history recorded the sync event');

    // idempotency: resubmitting the identical payload must not mutate state or grow history
    const historyCountBefore = db.prepare('SELECT COUNT(*) AS n FROM readiness_history WHERE service_member_id = ?').get(rosterId).n;
    t = await authReq(port, '/api/roster/sync', 'POST', tmpToken, {
        records: [{ serviceMemberId: rosterId, status: 'active', readiness: 'MISSION_READY', missionProfile: { mission: 'e2e drill' } }]
    });
    data = t.json();
    assert(t.status === 200 && data.updated === 0 && data.unchanged === 1, 'repeat roster sync → 0 updated, 1 unchanged (idempotent)');
    const historyCountAfter = db.prepare('SELECT COUNT(*) AS n FROM readiness_history WHERE service_member_id = ?').get(rosterId).n;
    assert(historyCountAfter === historyCountBefore, 'repeat roster sync does not grow readiness_history (' + historyCountAfter + ' === ' + historyCountBefore + ')');

    // unmatched: a serviceMemberId not in roster should be reported, not silently dropped
    t = await authReq(port, '/api/roster/sync', 'POST', tmpToken, {
        records: [{ serviceMemberId: 'E2E-DOES-NOT-EXIST', status: 'active', readiness: 'MISSION_READY' }]
    });
    data = t.json();
    assert(data.unmatched === 1 && data.synced === 0, 'sync of unknown serviceMemberId reports unmatched:1');

    db.prepare('DELETE FROM roster WHERE service_member_id = ?').run(rosterId);
    db.prepare('DELETE FROM readiness_history WHERE service_member_id = ?').run(rosterId);
    console.log('     roster test record cleaned up');

    // ── 11. roll call sync round-trip ──────────────────────────────
    console.log('\n[11] Roll call sync round-trip');
    const rcId = 'E2E-RC-' + Date.now();
    t = await authReq(port, '/api/roll-calls/sync', 'POST', tmpToken, {
        records: [{ id: rcId, date: new Date().toISOString(), conv: 'E2E Roll Call', present: 9, total: 12, rate: 75, status: 'completed', message: 'e2e drill', responseMode: 'LOCAL_RULE_ENGINE' }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1, 'POST /api/roll-calls/sync → 1 record synced');

    t = await authReq(port, '/api/roll-calls?limit=100', 'GET', tmpToken);
    data = t.json();
    const rcRow = (data.rows || []).find(r => r.id === rcId);
    assert(!!rcRow && rcRow.rate === 75, 'GET /api/roll-calls reflects synced record');

    t = await authReq(port, '/api/roll-calls/stats', 'GET', tmpToken);
    data = t.json();
    assert(data.total >= 1 && typeof data.avgRate === 'number', 'GET /api/roll-calls/stats returns aggregate');

    // idempotency: resubmitting the identical roll call must not mutate the row
    t = await authReq(port, '/api/roll-calls/sync', 'POST', tmpToken, {
        records: [{ id: rcId, date: rcRow.date, conv: 'E2E Roll Call', present: 9, total: 12, rate: 75, status: 'completed', message: 'e2e drill', responseMode: 'LOCAL_RULE_ENGINE' }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 0 && data.unchanged === 1, 'repeat roll-call sync → 0 inserted, 0 updated, 1 unchanged (idempotent)');
    const rcCountAfter = db.prepare('SELECT COUNT(*) AS n FROM roll_calls WHERE id = ?').get(rcId).n;
    assert(rcCountAfter === 1, 'repeat roll-call sync does not duplicate the row');

    // ── 12. sync audit trail ───────────────────────────────────────
    console.log('\n[12] Sync audit trail');
    t = await authReq(port, '/api/sync-events?limit=50', 'GET', tmpToken);
    data = t.json();
    const rosterEvents = (data.rows || []).filter(r => r.syncType === 'roster');
    const rcEvents = (data.rows || []).filter(r => r.syncType === 'roll_calls');
    assert(rosterEvents.length >= 3, 'roster sync events recorded (initial + repeat + unmatched)');
    assert(rcEvents.length >= 2, 'roll-call sync events recorded (initial + repeat)');
    assert(rosterEvents.every(r => r.result === 'success' || r.errorMessage), 'every event has a result and, if error, a message');
    const lastRosterEvent = rosterEvents[0];
    assert(lastRosterEvent.initiator === 'manual', 'default initiator is "manual" when not specified');

    t = await authReq(port, '/api/sync-events/status', 'GET', tmpToken);
    data = t.json();
    assert(!!data.roster && !!data.roll_calls, 'GET /api/sync-events/status returns last event per sync type');
    assert(typeof data.roster.durationMs === 'number', 'audit event records duration');

    // auto initiator is honored end-to-end
    t = await authReq(port, '/api/roll-calls/sync', 'POST', tmpToken, {
        initiator: 'auto',
        records: [{ id: rcId, date: rcRow.date, conv: 'E2E Roll Call', present: 9, total: 12, rate: 75, status: 'completed', message: 'e2e drill', responseMode: 'LOCAL_RULE_ENGINE' }]
    });
    assert(t.status === 200, 'auto-initiated sync accepted');
    t = await authReq(port, '/api/sync-events/status', 'GET', tmpToken);
    data = t.json();
    assert(data.roll_calls.initiator === 'auto', 'sync-events/status reflects the auto initiator');

    db.prepare('DELETE FROM roll_calls WHERE id = ?').run(rcId);
    console.log('     roll call test record cleaned up (sync_events audit rows intentionally left — append-only trail)');

    // ── 13. revoke temp token; confirm 403 ───────────────────────
    console.log('\n[13] Revoke temp token → confirm 403');
    db.prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(tmpId);
    t = await authReq(port, '/api/stats', 'GET', tmpToken);
    assert(t.status === 403, 'revoked token → 403');

    // ── summary ──────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('  E2E complete: ' + pass + ' passed, ' + fail + ' failed');
    console.log('══════════════════════════════════════════\n');
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
