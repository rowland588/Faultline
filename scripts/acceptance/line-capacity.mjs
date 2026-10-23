/* ACCEPTANCE — LINE CAPACITY (docs/BUILD.md, Line capacity; docs/CAPACITY.md).
 *
 * Rowland, 12 October: "the line balancing is actually a capacity model ...
 * understanding the V-curve ... my bottleneck could be people, it could be
 * an asset ... we go by plate speed ... of course, unless human." The story,
 * driven in a real browser on the seeded line standard (Line 7's Maris Piper
 * 2kg) with the real controls:
 *
 *   1  the views say what they are: Capacity, and the people's work against takt
 *   2  the V-curve reads as lib/capacity says — a column per station, the
 *      bottleneck navy and named, the sentence the module's; every station's
 *      whole name under its column; a column opens its station
 *   3  the capacity sheet: a row per station, the bottleneck marked, a machine
 *      not on its plate speed said so
 *   4  the owner sets the V's margin; the guide is drawn and the sentence says
 *      what is under it — never assumed before
 *   5  a person timed in the time study: their standard time offered in the
 *      station's unit, used with one tap, said how it is known
 *   6  the bottleneck walked: Walk the line, each station tapped working ·
 *      starved · blocked · down, the verdict against the sums — on the walk
 *      and back on Line capacity
 *   7  a shift: the line's own shifts less the breaks it stops for, less
 *      the changeovers SMED timed into this product, at the bottleneck — a
 *      shift with no breaks said left out, relief run through, the SMED as
 *      timed and then as the standard, the day summed, on the card at the
 *      line, and the way to the SMED
 *  14  screened for problems (Rowland, 15 October: "319%, 279%, 273% ...
 *      these percentages make no sense ... screen it for problems"): his
 *      line as entered — the bottleneck a third of the target, the V's
 *      percentages said against it, a person's rest counted twice — red and
 *      amber, as the module says them, a check opening its station, on paper
 *      under "To check before the sums are trusted"; a line meeting its
 *      target not told it is short
 *  15  several lines feeding one place (Rowland, 15 October: "line A, line B
 *      ... one person who has to wrap for both"; "3, 4, 5 lines into one"): a
 *      chain split where they merge, a line added like the last and named, a
 *      station moved inside its own line, a line taken away and brought back,
 *      a what-if keeping the lines, the checks said along each line, and a V
 *      and a sheet a line on paper, then where they merge
 *   8  a person, as the floor says them (Rowland, 13 October: "8 units in a
 *      tray ... a tray every 8 seconds ... very strange numbers"; "70 a
 *      minute ... 10 to a basket ... one basket goes to a human every X"):
 *      what reaches them worked out the moment they say 8 to a tray, before
 *      they have a speed; "a tray every 8 seconds" said back as a minute and
 *      in the line's unit; whether they keep up in seconds; Make it 2 people;
 *      the ILO's 9% rest on a person's time (docs/CAPACITY.md §1); then a
 *      palletiser (14 October: "each pallet holds 36 baskets ... it's 360"):
 *      the chain said where it is typed, timed per tray with the pallet
 *      worked out, what reaches them a tray and a pallet, fed straight by a
 *      person past 90% said in amber, and not once trays can collect; and a
 *      rate that reads like a time ("5 pallets a minute" for one every 5
 *      minutes) asked, made so in a tap, the cycle kept in minutes
 *   9  each tool lists its own: a product only mapped is not in Line
 *      capacity, a product only worked out for capacity is not in Line
 *      standard; New on a product already on the line is that record; the
 *      line's page counts each tool's own
 *   10 Line capacity's own page: back to Line capacity, its line standard
 *      only when it has one, and on no job the rail is no job's
 *   11 on a phone: the V on its side, every station a bar, the bottleneck
 *      named; the sheet a card a station; nothing off the side
 *   12 what a pack costs in labour (Rowland, 13 October: "if I put two people
 *      there ... is my cost per pack higher or lower?"): the people on the
 *      line stand in from the line standard until typed; the rate typed; the
 *      cost a pack as lib/capacity says it; one more person at the bottleneck,
 *      higher or lower, and made so; a what-if says its labour; the card's
 *      line carries the cost
 *   and a client reads it and changes nothing.
 *
 * Every sentence is checked against the module that makes it (lib/capacity
 * analyse, vCurve and shiftCapacity, lib/ie/walk, lib/ie/balance, lib/ie/changeover). Fails on any console error.
 *
 *   node scripts/acceptance/line-capacity.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const SID = sd.lineStandardId;
const CAP = `#/w/${sd.wsId}/standards/${SID}?at=balance`;
/* What the modules say of the standard's capacity as it stands. */
const truth = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
  const st = await db.getStandard(id); const r = C.analyse(st.capacity); const v = C.vCurve(r, st.capacity.vMarginPct);
  return { n: r.ok.length, limit: r.limit?.station.name, says: v.sentence, under: v.under.map(p => p.name), margin: st.capacity.vMarginPct, stations: st.capacity.stations };
}, SID);

/* ---- 1 the views ---- */
await go(CAP);
await page.locator('.vc-says').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  /* the people's work is the line balance's own page now (17 October) — a door, never a second tab here */
  const tabs = await page.locator('.lb-views .chip').count();
  const door = await page.getByRole('button', { name: 'Its line balance ›' }).count();
  ok(tabs === 0 && door === 1, `1 Line capacity alone on its page, the line balance one door away (${tabs} tabs, ${door} door)`);
}
/* ---- 2 the V-curve ---- */
{
  const t = await truth();
  ok((await words('.vc-says')) === t.says, `2 the V says what the module says: ${t.says}`);
  ok((await page.locator('.vc-pt').count()) === t.n && (await page.locator('.vc-pt.is-limit').count()) === 1 && /BOTTLENECK/.test(await page.locator('.vc-neck').first().textContent() ?? ''), `2 a point per station (${t.n}), the bottleneck — ${t.limit} — filled and named`);
  ok(t.margin == null && (await page.locator('.vc-guide').count()) === 0, '2 no margin agreed: no guide V drawn');
  /* the V as columns (14 October: "sometimes you can't read what the bottom
     line says"): each station's whole name, words under its column, in flow
     order; the bottleneck's column navy; a column opens its station */
  const names = (await page.locator('.vc-nm').allTextContents()).map(x => x.trim());
  const want = t.stations.filter((s, i) => i < t.n).map(s => s.name.trim());
  ok(names.join('|') === want.join('|'), `2b every station named in full under its column: ${names.join(' · ')}`);
  const neckBg = await page.locator('.vc-bar.is-limit').evaluate(e => getComputedStyle(e).backgroundImage);
  ok(/rgb\(18, 23, 28\)/.test(neckBg), `2c the bottleneck's column the house's graphite (${neckBg.slice(0, 60)}…)`);
  await page.locator('.vc-col').first().click(); await page.waitForTimeout(700);
  const opened = await page.locator('.cap-st').first().locator('button[aria-expanded="true"]').count();
  ok(opened === 1, '2d a column tapped opens its station');
  await page.locator('.cap-st').first().getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300);
}
/* ---- 3 the capacity sheet ---- */
{
  const t = await truth();
  ok((await page.locator('.cap-sheet tbody tr').count()) === t.n && /the bottleneck/.test(await words('.cap-sheet tr.is-limit')), '3 the capacity sheet: a row per station, the bottleneck marked');
  const notPlate = t.stations.filter(s => s.kind === 'machine' && s.source !== 'plate').map(s => s.name);
  const said = await Promise.all(notPlate.map(async n => /not its plate speed/.test(await words(`.cap-sheet tr:has-text("${n}")`))));
  ok(said.every(Boolean), `3 a machine not on its plate speed says so${notPlate.length ? ` (${notPlate.join(', ')})` : ''}`);
}
/* ---- 4 the owner sets the V's margin ---- */
{
  await page.getByRole('button', { name: 'Set the V’s margin' }).click(); await page.waitForTimeout(300);
  await page.getByLabel("The V's margin in percent").fill('10');
  await page.getByRole('button', { name: 'Agree it' }).click(); await page.waitForTimeout(900);
  const t = await truth();
  ok(t.margin === 10 && (await page.locator('.vc-guide').count()) === 1 && (await words('.vc-says')) === t.says, `4 the margin agreed at 10%: the guide drawn — ${t.says}`);
}
/* ---- 5 a person at their standard time ---- */
{
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const st = await db.getStandard(id);
    await db.putStandard({ ...st, capacity: { ...st.capacity, stations: st.capacity.stations.map(x => (x.kind === 'people' ? { ...x, name: 'Op 2', source: 'estimate' } : x)) } }); }, SID);
  await go(CAP);
  const want = await page.evaluate(async id => { const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts'); const B = await import('/src/lib/ie/balance.ts'); const C = await import('/src/lib/capacity.ts');
    const b = L.currentBalance(await db.listAllStudies(), id); const f = B.balance(b.facts.steps, b.agreed?.balance); const w = f.people.find(p => p.who === 'Op 2')?.work ?? 0;
    const x = C.analyse((await db.getStandard(id)).capacity).ok.find(s => s.station.name === 'Op 2'); return Math.round(w * (x?.factor ?? 1) * 100) / 100; }, SID);
  const offer = await words('.cap-sheet-use');
  ok(/^The line balance: [\d.,]+ s a basket — use it$/.test(offer), `5 the line balance offers Op 2's standard time in the station's unit: ${offer}`);
  if (offer) {
    await page.locator('.cap-sheet-use').first().click(); await page.waitForTimeout(900);
    const st = (await truth()).stations.find(s => s.name === 'Op 2');
    ok(st?.source === 'standard' && st.cycleSec === want && /standard time — the line balance/.test(await words('.cap-sheet tr:has-text("Op 2")')), `5 used: 1 every ${want} s, "standard time — the line balance"`);
  }
}
/* ---- 6 the bottleneck walked ---- */
{
  await page.getByRole('button', { name: 'Walk the line' }).click(); await page.waitForTimeout(1800);
  const id = page.url().split('sampling/')[1]?.split(/[?#]/)[0];
  ok(!!id && /bottleneck walk/i.test(await words('.ln-band .ln-eyebrow')) && /Walk 1 of 12/.test(await words('.ws-round')), '6 Walk the line opens the walk: Walk 1 of 12, now');
  const names = (await page.locator('.ws-round .ws-person .ws-who').allTextContents()).map(x => x.trim());
  for (const [i, n] of names.entries()) {
    await page.locator('.ws-round .ws-person', { hasText: n }).getByRole('button', { name: i === names.length - 1 ? 'working' : 'blocked', exact: true }).click(); await page.waitForTimeout(350);
  }
  await page.evaluate(async ([id, names]) => { const db = await import('/src/db.ts'); const t = Date.now();
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, taps: [...(cur.facts.taps ?? []), ...[1, 2, 3, 4, 5].flatMap(k => names.map((who, j) => ({ id: `a${k}${j}`, at: t - k * 1_800_000, who, activity: j === names.length - 1 ? 'working' : k % 2 ? 'blocked' : 'working' })))] } }));
  }, [id, names]); await page.waitForTimeout(1200);
  const want = await page.evaluate(async ([id, sid]) => { const db = await import('/src/db.ts'); const W = await import('/src/lib/ie/walk.ts'); const C = await import('/src/lib/capacity.ts');
    const s = await db.getStudy(id); const r = C.analyse((await db.getStandard(sid)).capacity); return W.walkVerdict(s.agreed.sampling.who, s.facts.taps, r.limit?.station.name).sentence; }, [id, SID]);
  ok((await words('.ie-says')).includes(want), `6 the walk says where the arrows meet, against the sums: ${want}`);
  await go(CAP);
  ok((await words('.bw')).includes(want), '6 and Line capacity says it back, beside the sums');
}
/* ---- 7 a shift ---- capacity a shift (docs/CAPACITY.md §2): the line's
   own shifts less the breaks it stops for, less the changeovers SMED timed
   into this product, at the bottleneck — nothing assumed, each figure as
   lib/capacity shiftCapacity says it, on the screen and on the card. */
{
  const shiftTruth = () => page.evaluate(async id => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts'); const X = await import('/src/lib/ie/changeover.ts');
    const st = await db.getStandard(id); const ws = await db.getWorkspace(st.workspaceId);
    const c = C.shiftCapacity(C.analyse(st.capacity), C.shiftsIn(ws?.shifts), X.changeoverIn(st.capacity.changeovers, await db.listAllStudies(), id));
    return c ? { sentence: c.sentence, short: c.short ?? null, rows: c.rows, day: c.day ?? null } : null;
  }, SID);
  const setShifts = shifts => page.evaluate(async ([wsId, shifts]) => { const db = await import('/src/db.ts'); const ws = await db.getWorkspace(wsId); await db.updateWorkspace({ ...ws, shifts }); }, [sd.wsId, shifts]);
  const big = n => Math.round(n).toLocaleString('en-GB');
  const seen = async () => (await page.locator('.shc-t tbody tr').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());

  await setShifts([]); await go(CAP);
  let t = await shiftTruth();
  ok(!!t && (await words('.shc-says')) === t.sentence && /^The line’s shifts are not set/.test(t.sentence) && (await page.locator('.shc-t').count()) === 0, `7 no shifts on the line: said so, nothing worked out — ${t?.sentence}`);

  await setShifts([{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }, { name: 'Nights', start: '22:00', end: '06:00' }]);
  await go(CAP); t = await shiftTruth();
  let rows = await seen();
  ok(rows.length === 3 && t.rows[0].made != null && rows[0].includes(big(t.rows[0].made)) && /30 min/.test(rows[0]) && /none timed/.test(rows[0]) && /not set/.test(rows[2]) && t.rows[2].made == null
    && (await words('.shc-says')) === t.sentence && /Nights: the breaks are not said/.test(t.sentence) && (await page.locator('.shc-day').count()) === 0,
  `7 the line's shifts, each less its breaks at the bottleneck; Nights' breaks not said and left out — ${t.sentence}`);

  await setShifts([{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }, { name: 'Nights', start: '22:00', end: '06:00', relief: true }]);
  await go(CAP); t = await shiftTruth(); rows = await seen();
  ok(/relief — 0/.test(rows[2]) && rows[2].includes(big(t.rows[2].made ?? -1)) && !!t.day && (await words('.shc-day')).includes(big(t.day.made)) && (await words('.shc-says')) === t.sentence && /No changeover is timed into this product yet/.test(t.sentence),
  `7 Nights under relief runs through its breaks; the day summed, ${big(t.day?.made ?? 0)}; no changeover timed, none comes off`);

  /* the SMED into this product, as timed — two a shift, how the line runs */
  const smedId = await page.evaluate(async ([sid, wsId]) => { const db = await import('/src/db.ts'); const t = Date.now(); const id = crypto.randomUUID();
    const el = (n, name, min, side, crew) => ({ id: crypto.randomUUID(), order: n, name, sec: min * 60, side, source: 'timed', at: t - (6 - n) * 300_000, who: 'K. Ahmed', crew, where: 'Bagger' });
    await db.putStudy({ id, tool: 'changeover', name: 'Finest Red 2kg → Maris Piper 2kg', product: 'Maris Piper 2kg', standardId: sid, workspaceId: wsId,
      facts: { fromProduct: 'Finest Red 2kg', toProduct: 'Maris Piper 2kg', sequence: [el(0, 'Stop and clear the former', 4, 'internal', ['Op 1']), el(1, 'Change the former tube', 10, 'internal', ['Op 1']), el(2, 'Change the film reel', 6, 'internal', ['Op 1']), el(3, 'First bags and check the seal', 4, 'internal', ['Op 1'])],
        running: { shiftsPerDay: 3, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 }, changeovers: { count: 2, per: 'shift' } },
      uses: [], startedAt: t - 1_800_000, createdAt: t, updatedAt: t });
    return id; }, [SID, sd.wsId]);
  await go(CAP); t = await shiftTruth(); rows = await seen();
  const co = t.rows[0].changeoverMin;
  ok(co > 0 && rows[0].includes(big(t.rows[0].made)) && rows[0].includes(`${big(t.rows[0].without)} with none`) && (await words('.shc-says')) === t.sentence
    && /2 changeovers a shift of [\d.]+ min \(as timed on the SMED, not yet the standard\) take/.test(t.sentence),
  `7 the SMED as timed: ${co} min of changeovers off each shift, what it makes with none beside it — ${t.sentence}`);

  /* set as the standard: its agreed minutes, counted by the SMED it came from */
  await page.evaluate(async ([sid, smedId]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(sid);
    await db.putStandard({ ...st, capacity: { ...st.capacity, changeovers: [{ id: crypto.randomUUID(), from: 'Finest Red 2kg', steps: [], minutes: 18, agreedAt: Date.now(), fromStudyId: smedId }] } }); }, [SID, smedId]);
  await go(CAP); t = await shiftTruth(); rows = await seen();
  ok(t.rows[0].changeoverMin === 36 && rows[0].includes('36 min') && (await words('.shc-says')) === t.sentence && /2 changeovers a shift of 18 min \(the standard from Finest Red 2kg\)/.test(t.sentence),
  `7 set as the standard: 2 × 18 min off each shift — ${t.sentence}`);

  /* the card at the line carries it — read off the card as it is drawn */
  await go(`#/w/${sd.wsId}/standards/${SID}`);
  await page.evaluate(() => { window.__drawn = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { window.__drawn.push(String(s)); return f.call(this, s, ...a); }; });
  await page.getByRole('button', { name: 'PDF', exact: true }).first().click();
  await page.locator('.ls-print-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const drawn = (await page.evaluate(() => window.__drawn.join(' '))).replace(/\s+/g, ' ');
  ok(!!t.short && drawn.includes('L I N E C A P A C I T Y') && drawn.includes(t.short), `7 the card at the line: "${t.short}"`);
  await page.keyboard.press('Escape');

  /* and The SMED into this product › opens it */
  await go(CAP);
  await page.locator('.shc-go').click(); await page.waitForTimeout(1500);
  ok(page.url().includes(smedId), '7 The SMED into this product › opens the SMED');
}

/* ---- 8 a person, as the floor says them ---- */
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
let TRAY;
{
  await go(`#/balances?line=${sd.wsId}`);
  await page.getByRole('button', { name: 'New line capacity' }).first().click(); await page.waitForTimeout(500);
  await page.locator('.lt-new input[list="lt-products"]').fill('Tray case');
  await page.getByRole('button', { name: 'Make it and balance the line' }).click(); await page.waitForTimeout(2500);
  TRAY = page.url().split('/standards/')[1]?.split('?')[0];
  const main = page.locator('.nv-main');
  await main.getByRole('button', { name: 'Add a machine' }).click(); await page.waitForTimeout(500);
  let card = main.locator('.cap-st').nth(0);
  await card.getByLabel('Station 1 name').fill('Bagger'); await card.getByLabel('Station 1 name').press('Enter');
  await card.getByLabel('Speed', { exact: true }).fill('70'); await card.getByLabel('Speed', { exact: true }).press('Enter'); await page.waitForTimeout(500);
  await card.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300);
  await main.getByRole('button', { name: 'Add a person or crew' }).click(); await page.waitForTimeout(500);
  card = main.locator('.cap-st').nth(1);
  await card.getByLabel('Station 2 name').fill('Tray packer'); await card.getByLabel('Station 2 name').press('Enter');
  await card.getByLabel('What it counts in', { exact: true }).fill('trays'); await card.getByLabel('What it counts in', { exact: true }).press('Enter'); await page.waitForTimeout(400);
  ok(/how many units make one tray/.test(flat(await card.locator('.cap-why').innerText())), '8 a person after the bagger is asked how many units make one tray — never taken as one');
  await card.getByLabel('How many of the one before make one of these').fill('8'); await card.getByLabel('How many of the one before make one of these').press('Enter'); await page.waitForTimeout(600);
  const said = () => page.evaluate(async id => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
    const st = await db.getStandard(id); const r = C.analyse(st.capacity); const p = st.capacity.stations[1];
    return { ...C.paceSays(r, p), line: r.line, crew: p.crew, perCycle: p.perCycle, cycleSec: p.cycleSec, contains: p.contains };
  }, TRAY);
  let t = await said();
  ok(t.arrive === 'A tray reaches them every 6.9 s — 8.8 a minute: Bagger does 70 units a minute, 8 to a tray.' && flat(await card.locator('.cap-st-in').innerText()) === t.arrive,
    `8b what reaches them, worked out before they have a speed: ${flat(await card.locator('.cap-st-in').innerText())}`);
  await card.getByLabel('Seconds each time').fill('8'); await card.getByLabel('Seconds each time').press('Enter'); await page.waitForTimeout(800);
  t = await said();
  /* planned with the ILO's 9% rest (docs/CAPACITY.md §1): 7.5 ÷ 1.09 trays × 8 */
  ok(t.perCycle === 1 && t.cycleSec === 8 && Math.abs(t.line - 60 / 1.09) < 1e-9, `8c "a tray every 8 seconds" is one tray every 8 s — 55 units a minute at the line, the 9% rest in it (${t.line})`);
  ok(flat(await card.locator('.cap-is').innerText()) === '= 7.5 trays a minute each · 60 units a minute', `8d said back at once: ${flat(await card.locator('.cap-is').innerText())}`);
  ok(t.verdict === 'They take 8 s a tray — 8.7 s with 9% rest — 1.9 s too slow: they hold the line back. It needs 2 people to keep up.' && flat(await card.locator('.cap-st-says').innerText()) === t.verdict && /is-short/.test(await card.locator('.cap-feed').getAttribute('class')),
    '8e whether they keep up, in seconds a tray, red when short — and how many people would');
  await card.getByRole('button', { name: 'Make it 2 people' }).click(); await page.waitForTimeout(800);
  t = await said();
  ok(t.crew === 2 && t.verdict === 'They take 8 s a tray each, 2 of them — 8.7 s with 9% rest — they keep up, 2.5 s to spare a tray.' && flat(await card.locator('.cap-st-says').innerText()) === t.verdict, '8f Make it 2 people: two of them keep up, with the seconds to spare');
  const rest = flat(await card.getByLabel('Rest allowance, percent').locator('xpath=..').innerText());
  ok(await card.getByLabel('Rest allowance, percent').inputValue() === '9' && rest.includes('Plan on a tray every 8.7 s') && rest.includes('5% personal needs, 4% basic fatigue'),
    `8g a person's rest allowance, the ILO's 9% unless changed — the time to plan on said: ${rest.slice(0, 90)}…`);
  await card.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300);

  /* A PALLETISER TIMED PER TRAY (Rowland, 14 October: "each pallet holds 36
     baskets, 10 in the basket. That's 360 ... it's making me put a rate in
     myself, but all I did is do the division of 70 a minute") — the chain
     read into its unit, timed per the unit before, fed straight by a person */
  await main.getByRole('button', { name: 'Add a person or crew' }).click(); await page.waitForTimeout(500);
  card = main.locator('.cap-st').nth(2);
  await card.getByLabel('Station 3 name').fill('Palletiser'); await card.getByLabel('Station 3 name').press('Enter');
  await card.getByLabel('What it counts in', { exact: true }).fill('pallets'); await card.getByLabel('What it counts in', { exact: true }).press('Enter'); await page.waitForTimeout(400);
  await card.getByLabel('How many of the one before make one of these').fill('36'); await card.getByLabel('How many of the one before make one of these').press('Enter'); await page.waitForTimeout(600);
  ok(flat(await card.locator('.cap-chain').innerText()) === '1 pallet = 36 trays = 288 units', `8h the step before read into it: ${flat(await card.locator('.cap-chain').innerText())}`);
  await card.getByRole('group', { name: 'Timed per' }).getByRole('button', { name: 'tray' }).click(); await page.waitForTimeout(400);
  await card.getByLabel('Seconds each time').fill('6'); await card.getByLabel('Seconds each time').press('Enter'); await page.waitForTimeout(800);
  const pal = () => page.evaluate(async id => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
    const st = await db.getStandard(id); const r = C.analyse(st.capacity); const [, k, p] = st.capacity.stations;
    return { ...C.paceSays(r, p, k.unit, k), speedIn: p.speedIn, cycleSec: p.cycleSec, perMin: C.perMinute(p), limit: r.limit?.station.name };
  }, TRAY);
  let q = await pal();
  ok(q.speedIn === 'before' && q.cycleSec === 6 && Math.abs(q.perMin - 10 / 36) < 1e-9 && flat(await card.locator('.cap-is').innerText()) === '= 10 trays a minute each · a pallet every 3 min 36 s (36 trays) · 80 units a minute',
    `8i "a tray every 6 seconds" kept as typed, a pallet worked out — never divided by hand: ${flat(await card.locator('.cap-is').innerText())}`);
  ok(q.arrive === 'A tray reaches them every 6.9 s — 8.8 a minute; a full pallet of 36 every 4 min 7 s: Bagger does 70 units a minute.' && flat(await card.locator('.cap-st-in').innerText()) === q.arrive
    && q.verdict === 'They take 6 s a tray — 6.5 s with 9% rest — they keep up, 0.3 s to spare a tray.' && flat(await card.locator('.cap-st-says').innerText()) === q.verdict && q.limit === 'Bagger',
    `8j what reaches them a tray and a pallet, whether they keep up a tray: ${q.verdict}`);
  ok(q.paced === 'Fed straight by Tray packer with nothing collecting between — loaded to 95% of their pace. A person can’t match another person piece for piece: plan them at 80–90%, or let some collect before them.'
    && flat(await card.locator('.cap-st-paced').innerText()) === q.paced && /is-paced/.test(await card.locator('.cap-feed').getAttribute('class')),
    '8k fed straight by a person, nothing collecting between, loaded past 90%: said, in amber');
  await card.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300);
  card = main.locator('.cap-st').nth(1);
  await card.getByRole('button', { name: 'Edit' }).click(); await page.waitForTimeout(400);
  await card.getByLabel('How many can collect between it and the next station').fill('12'); await card.getByLabel('How many can collect between it and the next station').press('Enter'); await page.waitForTimeout(800);
  q = await pal();
  ok(q.paced === undefined && await main.locator('.cap-st').nth(2).locator('.cap-st-paced').count() === 0, '8l twelve trays can collect before them: not said');

  /* A RATE THAT READS LIKE A TIME (Rowland, 14 October: "it says 5 pallets a
     minute ... it isn't ... it takes 5 minutes to do one pallet") */
  await card.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300);
  card = main.locator('.cap-st').nth(2);
  await card.getByRole('button', { name: 'Edit' }).click(); await page.waitForTimeout(400);
  await card.getByRole('group', { name: 'Timed per' }).getByRole('button', { name: 'pallet' }).click(); await page.waitForTimeout(400);
  await card.getByRole('button', { name: 'How many in a time' }).click(); await page.waitForTimeout(300);
  await card.getByLabel('Speed', { exact: true }).fill('4'); await card.getByLabel('Speed', { exact: true }).press('Enter'); await page.waitForTimeout(800);
  const asked = () => page.evaluate(async id => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
    const st = await db.getStandard(id); const r = C.analyse(st.capacity); const [, k, p] = st.capacity.stations;
    return { q: C.rateAsTime(r, p, k.unit) ?? null, say: C.paceSays(r, p, k.unit, k), p };
  }, TRAY);
  let a = await asked();
  ok(a.q?.says === '4 pallets a minute is 1,152 units a minute — 16 times what reaches them.' && a.q?.ask === 'One pallet every 4 minutes?'
    && flat(await card.locator('.cap-astime').innerText()) === `${a.q.says} ${a.q.ask} Make it a pallet every 4 min`,
    `8m "4" typed as a rate, many times what reaches them and like one every 4 minutes: asked — ${flat(await card.locator('.cap-astime').innerText())}`);
  await card.getByRole('button', { name: 'Make it a pallet every 4 min' }).click(); await page.waitForTimeout(800);
  a = await asked();
  ok(a.q === null && a.p.cycleSec === 240 && a.p.cycleIn === 'min' && a.p.rate == null && await card.getByLabel('Minutes each time').inputValue() === '4'
    && await card.getByLabel('Seconds or minutes').inputValue() === 'min' && flat(await card.locator('.cap-st-says').innerText()) === a.say.verdict,
    `8n made so: one every 4 minutes, kept as 240 s, shown in minutes — ${a.say.verdict}`);
  ok(flat(await card.locator('.cap-is').innerText()).startsWith('= 15 pallets an hour each · 72 units a minute'), `8o said back an hour, not 0.25 a minute: ${flat(await card.locator('.cap-is').innerText())}`);
  await card.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300);
  ok(flat(await card.locator('.cap-sum').innerText()).startsWith('a pallet every 4 min ·'), `8p shut, the card says it as typed: ${flat(await card.locator('.cap-sum').innerText())}`);
}

/* ---- 9 each tool lists its own ---- */
{
  const products = async tool => { await go(`#/${tool}?line=${sd.wsId}`); return page.locator('.lt-row .lt-what').allInnerTexts(); };
  const stds = await page.evaluate(async ws => (await (await import('/src/db.ts')).listStandardsForLine(ws)).map(s => ({ p: s.product, map: (s.marks?.length ?? 0) > 0 || !!s.photoKey || !!s.board, cap: !!s.capacity })), sd.wsId);
  const cap = await products('balances'), map = await products('standards');
  ok(cap.includes('Tray case') && cap.includes('Maris Piper 2kg') && !map.includes('Tray case') && map.includes('Maris Piper 2kg'),
    `9 Line capacity: ${cap.join(', ')} · Line standard: ${map.join(', ')} — each its own (${JSON.stringify(stds)})`);
  await go(`#/standards?line=${sd.wsId}`);
  await page.getByRole('button', { name: 'New line standard' }).first().click(); await page.waitForTimeout(400);
  await page.locator('.lt-new input[list="lt-products"]').fill('tray case');
  ok(/already on this line/.test(flat(await page.locator('.lt-new').innerText())), '9b New on a product already on the line says it is that record');
  await page.getByRole('button', { name: 'Make it and draw the map' }).click(); await page.waitForTimeout(1800);
  const n = await page.evaluate(async ws => (await (await import('/src/db.ts')).listStandardsForLine(ws)).filter(s => s.product.toLowerCase() === 'tray case').length, sd.wsId);
  ok(n === 1 && page.url().includes(TRAY), `9c and opens it — never a second record of the product (${n})`);
  await go(`#/lines/${sd.wsId}`);
  const tools = await page.locator('.pl-tool').evaluateAll(els => Object.fromEntries(els.map(e => [e.querySelector('b')?.textContent, e.querySelector('.sub')?.textContent])));
  ok(/^3 on this line/.test(tools['Line capacity'] ?? '') && /^1 on this line/.test(tools['Line standard'] ?? ''), `9d the line's page counts each tool's own: Line standard ${tools['Line standard']} · Line capacity ${tools['Line capacity']}`);
}

/* ---- 10 Line capacity's own page ---- */
{
  await go(`#/w/${sd.wsId}/standards/${TRAY}?at=balance`);
  const crumb = flat(await page.locator('.ls-head .sub').first().innerText());
  ok(crumb.startsWith('Line capacity') && await page.getByRole('button', { name: /Its line standard|The map for this product/ }).count() === 0, `10 back to Line capacity (${crumb}); no line standard when it has none`);
  const lit = await page.locator('.nv-ri.is-on').allInnerTexts();
  const gates = await page.locator('.nv').getByText('GATES', { exact: true }).count();
  /* on no job a product's Line capacity is the line's: the line's rail lights Products (docs/STRUCTURE.md B2 — a line's standards are its products) */
  ok(lit.map(flat).join('|') === 'Products' && gates === 0, `10b on no job: the line's rail lights Products (${lit.map(flat).join('|')}) and wears no job's gates (${gates})`);
  await go(CAP);
  ok(await page.getByRole('button', { name: 'Its line standard ›' }).count() === 1, '10c a product mapped too: its line standard one tap away');
}

/* ---- 11 the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await go(CAP);
  const t = await truth();
  const rows = await page.locator('.vc-row').evaluateAll(els => els.map(e => e.querySelector('.vc-row-name b')?.textContent + '|' + e.querySelector('.vc-row-val')?.textContent));
  const shown = await page.locator('.vc-rows').isVisible() && !(await page.locator('.vc-box').isVisible());
  ok(shown && rows.length === t.n && rows.some(x => x === `${t.limit}|the bottleneck`), `11 the V on its side, a bar a station: ${rows.join(' · ')}`);
  const sheet = await page.locator('.cap-sheet-cards thead').isVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(!sheet && wide <= 1, `11b the sheet a card a station, nothing off the side (${wide}px)`);
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- 12 what a pack costs in labour ---- */
{
  await go(CAP);
  const box = page.locator('.cap-cost');
  ok(/placed on the line standard/.test(await box.innerText()) && /not said yet/.test(await box.innerText()), '12 the people stand in from the line standard; the rate not said yet');
  /* WHAT THE BOTTLENECK COSTS A PACK, under the sums (17 October: "this is the cost per pack because of X") — first what it needs */
  ok(/^What .+ costs a .+: say how many people are on the line and what one costs an hour/.test(((await words('.cap-money')) ?? '')), `12 the bottleneck's cost says what it needs: "${await words('.cap-money')}"`);
  await box.getByLabel('People on the line').fill('8'); await box.getByLabel('People on the line').press('Enter');
  await box.getByLabel('Pounds an hour each').fill('12.50'); await box.getByLabel('Pounds an hour each').press('Enter'); await page.waitForTimeout(900);
  const m = await page.evaluate(async id => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
    const st = await db.getStandard(id); const r = C.analyse(st.capacity);
    const c = C.labourCost(r, st.capacity.labour?.people, st.capacity.labour?.ratePerHour);
    const more = C.oneMorePerson(st.capacity, r, st.capacity.labour?.people, st.capacity.labour?.ratePerHour);
    return { labour: st.capacity.labour, perPack: c ? C.fmtMoney(c.perPack) : null, more: more?.sentence ?? null, station: more?.station.name, crew: more?.station.crew ?? 1, unit: C.oneOf(r.unit) };
  }, SID);
  const said = (await box.locator('.cap-cost-says').innerText()).replace(/\s+/g, ' ');
  ok(m.labour?.people === 8 && m.labour?.ratePerHour === 12.5 && said.startsWith(`${m.perPack} a ${m.unit}`), `12b typed and kept: ${said}`);
  {
    const want = await page.evaluate(async id => {
      const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
      const st = await db.getStandard(id); const r = C.analyse(st.capacity); const ws = st.workspaceId ? await db.getWorkspace(st.workspaceId) : undefined;
      const li = C.labourInputs(st.capacity, undefined, ws);
      const k = C.bottleneckCost(r, st.capacity.labour?.people ?? li.people, st.capacity.labour?.ratePerHour ?? li.rate, ws?.marginPerPack);
      return k ? C.bottleneckCostSays(k, r) : null;
    }, SID);
    const money = (await words('.cap-money')) ?? '';
    ok(!!want && money === want.text && /because of/.test(money) && (await page.locator('.cap-money.is-r').count()) === (want.short ? 1 : 0),
      `12b what the bottleneck costs a pack, as lib/capacity says: "${money}"`);
  }
  /* 12g THE LEAN PAGE (docs/LEAN-PAGE.md) — the band's verdict, the tiles and
     the closing line as lib/capacityLean reads them, and the same on paper */
  {
    const want = await page.evaluate(async id => {
      const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts'); const S = await import('/src/lib/standard.ts');
      const P = await import('/src/lib/capacityPaper.ts'); const L = await import('/src/lib/capacityLean.ts'); const T = await import('/src/lib/together.ts');
      const st = await db.getStandard(id); const ws = st.workspaceId ? await db.getWorkspace(st.workspaceId) : undefined;
      const lean = L.capacityLean(P.capacityPaper({ product: st.product, line: ws?.name ?? '', printed: '', capacity: st.capacity,
        labour: C.labourInputs(st.capacity, S.headcount(st) || undefined, ws), ...(ws?.marginPerPack != null ? { margin: ws.marginPerPack } : {}) }));
      return { tiles: lean.tiles, closing: lean.closing, verdict: T.capacitySays(st.capacity).text };
    }, SID);
    const vs = await page.locator('.cap-tiles .ln-tile .ln-v').allInnerTexts(), ofs = await page.locator('.cap-tiles .ln-tile .ln-of').allInnerTexts();
    ok(vs.join('|') === want.tiles.map(x => x.v).join('|') && ofs.join('|') === want.tiles.map(x => x.of).join('|') && want.tiles.some(x => x.k.startsWith('Labour a') && x.v !== '—'),
      `12g the tiles, as lib/capacityLean reads them: ${want.tiles.map(x => `${x.k} ${x.v}`).join(' · ')}`);
    ok((await words('.ls-head.is-band .ln-verdict')) === want.verdict && (await words('.ln-close > span:last-child')) === want.closing.text,
      `12g the band's verdict "${want.verdict}" and the closing line "${want.closing.text.slice(0, 70)}…"`);
    const { execFileSync } = await import('node:child_process');
    const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).click()]);
    const file = join(mkdtempSync(join(tmpdir(), 'cap-lean-')), 'lean.pdf'); await dl.saveAs(file);
    const txt = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'");
    const norm = x => x.replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'");
    const missing = [...want.tiles.map(x => x.v), 'What it means', 'Action plan', norm(want.closing.text).slice(0, 50)].filter(x => !txt.includes(norm(x)));
    ok(!missing.length, `12g on paper, the lean page: the band, the tiles, where it is limited, what it means, the action plan, the closing line${missing.length ? ` — missing: ${missing.join(' | ')}` : ''}`);
  }
  if (m.more) {
    ok((await box.locator('.cap-cost-more').first().innerText()).replace(/\s+/g, ' ').startsWith(m.more), `12c one more person at the bottleneck, as the module says: ${m.more}`);
    await box.getByRole('button', { name: new RegExp(`^Make it ${m.crew + 1} at`) }).click(); await page.waitForTimeout(900);
    const after = await page.evaluate(async ([id, nm]) => {
      const C = await import('/src/lib/capacity.ts');
      const st = await (await import('/src/db.ts')).getStandard(id); const r = C.analyse(st.capacity);
      const c = C.labourCost(r, st.capacity.labour?.people, st.capacity.labour?.ratePerHour);
      return { crew: st.capacity.stations.find(x => x.name === nm)?.crew, people: st.capacity.labour?.people, perPack: c ? C.fmtMoney(c.perPack) : null };
    }, [SID, m.station]);
    const said2 = (await box.locator('.cap-cost-says').innerText()).replace(/\s+/g, ' ');
    ok(after.crew === m.crew + 1 && after.people === 9 && m.more.includes(`${after.perPack} a ${m.unit} instead of`) && said2.startsWith(`${after.perPack} a ${m.unit} — 9 people`),
      `12d made so: ${m.station} now ${after.crew} people, the line 9 — ${said2}`);
  } else ok(true, '12c (the bottleneck is a machine: one more person is said to add cost and no packs)');
  await page.getByRole('button', { name: /What if/ }).first().click(); await page.waitForTimeout(1200);
  ok(/^Labour: the same people, /.test((await page.locator('.cap-cost-more').last().innerText()).trim()), `12e a what-if says its labour: ${(await page.locator('.cap-cost-more').last().innerText()).trim()}`);
  const card = await page.evaluate(async id => (await (await import('/src/ui/ShiftCapacity.tsx')).shiftShortsFor([await (await import('/src/db.ts')).getStandard(id)]))[id], SID);
  ok(new RegExp(` a bag in labour — ${m.more ? 9 : 8} people at £12\\.50 an hour$`).test(card ?? ''), `12f the card's line carries it: ${card}`);
}

/* ---- 13 renamed and deleted where it sits ---- Rowland, 13 October: "cant
   delete a line capacity anywhere ... always implement deletes and editing in
   everything". Deleting a product's Line capacity keeps its map, and the other
   way round; the record goes only when nothing is left; Undo brings it back. */
{
  const rec = id => page.evaluate(async id => { const s = await (await import('/src/db.ts')).getStandard(id); return s ? { product: s.product, marks: s.marks?.length ?? 0, cap: !!s.capacity, stations: s.capacity?.stations.length ?? 0 } : null; }, id);
  const LIST = `#/balances?line=${sd.wsId}`;
  await go(LIST);
  const trayName = (await rec(TRAY)).product;
  await page.getByRole('button', { name: `Rename ${trayName}` }).click(); await page.waitForTimeout(300);
  const box = page.getByLabel(`The product's name — ${trayName}`);
  await box.fill('maris piper 2kg'); await page.waitForTimeout(200);
  const clash = flat(await page.locator('.lt-li.is-naming').innerText());
  ok(/already on this line/.test(clash) && await page.locator('.lt-li.is-naming').getByRole('button', { name: 'Save' }).isDisabled(), `13 renamed in its row — a name already on the line refused: ${clash}`);
  await box.fill('Tray case 6'); await box.press('Enter'); await page.waitForTimeout(900);
  ok((await rec(TRAY)).product === 'Tray case 6' && (await page.locator('.lt-row .lt-what').allInnerTexts()).includes('Tray case 6'), '13b kept, and the row says the new name');

  const before = await rec(SID);
  page.once('dialog', d => void d.accept());
  await page.getByRole('button', { name: `Delete the Line capacity for ${before.product}` }).click(); await page.waitForTimeout(900);
  const after = await rec(SID);
  const capRows = await page.locator('.lt-row .lt-what').allInnerTexts();
  ok(after && after.stations === 0 && after.marks === before.marks && !capRows.includes(before.product), `13c ${before.product}'s Line capacity deleted from its row — its map kept (${after?.marks} marks), gone from Line capacity (${capRows.join(', ')})`);
  const toast = flat(await page.locator('.toast').innerText().catch(() => ''));
  await page.locator('.toast-undo').click(); await page.waitForTimeout(900);
  const back = await rec(SID);
  ok(/its line standard map kept/.test(toast) && back.cap && back.stations === before.stations, `13d said and undone: "${toast.replace(/ ?Undo$/, '')}" — its ${back.stations} stations back`);
  await go(`#/standards?line=${sd.wsId}`);
  ok((await page.locator('.lt-row .lt-what').allInnerTexts()).includes(before.product), '13e and its line standard never left Line standard');

  await go(`#/w/${sd.wsId}/standards/${TRAY}?at=balance`);
  const nameBox = page.locator('.ls-head input[aria-label="Product"]');
  await nameBox.fill('Tray case 12'); await nameBox.blur(); await page.waitForTimeout(800);
  ok((await rec(TRAY)).product === 'Tray case 12', '13f its name changed on its own page');
  page.once('dialog', d => void d.accept());
  await page.getByRole('button', { name: 'Delete this capacity' }).click(); await page.waitForTimeout(1200);
  ok((await rec(TRAY)) === null && page.url().includes('/balances?line='), '13g deleted from its own page — with no map on it, the record goes; back to Line capacity on its line');
}

/* ---- 14 screened for problems ---- Rowland, 15 October, on his own line: a
   target of 150 a minute, and 319% · 279% · 273% on the V — "these
   percentages make no sense ... screen it for problems". His "10 in a tray"
   as entered: the wrapper makes 50.1, a third of the target; the V's
   percentages are against it; its 91% running is its 9% rest again. */
{
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const HIS = { labour: { people: 8, ratePerHour: 21.8 }, targetPerMin: 150, plannedHoursPerWeek: 77, stations: [
    { id: 'a', crew: 1, kind: 'machine', name: 'bagger', rate: 160, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
    { id: 'b', crew: 1, kind: 'machine', name: 'P160 Pick & Place', rate: 140, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
    { id: 'c', crew: 2, kind: 'people', name: 'palletiser', unit: 'baskets', source: 'standard', goodPct: 100, ratePer: 'min', contains: 10, cycleSec: 16, perCycle: 2, runningPct: 91, allowancePct: 10 },
    { id: 'd', crew: 1, kind: 'people', name: 'Pallet wrapper', unit: 'pallets', source: 'estimate', cycleIn: 'min', goodPct: 100, ratePer: 'min', contains: 36, cycleSec: 720, perCycle: 2, runningPct: 91 }] };
  const before = await page.evaluate(async id => (await import('/src/db.ts')).getStandard(id), SID);
  await page.evaluate(async ([id, cap]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: cap }); }, [SID, HIS]);
  await go(CAP);
  const mod = await page.evaluate(async cap => { const C = await import('/src/lib/capacity.ts'); return C.screenCapacity(cap, C.analyse(cap)); }, HIS);
  const items = (await page.locator('.cap-screen-t').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  ok(mod.length === 3 && items.length === 3 && items.every((t, i) => t === mod[i].text) && /33% of the 150 target/.test(items[0]) && /bagger 319% · P160 Pick & Place 279% · palletiser 273%/.test(items[1]),
    `14 his line screened: the bottleneck a third of the target, the 319% · 279% · 273% said against it, the rest counted twice — as the module says them (${items.length})`);
  ok(await page.locator('.cap-screen li.is-r').count() === 1 && await page.locator('.cap-screen li.is-a').count() === 2, '14b the one that matters red, the two to look at amber');
  await page.locator('.cap-screen').getByRole('button', { name: /^Open Pallet wrapper/ }).first().click(); await page.waitForTimeout(600);
  const opened = await page.evaluate(() => [...document.querySelectorAll('[id^="cap-st-"]')].filter(li => li.querySelector('button[aria-expanded="true"]')).map(li => li.id));
  ok(opened.length === 1 && opened[0] === 'cap-st-d', `14c a check opens the station it is about — the Pallet wrapper's, open to edit (${opened.join(', ') || 'none open'})`);
  /* on paper, in the list "to check before the sums are trusted" */
  await go(CAP);
  const dir = mkdtempSync(join(tmpdir(), 'cap-chk-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).click()]);
  const file = join(dir, 'cap.pdf'); await dl.saveAs(file);
  const txt = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'");
  const lost = mod.map(m => m.text.replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'")).filter(t => !txt.includes(t));
  ok(/TO CHECK BEFORE THE SUMS ARE TRUSTED/i.test(txt) && !lost.length, `14d and on paper — each under "To check before the sums are trusted"${lost.length ? ` — lost: ${lost[0].slice(0, 70)}` : ''}`);
  /* a line that meets its target says nothing */
  await page.evaluate(async ([id, cap]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: { ...cap, targetPerMin: 45, stations: cap.stations.map(x => (x.id === 'd' ? { ...x, runningPct: 100 } : x.id === 'a' ? { ...x, rate: 60 } : x.id === 'b' ? { ...x, rate: 58 } : x)) } }); }, [SID, HIS]);
  await go(CAP);
  ok(await page.locator('.cap-screen li.is-r').count() === 0, '14e a line that meets its target is not told it is short');
  await page.evaluate(async b => { const db = await import('/src/db.ts'); await db.putStandard(b); }, before);
}

/* ---- 15 several lines feeding one place ---- Rowland, 15 October: "two
   lines here that then merge ... line A, line B, running ... one person who
   has to wrap for both"; "the 150 was for both lines merged"; "3, 4, 5
   production lines all running, then merging into one pack hole ... that
   happens all the time in manufacturing". His "10 in a tray" as one chain, one
   palletiser a line: split where the lines merge, a line added like the last,
   named, a station moved inside its own line, a what-if, the checks, the paper. */
{
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const CHAIN = { labour: { people: 8, ratePerHour: 21.8 }, targetPerMin: 150, plannedHoursPerWeek: 77, stations: [
    { id: 'a', crew: 1, kind: 'machine', name: 'bagger', rate: 160, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
    { id: 'b', crew: 1, kind: 'machine', name: 'P160 Pick & Place', rate: 140, unit: 'units', source: 'plate', goodPct: 100, ratePer: 'min', contains: 1, runningPct: 100 },
    { id: 'c', crew: 1, kind: 'people', name: 'palletiser', unit: 'baskets', source: 'standard', goodPct: 100, ratePer: 'min', contains: 10, cycleSec: 16, perCycle: 2, runningPct: 91, allowancePct: 10 },
    { id: 'd', crew: 1, kind: 'people', name: 'Pallet wrapper', unit: 'pallets', source: 'estimate', cycleIn: 'min', goodPct: 100, ratePer: 'min', contains: 36, cycleSec: 720, perCycle: 2, runningPct: 91 }] };
  const before = await page.evaluate(async id => (await import('/src/db.ts')).getStandard(id), SID);
  await page.evaluate(async ([id, cap]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: cap }); }, [SID, CHAIN]);
  await go(CAP);
  const cap = () => page.evaluate(async id => (await (await import('/src/db.ts')).getStandard(id)).capacity, SID);
  const says = () => words('.cap-says');
  /* THE SHAPE ASKED FIRST (16 October: "it doesn't appear first"): step 1 of
     the page, before the stations — one place for it; no station carries a
     second "Lines merge after this" */
  const first = await page.evaluate(() => { const st = [...document.querySelectorAll('.capx-in .capx-step')]; return st[0]?.getAttribute('aria-label'); });
  ok(await page.locator('.cap-grp.has-lanes').count() === 0 && first === 'The shape of the line' && await page.locator('.cap-split').count() === 0,
    '15 a single chain: How many lines feed in? is step 1, above the stations, and no station carries a second door to it');

  /* two lines: Line A is what is up to the last station, Line B a copy, the wrapper shared */
  await page.getByRole('group', { name: 'Lines feeding in' }).getByRole('button', { name: '2', exact: true }).click(); await page.waitForTimeout(1200);
  let c = await cap();
  const lanesOf = x => (x.lanes ?? []).map(l => [l.name, x.stations.filter(st => st.lane === l.id).map(st => st.name)]);
  ok(c.lanes?.length === 2 && JSON.stringify(lanesOf(c)) === JSON.stringify([['Line A', ['bagger', 'P160 Pick & Place', 'palletiser']], ['Line B', ['bagger', 'P160 Pick & Place', 'palletiser']]])
    && c.stations.filter(st => !st.lane).map(st => st.name).join() === 'Pallet wrapper' && new Set(c.stations.map(st => st.id)).size === 7,
    '15b split where they merge: Line A the stations up to there, Line B a copy of them with its own, the wrapper shared');
  /* lines alike are drawn once and edited once, in step (15 October: "an
     absolute mess" — the same V, sheet and stations over and over) */
  ok(await page.locator('.cap-grp.has-lanes').count() === 2 && await page.locator('.cap-sec').count() === 2 && /the same stations/.test(await page.locator('.cap-grp.has-lanes').first().innerText()),
    '15c lines alike: one group and one V for them, then where they merge');
  await page.getByRole('button', { name: 'Make the lines different' }).click(); await page.waitForTimeout(600);
  ok(await page.locator('.cap-grp.has-lanes').count() === 3, '15c2 made different: a group a line, then where they merge');
  const t1 = await page.evaluate(async cap => { const C = await import('/src/lib/capacity.ts'); const r = C.analyse(cap); return { says: r.sentence, line: r.line, sends: r.lanes.sends }; }, c);
  ok(await says() === t1.says && Math.abs(t1.line - 50.09) < 0.1 && Math.abs(t1.sends - 136.5) < 0.01,
    `15d the sentence is the module's: ${t1.says}`);

  /* a third line, like the last; named; the wrapper takes what all three send */
  await page.getByRole('button', { name: /^Add another line, like Line B/ }).click(); await page.waitForTimeout(1000);
  c = await cap();
  ok(c.lanes?.length === 3 && c.stations.filter(st => st.lane === c.lanes[2].id).length === 3 && c.lanes[2].name === 'Line C', '15e another line, like the last: Line C, its three stations copied');
  const nm = page.getByLabel('Name of Line C'); await nm.fill('Packing 3'); await nm.press('Tab'); await page.waitForTimeout(800);
  c = await cap();
  ok(c.lanes[2].name === 'Packing 3' && /Line A, Line B and Packing 3/.test(await says()), '15f a line named — the sentence says its name');
  const t3 = await page.evaluate(async cap => { const C = await import('/src/lib/capacity.ts'); return C.analyse(cap).lanes.sends; }, c);
  ok(Math.abs(t3 - 204.75) < 0.01, `15g what three lines send is what the place takes (${t3})`);

  /* a station moved inside its own line only */
  await page.locator(`#cap-st-${c.stations.find(st => st.lane === c.lanes[1].id && st.name === 'bagger').id} button[aria-label="Move later in the line"]`).click(); await page.waitForTimeout(800);
  c = await cap();
  const names = id => c.stations.filter(st => st.lane === id).map(st => st.name).join();
  ok(names(c.lanes[0].id) === 'bagger,P160 Pick & Place,palletiser' && names(c.lanes[1].id) === 'P160 Pick & Place,bagger,palletiser', '15h a station moved later in Line B, Line A as it was');

  /* the third line taken away, with its stations; and undone */
  await page.getByRole('button', { name: 'Remove this line' }).last().click(); await page.waitForTimeout(800);
  c = await cap();
  ok(c.lanes.length === 2 && c.stations.length === 7, '15i a line removed with its stations');
  await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(800);
  c = await cap();
  ok(c.lanes.length === 3 && c.stations.length === 10, '15j and undone');
  await page.getByRole('button', { name: 'Remove this line' }).last().click(); await page.waitForTimeout(800);

  /* a what-if keeps the lines; a station changed there moves the whole */
  await page.getByRole('button', { name: /What if$/ }).click(); await page.waitForTimeout(800);
  ok(await page.locator('.cap-grp.has-lanes').count() === 3 && await page.getByRole('button', { name: 'Remove this line' }).count() === 0, '15k a what-if keeps the lines, and does not add or take away a line');
  await page.getByRole('tab', { name: 'As run' }).click(); await page.waitForTimeout(500);

  /* the checks, in the module's words, with the lines named */
  c = await cap();
  const chk = await page.evaluate(async cap => { const C = await import('/src/lib/capacity.ts'); return C.screenCapacity(cap, C.analyse(cap)).map(x => x.text); }, c);
  const shown = (await page.locator('.cap-screen-t').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  ok(chk.length >= 2 && shown.length === chk.length && shown.every((t, i) => t === chk[i]) && /^Pallet wrapper holds Line A and Line B/.test(chk[0]) && /Line A: bagger/.test(chk.join(" ")),
    `15l checked as several lines: ${chk.length} things, the wrapper against both lines and each V along its own line (${shown.length} shown${shown.length === chk.length ? '' : `: ${shown.map(t => t.slice(0, 40)).join(' | ')} / module: ${chk.map(t => t.slice(0, 40)).join(' | ')}`})`);

  /* on paper: each line, its own V and sheet, then where they merge */
  const dir = mkdtempSync(join(tmpdir(), 'cap-lanes-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).click()]);
  const file = join(dir, 'cap.pdf'); await dl.saveAs(file);
  const raw = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' });
  const txt = raw.replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'");
  const want = [`Line A - on its own, 68.3 units/min`, `Line B - on its own, 68.3 units/min`, `After the lines merge - what they send, 137 units/min`, ...chk];
  const lost = want.map(w => w.replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'")).filter(w => !txt.toLowerCase().includes(w.toLowerCase()));
  ok(!lost.length && /Pallet wrapper holds Line A and Line B/.test(txt), `15m the paper: a V and a sheet a line and where they merge, the checks beneath${lost.length ? ` — lost: ${lost[0].slice(0, 80)}` : ''}`);

  /* THE SHAPE ASKED, THE V DRAWN, THE WAY TO THE TARGET (Rowland, 15 October:
     "it should almost be asking how many lines ... and do they merge at the
     end"; "I think it's quite poor ... as much automation and intelligence ...
     to interpret before and after and merges and cycle times"; "you move the
     graph out the way. It's only available on the PDF now"). */
  await page.evaluate(async ([id, cap]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, capacity: cap }); }, [SID, CHAIN]);
  await go(CAP);
  ok(await page.locator('.cap-seg-b').count() === 6 && await page.locator('.cap-grp.has-lanes').count() === 0 && await page.locator('.cxf-lane').count() === 0,
    '16 a single chain asks how many lines feed in (1 to 6), and draws no lines');
  await page.getByRole('group', { name: 'Lines feeding in' }).getByRole('button', { name: '2', exact: true }).click(); await page.waitForTimeout(1200);
  c = await cap();
  ok(c.lanes?.length === 2 && JSON.stringify(lanesOf(c)) === JSON.stringify([['Line A', ['bagger', 'P160 Pick & Place', 'palletiser']], ['Line B', ['bagger', 'P160 Pick & Place', 'palletiser']]])
    && c.stations.filter(st => !st.lane).map(st => st.name).join() === 'Pallet wrapper', '16a "2": two lines, the same first stations, merging before the last — the wrapper shared');
  ok(await page.locator('.vc-svg').count() === 2, '16b a V is drawn on the page for the lines (alike, so once) and for where they merge (it was only on the paper)');
  /* THE LINE, DRAWN beside the stations (16 October: "being able to see what
     you're doing makes no sense"): a column a line, each station and its
     speed as lib/capacityFlow has it, the lines meeting with what arrives,
     the shared wrapper the bottleneck, what the line makes against the target */
  const fm = await page.evaluate(async cap => { const C = await import('/src/lib/capacity.ts'); const F = await import('/src/lib/capacityFlow.ts'); const L = await import('/src/lib/capacityLines.ts'); return F.flowModel(cap, C.analyse(cap), L.lanesAlike(cap)); }, c);
  const lanesDrawn = await page.locator('.capx-live .cxf-lane').evaluateAll(g => g.map(x => (x.textContent ?? '').trim()));
  const nodesDrawn = (await page.locator('.capx-live .cxf-node').evaluateAll(g => g.map(x => x.getAttribute('aria-label'))));
  const meet = ((await page.locator('.capx-live .cxf-merge').first().textContent()) ?? '').replace(/\s+/g, ' ').trim();
  ok(JSON.stringify(lanesDrawn) === JSON.stringify(fm.columns.map(x => x.name)) && nodesDrawn.length === fm.columns.reduce((n, x) => n + x.nodes.length, 0) + fm.shared.length
    && /The lines meet — 137 units\/min arrive/.test(meet) && nodesDrawn.some(t => /^Pallet wrapper: .*the bottleneck$/.test(t ?? '')),
    `16c the line drawn beside the stations: a column a line, every station with its speed, the lines meeting with what arrives, the wrapper the bottleneck (${lanesDrawn.join(', ')} · ${nodesDrawn.length} stations · ${meet})`);
  const mine = await page.evaluate(async cap => { const C = await import('/src/lib/capacity.ts'); const r = C.analyse(cap); const f = r.lanes.merged.ok.find(x => x.station.id !== '__merge__'); const prev = cap.stations.filter(s => s.lane === cap.lanes[0].id).slice(-1)[0]; const say = C.paceSays(r, f.station, prev.unit, prev); return [say.arrive, say.verdict].filter(Boolean).join(' '); }, c);
  ok(mine && (await words('.capx-live .cap-map-say')) === mine.replace(/\s+/g, ' '), '16d the merge said in the shared station\'s own cycle times — what reaches it, how long it takes, how many people it needs');
  const sel = page.getByLabel('Where the lines merge');
  await sel.selectOption('2'); await page.waitForTimeout(1200);
  c = await cap();
  ok(c.stations.filter(st => !st.lane).map(st => st.name).join() === 'palletiser,Pallet wrapper' && c.stations.filter(st => st.lane === c.lanes[0].id).length === 2,
    '16e the merge moved earlier: the palletiser is shared now, each line has two stations of its own');
  await sel.selectOption('3'); await page.waitForTimeout(1200);
  c = await cap();
  ok(c.stations.filter(st => !st.lane).map(st => st.name).join() === 'Pallet wrapper' && c.stations.filter(st => st.lane === c.lanes[1].id).length === 3, '16f and back to after the palletiser');

  /* the way to the target: worked out, on the page, on the paper, and made so */
  const plan = await page.evaluate(async cap => (await import('/src/lib/capacityPlan.ts')).planToTarget(cap), c);
  ok(plan.reached && plan.people === 4 && (await words('.cap-plan-says')) === plan.sentence.replace(/\s+/g, ' ')
    && (await page.locator('.cap-plan-steps li').count()) === plan.steps.length, `16g the way to 150: ${plan.sentence.slice(0, 90)}…`);
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).click()]);
  const file2 = join(dir, 'plan.pdf'); await dl2.saveAs(file2);
  const tx = execFileSync('pdftotext', ['-raw', file2, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ').replace(/[–—]/g, '-');
  ok(/The way to the target/i.test(tx) && tx.includes(plan.steps[0].text.split(' — ')[0].replace(/ → /g, ' to ')), '16h the paper carries the way to the target, its steps in the page\'s words');
  await page.getByRole('button', { name: /^Make it so — put these crews in/ }).click(); await page.waitForTimeout(1500);
  c = await cap();
  const crew = n => c.stations.filter(st => st.name === n).map(st => st.crew).join();
  const after = await page.evaluate(async cap => (await import('/src/lib/capacity.ts')).analyse(cap).line, c);
  ok(crew('Pallet wrapper') === '3' && crew('palletiser') === '2,2' && after >= 150 && c.labour.people === 12 && await page.locator('.cap-plan').count() === 0,
    `16i made so: 3 at the wrapper, 2 on each palletiser, the line makes ${after.toFixed(1)}, the labour 8 → 12 people, the plan gone`);
  await page.getByRole('group', { name: 'Lines feeding in' }).getByRole('button', { name: '3', exact: true }).click(); await page.waitForTimeout(1200);
  c = await cap();
  ok(c.lanes?.length === 3 && c.lanes[2].name === 'Line C' && c.stations.filter(st => st.lane === c.lanes[2].id).map(st => st.crew).join() === '1,1,2', '16j "3": Line C a copy of the first line, with its crew');
  await page.getByRole('group', { name: 'Lines feeding in' }).getByRole('button', { name: '1', exact: true }).click(); await page.waitForTimeout(1200);
  c = await cap();
  ok(!c.lanes && c.stations.length === 4 && c.stations.map(st => st.name).join() === 'bagger,P160 Pick & Place,palletiser,Pallet wrapper', '16k "1": one chain again, the first line\'s stations and the wrapper');
  await page.evaluate(async b => { const db = await import('/src/db.ts'); await db.putStandard(b); }, before);
}

/* ---- a client reads it and changes nothing ---- a line's own tool is its
   members' to change; on a job, a client of the job reads it. So the
   standard is put on the job first, as a person would attach it. */
await page.evaluate(async ([id, pid]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, projectId: pid }); }, [SID, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${sd.projectId}/standard/${SID}?at=balance`);
{
  const found = await page.getByRole('button', { name: /^Set the V’s margin|^Change the margin|^Walk the line|use it$|What if$/ }).allInnerTexts();
  const doors = found.length;
  ok((await page.locator('.vc-svg').count()) === 1 && doors === 0, `a client reads Line capacity and changes nothing${doors ? ` — found: ${found.join(', ')}` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nLine capacity accepted: the V, the sheet, the margin, the standard time, the walk, a shift and what a pack costs hold; renamed and deleted where it sits');
process.exit(failed ? 1 : 0);
