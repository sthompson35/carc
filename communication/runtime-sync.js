'use strict';
// communication/runtime-sync.js

    function runRuntimeCanary() { return runRuntimeCanaryFor(); }

    function runRuntimeCanaryFor(targetOverride, opts) {
        opts = opts || {};
        var rc = DATA.runtimeCanary = DATA.runtimeCanary || {};
        var targetId = targetOverride || (document.getElementById('canaryTarget') || {}).value || rc.targetServiceMemberId || 'ATA-VEX-000';
        rc.targetServiceMemberId = targetId;
        var p = (function () { try { return resolveCanonicalIdentity(targetId, DATA.participants); } catch (e) { return null; } })();
        var started = new Date().toISOString();
        var executionId = canaryId('EXEC');
        var missionId = canaryId('MISSION');
        var evidenceId = canaryId('EVID');
        var auth = evaluateCanaryAuthorization(p);
        var telemetry = [
            { time:started, event:'CANARY_RECEIVED', executionId:executionId, detail:'Target '+(p ? p.callsign : targetId) },
            { time:started, event:'IDENTITY_RESOLVED', executionId:executionId, detail:p ? p.serviceMemberId+' · '+p.callsign : 'TARGET_NOT_FOUND' },
            { time:started, event:'AUTHORIZATION_'+(auth.allowed?'PASS':'FAIL'), executionId:executionId, detail:auth.reason }
        ];

        var result = 'BLOCKED';
        var response = '';
        if (auth.allowed) {
            telemetry.push({ time:new Date().toISOString(), event:'MISSION_RESOLVED', executionId:executionId, detail:missionId+' · '+p.missionProfile.mission });
            response = chatMissionAnswer(p, p.callsign + ': report your status and mission.');
            telemetry.push({ time:new Date().toISOString(), event:'LOCAL_EXECUTION_COMPLETE', executionId:executionId, detail:'LOCAL_CANARY_ENGINE response generated' });
            telemetry.push({ time:new Date().toISOString(), event:'EVIDENCE_CAPTURED', executionId:executionId, detail:evidenceId });
            result = 'LOCAL_CANARY_COMPLETE';
        }

        var evidence = {
            evidenceId:evidenceId,
            executionId:executionId,
            missionId:missionId,
            serviceMemberId:p ? p.serviceMemberId : targetId,
            callsign:p ? p.callsign : '',
            source:'LOCAL_CANARY_ENGINE',
            capturedAt:new Date().toISOString(),
            response:response,
            authorization:auth,
            runtimeVerified:false,
            independentVerification:'PENDING',
            productionEligible:false,
            note:'Local canary evidence validates application contract only; it is not external runtime proof.'
        };
        rc.state = auth.allowed ? 'CANARY_COMPLETE' : 'BLOCKED';
        rc.lastExecutionId = executionId;
        rc.lastRun = started;
        rc.authorization = auth.allowed ? 'PASS' : 'FAIL';
        rc.executionResult = result;
        rc.runtimeVerified = false;
        rc.independentVerification = 'PENDING';
        rc.telemetry = telemetry.concat(rc.telemetry || []).slice(0,1000);
        rc.evidence = [evidence].concat(rc.evidence || []).slice(0,500);
        rc.executions = [{
            executionId:executionId, missionId:missionId, evidenceId:evidenceId,
            targetServiceMemberId:targetId, startedAt:started, result:result,
            runtimeVerified:false, independentVerification:'PENDING'
        }].concat(rc.executions || []).slice(0,500);
        if (p) p.runtimeVerification = evaluateRuntimeVerification(p);

        addGovernanceLedger('canary', (p ? p.callsign : targetId) + ' canary → ' + result + ' · ' + executionId + ' · NOT_RUNTIME_VERIFIED');
        saveData();
        if (!opts.silent) {
            renderGovernancePage();
            showToast(auth.allowed ? 'success' : 'error', auth.allowed ? '✅ Local canary complete — external runtime verification still required' : '❌ Canary blocked: '+auth.reason);
        }
        return { ok:auth.allowed, target:p, executionId:executionId, authorization:auth, result:result };
    }

    // Authorization-only sweep across the whole controlled registry — cheap enough to run on
    // demand, and answers "can every canonical identity pass authorization right now?" without
    // generating 66 full mission executions and evidence records.

    function runRegistrySweep() {
        var targets = currentCanonicalParticipants(DATA.participants);
        var results = targets.map(function (p) {
            var auth = evaluateCanaryAuthorization(p);
            return { serviceMemberId: p.serviceMemberId, callsign: p.callsign, allowed: auth.allowed, reason: auth.reason };
        });
        var passed = results.filter(function (r) { return r.allowed; }).length;
        var failed = results.filter(function (r) { return !r.allowed; });
        DATA.runtimeCanary.lastSweep = { time: new Date().toISOString(), total: results.length, passed: passed, failed: failed.length, results: results };
        addGovernanceLedger('sweep', 'Registry canary sweep → ' + passed + '/' + results.length + ' passed authorization' + (failed.length ? ' · ' + failed.length + ' failed' : ''));
        saveData();
        renderGovernancePage();
        showToast(failed.length ? 'warning' : 'success', (failed.length ? '⚠️ ' : '✅ ') + 'Sweep complete: ' + passed + '/' + results.length + ' identities passed authorization');
    }

    function renderCanarySweepSummary() {
        var el = document.getElementById('canarySweepSummary');
        if (!el) return;
        var sweep = (DATA.runtimeCanary || {}).lastSweep;
        if (!sweep) { el.innerHTML = ''; return; }
        var failedList = sweep.failed ? sweep.results.filter(function (r) { return !r.allowed; }).map(function (r) {
            return '<div class="text-xs">• ' + esc(r.callsign) + ' — ' + esc(r.reason) + '</div>';
        }).join('') : '';
        el.innerHTML = '<div class="kv-row"><span>Last Full Sweep</span><span class="text-xs">' + esc(fmtDate(sweep.time)) + '</span></div>' +
            '<div class="kv-row"><span>Result</span><b class="' + (sweep.failed ? 'audit-bad' : 'audit-ok') + '">' + sweep.passed + ' / ' + sweep.total + ' passed authorization</b></div>' +
            (failedList ? '<div class="mt-1">' + failedList + '</div>' : '');
    }


    var canaryHistoryState = { sortKey: 'startedAt', sortDir: 'desc' };

    function renderCanaryHistory() {
        var rc = DATA.runtimeCanary || {};
        var rows = (rc.executions || []).map(function (e) {
            var p = DATA.participants.find(function (x) { return x.serviceMemberId === e.targetServiceMemberId; });
            return Object.assign({}, e, { callsign: p ? p.callsign : e.targetServiceMemberId });
        });
        rows.sort(function (a, b) {
            var av = a[canaryHistoryState.sortKey], bv = b[canaryHistoryState.sortKey];
            if (typeof av === 'boolean') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
            if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
            if (av < bv) return canaryHistoryState.sortDir === 'asc' ? -1 : 1;
            if (av > bv) return canaryHistoryState.sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        var body = document.getElementById('canaryHistoryBody');
        if (body) body.innerHTML = rows.map(function (e) {
            return '<tr><td class="text-sm">' + esc(fmtDate(e.startedAt)) + '</td><td>' + esc(e.callsign) + '</td>' +
                '<td><span class="badge ' + (e.result === 'LOCAL_CANARY_COMPLETE' ? 'badge-completed' : 'badge-inactive') + '">' + esc(e.result) + '</span></td>' +
                '<td><span class="' + (e.runtimeVerified ? 'audit-ok' : 'text-muted') + '">' + (e.runtimeVerified ? 'YES' : 'NO') + '</span></td>' +
                '<td><code class="text-xs">' + esc(e.executionId) + '</code></td></tr>';
        }).join('') || '<tr><td colspan="5"><div class="empty-state"><div class="ic">📜</div>No canary executions yet</div></td></tr>';
        var countEl = document.getElementById('canaryHistoryCount');
        if (countEl) countEl.textContent = rows.length + ' total';
        $all('th.sortable', document.getElementById('page-governance')).forEach(function (th) {
            th.classList.toggle('sorted', th.getAttribute('data-key') === canaryHistoryState.sortKey);
            var arrow = th.querySelector('.arrow');
            if (arrow) arrow.textContent = canaryHistoryState.sortDir === 'asc' ? '▲' : '▼';
        });
    }


    function renderRuntimeCanary() {
        var rc = DATA.runtimeCanary || {};
        var sel = document.getElementById('canaryTarget');
        if (sel) {
            var current = rc.targetServiceMemberId || 'ATA-VEX-000';
            sel.innerHTML = currentCanonicalParticipants(DATA.participants).map(function(p){
                return '<option value="'+esc(p.serviceMemberId)+'" '+(p.serviceMemberId===current?'selected':'')+'>'+esc(p.callsign)+' · '+esc(p.role)+'</option>';
            }).join('');
            sel.onchange = function(){ rc.targetServiceMemberId = sel.value; saveData(); renderRuntimeCanary(); };
        }
        var badge = document.getElementById('canaryStateBadge');
        if (badge) {
            badge.textContent = rc.state || 'NOT_RUN';
            badge.className = 'badge ' + (rc.state === 'RUNTIME_VERIFIED' ? 'badge-active' : rc.state === 'CANARY_COMPLETE' ? 'badge-completed' : rc.state === 'BLOCKED' ? 'badge-inactive' : 'badge-archived');
        }
        var target = (function () { try { return resolveCanonicalIdentity(rc.targetServiceMemberId, DATA.participants); } catch (e) { return null; } })();
        var summary = document.getElementById('canarySummary');
        if (summary) summary.innerHTML =
            '<div class="kv-row"><span>Target</span><b>'+esc(target ? target.callsign : (rc.targetServiceMemberId || '—'))+'</b></div>'+
            '<div class="kv-row"><span>Authorization</span><b>'+esc(rc.authorization || 'NOT_EVALUATED')+'</b></div>'+
            '<div class="kv-row"><span>Execution Result</span><b>'+esc(rc.executionResult || 'NOT_RUN')+'</b></div>'+
            '<div class="kv-row"><span>Execution ID</span><code>'+esc(rc.lastExecutionId || '—')+'</code></div>'+
            '<div class="kv-row"><span>Runtime Verification</span><b class="'+(rc.runtimeVerified?'audit-ok':'')+'">'+esc(rc.runtimeVerified ? 'RUNTIME_VERIFIED' : 'NOT_RUNTIME_VERIFIED')+'</b></div>'+
            '<div class="kv-row"><span>Independent Verification</span><b class="'+(rc.runtimeVerified?'audit-ok':'')+'">'+esc(rc.independentVerification || 'PENDING')+'</b></div>';
        var tele = document.getElementById('canaryTelemetry');
        var events = (rc.telemetry || []).slice(0,20);
        if (tele) tele.innerHTML = events.map(function(e){
            return '<div class="log-item"><span class="log-time">'+esc(fmtDate(e.time))+'</span><span class="log-event">'+esc(e.event)+' · '+esc(e.detail||'')+'</span><span class="log-status info">canary</span></div>';
        }).join('') || '<div class="text-muted text-sm">No canary telemetry recorded.</div>';
        var tc = document.getElementById('canaryTelemetryCount');
        if (tc) tc.textContent = (rc.telemetry || []).length + ' events';
    }


    function exportRuntimeCanary() {
        var rc = DATA.runtimeCanary || {};
        var payload = {
            release: DATA.governance && DATA.governance.release,
            exportedAt:new Date().toISOString(),
            runtimeCanary:rc,
            externalVerification:rc.externalVerification || null,
            endpointUrl:(DATA.governance && DATA.governance.endpoint && DATA.governance.endpoint.url) || null,
            productionState:DATA.governance && DATA.governance.productionState,
            gateDecision:DATA.governance && DATA.governance.productionGateDecision
        };
        if (!rc.runtimeVerified) payload.warning = 'LOCAL_CANARY_ENGINE evidence is NOT_RUNTIME_VERIFIED and is not production-eligible without external governed runtime evidence and independent verification.';
        var blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json;charset=utf-8;'});
        var url = URL.createObjectURL(blob), a=document.createElement('a');
        a.href=url; a.download='carc_runtime_canary_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url);
        showToast('success','⬇️ Runtime canary evidence exported');
    }


    function exportRuntimeCanaryCsv() {
        var rc = DATA.runtimeCanary || {};
        var execs = rc.executions || [];
        if (!execs.length) { showToast('error','❌ No canary executions to export'); return; }
        var cols = ['executionId','missionId','evidenceId','targetServiceMemberId','startedAt','result','runtimeVerified','independentVerification'];
        var csv = [cols.join(',')].concat(execs.map(function(e){
            return cols.map(function(k){ var v=e[k]; return v==null?'':'"'+String(v).replace(/"/g,'""')+'"'; }).join(',');
        })).join('\n');
        var blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
        var url = URL.createObjectURL(blob), a=document.createElement('a');
        a.href=url; a.download='carc_canary_executions_'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); URL.revokeObjectURL(url);
        showToast('success','⬇️ Canary executions exported as CSV');
    }


    function renderExternalRuntime() {
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        var rc = DATA.runtimeCanary || {};
        var configured = !!(ep.url);
        var hasCanary = (rc.state === 'CANARY_COMPLETE' || rc.state === 'RUNTIME_VERIFIED') && !!rc.lastExecutionId;
        var canSubmit = hasCanary && configured && !rc.runtimeVerified;
        var badge = document.getElementById('govEndpointBadge');
        if (badge) {
            var bTxt = rc.runtimeVerified ? 'RUNTIME_VERIFIED' : !configured ? 'NOT_CONFIGURED' : ep.lastTestResult === 'OK' ? 'CONNECTED' : ep.lastTestResult === 'ERROR' ? 'ERROR' : 'NOT_TESTED';
            badge.textContent = bTxt;
            badge.className = 'badge ' + (rc.runtimeVerified ? 'badge-active' : configured && ep.lastTestResult === 'OK' ? 'badge-completed' : configured ? 'badge-archived' : 'badge-inactive');
        }
        var vBadge = document.getElementById('govVerifBadge');
        if (vBadge) {
            vBadge.textContent = rc.runtimeVerified ? 'RUNTIME_VERIFIED' : rc.externalVerification ? 'REJECTED' : 'PENDING';
            vBadge.className = 'badge ' + (rc.runtimeVerified ? 'badge-active' : rc.externalVerification ? 'badge-inactive' : 'badge-archived');
        }
        var epEl = document.getElementById('govEndpointConfig');
        if (epEl) {
            var statusCls = ep.lastTestResult === 'OK' ? 'audit-ok' : ep.lastTestResult === 'ERROR' ? 'audit-bad' : '';
            var statusTxt = ep.lastTestResult === 'OK' ? 'CONNECTED' : ep.lastTestResult === 'ERROR' ? 'ERROR' : 'NOT_TESTED';
            var rs = ep.lastRosterSync;
            var rcs = ep.lastRollCallSync;
            var cs = ep.lastChatSync;
            var cmds = ep.lastCommandSync;
            var tks = ep.lastTaskSync;
            var hos = ep.lastHandoffSync;
            var rsErr = ep.lastRosterSyncError;
            var rcsErr = ep.lastRollCallSyncError;
            var csErr = ep.lastChatSyncError;
            var cmdsErr = ep.lastCommandSyncError;
            var tksErr = ep.lastTaskSyncError;
            var hosErr = ep.lastHandoffSyncError;
            var as = autoSyncSettings();
            // Stale threshold applies regardless of auto-sync mode: 2x the auto interval while
            // auto-sync is on (a missed cycle should show up quickly), a generous 24h grace
            // period while manual-only (there's no expected cadence to hold it to).
            var staleMs = as.enabled ? (AUTO_SYNC_BASE_INTERVAL_MS * 2) : (24 * 60 * 60 * 1000);
            function trustState(lastSync, lastError) {
                var syncTs = lastSync ? new Date(lastSync.syncedAt).getTime() : null;
                var errTs = lastError ? new Date(lastError.at).getTime() : null;
                if (syncTs == null && errTs == null) return { state: 'UNSYNCED', lastResult: '—', lastAt: null };
                var errorIsNewest = errTs != null && (syncTs == null || errTs > syncTs);
                if (errorIsNewest) return { state: 'ERROR', lastResult: 'ERROR', lastAt: lastError.at };
                var age = Date.now() - syncTs;
                return { state: age > staleMs ? 'STALE' : 'CURRENT', lastResult: 'SUCCESS', lastAt: lastSync.syncedAt };
            }
            var rosterTrust = trustState(rs, rsErr);
            var rcTrust = trustState(rcs, rcsErr);
            var chatTrust = trustState(cs, csErr);
            var cmdTrust = trustState(cmds, cmdsErr);
            var taskTrust = trustState(tks, tksErr);
            var handoffTrust = trustState(hos, hosErr);
            var stateCls = { CURRENT: 'audit-ok', SUCCESS: 'audit-ok', STALE: 'audit-warn', ERROR: 'audit-bad', UNSYNCED: '' };
            var combinedLastResult = (rosterTrust.lastResult === 'ERROR' || rcTrust.lastResult === 'ERROR' || chatTrust.lastResult === 'ERROR' || cmdTrust.lastResult === 'ERROR' || taskTrust.lastResult === 'ERROR' || handoffTrust.lastResult === 'ERROR') ? 'ERROR'
                : (rosterTrust.lastResult === 'SUCCESS' || rcTrust.lastResult === 'SUCCESS' || chatTrust.lastResult === 'SUCCESS' || cmdTrust.lastResult === 'SUCCESS' || taskTrust.lastResult === 'SUCCESS' || handoffTrust.lastResult === 'SUCCESS') ? 'SUCCESS' : '—';
            epEl.innerHTML =
                '<div class="kv-row"><span>Endpoint URL</span><b class="text-xs truncate" style="max-width:220px;display:block;">'+esc(ep.url||'—')+'</b></div>'+
                '<div class="kv-row"><span>Bearer Token</span><b>'+(ep.tokenSet?'•••• configured':'NOT SET')+'</b></div>'+
                '<div class="kv-row"><span>Status</span><span class="'+statusCls+'">'+statusTxt+(ep.lastTestAt?' · '+esc(fmtDate(ep.lastTestAt)):'')+'</span></div>'+
                (rs ? '<div class="kv-row"><span>Roster Sync</span><span class="text-xs">'+esc(rs.synced)+'/'+esc(rs.submitted)+(rs.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(rs.syncedAt))+'</span></div>' : '')+
                (rcs ? '<div class="kv-row"><span>Roll Call Sync</span><span class="text-xs">'+esc(rcs.synced)+'/'+esc(rcs.submitted)+(rcs.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(rcs.syncedAt))+'</span></div>' : '')+
                (cs ? '<div class="kv-row"><span>Chat Sync</span><span class="text-xs">'+esc(cs.synced)+'/'+esc(cs.submitted)+(cs.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(cs.syncedAt))+'</span></div>' : '')+
                (cmds ? '<div class="kv-row"><span>Command Sync</span><span class="text-xs">'+esc(cmds.synced)+'/'+esc(cmds.submitted)+(cmds.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(cmds.syncedAt))+'</span></div>' : '')+
                (tks ? '<div class="kv-row"><span>Task Sync</span><span class="text-xs">'+esc(tks.synced)+'/'+esc(tks.submitted)+(tks.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(tks.syncedAt))+'</span></div>' : '')+
                (hos ? '<div class="kv-row"><span>Handoff Sync</span><span class="text-xs">'+esc(hos.synced)+'/'+esc(hos.submitted)+(hos.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(hos.syncedAt))+'</span></div>' : '')+
                '<div class="kv-row"><span>Roster state</span><span class="'+(stateCls[rosterTrust.state]||'')+'">'+rosterTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Roll-call state</span><span class="'+(stateCls[rcTrust.state]||'')+'">'+rcTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Chat state</span><span class="'+(stateCls[chatTrust.state]||'')+'">'+chatTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Command state</span><span class="'+(stateCls[cmdTrust.state]||'')+'">'+cmdTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Task state</span><span class="'+(stateCls[taskTrust.state]||'')+'">'+taskTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Handoff state</span><span class="'+(stateCls[handoffTrust.state]||'')+'">'+handoffTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Last result</span><span class="'+(stateCls[combinedLastResult]||'')+'">'+combinedLastResult+'</span></div>'+
                '<div class="kv-row"><span>Next sync</span><span class="text-xs">'+(as.enabled && as.nextAttemptAt ? esc(fmtDate(as.nextAttemptAt)) : 'MANUAL')+'</span></div>'+
                '<div class="kv-row"><span>Auto-sync</span><label class="text-xs" style="display:flex;align-items:center;gap:5px;cursor:pointer;">'+
                    '<input type="checkbox" id="chkAutoSync"'+(as.enabled?' checked':'')+(configured?'':' disabled')+'> '+
                    (as.enabled ? '<span class="audit-ok">ON</span>' : 'OFF')+
                '</label></div>'+
                '<div class="flex gap-1 mt-1">'+
                    '<button class="btn btn-outline btn-sm" id="btnConfigEndpoint">⚙️ Configure</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnTestEndpoint"'+(configured?'':' disabled')+'>🔌 Test</button>'+
                    '<button class="btn btn-primary btn-sm" id="btnSubmitVerification"'+(canSubmit?'':' disabled')+'>📤 Submit for Verification</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncRoster"'+(configured?'':' disabled')+'>🔄 Sync Roster to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncRollCalls"'+(configured?'':' disabled')+'>🗓️ Sync Roll Calls to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncChat"'+(configured?'':' disabled')+'>💬 Sync Chat to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncCommands"'+(configured?'':' disabled')+'>🛡️ Sync Commands to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncTasks"'+(configured?'':' disabled')+'>🗂️ Sync Tasks to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncHandoffs"'+(configured?'':' disabled')+'>🤝 Sync Handoffs to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnSyncKnowledgePath"'+(configured?'':' disabled')+'>🧭 Sync Knowledge Path to Runtime</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnRegisterSource"'+(configured?'':' disabled')+'>📇 Register Source</button>'+
                    '<button class="btn btn-outline btn-sm" id="btnRefreshControls"'+(configured?'':' disabled')+'>🧾 Refresh Controls</button>'+
                    (configured && (ep.url.startsWith('http://')||ep.url.startsWith('https://')) ? '<a href="'+esc(ep.url)+'/admin" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">🌐 Open Admin</a>' : '')+
                '</div>'+
                '<div class="text-xs text-muted mt-1">Bearer token is stored in browser sessionStorage only — cleared when the tab closes, never included in evidence exports. Auto-sync mutates runtime state on a timer once enabled — off by default.</div>';
            document.getElementById('btnConfigEndpoint').addEventListener('click', openEndpointConfigModal);
            if (configured) document.getElementById('btnTestEndpoint').addEventListener('click', testEndpointConnection);
            if (canSubmit) document.getElementById('btnSubmitVerification').addEventListener('click', submitForExternalVerification);
            if (configured) document.getElementById('btnSyncRoster').addEventListener('click', function(){ syncRosterToRuntime(); });
            if (configured) document.getElementById('btnSyncRollCalls').addEventListener('click', function(){ syncRollCallsToRuntime(); });
            if (configured) document.getElementById('btnSyncChat').addEventListener('click', function(){ syncChatToRuntime(); });
            if (configured) document.getElementById('btnSyncCommands').addEventListener('click', function(){ syncChatCommandsToRuntime(); });
            if (configured) document.getElementById('btnSyncTasks').addEventListener('click', function(){ syncTasksToRuntime(); });
            if (configured) document.getElementById('btnSyncHandoffs').addEventListener('click', function(){ syncHandoffsToRuntime(); });
            if (configured) document.getElementById('btnSyncKnowledgePath').addEventListener('click', function(){ syncKnowledgePathHistoryToRuntime(); });
            if (configured) document.getElementById('btnRegisterSource').addEventListener('click', openGovernedSourceModal);
            if (configured) document.getElementById('btnRefreshControls').addEventListener('click', function(){ refreshRuntimeControlEvidence(); });
            document.getElementById('chkAutoSync').addEventListener('change', function(e){ toggleAutoSync(e.target.checked); });
        }
        var vrEl = document.getElementById('govVerificationResponse');
        if (vrEl) {
            var vr = rc.externalVerification;
            vrEl.innerHTML = vr ?
                '<div class="kv-row"><span>Verification State</span><span class="badge '+(vr.verified?'badge-active':'badge-inactive')+'">'+(vr.verified?'RUNTIME_VERIFIED':'REJECTED')+'</span></div>'+
                '<div class="kv-row"><span>Verifier ID</span><b>'+esc(vr.verifierId||'—')+'</b></div>'+
                '<div class="kv-row"><span>Verified At</span><span class="text-xs">'+esc(fmtDate(vr.verifiedAt))+'</span></div>'+
                '<div class="kv-row"><span>Execution ID</span><code class="text-xs">'+esc(vr.executionId||'—')+'</code></div>'+
                (vr.signature?'<div class="kv-row"><span>Signature</span><code class="text-xs" style="word-break:break-all;">'+esc(vr.signature)+'</code></div>':'')+
                (vr.reason?'<div class="kv-row"><span>Reason</span><span class="text-xs">'+esc(vr.reason)+'</span></div>':'') :
                '<div class="text-muted text-sm">No external verification response yet. Configure an endpoint and submit the canary for verification.</div>';
        }
    }


    function openEndpointConfigModal() {
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        var storedToken = ''; try { storedToken = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var body =
            '<div class="form-group"><label>Runtime Endpoint URL</label><input id="epUrl" value="'+esc(ep.url||'')+'" placeholder="https://runtime.example.com/verify"></div>'+
            '<div class="form-group"><label>Bearer Token</label><input type="password" id="epToken" value="'+esc(storedToken)+'" placeholder="Enter bearer token (leave blank to clear)"></div>'+
            '<div class="text-xs text-muted">The endpoint URL is stored with the rest of your data in <code>localStorage</code>. The token is kept separately in <code>sessionStorage</code> — cleared when this tab closes — and never included in any evidence export.</div>';
        openModal('Configure External Runtime Endpoint', body, '<button class="btn btn-outline" id="epCancel">Cancel</button><button class="btn btn-primary" id="epSave">Save</button>');
        document.getElementById('epCancel').addEventListener('click', closeModal);
        document.getElementById('epSave').addEventListener('click', function() {
            var url = document.getElementById('epUrl').value.trim();
            var token = document.getElementById('epToken').value.trim();
            if (url) { try { new URL(url); } catch(e) { showToast('error','❌ Invalid URL'); return; } }
            DATA.governance.endpoint = DATA.governance.endpoint || {};
            DATA.governance.endpoint.url = url;
            DATA.governance.endpoint.tokenSet = !!token;
            if (token) { try { sessionStorage.setItem('carc_endpoint_token', token); } catch(e) {} }
            else { try { sessionStorage.removeItem('carc_endpoint_token'); } catch(e) {} }
            addGovernanceLedger('endpoint', 'Runtime endpoint ' + (url ? 'configured: ' + url : 'cleared'));
            saveData(); renderGovernancePage(); closeModal();
            showToast('success', '✅ Endpoint configuration saved');
        });
    }


    function testEndpointConnection() {
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { showToast('error', '❌ No endpoint URL configured'); return; }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var testBtn = document.getElementById('btnTestEndpoint');
        if (testBtn) { testBtn.disabled = true; testBtn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 8000);
        fetch(ep.url, { method: 'HEAD', headers: headers, signal: ctrl.signal })
            .then(function(r) {
                clearTimeout(tid);
                ep.lastTestResult = 'OK'; ep.lastTestAt = new Date().toISOString();
                addGovernanceLedger('endpoint', 'Connection test → CONNECTED (HTTP ' + r.status + ')');
                saveData(); renderGovernancePage();
                showToast('success', '✅ Endpoint reachable (HTTP ' + r.status + ')');
            })
            .catch(function(err) {
                clearTimeout(tid);
                ep.lastTestResult = 'ERROR'; ep.lastTestAt = new Date().toISOString();
                var msg = (err && err.name === 'AbortError') ? 'timeout after 8s' : (err.message || 'network error');
                addGovernanceLedger('endpoint', 'Connection test → ERROR: ' + msg);
                saveData(); renderGovernancePage();
                showToast('error', '❌ Connection failed: ' + msg);
            });
    }


    function submitForExternalVerification(opts) {
        opts = (opts && opts.silent === true) ? opts : {};
        var rc = DATA.runtimeCanary || {};
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!opts.silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ok:false,error:'NO_ENDPOINT'}); }
        if (!rc.lastExecutionId) { if (!opts.silent) showToast('error', '❌ No canary execution to verify'); return Promise.resolve({ok:false,error:'NO_EXECUTION'}); }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var submitBtn = document.getElementById('btnSubmitVerification');
        if (submitBtn) submitBtn.disabled = true;
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var submittedAt = new Date().toISOString();
        var body = {
            executionId: rc.lastExecutionId,
            evidenceId: rc.evidence && rc.evidence[0] && rc.evidence[0].evidenceId,
            serviceMemberId: rc.targetServiceMemberId,
            capturedAt: rc.lastRun,
            source: 'CARC_LOCAL_CANARY',
            authorization: rc.authorization,
            executionResult: rc.executionResult
        };
        rc.telemetry = [{ time:submittedAt, event:'EXTERNAL_VERIFICATION_SUBMITTED', executionId:rc.lastExecutionId, detail:ep.url }].concat(rc.telemetry || []).slice(0,1000);
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(ep.url, { method:'POST', headers:headers, body:JSON.stringify(body), signal:ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                var vr = res.data || {};
                var verified = !!(vr.verified);
                var ext = {
                    verified:verified, verifierId:vr.verifierId||'EXTERNAL_VERIFIER',
                    verifiedAt:vr.verifiedAt||new Date().toISOString(),
                    executionId:vr.executionId||rc.lastExecutionId,
                    signature:vr.signature||null, reason:vr.reason||null,
                    responseStatus:res.status, submittedAt:submittedAt
                };
                rc.externalVerification = ext;
                rc.runtimeVerified = verified;
                rc.independentVerification = verified ? 'RUNTIME_VERIFIED' : 'REJECTED';
                if (verified) rc.state = 'RUNTIME_VERIFIED';
                if (rc.evidence && rc.evidence[0]) {
                    rc.evidence[0].runtimeVerified = verified;
                    rc.evidence[0].independentVerification = verified ? 'RUNTIME_VERIFIED' : 'REJECTED';
                    rc.evidence[0].productionEligible = verified;
                    rc.evidence[0].externalVerification = ext;
                }
                if (rc.executions && rc.executions[0]) {
                    rc.executions[0].runtimeVerified = verified;
                    rc.executions[0].independentVerification = verified ? 'RUNTIME_VERIFIED' : 'REJECTED';
                    rc.executions[0].externalVerification = ext;
                }
                rc.telemetry = [{ time:new Date().toISOString(), event:verified?'EXTERNAL_VERIFICATION_PASS':'EXTERNAL_VERIFICATION_FAIL', executionId:rc.lastExecutionId, detail:'verifier: '+(vr.verifierId||'?')+(vr.reason?' · '+vr.reason:'') }].concat(rc.telemetry||[]).slice(0,1000);
                addGovernanceLedger('verification', rc.targetServiceMemberId+' external verification → '+(verified?'RUNTIME_VERIFIED':'REJECTED')+' · verifier: '+(vr.verifierId||'?'));
                syncIndependentVerificationRequirement(ext, rc);
                if (verified) reconcileProductionState();
                saveData(); if (!opts.silent) renderGovernancePage();
                if (!opts.silent) showToast(verified?'success':'error', verified?'✅ RUNTIME_VERIFIED — canary evidence accepted by external verifier':'❌ Verification REJECTED: '+(vr.reason||'no reason provided'));
                return {ok:verified, verified:verified, externalVerification:ext, error:verified?null:(vr.reason||'REJECTED')};
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                rc.telemetry = [{ time:new Date().toISOString(), event:'EXTERNAL_VERIFICATION_ERROR', executionId:rc.lastExecutionId, detail:msg }].concat(rc.telemetry||[]).slice(0,1000);
                addGovernanceLedger('verification', 'External verification request failed: '+msg);
                saveData(); if (!opts.silent) renderGovernancePage();
                if (!opts.silent) showToast('error', '❌ Verification request failed: '+msg);
                return {ok:false,error:msg};
            });
    }

    function endpointAuthHeaders() {
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type':'application/json' };
        if (token) headers.Authorization = 'Bearer ' + token;
        return headers;
    }

    function updateRuntimeManagedRequirement(id, result, generatedAt) {
        var req = (DATA.governance.requirements || []).find(function (r) { return r.id === id; });
        if (!req) return;
        req.status = result.verified ? 'VERIFIED' : 'PENDING';
        req.evidence = result.verified
            ? 'Runtime control evidence at ' + generatedAt + ': ' + JSON.stringify(result)
            : 'Runtime control pending: ' + (result.issues || []).join(', ');
        req.verifier = result.verified ? 'CARC-RUNTIME-CONTROL-PLANE' : '';
        req.updatedAt = generatedAt;
    }

    function refreshRuntimeControlEvidence(opts) {
        opts = opts || {};
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) return Promise.resolve({ ok:false, error:'NO_ENDPOINT' });
        var base = ep.url.replace(/\/+$/, '');
        // Controlled negative authorization probe: the CARC operator token intentionally lacks
        // tokens:admin. A 403 is retained by the runtime as real least-privilege denial evidence.
        return fetch(base + '/api/tokens', { headers:endpointAuthHeaders() })
            .then(function () { return fetch(base + '/api/governance/control-status', { headers:endpointAuthHeaders() }); })
            .then(function (r) { return r.json().then(function (d) { return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function (res) {
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                updateRuntimeManagedRequirement('source_access', res.data.governedSourceAccess, res.data.generatedAt);
                updateRuntimeManagedRequirement('permissions', res.data.enforcedPermissions, res.data.generatedAt);
                addGovernanceLedger('controls', 'Runtime controls refreshed → source access ' + (res.data.governedSourceAccess.verified?'VERIFIED':'PENDING') + ' · permissions ' + (res.data.enforcedPermissions.verified?'VERIFIED':'PENDING'));
                reconcileProductionState(); saveData(); renderGovernancePage();
                if (!opts.silent) showToast((res.data.governedSourceAccess.verified && res.data.enforcedPermissions.verified)?'success':'info', '🧾 Runtime control evidence refreshed');
                return { ok:true, data:res.data };
            }).catch(function (err) {
                if (!opts.silent) showToast('error', '❌ Control refresh failed: ' + (err.message || 'network error'));
                return { ok:false, error:err.message || 'network error' };
            });
    }

    function openGovernedSourceModal() {
        var now = new Date();
        var due = new Date(now.getTime() + 30 * 86400000);
        var body =
            '<div class="form-group"><label>Source ID</label><input id="gsId" placeholder="SRC-CANONICAL-ROSTER-001"></div>'+
            '<div class="form-group"><label>Name</label><input id="gsName" placeholder="Authoritative source name"></div>'+
            '<div class="form-group"><label>Authority / Owner</label><input id="gsAuthority" placeholder="Named authority responsible for this source"></div>'+
            '<div class="form-group"><label>Source URI</label><input id="gsUri" placeholder="file, repository, database, or controlled-record URI"></div>'+
            '<div class="form-group"><label>SHA-256 Content Hash</label><input id="gsHash" placeholder="64 hexadecimal characters"></div>'+
            '<div class="form-group"><label>Permission Basis</label><input id="gsPermission" placeholder="Approval, license, delegation, or access policy"></div>'+
            '<div class="form-group"><label>Provenance</label><textarea id="gsProvenance" rows="2" placeholder="Origin and chain of custody"></textarea></div>'+
            '<div class="form-group"><label>Freshness Checked At</label><input id="gsFresh" value="'+esc(now.toISOString())+'"></div>'+
            '<div class="form-group"><label>Review Due At</label><input id="gsDue" value="'+esc(due.toISOString())+'"></div>'+
            '<div class="form-group"><label>Registered By</label><input id="gsBy" placeholder="Named operator"></div>';
        openModal('Register Governed Source', body, '<button class="btn btn-outline" id="gsCancel">Cancel</button><button class="btn btn-primary" id="gsSave">Register & Validate Access</button>');
        document.getElementById('gsCancel').addEventListener('click', closeModal);
        document.getElementById('gsSave').addEventListener('click', function () {
            var payload = { sourceId:document.getElementById('gsId').value.trim().toUpperCase(), name:document.getElementById('gsName').value.trim(), authority:document.getElementById('gsAuthority').value.trim(), sourceUri:document.getElementById('gsUri').value.trim(), contentHash:document.getElementById('gsHash').value.trim(), permissionBasis:document.getElementById('gsPermission').value.trim(), provenance:document.getElementById('gsProvenance').value.trim(), status:'ACTIVE', freshnessCheckedAt:document.getElementById('gsFresh').value.trim(), reviewDueAt:document.getElementById('gsDue').value.trim(), registeredBy:document.getElementById('gsBy').value.trim() };
            var ep = DATA.governance.endpoint || {}, base = ep.url.replace(/\/+$/, '');
            fetch(base + '/api/sources', { method:'POST', headers:endpointAuthHeaders(), body:JSON.stringify(payload) })
                .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.reason || d.error || ('HTTP ' + r.status)); return d; }); })
                .then(function () { return fetch(base + '/api/sources/' + encodeURIComponent(payload.sourceId) + '/access', { method:'POST', headers:endpointAuthHeaders(), body:JSON.stringify({ purpose:'CARC production-governance validation' }) }); })
                .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.reason || d.error || ('HTTP ' + r.status)); return d; }); })
                .then(function () { closeModal(); showToast('success', '✅ Governed source registered and access validated'); return refreshRuntimeControlEvidence(); })
                .catch(function (err) { showToast('error', '❌ Source registration failed: ' + err.message); });
        });
    }

    function batchVerificationDelay() {
        return new Promise(function(resolve){ setTimeout(resolve, 1100); });
    }

    function recordVerificationBatchActivity(batch, phase, row) {
        if (typeof addLog !== 'function' || !batch) return null;
        var batchId = batch.batchId || 'BATCH-UNKNOWN';
        var status = phase === 'COMPLETE' || phase === 'PASS' ? 'success' : (phase === 'START' ? 'warning' : 'error');
        var event;
        var meta = { batchId:batchId, risk:'ROSTER_WIDE', outcome:phase };
        if (phase === 'START') {
            meta.correlationId = batchId + ':START';
            event = 'Roster-wide external verification started — ' + batch.total + ' canonical identities · ' + batchId;
        } else if (phase === 'COMPLETE') {
            meta.correlationId = batchId + ':COMPLETE';
            event = 'Roster-wide external verification complete — ' + batch.verified + '/' + batch.total + ' verified, ' + batch.failed + ' failed · ' + batchId;
        } else if (phase === 'FAILED') {
            meta.correlationId = batchId + ':FAILED';
            event = 'Roster-wide external verification failed — ' + (batch.error || 'unknown error') + ' · ' + batchId;
        } else {
            row = row || {};
            meta.correlationId = row.executionId || (batchId + ':' + row.serviceMemberId);
            meta.serviceMemberId = row.serviceMemberId;
            meta.executionId = row.executionId;
            meta.verifierId = row.verifierId;
            meta.signature = row.signature;
            meta.contentHash = row.signature;
            event = (row.callsign || row.serviceMemberId || 'Unknown identity') + ' external verification ' + phase + ' · ' + (row.executionId || 'NO_EXECUTION_ID') + (row.verifierId ? ' · verifier: ' + row.verifierId : '');
        }
        return addLog(event, status, meta);
    }

    function buildIndividualVerificationPlan(participants, authorizationFn) {
        var canonical = canonicalRosterIndex();
        var targets = (participants || []).filter(function(p){return p && p.serviceMemberId && canonical[p.serviceMemberId];}).sort(function(a,b){return String(a.serviceMemberId).localeCompare(String(b.serviceMemberId));});
        var checks = targets.map(function(p){return {p:p,auth:authorizationFn(p)};});
        return {
            targets:targets,
            authorized:checks.filter(function(x){return x.auth.allowed;}),
            blocked:checks.filter(function(x){return !x.auth.allowed;}),
            delayMs:1100
        };
    }

    function runAndSubmitAllIndividualCanaries() {
        var rc = DATA.runtimeCanary = DATA.runtimeCanary || {};
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url || ep.lastTestResult !== 'OK') { showToast('error','❌ Connect and test the external runtime before starting the individual batch'); return Promise.resolve({ok:false,error:'ENDPOINT_NOT_CONNECTED'}); }
        if (rc.batchVerification && rc.batchVerification.status === 'RUNNING') { showToast('warning','A roster-wide verification batch is already running'); return Promise.resolve({ok:false,error:'BATCH_ALREADY_RUNNING'}); }
        var plan = buildIndividualVerificationPlan(DATA.participants,evaluateCanaryAuthorization);
        var targets = plan.targets;
        var unauthorized = plan.blocked;
        if (unauthorized.length) {
            rc.batchVerification = {status:'BLOCKED',startedAt:new Date().toISOString(),total:targets.length,completed:0,verified:0,failed:unauthorized.length,current:null,results:unauthorized.map(function(x){return {serviceMemberId:x.p.serviceMemberId,callsign:x.p.callsign,ok:false,error:x.auth.reason};})};
            saveData(); renderGovernancePage(); showToast('error','❌ Batch blocked: '+unauthorized.length+' identities failed authorization'); return Promise.resolve({ok:false,error:'AUTHORIZATION_FAILED'});
        }
        if (!confirm('Run and externally submit '+targets.length+' individual canaries? This creates separate execution evidence for every canonical identity, runs sequentially for rate-limit safety, and stops on the first failure. Allow about 2 minutes.')) return Promise.resolve({ok:false,error:'APPROVAL_DECLINED'});
        rc.batchVerification = {batchId:canaryId('BATCH'),status:'RUNNING',startedAt:new Date().toISOString(),finishedAt:null,total:targets.length,completed:0,verified:0,failed:0,current:null,results:[]};
        recordVerificationBatchActivity(rc.batchVerification,'START');
        saveData(); renderGovernancePage();
        var chain = Promise.resolve();
        targets.forEach(function(p,index){
            chain = chain.then(function(){
                rc.batchVerification.current = p.callsign;
                rc.batchVerification.completed = index;
                saveData(); renderBatchVerificationProgress();
                var local = runRuntimeCanaryFor(p.serviceMemberId,{silent:true});
                if (!local.ok) throw new Error(p.callsign+' local canary blocked: '+local.authorization.reason);
                return submitForExternalVerification({silent:true}).then(function(result){
                    var row={serviceMemberId:p.serviceMemberId,callsign:p.callsign,executionId:local.executionId,ok:result.ok,verifierId:result.externalVerification&&result.externalVerification.verifierId,signature:result.externalVerification&&result.externalVerification.signature,verifiedAt:result.externalVerification&&result.externalVerification.verifiedAt,error:result.error||null};
                    rc.batchVerification.results.push(row); rc.batchVerification.completed=index+1;
                    recordVerificationBatchActivity(rc.batchVerification,result.ok?'PASS':'FAIL',row);
                    if(result.ok) rc.batchVerification.verified++; else {rc.batchVerification.failed++; throw new Error(p.callsign+' verification failed: '+(result.error||'REJECTED'));}
                    p.runtimeVerification=evaluateRuntimeVerification(p); reconcileProductionState(); saveData(); renderBatchVerificationProgress();
                    return index < targets.length-1 ? batchVerificationDelay() : null;
                });
            });
        });
        return chain.then(function(){
            rc.batchVerification.status='COMPLETE';rc.batchVerification.current=null;rc.batchVerification.finishedAt=new Date().toISOString();
            addGovernanceLedger('verification','Roster-wide individual external verification → '+rc.batchVerification.verified+'/'+rc.batchVerification.total+' RUNTIME_VERIFIED');
            recordVerificationBatchActivity(rc.batchVerification,'COMPLETE');
            saveData();renderGovernancePage();showToast('success','✅ '+rc.batchVerification.verified+'/'+rc.batchVerification.total+' individual identities externally verified');
            return {ok:true,batch:rc.batchVerification};
        }).catch(function(err){
            rc.batchVerification.status='FAILED';rc.batchVerification.current=null;rc.batchVerification.finishedAt=new Date().toISOString();rc.batchVerification.error=err.message;
            addGovernanceLedger('verification','Roster-wide individual verification stopped: '+err.message);recordVerificationBatchActivity(rc.batchVerification,'FAILED');saveData();renderGovernancePage();showToast('error','❌ Batch stopped: '+err.message);
            return {ok:false,error:err.message,batch:rc.batchVerification};
        });
    }

    function renderBatchVerificationProgress() {
        var el=document.getElementById('batchVerificationProgress');if(!el)return;
        var b=(DATA.runtimeCanary||{}).batchVerification;
        if(!b){el.innerHTML='<div class="text-muted text-sm">No roster-wide individual verification batch has run.</div>';return;}
        var pct=b.total?Math.round((b.completed/b.total)*100):0;
        el.innerHTML='<div class="kv-row"><span>Status</span><b class="'+(b.status==='COMPLETE'?'audit-ok':b.status==='FAILED'||b.status==='BLOCKED'?'audit-bad':'audit-warn')+'">'+esc(b.status)+'</b></div>'+
            '<div class="kv-row"><span>Progress</span><b>'+b.completed+' / '+b.total+' · '+pct+'%</b></div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div>'+
            '<div class="kv-row"><span>Verified / Failed</span><span>'+b.verified+' / '+b.failed+'</span></div>'+(b.current?'<div class="kv-row"><span>Current identity</span><b>'+esc(b.current)+'</b></div>':'')+(b.error?'<div class="text-xs audit-bad mt-1">'+esc(b.error)+'</div>':'');
    }

    // Both sync functions return a Promise<{ok, error?}> so the auto-sync orchestrator can
    // observe success/failure without depending on toasts or button DOM elements that only
    // exist for a manual, user-clicked sync.

    function syncRollCallsToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = (DATA.rollCalls || []).map(function(r) {
            return { id: r.id, date: r.date, conv: r.conv, present: r.present, total: r.total, rate: r.rate, status: r.status, message: r.message, responseMode: r.responseMode };
        });
        if (!records.length) { if (!silent) showToast('error', '❌ No roll calls to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncRollCalls');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/roll-calls/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastRollCallSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Roll call sync → ' + res.data.inserted + ' inserted, ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' roll call record(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastRollCallSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Roll call sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Roll call sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }


    function syncChatToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = (DATA.agent.chatLog || []).filter(function(m) { return m.id; }).map(function(m) {
            return { id: m.id, role: m.role, text: m.text, occurredAt: m.at };
        });
        if (!records.length) { if (!silent) showToast('error', '❌ No chat messages to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncChat');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/chat/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastChatSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Chat sync → ' + res.data.inserted + ' inserted, ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' chat message(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastChatSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Chat sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Chat sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }


    function syncChatCommandsToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = (DATA.activityLog || []).filter(function(e) { return e.correlationId; }).map(function(e) {
            return { id: e.correlationId, event: e.event, status: e.status, risk: e.risk || 'NORMAL', contentHash: e.contentHash, occurredAt: e.at,
                batchId: e.batchId, serviceMemberId: e.serviceMemberId, executionId: e.executionId, verifierId: e.verifierId, signature: e.signature, outcome: e.outcome };
        });
        // An empty command-audit trail is a valid snapshot, not a sync failure. Send [] so the
        // runtime can attest that it received the current (empty) stream, record the sync event,
        // and report Command state CURRENT. This also keeps manual and auto-sync semantics aligned.
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncCommands');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/commands/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastCommandSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Command audit sync → ' + res.data.inserted + ' inserted, ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' command-audit event(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastCommandSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Command audit sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Command audit sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }


    function syncRosterToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = (DATA.participants || []).filter(function(p) { return p.serviceMemberId; }).map(function(p) {
            return { serviceMemberId: p.serviceMemberId, status: p.status, readiness: p.readiness, missionProfile: p.missionProfile };
        });
        if (!records.length) { if (!silent) showToast('error', '❌ No roster records to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncRoster');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/roster/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastRosterSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Roster sync → ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged, ' + res.data.unmatched + ' unmatched');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' roster record(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastRosterSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Roster sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Roster sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }

    function syncTasksToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = (DATA.tasks || []).map(function(t) {
            return { taskId: t.taskId, ownerServiceMemberId: t.ownerServiceMemberId, assignedByServiceMemberId: t.assignedByServiceMemberId, title: t.title, description: t.description, sourceMissionTaskText: t.sourceMissionTaskText, state: t.state, createdAt: t.createdAt, updatedAt: t.updatedAt };
        });
        // Unlike roster/roll-calls/chat, which always have seeded data, tasks start genuinely
        // empty until one is created — same non-failure "skipped" handling as command-audit sync,
        // so an idle install doesn't silently disable auto-sync after 5 empty cycles.
        if (!records.length) {
            if (!silent) { showToast('error', '❌ No tasks to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
            return Promise.resolve({ ok:true, skipped:true, error:'NO_RECORDS' });
        }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncTasks');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/tasks/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastTaskSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Task sync → ' + res.data.inserted + ' inserted, ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' task(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastTaskSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Task sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Task sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }


    function syncHandoffsToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = (DATA.handoffs || []).map(function(h) {
            return { handoffId: h.handoffId, taskId: h.taskId, fromServiceMemberId: h.fromServiceMemberId, toServiceMemberId: h.toServiceMemberId, notes: h.notes, state: h.state, createdAt: h.createdAt, updatedAt: h.updatedAt };
        });
        if (!records.length) {
            if (!silent) { showToast('error', '❌ No handoffs to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
            return Promise.resolve({ ok:true, skipped:true, error:'NO_RECORDS' });
        }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncHandoffs');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/handoffs/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastHandoffSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Handoff sync → ' + res.data.inserted + ' inserted, ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' handoff(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastHandoffSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Handoff sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Handoff sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }

    // ---- Auto-sync: feature-flagged, off by default, with exponential backoff on failure ----

    var autoSyncTimer = null;

    var autoSyncBackoffMs = 0;

    var autoSyncFailureStreak = 0;


    function autoSyncSettings() {
        DATA.governance.endpoint = DATA.governance.endpoint || {};
        DATA.governance.endpoint.autoSync = DATA.governance.endpoint.autoSync || { enabled: false };
        return DATA.governance.endpoint.autoSync;
    }

    function stopAutoSync() {
        if (autoSyncTimer) { clearTimeout(autoSyncTimer); autoSyncTimer = null; }
    }

    function scheduleNextAutoSync(delayMs) {
        stopAutoSync();
        var as = autoSyncSettings();
        if (!as.enabled) return;
        var delay = delayMs != null ? delayMs : (AUTO_SYNC_BASE_INTERVAL_MS + autoSyncBackoffMs);
        as.nextAttemptAt = new Date(Date.now() + delay).toISOString();
        autoSyncTimer = setTimeout(runAutoSyncCycle, delay);
    }

    // Flattens every participant's knowledge-path stage history[] (append-only, per-stage,
    // added in the schema-26/27 reconciliation) into one wire array of individually-idempotent
    // events keyed by evidenceEventId — this is the durable long-term record localStorage was
    // never designed to keep (activityLog caps at 500; stage history caps at 100/stage locally,
    // but the runtime table has no cap at all).
    function syncKnowledgePathHistoryToRuntime(opts) {
        opts = opts || {};
        var initiator = opts.initiator === 'auto' ? 'auto' : 'manual';
        var silent = !!opts.silent;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { if (!silent) showToast('error', '❌ No endpoint URL configured'); return Promise.resolve({ ok:false, error:'NO_ENDPOINT' }); }
        var records = [];
        (DATA.participants || []).filter(function(p){ return !!p.serviceMemberId; }).forEach(function(p) {
            ((p.knowledgePath && p.knowledgePath.stages) || []).forEach(function(s) {
                (s.history || []).forEach(function(h) {
                    records.push({ evidenceEventId: h.evidenceEventId, serviceMemberId: p.serviceMemberId, stageId: s.id, previousStatus: h.previousStatus, status: h.status, evidence: h.evidence, verifier: h.verifier, at: h.at });
                });
            });
        });
        // Same non-failure "skipped" handling as tasks/handoffs — no stage evidence has been
        // recorded yet on a fresh install, and that's a valid state, not a sync failure.
        if (!records.length) {
            if (!silent) { showToast('error', '❌ No knowledge-path history to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
            return Promise.resolve({ ok:true, skipped:true, error:'NO_RECORDS' });
        }
        var token = ''; try { token = sessionStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var base = ep.url.replace(/\/+$/, '');
        var btn = silent ? null : document.getElementById('btnSyncKnowledgePath');
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        return fetch(base + '/api/knowledge-path/sync', { method:'POST', headers:headers, body: JSON.stringify({ records: records, initiator: initiator }), signal: ctrl.signal })
            .then(function(r) { return r.json().then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); })
            .then(function(res) {
                clearTimeout(tid);
                if (!res.ok) throw new Error((res.data && (res.data.reason || res.data.error)) || ('HTTP ' + res.status));
                ep.lastKnowledgePathSync = { syncedAt: res.data.syncedAt, synced: res.data.synced, submitted: res.data.submitted, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Knowledge path sync → ' + res.data.inserted + ' inserted, ' + res.data.updated + ' updated, ' + res.data.unchanged + ' unchanged');
                saveData(); renderGovernancePage();
                if (!silent) showToast('success', '✅ Synced ' + res.data.synced + '/' + res.data.submitted + ' knowledge-path event(s)');
                return { ok:true, data:res.data };
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                ep.lastKnowledgePathSyncError = { at: new Date().toISOString(), message: msg, initiator: initiator };
                addGovernanceLedger('endpoint', (initiator === 'auto' ? '[auto] ' : '') + 'Knowledge path sync failed: ' + msg);
                saveData(); renderGovernancePage();
                if (!silent) showToast('error', '❌ Knowledge path sync failed: ' + msg);
                return { ok:false, error:msg };
            });
    }

    function runAutoSyncCycle() {
        var as = autoSyncSettings();
        if (!as.enabled) return;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { scheduleNextAutoSync(); return; }
        Promise.all([
            syncRosterToRuntime({ initiator: 'auto', silent: true }),
            syncRollCallsToRuntime({ initiator: 'auto', silent: true }),
            syncChatToRuntime({ initiator: 'auto', silent: true }),
            syncChatCommandsToRuntime({ initiator: 'auto', silent: true }),
            syncTasksToRuntime({ initiator: 'auto', silent: true }),
            syncHandoffsToRuntime({ initiator: 'auto', silent: true }),
            syncKnowledgePathHistoryToRuntime({ initiator: 'auto', silent: true })
        ]).then(function(results) {
            var failed = results.filter(function(r) { return !r.ok; });
            if (failed.length) {
                autoSyncFailureStreak++;
                autoSyncBackoffMs = Math.min(AUTO_SYNC_MAX_BACKOFF_MS, (autoSyncBackoffMs || AUTO_SYNC_BASE_INTERVAL_MS) * 2);
                if (autoSyncFailureStreak >= AUTO_SYNC_MAX_FAILURES) {
                    as.enabled = false;
                    addGovernanceLedger('endpoint', 'Auto-sync disabled automatically after ' + autoSyncFailureStreak + ' consecutive failures');
                    saveData(); renderGovernancePage();
                    showToast('error', '❌ Auto-sync disabled after ' + autoSyncFailureStreak + ' consecutive failures');
                    return;
                }
            } else {
                autoSyncFailureStreak = 0;
                autoSyncBackoffMs = 0;
            }
            saveData(); renderGovernancePage();
            scheduleNextAutoSync();
        });
    }

    function toggleAutoSync(enabled) {
        var as = autoSyncSettings();
        as.enabled = enabled;
        autoSyncFailureStreak = 0;
        autoSyncBackoffMs = 0;
        if (enabled) { addGovernanceLedger('endpoint', 'Auto-sync enabled (' + Math.round(AUTO_SYNC_BASE_INTERVAL_MS/1000) + 's interval)'); }
        else { addGovernanceLedger('endpoint', 'Auto-sync disabled'); stopAutoSync(); as.nextAttemptAt = null; }
        saveData(); renderGovernancePage();
        if (enabled) scheduleNextAutoSync(2000);
    }

    // The Independent Verification requirement is system-managed: it can only be flipped to
    // VERIFIED by a real external verifier response, never by manual self-attestation, so the
    // production gate can't be talked into PASS by typing text into a form.

    function syncIndependentVerificationRequirement(ext, rc) {
        var req = (DATA.governance.requirements || []).find(function (r) { return r.id === 'independent_verification'; });
        if (!req) return;
        req.systemManaged = true;
        if (ext.verified) {
            req.status = 'VERIFIED';
            req.evidence = 'Canary execution ' + rc.lastExecutionId + ' externally verified by ' + (ext.verifierId || 'EXTERNAL_VERIFIER') + ' at ' + ext.verifiedAt;
            req.verifier = ext.verifierId || 'EXTERNAL_VERIFIER';
        } else {
            req.status = 'PENDING';
            req.evidence = 'Last external verification REJECTED for execution ' + rc.lastExecutionId + (ext.reason ? ' — ' + ext.reason : '');
            req.verifier = '';
        }
        req.updatedAt = new Date().toISOString();
    }

