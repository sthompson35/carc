'use strict';
// communication/chat-router.js

    function classifyBroadcastIntent(message) {
        var m = String(message || '').trim();
        if (/\b(how\s+(?:is|are)\s+(?:everyone|everybody|all)|how(?:\'s| is)\s+everyone|everyone\s+(?:doing|okay|ok|good))\b/i.test(m)) return 'wellbeing';
        if (/\b(hello|hi|hey|greetings)\b/i.test(m)) return 'greeting';
        if (/\b(status|report|ready|readiness|operational|online)\b/i.test(m)) return 'status';
        if (/\b(roll\s*call|present|attendance)\b/i.test(m)) return 'rollcall';
        return 'general';
    }


    function isGroupBroadcastMessage(message) {
        var m = String(message || '').trim();
        if (!m) return false;
        return /\b(everyone|everybody|all\s+(?:agents|members|troopers|participants|service\s+members)|roll\s*call)\b/i.test(m)
            || /\b(say|tell|message|broadcast|ask)\b[\s\S]{0,40}\b(everyone|everybody|all)\b/i.test(m);
    }


    function normalizeBroadcastText(message) {
        return String(message || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }


    function makeBroadcastId(message, atIso) {
        var input = normalizeBroadcastText(message) + '|' + String(atIso || '');
        return 'bc-' + fnv1aHash(input);
    }

    // Command risk classification. CARC's real command set has exactly one roster-wide
    // action today (broadcast) — this stays a minimal two-tier lookup rather than a
    // pre-populated multi-tier taxonomy with categories nothing in the app can trigger yet.
    // Keyed by canonical command name, not the raw query text, since tryAgentCommand's
    // regexes already decide which command fired.
    var COMMAND_RISK = {
        MARK_STATUS: 'NORMAL',
        CREATE_CONVERSATION: 'NORMAL',
        SET_ALERT_THRESHOLD: 'NORMAL',
        TOGGLE_AUTO_MODE: 'NORMAL',
        EXPORT_PARTICIPANTS_CSV: 'NORMAL',
        EXPORT_DATA: 'NORMAL',
        BROADCAST: 'ROSTER_WIDE'
    };

    function classifyCommandRisk(commandName) {
        return COMMAND_RISK[commandName] || 'NORMAL';
    }

    // Single point of gating policy: today only ROSTER_WIDE requires confirm(), but if a
    // future command lands at a higher tier, it flips this one function, not every call site.
    function requiresApproval(risk) {
        return risk !== 'NORMAL';
    }


    var chatSearchQuery = '';

    function renderChat() {
        var win = document.getElementById('chatWindow');
        if (!win) return;
        var q = chatSearchQuery.trim().toLowerCase();
        var messages = DATA.agent.chatLog;
        var filtered = q ? messages.filter(function (m) { return String(m.text || '').toLowerCase().indexOf(q) !== -1; }) : messages;
        win.innerHTML = filtered.map(function (m) {
            return '<div class="chat-bubble ' + m.role + '">' + esc(m.text) + '<span class="ct">' + esc(m.time) + '</span></div>';
        }).join('') || (q ? '<div class="text-muted text-sm" style="padding:12px;">No messages match "' + esc(chatSearchQuery) + '".</div>' : '');
        if (!q) win.scrollTop = win.scrollHeight;
        var countEl = document.getElementById('chatSearchCount');
        if (countEl) countEl.textContent = q ? (filtered.length + ' of ' + messages.length + ' match' + (filtered.length === 1 ? '' : 'es')) : '';
    }

    function showTypingIndicator() {
        var win = document.getElementById('chatWindow');
        if (!win) return;
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble agent';
        bubble.id = 'typingIndicatorBubble';
        bubble.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
        win.appendChild(bubble);
        win.scrollTop = win.scrollHeight;
    }

    function hideTypingIndicator() {
        var el = document.getElementById('typingIndicatorBubble');
        if (el) el.remove();
    }

    function clearChatHistory() {
        DATA.agent.chatLog = [{ id: uid('msg'), role: 'agent', text: 'Chat cleared. Address @CALLSIGN, ask about role/mission/tasks/status, or broadcast to ALL.', time: nowTime(), at: new Date().toISOString() }];
        saveData(); renderChat();
        showToast('info', '🗑️ Chat history cleared');
    }

    function exportChatTranscript() {
        var lines = DATA.agent.chatLog.map(function (m) { return '[' + m.time + '] ' + (m.role === 'user' ? 'You' : DATA.agent.name) + ': ' + m.text; });
        var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'carc_chat_transcript_' + new Date().toISOString().slice(0, 10) + '.txt'; a.click();
        URL.revokeObjectURL(url);
        showToast('success', '⬇️ Chat transcript exported');
    }

    function findChatTarget(query, explicitTarget) {
        if (explicitTarget === 'ALL') return null;
        if (explicitTarget && explicitTarget !== 'AUTO') {
            return DATA.participants.find(function (p) { return p.serviceMemberId === explicitTarget; }) || null;
        }
        var m = String(query || '').match(/@([A-Z0-9_]+)/i);
        if (!m) return null;
        var cs = '@' + m[1].toUpperCase();
        return DATA.participants.find(function (p) { return String(p.callsign || '').toUpperCase() === cs; }) || null;
    }
    // Plural counterpart: resolves every @callsign mention in a message, not just the first,
    // so "@VEX @MAPE status" addresses both instead of silently dropping the second mention.
    // An explicit dropdown target still takes priority and stays single-target, matching the
    // existing override behavior of findChatTarget().

    function findChatTargets(query, explicitTarget) {
        if (explicitTarget === 'ALL') return [];
        if (explicitTarget && explicitTarget !== 'AUTO') {
            var one = DATA.participants.find(function (p) { return p.serviceMemberId === explicitTarget; });
            return one ? [one] : [];
        }
        var mentions = String(query || '').match(/@([A-Z0-9_]+)/gi) || [];
        if (!mentions.length) return [];
        var seen = {}, out = [];
        mentions.forEach(function (raw) {
            var cs = raw.toUpperCase();
            var p = DATA.participants.find(function (x) { return String(x.callsign || '').toUpperCase() === cs; });
            if (p && !seen[p.id]) { seen[p.id] = true; out.push(p); }
        });
        return out;
    }

    function tryAgentCommand(query, explicitTarget) {
        var q = query.toLowerCase();

        var mark = q.match(/\bmark\s+(present|active|absent|inactive)\b/);
        if (mark) {
            var markTarget = findChatTarget(query, explicitTarget);
            if (!markTarget) return 'No canonical target resolved for that command. Address a valid @CALLSIGN or select a specific target first.';
            var newStatus = (mark[1] === 'present' || mark[1] === 'active') ? 'active' : 'inactive';
            markTarget.status = newStatus;
            markTarget.lastActive = new Date().toISOString();
            addLog(markTarget.callsign + ' marked ' + newStatus + ' via Agent Chat', 'info', { correlationId: canaryId('CMD'), risk: classifyCommandRisk('MARK_STATUS'), contentHash: fnv1aHash(query) });
            saveData(); renderAll();
            return markTarget.callsign + ' marked ' + newStatus + '.';
        }

        var newConv = query.match(/^(?:create|new)\s+conversation\s*:?\s*(.+)$/i);
        if (newConv) {
            var conv = createConversation(newConv[1], []);
            renderAll();
            return 'Conversation "' + conv.title + '" created.';
        }

        var threshold = q.match(/\balert\s+threshold\s+(?:to\s+|at\s+)?(\d{1,3})/);
        if (threshold) {
            var val = Math.max(0, Math.min(100, parseInt(threshold[1], 10)));
            DATA.agent.alertThreshold = val;
            addLog('Attendance alert threshold set to ' + val + '% via Agent Chat', 'info', { correlationId: canaryId('CMD'), risk: classifyCommandRisk('SET_ALERT_THRESHOLD'), contentHash: fnv1aHash(query) });
            saveData(); renderAttentionPanel();
            return 'Low-attendance alert threshold set to ' + val + '%.';
        }

        if (/\bpause\s+auto(\s+mode)?\b/.test(q)) {
            DATA.agent.autoMode = false;
            addLog('Agent auto mode paused via Agent Chat', 'info', { correlationId: canaryId('CMD'), risk: classifyCommandRisk('TOGGLE_AUTO_MODE'), contentHash: fnv1aHash(query) });
            saveData(); renderAgentPage();
            return 'Auto mode paused.';
        }
        if (/\bresume\s+auto(\s+mode)?\b/.test(q)) {
            DATA.agent.autoMode = true;
            addLog('Agent auto mode resumed via Agent Chat', 'info', { correlationId: canaryId('CMD'), risk: classifyCommandRisk('TOGGLE_AUTO_MODE'), contentHash: fnv1aHash(query) });
            saveData(); renderAgentPage();
            return 'Auto mode resumed.';
        }

        if (/\bexport\s+participants?(\s+csv)?\b/.test(q)) {
            exportParticipantsCsv();
            return 'Participants CSV export started — check your downloads.';
        }
        if (/\bexport\s+data\b/.test(q)) {
            exportData();
            return 'Full JSON backup export started — check your downloads.';
        }

        return null;
    }
    // startRollCall() silently no-ops (just a toast) when a roll call is already running, so
    // every broadcast-triggering reply must check state first — claiming success unconditionally
    // was misleading: rapid-fire broadcasts could report success 3 times while only 1 actually ran.

    function attemptBroadcast(query, successMsg) {
        if (DATA.agent.state === 'running') {
            return 'A roll call is already in progress — please wait a moment and try again.';
        }
        var risk = classifyCommandRisk('BROADCAST');
        var meta = { correlationId: canaryId('CMD'), risk: risk, contentHash: fnv1aHash(query) };
        if (requiresApproval(risk)) {
            var activeCount = DATA.participants.filter(function (p) { return p.status === 'active'; }).length;
            var confirmed = confirm('Broadcast this message to all ' + activeCount + ' active participant(s)? This starts a roll call and records a response for every active identity.');
            if (!confirmed) {
                addLog('Broadcast declined at approval gate — command not executed', 'warning', meta);
                return 'Broadcast cancelled — approval was not confirmed.';
            }
        }
        startRollCall(query, meta);
        return successMsg;
    }

    function agentRespond(query, explicitTarget) {
        var q = query.toLowerCase();
        var cmdReply = tryAgentCommand(query, explicitTarget);
        if (cmdReply != null) return cmdReply;
        var active = DATA.participants.filter(function (p) { return p.status === 'active'; });
        var multiTargets = findChatTargets(query, explicitTarget);
        if (multiTargets.length > 1) return multiTargets.map(function (p) { return chatMissionAnswer(p, query); }).join('\n\n');
        if (multiTargets.length === 1) return chatMissionAnswer(multiTargets[0], query);
        if (explicitTarget === 'ALL' && !isGroupBroadcastMessage(query)) {
            return attemptBroadcast(query, 'Broadcast routed to ALL active canonical identities. Responses were persisted to the roll-call transcript and are LOCAL_RULE_ENGINE · NOT_RUNTIME_VERIFIED.');
        }
        if (/roll ?call/.test(q) && /(start|run|begin|do|now)/.test(q)) { return attemptBroadcast(query, 'Roll call initiated. CARC will persist the operator message and one current canonical local response per active identity.'); }
        if (isGroupBroadcastMessage(query)) {
            return attemptBroadcast(query, 'Group broadcast accepted. CARC is persisting exactly one current canonical response per active identity. Local responses are NOT_RUNTIME_VERIFIED.');
        }
        if (/attendance/.test(q)) return 'Current attendance average (last ' + Math.min(10, DATA.rollCalls.length) + ' roll calls): ' + computeAttendance() + '%.';
        if (/active/.test(q) && /participant|member|identity/.test(q)) return active.length + ' of ' + DATA.participants.length + ' controlled identities are active in the local CARC registry.';
        if (/participant|roster|member|identit/.test(q)) return 'Canonical roster: ' + DATA.participants.length + ' controlled identities. Use @CALLSIGN to address one member, choose ALL to broadcast, or ask for status/role/mission/tasks/duties.';
        if (/conversation/.test(q)) {
            var recent = DATA.conversations.slice(0, 3).map(function (c) { return c.title; }).join(', ');
            return 'There are ' + DATA.conversations.length + ' conversations. Most recent: ' + recent + '.';
        }
        if (/help|what can you do/.test(q)) return 'Agent Chat routes by @CALLSIGN or target selector — address multiple members at once with multiple @mentions. Ask any member for status, role, purpose, mission, duties, tasks, outputs, or identity. Choose ALL or say "everyone" for a persisted roster broadcast — an unaddressed message broadcasts to ALL by default. Commands: "@CALLSIGN mark present/absent", "create conversation: <title>", "set alert threshold to N", "pause/resume auto mode", "export data", "export participants". Local responses are NOT_RUNTIME_VERIFIED.';
        // No @CALLSIGN, no recognized keyword, and no explicit target — default to a broadcast
        // rather than erroring, so a plain unaddressed message still does something useful.
        return attemptBroadcast(query, 'No @CALLSIGN or ALL specified — broadcasting to all active canonical identities by default. Responses were persisted to the roll-call transcript and are LOCAL_RULE_ENGINE · NOT_RUNTIME_VERIFIED. Address @CALLSIGN to target one member, or type "help" for other commands.');
    }

    function sendChat(text) {
        text = (text || document.getElementById('chatInput').value).trim();
        if (!text) return;
        chatHistoryPush(text);
        DATA.agent.chatLog.push({ id: uid('msg'), role: 'user', text: text, time: nowTime(), at: new Date().toISOString() });
        renderChat();
        document.getElementById('chatInput').value = '';
        showTypingIndicator();
        setTimeout(function () {
            var targetEl = document.getElementById('chatTarget');
            var reply = agentRespond(text, targetEl ? targetEl.value : 'AUTO');
            hideTypingIndicator();
            DATA.agent.chatLog.push({ id: uid('msg'), role: 'agent', text: reply, time: nowTime(), at: new Date().toISOString() });
            if (DATA.agent.chatLog.length > 100) DATA.agent.chatLog = DATA.agent.chatLog.slice(-100);
            saveData(); renderChat();
        }, 600);
    }
    // ---- Command history: Up/Down arrow recall in the chat input ----

    var chatCmdHistory = [];

    var chatCmdHistoryPos = -1;

    function chatHistoryPush(text) {
        if (chatCmdHistory[chatCmdHistory.length - 1] !== text) chatCmdHistory.push(text);
        if (chatCmdHistory.length > 50) chatCmdHistory = chatCmdHistory.slice(-50);
        chatCmdHistoryPos = chatCmdHistory.length;
    }

