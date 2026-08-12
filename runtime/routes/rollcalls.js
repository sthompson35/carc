'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');

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

// POST /api/roll-calls/sync  { records: [{ id, date, conv, present, total, rate, status, message, responseMode }, ...] }
router.post('/api/roll-calls/sync', requireBearer, function (req, res) {
    const records = req.body && req.body.records;
    if (!Array.isArray(records) || !records.length) {
        return res.status(400).json({ error: 'BAD_REQUEST', reason: 'records[] is required' });
    }
    for (const r of records) {
        if (!r || typeof r.id !== 'string' || !r.id) {
            return res.status(400).json({ error: 'BAD_REQUEST', reason: 'each record requires id' });
        }
    }

    const db = getDb();
    const now = new Date().toISOString();
    const upsert = db.prepare(`
        INSERT INTO roll_calls (id, date, conv, present, total, rate, status, message, response_mode, synced_at)
        VALUES (@id, @date, @conv, @present, @total, @rate, @status, @message, @responseMode, @syncedAt)
        ON CONFLICT(id) DO UPDATE SET
            date = excluded.date, conv = excluded.conv, present = excluded.present,
            total = excluded.total, rate = excluded.rate, status = excluded.status,
            message = excluded.message, response_mode = excluded.response_mode, synced_at = excluded.synced_at
    `);
    const syncAll = db.transaction((rows) => {
        let synced = 0;
        for (const r of rows) {
            upsert.run({
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
            });
            synced++;
        }
        return synced;
    });

    const synced = syncAll(records);
    res.json({ synced, submitted: records.length, syncedAt: now });
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
