'use strict';
// app/pages/agent.js

    function renderAgentPage() {
        var a = DATA.agent;
        var badge = document.getElementById('agentStateBadge');
        badge.className = 'agent-state-badge ' + a.state;
        document.getElementById('agentStateText').textContent = a.state.charAt(0).toUpperCase() + a.state.slice(1);
        document.getElementById('agentName').textContent = a.name;
        document.getElementById('agentLastRun').textContent = relTime(a.lastRun);
        document.getElementById('agentNextRun').textContent = a.autoMode ? relTimeFuture(computeNextRun()) : 'Auto mode paused';
        document.getElementById('agentTotalRuns').textContent = a.totalRuns;
        document.getElementById('agentSuccessRate').textContent = computeAttendance() + '%';
        document.getElementById('agentIntervalDisplay').textContent = a.intervalMinutes >= 60 ? (a.intervalMinutes / 60) + 'h' : a.intervalMinutes + 'm';
        document.getElementById('btnToggleAutoMode').textContent = a.autoMode ? '⏸️ Pause Auto' : '▶️ Resume Auto';
        document.getElementById('btnRunRollCallNow').disabled = a.state === 'running';
        renderUpcomingSchedule();

        renderRollCallHistoryGrid();
    }


    function openRenameAgentModal() {
        var body = '<div class="form-group"><label>Agent Name</label><input type="text" id="raName" value="' + esc(DATA.agent.name) + '" placeholder="e.g. Council Roll Call Agent"></div>';
        var footer = '<button class="btn btn-outline" id="raCancel">Cancel</button><button class="btn btn-primary" id="raSave">Save</button>';
        openModal('Rename Agent', body, footer);
        document.getElementById('raCancel').addEventListener('click', closeModal);
        document.getElementById('raSave').addEventListener('click', function () {
            var name = document.getElementById('raName').value.trim();
            if (!name) { showToast('error', '❌ Name cannot be empty'); return; }
            var oldName = DATA.agent.name;
            DATA.agent.name = name;
            addLog('Agent renamed from "' + oldName + '" to "' + name + '"', 'info');
            saveData(); renderAgentPage(); closeModal();
            showToast('success', '✅ Agent renamed to ' + name);
        });
    }


    function wireAgentPage() {
        document.getElementById('btnRunRollCallNow').addEventListener('click', startRollCall);
        document.getElementById('btnToggleAutoMode').addEventListener('click', function () {
            DATA.agent.autoMode = !DATA.agent.autoMode;
            addLog('Agent auto mode ' + (DATA.agent.autoMode ? 'resumed' : 'paused'), 'info');
            saveData(); renderAgentPage();
        });
        document.getElementById('agentIntervalSelect').addEventListener('change', function (e) {
            DATA.agent.intervalMinutes = parseInt(e.target.value, 10);
            addLog('Agent interval set to ' + e.target.value + ' minutes', 'info');
            saveData(); renderAgentPage();
        });
        document.getElementById('btnEditAgentName').addEventListener('click', openRenameAgentModal);
        document.getElementById('agentAlertThreshold').addEventListener('change', function (e) {
            var val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            e.target.value = val;
            DATA.agent.alertThreshold = val;
            addLog('Attendance alert threshold set to ' + val + '%', 'info');
            saveData(); renderAttentionPanel();
        });

        document.getElementById('rcSearchInput').addEventListener('input', debounce(function (e) { rcState.search = e.target.value; rcState.page = 1; renderRollCallHistoryGrid(); }, 200));
        document.getElementById('btnExportRcCsv').addEventListener('click', exportRollCallCsv);
        $all('th.sortable', document.getElementById('page-agent')).forEach(function (th) {
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'button');
            function toggleSort() {
                var key = th.getAttribute('data-key');
                if (rcState.sortKey === key) rcState.sortDir = rcState.sortDir === 'asc' ? 'desc' : 'asc';
                else { rcState.sortKey = key; rcState.sortDir = 'asc'; }
                renderRollCallHistoryGrid();
            }
            th.addEventListener('click', toggleSort);
            th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(); } });
        });
        document.getElementById('rollCallHistoryBody').addEventListener('click', function (e) {
            var btn = e.target.closest('button[data-act="delete"]');
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            var rc = DATA.rollCalls.find(function (x) { return x.id === id; });
            if (!rc) return;
            var removeIdx = DATA.rollCalls.indexOf(rc);
            DATA.rollCalls = DATA.rollCalls.filter(function (x) { return x.id !== id; });
            addLog('Roll call record deleted: ' + rc.conv, 'warning');
            saveData(); renderAgentPage();
            showToast('warning', '🗑️ Deleted "' + rc.conv + '"', {
                label: 'Undo', onClick: function () {
                    DATA.rollCalls.splice(Math.min(removeIdx, DATA.rollCalls.length), 0, rc);
                    addLog('Roll call record restored: ' + rc.conv, 'info');
                    saveData(); renderAgentPage();
                }
            });
        });

        var chatTarget = document.getElementById('chatTarget');
        if (chatTarget) {
            DATA.participants.slice().sort(function(a,b){ return String(a.callsign).localeCompare(String(b.callsign)); }).forEach(function(p){
                var opt = document.createElement('option');
                opt.value = p.serviceMemberId;
                opt.textContent = p.callsign + ' · ' + p.role;
                chatTarget.appendChild(opt);
            });
            var saved = DATA.agent.chatTarget || 'AUTO';
            if (![].slice.call(chatTarget.options).some(function (o) { return o.value === saved; })) saved = 'AUTO';
            chatTarget.value = saved;
            var badge = document.getElementById('chatRouteBadge');
            if (badge) badge.textContent = saved === 'AUTO' ? 'AUTO' : (saved === 'ALL' ? 'ALL' : ((DATA.participants.find(function(p){return p.serviceMemberId===saved;})||{}).callsign || 'TARGET'));
            chatTarget.addEventListener('change', function () {
                DATA.agent.chatTarget = chatTarget.value;
                saveData();
                var badge = document.getElementById('chatRouteBadge');
                if (badge) badge.textContent = chatTarget.value === 'AUTO' ? 'AUTO' : (chatTarget.value === 'ALL' ? 'ALL' : ((DATA.participants.find(function(p){return p.serviceMemberId===chatTarget.value;})||{}).callsign || 'TARGET'));
            });
        }
        document.getElementById('chatSearchInput').addEventListener('input', debounce(function (e) { chatSearchQuery = e.target.value; renderChat(); }, 150));
        document.getElementById('btnChatSend').addEventListener('click', function () { sendChat(); });
        document.getElementById('chatInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { sendChat(); return; }
            if (e.key === 'ArrowUp') {
                if (!chatCmdHistory.length) return;
                e.preventDefault();
                chatCmdHistoryPos = Math.max(0, chatCmdHistoryPos - 1);
                e.target.value = chatCmdHistory[chatCmdHistoryPos] || '';
            } else if (e.key === 'ArrowDown') {
                if (!chatCmdHistory.length) return;
                e.preventDefault();
                chatCmdHistoryPos = Math.min(chatCmdHistory.length, chatCmdHistoryPos + 1);
                e.target.value = chatCmdHistory[chatCmdHistoryPos] || '';
            }
        });
        $all('.chat-suggestions button').forEach(function (btn) { btn.addEventListener('click', function () { sendChat(btn.getAttribute('data-q')); }); });
        document.getElementById('btnChatClear').addEventListener('click', function () {
            if (confirm('Clear the entire chat history? This cannot be undone.')) clearChatHistory();
        });
        document.getElementById('btnChatExport').addEventListener('click', exportChatTranscript);
        document.getElementById('agentIntervalSelect').value = String(DATA.agent.intervalMinutes);
        document.getElementById('agentAlertThreshold').value = DATA.agent.alertThreshold != null ? DATA.agent.alertThreshold : 70;
    }

    // ================================================================
    // GOVERNANCE / PRODUCTION CONTROL
    // ================================================================
