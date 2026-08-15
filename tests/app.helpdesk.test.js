'use strict';
module.exports={modules:['app/pages/helpdesk.js'],run:function(ctx,assert){
    var t=ctx.helpDeskCreateTicket({subject:'Runtime offline',description:'Health endpoint unavailable',requester:'Operator',category:'RUNTIME',priority:'CRITICAL'},[],new Date('2026-01-01T00:00:00Z'));
    assert(t.id==='HD-0001','first ticket receives deterministic ID');
    assert(t.assignee==='@VICTOR','runtime ticket routes to @VICTOR');
    assert(t.dueAt==='2026-01-01T04:00:00.000Z','critical ticket receives four-hour SLA');
    assert(ctx.helpDeskSlaState(t,new Date('2026-01-01T05:00:00Z'))==='BREACHED','open overdue ticket breaches SLA');
    var result=ctx.helpDeskTransition(t,'RESOLVED','@VICTOR','Service restored',new Date('2026-01-01T02:00:00Z'));
    assert(result.ok&&t.status==='RESOLVED'&&!!t.resolvedAt,'valid transition resolves ticket');
    assert(ctx.helpDeskSlaState(t,new Date('2026-01-02T00:00:00Z'))==='COMPLETE','resolved ticket reports complete SLA');
    assert(t.history.length===2&&t.history[1].action==='STATUS_CHANGED','status transition appends history');
    assert(ctx.helpDeskTransition(t,'INVALID','x','x').error==='INVALID_STATUS','invalid status is rejected');
    assert(ctx.helpDeskNextId([{id:'HD-0009'},{id:'legacy'}])==='HD-0010','ticket IDs advance without collision');
}};
