'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db/database');
const healthRoutes = require('./routes/health');
const verifyRoutes = require('./routes/verify');
const apiRoutes    = require('./routes/api');
const rosterRoutes  = require('./routes/roster');
const rollCallRoutes = require('./routes/rollcalls');
const syncEventRoutes = require('./routes/syncEvents');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

initDb();

// CORS — needed so browser-based CARC can reach this server directly.
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use(express.json({ limit: '256kb' }));

// Simple request logger.
app.use(function (req, res, next) {
    const t = Date.now();
    res.on('finish', function () {
        console.log(new Date().toISOString() + ' ' + req.method + ' ' + req.path + ' ' + res.statusCode + ' ' + (Date.now() - t) + 'ms');
    });
    next();
});

// Rate-limit all routes: 60 requests / minute per IP.
app.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

app.use('/', healthRoutes);
app.use('/', verifyRoutes);
app.use('/', apiRoutes);
app.use('/', rosterRoutes);
app.use('/', rollCallRoutes);
app.use('/', syncEventRoutes);
app.use('/', adminRoutes);

// Serve admin dashboard; must come after API routes so /api/* routes win first.
app.get('/admin', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

// Generic error handler — never leak stack traces.
app.use(function (err, req, res, _next) {
    console.error(err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
});

const server = app.listen(PORT, HOST, function () {
    const addr = server.address();
    console.log('CARC Runtime Endpoint  →  http://' + HOST + ':' + addr.port);
    console.log('Run `npm run setup` first if this is a fresh install.');
});
['SIGTERM', 'SIGINT'].forEach(function (sig) {
    process.on(sig, function () {
        console.log('\n' + sig + ' — shutting down');
        server.close(function () { require('./db/database').closeDb(); process.exit(0); });
        setTimeout(function () { process.exit(1); }, 5000);
    });
});

server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
        console.error('Port ' + PORT + ' is in use. Set PORT= in .env to use a different port.');
    } else {
        console.error(err.message);
    }
    process.exit(1);
});
