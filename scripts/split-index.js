'use strict';
// One-time (re-runnable) structural extraction: pulls the single inline <script> in
// index.html apart into the module files listed in MODULE_MAP, grouped by topic, while
// self-checking that reconstructing the original declaration ORDER from the pieces
// reproduces the original script body byte-for-byte. Kept as a documented tool, not
// thrown away, in case index.html's shell ever needs to be regenerated.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');

// Ordered exactly as declarations appear in the current index.html (top-level, 4-space
// indented `function NAME` or `var NAME` statements). [name, targetFile].
const MODULE_MAP = [
    ['STORAGE_KEY', 'config/constants.js'],
    ['THEME_KEY', 'config/constants.js'],
    ['START_TS_KEY', 'config/constants.js'],
    ['PALETTE', 'config/constants.js'],
    ['minsAgo', 'app/util.js'],
    ['daysAgo', 'app/util.js'],
    ['esc', 'app/util.js'],
    ['uid', 'app/util.js'],
    ['$', 'app/util.js'],
    ['$all', 'app/util.js'],
    ['ROSTER', 'data/roster.js'],
    ['mapRosterKind', 'persona/mission-doctrine.js'],
    ['UNIVERSAL_OPERATING_DOCTRINE', 'persona/mission-doctrine.js'],
    ['CONFIRMED_MISSION_PROFILES', 'persona/mission-doctrine.js'],
    ['roleDerivedMissionProfile', 'persona/mission-doctrine.js'],
    ['missionProfileForRoster', 'persona/mission-doctrine.js'],
    ['rosterToParticipant', 'persona/mission-doctrine.js'],
    ['buildDefaultData', 'data/seed.js'],
    ['nowTime', 'app/util.js'],
    ['DATA', 'app/persistence.js'],
    ['loadData', 'app/persistence.js'],
    ['canonicalRosterIndex', 'schemas/migrate.js'],
    ['auditCanonicalRegistry', 'schemas/migrate.js'],
    ['migrateData', 'schemas/migrate.js'],
    ['saveTimer', 'app/persistence.js'],
    ['saveData', 'app/persistence.js'],
    ['updateStorageSize', 'app/persistence.js'],
    ['showToast', 'app/toast.js'],
    ['addLog', 'app/activity-log.js'],
    ['modalOverlay', 'app/modal.js'],
    ['modalLastFocusedEl', 'app/modal.js'],
    ['getFocusableEls', 'app/modal.js'],
    ['openModal', 'app/modal.js'],
    ['closeModal', 'app/modal.js'],
    ['filterSortPaginate', 'app/grid.js'],
    ['renderPagination', 'app/grid.js'],
    ['relTime', 'app/util.js'],
    ['fmtDate', 'app/util.js'],
    ['computeAttendance', 'app/pages/dashboard.js'],
    ['renderStats', 'app/pages/dashboard.js'],
    ['renderAttendanceSparkline', 'app/pages/dashboard.js'],
    ['renderGreeting', 'app/pages/dashboard.js'],
    ['renderLastUpdated', 'app/pages/dashboard.js'],
    ['computeAttentionItems', 'app/pages/dashboard.js'],
    ['renderAttentionPanel', 'app/pages/dashboard.js'],
    ['updateToolbarAlertDot', 'app/pages/dashboard.js'],
    ['openAlertsModal', 'app/pages/dashboard.js'],
    ['renderNextRollCallWidget', 'app/pages/dashboard.js'],
    ['TYPE_BADGE', 'config/labels.js'],
    ['AVATAR_CLASS', 'config/labels.js'],
    ['TYPE_LABELS', 'config/labels.js'],
    ['STATUS_BADGE', 'config/labels.js'],
    ['participantRowHtml', 'app/pages/dashboard.js'],
    ['renderParticipantsPreview', 'app/pages/dashboard.js'],
    ['conversationRowHtml', 'app/pages/dashboard.js'],
    ['renderConversationsPreview', 'app/pages/dashboard.js'],
    ['renderSentimentInto', 'app/charts.js'],
    ['renderBarList', 'app/charts.js'],
    ['renderActivityChartInto', 'app/charts.js'],
    ['renderPeakHoursInto', 'app/charts.js'],
    ['renderDonutInto', 'app/charts.js'],
    ['renderActivityLog', 'app/activity-log.js'],
    ['partState', 'app/pages/participants.js'],
    ['OPTIONAL_COL_LABELS', 'config/labels.js'],
    ['applyColumnVisibility', 'app/pages/participants.js'],
    ['getParticipantFilterConfig', 'app/pages/participants.js'],
    ['countMatchingParticipants', 'app/pages/participants.js'],
    ['renderPartStatChips', 'app/pages/participants.js'],
    ['updateSelectAllHint', 'app/pages/participants.js'],
    ['selectAllMatchingParticipants', 'app/pages/participants.js'],
    ['populateDeptFilter', 'app/pages/participants.js'],
    ['populateTypeFilter', 'app/pages/participants.js'],
    ['ONLINE_THRESHOLD_MINS', 'config/constants.js'],
    ['NEW_BADGE_HOURS', 'config/constants.js'],
    ['isOnline', 'app/pages/participants.js'],
    ['isNewParticipant', 'app/pages/participants.js'],
    ['renderParticipantsGrid', 'app/pages/participants.js'],
    ['updateBulkBar', 'app/pages/participants.js'],
    ['openColumnsModal', 'app/pages/participants.js'],
    ['openParticipantDetail', 'app/pages/participants.js'],
    ['openAddParticipantModal', 'app/pages/participants.js'],
    ['wireParticipantsPage', 'app/pages/participants.js'],
    ['openBulkChangeDeptModal', 'app/pages/participants.js'],
    ['convState', 'app/pages/conversations.js'],
    ['getConversationFilterConfig', 'app/pages/conversations.js'],
    ['getDecoratedConversations', 'app/pages/conversations.js'],
    ['countMatchingConversations', 'app/pages/conversations.js'],
    ['GRID_STATE_KEY', 'config/constants.js'],
    ['saveGridState', 'app/pages/conversations.js'],
    ['loadGridState', 'app/pages/conversations.js'],
    ['syncGridControlsFromState', 'app/pages/conversations.js'],
    ['renderConvStatChips', 'app/pages/conversations.js'],
    ['renderConversationsGrid', 'app/pages/conversations.js'],
    ['updateConvSelectAllHint', 'app/pages/conversations.js'],
    ['selectAllMatchingConversations', 'app/pages/conversations.js'],
    ['updateConvBulkBar', 'app/pages/conversations.js'],
    ['CONV_STATUS_OPTIONS', 'config/labels.js'],
    ['openChangeStatusModal', 'app/pages/conversations.js'],
    ['exportConversationTranscript', 'app/pages/conversations.js'],
    ['openConversationDetail', 'app/pages/conversations.js'],
    ['participantPickerHtml', 'app/pages/conversations.js'],
    ['wireParticipantPicker', 'app/pages/conversations.js'],
    ['createConversation', 'app/pages/conversations.js'],
    ['openNewConversationModal', 'app/pages/conversations.js'],
    ['wireConversationsPage', 'app/pages/conversations.js'],
    ['openBulkAddParticipantsModal', 'app/pages/conversations.js'],
    ['computeNextRun', 'communication/roll-call.js'],
    ['rcState', 'communication/roll-call.js'],
    ['renderUpcomingSchedule', 'communication/roll-call.js'],
    ['renderAgentPage', 'app/pages/agent.js'],
    ['renderRollCallHistoryGrid', 'communication/roll-call.js'],
    ['exportRollCallCsv', 'communication/roll-call.js'],
    ['relTimeFuture', 'app/util.js'],
    ['classifyBroadcastIntent', 'communication/chat-router.js'],
    ['isGroupBroadcastMessage', 'communication/chat-router.js'],
    ['normalizeBroadcastText', 'communication/chat-router.js'],
    ['makeBroadcastId', 'communication/chat-router.js'],
    ['currentCanonicalParticipants', 'communication/roll-call.js'],
    ['reconcileLocalBroadcastConversation', 'communication/roll-call.js'],
    ['canonicalStatusFields', 'communication/roll-call.js'],
    ['canonicalStatusSentence', 'communication/roll-call.js'],
    ['rollCallResponseFor', 'communication/roll-call.js'],
    ['buildParticipantResponses', 'communication/roll-call.js'],
    ['buildRollCallTranscript', 'communication/roll-call.js'],
    ['appendBroadcastResponsesToConversation', 'communication/roll-call.js'],
    ['startRollCall', 'communication/roll-call.js'],
    ['checkAgentSchedule', 'communication/roll-call.js'],
    ['chatSearchQuery', 'communication/chat-router.js'],
    ['renderChat', 'communication/chat-router.js'],
    ['showTypingIndicator', 'communication/chat-router.js'],
    ['hideTypingIndicator', 'communication/chat-router.js'],
    ['clearChatHistory', 'communication/chat-router.js'],
    ['exportChatTranscript', 'communication/chat-router.js'],
    ['findChatTarget', 'communication/chat-router.js'],
    ['findChatTargets', 'communication/chat-router.js'],
    ['chatMissionAnswer', 'persona/chat-persona.js'],
    ['tryAgentCommand', 'communication/chat-router.js'],
    ['attemptBroadcast', 'communication/chat-router.js'],
    ['agentRespond', 'communication/chat-router.js'],
    ['sendChat', 'communication/chat-router.js'],
    ['chatCmdHistory', 'communication/chat-router.js'],
    ['chatCmdHistoryPos', 'communication/chat-router.js'],
    ['chatHistoryPush', 'communication/chat-router.js'],
    ['openRenameAgentModal', 'app/pages/agent.js'],
    ['wireAgentPage', 'app/pages/agent.js'],
    ['canaryId', 'persona/identity.js'],
    ['evaluateCanaryAuthorization', 'persona/identity.js'],
    ['evaluateIndividualReadiness', 'persona/identity.js'],
    ['hasVerifiedCanaryExecutionFor', 'persona/identity.js'],
    ['runRuntimeCanary', 'communication/runtime-sync.js'],
    ['runRegistrySweep', 'communication/runtime-sync.js'],
    ['renderCanarySweepSummary', 'communication/runtime-sync.js'],
    ['canaryHistoryState', 'communication/runtime-sync.js'],
    ['renderCanaryHistory', 'communication/runtime-sync.js'],
    ['renderRuntimeCanary', 'communication/runtime-sync.js'],
    ['exportRuntimeCanary', 'communication/runtime-sync.js'],
    ['exportRuntimeCanaryCsv', 'communication/runtime-sync.js'],
    ['renderExternalRuntime', 'communication/runtime-sync.js'],
    ['openEndpointConfigModal', 'communication/runtime-sync.js'],
    ['testEndpointConnection', 'communication/runtime-sync.js'],
    ['submitForExternalVerification', 'communication/runtime-sync.js'],
    ['syncRollCallsToRuntime', 'communication/runtime-sync.js'],
    ['syncChatToRuntime', 'communication/runtime-sync.js'],
    ['syncRosterToRuntime', 'communication/runtime-sync.js'],
    ['AUTO_SYNC_BASE_INTERVAL_MS', 'config/constants.js'],
    ['AUTO_SYNC_MAX_BACKOFF_MS', 'config/constants.js'],
    ['AUTO_SYNC_MAX_FAILURES', 'config/constants.js'],
    ['autoSyncTimer', 'communication/runtime-sync.js'],
    ['autoSyncBackoffMs', 'communication/runtime-sync.js'],
    ['autoSyncFailureStreak', 'communication/runtime-sync.js'],
    ['autoSyncSettings', 'communication/runtime-sync.js'],
    ['stopAutoSync', 'communication/runtime-sync.js'],
    ['scheduleNextAutoSync', 'communication/runtime-sync.js'],
    ['runAutoSyncCycle', 'communication/runtime-sync.js'],
    ['toggleAutoSync', 'communication/runtime-sync.js'],
    ['syncIndependentVerificationRequirement', 'communication/runtime-sync.js'],
    ['governanceGateState', 'communication/governance.js'],
    ['reconcileProductionState', 'communication/governance.js'],
    ['addGovernanceLedger', 'communication/governance.js'],
    ['renderGovernancePage', 'communication/governance.js'],
    ['openGovernanceEvidenceModal', 'communication/governance.js'],
    ['openGovernanceNoteModal', 'communication/governance.js'],
    ['exportGovernanceEvidence', 'communication/governance.js'],
    ['wireGovernancePage', 'communication/governance.js'],
    ['goToParticipantsFiltered', 'app/pages/analytics.js'],
    ['goToConversationsFiltered', 'app/pages/analytics.js'],
    ['renderAnalyticsKpis', 'app/pages/analytics.js'],
    ['renderGrowthChart', 'app/pages/analytics.js'],
    ['renderAnalyticsPage', 'app/pages/analytics.js'],
    ['exportAnalyticsReport', 'app/pages/analytics.js'],
    ['wireAnalyticsPage', 'app/pages/analytics.js'],
    ['adminLogState', 'app/pages/admin.js'],
    ['renderAdminOverview', 'app/pages/admin.js'],
    ['renderAdminTypeRegistry', 'app/pages/admin.js'],
    ['renderAdminDataSummary', 'app/pages/admin.js'],
    ['renderAdminLogGrid', 'app/pages/admin.js'],
    ['exportAdminLogCsv', 'app/pages/admin.js'],
    ['toolIdLookup', 'app/pages/admin.js'],
    ['toolRunCollisionCheck', 'app/pages/admin.js'],
    ['toolBulkReplaceDept', 'app/pages/admin.js'],
    ['toolScanStorage', 'app/pages/admin.js'],
    ['toolRunDiff', 'app/pages/admin.js'],
    ['renderAdminRuntimePanel', 'app/pages/admin.js'],
    ['renderAdminPage', 'app/pages/admin.js'],
    ['wireAdminPage', 'app/pages/admin.js'],
    ['ROUTES', 'config/constants.js'],
    ['ROUTE_TITLES', 'config/constants.js'],
    ['navigate', 'app/router.js'],
    ['closeSidebarMobile', 'app/router.js'],
    ['refreshData', 'app/wiring.js'],
    ['exportData', 'app/wiring.js'],
    ['csvEscape', 'app/util.js'],
    ['toCSV', 'app/util.js'],
    ['downloadCSV', 'app/util.js'],
    ['exportParticipantsCsv', 'app/wiring.js'],
    ['parseCSV', 'app/util.js'],
    ['handleImportParticipantsCsv', 'app/wiring.js'],
    ['exportConversationsCsv', 'app/wiring.js'],
    ['handleImportConversationsCsv', 'app/wiring.js'],
    ['mergeById', 'app/util.js'],
    ['handleImportFile', 'app/wiring.js'],
    ['openCommandPalette', 'app/command-palette.js'],
    ['setTheme', 'app/theme.js'],
    ['updateClock', 'app/clock.js'],
    ['updateStatusDot', 'app/clock.js'],
    ['debounce', 'app/util.js'],
    ['renderAll', 'app/init.js'],
    ['wireChrome', 'app/wiring.js'],
    ['init', 'app/init.js']
];

// Dependency-safe <script src> load order for the generated index.html. Only real
// constraint: runtime/persistence.js's trailing top-level `DATA = (function(){...})()`
// needs STORAGE_KEY (config), migrateData (schemas), buildDefaultData (data/seed) already
// defined — everything else is function declarations, order-independent until called.
// runtime/init.js must load last (its trailing statement calls init()).
const LOAD_ORDER = [
    'config/constants.js', 'config/labels.js',
    'app/util.js',
    'data/roster.js',
    'persona/mission-doctrine.js', 'persona/identity.js', 'persona/chat-persona.js',
    'schemas/migrate.js',
    'data/seed.js',
    'app/activity-log.js', 'app/toast.js', 'app/modal.js', 'app/grid.js', 'app/charts.js',
    // communication/* must load before app/persistence.js: its top-level DATA bootstrap
    // calls migrateData() synchronously at page load, and migrateData() transitively calls
    // reconcileLocalBroadcastConversation() (roll-call.js) -> isGroupBroadcastMessage()
    // (chat-router.js). In the original single-IIFE file this was hoisting-safe; as separate
    // <script> tags, a function declared in a later-loading file doesn't exist yet.
    'communication/roll-call.js', 'communication/chat-router.js',
    'communication/governance.js', 'communication/runtime-sync.js',
    'app/persistence.js',
    'app/pages/dashboard.js', 'app/pages/participants.js', 'app/pages/conversations.js',
    'app/pages/agent.js', 'app/pages/analytics.js', 'app/pages/admin.js',
    'app/router.js', 'app/command-palette.js', 'app/theme.js', 'app/clock.js',
    'app/wiring.js',
    'app/init.js'
];

function main() {
    const html = fs.readFileSync(INDEX_PATH, 'utf8');
    const scriptMatch = html.match(/<script>\n\(function \(\) \{\n {4}'use strict';\n\n([\s\S]*?)\n\}\)\(\);\n<\/script>/);
    if (!scriptMatch) throw new Error('Could not locate the inline <script> IIFE body in index.html');
    const body = scriptMatch[1];
    const bodyLines = body.split('\n');

    // Locate each declaration's start line (0-indexed within bodyLines) by exact match.
    function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    const positions = MODULE_MAP.map(([name]) => {
        // `\b` is unreliable around `$` (not a \w character), so use an explicit
        // not-followed-by-identifier-char lookahead instead of \b.
        const n = escapeRegex(name);
        const re = new RegExp('^ {4}(function ' + n + '(?![A-Za-z0-9_$])|var ' + n + '(?![A-Za-z0-9_$]))');
        const idx = bodyLines.findIndex(l => re.test(l));
        if (idx === -1) throw new Error('Could not find declaration for "' + name + '" in script body');
        return idx;
    });

    // Verify strictly increasing (each declaration found in expected order) — catches
    // duplicate names or a MODULE_MAP entry that drifted out of file order.
    for (let i = 1; i < positions.length; i++) {
        if (positions[i] <= positions[i - 1]) {
            throw new Error('Out-of-order or duplicate match: "' + MODULE_MAP[i][0] + '" at line ' + positions[i] + ' is not after "' + MODULE_MAP[i - 1][0] + '" at line ' + positions[i - 1]);
        }
    }

    const entries = MODULE_MAP.map(([name, file], i) => {
        const start = positions[i];
        const end = (i + 1 < positions.length ? positions[i + 1] : bodyLines.length) - 1;
        return { name, file, start, end, text: bodyLines.slice(start, end + 1).join('\n') };
    });

    // ---- Self-check: reconstructing ORIGINAL declaration order must equal the original body ----
    const reconstructed = entries.map(e => e.text).join('\n');
    if (reconstructed !== body) {
        const bad = entries.findIndex((e, i) => {
            const expectedStart = positions[i];
            return bodyLines.slice(expectedStart, (i + 1 < positions.length ? positions[i + 1] : bodyLines.length)).join('\n') !== e.text;
        });
        throw new Error('Self-check FAILED: reconstructed body does not match original. First divergence near entry ' + (bad === -1 ? '(unknown)' : entries[bad].name));
    }
    console.log('Self-check OK: ' + entries.length + ' declarations reconstruct the original ' + bodyLines.length + '-line script body exactly.');

    // ---- Group by target file, preserving original relative order within each file ----
    const byFile = new Map();
    for (const e of entries) {
        if (!byFile.has(e.file)) byFile.set(e.file, []);
        byFile.get(e.file).push(e.text);
    }

    for (const file of LOAD_ORDER) {
        if (!byFile.has(file)) throw new Error('LOAD_ORDER lists "' + file + '" but no declarations were assigned to it');
    }
    for (const file of byFile.keys()) {
        if (!LOAD_ORDER.includes(file)) throw new Error('"' + file + '" has declarations but is missing from LOAD_ORDER');
    }

    for (const [file, chunks] of byFile) {
        const outPath = path.join(ROOT, file);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const header = "'use strict';\n// " + file + '\n\n';
        fs.writeFileSync(outPath, header + chunks.join('\n\n') + '\n');
    }
    console.log('Wrote ' + byFile.size + ' module files.');

    // ---- Rewrite index.html: replace the inline script with <script src> tags ----
    const scriptTags = LOAD_ORDER.map(f => '<script src="' + f + '"></script>').join('\n');
    const finalHtml = html.slice(0, scriptMatch.index) + scriptTags + html.slice(scriptMatch.index + scriptMatch[0].length);
    fs.writeFileSync(INDEX_PATH, finalHtml);
    console.log('index.html rewritten with ' + LOAD_ORDER.length + ' <script src> tags.');
}

main();
