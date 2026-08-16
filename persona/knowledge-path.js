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
                return { id: def.id, name: def.name, description: def.description, status: 'PENDING', evidence: '', verifier: '', history: [] };
            })
        };
    }

    // Structural repair, run unconditionally on every migrateData() call (see schemas/migrate.js).
    // A stored dataset can carry the current schema number while still missing this additive
    // shape (e.g. it was created before `history[]` existed) — rebuild only missing stage shells
    // and keep every existing status/evidence/verifier/history record by stage ID. Never promotes
    // a stage's status.
    function reconcileKnowledgePathStructure(p) {
        if (!p) return null;
        var existing = (p.knowledgePath && Array.isArray(p.knowledgePath.stages)) ? p.knowledgePath.stages : [];
        var byId = {}; existing.forEach(function (s) { if (s && s.id) byId[s.id] = s; });
        p.knowledgePath = p.knowledgePath || {};
        p.knowledgePath.stages = KNOWLEDGE_PATH_STAGE_DEFS.map(function (def) {
            var s = byId[def.id] || { id: def.id, status: 'PENDING', evidence: '', verifier: '' };
            s.name = def.name; s.description = def.description;
            if (typeof s.evidence !== 'string') s.evidence = '';
            if (typeof s.verifier !== 'string') s.verifier = '';
            if (!Array.isArray(s.history)) s.history = [];
            return s;
        });
        reconcileKnowledgePathEligibility(p);
        return p.knowledgePath;
    }

    // The only real mutator for a manually-attested stage (mission_eligibility is computed-only,
    // see reconcileKnowledgePathEligibility). Every change is appended to the stage's own
    // append-only history[] (capped 100) rather than overwritten, so prior evidence/verifier
    // pairs are never silently lost — including rejected attempts, which are auditable too.
    //
    // VERIFIED is real verification, not a bare status flip: the verifier must resolve to a real
    // canonical identity (never free text), self-verification is refused unless this identity's
    // own real profile explicitly authorizes it (workingAuthorityProfile.maySelfVerify /
    // governanceLocked.selfVerificationAllowed — both false for every identity today, so this
    // changes nothing in practice yet, it just wires up data that already existed unread), and
    // changing evidence/verifier on an already-VERIFIED stage forces a fresh, real re-verification
    // rather than silently keeping the old VERIFIED status with new content attached to it.
    function recordKnowledgePathStageEvidence(p, stageId, update) {
        update = update || {};
        if (!p || !p.knowledgePath) return { ok: false, error: 'KNOWLEDGE_PATH_NOT_FOUND' };
        var stage = p.knowledgePath.stages.find(function (s) { return s.id === stageId; });
        if (!stage) return { ok: false, error: 'STAGE_NOT_FOUND' };
        if (stage.id === 'mission_eligibility') return { ok: false, error: 'COMPUTED_STAGE_READ_ONLY' };

        var requestedStatus = update.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING';
        var evidence = String(update.evidence || '').trim();
        var verifierInput = String(update.verifier || '').trim();
        var at = update.updatedAt || new Date().toISOString();

        // A change to evidence/verifier on an already-VERIFIED stage can never silently remain
        // VERIFIED — the record must drop to PENDING first, so this call either produces a fresh,
        // real verification below or the stage is honestly PENDING. A resubmission with identical
        // evidence+verifier is not a mutation and does not trigger this.
        var contentChanged = stage.status === 'VERIFIED' && (evidence !== stage.evidence || verifierInput !== stage.verifier);
        var effectiveStatus = contentChanged ? 'PENDING' : stage.status;

        var verifierCanonicalId = null, error = null;
        if (requestedStatus === 'VERIFIED') {
            if (!evidence || !verifierInput) {
                error = 'COMPETENCY_VERIFICATION_EVIDENCE_REQUIRED';
            } else {
                var resolvedVerifier = null;
                try { resolvedVerifier = resolveCanonicalIdentity(verifierInput); } catch (e) { resolvedVerifier = null; }
                if (!resolvedVerifier) {
                    error = 'VERIFIER_NOT_RECOGNIZED';
                } else {
                    verifierCanonicalId = resolvedVerifier.serviceMemberId || resolvedVerifier.callsign;
                    var isSelf = !!p.serviceMemberId && resolvedVerifier.serviceMemberId === p.serviceMemberId;
                    var selfVerifyAuthorized = !!(p.memberProfile && (
                        (p.memberProfile.workingAuthorityProfile && p.memberProfile.workingAuthorityProfile.maySelfVerify === true) ||
                        (p.memberProfile.governanceLocked && p.memberProfile.governanceLocked.selfVerificationAllowed === true)
                    ));
                    if (isSelf && !selfVerifyAuthorized) error = 'SELF_VERIFICATION_PROHIBITED';
                }
            }
        }

        var finalStatus = error ? (contentChanged ? 'PENDING' : effectiveStatus) : requestedStatus;
        var accepted = !error && requestedStatus === 'VERIFIED';

        stage.history = Array.isArray(stage.history) ? stage.history : [];
        var evidenceEventId = update.evidenceEventId || ('KP-' + p.serviceMemberId + '-' + stage.id + '-' + String(at).replace(/[^0-9]/g, '').slice(0, 17));
        stage.history.unshift({
            evidenceEventId: evidenceEventId, previousStatus: stage.status || 'PENDING', status: finalStatus,
            evidence: evidence, verifier: verifierCanonicalId || verifierInput, at: at,
            rejected: !!error, rejectionReason: error || null
        });
        if (stage.history.length > 100) stage.history = stage.history.slice(0, 100);

        if (error) {
            // Reject the VERIFIED attempt, but a genuine mutation on a previously-VERIFIED stage
            // still has to fall to PENDING — the old evidence/verifier pairing is no longer honest
            // even though the new one didn't pass either.
            stage.status = finalStatus;
            if (finalStatus !== 'VERIFIED') stage.verifiedAt = null;
            stage.updatedAt = at;
            reconcileKnowledgePathEligibility(p);
            return { ok: false, error: error, stage: stage };
        }

        stage.status = finalStatus;
        stage.evidence = evidence;
        stage.verifier = accepted ? verifierCanonicalId : verifierInput;
        stage.updatedAt = at;
        stage.verifiedAt = accepted ? at : null;
        stage.evidenceEventId = accepted ? evidenceEventId : stage.evidenceEventId;
        reconcileKnowledgePathEligibility(p);
        return { ok: true, stage: stage };
    }

    // PIPELINE_PROFILE is not new stored state — it is p.knowledgePath under its canonical name.
    // This exists so "pipeline profile" is a real, discoverable concept in the codebase rather
    // than an implicit mapping only documented in a plan file.
    function getPipelineProfile(p) {
        return (p && p.knowledgePath) || null;
    }

    // Pure — takes only the participant, never touches global DATA. Mirrors governanceGateState()'s
    // shape, scoped to one identity instead of the whole system.
    function evaluateKnowledgePathState(p) {
        var pipeline = getPipelineProfile(p);
        var stages = (pipeline && pipeline.stages) || [];
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
        var verifiedStages = 0;
        var eligible = 0;
        controlled.forEach(function (p) {
            verifiedStages += evaluateKnowledgePathState(p).verified;
            if (evaluateMissionEligibilityStage(p).allowed) eligible++;
        });
        var stageBreakdown = KNOWLEDGE_PATH_STAGE_DEFS.map(function (def) {
            var verified = controlled.filter(function (p) {
                var s = p.knowledgePath && p.knowledgePath.stages && p.knowledgePath.stages.find(function (x) { return x.id === def.id; });
                return s && s.status === 'VERIFIED';
            }).length;
            return { id: def.id, name: def.name, verified: verified };
        });
        var totalStages = controlled.length * KNOWLEDGE_PATH_STAGE_DEFS.length;
        return { total: controlled.length, complete: complete, percent: controlled.length ? Math.round((complete / controlled.length) * 100) : 0, verifiedStages: verifiedStages, totalStages: totalStages, eligible: eligible, stageBreakdown: stageBreakdown };
    }

    // Flat, one-row-per-stage view for the registry export — 66 identities × 10 stages = 660 rows.
    function knowledgePathRegistryRows(participants) {
        var rows = [];
        (participants || []).filter(function (p) { return !!p.serviceMemberId; }).forEach(function (p) {
            ((p.knowledgePath && p.knowledgePath.stages) || []).forEach(function (s) {
                rows.push({ serviceMemberId: p.serviceMemberId, callsign: p.callsign, name: p.name, department: p.dept || '', stageId: s.id, stage: s.name, status: s.status, evidence: s.evidence || '', verifier: s.verifier || '', updatedAt: s.updatedAt || '', historyEvents: (s.history || []).length });
            });
        });
        return rows;
    }

    // Blocks a header-only or truncated export from ever being downloaded as if it were complete.
    function validateKnowledgePathRegistryExport(participants, rows) {
        var controlled = (participants || []).filter(function (p) { return !!p.serviceMemberId; });
        var expected = controlled.length * KNOWLEDGE_PATH_STAGE_DEFS.length;
        var pairs = {}; (rows || []).forEach(function (r) { pairs[r.serviceMemberId + '|' + r.stageId] = (pairs[r.serviceMemberId + '|' + r.stageId] || 0) + 1; });
        var duplicates = Object.keys(pairs).filter(function (k) { return pairs[k] > 1; });
        return { ok: controlled.length === 66 && (rows || []).length === expected && expected === 660 && duplicates.length === 0, controlled: controlled.length, rows: (rows || []).length, expected: expected, duplicates: duplicates };
    }
