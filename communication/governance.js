'use strict';
// communication/governance.js

    function governanceGateState() {
        // Guard against being called before the global DATA is assigned — this function gets
        // reached indirectly from inside migrateData() (via broadcast-transcript reconciliation
        // for any conversation containing "everyone"/"roll call" text, which every Roll Call
        // transcript seeds), i.e. while `DATA = migrateData(loadData())` is still executing and
        // DATA is still undefined. Without this guard that call chain threw on every reload for
        // any user who had ever run a roll call, crashing init() before anything got wired up.
        if (typeof DATA === 'undefined' || !DATA) {
            return { requirements: [], verified: 0, total: 0, registry: { controlled: 0, issues: [], valid: true, blockers: [], warnings: [] }, complete: false, percent: 0 };
        }
        var reqs = (DATA.governance && DATA.governance.requirements) || [];
        var verified = reqs.filter(function (r) { return r.status === 'VERIFIED'; }).length;
        var registry = auditCanonicalRegistry(DATA.participants || []);
        var complete = registry.valid && reqs.length > 0 && verified === reqs.length;
        return { requirements:reqs, verified:verified, total:reqs.length, registry:registry, complete:complete, percent:reqs.length ? Math.round((verified / reqs.length) * 100) : 0 };
    }

    function reconcileProductionState() {
        var gate = governanceGateState();
        if (typeof DATA === 'undefined' || !DATA || !DATA.governance) return gate;
        DATA.registryAudit = gate.registry;
        DATA.governance.productionState = gate.complete ? 'PRODUCTION_VERIFIED' : 'NOT_RUNTIME_VERIFIED';
        DATA.governance.productionGateDecision = gate.complete ? 'PASS' : 'HOLD';
        DATA.governance.productionReason = gate.complete ? 'ALL_PRODUCTION_GATES_VERIFIED' : 'RUNTIME_EVIDENCE_AND_INDEPENDENT_VERIFICATION_REQUIRED';
        DATA.governance.lifecycle = gate.complete ? 'PRODUCTION_VERIFIED' : 'MISSION_READY';
        DATA.participants.forEach(function (p) {
            if (!p.serviceMemberId) return;
            p.readiness = (gate.complete && hasVerifiedCanaryExecutionFor(p.serviceMemberId)) ? 'PRODUCTION_VERIFIED' : evaluateIndividualReadiness(p);
            p.authorityProfile = evaluateAuthorityProfile(p);
            p.runtimeVerification = evaluateRuntimeVerification(p);
        });
        return gate;
    }

    function addGovernanceLedger(type, text) {
        DATA.governance.ledger = DATA.governance.ledger || [];
        DATA.governance.ledger.unshift({ time:new Date().toISOString(), type:type || 'note', text:text });
        if (DATA.governance.ledger.length > 1000) DATA.governance.ledger = DATA.governance.ledger.slice(0,1000);
    }

    function renderGovernancePage() {
        if (!DATA.governance) return;
        var releaseBadge = document.getElementById('govReleaseBadge');
        if (releaseBadge) releaseBadge.textContent = (String(DATA.governance.release || '').match(/v[\d.]+/) || ['—'])[0];
        var gate = reconcileProductionState();
        var stages = [
            { name:'DESIGN_BASELINE', state:'complete', note:'Canonical design + identity baseline established' },
            { name:'MISSION_READY', state:gate.complete ? 'complete' : 'current', note:gate.complete ? 'Gate satisfied' : 'Current controlled state' },
            { name:'PRODUCTION_VERIFIED', state:gate.complete ? 'complete' : 'locked', note:gate.complete ? 'Verified' : 'Locked until evidence gates pass' }
        ];
        document.getElementById('govLifecycleStrip').innerHTML = stages.map(function (x) { return '<div class="gate-stage '+x.state+'"><div class="stage-name">'+esc(x.name)+'</div><div class="stage-state">'+esc(x.note)+'</div></div>'; }).join('');
        document.getElementById('govProductionBadge').textContent = DATA.governance.productionState;
        document.getElementById('govProductionBadge').className = 'badge ' + (gate.complete ? 'badge-active' : 'badge-inactive');
        document.getElementById('govGateProgress').style.width = gate.percent + '%';
        var reasonText = String(DATA.governance.productionReason || '').replace(/_/g, ' ').toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); });
        document.getElementById('govGateSummary').textContent = gate.verified + ' of ' + gate.total + ' production requirements independently verified · Registry ' + (gate.registry.valid ? 'PASS' : 'FAIL') + (reasonText ? ' · ' + reasonText : '');
        document.getElementById('govGateRequirements').innerHTML = gate.requirements.map(function (r) {
            var cls = r.status === 'VERIFIED' ? 'badge-active' : 'badge-inactive';
            var isSystemManaged = r.id === 'independent_verification' || r.id === 'source_access' || r.id === 'permissions';
            var btnLabel = isSystemManaged ? 'View (System-Managed)' : (r.status === 'VERIFIED' ? 'Review Evidence' : 'Record Evidence');
            return '<div class="gate-item"><div class="gate-head"><div class="gate-name">'+esc(r.name)+(isSystemManaged?' <span class="text-xs text-muted">🔒</span>':'')+'</div><span class="badge '+cls+'">'+esc(r.status)+'</span></div><div class="gate-desc">'+esc(r.description)+'</div><div class="gate-meta">Evidence: '+esc(r.evidence || 'NOT RECORDED')+'<br>Verifier: '+esc(r.verifier || 'NOT RECORDED')+'</div><div class="mt-1"><button class="btn btn-outline btn-sm gov-evidence-edit" data-id="'+esc(r.id)+'">'+btnLabel+'</button></div></div>';
        }).join('');
        $all('.gov-evidence-edit').forEach(function (btn) { btn.addEventListener('click', function () { openGovernanceEvidenceModal(btn.getAttribute('data-id')); }); });
        document.getElementById('govAuditBadge').textContent = gate.registry.valid ? 'PASS' : 'FAIL';
        document.getElementById('govAuditBadge').className = 'badge ' + (gate.registry.valid ? 'badge-active' : 'badge-inactive');
        document.getElementById('govAuditBody').innerHTML = '<div class="kv-row"><span>Controlled identities</span><b>'+gate.registry.controlled+' / '+(DATA.governance.canonicalRosterExpected||66)+'</b></div><div class="kv-row"><span>Integrity result</span><span class="'+(gate.registry.valid?'audit-ok':'audit-bad')+'">'+(gate.registry.valid?'PASS':'FAIL')+'</span></div>' + (gate.registry.issues.length ? '<div class="mt-1 text-xs">'+gate.registry.issues.map(function (x) { return '• '+esc(x); }).join('<br>')+'</div>' : '<div class="mt-1 text-xs text-muted">No missing canonical IDs, duplicate IDs, format violations, or callsign collisions detected.</div>')
            + ((gate.registry.blockers && gate.registry.blockers.length) ? '<div class="mt-1 text-xs"><strong class="audit-bad">Alias/Legacy-ID Blockers ('+gate.registry.blockers.length+')</strong><br>'+gate.registry.blockers.map(function (b) { return '• ['+esc(b.code)+'] '+esc(b.alias)+' — owner '+esc(b.aliasOwner)+(b.conflictingCanonicalOwner?' vs '+esc(b.conflictingCanonicalOwner):''); }).join('<br>')+'</div>' : '')
            + ((gate.registry.warnings && gate.registry.warnings.length) ? '<div class="mt-1 text-xs"><strong class="audit-warn">Alias/Legacy-ID Warnings ('+gate.registry.warnings.length+')</strong><br>'+gate.registry.warnings.map(function (w) { return '• ['+esc(w.code)+'] '+esc(w.alias)+' — owner '+esc(w.aliasOwner); }).join('<br>')+'</div>' : '');
        var types={}; DATA.participants.filter(function(p){return p.serviceMemberId;}).forEach(function(p){types[p.type]=(types[p.type]||0)+1;});
        renderBarList('govIdentityComposition', Object.keys(types).map(function(t){return {label:TYPE_LABELS[t]||t,value:types[t]};}), { colorFn:function(){return 'purple';} });
        document.getElementById('govKpis').innerHTML = [
            ['Canonical Identities',gate.registry.controlled+'/'+(DATA.governance.canonicalRosterExpected||66)],['Integrity Issues',gate.registry.issues.length],['Verified Gates',gate.verified+'/'+gate.total],['Production State',DATA.governance.productionState],['Lifecycle',DATA.governance.lifecycle],['Schema','v'+DATA.schemaVersion]
        ].map(function(k){return '<div class="stat-card"><div class="label">'+esc(k[0])+'</div><div class="value" style="font-size:1.15rem">'+esc(k[1])+'</div></div>';}).join('');
        renderKnowledgePathSummary();
        renderRuntimeCanary();
        renderCanarySweepSummary();
        renderBatchVerificationProgress();
        renderCanaryHistory();
        renderExternalRuntime();
        var ledger=(DATA.governance.ledger||[]).slice(0,30);
        document.getElementById('govLedger').innerHTML = ledger.map(function(x){return '<div class="log-item"><span class="log-time">'+esc(fmtDate(x.time))+'</span><span class="log-event">'+esc(x.text)+'</span><span class="log-status info">'+esc(x.type)+'</span></div>';}).join('') || '<div class="text-muted text-sm">No governance ledger entries.</div>';
    }

    // Not a per-identity failing-list (unlike renderCanarySweepSummary, which lists failing
    // identities because sweeps normally mostly pass) — the knowledge-path registry starts 100%
    // empty for all 66 identities on day one, so a per-identity list would be 66 near-identical
    // lines and stay low-value even at partial adoption. A fixed 10-row stage breakdown answers
    // "which stage is the bottleneck" without that.
    function renderKnowledgePathSummary() {
        var badge = document.getElementById('kpRegistryBadge');
        if (!badge) return;
        var state = knowledgePathRegistryState();
        badge.textContent = state.complete + '/' + state.total + ' complete';
        badge.className = 'badge ' + (state.total && state.complete === state.total ? 'badge-active' : 'badge-inactive');
        document.getElementById('kpRegistryProgress').style.width = state.percent + '%';
        var pilotTickets = ((DATA.helpDesk && DATA.helpDesk.tickets) || []).filter(function (t) { return t.sourceKey && t.sourceKey.indexOf('KP-PILOT:') === 0; });
        document.getElementById('kpRegistrySummary').innerHTML = '<b class="' + (state.total && state.complete === state.total ? 'audit-ok' : 'audit-bad') + '">' + state.complete + ' / ' + state.total + '</b> identities complete · <b>' + state.verifiedStages + '/' + state.totalStages + '</b> stages verified · <b>' + state.eligible + '/' + state.total + '</b> mission eligible · <b>' + pilotTickets.length + '/2</b> pilot tickets';
        renderBarList('kpStageBreakdown', state.stageBreakdown.map(function (s) { return { label: s.name, value: s.verified, display: s.verified + '/' + state.total }; }), { colorFn: function () { return 'purple'; } });
    }

    function knowledgePathNextStage(p) {
        var stages = (p.knowledgePath && p.knowledgePath.stages) || [];
        return stages.find(function (s) { return s.status !== 'VERIFIED'; }) || null;
    }

    function openKnowledgePathRegistry() {
        var controlled = DATA.participants.filter(function (p) { return !!p.serviceMemberId; }).sort(function (a, b) { return String(a.callsign).localeCompare(String(b.callsign)); });
        var state = knowledgePathRegistryState();
        var rows = controlled.map(function (p) {
            var ps = evaluateKnowledgePathState(p), next = knowledgePathNextStage(p), eligible = evaluateMissionEligibilityStage(p).allowed;
            return '<tr><td><b>' + esc(p.callsign) + '</b><div class="text-xs text-muted">' + esc(p.serviceMemberId) + '</div></td><td class="text-sm">' + esc(p.dept || '—') + '</td><td>' + ps.verified + '/' + ps.total + ' · ' + ps.percent + '%</td><td class="text-sm">' + esc(next ? next.name : 'COMPLETE') + '</td><td><span class="badge ' + (eligible ? 'badge-active' : 'badge-inactive') + '">' + (eligible ? 'ELIGIBLE' : 'PENDING') + '</span></td><td><button class="btn btn-outline btn-sm kp-reg-open" data-pid="' + esc(p.id) + '">Review</button></td></tr>';
        }).join('');
        var body = '<div class="stats-grid"><div class="stat-card"><div class="label">Identities</div><div class="value">' + state.total + '</div></div><div class="stat-card"><div class="label">Complete</div><div class="value">' + state.complete + '</div></div><div class="stat-card"><div class="label">Verified Stages</div><div class="value">' + state.verifiedStages + '/' + state.totalStages + '</div></div><div class="stat-card"><div class="label">Mission Eligible</div><div class="value">' + state.eligible + '</div></div></div><div class="table-wrap mt-2" style="max-height:55vh;overflow:auto"><table><thead><tr><th>Identity</th><th>Department</th><th>Progress</th><th>Next Required Stage</th><th>Mission Eligibility</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="text-xs text-muted mt-1">PENDING is the truthful default. Only recorded evidence plus a named verifier can advance a manual stage; Mission Eligibility is computed from its eight prerequisites.</p>';
        openModal('Knowledge Path Registry — 66 Controlled Identities', body, '<button class="btn btn-outline" id="kpRegClose">Close</button>');
        document.getElementById('kpRegClose').addEventListener('click', closeModal);
        $all('.kp-reg-open').forEach(function (btn) { btn.addEventListener('click', function () { var pid = btn.getAttribute('data-pid'); closeModal(); openParticipantDetail(pid); }); });
    }

    function exportKnowledgePathRegistryCsv() {
        var rows = knowledgePathRegistryRows(DATA.participants);
        var audit = validateKnowledgePathRegistryExport(DATA.participants, rows);
        if (!audit.ok) { addLog('Knowledge Path Registry export blocked — ' + audit.rows + '/' + audit.expected + ' rows · ' + audit.controlled + ' controlled identities', 'error', { correlationId: canaryId('KP-EXPORT-BLOCKED'), risk: 'DATA_INTEGRITY' }); showToast('error', '❌ Export blocked: expected 660 stage records, found ' + audit.rows); return { ok: false, audit: audit }; }
        downloadCSV('carc_knowledge_path_registry_' + new Date().toISOString().slice(0, 10) + '.csv', toCSV(rows, [
            { label: 'Service Member ID', get: function (r) { return r.serviceMemberId; } }, { label: 'Callsign', get: function (r) { return r.callsign; } }, { label: 'Name', get: function (r) { return r.name; } }, { label: 'Department', get: function (r) { return r.department; } }, { label: 'Stage ID', get: function (r) { return r.stageId; } }, { label: 'Stage', get: function (r) { return r.stage; } }, { label: 'Status', get: function (r) { return r.status; } }, { label: 'Evidence', get: function (r) { return r.evidence; } }, { label: 'Verifier', get: function (r) { return r.verifier; } }, { label: 'Updated At', get: function (r) { return r.updatedAt; } }, { label: 'History Events', get: function (r) { return r.historyEvents; } }
        ]));
        addLog('Knowledge Path Registry exported — ' + rows.length + ' stage records', 'success', { correlationId: canaryId('KP-EXPORT'), risk: 'NORMAL' });
        showToast('success', '⬇️ Exported ' + rows.length + ' knowledge-path stage records');
        return { ok: true, audit: audit };
    }

    function openGovernanceEvidenceModal(id) {
        var req = (DATA.governance.requirements || []).find(function(r){return r.id===id;}); if(!req) return;
        if (req.id === 'independent_verification' || req.id === 'source_access' || req.id === 'permissions') {
            var controlHelp = req.id === 'independent_verification'
                ? 'Run Canary → configure an External Runtime Endpoint → Submit for Verification.'
                : (req.id === 'source_access' ? 'External Runtime Endpoint → Register Source → Refresh Controls.' : 'External Runtime Endpoint → Refresh Controls (runs a scoped allow/deny evidence check).');
            var body = '<div class="form-group"><label>Requirement</label><input id="geReqName" name="reqName" value="'+esc(req.name)+'" disabled></div>' +
                '<p class="text-sm">This requirement is <b>system-managed</b> — it cannot be self-attested. Its state is derived from retained runtime control evidence.</p>' +
                '<div class="kv-row"><span>Current Status</span><span class="badge '+(req.status==='VERIFIED'?'badge-active':'badge-inactive')+'">'+esc(req.status)+'</span></div>' +
                (req.evidence ? '<div class="kv-row"><span>Evidence</span><span class="text-xs">'+esc(req.evidence)+'</span></div>' : '') +
                (req.verifier ? '<div class="kv-row"><span>Verifier</span><b>'+esc(req.verifier)+'</b></div>' : '') +
                '<p class="text-xs text-muted mt-2">To change this: '+esc(controlHelp)+'</p>';
            openModal('Production Evidence — '+req.name, body, '<button class="btn btn-outline" id="geCancel">Close</button>');
            document.getElementById('geCancel').addEventListener('click', closeModal);
            return;
        }
        var body='<div class="form-group"><label>Requirement</label><input id="geReqName" name="reqName" value="'+esc(req.name)+'" disabled></div><div class="form-group"><label>Evidence Reference</label><textarea id="geEvidence" rows="4" placeholder="Source record ID, telemetry reference, audit artifact, approval ID…">'+esc(req.evidence||'')+'</textarea></div><div class="form-group"><label>Independent Verifier</label><input id="geVerifier" value="'+esc(req.verifier||'')+'" placeholder="e.g. HELIX / TANGO / reviewer ID"></div><div class="form-group"><label>Status</label><select id="geStatus"><option value="PENDING">PENDING</option><option value="VERIFIED">VERIFIED</option></select></div><div class="text-xs text-muted">VERIFIED requires both an evidence reference and an independent verifier. CARC will not accept a bare status flip.</div>';
        var footer='<button class="btn btn-outline" id="geCancel">Cancel</button><button class="btn btn-primary" id="geSave">Save Evidence</button>';
        openModal('Production Evidence — '+req.name,body,footer); document.getElementById('geStatus').value=req.status;
        document.getElementById('geCancel').addEventListener('click',closeModal);
        document.getElementById('geSave').addEventListener('click',function(){var ev=document.getElementById('geEvidence').value.trim(), vr=document.getElementById('geVerifier').value.trim(), st=document.getElementById('geStatus').value; if(st==='VERIFIED' && (!ev || !vr)){showToast('error','❌ VERIFIED requires evidence and an independent verifier');return;} req.evidence=ev; req.verifier=vr; req.status=st; req.updatedAt=new Date().toISOString(); addGovernanceLedger('evidence',req.name+' → '+st+(vr?' · verifier '+vr:'')); reconcileProductionState(); saveData(); renderAll(); renderGovernancePage(); closeModal(); showToast('success','✅ Governance evidence saved');});
    }

    function openGovernanceNoteModal() {
        var body='<div class="form-group"><label>Evidence / Change Note</label><textarea id="gnText" rows="5" placeholder="Record a controlled change, source reference, decision, exception, or verification note."></textarea></div>';
        openModal('Add Governance Ledger Note',body,'<button class="btn btn-outline" id="gnCancel">Cancel</button><button class="btn btn-primary" id="gnSave">Add Note</button>');
        document.getElementById('gnCancel').addEventListener('click',closeModal); document.getElementById('gnSave').addEventListener('click',function(){var t=document.getElementById('gnText').value.trim(); if(!t){showToast('error','❌ Enter a note');return;} addGovernanceLedger('note',t); saveData(); renderGovernancePage(); closeModal(); showToast('success','✅ Governance note added');});
    }

    function exportGovernanceEvidence() {
        var gate=reconcileProductionState(), lines=['CARC Governance Evidence Export','Generated,'+new Date().toISOString(),'Release,'+csvEscape(DATA.governance.release),'Lifecycle,'+DATA.governance.lifecycle,'Production State,'+DATA.governance.productionState,'Registry Integrity,'+(gate.registry.valid?'PASS':'FAIL'),'','Requirement,Status,Evidence,Verifier,Updated'];
        gate.requirements.forEach(function(r){lines.push([r.name,r.status,r.evidence||'',r.verifier||'',r.updatedAt||''].map(csvEscape).join(','));}); lines.push('','Ledger Time,Type,Entry'); (DATA.governance.ledger||[]).forEach(function(x){lines.push([x.time,x.type,x.text].map(csvEscape).join(','));}); downloadCSV('carc_governance_evidence_'+new Date().toISOString().slice(0,10)+'.csv',lines.join('\n')); showToast('success','⬇️ Governance evidence exported');
    }

    function wireGovernancePage() {
        document.getElementById('btnGovAudit').addEventListener('click',function(){var a=auditCanonicalRegistry(DATA.participants); DATA.registryAudit=a; addGovernanceLedger('audit','Canonical registry audit → '+(a.valid?'PASS':'FAIL')+' ('+a.issues.length+' issues)'); saveData(); renderGovernancePage(); showToast(a.valid?'success':'error',(a.valid?'✅':'❌')+' Registry audit '+(a.valid?'passed':'failed'));});
        document.getElementById('btnGovExport').addEventListener('click',exportGovernanceEvidence);
        document.getElementById('btnGovAddNote').addEventListener('click',openGovernanceNoteModal);
        document.getElementById('btnOpenKnowledgeRegistry').addEventListener('click',openKnowledgePathRegistry);
        document.getElementById('btnExportKnowledgeRegistry').addEventListener('click',exportKnowledgePathRegistryCsv);
        document.getElementById('btnBuildKnowledgePilot').addEventListener('click',createKnowledgePathPilotTickets);
        document.getElementById('btnRunCanary').addEventListener('click',runRuntimeCanary);
        document.getElementById('btnRunSweep').addEventListener('click',runRegistrySweep);
        document.getElementById('btnSubmitAllIndividuals').addEventListener('click',runAndSubmitAllIndividualCanaries);
        document.getElementById('btnExportCanary').addEventListener('click',exportRuntimeCanary);
        document.getElementById('btnExportCanaryCsv').addEventListener('click',exportRuntimeCanaryCsv);
        $all('th.sortable', document.getElementById('page-governance')).forEach(function (th) {
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'button');
            function toggleSort() {
                var key = th.getAttribute('data-key');
                if (canaryHistoryState.sortKey === key) canaryHistoryState.sortDir = canaryHistoryState.sortDir === 'asc' ? 'desc' : 'asc';
                else { canaryHistoryState.sortKey = key; canaryHistoryState.sortDir = 'asc'; }
                renderCanaryHistory();
            }
            th.addEventListener('click', toggleSort);
            th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(); } });
        });
    }

    // ================================================================
    // ANALYTICS PAGE
    // ================================================================
