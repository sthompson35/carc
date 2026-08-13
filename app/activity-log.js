'use strict';
// app/activity-log.js

    function addLog(event, status) {
        DATA.activityLog.unshift({ time: nowTime(), at: new Date().toISOString(), event: event, status: status || 'info' });
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
