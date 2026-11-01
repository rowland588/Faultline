/* ACCEPTANCE — THE PROJECT REPORT (docs/METHODS.md §17; lib/methodReportModel, project/method/MethodReportScreen,
 * lib/report/methodReport — Rowland, 1 November: "let me view what everything is telling me right now; then a beautiful dynamic
 * report appropriately presenting everything. Must be correct. Do not skip on the reports."):
 *
 *   1  the dashboard's “View the project report ›” opens #/project/:id/method-report; the page's words are the model's — every line
 *      of reportLines() is on the page (the cover, the tiles, each section, the closing line), the sections in order
 *   2  the page is live: a section written moves the tiles and the Q&A with no reload; a late action shows in attention + tiles
 *   3  Print and Report ▾ › Project report make the paper; ?save=1 makes it on arrival; the old “Project report — where we are” is gone
 *   4  the paper read back with pdftotext: EVERY line the page says is on the paper, the tool’s own paper blocks (title + sentence,
 *      its figures), the money line of a SMED, the team’s own words, the page count sane (2–8), page numbers
 *   5  a client reads and prints it; a phone fits
 *
 *   node scripts/acceptance/method-report.mjs      (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { paper as pressPaper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, norm } = t;
const sd = await t.seed();
const DM = sd.methodProjectIds.dmaic, PD = sd.methodProjectIds.pdca, KZ = sd.methodProjectIds['kaizen-event'];
/* compare words, not typography: letters and digits and £ and %, lower case */
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const model = pid => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(s => s.id), titles: l.report.sections.map(s => s.title), tiles: l.report.cover.tiles.map(x => [x.k, x.v]), tools: l.report.sections.flatMap(s => s.items.filter(i => i.kind === 'tool').map(i => [i.title, i.says])), money: l.report.sections.flatMap(s => s.items.filter(i => i.kind === 'money').map(i => [i.text, i.missing])), closing: l.report.closing.text, project: l.projectName };
}, pid);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');
const paperOf = async press => {
  const dir = mkdtempSync(join(tmpdir(), 'mrep-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), press()]);
  const file = join(dir, 'p.pdf'); await dl.saveAs(file);
  const text = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' });
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0);
  return { text, pages };
};
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };

/* ---- 1 from the dashboard to the page; the page is the model ---- */
await go(`#/project/${DM}`, 2200);
await page.getByRole('button', { name: /View the project report/ }).click();
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
ok(page.url().includes(`/project/${DM}/method-report`), '1 “View the project report ›” opens the report page');
let m = await model(DM), pt = await pageText();
ok(m.ids.join() === 'journey,telling,attention,dmaic-reviews,dmaic-charter,dmaic-next,wrote' && JSON.stringify(m.titles) === JSON.stringify(await page.locator('.mrep-h').allTextContents()), `1 the sections in order: ${m.titles.join(' · ')}`);
let gone = missing(m.lines, pt);
ok(gone.length === 0, `1 every one of the model’s ${m.lines.length} lines is on the page${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(m.tools.length >= 1 && (await page.locator('.mrep-tool .mrep-tool-says').allTextContents()).map(norm).join() === m.tools.map(x => norm(x[1])).join(), `1 each tool in its own sentence (${m.tools.length}): ${m.tools[0]?.[1].slice(0, 70)}…`);
ok(squash(await page.locator('.ln-close').innerText()).includes(squash(m.closing)) && /Why:/.test(m.closing) && /Doing about it:/.test(m.closing), '1 the closing line answers where we are, why and what we are doing');
ok((await page.locator('.ln-tile').count()) === 4 && (await page.locator('.mrep .ln-band').count()) === 1, '1 the band and four tiles');

/* ---- 2 live: nothing reloads ---- */
const before = m.tiles[0][1];
await page.evaluate(async pid => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  const f = S.fieldsOf('dmaic', 'Define')[0];
  await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('dmaic', f.id), kind: 'note', what: 'Seal failures on jaw 2 at 3.1% of packs', sort: now, createdAt: now, updatedAt: now });
  await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: '', kind: 'next', what: 'Re-time the jaw heater', owner: 'Priya', due: '2026-01-05', sort: now, createdAt: now, updatedAt: now });
}, DM);
await page.waitForFunction(() => document.querySelector('.mrep')?.textContent?.includes('Seal failures on jaw 2 at 3.1% of packs'), null, { timeout: 15000 }).catch(() => {});
m = await model(DM); pt = await pageText();
ok(pt.includes('Seal failures on jaw 2 at 3.1% of packs'), '2 a section written appears in What we wrote with no reload');
ok(m.tiles[3][1] === '1' && /Re-time the jaw heater/.test(pt) && /Priya/.test(pt) && /Late/.test(pt), '2 a late action: in the tiles, in attention with who and the day, marked Late');
ok(missing(m.lines, pt).length === 0 && m.tiles[0][1] !== undefined, '2 the page still equals the model');
ok((await page.locator('.mrep-call.is-r .mrep-word').first().textContent()) === 'Needs attention', '2 a red call-out carries its word');

/* ---- 3 the paper: Print, Report ▾, ?save=1 ---- */
const printed = await paperOf(() => page.getByRole('button', { name: 'Print', exact: true }).click());
ok(printed.pages >= 2 && printed.pages <= 8, `3 Print makes the paper (${printed.pages} pages)`);
const viaMenu = await paperOf(() => pressPaper(page, 'Project report'));
ok(viaMenu.pages === printed.pages, '3 Report ▾ › Project report makes the same paper');
const onArrival = await paperOf(() => page.goto(`${process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191'}/#/project/${DM}/method-report?save=1`)).catch(() => null);
await page.waitForTimeout(800);
ok(!!onArrival && onArrival.pages === printed.pages && !page.url().includes('save=1'), '3 ?save=1 makes it on arrival and clears the address');
await go(`#/project/${DM}`, 2200);
ok(await page.getByRole('button', { name: /^Report/ }).count() > 0, '3 the method page offers Report ▾');
{
  const menu = page.locator('.part-menu-b', { hasText: /^Report/ }).first(); await menu.click();
  const names = await page.getByRole('menuitem').locator('b').allTextContents();
  ok(names[0] === 'Project report' && !names.some(n => /where we are/i.test(n)), `3 the method page’s Report ▾ leads with “Project report” (${names.join(' · ')})`);
  await page.keyboard.press('Escape');
}

/* ---- 4 the paper read back against the model ---- */
m = await model(DM);
gone = missing(m.lines, printed.text);
ok(gone.length === 0, `4 every one of the page’s ${m.lines.length} lines is on the paper${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(m.tiles.every(([k, v]) => squash(printed.text).includes(squash(k)) && squash(printed.text).includes(squash(v))), '4 the four tiles are on the paper');
ok(/Seal strength|Seal temperature|capability/i.test(printed.text) && m.tools.every(([title]) => squash(printed.text).includes(squash(title))), `4 each tool’s own paper is in: its title ${m.tools.map(x => x[0]).join(' · ')}`);
ok(/HOW THE READINGS SPREAD/.test(printed.text) && /THE READINGS, IN THE ORDER TAKEN/.test(printed.text) && /PPK/.test(printed.text) && /MEAN\s+180/.test(printed.text.replace(/\n/g, ' ')), '4 …with the capability study’s own figures and picture (its tiles, the spread, the readings) from its paper blocks');
ok(printed.text.includes('Seal failures on jaw 2 at 3.1% of packs') && /Re-time the jaw heater/.test(printed.text) && /Priya/.test(printed.text), '4 the team’s words, the late action, who owes it');
ok(/\b1 of \d+\b/.test(printed.text) && /printed/i.test(printed.text), '4 page numbers and the printed date');

/* ---- money on a SMED project ---- */
await go(`#/project/${KZ}/method-report`, 2500);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
const km = await model(KZ); pt = await pageText();
ok(km.money.length >= 1, `4 a SMED project says its money by tool: ${km.money.map(x => (x[1] ? '[missing] ' : '') + x[0].slice(0, 80)).join(' | ')}`);
ok(km.money.every(([txt, miss]) => pt.includes(txt) && (!miss || /Nothing is estimated|needs/.test(txt))) && (await page.locator('.mrep-money').count()) === km.money.length, '4 …each on the page, a missing input named and nothing estimated');
{
  const kp = await paperOf(() => page.getByRole('button', { name: 'Print', exact: true }).click());
  ok(missing(km.money.map(x => x[0]), kp.text).length === 0 && missing(km.lines, kp.text).length === 0, '4 …and on the paper, with every line of the page');
}

/* ---- PDCA: the same shape on another method ---- */
await go(`#/project/${PD}/method-report`, 2500);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
const pm = await model(PD); pt = await pageText();
ok(pm.titles.includes('Each cycle against its prediction') && missing(pm.lines, pt).length === 0, '4 a PDCA project’s report is its own: each cycle against its prediction, every line on the page');

/* ---- 5 a client; a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${DM}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.getByRole('button', { name: 'Print', exact: true }).count()) === 1, '5 a client reads the report and can print it');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${DM}/method-report`, 2500);
{ const w = await t.wide(); ok(w <= 1, `5 on a phone nothing is off the side (${w}px over)`); }
{ const wide = await page.evaluate(() => [...document.querySelectorAll('.mrep *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length); ok(wide === 0, `5 no element past the phone’s edge (${wide})`); }

await t.finish('The project report accepted: the page equal to the model, live, the paper carrying every line of it with each tool’s own blocks and its money, a client, a phone');
