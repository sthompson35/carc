'use strict';
// app/pages/participants.js

    var partState = { search: '', type: '', dept: '', status: '', readiness: '', recency: '', sortKey: 'name', sortDir: 'asc', page: 1, pageSize: 8, selected: {}, visibleCols: { callsign: true, trooper: true, agentId: true, serviceMemberId: true, callsignId: true } };

    function applyColumnVisibility() {
        Object.keys(OPTIONAL_COL_LABELS).forEach(function (key) {
            var visible = partState.visibleCols[key] !== false;
            $all('[data-col="' + key + '"]').forEach(function (el) { el.hidden = !visible; });
        });
    }


    function getParticipantFilterConfig() {
        var filters = [];
        if (partState.type) filters.push(function (p) { return p.type === partState.type; });
        if (partState.dept) filters.push(function (p) { return p.dept === partState.dept; });
        if (partState.status) filters.push(function (p) { return p.status === partState.status; });
        if (partState.readiness) filters.push(function (p) { return p.readiness === partState.readiness; });
        if (partState.recency) filters.push(function (p) { return (Date.now() - new Date(p.lastActive).getTime()) / 60000 <= parseInt(partState.recency, 10); });
        return {
            search: partState.search,
            searchFn: function (p, q) { return (p.name + ' ' + p.dept + ' ' + p.type + ' ' + (p.role || '') + ' ' + (p.missionProfile ? [p.missionProfile.purpose,p.missionProfile.mission].concat(p.missionProfile.duties||[],p.missionProfile.tasks||[],p.missionProfile.outputs||[]).join(' ') : '') + ' ' + (p.callsign || '') + ' ' + (p.trooper || '') + ' ' + (p.agentId || '') + ' ' + (p.serviceMemberId || '') + ' ' + (p.callsignId || '') + ' ' + (p.legacyAlias || '')).toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: filters, sortKey: partState.sortKey, sortDir: partState.sortDir
        };
    }

    function countMatchingParticipants() {
        var cfg = getParticipantFilterConfig();
        cfg.page = 1; cfg.pageSize = 1e9;
        return filterSortPaginate(DATA.participants, cfg).total;
    }


    function renderPartStatChips() {
        var el = document.getElementById('partStatChips');
        if (!el) return;
        var all = DATA.participants;
        var active = all.filter(function (p) { return p.status === 'active'; }).length;
        var online = all.filter(isOnline).length;
        var fresh = all.filter(isNewParticipant).length;
        var typeCounts = {};
        all.forEach(function (p) { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
        var topTypes = Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; });
        var chips = [
            '<span class="schip"><b>' + all.length + '</b> total</span>',
            '<span class="schip accent"><b>' + active + '</b> active</span>',
            '<span class="schip"><b>' + (all.length - active) + '</b> inactive</span>',
            '<span class="schip"><b>' + online + '</b> online now</span>'
        ];
        if (fresh > 0) chips.push('<span class="schip"><b>' + fresh + '</b> new (48h)</span>');
        topTypes.slice(0, 3).forEach(function (t) { chips.push('<span class="schip"><b>' + typeCounts[t] + '</b> ' + (TYPE_LABELS[t] || t).toLowerCase() + '</span>'); });
        el.innerHTML = chips.join('');
    }


    function updateSelectAllHint() {
        var hint = document.getElementById('partSelectAllHint');
        if (!hint) return;
        var pageIds = $all('.part-row-check').map(function (cb) { return cb.getAttribute('data-id'); });
        var allPageSelected = pageIds.length > 0 && pageIds.every(function (id) { return partState.selected[id]; });
        var selectedCount = Object.keys(partState.selected).filter(function (id) { return partState.selected[id]; }).length;
        var totalMatching = countMatchingParticipants();
        if (allPageSelected && selectedCount < totalMatching) {
            hint.hidden = false;
            hint.innerHTML = 'All ' + pageIds.length + ' on this page selected. <button type="button" class="link-btn" id="partSelectAllMatching">Select all ' + totalMatching + ' matching participants</button>';
            var btn = document.getElementById('partSelectAllMatching');
            if (btn) btn.addEventListener('click', selectAllMatchingParticipants);
        } else {
            hint.hidden = true;
            hint.innerHTML = '';
        }
    }

    function selectAllMatchingParticipants() {
        var cfg = getParticipantFilterConfig();
        cfg.page = 1; cfg.pageSize = 1e9;
        var result = filterSortPaginate(DATA.participants, cfg);
        result.rows.forEach(function (p) { partState.selected[p.id] = true; });
        renderParticipantsGrid();
        showToast('info', '✅ Selected all ' + result.rows.length + ' matching participants');
    }


    function populateDeptFilter() {
        var sel = document.getElementById('partDeptFilter');
        var depts = Array.from(new Set(DATA.participants.map(function (p) { return p.dept; }))).sort();
        var current = sel.value;
        sel.innerHTML = '<option value="">All Departments</option>' + depts.map(function (d) { return '<option value="' + esc(d) + '">' + esc(d) + '</option>'; }).join('');
        sel.value = current;
    }

    function populateTypeFilter() {
        var sel = document.getElementById('partTypeFilter');
        var current = sel.value;
        sel.innerHTML = '<option value="">All Types</option>' + Object.keys(TYPE_LABELS).map(function (t) { return '<option value="' + t + '">' + TYPE_LABELS[t] + '</option>'; }).join('');
        sel.value = current;
    }


    function isOnline(p) { return (Date.now() - new Date(p.lastActive).getTime()) / 60000 <= ONLINE_THRESHOLD_MINS; }

    function isNewParticipant(p) { return p.joined && (Date.now() - new Date(p.joined).getTime()) / 3600000 <= NEW_BADGE_HOURS; }


    function renderParticipantsGrid() {
        var cfg = getParticipantFilterConfig();
        cfg.page = partState.page; cfg.pageSize = partState.pageSize;
        var result = filterSortPaginate(DATA.participants, cfg);
        partState.page = result.page;

        var tbody = document.getElementById('partGridBody');
        tbody.innerHTML = result.rows.map(function (p) {
            var checked = partState.selected[p.id] ? 'checked' : '';
            var nameCell = '<div class="participant-name"><span class="avatar-wrap"><span class="participant-avatar ' + (AVATAR_CLASS[p.type] || 'avatar-user') + '">' + esc(p.name.charAt(0)) + '</span>' + (isOnline(p) ? '<span class="online-dot" title="Active in the last ' + ONLINE_THRESHOLD_MINS + ' minutes"></span>' : '') + '</span>' + esc(p.name) + (isNewParticipant(p) ? '<span class="badge-new" title="Joined in the last ' + NEW_BADGE_HOURS + 'h">NEW</span>' : '') + '</div><div class="text-xs text-muted" title="' + esc(p.role || '') + '">' + esc(p.role || '') + '</div>';
            return '<tr>' +
                '<td class="checkbox-cell sticky-col-1"><input type="checkbox" class="part-row-check" data-id="' + p.id + '" ' + checked + '></td>' +
                '<td class="sticky-col-2" title="' + esc(p.role || '') + '">' + nameCell + '</td>' +
                '<td><span class="badge ' + (TYPE_BADGE[p.type] || '') + '">' + esc(TYPE_LABELS[p.type] || p.type) + '</span></td>' +
                '<td class="text-xs" data-col="callsign"><b>' + esc(p.callsign || '—') + '</b></td>' +
                '<td class="text-xs" data-col="trooper"><code>TROOPER: &quot;' + esc(p.trooper || '') + '&quot;</code></td>' +
                '<td class="text-xs" data-col="agentId">' + (p.agentId ? '<code class="copyable" data-copy="' + esc(p.agentId) + '" title="Click to copy">AGENT: (' + esc(p.agentId) + ') 📋</code>' : '<code>AGENT: ()</code>') + '</td>' +
                '<td class="text-xs" data-col="serviceMemberId">' + (p.serviceMemberId ? '<code class="copyable" data-copy="' + esc(p.serviceMemberId) + '" title="Click to copy">' + esc(p.serviceMemberId) + ' 📋</code>' : '<code>—</code>') + '</td>' +
                '<td class="text-xs" data-col="callsignId">' + (p.callsignId ? '<code class="copyable" data-copy="' + esc(p.callsignId) + '" title="Click to copy">' + esc(p.callsignId) + ' 📋</code>' : '<code>—</code>') + '</td>' +
                '<td>' + esc(p.dept || '—') + '</td>' +
                '<td><span class="badge ' + (STATUS_BADGE[p.status] || '') + '">' + esc(p.status) + '</span></td>' +
                '<td class="text-muted text-sm">' + relTime(p.lastActive) + '</td>' +
                '<td><div class="row-actions">' +
                '<button data-act="view" data-id="' + p.id + '" title="View" aria-label="View ' + esc(p.name) + '">👁️</button>' +
                '<button data-act="toggle" data-id="' + p.id + '" title="Toggle status" aria-label="Toggle status for ' + esc(p.name) + '">🔁</button>' +
                '<button data-act="edit" data-id="' + p.id + '" title="Edit" aria-label="Edit ' + esc(p.name) + '">✏️</button>' +
                '<button data-act="delete" data-id="' + p.id + '" title="Delete" aria-label="Delete ' + esc(p.name) + '">🗑️</button>' +
                '</div></td></tr>';
        }).join('') || '<tr><td colspan="12"><div class="empty-state"><div class="ic">👥</div>No participants match your filters</div></td></tr>';

        document.getElementById('partGridCount').textContent = result.total + ' total';
        renderPagination(document.getElementById('partPagination'), partState, result, renderParticipantsGrid);
        renderPartStatChips();
        updateSelectAllHint();
        $all('th.sortable', document.getElementById('page-participants')).forEach(function (th) {
            th.classList.toggle('sorted', th.getAttribute('data-key') === partState.sortKey);
            var arrow = th.querySelector('.arrow');
            if (arrow) arrow.textContent = partState.sortDir === 'asc' ? '▲' : '▼';
        });
        updateBulkBar();
        applyColumnVisibility();
        saveGridState();
    }

    function updateBulkBar() {
        var ids = Object.keys(partState.selected).filter(function (id) { return partState.selected[id]; });
        document.getElementById('partBulkBar').hidden = ids.length === 0;
        document.getElementById('partSelCount').textContent = ids.length;
        var master = document.getElementById('partSelectAll');
        if (master) master.checked = ids.length > 0 && DATA.participants.every(function (p) { return document.querySelector('[data-id="' + p.id + '"].part-row-check') ? true : true; }) && false;
    }


    function openColumnsModal() {
        var body = '<p class="text-sm text-muted mb-1">Choose which canonical identity columns to show in the Participants grid.</p>' +
            Object.keys(OPTIONAL_COL_LABELS).map(function (key) {
                var checked = partState.visibleCols[key] !== false ? 'checked' : '';
                return '<div class="switch-row"><span>' + esc(OPTIONAL_COL_LABELS[key]) + '</span><label class="switch"><input type="checkbox" class="col-toggle" data-col="' + key + '" ' + checked + '><span class="slider"></span></label></div>';
            }).join('');
        var footer = '<button class="btn btn-outline" id="colShowAll">Show All</button><button class="btn btn-primary" id="colDone">Done</button>';
        openModal('Configure Columns', body, footer);
        document.getElementById('colDone').addEventListener('click', closeModal);
        document.getElementById('colShowAll').addEventListener('click', function () {
            Object.keys(OPTIONAL_COL_LABELS).forEach(function (key) { partState.visibleCols[key] = true; });
            $all('.col-toggle').forEach(function (cb) { cb.checked = true; });
            applyColumnVisibility(); saveGridState();
        });
        $all('.col-toggle').forEach(function (cb) {
            cb.addEventListener('change', function () {
                partState.visibleCols[cb.getAttribute('data-col')] = cb.checked;
                applyColumnVisibility(); saveGridState();
            });
        });
    }


    function openParticipantDetail(id) {
        var p = DATA.participants.find(function (x) { return x.id === id; });
        if (!p) return;
        var relatedConvs = DATA.conversations.filter(function (c) { return (c.participantIds || []).indexOf(id) !== -1; });
        var canonicalRows = '';
        if (p.callsign || p.agentId || p.serviceMemberId || p.callsignId || p.trooper || p.legacyAlias) {
            canonicalRows =
                '<div class="mt-2"><strong class="text-sm">Canonical Identity</strong>' +
                (p.callsign ? '<div class="kv-row"><span>Callsign</span><span>' + esc(p.callsign) + '</span></div>' : '') +
                (p.trooper ? '<div class="kv-row"><span>TROOPER</span><span>"' + esc(p.trooper) + '"</span></div>' : '') +
                (p.agentId ? '<div class="kv-row"><span>AGENT ID</span><span>' + esc(p.agentId) + '</span></div>' : '') +
                (p.serviceMemberId ? '<div class="kv-row"><span>Service Member ID</span><span>' + esc(p.serviceMemberId) + '</span></div>' : '') +
                (p.callsignId ? '<div class="kv-row"><span>Callsign ID</span><span>' + esc(p.callsignId) + '</span></div>' : '') +
                (p.legacyAlias ? '<div class="kv-row"><span>Legacy Alias</span><span>' + esc(p.legacyAlias) + '</span></div>' : '') +
                (p.canonicalStatus ? '<div class="kv-row"><span>Canonical Status</span><span>' + esc(p.canonicalStatus) + '</span></div>' : '') +
                (p.readiness ? '<div class="kv-row"><span>Readiness</span><span>' + esc(p.readiness) + '</span></div>' : '') +
                (p.authorityProfile ? '<div class="kv-row"><span>Authority Profile</span><span><span class="badge ' + (p.authorityProfile.gate.allowed ? 'badge-active' : 'badge-inactive') + '">' + esc(p.authorityProfile.gate.allowed ? 'AUTHORIZED' : 'NOT_AUTHORIZED') + '</span> <button class="btn btn-outline btn-sm ap-view" data-pid="' + esc(p.id) + '">View</button></span></div>' : '') +
                (p.runtimeVerification ? '<div class="kv-row"><span>Runtime Verification</span><span><span class="badge ' + (p.runtimeVerification.verified ? 'badge-active' : 'badge-inactive') + '">' + esc(p.runtimeVerification.verified ? 'RUNTIME_VERIFIED' : 'NOT_RUNTIME_VERIFIED') + '</span> <button class="btn btn-outline btn-sm rv-view" data-pid="' + esc(p.id) + '">View</button></span></div>' : '') +
                '</div>';
        }
        var aliasRows =
            '<div class="mt-2"><strong class="text-sm">Legacy Identifiers (' + (p.legacyIds || []).length + ')</strong>' +
            '<div class="gate-grid mt-1">' + ((p.legacyIds || []).length ? (p.legacyIds || []).map(function (l) {
                return '<div class="gate-item"><div class="gate-head"><div class="gate-name">' + esc(l.value) + '</div><span class="badge ' + aliasStatusBadgeClass(l.status) + '">' + esc(l.status) + '</span></div>' +
                    '<div class="gate-desc">' + esc(l.type) + ' → ' + esc(l.canonicalTargetId || '—') + '</div>' +
                    '<div class="gate-meta">' + esc(l.reason || '') + '</div></div>';
            }).join('') : '<span class="text-muted text-sm">No legacy identifiers on file</span>') + '</div></div>' +
            '<div class="mt-2"><strong class="text-sm">Aliases (' + (p.aliases || []).length + ')</strong>' +
            '<div class="gate-grid mt-1">' + ((p.aliases || []).length ? (p.aliases || []).map(function (a) {
                return '<div class="gate-item"><div class="gate-head"><div class="gate-name">' + esc(a.value) + '</div><span class="badge ' + aliasStatusBadgeClass(a.status) + '">' + esc(a.status) + '</span></div>' +
                    '<div class="gate-desc">' + esc(a.type) + ' → ' + esc(a.canonicalTarget || '—') + '</div>' +
                    '<div class="gate-meta">Verified: ' + (a.verified ? 'YES' : 'NO') + (a.verifiedBy ? ' · ' + esc(a.verifiedBy) : '') + '</div></div>';
            }).join('') : '<span class="text-muted text-sm">No aliases on file</span>') + '</div></div>';
        var body =
            '<div class="flex gap-1" style="align-items:center;">' +
            '<span class="avatar-wrap"><span class="participant-avatar ' + (AVATAR_CLASS[p.type] || 'avatar-user') + '" style="width:44px;height:44px;font-size:1rem;">' + esc(p.name.charAt(0)) + '</span>' + (isOnline(p) ? '<span class="online-dot"></span>' : '') + '</span>' +
            '<div><strong style="font-size:1.05rem;">' + esc(p.name) + '</strong>' + (isNewParticipant(p) ? '<span class="badge-new">NEW</span>' : '') + '<div class="text-xs text-muted">' + esc(p.role || 'No role on file') + '</div></div>' +
            '</div>' +
            '<div class="mt-2">' +
            '<div class="kv-row"><span>Type</span><span class="badge ' + (TYPE_BADGE[p.type] || '') + '">' + esc(TYPE_LABELS[p.type] || p.type) + '</span></div>' +
            '<div class="kv-row"><span>Department</span><span>' + esc(p.dept || '—') + '</span></div>' +
            '<div class="kv-row"><span>Status</span><span class="badge ' + (STATUS_BADGE[p.status] || '') + '">' + esc(p.status) + '</span></div>' +
            '<div class="kv-row"><span>Joined</span><span>' + esc(p.joined || '—') + '</span></div>' +
            '<div class="kv-row"><span>Last Active</span><span>' + relTime(p.lastActive) + '</span></div>' +
            '</div>' +
            canonicalRows +
            aliasRows +
            (p.missionProfile ? '<div class="mt-2"><strong class="text-sm">Mission Doctrine</strong>' +
                '<div class="kv-row"><span>Profile Authority</span><span>' + esc(p.missionProfile.authority) + '</span></div>' +
                '<div class="kv-row"><span>Profile Status</span><span>' + esc(p.missionProfile.profileStatus) + '</span></div>' +
                (p.missionProfile.fieldProvenance ? '<div class="mt-1"><b>Field Provenance</b> <button class="btn btn-outline btn-sm fp-view" data-pid="' + esc(p.id) + '">View</button>' +
                    '<div class="mt-1">' + MISSION_PROFILE_PROVENANCE_FIELDS.map(function (f) {
                        var fp = p.missionProfile.fieldProvenance[f];
                        if (!fp) return '';
                        return '<span class="badge ' + (fp.authority === 'CONVERSATION_CONFIRMED' ? 'badge-active' : 'badge-inactive') + '" style="margin-right:4px;">' + esc(f) + ': ' + esc(fp.confidence) + '</span>';
                    }).join('') + '</div></div>' : '') +
                '<div class="mt-1"><b>Purpose</b><div class="text-sm text-muted">' + esc(p.missionProfile.purpose) + '</div></div>' +
                '<div class="mt-1"><b>Mission</b><div class="text-sm text-muted">' + esc(p.missionProfile.mission) + '</div></div>' +
                '<div class="mt-1"><b>Duties</b><ul style="padding-left:18px;margin-top:4px;">' + p.missionProfile.duties.map(function(x){return '<li class="text-sm">'+esc(x)+'</li>';}).join('') + '</ul></div>' +
                '<div class="mt-1"><b>Recurring Tasks</b><ul style="padding-left:18px;margin-top:4px;">' + p.missionProfile.tasks.map(function(x){return '<li class="text-sm">'+esc(x)+'</li>';}).join('') + '</ul></div>' +
                '<div class="mt-1"><b>Required Outputs</b><ul style="padding-left:18px;margin-top:4px;">' + p.missionProfile.outputs.map(function(x){return '<li class="text-sm">'+esc(x)+'</li>';}).join('') + '</ul></div>' +
                '<div class="mt-1"><b>Operating Doctrine</b><div class="text-xs text-muted">' + esc(Object.keys(p.missionProfile.operatingDoctrine).map(function(k){return p.missionProfile.operatingDoctrine[k];}).join(' ')) + '</div></div>' +
                '<div class="mt-1"><b>Production Rule</b><div class="text-xs text-muted">' + esc(p.missionProfile.productionRule) + '</div></div>' +
                '</div>' : '') +
            (p.knowledgePath ? (function () {
                var kpState = evaluateKnowledgePathState(p);
                return '<div class="mt-2"><strong class="text-sm">Knowledge Path (' + kpState.verified + '/' + kpState.total + ')</strong>' +
                    '<div class="progress-track mt-1"><div class="progress-fill" style="width:' + kpState.percent + '%"></div></div>' +
                    '<div class="gate-grid mt-2">' + kpState.stages.map(function (s) {
                        var cls = s.status === 'VERIFIED' ? 'badge-active' : 'badge-inactive';
                        var isComputed = s.id === 'mission_eligibility';
                        var btnLabel = isComputed ? 'View (Computed)' : (s.status === 'VERIFIED' ? 'Review Evidence' : 'Record Evidence');
                        return '<div class="gate-item"><div class="gate-head"><div class="gate-name">' + esc(s.name) + (isComputed ? ' <span class="text-xs text-muted">⚙️</span>' : '') + '</div><span class="badge ' + cls + '">' + esc(s.status) + '</span></div>' +
                            '<div class="gate-desc">' + esc(s.description) + '</div>' +
                            '<div class="gate-meta">Evidence: ' + esc(s.evidence || 'NOT RECORDED') + '<br>Verifier: ' + esc(s.verifier || 'NOT RECORDED') + '</div>' +
                            '<div class="mt-1"><button class="btn btn-outline btn-sm kp-evidence-edit" data-pid="' + esc(p.id) + '" data-sid="' + esc(s.id) + '">' + btnLabel + '</button></div></div>';
                    }).join('') + '</div></div>';
            })() : '') +
            (function () {
                var ipState = evaluateIdentityProfilesState(p);
                return '<div class="mt-2"><strong class="text-sm">Identity Profiles (' + ipState.defined + '/' + ipState.total + ')</strong>' +
                    '<div class="gate-grid mt-2">' + IDENTITY_PROFILE_DEFS.map(function (def) {
                        var prof = p[def.key] || buildDefaultIdentityProfile();
                        var cls = prof.status === 'VERIFIED' ? 'badge-active' : 'badge-inactive';
                        var btnLabel = prof.status === 'VERIFIED' ? 'Review Evidence' : 'Record Evidence';
                        return '<div class="gate-item"><div class="gate-head"><div class="gate-name">' + esc(def.name) + '</div><span class="badge ' + cls + '">' + esc(prof.status) + '</span></div>' +
                            '<div class="gate-desc">' + esc(def.description) + '</div>' +
                            '<div class="gate-meta">Evidence: ' + esc(prof.evidence || 'NOT RECORDED') + '<br>Verifier: ' + esc(prof.verifier || 'NOT RECORDED') + '</div>' +
                            '<div class="mt-1"><button class="btn btn-outline btn-sm ip-evidence-edit" data-pid="' + esc(p.id) + '" data-key="' + esc(def.key) + '">' + btnLabel + '</button></div></div>';
                    }).join('') + '</div></div>';
            })() +
            '<div class="mt-2"><strong class="text-sm">Conversations (' + relatedConvs.length + ')</strong><div class="mt-1">' +
            (relatedConvs.length ? relatedConvs.map(function (c) { return '<span class="chip conv-detail-open" data-id="' + c.id + '" style="cursor:pointer;">' + esc(c.title) + '</span>'; }).join('') : '<span class="text-muted text-sm">No conversations yet</span>') +
            '</div></div>';
        var footer = '<button class="btn btn-outline" id="pdClose">Close</button><button class="btn btn-primary" id="pdEdit">Edit</button>';
        openModal(esc(p.name), body, footer);
        document.getElementById('pdClose').addEventListener('click', closeModal);
        document.getElementById('pdEdit').addEventListener('click', function () { openAddParticipantModal(id); });
        $all('.conv-detail-open').forEach(function (chipEl) {
            chipEl.addEventListener('click', function () {
                closeModal();
                navigate('conversations');
                setTimeout(function () { openConversationDetail(chipEl.getAttribute('data-id')); }, 50);
            });
        });
        $all('.kp-evidence-edit').forEach(function (btn) {
            btn.addEventListener('click', function () { openKnowledgePathEvidenceModal(btn.getAttribute('data-pid'), btn.getAttribute('data-sid')); });
        });
        $all('.ip-evidence-edit').forEach(function (btn) {
            btn.addEventListener('click', function () { openIdentityProfileEvidenceModal(btn.getAttribute('data-pid'), btn.getAttribute('data-key')); });
        });
        $all('.ap-view').forEach(function (btn) {
            btn.addEventListener('click', function () { openAuthorityProfileModal(btn.getAttribute('data-pid')); });
        });
        $all('.rv-view').forEach(function (btn) {
            btn.addEventListener('click', function () { openRuntimeVerificationModal(btn.getAttribute('data-pid')); });
        });
        $all('.fp-view').forEach(function (btn) {
            btn.addEventListener('click', function () { openFieldProvenanceModal(btn.getAttribute('data-pid')); });
        });
    }

    function openFieldProvenanceModal(participantId) {
        var p = DATA.participants.find(function (x) { return x.id === participantId; });
        if (!p || !p.missionProfile || !p.missionProfile.fieldProvenance) return;
        var fp = p.missionProfile.fieldProvenance;
        var body = '<p class="text-sm">This is <b>computed</b> at profile-build time — it cannot be self-attested. It reflects where each mission-profile field\'s content actually came from.</p>' +
            MISSION_PROFILE_PROVENANCE_FIELDS.map(function (f) {
                var e = fp[f];
                return '<div class="mt-2"><b class="text-sm">' + esc(f) + '</b>' +
                    '<div class="kv-row"><span>Authority</span><span class="badge ' + (e.authority === 'CONVERSATION_CONFIRMED' ? 'badge-active' : 'badge-inactive') + '">' + esc(e.authority) + '</span></div>' +
                    '<div class="kv-row"><span>Confidence</span><span>' + esc(e.confidence) + '</span></div>' +
                    '<div class="kv-row"><span>Source Record ID</span><code class="text-xs">' + esc(e.sourceRecordId || '—') + '</code></div>' +
                    '<div class="kv-row"><span>Source Version</span><span class="text-xs">' + esc(e.sourceVersion || '—') + '</span></div>' +
                    '<div class="kv-row"><span>Established At</span><span class="text-xs">' + esc(e.establishedAt || 'NOT RECORDED') + '</span></div>' +
                    '<div class="kv-row"><span>Established By</span><span class="text-xs">' + esc(e.establishedBy || 'NOT RECORDED') + '</span></div>' +
                    '<div class="kv-row"><span>Last Reviewed At</span><span class="text-xs">' + esc(e.lastReviewedAt || 'NOT RECORDED') + '</span></div>' +
                    '</div>';
            }).join('') +
            '<p class="text-xs text-muted mt-2">To change this: nothing to record here yet — CARC has no per-field evidence/review workflow. This is real infrastructure with no fabricated content, ready for the moment a field needs individual provenance.</p>';
        openModal('Field Provenance — ' + p.name, body, '<button class="btn btn-outline" id="fpClose">Close</button>');
        document.getElementById('fpClose').addEventListener('click', closeModal);
    }

    function openKnowledgePathEvidenceModal(participantId, stageId) {
        var p = DATA.participants.find(function (x) { return x.id === participantId; });
        if (!p || !p.knowledgePath) return;
        var stage = p.knowledgePath.stages.find(function (s) { return s.id === stageId; });
        if (!stage) return;
        if (stage.id === 'mission_eligibility') {
            var result = evaluateMissionEligibilityStage(p);
            var roBody = '<div class="form-group"><label>Stage</label><input value="' + esc(stage.name) + '" disabled></div>' +
                '<p class="text-sm">This stage is <b>computed</b> — it cannot be self-attested. It reflects whether all 8 prerequisite knowledge-path stages are VERIFIED for this identity.</p>' +
                '<div class="kv-row"><span>Current Status</span><span class="badge ' + (stage.status === 'VERIFIED' ? 'badge-active' : 'badge-inactive') + '">' + esc(stage.status) + '</span></div>' +
                '<div class="kv-row"><span>Basis</span><span class="text-xs">' + esc(stage.reason || result.reason) + '</span></div>' +
                '<p class="text-xs text-muted mt-2">To change this: record evidence and a verifier for each of the 8 prerequisite stages above.</p>';
            openModal('Knowledge Path — ' + stage.name, roBody, '<button class="btn btn-outline" id="kpCancel">Close</button>');
            document.getElementById('kpCancel').addEventListener('click', closeModal);
            return;
        }
        var body = '<div class="form-group"><label>Stage</label><input value="' + esc(stage.name) + '" disabled></div>' +
            '<div class="form-group"><label>Evidence Reference</label><textarea id="kpEvidence" rows="4" placeholder="Curriculum ID, exam score reference, certificate ID, approval record…">' + esc(stage.evidence || '') + '</textarea></div>' +
            '<div class="form-group"><label>Verifier</label><input id="kpVerifier" value="' + esc(stage.verifier || '') + '" placeholder="e.g. instructor, supervisor, reviewer ID"></div>' +
            '<div class="form-group"><label>Status</label><select id="kpStatus"><option value="PENDING">PENDING</option><option value="VERIFIED">VERIFIED</option></select></div>' +
            '<div class="text-xs text-muted">VERIFIED requires both an evidence reference and a verifier. CARC will not accept a bare status flip.</div>';
        var footer = '<button class="btn btn-outline" id="kpCancel">Cancel</button><button class="btn btn-primary" id="kpSave">Save Evidence</button>';
        openModal('Knowledge Path — ' + stage.name, body, footer);
        document.getElementById('kpStatus').value = stage.status;
        document.getElementById('kpCancel').addEventListener('click', closeModal);
        document.getElementById('kpSave').addEventListener('click', function () {
            var ev = document.getElementById('kpEvidence').value.trim();
            var vr = document.getElementById('kpVerifier').value.trim();
            var st = document.getElementById('kpStatus').value;
            if (st === 'VERIFIED' && (!ev || !vr)) { showToast('error', '❌ VERIFIED requires evidence and a verifier'); return; }
            stage.evidence = ev; stage.verifier = vr; stage.status = st; stage.updatedAt = new Date().toISOString();
            reconcileKnowledgePathEligibility(p);
            addLog(p.name + ' knowledge path · ' + stage.name + ' → ' + st, 'info');
            saveData(); renderAll();
            closeModal();
            openParticipantDetail(participantId);
            showToast('success', '✅ Knowledge path evidence saved');
        });
    }

    function openIdentityProfileEvidenceModal(participantId, key) {
        var p = DATA.participants.find(function (x) { return x.id === participantId; });
        if (!p) return;
        var def = IDENTITY_PROFILE_DEFS.find(function (d) { return d.key === key; });
        if (!def) return;
        var prof = p[key] || buildDefaultIdentityProfile();
        var body = '<div class="form-group"><label>Profile</label><input value="' + esc(def.name) + '" disabled></div>' +
            '<div class="form-group"><label>Evidence Reference</label><textarea id="ipEvidence" rows="4" placeholder="Source record, approval reference, definition document ID…">' + esc(prof.evidence || '') + '</textarea></div>' +
            '<div class="form-group"><label>Verifier</label><input id="ipVerifier" value="' + esc(prof.verifier || '') + '" placeholder="e.g. supervisor, reviewer ID"></div>' +
            '<div class="form-group"><label>Status</label><select id="ipStatus"><option value="PENDING">PENDING</option><option value="VERIFIED">VERIFIED</option></select></div>' +
            '<div class="text-xs text-muted">VERIFIED requires both an evidence reference and a verifier. CARC will not accept a bare status flip.</div>';
        var footer = '<button class="btn btn-outline" id="ipCancel">Cancel</button><button class="btn btn-primary" id="ipSave">Save Evidence</button>';
        openModal(def.name, body, footer);
        document.getElementById('ipStatus').value = prof.status;
        document.getElementById('ipCancel').addEventListener('click', closeModal);
        document.getElementById('ipSave').addEventListener('click', function () {
            var ev = document.getElementById('ipEvidence').value.trim();
            var vr = document.getElementById('ipVerifier').value.trim();
            var st = document.getElementById('ipStatus').value;
            if (st === 'VERIFIED' && (!ev || !vr)) { showToast('error', '❌ VERIFIED requires evidence and a verifier'); return; }
            p[key] = { status: st, evidence: ev, verifier: vr, updatedAt: new Date().toISOString() };
            addLog(p.name + ' ' + def.name + ' → ' + st, 'info');
            saveData(); renderAll();
            closeModal();
            openParticipantDetail(participantId);
            showToast('success', '✅ ' + def.name + ' evidence saved');
        });
    }

    function openAuthorityProfileModal(participantId) {
        var p = DATA.participants.find(function (x) { return x.id === participantId; });
        if (!p || !p.authorityProfile) return;
        var ap = p.authorityProfile;
        var body = '<p class="text-sm">This profile is <b>computed</b> — it cannot be self-attested. It reflects the real canary authorization gate, refreshed automatically whenever governance state or a canary run is reconciled.</p>' +
            '<div class="kv-row"><span>Provenance</span><span>' + esc(ap.provenance) + '</span></div>' +
            '<div class="kv-row"><span>Authorization</span><span class="badge ' + (ap.gate.allowed ? 'badge-active' : 'badge-inactive') + '">' + esc(ap.gate.allowed ? 'AUTHORIZED' : 'NOT_AUTHORIZED') + '</span></div>' +
            '<div class="kv-row"><span>Reason</span><span class="text-xs">' + esc(ap.gate.reason) + '</span></div>' +
            '<div class="kv-row"><span>Computed At</span><span class="text-xs">' + esc(fmtDate(ap.computedAt)) + '</span></div>' +
            '<p class="text-xs text-muted mt-2">To change this: resolve the underlying gate condition (identity completeness, mission profile, active status, or registry integrity) — the profile recomputes automatically.</p>';
        openModal('Authority Profile — ' + p.name, body, '<button class="btn btn-outline" id="apClose">Close</button>');
        document.getElementById('apClose').addEventListener('click', closeModal);
    }

    function openRuntimeVerificationModal(participantId) {
        var p = DATA.participants.find(function (x) { return x.id === participantId; });
        if (!p || !p.runtimeVerification) return;
        var rv = p.runtimeVerification;
        var body = '<p class="text-sm">This profile is <b>computed</b> — it cannot be self-attested. It reflects this identity\'s actual canary execution history.</p>' +
            '<div class="kv-row"><span>Runtime Verification</span><span class="badge ' + (rv.verified ? 'badge-active' : 'badge-inactive') + '">' + esc(rv.verified ? 'RUNTIME_VERIFIED' : 'NOT_RUNTIME_VERIFIED') + '</span></div>' +
            '<div class="kv-row"><span>Independent Verification</span><span>' + esc(rv.independentVerification) + '</span></div>' +
            '<div class="kv-row"><span>Last Execution ID</span><code class="text-xs">' + esc(rv.lastExecutionId || '—') + '</code></div>' +
            (rv.lastVerifiedAt ? '<div class="kv-row"><span>Last Verified At</span><span class="text-xs">' + esc(fmtDate(rv.lastVerifiedAt)) + '</span></div>' : '') +
            '<p class="text-xs text-muted mt-2">To change this: run the Runtime Execution Canary for this identity from the Governance page.</p>';
        openModal('Runtime Verification — ' + p.name, body, '<button class="btn btn-outline" id="rvClose">Close</button>');
        document.getElementById('rvClose').addEventListener('click', closeModal);
    }


    function openAddParticipantModal(editId) {
        var editing = editId ? DATA.participants.find(function (p) { return p.id === editId; }) : null;
        var body =
            '<div class="form-group"><label>Name</label><input type="text" id="fpName" value="' + (editing ? esc(editing.name) : '') + '" placeholder="e.g. Councilor Reyes"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>Type</label><select id="fpType">' + Object.keys(TYPE_LABELS).map(function (t) { return '<option value="' + t + '">' + TYPE_LABELS[t] + '</option>'; }).join('') + '</select></div>' +
            '<div class="form-group"><label>Status</label><select id="fpStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>' +
            '</div>' +
            '<div class="form-group"><label>Department</label><input type="text" id="fpDept" value="' + (editing ? esc(editing.dept) : '') + '" placeholder="e.g. Policy"></div>';
        var footer = '<button class="btn btn-outline" id="fpCancel">Cancel</button><button class="btn btn-primary" id="fpSave">' + (editing ? 'Save Changes' : 'Add Participant') + '</button>';
        openModal(editing ? 'Edit Participant' : 'Add Participant', body, footer);
        if (editing) { document.getElementById('fpType').value = editing.type; document.getElementById('fpStatus').value = editing.status; }
        document.getElementById('fpCancel').addEventListener('click', closeModal);
        document.getElementById('fpSave').addEventListener('click', function () {
            var name = document.getElementById('fpName').value.trim();
            if (!name) { showToast('error', '❌ Name is required'); return; }
            var type = document.getElementById('fpType').value;
            var status = document.getElementById('fpStatus').value;
            var dept = document.getElementById('fpDept').value.trim() || 'General';
            if (editing) {
                editing.name = name; editing.type = type; editing.status = status; editing.dept = dept;
                addLog('Participant updated: ' + name, 'info');
                showToast('success', '✅ Participant updated');
            } else {
                DATA.participants.unshift({ id: uid('p'), name: name, type: type, dept: dept, status: status, joined: new Date().toISOString().slice(0, 10), lastActive: new Date().toISOString() });
                addLog('New participant added: ' + name, 'success');
                showToast('success', '✅ ' + name + ' added');
            }
            saveData(); populateDeptFilter(); renderAll(); closeModal();
        });
    }


    function wireParticipantsPage() {
        document.getElementById('partSearchInput').addEventListener('input', debounce(function (e) { partState.search = e.target.value; partState.page = 1; renderParticipantsGrid(); }, 200));
        document.getElementById('partTypeFilter').addEventListener('change', function (e) { partState.type = e.target.value; partState.page = 1; renderParticipantsGrid(); });
        document.getElementById('partDeptFilter').addEventListener('change', function (e) { partState.dept = e.target.value; partState.page = 1; renderParticipantsGrid(); });
        document.getElementById('partStatusFilter').addEventListener('change', function (e) { partState.status = e.target.value; partState.page = 1; renderParticipantsGrid(); });
        document.getElementById('partReadinessFilter').addEventListener('change', function (e) { partState.readiness = e.target.value; partState.page = 1; renderParticipantsGrid(); });
        document.getElementById('partRecencyFilter').addEventListener('change', function (e) { partState.recency = e.target.value; partState.page = 1; renderParticipantsGrid(); });
        document.getElementById('btnAddParticipant').addEventListener('click', function () { openAddParticipantModal(); });
        document.getElementById('btnExportPartCsv').addEventListener('click', exportParticipantsCsv);
        document.getElementById('btnPartColumns').addEventListener('click', openColumnsModal);
        document.getElementById('btnImportPartCsv').addEventListener('click', function () { document.getElementById('importPartCsvInput').click(); });
        document.getElementById('importPartCsvInput').addEventListener('change', function (e) { if (e.target.files[0]) handleImportParticipantsCsv(e.target.files[0]); e.target.value = ''; });
        document.getElementById('partBulkChangeDept').addEventListener('click', openBulkChangeDeptModal);

        document.getElementById('partGridBody').addEventListener('click', function (e) {
            var copyEl = e.target.closest('.copyable');
            if (!copyEl) return;
            var value = copyEl.getAttribute('data-copy');
            if (!value) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value).then(function () {
                    showToast('success', '📋 Copied "' + value + '"');
                }).catch(function () {
                    showToast('error', '❌ Copy failed — clipboard unavailable');
                });
            } else {
                showToast('error', '❌ Clipboard not available in this browser');
            }
        });

        $all('th.sortable', document.getElementById('page-participants')).forEach(function (th) {
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'button');
            function toggleSort() {
                var key = th.getAttribute('data-key');
                if (partState.sortKey === key) partState.sortDir = partState.sortDir === 'asc' ? 'desc' : 'asc';
                else { partState.sortKey = key; partState.sortDir = 'asc'; }
                renderParticipantsGrid();
            }
            th.addEventListener('click', toggleSort);
            th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(); } });
        });

        document.getElementById('partGridBody').addEventListener('click', function (e) {
            var btn = e.target.closest('button[data-act]');
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            var p = DATA.participants.find(function (x) { return x.id === id; });
            if (!p) return;
            var act = btn.getAttribute('data-act');
            if (act === 'view') { openParticipantDetail(id); }
            else if (act === 'toggle') {
                p.status = p.status === 'active' ? 'inactive' : 'active';
                addLog(p.name + ' marked ' + p.status, p.status === 'active' ? 'success' : 'warning');
                saveData(); renderAll();
            } else if (act === 'edit') { openAddParticipantModal(id); }
            else if (act === 'delete') {
                var removeIdx = DATA.participants.indexOf(p);
                DATA.participants = DATA.participants.filter(function (x) { return x.id !== id; });
                addLog('Participant removed: ' + p.name, 'warning');
                saveData(); populateDeptFilter(); renderAll();
                showToast('warning', '🗑️ Removed ' + p.name, {
                    label: 'Undo', onClick: function () {
                        DATA.participants.splice(Math.min(removeIdx, DATA.participants.length), 0, p);
                        addLog('Participant restored: ' + p.name, 'info');
                        saveData(); populateDeptFilter(); renderAll();
                    }
                });
            }
        });
        document.getElementById('partGridBody').addEventListener('change', function (e) {
            if (!e.target.classList.contains('part-row-check')) return;
            var id = e.target.getAttribute('data-id');
            if (e.target.checked) partState.selected[id] = true; else delete partState.selected[id];
            updateBulkBar();
            updateSelectAllHint();
        });
        document.getElementById('partSelectAll').addEventListener('change', function (e) {
            $all('.part-row-check').forEach(function (cb) { cb.checked = e.target.checked; var id = cb.getAttribute('data-id'); if (e.target.checked) partState.selected[id] = true; else delete partState.selected[id]; });
            updateBulkBar();
            updateSelectAllHint();
        });
        document.getElementById('partBulkClear').addEventListener('click', function () { partState.selected = {}; renderParticipantsGrid(); });
        document.getElementById('partBulkActivate').addEventListener('click', function () { bulkSetStatus('active'); });
        document.getElementById('partBulkDeactivate').addEventListener('click', function () { bulkSetStatus('inactive'); });
        document.getElementById('partBulkDelete').addEventListener('click', function () {
            var ids = Object.keys(partState.selected).filter(function (id) { return partState.selected[id]; });
            if (!ids.length) return;
            if (!confirm('Delete ' + ids.length + ' selected participant(s)?')) return;
            var removed = DATA.participants.filter(function (p) { return ids.indexOf(p.id) !== -1; });
            DATA.participants = DATA.participants.filter(function (p) { return ids.indexOf(p.id) === -1; });
            addLog(ids.length + ' participants deleted (bulk)', 'warning');
            partState.selected = {}; saveData(); populateDeptFilter(); renderAll();
            showToast('warning', '🗑️ Deleted ' + removed.length + ' participants', {
                label: 'Undo', onClick: function () {
                    mergeById(DATA.participants, removed);
                    addLog(removed.length + ' participants restored (undo)', 'info');
                    saveData(); populateDeptFilter(); renderAll();
                }
            });
        });
        function bulkSetStatus(status) {
            var ids = Object.keys(partState.selected).filter(function (id) { return partState.selected[id]; });
            if (!ids.length) return;
            DATA.participants.forEach(function (p) { if (ids.indexOf(p.id) !== -1) p.status = status; });
            addLog(ids.length + ' participants set to ' + status + ' (bulk)', 'info');
            saveData(); renderAll();
        }
    }


    function openBulkChangeDeptModal() {
        var ids = Object.keys(partState.selected).filter(function (id) { return partState.selected[id]; });
        if (!ids.length) return;
        var depts = Array.from(new Set(DATA.participants.map(function (p) { return p.dept; }))).sort();
        var body = '<p class="text-sm mb-1">Move <b>' + ids.length + '</b> selected participant(s) to a department.</p>' +
            '<div class="form-group"><label>Department</label><input type="text" id="bcdDept" list="bcdDeptList" placeholder="Type or choose a department"><datalist id="bcdDeptList">' +
            depts.map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist></div>';
        var footer = '<button class="btn btn-outline" id="bcdCancel">Cancel</button><button class="btn btn-primary" id="bcdApply">Move ' + ids.length + '</button>';
        openModal('Change Department', body, footer);
        document.getElementById('bcdCancel').addEventListener('click', closeModal);
        document.getElementById('bcdApply').addEventListener('click', function () {
            var dept = document.getElementById('bcdDept').value.trim();
            if (!dept) { showToast('error', '❌ Enter a department name'); return; }
            DATA.participants.forEach(function (p) { if (ids.indexOf(p.id) !== -1) p.dept = dept; });
            addLog(ids.length + ' participants moved to ' + dept + ' (bulk)', 'info');
            partState.selected = {};
            saveData(); populateDeptFilter(); renderAll(); closeModal();
            showToast('success', '✅ Moved ' + ids.length + ' participants to ' + dept);
        });
    }

    // ================================================================
    // CONVERSATIONS GRID
    // ================================================================
