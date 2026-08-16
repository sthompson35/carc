'use strict';
require('dotenv').config();
const crypto = require('crypto');
const { initDb } = require('../db/database');
const { hashToken } = require('../middleware/auth');

const db = initDb();

const existing = db.prepare('SELECT COUNT(*) AS n FROM tokens').get().n;
if (existing > 0) {
    console.log('Database already initialized (' + existing + ' token(s) exist).');
    console.log('Manage tokens with: node scripts/token.js <add|list|revoke>');
    process.exit(0);
}

const token = 'carc-' + crypto.randomBytes(20).toString('hex');
// The first token is the operator's own — admin-scoped, so it can manage other tokens.
// Anything minted afterward (node scripts/token.js add, or the CARC UI) defaults to
// 'standard' scope unless admin is explicitly requested.
db.prepare('INSERT INTO tokens (token_hash, description, scope) VALUES (?, ?, ?)').run(hashToken(token), 'default', 'admin');

console.log('\n✅  Database initialized.');
console.log('\nBearer token (admin-scoped) — paste this into CARC Governance → Configure Endpoint:');
console.log('\n  ' + token + '\n');
console.log('⚠️  This token will NOT be shown again. Store it securely.\n');
