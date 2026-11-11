/* ACCEPTANCE — TOOL INTELLIGENCE, THE PARETO (10 November; docs/AI-TOOL-INTELLIGENCE.md; src/capabilities/intel). Rowland, 10 November:
 * "We keep losing time because bags aren't presenting properly on Line 3 … The AI must not simply create a Pareto from the user's
 * statement … frequency is not the same as duration … indicate whether the dataset is sufficient … flag conflicting figures."
 * Driven in a real browser on a line nothing is known of, the `assist` gateway played by the script round by round:
 *
 *   1  NOTHING YET — assess_evidence and pareto: nothing to rank, the best way to get it (time them live), never a Pareto from the
 *      problem as said; nothing written to the line
 *   2  SAID — the operators' figure passed as reported: ranked as reported, never as timed, how to rely on it; still nothing written
 *   3  LIVE — start_measurement (one card), three stops said with their ends, a mistaken one undone; pareto: the stopwatch leads, thin,
 *      what more would make it enough, the said figure kept apart, not added in
 *   4  A FILE — a downtime CSV attached through the composer, read in code: the note, import_table, pareto with its importId ranked as
 *      imported and kept apart; the line's timed stops not changed by it
 *   5  HANDED OVER — a level-3 step (linking actions on the Gantt): hand_over opens the page, Over to you in the panel with what to do
 *      and why the AI cannot; handover_state reads it is not done — never assumed
 *   6  MANUAL MODE — the stops on the line's own records and its page says them in its own words; tool_intel says the levels
 *   7  the phone: Over to you's presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/ai-pareto.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';
import { openLineMore } from '../lib/lineMore.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const LINE = 'Line 3 — bagging';
const line = await page.evaluate(async n => (await (await import('/src/lib/lines.ts')).addLineToFactory(n)).id, LINE);
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: false, why: 'nothing planned' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const doIt = async name => {
  await page.waitForSelector(`[data-card="${name}"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
  const c = page.locator(`[data-card="${name}"][data-card-status="waiting"]`).last();
  const n = await c.count();
  if (n) await c.getByRole('button', { name: 'Do it' }).click();
  return n === 1;
};
let turns = 0;
const round = async (words, rounds, card) => {
  plan = rounds;
  await send(words);
  if (card) ok(await doIt(card), `the write is a card first: ${card}`);
  turns += 1;
  await answered(turns);
};
const results = () => asks.at(-1)?.pending?.results ?? [];
const result = id => asks.flatMap(a => a?.pending?.results ?? []).filter(r => r.id === id).at(-1);
const calls = (...cs) => () => ({ ok: true, reply: '', calls: cs.map(([id, name, input]) => ({ id, name, input })), assistant: { v: 1 } });
const then = words => () => ({ ok: true, reply: words });
const obsOf = () => page.evaluate(async ws => (await (await import('/src/db.ts')).listObservations(ws)).filter(o => !o.deletedAt).map(o => ({ c: o.category, t: o.timing, ms: o.durationMs })), line);

await t.go(`#/ai?line=${encodeURIComponent(line)}`, 3000);
await openLunaContext(page); await openLunaFolds(page);   /* F2: the context one tap away at a desk, opened as a person would */

/* ---- 1 · NOTHING YET ---- */
const SAID = 'We keep losing time because bags aren’t presenting properly on Line 3.';
await round(SAID, [calls(['a1', 'assess_evidence', { tool: 'stops', lineId: line }], ['p1', 'pareto', { lineId: line }]), then('There is nothing on Line 3 to rank yet — shall we time the stops?')]);
const a1 = result('a1'), p1 = result('p1');
ok(a1?.ok && /Best way to get it: live — start_measurement \(stops\)/.test(a1.says) && /Do not ask for figures typed by hand/.test(a1.says), '1 assess_evidence: nothing held, the best way is to time them live — never typing what a measurement can give');
ok(p1?.ok && p1.data?.ranked === false && /^There is nothing to rank yet on Line 3 — bagging: /.test(p1.says), `1 pareto refuses to rank nothing: "${(p1?.says ?? '').slice(0, 90)}"`);
ok(/Do not draw a Pareto from the problem as said/.test(p1?.says ?? ''), '1 told never to draw a Pareto from the problem as said');
ok((await obsOf()).length === 0, '1 nothing written to the line');

/* ---- 2 · SAID ---- */
await round('The operators reckon bag presentation costs us about 45 minutes a shift.', [calls(['p2', 'pareto', { lineId: line, reported: [{ category: 'Bag presentation', minutes: 45 }] }]), then('That is what the operators report — not timed yet.')]);
const p2 = result('p2');
ok(p2?.ok && p2.data?.lead?.basis === 'reported' && p2.data?.enough?.level === 'reported', '2 the said figure ranked as reported');
ok(/^As reported on Line 3 — bagging: 45 min lost\./.test(p2?.says ?? '') && !/^Timed/.test(p2?.says ?? '') && /time it before relying on the ranking/.test(p2?.says ?? ''), `2 never said as timed, and how to rely on it: "${(p2?.says ?? '').slice(0, 80)}"`);
ok((await obsOf()).length === 0, '2 still nothing written to the line — a figure said is not a stop timed');

/* ---- 3 · LIVE ---- */
await round('OK, let’s time it now.', [calls(['m1', 'start_measurement', { tool: 'stops', lineId: line }]), then('Timing the stops — say each one as it happens.')], 'start_measurement');
const stopRound = async (reason, mins) => {
  await round(`Bagger’s stopped — ${reason}`, [calls([`s${turns}`, 'capture_event', { event: 'stopped', machine: 'Bagger', reason }]), then('Timing it.')]);
  await page.waitForTimeout(mins);
  await round('Running again', [calls([`r${turns}`, 'capture_event', { event: 'running' }]), then('Kept.')]);
};
await stopRound('Bag presentation', 1500);
await stopRound('Bag presentation', 1200);
await round('Bagger’s stopped — film break', [calls(['sx', 'capture_event', { event: 'stopped', machine: 'Bagger', reason: 'Film break' }]), then('Timing it.')]);
await round('Scrap that, it didn’t stop', [calls(['ux', 'undo_capture', {}]), then('Taken back.')]);
await stopRound('Seal jam', 900);
ok((await page.locator('[data-card="capture_event"]').count()) === 0, '3 the stops captured with no card each');
await page.locator('[data-measure-end]').click().catch(() => undefined); await page.waitForTimeout(800);
await round('So where does the time go?', [calls(['p3', 'pareto', { lineId: line, reported: [{ category: 'Bag presentation', minutes: 45 }] }]), then('Here is what the stopwatch says so far.')]);
const p3 = result('p3');
const timed = (await obsOf()).filter(o => o.t === 'stopwatch' && o.ms > 0);
ok(timed.length === 3 && timed.filter(o => o.c === 'Bag presentation').length === 2 && !timed.some(o => o.c === 'Film break'), `3 three stops timed on the line, the undone one struck (${timed.map(o => o.c).join(', ')})`);
ok(p3?.ok && p3.data?.lead?.basis === 'measured' && p3.data?.lead?.by === 'time', '3 the stopwatch leads, ranked by time lost');
ok(/^Timed on Line 3 — bagging, .*Bag presentation leads — .* in 2 stops/.test(p3?.says ?? ''), `3 said from the stopwatch: "${(p3?.says ?? '').slice(0, 110)}"`);
ok(p3.data?.enough?.level === 'thin' && /to rely on it: at least 20 stops over 7 days \(17 more stops, 6 more days\)/.test(p3.says), '3 thin, and what more would make it enough');
ok(/Kept apart, not added in: said in this conversation \(reported\): Bag presentation 45 min/.test(p3.says), '3 the said figure kept apart, never added to the timed');

/* ---- 4 · A FILE ---- */
const dir = mkdtempSync(join(tmpdir(), 'fl-pareto-'));
const csv = join(dir, 'line3-downtime-w45.csv');
writeFileSync(csv, 'Date,Line,Downtime reason,Duration (mins),Stops\n2026-11-03,Line 3,Bag presentation,32,8\n2026-11-04,Line 3,Film break,14,2\n2026-11-05,Line 3,Bag presentation,25,6\n2026-11-05,Line 3,Label,abc,1\n');
const before = (await obsOf()).length;
await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles(csv);
await page.waitForSelector('[data-imported]', { timeout: 8000 }).catch(() => undefined);
const note = await t.words('[data-imported]');
ok(/Read “line3-downtime-w45\.csv” in code: 3 rows .*1 row left out — row 5 \(“Label”\) — “abc” is not a number\. Kept as imported evidence \[imp-/.test(note), `4 the file read in code, the row it could not read named: "${note.slice(0, 100)}"`);
ok((await page.locator('.sheet, [role="dialog"]').filter({ hasText: 'whose factory' }).count()) === 0, '4 a downtime file is not taken for a factory document');
const impId = /\[(imp-[a-z0-9]+)\]/.exec(note)?.[1];
await round('I’ve attached last week’s downtime export.', [calls(['i1', 'import_table', {}], ['p4', 'pareto', { lineId: line, importId: impId }]), then('The file agrees bag presentation leads.')]);
const i1 = result('i1'), p4 = result('p4');
ok(i1?.ok && /3 rows — reason “Downtime reason”, minutes “Duration \(mins\)”, count “Stops”, by line, dated/.test(i1.says), '4 import_table lists it with the columns found');
ok(asks.at(-2)?.focus?.includes?.('Files read in code (imported evidence): “line3-downtime-w45.csv”') || JSON.stringify(asks.slice(-3)).includes('Files read in code (imported evidence)'), '4 the gateway is told the file is there, as imported');
ok(p4?.ok && p4.data?.lead?.basis === 'measured' && p4.data.sources.some(s => s.basis === 'imported'), '4 pareto: the stopwatch still leads; the file ranked on its own');
ok(/imported from a file \(“line3-downtime-w45\.csv”\)/.test(p4?.says ?? ''), '4 said as imported, kept apart');
ok((await obsOf()).length === before, '4 the line’s stops unchanged by the file');

/* ---- 5 · HANDED OVER ---- */
await round('Can you link the bag fix to wait for the film order?', [calls(['t1', 'tool_intel', { tool: 'actions' }], ['h1', 'hand_over', { tool: 'actions', op: 'depend', lineId: line }]), then('That one is yours on the Gantt — I’ve opened it.')]);
const t1 = result('t1'), h1 = result('h1');
ok(t1?.ok && /Link what waits for what: with you on the page \(dragging things on the page\)/.test(t1.says), '5 tool_intel says the level of each operation — linking is with the person on the page');
await page.waitForFunction(() => /view=actions/.test(document.querySelector('[data-work] iframe')?.getAttribute('src') ?? ''), null, { timeout: 8000 }).catch(() => undefined);
const pane = await page.evaluate(() => document.querySelector('[data-work] iframe')?.getAttribute('src') ?? '');
ok(h1?.ok && /I can’t do this part/.test(h1.says) && pane.includes(`/lines/${line}`) && pane.includes('view=actions'), `5 hand_over opens the line’s Actions beside the conversation and says the AI cannot do it (${pane.slice(0, 60)})`);
await page.waitForSelector('[data-ctx-await]', { timeout: 8000 }).catch(() => undefined);
const aw = await t.words('[data-ctx-await]');
ok(/over to you/i.test(aw) && /drag a bar’s end onto the one it waits for/.test(aw) && /I can’t do this part on the screen/.test(aw), `5 Over to you in the panel: "${aw.slice(0, 90)}"`);
await round('Done — I’ve finished that on the page.', [calls(['hs', 'handover_state', {}]), then('Nothing has changed on the line yet — have another look.')]);
ok(/Not done yet — never assume it was/.test(result('hs')?.says ?? ''), '5 handover_state reads it is not done — never assumed');

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
const back = page.locator('.ai-work-back:visible');
if (await back.count()) { await back.click(); await page.waitForTimeout(400); }
await page.locator('.ai-strip').click().catch(() => undefined); await page.waitForTimeout(600);
const done = page.locator('[data-await-done]:visible').first();
ok((await done.count()) === 1 && (await done.boundingBox()).height >= 44, '7 the phone: Over to you in the context sheet, its press a thumb’s height');
const wide = await page.evaluate(() => document.documentElement.scrollWidth);
ok(wide <= 392, `7 nothing off the side at 390 (${wide})`);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(400);
/* the phone's context sheet closed first, as a person would — Luna's panel stays across pages, so its scrim would sit over the line's page (11 November) */
for (let i = 0; i < 3 && await page.locator('.sheet-scrim:visible').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 3000 }).catch(() => undefined);

/* ---- 6 · MANUAL MODE ---- */
const says = await page.evaluate(async ws => {
  const m = await import('/src/screens/ProductionLineScreen.tsx');
  return m.stopsOf(await (await import('/src/db.ts')).listObservations(ws)).says;
}, line);
await t.go(`#/lines/${encodeURIComponent(line)}`, 2500);
await openLineMore(page);   /* the stops sit in More about this line since 10 November — opened as a person would */
const linePage = await page.evaluate(() => document.body.innerText);
ok(!!says && linePage.includes(says.split(' — ')[0]), `6 the line’s page says the stops in its own words: "${says}"`);

await t.finish('Tool intelligence on the Pareto: nothing ranked from a problem as said; what was said kept as reported; the stops timed live leading, thin and what more; a file read in code kept as imported; a step only the person can do handed over and read back, never assumed — every record the app’s own.');
