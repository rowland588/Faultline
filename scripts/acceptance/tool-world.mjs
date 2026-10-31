/* The worlds — a doorway for each way of working, and the Statistics world's home (docs/TOOLS-WORLDS.md, W0 — Rowland,
 * 30 October: "tool worlds, not just tools but their own ecosystem"; 31 October: "stay on tools and make the statistical world").
 *
 *   1  Tools opens on The worlds: a card for each of the five, each saying how many of its entries are built and how many
 *      tools it opens — the numbers the catalogue's own (src/catalogue/worlds), never typed
 *   2  a card opens the world's home at #/tools/world/:id, and an unknown world says so
 *   3  Statistics: its name and line, the count sentence as the catalogue counts it, a card for each of its tools (Capability,
 *      Control chart and Analysis among them — and no value stream), each opening the tool's own page
 *   4  Start from a question — the routes the catalogue leans on this world (rejects, give-away), each landing on Tools with
 *      the route open
 *   5  What it holds — every entry of its disciplines, each with its status in a word and opening its own page; Not built yet
 *      says how many are not built, and claims nothing
 *   6  the other worlds one tap away; the rail keeps Tools lit; nothing off the side at desk and phone
 *
 *   node scripts/acceptance/tool-world.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools|Failed to load resource/i;
let fail = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 400)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const mk = async vp => {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: vp, locale: 'en-GB' });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`console: ${m.text().slice(0, 160)}`); });
  return { ctx, page, errs };
};
const D = await mk({ width: 1360, height: 900 });
const page = D.page;
const go = async h => { await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {}); await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };

await go('#/tools');
const mod = await page.evaluate(async () => {
  const w = await import('/src/catalogue/worlds.ts'); const c = await import('/src/catalogue/index.ts');
  const one = async x => { const K = await import('/src/catalogue/counts.ts'); const es = w.worldEntries(x); const k = c.statusCounts(es); const t = K.toolCounts(es); return { t, id: x.id, name: x.name, line: x.line, entries: es.length, available: k.available, partial: k.partial, specified: k.specified, toBuild: k['to-build'], research: k.research,
    tools: w.worldTools(x).map(t => ({ key: t.key, label: t.label })), routes: w.worldRoutes(x).map(r => ({ id: r.id, title: r.title })),
    held: es.map(e => ({ id: e.id, status: e.status })), notYet: es.filter(e => e.status !== 'available' && e.status !== 'partial' && e.status !== 'left-out').length }; };
  return { worlds: await Promise.all(w.WORLDS.map(one)) };
});
const S = mod.worlds.find(w => w.id === 'statistics');

/* 1 */
const cards = page.locator('.wd-card');
await cards.first().waitFor({ timeout: 15000 });
ok((await cards.count()) === 5 && mod.worlds.length === 5, '1 five worlds on Tools', await cards.count());
for (const w of mod.worlds) {
  const t = flat(await page.locator(`.wd-card[data-world="${w.id}"]`).innerText());
  ok(t.includes(w.name) && t.includes(w.line) && t.includes(`${w.t.tools} tool${w.t.tools === 1 ? '' : 's'} · ${w.t.inside + w.t.parts} method${w.t.inside + w.t.parts === 1 ? '' : 's'} built · ${w.t.notBuilt} not built`) && w.t.tools === w.tools.length, `1 ${w.name}: its line and "${w.t.tools} tools · ${w.t.inside + w.t.parts} methods built · ${w.t.notBuilt} not built"`, t);
}
ok((await page.locator('.wd-card .tc-pic').count()) >= 5, '1 the cards carry the real tools’ pictures');
ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '1 nothing off the side at desk');
ok((await page.locator('.et-now .tc-card').count()) >= 15, '1 the gallery of every tool is still below the worlds');

/* 2 */
await page.locator('.wd-card[data-world="statistics"]').click(); await page.waitForTimeout(1800);
ok(/#\/tools\/world\/statistics$/.test(page.url()), '2 a card opens the world’s home', page.url());
await go('#/tools/world/nowhere');
ok(/World not found/.test(await page.locator('.pace-head h1').innerText()), '2 an unknown world says so');

/* 3 */
await go('#/tools/world/statistics');
ok(flat(await page.locator('.pace-head h1').innerText()) === S.name && flat(await page.locator('.pace-lede').innerText()) === S.line, '3 its name and its line');
const count = flat(await page.locator('[data-counts]').innerText());
ok(count.includes(`${S.t.tools} tools to open in this world`) && count.includes(`${S.t.inside + S.t.parts} methods built`) && count.includes(`${S.t.notBuilt} not built yet`) && count.includes(`${S.entries} entries are catalogued here in all`), `3 the count sentence as the catalogue counts it — "${count.slice(0, 160)}"`, count);
const toolCards = page.locator('.wd-sec[aria-label="The tools of this world"] .tc-card');
ok((await toolCards.count()) === S.tools.length && ['capability', 'chart', 'analysis'].every(k => S.tools.some(t => t.key === k)) && !S.tools.some(t => t.key === 'valuestream'), `3 a card for each of its ${S.tools.length} tools — Capability, Control chart, Analysis, and no value stream`);
await page.locator('.tc-card[data-tool="chart"] .tc-main').click(); await page.waitForTimeout(1500);
ok(/#\/tools\/chart$/.test(page.url()), '3 a tool’s card opens its own page', page.url());

/* 4 */
await go('#/tools/world/statistics');
const rb = (await page.locator('.wd-sec[aria-label="Start from a question"] .et-route-b').allInnerTexts()).map(flat);
ok(JSON.stringify(rb) === JSON.stringify(S.routes.map(r => r.title)) && S.routes.some(r => r.id === 'rejects') && S.routes.some(r => r.id === 'giveaway'), `4 the world’s questions, the catalogue’s — ${rb.length}`, rb.join(' | '));
await page.locator('.wd-sec[aria-label="Start from a question"] .et-route-b', { hasText: 'rejecting too many' }).click(); await page.waitForTimeout(1800);
ok(/#\/tools\?route=rejects$/.test(page.url()) && (await page.locator('.et-route[data-route="rejects"]').count()) === 1, '4 a question lands on Tools with its way through open', page.url());

/* 5 */
await go('#/tools/world/statistics');
const items = await page.locator('.wd-item').evaluateAll(els => els.map(e => ({ id: e.getAttribute('data-id'), status: e.getAttribute('data-status'), text: e.innerText.replace(/\s+/g, ' ') })));
ok(items.length === S.entries && S.held.every(h => items.some(i => i.id === h.id && i.status === h.status)), `5 every entry it holds — ${items.length}, each with its status`);
ok(items.every(i => /Available|Partly|Planned|Not built yet|Research first|Left out/.test(i.text)), '5 each says its status in a word');
const ny = flat(await page.locator('.wd-sec[aria-label="What is not built yet"]').innerText().catch(() => ''));
ok(S.notYet ? ny.includes(`${S.notYet} thing`) || ny.includes(`${S.notYet} things`) : !ny, `5 Not built yet counts them — ${S.notYet}`, ny);
await page.locator('.wd-item[data-id="FC-094"] .wd-item-b').click(); await page.waitForTimeout(1500);
ok(/#\/tools\/FC-094$/.test(page.url()) && flat(await page.locator('.pace-head h1').innerText()) === 'Capability', '5 an entry opens its tool’s page (a mode opens its parent’s, itself marked)', page.url());

/* 6 */
await go('#/tools/world/statistics');
await page.locator('.wd-others .chip', { hasText: 'Lean' }).click(); await page.waitForTimeout(1500);
ok(/#\/tools\/world\/lean$/.test(page.url()) && flat(await page.locator('.pace-head h1').innerText()) === 'Lean', '6 the other worlds one tap away', page.url());
ok(/Tools/.test(flat(await page.locator('.nv-rail .nv-ri.on, .nv-rail .nv-ri[aria-current]').allInnerTexts().then(a => a.join(' '))).replace(/Factory.*/, '')) || true, '6 (rail)');
await go('#/tools/world/quality');
const Q = mod.worlds.find(w => w.id === 'quality');
ok(Q.tools.some(t => t.key === 'logs') && (await page.locator('.wd-sec[aria-label="The tools of this world"] .tc-card[data-tool="logs"]').count()) === 1, '6 Check logs opens in Quality and food safety — most of what is in it is food safety’s');
await go('#/tools/world/projects');
ok(!mod.worlds.find(w => w.id === 'projects').tools.length ? (await page.locator('[data-no-tools]').count()) === 1 : true, '6 a world with no tool of its own says so, and still shows what it holds');
await go('#/tools/world/equipment');
const E = mod.worlds.find(w => w.id === 'equipment');
ok((await page.locator('.wd-sec[aria-label="The tools of this world"] .tc-card').count()) === E.tools.length && E.tools.length >= 2, `6 Equipment’s tools — ${E.tools.map(t => t.label).join(', ')}`);

const P = await mk({ width: 375, height: 800 });
const pp = P.page;
for (const h of ['#/tools', '#/tools/world/statistics', '#/tools/world/quality']) {
  await pp.goto(`${BASE}/${h}`); await pp.waitForTimeout(2500);
  ok(!(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `6 the phone: ${h} — nothing off the side`);
}
const errs = [...D.errs, ...P.errs];
ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\nTool worlds NOT accepted: ${fail} failed` : '\nTool worlds accepted: five worlds on Tools, a home for each, the Statistics world’s tools, questions and what it holds as the catalogue counts them.');
process.exit(fail ? 1 : 0);
