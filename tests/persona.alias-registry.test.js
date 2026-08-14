'use strict';
// tests/persona.alias-registry.test.js

module.exports = {
    modules: ['app/util.js', 'data/roster.js', 'persona/mission-doctrine.js', 'persona/alias-registry.js'],
    run: function (ctx, assert) {
        var normalizeIdentity = ctx.normalizeIdentity;
        var resolveCanonicalIdentity = ctx.resolveCanonicalIdentity;
        var auditAliasRegistry = ctx.auditAliasRegistry;
        var ALIAS_STATUS = ctx.ALIAS_STATUS;
        var ALIAS_TYPES = ctx.ALIAS_TYPES;

        // normalizeIdentity
        assert(normalizeIdentity('@barbra') === 'BARBRA', 'normalizeIdentity strips @ and uppercases');
        assert(normalizeIdentity('BARBRA') === 'BARBRA', 'normalizeIdentity leaves an already-normalized value unchanged');
        assert(normalizeIdentity(' @Barbra ') === 'BARBRA', 'normalizeIdentity trims whitespace');
        assert(normalizeIdentity(null) === '', 'normalizeIdentity treats null as empty string');

        var participants = ctx.ROSTER.map(function (r, idx) { return ctx.rosterToParticipant(r, idx); });
        var vex = participants.find(function (p) { return p.callsign === '@VEX'; });
        var mape = participants.find(function (p) { return p.callsign === '@MAPE'; });
        var grant = participants.find(function (p) { return p.callsign === '@GRANT'; });
        var sally = participants.find(function (p) { return p.callsign === '@SALLY'; });

        // resolveCanonicalIdentity precedence: canonical ID > canonical callsign > legacy ID > alias.
        // Construct one key that could plausibly match at multiple tiers if precedence were wrong.
        vex.legacyIds = [{ value: 'LEGACYVEX', normalizedValue: 'LEGACYVEX', type: 'LEGACY_ID', canonicalTargetId: vex.callsignId, status: ALIAS_STATUS.ACTIVE }];
        mape.aliases = [{ value: '@ALIASMAPE', normalizedValue: 'ALIASMAPE', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: mape.callsign, canonicalTargetId: mape.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }];

        assert(resolveCanonicalIdentity(vex.serviceMemberId, participants).id === vex.id, 'tier 1: resolves by canonical serviceMemberId');
        assert(resolveCanonicalIdentity(vex.callsign, participants).id === vex.id, 'tier 2: resolves by canonical callsign');
        assert(resolveCanonicalIdentity('LEGACYVEX', participants).id === vex.id, 'tier 3: resolves by legacy ID');
        assert(resolveCanonicalIdentity('@ALIASMAPE', participants).id === mape.id, 'tier 4: resolves by active-verified alias');

        // Canonical identifiers always outrank aliases — an alias must never shadow a canonical identity.
        var shadow = Object.assign({}, mape, { aliases: [{ value: vex.callsign, normalizedValue: normalizeIdentity(vex.callsign), type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: mape.callsign, canonicalTargetId: mape.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }] });
        var shadowFixture = participants.map(function (p) { return p.id === mape.id ? shadow : p; });
        assert(resolveCanonicalIdentity(vex.callsign, shadowFixture).id === vex.id, 'a real canonical callsign always outranks any alias claiming the same value');

        // Throw contracts
        var threw = null;
        try { resolveCanonicalIdentity('NO_SUCH_IDENTITY', participants); } catch (e) { threw = e; }
        assert(threw && threw.message === 'IDENTITY_NOT_REGISTERED:NO_SUCH_IDENTITY', 'resolveCanonicalIdentity throws IDENTITY_NOT_REGISTERED:<input> for no match');

        var collisionFixture = participants.map(function (p) {
            if (p.id === grant.id) return Object.assign({}, p, { aliases: [{ value: '@DUPE', normalizedValue: 'DUPE', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: p.callsign, canonicalTargetId: p.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }] });
            if (p.id === sally.id) return Object.assign({}, p, { aliases: [{ value: '@DUPE', normalizedValue: 'DUPE', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: p.callsign, canonicalTargetId: p.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }] });
            return p;
        });
        threw = null;
        try { resolveCanonicalIdentity('@DUPE', collisionFixture); } catch (e) { threw = e; }
        assert(threw && threw.message === 'ALIAS_IDENTITY_COLLISION:@DUPE', 'resolveCanonicalIdentity throws ALIAS_IDENTITY_COLLISION:<input> when an alias resolves to multiple members');

        vex.legacyIds = []; mape.aliases = [];

        // auditAliasRegistry — one fixture per rule
        function freshFixture() { return ctx.ROSTER.map(function (r, idx) { return ctx.rosterToParticipant(r, idx); }); }

        // BLOCK: alias equals another member's canonical callsign
        var f1 = freshFixture();
        var owner1 = f1.find(function (p) { return p.callsign === '@GRANT'; });
        owner1.aliases = [{ value: '@SALLY', normalizedValue: 'SALLY', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: owner1.callsign, canonicalTargetId: owner1.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }];
        var r1 = auditAliasRegistry(f1);
        assert(r1.blockers.some(function (b) { return b.code === 'ALIAS_EQUALS_CANONICAL_CALLSIGN'; }), 'BLOCK: alias equal to another canonical callsign');

        // BLOCK: alias resolves to multiple canonical members (collision)
        var f2 = freshFixture();
        var o2a = f2.find(function (p) { return p.callsign === '@GRANT'; });
        var o2b = f2.find(function (p) { return p.callsign === '@SALLY'; });
        o2a.aliases = [{ value: '@DUPE2', normalizedValue: 'DUPE2', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: o2a.callsign, canonicalTargetId: o2a.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }];
        o2b.aliases = [{ value: '@DUPE2', normalizedValue: 'DUPE2', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: o2b.callsign, canonicalTargetId: o2b.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }];
        var r2 = auditAliasRegistry(f2);
        assert(r2.blockers.some(function (b) { return b.code === 'ALIAS_IDENTITY_COLLISION'; }), 'BLOCK: alias resolves to multiple canonical members');

        // BLOCK: canonicalTarget/canonicalTargetId missing
        var f3 = freshFixture();
        var o3 = f3.find(function (p) { return p.callsign === '@GRANT'; });
        o3.aliases = [{ value: '@NOTARGET', normalizedValue: 'NOTARGET', type: ALIAS_TYPES.LEGACY_CALLSIGN, status: ALIAS_STATUS.ACTIVE, verified: true }];
        var r3 = auditAliasRegistry(f3);
        assert(r3.blockers.some(function (b) { return b.code === 'ALIAS_CANONICAL_TARGET_MISSING'; }), 'BLOCK: missing canonicalTarget');
        assert(r3.blockers.some(function (b) { return b.code === 'ALIAS_CANONICAL_TARGET_ID_MISSING'; }), 'BLOCK: missing canonicalTargetId');

        // BLOCK: canonicalTarget and canonicalTargetId disagree
        var f4 = freshFixture();
        var o4 = f4.find(function (p) { return p.callsign === '@GRANT'; });
        var otherTarget4 = f4.find(function (p) { return p.callsign === '@SALLY'; });
        o4.aliases = [{ value: '@MISMATCH', normalizedValue: 'MISMATCH', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: o4.callsign, canonicalTargetId: otherTarget4.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }];
        var r4 = auditAliasRegistry(f4);
        assert(r4.blockers.some(function (b) { return b.code === 'ALIAS_TARGET_ID_MISMATCH'; }), 'BLOCK: canonicalTarget and canonicalTargetId disagree');

        // BLOCK: alias chain (canonicalTarget points at another alias's value, not a real callsign)
        var f5 = freshFixture();
        var o5 = f5.find(function (p) { return p.callsign === '@GRANT'; });
        o5.aliases = [{ value: '@OLD_A', normalizedValue: 'OLD_A', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: '@OLD_B', canonicalTargetId: o5.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }];
        var r5 = auditAliasRegistry(f5);
        assert(r5.blockers.some(function (b) { return b.code === 'ALIAS_CHAIN_OR_UNRESOLVED_TARGET'; }), 'BLOCK: alias chain pointing at another alias instead of a real canonical callsign');

        // BLOCK: same legacy ID assigned to two canonical IDs
        var f6 = freshFixture();
        var o6a = f6.find(function (p) { return p.callsign === '@GRANT'; });
        var o6b = f6.find(function (p) { return p.callsign === '@SALLY'; });
        o6a.legacyIds = [{ value: 'DUPLEGACY', normalizedValue: 'DUPLEGACY', type: 'LEGACY_ID', canonicalTargetId: o6a.callsignId, status: ALIAS_STATUS.ACTIVE }];
        o6b.legacyIds = [{ value: 'DUPLEGACY', normalizedValue: 'DUPLEGACY', type: 'LEGACY_ID', canonicalTargetId: o6b.callsignId, status: ALIAS_STATUS.ACTIVE }];
        var r6 = auditAliasRegistry(f6);
        assert(r6.blockers.some(function (b) { return b.code === 'LEGACY_ID_DUPLICATE_ACROSS_MEMBERS'; }), 'BLOCK: same legacy ID assigned to two canonical IDs');

        // WARN: ACTIVE but unverified
        var f7 = freshFixture();
        var o7 = f7.find(function (p) { return p.callsign === '@GRANT'; });
        o7.aliases = [{ value: '@UNVERIFIED', normalizedValue: 'UNVERIFIED', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: o7.callsign, canonicalTargetId: o7.callsignId, status: ALIAS_STATUS.ACTIVE, verified: false }];
        var r7 = auditAliasRegistry(f7);
        assert(r7.warnings.some(function (w) { return w.code === 'ALIAS_ACTIVE_UNVERIFIED'; }), 'WARN: status ACTIVE but verified !== true');
        assert(!r7.blockers.some(function (b) { return b.code === 'ALIAS_ACTIVE_UNVERIFIED'; }), 'ACTIVE-unverified is a warning, not a blocker');

        // WARN: duplicate alias on the same member
        var f8 = freshFixture();
        var o8 = f8.find(function (p) { return p.callsign === '@GRANT'; });
        o8.aliases = [
            { value: '@SAMETAG', normalizedValue: 'SAMETAG', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: o8.callsign, canonicalTargetId: o8.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true },
            { value: '@SAMETAG', normalizedValue: 'SAMETAG', type: ALIAS_TYPES.LEGACY_CALLSIGN, canonicalTarget: o8.callsign, canonicalTargetId: o8.callsignId, status: ALIAS_STATUS.ACTIVE, verified: true }
        ];
        var r8 = auditAliasRegistry(f8);
        assert(r8.warnings.some(function (w) { return w.code === 'ALIAS_DUPLICATE_ON_MEMBER'; }), 'WARN: same alias duplicated on the same member');

        // A clean fixture (all defaults, no aliases/legacyIds set) passes with zero findings.
        var clean = auditAliasRegistry(freshFixture());
        assert(clean.passed === true && clean.blockers.length === 0 && clean.warnings.length === 0, 'a clean fixture with no aliases/legacyIds passes with zero blockers/warnings');
    }
};
