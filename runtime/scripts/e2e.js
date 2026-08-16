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
    // Isolated DB, not the real runtime/data/carc.db — sharing it let a real registered
    // source (from actual gate-verification work) collide with this suite's zero-state
    // assumptions. Every ephemeral-server script gets its own throwaway DB file now.
    process.env.DB_PATH = require('path').join(require('os').tmpdir(), 'carc-e2e-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.db');
    process.env.SIGNING_SECRET = 'e2e-test-secret-' + crypto.randomBytes(8).toString('hex');
    // This suite alone sends more requests per run than the production rate limit allows —
    // that's a property of exhaustively testing every route, not something a real user would
    // ever do in a minute. Raise it for this ephemeral instance only; production keeps the
    // real default (60) unless RATE_LIMIT_MAX is set, which benchmark.js deliberately doesn't.
    process.env.RATE_LIMIT_MAX = '1000';
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
    const ins = db.prepare('INSERT INTO tokens (token_hash, description, scope) VALUES (?, ?, ?)').run(tmpHash, 'e2e-temp', 'admin');
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
    assert(typeof data.executionId === 'string' && data.executionId.startsWith('SYNC-ROSTER-'), 'sync response carries an executionId');
    const rosterExecId = data.executionId;

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
    assert(typeof data.executionId === 'string' && data.executionId !== rosterExecId, 'roll-call sync gets its own distinct executionId');

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

    // executionId round-trips into the audit row itself, not just the response —
    // look it up by id rather than assuming recency, since later calls in this same
    // section (idempotent resync, unmatched-record test) also write roster events.
    t = await authReq(port, '/api/sync-events?type=roster&limit=50', 'GET', tmpToken);
    data = t.json();
    const matchingAuditRow = (data.rows || []).find(r => r.executionId === rosterExecId);
    assert(!!matchingAuditRow, 'the original roster sync\'s executionId is findable in the audit trail');

    db.prepare('DELETE FROM roll_calls WHERE id = ?').run(rcId);
    console.log('     roll call test record cleaned up (sync_events audit rows intentionally left — append-only trail)');

    // ── 13. chat sync round-trip ────────────────────────────────────
    console.log('\n[13] Chat sync round-trip');
    const msgId = 'E2E-MSG-' + Date.now();
    const msgAt = new Date().toISOString();
    t = await authReq(port, '/api/chat/sync', 'POST', tmpToken, {
        records: [{ id: msgId, role: 'user', text: 'e2e chat drill', occurredAt: msgAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1 && data.inserted === 1, 'POST /api/chat/sync → 1 record inserted');
    assert(typeof data.executionId === 'string' && data.executionId.startsWith('SYNC-CHAT-'), 'chat sync response carries a chat-scoped executionId');

    t = await authReq(port, '/api/chat?limit=100', 'GET', tmpToken);
    data = t.json();
    const chatRow = (data.rows || []).find(r => r.id === msgId);
    assert(!!chatRow && chatRow.text === 'e2e chat drill', 'GET /api/chat reflects the synced message');

    // idempotency: resubmitting the identical message must not mutate it
    t = await authReq(port, '/api/chat/sync', 'POST', tmpToken, {
        records: [{ id: msgId, role: 'user', text: 'e2e chat drill', occurredAt: msgAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 0 && data.unchanged === 1, 'repeat chat sync → 0 inserted, 0 updated, 1 unchanged (idempotent)');
    const chatCountAfter = db.prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE id = ?').get(msgId).n;
    assert(chatCountAfter === 1, 'repeat chat sync does not duplicate the row');

    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(msgId);
    console.log('     chat test record cleaned up');

    // ── 14. sync-status (server-authoritative CURRENT/STALE/UNSYNCED) ─
    console.log('\n[14] Sync status');
    t = await authReq(port, '/api/sync-status', 'GET', tmpToken);
    data = t.json();
    assert(data.roster && data.roster.state === 'CURRENT', 'fresh roster sync reports state=CURRENT (' + (data.roster && data.roster.state) + ')');
    assert(data.roll_calls && data.roll_calls.state === 'CURRENT', 'fresh roll-call sync reports state=CURRENT (' + (data.roll_calls && data.roll_calls.state) + ')');
    assert(data.chat && data.chat.state === 'CURRENT', 'fresh chat sync reports state=CURRENT (' + (data.chat && data.chat.state) + ')');
    assert(typeof data.staleThresholdMs === 'number', 'staleThresholdMs is reported (server policy, not client-derived)');

    // backdate the latest roster sync_events row past the threshold and confirm the server
    // (not any browser's local timer) is the one deciding staleness
    const oldTs = new Date(Date.now() - (data.staleThresholdMs + 60000)).toISOString();
    db.prepare('UPDATE sync_events SET started_at = ? WHERE id = (SELECT MAX(id) FROM sync_events WHERE sync_type = ?)').run(oldTs, 'roster');
    t = await authReq(port, '/api/sync-status', 'GET', tmpToken);
    data = t.json();
    assert(data.roster.state === 'STALE', 'backdating the latest roster sync past the threshold flips state to STALE (' + data.roster.state + ')');
    assert(data.roll_calls.state === 'CURRENT', 'roll_calls staleness is judged independently of roster (' + data.roll_calls.state + ')');

    // ── 15. admin backup ───────────────────────────────────────────
    console.log('\n[15] Admin backup');
    const fs = require('fs');
    const path = require('path');
    t = await authReq(port, '/api/admin/backup', 'POST', tmpToken, {});
    data = t.json();
    assert(t.status === 200 && typeof data.backupFile === 'string', 'POST /api/admin/backup → 200, returns a backupFile name');
    assert(typeof data.sizeBytes === 'number' && data.sizeBytes > 0, 'backup file has a real, non-zero size');
    const { DEFAULT_BACKUP_DIR } = require('../scripts/backup');
    const backupPath = path.join(DEFAULT_BACKUP_DIR, data.backupFile);
    assert(fs.existsSync(backupPath), 'the backup file actually exists on disk at ' + backupPath);

    const createdBackupFile = data.backupFile;
    t = await authReq(port, '/api/admin/backups', 'GET', tmpToken);
    data = t.json();
    assert(Array.isArray(data.backups) && data.backups.some(b => b.file === createdBackupFile), 'the just-created backup appears in GET /api/admin/backups');

    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    console.log('     e2e-created backup file cleaned up');

    // ── 16. command audit sync round-trip ──────────────────────────
    console.log('\n[16] Command audit sync round-trip');
    const cmdId = 'CMD-E2E-' + Date.now();
    const cmdAt = new Date().toISOString();
    t = await authReq(port, '/api/commands/sync', 'POST', tmpToken, {
        records: [{ id: cmdId, event: 'e2e command audit drill', status: 'warning', risk: 'ROSTER_WIDE', contentHash: 'deadbeef', occurredAt: cmdAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1 && data.inserted === 1, 'POST /api/commands/sync → 1 record inserted');
    assert(typeof data.executionId === 'string' && data.executionId.startsWith('SYNC-CHAT_COMMAND-'), 'command sync response carries a chat_command-scoped executionId');

    t = await authReq(port, '/api/commands?limit=100', 'GET', tmpToken);
    data = t.json();
    const cmdRow = (data.rows || []).find(r => r.id === cmdId);
    assert(!!cmdRow && cmdRow.risk === 'ROSTER_WIDE' && cmdRow.contentHash === 'deadbeef', 'GET /api/commands reflects the synced event');

    // schema-24 columns: richer verification-batch evidence (batchId/serviceMemberId/executionId/
    // verifierId/signature/outcome) must round-trip too, not just the original 5 fields.
    const cmdId2 = 'CMD-E2E-BATCH-' + Date.now();
    t = await authReq(port, '/api/commands/sync', 'POST', tmpToken, {
        records: [{ id: cmdId2, event: '@VEX external verification PASS', status: 'success', risk: 'ROSTER_WIDE', occurredAt: cmdAt, batchId: 'BATCH-E2E-1', serviceMemberId: 'ATA-VEX-000', executionId: 'EXEC-E2E-1', verifierId: 'EXTERNAL_VERIFIER', signature: 'sig-e2e', outcome: 'PASS' }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 1, 'POST /api/commands/sync accepts the schema-24 evidence columns');
    t = await authReq(port, '/api/commands?limit=100', 'GET', tmpToken);
    data = t.json();
    const cmdRow2 = (data.rows || []).find(r => r.id === cmdId2);
    assert(!!cmdRow2 && cmdRow2.batchId === 'BATCH-E2E-1' && cmdRow2.serviceMemberId === 'ATA-VEX-000' && cmdRow2.executionId === 'EXEC-E2E-1' && cmdRow2.verifierId === 'EXTERNAL_VERIFIER' && cmdRow2.signature === 'sig-e2e' && cmdRow2.outcome === 'PASS', 'GET /api/commands reflects all 6 batch-verification evidence columns');
    db.prepare('DELETE FROM command_audit_events WHERE id = ?').run(cmdId2);

    // idempotency: resubmitting the identical event must not mutate it
    t = await authReq(port, '/api/commands/sync', 'POST', tmpToken, {
        records: [{ id: cmdId, event: 'e2e command audit drill', status: 'warning', risk: 'ROSTER_WIDE', contentHash: 'deadbeef', occurredAt: cmdAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 0 && data.unchanged === 1, 'repeat command sync → 0 inserted, 0 updated, 1 unchanged (idempotent)');
    const cmdCountAfter = db.prepare('SELECT COUNT(*) AS n FROM command_audit_events WHERE id = ?').get(cmdId).n;
    assert(cmdCountAfter === 1, 'repeat command sync does not duplicate the row');

    t = await authReq(port, '/api/sync-events?type=chat_command', 'GET', tmpToken);
    data = t.json();
    assert(Array.isArray(data.rows) && data.rows.every(r => r.syncType === 'chat_command'), '/api/sync-events?type=chat_command returns only chat_command rows');
    assert(data.rows.length >= 2, '/api/sync-events?type=chat_command recorded both the initial and repeat sync');

    t = await authReq(port, '/api/sync-status', 'GET', tmpToken);
    data = t.json();
    assert(data.chat_command && data.chat_command.state === 'CURRENT', 'sync-status surfaces chat_command as CURRENT (' + (data.chat_command && data.chat_command.state) + ')');

    db.prepare('DELETE FROM command_audit_events WHERE id = ?').run(cmdId);
    console.log('     command audit test record cleaned up (sync_events audit rows intentionally left — append-only trail)');

    // ── 17. task + handoff sync round-trip ────────────────────────
    console.log('\n[17] Task + Handoff sync round-trip');
    const taskId = 'TASK-E2E-' + Date.now();
    const taskCreatedAt = new Date().toISOString();
    t = await authReq(port, '/api/tasks/sync', 'POST', tmpToken, {
        records: [{ taskId: taskId, ownerServiceMemberId: 'ATA-VEX-000', assignedByServiceMemberId: '', title: 'e2e task drill', description: '', sourceMissionTaskText: '', state: 'ASSIGNED', createdAt: taskCreatedAt, updatedAt: taskCreatedAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1 && data.inserted === 1, 'POST /api/tasks/sync → 1 record inserted');
    assert(typeof data.executionId === 'string' && data.executionId.startsWith('SYNC-TASKS-'), 'task sync response carries a tasks-scoped executionId');

    t = await authReq(port, '/api/tasks?limit=100', 'GET', tmpToken);
    data = t.json();
    const taskRow = (data.rows || []).find(r => r.taskId === taskId);
    assert(!!taskRow && taskRow.ownerServiceMemberId === 'ATA-VEX-000' && taskRow.state === 'ASSIGNED', 'GET /api/tasks reflects the synced record');

    // idempotency
    t = await authReq(port, '/api/tasks/sync', 'POST', tmpToken, {
        records: [{ taskId: taskId, ownerServiceMemberId: 'ATA-VEX-000', assignedByServiceMemberId: '', title: 'e2e task drill', description: '', sourceMissionTaskText: '', state: 'ASSIGNED', createdAt: taskCreatedAt, updatedAt: taskCreatedAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 0 && data.unchanged === 1, 'repeat task sync → 0 inserted, 0 updated, 1 unchanged (idempotent)');
    const taskCountAfter = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE id = ?').get(taskId).n;
    assert(taskCountAfter === 1, 'repeat task sync does not duplicate the row');

    // a real state transition round-trips as an update, not a phantom insert
    t = await authReq(port, '/api/tasks/sync', 'POST', tmpToken, {
        records: [{ taskId: taskId, ownerServiceMemberId: 'ATA-VEX-000', assignedByServiceMemberId: '', title: 'e2e task drill', description: '', sourceMissionTaskText: '', state: 'ACKNOWLEDGED', createdAt: taskCreatedAt, updatedAt: new Date().toISOString() }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 1, 'a real state transition syncs as an update');

    const handoffId = 'HANDOFF-E2E-' + Date.now();
    const handoffCreatedAt = new Date().toISOString();
    t = await authReq(port, '/api/handoffs/sync', 'POST', tmpToken, {
        records: [{ handoffId: handoffId, taskId: taskId, fromServiceMemberId: 'ATA-VEX-000', toServiceMemberId: 'ATA-MAPE-000', notes: 'e2e handoff drill', state: 'CREATED', createdAt: handoffCreatedAt, updatedAt: handoffCreatedAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1 && data.inserted === 1, 'POST /api/handoffs/sync → 1 record inserted');
    assert(typeof data.executionId === 'string' && data.executionId.startsWith('SYNC-HANDOFFS-'), 'handoff sync response carries a handoffs-scoped executionId');

    t = await authReq(port, '/api/handoffs?limit=100', 'GET', tmpToken);
    data = t.json();
    const handoffRow = (data.rows || []).find(r => r.handoffId === handoffId);
    assert(!!handoffRow && handoffRow.taskId === taskId && handoffRow.toServiceMemberId === 'ATA-MAPE-000', 'GET /api/handoffs reflects the synced record, including the linked taskId');

    t = await authReq(port, '/api/handoffs/sync', 'POST', tmpToken, {
        records: [{ handoffId: handoffId, taskId: taskId, fromServiceMemberId: 'ATA-VEX-000', toServiceMemberId: 'ATA-MAPE-000', notes: 'e2e handoff drill', state: 'CREATED', createdAt: handoffCreatedAt, updatedAt: handoffCreatedAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 0 && data.unchanged === 1, 'repeat handoff sync → 0 inserted, 0 updated, 1 unchanged (idempotent)');
    const handoffCountAfter = db.prepare('SELECT COUNT(*) AS n FROM handoffs WHERE id = ?').get(handoffId).n;
    assert(handoffCountAfter === 1, 'repeat handoff sync does not duplicate the row');

    t = await authReq(port, '/api/sync-status', 'GET', tmpToken);
    data = t.json();
    assert(data.tasks && data.tasks.state === 'CURRENT', 'sync-status surfaces tasks as CURRENT');
    assert(data.handoffs && data.handoffs.state === 'CURRENT', 'sync-status surfaces handoffs as CURRENT');

    db.prepare('DELETE FROM handoffs WHERE id = ?').run(handoffId);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    console.log('     task/handoff test records cleaned up (sync_events audit rows intentionally left — append-only trail)');

    // ── 17b. knowledge-path sync round-trip ────────────────────────
    console.log('\n[17b] Knowledge Path sync round-trip');
    const kpEventId = 'KP-E2E-' + Date.now();
    const kpAt = new Date().toISOString();
    t = await authReq(port, '/api/knowledge-path/sync', 'POST', tmpToken, {
        records: [{ evidenceEventId: kpEventId, serviceMemberId: 'ATA-VEX-000', stageId: 'competencies', previousStatus: 'PENDING', status: 'VERIFIED', evidence: 'e2e evidence', verifier: '@HELIX', at: kpAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.synced === 1 && data.inserted === 1, 'POST /api/knowledge-path/sync → 1 record inserted');
    assert(typeof data.executionId === 'string' && data.executionId.startsWith('SYNC-KNOWLEDGE_PATH-'), 'knowledge-path sync response carries a knowledge_path-scoped executionId');

    t = await authReq(port, '/api/knowledge-path?serviceMemberId=ATA-VEX-000&limit=100', 'GET', tmpToken);
    data = t.json();
    const kpRow = (data.rows || []).find(r => r.evidenceEventId === kpEventId);
    assert(!!kpRow && kpRow.stageId === 'competencies' && kpRow.verifier === '@HELIX', 'GET /api/knowledge-path?serviceMemberId= reflects the synced event');

    t = await authReq(port, '/api/knowledge-path/sync', 'POST', tmpToken, {
        records: [{ evidenceEventId: kpEventId, serviceMemberId: 'ATA-VEX-000', stageId: 'competencies', previousStatus: 'PENDING', status: 'VERIFIED', evidence: 'e2e evidence', verifier: '@HELIX', at: kpAt }]
    });
    data = t.json();
    assert(t.status === 200 && data.inserted === 0 && data.updated === 0 && data.unchanged === 1, 'repeat knowledge-path sync → 0 inserted, 0 updated, 1 unchanged (idempotent — each evidenceEventId is immutable)');
    const kpCountAfter = db.prepare('SELECT COUNT(*) AS n FROM knowledge_path_events WHERE id = ?').get(kpEventId).n;
    assert(kpCountAfter === 1, 'repeat knowledge-path sync does not duplicate the row');

    t = await authReq(port, '/api/sync-status', 'GET', tmpToken);
    data = t.json();
    assert(data.knowledge_path && data.knowledge_path.state === 'CURRENT', 'sync-status surfaces knowledge_path as CURRENT');

    db.prepare('DELETE FROM knowledge_path_events WHERE id = ?').run(kpEventId);
    console.log('     knowledge-path test record cleaned up (sync_events audit rows intentionally left — append-only trail)');

    // ── 17c. Governed Sources + real least-privilege control status ────────────────
    console.log('\n[17c] Governed Sources + control-status round-trip');
    const stdToken = 'e2e-std-' + crypto.randomBytes(20).toString('hex');
    const stdIns = db.prepare('INSERT INTO tokens (token_hash, description, scope) VALUES (?, ?, ?)').run(hashToken(stdToken), 'e2e-standard', 'standard');
    const stdId = stdIns.lastInsertRowid;

    // A standard-scope token is genuinely denied the admin-only endpoint...
    t = await authReq(port, '/api/tokens', 'GET', stdToken);
    assert(t.status === 403, 'standard-scope token is denied GET /api/tokens (real least-privilege, not cosmetic)');
    // ...while the admin token (tmpToken) is not.
    t = await authReq(port, '/api/tokens', 'GET', tmpToken);
    assert(t.status === 200, 'admin-scope token is allowed GET /api/tokens');

    // No sources registered yet → control-status honestly reports unverified.
    t = await authReq(port, '/api/governance/control-status', 'GET', stdToken);
    data = t.json();
    assert(t.status === 200 && data.governedSourceAccess.verified === false, 'control-status reports governedSourceAccess unverified with zero sources registered');
    assert(data.enforcedPermissions.verified === true, 'control-status: a standard token IS its own least-privilege denial evidence');
    t = await authReq(port, '/api/governance/control-status', 'GET', tmpToken);
    data = t.json();
    assert(data.enforcedPermissions.verified === false, "control-status: an admin token can't prove non-admin denial for itself");

    const srcId = 'SRC-E2E-' + Date.now();
    t = await authReq(port, '/api/sources', 'POST', tmpToken, { sourceId: srcId, name: 'e2e test source', authority: '@ARCHITECT', sourceUri: 'file://e2e', reviewDueAt: new Date(Date.now() + 86400000).toISOString() });
    data = t.json();
    assert(t.status === 201 && data.sourceId === srcId, 'POST /api/sources registers a real source');

    // Access not yet validated → still unverified.
    t = await authReq(port, '/api/governance/control-status', 'GET', stdToken);
    data = t.json();
    assert(data.governedSourceAccess.verified === false, 'registering a source alone does not verify governedSourceAccess — access must be validated too');

    t = await authReq(port, '/api/sources/' + srcId + '/access', 'POST', tmpToken, { purpose: 'e2e validation' });
    assert(t.status === 200, 'POST /api/sources/:id/access validates access on a real, existing source');
    t = await authReq(port, '/api/sources/NOT-REAL-SOURCE/access', 'POST', tmpToken, { purpose: 'x' });
    assert(t.status === 404, 'validating access on an unregistered source is rejected, not rubber-stamped');

    t = await authReq(port, '/api/governance/control-status', 'GET', stdToken);
    data = t.json();
    assert(data.governedSourceAccess.verified === true, 'governedSourceAccess becomes verified once a real source has both ACTIVE status and validated access');

    db.prepare('DELETE FROM sources WHERE source_id = ?').run(srcId);
    db.prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(stdId);
    console.log('     sources test record + standard token cleaned up');

    // ── 18. revoke temp token; confirm 403 ───────────────────────
    console.log('\n[18] Revoke temp token → confirm 403');
    db.prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(tmpId);
    t = await authReq(port, '/api/stats', 'GET', tmpToken);
    assert(t.status === 403, 'revoked token → 403');

    // ── summary ──────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('  E2E complete: ' + pass + ' passed, ' + fail + ' failed');
    console.log('══════════════════════════════════════════\n');
    try { require('../db/database').closeDb(); require('fs').unlinkSync(process.env.DB_PATH); } catch (e) { /* best effort */ }
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
