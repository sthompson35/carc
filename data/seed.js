'use strict';
// data/seed.js

    function buildDefaultData() {
        return {
            participants: ROSTER.map(rosterToParticipant),
            conversations: [
                { id: 'conv01', title: 'AI Training Academy — Canonical Registry Audit', messages: 1, created: daysAgo(19), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'Did every AI AGENTS, TROOPERS & SERVICE MEMBERS get a unique canonical ID?', time: daysAgo(19) }] },
                { id: 'conv02', title: 'Canonical Reconciliation & Production Gate', messages: 1, created: daysAgo(18), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'Fix all canonical reconciliation and role/callsign collision control, governance-level inconsistency.', time: daysAgo(18) }] },
                { id: 'conv03', title: 'README Authorization & Preservation', messages: 1, created: daysAgo(17), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'I don\'t want to lose the information from the original README.md! I do need an Updated README.md authorization covers all four.', time: daysAgo(17) }] },
                { id: 'conv04', title: 'CARC v3.5.0 — Canonical Role Reconciliation & Production Gate', messages: 1, created: daysAgo(16), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'Next release be CARC v3.5.0 — Canonical Role Reconciliation & Production Gate.', time: daysAgo(16) }] },
                { id: 'conv05', title: 'AI Training Description', messages: 1, created: daysAgo(15), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'ai-training description in three hundred characters', time: daysAgo(15) }] },
                { id: 'conv06', title: 'AI Agents Training Overview', messages: 1, created: daysAgo(14), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'What is your role, purpose, mission, & prompts', time: daysAgo(14) }] },
                { id: 'conv07', title: 'Grant Funding Watch', messages: 1, created: daysAgo(13), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'Identify and secure legitimate external funding aligned with approved Dynasty missions.', time: daysAgo(13) }] },
                { id: 'conv08', title: 'Sally — Executive Administrative Control', messages: 1, created: daysAgo(12), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: 'correspondence intake; executive administrative control; action-item tracking; document routing; signature coordination; approval tracking; administrative follow-up; meeting action capture; deadline control; executive briefing preparation; administrative continuity', time: daysAgo(12) }] },
                { id: 'conv09', title: 'TROOPER_ALPHA Mission Profile', messages: 1, created: daysAgo(11), status: 'completed', participantIds: [], messagesList: [{ role: 'user', text: '@TROOPER_ALPHA: What is your role, purpose, mission, & prompts', time: daysAgo(11) }] },
                { id: 'conv10', title: 'CARC — All Messages Reconciliation', messages: 1, created: daysAgo(10), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'This you, check all massages', time: daysAgo(10) }] },
                { id: 'conv11', title: 'CARC Evidence Classification', messages: 1, created: daysAgo(9), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'Separate them into confirmed from our prior work, confirmed in the project files, changed/superseded, and not verified.', time: daysAgo(9) }] },
                { id: 'conv12', title: 'CARC v3.5.0 Fix Pass', messages: 1, created: daysAgo(8), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'CONTINUE WITH ALL FIX\'S. So the index.html matches the conversation.', time: daysAgo(8) }] },
                { id: 'conv13', title: 'CARC v3.6.0 Enhancements', messages: 1, created: daysAgo(7), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'Add all enhancements &features', time: daysAgo(7) }] },
                { id: 'conv14', title: 'Annual Planning', messages: 1, created: daysAgo(6), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'Annual Planning', time: daysAgo(6) }] },
                { id: 'conv15', title: 'CARC — All Messages', messages: 1, created: daysAgo(5), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'all messages', time: daysAgo(5) }] },
                { id: 'conv16', title: 'AI Training Academy — Sprint Database', messages: 1, created: daysAgo(4), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'Add sprint 1 - 3 to the AI Training -Database', time: daysAgo(4) }] },
                { id: 'conv17', title: 'CARC index.html Analysis', messages: 1, created: daysAgo(3), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'Give me a detailed summary book report an analysis of index.html', time: daysAgo(3) }] },
                { id: 'conv18', title: 'Dynamic Raw Data Integration', messages: 1, created: daysAgo(2), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'Make it fully dynamic so it pulls raw data', time: daysAgo(2) }] },
                { id: 'conv19', title: 'AI Training Academy Database Standards', messages: 1, created: daysAgo(1), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'This the AI Training Academy - Database transform it to match AI Training Academy Standards.', time: daysAgo(1) }] },
                { id: 'conv20', title: 'CARC GO-LIVE', messages: 1, created: daysAgo(0), status: 'active', participantIds: [], messagesList: [{ role: 'user', text: 'GO-LIVE: push code, build/push images, deploy to Kubernetes, verify deployment, and run health/smoke checks.', time: daysAgo(0) }] }
            ],
            rollCalls: [
                { id: 'rc1', date: daysAgo(1), conv: 'Roll Call #3', present: 8, total: 12, rate: 66.7, status: 'completed' },
                { id: 'rc2', date: daysAgo(2), conv: 'Roll Call #2', present: 10, total: 12, rate: 83.3, status: 'completed' },
                { id: 'rc3', date: daysAgo(5), conv: 'Roll Call #1', present: 11, total: 12, rate: 91.7, status: 'completed' },
                { id: 'rc4', date: daysAgo(7), conv: 'Roll Call #0', present: 9, total: 12, rate: 75.0, status: 'completed' }
            ],
            activityLog: [
                { time: nowTime(), at: new Date().toISOString(), event: 'Dashboard initialized', status: 'info' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Alpha joined conversation', status: 'success' },
                { time: nowTime(), at: new Date().toISOString(), event: 'New conversation: Budget Review Q2', status: 'success' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Senator Smith marked present', status: 'success' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Roll call started #3', status: 'warning' },
                { time: nowTime(), at: new Date().toISOString(), event: 'System health check passed', status: 'success' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Gamma analyzed 47 messages', status: 'success' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Data export completed', status: 'success' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Councilor Lee excused', status: 'warning' },
                { time: nowTime(), at: new Date().toISOString(), event: 'Daily standup started', status: 'info' }
            ],
            messageActivity: [
                { hour: '00:00', count: 2 }, { hour: '02:00', count: 0 }, { hour: '04:00', count: 0 }, { hour: '06:00', count: 1 },
                { hour: '08:00', count: 8 }, { hour: '10:00', count: 45 }, { hour: '12:00', count: 32 }, { hour: '14:00', count: 28 },
                { hour: '16:00', count: 19 }, { hour: '18:00', count: 12 }, { hour: '20:00', count: 5 }, { hour: '22:00', count: 3 }
            ],
            sentiment: { positive: 68.4, neutral: 24.1, negative: 7.5 },
            agent: {
                name: 'Council Roll Call Agent',
                state: 'idle',
                autoMode: true,
                intervalMinutes: 60,
                alertThreshold: 70,
                lastRun: minsAgo(35),
                totalRuns: 4,
                chatLog: [
                    { id: uid('msg'), role: 'agent', text: 'Council Roll Call Agent online. Ask me about participants, conversations, or attendance — or say "start roll call".', time: nowTime(), at: new Date().toISOString() }
                ]
            },
            totalMessages: 1284,
            settings: {
                defaultPageSize: 8
            },
            governance: {
                canonicalRosterExpected: 66,
                identityState: 'CANONICAL_RECONCILED',
                productionState: 'HOLD',
                productionReason: 'RUNTIME_EVIDENCE_AND_INDEPENDENT_VERIFICATION_REQUIRED',
                lifecycle: 'MISSION_READY',
                release: 'CARC v3.15.0 — Operational Status & Verification Semantics'
            },
            schemaVersion: 9
        };
    }
