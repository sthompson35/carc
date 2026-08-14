'use strict';
// communication/runtime-sync.js

    function runRuntimeCanary() {
        var rc = DATA.runtimeCanary = DATA.runtimeCanary || {};
        var targetId = (document.getElementById('canaryTarget') || {}).value || rc.targetServiceMemberId || 'ATA-VEX-000';
        rc.targetServiceMemberId = targetId;
        var p = DATA.participants.find(function(x){ return x.serviceMemberId === targetId; });
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
        rc.telemetry = telemetry.concat(rc.telemetry || []).slice(0,100);
        rc.evidence = [evidence].concat(rc.evidence || []).slice(0,50);
        rc.executions = [{
            executionId:executionId, missionId:missionId, evidenceId:evidenceId,
            targetServiceMemberId:targetId, startedAt:started, result:result,
            runtimeVerified:false, independentVerification:'PENDING'
        }].concat(rc.executions || []).slice(0,50);

        addGovernanceLedger('canary', (p ? p.callsign : targetId) + ' canary → ' + result + ' · ' + executionId + ' · NOT_RUNTIME_VERIFIED');
        saveData();
        renderGovernancePage();
        showToast(auth.allowed ? 'success' : 'error', auth.allowed ? '✅ Local canary complete — external runtime verification still required' : '❌ Canary blocked: '+auth.reason);
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
        var target = DATA.participants.find(function(p){ return p.serviceMemberId === rc.targetServiceMemberId; });
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
            var rsErr = ep.lastRosterSyncError;
            var rcsErr = ep.lastRollCallSyncError;
            var csErr = ep.lastChatSyncError;
            var cmdsErr = ep.lastCommandSyncError;
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
            var stateCls = { CURRENT: 'audit-ok', SUCCESS: 'audit-ok', STALE: 'audit-warn', ERROR: 'audit-bad', UNSYNCED: '' };
            var combinedLastResult = (rosterTrust.lastResult === 'ERROR' || rcTrust.lastResult === 'ERROR' || chatTrust.lastResult === 'ERROR' || cmdTrust.lastResult === 'ERROR') ? 'ERROR'
                : (rosterTrust.lastResult === 'SUCCESS' || rcTrust.lastResult === 'SUCCESS' || chatTrust.lastResult === 'SUCCESS' || cmdTrust.lastResult === 'SUCCESS') ? 'SUCCESS' : '—';
            epEl.innerHTML =
                '<div class="kv-row"><span>Endpoint URL</span><b class="text-xs truncate" style="max-width:220px;display:block;">'+esc(ep.url||'—')+'</b></div>'+
                '<div class="kv-row"><span>Bearer Token</span><b>'+(ep.tokenSet?'•••• configured':'NOT SET')+'</b></div>'+
                '<div class="kv-row"><span>Status</span><span class="'+statusCls+'">'+statusTxt+(ep.lastTestAt?' · '+esc(fmtDate(ep.lastTestAt)):'')+'</span></div>'+
                (rs ? '<div class="kv-row"><span>Roster Sync</span><span class="text-xs">'+esc(rs.synced)+'/'+esc(rs.submitted)+(rs.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(rs.syncedAt))+'</span></div>' : '')+
                (rcs ? '<div class="kv-row"><span>Roll Call Sync</span><span class="text-xs">'+esc(rcs.synced)+'/'+esc(rcs.submitted)+(rcs.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(rcs.syncedAt))+'</span></div>' : '')+
                (cs ? '<div class="kv-row"><span>Chat Sync</span><span class="text-xs">'+esc(cs.synced)+'/'+esc(cs.submitted)+(cs.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(cs.syncedAt))+'</span></div>' : '')+
                (cmds ? '<div class="kv-row"><span>Command Sync</span><span class="text-xs">'+esc(cmds.synced)+'/'+esc(cmds.submitted)+(cmds.initiator==='auto'?' [auto]':'')+' · '+esc(fmtDate(cmds.syncedAt))+'</span></div>' : '')+
                '<div class="kv-row"><span>Roster state</span><span class="'+(stateCls[rosterTrust.state]||'')+'">'+rosterTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Roll-call state</span><span class="'+(stateCls[rcTrust.state]||'')+'">'+rcTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Chat state</span><span class="'+(stateCls[chatTrust.state]||'')+'">'+chatTrust.state+'</span></div>'+
                '<div class="kv-row"><span>Command state</span><span class="'+(stateCls[cmdTrust.state]||'')+'">'+cmdTrust.state+'</span></div>'+
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
                    (configured && (ep.url.startsWith('http://')||ep.url.startsWith('https://')) ? '<a href="'+esc(ep.url)+'/admin" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">🌐 Open Admin</a>' : '')+
                '</div>'+
                '<div class="text-xs text-muted mt-1">Bearer token is stored in browser localStorage only — never included in evidence exports. Auto-sync mutates runtime state on a timer once enabled — off by default.</div>';
            document.getElementById('btnConfigEndpoint').addEventListener('click', openEndpointConfigModal);
            if (configured) document.getElementById('btnTestEndpoint').addEventListener('click', testEndpointConnection);
            if (canSubmit) document.getElementById('btnSubmitVerification').addEventListener('click', submitForExternalVerification);
            if (configured) document.getElementById('btnSyncRoster').addEventListener('click', function(){ syncRosterToRuntime(); });
            if (configured) document.getElementById('btnSyncRollCalls').addEventListener('click', function(){ syncRollCallsToRuntime(); });
            if (configured) document.getElementById('btnSyncChat').addEventListener('click', function(){ syncChatToRuntime(); });
            if (configured) document.getElementById('btnSyncCommands').addEventListener('click', function(){ syncChatCommandsToRuntime(); });
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
        var storedToken = ''; try { storedToken = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
        var body =
            '<div class="form-group"><label>Runtime Endpoint URL</label><input id="epUrl" value="'+esc(ep.url||'')+'" placeholder="https://runtime.example.com/verify"></div>'+
            '<div class="form-group"><label>Bearer Token</label><input type="password" id="epToken" value="'+esc(storedToken)+'" placeholder="Enter bearer token (leave blank to clear)"></div>'+
            '<div class="text-xs text-muted">URL and token are stored in <code>localStorage</code> only. The token is never included in any evidence export.</div>';
        openModal('Configure External Runtime Endpoint', body, '<button class="btn btn-outline" id="epCancel">Cancel</button><button class="btn btn-primary" id="epSave">Save</button>');
        document.getElementById('epCancel').addEventListener('click', closeModal);
        document.getElementById('epSave').addEventListener('click', function() {
            var url = document.getElementById('epUrl').value.trim();
            var token = document.getElementById('epToken').value.trim();
            if (url) { try { new URL(url); } catch(e) { showToast('error','❌ Invalid URL'); return; } }
            DATA.governance.endpoint = DATA.governance.endpoint || {};
            DATA.governance.endpoint.url = url;
            DATA.governance.endpoint.tokenSet = !!token;
            if (token) { try { localStorage.setItem('carc_endpoint_token', token); } catch(e) {} }
            else { try { localStorage.removeItem('carc_endpoint_token'); } catch(e) {} }
            addGovernanceLedger('endpoint', 'Runtime endpoint ' + (url ? 'configured: ' + url : 'cleared'));
            saveData(); renderGovernancePage(); closeModal();
            showToast('success', '✅ Endpoint configuration saved');
        });
    }


    function testEndpointConnection() {
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { showToast('error', '❌ No endpoint URL configured'); return; }
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
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


    function submitForExternalVerification() {
        var rc = DATA.runtimeCanary || {};
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { showToast('error', '❌ No endpoint URL configured'); return; }
        if (!rc.lastExecutionId) { showToast('error', '❌ No canary execution to verify'); return; }
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
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
        rc.telemetry = [{ time:submittedAt, event:'EXTERNAL_VERIFICATION_SUBMITTED', executionId:rc.lastExecutionId, detail:ep.url }].concat(rc.telemetry || []).slice(0,100);
        var ctrl = new AbortController();
        var tid = setTimeout(function(){ ctrl.abort(); }, 15000);
        fetch(ep.url, { method:'POST', headers:headers, body:JSON.stringify(body), signal:ctrl.signal })
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
                }
                rc.telemetry = [{ time:new Date().toISOString(), event:verified?'EXTERNAL_VERIFICATION_PASS':'EXTERNAL_VERIFICATION_FAIL', executionId:rc.lastExecutionId, detail:'verifier: '+(vr.verifierId||'?')+(vr.reason?' · '+vr.reason:'') }].concat(rc.telemetry||[]).slice(0,100);
                addGovernanceLedger('verification', rc.targetServiceMemberId+' external verification → '+(verified?'RUNTIME_VERIFIED':'REJECTED')+' · verifier: '+(vr.verifierId||'?'));
                syncIndependentVerificationRequirement(ext, rc);
                if (verified) reconcileProductionState();
                saveData(); renderGovernancePage();
                showToast(verified?'success':'error', verified?'✅ RUNTIME_VERIFIED — canary evidence accepted by external verifier':'❌ Verification REJECTED: '+(vr.reason||'no reason provided'));
            })
            .catch(function(err) {
                clearTimeout(tid);
                var msg = (err && err.name === 'AbortError') ? 'timeout after 15s' : (err.message || 'network error');
                rc.telemetry = [{ time:new Date().toISOString(), event:'EXTERNAL_VERIFICATION_ERROR', executionId:rc.lastExecutionId, detail:msg }].concat(rc.telemetry||[]).slice(0,100);
                addGovernanceLedger('verification', 'External verification request failed: '+msg);
                saveData(); renderGovernancePage();
                showToast('error', '❌ Verification request failed: '+msg);
            });
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
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
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
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
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
            return { id: e.correlationId, event: e.event, status: e.status, risk: e.risk || 'NORMAL', contentHash: e.contentHash, occurredAt: e.at };
        });
        // Unlike roster/roll-calls/chat, which always have seeded data, the command-audit trail
        // starts genuinely empty until a chat command is issued — an idle install could have zero
        // entries for a long time. That's not a real failure, so it must not count toward the
        // auto-sync failure streak (which would otherwise silently disable auto-sync entirely
        // after 5 idle cycles even though roster/roll-calls/chat sync is working fine).
        if (!records.length) {
            if (!silent) { showToast('error', '❌ No command-audit events to sync'); return Promise.resolve({ ok:false, error:'NO_RECORDS' }); }
            return Promise.resolve({ ok:true, skipped:true, error:'NO_RECORDS' });
        }
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
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
        var token = ''; try { token = localStorage.getItem('carc_endpoint_token') || ''; } catch(e) {}
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

    function runAutoSyncCycle() {
        var as = autoSyncSettings();
        if (!as.enabled) return;
        var ep = (DATA.governance && DATA.governance.endpoint) || {};
        if (!ep.url) { scheduleNextAutoSync(); return; }
        Promise.all([
            syncRosterToRuntime({ initiator: 'auto', silent: true }),
            syncRollCallsToRuntime({ initiator: 'auto', silent: true }),
            syncChatToRuntime({ initiator: 'auto', silent: true }),
            syncChatCommandsToRuntime({ initiator: 'auto', silent: true })
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

