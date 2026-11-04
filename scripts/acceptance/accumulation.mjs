/* ACCEPTANCE — FC-046 ACCUMULATION BETWEEN MACHINES (knowledge/specs/FC-046-accumulation.md; knowledge/methods/capacity/accumulation-buffer.md).
 *
 * The record's worked case on a product's Line capacity, driven in a real browser with the real controls: a depositor at 100 a
 * minute feeding a sealer (the bottleneck, 90) through 600 packs, ten depositor stops put in the log (2 3 3 4 5 6 8 12 15 20 minutes).
 * By hand (scripts/knowledge/cases-toc.py): the buffer holds 600 ÷ 90 = 6.7 min of the sealer's work and comes back in 600 ÷ 10 =
 * 60 min; 6 stops are absorbed and 4 run past it, starving the sealer 28.3 min = 2,550 packs = £1,020 at 40p; the 90th percentile
 * (15 min) needs 1,350 packs.
 *
 *   1  nothing written down as collecting: said, what to write, no table and no money
 *   2  a buffer written: the block says the module's sentence and the table the record's figures; the row in words
 *   3  no margin: the packs said and the missing input named; the margin given: £1,020 and the money sentence; the planned hours
 *      given, the buffer never refills (it stops every 52 min and takes 60 to come back) and amber with the words
 *   4  the paper, downloaded and read back: Buffers — … as the module says it
 *   5  on a phone nothing off the side
 *   6  a client reads it and changes nothing
 *
 *   node scripts/acceptance/accumulation.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper as pressPaper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, words, norm } = t;
const sd = await t.seed();
const SID = sd.lineStandardId, WS = sd.wsId;
const CAP = `#/w/${WS}/standards/${SID}?at=balance`;
const STOPS = [2, 3, 3, 4, 5, 6, 8, 12, 15, 20];
const station = (o) => ({ kind: 'machine', unit: 'packs', contains: 1, ratePer: 'min', source: 'plate', crew: 1, ...o });
const line = (buffer, planned) => ({ targetPerMin: 90, plannedHoursPerWeek: planned, stations: [station({ id: 'dep', name: 'Depositor', rate: 100, ...(buffer ? { bufferAfter: buffer } : {}) }), station({ id: 'sea', name: 'Sealer', rate: 90 })] });
const setCap = c => page.evaluate(async ([id, cap]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: cap }); }, [SID, c]);
const setWs = p => page.evaluate(async ([id, p]) => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(id); await db.updateWorkspace({ ...w, ...p }); }, [WS, p]);
/* this device's seeded stops on the line are put away, then the ten are put in */
await page.evaluate(async ([ws, stops]) => {
  const db = await import('/src/db.ts');
  for (const o of await db.listObservations(ws)) await db.addObservation({ ...o, deletedAt: Date.now() });
  const now = Date.now();
  for (const [i, m] of stops.entries()) await db.addObservation({ id: crypto.randomUUID(), workspaceId: ws, category: 'Jam', subcategory: 'Misfeed', asset: 'Depositor', startedAt: now - (i + 1) * 86_400_000, durationMs: m * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now });
}, [WS, STOPS]);
await setWs({ marginPerPack: undefined, materialsPerPack: undefined });
const truth = () => page.evaluate(async ([sid, planned]) => {
  const db = await import('/src/db.ts'); const C = await import('/src/tools/linebalance/capacity.ts'); const B = await import('/src/tools/linebalance/capacityBuffer.ts'); const L = await import('/src/tools/losses/losses.ts');
  const st = await db.getStandard(sid); const ws = await db.getWorkspace(st.workspaceId); const obs = await db.listObservations(st.workspaceId);
  const to = new Date().setHours(0, 0, 0, 0) + 86_400_000, from = to - 28 * 86_400_000;
  const r = C.analyse(st.capacity); const cost = L.contributionOf(ws);
  return B.bufferView(r, { lengths: B.stopLengths(obs, r.ok.map(x => x.station), from, to), ...(cost ? { contributionPerPack: cost.perPack } : {}), ...(st.capacity.plannedHoursPerWeek ? { plannedMin: st.capacity.plannedHoursPerWeek * 60 * 4 } : {}) });
}, [SID]);

/* ---- 1 nothing written down ---- */
await setCap(line(undefined, 40)); await go(CAP);
{
  const v = await truth();
  ok((await words('.bfr-says')) === v.sentence && /^Nothing is written down as collecting between the stations — a stop next to Sealer stops Sealer\./.test(v.sentence),
    `1 nothing written down as collecting: said, as the module says it — ${v.sentence.slice(0, 80)}…`);
  ok((await page.locator('.bfr-t').count()) === 0 && (await page.locator('.bfr-money').count()) === 0, '1 no table and no money claimed while nothing is written');
}

/* ---- 2 a buffer of 600 ---- */
await setCap(line(600, 40)); await go(CAP);
let v = await truth();
{
  ok(v.written && v.rows.length === 1 && Math.round(v.rows[0].lostUnits) === 2550 && Math.round(v.rows[0].coverMin * 10) / 10 === 6.7 && v.rows[0].recoveryMin === 60 && v.rows[0].needUnits === 1350,
    '2 the module on the record’s case: holds 6.7 min, back in 60, 2,550 packs starved, 1,350 would cover the 15-minute p90');
  ok((await words('.bfr-says')) === v.sentence, `2 the sentence the module’s: ${v.sentence}`);
  ok(/4 of the 10 logged stops/.test(v.sentence) && /2,550 packs/.test(v.sentence) && /weakest link is the depositor: it holds 6\.7 min and takes 60 min to come back/.test(v.sentence), '2 four of ten ran past; 2,550 packs; the weakest link the depositor, 6.7 min and 60 min');
  const row = norm(await words('.bfr-t tbody tr'));
  ok(row === norm('Depositor before 600 packs 6.7 min 60 min 10 4 of 10 2,550 packs 1,350 packs'), `2 the table row by hand: ${row}`);
  const text = norm(await words('.bfr-rows li'));
  ok(text === norm(`Depositor. ${v.rows[0].says}`) && /holds 6\.7 min of Sealer’s work|holds 6\.7 min of Sealer's work/.test(text) && /1,350 packs - 750 more than it does/.test(text), '2 the row in words: cover, recovery, what ran past and the 1,350 packs it would need — 750 more');
  ok((await page.locator('.bfr.is-a').count()) === 1, '2 amber with the words: stops ran past the cover');
}

/* ---- 3 the money, then the planned hours ---- */
{
  ok((await words('.bfr-missing')).includes('Give the line a margin a pack (Set up the line) to say what the starved minutes cost.') && (await page.locator('.bfr-money').count()) === 0,
    '3 no margin on the line: the packs said and the missing input named — no pound invented');
  await setWs({ marginPerPack: 0.4 }); await go(CAP); v = await truth();
  ok(Math.round(v.rows[0].lostPounds) === 1020 && (await words('.bfr-t tbody tr')).includes('2,550 packs · £1,020'), '3 a margin of 40p: £1,020 in the row, as 2,550 packs × 0.40');
  ok((await words('.bfr-money')) === v.money && /2,550 packs not made, £1,020 of contribution if it cannot be made up\./.test(v.money), '3 the money sentence the module’s, “if it cannot be made up”');
  await setCap(line(600, undefined)); await go(CAP);
  ok((await words('.bfr-missing')).includes('Give the planned hours a week') && !(await words('.bfr-rows li')).includes('before the next stop'), '3 the planned hours not given: whether it is back before the next stop is not said — the input named');
  await setCap(line(600, 40)); await page.evaluate(async id => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: { ...st.capacity, plannedHoursPerWeek: 2.5 } }); }, SID);
  await go(CAP); v = await truth();
  const r0 = v.rows[0];
  ok(Math.abs(r0.betweenMin - 52.2) < 1e-6 && r0.refills === false && (await words('.bfr-rows li')).includes('it is never full again before the next stop'),
    `3 2.5 planned hours a week: it stops about every ${r0.betweenMin.toFixed(1)} min and takes 60 to come back — never full again, and said`);
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: { ...st.capacity, plannedHoursPerWeek: 40 } }); }, SID);
  await go(CAP);
  ok((await words('.bfr-rows li')).includes('so the buffer is back before the next stop'), '3 40 planned hours a week: back before the next stop, said');
}

/* ---- 4 the paper ---- */
{
  v = await truth();
  const txt = await t.pdfText(() => pressPaper(page, /^Line capacity — /), 'buffers');
  const want = t.norm(`Buffers — ${v.paper}`);
  ok(txt.toLowerCase().includes(want.toLowerCase()) && /weakest link the depositor: holds 6\.7 min, back in 60 min; 4 of 10 logged stops ran past it - 2,550 packs, £1,020/.test(txt),
    `4 the paper carries the Buffers line as the module says it: ${want.slice(0, 120)}`);
}

/* ---- 5 a phone ---- */
await page.setViewportSize({ width: 375, height: 800 }); await go(CAP);
await page.getByRole('button', { name: 'Show the workings and set-up' }).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500);
{
  const wide = await t.wide();
  ok(wide <= 1 && (await page.locator('.bfr-says').isVisible()) && (await page.locator('.bfr-rows').isVisible()), `5 on a phone: the block reads, nothing off the side (${wide}px over)`);
}
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- 6 a client ---- */
await page.evaluate(async ([id, pid]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, projectId: pid }); }, [SID, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${sd.projectId}/standard/${SID}?at=balance`);
{
  const inputs = await page.locator('.bfr input, .bfr button').count();
  ok((await page.locator('.bfr-says').count()) === 1 && inputs === 0, `6 a client reads the buffers and changes nothing (${inputs} controls in the block)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

await t.finish('Accumulation accepted: cover, recovery, the stops that ran past it, what they cost, the buffer that would cover the usual long stop — on the page, on the paper, on a phone');
