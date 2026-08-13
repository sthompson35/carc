'use strict';
// app/pages/dashboard.js

    function computeAttendance() {
        if (!DATA.rollCalls.length) return 0;
        var recent = DATA.rollCalls.slice(0, 10);
        var sum = recent.reduce(function (a, r) { return a + r.rate; }, 0);
        return +(sum / recent.length).toFixed(1);
    }

    function renderStats() {
        var typeCounts = {};
        DATA.participants.forEach(function (p) { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
        var breakdown = Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; })
            .map(function (t) { return typeCounts[t] + ' ' + (TYPE_LABELS[t] || t).toLowerCase(); }).join(' · ');
        var activeConvs = DATA.conversations.filter(function (c) { return c.status === 'active'; }).length;
        var today = new Date().toDateString();
        var rcToday = DATA.rollCalls.filter(function (r) { return new Date(r.date).toDateString() === today; }).length;
        var attendance = computeAttendance();

        document.getElementById('statConvs').textContent = DATA.conversations.length;
        document.getElementById('statConvsChange').textContent = activeConvs + ' active';
        document.getElementById('statParts').textContent = DATA.participants.length;
        document.getElementById('statPartsChange').textContent = breakdown;
        document.getElementById('statMsgs').textContent = DATA.totalMessages.toLocaleString();
        document.getElementById('statAttend').textContent = attendance + '%';
        document.getElementById('statAttendChange').textContent = 'last ' + Math.min(10, DATA.rollCalls.length) + ' roll calls';
        document.getElementById('statActive').textContent = rcToday;
        document.getElementById('statActiveChange').textContent = DATA.rollCalls.length + ' all-time';

        var startTs = parseInt(localStorage.getItem(START_TS_KEY) || '0', 10);
        if (!startTs) { startTs = Date.now(); localStorage.setItem(START_TS_KEY, String(startTs)); }
        var upMins = Math.floor((Date.now() - startTs) / 60000);
        var upStr = upMins < 60 ? upMins + 'm' : Math.floor(upMins / 60) + 'h ' + (upMins % 60) + 'm';
        document.getElementById('statUptime').textContent = upStr;

        renderAttendanceSparkline();
    }


    function renderAttendanceSparkline() {
        var el = document.getElementById('attendSparkline');
        if (!el) return;
        var recent = DATA.rollCalls.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); }).slice(-8);
        if (recent.length < 2) { el.innerHTML = ''; return; }
        var max = Math.max.apply(null, recent.map(function (r) { return r.rate; }).concat([1]));
        el.innerHTML = recent.map(function (r) {
            var h = Math.max((r.rate / max) * 100, 8);
            return '<div class="spark-bar" style="height:' + h + '%;" title="' + fmtDate(r.date) + ': ' + r.rate + '%"></div>';
        }).join('');
    }


    function renderGreeting() {
        var el = document.getElementById('heroGreeting');
        if (!el) return;
        var hour = new Date().getHours();
        var greeting = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Working late';
        el.textContent = greeting + ' · ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }


    function renderLastUpdated() {
        var el = document.getElementById('lastUpdatedText');
        if (el) el.textContent = 'Updated just now';
    }


    function computeAttentionItems() {
        var items = [];

        var registryAudit = auditCanonicalRegistry(DATA.participants);
        DATA.registryAudit = registryAudit;
        if (!registryAudit.valid) {
            items.push({
                ic: '🧬', text: '<b>' + registryAudit.issues.length + '</b> canonical registry integrity issue' + (registryAudit.issues.length > 1 ? 's' : '') + ' detected',
                action: 'participants', label: 'Audit registry'
            });
        }
        if (DATA.governance && DATA.governance.productionState !== 'PRODUCTION_VERIFIED') {
            var gateState = governanceGateState();
            items.push({
                ic: '🛡️', text: 'Production gate is on <b>HOLD</b> — <b>' + gateState.verified + '/' + gateState.total + '</b> requirements verified' + (gateState.registry.valid ? '' : ' · registry integrity FAIL'),
                action: 'governance', label: 'Review gate'
            });
        }

        var staleThresholdHours = 72;
        var stale = DATA.participants.filter(function (p) { return p.status === 'active' && (Date.now() - new Date(p.lastActive).getTime()) / 3600000 > staleThresholdHours; });
        if (stale.length) {
            items.push({
                ic: '⏳', text: '<b>' + stale.length + '</b> active participant' + (stale.length > 1 ? 's' : '') + ' with no activity in over ' + staleThresholdHours + 'h',
                action: 'participants', label: 'Review'
            });
        }

        var alertThreshold = DATA.agent.alertThreshold != null ? DATA.agent.alertThreshold : 70;
        var lowAttendance = DATA.rollCalls.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5).filter(function (r) { return r.rate < alertThreshold; });
        if (lowAttendance.length) {
            items.push({
                ic: '📉', text: '<b>' + lowAttendance.length + '</b> of the last 5 roll calls had attendance below ' + alertThreshold + '%',
                action: 'analytics', label: 'View trend'
            });
        }

        var emptyConvs = DATA.conversations.filter(function (c) { return c.status === 'active' && c.messages === 0; });
        if (emptyConvs.length) {
            items.push({
                ic: '💤', text: '<b>' + emptyConvs.length + '</b> active conversation' + (emptyConvs.length > 1 ? 's have' : ' has') + ' zero messages',
                action: 'conversations', label: 'Review'
            });
        }

        var workingProfiles = DATA.participants.filter(function (p) { return p.missionProfile && p.missionProfile.profileStatus === 'WORKING_PROFILE_REVIEW_REQUIRED'; }).length;
        if (workingProfiles) {
            items.push({
                ic: '📘', text: '<b>' + workingProfiles + '</b> mission profiles are role-derived working doctrine and still require approved-source review',
                action: 'participants', label: 'Review profiles'
            });
        }

        var inactiveShare = DATA.participants.length ? DATA.participants.filter(function (p) { return p.status === 'inactive'; }).length / DATA.participants.length : 0;
        if (inactiveShare > 0.15) {
            items.push({
                ic: '⚠️', text: '<b>' + (inactiveShare * 100).toFixed(0) + '%</b> of participants are marked inactive',
                action: 'participants', label: 'Review'
            });
        }

        return items;
    }


    function renderAttentionPanel() {
        var list = document.getElementById('attentionList');
        var countBadge = document.getElementById('attentionCount');
        if (!list) return;
        var items = computeAttentionItems();

        countBadge.textContent = items.length;
        if (!items.length) {
            list.innerHTML = '<div class="attention-empty">✅ All clear — nothing needs attention right now.</div>';
            return;
        }
        list.innerHTML = items.map(function (item) {
            return '<div class="attention-item"><span class="ic">' + item.ic + '</span><span class="txt">' + item.text + '</span><button class="btn btn-outline btn-sm attention-goto" data-route="' + item.action + '">' + esc(item.label) + '</button></div>';
        }).join('');
        $all('.attention-goto', list).forEach(function (btn) {
            btn.addEventListener('click', function () { navigate(btn.getAttribute('data-route')); });
        });
        updateToolbarAlertDot();
    }


    function updateToolbarAlertDot() {
        var dot = document.getElementById('toolbarAlertDot');
        if (!dot) return;
        dot.hidden = computeAttentionItems().length === 0;
    }


    function openAlertsModal() {
        var items = computeAttentionItems();
        var body = items.length
            ? items.map(function (item) {
                return '<div class="attention-item"><span class="ic">' + item.ic + '</span><span class="txt">' + item.text + '</span><button class="btn btn-outline btn-sm attention-goto" data-route="' + item.action + '">' + esc(item.label) + '</button></div>';
            }).join('')
            : '<div class="attention-empty">✅ All clear — nothing needs attention right now.</div>';
        openModal('🔔 Needs Attention (' + items.length + ')', body, '<button class="btn btn-primary" id="alClose">Close</button>');
        document.getElementById('alClose').addEventListener('click', closeModal);
        $all('.attention-goto', modalBody).forEach(function (btn) {
            btn.addEventListener('click', function () { closeModal(); navigate(btn.getAttribute('data-route')); });
        });
    }


    function renderNextRollCallWidget() {
        var el = document.getElementById('nextRollCallWidget');
        if (!el) return;
        var a = DATA.agent;
        var stateLabel = a.state.charAt(0).toUpperCase() + a.state.slice(1);
        var countdown = a.autoMode ? relTimeFuture(computeNextRun()) : 'Auto mode paused';
        el.innerHTML =
            '<div class="rollcall-widget">' +
            '<div><div class="countdown">' + esc(countdown) + '</div><div class="meta">Agent status: ' + esc(stateLabel) + ' · Last run ' + relTime(a.lastRun) + '</div></div>' +
            '<div class="grid-spacer"></div>' +
            '<button class="btn btn-success btn-sm" id="dashRunRollCall"' + (a.state === 'running' ? ' disabled' : '') + '>▶️ Run Now</button>' +
            '</div>';
        var btn = document.getElementById('dashRunRollCall');
        if (btn) btn.addEventListener('click', startRollCall);
    }

    // ================================================================
    // RENDER: DASHBOARD PREVIEWS
    // ================================================================

    function participantRowHtml(p) {
        return '<tr>' +
            '<td><div class="participant-name"><span class="participant-avatar ' + (AVATAR_CLASS[p.type] || 'avatar-user') + '">' + esc(p.name.charAt(0)) + '</span>' + esc(p.name) + '</div>' + (p.callsign ? '<div class="text-xs text-muted">' + esc(p.callsign) + ' · ' + esc(p.serviceMemberId || '') + '</div>' : '') + '</td>' +
            '<td><span class="badge ' + (TYPE_BADGE[p.type] || '') + '">' + esc(p.type) + '</span></td>' +
            '<td>' + esc(p.dept || '—') + '</td>' +
            '<td><span class="badge ' + (STATUS_BADGE[p.status] || '') + '">' + esc(p.status) + '</span></td>' +
            '</tr>';
    }

    function renderParticipantsPreview() {
        var tbody = document.getElementById('participantTablePreview');
        var sorted = DATA.participants.slice().sort(function (a, b) { return new Date(b.lastActive) - new Date(a.lastActive); }).slice(0, 6);
        tbody.innerHTML = sorted.map(participantRowHtml).join('') || '<tr><td colspan="4" class="text-muted text-sm">No participants</td></tr>';
        document.getElementById('participantCount').textContent = DATA.participants.length + ' total';
    }

    function conversationRowHtml(c) {
        return '<tr>' +
            '<td><strong>' + esc(c.title) + '</strong></td>' +
            '<td>' + c.messages + '</td>' +
            '<td class="text-muted text-sm">' + fmtDate(c.created) + '</td>' +
            '<td><span class="badge ' + (STATUS_BADGE[c.status] || '') + '">' + esc(c.status) + '</span></td>' +
            '</tr>';
    }

    function renderConversationsPreview() {
        var tbody = document.getElementById('conversationTablePreview');
        var sorted = DATA.conversations.slice().sort(function (a, b) { return new Date(b.created) - new Date(a.created); }).slice(0, 5);
        tbody.innerHTML = sorted.map(conversationRowHtml).join('') || '<tr><td colspan="4" class="text-muted text-sm">No conversations</td></tr>';
        document.getElementById('convCount').textContent = DATA.conversations.length + ' total';
    }

    // ================================================================
    // RENDER: SENTIMENT / CHARTS (reusable)
    // ================================================================
