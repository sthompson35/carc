'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { initDb } = require('./db/database');
const healthRoutes = require('./routes/health');
const verifyRoutes = require('./routes/verify');
const apiRoutes    = require('./routes/api');
const rosterRoutes  = require('./routes/roster');
const rollCallRoutes = require('./routes/rollcalls');
const syncEventRoutes = require('./routes/syncEvents');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const commandRoutes = require('./routes/commands');
const taskRoutes = require('./routes/tasks');
const handoffRoutes = require('./routes/handoffs');
const knowledgePathRoutes = require('./routes/knowledgePath');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
// Loopback-only by default — this is a local, single-operator tool, not a networked service.
// Still overridable via .env for anyone who genuinely needs LAN/container access.
const HOST = process.env.HOST || '127.0.0.1';
// A browser tab open on any website can still make requests to a loopback server the same
// browser can reach — CORS_ORIGIN='*' let any of them read the response. Default now allowlists
// only this project's own static-server origins (see scripts/wsl/start-frontend.sh's default
// port); '*' is honored only if an operator explicitly sets it, never assumed.
const CORS_ORIGIN_RAW = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080';
const CORS_WILDCARD = CORS_ORIGIN_RAW.trim() === '*';
const CORS_ALLOWLIST = CORS_WILDCARD ? [] : CORS_ORIGIN_RAW.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
if (CORS_WILDCARD) console.warn('CORS_ORIGIN=* — any website open in a browser can read this server\'s responses. Set an explicit allowlist unless you specifically need this.');

initDb();

// CORS — needed so browser-based CARC can reach this server directly. Never reflects an
// unlisted Origin and never treats 'null' (file://, sandboxed iframes, data: URLs — all
// spoofable) as a match, even if it happened to appear in the allowlist string.
app.use(function (req, res, next) {
    const origin = req.headers.origin;
    if (CORS_WILDCARD) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && origin !== 'null' && CORS_ALLOWLIST.indexOf(origin) !== -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Security headers. scriptSrc has no 'unsafe-inline' — index.html carries zero inline
// <script> blocks or on* handlers (verified), so nothing needs it. styleSrc does need it —
// the dashboard uses real inline style="" attributes (progress bars, etc.) throughout.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());

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
// Rate-limiting protects the API/verification surface from abuse — it was never meant to cap
// how many <script> tags a single page load can request. Without this skip, loading the
// dashboard's ~40 assets (or one reload during active use) blows through the budget and the
// page breaks with 429s on its own JS files.
app.use(rateLimit({
    windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false,
    skip: function (req) { return req.path.indexOf('/dashboard') === 0; }
}));

app.use('/', healthRoutes);
app.use('/', verifyRoutes);
app.use('/', apiRoutes);
app.use('/', rosterRoutes);
app.use('/', rollCallRoutes);
app.use('/', syncEventRoutes);
app.use('/', adminRoutes);
app.use('/', chatRoutes);
app.use('/', commandRoutes);
app.use('/', taskRoutes);
app.use('/', handoffRoutes);
app.use('/', knowledgePathRoutes);

// Serve admin dashboard; must come after API routes so /api/* routes win first.
app.get('/admin', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main CARC dashboard too — same-origin as the API, so it needs no CORS allowance
// and gets Helmet's headers + compression for free. file:// remains a fully-working fallback
// (that invariant is never broken); this is just a second, hardened way to open the app.
// Mounted at /dashboard/, not /, because GET / is already a real, tested API-identity
// contract (health.js, asserted by smoke.js). The trailing slash matters: index.html's
// script tags are relative ("app/util.js"), which only resolve to /dashboard/app/util.js
// if the document URL itself ends in /dashboard/ — hence the redirect for the bare path.
// Only the specific subdirectories index.html actually references are mounted — never the
// whole project root, which would also expose tests/, scripts/, _archive/, .env, .git.
const ROOT = path.join(__dirname, '..');
// Express's default non-strict routing treats '/dashboard' and '/dashboard/' as the same
// route, so a plain second app.get('/dashboard/', ...) handler is never reached — checking
// req.originalUrl directly (the literal requested path, not the matched pattern) instead.
app.get(['/dashboard', '/dashboard/'], function (req, res) {
    if (!req.originalUrl.split('?')[0].endsWith('/')) return res.redirect(301, '/dashboard/');
    res.sendFile(path.join(ROOT, 'index.html'));
});
['app', 'persona', 'communication', 'schemas', 'data', 'config'].forEach(function (dir) {
    app.use('/dashboard/' + dir, express.static(path.join(ROOT, dir)));
});

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
