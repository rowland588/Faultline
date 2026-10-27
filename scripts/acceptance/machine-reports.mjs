/* THE MACHINES ON PAPER, AND THE FACTORY'S MACHINES SAYING SOMETHING (Rowland, 27 October: "factory machines
 * tells you nothing. But projects, machines shows the page I have been wanting .. but still no report abilities").
 *
 * On the seeded factory and stage-gate project:
 *
 *   F  the Factory's Machines: a machine a stage-gate project is working on says what that project's Machines tab
 *      says of it — its status, where it is up to, its programs, what it owes, what is next — as lib/factoryMachines
 *      reads it with project/machines; a machine with no project says so; a project's row opens its page there
 *   F  its paper, The factory's machines: every line, every machine, the same words
 *   P  a project's Machines tab: each row as project/machines says it; Report ▾ › Machines report — the rows, then a
 *      page a machine, each with its status, the project it is going through and where it is up to, what is open,
 *      its tests and its programs
 *   M  a machine's page in the project: Report ▾ › Machine report — what the page says: its status, Going through …,
 *      every open row and every test on the screen
 *   L  a machine's page on its line: Report ▾ › Machine report — every project on it, its programs, its problems
 *   W  "where are we on Line 2a?" (Rowland, 27 October) — the line's Report ▾ › Machines report: its machines as the
 *      Factory's Machines says them, then each in full — every test and every attempt, every program and its tests,
 *      every step, its problems and what was done; the same from the Factory's Machines, line by line
 *   and on a phone Report ▾ on every one of them, nothing off the side, and no console error.
 *
 *   node scripts/acceptance/machine-reports.mjs      (SMOKE_BASE, as smoke) */
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
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
/* pdftotext keeps the words, a line break a space; the paper's typographic quotes and dashes as the screen's */
const pdf = f => flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
/* what the paper prints for a screen's words — the PDF fonts write an arrow as "to" (lib/reportKit san) */
const onPaper = s => flat(String(s ?? '').replace(/\s*→\s*/g, ' to '));
const pages = f => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))[1]);
const OUT = mkdtempSync(join(tmpdir(), 'mrep-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => {
  await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !/Loading…|Reading where the project is…/.test(document.querySelector('.nv-main')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
};
const main = () => page.locator('.nv-main');
/** Report ▾ › the paper by its name, downloaded and read back. */
const paper = async (label, name) => {
  await main().locator('.part-head .part-menu-b', { hasText: /^Report/ }).first().click(); await page.waitForTimeout(300);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('menuitem').filter({ has: page.locator('b', { hasText: new RegExp(`^${label}`) }) }).first().click()]);
  const f = join(OUT, name); await dl.saveAs(f); return f;
};

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId, WS = sd.wsId;

/* WHAT THE MODULES SAY, from the records as the pages read them */
const truth = () => page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { planModel } = await import('/src/lib/planModel.ts');
  const { factoryMachines } = await import('/src/lib/factoryMachines.ts');
  const M = await import('/src/project/machines/machines.ts');
  const { todayISO } = await import('/src/lib/weeks.ts');
  const today = todayISO();
  const [all, assets, programs, jobLines, jobs, snags] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines(), db.allProjects(), db.listAllSnags()]);
  const live = jobs.filter(j => !j.deletedAt && !j.archivedAt);
  const gates = await Promise.all(live.filter(p => planModel(p) === 'commissioning').map(async project => ({
    project, tests: await db.listTests(project.id), items: await db.listTestItems(project.id), assets: await db.listAssets(project.id),
    materials: await db.listMaterials(project.id), programs: await db.listPrograms(project.id), studies: await db.listStudies(project.id),
  })));
  const inProjects = new Map();
  const projects = {};
  for (const g of gates) {
    const rows = M.projectMachineRows(g, M.gateOwed(g, today), today);
    projects[g.project.id] = { name: g.project.name, says: M.projectMachinesSays(rows), rows: rows.map(m => ({ id: m.id, name: m.name, status: m.status, says: M.rowSays(m, g.project.name), next: M.nextWords(m) })) };
    for (const row of rows) inProjects.set(row.id, { projectId: g.project.id, project: g.project.name, row });
  }
  const r = factoryMachines({ lines: await liveProductionLines(all), assets, jobLines, jobs: jobs.filter(j => !j.deletedAt), programs, snags, inProjects });
  return { says: r.says, rows: r.groups.flatMap(g => g.rows.map(x => ({ line: g.line.name, name: x.name, status: x.status ?? '', says: x.says, right: x.right, href: x.href }))), projects };
});
const want = await truth();

/* ---- F · the Factory's machines ---- */
{
  await go('#/machines');
  const rows = await main().locator('.fmc-m').evaluateAll(els => els.map(e => ({
    name: e.getAttribute('data-machine'), status: e.querySelector('.pms-status')?.textContent?.trim() ?? '',
    says: e.querySelector('.lt-says')?.textContent?.replace(/\s+/g, ' ').trim(), right: e.querySelector('.lt-where')?.textContent?.replace(/\s+/g, ' ').trim(),
  })));
  ok(rows.length === want.rows.length && rows.every((x, i) => x.name === want.rows[i].name && x.status === want.rows[i].status && x.says === want.rows[i].says && x.right === want.rows[i].right),
    `F1 every machine says what lib/factoryMachines and its project say of it (${rows.length} rows)`,
    rows.map((x, i) => (x.says === want.rows[i]?.says && x.right === want.rows[i]?.right ? '' : `${x.name}: «${x.says} | ${x.right}» ≠ «${want.rows[i]?.says} | ${want.rows[i]?.right}»`)).filter(Boolean).join(' / '));
  const inP = want.rows.find(x => x.status), none = want.rows.find(x => !x.status);
  ok(!!inP && /^In .+: (at |due on site|handed over)/.test(inP.says), `F2 a machine a project is working on: its status, where it is up to (${inP?.name}: ${inP?.status} — ${inP?.says})`);
  ok(!none || /^(No project on it|With )/.test(none.says), `F3 a machine with no project on it says so (${none?.name}: ${none?.says})`);
  if (inP) {
    await main().locator(`.fmc-m[data-machine="${inP.name}"] .lt-row`).first().click(); await page.locator('.mpg').waitFor({ timeout: 15000 }); await page.waitForTimeout(600);
    ok(page.url().endsWith(`#${inP.href}`), `F4 its row opens its page in the project (${page.url().split('#')[1]})`);
  }
  await go('#/machines');
  const f = await paper('The factory’s machines', 'factory-machines.pdf');
  const t = pdf(f);
  ok(t.includes('The factory’s machines') && t.includes(flat(want.says)), 'F5 its paper: the sentence', t.slice(0, 300));
  const missing = want.rows.filter(x => !t.includes(onPaper(x.name)) || !t.includes(onPaper(x.says)) || !t.includes(onPaper(x.right)) || (x.status && !t.includes(x.status)));
  ok(!missing.length, `F6 its paper: every machine, its status, its words and what is next (${want.rows.length})`, missing.map(x => x.name).join(', '));
}

/* ---- P · a project's machines, and its Machines report ---- */
const proj = want.projects[PID];
{
  await go(`#/project/${PID}/machines`);
  const rows = await main().locator('.pms .now-m').evaluateAll(els => els.map(e => ({ name: e.getAttribute('data-now-machine'), says: e.querySelector('.lt-says')?.textContent?.replace(/\s+/g, ' ').trim() })));
  ok(rows.length === proj.rows.length && rows.every((x, i) => x.name === proj.rows[i].name && x.says === proj.rows[i].says), `P1 each row as project/machines says it (${rows.length})`,
    JSON.stringify(rows.slice(0, 2)) + ' ≠ ' + JSON.stringify(proj.rows.slice(0, 2)));
  const f = await paper('Machines report', 'machines-report.pdf');
  const t = pdf(f), n = pages(f);
  ok(t.includes(`MACHINES · ${proj.name}`) && t.includes(flat(proj.says)), `P2 the Machines report: the project and its sentence (${proj.says})`, t.slice(0, 300));
  const lost = proj.rows.filter(x => !t.includes(onPaper(x.name)) || !t.includes(onPaper(x.says)) || !t.includes(x.status) || !t.includes(onPaper(x.next)));
  ok(!lost.length, `P3 every machine's row — its status, its words, what is next (${proj.rows.length})`, lost.map(x => x.name).join(', '));
  ok(n >= proj.rows.length + 1, `P4 the rows, then a page a machine (${n} pages for ${proj.rows.length} machines)`);
  const each = (t.match(/Going through /g) ?? []).length;
  /* a section with something is a heading; one with nothing is said in the machine's one "Nothing on it yet" line */
  const said = (head, none) => (t.match(head) ?? []).length + (t.match(none) ?? []).length;
  ok(each === proj.rows.length && said(/WHAT IS OPEN ON IT, AND WHO HAS IT/g, /Nothing open on it — no stage/g) === proj.rows.length
    && said(/ITS TESTS — EVERY ATTEMPT/g, /No tests on it yet/g) === proj.rows.length && said(/ITS PROGRAMS — EVERY TEST OF EACH/g, /No programs on it\./g) === proj.rows.length,
    `P5 each machine in full: where it is up to, what is open and who has it, every test and attempt, every program and its tests (${each})`);
  /* THE DETAIL (27 October — "all you've done is headlines ... you can't see the results"): every attempt of every
     test on the project's machines, in lib/programJourney's words, with what it had to show and what was seen */
  const attempts = await page.evaluate(async pid => {
    const db = await import('/src/db.ts');
    const { testJourney, programJourney } = await import('/src/lib/programJourney.ts');
    const { latestAttempts, live } = await import('/src/lib/testing.ts');
    const { todayISO } = await import('/src/lib/weeks.ts');
    const tests = await db.listTests(pid), programs = await db.listPrograms(pid), assets = live(await db.listAssets(pid));
    const on = new Set(assets.map(a => a.id));
    const chains = latestAttempts(tests).filter(t => on.has(t.assetId) && (t.kind ?? 'test') === 'test');
    return [...chains.flatMap(t => testJourney(t, tests, todayISO()).attempts.map(a => a.text)),
      ...live(programs).filter(p => on.has(p.assetId)).flatMap(p => programJourney(p, tests, todayISO()).attempts.map(a => a.text))];
  }, PID);
  const missingAttempts = attempts.filter(a => !t.includes(onPaper(a)));
  ok(attempts.length > 0 && !missingAttempts.length, `P6 every attempt of every test and program, as it was run — aimed, did, how it went, what was seen (${attempts.length})`, missingAttempts.slice(0, 3).join(' / '));
}

/* ---- M · a machine's page in the project, and its Machine report ---- */
{
  await go(`#/project/${PID}/machines`);
  await main().locator('.pms .now-m .lt-row').first().click(); await page.locator('.mpg').waitFor({ timeout: 15000 }); await page.waitForTimeout(1200);
  const name = flat(await main().locator('.pace-title').first().innerText());
  const status = flat(await main().locator('.mpg-at').innerText());
  const inProject = flat(await main().locator('.mpg-in').innerText());
  const open = (await main().locator('.mpg-open .lt-what').allInnerTexts()).map(flat);
  const tests = (await main().locator('.mpg-tests .lt-what').allInnerTexts()).map(flat);
  const f = await paper('Machine report', 'machine-report.pdf');
  const t = pdf(f);
  ok(t.includes(name) && t.includes(status.toUpperCase()) && t.includes(inProject), `M1 the machine report: its name, its status, where it is up to (${name} · ${status} · ${inProject})`, t.slice(0, 400));
  const gone = [...open, ...tests].filter(w => !t.includes(onPaper(w)));
  ok(!gone.length, `M2 every row open on it and every test, as the page lists them (${open.length} open, ${tests.length} tests)`, gone.join(', '));
}

/* ---- L · a machine's page on its line, and its Machine report ---- */
{
  await go(`#/lines/${WS}?view=machines`);
  const first = main().locator('a, button').filter({ hasText: /›$/ }).filter({ hasNotText: /Order|Every|Name/ }).first();
  const lineMachine = want.rows.find(x => x.line && x.href.startsWith('/lines/')) ?? want.rows[0];
  await go(`#/lines/${encodeURIComponent(WS)}/machine/${encodeURIComponent(lineMachine.name)}`);
  if (!(await page.locator('.lmc').count())) await first.click().catch(() => {});
  await page.locator('.lmc').waitFor({ timeout: 15000 });
  const name = flat(await main().locator('.pace-title').first().innerText());
  const projects = (await main().locator('.lmc-proj > b').allInnerTexts()).map(flat);
  const f = await paper('Machine report', 'line-machine-report.pdf');
  const t = pdf(f);
  ok(t.includes(name) && /THE PROJECTS ON IT|No project has worked on it/.test(t) && /ITS PROGRAMS|No programs on it/.test(t) && /ITS PROBLEMS ON THE REGISTER|No problem on the register names it/.test(t)
    && /STUDIES OF IT — WHAT EACH FOUND|No study names it yet/.test(t) && /ITS STOPS|No stops timed on it/.test(t),
    `L1 the machine report on its line: its name and every section (${name})`, t.slice(0, 400));
  ok(projects.every(p => t.includes(p)), `L2 every project on it (${projects.join(', ') || 'none'})`);
}

/* ---- W · "where are we on Line 2a?" — the line's machines, every one in full ---- */
{
  await go(`#/lines/${encodeURIComponent(WS)}?view=machines`);
  const lineName = flat(await main().locator('.pace-title').first().innerText());
  const f = await paper('Machines report — every machine in full', 'line-machines.pdf');
  const t = pdf(f), n = pages(f);
  const onLine = want.rows.filter(x => x.line === lineName);
  ok(t.includes(`${lineName} — its machines`) && onLine.every(x => t.includes(onPaper(x.name)) && t.includes(onPaper(x.says))), `W1 the line's machines report: its machines as the Factory's Machines says them (${onLine.length})`, t.slice(0, 300));
  ok(n >= onLine.length + 1 && onLine.filter(x => x.status).every(x => t.includes(x.status.toUpperCase())), `W2 then every machine in full, each with its status (${n} pages)`);
  const inP = onLine.find(x => x.status);
  ok(!inP || t.includes(`Going through ${proj.name} — a stage-gate project — `), 'W3 a project’s machine in full — the project it is going through');
  /* and the same from the Factory's Machines, line by line */
  await go('#/machines');
  const g = await paper(`${lineName} — its machines in full`, 'factory-line-machines.pdf');
  const u = pdf(g);
  ok(u.includes(`${lineName} — its machines`) && pages(g) === n, `W4 the Factory's Machines prints the same line's machines in full (${pages(g)} pages)`);
}

/* ---- the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  for (const h of ['#/machines', `#/project/${PID}/machines`, `#/project/${PID}/machine/${proj.rows[0].id}`, `#/lines/${encodeURIComponent(WS)}/machine/${encodeURIComponent(want.rows[0].name)}`]) {
    await go(h);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const rep = await main().locator('.part-head .part-menu-b', { hasText: /^Report/ }).first().isVisible().catch(() => false);
    ok(wide <= 1 && rep, `Ph ${h.split('/').slice(0, 3).join('/')}…: Report ▾ there, nothing off the side (${wide}px)`);
  }
}

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\nMachine reports NOT accepted: ${fail} failed` : '\nMachine reports accepted: the Factory\'s machines say what their projects say, and every machine page and list has its paper, saying the same');
process.exit(fail ? 1 : 0);
