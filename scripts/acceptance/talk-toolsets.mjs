/* LINE TALK TOOLSETS, slices T0–T1 (docs/LINE-TALK-TOOLSETS.md; knowledge/specs/FC-202-toolsets.md — Rowland, 6 November: "a flow diagram while
 * I'm talking ... then having a report generated in the correct format"): the assistant answered by the script, as line-talk-assistant.mjs does.
 *   1  the kinds of walk on a talk — Walk & report pressed by default, Flow diagram chosen, kept after a reload and on the talk's record, an empty
 *      diagram saying what to say first
 *   2  the record's tray said in two turns — the first seven steps drawn at once by the process flow chart's own page (the request carrying the set,
 *      no draft yet), then all fourteen, the request carrying the draft as the person has it; the sentence the calculator's own
 *   3  a step put right in the draft (minutes) — kept, the chart following, sent back with the next turn; no figure the assistant gave that the person did not say
 *   4  Make it — one Process flow chart on the talk's line, From a talk, each box marked with the Line Talk it came from; Open it landing on it with its sentence
 *      equal to the typed tray's; the button now Update it, never a second chart; Undo taking it away
 *   5  Update it — the steps changed in the same chart, the money typed on the chart kept
 *   6  the made chart's paper read back: the sentence, the steps and where they came from
 *   7  the phone — the chips, the Talk and Diagram tabs 44 px, the chart inside the screen, nothing off the side
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

/* the knowledge record's tray as the gateway hands it back: classed, converted, with what was said (scripts/knowledge/cases-kaizen.py F) */
const TRAY = [
  ['Mix and portion', 'operation', 2, undefined, '120 seconds'], ['To the oven', 'transport', 1.5, 30, '90 seconds, 30 metres'], ['Waiting for the oven', 'delay', 12, undefined, '12 minutes'],
  ['Bake', 'operation', 3.5, undefined, '3.5 minutes'], ['Check the core', 'inspection', 1, undefined, '1 minutes'], ['To the chiller', 'transport', 2, 45, '2 minutes, 45 metres'],
  ['Chill', 'storage', 240, undefined, '4 hours'], ['To the pack area', 'transport', 1, 20, '60 seconds, 20 metres'], ['Pack', 'operation', 4, undefined, '4 minutes'],
  ['Waiting for QA release', 'delay', 8, undefined, '8 minutes'], ['To the despatch bay', 'transport', 1.5, 25, '90 seconds, 25 metres'], ['Palletise', 'operation', 1.5, undefined, '90 seconds'],
  ['Weigh and label', 'inspection', 0.5, undefined, '30 seconds'], ['To the lorry', 'transport', 1, 20, '1 minutes, 20 metres'],
];
const cap = n => ({ set: 'flow', title: 'Tray, oven to despatch pallet', steps: TRAY.slice(0, n).map(([what, kind, min, m, said]) => ({ what, kind, ...(min !== undefined ? { min } : {}), ...(m !== undefined ? { m } : {}), said })) });
const SENTENCE = '14 steps: 4 change the product, 5 move it, 2 check it, 2 delay it and 1 stores it. It takes 279.5 min; 3.9% of that is operations and 93% is waiting';

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
const dir = mkdtempSync(join(tmpdir(), 'talk-toolsets-'));
const talkOf = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);
const calcs = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'calc'));

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

/* 1 — the kinds of walk */
ok(await page.locator('[data-set=walk]').getAttribute('aria-pressed') === 'true' && await page.locator('[data-set=flow]').getAttribute('aria-pressed') === 'false', '1 Walk & report is the walk until another is chosen');
ok(await diagram().count() === 0, '1 and no diagram is drawn for it');
await page.locator('[data-set=flow]').click(); await settle(500);
ok(await page.locator('[data-set=flow]').getAttribute('aria-pressed') === 'true' && (await talkOf(talkId)).facts.set === 'flow', '1 Flow diagram chosen — and kept on the talk');
ok(await diagram().count() === 1 && /Nothing to draw yet/.test(await diagram().innerText()), '1 an empty diagram says what to say first');
await page.reload(); await settle(1500);
ok(await page.locator('[data-set=flow]').getAttribute('aria-pressed') === 'true', '1 kept after a reload');

/* 2 — the tray said in two turns */
plan.push({ a: { reply: 'Got the first seven. How long did the chill take, and was that planned?', capture: cap(7) } });
await send('Mix and portion takes 2 minutes, it goes to the oven 30 metres in 90 seconds, waits 12 minutes, bakes 3.5 minutes, the core is checked in a minute, to the chiller 45 metres in 2 minutes, chilled for 4 hours');
ok(await waitFor(async () => /7 steps so far/.test(await diagram().innerText().catch(() => ''))), '2 the first seven steps drawn by the chart as soon as the answer is kept', await diagram().innerText().catch(() => ''));
const a1 = asks[0];
ok(a1?.set === 'flow' && a1.draft === undefined, '2 asked as a flow-diagram talk, no draft yet', JSON.stringify({ set: a1?.set, draft: a1?.draft }));
ok(/7 steps: 2 change the product, 2 move it, 1 checks it, 1 delays it and 1 stores it/.test(await diagram().innerText()), '2 the chart’s own sentence for them', await diagram().innerText());
plan.push({ a: { reply: 'That’s the whole path — fourteen steps. Do you want it made?', capture: cap(14) } });
await send('Then to the pack area 20 metres in a minute, pack 4 minutes, wait for QA 8 minutes, to the despatch bay 25 metres, palletise, weigh and label, and to the lorry 20 metres');
ok(await waitFor(async () => /14 steps so far/.test(await diagram().innerText().catch(() => ''))), '2 all fourteen steps');
ok((await diagram().innerText()).replace(/\s+/g, ' ').includes(SENTENCE), '2 the sentence is the calculator’s, equal to the typed tray’s (14 steps, 279.5 min)', (await diagram().innerText()).replace(/\s+/g, ' ').slice(0, 500));
const a2 = asks[1];
ok(/The diagram so far: Tray, oven to despatch pallet — 7 steps/.test(a2?.draft ?? '') && /Chill — storage, 240 min/.test(a2.draft), '2 the second ask carried the draft as the person has it', a2?.draft);

/* 3 — a step put right in the draft */
const lorryMin = diagram().locator('input[aria-label="Step 14 minutes"]');
await lorryMin.fill('2'); await lorryMin.press('Enter'); await page.waitForTimeout(700);
ok(/280\.5 min/.test(await diagram().innerText()), '3 the chart follows the edit (280.5 min)', (await diagram().innerText()).replace(/\s+/g, ' ').slice(0, 400));
ok(!(await diagram().locator('li.tk-dstep').nth(13).innerText()).includes('said:'), '3 an edited step no longer claims what was said');
plan.push({ a: { reply: 'Right — 2 minutes to the lorry.', capture: { ...cap(14), steps: cap(14).steps.map((s, i) => (i === 13 ? { ...s, min: 2, said: undefined } : s)) } } });
await send('Make the lorry run two minutes');
ok(await waitFor(async () => asks.length === 3), '3 asked again');
ok(/To the lorry — transport, 2 min, 20 m/.test(asks[2]?.draft ?? ''), '3 the person’s minute went back to the assistant', asks[2]?.draft);
plan.length = 0;
// put the minute back for the equality below
await diagram().locator('input[aria-label="Step 14 minutes"]').fill('1'); await diagram().locator('input[aria-label="Step 14 minutes"]').press('Enter'); await page.waitForTimeout(600);
ok((await diagram().innerText()).replace(/\s+/g, ' ').includes(SENTENCE), '3 put back, the chart says the tray again');

/* 4 — Make it */
ok(await diagram().locator('[data-make]').count() === 1 && await diagram().locator('[data-update]').count() === 0, '4 Make it offered, Update it not yet');
await diagram().locator('[data-make]').click();
ok(await waitFor(async () => (await calcs()).length === 1), '4 one Process flow chart made');
const made = (await calcs())[0];
ok(made.agreed.calc.key === 'process-flow' && made.workspaceId === lineId && made.facts.fromTalk?.talk === talkId, '4 on the talk’s line, From a talk with the link back', JSON.stringify({ k: made.agreed?.calc?.key, w: made.workspaceId, f: made.facts?.fromTalk }));
ok(/^the Line Talk of /.test(made.agreed.calc.src?.s01_what ?? '') && made.agreed.calc.inputs.s14_min === 1 && made.agreed.calc.inputs.s02_m === 30, '4 each box marked as said in the talk, the minutes and metres as said', JSON.stringify(made.agreed.calc.src));
ok((await talkOf(talkId)).facts.made?.id === made.id, '4 the talk remembers the chart it made');
ok(await waitFor(async () => await diagram().locator('[data-update]').count() === 1 && await diagram().locator('[data-make]').count() === 0), '4 now Update it, and Open it — never a second Make it');
await diagram().locator('[data-open-made]').click(); await settle(1500);
ok(new RegExp(`#/calc/process-flow/${made.id}`).test(page.url()), '4 Open it lands on the chart', page.url());
ok(await page.locator('[data-from-talk]').count() === 1, '4 the chart says it is from a Line Talk');
ok((await page.locator('.ie-calc').innerText()).replace(/\s+/g, ' ').includes(SENTENCE), '4 and says the typed tray’s sentence on its own page');

/* 6 — the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(dir, 'flow.pdf'); await dl.saveAs(pdf);
const txt = pdfText(pdf).replace(/\s+/g, ' ');
ok(txt.includes('279.5 min') && /Waiting for QA release/.test(txt) && /Line Talk of/.test(txt), '6 the paper: the sentence, the steps and where they came from (the Line Talk)', txt.slice(0, 500));

/* 5 — Update it keeps the money typed on the chart */
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => ({ agreed: { ...cur.agreed, calc: { ...cur.agreed.calc, inputs: { ...cur.agreed.calc.inputs, perDay: 30, rate: 15 } } } })); }, made.id);
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1200);
const palletMin = diagram().locator('input[aria-label="Step 12 minutes"]');
await palletMin.fill('2'); await palletMin.press('Enter'); await page.waitForTimeout(600);
await diagram().locator('[data-update]').click(); await page.waitForTimeout(900);
const after = (await calcs());
ok(after.length === 1 && after[0].id === made.id && after[0].agreed.calc.inputs.s12_min === 2, '5 Update it changed the same chart (still one)', JSON.stringify(after.map(a => [a.id === made.id, a.agreed.calc.inputs.s12_min])));
ok(after[0].agreed.calc.inputs.perDay === 30 && after[0].agreed.calc.inputs.rate === 15, '5 and kept the money typed on the chart');

/* 4 — Undo */
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => { const { made: _m, ...rest } = cur.facts; return { facts: rest }; }); }, talkId);
await page.reload(); await settle(1500);
await diagram().locator('[data-make]').click();
ok(await waitFor(async () => (await calcs()).length === 2), '4 a talk whose chart was let go makes a new one on Make it');
await page.getByRole('button', { name: 'Undo' }).click();
ok(await waitFor(async () => (await calcs()).length === 1) && !(await talkOf(talkId)).facts.made, '4 Undo takes the chart away and the talk forgets it');

/* 7 — the phone */
const ph = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
await ph.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ph.route('**://*.supabase.co/**', r => r.abort());
const p2 = await ph.newPage();
p2.on('pageerror', e => errs.push(e.message));
await p2.goto(`${BASE}/#/room`); await p2.waitForTimeout(2000);
const t2 = await p2.evaluate(async lineId => {
  const db = await import('/src/db.ts');
  const t = Date.now(), id = crypto.randomUUID();
  const reply = { id: crypto.randomUUID(), at: t, who: 'Line Talk', kind: 'reply', text: 'Got it.', capture: { set: 'flow', title: 'Tray', steps: [{ what: 'Mix and portion', kind: 'operation', min: 2 }, { what: 'To the oven', kind: 'transport', min: 1.5, m: 30 }, { what: 'Waiting for the oven', kind: 'delay', min: 12 }] } };
  await db.putStudy({ id, tool: 'talk', name: 'Line 7 — phone', workspaceId: lineId, facts: { set: 'flow', turns: [{ id: crypto.randomUUID(), at: t - 1000, kind: 'typed', text: 'mix then oven' }, reply] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  return id;
}, lineId);
await p2.goto(`${BASE}/#/talk/${t2}`); await p2.waitForTimeout(1800);
const chips = await p2.locator('.tk-sets .chip').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(chips.length === 2 && chips.every(h => h >= 36), '7 the kinds of walk on the phone', chips.join(','));
ok(await p2.locator('[data-diagram]').count() === 0 && await p2.locator('.tk-turns').isVisible(), '7 the talk first, the diagram a tab away');
await p2.locator('[data-view-diagram]').click(); await p2.waitForTimeout(600);
ok(await p2.locator('[data-diagram]').count() === 1 && !(await p2.locator('.tk-turns').isVisible()), '7 the Diagram tab shows the chart and rests the talk');
const tabH = await p2.locator('.tk-view').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(tabH.every(h => h >= 43), '7 the tabs a thumb’s height', tabH.join(','));
const wide = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '7 nothing off the side', String(wide));
const makeH = await p2.locator('[data-make]').evaluate(e => Math.round(e.getBoundingClientRect().height));
ok(makeH >= 43, '7 Make it a thumb’s height', String(makeH));

ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nLine Talk toolsets accepted: a flow diagram talked into a Process flow chart, made, updated and taken back, its paper read back, the phone fits');
process.exit(fail ? 1 : 0);
