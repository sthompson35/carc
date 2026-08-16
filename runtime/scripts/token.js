'use strict';
require('dotenv').config();
const crypto = require('crypto');
const { initDb } = require('../db/database');
const { hashToken } = require('../middleware/auth');

const db = initDb();
const [,, cmd, ...args] = process.argv;

switch (cmd) {
    case 'add': {
        const desc = args[0] || ('token-' + Date.now());
        const scope = args[1] === 'admin' ? 'admin' : 'standard';
        const token = 'carc-' + crypto.randomBytes(20).toString('hex');
        db.prepare('INSERT INTO tokens (token_hash, description, scope) VALUES (?, ?, ?)').run(hashToken(token), desc, scope);
        console.log('\nNew ' + scope + ' token [' + desc + ']:\n\n  ' + token + '\n');
        break;
    }
    case 'list': {
        const rows = db.prepare(
            'SELECT id, description, scope, created_at, last_used_at, active FROM tokens ORDER BY id'
        ).all();
        console.table(rows);
        break;
    }
    case 'revoke': {
        const id = parseInt(args[0], 10);
        if (!id) { console.error('Usage: node scripts/token.js revoke <id>'); process.exit(1); }
        const info = db.prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(id);
        console.log(info.changes ? 'Token ' + id + ' revoked.' : 'Token ' + id + ' not found.');
        break;
    }
    default:
        console.log('Usage: node scripts/token.js <add [description] [admin] | list | revoke <id>>');
}
