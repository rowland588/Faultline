/* THE ONE HOME, DRIVEN — as it is since 23 October (Rowland: "What's the point of home? ... The control
 * room, is it required? ... I literally start using it and I've got no idea where I am. I lose myself";
 * the shape chosen: one home, a fixed menu). The front door that stood at #/ (20 October) is gone: its
 * three kinds of change are New project's, its tools the Tools page's, its places the Factory page's.
 *
 * From an empty device:
 *
 *   1  #/ is the Factory page — its name, the menu (Factory · Projects · Problems · Actions · Tools,
 *      Reports at the foot) with Factory lit, its own tabs (Overview · Lines · Machines · Programs — Machines since 27 October) and the bar
 *      saying Factory › Overview; no question, no front door
 *   2  Projects from the menu: New project offers the three kinds of change by their situations, the
 *      stage gate picked; the project made opens with its own tabs, the menu the same with Projects
 *      lit, the bar starting ‹ Projects; that link back lands on Projects, listing it
 *   3  a line from the Factory's Lines: its tabs, Factory lit, ‹ Factory back to the Factory page
 *   4  the Factory page carries you back to where you were — the project and the line, each one tap
 *   5  old links (#/start, #/methods, #/design) land on the Factory page
 *   6  the phone: the bar Factory · Projects · ＋ · Problems · More on every page, the tabs across the
 *      top, nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/front-door.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main h1').first().waitFor({ timeout: 15000 }).catch(() => {}); await page.waitForTimeout(700); };
/* the menu, the same everywhere; the place you are in (a line under Factory, a project under Projects — 27 October) is `place` */
const menu = async () => (await page.locator('.nv-rail .nv-ri:not(.is-place)').allInnerTexts()).map(flat);
const place = async () => (await page.locator('.nv-rail .nv-ri.is-place').allInnerTexts()).map(flat);
const lit = async () => (await page.locator('.nv-rail .nv-ri.is-on').allInnerTexts()).map(flat);
const tabs = async () => (await page.locator('.nv-tabs .nv-tab').allInnerTexts()).map(flat);
const tabOn = async () => flat(await page.locator('.nv-tabs .nv-tab.is-on').innerText().catch(() => ''));
const bar = async () => flat(await page.locator('.nv-ctx').innerText().catch(() => ''));
const h1 = async () => flat(await page.locator('.nv-main h1').first().innerText().catch(() => ''));
const MENU = 'Factory · Projects · Problems · Actions · Tools · Reports';

/* 1 — an empty device: #/ is the Factory page */
await go('#/');
ok(await h1() === 'Factory', '1 #/ is the Factory page', await h1());
ok((await menu()).join(' · ') === MENU && (await lit()).join() === 'Factory', '1 the menu, Factory lit', `${(await menu()).join(' · ')} | ${(await lit()).join()}`);
ok((await tabs()).join(' · ') === 'Overview · Lines · Machines · Programs' && await tabOn() === 'Overview', '1 the factory\'s own tabs, Overview on', (await tabs()).join(' · '));
ok(/^Factory ›? ?Overview$/.test((await bar()).replace(/\s*›\s*/g, ' › ').replace('Factory › Overview', 'Factory › Overview')) || /Factory.*Overview/.test(await bar()), '1 the bar says Factory › Overview', await bar());
ok(await page.locator('.fd-ask, .fd-lib, .fd-tools').count() === 0 && !/What do you need to get done/.test(await page.locator('.nv-main').innerText()), '1 no front door, no question');

/* 2 — Projects from the menu: a project made, its tabs, the way back */
await page.locator('.nv-rail .nv-ri', { hasText: 'Projects' }).click(); await page.waitForTimeout(800);
ok(/#\/projects/.test(page.url()) && (await lit()).join() === 'Projects', '2 Projects from the menu, lit', `${page.url()} | ${(await lit()).join()}`);
await go('#/projects?new=1');
const kinds = (await page.locator('.proj-model-opt .proj-model-runs b').allInnerTexts()).map(flat);
const sits = (await page.locator('.proj-model-opt .proj-model-t').allInnerTexts()).map(flat).join(' | ');
ok(kinds.join(' · ') === 'Stage gate · 6M · Lever tree' && /Bring new equipment into use/.test(sits) && /Make a running line perform better/.test(sits) && /Hit a number by a date/.test(sits),
  '2 New project offers the three kinds of change by their situations', `${kinds.join(' · ')} | ${sits}`);
await page.locator('.proj-model-opt', { hasText: 'Stage gate' }).click();
await page.locator('.proj-new-grid input.text-input').first().fill('Line 4 new case packer');
await page.getByRole('button', { name: 'Create and add the machines' }).click(); await page.waitForTimeout(1500);
ok(/#\/project\/[^/]+/.test(page.url()), '2 the project made and opened', page.url());
const projectAt = page.url().match(/#\/project\/[^/?]+/)[0];
await go(projectAt);
ok((await menu()).join(' · ') === MENU && (await lit()).join() === 'Line 4 new case packer' && (await place()).join() === 'Line 4 new case packer', '2 inside it, the same menu, the project named under Projects and lit', `${(await menu()).join(' · ')} | ${(await lit()).join()}`);
const ptabs = await tabs();
/* a stage gate's own pages are four tabs and More since 26 October (docs/STAGEGATE-RESEARCH.md §4) */
ok(ptabs.map(t => t.replace(/\d.*$/, '').trim()).join(' · ') === 'Now · Machines · Problems · Reports · More' && await tabOn() === 'Now', '2 its own pages as tabs — Now · Machines · Problems · Reports · More, Now on', `${ptabs.join(' · ')} [${await tabOn()}] ${page.url()}`);
ok(/^Projects › Line 4 new case packer/.test(await bar()), '2 the bar starts with the way back: ‹ Projects', await bar());
await page.locator('.nv-tabs .nv-tab', { hasText: 'Problems' }).click(); await page.waitForTimeout(900);
ok(/^Problems/.test(await tabOn()) && (await lit()).join() === 'Line 4 new case packer', '2 a tab opens its page, the menu unmoved', `${await tabOn()} | ${(await lit()).join()}`);
await page.getByRole('button', { name: 'Back to Projects' }).click(); await page.waitForTimeout(900);
ok(/#\/projects$/.test(page.url()) && /Line 4 new case packer/.test(await page.locator('.nv-main').innerText()), '2 ‹ Projects lands on Projects, listing it', page.url());

/* 3 — a line: made on Lines, its tabs, the way back */
await go('#/factory');
ok(await tabOn() === 'Lines' && (await lit()).join() === 'Factory', '3 Lines is the Factory\'s tab, Factory lit', `${await tabOn()} | ${(await lit()).join()}`);
await page.getByRole('button', { name: 'Add lines' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel("The new line's name").fill('Line 9');
await page.getByRole('button', { name: 'Add line' }).click(); await page.waitForTimeout(900);
await go('#/factory');
await page.locator('li.fac-line[data-line="Line 9"]').getByRole('button', { name: 'Open ›' }).click(); await page.waitForTimeout(1200);
ok(/#\/lines\//.test(page.url()), '3 a line opened from Lines', page.url());
const ltabs = await tabs();
ok(ltabs.join(' · ') === 'Overview · Machines · Problems · Programs · Tools · Set up' && await tabOn() === 'Overview', '3 its own pages as tabs, Overview on (Machines its own, 27 October)', ltabs.join(' · '));
ok((await menu()).join(' · ') === MENU && (await lit()).join() === 'Line 9', '3 the same menu, the line named under Factory and lit', (await lit()).join());
ok(/^Factory › Line 9/.test(await bar()), '3 the bar starts with the way back: ‹ Factory', await bar());
await page.locator('.nv-tabs .nv-tab', { hasText: 'Programs' }).click(); await page.waitForTimeout(900);
ok(await tabOn() === 'Programs' && /line=/.test(page.url()) && (await lit()).join() === 'Line 9', '3 its Programs tab, still in the line', `${await tabOn()} | ${page.url()}`);
await page.getByRole('button', { name: 'Back to the factory' }).click(); await page.waitForTimeout(900);
ok(await h1() === 'Factory' && (await lit()).join() === 'Factory', '3 ‹ Factory lands on the Factory page', await h1());

/* 4 — where you were, one tap back */
const places = (await page.locator('.fd-places li').allInnerTexts()).map(flat);
ok(places.some(p => /Line 4 new case packer/.test(p)) && places.some(p => /^Line 9/.test(p)), '4 the Factory page carries the project and the line you were in', places.join(' | '));
await page.locator('.fd-places li', { hasText: 'Line 4 new case packer' }).locator('button').click(); await page.waitForTimeout(1000);
ok(/#\/project\//.test(page.url()) && (await lit()).join() === 'Line 4 new case packer', '4 one tap back into the project', page.url());

/* 5 — old links land on the Factory page */
for (const old of ['#/start', '#/methods', '#/methods/some-method', '#/design?say=Line%202%20keeps%20stopping']) {
  await go(old);
  ok(await h1() === 'Factory', `5 an old link (${old}) lands on the Factory page`, await h1());
}

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 800 });
const BAR = 'Factory · Projects · Problem · Problems · More';
for (const h of ['#/', '#/projects', '#/factory', projectAt]) {
  await go(h);
  const five = (await page.locator('.nv-bar .nv-bi').allInnerTexts()).map(flat).join(' · ');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(five === BAR && wide <= 1, `6 the phone (${h}): the same bar, nothing off the side`, `${five} | ${wide}px`);
}
await go('#/projects');
const proj = page.locator('.nv-main a, .nv-main button', { hasText: 'Line 4 new case packer' }).first();
await proj.click(); await page.waitForTimeout(1200);
ok(await page.locator('.nv-tabs .nv-tab').count() > 3 && await page.getByRole('button', { name: 'Back to Projects' }).isVisible(), '6 the phone: a project\'s tabs across the top, ‹ Projects in the bar');

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
