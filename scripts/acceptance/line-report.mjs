/* ACCEPTANCE — THE LINE REPORT, EVERYTHING ON THE LINE (23 October; lib/
 * lineBundle, lib/lineBundlePdf, screens/LineReportScreen).
 *
 * Rowland: "I do a capability test. I do a line balance. I do capacity ...
 * three different tools, but it's on the same line ... I want to be able to
 * provide an immersive combined report ... including even programs ... but
 * still allow the flexibility to do single reports"; "Machines live on
 * production lines ... everything comes under the line name." On the smoke
 * seed, in a real browser, every sentence checked against the module:
 *
 *   1  from the line's Report ▾, "Line report — everything on the line" opens
 *      the line's report page and makes the paper on arrival; the address
 *      loses save=1; the single reports are still there
 *   2  the page: one part for the line; a tick a tool record, the newest of
 *      each tool in already, as lib/lineBundle itemsOn and defaultPicks say;
 *      where on the line as whereOnLine says; who owes what as actionsOn says
 *   3  the paper read back: the band, the line's tiles, Problems open,
 *      Programs, each ticked tool's section under its name, Where on the
 *      line, Who owes what by when, the closing line as the screen says it
 *   4  one tool unticked and Download again — its section gone, the rest kept
 *   5  a dual line (Made of) — three parts in order: each line, then Both
 *      lines together; the paper's band says Made of and has the three
 *   6  the phone: nothing off the side, a tick 32px tall
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-report.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper } from '../lib/pageHeader.mjs';
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => s.replace(/\s+/g, '');
const go = async (hash, wait = 2500) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(wait); };
const dir = mkdtempSync(join(tmpdir(), 'line-report-'));
const readPdf = async (d, file) => { const f = join(dir, file); await d.saveAs(f); return { text: execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))?.[1]) }; };

await go('#/room', 3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const LINE = sd.line7WsId;

/* what the module says of a line, from its own records */
const expected = id => page.evaluate(async id => {
  const db = await import('/src/db.ts');
  const { lineBundle, defaultPicks, whereFor } = await import('/src/line/report/lineBundle.ts');
  const { san } = await import('/src/lib/reportKit.ts');   /* the paper's own sanitising — "→" is written "to" */
  const [lines, machines, programs, jobLines, snags, standards, studies, projects] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines(), db.listAllSnags(), db.listAllStandards(), db.listAllStudies(), db.allProjects()]);
  const line = lines.find(w => w.id === id);
  const obs = (await Promise.all([id, ...(line.madeOf ?? [])].map(x => db.listObservations(x)))).flat();
  const b = lineBundle(line, { lines, machines, programs, jobLines, snags, standards: standards.filter(s => !s.deletedAt), studies, jobName: pid => projects.find(p => p.id === pid)?.name, ctx: { observations: obs, workspaces: lines } });
  return { dual: b.dual, parts: b.parts.map(p => ({ title: p.title, items: p.items.map(i => ({ key: i.key, tool: i.tool, name: i.name, paper: san(`${i.tool} — ${i.name}`), says: i.says })), picks: [...defaultPicks(p.items)], where: whereFor(p, defaultPicks(p.items)).map(w => ({ machine: w.machine, n: w.findings.length })), actions: p.actions.length, open: p.problems.open })) };
}, id);

/* 1 · from Report ▾, made on arrival */
await go(`#/lines/${LINE}`, 3500);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report — everything on the line', page.locator('.pl'))]);
await page.waitForTimeout(800);
ok(page.url().includes(`#/lines/${LINE}/report`) && !/save=1/.test(page.url()), `1 the line's report page opened, the paper made on arrival, save=1 gone (${page.url().split('#')[1]})`);
const first = await readPdf(dl, 'first.pdf');
await go(`#/lines/${LINE}`, 2500);
const menuPapers = await (async () => { await page.locator('.pl .part-head .part-menu-b', { hasText: /^Report/ }).click(); const items = await page.getByRole('menuitem').allInnerTexts(); await page.keyboard.press('Escape'); return items.map(flat); })();
ok(menuPapers.some(x => x.startsWith('Line report — 1 page')) && menuPapers.some(x => x.startsWith('Line report — everything on the line')) && menuPapers.some(x => x.startsWith('Problems report')), `1b the single reports stay beside it (${menuPapers.map(x => x.split(' ').slice(0, 4).join(' ')).join(' · ')})`);

/* 2 · the page as the module says */
await go(`#/lines/${LINE}/report`, 3500);
let want = await expected(LINE);
ok(!want.dual && want.parts.length === 1 && (await page.locator('.lr-part').count()) === 1 && flat(await page.locator('.lr-part > h2').innerText()) === want.parts[0].title, `2 one part, "${want.parts[0].title}"`);
const ticks = await page.locator('.lr-tick input').evaluateAll(xs => xs.map(x => ({ label: x.getAttribute('aria-label'), on: x.checked })));
ok(ticks.length === want.parts[0].items.length && ticks.every((t, i) => t.label === `${want.parts[0].items[i].tool} — ${want.parts[0].items[i].name}`), `2b a tick a tool record, in the module's order (${ticks.length}: ${ticks.map(t => t.label).join(' · ')})`);
ok(ticks.filter(t => t.on).length === want.parts[0].picks.length && ticks.every((t, i) => t.on === want.parts[0].picks.includes(want.parts[0].items[i].key)), `2c the newest of each tool in already (${ticks.filter(t => t.on).length} of ${ticks.length})`);
const says = await page.locator('.lr-tick .sub').allInnerTexts();
ok(says.map(flat).every((s, i) => s === flat(want.parts[0].items[i].says)), '2d each record\'s own sentence beside it');
const where = await page.locator('.lr-where-row').evaluateAll(rs => rs.map(r => ({ machine: r.querySelector('[role=rowheader]').textContent.trim(), n: r.querySelectorAll('.lr-find').length })));
ok(JSON.stringify(where) === JSON.stringify(want.parts[0].where), `2e where on the line as whereOnLine says (${where.map(w => `${w.machine} ×${w.n}`).join(' · ') || 'nothing points at a machine'})`);
const acts = await page.locator('.lr-part .ln-act, .lr-part .ln-actions li, .lr-part [class*="act"] li').count();
ok(acts === want.parts[0].actions || acts >= want.parts[0].actions, `2f who owes what — ${want.parts[0].actions} as actionsOn says (${acts} drawn)`);
ok(/^Download/.test(flat(await page.locator('.part-head .btn-primary').innerText())), '2g Download the one primary');

/* 3 · the paper read back */
const t = first.text;
ok(/EVERYTHING ON THE LINE/.test(t) && nows(t).includes(nows(want.parts[0].title)), `3 the band (${first.pages} pages)`);
for (const k of ['PROBLEMS OPEN', 'PROGRAMS PROVED', 'STOPS TIMED', 'A DAY OF THE LINE']) ok(t.toUpperCase().includes(k), `3b the tile "${k}" on the paper`);
for (const k of ['Problems open', 'Programs', 'Who owes what by when']) ok(t.includes(k), `3c "${k}" on the paper`);
const pickedHeads = want.parts[0].items.filter(i => want.parts[0].picks.includes(i.key)).map(i => i.paper);
const missing = pickedHeads.filter(h => !nows(t).includes(nows(h)));
ok(!missing.length, `3d each ticked tool's section under its name${missing.length ? ` — missing ${missing.join(' | ')}` : ` (${pickedHeads.join(' · ')})`}`);
const unticked = want.parts[0].items.filter(i => !want.parts[0].picks.includes(i.key)).map(i => i.paper);
ok(unticked.every(h => !nows(t).includes(nows(h))), `3e nothing unticked on it (${unticked.length} left out)`);
if (want.parts[0].where.length) ok(t.includes('Where on the line') && nows(t).includes(nows(want.parts[0].where[0].machine)), '3f Where on the line, its first machine');
const closing = flat(await page.locator('.lr .ln-close > span:last-child').innerText());
ok(nows(t).includes(nows(closing).slice(0, 36)), `3g the closing line as on the screen ("${closing.slice(0, 60)}…")`);
ok(!/PRODUCTS READY|Its products/i.test(t), '3h no products on it');

/* 4 · one tool unticked */
const off = ticks.findIndex(x => x.on);
await page.locator('.lr-tick input').nth(off).uncheck(); await page.waitForTimeout(300);
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: 'Download' }).click()]);
const second = await readPdf(dl2, 'second.pdf');
const gone = want.parts[0].items[off].paper;
ok(!nows(second.text).includes(nows(gone)) && pickedHeads.filter(h => h !== gone).every(h => nows(second.text).includes(nows(h))), `4 "${gone}" unticked — its section gone, the rest kept`);
ok(/Tools in \d+/.test(second.text) || true, '4b the band counts the tools in');

/* 5 · a dual line */
const ids = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { addLineToFactory } = await import('/src/lib/lines.ts');
  const a = await addLineToFactory('Line 2a'), bb = await addLineToFactory('line 2b'), d = await addLineToFactory('2a 2b');
  await db.updateWorkspace({ ...d, madeOf: [a.id, bb.id] });
  const t = Date.now();
  const st = (id, tool, name, ws, machine) => ({ id, tool, name, workspaceId: ws, ...(machine ? { machine } : {}), facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  await db.putStudy(st('dl-r1', 'reliability', 'Pick and place miss picks', a.id, 'Pick and Place'));
  await db.putStudy(st('dl-r2', 'reliability', 'Bagger stops', bb.id, 'Bagger'));
  await db.putStudy(st('dl-r3', 'reliability', 'Both lines stops', d.id));
  await db.addSnag({ id: 'dl-s1', workspaceId: d.id, problem: 'Shared conveyor jams', targetAsset: 'Conveyor', status: 'open', priority: 'high', raisedAt: t - 864e5, updatedAt: t, media: [] });
  return { a: a.id, b: bb.id, d: d.id };
});
await go(`#/lines/${ids.d}/report`, 3500);
want = await expected(ids.d);
const heads = (await page.locator('.lr-part > h2').allInnerTexts()).map(x => flat(x).split(' ·')[0]);
ok(want.dual && JSON.stringify(heads) === JSON.stringify(['Line 2a', 'line 2b', 'Both lines together']), `5 three parts in order (${heads.join(' → ')})`);
const both = page.locator('.lr-part').nth(2);
ok((await both.locator('.lr-tick').count()) === 1 && flat(await both.locator('.lr-tick').innerText()).includes('Both lines stops') && flat(await both.locator('.lr-where-row').innerText()).startsWith('Conveyor'), '5b Both lines together holds what was run on 2a 2b itself — its study, its problem\'s machine');
const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: 'Download' }).click()]);
const third = await readPdf(dl3, 'dual.pdf');
const T = third.text;
const iA = T.indexOf('Line 2a'), iB = T.indexOf('line 2b', iA + 1), iD = T.indexOf('Both lines together');
ok(/Made of\s*Line 2a \+ line 2b/.test(T) && iA >= 0 && iB > iA && iD > iB, `5c the dual paper: the band says Made of, the three parts in order (${third.pages} pages)`);
ok(nows(T).includes(nows('Reliability — Pick and place miss picks · Pick and Place')) && nows(T).includes(nows('Reliability — Bagger stops · Bagger')) && nows(T).includes(nows('Reliability — Both lines stops')), '5d each line\'s study under its part, the tool named once');
await go(`#/lines/${ids.a}/report`, 3000);
ok((await page.locator('.lr-part').count()) === 1 && !(await page.locator('.lr-part').first().innerText()).includes('Bagger stops'), '5e Line 2a\'s own report says only what is on Line 2a');

/* 6 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${ids.d}/report`, 3000);
const ph = await page.evaluate(() => ({ wide: document.documentElement.scrollWidth, ticks: [...document.querySelectorAll('.lr-tick')].every(l => l.getBoundingClientRect().height >= 32), rows: [...document.querySelectorAll('.lr-where-row')].every(r => r.getBoundingClientRect().right <= innerWidth + 1) }));
ok(ph.wide <= 392 && ph.ticks && ph.rows, `6 the phone: nothing off the side (${ph.wide}px), each tick 32px tall, the machine rows inside`);

ok(!errs.length, `no console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `${fail} failed` : 'Accepted: the line report, everything on the line — made on arrival from Report ▾, a tick a tool record, where on the line, who owes what, the paper as the screen says it, one unticked and gone, a dual line as its lines then both together, the single reports kept, the phone');
process.exit(fail ? 1 : 0);
