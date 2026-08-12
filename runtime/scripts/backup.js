'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');

const DEFAULT_BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

async function backupTo(destPath) {
    const db = getDb();
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    await db.backup(destPath);
    return destPath;
}

async function main() {
    fs.mkdirSync(DEFAULT_BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(DEFAULT_BACKUP_DIR, 'carc-' + stamp + '.db');
    await backupTo(dest);
    console.log('\n✅  Backup written: ' + dest + '\n');
}

module.exports = { backupTo, DEFAULT_BACKUP_DIR };
if (require.main === module) {
    main().catch(function (e) { console.error('Backup failed:', e.message); process.exit(1); });
}
