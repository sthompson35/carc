'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { rowToJson } = require('../db/syncAudit');

// GET /api/sync-events?type=&limit=20 — recent sync audit trail, newest first
router.get('/api/sync-events', requireBearer, function (req, res) {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const db = getDb();
    const type = req.query.type;
    const where  = type ? 'WHERE sync_type = ?' : '';
    const params = type ? [type] : [];
    const rows = db.prepare('SELECT * FROM sync_events ' + where + ' ORDER BY id DESC LIMIT ?').all(...params, limit);
    res.json({ rows: rows.map(rowToJson) });
});

// GET /api/sync-events/status — most recent event per sync_type, for "last sync" status displays
router.get('/api/sync-events/status', requireBearer, function (req, res) {
    const db = getDb();
    const latestIds = db.prepare('SELECT sync_type, MAX(id) AS maxId FROM sync_events GROUP BY sync_type').all();
    const status = {};
    for (const row of latestIds) {
        const evt = db.prepare('SELECT * FROM sync_events WHERE id = ?').get(row.maxId);
        status[row.sync_type] = rowToJson(evt);
    }
    res.json(status);
});

module.exports = router;
