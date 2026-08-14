'use strict';
// tests/persona.knowledge-path.test.js

module.exports = {
    modules: ['app/util.js', 'data/roster.js', 'persona/mission-doctrine.js', 'persona/knowledge-path.js'],
    run: function (ctx, assert) {
        var buildDefaultKnowledgePath = ctx.buildDefaultKnowledgePath;
        var evaluateKnowledgePathState = ctx.evaluateKnowledgePathState;
        var evaluateMissionEligibilityStage = ctx.evaluateMissionEligibilityStage;
        var reconcileKnowledgePathEligibility = ctx.reconcileKnowledgePathEligibility;
        var knowledgePathRegistryState = ctx.knowledgePathRegistryState;
        var PREREQS = ['competencies', 'curriculum', 'governed_sources', 'tools', 'permissions', 'exercises', 'assessment', 'certification'];

        // buildDefaultKnowledgePath
        var fresh = buildDefaultKnowledgePath();
        assert(fresh.stages.length === 10, 'buildDefaultKnowledgePath produces exactly 10 stages');
        assert(fresh.stages.every(function (s) { return s.status === 'PENDING' && s.evidence === '' && s.verifier === ''; }), 'every fresh stage starts PENDING with no evidence/verifier — nothing pre-filled');
        var ids = fresh.stages.map(function (s) { return s.id; });
        assert(ids.indexOf('mission_eligibility') === 8 && ids.indexOf('review_acknowledgement') === 9, 'mission_eligibility precedes review_acknowledgement in stage order');

        // getPipelineProfile — pure alias, zero new stored state.
        var getPipelineProfile = ctx.getPipelineProfile;
        var withPath = { id: 'r-TEST-ALIAS', knowledgePath: fresh };
        assert(getPipelineProfile(withPath) === withPath.knowledgePath, 'getPipelineProfile returns p.knowledgePath by reference, not a copy');
        assert(getPipelineProfile({ id: 'r-TEST-NOPATH' }) === null, 'getPipelineProfile returns null for a participant with no knowledgePath');

        // evaluateKnowledgePathState on a fresh path
        var p = { id: 'r-TEST-1', knowledgePath: buildDefaultKnowledgePath() };
        var state0 = evaluateKnowledgePathState(p);
        assert(state0.verified === 0 && state0.total === 10 && state0.percent === 0 && state0.complete === false, 'a fresh knowledge path reports 0/10, not complete');

        // evaluateMissionEligibilityStage: 0 of 8 prerequisites verified
        var elig0 = evaluateMissionEligibilityStage(p);
        assert(elig0.allowed === false && elig0.status === 'PENDING', 'mission eligibility is not allowed with zero prerequisites verified');
        assert(PREREQS.every(function (id) { return elig0.reason.indexOf(id) !== -1; }), 'the reason lists all 8 missing prerequisite stage ids');

        // verify 7 of 8 prerequisites
        function stageById(id) { return p.knowledgePath.stages.find(function (s) { return s.id === id; }); }
        PREREQS.slice(0, 7).forEach(function (id) {
            var s = stageById(id);
            s.status = 'VERIFIED'; s.evidence = 'ev-' + id; s.verifier = 'verifier-' + id;
        });
        var elig7 = evaluateMissionEligibilityStage(p);
        assert(elig7.allowed === false, 'mission eligibility still not allowed with 7 of 8 prerequisites verified');
        assert(elig7.reason.indexOf(PREREQS[7]) !== -1, 'the reason names exactly the one remaining missing stage (' + PREREQS[7] + ')');

        // verify the 8th prerequisite
        var last = stageById(PREREQS[7]);
        last.status = 'VERIFIED'; last.evidence = 'ev-last'; last.verifier = 'verifier-last';
        var elig8 = evaluateMissionEligibilityStage(p);
        assert(elig8.allowed === true && elig8.status === 'VERIFIED' && elig8.reason === 'ALL_PREREQUISITE_STAGES_VERIFIED', 'mission eligibility is allowed once all 8 prerequisites are verified');

        // reconcileKnowledgePathEligibility actually mutates the stage in place
        var reconciled = reconcileKnowledgePathEligibility(p);
        assert(reconciled.allowed === true, 'reconcile returns the same allowed result');
        var eligibilityStage = stageById('mission_eligibility');
        assert(eligibilityStage.status === 'VERIFIED', 'reconcile mutates the mission_eligibility stage status in place');
        assert(typeof eligibilityStage.updatedAt === 'string' && eligibilityStage.updatedAt.length > 0, 'reconcile stamps an updatedAt on the mission_eligibility stage');

        // full completion: also manually verify review_acknowledgement
        var review = stageById('review_acknowledgement');
        review.status = 'VERIFIED'; review.evidence = 'reviewed'; review.verifier = 'reviewer-1';
        var stateFull = evaluateKnowledgePathState(p);
        assert(stateFull.verified === 10 && stateFull.complete === true, 'all 10 stages verified (8 prerequisites + computed eligibility + manual review) reports complete');

        // knowledgePathRegistryState: DATA-guard (migration-safety)
        assert(typeof ctx.DATA === 'undefined', 'sanity: DATA is not yet set in this context');
        var guarded = knowledgePathRegistryState();
        assert(guarded.total === 0 && guarded.complete === 0 && Array.isArray(guarded.stageBreakdown) && guarded.stageBreakdown.length === 0, 'knowledgePathRegistryState is safe to call before DATA is assigned');

        // knowledgePathRegistryState: real aggregate over a small mixed fixture
        var incomplete = { id: 'r-TEST-2', serviceMemberId: 'ATA-TEST2-000', knowledgePath: buildDefaultKnowledgePath() };
        var noPath = { id: 'r-TEST-3', serviceMemberId: 'ATA-TEST3-000' }; // defensive: no knowledgePath at all
        var uncontrolled = { id: 'r-TEST-4', knowledgePath: buildDefaultKnowledgePath() }; // no serviceMemberId, excluded
        p.serviceMemberId = 'ATA-TEST1-000';
        ctx.DATA = { participants: [p, incomplete, noPath, uncontrolled] };
        var registry = knowledgePathRegistryState();
        assert(registry.total === 3, 'knowledgePathRegistryState only counts controlled (serviceMemberId-bearing) participants (got ' + registry.total + ')');
        assert(registry.complete === 1, 'exactly one of the 3 controlled participants has completed all 10 stages');
        assert(registry.stageBreakdown.length === 10, 'the per-stage breakdown has exactly 10 rows');
        var certRow = registry.stageBreakdown.find(function (r) { return r.id === 'certification'; });
        assert(certRow && certRow.verified === 1, 'the certification stage breakdown counts exactly the one participant who verified it (' + (certRow && certRow.verified) + ')');
    }
};
