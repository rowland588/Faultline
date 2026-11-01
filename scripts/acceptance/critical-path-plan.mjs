/* CRITICAL PATH FROM THE PLAN, DRIVEN (FC-215 part 2 — knowledge/specs/FC-215-critical-path.md, Part 2; docs/METHODS.md §7).
 *
 * The knowledge record's new line, booked in dates on a stage-gate project (a filler due in 10 days, a labeller in 14; install, FAT/SAT and SAT
 * for each; line trials after both; the handover) — worked out by listing every start-to-end path (end 33, the labeller's chain critical, the
 * filler's steps 5 days of float; scripts/knowledge/cases-calc.py P1), then read through the real pages:
 *
 *   a  the Timeline's one line is the module's, and opens the tool in the project; a project with no plan has no section
 *   b  the page: the sentence, the tiles (33 days; the machines), the picture, a row a machine, the steps left with their floats
 *   c  the owner’s word: a wait set on the page (the filler's chain 12 days of float before it, 5 after), kept after a reload, a loop refused,
 *      put back to the plan’s order; "Keep the plan’s order for every step"
 *   d  what is left: a machine already here and a step done change the end (23 days) as the passes say; a step with no day listed
 *   e  the handover date: 6 days in hand, 3 days short
 *   f  a step late: the labeller's install 3 days moves the handover 3 days (£28.8k at the line's £9.6k a day); the filler's moves nothing
 *   g  a team member reads and cannot change a wait (no control); a client reads and takes the paper
 *   h  the paper downloaded and read back: the sentence, the tiles, the machines, the steps, the money, the closing line
 *   i  the phone: nothing off the side, 44 px controls
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/critical-path-plan.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const OUT = process.env.OUT ?? '/tmp/claude-0/cpp-out';
mkdirSync(OUT, { recursive: true });
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail !== undefined ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => flat(s).replace(/\s+/g, '').toLowerCase();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];
async function device(width, access) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s, a]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION, access]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  return { ctx, page };
}
const go = async (page, hash, ready = '.nv-main') => { await page.goto(`${BASE}/${hash}`); await page.locator(ready).first().waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const pressPaper = async (page, label) => { const m = await import('../lib/pageHeader.mjs'); return m.paper(page, label); };

const { page } = await device(1360);
await go(page, '#/room');

/* ---------------------------------------------------------------- the plan, booked in dates from today */
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { uid } = await import('/src/lib/ids.ts');
  const { todayISO, addDays } = await import('/src/lib/weeks.ts');
  const today = todayISO();
  const D = n => addDays(today, n);
  const ws = await db.createWorkspace('Line 7 — critical path');
  await db.updateWorkspace({ ...ws, packsPerMin: 100, marginPerPack: 0.2, shifts: [{ name: 'Days', start: '06:00', end: '14:30', breakMin: 30 }] });
  const proj = await db.createProject('New line — critical path', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  await db.updateProject({ ...proj, expectedAt: D(38), plannedAt: D(38), workspaceIds: [ws.id] });
  await db.addPaceLine({ projectId: proj.id, workspaceId: ws.id, key: 'L7', name: 'Line 7', variant: 'A', sort: 0 });
  const asset = (name, sort, dueOn) => ({ id: uid(), projectId: proj.id, workspaceId: ws.id, name, state: 'awaited', dueOn, sort, updatedAt: 1 });
  const filler = asset('Filler', 1, D(10)), labeller = asset('Labeller', 2, D(14));
  await db.putAsset(filler); await db.putAsset(labeller);
  let n = 0;
  const step = (title, kind, a, from, to, o = {}) => ({ id: uid(), projectId: proj.id, title, kind, ...(a ? { assetId: a.id } : {}), plannedFor: D(from), plannedTo: D(to), outcome: 'planned', sort: ++n, createdAt: 1, updatedAt: 1, ...o });
  const T = {
    fInst: step('Install', 'install', filler, 10, 14), fSat: step('FAT/SAT', 'test', filler, 15, 20),
    lInst: step('Install', 'install', labeller, 14, 17), lSat: step('SAT', 'test', labeller, 18, 25),
    trials: step('Line trials', 'test', null, 26, 30), hand: step('Handover', 'install', null, 31, 32, { gate: 'handover' }),
  };
  for (const t of Object.values(T)) await db.putTest(t);
  const empty = await db.createProject('Nothing planned yet', '#1f8a4c', 'Rowland', 'r@example.com', 'commissioning');
  return { pid: proj.id, empty: empty.id, ws: ws.id, today, ids: Object.fromEntries(Object.entries(T).map(([k, t]) => [k, t.id])), assets: { filler: filler.id, labeller: labeller.id } };
});
const PID = made.pid;
const read = () => page.evaluate(async pid => {
  const db = await import('/src/db.ts');
  const { planPath } = await import('/src/tools/criticalpath/plan.ts');
  const { todayISO } = await import('/src/lib/weeks.ts');
  const p = (await db.ensureProjects()).find(x => x.id === pid);
  const reading = planPath({ assets: await db.listAssets(pid), tests: await db.listTests(pid), waitsFor: p?.gateStages?.waitsFor, today: todayISO(), handoverAt: p?.expectedAt ?? p?.plannedAt });
  return JSON.parse(JSON.stringify(reading));
}, PID);
const says = (page, sel) => page.locator(`[data-cpp="${sel}"]`).first().innerText().then(flat).catch(() => '');
const open = async (pg = page, pid = PID) => { await go(pg, `#/calc/critical-path?project=${pid}`); await pg.locator('[data-critical-path]').first().waitFor({ timeout: 15000 }).catch(() => {}); };

/* ------------------------------------------------------------- a · the Timeline's one line, and the door */
await go(page, `#/project/${PID}/plan`);
const mod = await page.evaluate(async pid => {
  const db = await import('/src/db.ts');
  const m = await import('/src/tools/criticalpath/plan.ts');
  const { todayISO } = await import('/src/lib/weeks.ts');
  const p = (await db.ensureProjects()).find(x => x.id === pid);
  const r = m.planPath({ assets: await db.listAssets(pid), tests: await db.listTests(pid), waitsFor: p?.gateStages?.waitsFor, today: todayISO(), handoverAt: p?.expectedAt });
  return { line: r.ok ? m.planLine(r) : '', says: r.ok ? m.planSays(r) : '', margin: r.ok ? m.marginSays(r) : '' };
}, PID);
const line = flat(await page.locator('[data-critical-line]').first().innerText().catch(() => ''));
ok(line.startsWith(mod.line) && /Critical path: Labeller’s chain decides the handover — earliest finish .* \(33 days\), 6 days in hand against the handover date\./.test(line), 'a the Timeline says in one line which machine’s chain decides the handover, and the module’s words', line);
await page.locator('[data-critical-line] button', { hasText: 'Critical path' }).click();
await page.locator('[data-critical-path]').first().waitFor({ timeout: 15000 });
ok(page.url().includes('/calc/critical-path') && page.url().includes(`project=${PID}`), 'a …and the link opens the tool in the project', page.url());
await go(page, `#/project/${made.empty}/plan`);
ok(await page.locator('[data-critical-line]').count() === 0, 'a a project with nothing planned has no such line');
await open(page, made.empty);
ok(await page.locator('[data-critical-path]').count() === 0 && !/This project’s plan/.test(await page.locator('.nv-main').innerText()), 'a …and no section on the tool’s page');

/* ------------------------------------------------------------- b · the page */
await open();
ok(await says(page, 'says') === mod.says && /Labeller’s chain decides it/.test(mod.says) && /Filler has 12 days of float/.test(mod.says), 'b the sentence is the module’s: the labeller decides it; with only the plan’s order the filler has 12 days', mod.says);
ok(await says(page, 'margin') === mod.margin, 'b the handover date against the chain, in words', await says(page, 'margin'));
const tiles = Object.fromEntries(await Promise.all((await page.locator('[data-critical-path] .ln-tile').all()).map(async t => [flat(await t.locator('.ln-k').textContent()), flat(await t.locator('.ln-v').textContent())])));
ok(tiles['Earliest finish'] === '33 days' && tiles['Decides the handover'] === 'Labeller' && /6 days in hand/.test(tiles['Against handover'] ?? ''), 'b the tiles: earliest finish 33 days, the labeller decides it, 6 days in hand', JSON.stringify(tiles));
ok(await page.locator('[data-critical-path] svg.calc-pic-svg').count() === 1, 'b the plan as it can run is drawn');
const machines = Object.fromEntries(await Promise.all((await page.locator('[data-cpp-machine]').all()).map(async m => [await m.getAttribute('data-cpp-machine'), flat(await m.innerText())])));
ok(/decides the handover/.test(machines.Labeller ?? '') && /12 days of float/.test(machines.Filler ?? ''), 'b a row a machine: the labeller’s chain decides it, the filler has 12 days of float', JSON.stringify(machines));
const rowsBefore = await page.locator('[data-cpp-step]').count();
ok(rowsBefore === 8, 'b the steps left are the two arrivals and the six steps', rowsBefore);
const stepText = async id => flat(await page.locator(`[data-cpp-step="${id}"]`).innerText());
ok(/critical — no float/.test(await stepText(made.ids.lSat)) && /float 12 days/.test(await stepText(made.ids.fSat)) && /waits for Labeller — SAT/.test(await stepText(made.ids.trials)) && /the plan’s order/.test(await stepText(made.ids.trials)), 'b each step says its days, its float, what it waits for and whose word that is', await stepText(made.ids.trials));

/* ------------------------------------------------------------- c · the owner's word */
const stepBtn = id => page.locator(`[data-cpp-step="${id}"] button`, { hasText: 'Waits for' });
await stepBtn(made.ids.trials).click();
await page.locator('.sheet, [role="dialog"]').first().waitFor({ timeout: 8000 });
await page.locator('.cpp-tick', { hasText: 'FAT/SAT' }).locator('input').check();
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(900);
let r = await read();
ok(r.ok && r.end === 33 && r.machines.find(m => m.name === 'Filler').float === 5, 'c the trials now wait for both SATs — the record: 33 days and the filler 5 days of float', JSON.stringify(r.machines));
ok(/Filler has 5 days of float/.test(await says(page, 'says')) && /the owner’s word/.test(await stepText(made.ids.trials)), 'c …said on the page, and whose word it is', await says(page, 'says'));
await open();
ok(/Filler has 5 days of float/.test(await says(page, 'says')), 'c …kept after a reload (the project’s gate_stages, no new column)');
/* a loop is refused before it is stored */
await stepBtn(made.ids.fSat).click();
await page.locator('.cpp-tick', { hasText: 'Handover' }).locator('input').check();
ok(await page.getByText(/That makes a circle/).count() === 1 && await page.getByRole('button', { name: 'Save', exact: true }).isDisabled(), 'c a loop is refused in words and Save is held', await page.locator('.cpp-sheet').innerText());
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
ok((await read()).ok === true, 'c …and nothing stored');
/* back to the plan's order */
await stepBtn(made.ids.trials).click();
await page.getByRole('button', { name: 'Back to the plan’s order' }).click();
await page.waitForTimeout(900);
ok(/Filler has 12 days of float/.test(await says(page, 'says')) && /the plan’s order/.test(await stepText(made.ids.trials)), 'c a step put back to the plan’s order');
await page.getByRole('button', { name: 'Keep the plan’s order for every step' }).click();
await page.waitForTimeout(900);
const kept = await page.evaluate(async pid => (await (await import('/src/db.ts')).ensureProjects()).find(x => x.id === pid)?.gateStages?.waitsFor, PID);
ok(kept && Object.keys(kept).length === 6 && Array.isArray(kept[made.ids.trials]) && kept[made.ids.trials].join() === made.ids.lSat, 'c “Keep the plan’s order for every step” stores all six', JSON.stringify(kept));
/* …and the owner's word on the trials, set again for the rest of the run */
await stepBtn(made.ids.trials).click();
await page.locator('.cpp-tick', { hasText: 'FAT/SAT' }).locator('input').check();
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(900);
ok((await read()).machines.find(m => m.name === 'Filler').float === 5, 'c the trials wait for both SATs again');

/* ------------------------------------------------------------- d · what is left */
await page.evaluate(async ({ pid, lab }) => {
  const db = await import('/src/db.ts');
  const { todayISO, addDays } = await import('/src/lib/weeks.ts');
  const a = (await db.listAssets(pid)).find(x => x.id === lab);
  await db.putAsset({ ...a, onSiteOn: addDays(todayISO(), -1) });
}, { pid: PID, lab: made.assets.labeller });
await page.evaluate(async ({ pid, inst }) => {
  const db = await import('/src/db.ts');
  const t = (await db.listTests(pid)).find(x => x.id === inst);
  await db.putTest({ ...t, outcome: 'passed' });
}, { pid: PID, inst: made.ids.fInst });
await open();
r = await read();
ok(r.ok && r.end === 23 && r.machines.find(m => m.name === 'Filler').critical && r.machines.find(m => m.name === 'Labeller').float === 4, 'd the labeller here and the filler’s install done: 23 days, the filler’s chain now decides it, the labeller 4 days of float (by hand)', JSON.stringify(r.machines));
ok(/23 days/.test(await says(page, 'says')) && /Filler’s chain decides it/.test(await says(page, 'says')), 'd …said on the page', await says(page, 'says'));
ok(await page.locator(`[data-cpp-step="${made.ids.fInst}"]`).count() === 0, 'd a step done is not in what is left');
await page.evaluate(async ({ pid, a }) => {
  const db = await import('/src/db.ts');
  await db.putTest({ id: 'nodate-' + Math.random().toString(36).slice(2), projectId: pid, title: 'Air and power', kind: 'install', assetId: a, outcome: 'planned', sort: 99, createdAt: 1, updatedAt: 1 });
}, { pid: PID, a: made.assets.filler });
await open();
ok(/Left out of the chain — Filler — Air and power \(no day booked\)/.test(flat(await page.locator('.cpp-left').first().innerText().catch(() => ''))), 'd a step with no day is listed as left out');
/* put the plan back for the next steps */
await page.evaluate(async ({ pid, lab, inst }) => {
  const db = await import('/src/db.ts');
  const a = (await db.listAssets(pid)).find(x => x.id === lab);
  const { onSiteOn: _o, ...rest } = a; await db.putAsset(rest);
  const t = (await db.listTests(pid)).find(x => x.id === inst);
  await db.putTest({ ...t, outcome: 'planned' });
  for (const x of await db.listTests(pid)) if (x.title === 'Air and power') await db.deleteTest(x.id, pid);
}, { pid: PID, lab: made.assets.labeller, inst: made.ids.fInst });
await open();
ok((await read()).end === 33, 'd the plan put back: 33 days');

/* ------------------------------------------------------------- e · the handover date */
ok(/6 days in hand/.test(await says(page, 'margin')), 'e handover 38 days out, the chain 33: 6 days in hand', await says(page, 'margin'));
await page.evaluate(async ({ pid, at }) => { const db = await import('/src/db.ts'); const p = (await db.ensureProjects()).find(x => x.id === pid); await db.updateProject({ ...p, expectedAt: at }); },
  { pid: PID, at: await page.evaluate(async () => (await import('/src/lib/weeks.ts')).addDays((await import('/src/lib/weeks.ts')).todayISO(), 29)) });
await open();
ok(/3 days short of it, even with every step starting the moment it may/.test(await says(page, 'margin')) && (await page.locator('[data-critical-path] .ln-tile', { hasText: 'Against handover' }).innerText()).includes('3 days short'), 'e handover moved to 29: 3 days short, in red words', await says(page, 'margin'));
await page.evaluate(async ({ pid, at }) => { const db = await import('/src/db.ts'); const p = (await db.ensureProjects()).find(x => x.id === pid); await db.updateProject({ ...p, expectedAt: at, plannedAt: at }); },
  { pid: PID, at: await page.evaluate(async () => (await import('/src/lib/weeks.ts')).addDays((await import('/src/lib/weeks.ts')).todayISO(), 38)) });

/* ------------------------------------------------------------- f · a step late, in money */
await open();
await page.getByLabel('Which step is late').selectOption({ label: 'Labeller — Install' });
await page.getByLabel('Late by, days').fill('3');
ok(await says(page, 'late') === 'If Labeller — Install is 3 days late the handover moves 3 days — it has no float to take it up.', 'f the labeller’s install 3 days late moves the handover 3 days', await says(page, 'late'));
ok(/That slip moves the handover 3 days: £28\.8k\./.test(await says(page, 'late-money')) && /costs £9.6k — a day of Line 7 — critical path not making, in margin/.test(await says(page, 'money')), 'f …£28.8k at the line’s £9.6k a day (100 a minute × 480 minutes × £0.20)', await says(page, 'late-money'));
await page.getByLabel('Which step is late').selectOption({ label: 'Filler — Install' });
ok(/the end stays where it is — it uses 3 of its 5 days of float, leaving 2\./.test(await says(page, 'late')), 'f the filler’s install 3 days late moves nothing', await says(page, 'late'));
await page.getByLabel('Late by, days').fill('8');
ok(/uses all 5 days of its float and the handover moves 3 days\./.test(await says(page, 'late')), 'f …8 days late uses its float and moves it 3', await says(page, 'late'));

/* ------------------------------------------------------------- h · the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, 'Critical path — the plan’s chain of waits')]);
const pf = join(OUT, 'critical-path.pdf'); await dl.saveAs(pf);
const ptext = flat(execFileSync('pdftotext', ['-raw', pf, '-'], { encoding: 'utf8' }));
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pf], { encoding: 'utf8' }))?.[1]);
const fresh = await read();
ok(nows(ptext).includes(nows(mod.says.replace(/Filler has 12 days of float/, 'Filler has 5 days of float'))), 'h the paper carries the screen’s sentence', ptext.slice(0, 600));
const WORDS = ['New line — critical path', 'Earliest finish', '33 days', 'Against handover', 'Decides the handover', 'Labeller', 'Machine by machine', 'Filler', '5 days of float', 'What is left', 'Labeller — SAT', 'the owner’s', 'In money', '£9.6k', 'What this does not say'];
const gone = WORDS.filter(w => !nows(ptext).includes(nows(w)));
ok(gone.length === 0, 'h …the tiles, the machines, the steps, whose word each wait is, the money, what it does not say', `missing: ${gone.join(' | ')} in ${ptext.slice(0, 900)}`);
ok(nows(ptext).includes(nows('Earliest finish')) && nows(ptext).includes(nows('(33 days)')) && pages >= 1 && pages <= 3, `h …and the closing line; ${pages} page(s)`, ptext.slice(-400));
ok(fresh.ok === true, 'h the reading the paper was made from is the page’s');

/* ------------------------------------------------------------- g · a team member and a client */
for (const who of ['team', 'client']) {
  await page.evaluate(w => localStorage.setItem('faultline.access.force', w), who);
  await page.reload();
  await open();
  ok(await page.locator('[data-cpp-step]').count() === 8 && await page.locator('[data-cpp-step] button', { hasText: 'Waits for' }).count() === 0, `g ${who}: reads every step and has no control to change a wait`);
  ok(/The owner sets what each step waits for/.test(await page.locator('[data-critical-path]').innerText()), `g ${who}: told whose word it is`);
  ok(await page.getByRole('button', { name: 'Keep the plan’s order for every step' }).count() === 0, `g ${who}: no “keep the plan’s order”`);
  if (who === 'client') {
    const [cdl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, 'Critical path — the plan’s chain of waits')]);
    await cdl.saveAs(join(OUT, 'client.pdf'));
    ok(nows(execFileSync('pdftotext', ['-raw', join(OUT, 'client.pdf'), '-'], { encoding: 'utf8' })).includes(nows('Machine by machine')), 'g client: takes the paper');
  }
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.reload();

/* ------------------------------------------------------------- i · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await open();
const over = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
ok(over.sw <= over.iw + 1, 'i the phone: nothing off the side', JSON.stringify(over));
const small = await page.evaluate(() => [...document.querySelectorAll('[data-critical-path] button, [data-critical-path] select, [data-critical-path] input')]
  .filter(e => e.getBoundingClientRect().width > 0).map(e => ({ t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h < 44));
ok(small.length === 0, 'i …every control 44 px or more', JSON.stringify(small));
await page.locator('[data-cpp-step] button', { hasText: 'Waits for' }).first().click();
await page.locator('.cpp-sheet').waitFor({ timeout: 8000 });
const sheetSmall = await page.evaluate(() => [...document.querySelectorAll('.cpp-sheet button, .cpp-tick')].map(e => Math.round(e.getBoundingClientRect().height)).filter(h => h < 44));
const sheetOver = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(sheetSmall.length === 0 && sheetOver, 'i …and the waits sheet: ticks and buttons 44 px, nothing off the side', JSON.stringify(sheetSmall));

ok(errors.length === 0, 'no console error anywhere', errors.slice(0, 4).join(' | '));
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
