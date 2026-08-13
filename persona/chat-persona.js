'use strict';
// persona/chat-persona.js

    function chatMissionAnswer(p, query) {
        var mp = p.missionProfile || {};
        var q = String(query || '').toLowerCase();
        var sf = canonicalStatusFields(p);
        var statusLine = 'Operational Status: ' + sf.operationalStatus + '. Production Verification: ' + sf.productionVerification + '. Gate Decision: ' + sf.gateDecision + '.';
        if (/status|how are you|how('?s| is) .*doing/.test(q)) {
            return p.callsign + ': Operational and ready within delegated authority — ' + p.role + '. ' + statusLine;
        }
        if (/purpose/.test(q)) return p.callsign + ' Purpose: ' + (mp.purpose || 'Profile purpose not yet confirmed.') + ' [' + (mp.profileStatus || 'UNCONFIRMED') + ']';
        if (/mission/.test(q)) return p.callsign + ' Mission: ' + (mp.mission || 'Mission not yet confirmed.') + ' [' + (mp.profileStatus || 'UNCONFIRMED') + ']';
        if (/dut(y|ies)|responsibilit/.test(q)) return p.callsign + ' Duties: ' + ((mp.duties || []).join('; ') || 'No duties recorded.') + ' [' + (mp.profileStatus || 'UNCONFIRMED') + ']';
        if (/\btask(s)?\b|what do you do|\bwork\b/.test(q)) return p.callsign + ' Tasks: ' + ((mp.tasks || []).join('; ') || 'No recurring tasks recorded.') + ' [' + (mp.profileStatus || 'UNCONFIRMED') + ']';
        if (/output|deliverable/.test(q)) return p.callsign + ' Required Outputs: ' + ((mp.outputs || []).join('; ') || 'No outputs recorded.') + ' [' + (mp.profileStatus || 'UNCONFIRMED') + ']';
        if (/\brole\b|who are you/.test(q)) return p.callsign + ' Role: ' + p.role + '. Command: ' + p.dept + '. ' + statusLine;
        if (/\bidentity\b|\bid\b/.test(q)) return p.callsign + ' Identity — Service Member ID: ' + p.serviceMemberId + '; Callsign ID: ' + p.callsignId + '; Agent ID: ' + p.agentId + '; Legacy Alias: ' + (p.legacyAlias || 'none') + '.';
        return p.callsign + ': Message received. My role is ' + p.role + '. Ask me for status, role, purpose, mission, duties, tasks, outputs, or identity. Local Agent Chat responses are NOT_RUNTIME_VERIFIED.';
    }
