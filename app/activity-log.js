'use strict';
// app/activity-log.js

    function addLog(event, status, meta) {
        var allowedStatuses = { info:true, success:true, warning:true, error:true };
        status = allowedStatuses[status] ? status : 'info';
        var entry = { time: nowTime(), at: new Date().toISOString(), event: event, status: status };
        if (meta) {
            ['correlationId','batchId','serviceMemberId','executionId','verifierId','signature','outcome','risk','contentHash'].forEach(function (key) {
                if (meta[key] !== undefined && meta[key] !== null && meta[key] !== '') entry[key] = meta[key];
            });
        }
        DATA.activityLog.unshift(entry);
        if (DATA.activityLog.length > 500) DATA.activityLog = DATA.activityLog.slice(0, 500);
        // Activity is audit evidence. Persist synchronously so a reload immediately after an
        // action cannot erase the newest entry. saveDataNow is defined later during startup.
        if (typeof saveDataNow === 'function') saveDataNow();
        renderActivityLog();
        return entry;
    }

    // ================================================================
    // MODAL SYSTEM
    // ================================================================

    function renderActivityLog() {
        var container = document.getElementById('activityLog');
        if (!container) return;
        var logs = DATA.activityLog.slice(0, 20);
        var count = document.getElementById('logCount');
        if (count) count.textContent = DATA.activityLog.length + ' events';
        container.innerHTML = logs.map(function (log) {
            var safeStatus = ({info:1,success:1,warning:1,error:1})[log.status] ? log.status : 'info';
            return '<div class="log-item"><span class="log-time">' + esc(log.time) + '</span><span class="log-event">' + esc(log.event) + '</span><span class="log-status ' + safeStatus + '">' + esc(safeStatus) + '</span></div>';
        }).join('');
    }

    // ================================================================
    // PARTICIPANTS GRID
    // ================================================================
