'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { recordSyncEvent, newExecutionId } = require('../db/syncAudit');

function rowToJson(row) {
    return {
        handoffId: row.id,
        taskId: row.task_id,
        fromServiceMemberId: row.from_service_member_id,
        toServiceMemberId: row.to_service_member_id,
        notes: row.notes,
        state: row.state,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncedAt: row.synced_at
    };
}

// GET /api/handoffs?page=1&limit=20
router.get('/api/handoffs', requireBearer, function (req, res) {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) AS n FROM handoffs').get().n;
    const rows  = db.prepare('SELECT * FROM handoffs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), rows: rows.map(rowToJson) });
});

// POST /api/handoffs/sync  { records: [{ handoffId, taskId, fromServiceMemberId,
//   toServiceMemberId, notes, state, createdAt, updatedAt }, ...], initiator? }
// Idempotent: resyncing an identical record is reported as "unchanged" — no data mutation.
router.post('/api/handoffs/sync', requireBearer, function (req, res) {
    const db = getDb();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const initiator = req.body && req.body.initiator === 'auto' ? 'auto' : 'manual';
    const records = req.body && req.body.records;
    const executionId = newExecutionId('handoffs');

    function fail(status, reason) {
        recordSyncEvent(db, {
            syncType: 'handoffs', initiator, executionId, startedAt, durationMs: Date.now() - t0,
            submittedCount: Array.isArray(records) ? records.length : 0,
            result: 'error', errorMessage: reason
        });
        return res.status(status).json({ error: 'BAD_REQUEST', reason, executionId });
    }

    if (!Array.isArray(records) || !records.length) return fail(400, 'records[] is required');
    for (const r of records) {
        if (!r || typeof r.handoffId !== 'string' || !r.handoffId) return fail(400, 'each record requires handoffId');
    }

    const now = new Date().toISOString();
    const getExisting = db.prepare('SELECT task_id, from_service_member_id, to_service_member_id, notes, state, created_at, updated_at FROM handoffs WHERE id = ?');
    const upsert = db.prepare(`
        INSERT INTO handoffs (id, task_id, from_service_member_id, to_service_member_id, notes, state, created_at, updated_at, synced_at)
        VALUES (@id, @taskId, @fromServiceMemberId, @toServiceMemberId, @notes, @state, @createdAt, @updatedAt, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            task_id = excluded.task_id, from_service_member_id = excluded.from_service_member_id,
            to_service_member_id = excluded.to_service_member_id, notes = excluded.notes,
            state = excluded.state, created_at = excluded.created_at,
            updated_at = excluded.updated_at, synced_at = excluded.synced_at
    `);

    let insertedCount = 0, updatedCount = 0, unchangedCount = 0, errorMessage = null;
    const syncAll = db.transaction((rows) => {
        for (const r of rows) {
            const existing = getExisting.get(r.handoffId);
            const rec = {
                id: r.handoffId,
                taskId: r.taskId || null,
                fromServiceMemberId: r.fromServiceMemberId || null,
                toServiceMemberId: r.toServiceMemberId || null,
                notes: r.notes || null,
                state: r.state || null,
                createdAt: r.createdAt || null,
                updatedAt: r.updatedAt || null,
                syncedAt: now
            };
            upsert.run(rec);
            if (!existing) { insertedCount++; continue; }
            const changed = existing.task_id !== rec.taskId ||
                existing.from_service_member_id !== rec.fromServiceMemberId ||
                existing.to_service_member_id !== rec.toServiceMemberId ||
                existing.notes !== rec.notes || existing.state !== rec.state ||
                existing.created_at !== rec.createdAt || existing.updated_at !== rec.updatedAt;
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
        syncType: 'handoffs', initiator, executionId, startedAt, durationMs: Date.now() - t0,
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
