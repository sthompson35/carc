'use strict';
// app/wiring.js

    function refreshData() {
        DATA.participants.forEach(function (p) { if (p.status === 'active' && Math.random() > 0.7) p.lastActive = new Date().toISOString(); });
        renderAll();
        addLog('Dashboard data refreshed', 'success');
        saveData();
        showToast('success', '🔄 Data refreshed');
    }

    function exportData() {
        var exportObj = { version: '3.22.0', timestamp: new Date().toISOString(), exported_by: 'CARC Dashboard', data: DATA };
        var blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'carc_export_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
        URL.revokeObjectURL(url);
        addLog('Data exported', 'success');
        showToast('success', '📤 Data exported');
    }

    function exportParticipantsCsv() {
        var cfg = getParticipantFilterConfig();
        cfg.page = 1; cfg.pageSize = 1e9;
        var result = filterSortPaginate(DATA.participants, cfg);
        var csv = toCSV(result.rows, [
            { label: 'Name', get: function (p) { return p.name; } },
            { label: 'Type', get: function (p) { return TYPE_LABELS[p.type] || p.type; } },
            { label: 'Department', get: function (p) { return p.dept; } },
            { label: 'Status', get: function (p) { return p.status; } },
            { label: 'Role', get: function (p) { return p.role || ''; } },
            { label: 'Mission Profile Authority', get: function (p) { return p.missionProfile ? p.missionProfile.authority : ''; } },
            { label: 'Purpose', get: function (p) { return p.missionProfile ? p.missionProfile.purpose : ''; } },
            { label: 'Mission', get: function (p) { return p.missionProfile ? p.missionProfile.mission : ''; } },
            { label: 'Duties', get: function (p) { return p.missionProfile ? p.missionProfile.duties.join(' | ') : ''; } },
            { label: 'Recurring Tasks', get: function (p) { return p.missionProfile ? p.missionProfile.tasks.join(' | ') : ''; } },
            { label: 'Required Outputs', get: function (p) { return p.missionProfile ? p.missionProfile.outputs.join(' | ') : ''; } },
            { label: 'Mission Profile Status', get: function (p) { return p.missionProfile ? p.missionProfile.profileStatus : ''; } },
            { label: 'Callsign', get: function (p) { return p.callsign || ''; } },
            { label: 'TROOPER', get: function (p) { return p.trooper || ''; } },
            { label: 'AGENT ID', get: function (p) { return p.agentId || ''; } },
            { label: 'Service Member ID', get: function (p) { return p.serviceMemberId || ''; } },
            { label: 'Callsign ID', get: function (p) { return p.callsignId || ''; } },
            { label: 'Legacy Alias', get: function (p) { return p.legacyAlias || ''; } },
            { label: 'Canonical Status', get: function (p) { return p.canonicalStatus || ''; } },
            { label: 'Readiness', get: function (p) { return p.readiness || ''; } },
            { label: 'Joined', get: function (p) { return p.joined; } },
            { label: 'Last Active', get: function (p) { return p.lastActive; } }
        ]);
        downloadCSV('carc_participants_' + new Date().toISOString().slice(0, 10) + '.csv', csv);
        showToast('success', '⬇️ Exported ' + result.total + ' participants as CSV');
    }

    function handleImportParticipantsCsv(file) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            var rows;
            try {
                rows = parseCSV(String(evt.target.result));
                if (rows.length < 2) throw new Error('empty');
            } catch (err) {
                showToast('error', '❌ CSV import failed — could not parse file');
                return;
            }
            var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
            var idx = {};
            header.forEach(function (h, i) { idx[h] = i; });
            if (idx['name'] === undefined) { showToast('error', '❌ CSV must include a "Name" column'); return; }
            var labelToType = {};
            Object.keys(TYPE_LABELS).forEach(function (k) { labelToType[TYPE_LABELS[k].toLowerCase()] = k; labelToType[k] = k; });
            function cell(r, key) { return idx[key] !== undefined && r[idx[key]] !== undefined ? r[idx[key]].trim() : ''; }
            var incoming = rows.slice(1).map(function (r) {
                var name = cell(r, 'name');
                var typeRaw = cell(r, 'type').toLowerCase();
                var statusRaw = cell(r, 'status').toLowerCase();
                return {
                    id: uid('p'),
                    name: name,
                    type: labelToType[typeRaw] || 'user',
                    dept: cell(r, 'department') || 'General',
                    status: statusRaw === 'inactive' ? 'inactive' : 'active',
                    role: cell(r, 'role'),
                    callsign: cell(r, 'callsign'),
                    joined: new Date().toISOString().slice(0, 10),
                    lastActive: new Date().toISOString()
                };
            }).filter(function (p) { return p.name; });
            if (!incoming.length) { showToast('error', '❌ No valid rows found — need at least a Name column with values'); return; }

            var preview = incoming.slice(0, 20).map(function (p) {
                return '<div class="text-sm">' + esc(p.name) + ' <span class="text-muted">(' + esc(TYPE_LABELS[p.type]) + ' · ' + esc(p.dept) + ')</span></div>';
            }).join('') + (incoming.length > 20 ? '<div class="text-muted text-sm mt-1">…and ' + (incoming.length - 20) + ' more</div>' : '');
            var body = '<p>Found <b>' + incoming.length + '</b> participant row(s) in this CSV.</p>' +
                '<div class="checkbox-list" style="max-height:180px;">' + preview + '</div>' +
                '<p class="mt-2 text-sm text-muted">These will be added as new participants. Unrecognized "Type" values default to User; unrecognized "Status" values default to Active.</p>';
            var footer = '<button class="btn btn-outline" id="csvImpCancel">Cancel</button><button class="btn btn-primary" id="csvImpConfirm">Import ' + incoming.length + '</button>';
            openModal('Import Participants CSV', body, footer);
            document.getElementById('csvImpCancel').addEventListener('click', closeModal);
            document.getElementById('csvImpConfirm').addEventListener('click', function () {
                DATA.participants = DATA.participants.concat(incoming);
                addLog(incoming.length + ' participants imported from CSV', 'success');
                saveData(); populateDeptFilter(); populateTypeFilter(); renderAll(); closeModal();
                showToast('success', '⬆️ Imported ' + incoming.length + ' participants from CSV');
            });
        };
        reader.readAsText(file);
    }

    function exportConversationsCsv() {
        var cfg = getConversationFilterConfig();
        cfg.page = 1; cfg.pageSize = 1e9;
        var result = filterSortPaginate(getDecoratedConversations(), cfg);
        var csv = toCSV(result.rows, [
            { label: 'Title', get: function (c) { return c.title; } },
            { label: 'Messages', get: function (c) { return c.messages; } },
            { label: 'Created', get: function (c) { return c.created; } },
            { label: 'Status', get: function (c) { return c.status; } },
            { label: 'Participants', get: function (c) { return c._pcount; } }
        ]);
        downloadCSV('carc_conversations_' + new Date().toISOString().slice(0, 10) + '.csv', csv);
        showToast('success', '⬇️ Exported ' + result.total + ' conversations as CSV');
    }

    function handleImportConversationsCsv(file) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            var rows;
            try {
                rows = parseCSV(String(evt.target.result));
                if (rows.length < 2) throw new Error('empty');
            } catch (err) {
                showToast('error', '❌ CSV import failed — could not parse file');
                return;
            }
            var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
            var idx = {};
            header.forEach(function (h, i) { idx[h] = i; });
            if (idx['title'] === undefined) { showToast('error', '❌ CSV must include a "Title" column'); return; }
            function cell(r, key) { return idx[key] !== undefined && r[idx[key]] !== undefined ? r[idx[key]].trim() : ''; }
            var incoming = rows.slice(1).map(function (r) {
                var title = cell(r, 'title');
                var statusRaw = cell(r, 'status').toLowerCase();
                var participantNames = cell(r, 'participants').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
                var participantIds = participantNames.map(function (name) {
                    var p = DATA.participants.find(function (x) { return x.name.toLowerCase() === name.toLowerCase(); });
                    return p ? p.id : null;
                }).filter(Boolean);
                return {
                    id: uid('conv'), title: title,
                    messages: parseInt(cell(r, 'messages'), 10) || 0,
                    created: new Date().toISOString(),
                    status: ['active', 'completed', 'archived'].indexOf(statusRaw) !== -1 ? statusRaw : 'active',
                    participantIds: participantIds, messagesList: []
                };
            }).filter(function (c) { return c.title; });
            if (!incoming.length) { showToast('error', '❌ No valid rows found — need at least a Title column with values'); return; }

            var preview = incoming.slice(0, 20).map(function (c) {
                return '<div class="text-sm">' + esc(c.title) + ' <span class="text-muted">(' + esc(c.status) + ' · ' + c.participantIds.length + ' participants)</span></div>';
            }).join('') + (incoming.length > 20 ? '<div class="text-muted text-sm mt-1">…and ' + (incoming.length - 20) + ' more</div>' : '');
            var body = '<p>Found <b>' + incoming.length + '</b> conversation row(s) in this CSV.</p>' +
                '<div class="checkbox-list" style="max-height:180px;">' + preview + '</div>' +
                '<p class="mt-2 text-sm text-muted">These will be added as new conversations. Participants column (optional) should be semicolon-separated names matching existing participants.</p>';
            var footer = '<button class="btn btn-outline" id="csvConvImpCancel">Cancel</button><button class="btn btn-primary" id="csvConvImpConfirm">Import ' + incoming.length + '</button>';
            openModal('Import Conversations CSV', body, footer);
            document.getElementById('csvConvImpCancel').addEventListener('click', closeModal);
            document.getElementById('csvConvImpConfirm').addEventListener('click', function () {
                DATA.conversations = incoming.concat(DATA.conversations);
                addLog(incoming.length + ' conversations imported from CSV', 'success');
                saveData(); renderAll(); closeModal();
                showToast('success', '⬆️ Imported ' + incoming.length + ' conversations from CSV');
            });
        };
        reader.readAsText(file);
    }

    function handleImportFile(file) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            var incoming;
            try {
                var parsed = JSON.parse(evt.target.result);
                incoming = parsed && parsed.data ? parsed.data : parsed;
                if (!incoming || !Array.isArray(incoming.participants) || !Array.isArray(incoming.conversations)) throw new Error('bad schema');
            } catch (err) {
                showToast('error', '❌ Import failed — invalid file format');
                return;
            }
            var existingPartIds = {}; DATA.participants.forEach(function (p) { existingPartIds[p.id] = true; });
            var existingConvIds = {}; DATA.conversations.forEach(function (c) { existingConvIds[c.id] = true; });
            var newParts = incoming.participants.filter(function (p) { return !existingPartIds[p.id]; }).length;
            var newConvs = incoming.conversations.filter(function (c) { return !existingConvIds[c.id]; }).length;
            var rcCount = Array.isArray(incoming.rollCalls) ? incoming.rollCalls.length : 0;

            var body =
                '<p>This file contains:</p>' +
                '<div class="kv-row"><span>Participants</span><span>' + incoming.participants.length + ' total (' + newParts + ' new, ' + (incoming.participants.length - newParts) + ' updated)</span></div>' +
                '<div class="kv-row"><span>Conversations</span><span>' + incoming.conversations.length + ' total (' + newConvs + ' new, ' + (incoming.conversations.length - newConvs) + ' updated)</span></div>' +
                (rcCount ? '<div class="kv-row"><span>Roll calls</span><span>' + rcCount + '</span></div>' : '') +
                '<p class="mt-2 text-sm text-muted">Existing records with matching IDs will be updated in place; everything else is merged in. Nothing is deleted.</p>';
            var footer = '<button class="btn btn-outline" id="impCancel">Cancel</button><button class="btn btn-primary" id="impConfirm">Import</button>';
            openModal('Confirm Import', body, footer);
            document.getElementById('impCancel').addEventListener('click', closeModal);
            document.getElementById('impConfirm').addEventListener('click', function () {
                mergeById(DATA.participants, incoming.participants);
                mergeById(DATA.conversations, incoming.conversations);
                if (Array.isArray(incoming.rollCalls)) mergeById(DATA.rollCalls, incoming.rollCalls);
                populateDeptFilter(); populateTypeFilter();
                saveData(); renderAll(); closeModal();
                addLog('Data imported from file', 'success');
                showToast('success', '📥 Imported ' + incoming.participants.length + ' participants, ' + incoming.conversations.length + ' conversations');
            });
        };
        reader.readAsText(file);
    }

    // ================================================================
    // COMMAND PALETTE / GLOBAL SEARCH
    // ================================================================

    function wireChrome() {
        modalOverlay = document.getElementById('modalOverlay');
        modalTitle = document.getElementById('modalTitle');
        modalBody = document.getElementById('modalBody');
        modalFooter = document.getElementById('modalFooter');
        document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });

        $all('.nav-link').forEach(function (link) { link.addEventListener('click', function () { navigate(link.getAttribute('data-route')); }); });
        $all('.panel-link[data-route]').forEach(function (link) { link.addEventListener('click', function () { navigate(link.getAttribute('data-route')); }); });
        $all('.stat-clickable[data-route]').forEach(function (card) {
            card.addEventListener('click', function () { navigate(card.getAttribute('data-route')); });
            card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(card.getAttribute('data-route')); } });
        });

        document.getElementById('hamburgerBtn').addEventListener('click', function () {
            var open = document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('show', open);
            this.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.getElementById('sidebarOverlay').addEventListener('click', closeSidebarMobile);

        document.getElementById('btnNewConv').addEventListener('click', openNewConversationModal);
        document.getElementById('qaNewConv').addEventListener('click', openNewConversationModal);
        document.getElementById('btnRollCall').addEventListener('click', startRollCall);
        document.getElementById('qaRollCall').addEventListener('click', startRollCall);
        document.getElementById('qaAddParticipant').addEventListener('click', function () { openAddParticipantModal(); });
        document.getElementById('btnExport').addEventListener('click', exportData);
        document.getElementById('qaExport').addEventListener('click', exportData);
        document.getElementById('btnRefresh').addEventListener('click', refreshData);
        document.getElementById('qaRefresh').addEventListener('click', refreshData);

        var importInput = document.getElementById('importFileInput');
        function triggerImport() { importInput.click(); }
        document.getElementById('btnImport').addEventListener('click', triggerImport);
        document.getElementById('qaImport').addEventListener('click', triggerImport);
        importInput.addEventListener('change', function (e) { if (e.target.files[0]) handleImportFile(e.target.files[0]); importInput.value = ''; });

        document.getElementById('btnTheme').addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
        document.getElementById('btnSettings').addEventListener('click', function () { navigate('admin'); });
        document.getElementById('btnAddPerson').addEventListener('click', function () { openAddParticipantModal(); });
        document.getElementById('btnAlerts').addEventListener('click', openAlertsModal);

        document.getElementById('globalSearchInput').addEventListener('focus', function () { openCommandPalette(this.value); });
        document.getElementById('globalSearchInput').addEventListener('click', function (e) { e.preventDefault(); });

        document.addEventListener('keydown', function (e) {
            var tag = (document.activeElement && document.activeElement.tagName) || '';
            var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            if (e.ctrlKey && e.key.toLowerCase() === 'r') { e.preventDefault(); refreshData(); }
            else if (e.ctrlKey && e.key.toLowerCase() === 'e') { e.preventDefault(); exportData(); }
            else if (e.ctrlKey && e.key.toLowerCase() === 'i') { e.preventDefault(); triggerImport(); }
            else if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openNewConversationModal(); }
            else if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(''); }
            else if (e.key === 'Escape') { if (!modalOverlay.hidden) closeModal(); }
            else if (!typing && !modalOverlay.hidden === false && new RegExp('^[1-' + ROUTES.length + ']$').test(e.key)) { navigate(ROUTES[parseInt(e.key, 10) - 1]); }
        });
    }

    // ================================================================
    // INIT
    // ================================================================
