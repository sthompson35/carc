'use strict';
// schemas/migrate.js

    function canonicalRosterIndex() {
        var byService = {};
        ROSTER.forEach(function (r, idx) { byService[r.serviceMemberId] = rosterToParticipant(r, idx); });
        return byService;
    }

    function auditCanonicalRegistry(participants) {
        var controlled = participants.filter(function (p) { return !!p.serviceMemberId; });
        var seenService = {}, seenCallsignId = {}, seenCallsign = {}, seenAgent = {}, seenLegacy = {};
        var issues = [];
        controlled.forEach(function (p) {
            if (!p.serviceMemberId) issues.push('Missing Service Member ID: ' + (p.name || p.id));
            if (!p.callsignId) issues.push('Missing Callsign ID: ' + (p.name || p.id));
            if (!p.callsign) issues.push('Missing callsign: ' + (p.name || p.id));
            if (!p.agentId) issues.push('Missing Agent ID: ' + (p.name || p.id));
            if (p.serviceMemberId && !/^ATA-[A-Z0-9_]+-000$/.test(p.serviceMemberId)) issues.push('Invalid Service Member ID format: ' + p.serviceMemberId);
            if (p.callsignId && !/^ATA-SM-[A-Z0-9_]+-001$/.test(p.callsignId)) issues.push('Invalid Callsign ID format: ' + p.callsignId);
            if (p.serviceMemberId) {
                if (seenService[p.serviceMemberId]) issues.push('Duplicate Service Member ID: ' + p.serviceMemberId);
                seenService[p.serviceMemberId] = true;
            }
            if (p.callsignId) {
                if (seenCallsignId[p.callsignId]) issues.push('Duplicate Callsign ID: ' + p.callsignId);
                seenCallsignId[p.callsignId] = true;
            }
            if (p.callsign) {
                var cs = String(p.callsign).toUpperCase();
                if (seenCallsign[cs]) issues.push('Callsign collision: ' + p.callsign);
                seenCallsign[cs] = true;
            }
            if (p.agentId) {
                if (seenAgent[p.agentId]) issues.push('Duplicate Agent ID: ' + p.agentId);
                seenAgent[p.agentId] = true;
            }
            if (p.legacyAlias) {
                if (seenLegacy[p.legacyAlias]) issues.push('Duplicate legacy alias: ' + p.legacyAlias);
                seenLegacy[p.legacyAlias] = true;
            }
        });
        if (controlled.length !== 66) issues.push('Controlled roster count is ' + controlled.length + '; expected 66');
        return { controlled: controlled.length, issues: issues, valid: issues.length === 0 };
    }

    function migrateData(d) {
        d = d || {};
        if (!Array.isArray(d.participants)) d.participants = [];
        if (!Array.isArray(d.conversations)) d.conversations = [];
        if (!Array.isArray(d.rollCalls)) d.rollCalls = [];
        if (!Array.isArray(d.activityLog)) d.activityLog = [];

        // v3.7 conversation reconciliation: retire the synthetic municipal/demo conversation set
        // and seed the CARC/AI Training Academy message index from the conversation-backed baseline.
        var legacyDemoTitles = ['Budget Review Q2','Policy Update Session','Roll Call #3','Strategy Planning','Community Outreach','Roll Call #2','Budget Review Q1','Emergency Session','Roll Call #1'];
        var hasLegacyDemoConversations = d.conversations.some(function (c) { return legacyDemoTitles.indexOf(c.title) >= 0; });
        if ((d.schemaVersion || 0) < 5 || hasLegacyDemoConversations) {
            d.conversations = buildDefaultData().conversations;
        }

        // Remove only the known synthetic/demo participant IDs from earlier CARC builds.
        var demoIds = { p1:1,p2:1,p3:1,p4:1,p5:1,p6:1,p7:1,p8:1,p9:1,p10:1,p11:1,p12:1,c1:1,c2:1,c3:1,c4:1,c5:1,c6:1,c7:1,c8:1,c9:1,c10:1,c11:1,u1:1,u2:1 };
        d.participants = d.participants.filter(function (p) { return !demoIds[p.id]; });

        // Canonical roster is authoritative for controlled identity, role, command and lineage.
        var canonical = canonicalRosterIndex();
        var existingByService = {};
        d.participants.forEach(function (p) { if (p.serviceMemberId) existingByService[p.serviceMemberId] = p; });
        Object.keys(canonical).forEach(function (sid) {
            var source = canonical[sid];
            var target = existingByService[sid];
            if (target) {
                ['name','type','dept','callsign','callsignId','trooper','agentId','serviceMemberId','legacyAlias','role','missionProfile','canonicalStatus','readiness','sourceId'].forEach(function (k) { target[k] = source[k]; });
            } else {
                d.participants.push(source);
            }
        });

        // v3.8 transcript repair: earlier roll calls could claim message counts while persisting an empty messagesList.
        // Backfill only empty Roll Call conversations. These are explicitly LOCAL_RULE_ENGINE responses and never runtime proof.
        if ((d.schemaVersion || 0) < 6) {
            var rollConvs = d.conversations.filter(function (c) { return /^Roll Call #/i.test(c.title || ''); });
            rollConvs.forEach(function (c, idx) {
                if (Array.isArray(c.messagesList) && c.messagesList.length) return;
                var recoveryMessage = idx === 0 ? 'Say hello everyone!' : 'Roll call: report your status.';
                var recoveryTime = c.created || new Date().toISOString();
                c.participantIds = d.participants.map(function (p) { return p.id; });
                c.messagesList = buildRollCallTranscript(recoveryMessage, d.participants, recoveryTime);
                c.messages = c.messagesList.length;
                c.responseMode = 'LOCAL_RULE_ENGINE';
                c.runtimeVerified = false;
                c.recoveredTranscript = true;
            });
            d.rollCalls.forEach(function (r, idx) {
                if (!/^Roll Call #/i.test(r.conv || '')) return;
                if (!r.message) r.message = idx === 0 ? 'Say hello everyone!' : 'Roll call: report your status.';
                r.responseMode = r.responseMode || 'LOCAL_RULE_ENGINE';
                r.runtimeVerified = false;
            });
        }

        d.governance = Object.assign({}, d.governance || {}, {
            canonicalRosterExpected: 66,
            identityState: 'CANONICAL_RECONCILED',
            productionState: 'HOLD',
            productionReason: 'RUNTIME_EVIDENCE_AND_INDEPENDENT_VERIFICATION_REQUIRED',
            lifecycle: 'MISSION_READY',
            release: 'CARC v3.15.0 — Operational Status & Verification Semantics'
        });
        if (!Array.isArray(d.governance.requirements)) d.governance.requirements = [
            { id:'source_access', name:'Governed Source Access', description:'Authoritative sources are registered, permissioned, fresh, and traceable.', status:'PENDING', evidence:'', verifier:'' },
            { id:'permissions', name:'Enforced Permissions', description:'Least-privilege authorization is technically enforced for controlled identities.', status:'PENDING', evidence:'', verifier:'' },
            { id:'workflow', name:'Controlled Workflow', description:'Mission execution follows governed handoffs, gates, ownership, and exception controls.', status:'PENDING', evidence:'', verifier:'' },
            { id:'telemetry', name:'Runtime Telemetry', description:'Real execution telemetry proves deployed component behavior and health.', status:'PENDING', evidence:'', verifier:'' },
            { id:'audit_trail', name:'Audit Trail & Evidence', description:'Actions, decisions, identifiers, timestamps, provenance, and evidence are retained.', status:'PENDING', evidence:'', verifier:'' },
            { id:'independent_verification', name:'Independent Verification', description:'HELIX/TANGO or equivalent independent assurance verifies production claims.', status:'PENDING', evidence:'', verifier:'' }
        ];
        if (!Array.isArray(d.governance.ledger)) d.governance.ledger = [{ time:new Date().toISOString(), type:'release', text:'CARC v3.8.0 verified transcript and broadcast response engine initialized.' }];
        if (!d.runtimeCanary) d.runtimeCanary = {
            targetServiceMemberId:'ATA-VEX-000',
            state:'NOT_RUN',
            lastExecutionId:'',
            lastRun:'',
            authorization:'NOT_EVALUATED',
            executionResult:'NOT_RUN',
            runtimeVerified:false,
            independentVerification:'PENDING',
            telemetry:[],
            evidence:[],
            executions:[]
        };
        if (!Array.isArray(d.runtimeCanary.telemetry)) d.runtimeCanary.telemetry = [];
        if (!Array.isArray(d.runtimeCanary.evidence)) d.runtimeCanary.evidence = [];
        if (!Array.isArray(d.runtimeCanary.executions)) d.runtimeCanary.executions = [];

        d.registryAudit = auditCanonicalRegistry(d.participants);
        if ((d.schemaVersion || 0) < 7) {
            d.governance.release = 'CARC v3.9.0 — Conversational Broadcast & Persisted Response Engine';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({ time:new Date().toISOString(), type:'release', text:'CARC v3.9.0 added conversational group-intent detection and persisted member-by-member responses from Agent Chat and Conversation messages.' });
        }
        if ((d.schemaVersion || 0) < 8) {
            var rosterByService = {};
            ROSTER.forEach(function (r) { rosterByService[r.serviceMemberId] = r; });
            d.participants.forEach(function (p) {
                var rr = rosterByService[p.serviceMemberId];
                if (rr) p.missionProfile = missionProfileForRoster(rr);
            });
            d.governance.release = 'CARC v3.10.0 — Mission Doctrine & Duty Registry';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({ time:new Date().toISOString(), type:'release', text:'CARC v3.10.0 assigned every controlled identity a mission profile covering role, purpose, mission, duties, recurring tasks, outputs, operating doctrine, authority basis, and production-verification rule.' });
        }
        if ((d.schemaVersion || 0) < 9) {
            var broadcastRepair = { conversations:0, removedDuplicateLocalResponses:0, generatedCurrentResponses:0 };
            d.conversations.forEach(function (c) {
                var repaired = reconcileLocalBroadcastConversation(c, d.participants);
                if (repaired.changed) {
                    broadcastRepair.conversations += 1;
                    broadcastRepair.removedDuplicateLocalResponses += repaired.removed;
                    broadcastRepair.generatedCurrentResponses += repaired.generated;
                }
            });
            // Recalculate the aggregate from the actual persisted conversation source of truth.
            d.totalMessages = d.conversations.reduce(function (sum, c) {
                if (Array.isArray(c.messagesList)) { c.messages = c.messagesList.length; return sum + c.messagesList.length; }
                return sum + (Number(c.messages) || 0);
            }, 0);
            d.governance.release = 'CARC v3.15.0 — Operational Status & Verification Semantics';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'reconciliation',
                text:'CARC v3.15.0 reconciled operational status and production-verification semantics; broadcast transcript reconciliation removed ' + broadcastRepair.removedDuplicateLocalResponses + ' duplicate/stale local responses, generated ' + broadcastRepair.generatedCurrentResponses + ' current canonical responses, and enforced one response per active identity per broadcast.'
            });
        }
        if ((d.schemaVersion || 0) < 10) {
            var statusRepair = { conversations:0, removed:0, generated:0 };
            d.participants.forEach(function (p) {
                if (p.readiness === 'PENDING_RUNTIME_EVIDENCE' || !p.readiness) p.readiness = 'MISSION_READY';
            });
            d.conversations.forEach(function (c) {
                var repairedStatus = reconcileLocalBroadcastConversation(c, d.participants);
                if (repairedStatus.changed) {
                    statusRepair.conversations += 1;
                    statusRepair.removed += repairedStatus.removed;
                    statusRepair.generated += repairedStatus.generated;
                }
                if (Array.isArray(c.messagesList)) c.messages = c.messagesList.length;
            });
            d.totalMessages = d.conversations.reduce(function (sum, c) {
                return sum + (Array.isArray(c.messagesList) ? c.messagesList.length : (Number(c.messages) || 0));
            }, 0);
            d.governance.release = 'CARC v3.15.0 — Unified Canonical Status Formatter';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'reconciliation',
                text:'CARC v3.15.0 unified Agent Chat, roll-call generation, and transcript reconciliation on one canonical status formatter: MISSION_READY operational state; NOT_RUNTIME_VERIFIED production verification until all production gates pass; HOLD retained only as the separate gate decision. Reconciled ' + statusRepair.conversations + ' stored conversation(s).'
            });
        }
        if ((d.schemaVersion || 0) < 12) {
            d.governance.endpoint = d.governance.endpoint || { url:'', tokenSet:false };
            d.governance.release = 'CARC v3.16.0 — External Runtime Endpoint';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({ time:new Date().toISOString(), type:'architecture', text:'CARC v3.16.0 added External Runtime Endpoint: configure a governed runtime URL + bearer token, test the connection, and submit canary evidence for independent external verification to satisfy production gates.' });
        }
        if ((d.schemaVersion || 0) < 11) {
            d.runtimeCanary = d.runtimeCanary || {
                targetServiceMemberId:'ATA-VEX-000',
                state:'NOT_RUN',
                lastExecutionId:'',
                lastRun:'',
                authorization:'NOT_EVALUATED',
                executionResult:'NOT_RUN',
                runtimeVerified:false,
                independentVerification:'PENDING',
                telemetry:[],
                evidence:[],
                executions:[]
            };
            d.governance.release = 'CARC v3.15.0 — Runtime Execution & Evidence Canary';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'architecture',
                text:'CARC v3.15.0 established the single-agent Runtime Execution & Evidence Plane canary contract: authorization → mission resolution → execution ID → telemetry → evidence → independent verification. Local canary output remains NOT_RUNTIME_VERIFIED.'
            });
        }
        if ((d.schemaVersion || 0) < 13) {
            d.governance.release = 'CARC v3.17.0 — Admin Dashboard & Canary CSV';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({ time:new Date().toISOString(), type:'architecture', text:'CARC v3.17.0 added Open Admin shortcut on Governance page and canary execution CSV export.' });
        }
        if ((d.schemaVersion || 0) < 14) {
            d.governance.release = 'CARC v3.18.0 — System-Managed Independent Verification & Registry Sweep';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'architecture',
                text:'CARC v3.18.0 closed a self-attestation gap: the Independent Verification production requirement is now system-managed and can only reach VERIFIED via a real external verifier response (never by manually typing evidence text). Added a registry-wide canary authorization sweep (all 66 identities in one action), a sortable Canary Execution History table, and real gate-progress numbers on the Dashboard Needs Attention panel.'
            });
        }
        if ((d.schemaVersion || 0) < 15) {
            if (!d.settings) d.settings = { defaultPageSize: 8 };
            (d.activityLog || []).forEach(function (e) { if (e && !e.at) e.at = new Date().toISOString(); });
            d.governance.release = 'CARC v3.20.0 — Admin Control Center';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'architecture',
                text:'CARC v3.20.0 added a dedicated Admin page: system overview, preferences, participant type/role registry, data export/import, a full sortable Activity/Audit Log, and danger-zone data controls.'
            });
        }
        if ((d.schemaVersion || 0) < 16) {
            // Migration-safe: uses the local `d` parameter only, never the global DATA — calling
            // anything that touches global DATA here would reintroduce the exact crash fixed in
            // v3.19.0 (governanceGateState() reached mid-migration while DATA is still undefined).
            var registryCheckV16 = auditCanonicalRegistry(d.participants);
            d.participants.forEach(function (p) {
                if (!p.serviceMemberId) return;
                var eligible = p.status === 'active' && p.serviceMemberId && p.callsignId && p.agentId && p.missionProfile && p.missionProfile.mission && registryCheckV16.valid;
                p.readiness = eligible ? 'MISSION_READY' : 'READINESS_UNKNOWN';
            });
            d.governance.release = 'CARC v3.22.0 — Individual Readiness & Production Verification Reconciliation';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'reconciliation',
                text:'CARC v3.22.0 corrected a conflation bug: individual readiness and per-identity production verification were derived from the global governance gate alone, so all 66 identities would falsely inherit MISSION_READY/PRODUCTION_VERIFIED the moment the system-wide gate completed, regardless of whether that specific identity had ever been through a runtime canary. Readiness now defaults to READINESS_UNKNOWN and requires structural evidence (canonical identity, mission profile, active status, registry integrity) to reach MISSION_READY; PRODUCTION_VERIFIED additionally requires an individually runtime-verified canary execution for that exact identity.'
            });
        }
        if ((d.schemaVersion || 0) < 17) {
            // Migration-safe: only touches the local `d` parameter (see the v16 comment above —
            // buildDefaultKnowledgePath() never reads global DATA). Never overwrites existing
            // progress — only backfills participants that don't already have a knowledgePath.
            d.participants.forEach(function (p) {
                if (!p.serviceMemberId) return;
                if (!p.knowledgePath) p.knowledgePath = buildDefaultKnowledgePath();
            });
            d.governance.release = 'CARC v3.23.0 — Canonical Knowledge-Path Registry';
            d.governance.ledger = d.governance.ledger || [];
            d.governance.ledger.unshift({
                time:new Date().toISOString(),
                type:'architecture',
                text:'CARC v3.23.0 added a canonical knowledge-path registry: every controlled identity now carries an honest, per-identity 10-stage pipeline (competencies → curriculum modules → governed sources → tools → permissions → exercises → assessment → certification → mission eligibility → review acknowledgement). Each stage starts PENDING and requires genuine evidence and a named verifier to reach VERIFIED — mission eligibility is the one exception, computed automatically from the 8 prerequisite stages rather than manually attested. No content is pre-filled; the pipeline starts empty for all 66 identities.'
            });
        }
        d.schemaVersion = 17;
        return d;
    }
