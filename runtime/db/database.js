'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'carc.db');
let db;

function getDb() {
    if (!db) {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initDb() {
    const d = getDb();
    d.exec(`
        CREATE TABLE IF NOT EXISTS tokens (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            token_hash   TEXT    NOT NULL UNIQUE,
            description  TEXT,
            created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            last_used_at TEXT,
            active       INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS verifications (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            execution_id       TEXT    NOT NULL,
            evidence_id        TEXT,
            service_member_id  TEXT,
            captured_at        TEXT,
            source             TEXT,
            authorization      TEXT,
            execution_result   TEXT,
            verified           INTEGER NOT NULL DEFAULT 0,
            verifier_id        TEXT    NOT NULL,
            verified_at        TEXT    NOT NULL,
            reason             TEXT,
            signature          TEXT,
            request_ip         TEXT,
            created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_ver_exec ON verifications(execution_id);
        CREATE INDEX IF NOT EXISTS idx_ver_svc  ON verifications(service_member_id);
        CREATE INDEX IF NOT EXISTS idx_ver_ts   ON verifications(created_at);

        CREATE TABLE IF NOT EXISTS roster (
            service_member_id  TEXT    PRIMARY KEY,
            callsign            TEXT,
            display_name        TEXT,
            kind                TEXT,
            agent_id            TEXT,
            role                TEXT,
            command             TEXT,
            status              TEXT,
            readiness           TEXT,
            canonical_status    TEXT,
            mission_profile_json TEXT,
            updated_at          TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_roster_command   ON roster(command);
        CREATE INDEX IF NOT EXISTS idx_roster_readiness ON roster(readiness);

        CREATE TABLE IF NOT EXISTS readiness_history (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            service_member_id  TEXT    NOT NULL,
            readiness          TEXT,
            status              TEXT,
            recorded_at        TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_rh_svc ON readiness_history(service_member_id);
        CREATE INDEX IF NOT EXISTS idx_rh_ts  ON readiness_history(recorded_at);

        CREATE TABLE IF NOT EXISTS roll_calls (
            id             TEXT    PRIMARY KEY,
            date           TEXT,
            conv           TEXT,
            present        INTEGER,
            total          INTEGER,
            rate           REAL,
            status         TEXT,
            message        TEXT,
            response_mode  TEXT,
            synced_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_rc_date ON roll_calls(date);

        CREATE TABLE IF NOT EXISTS sync_events (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            sync_type        TEXT    NOT NULL,
            initiator        TEXT    NOT NULL DEFAULT 'manual',
            execution_id     TEXT,
            started_at       TEXT    NOT NULL,
            duration_ms      INTEGER,
            submitted_count  INTEGER,
            inserted_count   INTEGER,
            updated_count    INTEGER,
            unchanged_count  INTEGER,
            unmatched_count  INTEGER,
            result           TEXT    NOT NULL,
            error_message    TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_sync_events_type    ON sync_events(sync_type);
        CREATE INDEX IF NOT EXISTS idx_sync_events_started ON sync_events(started_at);
    `);

    // Migration: sync_events predates execution_id (added for cross-referencing a sync
    // response with its audit row). ADD COLUMN is a no-op if it already exists.
    const cols = d.prepare("PRAGMA table_info(sync_events)").all().map(function (c) { return c.name; });
    if (cols.indexOf('execution_id') === -1) {
        d.exec('ALTER TABLE sync_events ADD COLUMN execution_id TEXT');
    }
    d.exec('CREATE INDEX IF NOT EXISTS idx_sync_events_exec ON sync_events(execution_id)');

    return d;
}

function closeDb() {
    if (db) { db.close(); db = null; }
}

module.exports = { getDb, initDb, closeDb };
