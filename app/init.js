'use strict';
// app/init.js

    function renderAll() {
        renderStats();
        renderParticipantsPreview();
        renderConversationsPreview();
        renderSentimentInto('sentimentWrap');
        renderActivityChartInto('activityChart');
        renderPeakHoursInto('peakHours');
        renderActivityLog();
        renderGreeting();
        renderAttentionPanel();
        renderNextRollCallWidget();
        renderLastUpdated();
        var current = location.hash.slice(1) || 'dashboard';
        if (current === 'participants') renderParticipantsGrid();
        if (current === 'conversations') renderConversationsGrid();
        if (current === 'agent') { renderAgentPage(); }
        if (current === 'analytics') renderAnalyticsPage();
        if (current === 'admin') renderAdminPage();
        updateStorageSize();
    }

    // ================================================================
    // WIRING: global chrome
    // ================================================================

    function init() {
        var savedTheme = localStorage.getItem(THEME_KEY);
        setTheme(savedTheme === 'dark' ? 'dark' : 'light');

        wireChrome();
        wireParticipantsPage();
        wireConversationsPage();
        wireAgentPage();
        wireGovernancePage();
        wireAnalyticsPage();
        wireAdminPage();
        populateDeptFilter();
        populateTypeFilter();
        loadGridState();
        syncGridControlsFromState();

        navigate(location.hash.slice(1) || 'dashboard');
        renderAll();
        renderChat();

        if (DATA.governance && DATA.governance.endpoint && DATA.governance.endpoint.autoSync && DATA.governance.endpoint.autoSync.enabled && DATA.governance.endpoint.url) {
            scheduleNextAutoSync(5000);
        }

        setInterval(function () { updateClock(); checkAgentSchedule(); }, 1000);
        setInterval(function () { renderStats(); if ((location.hash.slice(1) || 'dashboard') === 'participants') renderParticipantsGrid(); }, 30000);
        setInterval(updateStatusDot, 10000);
        window.addEventListener('hashchange', function () { navigate(location.hash.slice(1)); });

        console.log('%c🏛️ CARC Dashboard v3.22.0', 'font-size:20px; font-weight:bold; color:#667eea;');
        console.log('%c' + DATA.conversations.length + ' Conversations · ' + DATA.participants.length + ' Participants · ' + DATA.totalMessages + ' Messages', 'font-size:12px; color:#6b7280;');
        console.log('%c💡 Shortcuts: Ctrl+R Refresh · Ctrl+E Export · Ctrl+I Import · Ctrl+N New Conv · Ctrl+K Search', 'font-size:12px; color:#6b7280;');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

