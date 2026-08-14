'use strict';
// persona/mission-doctrine.js

    function mapRosterKind(kind) {
        if (kind.indexOf('ASSISTANT') !== -1) return 'assistant';
        if (kind === 'TROOPER') return 'trooper';
        if (kind === 'AI AGENT') return 'agent';
        return 'bot';
    }
    // ================================================================
    // MISSION DOCTRINE & DUTY REGISTRY
    // Detailed profiles are either CONVERSATION_CONFIRMED or ROLE_DERIVED_WORKING.
    // ROLE_DERIVED_WORKING is operational guidance, not an approved-source claim.
    // ================================================================

    var UNIVERSAL_OPERATING_DOCTRINE = {
        missionIntake: 'Receive mission orders; validate scope, identity, authority, sources, dependencies, permissions, and freshness before execution.',
        reasoning: 'Separate FACT / INFERENCE / ASSUMPTION / UNKNOWN. Never fabricate missing evidence or silently reconcile conflicting sources.',
        execution: 'Execute only within delegated authority; preserve identifiers, timestamps, source references, decisions, lineage, provenance, evidence, and conflicts.',
        handoff: 'Hand off cross-domain work with context, owner, dependencies, evidence, and recipient acknowledgement.',
        stopConditions: 'Stop or escalate on missing authority, failed validation, unresolved source conflict, permission failure, unsafe instruction, or absent required evidence.',
        completion: 'Return outcome, evidence, residual risk, next action, action owner, status, and verification state.'
    };


    var CONFIRMED_MISSION_PROFILES = {
        'ATA-GRANT-000': {
            authority:'CONVERSATION_CONFIRMED',
            purpose:'Identify and secure legitimate external funding aligned with approved Dynasty missions.',
            mission:'Discover, qualify, structure, coordinate, and govern compliant external funding opportunities from authoritative sources.',
            duties:['Discover funding','Verify applicant and project eligibility','Analyze funding notices and scoring criteria','Map requirements, prohibited activities, match/cost-share, registrations, attachments, and compliance obligations','Build funding strategies and compliant funding stacks','Coordinate application plans, evidence owners, deadlines, and supported claims','Govern post-award obligations and readiness'],
            tasks:['Identify project, applicant entity, location, project type, beneficiaries, total project cost, funding need, and project stage','Search authoritative funding sources','Capture funding program, authority, deadline, eligible applicants and activities, award range, reimbursement structure, period of performance, geographic restrictions, required attachments, environmental/procurement/compliance obligations','Determine eligibility, competitiveness, readiness, and funding gap'],
            outputs:['Funding opportunity record','Eligibility determination','Competitiveness/readiness assessment','Funding stack strategy','Application plan','Evidence-owner matrix','Deadline register','Post-award compliance register']
        },
        'ATA-SALLY-000': {
            authority:'CONVERSATION_CONFIRMED',
            purpose:'Maintain executive administrative control and continuity across incoming correspondence, approvals, signatures, actions, and deadlines.',
            mission:'Control executive administrative intake, routing, follow-up, action tracking, signature/approval coordination, meeting actions, deadlines, and briefing continuity.',
            duties:['Correspondence intake','Executive administrative control','Action-item tracking','Document routing','Signature coordination','Approval tracking','Administrative follow-up','Meeting action capture','Deadline control','Executive briefing preparation','Administrative continuity'],
            tasks:['Register incoming correspondence','Assign routing and action owner','Track approvals and signatures','Capture meeting actions and due dates','Escalate overdue administrative actions','Prepare executive status/briefing summaries'],
            outputs:['Correspondence register','Action-item register','Approval/signature tracker','Meeting action log','Deadline register','Executive briefing package']
        },
        'ATA-MAPE-000': {
            authority:'CONVERSATION_CONFIRMED',
            purpose:'Convert strategic priorities and operating objectives into governed programs, projects, milestones, dependencies, stage gates, and benefits realization.',
            mission:'Own the enterprise portfolio-control layer from program architecture through project closure, benefits realization, and lessons learned.',
            duties:['Program Portfolio','Project Portfolio','Enterprise Roadmap','Program Structure','Project Charters','Milestone Governance','Stage Gates','Dependency Register','Critical Path','Schedule Baseline and Variance','Deliverable Register','RAID Register','Change Control','Resource Conflicts','Cross-Program Coordination','Program Status','Portfolio Prioritization Support','Benefits Realization','Project Closure','Lessons Learned'],
            tasks:['Translate operating objectives into program/project structures','Establish milestones and stage gates','Maintain dependencies and critical path','Control schedule baselines and variance','Coordinate cross-program conflicts and change requests','Track deliverables, RAID, benefits, closure, and lessons learned'],
            outputs:['Program portfolio','Project portfolio','Enterprise roadmap','Program/project charters','Milestone and stage-gate register','Dependency/critical-path register','Schedule baseline/variance report','RAID and change-control registers','Benefits realization and closure records']
        }
    };


    function roleDerivedMissionProfile(r) {
        var role = r.role || 'Controlled Service Member';
        var command = r.command || 'Academy Operations';
        return {
            authority:'ROLE_DERIVED_WORKING',
            purpose:'Provide governed ' + role + ' capability for ' + command + '.',
            mission:'Execute ' + role + ' missions assigned through ' + command + ' while preserving governance, evidence, lineage, permissions, and controlled handoffs.',
            duties:[
                'Own the ' + role + ' domain within delegated authority',
                'Validate mission scope, source authority, permissions, dependencies, and freshness',
                'Perform domain analysis and controlled execution',
                'Preserve evidence, provenance, identifiers, decisions, and exceptions',
                'Coordinate cross-domain handoffs and escalate unresolved blockers',
                'Report outcome, residual risk, next action, owner, and verification state'
            ],
            tasks:[
                'Accept and classify incoming mission orders relevant to ' + role,
                'Validate required inputs and authoritative sources',
                'Execute the domain workflow or produce an evidence-backed recommendation',
                'Record decisions, assumptions, unknowns, dependencies, and evidence',
                'Hand off work outside the assigned domain with complete context',
                'Close the mission only when completion criteria and required proof are recorded'
            ],
            outputs:[
                role + ' mission record',
                'Evidence-backed analysis or deliverable',
                'Decision / recommendation with status',
                'Exception and residual-risk record',
                'Next-action and owner assignment',
                'Verification-ready evidence package'
            ]
        };
    }


    function missionProfileForRoster(r) {
        var p = CONFIRMED_MISSION_PROFILES[r.serviceMemberId] || roleDerivedMissionProfile(r);
        return {
            authority:p.authority,
            role:r.role,
            command:r.command,
            purpose:p.purpose,
            mission:p.mission,
            duties:p.duties.slice(),
            tasks:p.tasks.slice(),
            outputs:p.outputs.slice(),
            operatingDoctrine:Object.assign({}, UNIVERSAL_OPERATING_DOCTRINE),
            productionRule:'MISSION_READY does not equal PRODUCTION_VERIFIED. Runtime claims require governed source access, enforced permissions, controlled workflow, telemetry, audit evidence, and independent verification.',
            profileStatus:p.authority === 'CONVERSATION_CONFIRMED' ? 'CONFIRMED' : 'WORKING_PROFILE_REVIEW_REQUIRED'
        };
    }


    function rosterToParticipant(r, idx) {
        var callsignCode = String(r.callsign || '').replace(/^@/, '');
        var isTrooper = r.kind === 'TROOPER';
        return {
            id: 'r-' + r.serviceMemberId,
            name: r.displayName,
            type: mapRosterKind(r.kind),
            dept: r.command,
            status: 'active',
            joined: '2025-09-01',
            lastActive: minsAgo((idx % 14) * 19 + 5),
            callsign: r.callsign,
            callsignId: 'ATA-SM-' + callsignCode + '-001',
            trooper: isTrooper ? callsignCode : '',
            agentId: r.agentId || r.serviceMemberId,
            serviceMemberId: r.serviceMemberId,
            legacyAlias: r.legacy || '',
            role: r.role,
            missionProfile: missionProfileForRoster(r),
            canonicalStatus: 'CANONICAL_RECONCILED',
            readiness: 'READINESS_UNKNOWN',
            sourceId: r.serviceMemberId,
            aliases: [],
            legacyIds: []
        };
    }

    // ================================================================
    // DEFAULT DATA
    // ================================================================
