'use strict';
// app/pages/helpdesk.js

var helpDeskState = { search:'', status:'', priority:'', category:'' };

var HELP_DESK_SLA_HOURS = Object.freeze({ CRITICAL:4, HIGH:8, MEDIUM:24, LOW:72 });
var HELP_DESK_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
var HELP_DESK_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
var HELP_DESK_CATEGORIES = ['ACCESS', 'RUNTIME', 'DATA', 'WORKFLOW', 'PERSONA', 'GENERAL'];

function helpDeskDueAt(priority, createdAt) {
    var hours = HELP_DESK_SLA_HOURS[priority] || HELP_DESK_SLA_HOURS.MEDIUM;
    return new Date(new Date(createdAt).getTime() + hours * 3600000).toISOString();
}

function helpDeskNextId(tickets) {
    var max = (tickets || []).reduce(function (n, t) {
        var m = String(t.id || '').match(/^HD-(\d+)$/); return m ? Math.max(n, parseInt(m[1], 10)) : n;
    }, 0);
    return 'HD-' + String(max + 1).padStart(4, '0');
}

function helpDeskSlaState(ticket, now) {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return 'COMPLETE';
    var remaining = new Date(ticket.dueAt).getTime() - new Date(now || Date.now()).getTime();
    if (remaining < 0) return 'BREACHED';
    if (remaining <= 2 * 3600000) return 'AT_RISK';
    return 'ON_TRACK';
}

function helpDeskOwnerFor(category, priority) {
    return category === 'RUNTIME' || category === 'DATA' || priority === 'CRITICAL' ? '@VICTOR' : '@CINDY';
}

function helpDeskCreateTicket(input, tickets, now) {
    var createdAt = new Date(now || Date.now()).toISOString();
    var priority = HELP_DESK_PRIORITIES.indexOf(input.priority) !== -1 ? input.priority : 'MEDIUM';
    var category = HELP_DESK_CATEGORIES.indexOf(input.category) !== -1 ? input.category : 'GENERAL';
    var owner = input.assignee || helpDeskOwnerFor(category, priority);
    return {
        id: helpDeskNextId(tickets), subject:String(input.subject || '').trim(), description:String(input.description || '').trim(),
        requester:String(input.requester || 'Shylow Thompson').trim(), category:category, priority:priority,
        status:'OPEN', assignee:owner, createdAt:createdAt, updatedAt:createdAt,
        dueAt:helpDeskDueAt(priority, createdAt), resolvedAt:null,
        sourceKey:input.sourceKey || null,
        toolInventory:input.toolInventory || null,
        history:[{ at:createdAt, actor:String(input.requester || 'Shylow Thompson').trim(), action:'TICKET_CREATED', from:null, to:'OPEN', note:'Assigned to ' + owner }]
    };
}

function helpDeskToolRegistry(participants) {
    var byName = {};
    var assignments = 0;
    (participants || []).forEach(function (p) {
        var tools = p.memberProfile && p.memberProfile.toolProfile && p.memberProfile.toolProfile.assignedTools || [];
        tools.forEach(function (tool) {
            var key = String(tool).trim().toLowerCase();
            if (!key) return;
            if (!byName[key]) byName[key] = { name:String(tool).trim(), owners:[] };
            if (byName[key].owners.indexOf(p.callsign) === -1) byName[key].owners.push(p.callsign);
            assignments++;
        });
    });
    return { tools:Object.keys(byName).map(function(k){return byName[k];}).sort(function(a,b){return a.name.localeCompare(b.name);}), uniqueTools:Object.keys(byName).length, assignments:assignments };
}

function buildToolReadinessTickets(participants, tickets, now) {
    var created = [], skipped = [];
    (participants || []).filter(function(p){return p.serviceMemberId && p.callsign;}).forEach(function (p) {
        var tools = p.memberProfile && p.memberProfile.toolProfile && p.memberProfile.toolProfile.assignedTools || [];
        var sourceKey = 'TOOL-READINESS:' + p.serviceMemberId;
        if ((tickets || []).some(function(t){return t.sourceKey === sourceKey;})) { skipped.push(p.callsign); return; }
        var description = 'Validate the complete assigned-tool profile for ' + p.callsign + '.\n\nAssigned tools (' + tools.length + '):\n- ' + (tools.length ? tools.join('\n- ') : 'NO TOOLS RECORDED — profile review required') +
            '\n\nAcceptance criteria for every tool:\n1. Canonical purpose and approved use documented.\n2. Connection or availability confirmed.\n3. Least-privilege authorization verified.\n4. Governed source and data boundaries recorded.\n5. Role-specific operation tested, including one negative test.\n6. Evidence, timestamp, result, blocker, and remediation owner retained.\n7. @TANGO quality review and @HELIX independent verification completed.\n\nTool assignment alone does not imply connection, authorization, competency, or production readiness.';
        var ticket = helpDeskCreateTicket({ subject:p.callsign + ' · Tool Readiness & Access', description:description, requester:'CARC Tool Registry', category:'ACCESS', priority:'MEDIUM', assignee:p.callsign, sourceKey:sourceKey, toolInventory:{ serviceMemberId:p.serviceMemberId, callsign:p.callsign, assignedTools:tools.slice(), total:tools.length, status:'REVIEW_REQUIRED' } }, tickets.concat(created), now);
        created.push(ticket);
    });
    return { created:created, skipped:skipped };
}

var KNOWLEDGE_PATH_PILOT = Object.freeze([
    { serviceMemberId:'ATA-CINDY-000', callsign:'@CINDY', reviewer:'@HELIX' },
    { serviceMemberId:'ATA-VICTOR-000', callsign:'@VICTOR', reviewer:'@HELIX' }
]);

function buildKnowledgePathPilotTickets(participants, tickets, now) {
    var created=[],skipped=[],errors=[];
    KNOWLEDGE_PATH_PILOT.forEach(function(spec){
        var p=(participants||[]).find(function(x){return x.serviceMemberId===spec.serviceMemberId&&x.callsign===spec.callsign;});
        if(!p){errors.push(spec.callsign+':IDENTITY_NOT_FOUND');return;}
        var sourceKey='KP-PILOT:'+spec.serviceMemberId+':competencies';
        if((tickets||[]).concat(created).some(function(t){return t.sourceKey===sourceKey;})){skipped.push(spec.callsign);return;}
        var description='Controlled Knowledge Path pilot for '+spec.callsign+' — Competency Baseline only. This ticket authorizes evidence collection; it does not verify or complete the stage.\n\nRequired evidence package:\n1. Competency standard/version and authoritative source reference.\n2. Audience and role/mission mapping.\n3. Training or learning method used.\n4. Completion artifact and completion timestamp.\n5. Knowledge verification or assessment result where required.\n6. Exceptions, blockers, and corrective owner.\n7. Evidence reference entered in CARC with a named verifier.\n8. Independent review by '+spec.reviewer+'.\n\nExit rule: the Competency Baseline remains PENDING until genuine evidence and a named verifier are recorded in the identity Knowledge Path. Ticket resolution alone never changes stage status.';
        var ticket=helpDeskCreateTicket({subject:spec.callsign+' · Knowledge Path Pilot — Competency Baseline',description:description,requester:'CARC Knowledge Path Registry',category:'WORKFLOW',priority:'HIGH',assignee:spec.callsign,sourceKey:sourceKey},(tickets||[]).concat(created),now);
        ticket.knowledgePathPilot={serviceMemberId:spec.serviceMemberId,callsign:spec.callsign,stageId:'competencies',reviewer:spec.reviewer,state:'EVIDENCE_REQUIRED'};
        created.push(ticket);
    });
    return {created:created,skipped:skipped,errors:errors};
}

function helpDeskTransition(ticket, status, actor, note, now) {
    if (HELP_DESK_STATUSES.indexOf(status) === -1) return { ok:false, error:'INVALID_STATUS' };
    var previous = ticket.status;
    var at = new Date(now || Date.now()).toISOString();
    ticket.status = status; ticket.updatedAt = at;
    if (status === 'RESOLVED' || status === 'CLOSED') ticket.resolvedAt = ticket.resolvedAt || at;
    if (status === 'OPEN' || status === 'IN_PROGRESS') ticket.resolvedAt = null;
    ticket.history = ticket.history || [];
    ticket.history.push({ at:at, actor:actor || 'CARC Operator', action:'STATUS_CHANGED', from:previous, to:status, note:String(note || '') });
    return { ok:true, ticket:ticket };
}

var PILOT_EVIDENCE_FIELDS=['standardVersion','sourceReference','audienceRole','trainingMethod','completionArtifact','completedAt','assessmentResult','exceptions','evidenceReference'];

function submitKnowledgePathPilotEvidence(ticket,input,now){
    if(!ticket||!ticket.knowledgePathPilot)return {ok:false,error:'NOT_PILOT_TICKET'};
    if(['EVIDENCE_REQUIRED','CORRECTION_REQUIRED'].indexOf(ticket.knowledgePathPilot.state)===-1)return {ok:false,error:'INVALID_PILOT_STATE'};
    input=input||{};var missing=PILOT_EVIDENCE_FIELDS.filter(function(k){return !String(input[k]||'').trim();});
    if(missing.length)return {ok:false,error:'MISSING_REQUIRED_EVIDENCE',missing:missing};
    var at=new Date(now||Date.now()).toISOString();
    ticket.knowledgePathPilot.evidenceSubmission={};PILOT_EVIDENCE_FIELDS.forEach(function(k){ticket.knowledgePathPilot.evidenceSubmission[k]=String(input[k]).trim();});
    ticket.knowledgePathPilot.evidenceSubmission.submittedBy=String(input.submittedBy||ticket.knowledgePathPilot.callsign).trim();ticket.knowledgePathPilot.evidenceSubmission.submittedAt=at;
    ticket.knowledgePathPilot.state='REVIEW_REQUIRED';ticket.status='WAITING';ticket.assignee=ticket.knowledgePathPilot.reviewer;ticket.updatedAt=at;
    ticket.history.push({at:at,actor:ticket.knowledgePathPilot.evidenceSubmission.submittedBy,action:'EVIDENCE_SUBMITTED',from:'EVIDENCE_REQUIRED',to:'REVIEW_REQUIRED',note:'Structured Competency Baseline evidence submitted for independent review'});
    return {ok:true,ticket:ticket};
}

function reviewKnowledgePathPilotEvidence(ticket,decision,reviewer,note,participant,now){
    if(!ticket||!ticket.knowledgePathPilot)return {ok:false,error:'NOT_PILOT_TICKET'};
    if(ticket.knowledgePathPilot.state!=='REVIEW_REQUIRED')return {ok:false,error:'INVALID_PILOT_STATE'};
    if(reviewer!==ticket.knowledgePathPilot.reviewer)return {ok:false,error:'REVIEWER_MISMATCH'};
    if(['APPROVE','REJECT'].indexOf(decision)===-1)return {ok:false,error:'INVALID_DECISION'};
    if(!String(note||'').trim())return {ok:false,error:'REVIEW_NOTE_REQUIRED'};
    var at=new Date(now||Date.now()).toISOString(),submission=ticket.knowledgePathPilot.evidenceSubmission;
    if(decision==='REJECT'){
        ticket.knowledgePathPilot.state='CORRECTION_REQUIRED';ticket.status='IN_PROGRESS';ticket.assignee=ticket.knowledgePathPilot.callsign;ticket.updatedAt=at;
        ticket.history.push({at:at,actor:reviewer,action:'EVIDENCE_REJECTED',from:'REVIEW_REQUIRED',to:'CORRECTION_REQUIRED',note:String(note)});
        return {ok:true,verified:false,ticket:ticket};
    }
    var evidence='Standard '+submission.standardVersion+' · Source '+submission.sourceReference+' · Completion '+submission.completionArtifact+' · Assessment '+submission.assessmentResult+' · Evidence '+submission.evidenceReference;
    var recorded=recordKnowledgePathStageEvidence(participant,ticket.knowledgePathPilot.stageId,{status:'VERIFIED',evidence:evidence,verifier:reviewer,updatedAt:at,evidenceEventId:'KP-REVIEW-'+ticket.id});
    if(!recorded.ok)return recorded;
    ticket.knowledgePathPilot.state='VERIFIED';ticket.knowledgePathPilot.review={decision:decision,reviewer:reviewer,note:String(note),reviewedAt:at};ticket.status='RESOLVED';ticket.resolvedAt=at;ticket.updatedAt=at;
    ticket.history.push({at:at,actor:reviewer,action:'EVIDENCE_APPROVED',from:'REVIEW_REQUIRED',to:'VERIFIED',note:String(note)});
    return {ok:true,verified:true,ticket:ticket,stage:recorded.stage};
}

function helpDeskBadge(value) {
    var cls = value === 'CRITICAL' || value === 'BREACHED' ? 'badge-danger' : value === 'HIGH' || value === 'AT_RISK' || value === 'WAITING' ? 'badge-warning' : value === 'RESOLVED' || value === 'CLOSED' || value === 'COMPLETE' || value === 'ON_TRACK' ? 'badge-success' : 'badge-info';
    return '<span class="badge ' + cls + '">' + esc(value.replace(/_/g, ' ')) + '</span>';
}

function filteredHelpDeskTickets() {
    var q = helpDeskState.search.toLowerCase();
    return (DATA.helpDesk.tickets || []).filter(function (t) {
        return (!q || [t.id,t.subject,t.description,t.requester,t.assignee].join(' ').toLowerCase().indexOf(q) !== -1) &&
            (!helpDeskState.status || t.status === helpDeskState.status) && (!helpDeskState.priority || t.priority === helpDeskState.priority) &&
            (!helpDeskState.category || t.category === helpDeskState.category);
    }).sort(function (a,b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
}

function renderHelpDeskPage() {
    var tickets = DATA.helpDesk.tickets || [];
    var active = tickets.filter(function(t){ return ['RESOLVED','CLOSED'].indexOf(t.status) === -1; });
    var breached = active.filter(function(t){ return helpDeskSlaState(t) === 'BREACHED'; }).length;
    var resolved = tickets.filter(function(t){ return t.status === 'RESOLVED' || t.status === 'CLOSED'; }).length;
    var toolRegistry = helpDeskToolRegistry(DATA.participants);
    document.getElementById('helpDeskStats').innerHTML =
        '<div class="stat-card"><div class="label">🎫 Total tickets</div><div class="value">'+tickets.length+'</div><div class="change">All recorded</div></div>'+
        '<div class="stat-card"><div class="label">📥 Active queue</div><div class="value">'+active.length+'</div><div class="change">Needs action</div></div>'+
        '<div class="stat-card"><div class="label">⏰ SLA breached</div><div class="value">'+breached+'</div><div class="change '+(breached?'negative':'positive')+'">'+(breached?'Escalate now':'Within target')+'</div></div>'+
        '<div class="stat-card"><div class="label">✅ Resolved</div><div class="value">'+resolved+'</div><div class="change positive">Retained history</div></div>'+
        '<div class="stat-card"><div class="label">🧰 Unique tools</div><div class="value">'+toolRegistry.uniqueTools+'</div><div class="change">'+toolRegistry.assignments+' assignments</div></div>';
    var rows = filteredHelpDeskTickets();
    document.getElementById('helpDeskCount').textContent = rows.length + ' shown';
    document.getElementById('helpDeskBody').innerHTML = rows.length ? rows.map(function(t){
        return '<tr data-ticket="'+esc(t.id)+'"><td><button class="panel-link hd-open" data-id="'+esc(t.id)+'"><b>'+esc(t.id)+'</b></button><div class="text-xs text-muted">'+esc(t.requester)+'</div></td>'+
            '<td><b>'+esc(t.subject)+'</b><div class="text-xs text-muted">'+esc(t.category)+'</div></td><td>'+helpDeskBadge(t.priority)+'</td><td>'+helpDeskBadge(t.status)+'</td>'+
            '<td>'+esc(t.assignee || 'UNASSIGNED')+'</td><td>'+helpDeskBadge(helpDeskSlaState(t))+'<div class="text-xs text-muted">'+esc(fmtDate(t.dueAt))+'</div></td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty-state"><div class="ic">🎫</div>No tickets match this view</div></td></tr>';
    $all('.hd-open').forEach(function(btn){ btn.addEventListener('click', function(){ openHelpDeskTicket(btn.getAttribute('data-id')); }); });
}

function openNewHelpDeskTicket() {
    var body = '<div class="form-group"><label>Subject *</label><input id="hdSubject" maxlength="120" placeholder="What needs help?"></div>'+
        '<div class="form-group"><label>Description *</label><textarea id="hdDescription" rows="5" placeholder="Impact, symptoms, expected result, and evidence"></textarea></div>'+
        '<div class="form-row"><div class="form-group"><label>Requester</label><input id="hdRequester" value="Shylow Thompson"></div><div class="form-group"><label>Category</label><select id="hdCategory">'+HELP_DESK_CATEGORIES.map(function(x){return '<option>'+x+'</option>';}).join('')+'</select></div></div>'+
        '<div class="form-group"><label>Priority</label><select id="hdPriority">'+HELP_DESK_PRIORITIES.map(function(x){return '<option'+(x==='MEDIUM'?' selected':'')+'>'+x+'</option>';}).join('')+'</select><div class="text-xs text-muted mt-1">Critical 4h · High 8h · Medium 24h · Low 72h</div></div>';
    openModal('Create Help Desk Ticket', body, '<button class="btn btn-outline" id="hdCancel">Cancel</button><button class="btn btn-primary" id="hdCreate">Create Ticket</button>');
    document.getElementById('hdCancel').addEventListener('click', closeModal);
    document.getElementById('hdCreate').addEventListener('click', function(){
        var subject=document.getElementById('hdSubject').value.trim(), description=document.getElementById('hdDescription').value.trim();
        if (!subject || !description) { showToast('error','Subject and description are required'); return; }
        var ticket=helpDeskCreateTicket({subject:subject,description:description,requester:document.getElementById('hdRequester').value,category:document.getElementById('hdCategory').value,priority:document.getElementById('hdPriority').value}, DATA.helpDesk.tickets);
        DATA.helpDesk.tickets.unshift(ticket); saveData(); addLog(ticket.id+' help desk ticket created · '+ticket.subject,'info'); closeModal(); renderHelpDeskPage(); showToast('success','🎫 '+ticket.id+' created and assigned to '+ticket.assignee);
    });
}

function openHelpDeskTicket(id) {
    var t=DATA.helpDesk.tickets.find(function(x){return x.id===id;}); if(!t)return;
    var history=(t.history||[]).slice().reverse().map(function(h){return '<div class="log-item"><span class="log-time">'+esc(fmtDate(h.at))+'</span><span class="log-event"><b>'+esc(h.action.replace(/_/g,' '))+'</b> · '+esc(h.actor)+(h.note?'<span class="text-xs text-muted"> · '+esc(h.note)+'</span>':'')+'</span></div>';}).join('');
    var support=(DATA.participants||[]).filter(function(p){return p.callsign===t.assignee||p.callsign==='@CINDY'||p.callsign==='@VICTOR'||p.callsign==='@TANGO'||p.callsign==='@HELIX';});
    var pilot=t.knowledgePathPilot,pilotBody='';
    if(pilot){pilotBody='<div class="panel mt-2"><b>Knowledge Path Evidence Workflow</b><div class="kv-row"><span>Stage</span><span>'+esc(pilot.stageId)+'</span></div><div class="kv-row"><span>Workflow State</span><span>'+helpDeskBadge(pilot.state)+'</span></div><div class="kv-row"><span>Independent Reviewer</span><b>'+esc(pilot.reviewer)+'</b></div>'+(pilot.state==='EVIDENCE_REQUIRED'||pilot.state==='CORRECTION_REQUIRED'?PILOT_EVIDENCE_FIELDS.map(function(k){return '<div class="form-group"><label>'+esc(k.replace(/([A-Z])/g,' $1'))+' *</label>'+(k==='completedAt'?'<input id="kpe_'+k+'" type="datetime-local">':'<textarea id="kpe_'+k+'" rows="2"></textarea>')+'</div>';}).join('')+'<div class="form-group"><label>Submitted By</label><input id="kpe_submittedBy" value="'+esc(pilot.callsign)+'" disabled></div>':'')+(pilot.state==='REVIEW_REQUIRED'?'<div class="form-group"><label>@HELIX Review Note *</label><textarea id="kpe_reviewNote" rows="3"></textarea></div>':'')+'</div>';}
    var body='<div class="kv-row"><span>Subject</span><b>'+esc(t.subject)+'</b></div><div class="kv-row"><span>Category / Priority</span><span>'+esc(t.category)+' · '+esc(t.priority)+'</span></div><div class="kv-row"><span>SLA</span><span>'+helpDeskBadge(helpDeskSlaState(t))+' · '+esc(fmtDate(t.dueAt))+'</span></div><p class="mt-2">'+esc(t.description)+'</p>'+pilotBody+
        '<div class="form-row mt-2"><div class="form-group"><label>Status</label><select id="hdEditStatus">'+HELP_DESK_STATUSES.map(function(x){return '<option'+(x===t.status?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div><div class="form-group"><label>Assignee</label><select id="hdEditAssignee">'+support.map(function(p){return '<option value="'+esc(p.callsign)+'"'+(p.callsign===t.assignee?' selected':'')+'>'+esc(p.callsign+' · '+p.role)+'</option>';}).join('')+'</select></div></div>'+
        '<div class="form-group"><label>Update note</label><textarea id="hdEditNote" rows="3" placeholder="Work performed, evidence, blocker, or resolution"></textarea></div><div class="mt-2"><b>Activity history</b><div class="activity-list">'+history+'</div></div>';
    var pilotActions=pilot&&(pilot.state==='EVIDENCE_REQUIRED'||pilot.state==='CORRECTION_REQUIRED')?'<button class="btn btn-primary" id="kpeSubmit">Submit Evidence</button>':pilot&&pilot.state==='REVIEW_REQUIRED'?'<button class="btn btn-outline" id="kpeReject">Reject</button><button class="btn btn-success" id="kpeApprove">Approve Evidence</button>':'';
    openModal(t.id+' · Help Desk Ticket',body,'<button class="btn btn-outline" id="hdClose">Close</button>'+pilotActions+'<button class="btn btn-primary" id="hdSave">Save Update</button>');
    document.getElementById('hdClose').addEventListener('click',closeModal);
    document.getElementById('hdSave').addEventListener('click',function(){
        var status=document.getElementById('hdEditStatus').value, assignee=document.getElementById('hdEditAssignee').value, note=document.getElementById('hdEditNote').value.trim();
        if(t.assignee!==assignee){t.history.push({at:new Date().toISOString(),actor:'CARC Operator',action:'ASSIGNEE_CHANGED',from:t.assignee,to:assignee,note:note});t.assignee=assignee;t.updatedAt=new Date().toISOString();}
        if(t.status!==status) helpDeskTransition(t,status,'CARC Operator',note); else if(note){t.updatedAt=new Date().toISOString();t.history.push({at:t.updatedAt,actor:'CARC Operator',action:'NOTE_ADDED',from:t.status,to:t.status,note:note});}
        saveData();addLog(t.id+' help desk ticket updated · '+t.status,'info');closeModal();renderHelpDeskPage();showToast('success','✅ '+t.id+' updated');
    });
    if(document.getElementById('kpeSubmit'))document.getElementById('kpeSubmit').addEventListener('click',function(){var input={submittedBy:pilot.callsign};PILOT_EVIDENCE_FIELDS.forEach(function(k){input[k]=document.getElementById('kpe_'+k).value;});var result=submitKnowledgePathPilotEvidence(t,input);if(!result.ok){showToast('error','❌ '+result.error+(result.missing?' · '+result.missing.join(', '):''));return;}addLog(t.id+' pilot evidence submitted for @HELIX review','info',{correlationId:'KP-EVIDENCE-'+t.id,risk:'CONTROLLED_PILOT'});saveData();closeModal();renderHelpDeskPage();showToast('success','Evidence submitted — stage remains PENDING until review');});
    function decidePilot(decision){var note=document.getElementById('kpe_reviewNote').value.trim(),p=DATA.participants.find(function(x){return x.serviceMemberId===pilot.serviceMemberId;});var result=reviewKnowledgePathPilotEvidence(t,decision,'@HELIX',note,p);if(!result.ok){showToast('error','❌ '+result.error);return;}addLog(t.id+' pilot evidence '+(result.verified?'approved — Competency Baseline VERIFIED':'rejected — correction required'),result.verified?'success':'warning',{correlationId:'KP-REVIEW-'+t.id,serviceMemberId:pilot.serviceMemberId,outcome:decision,risk:'CONTROLLED_PILOT'});saveData();closeModal();renderHelpDeskPage();renderGovernancePage();showToast(result.verified?'success':'warning',result.verified?'✅ Evidence approved and stage verified':'Correction required; stage remains PENDING');}
    if(document.getElementById('kpeApprove'))document.getElementById('kpeApprove').addEventListener('click',function(){decidePilot('APPROVE');});
    if(document.getElementById('kpeReject'))document.getElementById('kpeReject').addEventListener('click',function(){decidePilot('REJECT');});
}

function createAllToolReadinessTickets(){
    var preview=buildToolReadinessTickets(DATA.participants,DATA.helpDesk.tickets,new Date());
    if(!preview.created.length){showToast('info','All 66 tool-readiness tickets already exist — no duplicates created');return;}
    if(!confirm('Create '+preview.created.length+' Tool Readiness ticket(s)? Each canonical identity receives one ticket containing its complete assigned-tool inventory and verification criteria.')) return;
    DATA.helpDesk.tickets = preview.created.concat(DATA.helpDesk.tickets);
    saveData(); addLog(preview.created.length+' governed Tool Readiness tickets created from '+helpDeskToolRegistry(DATA.participants).assignments+' assignments','info');
    renderHelpDeskPage(); showToast('success','🧰 '+preview.created.length+' tool-readiness tickets created; '+preview.skipped.length+' existing skipped');
}

function createKnowledgePathPilotTickets(){
    var preview=buildKnowledgePathPilotTickets(DATA.participants,DATA.helpDesk.tickets,new Date());
    if(preview.errors.length){showToast('error','❌ Pilot blocked: '+preview.errors.join(', '));return;}
    if(!preview.created.length){showToast('info','Both Knowledge Path Pilot tickets already exist — no duplicates created');return;}
    DATA.helpDesk.tickets = preview.created.concat(DATA.helpDesk.tickets);
    saveData(); addLog(preview.created.length+' Knowledge Path Pilot ticket(s) created for '+preview.created.map(function(t){return t.knowledgePathPilot.callsign;}).join(', '),'info',{correlationId:'KP-PILOT-CREATE',risk:'CONTROLLED_PILOT'});
    renderHelpDeskPage(); renderGovernancePage(); showToast('success','🧭 '+preview.created.length+' Knowledge Path Pilot ticket(s) created');
}

function exportHelpDeskCsv(){
    var csv=toCSV(DATA.helpDesk.tickets,[{label:'Ticket ID',get:function(t){return t.id;}},{label:'Subject',get:function(t){return t.subject;}},{label:'Requester',get:function(t){return t.requester;}},{label:'Category',get:function(t){return t.category;}},{label:'Priority',get:function(t){return t.priority;}},{label:'Status',get:function(t){return t.status;}},{label:'Assignee',get:function(t){return t.assignee;}},{label:'Created',get:function(t){return t.createdAt;}},{label:'Due',get:function(t){return t.dueAt;}},{label:'Resolved',get:function(t){return t.resolvedAt||'';}}]);
    downloadCSV('carc_help_desk_'+new Date().toISOString().slice(0,10)+'.csv',csv); showToast('success','⬇️ Help desk exported');
}

function wireHelpDeskPage(){
    document.getElementById('btnNewHelpTicket').addEventListener('click',openNewHelpDeskTicket);
    document.getElementById('btnExportHelpDesk').addEventListener('click',exportHelpDeskCsv);
    document.getElementById('btnBuildToolTickets').addEventListener('click',createAllToolReadinessTickets);
    document.getElementById('helpDeskSearch').addEventListener('input',debounce(function(e){helpDeskState.search=e.target.value;renderHelpDeskPage();},150));
    ['Status','Priority','Category'].forEach(function(k){document.getElementById('helpDesk'+k).addEventListener('change',function(e){helpDeskState[k.toLowerCase()]=e.target.value;renderHelpDeskPage();});});
}
