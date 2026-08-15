
'use strict';
// persona/skills-registry.js — assignment is never verification
var PROFICIENCY = Object.freeze({ AWARENESS:'AWARENESS', FOUNDATION:'FOUNDATION', WORKING:'WORKING', ADVANCED:'ADVANCED', EXPERT:'EXPERT' });
var SKILL_STATUS = Object.freeze({ DEFINED:'DEFINED', ASSIGNED:'ASSIGNED', TRAINING_REQUIRED:'TRAINING_REQUIRED', TRAINING_COMPLETE:'TRAINING_COMPLETE', ASSESSMENT_PENDING:'ASSESSMENT_PENDING', ASSESSED:'ASSESSED', ASSESSMENT_FAILED:'ASSESSMENT_FAILED', VERIFICATION_PENDING:'VERIFICATION_PENDING', VERIFIED:'VERIFIED', VERIFICATION_HOLD:'VERIFICATION_HOLD', VERIFICATION_FAILED:'VERIFICATION_FAILED', REVIEW_DUE:'REVIEW_DUE', EXPIRED:'EXPIRED', SUSPENDED:'SUSPENDED', RETIRED:'RETIRED' });
function skillReviewCurrent(skill, at) {
    at = at || new Date();
    if (!skill || !skill.reviewDueAt) return true;
    var due = new Date(skill.reviewDueAt);
    return !isNaN(due.getTime()) && due.getTime() > at.getTime();
}
function skillSatisfiesMission(skill) {
    return !!(skill && skill.status === SKILL_STATUS.VERIFIED && skill.assessmentId && skill.verifier && skill.verifiedAt && Array.isArray(skill.evidence) && skill.evidence.length && skillReviewCurrent(skill));
}
function verifySkillRecord(skill, attestation) {
    attestation = attestation || {};
    if (!skill) throw new Error('SKILL_REQUIRED');
    if (!attestation.assessmentId) throw new Error('SKILL_ASSESSMENT_REQUIRED');
    if (!attestation.verifier) throw new Error('SKILL_VERIFIER_REQUIRED');
    if (!Array.isArray(attestation.evidence) || !attestation.evidence.length) throw new Error('SKILL_EVIDENCE_REQUIRED');
    var next = Object.assign({}, skill, {
        assessmentId:attestation.assessmentId, evidence:attestation.evidence.slice(), verifier:attestation.verifier,
        verifiedAt:attestation.verifiedAt || new Date().toISOString(), reviewDueAt:attestation.reviewDueAt || null, status:SKILL_STATUS.VERIFIED
    });
    return next;
}
function auditSkills(participants) {
    var blockers=[], warnings=[], seen={};
    (participants || []).forEach(function(p) {
        (p.skills || []).forEach(function(s) {
            if (!s.skillId) blockers.push('Missing skillId: '+(p.callsign||p.id));
            else if (seen[s.skillId]) blockers.push('Duplicate skillId: '+s.skillId); else seen[s.skillId]=true;
            if (!s.name || !s.category || !s.proficiencyTarget || !s.status || !s.sourceRecordId) blockers.push('Incomplete skill record: '+(s.skillId||p.callsign));
            if (s.status === SKILL_STATUS.VERIFIED) {
                if (!s.assessmentId || !s.verifier || !s.verifiedAt || !Array.isArray(s.evidence) || !s.evidence.length) blockers.push('VERIFIED skill lacks evidence/assessment/verifier: '+s.skillId);
                if (!skillReviewCurrent(s)) warnings.push('Skill review due/expired: '+s.skillId);
            }
        });
    });
    return { passed:blockers.length===0, blockers:blockers, warnings:warnings };
}
