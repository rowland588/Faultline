/* ACCEPTANCE — DMAIC'S OWN SECTIONS OF THE PROJECT REPORT AND ITS READING OF THE DASHBOARD (docs/METHODS.md §17; ISO 13053-1;
 * src/project/method/report/dmaic, src/lib/methodInsights/dmaic — Rowland, 1 November: "let me view what everything is telling me
 * right now; then a beautiful, dynamic report ... Must be correct."):
 *
 *   1  a fresh DMAIC project: the report has the five reviews, the charter at a glance, Next: Define — not started, nothing invented
 *   2  Define written in full, its review passed with conditions (who, day, the conditions), Measure held with a reason, a late
 *      action: written through the project's notes (method:dmaic:<field>) — the dashboard says the held review in red and what to do
 *      next; the report page equals the model (every line), the review table row by row, the charter's facts, the next phase's gaps
 *   3  the paper downloaded and read back: the reviews, the people, the days, the decisions, the charter, the tool's own paper
 *   4  Define's review booked and past with no decision → amber on the dashboard, the next step to hold it
 *   5  a client reads and prints it; a phone fits
 *
 *   node scripts/acceptance/method-report-dmaic.mjs      (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words, norm } = t;
const sd = await t.seed();
const DM = sd.methodProjectIds.dmaic;
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };
const model = () => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  const s = k => l.report.sections.find(x => x.id === k);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(x => x.id), reviews: s('dmaic-reviews')?.items[0], charter: s('dmaic-charter'), next: s('dmaic-next'), attention: l.report.dash.attention.map(a => [a.tone, a.text]), dnext: l.report.dash.next };
}, DM);
const write = (answers, extra = []) => page.evaluate(async ([pid, a, owed]) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  for (const [f, v] of Object.entries(a)) await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('dmaic', f), kind: 'note', what: v, sort: now, createdAt: now, updatedAt: now });
  for (const o of owed) await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: '', kind: 'next', what: o[0], owner: o[1], due: o[2], sort: now, createdAt: now, updatedAt: now });
}, [DM, answers, extra]);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');

/* ---- 1 a fresh project ---- */
await go(`#/project/${DM}/method-report`, 2500);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
let m = await model();
ok(m.ids.join() === 'journey,telling,attention,dmaic-reviews,dmaic-charter,dmaic-next,wrote', `1 the sections in order: ${m.ids.join(' · ')}`);
const heads = await page.locator('.mrep-h').allTextContents();
ok(heads.includes('The five phase reviews') && heads.includes('The charter at a glance') && heads.includes('Next: Define'), `1 the page headings (${heads.join(' | ')})`);
ok(m.reviews.rows.length === 5 && m.reviews.rows.every(r => /Not started/.test(r[1])) && /not written yet/.test(m.charter.lead), '1 five reviews not started, the charter not written yet — said, not invented');
ok(missing(m.lines, await pageText()).length === 0, `1 every one of the model’s ${m.lines.length} lines is on the page`);

/* ---- 2 reviews, a held phase, a late action ---- */
const define = {};
await page.evaluate(async () => {});
const defFields = await page.evaluate(async () => (await import('/src/lib/methodSheet.ts')).fieldsOf('dmaic', 'Define').map(f => f.id));
for (const id of defFields) define[id] = id === 'problem' ? 'Seal failures on Line 7, 4% of packs since September' : id === 'goal' ? 'Under 1% by 31 January' : `Written: ${id}`;
await write({ ...define, rv_define_who: 'Tanya (sponsor)', rv_define_when: '2026-11-14', rv_define_result: 'conditions', rv_define_note: 'Restate the goal in packs a minute',
  rv_measure_who: 'Rob Scott', rv_measure_when: '2026-11-28', rv_measure_result: 'held', rv_measure_note: 'Gauge R&R at 34%, not fit', baseline: 'Seal temperature 180 °C over 120 packs' },
  [['Re-calibrate the checkweigher', 'Priya', '2026-01-05']]);
await go(`#/project/${DM}`, 2500);
const dashSays = norm(await words('.mdash-says'));
m = await model();
const att = (await page.locator('.mdash-a').allTextContents()).map(norm);
ok(att.some(x => /Measure was held at its review - Gauge R&R at 34%, not fit\. The phases after it wait/.test(x)) && (await page.locator('.mdash-a.is-r', { hasText: 'Measure was held' }).count()) === 1, '2 the dashboard says the held review, in red, with its reason');
ok(norm(await words('.mdash-next')) === norm(m.dnext) && /put right what Measure was held for/.test(m.dnext) && dashSays.includes(norm(m.dnext)), `2 the next step is DMAIC’s own: ${m.dnext}`);
await go(`#/project/${DM}/method-report`, 2500);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
m = await model(); const pt = await pageText();
ok(missing(m.lines, pt).length === 0, `2 the page equals the model (${m.lines.length} lines)`);
const rows = await page.locator('.mrep-sec#dmaic-reviews tr, .mrep [id="dmaic-reviews"] tr').allTextContents().catch(() => []);
ok(m.reviews.rows[0].join(' | ').includes('Tanya (sponsor)') && m.reviews.rows[0].includes('14 Nov 2026') && m.reviews.rows[0][4] === 'Passed with conditions: Restate the goal in packs a minute', `2 Define’s row: ${m.reviews.rows[0].join(' | ')}`);
ok(m.reviews.rows[1][1].startsWith('Held') && m.reviews.rows[1][2] === 'Rob Scott' && m.reviews.rows[1][4] === 'Held: Gauge R&R at 34%, not fit', `2 Measure’s row: ${m.reviews.rows[1].join(' | ')}`);
ok(m.charter.lead === 'The charter is complete — ready for its Define review.' && pt.includes('Seal failures on Line 7, 4% of packs since September'), '2 the charter at a glance: complete, with the team’s words');
ok(m.next.title === 'Next: Measure' && /Still to write before the review: The data collection plan/.test(pt) && pt.includes('Baseline capability'), '2 the next phase named with what is still unwritten');
ok((await page.locator('.mrep-call.is-r .mrep-word', { hasText: 'Needs attention' }).count()) >= 1 && /Re-calibrate the checkweigher/.test(pt) && /Priya/.test(pt) && /Late/.test(pt), '2 a red call-out carries its word; the late action, who owes it, marked Late');

/* ---- 3 the paper ---- */
const dir = mkdtempSync(join(tmpdir(), 'mrepd-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Print', exact: true }).click()]);
const file = join(dir, 'p.pdf'); await dl.saveAs(file);
const text = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' });
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0);
const gone = missing(m.lines, text);
ok(gone.length === 0, `3 every one of the page’s ${m.lines.length} lines is on the paper${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
for (const s of ['THE FIVE PHASE REVIEWS', 'Tanya (sponsor)', '14 Nov 2026', 'Passed with conditions', 'Held', 'Rob Scott', 'Gauge R&R at 34%, not fit', 'THE CHARTER AT A GLANCE', 'Under 1% by 31 January', 'NEXT: MEASURE', 'Seal temperature']) ok(squash(text).includes(squash(s)), `3 the paper says “${s}”`);
ok(pages >= 2 && pages <= 8, `3 the page count is sane (${pages})`);

/* ---- 4 a review booked and gone by with no decision ---- */
await write({ rv_analyse_when: '2026-10-03', rv_analyse_result: '' });
await write({ rv_improve_when: '2026-10-03' });
await go(`#/project/${DM}`, 2500);
ok((await page.locator('.mdash-a.is-a', { hasText: 'Improve’s review was booked for 3 Oct 2026' }).count()) === 1, '4 a past booked review with no decision: amber, in words, on the dashboard');

/* ---- 5 a client; a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${DM}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.getByRole('button', { name: 'Print', exact: true }).count()) === 1 && (await page.locator('.mrep-h', { hasText: 'The five phase reviews' }).count()) === 1, '5 a client reads the report and can print it');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${DM}/method-report`, 2500);
{ const w = await t.wide(); ok(w <= 1, `5 on a phone nothing is off the side (${w}px over)`); }
{ const wide = await page.evaluate(() => [...document.querySelectorAll('.mrep *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length); ok(wide === 0, `5 no element past the phone’s edge (${wide})`); }
await page.screenshot({ path: '/tmp/claude-0/dmaic-phone.png', fullPage: true });
await page.setViewportSize({ width: 1360, height: 900 }); await go(`#/project/${DM}/method-report`, 2500);
await page.screenshot({ path: '/tmp/claude-0/dmaic-desk.png', fullPage: true });

await t.finish('DMAIC’s report accepted: five reviews, the charter, the next phase, the dashboard’s own reading, the paper, a client, a phone');
