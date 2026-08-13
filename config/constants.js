'use strict';
// config/constants.js

    var STORAGE_KEY = 'carc_dashboard_v3';

    var THEME_KEY = 'carc_theme_v3';

    var START_TS_KEY = 'carc_app_start_ts';

    var PALETTE = ['#667eea','#10b981','#f59e0b','#3b82f6','#ef4444','#a78bfa','#06b6d4','#f472b6','#84cc16','#f97316','#14b8a6'];


    var ONLINE_THRESHOLD_MINS = 15;

    var NEW_BADGE_HOURS = 48;

    var GRID_STATE_KEY = 'carc_grid_state_v1';

    var AUTO_SYNC_BASE_INTERVAL_MS = 60000;

    var AUTO_SYNC_MAX_BACKOFF_MS = 15 * 60000;

    var AUTO_SYNC_MAX_FAILURES = 5;

    var ROUTES = ['dashboard', 'participants', 'conversations', 'agent', 'governance', 'analytics', 'admin'];

    var ROUTE_TITLES = { dashboard: 'Dashboard', participants: 'Participants', conversations: 'Conversations', agent: 'Agent', governance: 'Governance', analytics: 'Analytics', admin: 'Admin' };

