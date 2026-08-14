'use strict';
// persona/identity-profiles.js

    // PERSONA, COMMUNICATION_PROFILE, and HANDOFF_PROFILE have zero backing data anywhere in
    // this app — no tone/voice concept, no channel/escalation concept, no handoff-record
    // structure. Rather than inventing asymmetric fields for each (a fabricated taxonomy where
    // none exists), all three share the identical honest-empty vocabulary already established
    // twice (DATA.governance.requirements, persona/knowledge-path.js's stages): status starts
    // PENDING and requires genuine evidence + a named verifier to reach VERIFIED. Nothing here
    // is pre-filled content.
    var IDENTITY_PROFILE_DEFS = [
        { key: 'personaProfile', name: 'Persona', description: "This identity's approved voice, tone, and behavioral persona basis — undefined until a real, sourced definition is recorded." },
        { key: 'communicationProfile', name: 'Communication Profile', description: "This identity's approved communication routing, channel, and escalation basis — undefined until a real, sourced definition is recorded." },
        { key: 'handoffProfile', name: 'Handoff Profile', description: "This identity's approved cross-domain handoff protocol basis — undefined until a real, sourced definition is recorded." }
    ];

    function buildDefaultIdentityProfile() {
        return { status: 'PENDING', evidence: '', verifier: '' };
    }

    // Pure — takes only the participant, never touches global DATA.
    function evaluateIdentityProfilesState(p) {
        var defined = IDENTITY_PROFILE_DEFS.filter(function (def) { return p && p[def.key] && p[def.key].status === 'VERIFIED'; }).length;
        return { total: IDENTITY_PROFILE_DEFS.length, defined: defined, complete: defined === IDENTITY_PROFILE_DEFS.length };
    }
