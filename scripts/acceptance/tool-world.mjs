import { showAllTools } from '../lib/setup.mjs';
import { openFold as unfold } from '../lib/folds.mjs';
/* Direct working-tool categories, with all catalogue methods/statuses retained in optional coverage.
 * Improvement methods remain a tool category, distinct from the Projects workspace.
 * Optional task suggestions are proved by tools-directory.mjs.
 * node scripts/acceptance/tool-world.mjs (SMOKE_BASE, as smoke) */
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
await unfold(page, 'tools-worlds');   // the worlds are in a fold below the tools since 10 November
const cards = page.locator('.wd-card');
await cards.first().waitFor({ timeout: 15000 });
ok((await cards.count()) === mod.worlds.filter(w => w.tools.length).length, '1 every category with working tools is available', await cards.count());
for (const w of mod.worlds.filter(w => w.tools.length)) {
  const t = flat(await page.locator(`.wd-card[data-world="${w.id}"]`).innerText());
  ok(t.includes(w.name) && t.includes(w.line) && t.includes(`${w.tools.length} tool${w.tools.length === 1 ? '' : 's'} to use`), `1 ${w.name}: actual working tools counted`, t);
}
ok((await page.locator('.wd-card .tc-pic').count()) >= 4, '1 the cards carry the real tools’ pictures');
ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '1 nothing off the side at desk');
await showAllTools(page);   // eight first since 18 November; every tool one press away
ok((await page.locator('.et-now .tc-card').count()) >= 15, '1 the list of every tool is still on Tools, first (10 November) — all of it one press away (18 November)');

/* 2 */
await page.locator('.wd-card[data-world="statistics"]').click(); await page.waitForTimeout(1800);
ok(/#\/tools\/world\/statistics\?workspace=tools$/.test(page.url()), '2 a card opens the world’s home', page.url());
await go('#/tools/world/nowhere');
ok(/Category not found/.test(await page.locator('.pace-head h1').innerText()), '2 an unknown world says so');

/* 3 */
await go('#/tools/world/statistics');
ok(flat(await page.locator('.pace-head h1').innerText()) === S.name && flat(await page.locator('.pace-lede').innerText()) === S.line, '3 its name and its line');
ok(await page.locator('[data-fold="world-coverage"].is-open').count() === 0 && await page.locator('.wd-item').count() === 0, '3 technical coverage starts secondary; the working tools remain visible');
await unfold(page, 'world-coverage');
const count = flat(await page.locator('[data-counts]').innerText());
ok(count.includes(`${S.t.tools} tools to open in this world`) && count.includes(`${S.t.inside + S.t.parts} methods built`) && count.includes(`${S.t.notBuilt} not built yet`) && count.includes(`${S.entries} entries are catalogued here in all`), `3 the count sentence as the catalogue counts it — "${count.slice(0, 160)}"`, count);
const toolCards = page.locator('.wd-sec[aria-label="The tools of this world"] .tc-card');
ok((await toolCards.count()) === S.tools.length && ['capability', 'chart', 'analysis'].every(k => S.tools.some(t => t.key === k)) && !S.tools.some(t => t.key === 'valuestream'), `3 a card for each of its ${S.tools.length} tools — Capability, Control chart, Analysis, and no value stream`);
await page.locator('.tc-card[data-tool="chart"] .tc-open').click(); await page.waitForTimeout(1500);
ok(/#\/tools\/chart\?workspace=tools$/.test(page.url()), '3 a tool’s card opens its own page', page.url());

/* 4 */
await go('#/tools/world/statistics');
ok(await page.locator('[aria-label="Start from a question"]').count() === 0, '4 a category leads directly to tools without a question detour');
ok(await page.locator('.tc-card').count() === S.tools.length, '4 all working tools stay directly available');

/* 5 */
await go('#/tools/world/statistics');
await unfold(page, 'world-coverage');
const items = await page.locator('.wd-item').evaluateAll(els => els.map(e => ({ id: e.getAttribute('data-id'), status: e.getAttribute('data-status'), text: e.innerText.replace(/\s+/g, ' ') })));
ok(items.length === S.entries && S.held.every(h => items.some(i => i.id === h.id && i.status === h.status)), `5 every entry it holds — ${items.length}, each with its status`);
ok(items.every(i => /Available|Partly|Planned|Not built yet|Research first|Left out/.test(i.text)), '5 each says its status in a word');
const ny = flat(await page.locator('.wd-sec[aria-label="What is not built yet"]').innerText().catch(() => ''));
ok(S.notYet ? ny.includes(`${S.notYet} thing`) || ny.includes(`${S.notYet} things`) : !ny, `5 Not built yet counts them — ${S.notYet}`, ny);
await page.locator('.wd-item[data-id="FC-094"] .wd-item-b').click(); await page.waitForTimeout(1500);
ok(/#\/tools\/FC-094\?workspace=tools$/.test(page.url()) && flat(await page.locator('.pace-head h1').innerText()) === 'Capability', '5 an entry opens its tool’s page (a mode opens its parent’s, itself marked)', page.url());

/* 6 */
await go('#/tools/world/statistics');
await page.locator('.wd-others .chip', { hasText: 'Lean' }).click(); await page.waitForTimeout(1500);
ok(/#\/tools\/world\/lean\?workspace=tools$/.test(page.url()) && flat(await page.locator('.pace-head h1').innerText()) === 'Lean', '6 the other worlds one tap away', page.url());
ok(flat(await page.locator('.nv-rail .nv-ri.is-on').innerText()) === 'Tools', '6 the rail keeps Tools selected inside a category');
await go('#/tools/world/quality');
const Q = mod.worlds.find(w => w.id === 'quality');
ok(Q.tools.some(t => t.key === 'logs') && (await page.locator('.wd-sec[aria-label="The tools of this world"] .tc-card[data-tool="logs"]').count()) === 1, '6 Check logs opens in Quality and food safety — most of what is in it is food safety’s');
await go('#/tools/world/projects');
ok(await page.locator('.pace-head h1').innerText() === 'Improvement' && await page.locator('.tc-card[data-tool="sixm"]').count() === 1, '6 Improvement contains 6M and the other methods, distinct from managing projects');
await go('#/tools/world/equipment');
const E = mod.worlds.find(w => w.id === 'equipment');
ok((await page.locator('.wd-sec[aria-label="The tools of this world"] .tc-card').count()) === E.tools.length && E.tools.length >= 2, `6 Equipment’s tools — ${E.tools.map(t => t.label).join(', ')}`);

const P = await mk({ width: 375, height: 800 });
const pp = P.page;
for (const h of ['#/tools', '#/tools/world/statistics', '#/tools/world/quality']) {
  await pp.goto(`${BASE}/${h}`); await pp.waitForTimeout(2500);
  ok(!(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `6 the phone: ${h} — nothing off the side`);
  if(h.includes('/world/')){await unfold(pp, 'world-coverage');ok(await pp.locator('.wd-item').count()>0 && !(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '6 the phone: every method remains readable when coverage is opened');await pp.locator('.nv-bar .nv-bi').filter({hasText:/^Tools$/}).click();await pp.waitForURL(/#\/tools(?:\?|$)/);ok(true,'6 the phone: Tools returns to the library in one press, without a return menu');}
}
const errs = [...D.errs, ...P.errs];
ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\nTool worlds NOT accepted: ${fail} failed` : '\nTool categories accepted: direct working tools, truthful counts, all method references retained.');
process.exit(fail ? 1 : 0);
