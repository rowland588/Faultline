/* ACCEPTANCE — FC-039 RECOVERY LEVERS (knowledge/specs/FC-039-recovery-levers.md; knowledge/methods/capacity/theory-of-constraints.md).
 *
 * Driven in a real browser on a line's capacity page with the real sliders. The line is built by hand: the Bagger is the constraint
 * at 120 a minute (the Filler 130), two counted shifts of 450 planned minutes, each with a 40-minute breakdown on the Bagger, 30
 * minutes of jams on the Filler (off the constraint) and a 36-minute changeover; a pack earns 35p, the crew of four £15 an hour, the
 * line runs 2 shifts a day 5 days a week. By hand (scripts/knowledge/cases-toc.py): 20% off the breakdown is 8 min back = 960 packs =
 * £336; 50% off the changeover 18 min = 2,160 packs = £756; together 26 min = 3,120 packs = £1,092 a shift, £10,920 and 31,200 packs
 * a week of ten shifts, 4.3 hours; the jams, off the constraint, give minutes and no packs.
 *
 *   1  nothing slid: the module's own prompt
 *   2  two levers slid: the plan's sentence and each lever's line, as the module says them and as worked by hand — a shift and a
 *      week, the lost contribution and the idle labour apart; the prize named
 *   3  a loss off the constraint: minutes back and not one more pack — the mirage, said, with where the prize is
 *   4  no margin and no crew: the packs said and each input named; no running pattern: the week asked for, never guessed
 *   5  the plan on paper, downloaded and read back — the sentence, the lines, where it is held, how it is known
 *   6  on a phone nothing off the side
 *
 *   node scripts/acceptance/recovery-levers.mjs      (SMOKE_BASE, as smoke) */
import { BASE, openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words, norm } = t;
const sd = await t.seed();
const WS = sd.wsId;
const station = o => ({ kind: 'machine', unit: 'packs', contains: 1, ratePer: 'min', source: 'plate', crew: 1, ...o });
await page.evaluate(async ([ws, cap]) => {
  const db = await import('/src/db.ts'); const now = Date.now();
  for (const o of await db.listObservations(ws)) await db.addObservation({ ...o, deletedAt: now });
  for (const s of (await db.listAllStudies()).filter(x => x.workspaceId === ws && ['losses', 'changeover'].includes(x.tool) && !x.deletedAt)) await db.putStudy({ ...s, deletedAt: now });
  for (const p of await db.listStandardsForLine(ws)) await db.putStandard({ ...p, capacity: { ...cap, stations: cap.stations.map(s => ({ ...s })) } });
  const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, labourBurden: 1, marginPerPack: 0.35, materialsPerPack: undefined });
  for (const day of [3, 2]) {
    const from = new Date(now - day * 86_400_000).setHours(6, 0, 0, 0), to = from + 8 * 3_600_000;
    const stop = (cat, sub, asset, mins, at) => db.addObservation({ id: crypto.randomUUID(), workspaceId: ws, category: cat, subcategory: sub, asset, startedAt: from + at * 3_600_000, durationMs: mins * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now });
    await stop('Breakdown', 'Mechanical', 'Bagger', 40, 1); await stop('Jams', 'Misfeed', 'Filler', 30, 3); await stop('Changeover', 'Size change', 'Bagger', 36, 5);
    await db.putStudy({ id: crypto.randomUUID(), tool: 'losses', name: `Shift ${day}`, workspaceId: ws, facts: { losses: { shift: 'Days', from, to, plannedMin: 450, breakMin: 30, made: 40_080, rejects: 0, ratePerMin: 120, rateFrom: 'plate', rateMachine: 'Bagger' } }, uses: [], startedAt: now, createdAt: now, updatedAt: now });
  }
  await db.putStudy({ id: crypto.randomUUID(), tool: 'changeover', name: 'How the line runs', workspaceId: ws, facts: { running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 } }, uses: [], startedAt: now + 5, createdAt: now + 5, updatedAt: now + 5 });
}, [WS, { targetPerMin: 120, stations: [station({ id: 'fil', name: 'Filler', rate: 130 }), station({ id: 'bag', name: 'Bagger', rate: 120 })] }]);
const PAGE = `#/balances?line=${WS}`;
/* the line-wide analysis sits under the records in "The line as a whole" (ui/Fold, shut until opened — 10 November, tools-carry-on.mjs): opened before its parts are read */
const openWhole = async () => { const f = page.locator('[data-fold="line-whole"]').first(); await f.waitFor({ timeout: 10000 }).catch(() => {}); if ((await f.count()) && !(await f.evaluate(e => e.classList.contains('is-open')))) { await f.locator('.fold-toggle').click(); await page.waitForTimeout(1500); } };
const open = async () => { await page.goto(`${BASE}/#/room`); await go(PAGE, 2800); await openWhole(); const d = page.locator('details.lch-lev:has(.lch-lev-rows)').first(); if (!(await d.evaluate(e => e.open))) await d.locator('> summary').click(); await page.waitForTimeout(400); };
const slide = async (name, v) => { await page.locator(`input[aria-label="Take ${name} down by"]`).evaluate((el, val) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(val)); el.dispatchEvent(new Event('input', { bubbles: true })); }, v); await page.waitForTimeout(300); };
const truth = pct => page.evaluate(async ([ws, pct, spwOff]) => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/lineRead.ts'); const I = await import('/src/lib/intelligence/index.ts');
  const all = await db.listAllStudies(); const mine = all.filter(x => x.workspaceId === ws && !x.deletedAt); const w = await db.getWorkspace(ws);
  const a = R.readLine({ obs: await db.listObservations(ws), counts: mine.filter(x => x.tool === 'losses' && x.facts.losses), now: Date.now(), smeds: spwOff ? [] : mine.filter(x => x.tool === 'changeover' && x.facts.running), ws: w, products: (await db.listStandardsForLine(ws)).filter(p => !p.deletedAt), lineName: w.name });
  const l = I.leversOf(a.fall, a.rates.theoretical, pct, a.shiftsPerWeek, a.unit);
  return { plan: I.leverPlan(a.fall, l, { unit: a.unit }), says: l.says, spw: a.shiftsPerWeek };
}, [WS, pct, false]);

/* ---- 1 nothing slid ---- */
await open();
{
  const v = await truth({});
  ok((await words('.lch-lev-sum')) === 'Slide a loss down to see what it gives back.' && v.plan.sentence === v.says, '1 nothing slid: the module’s own prompt — “Slide a loss down to see what it gives back.”');
  ok(v.spw === 10, '1 the line runs 2 shifts a day 5 days a week: ten shifts, from its SMED — never assumed');
}

/* ---- 2 two levers slid ---- */
{
  await slide('Breakdown', 20); await slide('Changeovers', 50);
  const v = await truth({ 'cause:Breakdown': 20, changeover: 50 });
  const r2 = n => Math.round(n * 100) / 100;
  ok(r2(v.plan.total.backMin) === 26 && Math.round(v.plan.total.packs) === 3120 && r2(v.plan.total.contribution) === 1092 && r2(v.plan.total.labour) === 26 && Math.round(v.plan.week.packs) === 31200 && r2(v.plan.week.contribution) === 10920 && r2(v.plan.week.hours) === 4.33,
    '2 the module on the case: 26 min a shift, 3,120 packs, £1,092 of contribution and £26 of idle labour; a week £10,920, 31,200 packs, 4.33 h');
  const sum = norm(await words('.lch-lev-sum'));
  ok(sum === norm(v.plan.sentence) && sum === norm('20% off breakdown on the Bagger, 50% off changeovers on the Bagger: 26 min a shift back — 3,120 more packs a shift · £1,092 of lost contribution · £26 of idle labour; a week of 10 shifts, 4.3 hours back — 31,200 more packs a week · £10,920 of lost contribution · £260 of idle labour (changeovers: only if on the constraint).'),
    `2 the plan’s sentence, as the module says it and as worked by hand: ${sum.slice(0, 110)}…`);
  const rows = (await page.locator('.lch-lev-says').allInnerTexts()).map(x => norm(x));
  ok(rows.includes(norm('Breakdown · Bagger (constraint) — 20% of 40 min a shift = 8 min back (1.3 h a week): 960 packs a shift, 9,600 a week, £336 of contribution a shift, £8 of idle labour a shift.')), `2 each lever in its own line, the week beside the shift: ${rows[0]?.slice(0, 120)}`);
  ok(norm(await words('.lch-lev-prize')) === 'The most to gain at the constraint is breakdown on the Bagger: 40 min a shift.', '2 where the prize is — breakdown on the Bagger, 40 min a shift');
}

/* ---- 3 a loss off the constraint ---- */
{
  await slide('Breakdown', 0); await slide('Changeovers', 0); await slide('Jams', 100);
  const v = await truth({ 'cause:Jams': 100 });
  const sum = norm(await words('.lch-lev-sum'));
  ok(sum === norm(v.plan.sentence) && sum === '100% off jams on the Filler: 30 min a shift back and not one more pack - every loss chosen is off the constraint, which holds the line. The prize is at the constraint: breakdown on the Bagger, 40 min a shift.'.replace(' - ', ' - '),
    `3 the mirage: minutes back and not one more pack, and where the prize is — ${sum.slice(0, 100)}…`);
  ok((await page.locator('.lch-lev-says.is-mirage').count()) === 1, '3 the lever off the constraint wears the mirage');
}

/* ---- 4 what is not given ---- */
{
  await page.evaluate(async ws => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: undefined, labourRatePerHour: undefined, marginPerPack: undefined }); }, WS);
  await open(); await slide('Breakdown', 20);
  const miss = (await page.locator('.lch-lev-missing').allInnerTexts()).map(x => norm(x));
  ok(miss.includes('Give the line a margin a pack (Set up the line) to say the lost contribution.') && miss.includes('Give the line its crew and a wage (Set up the line) to say the idle labour.') && /960 more packs a shift/.test(await words('.lch-lev-sum')) && !/£/.test(await words('.lch-lev-sum')),
    '4 no margin and no crew: the 960 packs still said, each missing input named, no pound invented');
  await page.evaluate(async ws => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, labourBurden: 1, marginPerPack: 0.35 });
    for (const s of (await db.listAllStudies()).filter(x => x.workspaceId === ws && x.tool === 'changeover' && !x.deletedAt)) await db.putStudy({ ...s, deletedAt: Date.now() }); }, WS);
  await open(); await slide('Breakdown', 20);
  ok(/The week needs the line’s running pattern/.test(await words('.lch-lev-sum')) && !/a week of/.test(await words('.lch-lev-sum')) && (await page.locator('.lch-lev-missing', { hasText: 'A week needs the line’s running pattern' }).count()) === 1,
    '4 no running pattern: a shift only, the week asked for — never a guessed week');
  await page.evaluate(async ws => { const db = await import('/src/db.ts'); const now = Date.now(); await db.putStudy({ id: crypto.randomUUID(), tool: 'changeover', name: 'How the line runs', workspaceId: ws, facts: { running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 } }, uses: [], startedAt: now + 9, createdAt: now + 9, updatedAt: now + 9 }); }, WS);
}

/* ---- 5 the plan on paper ---- */
await open(); await slide('Breakdown', 20); await slide('Changeovers', 50);
{
  const v = await truth({ 'cause:Breakdown': 20, changeover: 50 });
  const txt = await t.pdfText(() => page.getByRole('button', { name: 'Recovery plan on paper' }).click(), 'levers');
  const flat = s => t.norm(s).replace(/£/g, '').replace(/·/g, '').replace(/\s+/g, ' ');
  ok(txt.includes('Recovery levers - what taking a share off the top losses buys') && flat(txt).includes(flat(v.plan.sentence).slice(0, 150)), '5 the paper: the heading and the plan’s sentence, as the module says it');
  ok(v.plan.lines.every(l => flat(txt).includes(flat(l).slice(0, 90))), `5 every lever’s line on the paper (${v.plan.lines.length})`);
  ok(/The line is held at the Bagger: only minutes recovered there come back as packs/.test(txt) && /2 shifts counted in the period, 900 planned minutes/.test(txt), '5 where it is held, and how it is known — the shifts counted');
}

/* ---- 6 a phone ---- */
await page.setViewportSize({ width: 375, height: 800 }); await open(); await slide('Breakdown', 20);
{
  const wide = await t.wide();
  ok(wide <= 1 && (await page.locator('.lch-lev-sum').isVisible()), `6 on a phone: the levers read, nothing off the side (${wide}px over)`);
}
await page.setViewportSize({ width: 1360, height: 900 });

await t.finish('Recovery levers accepted: what a share off the top losses buys a shift and a week, at the constraint and off it, in two money parts — on the page, on the paper, on a phone');
