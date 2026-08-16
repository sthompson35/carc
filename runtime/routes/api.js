'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requireBearer, requireAdmin, hashToken } = require('../middleware/auth');
const { getDb } = require('../db/database');

// GET /api/verifications?page=1&limit=20&verified=
router.get('/api/verifications', requireBearer, function (req, res) {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb();

    let where = '';
    const params = [];
    if (req.query.verified === '1' || req.query.verified === '0') {
        where = 'WHERE verified = ?';
        params.push(parseInt(req.query.verified, 10));
    }

    const total = db.prepare('SELECT COUNT(*) AS n FROM verifications ' + where).get(...params).n;
    const rows  = db.prepare('SELECT * FROM verifications ' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?')
                    .all(...params, limit, offset);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), rows });
});

// GET /api/tokens — admin-scoped only. This is the real least-privilege boundary
// refreshRuntimeControlEvidence() probes: a standard-scope token is genuinely denied here.
router.get('/api/tokens', requireBearer, requireAdmin, function (req, res) {
    const rows = getDb()
        .prepare('SELECT id, description, scope, created_at, last_used_at, active FROM tokens ORDER BY id')
        .all();
    res.json({ tokens: rows });
});

// POST /api/tokens  { description, scope? }  — returns plaintext token exactly once.
// New tokens default to 'standard' scope even when created by an admin — elevation is
// explicit, never inherited automatically.
router.post('/api/tokens', requireBearer, requireAdmin, function (req, res) {
    const desc  = (String(req.body.description || '').trim().slice(0, 120)) || ('token-' + Date.now());
    const scope = req.body.scope === 'admin' ? 'admin' : 'standard';
    const token = 'carc-' + crypto.randomBytes(20).toString('hex');
    const info  = getDb().prepare('INSERT INTO tokens (token_hash, description, scope) VALUES (?, ?, ?)').run(hashToken(token), desc, scope);
    res.status(201).json({ id: info.lastInsertRowid, description: desc, scope, token });
});

// DELETE /api/tokens/:id
router.delete('/api/tokens/:id', requireBearer, requireAdmin, function (req, res) {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'BAD_REQUEST', reason: 'Invalid ID' });
    const info = getDb().prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(id);
    if (!info.changes) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ revoked: true, id });
});

// GET /api/stats
router.get('/api/stats', requireBearer, function (req, res) {
    const db = getDb();
    const total    = db.prepare('SELECT COUNT(*) AS n FROM verifications').get().n;
    const verified = db.prepare('SELECT COUNT(*) AS n FROM verifications WHERE verified = 1').get().n;
    const last24h  = db.prepare("SELECT COUNT(*) AS n FROM verifications WHERE created_at >= datetime('now','-24 hours')").get().n;
    const last24hV = db.prepare("SELECT COUNT(*) AS n FROM verifications WHERE verified = 1 AND created_at >= datetime('now','-24 hours')").get().n;
    const byDay    = db.prepare("SELECT date(created_at) AS day, SUM(verified) AS v, COUNT(*) AS t FROM verifications GROUP BY day ORDER BY day DESC LIMIT 7").all();
    res.json({
        total,
        verified,
        rejected:  total - verified,
        passRate:  total ? Math.round((verified / total) * 100) : 0,
        last24h:   { total: last24h, verified: last24hV },
        byDay,
        uptime:    process.uptime()
    });
});

// GET /api/verifications/:id
router.get('/api/verifications/:id', requireBearer, function (req, res) {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'BAD_REQUEST', reason: 'Invalid ID' });
    const row = getDb().prepare('SELECT * FROM verifications WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(row);
});

module.exports = router;
