'use strict';
const crypto = require('crypto');

// Shared by routes/roster.js and routes/rollcalls.js so both sync endpoints
// write to the same audit trail in the same shape.

function newExecutionId(syncType) {
    return 'SYNC-' + syncType.toUpperCase() + '-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

function recordSyncEvent(db, evt) {
    db.prepare(`
        INSERT INTO sync_events
            (sync_type, initiator, execution_id, started_at, duration_ms, submitted_count,
             inserted_count, updated_count, unchanged_count, unmatched_count,
             result, error_message)
        VALUES (@syncType, @initiator, @executionId, @startedAt, @durationMs, @submittedCount,
                @insertedCount, @updatedCount, @unchangedCount, @unmatchedCount,
                @result, @errorMessage)
    `).run({
        syncType:       evt.syncType,
        initiator:      evt.initiator || 'manual',
        executionId:    evt.executionId || null,
        startedAt:      evt.startedAt,
        durationMs:     evt.durationMs != null ? evt.durationMs : null,
        submittedCount: evt.submittedCount != null ? evt.submittedCount : null,
        insertedCount:  evt.insertedCount != null ? evt.insertedCount : 0,
        updatedCount:   evt.updatedCount != null ? evt.updatedCount : 0,
        unchangedCount: evt.unchangedCount != null ? evt.unchangedCount : 0,
        unmatchedCount: evt.unmatchedCount != null ? evt.unmatchedCount : 0,
        result:         evt.result,
        errorMessage:   evt.errorMessage || null
    });
}

function rowToJson(row) {
    return {
        id: row.id,
        syncType: row.sync_type,
        initiator: row.initiator,
        executionId: row.execution_id,
        startedAt: row.started_at,
        durationMs: row.duration_ms,
        submittedCount: row.submitted_count,
        insertedCount: row.inserted_count,
        updatedCount: row.updated_count,
        unchangedCount: row.unchanged_count,
        unmatchedCount: row.unmatched_count,
        result: row.result,
        errorMessage: row.error_message
    };
}

module.exports = { recordSyncEvent, rowToJson, newExecutionId };
