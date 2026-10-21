/* THE PROJECT IS THE WORKSPACE, DRIVEN — P2 (docs/PROJECTS.md). Rowland, 21
 * October: "all of them tools that you use are within that project
 * automatically ... I don't have to think about, I'm going to use this tool,
 * I'm going to assign it to this project. No, everything is wrapped up in a
 * project."
 *
 * On the seeded 6M project (Line 7 pace, on Line 2A and Line 7):
 *
 *   1  a tool opened from the project's rail keeps the project's rail — the
 *      top bar on the project, its address carrying it; its list the
 *      project's own, everything on its lines and every line one tap away,
 *      each as the records say
 *   2  a new SMED made there is the project's, on the line picked from the
 *      project's lines (offered first) — and opens in the project
 *   3  the Problem button on it takes a problem for the project
 *   4  a Line Talk started from the rail is on the project, and Line Talk
 *      knows the project it is on
 *   5  a new Line capacity made from the rail is the project's — no "For a
 *      project?" asked — and opens in the project
 *   6  outside a project, nothing changed: the control room's rail and every
 *      line's list; a quick session on no project opens on no project, the
 *      project's own opens in it, however it is reached
 *   7  the phone: the project's bar, More lit on a tool, nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/project-workspace.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));

const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const rail = async () => flat(await page.locator('.nv-rail').innerText());
const onProject = async () => page.locator('.nv-job select').inputValue();
const tool = name => page.locator('.nv-rail .nv-grp', { has: page.locator('.nv-grp-l', { hasText: /^Tools$/ }) }).getByRole('button', { name, exact: true });
const shownIds = async () => page.locator('.lt-li[data-study]').evaluateAll(els => els.map(e => e.getAttribute('data-study')));
const studies = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => !s.deletedAt));
const dialog = () => page.locator('[role="dialog"]').last();

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.pacedProjectId;
const facts = await page.evaluate(async pid => {
  const db = await import('/src/db.ts');
  const p = await db.getProject(pid);
  const lines = (await db.loadPaceLines(pid)).flatMap(l => (l.workspaceId ? [l.workspaceId] : []));
  const ws = await db.listWorkspaces();
  return { name: p?.name, lines, lineNames: lines.map(id => ws.find(w => w.id === id)?.name) };
}, PID);
const NAME = facts.name;
const LINE7 = facts.lines[facts.lineNames.indexOf('Line 7')];
ok(NAME === 'Line 7 pace' && facts.lines.length === 2 && !!LINE7, `0 the 6M project, ${NAME}, on ${facts.lineNames.join(' and ')}`);
const projectRail = async () => { const r = await rail(); return r.includes(NAME) && !/YOUR FACTORY/i.test(r) && /Fishbone/.test(r); };

/* ---- 1 a tool from the project's rail keeps the project ---- */
await go(`#/project/${PID}`);
ok(await projectRail(), '1 the project open: its rail', (await rail()).slice(0, 200));
await tool('SMED').click(); await page.waitForTimeout(1500);
ok(page.url().endsWith(`#/smed?project=${PID}`), '1 SMED from the project’s rail: its address carries the project', page.url());
ok(await projectRail() && await onProject() === PID, `1 …and the project's rail stays, the top bar on ${NAME}`, (await rail()).slice(0, 200));
ok(await tool('SMED').getAttribute('aria-current') === 'page', '1 SMED lit in the project’s Tools');
const chips = (await page.locator('.ip-scope .chip').allInnerTexts()).map(flat);
ok(JSON.stringify(chips) === JSON.stringify([NAME, 'Everything on its lines', 'Every line']) && await page.locator('.ip-scope .chip.on').innerText() === NAME,
  `1 whose: ${chips.join(' · ')} — the project's own first`, chips.join(' | '));
{
  const all = (await studies()).filter(s => s.tool === 'changeover');
  const own = all.filter(s => s.projectId === PID).map(s => s.id);
  ok(own.length > 0 && same(await shownIds(), own), `1 the project's own SMED, as the records say (${own.length})`, JSON.stringify(await shownIds()));
  await page.locator('.ip-scope .chip', { hasText: 'Everything on its lines' }).click(); await page.waitForTimeout(500);
  const onLines = all.filter(s => s.projectId === PID || facts.lines.includes(s.workspaceId)).map(s => s.id);
  ok(same(await shownIds(), onLines), `1 everything on its lines, whoever's it is (${onLines.length})`);
  await page.locator('.ip-scope .chip', { hasText: 'Every line' }).click(); await page.waitForTimeout(500);
  const every = await shownIds();
  ok(every.length >= onLines.length && every.includes(sd.changeoverId) && !own.includes(sd.changeoverId), `1 every line: ${every.length}, the quick session on no project among them`);
}

/* ---- 2 a new SMED inside the project is the project's ---- */
let made;
{
  await page.getByRole('button', { name: 'New SMED' }).first().click(); await page.waitForTimeout(500);
  const dlg = dialog();
  ok(flat(await dlg.locator('.ie-for').innerText()).startsWith(`For ${NAME} — it is the project’s`), '2 the sheet says it is for the project', await dlg.locator('.ie-for').innerText().catch(() => ''));
  const opts = (await dlg.getByLabel('Which line').locator('option').allInnerTexts()).map(flat);
  ok(same(opts.slice(1, 3), facts.lineNames), `2 the project's lines offered first: ${opts.slice(1, 3).join(', ')}`, opts.join(' | '));
  await dlg.getByLabel('Which line').selectOption(LINE7); await page.waitForTimeout(300);
  await dlg.getByLabel('From which product?').fill('Maris Piper 2kg');
  await dlg.getByLabel(/To which product/).fill('Express 1.25 kg — P2');
  await dlg.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1800);
  const id = page.url().split('#/smed/')[1]?.split(/[?#]/)[0];
  made = (await studies()).find(s => s.id === id);
  ok(!!made && made.projectId === PID && made.workspaceId === LINE7, `2 made on ${NAME}, on Line 7 — nobody asked which project`, JSON.stringify({ id, p: made?.projectId, w: made?.workspaceId }));
  ok(await projectRail() && await onProject() === PID, '2 it opens in the project — its rail, the top bar on it');
}

/* ---- 3 the Problem button there takes a problem for the project ---- */
{
  await page.locator('.qs-top').first().click(); await page.waitForTimeout(900);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  const pj = await sheet.getByLabel('Which project').evaluate(el => el.options[el.selectedIndex]?.text);
  ok(pj === NAME, `3 the Problem button on the SMED: for ${pj}`);
  await sheet.locator('textarea').first().fill('Changeover trolley missing its 1.25 kg former — P2');
  const ask = sheet.getByRole('group', { name: "Which of the project's lines" });
  if (await ask.count()) await ask.getByRole('button', { name: 'Line 7', exact: true }).click();
  await page.waitForTimeout(300);
  await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
  const sn = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.problem === 'Changeover trolley missing its 1.25 kg former — P2'));
  ok(sn?.projectId === PID && sn?.workspaceId === LINE7, `3 saved for ${NAME}, on Line 7`, JSON.stringify({ p: sn?.projectId, w: sn?.workspaceId }));
  if (sn) await page.evaluate(async id => (await import('/src/db.ts')).deleteSnag(id), sn.id);
}

/* ---- 4 Line Talk from the rail is on the project, and knows it ---- */
{
  await tool('Line Talk').click(); await page.waitForTimeout(1500);
  ok(page.url().endsWith(`#/talk?project=${PID}`) && await projectRail(), '4 Line Talk from the project’s rail, in the project', page.url());
  ok(flat(await page.locator('.tk-new .ie-for').innerText()).startsWith(`For ${NAME} — Line Talk knows the project`), '4 it says it is for the project');
  const talks = (await studies()).filter(s => s.tool === 'talk');
  const listed = await page.locator('.lt-li[data-talk]').evaluateAll(els => els.map(e => e.getAttribute('data-talk')));
  ok(same(listed, talks.filter(s => s.projectId === PID).map(s => s.id)), `4 the project's talks listed (${listed.length})`);
  await page.getByLabel('Which line').selectOption(LINE7);
  await page.getByRole('button', { name: 'Start a Line Talk' }).click(); await page.waitForTimeout(2000);
  const id = page.url().split('#/talk/')[1]?.split(/[?#]/)[0];
  const t = (await studies()).find(s => s.id === id);
  ok(t?.projectId === PID && t?.workspaceId === LINE7, `4 started on ${NAME}, on Line 7`, JSON.stringify({ id, p: t?.projectId, w: t?.workspaceId }));
  ok(await projectRail() && await onProject() === PID, '4 the talk opens in the project');
  await page.locator('.tk-knows summary').click(); await page.waitForTimeout(300);
  ok((await page.locator('.tk-knows-t').innerText()).includes(`THIS CONVERSATION IS ON THE PROJECT: ${NAME}`), '4 Line Talk knows the project it is on');
}

/* ---- 5 Line capacity from the rail: the project's, no "For a project?" ---- */
{
  await tool('Line capacity').click(); await page.waitForTimeout(1500);
  ok(page.url().endsWith(`#/balances?project=${PID}`) && await projectRail(), '5 Line capacity from the project’s rail, in the project', page.url());
  const where = (await page.locator('.lt-li .lt-where').allInnerTexts()).map(flat);
  ok(where.every(w => w === `On ${NAME}`), `5 every product listed is the project's (${where.length})`, where.join(' | '));
  await page.getByRole('button', { name: 'New line capacity' }).first().click(); await page.waitForTimeout(500);
  const dlg = dialog();
  ok(await dlg.getByLabel('Attach to a project').count() === 0 && flat(await dlg.locator('.ie-for').innerText()).startsWith(`For ${NAME}`), '5 no "For a project?" asked — it is for the project');
  const first = (await dlg.locator('select').first().locator('option').allInnerTexts()).map(flat);
  ok(same(first.slice(0, 2), facts.lineNames), `5 its lines first: ${first.slice(0, 2).join(', ')}`);
  await dlg.locator('select').first().selectOption(LINE7);
  await dlg.getByPlaceholder(/Maris Piper/).fill('P2 Tray pack 6');
  await dlg.getByRole('button', { name: 'Make it and balance the line' }).click(); await page.waitForTimeout(2000);
  const st = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStandards()).find(s => s.product === 'P2 Tray pack 6' && !s.deletedAt));
  ok(st?.projectId === PID && st?.workspaceId === LINE7 && !!st?.capacity, `5 made on ${NAME}, on Line 7, its capacity started`, JSON.stringify({ p: st?.projectId, w: st?.workspaceId }));
  ok(await projectRail() && await onProject() === PID, '5 it opens in the project');
}

/* ---- 6 outside a project, nothing changed ---- */
{
  await go('#/smed');
  ok(/YOUR FACTORY/i.test(await rail()) && await onProject() === '' && await page.locator('.ip-scope').count() === 0, '6 SMED from the control room: the control room’s rail, no project, every line');
  const all = (await studies()).filter(s => s.tool === 'changeover').map(s => s.id);
  ok((await shownIds()).every(id => all.includes(id)) && (await shownIds()).includes(sd.changeoverId) && (await shownIds()).includes(made?.id), '6 …every one listed, the project’s new one among them');
  await go(`#/smed/${sd.changeoverId}`);
  ok(await onProject() === '' && /YOUR FACTORY/i.test(await rail()), '6 a quick session on no project opens on no project');
  await go(`#/smed/${sd.pacedChangeoverId}`);
  ok(await onProject() === PID && await projectRail(), '6 the project’s own SMED, reached with no project in its address, opens in the project');
}

/* ---- 7 the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/smed?project=${PID}`);
  const bar = (await page.locator('.nv-bar .nv-bi-l').allInnerTexts()).map(flat);
  const more = await page.locator('.nv-bar .nv-bi', { hasText: 'More' }).getAttribute('aria-current');
  ok(bar[0] === 'Control room' && bar[1] === 'This project' && bar[bar.length - 1] === 'More' && more === 'page', `7 the phone: the project's bar — ${bar.join(' · ')}, More lit`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide <= 1 && await page.locator('.ip-scope .chip').count() === 3, `7 nothing off the side (${wide}px), the three chips on it`);
}

ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\nThe project as the workspace NOT accepted: ${fail} failed` : '\nThe project as the workspace accepted: a tool opened inside the project keeps its rail and lists its own; what is made there — a SMED, a problem, a Line Talk, a Line capacity — is the project\'s and opens in it; outside a project nothing changed; the phone.');
process.exit(fail ? 1 : 0);
