'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { recordSyncEvent, newExecutionId } = require('../db/syncAudit');

function rowToJson(row) {
    return {
        id: row.id,
        role: row.role,
        text: row.text,
        occurredAt: row.occurred_at,
        syncedAt: row.synced_at
    };
}

// GET /api/chat?limit=50 — most recent synced messages, oldest first within the page
router.get('/api/chat', requireBearer, function (req, res) {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n;
    const rows = db.prepare('SELECT * FROM chat_messages ORDER BY occurred_at DESC LIMIT ?').all(limit);
    rows.reverse();
    res.json({ total, limit, rows: rows.map(rowToJson) });
});

// POST /api/chat/sync  { records: [{ id, role, text, occurredAt }, ...], initiator? }
// Idempotent, same pattern as roll-calls: upsert by client-generated id, diff before writing
// so a resync of identical messages reports "unchanged" rather than "updated".
router.post('/api/chat/sync', requireBearer, function (req, res) {
    const db = getDb();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const initiator = req.body && req.body.initiator === 'auto' ? 'auto' : 'manual';
    const records = req.body && req.body.records;
    const executionId = newExecutionId('chat');

    function fail(status, reason) {
        recordSyncEvent(db, {
            syncType: 'chat', initiator, executionId, startedAt, durationMs: Date.now() - t0,
            submittedCount: Array.isArray(records) ? records.length : 0,
            result: 'error', errorMessage: reason
        });
        return res.status(status).json({ error: 'BAD_REQUEST', reason, executionId });
    }

    if (!Array.isArray(records) || !records.length) return fail(400, 'records[] is required');
    for (const r of records) {
        if (!r || typeof r.id !== 'string' || !r.id) return fail(400, 'each record requires id');
    }

    const now = new Date().toISOString();
    const getExisting = db.prepare('SELECT role, text, occurred_at FROM chat_messages WHERE id = ?');
    const upsert = db.prepare(`
        INSERT INTO chat_messages (id, role, text, occurred_at, synced_at)
        VALUES (@id, @role, @text, @occurredAt, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            role = excluded.role, text = excluded.text, occurred_at = excluded.occurred_at, synced_at = excluded.synced_at
    `);

    let insertedCount = 0, updatedCount = 0, unchangedCount = 0, errorMessage = null;
    const syncAll = db.transaction((rows) => {
        for (const r of rows) {
            const existing = getExisting.get(r.id);
            const rec = {
                id: r.id,
                role: r.role || null,
                text: r.text != null ? String(r.text) : null,
                occurredAt: r.occurredAt || null,
                syncedAt: now
            };
            upsert.run(rec);
            if (!existing) { insertedCount++; continue; }
            const changed = existing.role !== rec.role || existing.text !== rec.text || existing.occurred_at !== rec.occurredAt;
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
        syncType: 'chat', initiator, executionId, startedAt, durationMs: Date.now() - t0,
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
