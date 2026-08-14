'use strict';
// tests/communication.tasks.test.js

module.exports = {
    modules: ['app/util.js', 'persona/identity.js', 'communication/tasks.js'],
    run: function (ctx, assert) {
        ctx.DATA = { tasks: [], handoffs: [] };

        var t = ctx.createTask({ ownerServiceMemberId: 'ATA-VEX-000', title: 'Test task' });
        assert(t.taskId.indexOf('TASK-') === 0, 'createTask uses the TASK- prefix via canaryId');
        assert(t.state === 'ASSIGNED', 'a new task starts ASSIGNED');
        assert(ctx.DATA.tasks[0].taskId === t.taskId, 'createTask unshifts newest-first');

        var ok = ctx.transitionTask(t.taskId, 'ACKNOWLEDGED');
        assert(ok.ok === true && t.state === 'ACKNOWLEDGED', 'ASSIGNED → ACKNOWLEDGED is a legal transition');
        var illegal = ctx.transitionTask(t.taskId, 'COMPLETED');
        assert(illegal.ok === false && illegal.reason === 'ILLEGAL_TRANSITION', 'ACKNOWLEDGED → COMPLETED is rejected — IN_PROGRESS cannot be skipped');
        assert(t.state === 'ACKNOWLEDGED', 'an illegal transition attempt does not mutate task state');

        var notFound = ctx.transitionTask('TASK-DOES-NOT-EXIST', 'ACKNOWLEDGED');
        assert(notFound.ok === false && notFound.reason === 'TASK_NOT_FOUND', 'transitionTask on an unknown taskId reports TASK_NOT_FOUND');

        var h = ctx.createHandoff({ taskId: t.taskId, fromServiceMemberId: 'ATA-VEX-000', toServiceMemberId: 'ATA-MAPE-000' });
        assert(h.handoffId.indexOf('HANDOFF-') === 0, 'createHandoff uses the HANDOFF- prefix');
        assert(h.state === 'CREATED', 'a new handoff starts CREATED');
        assert(h.taskId === t.taskId, 'createHandoff preserves the linked taskId');

        var declined = ctx.transitionHandoff(h.handoffId, 'DECLINED');
        assert(declined.ok === true && h.state === 'DECLINED', 'CREATED → DECLINED is a legal terminal transition');
        var afterTerminal = ctx.transitionHandoff(h.handoffId, 'ACKNOWLEDGED');
        assert(afterTerminal.ok === false, 'a terminal handoff state has no further legal transitions');

        var nullTaskHandoff = ctx.createHandoff({ fromServiceMemberId: 'ATA-VEX-000', toServiceMemberId: 'ATA-MAPE-000' });
        assert(nullTaskHandoff.taskId === null, 'a handoff created without a taskId is nullable, not fabricated');
    }
};
