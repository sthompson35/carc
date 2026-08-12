'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDb } = require('../db/database');

function mapRosterKind(kind) {
    if (kind.indexOf('ASSISTANT') !== -1) return 'assistant';
    if (kind === 'TROOPER') return 'trooper';
    if (kind === 'AI AGENT') return 'agent';
    return 'bot';
}

const db = initDb();
const roster = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'db', 'seed', 'roster.json'), 'utf8'));

const existing = db.prepare('SELECT COUNT(*) AS n FROM roster').get().n;
if (existing > 0) {
    console.log('Roster already seeded (' + existing + ' record(s) exist). Use /api/roster/sync to update readiness/status.');
    process.exit(0);
}

const insert = db.prepare(`
    INSERT INTO roster
        (service_member_id, callsign, display_name, kind, agent_id, role, command,
         status, readiness, canonical_status, mission_profile_json, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);

const insertAll = db.transaction((rows) => {
    for (const r of rows) {
        insert.run(
            r.serviceMemberId,
            r.callsign,
            r.displayName,
            mapRosterKind(r.kind),
            r.agentId,
            r.role,
            r.command,
            null,
            'READINESS_UNKNOWN',
            'CANONICAL_RECONCILED',
            null,
            new Date().toISOString()
        );
    }
});

insertAll(roster);
console.log('\n✅  Roster seeded: ' + roster.length + ' record(s).');
console.log('Readiness/status will be filled in when CARC syncs via POST /api/roster/sync.\n');
