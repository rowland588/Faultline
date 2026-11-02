/* WHERE TO START ON THE PARETO (knowledge/specs/FC-148-why-tree.md, Part C — Rowland, 2 November: "build all three parts").
 * A 6M project on a line whose Line capacity has the Bagger at 120 and the Wrapper at 100 packs a minute (the Wrapper limits it)
 * and a pack worth 5p. Four weeks of stops: Jams 360 min (300 of them on the Bagger, 60 on the Wrapper), Film break 200 min (all on
 * the Wrapper), Label 10 min. The vital few are Jams and Film break; Jams is the bigger bar, Film break is the one at the constraint.
 *   1  desk, the fishbone page's Pareto: Jams still ranks first (the order is the chosen measure's, unchanged); the mark sits on
 *      Film break ("Start here"), Jams says "Next"; the sentence is the module's — 200 min at the Wrapper, 20,000 packs, £1,000
 *      (hand-worked: 200 x 100 = 20,000; x 5p = £1,000) — read from the line's own records through lib/paretoStart
 *   2  the margin taken off the line: no mark, no tag, the sentence names the line and "what a pack contributes"; nothing estimated
 *   3  the Line capacity taken off: no mark, the sentence names the constraint as missing
 *   4  the margin back and the stops all on the Bagger (off the constraint): no mark, "None of the vital few sits on the constraint"
 *   5  a phone: the sheet opens from the page's bar, the sentence and the tags show, nothing off the side, the bars a thumb's height
 *   and no console error.
 *   node scripts/acceptance/pareto-start.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
await go('#/room');

/* the line, its Line capacity, its stops and the project */
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const DAY = 86_400_000, MIN = 60_000, t = Date.now(), uid = () => crypto.randomUUID();
  const ws = await db.createWorkspace('Start Line 7');
  await db.updateWorkspace({ ...ws, assets: ['Bagger', 'Wrapper'], marginPerPack: 0.05 });
  const st = (name, rate) => ({ id: name, name, kind: 'machine', unit: 'packs', contains: 1, rate, ratePer: 'min', crew: 1, source: 'plate' });
  const sid = uid();
  await db.putStandard({ id: sid, projectId: '', workspaceId: ws.id, product: 'Maris 2kg', capacity: { stations: [st('Bagger', 120), st('Wrapper', 100)] }, marks: [], sort: 0, createdAt: t, updatedAt: t });
  const stop = (asset, category, daysAgo, min) => db.addObservation({ id: uid(), workspaceId: ws.id, category, asset, startedAt: t - daysAgo * DAY, endedAt: t - daysAgo * DAY + min * MIN, durationMs: min * MIN, timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t });
  await stop('Bagger', 'Jams', 3, 150); await stop('Bagger', 'Jams', 6, 150); await stop('Wrapper', 'Jams', 9, 60);
  await stop('Wrapper', 'Film break', 4, 120); await stop('Wrapper', 'Film break', 11, 80);
  await stop('Wrapper', 'Label', 5, 10);
  const p = await db.createProject('Start here — Line 7', '#0e7490', 'Rowland', 'r@example.com', 'board');
  await db.addPaceLine({ projectId: p.id, key: 'L7', name: 'Start Line 7', owner: 'Rob', sponsor: 'Tanya', sort: 0, workspaceId: ws.id });
  return { wsId: ws.id, sid, pid: p.id };
});
const open = async () => { await go(`#/project/${made.pid}/fishbone`); await page.locator('.prp').first().waitFor({ timeout: 15000 }); await page.waitForTimeout(800); };
const ranked = () => page.locator('.prp .prp-bar .prp-cat').allInnerTexts();
const barText = cat => page.locator('.prp .prp-bar', { has: page.locator('.prp-cat', { hasText: new RegExp('^' + cat + '$') }) }).first().innerText();
const sentence = async () => ((await page.locator('.prp-start').count()) ? (await page.locator('.prp-start').innerText()).replace(/\s+/g, ' ').trim() : '');

/* 1 */
await open();
const order = await ranked();
ok(order[0] === 'Jams' && order[1] === 'Film break', '1 the order is the chosen measure’s, unchanged — Jams (the bigger bar) still first', order.join(','));
const SAYS1 = 'Start here: Film break — 200 min at the Wrapper, about 20,000 packs and £1,000 of contribution in the last four weeks. A minute lost there is a minute of the line.';
ok((await sentence()) === SAYS1, '1 the sentence is the module’s: 200 min at the Wrapper, 20,000 packs, £1,000', await sentence());
ok(/start here/i.test(await barText('Film break')) && !/start here/i.test(await barText('Jams')), '1 Film break wears Start here, Jams does not');
ok(/\bnext\b/i.test(await barText('Jams')) && !/\bnext\b/i.test(await barText('Film break')), '1 Jams, the other vital bar, says Next');
ok(!/start here|\bnext\b/i.test(await barText('Label')), '1 a bar below the 80% line wears neither');
const viaModule = await page.evaluate(async ids => {
  const db = await import('/src/db.ts'); const m = await import('/src/lib/paretoStart.ts');
  const to = Date.now(), from = to - 28 * 86_400_000;
  const ws = await db.getWorkspace(ids.wsId);
  const line = m.startLineOf('Start Line 7', ws, await db.listStandardsForLine(ids.wsId), await db.listObservations(ids.wsId), ['Jams', 'Film break'], from, to);
  return m.startHere(['Jams', 'Film break'], [line]).says;
}, made);
ok(viaModule === SAYS1, '1 and the module reading the same records says the same', viaModule);

/* 2 — no margin */
await page.evaluate(async id => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(id); await db.updateWorkspace({ ...w, marginPerPack: undefined }); }, made.wsId);
await open();
const s2 = await sentence();
ok(/^Start here is not marked/.test(s2) && s2.includes('Start Line 7') && s2.includes('what a pack contributes') && s2.endsWith('Nothing is estimated.'), '2 no margin: no mark, the sentence names the line and what a pack contributes', s2);
ok(!/start here|\bnext\b/i.test((await page.locator('.prp-bar').allInnerTexts()).join(' ')), '2 no tag on any bar');
ok(JSON.stringify(await ranked()) === JSON.stringify(order), '2 the order is unchanged');

/* 3 — no Line capacity */
const std = await page.evaluate(async ([id, wsId]) => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(wsId); await db.updateWorkspace({ ...w, marginPerPack: 0.05 }); const s = await db.getStandard(id); await db.putStandard({ ...s, deletedAt: Date.now() }); return s; }, [made.sid, made.wsId]);
await open();
const s3 = await sentence();
ok(/its constraint — build its Line capacity/.test(s3) && !/Start here:/.test(s3), '3 no Line capacity: no mark, the constraint named as missing', s3);

/* 4 — the stops all off the constraint */
await page.evaluate(async ([s, wsId]) => {
  const db = await import('/src/db.ts'); await db.putStandard({ ...s, deletedAt: undefined });
  for (const o of await db.listObservations(wsId)) if (o.asset === 'Wrapper' && o.category !== 'Label') await db.updateObservation({ ...o, asset: 'Bagger' });
}, [std, made.wsId]);
await open();
const s4 = await sentence();
ok(s4 === 'None of the vital few sits on the constraint (Wrapper) — fixing them will not make the line more. The prize is at the constraint’s own stops.', '4 every vital stop off the constraint: no mark, and it says why', s4);

/* 5 — the phone, with the mark back */
await page.evaluate(async wsId => { const db = await import('/src/db.ts'); for (const o of await db.listObservations(wsId)) if (o.category === 'Film break') await db.updateObservation({ ...o, asset: 'Wrapper' }); }, made.wsId);
await page.setViewportSize({ width: 390, height: 800 });
await go(`#/project/${made.pid}/fishbone`);
await page.getByRole('button', { name: 'Where the time goes' }).first().click();
await page.locator('.prp-start').waitFor({ timeout: 10000 });
ok(/Start here: Film break/.test(await sentence()), '5 on a phone the sheet shows the sentence', await sentence());
ok(/start here/i.test(await barText('Film break')) && /\bnext\b/i.test(await barText('Jams')), '5 and the tags');
const over = await page.evaluate(() => document.scrollingElement.scrollWidth - 390);
ok(over <= 0, '5 nothing off the side', `${over}px over`);
const small = await page.locator('.prp-bar .prp-go').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 44).length);
ok(small === 0, '5 every bar a thumb’s height or more', `${small} short`);

ok(errs.length === 0, 'no console error', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
