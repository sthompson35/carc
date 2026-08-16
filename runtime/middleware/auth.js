'use strict';
const crypto = require('crypto');
const { getDb } = require('../db/database');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function requireBearer(req, res, next) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED', reason: 'Bearer token required' });
    }
    const token = auth.slice(7).trim();
    if (!token) {
        return res.status(401).json({ error: 'UNAUTHORIZED', reason: 'Empty token' });
    }
    const hash = hashToken(token);
    const db = getDb();
    const row = db.prepare(
        'SELECT id, description, scope FROM tokens WHERE token_hash = ? AND active = 1'
    ).get(hash);
    if (!row) {
        return res.status(403).json({ error: 'FORBIDDEN', reason: 'Invalid or revoked token' });
    }
    db.prepare("UPDATE tokens SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
    req.tokenId = row.id;
    req.tokenDescription = row.description;
    req.tokenScope = row.scope || 'standard';
    next();
}

// Use after requireBearer. Real least-privilege enforcement, not cosmetic — a 'standard'
// token genuinely cannot manage other tokens, matching what refreshRuntimeControlEvidence()
// on the frontend treats as retained least-privilege denial evidence.
function requireAdmin(req, res, next) {
    if (req.tokenScope !== 'admin') {
        return res.status(403).json({ error: 'FORBIDDEN', reason: 'Admin-scoped token required' });
    }
    next();
}

module.exports = { requireBearer, requireAdmin, hashToken };
