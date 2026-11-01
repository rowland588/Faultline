/* ACCEPTANCE — PDCA'S OWN REPORT AND READING (docs/METHODS.md §17; lib/methodPdca readCycles, lib/methodInsights/pdca,
 * project/method/report/pdca): a PDCA project with two cycles written through the notes the board writes —
 *   1  cycle 1 missed its prediction: the dashboard's attention and next say so, in the insight's words
 *   2  the report's own sections (each cycle against its prediction, what each taught us, the cycle in hand) are the model's and
 *      every line of the model is on the page; the table's row is the team's words and the verdict word
 *   3  a hit cycle: the next becomes "decide", adopted with no standard flagged; written, it clears
 *   4  the paper read back: every line, the three section titles, page count sane
 *   5  a client reads and prints; a phone fits
 *
 *   node scripts/acceptance/method-report-pdca.mjs      (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, norm } = t;
const sd = await t.seed();
const PD = sd.methodProjectIds.pdca;
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };
const write = (pairs) => page.evaluate(async ({ pid, pairs }) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  const items = await db.listTestItems(pid);
  for (const [field, what] of pairs) {
    const old = items.find(i => i.testId === S.answerScope('pdca', field) && !i.deletedAt);
    await db.putTestItem(old ? { ...old, what, updatedAt: now } : { id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('pdca', field), kind: 'note', what, sort: now, createdAt: now, updatedAt: now });
  }
}, { pid: PD, pairs });
const model = () => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(s => s.id), titles: l.report.sections.map(s => s.title), table: l.report.sections.find(s => s.id === 'pdca-cycles')?.items[0], next: l.report.dash.next, attention: l.report.dash.attention.map(a => a.text) };
}, PD);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');

await go(`#/project/${PD}`, 2200);
await write([['number', 'Film breaks a shift'], ['gap', '7.0 a shift against 4 wanted'], ['cause', 'Splice'], ['change', 'New splice guide'], ['expect', '4.9 a shift (30% fewer)'],
  ['who', 'Sam, Tuesday'], ['result', '5.5 a shift'], ['predicted', 'No — 5.5 against 4.9'], ['learned', 'The guide only fits wrapper 2'], ['again', 'Fit it to wrapper 1']]);
await go(`#/project/${PD}`, 2500);

/* 1 the dashboard */
const att = (await page.locator('.mdash-a').allInnerTexts()).map(norm).join(' | ');
const nxt = norm(await page.locator('.mdash-next').innerText());
ok(/Cycle 1 missed its prediction \(expected 4\.9 a shift \(30% fewer\); got 5\.5 a shift\) [—-] plan the next cycle/.test(att), `1 attention says the miss with both figures (${att.slice(0, 120)})`);
ok(nxt === 'Cycle 1 missed its prediction: start cycle 2 - Act already says what to try (“Fit it to wrapper 1”).', `1 the next is to start cycle 2 from Act’s change (${nxt})`);

/* 2 the report */
await go(`#/project/${PD}/method-report`, 2500);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
let m = await model(), pt = await pageText();
ok(m.ids.join() === 'journey,telling,attention,pdca-cycles,pdca-learned,pdca-hand,wrote', `2 the sections in order: ${m.titles.join(' · ')}`);
ok(missing(m.lines, pt).length === 0, `2 every one of the model’s ${m.lines.length} lines is on the page`);
ok(JSON.stringify(m.table.rows[0]) === JSON.stringify(['1', '7.0 a shift against 4 wanted', '4.9 a shift (30% fewer)', '5.5 a shift', 'No — missed', 'Not decided yet']), '2 the row is the team’s words with the verdict in words');
ok(m.attention.some(a => /missed its prediction/.test(a)) && /missed its prediction/.test(pt), '2 the miss is in What needs attention');

/* 3 a hit, adopted with no standard */
await write([['result', '2.5 a shift'], ['predicted', 'Yes — twice the prediction'], ['beyond', 'Bigger than the swing before'], ['decision', 'Adopt — it holds']]);
await go(`#/project/${PD}/method-report`, 2500);
m = await model();
ok(m.attention.some(a => /adopted but not yet written into a standard/.test(a)) && /Yes — hit it/.test(await pageText()), '3 a hit cycle adopted with no standard is flagged, the table says Yes — hit it');
await write([['standard', 'Line standard LS-12']]);
await go(`#/project/${PD}/method-report`, 2500);
m = await model();
ok(!m.attention.some(a => /not yet written into a standard/.test(a)), '3 written, the flag clears');

/* 4 the paper */
const dir = mkdtempSync(join(tmpdir(), 'mrp-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Print', exact: true }).click()]);
const file = join(dir, 'p.pdf'); await dl.saveAs(file);
const text = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' });
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0);
const gone = missing(m.lines, text);
ok(gone.length === 0, `4 every line of the page is on the paper (${pages} pages)${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(pages >= 2 && pages <= 8 && m.titles.filter(x => /cycle/i.test(x)).every(x => squash(text).includes(squash(x))), '4 page count sane, the PDCA section titles on the paper');

/* 5 client, phone */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${PD}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.getByRole('button', { name: 'Print', exact: true }).count()) === 1, '5 a client reads and prints');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${PD}/method-report`, 2500);
{ const w = await t.wide(); ok(w <= 1, `5 phone: nothing off the side (${w}px)`); }
await page.screenshot({ path: '/tmp/claude-0/pdca-phone.png', fullPage: true });
await page.setViewportSize({ width: 1280, height: 900 }); await go(`#/project/${PD}/method-report`, 2500);
await page.screenshot({ path: '/tmp/claude-0/pdca-desk.png', fullPage: true });

await t.finish('PDCA’s report and reading accepted');
