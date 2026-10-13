/* ACCEPTANCE — LINE CAPACITY (docs/BUILD.md, Line capacity; docs/CAPACITY.md).
 *
 * Rowland, 12 October: "the line balancing is actually a capacity model ...
 * understanding the V-curve ... my bottleneck could be people, it could be
 * an asset ... we go by plate speed ... of course, unless human." The story,
 * driven in a real browser on the seeded line standard (Line 7's Maris Piper
 * 2kg) with the real controls:
 *
 *   1  the views say what they are: Capacity, and the people's work against takt
 *   2  the V-curve reads as lib/capacity says — a point per station, the
 *      bottleneck filled and named, the sentence the module's
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
 *   8  a person, as the floor says them (Rowland, 13 October: "8 units in a
 *      tray ... a tray every 8 seconds ... very strange numbers"; "70 a
 *      minute ... 10 to a basket ... one basket goes to a human every X"):
 *      what reaches them worked out the moment they say 8 to a tray, before
 *      they have a speed; "a tray every 8 seconds" said back as a minute and
 *      in the line's unit; whether they keep up in seconds; Make it 2 people
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

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
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
  const tabs = (await page.locator('.lb-views .chip').allTextContents()).map(x => x.trim());
  ok(tabs.join('|') === 'Capacity|People — the work against takt', `1 the views: ${tabs.join(' · ')}`);
}
/* ---- 2 the V-curve ---- */
{
  const t = await truth();
  ok((await words('.vc-says')) === t.says, `2 the V says what the module says: ${t.says}`);
  ok((await page.locator('.vc-pt').count()) === t.n && (await page.locator('.vc-pt.is-limit').count()) === 1 && /BOTTLENECK/.test(await page.locator('.vc-neck').first().textContent() ?? ''), `2 a point per station (${t.n}), the bottleneck — ${t.limit} — filled and named`);
  ok(t.margin == null && (await page.locator('.vc-guide').count()) === 0, '2 no margin agreed: no guide V drawn');
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
  ok(/^The time study: [\d.,]+ s a basket — use it$/.test(offer), `5 the time study offers Op 2's standard time in the station's unit: ${offer}`);
  if (offer) {
    await page.locator('.cap-sheet-use').first().click(); await page.waitForTimeout(900);
    const st = (await truth()).stations.find(s => s.name === 'Op 2');
    ok(st?.source === 'standard' && st.cycleSec === want && /standard time — the time study/.test(await words('.cap-sheet tr:has-text("Op 2")')), `5 used: 1 every ${want} s, "standard time — the time study"`);
  }
}
/* ---- 6 the bottleneck walked ---- */
{
  await page.getByRole('button', { name: 'Walk the line' }).click(); await page.waitForTimeout(1800);
  const id = page.url().split('sampling/')[1]?.split(/[?#]/)[0];
  ok(!!id && /bottleneck walk/i.test(await words('.ie-eyebrow')) && /Walk 1 of 12/.test(await words('.ws-round')), '6 Walk the line opens the walk: Walk 1 of 12, now');
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
  ok(t.perCycle === 1 && t.cycleSec === 8 && Math.abs(t.line - 60) < 1e-9, `8c "a tray every 8 seconds" is one tray every 8 s — 60 units a minute at the line (${t.line})`);
  ok(flat(await card.locator('.cap-is').innerText()) === '= 7.5 trays a minute each · 60 units a minute', `8d said back at once: ${flat(await card.locator('.cap-is').innerText())}`);
  ok(t.verdict === 'They take 8 s a tray — 1.1 s too slow: they hold the line back. It needs 2 people to keep up.' && flat(await card.locator('.cap-st-says').innerText()) === t.verdict && /is-short/.test(await card.locator('.cap-feed').getAttribute('class')),
    '8e whether they keep up, in seconds a tray, red when short — and how many people would');
  await card.getByRole('button', { name: 'Make it 2 people' }).click(); await page.waitForTimeout(800);
  t = await said();
  ok(t.crew === 2 && t.verdict === 'They take 8 s a tray each, 2 of them — they keep up, 2.9 s to spare a tray.' && flat(await card.locator('.cap-st-says').innerText()) === t.verdict, '8f Make it 2 people: two of them keep up, with the seconds to spare');
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
  ok(lit.map(flat).join('|') === 'Line capacity' && gates === 0, `10b on no job: the rail lights Line capacity (${lit.map(flat).join('|')}) and wears no job's gates (${gates})`);
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
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nLine capacity accepted: the V, the sheet, the margin, the standard time, the walk, a shift and what a pack costs hold');
process.exit(failed ? 1 : 0);
