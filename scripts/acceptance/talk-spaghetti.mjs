/* LINE TALK TOOLSETS, slice T2 — THE SPAGHETTI SET (docs/LINE-TALK-TOOLSETS.md §4.2; knowledge/specs/FC-202-toolsets.md, FC-242 — Rowland, 6 November: "I have 4 operators
 * on the line … operator 1 goes to X, goes to X, operator 2 goes to X … it would literally create a spaghetti diagram for me"): the assistant answered by the script, as
 * talk-toolsets.mjs does, with cases-kaizen.py S3 as the walk.
 *   1  Spaghetti diagram chosen as the kind of walk — kept on the talk and after a reload, an empty diagram saying what to say first
 *   2  the example said in two turns — Operator 1 alone drawn at once, then all three: the request carrying the set and the draft as the person has it; the
 *      sentence the calculator's own (10 moves, 278 m, Operator 1 130 m, the line 5 times); the picture a schematic, not to scale, each person in a style of their own
 *   3  a place put right and a distance taken off in the draft — the diagram following (the length known for 9 of 10), the person's version sent back
 *   4  Make it — one Spaghetti diagram on the talk's line, From a talk, each box marked with the Line Talk it came from; Open it landing on its sentence; Update it
 *      changing the same record and keeping the hourly cost typed there; Undo taking it away
 *   5  its paper read back: the sentence, each person's route and where it came from
 *   6  said with no distances at all — moves counted, not metres, and nothing invented
 *   7  the phone — three kinds of walk, the Diagram tab, nothing off the side
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

const L = 'Packing line';
const stepsOf = rows => rows.map(([place, m, said], i) => ({ place, ...(i > 0 && m !== undefined ? { m } : {}), ...(i > 0 && said ? { said } : {}) }));
const OP1 = { label: 'Operator 1', steps: stepsOf([[L], ['Film store', 40, '40 metres'], [L, 40, '40 metres'], ['Case store', 25, '25 metres'], [L, 25, '25 metres']]) };
const OP2 = { label: 'Operator 2', steps: stepsOf([[L], ['Scale', 9, '9 metres'], [L, 9, '9 metres'], ['Film store', 40, '40 metres'], [L, 40, '40 metres']]) };
const OP3 = { label: 'Operator 3', steps: stepsOf([[L], ['Case store', 25, '25 metres'], [L, 25, '25 metres']]) };
const cap = (...walkers) => ({ set: 'spag', title: 'Packing line operators', walkers });
const SENTENCE = '3 walkers make 10 moves a round, 278 m together. Operator 1 walks most — 130 m (47%). Packing line is arrived at most — 5 times.';

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
const dir = mkdtempSync(join(tmpdir(), 'talk-spaghetti-'));
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

/* 1 — the kind of walk */
ok(await page.locator('[data-set]').count() === 3, '1 three kinds of walk to choose from');
await page.locator('[data-set=spag]').click(); await settle(500);
ok(await page.locator('[data-set=spag]').getAttribute('aria-pressed') === 'true' && (await talkOf(talkId)).facts.set === 'spag', '1 Spaghetti diagram chosen — and kept on the talk');
ok(await diagram().count() === 1 && /Nothing to draw yet/.test(await diagram().innerText()) && /Operator 1 goes to the film store/.test(await diagram().innerText()), '1 an empty diagram says what to say first, in his own words');
await page.reload(); await settle(1500);
ok(await page.locator('[data-set=spag]').getAttribute('aria-pressed') === 'true', '1 kept after a reload');

/* 2 — the example said in two turns */
plan.push({ a: { reply: 'Got Operator 1. Where does Operator 2 go?', capture: cap(OP1) } });
await send('Operator 1 goes from the packing line to the film store, forty metres, back to the line, then to the case store, twenty-five metres, and back');
ok(await waitFor(async () => /1 walker · 4 moves so far/.test(await dtext())), '2 Operator 1 drawn as soon as the answer is kept', await dtext());
const a1 = asks[0];
ok(a1?.set === 'spag' && a1.draft === undefined, '2 asked as a spaghetti talk, no draft yet', JSON.stringify({ set: a1?.set, draft: a1?.draft }));
plan.push({ a: { reply: 'That is all three. Want it made?', capture: cap(OP1, OP2, OP3) } });
await send('Operator 2 goes to the scale, nine metres, back, to the film store forty metres, back. Operator 3 goes to the case store twenty-five metres and back');
ok(await waitFor(async () => /3 walkers · 10 moves so far/.test(await dtext())), '2 all three walkers, ten moves', await dtext());
ok((await dtext()).includes(SENTENCE), '2 the sentence is the calculator’s, equal to the hand-worked case S3', (await dtext()).slice(0, 500));
const a2 = asks[1];
ok(/The spaghetti diagram so far: Packing line operators — 1 walker/.test(a2?.draft ?? '') && /Operator 1: Packing line \(start\) → Film store \(40 m\) → Packing line \(40 m\)/.test(a2.draft), '2 the second ask carried the draft as the person has it', a2?.draft);
const pic = await page.locator('.calc-pic-svg').evaluate(svg => ({ lines: svg.querySelectorAll('polyline.calc-pic-line').length, dash: svg.querySelectorAll('polyline.is-dash').length, dots: svg.querySelectorAll('circle.calc-pic-dot').length }));
ok(pic.lines === 10 && pic.dots === 4 && pic.dash === 2, '2 the picture: a line a move in each person’s own style, a dot a place', JSON.stringify(pic));
ok(/NOT TO SCALE/.test(await dtext()), '2 and it says it is not to scale — no distance is drawn that was not given');
ok((await page.locator('.calc-pic-key li').allInnerTexts()).map(x => x.trim()).join('|') === 'Operator 1|Operator 2|Operator 3', '2 each person named under it');

/* 3 — a place put right, a distance taken off */
const place = diagram().locator('input[aria-label="Operator 2: place 2"]');
await place.fill('Weighing scale'); await page.waitForTimeout(700);
ok((await dtext()).includes('Weighing scale') && /3 walkers · 10 moves so far/.test(await dtext()), '3 the place renamed in the draft, the diagram following');
const m3 = diagram().locator('input[aria-label="Operator 3: metres to place 3"]');
await m3.fill(''); await m3.press('Enter'); await page.waitForTimeout(700);
ok(/the length is known for 9 of them \(253 m\), so moves are counted, not metres/.test(await dtext()), '3 a distance taken off: the length is known for 9 of 10 (253 m), and it says moves are counted', (await dtext()).slice(0, 400));
ok(!(await diagram().locator('[data-walker="2"] li.tk-dstep').nth(2).innerText()).includes('said:'), '3 an edited place no longer claims what was said');
plan.push({ a: { reply: 'Noted the change.', capture: cap(OP1, { ...OP2, steps: OP2.steps.map((s, i) => (i === 1 ? { ...s, place: 'Weighing scale' } : s)) }, { ...OP3, steps: OP3.steps.map((s, i) => (i === 2 ? { place: s.place } : s)) }) } });
await send('Carry on');
ok(await waitFor(async () => asks.length === 3), '3 asked again');
ok(/Operator 2: Packing line \(start\) → Weighing scale \(9 m\)/.test(asks[2]?.draft ?? '') && /Operator 3: Packing line \(start\) → Case store \(25 m\) → Packing line \(no distance said\)/.test(asks[2].draft), '3 the person’s version went back to the assistant', asks[2]?.draft);
plan.length = 0;
// put both back for what follows
await diagram().locator('input[aria-label="Operator 2: place 2"]').fill('Scale');
const m3b = diagram().locator('input[aria-label="Operator 3: metres to place 3"]'); await m3b.fill('25'); await m3b.press('Enter'); await page.waitForTimeout(700);
ok((await dtext()).includes(SENTENCE), '3 put back, the diagram says the example again');

/* 4 — Make it */
ok(await diagram().locator('[data-make]').count() === 1 && await diagram().locator('[data-update]').count() === 0, '4 Make it offered, Update it not yet');
await diagram().locator('[data-make]').click();
ok(await waitFor(async () => (await calcs()).length === 1), '4 one Spaghetti diagram made');
const made = (await calcs())[0];
ok(made.agreed.calc.key === 'spaghetti-walkers' && made.workspaceId === lineId && made.facts.fromTalk?.talk === talkId, '4 on the talk’s line, From a talk with the link back', JSON.stringify({ k: made.agreed?.calc?.key, w: made.workspaceId, f: made.facts?.fromTalk }));
ok(/^the Line Talk of /.test(made.agreed.calc.src?.w1_label ?? '') && made.agreed.calc.inputs.w1_s02_m === 40 && made.agreed.calc.inputs.w3_label === 'Operator 3', '4 each box marked as said in the talk, the metres as said', JSON.stringify(made.agreed.calc.src).slice(0, 200));
ok((await talkOf(talkId)).facts.made?.id === made.id, '4 the talk remembers the diagram it made');
ok(await waitFor(async () => await diagram().locator('[data-update]').count() === 1 && await diagram().locator('[data-make]').count() === 0), '4 now Update it, and Open it — never a second Make it');
await diagram().locator('[data-open-made]').click(); await settle(1500);
ok(new RegExp(`#/calc/spaghetti-walkers/${made.id}`).test(page.url()), '4 Open it lands on the diagram', page.url());
ok(await page.locator('[data-from-talk]').count() === 1, '4 the record says it is from a Line Talk');
ok((await page.locator('.ie-calc').innerText()).replace(/\s+/g, ' ').includes(SENTENCE), '4 and says the example’s sentence on its own page');

/* 5 — the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(dir, 'spaghetti.pdf'); await dl.saveAs(pdf);
const txt = pdfText(pdf).replace(/\s+/g, ' ');
ok(txt.includes('3 walkers make 10 moves a round, 278 m together') && txt.includes('Packing line to Film store (40 m) to Packing line (40 m)') && /Line Talk of/.test(txt), '5 the paper: the sentence, each person’s route with its metres and where it came from (the Line Talk)', txt.slice(0, 600));

/* 4 — Update it keeps what was typed on the record */
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => ({ agreed: { ...cur.agreed, calc: { ...cur.agreed.calc, inputs: { ...cur.agreed.calc.inputs, rounds: 10, rate: 25 } } } })); }, made.id);
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1200);
const m1 = diagram().locator('input[aria-label="Operator 1: metres to place 2"]');
await m1.fill('50'); await m1.press('Enter'); await page.waitForTimeout(600);
await diagram().locator('[data-update]').click(); await page.waitForTimeout(900);
const after = await calcs();
ok(after.length === 1 && after[0].id === made.id && after[0].agreed.calc.inputs.w1_s02_m === 50, '4 Update it changed the same diagram (still one)', JSON.stringify(after.map(a => [a.id === made.id, a.agreed.calc.inputs.w1_s02_m])));
ok(after[0].agreed.calc.inputs.rounds === 10 && after[0].agreed.calc.inputs.rate === 25, '4 and kept the rounds and the hourly cost typed on the record');
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => { const { made: _m, ...rest } = cur.facts; return { facts: rest }; }); }, talkId);
await page.reload(); await settle(1500);
await diagram().locator('[data-make]').click();
ok(await waitFor(async () => (await calcs()).length === 2), '4 a talk whose diagram was let go makes a new one on Make it');
await page.getByRole('button', { name: 'Undo' }).click();
ok(await waitFor(async () => (await calcs()).length === 1) && !(await talkOf(talkId)).facts.made, '4 Undo takes the diagram away and the talk forgets it');

/* 6 — said with no distances at all */
const none = cap(...[OP1, OP2, OP3].map(w => ({ label: w.label, steps: w.steps.map(s => ({ place: s.place })) })));
plan.push({ a: { reply: 'How far was each?', capture: none } });
await send('Same again, but I did not measure any of it');
ok(await waitFor(async () => /no lengths were given, so moves are counted, not metres/.test(await dtext())), '6 no distances said: moves counted, not metres', (await dtext()).slice(0, 400));
ok(!/\d m together/.test(await dtext()) && /10 moves/.test(await dtext()), '6 and no metres made up');

/* 7 — the phone */
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
  await db.putStudy({ id, tool: 'talk', name: 'Line 7 — phone', workspaceId: lineId, facts: { set: 'spag', turns: [{ id: crypto.randomUUID(), at: t - 1000, kind: 'typed', text: 'three operators' }, reply] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  return id;
}, [lineId, cap(OP1, OP2, OP3)]);
await p2.goto(`${BASE}/#/talk/${t2}`); await p2.waitForTimeout(1800);
const chips = await p2.locator('.tk-sets .chip').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(chips.length === 3 && chips.every(h => h >= 36), '7 the kinds of walk on the phone', chips.join(','));
ok(await p2.locator('[data-diagram]').count() === 0 && await p2.locator('.tk-turns').isVisible(), '7 the talk first, the diagram a tab away');
await p2.locator('[data-view-diagram]').click(); await p2.waitForTimeout(600);
ok(await p2.locator('[data-diagram]').count() === 1 && !(await p2.locator('.tk-turns').isVisible()), '7 the Diagram tab shows the diagram and rests the talk');
ok(/Diagram · 10/.test(await p2.locator('[data-view-diagram]').innerText()), '7 the tab counts the moves');
const tabH = await p2.locator('.tk-view').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(tabH.every(h => h >= 43), '7 the tabs a thumb’s height', tabH.join(','));
const wide = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '7 nothing off the side', String(wide));
const makeH = await p2.locator('[data-make]').evaluate(e => Math.round(e.getBoundingClientRect().height));
ok(makeH >= 43, '7 Make it a thumb’s height', String(makeH));

ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nLine Talk spaghetti set accepted: three operators talked into a Spaghetti diagram, made, updated and taken back, its paper read back, the phone fits');
process.exit(fail ? 1 : 0);
