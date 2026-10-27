/* THE LINE IS HOME (docs/MAP.md — Rowland, 27 October: "My line is my home page. I get to see all my machines on this
 * line ... I go to factory. I click machines ... I then end up on a different machine 2A pick and place ... line 2A
 * actually has six machines on it. It doesn't."). Walks his route, the way the frame offers it:
 *
 *  H1  the Factory's line card opens the line; its machine strip is the line's machines and only them — every card a
 *      machine of lib/lineRecords machinesOnLine, a Line capacity station that is not a machine never a card
 *  H2  a strip card opens the machine's one page, on its line — Factory › line › machine in two taps
 *  H3  a project's address for the machine opens that same page and stays in the project (27 October — "a machine
 *      opened from a project stays in the project": the project's frame, its Machines tab lit, ‹ Machines back to the
 *      project's), the project's part on it: its status, "Going through <project>", its four gates, what is open, its
 *      tests, its programs; the eyebrow names its line and opens the line's own page of it
 *  H4  a test on it opens in the drawer over that page, and the project's address with ?open= keeps the drawer
 *  H5  the project on it opens the project itself, never a second page of the machine
 *  H6  a stage-gate project's line (its pace line's address) opens the line's own page
 *  H7  the project's Machines rows open the one page, in the project
 *  Ph  the phone: the one page with nothing off the side
 */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async () => {
  await page.locator('.nv-main').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !/Loading…|Reading where|Opening /.test(document.querySelector('.nv-main')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
};
const go = async hash => { await page.goto(`${BASE}/${hash}`); await settle(); };
const main = () => page.locator('.nv-main');
const hash = () => decodeURIComponent(page.url().split('#')[1] ?? '');

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId, WS = sd.wsId;
/* a Line capacity station on the line that is not one of its machines — the shape that made Line 2a's two read as six */
const facts = await page.evaluate(async ([ws, pid]) => {
  const db = await import('/src/db.ts');
  const { machinesOnLine } = await import('/src/lib/lineRecords.ts');
  const line = await db.getWorkspace(ws);
  const [assets, jobLines] = await Promise.all([db.listAllAssets(), db.allPaceLines()]);
  const names = machinesOnLine(line, assets, jobLines).map(m => m.name);
  const stds = await db.listStandardsForLine(ws);
  const s = stds.find(x => !x.deletedAt && x.capacity);
  if (s?.capacity) await db.putStandard({ ...s, capacity: { ...s.capacity, stations: [...s.capacity.stations, { ...s.capacity.stations[0], id: 'st-not-a-machine', name: 'Bagger p60' }] } });
  const mine = assets.filter(a => !a.deletedAt && a.projectId === pid);
  const tests = await db.listTests(pid);
  const tested = a => tests.filter(t => !t.deletedAt && t.assetId === a.id).length;
  /* the project's machine on the line with the most tests on it */
  const onLine = mine.filter(a => names.some(n => n.trim().toLowerCase() === a.name.trim().toLowerCase())).sort((x, y) => tested(y) - tested(x))[0];
  const pl = jobLines.find(l => l.projectId === pid && l.workspaceId === ws);
  return { names, line: line.name, asset: onLine ? { id: onLine.id, name: onLine.name.trim() } : null, paceLine: pl?.id, station: !!s };
}, [WS, PID]);
ok(facts.station && !!facts.asset && !!facts.paceLine, `the seed: a station that is not a machine added, a project machine on ${facts.line}`, JSON.stringify(facts));

/* ---- H1 · Factory › the line: its machines and only them ---- */
await go('#/room');
await main().locator('.fac-card', { hasText: facts.line }).first().click(); await settle();
ok(hash() === `/lines/${WS}`, `H1 the Factory's card opens ${facts.line} (one tap)`, hash());
const cards = (await main().locator('.tour-card .tour-n').allInnerTexts()).map(t => flat(t).replace(/^\d+\s*/, '').replace(/constraint$/, '').trim());
ok(cards.length === facts.names.length && cards.every(c => facts.names.includes(c)), `H1 the strip is its machines, every one and only them (${cards.length}: ${cards.join(', ')})`, facts.names.join(', '));
ok(!cards.includes('Bagger p60') && /\d+ machines?/.test(flat(await main().locator('.tour-says').innerText())) && flat(await main().locator('.tour-says').innerText()).includes(`${facts.names.length} machine`),
  `H1 a Line capacity station is not a machine, and the sentence counts ${facts.names.length}`);

/* ---- H2 · a card opens the machine's one page ---- */
await main().locator('.tour-card .tour-b', { hasText: facts.asset.name }).first().click(); await settle();
ok(hash() === `/lines/${WS}/machine/${facts.asset.name}`, `H2 Factory › ${facts.line} › ${facts.asset.name}: two taps, its one page`, hash());

/* ---- H3 · the project's address for it opens the same page, with the project's part ---- */
await go(`#/project/${PID}/machine/${facts.asset.id}`);
ok(hash() === `/project/${PID}/machine/${facts.asset.id}`, "H3 the project's address opens the machine's one page and stays in the project", hash());
const proj = await page.evaluate(async pid => (await (await import('/src/db.ts')).getProject(pid))?.name, PID);
const part = main().locator('.mpg-in-project');
ok(await part.count() === 1 && flat(await part.locator('.mpg-in').innerText()).startsWith(`Going through ${proj}`), `H3 the project's part first: "Going through ${proj} …"`);
ok(await part.locator('.mpg-step').count() === 4 && await part.locator('.mpg-at').count() === 1, 'H3 its status and its four gates');
ok(await part.locator('.mpg-open').count() === 1 && await part.locator('.mpg-tests').count() === 1 && await part.locator('.mpg-side').count() === 1, 'H3 what is open on it, its tests, its programs');
ok(await main().locator('.lmc-studies').count() === 1 && await main().locator('.lmc-stops').count() === 1, 'H3 then the line\'s: the studies of it, its stops');
ok(await page.locator('.nv-tab[aria-current="page"]', { hasText: 'Machines' }).count() === 1, "H3 the project's frame, its Machines tab lit");
const back = main().locator('.part-back').first();
ok(await back.count() === 1 && flat(await back.innerText()) === 'Machines' && (await back.getAttribute('href')) === `#/project/${PID}/machines`, "H3 ‹ Machines goes back to the project's machines", await back.getAttribute('href').catch(() => ''));
const onLine = main().locator('.pl-eyebrow-a', { hasText: facts.line }).first();
ok(await onLine.count() === 1 && (await onLine.getAttribute('href')) === `#/lines/${WS}/machine/${encodeURIComponent(facts.asset.name)}`, `H3 "on ${facts.line}" opens the line's own page of it`, await onLine.getAttribute('href').catch(() => ''));
ok(await main().getByRole('button', { name: /Everything on .* every project.s work on it/ }).count() === 0, 'H3 no link to a second page of the same machine');

/* ---- H4 · a test opens in the drawer over the page ---- */
const testRow = part.locator('.mpg-tests .lt-row').first();
if (await testRow.count()) {
  const title = flat(await testRow.locator('.lt-what').innerText());
  await testRow.click(); await page.waitForTimeout(1200);
  ok(await page.locator('.rd').count() >= 1 && flat(await page.locator('.rd .rd-title').last().innerText()).length > 0 && hash().startsWith(`/project/${PID}/machine/`),
    `H4 a test (${title}) opens in the drawer over the one page`, hash());
  const openId = new URLSearchParams(hash().split('?')[1] ?? '').get('open');
  await go(`#/project/${PID}/machine/${facts.asset.id}?open=${openId}`);
  ok(hash().startsWith(`/project/${PID}/machine/`) && await page.locator('.rd').count() >= 1, "H4 the project's address with a record asked for keeps the drawer", hash());
} else ok(false, 'H4 the seeded machine has a test');

/* ---- H5 · the project on it opens the project ---- */
await go(`#/lines/${WS}/machine/${encodeURIComponent(facts.asset.name)}`);
const projLink = main().locator('.lmc-proj .cw-link', { hasText: proj }).first();
await projLink.click(); await settle();
ok(hash() === `/project/${PID}`, `H5 "Open ${proj} ›" opens the project itself`, hash());

/* ---- H6 · a stage-gate project's line opens the line ---- */
await go(`#/project/${PID}/line/${facts.paceLine}`);
ok(hash() === `/lines/${WS}`, `H6 the project's ${facts.line} opens the line's own page`, hash());

/* ---- H7 · the project's Machines rows open the one page ---- */
await go(`#/project/${PID}/machines`);
await main().locator('.pms .now-m', { hasText: facts.asset.name }).first().locator('.lt-row').click(); await settle();
ok(hash() === `/project/${PID}/machine/${facts.asset.id}`, "H7 the project's Machines row opens the machine's one page, in the project", hash());

/* ---- Ph · the phone ---- */
const pp = await ctx.newPage();
await pp.setViewportSize({ width: 390, height: 844 });
await pp.goto(`${BASE}/#/lines/${WS}/machine/${encodeURIComponent(facts.asset.name)}`);
await pp.locator('.mpg-in-project').waitFor({ timeout: 15000 }).catch(() => {});
await pp.waitForTimeout(1200);
ok(await pp.locator('.mpg-in-project').count() === 1 && await pp.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'Ph the one page on a phone, nothing off the side');
await pp.close();

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\nThe line is home NOT accepted: ${fail} failed` : '\nThe line is home: the line opens from the Factory, its strip is its machines, a machine has one page however it is reached, and a project leads to its line');
process.exit(fail ? 1 : 0);
