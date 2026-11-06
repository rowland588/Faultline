/* LINE TALK TOOLSETS, slice T3 — THE VALUE STREAM SET (docs/LINE-TALK-TOOLSETS.md §4.3, knowledge/specs/FC-202-toolsets.md criterion 10 — Rowland, 6 November: "my voice
 * would populate that tool … visually that tool's very, very good"): the assistant answered by the script, as talk-spaghetti.mjs does, with cases-kaizen.py V1 as the walk.
 *   1  Value stream chosen among four kinds of walk — kept on the talk and after a reload, an empty map saying what to say first
 *   2  the stream said in two turns — three steps drawn at once by the Value stream tool's own grid, then all six: the request carrying the set and the draft as the person has it;
 *      the tool's own figures (lead time 9.1 h, 90 s adds value, 330 s necessary, 31,500 s non-value adding, 0.3% value added, 2 steps not classified), a lane a person
 *   3  a step classed by the person in the draft (VA on a step) and a time put right — the map following, sent back; the assistant never classed a step
 *   4  Make it — one Value stream map on the talk's line (the tool's own record, tool map), From a Line Talk, each step as said; Open it landing on the map with its grid;
 *      Update it changing the same map, keeping a step's id and what the person added on the map and the money typed there; Undo
 *   5  its paper read back (the tool's own: the stream, its steps, where it came from)
 *   6  the phone — four kinds of walk, the Diagram tab, nothing off the side
 *  and no console error. */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' });

const STEPS = [
  ['Release the run to the line', 'operation', ['Planning'], 'Office', 10, 'minutes', 4, 'hours', ''],
  ['Issue the film and cases', 'move', ['Stores', 'Forklift driver'], 'Stores', 15, 'minutes', 2, 'hours', 'waste'],
  ['Bag and seal', 'operation', ['Machine'], 'Bagger', 90, 'seconds', undefined, '', 'adds'],
  ['Check the weight', 'check', ['Machine'], 'Checkweigher', 30, 'seconds', undefined, '', 'needed'],
  ['Pack into the case', 'operation', ['Op 2'], 'Case packer', 4, 'minutes', 30, 'minutes', ''],
  ['Stack on the pallet', 'operation', ['Op 3'], 'Palletiser', 5, 'minutes', 2, 'hours', 'needed'],
];
const SEC = { seconds: 1, minutes: 60, hours: 3600 };
const stepOf = ([name, kind, who, where, cycle, cu, wait, wu, value]) => ({ name, kind, who, where, ...(cycle !== undefined ? { cycleSec: cycle * SEC[cu] } : {}), ...(wait !== undefined ? { waitSec: wait * SEC[wu] } : {}),
  ...(value ? { value } : {}), said: [cycle !== undefined ? `${cycle} ${cu}` : '', wait !== undefined ? `waits ${wait} ${wu}` : ''].filter(Boolean).join(', ') });
const cap = n => ({ set: 'vs', title: 'Maris Piper 2 kg, run released to pallet away', supplier: 'Planning', customer: 'Despatch', steps: STEPS.slice(0, n).map(stepOf) });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());

const asks = [];
let plan = [];
const CORS = { 'access-control-allow-origin': '*' };
await ctx.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift() ?? { a: { reply: 'Noted.' } };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, answer: next.a, unsure: next.unsure ?? [], model: 'test-model' }) });
});

const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 300) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await page.waitForTimeout(150); } return false; };
const send = async text => { await page.locator('.tk-type textarea').fill(text); await page.locator('.tk-send').click(); };
const diagram = () => page.locator('[data-diagram]');
const dtext = async () => (await diagram().innerText().catch(() => '')).replace(/\s+/g, ' ');
const dir = mkdtempSync(join(tmpdir(), 'talk-vs-'));
const talkOf = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);
const maps = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'map'));
const card = async label => (await diagram().locator('.vs-card2').filter({ hasText: label }).first().locator('b').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const { lineId, talkId } = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const t = Date.now();
  const id = crypto.randomUUID();
  await db.putStudy({ id, tool: 'talk', name: 'Line 7 — walk', workspaceId: ws.id, facts: { turns: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  return { lineId: ws.id, talkId: id };
});
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1500);

/* 1 — the kind of walk */
ok(await page.locator('[data-set]').count() === 4, '1 four kinds of walk to choose from');
await page.locator('[data-set=vs]').click(); await settle(500);
ok(await page.locator('[data-set=vs]').getAttribute('aria-pressed') === 'true' && (await talkOf(talkId)).facts.set === 'vs', '1 Value stream chosen — and kept on the talk');
ok(await diagram().count() === 1 && /Nothing on the map yet/.test(await diagram().innerText()), '1 an empty map says what to say first');
await page.reload(); await settle(1500);
ok(await page.locator('[data-set=vs]').getAttribute('aria-pressed') === 'true', '1 kept after a reload');

/* 2 — the stream said in two turns */
plan.push({ a: { reply: 'Got the first three. What happens after the weight check?', capture: cap(3) } });
await send('The planner releases the run to the line, ten minutes in the office, and it waits four hours. Then stores issue the film and cases with the forklift driver, fifteen minutes, waits two hours — that one is waste. Then the machine bags and seals, ninety seconds, value adding.');
ok(await waitFor(async () => /3 steps so far/.test(await dtext())), '2 the first three steps on the map as soon as the answer is kept', await dtext());
const a1 = asks[0];
ok(a1?.set === 'vs' && a1.draft === undefined, '2 asked as a value stream talk, no draft yet', JSON.stringify({ set: a1?.set, draft: a1?.draft }));
plan.push({ a: { reply: 'That is the whole stream. Want it made?', capture: cap(6) } });
await send('Then the machine checks the weight, thirty seconds, necessary. Op 2 packs into the case, four minutes, waits half an hour. Op 3 stacks on the pallet, five minutes, waits two hours, necessary.');
ok(await waitFor(async () => /6 steps so far/.test(await dtext())), '2 all six steps', await dtext());
ok(await card('Lead time') === '9.1 h', '2 the lead time is the independent case’s: 9.1 h', await card('Lead time'));
ok(await card('Adds value') === '1.5 min' && await card('Necessary') === '5.5 min', '2 90 s adds value, 330 s necessary', `${await card('Adds value')} · ${await card('Necessary')}`);
ok(/0\.3%/.test(await card('% value added')), '2 0.27% value added, as the hand-worked case says', await card('% value added'));
ok(/2 steps/.test(await card('Not classified')), '2 two steps not classified — the assistant classed none of them', await card('Not classified'));
const a2 = asks[1];
ok(/The value stream so far: Maris Piper 2 kg, run released to pallet away — from Planning to Despatch — 3 steps/.test(a2?.draft ?? '') && /2\. Issue the film and cases — move, Stores \+ Forklift driver at Stores, cycle 900 s, waits after 7200 s, classed waste/.test(a2.draft), '2 the second ask carried the draft as the person has it', a2?.draft);
const grid = await diagram().locator('.vs').evaluate(el => ({ lanes: el.querySelectorAll('.vs-lane, [data-lane]').length, squares: el.querySelectorAll('[data-open]').length }));
ok(await diagram().locator('.vs').count() === 1 && grid.squares >= 6, '2 the Value stream tool’s own swimlane grid is drawn', JSON.stringify(grid));

/* 3 — the person classes a step and puts a time right */
await diagram().locator('[data-vstep="4"] [data-value=adds]').click(); await page.waitForTimeout(500);
ok(/1\.0%/.test(await card('% value added')) && /1 step/.test(await card('Not classified')), '3 Pack into the case classed VA by the person: 330 s of 32,760 is 1.0%, one step left unclassified', `${await card('% value added')} · ${await card('Not classified')}`);
const cyc = diagram().locator('input[aria-label="Step 6 cycle seconds"]');
await cyc.fill('600'); await cyc.press('Enter'); await page.waitForTimeout(600);
ok(await card('Lead time') === '9.2 h', '3 a cycle put right (5 → 10 minutes): lead time 9.2 h', await card('Lead time'));
ok(!(await diagram().locator('[data-vstep="5"]').innerText()).includes('said:'), '3 an edited step no longer claims what was said');
plan.push({ a: { reply: 'Right.', capture: cap(6) } });
await send('Carry on');
ok(await waitFor(async () => asks.length === 3), '3 asked again');
ok(/5\. Pack into the case — operation, Op 2 at Case packer, cycle 240 s, waits after 1800 s, classed value-adding/.test(asks[2]?.draft ?? '') && /6\. Stack on the pallet — operation, Op 3 at Palletiser, cycle 600 s/.test(asks[2].draft), '3 the person’s version — the class and the time — went back to the assistant', asks[2]?.draft);
plan.length = 0;
// the assistant's next answer is the whole stream again, as it hears it: the map says the example once more
ok(await waitFor(async () => await card('Lead time') === '9.1 h' && /2 steps/.test(await card('Not classified'))), '3 the assistant’s next answer carries the stream on, and the map says the example again', `${await card('Lead time')} · ${await card('Not classified')}`);

/* 4 — Make it */
ok(await diagram().locator('[data-make]').count() === 1 && await diagram().locator('[data-update]').count() === 0, '4 Make it offered, Update it not yet');
await diagram().locator('[data-make]').click();
ok(await waitFor(async () => (await maps()).length === 1), '4 one Value stream map made');
const made = (await maps())[0];
ok(made.workspaceId === lineId && made.facts.fromTalk?.talk === talkId && made.agreed.map.scope === 'line' && made.agreed.map.supplier === 'Planning' && made.agreed.map.customer === 'Despatch', '4 on the talk’s line, From a talk, the supplier and customer as said', JSON.stringify({ w: made.workspaceId, f: made.facts?.fromTalk, a: made.agreed?.map }));
ok(made.facts.flow.length === 6 && made.facts.flow[1].cycleSec === 900 && made.facts.flow[1].waitSec === 7200 && made.facts.flow[1].value === 'waste' && made.facts.flow[0].value === undefined && made.facts.flow[1].who.join('|') === 'Stores|Forklift driver', '4 the steps as said — the times in seconds, the value only where it was classed, nothing classed that was not', JSON.stringify(made.facts.flow.map(s => [s.name, s.cycleSec, s.waitSec, s.value])));
ok((await talkOf(talkId)).facts.made?.id === made.id, '4 the talk remembers the map it made');
ok(await waitFor(async () => await diagram().locator('[data-update]').count() === 1 && await diagram().locator('[data-make]').count() === 0), '4 now Update it, and Open it — never a second Make it');
await diagram().locator('[data-open-made]').click(); await settle(1500);
ok(new RegExp(`#/value-stream/${made.id}`).test(page.url()), '4 Open it lands on the map', page.url());
ok(await page.locator('[data-from-talk]').count() === 1, '4 the map says it is from a Line Talk');
ok(await page.locator('.vs').count() >= 1 && /9\.1 h/.test((await page.locator('.vs-cards').first().innerText()).replace(/\s+/g, ' ')), '4 and shows the tool’s own grid and figures — lead time 9.1 h');

/* 5 — the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(dir, 'vs.pdf'); await dl.saveAs(pdf);
const txt = pdfText(pdf).replace(/\s+/g, ' ');
ok(/Issue the film and cases/.test(txt) && /Stack on the pallet/.test(txt) && /9\.1 h|9\.1 hours/.test(txt), '5 the paper: the stream, its steps and the lead time', txt.slice(0, 500));

/* 4 — Update it keeps what was added on the map and the money typed there */
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => ({ agreed: { ...cur.agreed, map: { ...cur.agreed.map, pieceCost: 0.8, availableSecPerDay: 57600 } }, facts: { ...cur.facts, flow: cur.facts.flow.map((s, i) => (i === 2 ? { ...s, info: 'the board', burst: true } : s)) } })); }, made.id);
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1200);
const nm = diagram().locator('input[aria-label="Step 5 cycle seconds"]');
await nm.fill('300'); await nm.press('Enter'); await page.waitForTimeout(600);
await diagram().locator('[data-update]').click(); await page.waitForTimeout(900);
const after = await maps();
ok(after.length === 1 && after[0].id === made.id && after[0].facts.flow[4].cycleSec === 300, '4 Update it changed the same map (still one)', JSON.stringify(after.map(a => [a.id === made.id, a.facts.flow[4]?.cycleSec])));
ok(after[0].facts.flow.map(s => s.id).join() === made.facts.flow.map(s => s.id).join() && after[0].facts.flow[2].info === 'the board' && after[0].facts.flow[2].burst === true, '4 each step keeping its id and what was added to it on the map');
ok(after[0].agreed.map.pieceCost === 0.8 && after[0].agreed.map.availableSecPerDay === 57600, '4 and the money and the day’s seconds typed on the map kept');
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => { const { made: _m, ...rest } = cur.facts; return { facts: rest }; }); }, talkId);
await page.reload(); await settle(1500);
await diagram().locator('[data-make]').click();
ok(await waitFor(async () => (await maps()).length === 2), '4 a talk whose map was let go makes a new one on Make it');
await page.getByRole('button', { name: 'Undo' }).click();
ok(await waitFor(async () => (await maps()).length === 1) && !(await talkOf(talkId)).facts.made, '4 Undo takes the map away and the talk forgets it');

/* 6 — the phone */
const ph = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
await ph.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ph.route('**://*.supabase.co/**', r => r.abort());
const p2 = await ph.newPage();
p2.on('pageerror', e => errs.push(e.message));
await p2.goto(`${BASE}/#/room`); await p2.waitForTimeout(2000);
const t2 = await p2.evaluate(async ([lineId, c]) => {
  const db = await import('/src/db.ts');
  const t = Date.now(), id = crypto.randomUUID();
  const reply = { id: crypto.randomUUID(), at: t, who: 'Line Talk', kind: 'reply', text: 'Got it.', capture: c };
  await db.putStudy({ id, tool: 'talk', name: 'Line 7 — phone', workspaceId: lineId, facts: { set: 'vs', turns: [{ id: crypto.randomUUID(), at: t - 1000, kind: 'typed', text: 'six steps' }, reply] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  return id;
}, [lineId, cap(6)]);
await p2.goto(`${BASE}/#/talk/${t2}`); await p2.waitForTimeout(1800);
const chips = await p2.locator('.tk-sets .chip').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(chips.length === 4 && chips.every(h => h >= 36), '6 the kinds of walk on the phone', chips.join(','));
ok(await p2.locator('[data-diagram]').count() === 0 && await p2.locator('.tk-turns').isVisible(), '6 the talk first, the map a tab away');
await p2.locator('[data-view-diagram]').click(); await p2.waitForTimeout(600);
ok(await p2.locator('[data-diagram]').count() === 1 && !(await p2.locator('.tk-turns').isVisible()), '6 the Diagram tab shows the map and rests the talk');
ok(/Diagram · 6/.test(await p2.locator('[data-view-diagram]').innerText()), '6 the tab counts the steps');
const tabH = await p2.locator('.tk-view').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(tabH.every(h => h >= 43), '6 the tabs a thumb’s height', tabH.join(','));
const wide = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '6 nothing off the side', String(wide));
const makeH = await p2.locator('[data-make]').evaluate(e => Math.round(e.getBoundingClientRect().height));
ok(makeH >= 43, '6 Make it a thumb’s height', String(makeH));

ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nLine Talk value stream set accepted: a stream talked into the Value stream tool, classed only by the person, made, updated and taken back, its paper read back, the phone fits');
process.exit(fail ? 1 : 0);
