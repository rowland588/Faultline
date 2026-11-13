/* FC-241 part 7 — WHY EACH STOP HAPPENED, AND THE STOPS RANKED BY REASON (knowledge/specs/FC-241-workstation-stops.md, criteria 27–29 —
 * Rowland, 13 November, timing Cellox live: "the interface allows me to stop many things at the same time — we need additional reasons to
 * the stop"). Driven in the real page, the clock moved by the script:
 *   1  two workstations stopped AT THE SAME TIME; each tile offers Why? while it is stopped — a reason typed once on the Filler ("Jam");
 *   2  both run again: each stop kept as its own line with its minutes; the Sealer's reason picked AFTER it ran again — "Jam" now a tap;
 *   3  a third stop with another reason typed ("No film"), a fourth left with no reason;
 *   4  the sentence and the bars by reason equal the definition's own, worked from the record;
 *   5  Every stop timed: a reason changed where it sits, a stop taken off — its workstation's minutes and count following;
 *   6  kept after a reload; 7 the paper: What each reason cost and Every stop timed; 8 a viewer changes nothing; 9 the phone. */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => s.replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'ws-why-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true, locale: 'en-GB' });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 200)); });
await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
const tick = async ms => { await page.clock.runFor(ms); await page.waitForTimeout(120); };
const study = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);

await page.goto(`${BASE}/#/room`); await tick(2500);
const { id } = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const t = Date.now(), id = crypto.randomUUID();
  await db.putStudy({ id, tool: 'calc', name: 'Stops — packing hall', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {},
    agreed: { calc: { key: 'workstation-stops', inputs: { n: 3, unit: 'kg', same: 'same', per: 'min', rate: 12, w01_name: 'Filler', w02_name: 'Sealer', w03_name: 'Packer' } } } });
  return { id };
});
await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await tick(2500);
const tile = i => page.locator(`.calc-tile[data-tile="${i}"]`);
const press = async i => { await tile(i).locator('[data-timer]').click(); await tick(300); };
const typeWhy = async (scope, words) => { await scope.locator('select[data-why]').selectOption({ label: '＋ Another reason…' }); await tick(200); await scope.locator('[data-why-input]').fill(words); await scope.locator('[data-why-add]').click(); await tick(300); };

/* ---- 1 · two stopped at once; the reason typed while stopped ---- */
ok(await tile(0).locator('select[data-why]').count() === 0, '1 a workstation that has not stopped offers no reason');
await press(0); await tick(60_000); await press(1);
ok(/Running again/.test(await tile(0).innerText()) && /Running again/.test(await tile(1).innerText()), '1 two workstations are stopped at the same time');
ok(await tile(0).locator('select[data-why]').count() === 1 && await tile(1).locator('select[data-why]').count() === 1, '1 each offers Why? while it is stopped');
await typeWhy(tile(0), 'Jam');
ok(await tile(0).locator('select[data-why]').inputValue() === 'Jam', '1 the reason typed is held on the stopped workstation');

/* ---- 2 · both run again; the Sealer's reason picked after ---- */
await tick(60_000); await press(0);           /* the Filler: 2 min */
await tick(8 * 60_000); await press(1);       /* the Sealer: 9 min */
let s = await study(id);
/* the clock is moved by the script; a press takes a moment of its own, so a minute timed is a minute to within a few hundredths */
const near = (a, b) => Math.abs(a - b) <= 0.06;
const done = () => String(s.agreed.calc.inputs.stopsdone ?? '').split(';').filter(Boolean).map(x => { const [i, , min, why] = x.split('~'); return { i: Number(i), min: Number(min), why: decodeURIComponent(why) }; });
ok(done().length === 2 && done()[0].i === 0 && near(done()[0].min, 2) && done()[0].why === 'Jam', `2 the Filler's stop is its own line: 2 min, Jam`, JSON.stringify(done()));
ok(done()[1].i === 1 && near(done()[1].min, 9) && done()[1].why === '', `2 the Sealer's stop is kept with no reason yet: 9 min`, JSON.stringify(done()));
ok(s.agreed.calc.inputs.w01_min === done()[0].min && s.agreed.calc.inputs.w02_min === done()[1].min && s.agreed.calc.inputs.w01_stops === 1, '2 the minutes and the count are as before');
const opts = await tile(1).locator('select[data-why] option').allInnerTexts();
ok(opts.includes('Jam'), `2 “Jam”, typed once, is now a tap on another workstation: ${opts.join(' | ')}`);
await tile(1).locator('select[data-why]').selectOption('Jam'); await tick(400);
s = await study(id);
ok(done()[1].why === 'Jam', '2 the reason picked after it ran again is kept on that stop');

/* ---- 3 · another reason, and one with none ---- */
await press(2); await typeWhy(tile(2), 'No film'); await tick(3 * 60_000); await press(2);   /* the Packer: 3 min, No film */
await press(0); await tick(4 * 60_000); await press(0);                                       /* the Filler: 4 min, no reason */
s = await study(id);
ok(done().length === 4 && done()[2].why === 'No film' && near(done()[2].min, 3) && done()[3].why === '' && near(done()[3].min, 4), '3 four stops, each its own line', JSON.stringify(done()));

/* ---- 4 · the page says what the definition says ---- */
const want = await page.evaluate(async i => {
  const [{ runCalc }, def, db] = await Promise.all([import('/src/tools/calc/calc.ts'), import('/src/tools/calc/defs/workstation-stops.ts'), import('/src/db.ts')]);
  const st = await db.getStudy(i);
  const r = runCalc(def.default, st.agreed.calc.inputs).result;
  return { why: r.more.find(m => m.startsWith('By reason:')), bars: r.bars2.rows.map(x => [x.label, x.aText, x.bText]), verdict: r.verdict };
}, id);
/* by hand, to the minute: Jam 2 + 9 = 11 min × 12 = 132 kg (61.1%); No film 3 min = 36 kg; no reason 4 min = 48 kg (22.2%); in all 18 min, 216 kg.
   The exact figures to the hundredth are proved on case R in workstationStops.test.ts; here the page must say what the definition says of
   the record as it was timed, and that must be those figures to within the presses. */
const m = /^By reason: Jam cost the most — ([\d.]+) kg \(61\.\d%\) from 2 stops, ([\d.]+) min, most of it on Sealer\. Then No film ([\d.]+) kg\. ([\d.]+) min \(([\d.]+) kg, 22\.\d%\) have no reason given\. A reason is what was seen at the time, not yet a cause\.$/.exec(want.why ?? '');
ok(!!m && Math.abs(m[1] - 132) < 1.5 && Math.abs(m[2] - 11) < 0.13 && Math.abs(m[3] - 36) < 0.8 && Math.abs(m[4] - 4) < 0.07 && Math.abs(m[5] - 48) < 0.8, '4 the definition gives the hand-worked figures (to within the presses)', want.why);
const out = flat(await page.locator('.calc-out').innerText());
ok(out.includes(flat(want.why)), '4 the sentence by reason is on the page');
const bars = await page.locator('[data-calc-bars2] [data-bar]').evaluateAll(els => els.map(e => e.getAttribute('data-bar')));
ok(JSON.stringify(bars) === JSON.stringify(['Jam', 'No film', 'No reason given']), `4 the bars by reason, in order: ${bars.join(' · ')}`);
const barsText = flat(await page.locator('[data-calc-bars2]').innerText());
ok(want.bars.every(([l, a, bt]) => barsText.includes(l) && barsText.includes(flat(a)) && barsText.includes(flat(bt))), '4 every bar carries the definition’s figures', barsText.slice(0, 300));
ok(/What each workstation lost/.test(await page.locator('[data-calc-bars]').innerText()), '4 the bars by workstation are still there');

/* ---- 5 · every stop timed: a reason changed, a stop taken off ---- */
const list = page.locator('[data-stops-done]');
ok(/Every stop timed · 4 · 1 with no reason/.test(flat(await list.locator('summary').innerText())), `5 the list counts them: ${flat(await list.locator('summary').innerText())}`);
await list.locator('summary').click(); await tick(300);
ok(await list.locator('[data-stop]').count() === 4, '5 a line a stop');
const noWhy = list.locator('[data-stop]').first();   /* newest first: the Filler's 4 min */
ok(/Filler/.test(await noWhy.innerText()) && /4(\.0\d)? min/.test(await noWhy.innerText()), '5 newest first — the Filler’s four minutes', await noWhy.innerText());
await noWhy.locator('select[data-why]').selectOption('No film'); await tick(400);
s = await study(id);
ok(done()[3].why === 'No film', '5 a reason changed where it sits is kept');
ok(!/no reason given/i.test(flat(await page.locator('.calc-out').innerText()).split('A reason is what was seen')[0].split('By reason:')[1] ?? ''), '5 the sentence no longer says a stop has no reason');
await list.locator('[data-stop]').first().locator('[data-stop-off]').click(); await tick(500);
s = await study(id);
ok(done().length === 3 && near(s.agreed.calc.inputs.w01_min, 2) && s.agreed.calc.inputs.w01_stops === 1, '5 a stop taken off takes its minutes and its count off the Filler', JSON.stringify(s.agreed.calc.inputs));
ok(String(s.agreed.calc.inputs.stoplog).split(';').filter(Boolean).length === 3, '5 and its moment out of the log the science reads');

/* ---- 6 · kept after a reload ---- */
await page.reload(); await page.waitForSelector('.calc-tile', { timeout: 20000 }); await tick(2500); await page.waitForTimeout(800);
ok(/Every stop timed · 3/.test(flat(await page.locator('[data-stops-done] summary').innerText())) && await page.locator('[data-calc-bars2] [data-bar]').count() === 2, '6 kept after a reload');
ok(await tile(1).locator('select[data-why]').inputValue() === 'Jam', '6 the Sealer’s tile still says why it last stopped');

/* ---- 7 · the paper ---- */
const pdf = join(dir, 'stops.pdf');
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, / — on paper$/)]);
await dl.saveAs(pdf);
const text = dl ? execFileSync('pdftotext', ['-layout', pdf, '-']).toString().replace(/\s+/g, ' ') : '';
ok(/What each reason cost/.test(text) && /Jam/.test(text) && /No film/.test(text), '7 the paper carries What each reason cost with every reason', text.slice(0, 200));
ok(/Every stop timed/.test(text) && (text.match(/Filler|Sealer|Packer/g) ?? []).length >= 6 && /Workstation\s+Began\s+Minutes\s+Why/.test(text), '7 and Every stop timed, a line a stop');

/* ---- 8 · a viewer changes nothing ---- */
/* a client on a project (the app's own read-only case, as calc-shape proves it): the record put in a seeded project, access forced */
await page.evaluate(async i => { const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest(); const D = await import('/src/db.ts'); await D.patchStudy(i, { projectId: sd.projectId }); localStorage.setItem('faultline.access.force', 'client'); }, id);
await page.reload(); await page.waitForSelector('.calc-tile', { timeout: 20000 }); await tick(2500); await page.waitForTimeout(800);
ok(await page.locator('.calc-tile select[data-why]').count() === 0 && await page.locator('[data-timer]').count() === 0, '8 a client is offered no Stopped button and no reason control');
await page.locator('[data-stops-done] summary').click().catch(() => {}); await tick(300);
const seen = await page.locator('[data-stops-done]').evaluate(e => { e.open = true; return e.textContent; }).catch(() => 'none');
ok(await page.locator('[data-stop-off]').count() === 0 && /Jam/.test(seen), '8 and reads every stop with its reason, with nothing to take off', seen);
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 9 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForSelector('.calc-tile', { timeout: 20000 }); await tick(2500); await page.waitForTimeout(800);
const off = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(off <= 1, `9 nothing off the side on a phone (${off}px)`);
const h = await page.locator('.calc-tile[data-tile="1"] select[data-why]').evaluate(e => e.getBoundingClientRect().height).catch(() => 0);
ok(h >= 44, `9 the reason control is a thumb’s height (${h}px)`);

ok(errs.length === 0, 'no console errors', errs.join(' | '));
await b.close();
if (fail) { console.log(`\n${fail} acceptance check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
