'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/health', function (req, res) {
    try {
        const db = getDb();
        const count = db.prepare('SELECT COUNT(*) AS n FROM verifications').get().n;
        res.json({ status: 'OK', service: 'carc-runtime', verifications: count, ts: new Date().toISOString() });
    } catch (e) {
        res.status(503).json({ status: 'ERROR', reason: e.message });
    }
});

// HEAD / — used by CARC's "Test Connection" button.
router.head('/', function (req, res) { res.sendStatus(200); });

router.get('/', function (req, res) {
    res.json({ service: 'carc-runtime', version: '1.0.0', status: 'OK' });
});

module.exports = router;
