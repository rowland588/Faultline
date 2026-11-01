/* ACCEPTANCE — THE A3'S PROJECT REPORT AND ITS READING (docs/METHODS.md §17; project/method/report/a3, lib/methodInsights/a3;
 * knowledge/methods/rca/a3.md — Rowland, 1 November: "Must be correct. Do not skip on the reports."):
 *
 *   1  an A3 written through the real board — the problem, owner, a number, a target, a root cause with no word on how it is known,
 *      two countermeasures (one naming no cause, one whose day has gone), a follow-up day that has passed with nothing written
 *   2  the dashboard says what only an A3 knows: the follow-up overdue (red), the countermeasure naming no cause, the cause not
 *      known by any means, the countermeasure day passed — and its next step is to check the number
 *   3  the report page: the A3's four sections in order between the common ones, equal to the model (every line of reportLines
 *      is on the page), the countermeasure table a row each with its state in words, the attention listed once, never twice
 *   4  the paper read back: every line, the A3 sections' words, a sane page count
 *   5  live: the follow-up written — the red goes, the section says checked, no reload
 *   6  a client reads and prints; a phone fits
 *
 *   node scripts/acceptance/method-report-a3.mjs      (SMOKE_BASE, as smoke; SHOTS=<dir> also saves pictures) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go } = t;
const sd = await t.seed();
const A3 = sd.methodProjectIds.a3;
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };
const iso = back => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const box = label => page.getByLabel(label, { exact: true }).first();
const fill = async (label, v) => { await box(label).fill(v); await box(label).blur(); await page.waitForTimeout(450); };
const shot = async name => { if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, `${name}.png`), fullPage: true }); };
const model = () => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(s => s.id), sections: l.report.sections, attention: l.report.dash.attention.map(a => a.text), next: l.report.dash.next };
}, A3);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');
const paperOf = async press => {
  const dir = mkdtempSync(join(tmpdir(), 'a3rep-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), press()]);
  const file = join(dir, 'p.pdf'); await dl.saveAs(file);
  return { text: execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0) };
};

/* ---- 1 written through the board ---- */
await go(`#/project/${A3}`, 2200);
await page.waitForSelector('.a3', { timeout: 20000 });
await fill('The problem, in one line', 'Lane 3 leakers at 3.2% against 0.3%');
await fill('Owner — and who must agree it', 'Sam Ode; sponsor Priya');
await fill('Why it matters', 'Leakers cost £800 a week and risk a retailer complaint');
await fill('The number now, with its unit', '3.2% leakers');
await fill('The number wanted, by when', '0.3% on lane 3 by 14 November');
await fill('The root cause, with the evidence', 'The new jaw’s heater runs 12 °C cold');
await fill('What — countermeasure 1', 'Calibrate the heater at every jaw change');
await fill('Who — countermeasure 1', 'Engineering');
await fill('By when — countermeasure 1', iso(-9));
await fill('Against which cause — countermeasure 1', 'New jaw’s heater runs cold');
await page.getByRole('button', { name: 'Add a countermeasure' }).click();
await fill('What — countermeasure 2', 'Jaw-change checklist');
await fill('Who — countermeasure 2', 'Production');
await fill('By when — countermeasure 2', iso(4));
await fill('When it is checked', iso(3));

/* ---- 2 the dashboard ---- */
await go(`#/project/${A3}`, 2200);
const dashText = await page.locator('.mdash').innerText();
ok(/follow-up was due on .* 3 days ago/.test(dashText), '2 the follow-up that has passed is said, with how long ago');
ok(/1 countermeasure names no cause \(2\. Jaw-change checklist\)/.test(dashText), '2 the countermeasure naming no cause is named');
ok(/root cause is written but not how it is known/.test(dashText), '2 a cause with no word on how it is known is said');
ok(/Check the number now and write what it showed/.test(await page.locator('.mdash-next').innerText()), '2 the next step is to check the number');
ok((await page.locator('.mdash-a').first().getAttribute('class')).includes('is-r'), '2 the overdue follow-up leads, in red');
await shot('dashboard');

/* ---- 3 the report page ---- */
await go(`#/project/${A3}/method-report`, 2500);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
let m = await model(), pt = await pageText();
ok(m.ids.join() === 'journey,telling,attention,a3-glance,a3-sheet,a3-counter,a3-follow,wrote', `3 sections in order: ${m.ids.join(' · ')}`);
let gone = missing(m.lines, pt);
ok(gone.length === 0, `3 every one of the model’s ${m.lines.length} lines is on the page${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
const table = m.sections.find(s => s.id === 'a3-counter').items[0];
ok(table.rows.length === 2 && table.rows[1][5] === 'Cause not named · Day passed — is it done?' && table.rows[0][5] === 'Open', `3 the countermeasure table: ${table.rows.map(r => r[1] + ' → ' + r[5]).join(' | ')}`);
const shown = await page.locator('section[aria-label^="Countermeasures"] tbody tr').count();
ok(shown === 2, `3 …a row each on the page (${shown})`);
const attn = await page.locator('section[aria-label="What needs attention"] .mrep-call').allTextContents();
ok(attn.filter(x => /names no cause/.test(x)).length === 1 && attn.filter(x => /follow-up was due/.test(x)).length === 1, '3 each A3 finding is listed once in What needs attention');
ok(/Did it hold\?/.test(pt) && /Questioned and agreed/.test(pt) && /Not written yet\./.test(pt), '3 the follow-up and the unwritten agreement are said');
await shot('report-desk');

/* ---- 4 the paper ---- */
const printed = await paperOf(() => page.getByRole('button', { name: 'Print', exact: true }).click());
ok(printed.pages >= 2 && printed.pages <= 8, `4 the paper (${printed.pages} pages)`);
gone = missing(m.lines, printed.text);
ok(gone.length === 0, `4 every one of the page’s ${m.lines.length} lines is on the paper${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(/The A3 at a glance/.test(printed.text) && /Cause not named/.test(printed.text) && /Lane 3 leakers at 3\.2% against 0\.3%/.test(printed.text) && /Sam Ode; sponsor Priya/.test(printed.text), '4 the A3’s sections and the team’s words are on the paper');

/* ---- 5 live: write what it showed ---- */
await go(`#/project/${A3}`, 2200);
await fill('What it showed — did it hold?', '0.2% over four weeks — held');
await go(`#/project/${A3}/method-report`, 2500);
m = await model(); pt = await pageText();
ok(!/follow-up was due/.test(m.attention.join(' ')) && /What the follow-up showed is written/.test(pt), '5 once it is written the red goes and the section says it is checked');
ok(missing(m.lines, pt).length === 0, '5 the page still equals the model');

/* ---- 6 a client; a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${A3}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.getByRole('button', { name: 'Print', exact: true }).count()) === 1, '6 a client reads the report and can print it');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${A3}/method-report`, 2500);
{ const w = await t.wide(); ok(w <= 1, `6 on a phone nothing is off the side (${w}px over)`); }
{ const wide = await page.evaluate(() => [...document.querySelectorAll('.mrep *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 && !e.closest('.mrep-tablewrap'); }).length); ok(wide === 0, `6 no element past the phone’s edge (${wide})`); }
await shot('report-phone');

await t.finish('The A3 report accepted: its four sections equal to the model, the A3’s own findings on the dashboard and listed once, the paper carrying every line, live, a client, a phone');
