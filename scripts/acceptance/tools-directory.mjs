/* ACCEPTANCE — EVERY TOOL, THE DIRECTORY (knowledge/README.md; src/catalogue).
 *
 * Rowland, 22 October: "a directory ... searchable by problem, discipline,
 * method and scenario ... reflecting real status". Driven in a real browser:
 *
 *   1  from the menu, Tools (the library — "Every tool" before B5; the front door's link before 23 October); the lede's counts as the catalogue says
 *      — tools only (7 November, Rowland: "you've split down every single functionality within its tool and then called each
 *      functionality a tool"): one number of tools, never the catalogue's entries; Problems and Actions not cards; Line Talk a card
 *      and a door
 *   2  what we have and what we need to build: a row for every tool saying what it holds as catalogue/counts holdings says, opened
 *      to Built and To build; the new tools not started; the other groups with their counts — every entry in one place
 *   3  the problem in the floor's words — "we're rejecting too many": where to
 *      start (the rejects route first), the tools in the module's order, the
 *      reject rate (FC-098) among the first five, available since W1, opened — its
 *      problem, what it does not do yet, Open it landing on the capability study
 *   4  a number — "FC-95": the one tool; opened, Open it lands on the
 *      capability study
 *   5  a route's tool opened from the route; a tool left out on purpose says why
 *   6  the phone — nothing off the side, a tool opened inside the screen
 *
 * Fails on any console error.
 *
 *   node scripts/acceptance/tools-directory.mjs      (SMOKE_BASE, as smoke) */
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
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const unfold = async (pg, id) => { const f = pg.locator(`[data-fold="${id}"]`); if (await f.count() && !(await f.evaluate(e => e.classList.contains('is-open')))) { await f.locator('.fold-toggle').click(); await pg.waitForTimeout(250); } };   // a fold opened where its contents are read (10 November, docs/DESIGN.md)
/* the catalogue's own answers, from the module the page reads */
const cat = (fn, ...args) => page.evaluate(async ([fn, args]) => {
  const C = await import('/src/catalogue/index.ts'); const T = await import('/src/catalogue/types.ts');
  const ids = es => es.map(e => e.id);
  if (fn === 'counts') { const K = await import('/src/catalogue/counts.ts'); const h = K.holdings(); return { total: C.ENTRIES.length, t: K.toolCounts(), gallery: K.GALLERY_TOOLS.map(t => t.key), held: h.tools.map(x => ({ id: x.id, built: x.built.length, toBuild: x.toBuild.length })), newTools: h.newTools.map(e => e.id), parts: h.parts.length }; }
  if (fn === 'search') return { problems: C.searchProblems(args[0]).map(p => p.id), entries: ids(C.searchEntries(args[0])) };
  if (fn === 'discipline') return ids(C.ENTRIES.filter(e => e.discipline === args[0]));
  if (fn === 'entry') { const e = C.entryById(args[0]); return e && { id: e.id, name: e.name, status: T.STATUS_WORDS[e.status], problem: e.problem, decided: e.decided ?? null }; }
  if (fn === 'words') return T.STATUS_WORDS;
  return null;
}, [fn, args]);
const M = 'section[aria-label="What matches"] ';
const rows = async () => page.locator(M + '.et-row').evaluateAll(els => els.map(e => ({ id: e.getAttribute('data-id'), st: e.querySelector('.et-st')?.textContent?.trim() })));

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · from the menu, on every page (the front door's link before 23 October) ---- */
await page.goto(`${BASE}/#/`); await page.waitForTimeout(2200);
await page.locator('.nv-rail .nv-ri', { hasText: /^Tools$/ }).click(); await page.waitForTimeout(1500);
const c = await cat('counts');
const lede = flat(await page.locator('.et-lede').innerText());
ok(page.url().endsWith('#/tools') && (await page.locator('h1').innerText()) === 'Tools', `1 the menu opens Tools, the library (${page.url().split('#')[1]})`);
const toBuildInside = c.held.reduce((n, x) => n + x.toBuild, 0);
ok(lede.startsWith(`${c.t.tools} tools. Inside them, ${c.t.inside} ways of using them are built and ${toBuildInside} more`) && lede.includes(`${c.newTools.length} new tools are planned and not started`) && !lede.includes(String(c.total)) && !/available/i.test(lede),
  `1 the lede says the tools, never the catalogue's ${c.total} entries: "${lede.slice(0, 160)}…"`);
const cards = await page.locator('.et-now .tc-card').evaluateAll(els => els.map(e => e.getAttribute('data-tool')));
ok(JSON.stringify(cards) === JSON.stringify(c.gallery) && !cards.includes('problems') && !cards.includes('actions') && cards.includes('talk') && c.t.tools === cards.length + 1,
  `1 a card for every tool (${cards.length}) and the 6M door make ${c.t.tools}; Problems and Actions are not cards; Line Talk is`);
ok((await page.locator('.et-doors [data-door="talk"]').count()) === 1 && (await page.locator('.et-doors [data-sixm-door]').count()) === 1, '1 two doors at the top — Line Talk and the 6M');
ok(!(await page.locator('.et-status, .et-disc').count()), '1 no status chips and no discipline box — they counted entries as tools');

/* ---- 2 · what we have and what we need to build ---- */
{
  await unfold(page, 'tools-holdings');   // in a fold below the tools since 10 November
  const rows2 = await page.locator('.hd-tool').evaluateAll(els => els.map(e => ({ id: e.getAttribute('data-tool-id'), n: e.querySelector('.hd-n')?.textContent?.trim() })));
  const said = x => [x.built ? `${x.built} way${x.built === 1 ? '' : 's'} of using it built` : '', x.toBuild ? `${x.toBuild} to build` : ''].filter(Boolean).join(' · ') || 'the tool itself';
  ok(rows2.length === c.held.length && rows2.every((r, i) => r.id === c.held[i].id && r.n === said(c.held[i])), `2 a row for every tool saying what it holds — ${rows2.slice(0, 3).map(r => r.n).join(' | ')}…`);
  const cap = c.held.find(x => x.id === 'FC-094');
  await page.locator('.hd-tool[data-tool-id="FC-094"] summary').click(); await page.waitForTimeout(300);
  const built = await page.locator('.hd-tool[data-tool-id="FC-094"] h4').allInnerTexts();
  const n = await page.locator('.hd-tool[data-tool-id="FC-094"] .et-row').count();
  ok(JSON.stringify(built) === JSON.stringify(cap.toBuild ? ['Built', 'To build'] : ['Built']) && n === cap.built + cap.toBuild, `2 Capability opened: Built and To build, ${n} entries`);
  const groups = await page.locator('.hd-group').evaluateAll(els => els.map(e => ({ g: e.getAttribute('data-group'), n: Number(e.querySelector('.hd-n')?.textContent), open: e.open })));
  const want = { new: c.newTools.length, parts: c.parts, research: c.t.research, 'left-out': c.t.leftOut };
  ok(groups.length === 4 && groups.every(g => want[g.g] === g.n) && groups[0].g === 'new' && groups[0].open, `2 New tools — planned, not started (${want.new}, open), then parts ${want.parts}, research ${want.research}, left out ${want['left-out']}`);
  const all = c.held.reduce((n, x) => n + x.built + x.toBuild, 0) + c.newTools.length + c.parts + c.t.research + c.t.leftOut + c.t.tools;
  ok(all === c.total, `2 every catalogue entry in one place: ${all} of ${c.total}`);
}

/* ---- 3 · the problem in the floor's words ---- */
{
  const q = 'we’re rejecting too many';
  await unfold(page, 'tools-find');
  await page.getByLabel('What’s the problem?').fill(q); await page.waitForTimeout(500);
  const t = await cat('search', q);
  const routes = await page.locator('.et-route').evaluateAll(els => els.map(e => e.getAttribute('data-route')));
  ok(routes.length > 0 && routes[0] === 'rejects' && JSON.stringify(routes) === JSON.stringify(t.problems.slice(0, 3)), `3 where to start: ${routes.join(', ')} — the rejects route first`);
  const shown = (await rows()).map(r => r.id);
  ok(JSON.stringify(shown.slice(0, 10)) === JSON.stringify(t.entries.slice(0, 10)) && shown.length === t.entries.length, `3 the tools in the module's order: ${shown.slice(0, 6).join(', ')}… (${shown.length})`);
  const e = await cat('entry', 'FC-098');
  ok(shown.slice(0, 5).includes('FC-098') && (await page.locator(M + '.et-row[data-id="FC-098"] .et-st').innerText()) === e.status, `3 the reject rate among the first five, "${e.status}"`);
  await page.locator(M + '.et-row[data-id="FC-098"] .et-row-h').click(); await page.waitForTimeout(300);
  const body = flat(await page.locator(M + '.et-row[data-id="FC-098"] .et-body').innerText());
  /* since W1 (24 October) the reject rate is built: available, its limits said under "What it does not do yet", Open it landing on the capability study */
  ok(body.includes(e.problem) && /^Available$/.test(e.status) && /What it does not do yet/.test(body) && /Each run is one count of made and rejected/.test(body) && (await page.locator(M + '.et-row[data-id="FC-098"]').getByRole('button', { name: 'Open it' }).count()) === 1,
    `3 opened: its problem, "${e.status}", what it does not do yet, Open it`);
  await page.locator(M + '.et-row[data-id="FC-098"]').getByRole('button', { name: 'Open it' }).click(); await page.waitForTimeout(1500);
  ok(/#\/capability$/.test(page.url()), `3 Open it lands on the capability study (${page.url().split('#')[1]})`);
  await page.goto(`${BASE}/#/tools`); await page.waitForTimeout(1500);
}

/* ---- 4 · a number ---- */
{
  await page.getByLabel('What’s the problem?').fill('FC-95'); await page.waitForTimeout(400);
  const r = await rows();
  ok(r.length === 1 && r[0].id === 'FC-095', `4 "FC-95": the one tool — ${r.map(x => x.id).join(', ')}`);
  await page.locator(M + '.et-row[data-id="FC-095"] .et-row-h').click(); await page.waitForTimeout(300);
  await page.locator(M + '.et-row[data-id="FC-095"]').getByRole('button', { name: 'Open it' }).click(); await page.waitForTimeout(1500);
  ok(/#\/capability$/.test(page.url()) && (await page.locator('h1').first().innerText()).includes('Capability'), `4 Open it lands on the capability study (${page.url().split('#')[1]})`);
}

/* ---- 5 · a route's tool, a discipline, a tool left out ---- */
{
  await page.goto(`${BASE}/#/tools`); await page.waitForTimeout(1500);
  await unfold(page, 'tools-find');
  await page.locator('.et-route-b', { hasText: 'We’re rejecting too many' }).click(); await page.waitForTimeout(300);
  const chip = page.locator('.et-route .et-chip').first();
  const id = flat(await chip.locator('b').innerText());
  await chip.click(); await page.waitForTimeout(600);
  ok((await page.locator(`.et-row[data-id="${id}"].is-open .et-body`).count()) === 1, `5 a route's first tool, ${id}, opened from the route`);
  const left = await cat('entry', 'FC-231');
  await page.getByLabel('What’s the problem?').fill('FC-231'); await page.waitForTimeout(400);
  await page.locator(M + '.et-row[data-id="FC-231"] .et-row-h').click(); await page.waitForTimeout(300);
  const body = flat(await page.locator(M + '.et-row[data-id="FC-231"] .et-body').innerText());
  ok(left.decided && body.includes('Why it is left out') && body.includes(flat(left.decided).slice(0, 50)), `5 ${left.id} ${left.name}: why it is left out, said`);
}

/* ---- 6 · the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/#/tools`); await page.waitForTimeout(1600);
  await unfold(page, 'tools-find');
  await page.getByLabel('What’s the problem?').fill('changeovers take too long'); await page.waitForTimeout(400);
  const first = (await rows())[0];
  /* centred first, as a thumb scrolls it — the app's top and bottom bars are fixed on a phone */
  const head = page.locator(M + `.et-row[data-id="${first.id}"] .et-row-h`);
  await head.evaluate(e => e.scrollIntoView({ block: 'center' }));
  await head.click(); await page.waitForTimeout(300);
  /* the rows as drawn: each tall enough for its name and its status in words, none over the next
     (22 October: a class name shared with the timeline squashed every row to 24 px) */
  const drawn = await page.locator(M + '.et-row').evaluateAll(els => els.slice(0, 8).map(e => { const r = e.getBoundingClientRect(), st = e.querySelector('.et-st')?.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, stIn: !!st && st.bottom <= r.bottom + 0.5 && st.height > 0 }; }));
  ok(drawn.every((r, i) => r.h >= 40 && r.stIn && (i === 0 || r.top >= drawn[i - 1].bottom - 0.5)), `6 the rows on a phone: each ${Math.round(Math.min(...drawn.map(r => r.h)))}px or taller, its status inside it, none over the next`);
  const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
  const inside = await page.locator(M + `.et-row[data-id="${first.id}"]`).evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; });
  ok(wide <= 390 && inside, `6 the phone: "changeovers take too long" → ${first.id} opened inside the screen (page ${wide}px wide)`);
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
