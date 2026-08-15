'use strict';
// app/router.js

    function navigate(route) {
        if (ROUTES.indexOf(route) === -1) route = 'dashboard';
        ROUTES.forEach(function (r) { var el = document.getElementById('page-' + r); if (el) el.hidden = r !== route; });
        $all('.nav-link').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-route') === route); });
        document.getElementById('pageTitle').textContent = ROUTE_TITLES[route];
        if (location.hash.slice(1) !== route) history.replaceState(null, '', '#' + route);
        closeSidebarMobile();
        if (route === 'participants') renderParticipantsGrid();
        if (route === 'conversations') renderConversationsGrid();
        if (route === 'agent') { renderAgentPage(); renderChat(); }
        if (route === 'helpdesk') renderHelpDeskPage();
        if (route === 'governance') renderGovernancePage();
        if (route === 'analytics') renderAnalyticsPage();
        if (route === 'admin') renderAdminPage();
    }

    function closeSidebarMobile() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
        var hb = document.getElementById('hamburgerBtn');
        if (hb) hb.setAttribute('aria-expanded', 'false');
    }

    // ================================================================
    // GLOBAL ACTIONS: refresh / export / import
    // ================================================================
