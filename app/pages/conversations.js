'use strict';
// app/pages/conversations.js

    var convState = { search: '', status: '', recency: '', sortKey: 'created', sortDir: 'desc', page: 1, pageSize: 6, selected: {} };


    function getConversationFilterConfig() {
        var filters = [];
        if (convState.status) filters.push(function (c) { return c.status === convState.status; });
        if (convState.recency) filters.push(function (c) { return (Date.now() - new Date(c.created).getTime()) / 86400000 <= parseInt(convState.recency, 10); });
        return {
            search: convState.search,
            searchFn: function (c, q) { return c.title.toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: filters, sortKey: convState.sortKey, sortDir: convState.sortDir
        };
    }

    function getDecoratedConversations() {
        return DATA.conversations.map(function (c) { return Object.assign({}, c, { _pcount: (c.participantIds || []).length }); });
    }

    function countMatchingConversations() {
        var cfg = getConversationFilterConfig();
        cfg.page = 1; cfg.pageSize = 1e9;
        return filterSortPaginate(getDecoratedConversations(), cfg).total;
    }


    function saveGridState() {
        try {
            localStorage.setItem(GRID_STATE_KEY, JSON.stringify({
                part: { search: partState.search, type: partState.type, dept: partState.dept, status: partState.status, readiness: partState.readiness, recency: partState.recency, sortKey: partState.sortKey, sortDir: partState.sortDir, pageSize: partState.pageSize, visibleCols: partState.visibleCols },
                conv: { search: convState.search, status: convState.status, recency: convState.recency, sortKey: convState.sortKey, sortDir: convState.sortDir, pageSize: convState.pageSize }
            }));
        } catch (e) { /* storage unavailable */ }
    }

    function loadGridState() {
        try {
            var raw = localStorage.getItem(GRID_STATE_KEY);
            if (!raw) return;
            var parsed = JSON.parse(raw);
            if (parsed.part) { for (var k in parsed.part) { partState[k] = parsed.part[k]; } }
            if (parsed.conv) { for (var k2 in parsed.conv) { convState[k2] = parsed.conv[k2]; } }
        } catch (e) { /* corrupt/unavailable, keep defaults */ }
    }

    function syncGridControlsFromState() {
        document.getElementById('partSearchInput').value = partState.search;
        document.getElementById('partTypeFilter').value = partState.type;
        document.getElementById('partDeptFilter').value = partState.dept;
        document.getElementById('partStatusFilter').value = partState.status;
        document.getElementById('partReadinessFilter').value = partState.readiness || '';
        document.getElementById('partRecencyFilter').value = partState.recency;
        document.getElementById('convSearchInput').value = convState.search;
        document.getElementById('convStatusFilter').value = convState.status;
        document.getElementById('convRecencyFilter').value = convState.recency;
    }


    function renderConvStatChips() {
        var el = document.getElementById('convStatChips');
        if (!el) return;
        var all = DATA.conversations;
        var active = all.filter(function (c) { return c.status === 'active'; }).length;
        var completed = all.filter(function (c) { return c.status === 'completed'; }).length;
        var archived = all.filter(function (c) { return c.status === 'archived'; }).length;
        var totalMsgs = all.reduce(function (a, c) { return a + c.messages; }, 0);
        var avgMsgs = all.length ? (totalMsgs / all.length).toFixed(1) : '0';
        el.innerHTML = [
            '<span class="schip"><b>' + all.length + '</b> total</span>',
            '<span class="schip accent"><b>' + active + '</b> active</span>',
            '<span class="schip"><b>' + completed + '</b> completed</span>',
            '<span class="schip"><b>' + archived + '</b> archived</span>',
            '<span class="schip"><b>' + avgMsgs + '</b> avg messages</span>'
        ].join('');
    }


    function renderConversationsGrid() {
        var cfg = getConversationFilterConfig();
        cfg.page = convState.page; cfg.pageSize = convState.pageSize;
        var result = filterSortPaginate(getDecoratedConversations(), cfg);
        convState.page = result.page;

        var tbody = document.getElementById('convGridBody');
        tbody.innerHTML = result.rows.map(function (c) {
            var checked = convState.selected[c.id] ? 'checked' : '';
            return '<tr>' +
                '<td class="checkbox-cell"><input type="checkbox" class="conv-row-check" data-id="' + c.id + '" ' + checked + '></td>' +
                '<td><strong class="conv-open" data-id="' + c.id + '" style="cursor:pointer;">' + esc(c.title) + '</strong></td>' +
                '<td>' + c.messages + '</td>' +
                '<td class="text-muted text-sm">' + fmtDate(c.created) + '</td>' +
                '<td><span class="badge ' + (STATUS_BADGE[c.status] || '') + '">' + esc(c.status) + '</span></td>' +
                '<td class="text-muted text-sm">' + c._pcount + '</td>' +
                '<td><div class="row-actions">' +
                '<button data-act="view" data-id="' + c.id + '" title="View" aria-label="View ' + esc(c.title) + '">👁️</button>' +
                '<button data-act="status" data-id="' + c.id + '" title="Change status" aria-label="Change status for ' + esc(c.title) + '">🔁</button>' +
                '<button data-act="delete" data-id="' + c.id + '" title="Delete" aria-label="Delete ' + esc(c.title) + '">🗑️</button>' +
                '</div></td></tr>';
        }).join('') || '<tr><td colspan="7"><div class="empty-state"><div class="ic">💬</div>No conversations match your filters</div></td></tr>';

        document.getElementById('convGridCount').textContent = result.total + ' total';
        renderPagination(document.getElementById('convPagination'), convState, result, renderConversationsGrid);
        renderConvStatChips();
        updateConvSelectAllHint();
        $all('th.sortable', document.getElementById('page-conversations')).forEach(function (th) {
            th.classList.toggle('sorted', th.getAttribute('data-key') === convState.sortKey);
            var arrow = th.querySelector('.arrow');
            if (arrow) arrow.textContent = convState.sortDir === 'asc' ? '▲' : '▼';
        });
        updateConvBulkBar();
        saveGridState();
    }

    function updateConvSelectAllHint() {
        var hint = document.getElementById('convSelectAllHint');
        if (!hint) return;
        var pageIds = $all('.conv-row-check').map(function (cb) { return cb.getAttribute('data-id'); });
        var allPageSelected = pageIds.length > 0 && pageIds.every(function (id) { return convState.selected[id]; });
        var selectedCount = Object.keys(convState.selected).filter(function (id) { return convState.selected[id]; }).length;
        var totalMatching = countMatchingConversations();
        if (allPageSelected && selectedCount < totalMatching) {
            hint.hidden = false;
            hint.innerHTML = 'All ' + pageIds.length + ' on this page selected. <button type="button" class="link-btn" id="convSelectAllMatching">Select all ' + totalMatching + ' matching conversations</button>';
            var btn = document.getElementById('convSelectAllMatching');
            if (btn) btn.addEventListener('click', selectAllMatchingConversations);
        } else {
            hint.hidden = true;
            hint.innerHTML = '';
        }
    }

    function selectAllMatchingConversations() {
        var cfg = getConversationFilterConfig();
        cfg.page = 1; cfg.pageSize = 1e9;
        var result = filterSortPaginate(getDecoratedConversations(), cfg);
        result.rows.forEach(function (c) { convState.selected[c.id] = true; });
        renderConversationsGrid();
        showToast('info', '✅ Selected all ' + result.rows.length + ' matching conversations');
    }

    function updateConvBulkBar() {
        var ids = Object.keys(convState.selected).filter(function (id) { return convState.selected[id]; });
        document.getElementById('convBulkBar').hidden = ids.length === 0;
        document.getElementById('convSelCount').textContent = ids.length;
    }


    function openChangeStatusModal(id) {
        var c = DATA.conversations.find(function (x) { return x.id === id; });
        if (!c) return;
        var body = '<p class="text-sm mb-1">Set status for <b>' + esc(c.title) + '</b>:</p>' +
            '<div class="flex gap-1" style="flex-wrap:wrap;">' + CONV_STATUS_OPTIONS.map(function (s) {
                var active = s === c.status ? ' btn-primary' : ' btn-outline';
                return '<button type="button" class="btn' + active + ' btn-sm status-choice" data-status="' + s + '">' + (s === c.status ? '✓ ' : '') + s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
            }).join('') + '</div>';
        var footer = '<button class="btn btn-outline" id="csClose">Close</button>';
        openModal('Change Status', body, footer);
        document.getElementById('csClose').addEventListener('click', closeModal);
        $all('.status-choice', modalBody).forEach(function (btn) {
            btn.addEventListener('click', function () {
                var newStatus = btn.getAttribute('data-status');
                if (newStatus === c.status) { closeModal(); return; }
                var oldStatus = c.status;
                c.status = newStatus;
                addLog(c.title + ' status changed from ' + oldStatus + ' to ' + newStatus, 'info');
                saveData(); renderAll(); closeModal();
                showToast('success', '✅ "' + c.title + '" marked ' + newStatus);
            });
        });
    }


    function exportConversationTranscript(c) {
        var lines = [c.title, 'Status: ' + c.status + ' · Created: ' + fmtDate(c.created), ''];
        (c.messagesList || []).forEach(function (m) {
            var who = m.callsign ? (m.role + ' ' + m.callsign) : m.role;
            var proof = m.source ? ' [' + m.source + (m.verifiedRuntime === false ? ' · NOT_RUNTIME_VERIFIED' : '') + ']' : '';
            lines.push('[' + relTime(m.time) + '] ' + who + ': ' + m.text + proof);
        });
        if (!(c.messagesList || []).length) lines.push('(no messages recorded)');
        var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'carc_transcript_' + c.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.txt'; a.click();
        URL.revokeObjectURL(url);
        showToast('success', '⬇️ Transcript exported');
    }


    function openConversationDetail(id) {
        var c = DATA.conversations.find(function (x) { return x.id === id; });
        if (!c) return;
        var participants = (c.participantIds || []).map(function (pid) { var p = DATA.participants.find(function (x) { return x.id === pid; }); return { id: pid, name: p ? p.name : pid, exists: !!p }; });
        var msgsHtml = (c.messagesList || []).map(function (m) {
            return '<div style="margin-bottom:8px;"><strong>' + esc(m.role) + ':</strong> ' + esc(m.text) + ' <span class="text-xs text-muted">' + relTime(m.time) + '</span></div>';
        }).join('') || '<div class="text-muted text-sm">No messages recorded yet.</div>';
        var body =
            '<div class="kv-row"><span>Status</span><span class="badge ' + (STATUS_BADGE[c.status] || '') + '">' + esc(c.status) + '</span></div>' +
            '<div class="kv-row"><span>Created</span><span>' + fmtDate(c.created) + '</span></div>' +
            '<div class="kv-row"><span>Messages</span><span>' + c.messages + '</span></div>' +
            '<div class="mt-1"><strong class="text-sm">Participants</strong><div class="mt-1">' + (participants.map(function (p) { return '<span class="chip' + (p.exists ? ' conv-participant-open' : '') + '" ' + (p.exists ? 'style="cursor:pointer;" data-id="' + p.id + '"' : '') + '>' + esc(p.name) + '</span>'; }).join('') || '<span class="text-muted text-sm">None assigned</span>') + '</div></div>' +
            '<div class="mt-2"><strong class="text-sm">Messages</strong><div id="convDetailMsgs" style="max-height:180px; overflow-y:auto; margin-top:8px;">' + msgsHtml + '</div></div>' +
            '<div class="form-group mt-2"><label>Add a message</label><input type="text" id="convDetailMsgInput" placeholder="Type a message…"></div>';
        var footer = '<button class="btn btn-outline" id="convDetailExport">⬇️ Export Transcript</button><button class="btn btn-outline" id="convDetailClose">Close</button><button class="btn btn-primary" id="convDetailAddMsg">Add Message</button>';
        openModal(c.title, body, footer);
        document.getElementById('convDetailClose').addEventListener('click', closeModal);
        document.getElementById('convDetailExport').addEventListener('click', function () { exportConversationTranscript(c); });
        $all('.conv-participant-open', modalBody).forEach(function (chipEl) {
            chipEl.addEventListener('click', function () {
                var pid = chipEl.getAttribute('data-id');
                closeModal();
                navigate('participants');
                setTimeout(function () { openParticipantDetail(pid); }, 50);
            });
        });
        document.getElementById('convDetailAddMsg').addEventListener('click', function () {
            var input = document.getElementById('convDetailMsgInput');
            var text = input.value.trim();
            if (!text) return;
            c.messagesList = c.messagesList || [];
            var messageTime = new Date().toISOString();
            c.messagesList.push({ role: 'user', text: text, time: messageTime, source: 'CARC_OPERATOR', verifiedRuntime: true });
            var responseCount = appendBroadcastResponsesToConversation(c, text, messageTime);
            c.messages = c.messagesList.length;
            DATA.totalMessages += 1 + responseCount;
            if (responseCount) addLog('Broadcast response recorded — ' + responseCount + ' local participant replies', 'success');
            input.value = '';
            saveData(); renderAll();
            openConversationDetail(id);
        });
    }


    function participantPickerHtml(listId, checkboxClass) {
        return '<input type="text" class="participant-picker-search" data-list="' + listId + '" placeholder="Search participants…" style="margin-bottom:6px;">' +
            '<div class="checkbox-list" id="' + listId + '">' + DATA.participants.map(function (p) {
                return '<label><input type="checkbox" class="' + checkboxClass + '" value="' + p.id + '"> ' + esc(p.name) + ' <span class="text-xs text-muted">(' + esc(TYPE_LABELS[p.type] || p.type) + (p.dept ? ' · ' + esc(p.dept) : '') + ')</span></label>';
            }).join('') + '</div>' +
            '<div class="text-xs text-muted mt-1"><span class="picker-sel-count">0</span> selected</div>';
    }

    function wireParticipantPicker(listId, checkboxClass) {
        var list = document.getElementById(listId);
        if (!list) return;
        var search = document.querySelector('.participant-picker-search[data-list="' + listId + '"]');
        var countEl = list.parentElement.querySelector('.picker-sel-count');
        function updateCount() { if (countEl) countEl.textContent = $all('.' + checkboxClass + ':checked', list).length; }
        if (search) {
            search.addEventListener('input', function () {
                var q = search.value.toLowerCase();
                $all('label', list).forEach(function (lbl) { lbl.hidden = !!q && lbl.textContent.toLowerCase().indexOf(q) === -1; });
            });
        }
        list.addEventListener('change', updateCount);
        updateCount();
    }


    function createConversation(title, participantIds) {
        title = String(title || '').trim() || ('Conversation ' + (DATA.conversations.length + 1));
        var conv = { id: uid('conv'), title: title, messages: 0, created: new Date().toISOString(), status: 'active', participantIds: participantIds || [], messagesList: [] };
        DATA.conversations.unshift(conv);
        addLog('New conversation created: ' + title, 'success');
        saveData();
        return conv;
    }


    function openNewConversationModal() {
        var body =
            '<div class="form-group"><label>Title</label><input type="text" id="ncTitle" placeholder="e.g. Infrastructure Review"></div>' +
            '<div class="form-group"><label>Participants</label>' + participantPickerHtml('ncParticipantList', 'newconv-participant') + '</div>';
        var footer = '<button class="btn btn-outline" id="ncCancel">Cancel</button><button class="btn btn-primary" id="ncSave">Create Conversation</button>';
        openModal('New Conversation', body, footer);
        wireParticipantPicker('ncParticipantList', 'newconv-participant');
        document.getElementById('ncCancel').addEventListener('click', closeModal);
        document.getElementById('ncSave').addEventListener('click', function () {
            var title = document.getElementById('ncTitle').value.trim();
            var ids = $all('.newconv-participant:checked').map(function (cb) { return cb.value; });
            var conv = createConversation(title, ids);
            renderAll(); closeModal();
            showToast('success', '✅ "' + conv.title + '" created');
        });
    }


    function wireConversationsPage() {
        document.getElementById('convSearchInput').addEventListener('input', debounce(function (e) { convState.search = e.target.value; convState.page = 1; renderConversationsGrid(); }, 200));
        document.getElementById('convStatusFilter').addEventListener('change', function (e) { convState.status = e.target.value; convState.page = 1; renderConversationsGrid(); });
        document.getElementById('convRecencyFilter').addEventListener('change', function (e) { convState.recency = e.target.value; convState.page = 1; renderConversationsGrid(); });
        document.getElementById('btnNewConversation2').addEventListener('click', openNewConversationModal);
        document.getElementById('btnConvRollCall').addEventListener('click', startRollCall);
        document.getElementById('btnExportConvCsv').addEventListener('click', exportConversationsCsv);
        document.getElementById('btnImportConvCsv').addEventListener('click', function () { document.getElementById('importConvCsvInput').click(); });
        document.getElementById('importConvCsvInput').addEventListener('change', function (e) { if (e.target.files[0]) handleImportConversationsCsv(e.target.files[0]); e.target.value = ''; });
        document.getElementById('convBulkAddParticipants').addEventListener('click', openBulkAddParticipantsModal);
        $all('th.sortable', document.getElementById('page-conversations')).forEach(function (th) {
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'button');
            function toggleSort() {
                var key = th.getAttribute('data-key');
                if (convState.sortKey === key) convState.sortDir = convState.sortDir === 'asc' ? 'desc' : 'asc';
                else { convState.sortKey = key; convState.sortDir = 'asc'; }
                renderConversationsGrid();
            }
            th.addEventListener('click', toggleSort);
            th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(); } });
        });
        document.getElementById('convGridBody').addEventListener('click', function (e) {
            var openEl = e.target.closest('.conv-open');
            if (openEl) { openConversationDetail(openEl.getAttribute('data-id')); return; }
            var btn = e.target.closest('button[data-act]');
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            var c = DATA.conversations.find(function (x) { return x.id === id; });
            if (!c) return;
            var act = btn.getAttribute('data-act');
            if (act === 'view') openConversationDetail(id);
            else if (act === 'status') openChangeStatusModal(id);
            else if (act === 'delete') {
                var removeIdx = DATA.conversations.indexOf(c);
                DATA.conversations = DATA.conversations.filter(function (x) { return x.id !== id; });
                addLog('Conversation deleted: ' + c.title, 'warning');
                saveData(); renderAll();
                showToast('warning', '🗑️ Deleted "' + c.title + '"', {
                    label: 'Undo', onClick: function () {
                        DATA.conversations.splice(Math.min(removeIdx, DATA.conversations.length), 0, c);
                        addLog('Conversation restored: ' + c.title, 'info');
                        saveData(); renderAll();
                    }
                });
            }
        });
        document.getElementById('convGridBody').addEventListener('change', function (e) {
            if (!e.target.classList.contains('conv-row-check')) return;
            var id = e.target.getAttribute('data-id');
            if (e.target.checked) convState.selected[id] = true; else delete convState.selected[id];
            updateConvBulkBar();
            updateConvSelectAllHint();
        });
        document.getElementById('convSelectAll').addEventListener('change', function (e) {
            $all('.conv-row-check').forEach(function (cb) {
                cb.checked = e.target.checked;
                var id = cb.getAttribute('data-id');
                if (e.target.checked) convState.selected[id] = true; else delete convState.selected[id];
            });
            updateConvBulkBar();
            updateConvSelectAllHint();
        });
        document.getElementById('convBulkClear').addEventListener('click', function () { convState.selected = {}; renderConversationsGrid(); });
        document.getElementById('convBulkArchive').addEventListener('click', function () {
            var ids = Object.keys(convState.selected).filter(function (id) { return convState.selected[id]; });
            if (!ids.length) return;
            DATA.conversations.forEach(function (c) { if (ids.indexOf(c.id) !== -1) c.status = 'archived'; });
            addLog(ids.length + ' conversations archived (bulk)', 'info');
            convState.selected = {}; saveData(); renderAll();
        });
        document.getElementById('convBulkDelete').addEventListener('click', function () {
            var ids = Object.keys(convState.selected).filter(function (id) { return convState.selected[id]; });
            if (!ids.length) return;
            if (!confirm('Delete ' + ids.length + ' selected conversation(s)?')) return;
            var removed = DATA.conversations.filter(function (c) { return ids.indexOf(c.id) !== -1; });
            DATA.conversations = DATA.conversations.filter(function (c) { return ids.indexOf(c.id) === -1; });
            addLog(ids.length + ' conversations deleted (bulk)', 'warning');
            convState.selected = {}; saveData(); renderAll();
            showToast('warning', '🗑️ Deleted ' + removed.length + ' conversations', {
                label: 'Undo', onClick: function () {
                    mergeById(DATA.conversations, removed);
                    addLog(removed.length + ' conversations restored (undo)', 'info');
                    saveData(); renderAll();
                }
            });
        });
    }


    function openBulkAddParticipantsModal() {
        var ids = Object.keys(convState.selected).filter(function (id) { return convState.selected[id]; });
        if (!ids.length) return;
        var body = '<p class="text-sm mb-1">Add participants to <b>' + ids.length + '</b> selected conversation(s).</p>' +
            '<div class="form-group"><label>Participants</label>' + participantPickerHtml('bapParticipantList', 'bap-participant') + '</div>';
        var footer = '<button class="btn btn-outline" id="bapCancel">Cancel</button><button class="btn btn-primary" id="bapApply">Add to Conversations</button>';
        openModal('Add Participants', body, footer);
        wireParticipantPicker('bapParticipantList', 'bap-participant');
        document.getElementById('bapCancel').addEventListener('click', closeModal);
        document.getElementById('bapApply').addEventListener('click', function () {
            var addIds = $all('.bap-participant:checked').map(function (cb) { return cb.value; });
            if (!addIds.length) { showToast('error', '❌ Select at least one participant'); return; }
            DATA.conversations.forEach(function (c) {
                if (ids.indexOf(c.id) === -1) return;
                c.participantIds = c.participantIds || [];
                addIds.forEach(function (pid) { if (c.participantIds.indexOf(pid) === -1) c.participantIds.push(pid); });
            });
            addLog(addIds.length + ' participant(s) added to ' + ids.length + ' conversations (bulk)', 'info');
            convState.selected = {};
            saveData(); renderAll(); closeModal();
            showToast('success', '✅ Participants added to ' + ids.length + ' conversations');
        });
    }

    // ================================================================
    // AGENT PAGE
    // ================================================================
