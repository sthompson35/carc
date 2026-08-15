'use strict';
// communication/roll-call.js

    function computeNextRun() { return new Date(new Date(DATA.agent.lastRun).getTime() + DATA.agent.intervalMinutes * 60000); }


    var rcState = { search: '', sortKey: 'date', sortDir: 'desc', page: 1, pageSize: 10 };


    function renderUpcomingSchedule() {
        var el = document.getElementById('upcomingSchedule');
        if (!el) return;
        var a = DATA.agent;
        if (!a.autoMode) { el.textContent = 'Auto mode is paused — no runs scheduled.'; return; }
        var base = computeNextRun().getTime();
        var upcoming = [0, 1, 2].map(function (i) {
            return new Date(base + i * a.intervalMinutes * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        });
        el.textContent = 'Upcoming: ' + upcoming.join(' · ');
    }


    function renderRollCallHistoryGrid() {
        var result = filterSortPaginate(DATA.rollCalls, {
            search: rcState.search,
            searchFn: function (r, q) { return r.conv.toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: [], sortKey: rcState.sortKey, sortDir: rcState.sortDir, page: rcState.page, pageSize: rcState.pageSize
        });
        rcState.page = result.page;

        var historyBody = document.getElementById('rollCallHistoryBody');
        historyBody.innerHTML = result.rows.map(function (r) {
            return '<tr><td class="text-sm">' + fmtDate(r.date) + '</td><td>' + esc(r.conv) + '</td><td>' + r.present + '/' + r.total + '</td><td>' + r.rate + '%</td>' +
                '<td><span class="badge badge-completed">' + esc(r.status) + '</span></td>' +
                '<td><div class="row-actions"><button data-act="delete" data-id="' + r.id + '" title="Delete" aria-label="Delete roll call ' + esc(r.conv) + '">🗑️</button></div></td></tr>';
        }).join('') || '<tr><td colspan="6"><div class="empty-state"><div class="ic">📜</div>No roll calls match</div></td></tr>';

        document.getElementById('rcHistoryCount').textContent = result.total + ' total';
        renderPagination(document.getElementById('rcPagination'), rcState, result, renderRollCallHistoryGrid);
        $all('th.sortable', document.getElementById('page-agent')).forEach(function (th) {
            th.classList.toggle('sorted', th.getAttribute('data-key') === rcState.sortKey);
            var arrow = th.querySelector('.arrow');
            if (arrow) arrow.textContent = rcState.sortDir === 'asc' ? '▲' : '▼';
        });
    }


    function exportRollCallCsv() {
        var result = filterSortPaginate(DATA.rollCalls, {
            search: rcState.search,
            searchFn: function (r, q) { return r.conv.toLowerCase().indexOf(q.toLowerCase()) !== -1; },
            filters: [], sortKey: rcState.sortKey, sortDir: rcState.sortDir, page: 1, pageSize: 1e9
        });
        var csv = toCSV(result.rows, [
            { label: 'Date', get: function (r) { return r.date; } },
            { label: 'Conversation', get: function (r) { return r.conv; } },
            { label: 'Present', get: function (r) { return r.present; } },
            { label: 'Total', get: function (r) { return r.total; } },
            { label: 'Rate', get: function (r) { return r.rate + '%'; } },
            { label: 'Status', get: function (r) { return r.status; } }
        ]);
        downloadCSV('carc_rollcall_history_' + new Date().toISOString().slice(0, 10) + '.csv', csv);
        showToast('success', '⬇️ Exported ' + result.total + ' roll call records as CSV');
    }

    function currentCanonicalParticipants(participants) {
        var canonical = canonicalRosterIndex();
        return (participants || []).filter(function (p) {
            return p && p.status === 'active' && p.serviceMemberId && canonical[p.serviceMemberId];
        }).sort(function (a, b) {
            return String(a.serviceMemberId).localeCompare(String(b.serviceMemberId));
        });
    }


    function reconcileLocalBroadcastConversation(c, participants) {
        if (!c || !Array.isArray(c.messagesList) || !c.messagesList.length) return { changed:false, removed:0, generated:0 };
        var original = c.messagesList;
        var rebuilt = [];
        var removed = 0, generated = 0, changed = false;
        var activeCanonical = currentCanonicalParticipants(participants);

        for (var i = 0; i < original.length; i++) {
            var m = original[i];
            if (m && m.role === 'user' && isGroupBroadcastMessage(m.text)) {
                var atIso = m.time || c.created || new Date().toISOString();
                var broadcastId = m.broadcastId || makeBroadcastId(m.text, atIso);
                if (m.broadcastId !== broadcastId) { m.broadcastId = broadcastId; changed = true; }
                rebuilt.push(m);

                // Retire the entire legacy LOCAL_RULE_ENGINE response block for this broadcast.
                // It is regenerated from the current canonical roster exactly once.
                var j = i + 1;
                while (j < original.length) {
                    var next = original[j];
                    if (!(next && next.role === 'participant' && next.source === 'LOCAL_RULE_ENGINE')) break;
                    removed += 1;
                    j += 1;
                }

                var responses = buildParticipantResponses(m.text, activeCanonical, atIso, broadcastId);
                Array.prototype.push.apply(rebuilt, responses);
                generated += responses.length;
                if (removed || responses.length) changed = true;
                i = j - 1;
            } else {
                rebuilt.push(m);
            }
        }

        if (changed) {
            c.messagesList = rebuilt;
            c.messages = rebuilt.length;
            c.responseMode = 'LOCAL_RULE_ENGINE';
            c.runtimeVerified = false;
            c.canonicalBroadcastReconciled = true;
            c.reconciledAt = new Date().toISOString();
        }
        return { changed:changed, removed:removed, generated:generated };
    }


    function canonicalStatusFields(p) {
        var readiness = (p && p.readiness) || 'READINESS_UNKNOWN';
        if (readiness === 'PENDING_RUNTIME_EVIDENCE') readiness = 'READINESS_UNKNOWN';
        var gate = (typeof governanceGateState === 'function') ? governanceGateState() : null;
        // gateDecision is one real system-wide decision (PASS/HOLD) and may legitimately be shared.
        // productionVerification is a per-identity claim — it must never cascade from the global
        // gate alone, or every identity would falsely inherit PRODUCTION_VERIFIED off one agent's
        // canary run. It requires this specific identity to have its own verified execution.
        var individuallyVerified = !!(p && p.serviceMemberId && typeof hasVerifiedCanaryExecutionFor === 'function' && hasVerifiedCanaryExecutionFor(p.serviceMemberId));
        var productionVerification = (gate && gate.complete && individuallyVerified) ? 'PRODUCTION_VERIFIED' : 'NOT_RUNTIME_VERIFIED';
        var gateDecision = (gate && gate.complete) ? 'PASS' : 'HOLD';
        return {
            operationalStatus: readiness,
            productionVerification: productionVerification,
            gateDecision: gateDecision
        };
    }


    function canonicalStatusSentence(p) {
        var s = canonicalStatusFields(p);
        return 'Status: ' + s.operationalStatus + '. Production Verification: ' + s.productionVerification + '. Gate Decision: ' + s.gateDecision + '.';
    }


    function rollCallResponseFor(p, message, atIso, broadcastId) {
        var callsign = p.callsign || ('@' + String(p.name || 'PARTICIPANT').toUpperCase().replace(/\s+/g, '_'));
        var role = p.role || TYPE_LABELS[p.type] || p.type;
        var dept = p.dept || '';
        var primaryDuty = (p.missionProfile && p.missionProfile.duties && p.missionProfile.duties[0]) || '';
        var deptClause = dept ? ' [' + dept + ']' : '';
        var focusClause = primaryDuty ? ' Current focus: ' + primaryDuty + '.' : '';
        var intent = classifyBroadcastIntent(message);
        var statusText = canonicalStatusSentence(p);
        var text;
        if (intent === 'greeting') {
            text = 'Hello everyone! ' + callsign + ' online' + deptClause + ' — ' + role + '.' + focusClause + ' ' + statusText;
        } else if (intent === 'wellbeing') {
            text = callsign + ': Doing well and operational' + deptClause + ' — ' + role + '.' + focusClause + ' ' + statusText;
        } else if (intent === 'status' || intent === 'rollcall') {
            text = callsign + ' reporting present' + deptClause + ' — ' + role + '.' + focusClause + ' ' + statusText;
        } else {
            text = callsign + ' received the broadcast and is ready' + deptClause + ' — ' + role + '.' + focusClause + ' ' + statusText;
        }
        return {
            role:'participant',
            participantId:p.id,
            serviceMemberId:p.serviceMemberId,
            callsign:callsign,
            text:text,
            time:atIso,
            source:'LOCAL_RULE_ENGINE',
            verifiedRuntime:false,
            operationalStatus:canonicalStatusFields(p).operationalStatus,
            productionVerification:canonicalStatusFields(p).productionVerification,
            gateDecision:canonicalStatusFields(p).gateDecision,
            broadcastId:broadcastId,
            responseTo:broadcastId
        };
    }

    function buildParticipantResponses(message, participants, atIso, broadcastId) {
        broadcastId = broadcastId || makeBroadcastId(message, atIso);
        return currentCanonicalParticipants(participants).map(function (p) { return rollCallResponseFor(p, message, atIso, broadcastId); });
    }


    function buildRollCallTranscript(message, participants, atIso) {
        var prompt = String(message || '').trim() || 'Roll call: report your status.';
        var broadcastId = makeBroadcastId(prompt, atIso);
        return [{ role:'user', text:prompt, time:atIso, source:'CARC_OPERATOR', verifiedRuntime:true, broadcastId:broadcastId }].concat(buildParticipantResponses(prompt, participants, atIso, broadcastId));
    }


    function appendBroadcastResponsesToConversation(c, message, atIso) {
        if (!c || !isGroupBroadcastMessage(message)) return 0;
        c.messagesList = c.messagesList || [];
        var broadcastId = makeBroadcastId(message, atIso);
        var operatorMessage = c.messagesList.slice().reverse().find(function (m) {
            return m && m.role === 'user' && m.text === message && m.time === atIso;
        });
        if (operatorMessage) operatorMessage.broadcastId = broadcastId;

        var existing = {};
        c.messagesList.forEach(function (m) {
            if (m && m.role === 'participant' && m.source === 'LOCAL_RULE_ENGINE' && (m.broadcastId === broadcastId || m.responseTo === broadcastId)) {
                existing[m.serviceMemberId || m.participantId || m.callsign] = true;
            }
        });
        var responses = buildParticipantResponses(message, DATA.participants, atIso, broadcastId).filter(function (r) {
            return !existing[r.serviceMemberId || r.participantId || r.callsign];
        });
        Array.prototype.push.apply(c.messagesList, responses);
        c.messages = c.messagesList.length;
        c.responseMode = 'LOCAL_RULE_ENGINE';
        c.runtimeVerified = false;
        return responses.length;
    }


    function startRollCall(message, meta) {
        if (typeof message !== 'string') message = '';
        message = message.trim() || 'Roll call: report your status.';
        if (DATA.agent.state === 'running') { showToast('warning', '⏳ Roll call already in progress'); return; }
        DATA.agent.state = 'running';
        renderAgentPage();
        showToast('info', '📋 Roll call initiated…');
        addLog('Roll call started — message: ' + message, 'warning', meta);
        setTimeout(function () {
            var participants = currentCanonicalParticipants(DATA.participants);
            var activeParticipants = participants;
            var total = participants.length || 1;
            var present = activeParticipants.length;
            var rate = +((present / total) * 100).toFixed(1);
            var rcNum = DATA.rollCalls.length + 1;
            var now = new Date();
            var nowIso = now.toISOString();
            var label = 'Roll Call #' + rcNum;
            var transcript = buildRollCallTranscript(message, participants, nowIso);
            DATA.rollCalls.unshift({ id: uid('rc'), date: nowIso, conv: label, present: present, total: total, rate: rate, status: 'completed', message: message, responseMode: 'LOCAL_RULE_ENGINE', runtimeVerified: false });
            DATA.conversations.unshift({ id: uid('conv'), title: label, messages: transcript.length, created: nowIso, status: 'completed', participantIds: participants.map(function (p) { return p.id; }), messagesList: transcript, responseMode: 'LOCAL_RULE_ENGINE', runtimeVerified: false });
            DATA.totalMessages += transcript.length;
            DATA.agent.lastRun = nowIso;
            DATA.agent.totalRuns += 1;
            DATA.agent.state = 'idle';
            addLog('Roll call completed — ' + present + '/' + total + ' present (' + rate + '%), ' + (transcript.length - 1) + ' local responses recorded', rate >= 80 ? 'success' : 'warning', meta);
            saveData(); renderAll();
            showToast('success', '✅ Roll call complete: ' + (transcript.length - 1) + ' responses recorded');
        }, 350);
    }


    function checkAgentSchedule() {
        if (!DATA.agent.autoMode || DATA.agent.state === 'running') return;
        if (Date.now() >= computeNextRun().getTime()) startRollCall();
    }

    // ---- Chat ----
