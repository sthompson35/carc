'use strict';
// Recovery/rollback continuity exercise: seeds a throwaway DB, backs it up,
// simulates a disaster (delete), restores, then asserts data integrity.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRILL_DB = path.join(__dirname, '..', 'data', 'dr-drill-' + Date.now() + '.db');
process.env.DB_PATH = DRILL_DB;
process.env.SIGNING_SECRET = 'dr-drill-secret-' + crypto.randomBytes(8).toString('hex');

const { getDb, initDb, closeDb } = require('../db/database');
const { backupTo } = require('./backup');
const { restoreFrom } = require('./restore');

const backupDir = path.join(__dirname, '..', 'data', 'backups');
const backupFile = path.join(backupDir, 'dr-drill-backup.db');

function cleanup() {
    closeDb();
    ['', '-wal', '-shm'].forEach(function (suffix) {
        const f = DRILL_DB + suffix;
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
}

async function run() {
    let pass = 0, fail = 0;
    function assert(cond, label) {
        if (cond) { console.log('  PASS  ' + label); pass++; }
        else { console.error('  FAIL  ' + label); fail++; }
    }

    console.log('\n[DR DRILL] Throwaway database: ' + DRILL_DB);

    console.log('\n[1] Seed data');
    initDb();
    const db = getDb();
    db.prepare('INSERT INTO tokens (token_hash, description) VALUES (?, ?)').run('drill-hash-1', 'drill-token');
    db.prepare(`
        INSERT INTO verifications (execution_id, service_member_id, verified, verifier_id, verified_at)
        VALUES ('DRILL-EXEC-1', 'ATA-VEX-000', 1, 'DRILL-VERIFIER', datetime('now'))
    `).run();
    const beforeTokens = db.prepare('SELECT COUNT(*) AS n FROM tokens').get().n;
    const beforeVerifs = db.prepare('SELECT COUNT(*) AS n FROM verifications').get().n;
    assert(beforeTokens === 1 && beforeVerifs === 1, 'seed rows present before backup');

    console.log('\n[2] Backup');
    await backupTo(backupFile);
    assert(fs.existsSync(backupFile), 'backup file created');

    console.log('\n[3] Simulate disaster (delete live database)');
    closeDb();
    ['', '-wal', '-shm'].forEach(function (suffix) {
        const f = DRILL_DB + suffix;
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    assert(!fs.existsSync(DRILL_DB), 'live database deleted');

    console.log('\n[4] Restore from backup');
    restoreFrom(backupFile, DRILL_DB);
    assert(fs.existsSync(DRILL_DB), 'database file restored');

    console.log('\n[5] Verify restored data integrity');
    const db2 = getDb();
    const afterTokens = db2.prepare('SELECT COUNT(*) AS n FROM tokens').get().n;
    const afterVerifs = db2.prepare('SELECT COUNT(*) AS n FROM verifications').get().n;
    assert(afterTokens === beforeTokens, 'token count matches pre-disaster (' + afterTokens + '/' + beforeTokens + ')');
    assert(afterVerifs === beforeVerifs, 'verification count matches pre-disaster (' + afterVerifs + '/' + beforeVerifs + ')');
    const restoredExec = db2.prepare("SELECT execution_id FROM verifications WHERE execution_id = 'DRILL-EXEC-1'").get();
    assert(!!restoredExec, 'known execution_id survived restore');

    console.log('\n══════════════════════════════════════════');
    console.log('  DR drill complete: ' + pass + ' passed, ' + fail + ' failed');
    console.log('══════════════════════════════════════════\n');

    cleanup();
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(function (e) { console.error(e); cleanup(); process.exit(1); });
