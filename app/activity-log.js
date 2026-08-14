'use strict';
// app/activity-log.js

    function addLog(event, status, meta) {
        var entry = { time: nowTime(), at: new Date().toISOString(), event: event, status: status || 'info' };
        if (meta) {
            if (meta.correlationId) entry.correlationId = meta.correlationId;
            if (meta.risk) entry.risk = meta.risk;
            if (meta.contentHash) entry.contentHash = meta.contentHash;
        }
        DATA.activityLog.unshift(entry);
        if (DATA.activityLog.length > 150) DATA.activityLog = DATA.activityLog.slice(0, 150);
        renderActivityLog();
    }

    // ================================================================
    // MODAL SYSTEM
    // ================================================================

    function renderActivityLog() {
        var container = document.getElementById('activityLog');
        if (!container) return;
        var logs = DATA.activityLog.slice(0, 20);
        document.getElementById('logCount').textContent = DATA.activityLog.length + ' events';
        container.innerHTML = logs.map(function (log) {
            return '<div class="log-item"><span class="log-time">' + esc(log.time) + '</span><span class="log-event">' + esc(log.event) + '</span><span class="log-status ' + log.status + '">' + esc(log.status) + '</span></div>';
        }).join('');
    }

    // ================================================================
    // PARTICIPANTS GRID
    // ================================================================
