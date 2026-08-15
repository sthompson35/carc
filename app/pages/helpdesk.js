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
        history:[{ at:createdAt, actor:String(input.requester || 'Shylow Thompson').trim(), action:'TICKET_CREATED', from:null, to:'OPEN', note:'Assigned to ' + owner }]
    };
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
    document.getElementById('helpDeskStats').innerHTML =
        '<div class="stat-card"><div class="label">🎫 Total tickets</div><div class="value">'+tickets.length+'</div><div class="change">All recorded</div></div>'+
        '<div class="stat-card"><div class="label">📥 Active queue</div><div class="value">'+active.length+'</div><div class="change">Needs action</div></div>'+
        '<div class="stat-card"><div class="label">⏰ SLA breached</div><div class="value">'+breached+'</div><div class="change '+(breached?'negative':'positive')+'">'+(breached?'Escalate now':'Within target')+'</div></div>'+
        '<div class="stat-card"><div class="label">✅ Resolved</div><div class="value">'+resolved+'</div><div class="change positive">Retained history</div></div>';
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
    var support=(DATA.participants||[]).filter(function(p){return p.callsign==='@CINDY'||p.callsign==='@VICTOR'||p.callsign==='@TANGO'||p.callsign==='@HELIX';});
    var body='<div class="kv-row"><span>Subject</span><b>'+esc(t.subject)+'</b></div><div class="kv-row"><span>Category / Priority</span><span>'+esc(t.category)+' · '+esc(t.priority)+'</span></div><div class="kv-row"><span>SLA</span><span>'+helpDeskBadge(helpDeskSlaState(t))+' · '+esc(fmtDate(t.dueAt))+'</span></div><p class="mt-2">'+esc(t.description)+'</p>'+
        '<div class="form-row mt-2"><div class="form-group"><label>Status</label><select id="hdEditStatus">'+HELP_DESK_STATUSES.map(function(x){return '<option'+(x===t.status?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div><div class="form-group"><label>Assignee</label><select id="hdEditAssignee">'+support.map(function(p){return '<option value="'+esc(p.callsign)+'"'+(p.callsign===t.assignee?' selected':'')+'>'+esc(p.callsign+' · '+p.role)+'</option>';}).join('')+'</select></div></div>'+
        '<div class="form-group"><label>Update note</label><textarea id="hdEditNote" rows="3" placeholder="Work performed, evidence, blocker, or resolution"></textarea></div><div class="mt-2"><b>Activity history</b><div class="activity-list">'+history+'</div></div>';
    openModal(t.id+' · Help Desk Ticket',body,'<button class="btn btn-outline" id="hdClose">Close</button><button class="btn btn-primary" id="hdSave">Save Update</button>');
    document.getElementById('hdClose').addEventListener('click',closeModal);
    document.getElementById('hdSave').addEventListener('click',function(){
        var status=document.getElementById('hdEditStatus').value, assignee=document.getElementById('hdEditAssignee').value, note=document.getElementById('hdEditNote').value.trim();
        if(t.assignee!==assignee){t.history.push({at:new Date().toISOString(),actor:'CARC Operator',action:'ASSIGNEE_CHANGED',from:t.assignee,to:assignee,note:note});t.assignee=assignee;t.updatedAt=new Date().toISOString();}
        if(t.status!==status) helpDeskTransition(t,status,'CARC Operator',note); else if(note){t.updatedAt=new Date().toISOString();t.history.push({at:t.updatedAt,actor:'CARC Operator',action:'NOTE_ADDED',from:t.status,to:t.status,note:note});}
        saveData();addLog(t.id+' help desk ticket updated · '+t.status,'info');closeModal();renderHelpDeskPage();showToast('success','✅ '+t.id+' updated');
    });
}

function exportHelpDeskCsv(){
    var csv=toCSV(DATA.helpDesk.tickets,[{label:'Ticket ID',get:function(t){return t.id;}},{label:'Subject',get:function(t){return t.subject;}},{label:'Requester',get:function(t){return t.requester;}},{label:'Category',get:function(t){return t.category;}},{label:'Priority',get:function(t){return t.priority;}},{label:'Status',get:function(t){return t.status;}},{label:'Assignee',get:function(t){return t.assignee;}},{label:'Created',get:function(t){return t.createdAt;}},{label:'Due',get:function(t){return t.dueAt;}},{label:'Resolved',get:function(t){return t.resolvedAt||'';}}]);
    downloadCSV('carc_help_desk_'+new Date().toISOString().slice(0,10)+'.csv',csv); showToast('success','⬇️ Help desk exported');
}

function wireHelpDeskPage(){
    document.getElementById('btnNewHelpTicket').addEventListener('click',openNewHelpDeskTicket);
    document.getElementById('btnExportHelpDesk').addEventListener('click',exportHelpDeskCsv);
    document.getElementById('helpDeskSearch').addEventListener('input',debounce(function(e){helpDeskState.search=e.target.value;renderHelpDeskPage();},150));
    ['Status','Priority','Category'].forEach(function(k){document.getElementById('helpDesk'+k).addEventListener('change',function(e){helpDeskState[k.toLowerCase()]=e.target.value;renderHelpDeskPage();});});
}
