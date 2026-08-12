'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { closeDb } = require('../db/database');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'carc.db');

function restoreFrom(backupFile, destPath) {
    closeDb();
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(backupFile, destPath);
    ['-wal', '-shm'].forEach(function (suffix) {
        const stale = destPath + suffix;
        if (fs.existsSync(stale)) fs.unlinkSync(stale);
    });
}

function main() {
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const backupFile = args.find(function (a) { return !a.startsWith('--'); });
    if (!backupFile) {
        console.error('Usage: node scripts/restore.js <backupFile> [--force]');
        process.exit(1);
    }
    if (!fs.existsSync(backupFile)) {
        console.error('Backup file not found: ' + backupFile);
        process.exit(1);
    }
    if (fs.existsSync(DB_PATH) && !force) {
        console.error('Refusing to overwrite existing database at ' + DB_PATH + ' without --force.');
        process.exit(1);
    }
    restoreFrom(backupFile, DB_PATH);
    console.log('\n✅  Restored ' + DB_PATH + ' from ' + backupFile + '\n');
}

module.exports = { restoreFrom };
if (require.main === module) main();
