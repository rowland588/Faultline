/* ACCEPTANCE — THE LINE'S FULL PACKAGE (3 November; src/line/report/linePackage, linePackagePdf, LineReportScreen).
 *
 * Rowland: "If I go to line 2A and I build a report, I don't have the line standards on there … I'm trying to send almost a package of
 * information to my client … problems, programs, tests, the failures, all of it, including the maps … I'm not asking for a summary of any
 * tests. It actually prints off its actual report itself … we could have the line as a short report, which is almost a summary … or the
 * line full report, which prints off the tools, individual reports … literally what you would see, all the graphics, and then that gets
 * sent." On the smoke seed's line, in a real browser, the paper read back:
 *
 *   1  Report ▾ › Line report — full package opens the line's report page on its Full package tab, the paper made on arrival, save=1 gone;
 *      the Summary kept beside it
 *   2  the page lists the package in the module's order; the cover and contents say the same, in that order, each with its package page
 *   3  every section is the paper that tool prints on its own, found on the page the contents give: the line at a glance, Problems, Programs
 *      (the status typed by hand and the note written on a test's study, under the test), Machines, the Line standard's card with its map and
 *      who does what, Line capacity, a study's own paper
 *   4  each page leaves with its package page, small — except the line standard's card, a picture to the edge
 *   5  the Summary tab still makes the summary — not the package, and shorter
 *   6  Machines report unticked and one study unticked — those papers gone, the rest kept, the contents following
 *   6b the closed problems are in (3 November — "add the closed problems and test cards … ensure problems have a report and included"): the
 *      Problems report holds the open one and the two closed, each with its words; Problem cards a page for each of the three; Test cards a
 *      card for Program 10's test, landscape, naming it
 *   7  the phone: nothing off the side, both tabs reachable
 *   8  Report ▾ with all its papers never runs off the window (3 November — "the menu itself doesn't now fit on the screen"): on a short desk
 *      window and on a phone the list ends inside the window, scrolls inside itself, and the last paper can be reached and pressed
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-package.mjs      (SMOKE_BASE, as smoke) */
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
let fail = 0; const ok = (c, m, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && detail ? ` — ${String(detail).slice(0, 400)}` : ''}`); if (!c) fail++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => s.replace(/\s+/g, '');
const go = async (hash, wait = 2500) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(wait); };
const dir = mkdtempSync(join(tmpdir(), 'line-report-'));
const readPdf = async (d, file) => { const f = join(dir, file); await d.saveAs(f); return { text: execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))?.[1]) }; };

const nows2 = s => s.replace(/\s+/g, '');
const pageText = (f, n) => execFileSync('pdftotext', ['-f', String(n), '-l', String(n), '-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');
const coverRows = f => { const ls = execFileSync('pdftotext', ['-f', '1', '-l', '2', '-layout', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n'); /* only under the heading — the band's own Papers · Pages tiles are not papers */
  return ls.slice(ls.findIndex(l => /What is in this package/.test(l))).map(l => /^\s*(\S.*?\S)\s{2,}(\d+)(?:\D+(\d+))?\s*$/.exec(l)).filter(Boolean).map(m => ({ title: flat(m[1]), start: Number(m[2]) })); };

await go('#/room', 3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const LINE = sd.wsId;

/* a program on the line, proved by a test whose study carries a note (Program 10's case), and the status typed by hand */
await page.evaluate(async ([ws]) => {
  const { putProgram } = await import('/src/db/programs.ts'); const { putTest } = await import('/src/db/testing.ts'); const { putStudy } = await import('/src/db/studies.ts');
  const t = Date.now();
  await putProgram({ id: 'pg10', workspaceId: ws, what: 'Program 10', state: 'onMachine', testId: 't10', status: { work: 'doing', bestSpeed: 75, runAt: 70, caveats: 'Only on the 2 kg film', at: t }, createdAt: t, updatedAt: t, sort: 1 });
  await putTest({ id: 't10', projectId: 'line:' + ws, workspaceId: ws, title: 'Prove Program 10', kind: 'test', outcome: 'failed', programId: 'pg10', ranOn: '2026-11-02', sort: 1, createdAt: t, updatedAt: t });
  await putStudy({ id: 's10', tool: 'capability', name: 'Program 10 at 70 ppm', workspaceId: ws, uses: [{ id: 'u10', kind: 'test', ref: 't10', role: 'proof', at: t, by: 'x' }], agreed: {}, facts: { remarks: [{ id: 'rm1', at: t, text: 'Seal lifted on the third pack at 75', by: 'Rowland' }] }, startedAt: t, createdAt: t, updatedAt: t });
}, [LINE]);

/* 1 · from Report ▾, made on arrival */
await go(`#/lines/${LINE}`, 3500);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 300000 }), paper(page, 'Line report — full package', page.locator('.pl'))]);
await page.waitForTimeout(1200);
ok(page.url().includes(`#/lines/${LINE}/report`) && page.url().includes('full=1') && !/save=1/.test(page.url()), `1 the full package made on arrival at the line's report page, save=1 gone (${page.url().split('#')[1]})`);
ok(await page.getByRole('tab', { name: 'Full package', selected: true }).count() === 1 && await page.getByRole('tab', { name: 'Summary' }).count() === 1, '1 the Full package tab lit, the Summary beside it');
const full = await readPdf(dl, 'package.pdf'); const F = join(dir, 'package.pdf');

/* 2 · the page's order = the cover's order, each with its page */
const order = (await page.locator('[data-package] ol li').allInnerTexts()).map(t => flat(t.split('\n')[0]));
const rows = coverRows(F);
ok(order.length >= 6 && order.every((t, i) => rows[i] && nows2(rows[i].title) === nows2(t.replace('→', 'to')) || (rows[i] && nows2(rows[i].title).startsWith(nows2(t).slice(0, 18)))), `2 the cover's contents are the page's list, in its order (${order.length} papers)`, JSON.stringify({ order: order.slice(0, 4), rows: rows.slice(0, 4) }));
ok(rows.length === order.length && rows.every((r, i) => i === 0 || r.start > rows[i - 1].start), '2 each paper starts on a later page than the one before', JSON.stringify(rows.slice(0, 6)));

/* 3 · each section is its own paper, on the page the contents give */
const find = (re) => { const r = rows.find(x => re.test(x.title)); return r ? { r, text: pageText(F, r.start) } : undefined; };
const glance = find(/line at a glance/i);
ok(glance && /THE LINE AT A GLANCE/.test(glance.text) && /Who owes what by when/.test(pageText(F, glance.r.start) + pageText(F, glance.r.start + 1)), '3 the line at a glance — the tiles, what is open, who owes what; no tool sections in it', glance?.text.slice(0, 160));
const endOf = r => { const k = rows.indexOf(r); return k >= 0 && rows[k + 1] ? rows[k + 1].start - 1 : full.pages; };
const textOf = r => { let t = ''; for (let n = r.start; n <= endOf(r); n++) t += ' ' + pageText(F, n); return t; };
const probs = find(/^Problems$/);
const probsAll = probs ? textOf(probs.r) : '';
ok(probs && /problems/.test(probs.text) && /seeded snag 0/.test(probsAll), '3 Problems — the problems report itself, each problem with its plan', probs?.text.slice(0, 160));
ok(/seeded snag 1/.test(probsAll) && /seeded snag 2/.test(probsAll) && /Closed/.test(probsAll), '3b …the closed problems in it too, said Closed — what was put right is part of what happened', probsAll.slice(0, 300));
const pcards = find(/^Problem cards/);
ok(pcards && endOf(pcards.r) - pcards.r.start + 1 === 3 && /seeded snag 0/.test(textOf(pcards.r)) && /seeded snag 2/.test(textOf(pcards.r)), '3b Problem cards — a page for each of the three problems, open and closed', pcards && `${endOf(pcards.r) - pcards.r.start + 1} pages: ${textOf(pcards.r).slice(0, 160)}`);
const tcards = find(/^Test cards/);
ok(tcards && /Page\s+\d+ size:\s+841/.test(execFileSync('pdfinfo', ['-f', String(tcards.r.start), '-l', String(tcards.r.start), F], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) && /Prove Program 10/.test(textOf(tcards.r)), '3b Test cards — Program 10’s test as its own card, landscape, naming it', tcards && textOf(tcards.r).slice(0, 200));
ok(tcards && !new RegExp(`Package page ${tcards.r.start} of`).test(pageText(F, tcards.r.start)), '4 the test cards, pictures to the edge, carry no package number — their pages are in the contents');
const progs = find(/^Programs/);
const progAll = progs ? [0, 1, 2].map(k => pageText(F, progs.r.start + k)).join(' ') : '';
ok(progs && /PROGRAMS · PRODUCTION LINE/.test(progs.text), '3 Programs — the programs report itself', progs?.text.slice(0, 160));
ok(nows2(progAll).includes(nows2('STATUS Doing · Best speed 75 ppm · Production can run at 70 ppm')) && nows2(progAll).includes(nows2('CAVEATS — WHAT TO WATCH Only on the 2 kg film')) && nows2(progAll).includes(nows2('Note:')) && nows2(progAll).includes(nows2('Seal lifted on the third pack at 75')), '3 …with Program 10’s status typed by hand, and the note written on its test’s study, under the test', progAll.slice(0, 200));
const mach = find(/^Machines/);
ok(mach && /EVERY MACHINE/.test(mach.text), '3 Machines — every machine in full', mach?.text.slice(0, 160));
const std = find(/^Line standards/);
/* the card is a picture edge to edge (the map and who does what are drawn into it), so it is read as a landscape page holding an image, and its product on the cover */
const sizeOf = n => execFileSync('pdfinfo', ['-f', String(n), '-l', String(n), f0], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const f0 = F;
const cardImages = std ? execFileSync('pdfimages', ['-list', '-f', String(std.r.start), '-l', String(std.r.start), F], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(l => /^\s*\d+\s+\d+\s+image/.test(l)).length : 0;
const coverText = pageText(F, 1) + pageText(F, 2);
ok(std && /Page\s+\d+ size:\s+841/.test(sizeOf(std.r.start)) && cardImages >= 1 && /Maris Piper 2kg/.test(coverText), '3 the Line standard’s card with its map and who does what — a landscape page, the picture itself, its product on the contents — the one that was missing', `${std?.r.start} images=${cardImages}`);
const cap = find(/^Line capacity/);
ok(cap && /LINE CAPACITY/.test(cap.text), '3 Line capacity — its own pages', cap?.text.slice(0, 120));
const study = rows.find(r => /Control chart/i.test(r.title));
ok(study && /Fill weight/.test(pageText(F, study.start)), '3 a study’s own paper — the control chart, on the page the contents give', study && pageText(F, study.start).slice(0, 120));

/* 4 · the package page, small, on every page but the card */
ok(full.text.includes(`Package page 1 of ${full.pages}`) && full.text.includes(`Package page ${full.pages} of ${full.pages}`), `4 every page says its place in the package (${full.pages} pages)`);
ok(std && !new RegExp(`Package page ${std.r.start} of`).test(pageText(F, std.r.start)), '4 the line standard’s card, a picture to the edge, carries none — its page is in the contents');

/* 5 · the Summary tab still makes the summary */
await page.getByRole('tab', { name: 'Summary' }).click(); await page.waitForTimeout(600);
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 240000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click()]);
const sum = await readPdf(d2, 'summary.pdf');
ok(/THE LINE REPORT — EVERYTHING ON THE LINE/.test(sum.text) && !/THE FULL LINE REPORT/.test(sum.text) && !/Package page/.test(sum.text) && sum.pages < full.pages, `5 the Summary tab makes the summary, not the package (${sum.pages} pages against ${full.pages})`);

/* 6 · unticked: the machines report, and one study */
await page.getByRole('tab', { name: 'Full package' }).click(); await page.waitForTimeout(600);
await page.getByRole('checkbox', { name: 'Machines report' }).uncheck();
const firstStudy = page.locator('.lr-ticks[aria-label^="What goes in"] input[aria-label^="Control chart"]').first();
const studyName = await firstStudy.getAttribute('aria-label'); await firstStudy.uncheck();
const [d3] = await Promise.all([page.waitForEvent('download', { timeout: 300000 }), page.getByRole('button', { name: 'Download the full package' }).first().click()]);
const less = await readPdf(d3, 'less.pdf'); const F3 = join(dir, 'less.pdf'); const rows3 = coverRows(F3);
ok(!rows3.some(r => /^Machines/.test(r.title)) && !rows3.some(r => /Control chart/i.test(r.title)) && rows3.some(r => /^Programs/.test(r.title)) && rows3.length === rows.length - 2 && less.pages < full.pages, `6 Machines report and ${studyName} unticked — both papers gone, the rest kept, the contents following (${rows3.length} papers, ${less.pages} pages)`, JSON.stringify(rows3.map(r => r.title)));

/* 7 · the phone */
await page.setViewportSize({ width: 390, height: 800 }); await go(`#/lines/${LINE}/report?full=1`, 2500);
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1 && await page.getByRole('tab', { name: 'Full package' }).isVisible() && await page.getByRole('tab', { name: 'Summary' }).isVisible(), `7 the phone: nothing off the side (${over}px), both tabs there`);
/* 8 · the Report ▾ list fits the window and scrolls */
for (const [w, h, label] of [[1360, 520, 'a short desk window'], [390, 640, 'a phone']]) {
  await page.setViewportSize({ width: w, height: h }); await go(`#/lines/${LINE}`, 2500);
  await page.locator('.pl .part-head .part-menu-b', { hasText: /^Report/ }).click(); await page.waitForTimeout(300);
  const m = await page.evaluate(() => { const l = document.querySelector('.part-menu-list'); const r = l.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: window.innerHeight, sh: l.scrollHeight, ch: l.clientHeight, oy: getComputedStyle(l).overflowY }; });
  ok(m.bottom <= m.h + 1 && m.top >= 0 && m.sh > m.ch && /auto|scroll/.test(m.oy), `8 ${label}: the Report list ends inside the window (${Math.round(m.bottom)} of ${m.h}) and scrolls inside itself (${m.sh} in ${m.ch})`, JSON.stringify(m));
  const items = page.getByRole('menuitem'); const last = items.last();
  await last.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const lb = await last.boundingBox();
  ok(lb && lb.y >= 0 && lb.y + lb.height <= h + 1, `8 ${label}: the last paper (${flat(await last.innerText()).slice(0, 40)}) can be scrolled to and is on the screen`, JSON.stringify(lb));
  await page.keyboard.press('Escape');
}

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? '\nFAILED' : '\nALL PASSED');
process.exit(fail ? 1 : 0);
