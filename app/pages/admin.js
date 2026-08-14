'use strict';
// app/pages/admin.js

    var adminLogState = { search: '', status: '', sortKey: 'at', sortDir: 'desc', page: 1, pageSize: 10 };


    function renderAdminOverview() {
        var el = document.getElementById('adminOverviewGrid');
        if (!el) return;
        var gate = governanceGateState();
        var tiles = [
            { label: '👥 Participants', value: DATA.participants.length, route: 'participants' },
            { label: '💬 Conversations', value: DATA.conversations.length, route: 'conversations' },
            { label: '📋 Roll Calls Run', value: DATA.rollCalls.length, route: 'agent' },
            { label: '🛡️ Gate Progress', value: gate.verified + '/' + gate.total, route: 'governance' },
            { label: '📜 Log Events', value: DATA.activityLog.length, route: 'admin' },
            { label: '🗄️ Schema', value: 'v' + DATA.schemaVersion, route: 'admin' }
        ];
        el.innerHTML = tiles.map(function (t) {
            return '<div class="stat-card stat-clickable" data-route="' + t.route + '" tabindex="0" role="link" aria-label="View ' + esc(t.route) + '"><div class="label">' + esc(t.label) + '</div><div class="value">' + t.value + '</div></div>';
        }).join('');
        el.onclick = function (e) { var card = e.target.closest('.stat-clickable'); if (card) navigate(card.getAttribute('data-route')); };
        el.onkeydown = function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var card = e.target.closest('.stat-clickable');
            if (!card) return;
            e.preventDefault(); navigate(card.getAttribute('data-route'));
        };
    }


    function renderAdminTypeRegistry() {
        var body = document.getElementById('adminTypeRegistryBody');
        if (!body) return;
        var byType = {};
        DATA.participants.forEach(function (p) {
            if (!byType[p.type]) byType[p.type] = { count: 0, depts: {} };
            byType[p.type].count += 1;
            if (p.dept) byType[p.type].depts[p.dept] = true;
        });
        var rows = Object.keys(TYPE_LABELS).map(function (t) {
            var info = byType[t] || { count: 0, depts: {} };
            var deptList = Object.keys(info.depts);
            return '<tr><td><span class="badge ' + (TYPE_BADGE[t] || '') + '">' + esc(TYPE_LABELS[t]) + '</span></td><td>' + info.count + '</td><td class="text-sm text-muted">' + (deptList.length ? esc(deptList.slice(0, 3).join(', ')) + (deptList.length > 3 ? ' +' + (deptList.length - 3) + ' more' : '') : '—') + '</td></tr>';
        });
        body.innerHTML = rows.join('') || '<tr><td colspan="3"><div class="empty-state"><div class="ic">🏷️</div>No types registered</div></td></tr>';
    }


    function renderAdminDataSummary() {
        document.getElementById('admStorageUsed').textContent = ((new Blob([JSON.stringify(DATA)]).size) / 1024).toFixed(1) + ' KB';
        document.getElementById('admCounts').textContent = DATA.participants.length + ' / ' + DATA.conversations.length;
        document.getElementById('admRegistryIntegrity').textContent = auditCanonicalRegistry(DATA.participants).valid ? 'PASS' : 'FAIL';
        document.getElementById('admProductionState').textContent = DATA.governance.productionState;
        document.getElementById('admSchemaVersion').textContent = 'v' + DATA.schemaVersion;
    }


    function renderAdminLogGrid() {
        var result = filterSortPaginate(DATA.activityLog, {
            search: adminLogState.search,
            searchFn: function (r, q) { return r.event.toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: adminLogState.status ? [function (r) { return r.status === adminLogState.status; }] : [],
            sortKey: adminLogState.sortKey, sortDir: adminLogState.sortDir, page: adminLogState.page, pageSize: adminLogState.pageSize
        });
        adminLogState.page = result.page;

        var body = document.getElementById('adminLogBody');
        body.innerHTML = result.rows.map(function (r) {
            return '<tr><td class="text-sm">' + esc(r.at ? fmtDate(r.at) : r.time) + '</td><td>' + esc(r.event) + '</td><td><span class="log-status ' + esc(r.status) + '">' + esc(r.status) + '</span></td></tr>';
        }).join('') || '<tr><td colspan="3"><div class="empty-state"><div class="ic">📜</div>No activity matches</div></td></tr>';

        document.getElementById('adminLogCount').textContent = result.total + ' total';
        renderPagination(document.getElementById('adminLogPagination'), adminLogState, result, renderAdminLogGrid);
        $all('th.sortable', document.getElementById('page-admin')).forEach(function (th) {
            th.classList.toggle('sorted', th.getAttribute('data-key') === adminLogState.sortKey);
            var arrow = th.querySelector('.arrow');
            if (arrow) arrow.textContent = adminLogState.sortDir === 'asc' ? '▲' : '▼';
        });
    }


    function exportAdminLogCsv() {
        var result = filterSortPaginate(DATA.activityLog, {
            search: adminLogState.search,
            searchFn: function (r, q) { return r.event.toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: adminLogState.status ? [function (r) { return r.status === adminLogState.status; }] : [],
            sortKey: adminLogState.sortKey, sortDir: adminLogState.sortDir, page: 1, pageSize: 1e9
        });
        var csv = toCSV(result.rows, [
            { label: 'When', get: function (r) { return r.at || r.time; } },
            { label: 'Event', get: function (r) { return r.event; } },
            { label: 'Status', get: function (r) { return r.status; } }
        ]);
        downloadCSV('carc_audit_log_' + new Date().toISOString().slice(0, 10) + '.csv', csv);
        showToast('success', '⬇️ Exported ' + result.total + ' activity log entries as CSV');
    }

    // ----------------------------------------------------------------
    // ADMIN TOOLS
    // ----------------------------------------------------------------

    function toolIdLookup() {
        var input = document.getElementById('toolIdLookupInput');
        var q = input.value.trim();
        var resultEl = document.getElementById('toolIdLookupResult');
        if (!q) { resultEl.innerHTML = '<span class="text-muted">Enter an ID, callsign, or alias to search.</span>'; return; }
        var p = null, collision = false;
        try { p = resolveCanonicalIdentity(q, DATA.participants); }
        catch (e) { collision = String(e.message || '').indexOf('ALIAS_IDENTITY_COLLISION') === 0; p = null; }
        if (collision) { resultEl.innerHTML = '<span class="audit-bad">Multiple canonical identities match "' + esc(q) + '" — this alias is ambiguous and requires registry correction.</span>'; return; }
        if (!p) { resultEl.innerHTML = '<span class="text-muted">No match found for "' + esc(q) + '".</span>'; return; }
        resultEl.innerHTML =
            '<div class="kv-row"><span>Name</span><b>' + esc(p.name) + '</b></div>' +
            '<div class="kv-row"><span>Callsign</span><b>' + esc(p.callsign || '') + '</b></div>' +
            '<div class="kv-row"><span>Type</span><span class="badge ' + (TYPE_BADGE[p.type] || '') + '">' + esc(TYPE_LABELS[p.type] || p.type) + '</span></div>' +
            '<div class="kv-row"><span>Department</span><span>' + esc(p.dept || '—') + '</span></div>' +
            '<div class="kv-row"><span>Service Member ID</span><span>' + esc(p.serviceMemberId || '—') + '</span></div>' +
            '<div class="kv-row"><span>Callsign ID</span><span>' + esc(p.callsignId || '—') + '</span></div>' +
            '<div class="kv-row"><span>Agent ID</span><span>' + esc(p.agentId || '—') + '</span></div>' +
            '<div class="kv-row"><span>Legacy Alias</span><span>' + esc(p.legacyAlias || '—') + '</span></div>' +
            '<div class="kv-row"><span>Status</span><span>' + esc(p.status) + '</span></div>' +
            '<div class="admin-actions"><button class="btn btn-outline btn-sm" id="toolIdLookupGoto">View in Participants</button></div>';
        document.getElementById('toolIdLookupGoto').addEventListener('click', function () {
            navigate('participants');
            partState.search = p.name; partState.page = 1;
            var box = document.getElementById('partSearchInput'); if (box) box.value = p.name;
            renderParticipantsGrid();
        });
    }


    function toolRunCollisionCheck() {
        var resultEl = document.getElementById('toolCollisionResult');
        var fields = ['callsign', 'serviceMemberId', 'callsignId', 'agentId'];
        var collisions = [];
        fields.forEach(function (field) {
            var seen = {};
            DATA.participants.forEach(function (p) {
                var v = p[field];
                if (!v) return;
                var key = String(v).toUpperCase();
                (seen[key] = seen[key] || []).push(p.name);
            });
            Object.keys(seen).forEach(function (key) {
                if (seen[key].length > 1) collisions.push({ field: field, value: key, names: seen[key] });
            });
        });

        var roleOverlaps = [];
        var seenRoles = {};
        DATA.participants.forEach(function (p) {
            if (!p.role) return;
            var key = String(p.role).trim().toUpperCase();
            (seenRoles[key] = seenRoles[key] || []).push(p.name);
        });
        Object.keys(seenRoles).forEach(function (key) {
            if (seenRoles[key].length > 1) roleOverlaps.push({ role: key, names: seenRoles[key] });
        });

        var html = '';
        html += collisions.length
            ? collisions.map(function (c) { return '<div class="kv-row"><span>' + esc(c.field) + ' = ' + esc(c.value) + '</span><span class="audit-bad">' + esc(c.names.join(', ')) + '</span></div>'; }).join('')
            : '<div class="audit-ok">✅ No duplicate callsigns, Service Member IDs, Callsign IDs, or Agent IDs found across ' + DATA.participants.length + ' participants.</div>';
        html += '<div class="mt-2"><strong class="text-sm">Role Overlap</strong></div>';
        html += roleOverlaps.length
            ? roleOverlaps.map(function (r) { return '<div class="kv-row"><span>' + esc(r.role) + '</span><span class="text-muted">' + esc(r.names.join(', ')) + '</span></div>'; }).join('')
            : '<div class="audit-ok">✅ No two participants share the exact same role.</div>';
        resultEl.innerHTML = html;
        addLog('Collision check run: ' + collisions.length + ' collision(s), ' + roleOverlaps.length + ' role overlap(s) found', (collisions.length || roleOverlaps.length) ? 'warning' : 'success');
    }


    function toolBulkReplaceDept() {
        var find = document.getElementById('toolFindDept').value.trim();
        var replace = document.getElementById('toolReplaceDept').value.trim();
        var resultEl = document.getElementById('toolBulkReplaceResult');
        if (!find || !replace) { resultEl.innerHTML = '<span class="audit-bad">Enter both a department to find and a replacement.</span>'; return; }
        var matches = DATA.participants.filter(function (p) { return p.dept === find; });
        if (!matches.length) { resultEl.innerHTML = '<span class="text-muted">No participants found with department "' + esc(find) + '".</span>'; return; }
        if (!confirm('Rename department "' + find + '" to "' + replace + '" for ' + matches.length + ' participant(s)? This cannot be undone.')) return;
        matches.forEach(function (p) { p.dept = replace; });
        addLog('Bulk department rename: "' + find + '" → "' + replace + '" (' + matches.length + ' participants)', 'success');
        saveData(); populateDeptFilter(); renderAll(); renderAdminPage();
        resultEl.innerHTML = '<span class="audit-ok">✅ Updated ' + matches.length + ' participant(s).</span>';
        document.getElementById('toolFindDept').value = ''; document.getElementById('toolReplaceDept').value = '';
        showToast('success', '🔁 Renamed department for ' + matches.length + ' participant(s)');
    }


    function toolScanStorage() {
        var body = document.getElementById('toolStorageBody');
        var rows = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key.indexOf('carc_') !== 0) continue;
            var size = ((new Blob([localStorage.getItem(key) || '']).size) / 1024).toFixed(1) + ' KB';
            rows.push({ key: key, size: size, protectedKey: key === STORAGE_KEY });
        }
        rows.sort(function (a, b) { return a.key.localeCompare(b.key); });
        body.innerHTML = rows.map(function (r) {
            return '<tr><td class="text-sm">' + esc(r.key) + '</td><td class="text-sm">' + r.size + '</td><td>' +
                (r.protectedKey ? '<span class="text-xs text-muted">protected</span>' : '<button class="btn btn-outline btn-sm tool-storage-delete" data-key="' + esc(r.key) + '">🗑️ Delete</button>') +
                '</td></tr>';
        }).join('') || '<tr><td colspan="3"><div class="empty-state"><div class="ic">🧹</div>No CARC keys found</div></td></tr>';
        $all('.tool-storage-delete', body).forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-key');
                if (!confirm('Delete localStorage key "' + key + '"? This cannot be undone.')) return;
                localStorage.removeItem(key);
                addLog('Deleted localStorage key "' + key + '" via Admin Tools', 'warning');
                toolScanStorage();
                showToast('success', '🧹 Deleted "' + key + '"');
            });
        });
    }


    function toolRunDiff(file) {
        var resultEl = document.getElementById('toolDiffResult');
        var reader = new FileReader();
        reader.onload = function (evt) {
            var incoming;
            try {
                var parsed = JSON.parse(evt.target.result);
                incoming = parsed && parsed.data ? parsed.data : parsed;
                if (!incoming || !Array.isArray(incoming.participants) || !Array.isArray(incoming.conversations)) throw new Error('bad schema');
            } catch (err) {
                resultEl.innerHTML = '<span class="audit-bad">❌ Invalid backup file format.</span>';
                return;
            }
            function diffCollection(currentArr, incomingArr, label) {
                var currentIds = {}; currentArr.forEach(function (x) { currentIds[x.id] = x; });
                var incomingIds = {}; incomingArr.forEach(function (x) { incomingIds[x.id] = x; });
                var added = incomingArr.filter(function (x) { return !currentIds[x.id]; }).length;
                var removed = currentArr.filter(function (x) { return !incomingIds[x.id]; }).length;
                var changed = incomingArr.filter(function (x) { return currentIds[x.id] && JSON.stringify(currentIds[x.id]) !== JSON.stringify(x); }).length;
                return '<div class="kv-row"><span>' + label + '</span><span>' + added + ' added · ' + removed + ' removed · ' + changed + ' changed</span></div>';
            }
            resultEl.innerHTML = diffCollection(DATA.participants, incoming.participants, 'Participants') + diffCollection(DATA.conversations, incoming.conversations, 'Conversations');
            addLog('Backup diff run against uploaded file', 'info');
        };
        reader.readAsText(file);
    }


    function renderAdminRuntimePanel() {
        var panel = document.getElementById('admRuntimePanel');
        var backupBtn = document.getElementById('admBtnBackupNow');
        if (!panel) return;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) {
            panel.innerHTML = '<div class="text-muted text-sm">Not connected — configure a runtime endpoint in Governance first.</div>';
            if (backupBtn) backupBtn.disabled = true;
            return;
        }
        if (backupBtn) backupBtn.disabled = false;
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        panel.innerHTML = '<div class="text-muted text-sm">Loading…</div>';

        Promise.all([
            fetch(base + '/health', { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
            fetch(base + '/api/sync-status', { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
            fetch(base + '/api/sync-events?limit=5', { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
            fetch(base + '/api/admin/backups', { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return null; })
        ]).then(function(res) {
            var health = res[0], status = res[1], events = res[2], backups = res[3];
            var stateCls = { CURRENT:'audit-ok', STALE:'audit-warn', ERROR:'audit-bad', UNSYNCED:'' };
            var html = '';
            html += '<div class="kv-row"><span>Backend health</span><span class="'+(health && health.status==='OK'?'audit-ok':'audit-bad')+'">'+(health ? esc(health.status)+' · '+esc(health.verifications)+' verifications' : 'UNREACHABLE')+'</span></div>';
            if (status) {
                html += '<div class="kv-row"><span>Roster state</span><span class="'+(stateCls[status.roster && status.roster.state]||'')+'">'+esc((status.roster && status.roster.state) || '—')+'</span></div>';
                html += '<div class="kv-row"><span>Roll-call state</span><span class="'+(stateCls[status.roll_calls && status.roll_calls.state]||'')+'">'+esc((status.roll_calls && status.roll_calls.state) || '—')+'</span></div>';
            }
            if (events && events.rows && events.rows.length) {
                html += '<div class="text-xs text-muted mt-2 mb-1">RECENT SYNC EVENTS</div>';
                html += events.rows.slice(0,5).map(function(r){
                    return '<div class="kv-row"><span class="text-xs">'+esc(r.syncType)+' · '+esc(r.initiator)+'</span><span class="text-xs '+(r.result==='success'?'audit-ok':'audit-bad')+'">'+esc(r.result)+' · '+esc(fmtDate(r.startedAt))+'</span></div>';
                }).join('');
            }
            if (backups) {
                var bList = backups.backups || [];
                html += '<div class="text-xs text-muted mt-2 mb-1">RECENT BACKUPS ('+bList.length+')</div>';
                html += bList.length ? bList.slice(0,5).map(function(b){
                    return '<div class="kv-row"><span class="text-xs">'+esc(b.file)+'</span><span class="text-xs">'+Math.round(b.sizeBytes/1024)+' KB · '+esc(fmtDate(b.createdAt))+'</span></div>';
                }).join('') : '<div class="text-xs text-muted">No backups yet.</div>';
            }
            panel.innerHTML = html || '<div class="text-muted text-sm">No data returned.</div>';
        });
    }


    function renderAdminPage() {
        if (!DATA.settings) DATA.settings = { defaultPageSize: 8 };
        renderAdminOverview();
        renderAdminTypeRegistry();
        renderAdminDataSummary();
        renderAdminLogGrid();
        renderTasksGrid();
        renderHandoffsGrid();
        renderAdminRuntimePanel();
        var themeToggle = document.getElementById('admThemeToggle');
        if (themeToggle) themeToggle.checked = document.documentElement.getAttribute('data-theme') === 'dark';
        var autoToggle = document.getElementById('admAutoMode');
        if (autoToggle) autoToggle.checked = DATA.agent.autoMode;
        var pageSizeSel = document.getElementById('admDefaultPageSize');
        if (pageSizeSel) pageSizeSel.value = String(DATA.settings.defaultPageSize || 8);
        var alertInput = document.getElementById('admAlertThreshold');
        if (alertInput) alertInput.value = DATA.agent.alertThreshold != null ? DATA.agent.alertThreshold : 70;
    }


    function wireAdminPage() {
        document.getElementById('btnAdminRefresh').addEventListener('click', function () {
            renderAdminPage();
            addLog('Admin overview refreshed', 'info');
            showToast('success', '🔄 Admin overview refreshed');
        });
        document.getElementById('admThemeToggle').addEventListener('change', function (e) { setTheme(e.target.checked ? 'dark' : 'light'); });
        document.getElementById('admAutoMode').addEventListener('change', function (e) {
            DATA.agent.autoMode = e.target.checked; saveData(); renderAgentPage();
            addLog('Agent auto mode ' + (e.target.checked ? 'enabled' : 'disabled') + ' from Admin', 'info');
        });
        document.getElementById('admDefaultPageSize').addEventListener('change', function (e) {
            if (!DATA.settings) DATA.settings = {};
            DATA.settings.defaultPageSize = parseInt(e.target.value, 10);
            saveData();
            showToast('success', '⚙️ Default page size set to ' + e.target.value + ' (applies to grids on next load)');
        });
        document.getElementById('admAlertThreshold').addEventListener('change', function (e) {
            var val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            DATA.agent.alertThreshold = val;
            e.target.value = val;
            addLog('Attendance alert threshold set to ' + val + '% from Admin', 'info');
            saveData(); renderAttentionPanel();
        });

        document.getElementById('admBtnRefreshRuntime').addEventListener('click', renderAdminRuntimePanel);
        document.getElementById('admBtnBackupNow').addEventListener('click', function () {
            var ep = (DATA.governance && DATA.governance.endpoint) || {};
            if (!ep.url) { showToast('error', '❌ No endpoint URL configured'); return; }
            var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
            var headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;
            var base = ep.url.replace(/\/+$/, '');
            var btn = document.getElementById('admBtnBackupNow');
            btn.disabled = true; btn.textContent = '…';
            fetch(base + '/api/admin/backup', { method:'POST', headers:headers, body: JSON.stringify({}) })
                .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, data:d }; }); })
                .then(function(res) {
                    if (!res.ok) throw new Error((res.data && res.data.reason) || 'backup failed');
                    showToast('success', '✅ Backup created: ' + res.data.backupFile + ' (' + Math.round(res.data.sizeBytes/1024) + ' KB)');
                    addGovernanceLedger('endpoint', 'Runtime backup created: ' + res.data.backupFile);
                    saveData();
                    btn.disabled = false; btn.textContent = '💾 Backup Runtime Now';
                    renderAdminRuntimePanel();
                })
                .catch(function(err) {
                    showToast('error', '❌ Backup failed: ' + err.message);
                    btn.disabled = false; btn.textContent = '💾 Backup Runtime Now';
                });
        });
        document.getElementById('admBtnExportJson').addEventListener('click', exportData);
        document.getElementById('admBtnImportJson').addEventListener('click', function () { document.getElementById('importFileInput').click(); });
        document.getElementById('admBtnExportParticipantsCsv').addEventListener('click', exportParticipantsCsv);
        document.getElementById('admBtnExportAuditCsv').addEventListener('click', exportAdminLogCsv);
        document.getElementById('admBtnExportAuditCsv2').addEventListener('click', exportAdminLogCsv);

        document.getElementById('admBtnClearLog').addEventListener('click', function () {
            if (!confirm('Clear the entire activity/audit log? This cannot be undone.')) return;
            DATA.activityLog = [];
            saveData(); renderAdminPage(); renderActivityLog();
            showToast('success', '🧹 Activity log cleared');
        });
        document.getElementById('admBtnClearRollCalls').addEventListener('click', function () {
            if (!confirm('Clear all roll call history? This cannot be undone.')) return;
            DATA.rollCalls = [];
            saveData(); renderAdminPage(); addLog('Roll call history cleared from Admin', 'warning');
            showToast('success', '🧹 Roll call history cleared');
        });
        document.getElementById('admBtnDeleteConversations').addEventListener('click', function () {
            if (!confirm('Delete ALL conversations? This cannot be undone.')) return;
            DATA.conversations = [];
            saveData(); renderAdminPage(); addLog('All conversations deleted from Admin', 'warning');
            showToast('success', '🗑️ All conversations deleted');
        });
        document.getElementById('admBtnResetBaseline').addEventListener('click', function () {
            if (!confirm('Reset all local data to the governed canonical baseline? This clears local changes and evidence entries.')) return;
            localStorage.removeItem(STORAGE_KEY);
            DATA = migrateData(buildDefaultData());
            saveData(); populateDeptFilter(); renderAll(); renderAdminPage();
            showToast('success', '🔄 Data reset to canonical baseline');
        });

        document.getElementById('toolIdLookupBtn').addEventListener('click', toolIdLookup);
        document.getElementById('toolIdLookupInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') toolIdLookup(); });
        document.getElementById('toolCollisionCheckBtn').addEventListener('click', toolRunCollisionCheck);
        document.getElementById('toolBulkReplaceBtn').addEventListener('click', toolBulkReplaceDept);
        document.getElementById('toolStorageScanBtn').addEventListener('click', toolScanStorage);
        document.getElementById('toolDiffPickBtn').addEventListener('click', function () { document.getElementById('toolDiffFileInput').click(); });
        document.getElementById('toolDiffFileInput').addEventListener('change', function (e) { if (e.target.files[0]) toolRunDiff(e.target.files[0]); e.target.value = ''; });

        document.getElementById('adminLogSearchInput').addEventListener('input', debounce(function (e) { adminLogState.search = e.target.value; adminLogState.page = 1; renderAdminLogGrid(); }, 200));
        document.getElementById('adminLogStatusFilter').addEventListener('change', function (e) { adminLogState.status = e.target.value; adminLogState.page = 1; renderAdminLogGrid(); });
        wireTasksHandoffsPanel();
        $all('th.sortable', document.getElementById('page-admin')).forEach(function (th) {
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'button');
            function toggleSort() {
                var key = th.getAttribute('data-key');
                if (adminLogState.sortKey === key) adminLogState.sortDir = adminLogState.sortDir === 'asc' ? 'desc' : 'asc';
                else { adminLogState.sortKey = key; adminLogState.sortDir = 'asc'; }
                renderAdminLogGrid();
            }
            th.addEventListener('click', toggleSort);
            th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(); } });
        });
    }

    // ================================================================
    // ROUTING
    // ================================================================
