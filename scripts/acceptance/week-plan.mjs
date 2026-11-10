/* ACCEPTANCE — FC-179 THE WEEK'S SCHEDULE AGAINST CAPACITY and FC-043 DRUM–BUFFER–ROPE (knowledge/specs/FC-179-week-schedule.md,
 * knowledge/specs/FC-043-drum-buffer-rope.md; knowledge/methods/planning/scheduling-rules.md, capacity/dbr-buffer.md).
 *
 * The record's week, driven in a real browser with the real controls: four products on one line, each its own Line capacity
 * (one station at 100, 110, 90 and 120 a minute), orders typed on each — Maris 54,000 due Tue, Tesco 49,500 due Wed, King Edward
 * 150,000 due Wed, Baby 72,000 due Fri — the line running 2 shifts of 8 h less 30 min, 5 days = 900 min a day, a 42-minute
 * changeover agreed between products. By hand (scripts/knowledge/cases-toc.py): 3,256.7 min running + 126 min changeovers = 3,382.7
 * of the 4,500 minutes, 1,117.3 spare (18.6 h); King Edward ends Thu 5 Nov, one day late against Wed; the changeovers are 13,440
 * packs = £4,704 at 35p. With a 6 h buffer, Maris done and Tesco 70% through, the drum is at 897 min: King Edward 50.8% of the
 * buffer gone — watch; at 90% it is 75.8% — expedite, a hole of 150,000 packs = £52,500 at 35p.
 *
 *   1  no running pattern: the week asked for, never guessed; no order yet: asked to type them
 *   2  the four orders typed through the real form: the sentence, the per-run lines and the spare time are the module's and the literals
 *   3  money: no margin names the input; 35p gives the changeovers £4,704 "if it cannot be made up"
 *   4  a week that does not fit: 360,000 on Baby — over the week, packs not made, the crew's time, red
 *   5  the buffer: none given asks for it; 6 h with Tesco 70% done — watch, with the rope's release point; at 90% expedite and the hole
 *   6  arrived and tuning: one arrival recorded, "about 10 are wanted"
 *   7  the paper, downloaded and read back: both headings, each run and each order's place in the buffer
 *   8  a phone: nothing off the side
 *   9  a client reads it and changes nothing
 *
 *   node scripts/acceptance/week-plan.mjs      (SMOKE_BASE, as smoke) */
import { openApp, BASE } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words, norm } = t;
const sd = await t.seed();
const WS = sd.wsId, SID = sd.lineStandardId;
const station = o => ({ kind: 'machine', unit: 'packs', contains: 1, ratePer: 'min', source: 'plate', crew: 1, ...o });
const MON = '2026-11-02';
const PRODUCTS = [['Maris 2kg', 100], ['Tesco 1.25kg', 110], ['King Edward 2.5kg', 90], ['Baby 1kg', 120]];

/* the line: four products (the seeded standard is Maris), no other studies, no stops, margin 35p, a crew of four */
const ids = await page.evaluate(async ([ws, sid, prods]) => {
  const db = await import('/src/db.ts'); const now = Date.now();
  for (const o of await db.listObservations(ws)) await db.addObservation({ ...o, deletedAt: now });
  for (const s of (await db.listAllStudies()).filter(x => x.workspaceId === ws && ['losses', 'changeover'].includes(x.tool) && !x.deletedAt)) await db.putStudy({ ...s, deletedAt: now });
  const st = await db.getStandard(sid);
  for (const p of await db.listStandardsForLine(ws)) if (p.id !== sid) await db.putStandard({ ...p, deletedAt: now });
  const out = [];
  for (const [i, [name, rate]] of prods.entries()) {
    const id = i === 0 ? sid : crypto.randomUUID();
    const cap = { targetPerMin: rate, stations: [{ id: 's' + i, name: 'Packer', kind: 'machine', unit: 'packs', contains: 1, ratePer: 'min', source: 'plate', crew: 1, rate }], changeovers: [{ id: 'c' + i, steps: [], minutes: 42, agreedAt: now }] };
    await db.putStandard({ ...st, id, product: name, projectId: undefined, capacity: cap, deletedAt: undefined, updatedAt: now + i });
    out.push(id);
  }
  const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, labourBurden: 1, marginPerPack: undefined, materialsPerPack: undefined });
  return out;
}, [WS, SID, PRODUCTS.map(([n, r]) => [n, r])]);
const PAGE = `#/balances?line=${WS}`;
/* the line-wide analysis sits under the records in "The line as a whole" (ui/Fold, shut until opened — 10 November, tools-carry-on.mjs): opened before its parts are read */
const openWhole = async () => { const f = page.locator('[data-fold="line-whole"]').first(); await f.waitFor({ timeout: 10000 }).catch(() => {}); if ((await f.count()) && !(await f.evaluate(e => e.classList.contains('is-open')))) { await f.locator('.fold-toggle').click(); await page.waitForTimeout(1500); } };
const open = async () => { await page.goto(`${BASE}/#/room`); await go(PAGE, 2800); await openWhole(); const d = page.locator('details.pln').first(); if (!(await d.evaluate(e => e.open))) await d.locator('> summary').click(); await page.waitForTimeout(400); };
const setRun = () => page.evaluate(async ws => { const db = await import('/src/db.ts'); const now = Date.now(); await db.putStudy({ id: crypto.randomUUID(), tool: 'changeover', name: 'How the line runs', workspaceId: ws, facts: { running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 } }, uses: [], startedAt: now + 5, createdAt: now + 5, updatedAt: now + 5 }); }, WS);
const setWs = p => page.evaluate(async ([id, p]) => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(id); await db.updateWorkspace({ ...w, ...p }); }, [WS, p]);
const truth = () => page.evaluate(async ([ws, from]) => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/lineRead.ts'); const P = await import('/src/tools/plan/planInputs.ts');
  const all = await db.listAllStudies(); const mine = all.filter(x => x.workspaceId === ws && !x.deletedAt); const w = await db.getWorkspace(ws);
  const products = (await db.listStandardsForLine(ws)).filter(p => !p.deletedAt && p.capacity?.stations.length);
  const read = R.readLine({ obs: await db.listObservations(ws), counts: mine.filter(x => x.tool === 'losses' && x.facts.losses), now: Date.now(), smeds: mine.filter(x => x.tool === 'changeover' && x.facts.running), ws: w, products, lineName: w.name });
  const plan = P.planOf({ products, studies: mine.filter(x => x.tool === 'changeover'), read, ws: w, from });
  return { needs: plan.needs, says: plan.sched?.says, lines: plan.sched?.lines, moneyLines: plan.sched?.moneyLines, missing: plan.sched?.missing, spare: plan.sched?.spareMin, late: plan.sched?.late.map(r => r.product), tone: plan.sched?.tone,
    dsays: plan.dbr?.says, drows: plan.dbr?.rows.map(r => [r.product, r.zone, r.word, r.says]), drum: plan.dbr?.drumMin, wip: plan.dbr?.wip, hole: plan.dbr?.hole, tune: plan.dbr?.tune.says, paper: plan.sched?.paper, dpaper: plan.dbr?.paper };
}, [WS, MON]);
const startDay = async () => { await page.locator('input[aria-label="The first running day"]').fill(MON); await page.waitForTimeout(300); };
const addOrder = async (product, qty, due) => {
  await page.locator('select[aria-label="Product ordered"]').selectOption({ label: product });
  await page.locator('input[aria-label="Quantity ordered"]').fill(String(qty));
  await page.locator('input[aria-label="Day the order is due"]').fill(due);
  await page.getByRole('button', { name: 'Add the order' }).click(); await page.waitForTimeout(350);
};

/* ---- 1 no running pattern, then no order ---- */
await open();
ok(/running pattern is not set/.test(await words('.pln-says')), `1 no running pattern: the week asked for, not guessed — ${(await words('.pln-says')).slice(0, 70)}…`);
await setRun(); await open(); await startDay();
ok((await words('.pln-says')) === 'Type the week’s orders — a product, a quantity and the day each is due — to lay them on the line.', '1 no order yet: asked to type them');

/* ---- 2 the four orders through the form ---- */
await addOrder('Maris 2kg', 54000, '2026-11-03'); await addOrder('Tesco 1.25kg', 49500, '2026-11-04'); await addOrder('King Edward 2.5kg', 150000, '2026-11-04'); await addOrder('Baby 1kg', 72000, '2026-11-06');
let v = await truth();
{
  ok(norm(await words('.pln-says')) === norm(v.says), `2 the sentence the module’s: ${v.says.slice(0, 90)}…`);
  ok(v.says === '4 orders need 54.3 h of running and 2.1 h of changeovers (3) — 56.4 h of the 75 h the line runs: it fits, with 18.6 h spare. One order is late against its day: King Edward 2.5kg.', '2 by hand: 3,256.7 + 126 = 3,382.7 of 4,500 minutes — 18.6 h spare, King Edward one day late');
  ok(Math.abs(v.spare - 1117.3) < 0.05 && v.late.length === 1 && v.tone === 'a', '2 spare 1,117.3 min, one late, amber');
  ok(v.lines[2] === '3. King Edward 2.5kg — 150,000 at 90 a minute = 27.8 h after a 42 min changeover (the standard, into this product from any): starts Tue 3 Nov, 2.9 h in, ends Thu 5 Nov, 40.7 min in; due Wed 4 Nov — 1 day late.', '2 the third run by hand: starts Tue 2.9 h in, ends Thu 40.7 min in, one day late — ' + v.lines[2]);
  ok((await page.locator('.pln-order').count()) === 4 && (await page.locator('.pln-order.is-late').count()) === 1, '2 four orders in order, King Edward marked late (with the words)');
  /* order moved: Baby up one place swaps the sequence and the sentence follows the module */
  await page.getByRole('button', { name: 'Move order 4 up' }).click(); await page.waitForTimeout(400);
  const moved = await truth();
  ok(norm(await words('.pln-says')) === norm(moved.says) && moved.lines[2].startsWith('3. Baby 1kg'), '2 Baby moved above King Edward: the schedule follows the order given');
  await page.getByRole('button', { name: 'Move order 3 down' }).click(); await page.waitForTimeout(400);
}

/* ---- 3 money ---- */
{
  const miss = await words('.pln-missing');
  ok(/Give the line a margin a pack \(Set up the line\) to say the changeovers and the packs short in money\./.test(miss) && !(await words('.pln-money')).includes('£'), '3 no margin: the input named, the packs said and no pound invented — ' + miss + ' / ' + (await page.locator('.pln-money').count()));
  await setWs({ marginPerPack: 0.35 }); await open(); await startDay(); v = await truth();
  ok(v.moneyLines.length === 1 && /13,440 packs, £4,704 of contribution, if it cannot be made up\./.test(v.moneyLines[0]) && norm(await words('.pln-money')) === norm(v.moneyLines[0]),
    `3 35p a pack: the three changeovers 13,440 packs = £4,704 — ${v.moneyLines[0]}`);
}

/* ---- 4 a week that does not fit ---- */
await page.locator('input[aria-label="Quantity of order 4, Baby 1kg"]').fill('360000'); await page.locator('input[aria-label="Quantity of order 4, Baby 1kg"]').blur(); await page.waitForTimeout(500);
{
  v = await truth();
  ok(/it does not fit — 21\.4 h over, 153,920 packs not made in the week/.test(v.says) && v.tone === 'r', `4 over the week: ${v.says.slice(0, 150)}`);
  ok(v.moneyLines.some(l => /153,920 packs are not made in the week — £53,872 of contribution/.test(l)) && v.moneyLines.some(l => /£1,283 of the crew’s time at its normal rate/.test(l)), '4 the lost contribution £53,872 and the crew’s time £1,283 said apart, never summed');
  ok(norm(await words('.pln-says')) === norm(v.says), '4 the page says the module’s sentence');
  await page.locator('input[aria-label="Quantity of order 4, Baby 1kg"]').fill('72000'); await page.locator('input[aria-label="Quantity of order 4, Baby 1kg"]').blur(); await page.waitForTimeout(500);
}

/* ---- 5 the buffer ---- */
{
  const dd = page.locator('details.pln-dbr'); if (!(await dd.evaluate(e => e.open))) await dd.locator('> summary').click();
  ok((await words('.pln-dbr')).includes('Give the buffer to see each order’s place in it.'), '5 no buffer given: asked for, no zone invented');
  await page.locator('input[aria-label="The buffer in hours"]').fill('6'); await page.locator('input[aria-label="The buffer in hours"]').blur(); await page.waitForTimeout(500);
  await page.locator('input[aria-label="Percent of Maris 2kg done"]').fill('100'); await page.locator('input[aria-label="Percent of Maris 2kg done"]').blur(); await page.waitForTimeout(300);
  await page.locator('input[aria-label="Percent of Tesco 1.25kg done"]').fill('70'); await page.locator('input[aria-label="Percent of Tesco 1.25kg done"]').blur(); await page.waitForTimeout(500);
  v = await truth();
  const ke = v.drows.find(r => r[0] === 'King Edward 2.5kg');
  ok(Math.round(v.drum * 10) / 10 === 897 && ke[1] === 'watch', '5 the drum at 897 running minutes (Tesco 70% through): King Edward in the buffer — watch');
  ok(ke[3] === 'King Edward 2.5kg: 51% of the buffer is gone — due at the constraint in 3 h of running. Watch it; do not expedite yet.' && norm(await words('.pln-drows')).includes(norm(ke[3])), '5 by hand: 50.8% consumed, 177 min to go — the module’s words are on the page');
  ok(v.drows.find(r => r[0] === 'Baby 1kg')[2] === 'Not due yet' && /Release it (when|during)/.test(v.drows.find(r => r[0] === 'Baby 1kg')[3]), '5 Baby outside the buffer: not due yet, and the rope says when to release it — ' + JSON.stringify(v.drows.find(r => r[0] === 'Baby 1kg')));
  ok(v.wip && Math.round(v.wip.units) === 39600, '5 the buffer holds 39,600 packs (110 a minute, the order next on the drum, × 6 h) — stock, said');
  await page.locator('input[aria-label="Percent of Tesco 1.25kg done"]').fill('90'); await page.locator('input[aria-label="Percent of Tesco 1.25kg done"]').blur(); await page.waitForTimeout(500);
  v = await truth();
  ok(v.drows.find(r => r[0] === 'King Edward 2.5kg')[1] === 'expedite' && v.hole && Math.round(v.hole.pounds) === 52500, '5 Tesco 90% through: King Edward 75.8% gone — expedite; a hole in the drum 150,000 packs = £52,500');
  ok(norm(await words('.pln-dsays')) === norm(v.dsays) && (await page.locator('.pln-zone.is-r', { hasText: 'Expedite' }).count()) >= 1, `5 the red list said in words beside the colour: ${v.dsays.slice(0, 100)}…`);
}

/* ---- 6 an arrival and the tuning ---- */
{
  await page.getByRole('button', { name: /King Edward 2\.5kg has arrived at the constraint/ }).click(); await page.waitForTimeout(500);
  v = await truth();
  ok(/^1 arrival recorded — about 10 are wanted before the buffer is tuned from them/.test(v.tune) && (await page.locator('.pln-dlines', { hasText: '1 arrival recorded' }).count()) === 1, '6 one arrival: a week of them is premature, said');
}

/* ---- 7 the paper ---- */
{
  v = await truth();
  const txt = await t.pdfText(() => page.getByRole('button', { name: 'The week’s plan on paper' }).click(), 'week');
  ok(/The week's schedule against capacity, with changeovers/.test(txt) && /Protecting the constraint - drum, buffer, rope/.test(txt), '7 the paper has both headings');
  ok(txt.includes(norm(v.says).slice(0, 80)) && txt.includes('King Edward 2.5kg') && /Release/.test(txt) && txt.includes(norm(v.tune).slice(0, 60)), '7 the paper carries the sentence, each run, the rope and the tuning as the module says them');
}

/* ---- 8 a phone ---- */
await page.setViewportSize({ width: 375, height: 800 }); await open();
{
  const wide = await t.wide();
  ok(wide <= 1 && (await page.locator('.pln-says').isVisible()), `8 on a phone: the plan reads, nothing off the side (${wide}px over)`);
}
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- 9 a client ---- */
await page.evaluate(async ([ids, pid]) => { const db = await import('/src/db.ts'); for (const id of ids) { const st = await db.getStandard(id); await db.putStandard({ ...st, projectId: pid }); } }, [ids, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/balances?line=${WS}&project=${sd.projectId}`, 2800); await openWhole();
{
  const open = page.locator('details.pln').first();
  if (await open.count() && !(await open.evaluate(e => e.open))) await open.locator('> summary').click();
  const controls = await page.locator('.pln-add, .pln-ctl, .pln-dctl, .pln-bufin, .pln-add input').count();
  ok((await page.locator('.pln-says').count()) === 1 && controls === 0, `9 a client reads the plan and changes nothing (${controls} editing controls in it; only the view’s start day stays)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

await t.finish('The week’s plan accepted: orders laid on the constraint with changeovers, late and over, the money apart, the buffer’s zones and the rope, the tuning, the paper, a phone, a client');
