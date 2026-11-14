/* FC-241 part 8 — THE STOPS TIMED IN THE TOOL, ON THE LINE'S OWN STOP LOG (knowledge/specs/FC-241-workstation-stops.md, criteria 33–35 —
 * Rowland, 13 November: "the cellox tool I'm using for stops is great and think the 6M tool could use similar for pareto … we need
 * additional reasons to the stop; that all could be very powerful"). Case R of part 7 on a record on Line 7, driven in the real page:
 *   1  Every stop timed says the six stops are only in this record and offers to put them on Line 7's stop log; nothing on the log yet;
 *   2  pressed: six stops on the line's log — the reason the category, the workstation the machine, the minutes as timed, each saying where
 *      it came from; by reason Jam 13.5, No film 5.5, No reason given 4 min (case R, by hand); the page says so and offers the Pareto;
 *   3  pressed again by a reload: still six, never twelve;
 *   4  a reason changed in the record changes that stop on the log; a stop taken off the record is off the log;
 *   5  a stop timed afterwards (the clock moved by the script) is on the log by itself;
 *   6  the line's Pareto page ranks the reasons; a 6M started on the line reads them on its Pareto;
 *   7  Take them off the line's log: none left, the record's own stops untouched;
 *   8  a record on no line says so and offers nothing; 9 the phone — the button 44 px, nothing off the side. */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => s.replace(/\s+/g, ' ').trim();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 200)); });
const T0 = new Date('2026-11-13T09:00:00').getTime();
await page.clock.install({ time: new Date('2026-11-13T11:00:00') });
const tick = async ms => { await page.clock.runFor(ms); await page.waitForTimeout(150); };

await page.goto(`${BASE}/#/room`); await tick(2500);
const { id, ws, loose } = await page.evaluate(async T => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const t = Date.now(), id = crypto.randomUUID(), loose = crypto.randomUUID();
  const M = 60000;
  const stops = [[0, T, 2, 'Jam'], [0, T + 10 * M, 1.5, 'Jam'], [0, T + 20 * M, 3, 'No film'], [2, T + M, 10, 'Jam'], [2, T + 30 * M, 4, ''], [3, T + 2 * M, 2.5, 'No film']];
  const inputs = { n: 4, unit: 'kg', same: 'same', per: 'min', rate: 12, w01_name: 'Filler', w02_name: 'Wrapper', w03_name: 'Sealer', w04_name: 'Packer',
    w01_min: 6.5, w01_stops: 3, w03_min: 14, w03_stops: 2, w04_min: 2.5, w04_stops: 1,
    stopsdone: stops.map(([i, at, min, why]) => `${i}~${at}~${min}~${encodeURIComponent(why)}`).join(';'), stoplog: stops.map(s => s[1]).join(';') };
  await db.putStudy({ id, tool: 'calc', name: 'Cellox stops', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {}, agreed: { calc: { key: 'workstation-stops', inputs } } });
  await db.putStudy({ id: loose, tool: 'calc', name: 'Stops on no line', uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {}, agreed: { calc: { key: 'workstation-stops', inputs } } });
  return { id, ws: ws.id, loose };
}, T0);
const log = () => page.evaluate(async w => (await (await import('/src/db.ts')).listObservations(w)).map(o => ({ id: o.id, c: o.category, a: o.asset, at: o.startedAt, ms: o.durationMs, note: o.note, timing: o.timing })), ws);
const study = i => page.evaluate(async k => (await import('/src/db.ts')).getStudy(k), i);
const minsBy = (l, c) => Math.round(l.filter(o => o.c === c).reduce((t, o) => t + o.ms, 0) / 600) / 100;
const open = async i => { await page.goto(`${BASE}/#/calc/workstation-stops/${i}`); await tick(2500); const d = page.locator('[data-stops-done]'); if (!(await d.evaluate(e => e.open))) await d.locator('summary').click(); await tick(300); };
const says = async () => flat(await page.locator('[data-stops-line-says]').innerText());

/* ---- 1 · only in the record ---- */
await open(id);
ok((await says()) === '6 stops are only in this record. Put them on Line 7’s stop log and its Pareto and its 6M read them — each stop as timed here, its reason what the Pareto ranks, its workstation the machine.', '1 the page says the six stops are only in this record', await says());
ok((await log()).length === 0, '1 nothing is on the line’s log until the person says so');
ok(flat(await page.locator('[data-stops-to-line]').innerText()) === 'Put these stops on Line 7’s stop log', '1 the button names the line');

/* ---- 2 · put on the line ---- */
await page.locator('[data-stops-to-line]').click(); await tick(1500);
let l = await log();
ok(l.length === 6, `2 six stops are on Line 7’s log (${l.length})`);
ok(minsBy(l, 'Jam') === 13.5 && minsBy(l, 'No film') === 5.5 && minsBy(l, 'No reason given') === 4, `2 by reason as case R works it: Jam ${minsBy(l, 'Jam')}, No film ${minsBy(l, 'No film')}, none ${minsBy(l, 'No reason given')}`);
const sealerJam = l.find(o => o.a === 'Sealer' && o.c === 'Jam');
ok(sealerJam && sealerJam.ms === 600000 && sealerJam.at === T0 + 60000 && sealerJam.timing === 'stopwatch', '2 a stop is as timed: its workstation the machine, its start and its ten minutes', JSON.stringify(sealerJam));
ok(l.every(o => o.note === 'From Stops across workstations — Cellox stops'), '2 each says the record it came from');
ok(l.every(o => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(o.id)), '2 each id is a uuid the cloud will take');
ok((await says()) === 'On Line 7’s stop log: 6 stops from this record, kept in step as you time more, change a reason or take one off. Its Pareto and its 6M read them.', '2 the page says they are on the line’s log', await says());
ok((await study(id)).facts.lineStops?.ids.length === 6 && (await study(id)).facts.lineStops.lineId === ws, '2 the record keeps which stops it sent');
ok(await page.locator('[data-stops-to-line]').count() === 0 && await page.locator('[data-stops-line-pareto]').count() === 1, '2 the button gives way to the line’s Pareto');

/* ---- 3 · never twice ---- */
await open(id);
ok((await log()).length === 6, '3 after a reload still six on the log, never twelve');

/* ---- 4 · a reason changed, a stop taken off ---- */
const row = k => page.locator(`[data-stops-done] [data-stop="${k}"]`);
await row(4).locator('select[data-why]').selectOption('No film'); await tick(1800);
l = await log();
ok(l.length === 6 && minsBy(l, 'No reason given') === 0 && minsBy(l, 'No film') === 9.5, `4 a reason given in the record is that stop’s reason on the log (No film ${minsBy(l, 'No film')}, none ${minsBy(l, 'No reason given')})`);
await row(5).locator('[data-stop-off]').click(); await tick(1800);
l = await log();
ok(l.length === 5 && !l.some(o => o.a === 'Packer'), `4 a stop taken off the record is off the log (${l.length})`);

/* ---- 5 · one more timed afterwards ---- */
const tile = i => page.locator(`.calc-tile[data-tile="${i}"]`);
await tile(1).locator('[data-timer]').click(); await tick(3 * 60000); await tile(1).locator('[data-timer]').click(); await tick(2000);
l = await log();
const wrap = l.find(o => o.a === 'Wrapper');
ok(l.length === 6 && wrap && Math.abs(wrap.ms - 180000) < 5000 && wrap.c === 'No reason given', `5 a stop timed afterwards is on the log by itself (${l.length})`, JSON.stringify(wrap));
ok(/6 stops from this record/.test(await says()), '5 the page counts it', await says());

/* ---- 6 · the line's Pareto and a 6M on the line ---- */
await page.locator('[data-stops-line-pareto]').click(); await tick(2500); await page.waitForTimeout(1500); await tick(1500);
let body = flat(await page.locator('body').innerText());
ok(/Jam/.test(body) && /No film/.test(body), '6 the line’s Pareto page names the reasons timed in the tool');
await page.goto(`${BASE}/#/sixm?line=${ws}`); await tick(2000);
await page.locator('[data-sixm-name]').fill('Stops at Cellox');
await page.locator('[data-sixm-start]').click(); await tick(3000);
const tab = page.locator('.view-tabs button, .view-tabs a, [role="tab"]', { hasText: 'Pareto' }).first();
await tab.click(); await tick(2500);
body = flat(await page.locator('main').innerText());
ok(/Jam/.test(body) && /No film/.test(body), '6 a 6M started on the line reads the same reasons on its Pareto', body.slice(0, 300));

/* ---- 7 · taken off the line ---- */
await open(id);
await page.locator('[data-stops-off-line]').click(); await tick(1800);
ok((await log()).length === 0, '7 taken off the line’s log: none left there');
const s = await study(id);
ok(!s.facts.lineStops && String(s.agreed.calc.inputs.stopsdone).split(';').length === 6, '7 the record’s own stops are untouched');
ok(await page.locator('[data-stops-to-line]').count() === 1, '7 and the offer is back');

/* ---- 8 · a record on no line ---- */
await open(loose);
ok(/on no line/.test(await says()) && await page.locator('[data-stops-to-line]').count() === 0, '8 a record on no line says so and offers nothing', await says());

/* ---- 9 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await open(id);
const box = await page.locator('[data-stops-to-line]').boundingBox();
ok(box && box.height >= 44, `9 the button is a thumb’s height (${box?.height})`);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '9 nothing off the side');

ok(errs.length === 0, 'no console errors', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
