'use strict';
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireBearer } = require('../middleware/auth');
const { backupTo, DEFAULT_BACKUP_DIR } = require('../scripts/backup');

// POST /api/admin/backup — triggers a real server-side SQLite backup (same mechanism as
// `npm run backup`), so an operator can do this from the UI instead of needing shell access.
router.post('/api/admin/backup', requireBearer, async function (req, res) {
    try {
        fs.mkdirSync(DEFAULT_BACKUP_DIR, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dest = path.join(DEFAULT_BACKUP_DIR, 'carc-' + stamp + '.db');
        await backupTo(dest);
        const stat = fs.statSync(dest);
        res.json({
            backupFile: path.basename(dest),
            sizeBytes: stat.size,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: 'BACKUP_FAILED', reason: e.message });
    }
});

// GET /api/admin/backups — list existing backups for visibility (newest first).
router.get('/api/admin/backups', requireBearer, function (req, res) {
    let files = [];
    try {
        files = fs.readdirSync(DEFAULT_BACKUP_DIR)
            .filter(function (f) { return f.endsWith('.db'); })
            .map(function (f) {
                const stat = fs.statSync(path.join(DEFAULT_BACKUP_DIR, f));
                return { file: f, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
            })
            .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    } catch (e) {
        // backups dir not created yet — that's a legitimate "no backups exist" state, not an error
        files = [];
    }
    res.json({ backups: files.slice(0, 20) });
});

module.exports = router;
