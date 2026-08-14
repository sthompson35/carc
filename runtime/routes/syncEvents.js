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

const SYNC_TYPES = ['roster', 'roll_calls', 'chat', 'chat_command', 'tasks', 'handoffs'];
const STALE_THRESHOLD_MS = parseInt(process.env.SYNC_STALE_THRESHOLD_MS, 10) || 15 * 60 * 1000;

// GET /api/sync-status — server-authoritative trust summary per sync type: CURRENT / STALE /
// UNSYNCED, judged against SYNC_STALE_THRESHOLD_MS (server clock/policy), independent of
// whatever interval any particular browser's local auto-sync happens to be configured with.
router.get('/api/sync-status', requireBearer, function (req, res) {
    const db = getDb();
    const now = Date.now();
    const summary = {};
    for (const syncType of SYNC_TYPES) {
        const evt = db.prepare('SELECT * FROM sync_events WHERE sync_type = ? ORDER BY id DESC LIMIT 1').get(syncType);
        if (!evt) {
            summary[syncType] = { state: 'UNSYNCED', lastSyncAt: null, lastResult: null, executionId: null };
            continue;
        }
        const ageMs = now - new Date(evt.started_at).getTime();
        summary[syncType] = {
            state: evt.result !== 'success' ? 'ERROR' : (ageMs > STALE_THRESHOLD_MS ? 'STALE' : 'CURRENT'),
            lastSyncAt: evt.started_at,
            lastResult: evt.result,
            initiator: evt.initiator,
            executionId: evt.execution_id,
            ageMs: ageMs
        };
    }
    res.json({ staleThresholdMs: STALE_THRESHOLD_MS, checkedAt: new Date().toISOString(), ...summary });
});

module.exports = router;
