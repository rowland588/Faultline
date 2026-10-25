/* ACCEPTANCE — THE LINE BALANCE'S TIME STUDY, COMBINATION TABLE, PERSON–MACHINE CHART, ORDER OF THE WORK,
 * METHOD QUESTIONS AND STANDARD DATA (knowledge/specs/FC-032-line-balance.md; FC-019 · 025 · 024 · 007 · 026 ·
 * 033 · 028).
 *
 * Driven in a real browser on products made on the seeded Line 7, each carrying an INDEPENDENT worked case
 * (scripts/knowledge/cases-time.py — plain arithmetic and SciPy), so a figure on the page is checked against the
 * module that makes it AND against the number the case gives:
 *
 *   1  Times — six laps 6.1 5.9 6.0 6.2 5.8 6.0 rated 110: observed 6.0, basic 6.6, ±2.5% at 95%, cycles "6 of 5";
 *      the task's planned rate; every row read from lib/balance
 *   2  the pace asked where the timing ends: one tap rates a step just timed, the rest left at 100 says "not rated"
 *   3  the allowance built from the site's parts (5+4+2+1+1+2 = 15%): none pre-filled, the ILO table said not built
 *      in; 42.0 s basic → 48.3 s standard, 75 an hour; the allowance in money (£7.88 an hour at a 12 s takt)
 *   4  Person and machine — load 6.6, the sealer runs 30, inspect 12, walk 4: the person ends at 22.6, the machine at
 *      36.6, the cycle 36.6 and the person waits 14.0 s; the chart, its words, the waiting in money
 *   5  how many machines one person can tend — l 72, m 360, w 18: N′ 4.8; four and five; cost a machine-cycle
 *   6  Order of work — A 6, B 4, C 5, D 3, E 7, F 2, G 4, H 3 with their order: weights, AC | BE | DFGH, 94%, the
 *      minimum 3; a loop refused; Use it; a step listed before what it must follow named
 *   7  Improve — the six steps 49 s → 30 s: Eliminate, Simplify, Combine, Rearrange; 39% less, 123% → 75% of takt,
 *      £7.13 an hour, £120 paid back in 16.8 hours; reason missing flagged; kept after a reload
 *   8  Standard data — a step timed on another product, borrowed: its basic, its source, this allowance on it
 *   9  the paper, downloaded and read back: Times, Combination table, Machines, Order, Method questions
 *   10 a client reads every lens and changes nothing; a team member cannot agree the allowance
 *   11 the phone: nothing off the side
 *
 * Fails on any console error.   node scripts/acceptance/time-study.mjs   (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper } from '../lib/pageHeader.mjs';

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const norm = s => (s ?? '').replace(/\s+/g, ' ').trim();
const words = async (sel, root = page) => ((await root.locator(sel).count()) ? norm(await root.locator(sel).first().innerText()) : null);
const all = async (sel, root = page) => (await root.locator(sel).allInnerTexts()).map(norm);
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/′/g, "'").replace(/±/g, '+/-').replace(/×/g, 'x').replace(/÷/g, '/').replace(/\s+/g, ' ');
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800); };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WS = sd.wsId;

/* ---- products made on the line, each a worked case ---- */
const mk = (product, { steps, agreed, rate, projectId }) => page.evaluate(async ([ws, product, steps, agreed, rate, projectId]) => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  const t = Date.now();
  const lap = (xs, i0 = 0) => xs.map((sec, i) => ({ id: uid(), sec, at: t - (60 - i0 - i) * 15_000, who: 'K. Ahmed' }));
  const id = uid();
  await db.putStandard({ id, projectId: projectId ?? '', workspaceId: ws, product, marks: [], capacity: { stations: [], ...(rate ? { labour: { ratePerHour: rate } } : {}) }, sort: 9, createdAt: t, updatedAt: t });
  const ids = {};
  const list = steps.map((s, i) => { const sid = uid(); ids[s.key ?? s.name] = sid; return { sid, s, i }; });
  await db.putStudy({ id: uid(), tool: 'balance', name: product, standardId: id, workspaceId: ws, ...(projectId ? { projectId } : {}), agreed: { balance: agreed },
    facts: { steps: list.map(({ sid, s, i }) => ({ id: sid, order: s.order ?? i, name: s.name, who: s.who, ...(s.kind ? { kind: s.kind } : {}), ...(s.rating ? { rating: s.rating } : {}), ...(s.typedSec ? { typedSec: s.typedSec } : {}),
      ...(s.laps ? { laps: lap(s.laps) } : {}), ...(s.after ? { after: s.after.map(k => ids[k]) } : {}), ...(s.ecrs ? { ecrs: s.ecrs } : {}) })) },
    uses: [], startedAt: t - 3_600_000 + Math.floor(Math.random() * 1000), createdAt: t, updatedAt: t });
  return { id, ids };
}, [WS, product, steps, agreed, rate ?? null, projectId ?? null]);
const at = (id, lens) => `#/w/${WS}/standards/${id}?at=balance&view=work${lens ? `&lens=${lens}` : ''}`;
/* what the modules say, on the newest balance of a standard */
const truth = (sid, fnBody) => page.evaluate(async ([sid, body]) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); const K = await import('/src/tools/linework/balanceLink.ts');
  const B = await import('/src/tools/linework/balance.ts'); const T = await import('/src/tools/linework/timeline.ts'); const O = await import('/src/tools/linework/order.ts');
  const I = await import('/src/tools/linework/improve.ts'); const A = await import('/src/tools/linework/allowance.ts'); const D = await import('/src/tools/linework/standardData.ts');
  const st = await db.getStandard(sid); const s = S.currentBalance(await db.listAllStudies(), sid);
  const ws = st.workspaceId ? await db.getWorkspace(st.workspaceId) : undefined;
  const a = K.agreedFor(s.agreed?.balance, st.capacity, !!s.closedAt); const crew = K.crewKept(s.facts.crew ?? [], st.capacity);
  const f = B.balance(s.facts.steps, a, crew); const inputs = K.costInputs(st.capacity, ws);
  // eslint-disable-next-line no-new-func
  return new Function('ctx', `return (${body})(ctx)`)({ db, S, K, B, T, O, I, A, D, st, s, a, f, crew, inputs, ws });
}, [sid, fnBody]);

/* ================================================================ 1 · Times */
const A = await mk('Bag and seal 1kg', { agreed: { taktSec: 45 }, rate: 20, steps: [
  { name: 'Load the sealer', who: 'Op 1', rating: 110, laps: [6.1, 5.9, 6.0, 6.2, 5.8, 6.0] },
  { name: 'Sealer runs', who: 'Op 1', kind: 'machine', typedSec: 30 },
  { name: 'Inspect the pack', who: 'Op 1', typedSec: 12 },
  { name: 'Walk to the case erector', who: 'Op 1', kind: 'walk', typedSec: 4 },
  { name: 'Load a tray', who: 'Op 3', typedSec: 72 },
  { name: 'Tray sealer runs', who: 'Op 3', kind: 'machine', typedSec: 360 },
  { name: 'Walk to the next sealer', who: 'Op 3', kind: 'walk', typedSec: 18 },
  { name: 'Fold and tape the case', who: 'Op 2', laps: [8.0, 8.2, 7.9, 8.1, 8.0, 7.8] },
  { name: 'Check the seal', who: 'Op 2', laps: [4.0, 4.4, 4.2, 4.1] },
] });
await go(at(A.id, 'times'));
await page.locator('.wb-times').waitFor({ timeout: 10000 }).catch(() => {});
{
  const want = await truth(A.id, `ctx => ctx.f.elements.map(e => ({ name: e.name, who: e.who, kind: e.kind, source: e.source, n: e.n, needed: e.needed, enough: e.enough, observed: e.observed ?? null, basic: e.basic ?? null, standard: e.standard ?? null, margin: e.margin ?? null, rated: e.rated, rating: e.rating, secs: [ctx.B.secs(e.observed ?? 0), ctx.B.secs(e.basic ?? 0), ctx.B.secs(e.standard ?? 0)] }))`);
  const load = want.find(e => e.name === 'Load the sealer');
  ok(Math.abs(load.observed - 6.0) < 1e-9 && Math.abs(load.basic - 6.6) < 1e-9 && Math.abs(load.margin - 0.0247) < 0.0001 && load.n === 6 && load.needed === 5,
    `1 the independent case: six laps rated 110 — observed ${load.observed}, basic ${load.basic}, ±${(load.margin * 100).toFixed(2)}% at 95%`);
  const row = page.locator('.wb-tr', { hasText: 'Load the sealer' });
  const cells = await all('td', row);
  ok(cells[0] === '6 of 5 — enough' && cells[1] === load.secs[0] && cells[3] === load.secs[1] && cells[5] === `±${(load.margin * 100).toFixed(1)}%` && cells[4].startsWith(load.secs[2]),
    `1 the Times row reads the module: ${cells.join(' | ')}`);
  const short = page.locator('.wb-tr', { hasText: 'Check the seal' });
  const sc = await all('td', short); const sw = want.find(e => e.name === 'Check the seal');
  ok(sc[0] === `4 of ${sw.needed}` && sw.needed === 7 && sw.enough === false && sc[5] === `±${(sw.margin * 100).toFixed(1)}%` && Math.abs(sw.margin - 0.0651) < 0.001,
    `1 four laps are short and say so: ${sc[0]}, ${sc[5]} (independent: needed 7, ±6.51%)`);
  ok((await all('.wb-tr:has-text("Sealer runs") td'))[2] === 'machine — not rated', '1 a machine’s run is never rated');
  const task = await words('.wb-task', page.locator('.wb-tp', { hasText: 'Op 2' }));
  const t2 = await truth(A.id, `ctx => { const p = ctx.f.people.find(x => x.who === 'Op 2'); return ctx.B.secs(p.work) + '|' + Math.round(3600 / p.work); }`);
  ok(task?.includes(t2.split('|')[0]) && task?.includes(`${t2.split('|')[1]} an hour planned`), `1 the task and its planned rate: "${task}"`);
}

/* ================================================================ 2 · the pace, asked where the timing ends */
await go(at(A.id));
await page.locator('.wb-person').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const person = who => page.locator('.wb-person').filter({ has: page.locator('h3', { hasText: new RegExp(`^${who}$`) }) });
  await person('Op 2').getByRole('button', { name: 'Time Op 2' }).click(); await page.waitForTimeout(400);
  const tap = async name => { await page.getByRole('button', { name }).click(); await page.waitForTimeout(900); };
  await tap(/^Start — as /); await tap(/^Lap — Fold and tape the case done/); await tap(/^Lap — Check the seal done/);
  await page.getByRole('button', { name: 'Stop timing' }).click(); await page.waitForTimeout(900);
  const sheet = page.locator('.wb-rate');
  ok((await sheet.count()) === 1 && /How was the pace/.test(await words('.wb-rate') ?? ''), `2 after Stop timing the pace is asked: "${(await words('.wb-rate'))?.slice(0, 90)}"`);
  const names = await all('.wb-rate-n');
  ok(names.join('|') === 'Fold and tape the case|Check the seal', `2 it lists what was just timed and never rated: ${names.join(', ')}`);
  await sheet.locator('.wb-rate-r', { hasText: 'Fold and tape the case' }).getByRole('radio', { name: '110', exact: true }).click(); await page.waitForTimeout(700);
  const t = await truth(A.id, `ctx => ({ fold: ctx.s.facts.steps.find(x => x.name === 'Fold and tape the case').rating, seal: ctx.s.facts.steps.find(x => x.name === 'Check the seal').rating, foldStd: ctx.f.elements.find(e => e.name === 'Fold and tape the case').standard, foldBasic: ctx.f.elements.find(e => e.name === 'Fold and tape the case').basic, foldObs: ctx.f.elements.find(e => e.name === 'Fold and tape the case').observed })`);
  ok(t.fold === 110 && t.seal === undefined && Math.abs(t.foldBasic - t.foldObs * 1.1) < 1e-9, `2 one tap rates it (110 → basic ${t.foldBasic.toFixed(2)} = observed ${t.foldObs.toFixed(2)} × 1.10); the other is left`);
  await sheet.getByRole('button', { name: 'Leave the rest at 100' }).click(); await page.waitForTimeout(500);
  ok((await page.locator('.wb-rate').count()) === 0, '2 "Leave the rest at 100" closes it');
  await go(at(A.id, 'times'));
  await page.locator('.wb-times').waitFor({ timeout: 10000 }).catch(() => {});
  const seal = await all('td', page.locator('.wb-tr', { hasText: 'Check the seal' }));
  ok(/not rated — taken at 100/.test(seal[2]), `2 a step never rated says so: "${seal[2]}"`);
}

/* ================================================================ 3 · the allowance from its parts */
const B = await mk('Case pack 2kg', { agreed: { taktSec: 12 }, rate: 15, steps: [{ name: 'Pack the case', who: 'Op 1', rating: 100, laps: [42, 42, 42, 42, 42] }] });
await go(at(B.id));
await page.locator('.wb-person').first().waitFor({ timeout: 10000 }).catch(() => {});
await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(500);
await page.getByRole('radio', { name: 'Built from parts' }).click(); await page.waitForTimeout(300);
{
  const first = page.getByLabel('Per cent — Personal needs');
  ok((await first.inputValue()) === '' && /table of percentages is not built in/.test(await words('.wb-parts') ?? ''), '3 no percentage is supplied: the first part is empty, and the page says the ILO table is not built in');
  const parts = [['Personal needs', 5], ['Basic fatigue', 4], ['Standing', 2], ['Load', 1], ['Monotony', 1], ['Noise', 2]];
  for (let i = 1; i < parts.length; i++) await page.getByRole('button', { name: 'Add a part' }).click();
  const names = page.getByLabel('What the allowance is for'), pcs = page.locator('.wb-part input[inputmode="decimal"]');
  for (let i = 0; i < parts.length; i++) { await names.nth(i).fill(parts[i][0]); await pcs.nth(i).fill(String(parts[i][1])); }
  ok((await words('.wb-parts .ie-note')) === 'Together 15%.', `3 the parts add up as they are typed: "${await words('.wb-parts .ie-note')}"`);
  await page.getByRole('button', { name: 'Agree it' }).click(); await page.waitForTimeout(900);
}
await go(at(B.id, 'times'));
await page.locator('.wb-times').waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await truth(B.id, `ctx => { const e = ctx.f.elements[0]; const m = ctx.A.allowanceMoney(ctx.f, ctx.a, ctx.inputs.ratePerHour); return { allow: ctx.A.allowanceOf(ctx.a), std: e.standard, says: ctx.A.allowanceSays(ctx.a), money: m.text, perPack: m.perPack, perHour: m.perHour, planned: Math.round(3600 / e.standard) }; }`);
  ok(Math.abs(w.allow - 0.15) < 1e-9 && Math.abs(w.std - 48.3) < 1e-6 && w.planned === 75, `3 the independent case: 42.0 s basic at 15% → ${w.std.toFixed(3)} s standard, ${w.planned} an hour`);
  ok(Math.abs(w.perPack - 0.02625) < 1e-5 && Math.abs(w.perHour - 7.875) < 1e-3, `3 the allowance in money, independent: £${w.perPack.toFixed(5)} a pack, £${w.perHour.toFixed(3)} an hour at a 12 s takt`);
  ok((await words('.wb-allow-s')) === w.says && (await words('.wb-allow-m')) === w.money, `3 the allowance and its money as the module says them: "${await words('.wb-allow-s')}" / "${await words('.wb-allow-m')}"`);
  ok(/6\.3 s of every piece/.test(w.money) && /rest the job needs, not waste/.test(w.money), '3 said as rest, not waste');
  const row = await all('td', page.locator('.wb-tr').first());
  ok(row[4].startsWith('48.3 s'), `3 the standard on the row: "${row[4]}"`);
}

/* ================================================================ 4 · Person and machine */
await go(at(A.id, 'machine'));
await page.locator('.wb-machine').waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await truth(A.id, `ctx => ctx.T.combination(ctx.f.people).map(r => ({ who: r.who, says: r.says, cycle: r.tl.cycle, personEnd: r.tl.personEnd, machineEnd: r.tl.machineEnd, waits: r.tl.personWaits, money: ctx.T.waitMoney(r, ctx.inputs.ratePerHour).text }))`);
  const op1 = w.find(r => r.who === 'Op 1');
  ok(Math.abs(op1.personEnd - 22.6) < 1e-9 && Math.abs(op1.machineEnd - 36.6) < 1e-9 && Math.abs(op1.cycle - 36.6) < 1e-9 && Math.abs(op1.waits - 14) < 1e-9,
    `4 the independent case: the person ends at ${op1.personEnd.toFixed(1)}, the machine at ${op1.machineEnd.toFixed(1)}, the cycle ${op1.cycle.toFixed(1)}, ${op1.waits.toFixed(1)} s waiting for the machine`);
  const cards = page.locator('.wb-cs-p');
  ok((await cards.count()) === w.length && (await cards.count()) === 2, `4 a chart for each person with a machine step: ${await cards.count()}`);
  const card = cards.filter({ has: page.locator('h3', { hasText: /^Op 1/ }) });
  ok((await card.locator('svg.wb-cs-svg').count()) === 1 && (await words('.wb-cs-says', card)) === op1.says, `4 the sentence as the module says it: "${await words('.wb-cs-says', card)}"`);
  const aria = await card.locator('svg').getAttribute('aria-label');
  ok(/Load the sealer 0\.0 to 6\.6 s, work/.test(aria) && /Sealer runs 6\.6 to 36\.6 s, machine/.test(aria) && /against a 45\.0 s takt/.test(aria), `4 the chart says its segments: "${aria.slice(0, 120)}…"`);
  ok((await words('.wb-cs-money', card)) === op1.money && /£4\.67 an hour|£\d\.\d\d an hour/.test(op1.money), `4 the waiting in money: "${await words('.wb-cs-money', card)}"`);
  const rects = await card.locator('rect.wb-cs').count();
  ok(rects >= 5, `4 the lanes are drawn (${rects} boxes: work, walking, the machine and the waits)`);
}

/* ================================================================ 5 · how many machines */
{
  const card = page.locator('.wb-tend', { has: page.locator('h3', { hasText: 'How many machines can Op 3 tend?' }) });
  ok((await card.count()) === 1, '5 a person with a load, a run and a walk is asked how many machines');
  await card.getByLabel('The machine’s cost an hour, £ (optional) — Op 3').fill('35');
  await card.getByLabel('Packs one machine-cycle makes (optional) — Op 3').fill('10'); await card.getByLabel('Packs one machine-cycle makes (optional) — Op 3').press('Tab'); await page.waitForTimeout(900);
  const w = await truth(A.id, `ctx => { const p = ctx.f.people.find(x => x.who === 'Op 3'); const t = ctx.T.tend('Op 3', ctx.T.tendInput(p), { operatorRate: ctx.inputs.ratePerHour, machineRate: ctx.s.facts.tend['Op 3'].machineRate }); const s = ctx.T.tendSays(t, { packsPerCycle: ctx.s.facts.tend['Op 3'].packsPerCycle, contributionPerPack: ctx.inputs.contributionPerPack }); return { nPrime: t.nPrime, rows: t.rows, says: s }; }`);
  const r4 = w.rows.find(r => r.n === 4), r5 = w.rows.find(r => r.n === 5);
  ok(Math.abs(w.nPrime - 4.8) < 1e-9 && r4.cycle === 432 && r4.idle === 72 && r4.machineWaits === 0 && Math.abs(r4.perHour - 33.3333) < 1e-3 && r5.cycle === 450 && r5.perHour === 40 && r5.machineWaits === 18,
    `5 the independent case: N′ ${w.nPrime.toFixed(1)}; four ${r4.cycle} s, ${r4.perHour.toFixed(1)} an hour, idle ${r4.idle} s; five ${r5.cycle} s, ${r5.perHour} an hour, each machine waits ${r5.machineWaits} s`);
  ok(Math.abs(r4.allCost - 4.8) < 1e-9 && Math.abs(r5.allCost - 4.875) < 1e-9, `5 the cost a machine-cycle, independent: £${r4.allCost.toFixed(4)} with four, £${r5.allCost.toFixed(4)} with five`);
  ok((await words('.wb-tend-s', card)) === w.says.text && (await all('.wb-tend-l', card)).join('|') === w.says.lines.join('|'), `5 the sentence and the either-side lines as the module says: "${(await words('.wb-tend-l', card))?.slice(0, 120)}"`);
  const trs = await all('tbody tr', card);
  ok(trs.length === w.rows.length && /^4 7\.20 min 33\.3 1\.20 min —/.test(trs[3]) && /^5 7\.50 min 40\.0 — 18\.0 s/.test(trs[4]), `5 the rows: "${trs[3]}" / "${trs[4]}"`);
  ok(/identical machines and a fixed cycle/.test(await words('.sub:last-child', card) ?? ''), '5 the method’s limit is said (identical machines, a fixed cycle, random stops not in it)');
  ok((await page.locator('.wb-tend').count()) === 2, `5 each person with a load and a machine run is asked (${await page.locator('.wb-tend').count()}): Op 1 and Op 3`);
}

/* ================================================================ 6 · Order of work */
const T = { A: 6, B: 4, C: 5, D: 3, E: 7, F: 2, G: 4, H: 3 };
const pre = { A: [], B: ['A'], C: ['A'], D: ['B'], E: ['C'], F: ['D', 'E'], G: ['F'], H: ['G'] };
const C = await mk('Sandwich 3-layer', { agreed: { taktSec: 12 }, rate: 15, steps: Object.keys(T).map(k => ({ key: k, name: k, who: 'Op 1', typedSec: T[k], ...(pre[k].length ? { after: pre[k] } : {}) })) });
await go(at(C.id, 'order'));
await page.locator('.wb-order').waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await truth(C.id, `ctx => { const items = ctx.f.elements.map(e => ({ id: e.id, name: e.name, t: e.standard, after: e.after })); const r = ctx.O.rankedPositional(items, 12); const w = ctx.O.positionalWeights(items); return { weights: Object.fromEntries(ctx.f.elements.map(e => [e.name, w[e.id]])), stations: r.stations.map(s => s.ids.map(id => ctx.f.elements.find(e => e.id === id).name).join('') + ':' + s.work), minimum: r.minimum, eff: r.efficiency, says: ctx.O.proposalSays(r, 12, ctx.f.people.length).text }; }`);
  ok(JSON.stringify(w.weights) === JSON.stringify({ A: 34, B: 16, C: 21, D: 12, E: 16, F: 9, G: 7, H: 3 }), `6 the independent weights: ${JSON.stringify(w.weights)}`);
  ok(w.stations.join('|') === 'AC:11|BE:11|DFGH:12' && w.minimum === 3 && Math.abs(w.eff - 0.9444) < 1e-3, `6 ranked positional weight: ${w.stations.join(' | ')}, the least ${w.minimum}, ${(w.eff * 100).toFixed(1)}%`);
  const rows = await all('.wb-prop tbody tr');
  ok(rows.length === 3 && rows[0] === 'Op 1 A · C 11.0 s of 12.0 s' && rows[1] === 'Op 2 B · E 11.0 s of 12.0 s' && rows[2] === 'Op 3 D · F · G · H 12.0 s of 12.0 s', `6 the proposal on the page: ${rows.join(' || ')}`);
  ok((await words('.wb-prop-s')) === w.says, `6 its sentence: "${(await words('.wb-prop-s'))?.slice(0, 110)}…"`);
  const wt = await all('.wb-ord-h');
  ok(wt[0].includes('weight 34.0 s') && wt[1].includes('weight 16.0 s') && wt[2].includes('weight 21.0 s'), '6 each step shows its positional weight');
  /* a loop is refused at the choice: A cannot follow H */
  await page.getByRole('button', { name: 'Change what A must follow' }).click(); await page.waitForTimeout(300);
  const h = page.getByRole('group', { name: 'What A must follow' }).getByRole('button', { name: 'H', exact: true });
  ok(await h.isDisabled(), '6 a loop is refused: A cannot be made to follow H, which must come after it');
  await page.getByRole('button', { name: 'Done with what A must follow' }).click();
  /* Use it applies the balance */
  await page.getByRole('button', { name: 'Use it', exact: true }).click(); await page.waitForTimeout(900);
  const who = await truth(C.id, `ctx => Object.fromEntries(ctx.f.elements.map(e => [e.name, e.who]))`);
  ok(JSON.stringify(who) === JSON.stringify({ A: 'Op 1', B: 'Op 2', C: 'Op 1', D: 'Op 3', E: 'Op 2', F: 'Op 3', G: 'Op 3', H: 'Op 3' }), `6 Use it: ${JSON.stringify(who)}`);
  /* a step listed before what it must follow is named */
  await page.evaluate(async sid => { const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); const s = S.currentBalance(await db.listAllStudies(), sid);
    await db.putStudy({ ...s, facts: { ...s.facts, steps: s.facts.steps.map(x => (x.name === 'F' ? { ...x, who: 'Op 1' } : x)) }, updatedAt: Date.now() }); }, C.id);
  await go(at(C.id, 'order')); await page.locator('.wb-order').waitFor({ timeout: 10000 }).catch(() => {});
  const broken = await all('.wb-order .ie-say.is-r');
  const wantBroken = await truth(C.id, `ctx => ctx.O.brokenOrder(ctx.f, ctx.f.people.map(p => p.who))`);
  ok(broken.length >= 1 && wantBroken.length >= 1 && broken.join('|') === wantBroken.join('|'), `6 an order broken is named: "${broken[0]}"`);
}

/* ================================================================ 7 · Improve */
const D = await mk('Bagging, six steps', { agreed: { taktSec: 40 }, rate: 15, steps: [['Fetch tray', 6], ['Open bag', 4], ['Fill', 18], ['Weigh', 7], ['Seal', 9], ['Walk to belt', 5]].map(([name, s]) => ({ name, who: 'Op 1', typedSec: s })) });
await go(at(D.id, 'improve'));
await page.locator('.wb-improve').waitFor({ timeout: 10000 }).catch(() => {});
{
  const li = n => page.locator('.wb-im-r', { has: page.locator('b', { hasText: new RegExp(`^${n}$`) }) });
  ok(/No step has a decision yet/.test(await words('.wb-im-says') ?? ''), '7 with no decision it says what to do');
  await li('Fetch tray').getByRole('radio', { name: 'Eliminate' }).click(); await page.waitForTimeout(500);
  ok((await all('.wb-im-says .ie-cap')).some(t => /Fetch tray: reason missing/.test(t)), '7 an Eliminate with no reason is counted and flagged "reason missing"');
  await li('Fetch tray').getByLabel('Why Fetch tray can go').fill('trays are staged at the bench'); await li('Fetch tray').getByLabel('Why Fetch tray can go').press('Tab'); await page.waitForTimeout(500);
  await li('Fetch tray').getByLabel('One-off cost, £ (optional)').fill('70'); await li('Fetch tray').getByLabel('One-off cost, £ (optional)').press('Tab'); await page.waitForTimeout(400);
  await li('Open bag').getByRole('radio', { name: 'Simplify' }).click(); await page.waitForTimeout(400);
  await li('Open bag').getByLabel('Expected to take (s)').fill('2'); await li('Open bag').getByLabel('Expected to take (s)').press('Tab'); await page.waitForTimeout(400);
  await li('Weigh').getByRole('radio', { name: 'Combine' }).click(); await page.waitForTimeout(400);
  await li('Weigh').getByLabel('What Weigh joins').selectOption({ label: 'Fill (Op 1)' }); await page.waitForTimeout(500);
  await li('Walk to belt').getByRole('radio', { name: 'Rearrange' }).click(); await page.waitForTimeout(400);
  await li('Walk to belt').getByLabel('Takes (s)').fill('1'); await li('Walk to belt').getByLabel('Takes (s)').press('Tab'); await page.waitForTimeout(400);
  await li('Walk to belt').getByLabel('One-off cost, £ (optional)').fill('50'); await li('Walk to belt').getByLabel('One-off cost, £ (optional)').press('Tab'); await page.waitForTimeout(700);
  const w = await truth(D.id, `ctx => { const r = ctx.I.improve(ctx.s.facts.steps, ctx.a, ctx.s.facts.crew); const m = ctx.I.improveMoney(r, ctx.inputs.ratePerHour); return { before: r.beforeSec, after: r.afterSec, saved: r.savedSec, says: ctx.I.improveSays(r), money: ctx.I.improveMoneySays(m.money, m.missing), m: m.money, over0: r.before.constraint.overBy, over1: r.after.constraint.overBy }; }`);
  ok(w.before === 49 && w.after === 30 && w.saved === 19 && Math.abs(w.over0 - 9) < 1e-9 && w.over1 === 0, `7 the independent case: ${w.before} s → ${w.after} s, saved ${w.saved} s; over takt by ${w.over0} s before, ${w.over1} s after`);
  ok(Math.abs(w.m.perPack - 0.079167) < 1e-5 && Math.abs(w.m.per1000 - 79.17) < 0.01 && Math.abs(w.m.perHour - 7.125) < 1e-3 && Math.abs(w.m.paybackHours - 16.84) < 0.01, `7 the money, independent: £${w.m.perPack.toFixed(5)} a pack, £${w.m.per1000.toFixed(2)} per 1,000, £${w.m.perHour.toFixed(3)} an hour, payback ${w.m.paybackHours.toFixed(2)} h`);
  const says = await words('.wb-im-says');
  ok(says.includes(w.says.text) && says.includes(w.money) && w.says.text === '49.0 s of work → 30.0 s expected (39% less), 123% → 75% of takt a person. Expected, until the work is timed again.', `7 the result as the module says it: "${w.says.text}"`);
  await page.reload(); await page.waitForTimeout(2200);
  ok((await words('.wb-im-says'))?.includes(w.says.text) && (await page.locator('.wb-im-r.is-decided').count()) === 4, '7 the decisions are kept after a reload');
}

/* ================================================================ 8 · Standard data */
const E = await mk('Bag and seal 2kg', { agreed: { taktSec: 45, allowance: 0.12 }, steps: [{ name: 'Pack the bag', who: 'Op 1', typedSec: 20 }] });
await go(at(E.id, 'times'));
await page.locator('.wb-lib').waitFor({ timeout: 10000 }).catch(() => {});
{
  await page.getByLabel('Find a timed step').fill('load sealer'); await page.waitForTimeout(400);
  const rows = await all('.wb-lib-r');
  const want = await page.evaluate(async ([sid, ws]) => { const db = await import('/src/db.ts'); const D = await import('/src/tools/linework/standardData.ts');
    const rows = D.matchRows(D.libraryFrom(await db.listAllStudies(), { standardId: sid, workspaceId: ws }), 'load sealer'); return rows.map(r => ({ name: r.name, product: r.product, basic: r.basic, n: r.n })); }, [E.id, WS]);
  ok(want.length === 1 && want[0].name === 'Load the sealer' && want[0].product === 'Bag and seal 1kg' && Math.abs(want[0].basic - 6.6) < 1e-9 && rows.length === 1 && rows[0].includes('6.6 s basic · 6 cycles') && rows[0].includes('Bag and seal 1kg'),
    `8 a step timed on another product is offered with its basic time (independent: 6.0 × 110 ÷ 100 = 6.60) and its cycles: "${rows[0]}"`);
  await page.getByRole('button', { name: 'Use Load the sealer from Bag and seal 1kg' }).click(); await page.waitForTimeout(900);
  await page.getByLabel('Find a timed step').fill(''); await page.waitForTimeout(300);
  const row = await all('td', page.locator('.wb-tr', { hasText: 'Load the sealer' }));
  /* independent: basic 6.60 at this balance's 12% → 7.392 */
  ok(row[3] === '6.6 s' && row[4].startsWith('7.4 s') && /reused/.test(row[4]), `8 reused here: its basic ${row[3]}, this balance's 12% on it → ${row[4]} (independent 6.6 × 1.12 = 7.392)`);
  ok(/1 of 2 steps are reused from other products’ timings — 27% of the work/.test(await words('.wb-lib-s') ?? ''), `8 how much is borrowed is said: "${await words('.wb-lib-s')}"`);
  const says = await truth(E.id, `ctx => ctx.B.elementSays(ctx.f.elements.find(e => e.name === 'Load the sealer'), 0.12).text`);
  await go(at(E.id));
  await page.locator('.wb-person').first().waitFor({ timeout: 10000 }).catch(() => {});
  const shown = await all('.wb-said');
  ok(shown.includes(says) && /reused from Bag and seal 1kg — 6\.6 s basic from 6 cycles, enough; not timed here/.test(says), `8 and on the first tab: "${says}"`);
}

/* ================================================================ 9 · the paper */
await go(`#/linebalance?line=${WS}`);
await page.locator('.lt-row').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), paper(page, /every product shown/)]);
  const f = join(OUT, 'balance.pdf'); await dl.saveAs(f);
  const raw = pdfText(f), txt = san(raw), TXT = txt.toUpperCase();
  const sayz = await truth(A.id, `ctx => ({ comb: ctx.T.combination(ctx.f.people).map(r => r.says), tend: (() => { const p = ctx.f.people.find(x => x.who === 'Op 3'); return ctx.T.tendSays(ctx.T.tend('Op 3', ctx.T.tendInput(p), { operatorRate: ctx.inputs.ratePerHour, machineRate: 35 }), { packsPerCycle: 10 }).text; })() })`);
  ok(TXT.includes('TIMES - OBSERVED, PACE, BASIC, STANDARD') && txt.includes('6.6 s') && txt.includes('+/-2.5%') && txt.includes("Op 2's task") , '9 the paper carries Times: the table, the planned rate, the pace');
  ok(TXT.includes('COMBINATION TABLE - THE PERSON AND THE MACHINE') && txt.includes(san(sayz.comb[0]).slice(0, 80)), `9 the paper carries the combination table and its sentence: "${san(sayz.comb[0]).slice(0, 70)}…"`);
  ok(TXT.includes('HOW MANY MACHINES ONE PERSON CAN TEND') && txt.includes(san(sayz.tend).slice(0, 70)), '9 the paper carries how many machines one person can tend');
  ok(TXT.includes('THE ORDER THE WORK MUST FOLLOW') && txt.includes('Keeping the order') && txt.includes('no order could do it with fewer than 3 people'), '9 the paper carries the order of the work and what it needs');
  ok(TXT.includes('METHOD QUESTIONS - ELIMINATE, COMBINE, REARRANGE, SIMPLIFY') && txt.includes('49.0 s of work to 30.0 s expected (39% less)') && txt.includes('16.8 running hours') && txt.includes('Expected'), '9 the paper carries the method questions, expected, with the money and the payback');
  ok(TXT.includes('15% ALLOWANCE - PERSONAL NEEDS 5, BASIC FATIGUE 4, STANDING 2, LOAD 1, MONOTONY 1, NOISE 2') || txt.includes('15% allowance - personal needs 5, basic fatigue 4, standing 2, load 1, monotony 1, noise 2'), '9 the paper carries the allowance as its parts');
  ok(TXT.includes('EACH PERSON AGAINST TAKT') && TXT.includes('MARIS PIPER 2KG') && TXT.includes('WHAT IT COSTS'), '9 the balances’ own paper still carries what it did (each person against takt, what it costs)');
  ok(txt.includes('reused from Bag and seal 1kg'), '9 a reused step names where it came from');
}

/* ================================================================ 10 · who may change what */
/* a product on a project: a client reads, a team member does the work but does not agree */
const F = await mk('Client case', { agreed: { taktSec: 45, allowance: 0.1 }, rate: 15, projectId: sd.projectId, steps: [
  { name: 'Load the sealer', who: 'Op 1', rating: 100, laps: [6.1, 5.9, 6.0, 6.2, 5.8, 6.0] },
  { name: 'Sealer runs', who: 'Op 1', kind: 'machine', typedSec: 30 },
  { name: 'Inspect the pack', who: 'Op 1', typedSec: 12, after: ['Load the sealer'], ecrs: { how: 'S', afterSec: 9 } },
] });
const onJob = lens => `#/project/${sd.projectId}/standard/${F.id}?at=balance&view=work${lens ? `&lens=${lens}` : ''}`;
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
for (const lens of ['times', 'machine', 'order', 'improve']) {
  await go(onJob(lens));
  await page.locator('.wb-lens').first().waitFor({ timeout: 10000 }).catch(() => {});
  const doors = (await page.locator('.wb-lens button:not([disabled])').allInnerTexts()).map(norm);
  const boxes = await page.locator('.wb-lens input:not([disabled]):not([type=search]), .wb-lens select:not([disabled])').count();
  ok((await page.locator('.wb-lens').count()) === 1 && doors.length === 0 && boxes === 0, `10 a client reads ${lens} and changes nothing${doors.length || boxes ? ` — found: ${doors.join(', ')} and ${boxes} boxes` : ''}`);
}
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'team'));
await go(onJob('times'));
await page.locator('.wb-times').waitFor({ timeout: 10000 }).catch(() => {});
ok((await page.getByRole('button', { name: /allowance/i }).count()) === 0 && (await page.getByLabel('Pace seen — Load the sealer').count()) === 1, '10 a team member may rate the pace but not agree the allowance');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ================================================================ 11 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
for (const [id, lens] of [[A.id, 'times'], [A.id, 'machine'], [C.id, 'order'], [D.id, 'improve'], [A.id, '']]) {
  await go(at(id, lens));
  await page.locator('.wb').first().waitFor({ timeout: 10000 }).catch(() => {});
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `11 on a phone ${lens || 'against takt'} has nothing off the side (${over} px)`);
}
await go(at(A.id, 'times'));
{
  const card = await page.locator('.wb-tr').first().boundingBox();
  ok(!!card && card.width <= 390, `11 a Times row is a card on a phone (${Math.round(card?.width ?? 0)} px wide)`);
}
await page.setViewportSize({ width: 1360, height: 900 });

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nthe time study accepted: times and how sure, the pace asked, the allowance from its parts, the combination table, machines tended, the order of the work, the questions, standard data, the paper, the phone');
process.exit(failed ? 1 : 0);
