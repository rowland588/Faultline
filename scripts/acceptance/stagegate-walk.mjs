/* ACCEPTANCE — THE STAGE GATE, WALKED (docs/STAGEGATE-UX.md, "The walk").
 *
 * Rowland, 16 October: "every single new user interface we actually designed
 * always seems to have a complexity ... you couldn't really navigate simply
 * through things like a problem ... the way things were actually synced
 * together or working cohesively." Each slice was checked page by page; the
 * confusion lived between pages. So the five journeys a site lead makes are
 * walked end to end, pressing what the words on the screen say, every tap
 * counted against a ceiling, no dead end allowed, and every place the change
 * must reach read back:
 *
 *   1  start a job and its machines, every gate given its usual list (phone)
 *   2  a day's stages: a stage ticked on the day's plan is the stage done —
 *      on the day, Today and its gate; a line only ABOUT a done stage keeps
 *      its own tick; a stage done in its drawer reads done on the plan (phone)
 *   3  a test fails → a problem → its fix → Fixed → the re-test → passed, all
 *      in one drawer with Back; the rail's count back where it was (desk)
 *   4  a program tested from Programs, on a phone: Commission hears it
 *   5  a hand-over item done: the front page counts it (desk)
 *
 *   npx vite --port 5191 --strictPort &      (or SMOKE_BASE)
 *   node scripts/acceptance/stagegate-walk.mjs */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];

/* a device with the seed, and a person who presses what the words say */
async function device(width) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, hasTouch: width < 900, locale: 'en-GB', timezoneId: 'Europe/London' });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  page.on('dialog', d => void d.accept().catch(() => {}));
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  const W = { page, sd, taps: 0, dead: [] };
  /* a page is read once it has drawn — "Loading…" can outlast a fixed wait under the gate's load */
  W.go = async h => {
    await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800);
    await page.waitForFunction(() => !/Loading…/.test(document.querySelector('main')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
  };
  W.tap = async (what, loc) => {
    await loc.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    if (!(await loc.isVisible().catch(() => false))) { W.dead.push(what); console.log(`      dead end: nothing to press for "${what}"`); return false; }
    await loc.click(); W.taps++; await page.waitForTimeout(700); return true;
  };
  W.btn = (re, scope) => (scope ?? page).locator('button, a[href], [role="button"], [role="link"], [role="tab"]').filter({ hasText: re }).filter({ visible: true }).first();
  W.db = (fn, arg) => page.evaluate(fn, arg);
  W.close = () => ctx.close();
  return W;
}
const journey = (n, W, max, says) => {
  ok(W.dead.length === 0 && W.taps <= max, `${n} ${says} — ${W.taps} taps (at most ${max}), ${W.dead.length ? `dead ends: ${W.dead.join(', ')}` : 'no dead end'}`);
  W.taps = 0; W.dead = [];
};

/* ======================= 1 · a job and its machines (phone) ======================= */
{
  const W = await device(390); const P = W.page;
  await W.go('#/room');
  await W.tap('New job', W.btn(/New job/));
  await W.tap('Bring new equipment into use', W.btn(/Bring new equipment into use/));
  await P.getByLabel('Name', { exact: true }).fill('Line 7 new wrapper');
  await P.getByLabel('Lead', { exact: true }).fill('Sam');
  await W.tap('Line 7', W.btn(/^Line 7$/));
  await W.tap('Create and add the machines', W.btn(/Create and add the machines/));
  await P.waitForTimeout(800);
  const jobId = decodeURIComponent(P.url().split('/project/')[1] ?? '').split('/')[0];
  await W.tap('Add a machine', W.btn(/Add a machine/));
  for (const [m, who] of [['Flow wrapper', 'Ilapak UK'], ['Coder', 'Domino UK']]) {
    await P.getByPlaceholder(/Machine/).first().fill(m);
    await P.getByPlaceholder(/Who supplied/).first().fill(who);
    await W.tap('Add', P.getByRole('button', { name: 'Add', exact: true }));
  }
  await W.tap('Done', P.getByRole('button', { name: 'Done', exact: true }));
  await W.tap('every gate’s list at once', W.btn(/every gate.s list at once/));
  await P.waitForTimeout(1500);
  /* the lists are written one after another; under the gate's load the last
     can land after the wait — read until every gate of both has one, or 10 s */
  const read = () => W.db(async id => {
    const db = await import('/src/db.ts');
    const ts = (await db.listTests(id)).filter(t => !t.deletedAt && t.projectId === id);
    const as = (await db.listAssets(id)).filter(a => !a.deletedAt && a.projectId === id);
    const at = (a, gate) => ts.filter(t => t.assetId === a.id && (gate === 'commission' ? t.kind === 'test' : t.kind === 'install' && (t.gate ?? 'install') === gate)).length;
    return as.map(a => ({ name: a.name, install: at(a, 'install'), setup: at(a, 'setup'), commission: at(a, 'commission'), handover: at(a, 'handover') }));
  }, jobId);
  let got = await read();
  for (let i = 0; i < 10 && !(got.length === 2 && got.every(g => g.install && g.setup && g.commission && g.handover)); i++) { await P.waitForTimeout(1000); got = await read(); }
  ok(got.length === 2 && got.every(g => g.install > 0 && g.setup > 0 && g.commission > 0 && g.handover > 0),
    `1a both machines have every gate's usual list from one tap — ${got.map(g => `${g.name}: ${g.install}/${g.setup}/${g.commission}/${g.handover}`).join('; ')}`);
  journey('1', W, 9, 'a job started, two machines added, every gate given its list');
  await W.close();
}

/* ======================= 2 · a day's stages (phone) ======================= */
{
  const W = await device(390); const P = W.page; const J = `#/project/${W.sd.projectId}`;
  const stage = async title => W.db(async ([pid, t]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => !x.deletedAt && x.title === t), [W.sd.projectId, title]);
  await W.go(J);
  await W.tap('The day', W.btn(/The day/));
  ok(flat(await P.locator('.dp-offer').innerText().catch(() => '')).includes('tap to add it to the plan'), '2a the day says what a tap on a due stage does — it adds it to the plan');
  await W.tap('+ Ilapak flow wrapper — Change parts fitted', P.locator('.dp-offer .dp-chip').filter({ hasText: 'Change parts fitted' }).first());
  const line = P.locator('.dp-row').filter({ hasText: 'Ilapak flow wrapper — Change parts fitted' }).first();
  await W.tap('tick it done', line.locator('input[type=checkbox]'));
  await P.waitForTimeout(1200);
  const cp = await stage('Change parts fitted');
  ok(cp?.outcome === 'passed', `2b the line ticked on the day's plan is the stage done (${cp?.outcome})`);
  ok(flat(await line.innerText()).includes('done'), '2c the day\'s line says done');
  const express = P.locator('.dp-row').filter({ hasText: 'Load the Express programs' }).first();
  ok(flat(await express.innerText()).includes('to do'), '2d a line only ABOUT a done stage ("Load the Express programs" on Programs loaded) keeps its own "to do"');
  /* the other way: a stage done in its own drawer reads done on the plan */
  await W.tap('+ Ishida checkweigher — Sensors and controls checked (I/O)', P.locator('.dp-offer .dp-chip').filter({ hasText: 'Sensors and controls checked' }).first());
  const io = P.locator('.dp-row').filter({ hasText: 'Sensors and controls checked' }).first();
  await W.tap('Open it', io.getByRole('button', { name: /Open it/ }));
  await W.tap('Done today (in its drawer)', P.locator('.rd').last().getByRole('button', { name: /Done today/ }).first());
  await P.keyboard.press('Escape'); await P.waitForTimeout(1000);
  ok(flat(await io.innerText()).includes('done'), '2e a stage done in its drawer reads done on the day\'s plan');
  await W.go(J);
  const needs = (await P.locator('.fp-needs .fp-row').allInnerTexts()).map(flat);
  ok(!needs.some(x => x.includes('Change parts fitted')) && !needs.some(x => x.includes('Sensors and controls checked')), '2f Today\'s Needs you no longer lists either stage');
  const day = flat(await P.locator('.fp-panel, a, button').filter({ hasText: /plan for today/ }).first().innerText().catch(() => ''));
  ok(/plan for today: (\d+) of (\d+) done|all \d+ done/.test(day), `2g the front page counts the day's plan the way the day does — "${day.replace(/^The day ›\s*/, '')}"`);
  journey('2', W, 7, 'a stage done from the day\'s plan, another from its drawer');
  await W.close();
}

/* ======================= 3 · fails → problem → fix → re-test (desk) ======================= */
const desk = await device(1360);
{
  const W = desk; const P = W.page; const J = `#/project/${W.sd.projectId}`;
  const D = () => P.locator('.rd').last();
  const railProblems = async () => flat(await P.locator('a, button').filter({ hasText: /^Problems\s*\d+/ }).first().innerText().catch(() => ''));
  await W.go(`${J}/testing`);
  const before = await railProblems();
  await W.tap('the re-test on the board', W.btn(/Seal integrity — Finest Red 2kg — re-test/));
  await W.tap('Didn’t pass', D().getByRole('button', { name: /Didn.t pass/ }).first());
  await W.tap('Hit a problem', D().getByRole('button', { name: /Hit a problem/ }).first());
  await D().getByPlaceholder(/Guard brackets/).fill('Seal jaw too cold on the second lane');
  await W.tap('Save the problem', D().getByRole('button', { name: /Save the problem/ }));
  await P.waitForTimeout(800);
  const onProblem = flat(await D().innerText().catch(() => ''));
  ok(onProblem.includes('Seal jaw too cold on the second lane') && /back to Seal integrity/.test(onProblem) && onProblem.includes('Make it a fix'),
    '3a the problem just saved opens in the same drawer, Back to its test, where its fix is made');
  await W.tap('Make it a fix', D().getByRole('button', { name: /Make it a fix/ }).first());
  /* the fix is made and opened in a moment — under the gate's load, more than the tap's wait */
  await D().getByText(/back to Seal jaw too cold/i).first().waitFor({ timeout: 10000 }).catch(() => {});
  ok(/back to Seal jaw too cold/.test(flat(await D().innerText().catch(() => ''))), '3b its fix opens there too, Back to the problem');
  await W.tap('Fixed', D().getByRole('button', { name: /^Fixed$/ }).first());
  await P.waitForTimeout(800);
  ok(await P.locator('.rd').count() > 0, '3c Fixed goes back to the problem — the drawer stays, nothing lost');
  await W.tap('back to the test', D().getByRole('button', { name: /^back to Seal integrity/i }).first());
  await W.tap('Plan the re-test', D().getByRole('button', { name: /Plan the re-test/ }).first());
  /* the new record is written, then opened — under the gate's load the drawer can open on it a moment before it lands */
  await D().getByText(/— re-test/).first().waitFor({ timeout: 10000 }).catch(() => {});
  const title = flat(await D().locator('h2, h3, .rd-title').first().innerText().catch(() => ''));
  const newTest = flat(await D().innerText().catch(() => ''));
  ok(/back to Seal integrity/.test(newTest) && /— re-test/.test(newTest) && !/re-test\s*—\s*re-test/.test(newTest), `3d the re-test of a re-test is named "— re-test" once ("${title}")`);
  await W.tap('Passed', D().getByRole('button', { name: /^Passed$/ }).first());
  await P.keyboard.press('Escape'); await P.waitForTimeout(1000);
  ok(await railProblems() === before, `3e the rail's problems back where they were once fixed ("${before}")`);
  const row = flat(await P.locator('.cg-grid tr').filter({ hasText: 'Ilapak flow wrapper' }).first().innerText().catch(() => ''));
  ok(/re-test passed/.test(row), '3f Commission\'s board: the re-test passed');
  journey('3', W, 10, 'a failed re-test, its problem, the fix, the next re-test passed');
}

/* ======================= 5 · a hand-over item (desk) ======================= */
{
  const W = desk; const P = W.page; const J = `#/project/${W.sd.projectId}`;
  await W.go(J);
  const doneBefore = Number((/(\d+) done · \d+ to go/.exec(flat(await P.locator('main').innerText())) ?? [])[1]);
  await W.tap('Plan (the rail)', W.btn(/^Plan\d/));
  await W.tap('Hand over (its tab)', W.btn(/^Hand over/));
  await W.tap('the item booked 23 Oct', P.locator('.ig-cell').filter({ hasText: '23 Oct' }).first());
  await W.tap('Done today', P.locator('.rd').last().getByRole('button', { name: /Done today/ }).first());
  await W.go(J);
  const doneAfter = Number((/(\d+) done · \d+ to go/.exec(flat(await P.locator('main').innerText())) ?? [])[1]);
  ok(doneAfter === doneBefore + 1, `5a the front page counts it — ${doneBefore} → ${doneAfter} done`);
  journey('5', W, 4, 'a hand-over item done from the Plan');
  await desk.close();
}

/* ======================= 4 · a program tested (phone) ======================= */
{
  const W = await device(390); const P = W.page; const J = `#/project/${W.sd.projectId}`;
  await W.go(J);
  await W.tap('More (the phone bar)', P.locator('.nv-bar').getByText('More', { exact: true }).first());
  await W.tap('Programs', W.btn(/Programs/, P.locator('.sheet').last()));
  const row = P.locator('.pgr').filter({ hasText: 'PR-07 Baking Potatoes' }).first();
  const box = async name => row.getByRole('button', { name }).first().boundingBox();
  const [rb, tb] = [await row.boundingBox(), await box(/Test it/)];
  ok(!!rb && !!tb && tb.y < rb.y + 40, '4a on a phone the row\'s Test it is beside its name, not a line under it');
  await W.tap('Test it', row.getByRole('button', { name: /Test it/ }).first());
  await W.tap('Passed', row.getByRole('button', { name: /^Passed$/ }).first());
  await W.tap('Save', row.getByRole('button', { name: /^Save$/ }).first());
  await P.waitForTimeout(1500);
  await row.getByText(/proved/).first().waitFor({ timeout: 10000 }).catch(() => {});
  ok(/proved/.test(flat(await row.innerText())), `4b the row says proved ("${flat(await row.locator('.pgr-top').innerText()).slice(0, 60)}")`);
  await W.go(`${J}/testing`);
  const needs = (await P.locator('.cg-needs .nd-row').allInnerTexts()).map(flat);
  ok(!needs.some(x => x.includes('PR-07')), '4c Commission\'s Needs you no longer asks for PR-07\'s test');
  journey('4', W, 5, 'a program tested on a phone');
  await W.close();
}

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\nStage gate walk NOT accepted: ${failed} failed` : '\nStage gate walk accepted: five journeys end to end, every tap within its ceiling, no dead end, every place the change reaches in step');
process.exit(failed ? 1 : 0);
