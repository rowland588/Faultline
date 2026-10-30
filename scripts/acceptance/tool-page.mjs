/* The tools gallery and a tool's own page (docs/TOOLS-SHOWCASE.md, TG1–TG2 — Rowland, 30 October: "scroll through the
 * tools, pick one, view it on a full page that tells me what the tool can be used for ... thumbnail pictures").
 *
 *   1  Tools opens on a gallery: a card for every app tool, each with a picture (or its drawn tile), a name and a line
 *   2  the kind chips narrow it and say how many; All brings every tool back
 *   3  a card opens the tool's own page — the name, what it is for, the questions, what it needs and gives, inside it,
 *      where it stands — every sentence the catalogue's; Open › opens the list as the old row did
 *   4  Start one on the page lands on the tool's list ready to add; See mine on its list
 *   5  ← → and the foot move between the tools, wrapping, "n of 15"
 *   6  a mode's number opens its parent's page with itself marked; a planned entry its own page, no Start
 *   7  an unknown key says so; a route sent from a page preselects it on Tools
 *   8  the phone — the gallery scrolls sideways, a card and the edge of the next, nothing off the side
 *
 *   node scripts/acceptance/tool-page.mjs      (SMOKE_BASE, as smoke) */
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
const mod = await (async () => { await go('#/tools'); return page.evaluate(async () => { const r = await import('/src/catalogue/registry.ts'); const c = await import('/src/catalogue/index.ts'); return { tools: r.APP_TOOLS.map(t => ({ key: t.key, label: t.label, says: t.says, kind: t.kind, id: t.id })), cap: c.entryById('FC-094') ? { q: c.entryById('FC-094').questions, problem: c.entryById('FC-094').problem, food: c.entryById('FC-094').food } : null, modes: c.ENTRIES.filter(e => e.partOf === 'FC-094' && e.status !== 'left-out').length, planned: c.ENTRIES.find(e => e.status === 'to-build' && !e.partOf)?.id }; }); })();
const N = mod.tools.length;

/* 1 */
const cards = page.locator('.et-now .tc-card');
await cards.first().waitFor({ timeout: 15000 });   // under load the page can take longer than a fixed pause
ok((await cards.count()) === N && N >= 15, `1 a card for every app tool — ${N}`, await cards.count());
const names = (await page.locator('.et-now .tc-card .tc-name').allInnerTexts()).map(flat);
ok(mod.tools.every(t => names.includes(t.label)), '1 each named as the registry names it');
const says = (await page.locator('.et-now .tc-card .tc-says').allInnerTexts()).map(flat);
ok(mod.tools.every(t => says.includes(t.says)), '1 each saying what it is for, in the registry’s words');
ok((await page.locator('.et-now .tc-card .tc-pic').count()) === N, '1 every card has its picture or its drawn tile');
ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '1 nothing off the side at desk');

/* 2 */
const chip = n => page.locator('[aria-label="Kind of tool"] .chip', { hasText: n });
const studies = mod.tools.filter(t => t.kind === 'study').length;
await chip(/^Studies/).click(); await page.waitForTimeout(200);
ok((await cards.count()) === studies && /Studies\s+\d+/.test(flat(await chip(/^Studies/).innerText())) && flat(await chip(/^Studies/).innerText()).endsWith(String(studies)), `2 Studies — ${studies} cards, the chip says so`, await cards.count());
await chip(/^All/).click(); await page.waitForTimeout(200);
ok((await cards.count()) === N, '2 All brings every tool back');

/* 3 */
const cap = mod.tools.find(t => t.key === 'capability');
await page.locator('.tc-card[data-tool="capability"] .tc-main').click(); await page.waitForTimeout(1800);
ok(/#\/tools\/capability$/.test(page.url()), '3 a card opens the tool’s own page', page.url());
ok(flat(await page.locator('.pace-head h1').innerText()) === cap.label && flat(await page.locator('.pace-lede').innerText()) === cap.says, '3 its name and what it is for');
const qs = (await page.locator('.tp-qs li').allInnerTexts()).map(flat);
ok(JSON.stringify(qs) === JSON.stringify(mod.cap.q), '3 the questions it answers, the catalogue’s', qs.join(' | '));
ok(flat(await page.locator('.tp-sec[aria-label="What you can use it for"] .tp-lede').innerText()) === flat(mod.cap.problem), '3 the problem in the floor’s words');
ok(flat(await page.locator('.tp-sec[aria-label="What you can use it for"] .sub').innerText()).includes(flat(mod.cap.food)), '3 an example on a food line');
ok(/nothing reads a machine/.test(await page.locator('.tp-io').innerText()), '3 what you give it and what you get — by a person, never a sensor');
ok((await page.locator('.tp-modes li').count()) === mod.modes && mod.modes >= 5, `3 inside it — its ${mod.modes} modes, each with its status in words`, await page.locator('.tp-modes li').count());
ok((await page.locator('.tp-modes .et-st').allInnerTexts()).every(t => /Available|Partly|Planned|Not built yet|Research first/.test(t)), '3 every mode says its status in a word');
ok((await page.locator('.tp-sec[aria-label="Where it stands"]').count()) === 1, '3 where it stands and what it does not do yet');
await go('#/tools'); await page.locator('.tc-card[data-tool="capability"] .tc-open').click(); await page.waitForTimeout(1500);
ok(/#\/capability/.test(page.url()), '3 Open › opens the tool’s list as the old row did', page.url());

/* 4 */
await go('#/tools/capability');
await page.getByRole('button', { name: 'Start one', exact: true }).click(); await page.waitForTimeout(1500);
ok(/#\/capability.*add=1/.test(page.url()), '4 Start one lands on the tool’s list ready to add', page.url());
await go('#/tools/capability');
await page.locator('.pace-head-actions').getByRole('button', { name: /^More/ }).click(); await page.waitForTimeout(200);
await page.getByRole('menuitem', { name: 'See mine' }).click().catch(async () => { await page.getByText('See mine', { exact: true }).click(); }); await page.waitForTimeout(1200);
ok(/#\/capability(\?|$)/.test(page.url()) && !/add=1/.test(page.url()), '4 See mine opens its list', page.url());

/* 5 */
await go('#/tools/capability');
const i = mod.tools.findIndex(t => t.key === 'capability');
ok(/\bof\b/.test(flat(await page.locator('.tp-pn .sub').innerText())) && flat(await page.locator('.tp-pn .sub').innerText()).startsWith(`${i + 1} of ${N}`), `5 “${i + 1} of ${N}”`, await page.locator('.tp-pn .sub').innerText());
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1200);
ok(page.url().endsWith(`/tools/${mod.tools[(i + 1) % N].key}`), '5 → moves to the next tool', page.url());
await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1200);
ok(page.url().endsWith('/tools/capability'), '5 ← moves back', page.url());
await go(`#/tools/${mod.tools[0].key}`); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1200);
ok(page.url().endsWith(`/tools/${mod.tools[N - 1].key}`), '5 ← from the first wraps to the last', page.url());

/* 6 */
await go('#/tools/FC-100');
ok(flat(await page.locator('.pace-head h1').innerText()) === cap.label && (await page.locator('.tp-modes li.is-here').count()) === 1 && /FC-100/.test(await page.locator('.tp-modes li.is-here').innerText()), '6 a mode’s number opens its parent’s page with itself marked');
await go(`#/tools/${mod.planned}`);
ok((await page.getByRole('button', { name: 'Start one', exact: true }).count()) === 0 && /Not built yet|Planned|research/i.test(await page.locator('.tp-hero-side').innerText()), `6 ${mod.planned}, not built: its own page, honest, no Start`);

/* 7 */
await go('#/tools/nonsense');
ok(/Tool not found/.test(await page.locator('.pace-head h1').innerText()), '7 an unknown key says so');
await go('#/tools/capability'); await page.locator('.tp-routes button').first().click(); await page.waitForTimeout(1500);
ok(/#\/tools\?route=/.test(page.url()) && (await page.locator('.et-route').count()) === 1, '7 a route from the page opens on Tools, preselected', page.url());

ok(!D.errs.length, `no console error at desk${D.errs.length ? `: ${D.errs.slice(0, 3).join(' | ')}` : ''}`);
await D.ctx.close();

/* 8 */
const P = await mk({ width: 375, height: 760 });
await P.page.goto(`${BASE}/#/tools`); await P.page.waitForTimeout(2500);
const m8 = await P.page.evaluate(() => { const g = document.querySelector('.tc-gal'); const c = g.querySelectorAll('.tc-cell'); const r = c[0].getBoundingClientRect(), r2 = c[1].getBoundingClientRect();
  return { scrolls: g.scrollWidth > g.clientWidth + 8, first: Math.round(r.width), second: Math.round(r2.left), vw: innerWidth, page: document.documentElement.scrollWidth > innerWidth + 1 }; });
ok(m8.scrolls && m8.first < m8.vw && m8.second < m8.vw, `8 the gallery scrolls sideways, a card and the edge of the next (${m8.first}px wide, next at ${m8.second} of ${m8.vw})`, JSON.stringify(m8));
ok(!m8.page, '8 nothing off the side of the page');
await P.page.goto(`${BASE}/#/tools/capability`); await P.page.waitForTimeout(2200);
ok(!(await P.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '8 a tool’s page, nothing off the side');
ok(await P.page.getByRole('button', { name: 'Start one', exact: true }).isVisible(), '8 Start one reachable on the phone');
ok(!P.errs.length, `no console error on the phone${P.errs.length ? `: ${P.errs.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\nTool page NOT accepted: ${fail} failed` : '\nTool gallery and page accepted: a picture and a page for every tool, each saying what it is for in the catalogue’s words; scrolled, picked, moved between; the phone fits.');
process.exit(fail ? 1 : 0);
