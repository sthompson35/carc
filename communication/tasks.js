'use strict';
// communication/tasks.js
//
// Task + Handoff Ledger. Deliberately scoped down from a much larger proposal: 5 real,
// enforceable states each (no dependencies[]/acceptanceCriteria[]/evidenceIds[] cross-links,
// no 10-state lifecycle) — CARC has no deliverable/evidence pipeline beyond the Governance
// Ledger and Canary evidence to back anything more elaborate than "a declared actor state flip."
// Reuses existing patterns rather than inventing new ones: filterSortPaginate/renderPagination
// (app/grid.js, same as Admin's Activity Log), canaryId (persona/identity.js) for IDs, and the
// capped-unshift convention already used by DATA.activityLog/DATA.rollCalls.

    var TASK_TRANSITIONS = {
        ASSIGNED: ['ACKNOWLEDGED', 'CANCELLED'],
        ACKNOWLEDGED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: []
    };

    var HANDOFF_TRANSITIONS = {
        CREATED: ['ACKNOWLEDGED', 'DECLINED'],
        ACKNOWLEDGED: ['ACCEPTED', 'DECLINED'],
        ACCEPTED: ['COMPLETED'],
        COMPLETED: [],
        DECLINED: []
    };

    // Active work items, not a rotating log — a generous cap so real in-flight work is never
    // silently dropped the way the 150-cap Activity Log safely can be.
    var TASK_HANDOFF_CAP = 300;

    function createTask(opts) {
        var t = {
            taskId: canaryId('TASK'),
            ownerServiceMemberId: opts.ownerServiceMemberId,
            assignedByServiceMemberId: opts.assignedByServiceMemberId || '',
            title: opts.title,
            description: opts.description || '',
            sourceMissionTaskText: opts.sourceMissionTaskText || '',
            state: 'ASSIGNED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        DATA.tasks.unshift(t);
        if (DATA.tasks.length > TASK_HANDOFF_CAP) DATA.tasks = DATA.tasks.slice(0, TASK_HANDOFF_CAP);
        return t;
    }

    function transitionTask(taskId, newState) {
        var t = DATA.tasks.find(function (x) { return x.taskId === taskId; });
        if (!t) return { ok: false, reason: 'TASK_NOT_FOUND' };
        var allowed = TASK_TRANSITIONS[t.state] || [];
        if (allowed.indexOf(newState) === -1) return { ok: false, reason: 'ILLEGAL_TRANSITION', from: t.state, to: newState };
        t.state = newState;
        t.updatedAt = new Date().toISOString();
        return { ok: true, task: t };
    }

    function createHandoff(opts) {
        var h = {
            handoffId: canaryId('HANDOFF'),
            taskId: opts.taskId || null,
            fromServiceMemberId: opts.fromServiceMemberId,
            toServiceMemberId: opts.toServiceMemberId,
            notes: opts.notes || '',
            state: 'CREATED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        DATA.handoffs.unshift(h);
        if (DATA.handoffs.length > TASK_HANDOFF_CAP) DATA.handoffs = DATA.handoffs.slice(0, TASK_HANDOFF_CAP);
        return h;
    }

    function transitionHandoff(handoffId, newState) {
        var h = DATA.handoffs.find(function (x) { return x.handoffId === handoffId; });
        if (!h) return { ok: false, reason: 'HANDOFF_NOT_FOUND' };
        var allowed = HANDOFF_TRANSITIONS[h.state] || [];
        if (allowed.indexOf(newState) === -1) return { ok: false, reason: 'ILLEGAL_TRANSITION', from: h.state, to: newState };
        h.state = newState;
        h.updatedAt = new Date().toISOString();
        return { ok: true, handoff: h };
    }

    function participantLabel(serviceMemberId) {
        var p = DATA.participants.find(function (x) { return x.serviceMemberId === serviceMemberId; });
        return p ? (p.callsign || p.name) : serviceMemberId;
    }

    function participantOptionsHtml(selectedId) {
        return DATA.participants.map(function (p) {
            return '<option value="' + esc(p.serviceMemberId) + '"' + (p.serviceMemberId === selectedId ? ' selected' : '') + '>' + esc(p.callsign || p.name) + '</option>';
        }).join('');
    }

    // ================================================================
    // TASKS: grid, detail, new
    // ================================================================

    var taskState = { search: '', status: '', sortKey: 'createdAt', sortDir: 'desc', page: 1, pageSize: 8 };

    function renderTasksGrid() {
        var body = document.getElementById('taskGridBody');
        if (!body) return;
        var result = filterSortPaginate(DATA.tasks, {
            search: taskState.search,
            searchFn: function (r, q) { return (r.title + ' ' + r.taskId).toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: taskState.status ? [function (r) { return r.state === taskState.status; }] : [],
            sortKey: taskState.sortKey, sortDir: taskState.sortDir, page: taskState.page, pageSize: taskState.pageSize
        });
        taskState.page = result.page;
        body.innerHTML = result.rows.map(function (t) {
            return '<tr class="task-row" data-id="' + esc(t.taskId) + '" style="cursor:pointer;">' +
                '<td class="text-sm">' + esc(fmtDate(t.createdAt)) + '</td>' +
                '<td>' + esc(t.title) + '</td>' +
                '<td class="text-sm">' + esc(participantLabel(t.ownerServiceMemberId)) + '</td>' +
                '<td><span class="log-status ' + (t.state === 'COMPLETED' ? 'success' : (t.state === 'CANCELLED' ? 'error' : 'info')) + '">' + esc(t.state) + '</span></td>' +
                '</tr>';
        }).join('') || '<tr><td colspan="4"><div class="empty-state"><div class="ic">🗂️</div>No tasks match</div></td></tr>';
        var countEl = document.getElementById('taskGridCount');
        if (countEl) countEl.textContent = result.total + ' total';
        var pagEl = document.getElementById('taskGridPagination');
        if (pagEl) renderPagination(pagEl, taskState, result, renderTasksGrid);
        $all('.task-row', body).forEach(function (tr) {
            tr.addEventListener('click', function () { openTaskDetailModal(tr.getAttribute('data-id')); });
        });
    }

    function openNewTaskModal() {
        var body =
            '<div class="form-group"><label>Owner</label><select id="ntOwner">' + participantOptionsHtml('') + '</select></div>' +
            '<div class="form-group"><label>Title</label><input type="text" id="ntTitle" placeholder="e.g. Draft Q3 report"></div>' +
            '<div class="form-group"><label>Description</label><textarea id="ntDescription" rows="3" placeholder="Optional detail…"></textarea></div>';
        var footer = '<button class="btn btn-outline" id="ntCancel">Cancel</button><button class="btn btn-primary" id="ntSave">Create Task</button>';
        openModal('New Task', body, footer);
        document.getElementById('ntCancel').addEventListener('click', closeModal);
        document.getElementById('ntSave').addEventListener('click', function () {
            var title = document.getElementById('ntTitle').value.trim();
            if (!title) { showToast('error', '❌ Title is required'); return; }
            var owner = document.getElementById('ntOwner').value;
            var task = createTask({ ownerServiceMemberId: owner, title: title, description: document.getElementById('ntDescription').value.trim() });
            addLog('Task "' + task.title + '" (' + task.taskId + ') assigned to ' + participantLabel(owner), 'success');
            saveData(); renderTasksGrid();
            closeModal();
            showToast('success', '🗂️ Task created');
        });
    }

    function openTaskDetailModal(taskId) {
        var t = DATA.tasks.find(function (x) { return x.taskId === taskId; });
        if (!t) return;
        var allowed = TASK_TRANSITIONS[t.state] || [];
        var body = '<div class="kv-row"><span>Task ID</span><code class="text-xs">' + esc(t.taskId) + '</code></div>' +
            '<div class="kv-row"><span>Owner</span><span>' + esc(participantLabel(t.ownerServiceMemberId)) + '</span></div>' +
            (t.assignedByServiceMemberId ? '<div class="kv-row"><span>Assigned By</span><span>' + esc(participantLabel(t.assignedByServiceMemberId)) + '</span></div>' : '') +
            '<div class="kv-row"><span>State</span><span class="log-status ' + (t.state === 'COMPLETED' ? 'success' : (t.state === 'CANCELLED' ? 'error' : 'info')) + '">' + esc(t.state) + '</span></div>' +
            '<div class="mt-1"><b>Title</b><div class="text-sm">' + esc(t.title) + '</div></div>' +
            (t.description ? '<div class="mt-1"><b>Description</b><div class="text-sm text-muted">' + esc(t.description) + '</div></div>' : '') +
            (t.sourceMissionTaskText ? '<div class="mt-1"><b>Source Mission Task</b><div class="text-xs text-muted">' + esc(t.sourceMissionTaskText) + '</div></div>' : '') +
            '<div class="kv-row"><span>Created</span><span class="text-xs">' + esc(fmtDate(t.createdAt)) + '</span></div>' +
            '<div class="kv-row"><span>Updated</span><span class="text-xs">' + esc(fmtDate(t.updatedAt)) + '</span></div>' +
            (allowed.length ? '<div class="mt-2"><b class="text-sm">Transition</b><div class="admin-actions mt-1">' + allowed.map(function (s) {
                return '<button class="btn btn-outline btn-sm task-transition" data-id="' + esc(t.taskId) + '" data-to="' + esc(s) + '">→ ' + esc(s) + '</button>';
            }).join('') + '</div></div>' : '<p class="text-xs text-muted mt-2">This task is in a terminal state — no further transitions.</p>');
        openModal('Task — ' + t.title, body, '<button class="btn btn-outline" id="tdClose">Close</button>');
        document.getElementById('tdClose').addEventListener('click', closeModal);
        $all('.task-transition').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var result = transitionTask(btn.getAttribute('data-id'), btn.getAttribute('data-to'));
                if (!result.ok) { showToast('error', '❌ Cannot transition from ' + result.from + ' to ' + result.to); return; }
                addLog('Task ' + result.task.taskId + ' → ' + result.task.state, 'info');
                saveData(); renderTasksGrid();
                closeModal();
                openTaskDetailModal(result.task.taskId);
                showToast('success', '✅ Task → ' + result.task.state);
            });
        });
    }

    // ================================================================
    // HANDOFFS: grid, detail, new
    // ================================================================

    var handoffState = { search: '', status: '', sortKey: 'createdAt', sortDir: 'desc', page: 1, pageSize: 8 };

    function renderHandoffsGrid() {
        var body = document.getElementById('handoffGridBody');
        if (!body) return;
        var result = filterSortPaginate(DATA.handoffs, {
            search: handoffState.search,
            searchFn: function (r, q) { return (participantLabel(r.fromServiceMemberId) + ' ' + participantLabel(r.toServiceMemberId) + ' ' + r.handoffId).toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: handoffState.status ? [function (r) { return r.state === handoffState.status; }] : [],
            sortKey: handoffState.sortKey, sortDir: handoffState.sortDir, page: handoffState.page, pageSize: handoffState.pageSize
        });
        handoffState.page = result.page;
        body.innerHTML = result.rows.map(function (h) {
            return '<tr class="handoff-row" data-id="' + esc(h.handoffId) + '" style="cursor:pointer;">' +
                '<td class="text-sm">' + esc(fmtDate(h.createdAt)) + '</td>' +
                '<td class="text-sm">' + esc(participantLabel(h.fromServiceMemberId)) + ' → ' + esc(participantLabel(h.toServiceMemberId)) + '</td>' +
                '<td class="text-sm">' + esc(h.taskId || '—') + '</td>' +
                '<td><span class="log-status ' + (h.state === 'COMPLETED' ? 'success' : (h.state === 'DECLINED' ? 'error' : 'info')) + '">' + esc(h.state) + '</span></td>' +
                '</tr>';
        }).join('') || '<tr><td colspan="4"><div class="empty-state"><div class="ic">🤝</div>No handoffs match</div></td></tr>';
        var countEl = document.getElementById('handoffGridCount');
        if (countEl) countEl.textContent = result.total + ' total';
        var pagEl = document.getElementById('handoffGridPagination');
        if (pagEl) renderPagination(pagEl, handoffState, result, renderHandoffsGrid);
        $all('.handoff-row', body).forEach(function (tr) {
            tr.addEventListener('click', function () { openHandoffDetailModal(tr.getAttribute('data-id')); });
        });
    }

    function openNewHandoffModal() {
        var openTasks = DATA.tasks.filter(function (t) { return t.state !== 'COMPLETED' && t.state !== 'CANCELLED'; });
        var body =
            '<div class="form-group"><label>From</label><select id="nhFrom">' + participantOptionsHtml('') + '</select></div>' +
            '<div class="form-group"><label>To</label><select id="nhTo">' + participantOptionsHtml('') + '</select></div>' +
            '<div class="form-group"><label>Linked Task (optional)</label><select id="nhTask"><option value="">None</option>' + openTasks.map(function (t) { return '<option value="' + esc(t.taskId) + '">' + esc(t.title) + '</option>'; }).join('') + '</select></div>' +
            '<div class="form-group"><label>Notes</label><textarea id="nhNotes" rows="3" placeholder="Optional context for the recipient…"></textarea></div>';
        var footer = '<button class="btn btn-outline" id="nhCancel">Cancel</button><button class="btn btn-primary" id="nhSave">Create Handoff</button>';
        openModal('New Handoff', body, footer);
        document.getElementById('nhCancel').addEventListener('click', closeModal);
        document.getElementById('nhSave').addEventListener('click', function () {
            var from = document.getElementById('nhFrom').value;
            var to = document.getElementById('nhTo').value;
            if (from === to) { showToast('error', '❌ From and To must be different identities'); return; }
            var handoff = createHandoff({ fromServiceMemberId: from, toServiceMemberId: to, taskId: document.getElementById('nhTask').value || null, notes: document.getElementById('nhNotes').value.trim() });
            addLog('Handoff ' + handoff.handoffId + ' created: ' + participantLabel(from) + ' → ' + participantLabel(to), 'success');
            saveData(); renderHandoffsGrid();
            closeModal();
            showToast('success', '🤝 Handoff created');
        });
    }

    function openHandoffDetailModal(handoffId) {
        var h = DATA.handoffs.find(function (x) { return x.handoffId === handoffId; });
        if (!h) return;
        var allowed = HANDOFF_TRANSITIONS[h.state] || [];
        var body = '<div class="kv-row"><span>Handoff ID</span><code class="text-xs">' + esc(h.handoffId) + '</code></div>' +
            '<div class="kv-row"><span>From</span><span>' + esc(participantLabel(h.fromServiceMemberId)) + '</span></div>' +
            '<div class="kv-row"><span>To</span><span>' + esc(participantLabel(h.toServiceMemberId)) + '</span></div>' +
            (h.taskId ? '<div class="kv-row"><span>Linked Task</span><code class="text-xs">' + esc(h.taskId) + '</code></div>' : '') +
            '<div class="kv-row"><span>State</span><span class="log-status ' + (h.state === 'COMPLETED' ? 'success' : (h.state === 'DECLINED' ? 'error' : 'info')) + '">' + esc(h.state) + '</span></div>' +
            (h.notes ? '<div class="mt-1"><b>Notes</b><div class="text-sm text-muted">' + esc(h.notes) + '</div></div>' : '') +
            '<div class="kv-row"><span>Created</span><span class="text-xs">' + esc(fmtDate(h.createdAt)) + '</span></div>' +
            '<div class="kv-row"><span>Updated</span><span class="text-xs">' + esc(fmtDate(h.updatedAt)) + '</span></div>' +
            (allowed.length ? '<div class="mt-2"><b class="text-sm">Transition</b><div class="admin-actions mt-1">' + allowed.map(function (s) {
                return '<button class="btn btn-outline btn-sm handoff-transition" data-id="' + esc(h.handoffId) + '" data-to="' + esc(s) + '">→ ' + esc(s) + '</button>';
            }).join('') + '</div></div>' : '<p class="text-xs text-muted mt-2">This handoff is in a terminal state — no further transitions.</p>');
        openModal('Handoff — ' + participantLabel(h.fromServiceMemberId) + ' → ' + participantLabel(h.toServiceMemberId), body, '<button class="btn btn-outline" id="hdClose">Close</button>');
        document.getElementById('hdClose').addEventListener('click', closeModal);
        $all('.handoff-transition').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var result = transitionHandoff(btn.getAttribute('data-id'), btn.getAttribute('data-to'));
                if (!result.ok) { showToast('error', '❌ Cannot transition from ' + result.from + ' to ' + result.to); return; }
                addLog('Handoff ' + result.handoff.handoffId + ' → ' + result.handoff.state, 'info');
                saveData(); renderHandoffsGrid();
                closeModal();
                openHandoffDetailModal(result.handoff.handoffId);
                showToast('success', '✅ Handoff → ' + result.handoff.state);
            });
        });
    }

    // ================================================================
    // WIRING
    // ================================================================

    function wireTasksHandoffsPanel() {
        var btnNewTask = document.getElementById('btnNewTask');
        if (btnNewTask) btnNewTask.addEventListener('click', openNewTaskModal);
        var btnNewHandoff = document.getElementById('btnNewHandoff');
        if (btnNewHandoff) btnNewHandoff.addEventListener('click', openNewHandoffModal);

        var taskSearch = document.getElementById('taskSearchInput');
        if (taskSearch) taskSearch.addEventListener('input', debounce(function (e) { taskState.search = e.target.value; taskState.page = 1; renderTasksGrid(); }, 200));
        var taskStatus = document.getElementById('taskStatusFilter');
        if (taskStatus) taskStatus.addEventListener('change', function (e) { taskState.status = e.target.value; taskState.page = 1; renderTasksGrid(); });

        var handoffSearch = document.getElementById('handoffSearchInput');
        if (handoffSearch) handoffSearch.addEventListener('input', debounce(function (e) { handoffState.search = e.target.value; handoffState.page = 1; renderHandoffsGrid(); }, 200));
        var handoffStatus = document.getElementById('handoffStatusFilter');
        if (handoffStatus) handoffStatus.addEventListener('change', function (e) { handoffState.status = e.target.value; handoffState.page = 1; renderHandoffsGrid(); });
    }
