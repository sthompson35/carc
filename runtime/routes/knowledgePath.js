'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { recordSyncEvent, newExecutionId } = require('../db/syncAudit');

function rowToJson(row) {
    return {
        evidenceEventId: row.id,
        serviceMemberId: row.service_member_id,
        stageId: row.stage_id,
        previousStatus: row.previous_status,
        status: row.status,
        evidence: row.evidence,
        verifier: row.verifier,
        occurredAt: row.occurred_at,
        syncedAt: row.synced_at
    };
}

// GET /api/knowledge-path?serviceMemberId=&limit=50
router.get('/api/knowledge-path', requireBearer, function (req, res) {
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const db = getDb();
    let rows, total;
    if (req.query.serviceMemberId) {
        total = db.prepare('SELECT COUNT(*) AS n FROM knowledge_path_events WHERE service_member_id = ?').get(req.query.serviceMemberId).n;
        rows = db.prepare('SELECT * FROM knowledge_path_events WHERE service_member_id = ? ORDER BY occurred_at DESC LIMIT ?').all(req.query.serviceMemberId, limit);
    } else {
        total = db.prepare('SELECT COUNT(*) AS n FROM knowledge_path_events').get().n;
        rows = db.prepare('SELECT * FROM knowledge_path_events ORDER BY occurred_at DESC LIMIT ?').all(limit);
    }
    res.json({ total, limit, rows: rows.map(rowToJson) });
});

// POST /api/knowledge-path/sync  { records: [{ evidenceEventId, serviceMemberId, stageId,
//   previousStatus, status, evidence, verifier, at }, ...], initiator? }
// Idempotent, same upsert-by-client-id pattern as every other sync route, EXCEPT that a VERIFIED
// event is a real verification claim, not a bare status flip: evidence/verifier/timestamp must
// all be present, the verifier must resolve to a real identity in the synced roster table (fails
// closed if the roster was never synced — an unpopulated roster can never authorize anyone), and
// once an evidenceEventId has been recorded its content is immutable — a resync with the same id
// but different status/evidence/verifier is rejected outright, not silently overwritten.
router.post('/api/knowledge-path/sync', requireBearer, function (req, res) {
    const db = getDb();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const initiator = req.body && req.body.initiator === 'auto' ? 'auto' : 'manual';
    const records = req.body && req.body.records;
    const executionId = newExecutionId('knowledge_path');

    function fail(status, reason, errorCode) {
        recordSyncEvent(db, {
            syncType: 'knowledge_path', initiator, executionId, startedAt, durationMs: Date.now() - t0,
            submittedCount: Array.isArray(records) ? records.length : 0,
            result: 'error', errorMessage: reason
        });
        return res.status(status).json({ error: errorCode || 'BAD_REQUEST', reason, executionId });
    }

    if (!Array.isArray(records)) return fail(400, 'records[] is required');

    const getExisting = db.prepare('SELECT service_member_id, stage_id, previous_status, status, evidence, verifier, occurred_at FROM knowledge_path_events WHERE id = ?');
    const findVerifier = db.prepare('SELECT 1 FROM roster WHERE callsign = ? OR service_member_id = ?');
    const rosterCount = db.prepare('SELECT COUNT(*) AS n FROM roster').get().n;

    for (const r of records) {
        if (!r || typeof r.evidenceEventId !== 'string' || !r.evidenceEventId) return fail(400, 'each record requires evidenceEventId');
        if (typeof r.serviceMemberId !== 'string' || !r.serviceMemberId) return fail(400, 'each record requires serviceMemberId');
        if (typeof r.stageId !== 'string' || !r.stageId) return fail(400, 'each record requires stageId');

        if (r.status === 'VERIFIED') {
            if (!r.evidence || !r.verifier || !r.at) return fail(400, 'a VERIFIED record requires evidence, verifier, and at', 'COMPETENCY_VERIFICATION_EVIDENCE_REQUIRED');
            if (rosterCount === 0) return fail(400, 'roster has never been synced — cannot authorize any verifier', 'VERIFIER_NOT_RECOGNIZED');
            if (!findVerifier.get(r.verifier, r.verifier)) return fail(400, 'verifier "' + r.verifier + '" is not a recognized roster identity', 'VERIFIER_NOT_RECOGNIZED');
        }

        const existing = getExisting.get(r.evidenceEventId);
        if (existing) {
            const changed = existing.service_member_id !== r.serviceMemberId || existing.stage_id !== r.stageId
                || existing.previous_status !== (r.previousStatus || null) || existing.status !== (r.status || null)
                || existing.evidence !== (r.evidence || null) || existing.verifier !== (r.verifier || null)
                || existing.occurred_at !== (r.at || null);
            if (changed) return fail(409, 'evidenceEventId ' + r.evidenceEventId + ' already exists with different content', 'EVIDENCE_EVENT_IMMUTABLE');
        }
    }

    const now = new Date().toISOString();
    const upsert = db.prepare(`
        INSERT INTO knowledge_path_events (id, service_member_id, stage_id, previous_status, status, evidence, verifier, occurred_at, synced_at)
        VALUES (@id, @serviceMemberId, @stageId, @previousStatus, @status, @evidence, @verifier, @occurredAt, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            service_member_id = excluded.service_member_id, stage_id = excluded.stage_id,
            previous_status = excluded.previous_status, status = excluded.status,
            evidence = excluded.evidence, verifier = excluded.verifier,
            occurred_at = excluded.occurred_at, synced_at = excluded.synced_at
    `);

    let insertedCount = 0, updatedCount = 0, unchangedCount = 0, errorMessage = null;
    const syncAll = db.transaction((rows) => {
        for (const r of rows) {
            const existing = getExisting.get(r.evidenceEventId);
            const rec = {
                id: r.evidenceEventId,
                serviceMemberId: r.serviceMemberId,
                stageId: r.stageId,
                previousStatus: r.previousStatus || null,
                status: r.status || null,
                evidence: r.evidence || null,
                verifier: r.verifier || null,
                occurredAt: r.at || null,
                syncedAt: now
            };
            upsert.run(rec);
            if (!existing) { insertedCount++; continue; }
            const changed = existing.service_member_id !== rec.serviceMemberId || existing.stage_id !== rec.stageId
                || existing.previous_status !== rec.previousStatus || existing.status !== rec.status
                || existing.evidence !== rec.evidence || existing.verifier !== rec.verifier
                || existing.occurred_at !== rec.occurredAt;
            if (changed) updatedCount++; else unchangedCount++;
        }
    });

    let result = 'success';
    try {
        syncAll(records);
    } catch (e) {
        result = 'error'; errorMessage = e.message;
    }

    recordSyncEvent(db, {
        syncType: 'knowledge_path', initiator, executionId, startedAt, durationMs: Date.now() - t0,
        submittedCount: records.length, insertedCount, updatedCount, unchangedCount,
        result, errorMessage
    });

    if (result === 'error') return res.status(500).json({ error: 'SYNC_FAILED', reason: errorMessage, executionId });
    res.json({
        synced: insertedCount + updatedCount + unchangedCount, submitted: records.length,
        inserted: insertedCount, updated: updatedCount, unchanged: unchangedCount, syncedAt: now, executionId
    });
});

module.exports = router;
