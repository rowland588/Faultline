/* ACCEPTANCE — THE 8D'S PROJECT REPORT AND DASHBOARD READING (docs/METHODS.md §17; project/method/report/eight-d,
 * lib/methodInsights/eight-d, lib/eightD): the 8D's seeded project with its answers written (as the board writes them: notes scoped
 * method:eight-d:<field>) —
 *   1  the report page's own sections in order (the eight disciplines · what it is and is not · containment and cause · corrective
 *      actions) sit between What needs attention and What we wrote; every line of the model is on the page
 *   2  the corrective-action table says Late, Open, Done as lib/eightD actionState says; a day typed "7 Nov" is read
 *   3  the 8D's own insight: a late action (red, who has it), a cause that stops at "operator error", a cause with no escape point —
 *      on the dashboard AND in the report's attention; the dashboard's next step chases the late action; no line said twice
 *   4  the action done and the number validated: the late flag goes, the insight clears
 *   5  the paper read back with pdftotext: every line of the page, the tiles, the team's words, the page count sane
 *   6  a client reads and prints; a phone fits
 *
 *   node scripts/acceptance/method-report-eight-d.mjs      (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go } = t;
const sd = await t.seed();
const P = sd.methodProjectIds['eight-d'];
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };
const write = (answers) => page.evaluate(async ({ pid, answers }) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  const have = await db.listTestItems(pid);
  for (const [field, what] of Object.entries(answers)) {
    const scope = S.answerScope('eight-d', field);
    const old = have.find(i => i.testId === scope && !i.deletedAt);
    await db.putTestItem({ id: old?.id ?? crypto.randomUUID(), projectId: pid, testId: scope, kind: 'note', what, sort: old?.sort ?? now, createdAt: old?.createdAt ?? now, updatedAt: now });
  }
}, { pid: P, answers });
const model = () => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id); const r = l.report;
  return { lines: M.reportLines(r), ids: r.sections.map(s => s.id), attention: r.dash.attention.map(a => a.text), next: r.dash.next, tiles: r.cover.tiles.map(x => [x.k, x.v]),
    actions: r.sections.find(s => s.id === 'actions')?.items.find(i => i.kind === 'table')?.rows ?? [] };
}, P);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');
const paperOf = async press => {
  const dir = mkdtempSync(join(tmpdir(), 'mrep8-')); const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), press()]);
  const file = join(dir, 'p.pdf'); await dl.saveAs(file);
  return { text: execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0) };
};

await go(`#/project/${P}`, 2200);
await write({
  customer: 'Retailer X, complaint 4471', symptom: 'Seals open on arrival, lane 3', contain: '14 pallets held and re-sealed',
  is_what: 'Open end seals', isnot_what: 'Open top seals', is_where: 'Lane 3', why: 'Operator error at the jaw change',
  'act@1': 'Retrain the operators', 'actwho@1': 'Sam', 'actdue@1': '2020-01-02',
  'act@2': 'Heater calibration at every jaw change', 'actwho@2': 'Priya', 'actdue@2': '7 Nov 2099',
  'act@3': 'Add the seal check to the round', 'actwho@3': 'Sam', 'actdue@3': '3 Jan 2020', 'actdone@3': 'yes',
});
await go(`#/project/${P}`, 2200);

/* ---- 3 the dashboard first: the 8D's own reading ---- */
const dash = await page.locator('.mdash-a').allTextContents();
ok(dash.some(x => x.startsWith('Corrective action 1 (Retrain the operators) was due 2 Jan') && x.endsWith('Sam has it.')), `3 dashboard: the late action, red, with who has it`);
ok(dash.some(x => x.includes('stopping place')) && dash.some(x => x.startsWith('The cause is written but not the escape point')), '3 dashboard: “operator error” is a stopping place; the escape point is missing');
ok((await page.locator('.mdash-next').innerText()).startsWith('Chase corrective action 1: Retrain the operators (Sam).'), '3 dashboard: the next step chases the late action');
ok((await page.locator('.mdash-a.is-r').count()) >= 1, '3 the late action carries red');

/* ---- 1, 2 the report page ---- */
await page.getByRole('button', { name: /View the project report/ }).click();
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
let m = await model(), pt = await pageText();
ok(m.ids.join() === 'journey,telling,attention,disciplines,isnot,cause,actions,wrote', `1 sections in order: ${m.ids.join(' · ')}`);
const gone = missing(m.lines, pt);
ok(gone.length === 0, `1 every one of the model’s ${m.lines.length} lines is on the page${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(m.actions.map(r => r[4]).join() === 'Late,Open,Done' && m.actions[1][3] === '7 Nov' || m.actions[1][3].startsWith('7 Nov'), `2 the action table says ${m.actions.map(r => r[4]).join(', ')}; “7 Nov 2099” read as a day`);
ok(m.attention.filter(a => /stopping place/.test(a)).length === 1 && (await page.locator('.mrep-call', { hasText: 'stopping place' }).count()) === 1, '3 the insight is in the report’s attention once, not twice');
ok(/Open end seals/.test(pt) && /Open top seals/.test(pt), '2 the is / is-not pairs on the page (what: both sides; where: one side named)');
ok(/2 of the 4 pairs have only one side written|1 of the 4 pairs have only one side written/.test(pt), '2 pairs with one side only are named');

/* ---- 5 the paper ---- */
const printed = await paperOf(() => page.getByRole('button', { name: 'Print', exact: true }).click());
ok(printed.pages >= 2 && printed.pages <= 8, `5 the paper is ${printed.pages} pages`);
const gone2 = missing(m.lines, printed.text);
ok(gone2.length === 0, `5 every line of the page is on the paper${gone2.length ? ' — missing: ' + gone2.slice(0, 3).join(' | ') : ''}`);
ok(['Retailer X, complaint 4471', 'Heater calibration at every jaw change', 'Priya', 'Late', 'Corrective action 1'].every(w => printed.text.includes(w)), '5 the team’s words, who owes what, Late and the insight are on the paper');

/* ---- 4 resolved: the flags clear ---- */
await write({ 'actdone@1': 'yes', 'actdone@2': 'yes', why: 'Heater read 12 °C low after the jaw change', escape: 'No check looked at the heater', worked: 'Every pallet re-checked', validated: 'No leakers in six weeks on lane 3' });
await page.waitForTimeout(1500);
m = await model(); pt = await pageText();
ok(m.attention.every(a => !/^Corrective action \d|stopping place|^The cause is written|every corrective action|^Every corrective action/i.test(a)), `4 the 8D’s flags have cleared (${m.attention.length} left: ${m.attention.map(a => a.slice(0, 40)).join(' | ')})`);
ok(m.actions.every(r => r[4] === 'Done') && /3 listed: 3 done, 0 open/.test(pt), '4 the table and its lead say every action is done');

/* ---- 6 client, phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${P}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.getByRole('button', { name: 'Print', exact: true }).count()) === 1, '6 a client reads and prints');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${P}/method-report`, 2500);
ok((await t.wide()) <= 1, '6 on a phone nothing is off the side');
await page.screenshot({ path: '/tmp/claude-0/eightd-phone.png', fullPage: true });
await page.setViewportSize({ width: 1280, height: 900 }); await go(`#/project/${P}/method-report`, 2500);
await page.screenshot({ path: '/tmp/claude-0/eightd-desk.png', fullPage: true });
await t.finish('The 8D report and reading accepted: its four sections equal the model, the insight on the dashboard and once in attention, the paper read back, a client, a phone');
