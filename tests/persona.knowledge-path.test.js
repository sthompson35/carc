'use strict';
// tests/persona.knowledge-path.test.js

module.exports = {
    modules: ['app/util.js', 'data/roster.js', 'persona/mission-doctrine.js', 'persona/alias-registry.js', 'persona/member-registry.js', 'persona/knowledge-path.js'],
    run: function (ctx, assert) {
        var buildDefaultKnowledgePath = ctx.buildDefaultKnowledgePath;
        var evaluateKnowledgePathState = ctx.evaluateKnowledgePathState;
        var evaluateMissionEligibilityStage = ctx.evaluateMissionEligibilityStage;
        var reconcileKnowledgePathEligibility = ctx.reconcileKnowledgePathEligibility;
        var knowledgePathRegistryState = ctx.knowledgePathRegistryState;
        var recordKnowledgePathStageEvidence = ctx.recordKnowledgePathStageEvidence;
        var rosterToParticipant = ctx.rosterToParticipant;
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

        // recordKnowledgePathStageEvidence: real evidence-verification rules, not a bare status flip.
        var vinnieRoster = ctx.ROSTER.find(function (r) { return r.callsign === '@VINNIE'; });
        var helixRoster = ctx.ROSTER.find(function (r) { return r.callsign === '@HELIX'; });
        var subject = rosterToParticipant(vinnieRoster, 0);
        subject.knowledgePath = buildDefaultKnowledgePath();
        subject.memberProfile = {};
        var verifierParticipant = rosterToParticipant(helixRoster, 1);
        ctx.DATA = { participants: [subject, verifierParticipant] };
        function subjectStage(id) { return subject.knowledgePath.stages.find(function (s) { return s.id === id; }); }

        var missingBoth = recordKnowledgePathStageEvidence(subject, 'competencies', { status: 'VERIFIED', evidence: '', verifier: '', updatedAt: '2026-01-01T00:00:00.000Z' });
        assert(missingBoth.ok === false && missingBoth.error === 'COMPETENCY_VERIFICATION_EVIDENCE_REQUIRED', 'empty evidence/verifier is rejected with the spec rejection code, not a silent PENDING save');
        assert(subjectStage('competencies').status === 'PENDING', 'rejected VERIFIED attempt leaves the stage PENDING, not VERIFIED');

        var unrecognized = recordKnowledgePathStageEvidence(subject, 'competencies', { status: 'VERIFIED', evidence: 'ev-1', verifier: 'Bob the Reviewer', updatedAt: '2026-01-01T00:00:01.000Z' });
        assert(unrecognized.ok === false && unrecognized.error === 'VERIFIER_NOT_RECOGNIZED', 'a verifier that does not resolve to a real canonical identity is rejected, free text is not accepted as a verifier');

        var selfAttempt = recordKnowledgePathStageEvidence(subject, 'competencies', { status: 'VERIFIED', evidence: 'ev-1', verifier: '@VINNIE', updatedAt: '2026-01-01T00:00:02.000Z' });
        assert(selfAttempt.ok === false && selfAttempt.error === 'SELF_VERIFICATION_PROHIBITED', 'self-verification is refused when the identity has no maySelfVerify/selfVerificationAllowed policy flag');

        var genuine = recordKnowledgePathStageEvidence(subject, 'competencies', { status: 'VERIFIED', evidence: 'ev-1', verifier: '@HELIX', updatedAt: '2026-01-01T00:00:03.000Z' });
        assert(genuine.ok === true && genuine.stage.status === 'VERIFIED', 'a real evidence reference plus a real, non-self verifier is genuinely accepted');
        assert(genuine.stage.verifier === verifierParticipant.serviceMemberId, 'the stored verifier is the resolved canonical ID, not the raw @callsign text typed in');
        assert(typeof genuine.stage.verifiedAt === 'string' && genuine.stage.verifiedAt.length > 0, 'a real verification stamps a distinct verifiedAt timestamp');

        // Rule 6: editing evidence on an already-VERIFIED stage while the new attempt itself fails
        // (self-verification here) must drop the stage to PENDING — never silently keep the old
        // VERIFIED status paired with different evidence than what was actually verified.
        var mutatedInvalid = recordKnowledgePathStageEvidence(subject, 'competencies', { status: 'VERIFIED', evidence: 'ev-2-different', verifier: '@VINNIE', updatedAt: '2026-01-01T00:00:04.000Z' });
        assert(mutatedInvalid.ok === false && mutatedInvalid.stage.status === 'PENDING', 'changing evidence on a VERIFIED stage while the new verification attempt itself fails reverts the stage to PENDING, not left VERIFIED with mismatched content');
        assert(mutatedInvalid.stage.verifiedAt === null, 'reverting to PENDING clears the prior verifiedAt timestamp');

        // Rule 5's policy exception: wire the real (if previously-unread) member-registry flags.
        subject.memberProfile = { workingAuthorityProfile: { maySelfVerify: true } };
        var selfAuthorized = recordKnowledgePathStageEvidence(subject, 'competencies', { status: 'VERIFIED', evidence: 'ev-3', verifier: '@VINNIE', updatedAt: '2026-01-01T00:00:05.000Z' });
        assert(selfAuthorized.ok === true && selfAuthorized.stage.status === 'VERIFIED', 'self-verification succeeds once the real memberProfile.workingAuthorityProfile.maySelfVerify policy flag authorizes it');
    }
};
