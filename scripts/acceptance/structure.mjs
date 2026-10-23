/* THE STRUCTURE, ACCEPTED (docs/STRUCTURE.md §18) — slice by slice, each adding what it promised.
 *
 * B0 — what a person may be offered: inside a project, the Problem button (the top bar at a desk,
 * the round one on a phone) only for somebody who may change the project's work; a client — who
 * may read it and take its reports — is offered none, because a client's rows are never sent to
 * the cloud (src/cloud/sync.ts) and a problem saved by one stayed on that device alone, silently
 * (found 22 October). Off a project the button is there as before. And the problem sheet, opened
 * from a row, says so and holds Save when the project it is for is one the person may only read.
 *
 * B2 — the scope frame: on every page in docs/PAGES.md, at desk and phone, the context bar names
 * the place (the factory, a line or a project); since 23 October (one home, a fixed menu) the rail is
 * one menu on every page — Factory · Projects · Problems · Actions · Tools, Reports at the foot — and a
 * scope's own pages are tabs across the top, never above their size (the factory 3, a line 9, a
 * project 18 with its machines one tap from its front page); the phone's bar is the same five on
 * every page; ＋ is a problem where you are in one tap; and, with 30 more lines and 50 more projects
 * on the device, the menu is still 6 lines and any line or project is found by the switcher in
 * three keystrokes.
 *
 * The access level is forced the way the app allows in development (cloud/access:
 * localStorage['faultline.access.force']), so the same seeds are walked as a team member and as
 * a client.
 *
 *     node scripts/acceptance/structure.mjs        a dev server on 5191 (SMOKE_BASE) */
import pkg from 'playwright';
import { PAGES } from '../inventory/pages.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [];

/** A device at a width, as a team member or a client; the seeds made once on its first page. */
async function device(width, access) {
  const ctx = await b.newContext({ viewport: { width, height: width < 900 ? 844 : 900 }, hasTouch: width < 900, serviceWorkers: 'block' });
  await ctx.addInitScript(([k, s, a]) => {
    try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* fine */ }
  }, [`sb-${REF}-auth-token`, SESSION, access]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1600); };
  await go('#/room');
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  return { ctx, page, go, sd };
}
const topProblem = page => page.locator('.nv-top .qs-top');
/* the phone's ＋ in the middle of the bar — the round button's place since B2 (docs/STRUCTURE.md D6) */
const fab = page => page.locator('.nv-bar .nv-bi.is-plus');
const shown = async l => (await l.count()) > 0 && await l.first().isVisible();

/* ---- B0 · 1 a team member: offered a problem everywhere ---- */
{
  const { ctx, page, go, sd } = await device(1360, 'team');
  await go(`#/project/${sd.projectId}`);
  ok(await shown(topProblem(page)), 'B0 1 a team member inside a project: Problem in the top bar');
  await go('#/room');
  ok(await shown(topProblem(page)), 'B0 1 a team member on the control room: Problem in the top bar');
  await ctx.close();
}
{
  const { ctx, page, go, sd } = await device(390, 'team');
  await go(`#/project/${sd.projectId}`);
  ok(await shown(fab(page)), 'B0 1 a team member on a phone, inside a project: ＋ on the bar');
  await ctx.close();
}

/* ---- B0 · 2 a client: offered none inside a project they may only read ---- */
{
  const { ctx, page, go, sd } = await device(1360, 'client');
  for (const [where, hash] of [['its front page', `#/project/${sd.projectId}`], ['its Actions', `#/project/${sd.projectId}/actions`], ['a 6M project', `#/project/${sd.pacedProjectId}`]]) {
    await go(hash);
    ok(!(await shown(topProblem(page))) && !(await shown(fab(page))), `B0 2 a client on ${where}: no Problem offered`);
  }
  await go('#/room');
  ok(await shown(topProblem(page)), 'B0 2 a client off a project (the control room): Problem offered as before — the database decides');
  /* the sheet, opened from the top bar off a project, with the client's project chosen: said, and Save held */
  await topProblem(page).click(); await page.waitForTimeout(800);
  const sheet = page.locator('.sheet, [role=dialog]').filter({ has: page.getByLabel('Which project') }).first();
  await sheet.getByLabel('Which project').selectOption(sd.projectId); await page.waitForTimeout(400);
  const words = sheet.locator('textarea, input[type=text]').first();
  if (await words.count()) await words.fill('A guard is loose');
  const said = flat(await sheet.locator('.qs-ro').innerText().catch(() => ''));
  const save = sheet.getByRole('button', { name: /^Save$/ });
  ok(/^You can read .+; its problems are taken by its team\.$/.test(said) && await save.isDisabled(), `B0 2 the sheet with the client's project chosen: "${said}", Save held`);
  await sheet.getByLabel('Which project').selectOption(''); await page.waitForTimeout(300);
  ok(!(await sheet.locator('.qs-ro').count()), 'B0 2 no project chosen: nothing said, Save as before');
  await ctx.close();
}
{
  const { ctx, page, go, sd } = await device(390, 'client');
  await go(`#/project/${sd.projectId}`);
  ok(!(await shown(fab(page))), 'B0 2 a client on a phone, inside a project: no ＋ on the bar');
  await ctx.close();
}

/* ---- B2 · 1 every page: the place named, the menu the same everywhere, the scope's own pages its tabs within their size ----
   Since 23 October (one home, a fixed menu — Rowland: "I literally start using it and I've got no idea where I am") the
   rail and the phone's bar are one menu on every page; a scope's own pages are the tabs across the top. */
const LIMIT = { factory: 3, line: 9, project: 18 };
const MENU = 'Factory · Projects · Problems · Actions · Tools · Reports';
const ONE_BAR = 'Factory · Projects · Problem · Problems · More';
for (const width of [1360, 390]) {
  const { ctx, page, go, sd } = await device(width, 'team');
  const names = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    return { lines: (await db.listWorkspaces()).map(w => w.name), projects: (await db.allProjects()).map(p => p.name) };
  });
  const scopeOf = n => (n === 'Home' ? 'home' : n === 'Factory' ? 'factory' : names.lines.includes(n) ? 'line' : names.projects.includes(n) ? 'project' : '');
  const unnamed = [], over = [], bars = {}, offBar = [];
  for (const pg of PAGES(sd, undefined)) {
    if (/undefined/.test(pg.path)) continue;
    await go(pg.path);
    const got = await page.evaluate(() => {
      const vis = e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none';
      return {
        scope: document.querySelector('.nv-top .nv-ctx .nv-job-l')?.textContent?.trim() ?? '',
        said: [...document.querySelectorAll('.nv-top .nv-ctx .nv-job-l, .nv-top .nv-ctx .nv-crumb')].filter(vis).map(e => e.textContent.trim()).join(' › '),
        rail: [...document.querySelectorAll('.nv-rail .nv-ri')].map(e => ({ l: e.querySelector('.nv-ri-l')?.textContent?.trim(), sub: e.classList.contains('is-sub') })),
        tabs: [...document.querySelectorAll('.nv-tabs .nv-tab .nv-tab-l')].map(e => e.textContent.trim()),
        bar: [...document.querySelectorAll('.nv-bar .nv-bi .nv-bi-l')].filter(vis).map(e => e.textContent.trim()).join(' · '),
      };
    });
    const kind = scopeOf(got.scope);
    if (!kind) { unnamed.push(`${pg.name}: "${got.said}"`); continue; }
    if (kind === 'home') continue;
    const menu = got.rail.map(l => l.l).join(' · ');
    if (width > 900 && (menu !== MENU || got.tabs.length > LIMIT[kind])) over.push(`${pg.name} (${kind}): menu ${menu}; tabs ${got.tabs.length} — ${got.tabs.join(', ')}`);
    if (width < 900) {
      (bars.all ??= new Set()).add(got.bar);
      if (got.bar !== ONE_BAR) offBar.push(`${pg.name}: ${got.bar}`);
    }
  }
  const tag = width > 900 ? 'desk' : 'phone';
  ok(!unnamed.length, `B2 1 ${tag}: every page in PAGES.md names its place — Home, the factory, a line or a project`, unnamed.join(' | '));
  if (width > 900) ok(!over.length, 'B2 1 desk: the menu the same on every page, a scope’s own pages its tabs within their size (factory 3, line 9, project 18)', over.join(' | '));
  else ok(!offBar.length && bars.all?.size === 1, `B2 1 phone: the bar the same five on every page — ${[...(bars.all ?? [])].join(' / ')}`, offBar.join(' | '));
  await ctx.close();
}

/* ---- B2 · 2 ＋ is a problem where you are, in one tap — on a line, the line set ---- */
{
  const { ctx, page, go, sd } = await device(390, 'team');
  await go(`#/lines/${sd.line7WsId}`);
  await fab(page).click(); await page.waitForTimeout(800);
  const sheet = page.locator('.sheet, [role=dialog]').last();
  const line = await sheet.getByLabel('Which line').first().evaluate(e => e.options[e.selectedIndex]?.text).catch(() => '');
  ok(await sheet.locator('textarea').first().isVisible() && line === 'Line 7', `B2 2 ＋ on Line 7: the problem form at once, on ${line || '?'}`);
  await ctx.close();
}

/* ---- B2 · 3 still small as it grows: 30 more lines, 50 more projects ---- */
{
  const { ctx, page, go } = await device(1360, 'team');
  await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    for (let i = 1; i <= 30; i++) await db.createWorkspace(`Scale line ${i}`);
    for (let i = 1; i <= 50; i++) await db.createProject(`Scale project ${i}`, '#0c7489');
  });
  await go('#/room');
  const rail = await page.locator('.nv-rail .nv-ri').count();
  ok(rail === 6, `B2 3 the menu with 30 more lines and 50 more projects: ${rail} lines, as ever`);
  const found = [];
  for (const [name, keys] of [['Scale line 29', '29'], ['Scale project 47', '47'], ['Line 7 pace', 'pac'], ['Line 2 commissioning', 'com']]) {
    await page.locator('.nv-top .nv-job').click(); await page.waitForTimeout(400);
    await page.keyboard.type(keys); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
    const at = (await page.locator('.nv-top .nv-ctx .nv-job-l').innerText()).trim();
    found.push(`${keys.length} keys "${keys}" → ${at}`);
    if (at !== name) found.push(`  (wanted ${name})`);
    await go('#/room');
  }
  ok(!found.some(f => f.includes('wanted')) && found.every(f => Number(f.split(' ')[0]) <= 3), `B2 3 the switcher: any line or project in three keystrokes — ${found.join('; ')}`);
  await ctx.close();
}

ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\nThe structure NOT accepted: ${fail} failed` : '\nThe structure accepted (B0, B2): a problem offered only to somebody who may change the project\'s work, a client offered none inside it; every page naming its place, each scope\'s rail its own and within its size, the phone\'s bar fixed in a scope, ＋ in one tap, and the switcher finding any line or project in three keystrokes at scale.');
process.exit(fail ? 1 : 0);
