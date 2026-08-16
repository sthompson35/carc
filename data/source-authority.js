'use strict';
// data/source-authority.js — ranks where a field's value came from so a lower-authority
// source (e.g. an unverified PDF/reference document) can never silently override a
// higher-authority one (the live project's own canonical data or runtime evidence).
var SOURCE_AUTHORITY_RANK = Object.freeze({
    PDF_REFERENCE: 0,
    PROJECT_CONTROLLED_FILE: 1,
    PROJECT_CANONICAL_REGISTRY: 2,
    PROJECT_RUNTIME_EVIDENCE: 3
});
function sourceAuthorityLevel(source) {
    var kind = source && source.kind;
    return SOURCE_AUTHORITY_RANK.hasOwnProperty(kind) ? SOURCE_AUTHORITY_RANK[kind] : -1;
}
// existing: the field's current, already-recorded source. candidate: an incoming value
// proposing to replace it. The candidate is only accepted if its authority meets or
// exceeds the existing source's — never on tie-breaking toward the newcomer.
function resolveSourceConflict(existing, candidate) {
    var levelExisting = sourceAuthorityLevel(existing && existing.source);
    var levelCandidate = sourceAuthorityLevel(candidate && candidate.source);
    var accepted = levelCandidate >= levelExisting;
    var winner = accepted ? candidate : existing;
    var loser = accepted ? existing : candidate;
    var reason = null;
    if (!accepted && loser && loser.source && loser.source.kind === 'PDF_REFERENCE' && winner && winner.source && winner.source.kind !== 'PDF_REFERENCE') {
        reason = 'PDF_REFERENCE_CANNOT_OVERRIDE_PROJECT_FIELD';
    }
    return { accepted: accepted, winner: winner, loser: loser, reason: reason };
}
