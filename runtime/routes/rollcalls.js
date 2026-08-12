'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { recordSyncEvent } = require('../db/syncAudit');

function rowToJson(row) {
    return {
        id: row.id,
        date: row.date,
        conv: row.conv,
        present: row.present,
        total: row.total,
        rate: row.rate,
        status: row.status,
        message: row.message,
        responseMode: row.response_mode,
        syncedAt: row.synced_at
    };
}

// GET /api/roll-calls?page=1&limit=20
router.get('/api/roll-calls', requireBearer, function (req, res) {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) AS n FROM roll_calls').get().n;
    const rows  = db.prepare('SELECT * FROM roll_calls ORDER BY date DESC LIMIT ? OFFSET ?').all(limit, offset);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), rows: rows.map(rowToJson) });
});

// POST /api/roll-calls/sync  { records: [{ id, date, conv, present, total, rate, status, message, responseMode }, ...], initiator? }
// Idempotent: resyncing an identical record is reported as "unchanged" — no data mutation, no phantom history.
router.post('/api/roll-calls/sync', requireBearer, function (req, res) {
    const db = getDb();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const initiator = req.body && req.body.initiator === 'auto' ? 'auto' : 'manual';
    const records = req.body && req.body.records;

    function fail(status, reason) {
        recordSyncEvent(db, {
            syncType: 'roll_calls', initiator, startedAt, durationMs: Date.now() - t0,
            submittedCount: Array.isArray(records) ? records.length : 0,
            result: 'error', errorMessage: reason
        });
        return res.status(status).json({ error: 'BAD_REQUEST', reason });
    }

    if (!Array.isArray(records) || !records.length) return fail(400, 'records[] is required');
    for (const r of records) {
        if (!r || typeof r.id !== 'string' || !r.id) return fail(400, 'each record requires id');
    }

    const now = new Date().toISOString();
    const getExisting = db.prepare('SELECT date, conv, present, total, rate, status, message, response_mode FROM roll_calls WHERE id = ?');
    const upsert = db.prepare(`
        INSERT INTO roll_calls (id, date, conv, present, total, rate, status, message, response_mode, synced_at)
        VALUES (@id, @date, @conv, @present, @total, @rate, @status, @message, @responseMode, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            date = excluded.date, conv = excluded.conv, present = excluded.present,
            total = excluded.total, rate = excluded.rate, status = excluded.status,
            message = excluded.message, response_mode = excluded.response_mode, synced_at = excluded.synced_at
    `);

    let insertedCount = 0, updatedCount = 0, unchangedCount = 0, errorMessage = null;
    const syncAll = db.transaction((rows) => {
        for (const r of rows) {
            const existing = getExisting.get(r.id);
            const rec = {
                id: r.id,
                date: r.date || null,
                conv: r.conv || null,
                present: Number.isFinite(r.present) ? r.present : null,
                total: Number.isFinite(r.total) ? r.total : null,
                rate: Number.isFinite(r.rate) ? r.rate : null,
                status: r.status || null,
                message: r.message || null,
                responseMode: r.responseMode || null,
                syncedAt: now
            };
            upsert.run(rec);
            if (!existing) { insertedCount++; continue; }
            const changed = existing.date !== rec.date || existing.conv !== rec.conv ||
                existing.present !== rec.present || existing.total !== rec.total || existing.rate !== rec.rate ||
                existing.status !== rec.status || existing.message !== rec.message || existing.response_mode !== rec.responseMode;
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
        syncType: 'roll_calls', initiator, startedAt, durationMs: Date.now() - t0,
        submittedCount: records.length, insertedCount, updatedCount, unchangedCount,
        result, errorMessage
    });

    if (result === 'error') return res.status(500).json({ error: 'SYNC_FAILED', reason: errorMessage });
    res.json({
        synced: insertedCount + updatedCount + unchangedCount, submitted: records.length,
        inserted: insertedCount, updated: updatedCount, unchanged: unchangedCount, syncedAt: now
    });
});

// GET /api/roll-calls/stats — aggregate attendance stats
router.get('/api/roll-calls/stats', requireBearer, function (req, res) {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS n FROM roll_calls').get().n;
    const avgRate = db.prepare('SELECT AVG(rate) AS avg FROM roll_calls').get().avg;
    const byDay = db.prepare(`
        SELECT date(date) AS day, AVG(rate) AS avgRate, COUNT(*) AS n
        FROM roll_calls
        WHERE date >= datetime('now', '-30 days')
        GROUP BY day ORDER BY day
    `).all();
    res.json({
        total,
        avgRate: avgRate != null ? Math.round(avgRate * 10) / 10 : null,
        byDay,
        checkedAt: new Date().toISOString()
    });
});

module.exports = router;
