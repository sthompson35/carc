'use strict';
module.exports = {
    modules: ['data/source-authority.js'],
    run: function (ctx, assert) {
        var project = { field:'role', value:'Canonical role', source:{ kind:'PROJECT_CANONICAL_REGISTRY' } };
        var pdf = { field:'role', value:'Stale PDF role', source:{ kind:'PDF_REFERENCE' } };
        var result = ctx.resolveSourceConflict(project, pdf);
        assert(result.accepted === false && result.winner === project, 'PDF cannot override a canonical project field');
        assert(result.reason === 'PDF_REFERENCE_CANNOT_OVERRIDE_PROJECT_FIELD', 'protected PDF rejection has an explicit reason');

        var controlled = { field:'notes', value:'Controlled project note', source:{ kind:'PROJECT_CONTROLLED_FILE' } };
        var pdfNote = { field:'notes', value:'PDF note', source:{ kind:'PDF_REFERENCE' } };
        result = ctx.resolveSourceConflict(controlled, pdfNote);
        assert(result.accepted === false && result.winner === controlled, 'project controlled file outranks PDF reference content');

        var runtime = { field:'productionVerification', value:'PRODUCTION_VERIFIED', source:{ kind:'PROJECT_RUNTIME_EVIDENCE' } };
        result = ctx.resolveSourceConflict(pdf, runtime);
        assert(result.accepted === true && result.winner === runtime, 'governed runtime evidence outranks PDF content');

        assert(ctx.sourceAuthorityLevel({kind:'PROJECT_RUNTIME_EVIDENCE'}) > ctx.sourceAuthorityLevel({kind:'PROJECT_CANONICAL_REGISTRY'}), 'runtime evidence outranks canonical registry');
        assert(ctx.sourceAuthorityLevel({kind:'PROJECT_CANONICAL_REGISTRY'}) > ctx.sourceAuthorityLevel({kind:'PDF_REFERENCE'}), 'canonical registry outranks PDF reference');
    }
};

