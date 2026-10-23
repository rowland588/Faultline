/* ACCEPTANCE — A DUAL LINE, AND EVERY MACHINE ON A LINE (23 October).
 *
 * Rowland: "2a 2b are 2 lines but they happen to be a dual line ... I have
 * experiment happening in 2b and 2a and I also have to run other tools on
 * both. I call it then 2a 2b"; "we'd need some way of being able to attach
 * it ... like a connector"; "Can't have a machine without a line ...
 * Everything needs to be under a line." On the smoke seed, in a real browser,
 * every sentence checked against the module that makes it (lib/lines dualOf,
 * dualSaid, machineOntoLine; lib/lineRecords machinesOf):
 *
 *   1  three lines added in Your factory — Line 2a, line 2b, 2a 2b; on 2a 2b,
 *      Edit the line's Made of ticks Line 2a and line 2b, each saved and said
 *   2  the words: under 2a 2b's name "Made of Line 2a + line 2b", each a link;
 *      under Line 2a's "Part of 2a 2b"; Your factory's rows; the control
 *      room's cards; one untick and the words move
 *   3  the papers: the line report's band says Made of / Part of; the factory
 *      report says both
 *   4  every machine on a line: a reliability study on Line 2a names a machine
 *      not on its list — it joins the list; the Machine box on 2a 2b offers
 *      its own and both lines' machines; a problem on line 2b names a machine
 *      — it joins line 2b's list
 *   5  the phone: the words and the ticks fit
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/dual-lines.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper, more } from '../lib/pageHeader.mjs';
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const go = async (hash, wait = 2500) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(wait); };
const dir = mkdtempSync(join(tmpdir(), 'dual-lines-'));
const pdfOf = async (name, file, within) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, name, within)]);
  const f = join(dir, file); await d.saveAs(f);
  return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');
};
const lines = () => page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).filter(w => !w.archived).map(w => ({ id: w.id, name: w.name, madeOf: w.madeOf ?? [], assets: w.assets })));
const said = (id) => page.evaluate(async id => { const { dualOf, dualSaid } = await import('/src/lib/lines.ts'); const all = (await (await import('/src/db.ts')).listWorkspaces()); const w = all.find(x => x.id === id); return dualSaid(dualOf(w, all)); }, id);

await go('#/room', 3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* 1 · three lines, and Made of on the dual one */
await go('#/factory?add=1', 2500);
for (const name of ['Line 2a', 'line 2b', '2a 2b']) {
  await page.getByLabel("The new line's name").fill(name);
  await page.getByRole('button', { name: 'Add line', exact: true }).click(); await page.waitForTimeout(900);
}
let L = await lines();
const A = L.find(w => w.name === 'Line 2a'), B = L.find(w => w.name === 'line 2b'), D = L.find(w => w.name === '2a 2b');
ok(!!A && !!B && !!D, `1 three lines in the factory (${L.map(w => w.name).join(', ')})`);
await go(`#/lines/${D.id}`, 3000);
await more(page, 'Edit the line'); await page.waitForTimeout(500);
const made = page.locator('.pl-madeof');
ok((await made.locator('input[type=checkbox]').count()) >= 2 && !(await made.innerText()).includes('2a 2b'), 'Made of lists the other lines, never the line itself');
await page.getByLabel('Made of Line 2a', { exact: true }).check(); await page.waitForTimeout(800);
ok(flat(await page.locator('.pe-saved').innerText()).includes('2a 2b is made of Line 2a'), `ticked Line 2a: said saved — "${flat(await page.locator('.pe-saved').innerText())}"`);
await page.getByLabel('Made of line 2b', { exact: true }).check(); await page.waitForTimeout(800);
L = await lines();
ok(JSON.stringify([...L.find(w => w.id === D.id).madeOf].sort()) === JSON.stringify([A.id, B.id].sort()), '1b both ticked: the record says made of both');

/* 2 · the words */
await go(`#/lines/${D.id}`, 3000);
const under = flat(await page.locator('.pl-dual').innerText());
ok(under === 'Made of Line 2a + line 2b' && (await page.locator('.pl-dual a').count()) === 2, `2 under its name: "${under}", each a link`);
ok(`made of Line 2a + line 2b` === await said(D.id), 'as lib/lines dualSaid says it');
await page.locator('.pl-dual a', { hasText: 'Line 2a' }).click(); await page.waitForTimeout(2500);
ok(page.url().includes(`#/lines/${A.id}`) && flat(await page.locator('.pl-dual').innerText()) === 'Part of 2a 2b', `2b the link lands on Line 2a, which says "${flat(await page.locator('.pl-dual').innerText())}"`);
await go('#/factory', 3000);
const row = async n => flat(await page.locator(`.fac-line[data-line="${n}"] .fac-dual`).innerText({ timeout: 3000 }).catch(() => ''));
ok(await row('2a 2b') === 'made of Line 2a + line 2b' && await row('Line 2a') === 'part of 2a 2b' && await row('line 2b') === 'part of 2a 2b', `2c Your factory's rows say it (${await row('2a 2b')} · ${await row('Line 2a')})`);
await go('#/room', 3000);
const card = n => page.evaluate(n => [...document.querySelectorAll('.fac-card')].find(c => c.querySelector('.fac-card-name')?.textContent.trim() === n)?.querySelector('.fac-dual')?.textContent.replace(/\s+/g, ' ').trim() ?? '', n);
ok(await card('2a 2b') === 'made of Line 2a + line 2b' && await card('line 2b') === 'part of 2a 2b', `2d the control room's cards say it (${await card('2a 2b')})`);
/* one untick and the words move */
await go(`#/lines/${D.id}?view=setup`, 3000);
await page.getByLabel('Made of line 2b', { exact: true }).uncheck(); await page.waitForTimeout(800);
ok(flat(await page.locator('.pe-saved').innerText()).includes('2a 2b is made of Line 2a') && await said(D.id) === 'made of Line 2a' && await said(B.id) === '', '2e unticked line 2b: 2a 2b made of Line 2a alone, line 2b part of nothing');
await page.getByLabel('Made of line 2b', { exact: true }).check(); await page.waitForTimeout(800);

/* 3 · the papers */
await go(`#/lines/${D.id}`, 3000);
const lp = await pdfOf('Line report', 'dual.pdf', page.locator('.pl'));
ok(/Made of\s*Line 2a \+ line 2b/.test(lp), `3 the dual line's report band says Made of (${/Made of[^A-Z]*/.exec(lp)?.[0]?.slice(0, 40)})`);
await go(`#/lines/${A.id}`, 3000);
const ap = await pdfOf('Line report', 'a.pdf', page.locator('.pl'));
ok(/Part of\s*2a 2b/.test(ap), '3b Line 2a\'s report band says Part of 2a 2b');
await go('#/factory', 3000);
const fp = await pdfOf('Factory report', 'factory.pdf');
ok(/Made of Line 2a \+ line 2b/.test(fp) && /Part of 2a 2b/.test(fp), '3c the factory report says both');

/* 4 · every machine on a line */
await go(`#/reliability?line=${encodeURIComponent(A.id)}`, 3000);
await page.getByRole('button', { name: 'New reliability study' }).first().click(); await page.waitForTimeout(600);
const form = page.locator('.lt-new');
if (await form.getByLabel('Which line').count()) await form.getByLabel('Which line').selectOption({ label: 'Line 2a' });
await form.locator('input.text-input').first().fill('Pick and place miss picks');
await form.locator('input.text-input').nth(1).fill('Pick and Place');
await form.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
L = await lines();
ok(L.find(w => w.id === A.id).assets.includes('Pick and Place'), `4 a machine named on a study joins Line 2a's list (${L.find(w => w.id === A.id).assets.join(' · ')})`);
await page.evaluate(async id => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(id); await db.updateWorkspace({ ...w, assets: [...w.assets, 'Bagger'] }); }, B.id);
await go(`#/reliability?line=${encodeURIComponent(D.id)}`, 3000);
await page.getByRole('button', { name: 'New reliability study' }).first().click(); await page.waitForTimeout(600);
if (await form.getByLabel('Which line').count()) await form.getByLabel('Which line').selectOption({ label: '2a 2b' });
await page.waitForTimeout(600);
const offered = await page.locator('#new-study-machines option').evaluateAll(os => os.map(o => o.value));
const want = await page.evaluate(async id => { const { machinesOf } = await import('/src/lib/lineRecords.ts'); const db = await import('/src/db.ts'); const all = await db.listWorkspaces(); return machinesOf(all.find(w => w.id === id), await db.listAllAssets(), await db.allPaceLines(), undefined, all); }, D.id);
ok(offered.includes('Pick and Place') && offered.includes('Bagger') && JSON.stringify(offered) === JSON.stringify(want), `4b on 2a 2b the Machine box offers both lines' machines as lib/lineRecords machinesOf says (${offered.join(' · ')})`);
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await go(`#/lines/${B.id}`, 3000);
await page.locator('.nv-top .qs-top').click(); await page.waitForTimeout(900);
const sheet = page.locator('.sheet, [role="dialog"]').last();
await sheet.locator('textarea').first().fill('Film splice jams at the sealer');
await sheet.getByLabel('Another machine').fill('Sealer');
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
L = await lines();
ok(L.find(w => w.id === B.id).assets.includes('Sealer'), `4c a machine named on a problem joins line 2b's list (${L.find(w => w.id === B.id).assets.join(' · ')})`);

/* 5 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${D.id}?view=setup`, 3000);
const ph = await page.evaluate(() => ({ wide: document.documentElement.scrollWidth, dual: document.querySelector('.pl-dual')?.getBoundingClientRect().right ?? 0, ticks: [...document.querySelectorAll('.pl-madeof-l')].every(l => l.getBoundingClientRect().height >= 32) }));
ok(ph.wide <= 392 && ph.dual <= 392 && ph.ticks, `5 the phone: nothing off the side (${ph.wide}px), each tick 32px tall`);

ok(!errs.length, `no console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `${fail} failed` : 'Accepted: a dual line made of its lines by a tick, said under each name, on the factory, the control room and the papers; a machine named anywhere joins its line\'s list, and a dual line offers both lines\' machines');
process.exit(fail ? 1 : 0);
