'use strict';
// app/pages/analytics.js

    function goToParticipantsFiltered(patch) {
        navigate('participants');
        Object.keys(patch).forEach(function (k) { partState[k] = patch[k]; });
        partState.page = 1;
        var typeSel = document.getElementById('partTypeFilter'); if (typeSel && 'type' in patch) typeSel.value = patch.type;
        var deptSel = document.getElementById('partDeptFilter'); if (deptSel && 'dept' in patch) deptSel.value = patch.dept;
        renderParticipantsGrid();
    }

    function goToConversationsFiltered(status) {
        navigate('conversations');
        convState.status = status;
        convState.page = 1;
        var sel = document.getElementById('convStatusFilter'); if (sel) sel.value = status;
        renderConversationsGrid();
    }


    function renderAnalyticsKpis() {
        var el = document.getElementById('analyticsKpiGrid');
        if (!el) return;
        var deptCount = new Set(DATA.participants.map(function (p) { return p.dept; })).size;
        var tiles = [
            { label: '👥 Participants', value: DATA.participants.length, route: 'participants' },
            { label: '💬 Conversations', value: DATA.conversations.length, route: 'conversations' },
            { label: '📈 Avg Attendance', value: computeAttendance() + '%', route: 'agent' },
            { label: '📋 Roll Calls', value: DATA.rollCalls.length, route: 'agent' },
            { label: '🏢 Departments', value: deptCount, route: 'participants' },
            { label: '📨 Messages', value: DATA.totalMessages.toLocaleString(), route: 'conversations' }
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


    function renderGrowthChart() {
        var monthMap = {};
        DATA.participants.forEach(function (p) {
            if (!p.joined) return;
            var d = new Date(p.joined);
            if (isNaN(d.getTime())) return;
            var key = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
            monthMap[key] = (monthMap[key] || 0) + 1;
        });
        var months = Object.keys(monthMap).sort();
        var cumulative = 0;
        var items = months.map(function (key) {
            cumulative += monthMap[key];
            var parts = key.split('-');
            var label = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            return { label: label, value: cumulative };
        }).slice(-12);
        renderBarList('analyticsGrowthChart', items, { colorFn: function () { return 'green'; } });
    }


    function renderAnalyticsPage() {
        renderAnalyticsKpis();
        renderActivityChartInto('analyticsActivityChart');
        renderPeakHoursInto('analyticsPeakHours');
        renderSentimentInto('analyticsSentiment');

        var deptCounts = {};
        DATA.participants.forEach(function (p) { deptCounts[p.dept] = (deptCounts[p.dept] || 0) + 1; });
        var deptSegments = Object.keys(deptCounts).sort().map(function (d, i) { return { label: d, value: deptCounts[d], color: PALETTE[i % PALETTE.length] }; });
        renderDonutInto('analyticsDeptDonut', deptSegments, 'Depts', function (seg) { goToParticipantsFiltered({ dept: seg.label }); });

        var typeCounts = {};
        DATA.participants.forEach(function (p) { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
        var typeKeys = Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; });
        var typeItems = typeKeys.map(function (t) { return { label: TYPE_LABELS[t] || t, value: typeCounts[t], key: t }; });
        renderBarList('analyticsTypeBreakdown', typeItems, { colorFn: function () { return 'purple'; }, onClick: function (item) { goToParticipantsFiltered({ type: item.key }); } });

        var statusCounts = { active: 0, completed: 0, archived: 0 };
        DATA.conversations.forEach(function (c) { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
        renderBarList('analyticsConvStatus', [
            { label: 'Active', value: statusCounts.active, key: 'active' }, { label: 'Completed', value: statusCounts.completed, key: 'completed' }, { label: 'Archived', value: statusCounts.archived, key: 'archived' }
        ], { colorFn: function (d) { return d.label === 'Active' ? 'green' : d.label === 'Completed' ? 'orange' : 'red'; }, onClick: function (item) { goToConversationsFiltered(item.key); } });

        var rangeSel = document.getElementById('analyticsTrendRange');
        var rangeVal = rangeSel ? rangeSel.value : '10';
        var sortedRC = DATA.rollCalls.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
        var trendSlice = rangeVal === 'all' ? sortedRC : sortedRC.slice(-parseInt(rangeVal, 10));
        var trend = trendSlice.map(function (r) {
            return { label: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: r.rate };
        });
        renderBarList('analyticsAttendanceTrend', trend, { colorFn: function (d) { return d.value >= 85 ? 'green' : d.value >= 70 ? 'orange' : 'red'; }, onClick: function () { navigate('agent'); } });

        renderGrowthChart();

        var updatedEl = document.getElementById('analyticsUpdatedText');
        if (updatedEl) updatedEl.textContent = 'Updated just now';
    }


    function exportAnalyticsReport() {
        var deptCounts = {};
        DATA.participants.forEach(function (p) { deptCounts[p.dept] = (deptCounts[p.dept] || 0) + 1; });
        var typeCounts = {};
        DATA.participants.forEach(function (p) { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
        var statusCounts = { active: 0, completed: 0, archived: 0 };
        DATA.conversations.forEach(function (c) { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
        var sortedRC = DATA.rollCalls.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

        var lines = [];
        lines.push('CARC Analytics Report');
        lines.push('Generated,' + new Date().toISOString());
        lines.push('');
        lines.push('Metric,Value');
        lines.push('Total Participants,' + DATA.participants.length);
        lines.push('Total Conversations,' + DATA.conversations.length);
        lines.push('Average Attendance,' + computeAttendance() + '%');
        lines.push('Total Roll Calls,' + DATA.rollCalls.length);
        lines.push('Total Departments,' + Object.keys(deptCounts).length);
        lines.push('Total Messages,' + DATA.totalMessages);
        lines.push('');
        lines.push('Department,Participants');
        Object.keys(deptCounts).sort().forEach(function (d) { lines.push(csvEscape(d) + ',' + deptCounts[d]); });
        lines.push('');
        lines.push('Participant Type,Count');
        Object.keys(typeCounts).forEach(function (t) { lines.push(csvEscape(TYPE_LABELS[t] || t) + ',' + typeCounts[t]); });
        lines.push('');
        lines.push('Conversation Status,Count');
        Object.keys(statusCounts).forEach(function (s) { lines.push(csvEscape(s) + ',' + statusCounts[s]); });
        lines.push('');
        lines.push('Roll Call Date,Conversation,Present,Total,Rate');
        sortedRC.forEach(function (r) { lines.push(r.date + ',' + csvEscape(r.conv) + ',' + r.present + ',' + r.total + ',' + r.rate + '%'); });

        downloadCSV('carc_analytics_report_' + new Date().toISOString().slice(0, 10) + '.csv', lines.join('\n'));
        showToast('success', '⬇️ Analytics report exported');
    }


    function wireAnalyticsPage() {
        document.getElementById('btnAnalyticsRefresh').addEventListener('click', function () {
            renderAnalyticsPage();
            addLog('Analytics refreshed', 'info');
            showToast('success', '🔄 Analytics refreshed');
        });
        document.getElementById('btnAnalyticsExport').addEventListener('click', exportAnalyticsReport);
        document.getElementById('analyticsTrendRange').addEventListener('change', renderAnalyticsPage);
    }

    // ================================================================
    // ADMIN PAGE
    // ================================================================
