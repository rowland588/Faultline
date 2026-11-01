/* ACCEPTANCE — FC-056 SPEED LOSS (knowledge/specs/FC-056-speed-loss.md; knowledge/methods/equipment/short-stops-speed.md).
 *
 * The record's shift, built in the app and read on a loss count's page: planned 450 min, a 62-minute breakdown, ideal 120 a minute
 * (the Bagger's plate), the running speed timed at 108, 38,200 good packs; the crew of 4 at £15 an hour and a margin of 30p a pack.
 * By hand (scripts/knowledge/cases-toc.py): run 388; net operating time 353.70; slow running 35.37 min (4,244 packs) and short
 * stops 34.30 min (4,116 packs) — about the same; 90% of the plate; at 30p £1,273 and £1,235 of contribution, £35 and £34 of idle
 * labour; 41 short stops in the 388-minute run are 6.34 an hour, 50 seconds each.
 *
 *   1  the panel's sentence, lines and money — the module's and the literals by hand; the missing count said
 *   2  a reliability study's short stops offered (41 in 6.5 h watched) and used with one tap, said where from
 *   3  a count typed (20 in 194 minutes), kept after a reload, changed and cleared with Undo
 *   4  no running speed timed: one lump, not told apart; no margin and no crew: each input named
 *   5  the paper, downloaded and read back: the Speed loss paragraph as the module says it
 *   6  on a phone nothing off the side and the buttons thumb-sized
 *   7  a client reads it and changes nothing
 *
 *   node scripts/acceptance/speed-loss.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper as pressPaper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, words, norm } = t;
const sd = await t.seed();
const WS = sd.line7WsId;
const made = await page.evaluate(async ws => {
  const db = await import('/src/db.ts'); const now = Date.now(); const id = crypto.randomUUID(), rel = crypto.randomUUID();
  /* this line's own counts, stops and studies are put away: the shift below is the only one */
  for (const o of await db.listObservations(ws)) await db.addObservation({ ...o, deletedAt: now });
  for (const s of (await db.listAllStudies()).filter(x => x.workspaceId === ws && (x.tool === 'losses' || x.tool === 'reliability') && !x.deletedAt)) await db.putStudy({ ...s, deletedAt: now });
  const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, labourBurden: 1, marginPerPack: 0.3, materialsPerPack: undefined });
  const from = new Date(now - 86_400_000).setHours(6, 0, 0, 0), to = from + 8 * 3_600_000;
  await db.addObservation({ id: crypto.randomUUID(), workspaceId: ws, category: 'Breakdown', subcategory: 'Mechanical', asset: 'Bagger', startedAt: from + 3_600_000, durationMs: 62 * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now });
  await db.putStudy({ id, tool: 'losses', name: 'Days — the speed loss', workspaceId: ws, facts: { losses: { shift: 'Days', from, to, plannedMin: 450, breakMin: 30, made: 38_200, rejects: 0, ratePerMin: 120, rateFrom: 'plate', rateMachine: 'Bagger' }, timings: [{ id: 't1', at: from, packs: 1080, sec: 600 }] }, uses: [], startedAt: now, createdAt: now, updatedAt: now });
  /* a reliability study that counted 41 short stops in a watch of 388 minutes */
  const base = from;
  await db.putStudy({ id: rel, tool: 'reliability', name: 'Wrapper stops', machine: 'Bagger', workspaceId: ws, agreed: { reliability: { counts: [{ id: 'a', name: 'Short stop' }] } },
    facts: { watch: [{ id: 'w1', from: base, to: base + 388 * 60_000 }], events: Array.from({ length: 41 }, (_, i) => ({ id: `e${i}`, at: base + (i + 1) * 9 * 60_000, count: 'a' })) }, uses: [], startedAt: now, createdAt: now, updatedAt: now });
  return { id, rel };
}, WS);
const ID = made.id, PAGE = `#/losses/${ID}`;
const truth = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts'); const S = await import('/src/tools/losses/speedLoss.ts');
  const s = await db.getStudy(id); const ctx = { observations: await db.listObservations(s.workspaceId), workspaces: [await db.getWorkspace(s.workspaceId)] };
  return S.speedLoss(L.lossFiguresOf(s, ctx), s.facts.losses.shortStops);
}, ID);

/* ---- 1 the panel ---- */
await go(PAGE, 2800);
let v = await truth();
{
  const r2 = n => Math.round(n * 100) / 100;
  ok(r2(v.slowMin) === 35.37 && r2(v.shortMin) === 34.3 && Math.round(v.slowPacks) === 4244 && Math.round(v.shortPacks) === 4116 && r2(v.runningPct) === 0.9 && v.bigger === 'level',
    '1 the module on the record’s shift: slow running 35.37 min (4,244 packs), short stops 34.30 (4,116), 90% of the plate, about the same');
  const says = norm(await words('.slp-says'));
  ok(says === norm(v.says) && says === norm('Speed loss 69.7 min: 35.4 min of slow running (4,244 packs — it ran at 108 a minute against the plate speed of 120, 10% under) and 34.3 min of short stops (4,116 packs). Slow running and short stops cost about the same — fix both, the speed setting and the jams.'),
    `1 the sentence, as the module says it and as worked by hand: ${says.slice(0, 110)}…`);
  const lines = norm(await words('.slp-lines'));
  ok(lines.includes('How often they come and how long each lasts needs the short stops counted over a watched stretch') && lines.includes("puts the crew's labour up from 0.83p to 0.93p a pack"), '1 the short stops not yet counted: said what to do; the crew’s labour a pack 0.83p → 0.93p');
  ok(norm(await words('.slp-money')) === norm('Slow running £1,273 of lost contribution and £35 of idle labour; short stops £1,235 of lost contribution and £34 of idle labour — at the plate speed, where a minute is a minute of the line, if it cannot be made up.'),
    '1 the money in its two parts, never summed — 30p a pack and four at £15 an hour');
}

/* ---- 2 a reliability study's short stops ---- */
{
  const offer = norm(await words('.slp-offers li'));
  ok(/Wrapper stops - 41 Short stop in 6\.5 h watched/.test(offer), `2 the reliability study's count offered: ${offer}`);
  await page.locator('.slp-offers li').getByRole('button', { name: 'Use these' }).click(); await page.waitForTimeout(1200);
  v = await truth();
  const lines = norm(await words('.slp-lines'));
  ok(Math.abs(v.perHour - 6.34) < 0.01 && Math.abs(v.meanMin * 60 - 50.2) < 0.5, '2 the module: 6.34 an hour, 50 seconds each');
  ok(lines.includes("41 short stops counted in 6.5 h of running (the reliability study 'Wrapper stops'): 6.3 an hour - 50 s each.") || lines.includes('41 short stops counted in 6.5 h of running (the reliability study “Wrapper stops”): 6.3 an hour - 50 s each.'),
    `2 used with one tap, said where from: ${lines.slice(0, 130)}`);
  const kept = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).facts.losses.shortStops, ID);
  ok(kept?.n === 41 && Math.abs(kept.watchedMin - 388) < 1e-6 && /Wrapper stops/.test(kept.from), '2 kept on the count: 41 in 388 min, from the study');
}

/* ---- 3 a count typed ---- */
{
  await page.locator('.slp-form').getByRole('button', { name: 'Clear it' }).click(); await page.waitForTimeout(900);
  ok((await page.locator('.slp-lines').innerText()).includes('needs the short stops counted'), '3 cleared: the count gone from the lines');
  await page.getByLabel('Short stops counted').fill('20'); await page.getByLabel('Minutes of running watched').fill('194');
  await page.locator('.slp-form').getByRole('button', { name: 'Save the short stops' }).click(); await page.waitForTimeout(1000);
  v = await truth();
  const lines = norm(await words('.slp-lines'));
  ok(Math.abs(v.perHour - 20 / (194 / 60)) < 1e-9 && lines.includes(`20 short stops counted in 3.2 h of running: 6.2 an hour, about 40 in the 388 min run`) && /\d+ s each\./.test(lines), `3 20 in 194 minutes: ${lines.slice(0, 120)}`);
  await go(PAGE, 2500);
  ok(norm(await words('.slp-lines')).includes('20 short stops counted in 3.2 h'), '3 kept after a reload');
  await page.getByLabel('Short stops counted').fill('0'); 
  ok(await page.locator('.slp-form button[type=submit]').isDisabled(), '3 zero short stops refused — the button waits');
  await page.locator('.slp-form').getByRole('button', { name: 'Clear it' }).click(); await page.waitForTimeout(800);
  ok(!(await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).facts.losses.shortStops, ID)), '3 cleared — and the Undo bar offers it back');
  await page.getByRole('button', { name: /^Undo/ }).first().click().catch(() => {}); await page.waitForTimeout(900);
  const back = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).facts.losses.shortStops, ID);
  ok(back?.n === 20, '3 Undo brings the count back');
}

/* ---- 4 what it does not claim ---- */
{
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); await db.putStudy({ ...s, facts: { ...s.facts, timings: s.facts.timings.map(x => ({ ...x, struck: true })) } }); }, ID);
  await go(PAGE, 2500);
  const says = norm(await words('.slp-says'));
  ok(/not yet told apart\. Time the running speed while the machine runs to split them\.$/.test(says) && (await page.locator('.slp-form').count()) === 0, `4 no running speed timed: one lump, not told apart, no counting form — ${says.slice(0, 90)}…`);
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); await db.putStudy({ ...s, facts: { ...s.facts, timings: s.facts.timings.map(x => ({ ...x, struck: false })) } }); }, ID);
  await page.evaluate(async ws => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: undefined, labourRatePerHour: undefined, marginPerPack: undefined }); }, WS);
  await go(PAGE, 2500);
  const miss = norm(await words('.slp-missing'));
  ok((await page.locator('.slp-money').count()) === 0 && (await page.locator('.slp-missing').count()) === 2 && /margin a pack/.test(miss),
    `4 no margin and no crew: the packs still said, the two inputs named, no pound invented`);
  await page.evaluate(async ws => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, labourBurden: 1, marginPerPack: 0.3 }); }, WS);
  await go(PAGE, 2500);
}

/* ---- 5 the paper ---- */
{
  v = await truth();
  const txt = await t.pdfText(() => pressPaper(page, / — on paper$/), 'speed-loss');
  const says = t.norm(v.says), money = t.norm(v.money[0].toUpperCase() + v.money.slice(1));
  ok(txt.includes('Speed loss') && txt.replace(/£/g, '').includes(says.replace(/£/g, '').slice(0, 120)), `5 the paper carries the Speed loss paragraph, the sentence as the module says it`);
  ok(txt.replace(/£/g, '').includes('20 short stops counted in 3.2 h of running') && txt.includes('3.2 h') && txt.replace(/£/g, '').includes(money.replace(/£/g, '').slice(0, 60)), '5 and the short stops counted and the money, in the same words');
}

/* ---- 6 a phone ---- */
await page.setViewportSize({ width: 375, height: 800 }); await go(PAGE, 2500);
{
  const wide = await t.wide();
  const small = await page.evaluate(() => [...document.querySelectorAll('.slp-form .btn, .slp-form input')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).length);
  ok(wide <= 1 && (await page.locator('.slp-says').isVisible()) && small === 0, `6 on a phone: the panel reads, nothing off the side (${wide}px over), every control thumb-sized (${small} under 40 px)`);
}
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- 7 a client ---- */
await page.evaluate(async ([id, pid]) => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); await db.putStudy({ ...s, projectId: pid }); }, [ID, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(PAGE, 2800);
{
  const controls = await page.locator('.slp input, .slp button').count();
  ok((await page.locator('.slp-says').count()) === 1 && controls === 0, `7 a client reads the speed loss and changes nothing (${controls} controls)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

await t.finish('Speed loss accepted: slow running and short stops in packs and money, which is bigger, how often and how long each short stop is — on the page, on the paper, on a phone');
