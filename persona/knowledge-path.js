'use strict';
// persona/knowledge-path.js

    // Fixed constant, identical for every identity — same pattern as DATA.governance.requirements
    // (6 system-wide items) or UNIVERSAL_OPERATING_DOCTRINE. Only per-participant status/evidence/
    // verifier vary; the stage list itself is not per-identity content.
    var KNOWLEDGE_PATH_STAGE_DEFS = [
        { id: 'competencies', name: 'Competency Baseline', description: "Required competencies for this identity's role and mission are identified and confirmed." },
        { id: 'curriculum', name: 'Curriculum Modules', description: 'Assigned curriculum modules covering the required competencies are identified and completed.' },
        { id: 'governed_sources', name: 'Governed Source Access', description: "Authoritative sources required for this identity's mission are registered, permissioned, and accessible." },
        { id: 'tools', name: 'Tool Enablement', description: "Tools and systems required to execute this identity's mission are provisioned and access-verified." },
        { id: 'permissions', name: 'Permissions Grant', description: "Least-privilege permissions required for this identity's duties are granted and enforced." },
        { id: 'exercises', name: 'Practical Exercises', description: 'Hands-on exercises covering the assigned competencies and tools are completed.' },
        { id: 'assessment', name: 'Assessment', description: "A formal assessment of this identity's competency and readiness has been conducted and scored." },
        { id: 'certification', name: 'Certification', description: 'Certification confirming this identity is qualified for its assigned mission has been issued.' },
        { id: 'mission_eligibility', name: 'Mission Eligibility', description: 'Computed eligibility for mission assignment, derived automatically from the 8 prerequisite knowledge-path stages above.' },
        { id: 'review_acknowledgement', name: 'Review Acknowledgement', description: "A qualified reviewer has acknowledged this identity's complete knowledge-path record and eligibility determination." }
    ];

    // The 8 manually-attested prerequisite stages mission_eligibility is computed from.
    // review_acknowledgement is deliberately excluded — it's a downstream human sign-off on the
    // computed result, not an input to it.
    var KNOWLEDGE_PATH_PREREQ_STAGE_IDS = ['competencies', 'curriculum', 'governed_sources', 'tools', 'permissions', 'exercises', 'assessment', 'certification'];

    function buildDefaultKnowledgePath() {
        return {
            stages: KNOWLEDGE_PATH_STAGE_DEFS.map(function (def) {
                return { id: def.id, name: def.name, description: def.description, status: 'PENDING', evidence: '', verifier: '' };
            })
        };
    }

    // Pure — takes only the participant, never touches global DATA. Mirrors governanceGateState()'s
    // shape, scoped to one identity instead of the whole system.
    function evaluateKnowledgePathState(p) {
        var stages = (p && p.knowledgePath && p.knowledgePath.stages) || [];
        var verified = stages.filter(function (s) { return s.status === 'VERIFIED'; }).length;
        var total = stages.length;
        return { stages: stages, verified: verified, total: total, percent: total ? Math.round((verified / total) * 100) : 0, complete: total > 0 && verified === total };
    }

    // Mirrors evaluateCanaryAuthorization(p)'s {allowed, reason} shape, scoped purely to this
    // identity's own 8 prerequisite stages — no registry-wide dependency, no DATA access.
    function evaluateMissionEligibilityStage(p) {
        var stages = (p && p.knowledgePath && p.knowledgePath.stages) || [];
        var byId = {};
        stages.forEach(function (s) { byId[s.id] = s; });
        var missing = KNOWLEDGE_PATH_PREREQ_STAGE_IDS.filter(function (id) { return !byId[id] || byId[id].status !== 'VERIFIED'; });
        return {
            allowed: missing.length === 0,
            status: missing.length === 0 ? 'VERIFIED' : 'PENDING',
            reason: missing.length === 0 ? 'ALL_PREREQUISITE_STAGES_VERIFIED' : 'PREREQUISITE_STAGES_INCOMPLETE: ' + missing.join(', ')
        };
    }

    // Recomputes the mission_eligibility stage in place. Called after any prerequisite stage is
    // saved. Safe to call from anywhere — only mutates the passed-in p.
    function reconcileKnowledgePathEligibility(p) {
        if (!p || !p.knowledgePath) return null;
        var stage = p.knowledgePath.stages.find(function (s) { return s.id === 'mission_eligibility'; });
        if (!stage) return null;
        var result = evaluateMissionEligibilityStage(p);
        stage.status = result.status;
        stage.reason = result.reason;
        stage.updatedAt = new Date().toISOString();
        return result;
    }

    // Registry-wide aggregate — guarded exactly like governanceGateState() against being reached
    // before DATA is assigned (reachable indirectly during migration/reconciliation).
    function knowledgePathRegistryState() {
        if (typeof DATA === 'undefined' || !DATA) return { total: 0, complete: 0, percent: 0, stageBreakdown: [] };
        var controlled = DATA.participants.filter(function (p) { return !!p.serviceMemberId; });
        var complete = controlled.filter(function (p) { return evaluateKnowledgePathState(p).complete; }).length;
        var stageBreakdown = KNOWLEDGE_PATH_STAGE_DEFS.map(function (def) {
            var verified = controlled.filter(function (p) {
                var s = p.knowledgePath && p.knowledgePath.stages && p.knowledgePath.stages.find(function (x) { return x.id === def.id; });
                return s && s.status === 'VERIFIED';
            }).length;
            return { id: def.id, name: def.name, verified: verified };
        });
        return { total: controlled.length, complete: complete, percent: controlled.length ? Math.round((complete / controlled.length) * 100) : 0, stageBreakdown: stageBreakdown };
    }
