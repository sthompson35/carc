'use strict';
// tests/app.participants.dom.test.js — real jsdom render test, not the stub-DOM vm sandbox the
// other *.test.js files use. Loads the real index.html + every real <script src> in its own
// declared order into one jsdom document (via getInternalVMContext, same vm.Script().runInContext
// pattern as tests/run.js's own makeContext(), just against a real window instead of a stub),
// then drives the actual click -> fill -> save flow for the skill-evidence modal added in
// app/pages/participants.js — proving the button really opens the real modal and Save really
// calls the real verifySkillRecord(), not just that the pieces exist in isolation.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

const SCRIPT_ORDER = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .match(/<script src="([^"]+)"/g)
    .map(function (tag) { return tag.match(/<script src="([^"]+)"/)[1]; });

module.exports = {
    dom: true,
    run: async function (assert) {
        const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
        const ctx = dom.getInternalVMContext();
        try {
            const bodyHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)[1];
            dom.window.document.body.innerHTML = bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '');

            for (const src of SCRIPT_ORDER) {
                const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
                new vm.Script(code, { filename: src }).runInContext(ctx);
            }

            const win = dom.window;
            assert(typeof win.DATA === 'object' && Array.isArray(win.DATA.participants) && win.DATA.participants.length === 66, 'real index.html + scripts boot to a full 66-participant DATA, same as production');

            // app/init.js's own auto-invocation is deferred to an async DOMContentLoaded
            // listener that hasn't fired yet at this point (jsdom schedules it after this
            // synchronous script-loading loop returns) — call the real wireChrome() directly
            // instead of the full init(), which also gets us the real modal wiring without
            // init()'s setInterval timers or a full page render this test doesn't need.
            win.wireChrome();

            const target = win.DATA.participants.find(function (p) { return (p.skills || []).length > 0; });
            assert(!!target, 'at least one seeded participant has real skill records to test against');
            const skill = target.skills[0];
            assert(skill.status !== 'VERIFIED', 'chosen skill starts life as ASSIGNED, not already VERIFIED (seeded state)');

            win.openParticipantDetail(target.id);
            const evidenceBtn = win.document.querySelector('.sk-evidence-edit[data-skid="' + skill.skillId + '"]');
            assert(!!evidenceBtn, 'a real "Record Evidence" button rendered for the target skill');
            evidenceBtn.click();

            const assessmentInput = win.document.getElementById('skAssessment');
            const evidenceTextarea = win.document.getElementById('skEvidence');
            const verifierInput = win.document.getElementById('skVerifier');
            const statusSelect = win.document.getElementById('skStatus');
            assert(!!assessmentInput && !!evidenceTextarea && !!verifierInput && !!statusSelect, 'clicking Record Evidence opened the real modal with all four real form fields');

            assessmentInput.value = 'DOM-TEST-ASSESSMENT-001';
            evidenceTextarea.value = 'DOM test evidence line 1\nDOM test evidence line 2';
            verifierInput.value = '@HELIX';
            statusSelect.value = 'VERIFIED';
            win.document.getElementById('skSave').click();

            const updated = win.DATA.participants.find(function (p) { return p.id === target.id; }).skills.find(function (s) { return s.skillId === skill.skillId; });
            assert(updated.status === 'VERIFIED', 'Save actually flips the real skill record to VERIFIED via verifySkillRecord()');
            assert(updated.assessmentId === 'DOM-TEST-ASSESSMENT-001', 'real assessmentId typed into the form was persisted, not fabricated');
            assert(updated.verifier === '@HELIX', 'real verifier typed into the form was persisted');
            assert(Array.isArray(updated.evidence) && updated.evidence.length === 2, 'both evidence lines were captured as real evidence[] entries');
            assert(!!updated.verifiedAt, 'verifySkillRecord() stamped a real verifiedAt timestamp');

            // Re-opening should now offer "Review Evidence", not "Record Evidence", for this skill.
            win.openParticipantDetail(target.id);
            const reviewBtn = win.document.querySelector('.sk-evidence-edit[data-skid="' + skill.skillId + '"]');
            assert(!!reviewBtn && reviewBtn.textContent === 'Review Evidence', 'button label flips to Review Evidence once the skill is really VERIFIED');
        } finally {
            dom.window.close();
        }
    }
};
