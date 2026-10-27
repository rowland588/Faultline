/* WHERE AM I — THE SCREEN NAMES THE PLACE, AND NO WORD MEANS TWO PLACES (Rowland, 27 October: "Where am I?
 * Overview? No, I'm still confused ... There is no clear way for me to understand and navigate ... where I am,
 * where I'm going"; the six changes agreed — "Do it").
 *
 * On the seeded factory, line and stage-gate project:
 *
 *   A  the menu names the place: inside a line its name under Factory, lit, and Factory not; inside a project its
 *      name under Projects; the factory's own pages light Factory and name nothing under it
 *   B  a line's Programs is that line's — named in its band, no other line's chip to wander off by, every line's
 *      programs one tap up in the Factory, where the chips still narrow the list; a line's Problems has no line picker
 *   C  a line has a Machines tab, each name opening the machine's page, that page lighting Machines; the Overview's
 *      machine cards open the same page
 *   D  one name, Factory: its Overview's line cards under Lines, each saying Open; the Lines page titled Lines; no
 *      "Your factory" on any of them
 *   E  a project's machine page goes to the same machine on its line — every project's work on it
 *   F  the bar: Factory › the place › the page, the place's name opening its first page; Go to ▾ the picker of lines
 *      and projects
 *   G  the Factory has a Machines tab (Rowland, 27 October: "Why don't I see machines?") — every line in floor order,
 *      its machines in flow order, each with who made it, its project, its programs and what is open, as
 *      lib/factoryMachines reads them; a row opens the machine's page on its line; its paper says the same
 *   H  a project's Machines tab opens on its machines, a row each, as Now reads them — the gates, the timeline and
 *      Programs the tabs beside it; a row opens the machine's page in the project
 *   and on a phone nothing off the side, and no console error anywhere.
 *
 *   node scripts/acceptance/where-am-i.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); };
const main = () => page.locator('.nv-main');
/** The menu's lines as drawn, and the one lit. */
const menu = async () => ({
  said: (await page.locator('.nv-rail .nv-ri .nv-ri-l').allInnerTexts()).map(flat),
  lit: (await page.locator('.nv-rail .nv-ri[aria-current="page"] .nv-ri-l').allInnerTexts()).map(flat),
});
const bar = async () => flat(await page.locator('.nv-ctx').innerText());
const tabOn = async () => flat(await page.locator('.nv-tab[aria-current="page"]').first().innerText().catch(() => ''));

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WS = sd.wsId, PID = sd.projectId;
const names = await page.evaluate(async ([ws, pid]) => {
  const db = await import('/src/db.ts');
  const { getDB } = await import('/src/db/core.ts');
  const line = await db.getWorkspace(ws);
  const job = await db.getProject(pid);
  const asset = (await (await getDB()).getAll('commission_assets')).find(a => a.projectId === pid && !a.deletedAt);
  return { line: line.name, job: job.name, asset: asset.id, machine: asset.name };
}, [WS, PID]);

/* ---- A · the menu names the place ---- */
{
  let m = await menu();
  ok(m.lit.join() === 'Factory' && !m.said.includes(names.line), `A1 the factory's Overview lights Factory and names no line (${m.said.join(' · ')})`);
  await go(`#/lines/${WS}`);
  m = await menu();
  ok(m.said.indexOf(names.line) === m.said.indexOf('Factory') + 1 && m.lit.join() === names.line, `A2 inside a line: its name under Factory, lit, Factory not (${m.said.join(' · ')} — lit ${m.lit.join()})`);
  await go(`#/project/${PID}`);
  m = await menu();
  ok(m.said.indexOf(names.job) === m.said.indexOf('Projects') + 1 && m.lit.join() === names.job, `A3 inside a project: its name under Projects, lit (${m.said.join(' · ')} — lit ${m.lit.join()})`);
  await go(`#/lines/${WS}`);
  await page.locator('.nv-rail .nv-ri', { hasText: 'Factory' }).first().click(); await page.waitForTimeout(1500);
  ok(/#\/room$/.test(page.url()), `A4 Factory in the menu goes up to the factory (${page.url().split('#')[1]})`);
}

/* ---- B · a line's Programs and Problems stay on the line ---- */
{
  await go(`#/programs?line=${WS}`);
  const eyebrow = flat(await main().locator('.pl-eyebrow').first().innerText());
  ok(eyebrow === `${names.line.toUpperCase()} · PROGRAMS` && await tabOn() === 'Programs', `B1 the line's Programs names the line and lights its tab (${eyebrow})`);
  ok(await main().getByRole('group', { name: 'Which line' }).count() === 0 && !/All lines/.test(await main().innerText()), 'B2 no other line to wander off to — no Which line, no All lines');
  ok(flat(await main().locator('section.lp-line h2').allInnerTexts()) === names.line, 'B3 only this line\'s programs');
  await main().getByRole('button', { name: /Every line’s programs — in the Factory/ }).click(); await page.waitForTimeout(1800);
  ok(/#\/programs$/.test(page.url()) && (await menu()).lit.join() === 'Factory' && flat(await main().locator('.pl-eyebrow').first().innerText()) === 'FACTORY · PROGRAMS',
    `B4 every line's programs one tap up, in the Factory (${page.url().split('#')[1]})`);
  ok(await main().getByRole('group', { name: 'Which line' }).getByRole('button', { name: 'All lines' }).count() === 1, 'B5 in the Factory the lines still narrow the list');
  await go(`#/snags?line=${WS}`);
  const tab = await tabOn();
  ok(await main().getByLabel('Which line', { exact: true }).count() === 0 && /^Problems/.test(tab), `B6 the line's Problems has no line picker (tab ${tab})`);
}

/* ---- C · a Machines tab; every way to a machine opens its page ---- */
{
  await go(`#/lines/${WS}`);
  const tabs = (await page.locator('.nv-tab .nv-tab-l').allInnerTexts()).map(flat);
  ok(tabs.slice(0, 2).join(' · ') === 'Overview · Machines', `C1 the line's tabs: ${tabs.join(' · ')}`);
  ok(await main().locator('section[aria-label="Machines on this line"]').count() === 0, 'C2 the Overview no longer holds the machine list twice — it is the Machines tab');
  const card = main().locator('.tour-card[data-listed="1"] .tour-b').first();
  const cardName = flat(await main().locator('.tour-card[data-listed="1"] .tour-n').first().innerText()).replace(/^\d+\s*/, '').replace(/constraint$/, '').trim();
  await card.click(); await page.locator('.lmc').waitFor({ timeout: 15000 }); await page.waitForTimeout(800);
  ok(new RegExp(`#/lines/[^/]+/machine/${encodeURIComponent(cardName).replace(/[()]/g, '\\$&')}$`).test(page.url()) && await tabOn() === 'Machines',
    `C3 a machine card on the Overview opens its page, under Machines (${page.url().split('#')[1]})`);
  await page.locator('.nv-tab', { hasText: 'Machines' }).first().click(); await page.waitForTimeout(1500);
  ok(/view=machines$/.test(page.url()) && await main().locator('.pl-machines > li').count() >= 1, 'C4 the Machines tab lists the line\'s machines');
  const first = main().locator('.pl-machine-name').first();
  const firstName = flat(await first.locator('b').innerText());
  ok(/›$/.test(flat(await first.innerText())), `C5 a machine's name says it opens (${flat(await first.innerText())})`);
  await first.click(); await page.locator('.lmc').waitFor({ timeout: 15000 }); await page.waitForTimeout(800);
  ok(flat(await page.locator('.lmc .part-head h1').innerText()).startsWith(firstName), `C6 its name opens its page — ${firstName}`);
}

/* ---- D · one name, Factory ---- */
{
  await go('#/room');
  ok(flat(await main().locator('.fac-home .home-sec-title').innerText()) === 'Lines', 'D1 the factory\'s lines are headed Lines');
  const go1 = flat(await main().locator('.fac-card', { hasText: names.line }).first().locator('.fac-card-go').innerText());
  ok(go1 === `Open ${names.line} ›`, `D2 each card says what a tap does (${go1})`);
  await go('#/factory');
  ok(flat(await main().locator('.part-head h1').first().innerText()) === 'Lines' && await tabOn() === 'Lines', 'D3 the Lines page is titled Lines, its tab lit');
  for (const h of ['#/room', '#/factory', `#/lines/${WS}`]) {
    await go(h);
    ok(!/Your factory/.test(await page.locator('.nv').innerText()), `D4 no "Your factory" on ${h.split('?')[0]}`);
  }
}

/* ---- E · a project's machine goes to the same machine on its line ---- */
{
  await go(`#/project/${PID}/machine/${names.asset}`);
  const link = main().getByRole('button', { name: new RegExp(`^Everything on ${names.line.replace(/[—()]/g, '.')} — every project’s work on it`) });
  await link.waitFor({ timeout: 10000 }).catch(() => {});
  ok(await link.count() === 1, `E1 the project's machine page says where it stands — ${names.line}`);
  await link.click(); await page.locator('.lmc').waitFor({ timeout: 15000 }); await page.waitForTimeout(800);
  ok(flat(await page.locator('.lmc .part-head h1').innerText()).startsWith(names.machine) && (await menu()).lit.join() === names.line,
    `E2 the same machine on its line, the line named and lit (${page.url().split('#')[1]})`);
  ok(await main().locator('.lmc-proj', { hasText: names.job }).count() === 1, 'E3 its page there names the project, one tap back');
}

/* ---- F · the bar: the place a crumb, Go to the picker ---- */
{
  await go(`#/programs?line=${WS}`);
  const said = await bar();
  ok(said.startsWith('Factory') && said.includes(names.line) && /Programs$/.test(said), `F1 the bar says Factory › the line › the page (${said})`);
  await page.locator('.nv-top .nv-here').click(); await page.waitForTimeout(1500);
  ok(new RegExp(`#/lines/${WS}$`).test(page.url()) && await tabOn() === 'Overview', `F2 the line's name opens its Overview (${page.url().split('#')[1]})`);
  const goto = page.locator('.nv-top .nv-goto');
  ok(flat(await goto.innerText()) === 'Go to', 'F3 the picker says Go to');
  await goto.click(); await page.waitForTimeout(600);
  ok(await page.getByRole('dialog').getByPlaceholder(/A line or a project/).count() === 1, 'F4 Go to opens every line and project, to type');
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
}

/* ---- G · every machine in the factory ---- */
{
  await go('#/room');
  await page.locator('.nv-tab', { hasText: /^Machines$/ }).first().click(); await page.waitForTimeout(1800);
  ok(/#\/machines$/.test(page.url()) && await tabOn() === 'Machines' && (await menu()).lit.join() === 'Factory', `G1 the Factory's Machines tab (${page.url().split('#')[1]})`);
  /* what lib/factoryMachines says from the records as lib/useLineRecords reads them */
  const want = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const { liveProductionLines } = await import('/src/lib/lines.ts');
    const { factoryMachines } = await import('/src/lib/factoryMachines.ts');
    const [all, assets, programs, jobLines, jobs, snags] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines(), db.allProjects(), db.listAllSnags()]);
    const r = factoryMachines({ lines: await liveProductionLines(all), assets, jobLines, jobs: jobs.filter(j => !j.deletedAt), programs, snags });
    return { says: r.says, rows: r.groups.flatMap(g => g.rows.map(x => `${g.line.name}|${x.name}`)) };
  }).catch(e => ({ says: `(${e.message})`, rows: [] }));
  const says = flat(await main().locator('.fmc-says').innerText());
  ok(says === want.says, `G2 the sentence as lib/factoryMachines says it (${says})`, want.says);
  const rows = await main().locator('.fmc-line').evaluateAll(els => els.flatMap(el => [...el.querySelectorAll('.fmc-m')].map(m => `${el.querySelector('h2')?.firstChild?.textContent?.trim()}|${m.getAttribute('data-machine')}`)));
  ok(rows.length > 0 && JSON.stringify(rows) === JSON.stringify(want.rows), `G3 every line's machines, in floor and flow order (${rows.length})`, `${rows.join(', ')} ≠ ${want.rows.join(', ')}`);
  const ilapak = flat(await main().locator('.fmc-m[data-machine="Ilapak flow wrapper"]').innerText());
  ok(/Ilapak UK/.test(ilapak) && /With Line 2 commissioning/.test(ilapak) && /programs? proved/.test(ilapak), `G4 a row says who made it, its project and its programs (${ilapak})`);
  await main().locator('.fmc-m[data-machine="Ilapak flow wrapper"] .lt-row').click(); await page.locator('.lmc').waitFor({ timeout: 15000 }); await page.waitForTimeout(600);
  ok(/#\/lines\/[^/]+\/machine\/Ilapak%20flow%20wrapper$/.test(page.url()), `G5 a row opens the machine's page on its line (${page.url().split('#')[1]})`);
  /* its paper, read back */
  await go('#/machines');
  await page.locator('.part-head .part-menu-b', { hasText: /^Report/ }).click(); await page.waitForTimeout(300);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('menuitem', { name: /The factory’s machines/ }).or(page.locator('.part-menu-i', { hasText: /The factory’s machines/ })).first().click()]);
  const f = join(mkdtempSync(join(tmpdir(), 'wai-')), 'machines.pdf'); await dl.saveAs(f);
  const paper = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  ok(paper.includes(want.says) && want.rows.every(r => paper.includes(r.split('|')[1])) && /With Line 2 commissioning/.test(paper), 'G6 its paper: the sentence and every machine, as the screen says them', paper.slice(0, 300));
}

/* ---- H · a project's machines, simply; a machine first ---- */
{
  await go(`#/project/${PID}`);
  await page.locator('.nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Machines$/ }) }).first().click(); await page.waitForTimeout(1800);
  ok(new RegExp(`#/project/${PID}/machines$`).test(page.url()) && await page.locator('.plt').count() === 0, `H1 a project's Machines opens on its machines — no gates over them (${page.url().split('#')[1]})`);
  const rows = (await main().locator('.pms .now-m').evaluateAll(els => els.map(e => e.getAttribute('data-now-machine'))));
  const want = await page.evaluate(async pid => {
    const { getDB } = await import('/src/db/core.ts');
    return (await (await getDB()).getAll('commission_assets')).filter(a => a.projectId === pid && !a.deletedAt).sort((a, b) => a.sort - b.sort).map(a => a.name.trim());
  }, PID);
  ok(rows.length > 0 && JSON.stringify(rows) === JSON.stringify(want), `H2 a row a machine, in its order (${rows.join(', ')})`, want.join(', '));
  const st = (await main().locator('.pms .now-m .pms-status').allInnerTexts()).map(flat);
  ok(st.length === rows.length && st.every(w => ['Not here yet', 'On site', 'Installed', 'Running', 'Handed over'].includes(w)), `H3 each says its status in plain words (${st.join(', ')})`);
  /* the gates are the project's, from its front page */
  await go(`#/project/${PID}`);
  const views = (await page.locator('.plt .plt-t').allInnerTexts()).map(t => flat(t).split(' ')[0]);
  ok(views[0] === 'Now' && ['Install', 'Set', 'Commission', 'Hand', 'Timeline', 'Programs'].every(v => views.includes(v)), `H4 the project's own views on its front page (${views.join(' · ')})`);
  await page.locator('.plt .plt-t', { hasText: /^Install/ }).click(); await page.waitForTimeout(1500);
  ok(/\/install$/.test(page.url()) && await tabOn() === 'Now', `H5 a gate opens lighting Now — the project's (${await tabOn()})`);
  /* a machine's page — the machine first: its status, the project it is going through and where it is up to, what is open, its tests, its programs */
  await go(`#/project/${PID}/machines`);
  await main().locator('.pms .now-m .lt-row').first().click(); await page.locator('.mpg').waitFor({ timeout: 15000 }); await page.waitForTimeout(800);
  const head = flat(await main().locator('.cw-handover').innerText());
  const inProject = flat(await main().locator('.mpg-in').innerText());
  ok(/^(Not here yet|On site|Installed|Running|Handed over)/.test(head), `H6 the machine's status first (${head})`);
  ok(inProject.startsWith(`Going through ${names.job} — a stage-gate project — `), `H7 the project it is going through, and where it is up to (${inProject})`);
  ok(await main().locator('.mpg-steps .mpg-step').count() === 4 && await main().locator('.mpg-open h2').count() === 1 && await main().locator('.mpg-tests h2').count() === 1 && await main().locator('.mpg-side').count() === 1,
    'H8 its gates one strip; what is open on it, its tests and its programs below');
  ok(await main().locator('.mp-gate .mp-gate-go').count() === 0, 'H9 no gate-by-gate panel on the machine');
  ok(await main().locator('.mpg-itself .mp-label button').count() === 1, 'H10 the machine itself kept — its label, its details');
  const firstOpen = main().locator('.mpg-open .lt-row').first();
  if (await firstOpen.count()) { await firstOpen.click(); await page.waitForTimeout(1200); ok(await page.locator('.rd-title, .rd-state-row').count() > 0, 'H11 a row opens its record'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(500); }
}

/* ---- the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  for (const h of [`#/lines/${WS}`, `#/lines/${WS}?view=machines`, `#/programs?line=${WS}`, `#/project/${PID}/machine/${names.asset}`, '#/machines', `#/project/${PID}/machines`]) {
    await go(h);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(wide <= 1, `P phone: nothing off the side on ${h.split('/').slice(0, 2).join('/')}… (${wide}px)`);
  }
  await go(`#/lines/${WS}`);
  const lit = (await page.locator('.nv-bar .nv-bi[aria-current="page"] .nv-bi-l').allInnerTexts()).map(flat);
  ok(lit.join() === 'Factory' && await page.locator('.nv-top .nv-goto').isVisible() && await page.locator('.nv-top .nv-here').isVisible(),
    `P the phone's bar lights Factory inside a line; the place and Go to both in the top bar (${lit.join()})`);
}

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\nWhere am I NOT accepted: ${fail} failed` : '\nWhere am I accepted: the menu names the place, a line\'s pages stay on it, its Machines a tab and every way to a machine its page, one name Factory, a project\'s machine on its line, the bar a crumb and Go to, every machine in the factory and a project\'s machines simply, the phone');
process.exit(fail ? 1 : 0);
