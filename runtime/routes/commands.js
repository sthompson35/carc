'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { recordSyncEvent, newExecutionId } = require('../db/syncAudit');

function rowToJson(row) {
    return {
        id: row.id,
        event: row.event,
        status: row.status,
        risk: row.risk,
        contentHash: row.content_hash,
        occurredAt: row.occurred_at,
        syncedAt: row.synced_at
    };
}

// GET /api/commands?limit=50 — most recent synced command-audit events, oldest first within page
router.get('/api/commands', requireBearer, function (req, res) {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS n FROM command_audit_events').get().n;
    const rows = db.prepare('SELECT * FROM command_audit_events ORDER BY occurred_at DESC LIMIT ?').all(limit);
    rows.reverse();
    res.json({ total, limit, rows: rows.map(rowToJson) });
});

// POST /api/commands/sync  { records: [{ id, event, status, risk, contentHash, occurredAt }], initiator? }
// Idempotent, same pattern as chat sync: upsert by client-generated id (the correlationId),
// diff before writing so a resync of identical events reports "unchanged" not "updated".
router.post('/api/commands/sync', requireBearer, function (req, res) {
    const db = getDb();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const initiator = req.body && req.body.initiator === 'auto' ? 'auto' : 'manual';
    const records = req.body && req.body.records;
    const executionId = newExecutionId('chat_command');

    function fail(status, reason) {
        recordSyncEvent(db, {
            syncType: 'chat_command', initiator, executionId, startedAt, durationMs: Date.now() - t0,
            submittedCount: Array.isArray(records) ? records.length : 0,
            result: 'error', errorMessage: reason
        });
        return res.status(status).json({ error: 'BAD_REQUEST', reason, executionId });
    }

    // An empty array is a valid complete snapshot: a fresh CARC install has no governed command
    // events yet, but the runtime must still be able to record a successful 0/0 synchronization.
    // Missing/non-array records remain invalid.
    if (!Array.isArray(records)) return fail(400, 'records[] is required');
    for (const r of records) {
        if (!r || typeof r.id !== 'string' || !r.id) return fail(400, 'each record requires id');
    }

    const now = new Date().toISOString();
    const getExisting = db.prepare('SELECT event, status, risk, content_hash, occurred_at FROM command_audit_events WHERE id = ?');
    const upsert = db.prepare(`
        INSERT INTO command_audit_events (id, event, status, risk, content_hash, occurred_at, synced_at)
        VALUES (@id, @event, @status, @risk, @contentHash, @occurredAt, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            event = excluded.event, status = excluded.status, risk = excluded.risk,
            content_hash = excluded.content_hash, occurred_at = excluded.occurred_at, synced_at = excluded.synced_at
    `);

    let insertedCount = 0, updatedCount = 0, unchangedCount = 0, errorMessage = null;
    const syncAll = db.transaction((rows) => {
        for (const r of rows) {
            const existing = getExisting.get(r.id);
            const rec = {
                id: r.id,
                event: r.event != null ? String(r.event) : null,
                status: r.status || null,
                risk: r.risk || null,
                contentHash: r.contentHash || null,
                occurredAt: r.occurredAt || null,
                syncedAt: now
            };
            upsert.run(rec);
            if (!existing) { insertedCount++; continue; }
            const changed = existing.event !== rec.event || existing.status !== rec.status
                || existing.risk !== rec.risk || existing.content_hash !== rec.contentHash
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
        syncType: 'chat_command', initiator, executionId, startedAt, durationMs: Date.now() - t0,
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
