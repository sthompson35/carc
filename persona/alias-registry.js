'use strict';
// persona/alias-registry.js

    var ALIAS_STATUS = Object.freeze({ PROPOSED:'PROPOSED', SOURCE_VALIDATED:'SOURCE_VALIDATED', ACTIVE:'ACTIVE', DEPRECATED:'DEPRECATED', EXPIRED:'EXPIRED', RETIRED:'RETIRED', BLOCKED:'BLOCKED' });

    // LEGACY_ID is deliberately not in this enum — it's the fixed `type` value used only inside
    // legacyIds[] entries, a separate namespace from aliases[].
    var ALIAS_TYPES = Object.freeze({ LEGACY_CALLSIGN:'LEGACY_CALLSIGN', FORMER_CALLSIGN:'FORMER_CALLSIGN', HISTORICAL_NAME:'HISTORICAL_NAME', IMPORT_ALIAS:'IMPORT_ALIAS' });

    function normalizeIdentity(input) {
        return String(input == null ? '' : input).trim().toUpperCase().replace(/^@/, '');
    }

    function aliasParticipantsOrDefault(participants) {
        return participants || (typeof DATA !== 'undefined' && DATA ? DATA.participants : []) || [];
    }

    // Tier 1: canonical ID fields. Covers the same ID set admin.js's toolIdLookup already
    // treats as equivalent (serviceMemberId, callsignId, agentId, sourceId) so wiring the
    // resolver in there is a like-for-like upgrade, not a behavior narrowing.
    function findCanonicalId(key, participants) {
        return aliasParticipantsOrDefault(participants).find(function (p) {
            return [p.serviceMemberId, p.callsignId, p.agentId, p.sourceId].some(function (v) { return v && normalizeIdentity(v) === key; });
        }) || null;
    }

    // Tier 2: real canonical callsign.
    function findCanonicalCallsign(key, participants) {
        return aliasParticipantsOrDefault(participants).find(function (p) { return p.callsign && normalizeIdentity(p.callsign) === key; }) || null;
    }

    // Tier 3: legacyIds[] — defensive `p.legacyIds || []` since not every participant in every
    // code path is guaranteed to have been through the v19 migration.
    function findLegacyId(key, participants) {
        var match = null;
        aliasParticipantsOrDefault(participants).some(function (p) {
            var hit = (p.legacyIds || []).some(function (l) { return l && normalizeIdentity(l.normalizedValue || l.value) === key; });
            if (hit) { match = p; return true; }
            return false;
        });
        return match;
    }

    // Tier 4: ACTIVE + verified===true aliases only — "active verified" is this exact
    // conjunction, not just any status. Returns an array so the caller decides
    // collision vs single-match vs no-match.
    function findActiveVerifiedAliases(key, participants) {
        var out = [];
        aliasParticipantsOrDefault(participants).forEach(function (p) {
            (p.aliases || []).forEach(function (a) {
                if (a && a.status === ALIAS_STATUS.ACTIVE && a.verified === true && normalizeIdentity(a.normalizedValue || a.value) === key) out.push(p);
            });
        });
        return out;
    }

    // Pure identity lookup only — no status/readiness/authorization checks. Callers that need
    // "resolved AND authorized/active" (e.g. canary execution) must call
    // evaluateCanaryAuthorization separately on the returned participant. Canonical identifiers
    // always outrank aliases; an alias must never shadow a canonical identity.
    function resolveCanonicalIdentity(input, participantsOverride) {
        var participants = aliasParticipantsOrDefault(participantsOverride);
        var key = normalizeIdentity(input);
        var canonicalIdMatch = findCanonicalId(key, participants);
        if (canonicalIdMatch) return canonicalIdMatch;
        var callsignMatch = findCanonicalCallsign(key, participants);
        if (callsignMatch) return callsignMatch;
        var legacyIdMatch = findLegacyId(key, participants);
        if (legacyIdMatch) return legacyIdMatch;
        var aliasMatches = findActiveVerifiedAliases(key, participants);
        if (aliasMatches.length > 1) throw new Error('ALIAS_IDENTITY_COLLISION:' + input);
        if (aliasMatches.length === 1) return aliasMatches[0];
        throw new Error('IDENTITY_NOT_REGISTERED:' + input);
    }

    // Full checkable validation policy. Returns {passed, blockers, warnings}; blocker/warning
    // objects carry {code, alias, aliasOwner} always, plus canonicalTarget/
    // conflictingCanonicalOwner where relevant to that rule. Never calls resolveCanonicalIdentity
    // internally — that would recursively hide the very problems this is meant to catch — uses
    // the tier-2 primitive (findCanonicalCallsign) directly instead.
    function auditAliasRegistry(participants) {
        var list = aliasParticipantsOrDefault(participants);
        var blockers = [], warnings = [];
        var now = Date.now();
        var activeVerifiedIndex = {};

        list.forEach(function (owner) {
            var ownerLabel = owner.callsign || owner.serviceMemberId || owner.id;
            var seenOnMember = {};
            (owner.aliases || []).forEach(function (a) {
                if (!a) return;
                var aliasKey = normalizeIdentity(a.normalizedValue || a.value);

                if (seenOnMember[aliasKey]) warnings.push({ code:'ALIAS_DUPLICATE_ON_MEMBER', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel });
                seenOnMember[aliasKey] = true;

                if (!a.canonicalTarget) blockers.push({ code:'ALIAS_CANONICAL_TARGET_MISSING', alias:a.value, aliasOwner:ownerLabel });
                if (!a.canonicalTargetId) blockers.push({ code:'ALIAS_CANONICAL_TARGET_ID_MISSING', alias:a.value, aliasOwner:ownerLabel });

                // Chain prevention: canonicalTarget must resolve via a REAL canonical callsign,
                // never via another alias's value — findCanonicalCallsign only ever matches
                // p.callsign, so @OLD_A -> @OLD_B -> @BARBARA can never resolve.
                var resolvedTarget = a.canonicalTarget ? findCanonicalCallsign(normalizeIdentity(a.canonicalTarget), list) : null;
                if (a.canonicalTarget && !resolvedTarget) blockers.push({ code:'ALIAS_CHAIN_OR_UNRESOLVED_TARGET', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel });

                if (resolvedTarget && a.canonicalTargetId && resolvedTarget.callsignId !== a.canonicalTargetId)
                    blockers.push({ code:'ALIAS_TARGET_ID_MISMATCH', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel, conflictingCanonicalOwner:resolvedTarget.callsign });

                var callsignConflict = findCanonicalCallsign(aliasKey, list);
                if (callsignConflict && callsignConflict !== owner)
                    blockers.push({ code:'ALIAS_EQUALS_CANONICAL_CALLSIGN', alias:a.value, aliasOwner:ownerLabel, conflictingCanonicalOwner:callsignConflict.callsign });

                if (!a.sourceRecordId) warnings.push({ code:'ALIAS_SOURCE_RECORD_MISSING', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel });
                if (a.status === ALIAS_STATUS.ACTIVE && a.verified !== true) warnings.push({ code:'ALIAS_ACTIVE_UNVERIFIED', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel });
                if (a.validTo && new Date(a.validTo).getTime() < now) warnings.push({ code:'ALIAS_EXPIRED', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel });
                if (a.validFrom && new Date(a.validFrom).getTime() > now) warnings.push({ code:'ALIAS_NOT_YET_ACTIVE', alias:a.value, canonicalTarget:a.canonicalTarget, aliasOwner:ownerLabel });

                if (a.status === ALIAS_STATUS.ACTIVE && a.verified === true) {
                    activeVerifiedIndex[aliasKey] = activeVerifiedIndex[aliasKey] || [];
                    activeVerifiedIndex[aliasKey].push({ owner:owner, alias:a });
                }
            });
        });

        Object.keys(activeVerifiedIndex).forEach(function (key) {
            var entries = activeVerifiedIndex[key];
            if (entries.length > 1) entries.forEach(function (entry) {
                var others = entries.filter(function (e) { return e.owner !== entry.owner; }).map(function (e) { return e.owner.callsign; }).join(', ');
                blockers.push({ code:'ALIAS_IDENTITY_COLLISION', alias:entry.alias.value, aliasOwner:entry.owner.callsign, conflictingCanonicalOwner:others });
            });
        });

        var legacyIndex = {};
        list.forEach(function (owner) {
            (owner.legacyIds || []).forEach(function (l) {
                if (!l) return;
                var lKey = normalizeIdentity(l.normalizedValue || l.value);
                legacyIndex[lKey] = legacyIndex[lKey] || [];
                legacyIndex[lKey].push({ owner:owner, legacy:l });
            });
        });
        Object.keys(legacyIndex).forEach(function (key) {
            var entries = legacyIndex[key];
            var distinctTargets = {};
            entries.forEach(function (e) { distinctTargets[e.legacy.canonicalTargetId || e.owner.callsignId] = 1; });
            if (Object.keys(distinctTargets).length > 1) entries.forEach(function (entry) {
                var others = entries.filter(function (e) { return e.owner !== entry.owner; }).map(function (e) { return e.owner.callsign; }).join(', ');
                blockers.push({ code:'LEGACY_ID_DUPLICATE_ACROSS_MEMBERS', alias:entry.legacy.value, aliasOwner:entry.owner.callsign, conflictingCanonicalOwner:others });
            });
        });

        return { passed: blockers.length === 0, blockers: blockers, warnings: warnings };
    }

    // Collapses the 7-value ALIAS_STATUS lifecycle onto the 4 existing badge-pill classes
    // rather than adding new CSS for a feature with no real data to justify it yet.
    var ALIAS_STATUS_BADGE_CLASS = { ACTIVE:'badge-active', PROPOSED:'badge-inactive', SOURCE_VALIDATED:'badge-inactive', BLOCKED:'badge-inactive', DEPRECATED:'badge-archived', EXPIRED:'badge-archived', RETIRED:'badge-archived' };

    function aliasStatusBadgeClass(status) {
        return ALIAS_STATUS_BADGE_CLASS[status] || 'badge-inactive';
    }
