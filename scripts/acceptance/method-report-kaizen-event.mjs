/* ACCEPTANCE — THE KAIZEN EVENT'S PROJECT REPORT AND DASHBOARD (docs/METHODS.md §17; project/method/report/kaizen-event,
 * lib/methodInsights/kaizen-event, lib/kaizenEvent — Rowland, 1 November: "let me view what everything is telling me right now; then a
 * beautiful, dynamic report ... Must be correct"):
 *
 *   1  the week written through the real notes (charter, baseline, two days, the first day long ago, a check booked and gone by, one
 *      open action with nobody named): the dashboard says the check is overdue and “Hold the 30-day check” is the next thing
 *   2  the report page: the method's six sections in order between attention and What we wrote, every line of the model on the page,
 *      the check in its word (Overdue), the week's days each in their word, the actions counted as lib/kaizenEvent counts them
 *   3  the method's warning is in What needs attention once
 *   4  the paper read back with pdftotext: every line of the page, the team's words, page count sane
 *   5  a client reads and prints; a phone fits (and a screenshot of each is taken to the scratchpad)
 *
 *   node scripts/acceptance/method-report-kaizen-event.mjs      (SMOKE_BASE) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { goOpeningBoard } from '../lib/methodFolds.mjs';

const t = await openApp();
const { page, ok } = t;
const go = goOpeningBoard(t);   // a method's board opens on the step in hand, the rest one line each (docs/DESIGN.md) — opened to read them
const sd = await t.seed();
const KZ = sd.methodProjectIds['kaizen-event'];
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };
const model = () => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(s => s.id), attention: l.report.dash.attention.map(a => a.text), next: l.report.dash.next };
}, KZ);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');
const shot = process.env.SHOTS ?? '';

await go(`#/project/${KZ}`, 2000);
const today = await page.evaluate(async () => (await import('/src/lib/weeks.ts')).todayISO());
const shift = (iso, d) => { const x = new Date(`${iso}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const start = shift(today, -45), due = shift(today, -5);
const answers = {
  charter: 'Wrapper changeover is too long and varies', sponsor: 'Ops manager', target: 'Changeover minutes; 25 or under', team: 'Fitter, two operators, facilitator',
  baseline: '42.1 min over 8 changeovers', after: '24.4 min over 8 changeovers', written: 'Sequence card at the wrapper', trained: '',
  start, 'check-date': due, 'day-see@1': 'Four trips to the stores for film', 'day-change@1': 'Film staged at the wrapper', 'day-measure@1': '41 min',
  'day-see@2': 'Waiting for the fitter',
};
await page.evaluate(async ({ pid, answers, today }) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  let i = 0;
  for (const [id, v] of Object.entries(answers)) await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('kaizen-event', id), kind: 'note', what: v, sort: now + i++, createdAt: now, updatedAt: now });
  await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: '', kind: 'next', what: 'Build the pre-set jig', due: today, sort: now, createdAt: now, updatedAt: now });
}, { pid: KZ, answers, today });

/* ---- 1 the dashboard ---- */
await go(`#/project/${KZ}`, 2500);
await page.waitForSelector('.mdash', { timeout: 20000 });
const dashAtt = (await page.locator('.mdash-a').allTextContents()).join(' | ');
ok(/The 30-day check was due .* 5 days ago — and is not recorded/.test(dashAtt), `1 the dashboard says the check is overdue: ${dashAtt.slice(0, 90)}`);
ok(/1 open action names nobody/.test(dashAtt) && /Days? .* of the week/.test(dashAtt) && /nobody is recorded as trained/.test(dashAtt), '1 …and the unowned action, the empty days and the untaught standard');
ok((await page.locator('.mdash-next').innerText()).startsWith('Hold the 30-day check'), '1 the next step is to hold the 30-day check');
if (shot) await page.screenshot({ path: `${shot}/kz-dash-desk.png`, fullPage: true });

/* ---- 2 the report page ---- */
await page.getByRole('button', { name: /View the project report/ }).click();
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
const m = await model(); const pt = await pageText();
ok(m.ids.join() === 'journey,telling,attention,kz-charter,kz-week,kz-result,kz-standard,kz-actions,kz-check,wrote', `2 the sections: ${m.ids.join(' · ')}`);
const gone = missing(m.lines, pt);
ok(gone.length === 0, `2 every one of the model’s ${m.lines.length} lines is on the page${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(/Overdue/.test(pt) && /Written/.test(pt) && /Under way/.test(pt) && /Not written/.test(pt), '2 the check and the days are each in their word');
ok(/Raised.*1.*Open.*1.*Late.*0.*Open with nobody named.*1/s.test(pt), '2 the actions are counted: one raised, one open, none late, one with nobody named');
ok(/42\.1 min over 8 changeovers/.test(pt) && /24\.4 min over 8 changeovers/.test(pt) && /does not work out the difference/.test(pt), '2 before and after side by side, the difference not invented');
/* ---- 3 once in attention ---- */
ok(m.attention.filter(a => a.startsWith('The 30-day check was due')).length === 1, '3 the method’s warning is in What needs attention once');
if (shot) await page.screenshot({ path: `${shot}/kz-report-desk.png`, fullPage: true });

/* ---- 4 the paper ---- */
const dir = mkdtempSync(join(tmpdir(), 'kz-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Print', exact: true }).click()]);
const file = join(dir, 'p.pdf'); await dl.saveAs(file);
const text = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' });
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0);
const lost = missing(m.lines, text);
ok(lost.length === 0, `4 every line of the page is on the paper${lost.length ? ' — missing: ' + lost.slice(0, 3).join(' | ') : ''}`);
ok(pages >= 2 && pages <= 10, `4 the page count is sane (${pages})`);
ok(/Four\s+trips/.test(text) && /overdue/i.test(text) && /30-day check/i.test(text), '4 the team’s words and the check’s word are on the paper');

/* ---- 5 a client, a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${KZ}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.getByRole('button', { name: 'Print', exact: true }).count()) === 1, '5 a client reads the report and can print it');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${KZ}/method-report`, 2500);
{ const w = await t.wide(); ok(w <= 1, `5 on a phone nothing is off the side (${w}px over)`); }
{ const over = await page.evaluate(() => [...document.querySelectorAll('.mrep *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length); ok(over === 0, `5 no element past the phone’s edge (${over})`); }
if (shot) await page.screenshot({ path: `${shot}/kz-report-phone.png`, fullPage: true });

await t.finish('The Kaizen event report and dashboard accepted: the overdue check, the week, the actions and the standard read from the board’s own module, on the page, the paper, a client and a phone');
