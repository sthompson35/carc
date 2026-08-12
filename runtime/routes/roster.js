'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');

function rowToJson(row) {
    let missionProfile = null;
    if (row.mission_profile_json) {
        try { missionProfile = JSON.parse(row.mission_profile_json); } catch (e) { missionProfile = null; }
    }
    return {
        serviceMemberId: row.service_member_id,
        callsign:        row.callsign,
        displayName:     row.display_name,
        kind:            row.kind,
        agentId:         row.agent_id,
        role:            row.role,
        command:         row.command,
        status:          row.status,
        readiness:       row.readiness,
        canonicalStatus: row.canonical_status,
        missionProfile:  missionProfile,
        updatedAt:       row.updated_at
    };
}

// GET /api/roster?page=1&limit=20&kind=&command=&readiness=
router.get('/api/roster', requireBearer, function (req, res) {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb();

    const where  = [];
    const params = [];
    if (req.query.kind)      { where.push('kind = ?');      params.push(req.query.kind); }
    if (req.query.command)   { where.push('command = ?');   params.push(req.query.command); }
    if (req.query.readiness) { where.push('readiness = ?'); params.push(req.query.readiness); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const total = db.prepare('SELECT COUNT(*) AS n FROM roster ' + whereSql).get(...params).n;
    const rows  = db.prepare('SELECT * FROM roster ' + whereSql + ' ORDER BY service_member_id LIMIT ? OFFSET ?')
                    .all(...params, limit, offset);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), rows: rows.map(rowToJson) });
});

// GET /api/roster/:serviceMemberId
router.get('/api/roster/:serviceMemberId', requireBearer, function (req, res) {
    const row = getDb().prepare('SELECT * FROM roster WHERE service_member_id = ?').get(req.params.serviceMemberId);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(rowToJson(row));
});

// POST /api/roster/sync  { records: [{ serviceMemberId, status, readiness, missionProfile }, ...] }
router.post('/api/roster/sync', requireBearer, function (req, res) {
    const records = req.body && req.body.records;
    if (!Array.isArray(records) || !records.length) {
        return res.status(400).json({ error: 'BAD_REQUEST', reason: 'records[] is required' });
    }
    for (const r of records) {
        if (!r || typeof r.serviceMemberId !== 'string' || !r.serviceMemberId) {
            return res.status(400).json({ error: 'BAD_REQUEST', reason: 'each record requires serviceMemberId' });
        }
    }

    const db = getDb();
    const now = new Date().toISOString();
    const update = db.prepare(`
        UPDATE roster
        SET status = ?, readiness = ?, mission_profile_json = ?, updated_at = ?
        WHERE service_member_id = ?
    `);
    const recordHistory = db.prepare(`
        INSERT INTO readiness_history (service_member_id, readiness, status, recorded_at)
        VALUES (?, ?, ?, ?)
    `);
    const syncAll = db.transaction((rows) => {
        let matched = 0;
        for (const r of rows) {
            const status    = r.status != null ? String(r.status) : null;
            const readiness = r.readiness != null ? String(r.readiness) : null;
            const info = update.run(
                status,
                readiness,
                r.missionProfile ? JSON.stringify(r.missionProfile) : null,
                now,
                r.serviceMemberId
            );
            if (info.changes) {
                matched++;
                recordHistory.run(r.serviceMemberId, readiness, status, now);
            }
        }
        return matched;
    });

    const matched = syncAll(records);
    res.json({ synced: matched, submitted: records.length, unmatched: records.length - matched, syncedAt: now });
});

// GET /api/readiness — aggregate counts
router.get('/api/readiness', requireBearer, function (req, res) {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS n FROM roster').get().n;
    const byReadiness = db.prepare(`
        SELECT COALESCE(readiness, 'READINESS_UNKNOWN') AS readiness, COUNT(*) AS n
        FROM roster GROUP BY readiness
    `).all();
    const byCommand = db.prepare(`
        SELECT command, COUNT(*) AS total,
               SUM(CASE WHEN readiness = 'MISSION_READY' THEN 1 ELSE 0 END) AS missionReady
        FROM roster GROUP BY command ORDER BY command
    `).all();
    res.json({ total, byReadiness, byCommand, checkedAt: new Date().toISOString() });
});

// GET /api/readiness/history?days=7 — daily readiness-state counts, most recent sync per member per day
router.get('/api/readiness/history', requireBearer, function (req, res) {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const db = getDb();
    const rows = db.prepare(`
        SELECT date(recorded_at) AS day, COALESCE(readiness, 'READINESS_UNKNOWN') AS readiness, COUNT(*) AS n
        FROM readiness_history
        WHERE recorded_at >= datetime('now', '-' || ? || ' days')
        GROUP BY day, readiness
        ORDER BY day
    `).all(days);
    res.json({ days, rows });
});

module.exports = router;
