'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { recordSyncEvent, newExecutionId } = require('../db/syncAudit');

function rowToJson(row) {
    return {
        taskId: row.id,
        ownerServiceMemberId: row.owner_service_member_id,
        assignedByServiceMemberId: row.assigned_by_service_member_id,
        title: row.title,
        description: row.description,
        sourceMissionTaskText: row.source_mission_task_text,
        state: row.state,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncedAt: row.synced_at
    };
}

// GET /api/tasks?page=1&limit=20
router.get('/api/tasks', requireBearer, function (req, res) {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
    const rows  = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), rows: rows.map(rowToJson) });
});

// POST /api/tasks/sync  { records: [{ taskId, ownerServiceMemberId, assignedByServiceMemberId,
//   title, description, sourceMissionTaskText, state, createdAt, updatedAt }, ...], initiator? }
// Idempotent: resyncing an identical record is reported as "unchanged" — no data mutation.
router.post('/api/tasks/sync', requireBearer, function (req, res) {
    const db = getDb();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const initiator = req.body && req.body.initiator === 'auto' ? 'auto' : 'manual';
    const records = req.body && req.body.records;
    const executionId = newExecutionId('tasks');

    function fail(status, reason) {
        recordSyncEvent(db, {
            syncType: 'tasks', initiator, executionId, startedAt, durationMs: Date.now() - t0,
            submittedCount: Array.isArray(records) ? records.length : 0,
            result: 'error', errorMessage: reason
        });
        return res.status(status).json({ error: 'BAD_REQUEST', reason, executionId });
    }

    if (!Array.isArray(records) || !records.length) return fail(400, 'records[] is required');
    for (const r of records) {
        if (!r || typeof r.taskId !== 'string' || !r.taskId) return fail(400, 'each record requires taskId');
    }

    const now = new Date().toISOString();
    const getExisting = db.prepare('SELECT owner_service_member_id, assigned_by_service_member_id, title, description, source_mission_task_text, state, created_at, updated_at FROM tasks WHERE id = ?');
    const upsert = db.prepare(`
        INSERT INTO tasks (id, owner_service_member_id, assigned_by_service_member_id, title, description, source_mission_task_text, state, created_at, updated_at, synced_at)
        VALUES (@id, @ownerServiceMemberId, @assignedByServiceMemberId, @title, @description, @sourceMissionTaskText, @state, @createdAt, @updatedAt, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            owner_service_member_id = excluded.owner_service_member_id,
            assigned_by_service_member_id = excluded.assigned_by_service_member_id,
            title = excluded.title, description = excluded.description,
            source_mission_task_text = excluded.source_mission_task_text,
            state = excluded.state, created_at = excluded.created_at,
            updated_at = excluded.updated_at, synced_at = excluded.synced_at
    `);

    let insertedCount = 0, updatedCount = 0, unchangedCount = 0, errorMessage = null;
    const syncAll = db.transaction((rows) => {
        for (const r of rows) {
            const existing = getExisting.get(r.taskId);
            const rec = {
                id: r.taskId,
                ownerServiceMemberId: r.ownerServiceMemberId || null,
                assignedByServiceMemberId: r.assignedByServiceMemberId || null,
                title: r.title || null,
                description: r.description || null,
                sourceMissionTaskText: r.sourceMissionTaskText || null,
                state: r.state || null,
                createdAt: r.createdAt || null,
                updatedAt: r.updatedAt || null,
                syncedAt: now
            };
            upsert.run(rec);
            if (!existing) { insertedCount++; continue; }
            const changed = existing.owner_service_member_id !== rec.ownerServiceMemberId ||
                existing.assigned_by_service_member_id !== rec.assignedByServiceMemberId ||
                existing.title !== rec.title || existing.description !== rec.description ||
                existing.source_mission_task_text !== rec.sourceMissionTaskText ||
                existing.state !== rec.state || existing.created_at !== rec.createdAt ||
                existing.updated_at !== rec.updatedAt;
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
        syncType: 'tasks', initiator, executionId, startedAt, durationMs: Date.now() - t0,
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
