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
