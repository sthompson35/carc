// Reusable browser regression check for CARC's index.html, driven via the
// browser-automation skill's --script contract: export default async (page) => result.
//
// Written the hard way, so it's worth explaining why it looks like this:
// page.evaluate() in this environment runs in an isolated JS world that never
// sees the main page's real `window` globals — reading `typeof window.DATA`
// or setting `location.hash = x` via evaluate() looks legitimate but silently
// no-ops or reads stale/undefined values, even when the app is working fine.
// Uncaught script errors also don't reliably surface via page.on('pageerror')
// here. So: every check below uses REAL user actions (locator.click/.fill)
// and DOM-only reads (.innerHTML/.getAttribute/.count/page.title) — never
// page.evaluate() to read or set app state. See the project's
// reference_browser_automation_windows_script_path memory for the full story.
const failures = [];
function check(cond, label) {
    console.log('  ' + (cond ? 'PASS' : 'FAIL') + '  ' + label);
    if (!cond) failures.push(label);
}

export default async function run(page) {
    const pageEvents = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') pageEvents.push('[' + m.type() + '] ' + m.text()); });
    page.on('pageerror', (e) => pageEvents.push('[uncaught] ' + (e.stack || e.message || String(e))));

    await page.waitForTimeout(500);

    check((await page.title()) !== '', 'page has a title');
    const footerText = await page.locator('body').innerText();
    check(/Local-first/i.test(footerText), 'footer still says Local-first');

    const routes = ['dashboard', 'participants', 'conversations', 'agent', 'governance', 'analytics', 'admin'];
    for (const r of routes) {
        await page.locator('.nav-link[data-route="' + r + '"]').first().click({ timeout: 5000 });
        await page.waitForTimeout(300);
        const hidden = await page.locator('#page-' + r).getAttribute('hidden');
        check(hidden === null, 'nav click routes to ' + r + ' (page-' + r + ' visible)');
    }

    // Participants: real data renders and search narrows the grid
    await page.locator('.nav-link[data-route="participants"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(500);
    const before = await page.locator('#partGridBody tr').count();
    check(before > 0, 'participants grid renders rows on load (DATA bootstrap succeeded)');
    const searchBox = page.locator('#partSearchInput');
    await searchBox.fill('VEX');
    await page.waitForTimeout(400);
    const afterSearch = await page.locator('#partGridBody tr').count();
    check(afterSearch >= 1 && afterSearch < before, 'participants search for VEX narrows the grid (before=' + before + ' after=' + afterSearch + ')');
    await searchBox.fill('');
    await page.waitForTimeout(300);

    // Knowledge Path Registry: open a participant, exercise the evidence-gated checklist
    {
        await page.locator('button[data-act="view"]').first().click({ timeout: 5000 });
        await page.waitForTimeout(400);
        // Scoped via :has(.kp-evidence-edit) — the modal also renders an Identity Profiles
        // .gate-grid using the same .gate-item class, so an unscoped count would be ambiguous.
        const kpCards = page.locator('#modalBody .gate-item:has(.kp-evidence-edit)');
        check((await kpCards.count()) === 10, 'participant detail modal renders exactly 10 knowledge-path stage cards');
        const firstBadgeText = await kpCards.first().locator('.badge').innerText().catch(() => '');
        check(firstBadgeText === 'PENDING', 'a fresh participant\'s first knowledge-path stage starts PENDING');

        await kpCards.first().locator('.kp-evidence-edit').click({ timeout: 5000 });
        await page.waitForTimeout(300);
        // Reject: VERIFIED with no evidence/verifier
        await page.locator('#kpStatus').selectOption('VERIFIED');
        await page.locator('#kpSave').click({ timeout: 5000 });
        await page.waitForTimeout(300);
        const stillOpen = await page.locator('#kpSave').count();
        check(stillOpen > 0, 'saving VERIFIED with empty evidence/verifier is rejected (modal stays open, no toast success)');

        // Accept: fill evidence + verifier, save
        await page.locator('#kpEvidence').fill('e2e evidence reference');
        await page.locator('#kpVerifier').fill('e2e verifier');
        await page.locator('#kpSave').click({ timeout: 5000 });
        await page.waitForTimeout(400);
        const reopenedBadge = await page.locator('#modalBody .gate-item:has(.kp-evidence-edit)').first().locator('.badge').innerText().catch(() => '');
        check(reopenedBadge === 'VERIFIED', 'saved evidence+verifier flips the stage to VERIFIED and the reopened modal reflects it');

        // Identity Profiles: same evidence-gated flow, reusing the .gate-grid/.gate-item pattern
        const ipCards = page.locator('#modalBody .gate-item:has(.ip-evidence-edit)');
        check((await ipCards.count()) === 3, 'participant detail modal renders exactly 3 identity-profile cards (persona/communication/handoff)');
        const ipFirstBadge = await ipCards.first().locator('.badge').innerText().catch(() => '');
        check(ipFirstBadge === 'PENDING', 'a fresh participant\'s first identity profile starts PENDING');

        await ipCards.first().locator('.ip-evidence-edit').click({ timeout: 5000 });
        await page.waitForTimeout(300);
        await page.locator('#ipStatus').selectOption('VERIFIED');
        await page.locator('#ipSave').click({ timeout: 5000 });
        await page.waitForTimeout(300);
        check((await page.locator('#ipSave').count()) > 0, 'saving an identity profile as VERIFIED with empty evidence/verifier is rejected (modal stays open)');

        await page.locator('#ipEvidence').fill('e2e identity profile evidence');
        await page.locator('#ipVerifier').fill('e2e verifier');
        await page.locator('#ipSave').click({ timeout: 5000 });
        await page.waitForTimeout(400);
        const ipReopenedBadge = await page.locator('#modalBody .gate-item:has(.ip-evidence-edit)').first().locator('.badge').innerText().catch(() => '');
        check(ipReopenedBadge === 'VERIFIED', 'saved identity-profile evidence+verifier flips it to VERIFIED and the reopened modal reflects it');

        // Authority Profile / Runtime Verification: computed, read-only — no editable fields.
        // closeModal() clears the whole modal body (not just the sub-view), so the participant
        // detail modal has to be reopened between these two checks, not just closed once.
        const apViewBtn = page.locator('.ap-view').first();
        if (await apViewBtn.count()) {
            await apViewBtn.click({ timeout: 5000 });
            await page.waitForTimeout(300);
            check((await page.locator('#modalBody input:not([disabled]), #modalBody textarea, #modalBody select').count()) === 0, 'Authority Profile modal has no editable fields (computed, not self-attestable)');
            await page.locator('#apClose').click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(200);
        }

        await page.locator('button[data-act="view"]').first().click({ timeout: 5000 });
        await page.waitForTimeout(400);
        const rvViewBtn = page.locator('.rv-view').first();
        if (await rvViewBtn.count()) {
            await rvViewBtn.click({ timeout: 5000 });
            await page.waitForTimeout(300);
            check((await page.locator('#modalBody input:not([disabled]), #modalBody textarea, #modalBody select').count()) === 0, 'Runtime Verification modal has no editable fields (computed, not self-attestable)');
            await page.locator('#rvClose').click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(200);
        }
    }

    // Agent Chat: targeted + multi-target messages, search
    await page.locator('.nav-link[data-route="agent"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const chatInput = page.locator('#chatInput');
    const sendBtn = page.locator('#chatSendBtn, button:has-text("Send")').first();
    const bubblesBefore = await page.locator('.chat-bubble').count();
    check(bubblesBefore > 0, 'chat window renders the seeded greeting on load');
    await chatInput.fill('@VEX status');
    if (await sendBtn.count()) await sendBtn.click(); else await chatInput.press('Enter');
    await page.waitForTimeout(800);
    const bubblesAfter = await page.locator('.chat-bubble').count();
    check(bubblesAfter > bubblesBefore, 'chat send appends bubble(s) for a targeted message');

    const bubblesBefore2 = await page.locator('.chat-bubble').count();
    await chatInput.fill('@VEX @MAPE status');
    if (await sendBtn.count()) await sendBtn.click(); else await chatInput.press('Enter');
    await page.waitForTimeout(800);
    const bubblesAfter2 = await page.locator('.chat-bubble').count();
    check(bubblesAfter2 > bubblesBefore2, 'multi-target @VEX @MAPE chat appends response bubble(s)');

    // Command governance: a roster-wide broadcast is gated behind a native confirm() dialog
    // (participants.js's bulk-delete pattern, reused here) — a different Playwright mechanism
    // (page.on('dialog')) than the custom #modalOverlay handled above for the roll-call button.
    {
        let dialogMessage = '';
        const onDismissDialog = async (dialog) => { dialogMessage = dialog.message(); await dialog.dismiss(); };
        page.on('dialog', onDismissDialog);
        const bubblesBeforeDecline = await page.locator('.chat-bubble').count();
        await chatInput.fill('hello everyone');
        if (await sendBtn.count()) await sendBtn.click(); else await chatInput.press('Enter');
        await page.waitForTimeout(800);
        page.off('dialog', onDismissDialog);
        check(/broadcast/i.test(dialogMessage) && /active participant/i.test(dialogMessage), 'broadcast triggers a native confirm() dialog mentioning the active participant count');
        const declineReply = await page.locator('.chat-bubble').last().innerText().catch(() => '');
        check(/cancelled/i.test(declineReply), 'dismissing the confirm() dialog cancels the broadcast (reply mentions cancelled)');
        const bubblesAfterDecline = await page.locator('.chat-bubble').count();
        check(bubblesAfterDecline === bubblesBeforeDecline + 2, 'declined broadcast still logs the user message + cancellation reply (no roll call side effects)');

        const onAcceptDialog = async (dialog) => { await dialog.accept(); };
        page.on('dialog', onAcceptDialog);
        const bubblesBeforeAccept = await page.locator('.chat-bubble').count();
        await chatInput.fill('hello everyone');
        if (await sendBtn.count()) await sendBtn.click(); else await chatInput.press('Enter');
        await page.waitForTimeout(800);
        page.off('dialog', onAcceptDialog);
        const acceptReply = await page.locator('.chat-bubble').last().innerText().catch(() => '');
        check(!/cancelled/i.test(acceptReply), 'accepting the confirm() dialog proceeds with the broadcast (reply does not mention cancelled)');
        const bubblesAfterAccept = await page.locator('.chat-bubble').count();
        check(bubblesAfterAccept > bubblesBeforeAccept, 'accepted broadcast appends bubble(s)');
    }

    const chatSearchBox = page.locator('#chatSearchInput');
    if (await chatSearchBox.count()) {
        await chatSearchBox.fill('VEX');
        await page.waitForTimeout(300);
        const countText = await page.locator('#chatSearchCount').innerText().catch(() => '');
        check(countText.length > 0, 'chat search shows a match count (' + countText + ')');
        await chatSearchBox.fill('');
        await page.waitForTimeout(200);
    }

    // Roll call: click it, close any confirmation modal so later clicks aren't blocked
    try {
        await page.locator('.nav-link[data-route="dashboard"]').first().click({ timeout: 5000 });
        await page.waitForTimeout(300);
        const rollCallBtn = page.locator('#btnRollCall');
        if (await rollCallBtn.count()) {
            await rollCallBtn.click({ timeout: 5000 });
            await page.waitForTimeout(500);
            if ((await page.locator('#modalOverlay').getAttribute('hidden')) === null) {
                const closeBtn = page.locator('#modalCloseBtn');
                if (await closeBtn.count()) await closeBtn.click({ timeout: 3000 }).catch(() => {});
                await page.waitForTimeout(300);
            }
        }
    } catch (e) {
        console.log('  INFO  roll call step skipped: ' + e.message.split('\n')[0]);
    }

    // Governance + Admin render without a backend reachable — must degrade gracefully
    await page.locator('.nav-link[data-route="governance"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(400);
    check((await page.locator('#page-governance').getAttribute('hidden')) === null, 'governance page renders and is visible');

    const kpBadgeText = await page.locator('#kpRegistryBadge').innerText().catch(() => '');
    check(/^\d+\/66 complete$/.test(kpBadgeText), 'governance page shows a real N/66 knowledge-path completion badge (' + kpBadgeText + ')');
    const kpBreakdownRows = await page.locator('#kpStageBreakdown .chart-bar').count();
    check(kpBreakdownRows === 10, 'governance page renders a 10-row knowledge-path stage breakdown');

    await page.locator('.nav-link[data-route="admin"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    check((await page.locator('#page-admin').getAttribute('hidden')) === null, 'admin page renders and is visible');

    console.log('\n  captured page console/errors during this run (' + pageEvents.length + '):');
    pageEvents.forEach((e) => console.log('    ' + e));

    console.log('\n══════════════════════════════════════════');
    console.log('  CARC regression: ' + (failures.length === 0 ? 'PASS' : 'FAIL'));
    if (failures.length) console.log('  Failed checks: ' + failures.join('; '));
    console.log('══════════════════════════════════════════');

    return { failures };
}
