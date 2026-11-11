/* ACCEPTANCE — THE IMPROVEMENT KATA'S PROJECT REPORT AND DASHBOARD (docs/METHODS.md §17; lib/methodInsights/kata,
 * project/method/report/kata, lib/kataBoard):
 *
 *   1  a Kata project with its storyboard written (a challenge, a target a few days past, two experiments — one missed, one open,
 *      the last step four days ago): the dashboard's attention says the routine has stopped, the target day has passed and the
 *      open step has no result; its next is “Go and see experiment 2 …”
 *   2  the report's own three sections are the model's (ids, titles, every line on the page), the experiments table says what was
 *      expected, what happened and whether it matched; the same attention is in the report
 *   3  the paper read back: every line of the page, the experiments, the coaching questions, page count sane
 *   4  a client reads and prints; a phone fits (screenshots taken)
 *
 *   node scripts/acceptance/method-report-kata.mjs      (SMOKE_BASE, as smoke) */
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
const K = sd.methodProjectIds.kata;
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missing = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };

/* the storyboard, written as the board writes it: notes scoped method:kata:<field> */
const iso = d => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
const answers = {
  challenge: '52 packs a minute on Line 7 by March', coach: 'Priya (learner), Rob (coach)', measure: 'Packs a minute at the packer, counted per hour',
  current: 'Between 46 and 49, dipping after changeovers', target: '50 a minute every hour for a week', target_by: iso(2),
  obstacles: 'Film tension\nJaw temperature drift', obstacle_now: 'Film tension',
  step: 'Re-set the dancer arm', prediction: '50 a minute for two hours', result: '47 for an hour, then 49', matched: 'No — the second hour held', learning: 'The arm was not the limit; the unwind speed is', ran: iso(5),
  'step@2': 'Slow the unwind 5%', 'prediction@2': '49 every hour', 'ran@2': iso(4), see_by: iso(1) + ' 9:00 at the packer',
};
await page.evaluate(async ([pid, ans]) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  for (const [k, v] of Object.entries(ans)) await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('kata', k), kind: 'note', what: v, sort: now, createdAt: now, updatedAt: now });
}, [K, answers]);

/* 1 the dashboard */
await go(`#/project/${K}`, 2500);
const dash = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
ok(/routine that has stopped/.test(dash) && /No experiment step for 4 days/.test(dash), '1 the dashboard says the routine that has stopped (4 days)');
ok(/target condition’s day/.test(dash) && /passed 2 days ago/.test(dash), '1 …the target condition’s day has passed');
ok(/Experiment 2 was taken 4 days ago and has no result written/.test(dash), '1 …the open step has no result');
ok(/Go and see experiment 2, then write what happened and what was learned/.test(dash), '1 …and the next is to go and see experiment 2');

/* 2 the report */
await go(`#/project/${K}/method-report`, 2800);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
const m = await page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(s => s.id), titles: l.report.sections.map(s => s.title), attn: l.report.sections.find(s => s.id === 'attention').items.filter(i => i.kind === 'callout').map(i => i.text) };
}, K);
ok(m.ids.join() === 'journey,telling,attention,kata-direction,kata-experiments,kata-coaching,wrote', `2 the sections in order: ${m.titles.join(' · ')}`);
ok(JSON.stringify(m.titles) === JSON.stringify(await page.locator('.mrep-h').allTextContents()), '2 the page draws those titles');
const pt = await page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');
ok(missing(m.lines, pt).length === 0, `2 every one of the model’s ${m.lines.length} lines is on the page`);
ok(/Addressing now/.test(pt) && /In the way/.test(pt) && /2 experiments written: 1 with a result, 1 open/.test(pt), '2 the obstacle being addressed is marked; the experiments counted');
ok(/No — the lesson/.test(pt) && /The arm was not the limit/.test(pt) && /Latest lesson/.test(pt), '2 a missed prediction is the lesson, said with its word');
ok(m.attn.some(x => /routine that has stopped/.test(x)) && m.attn.some(x => /target condition’s day/.test(x)), '2 the Kata’s own insight is in “What needs attention”');
ok((await page.locator('.mrep .mrep-table').count()) >= 4, '2 tables drawn');
await page.screenshot({ path: '/tmp/claude-0/kata-report-desk.png', fullPage: true });

/* 3 the paper */
const dir = mkdtempSync(join(tmpdir(), 'krep-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Print', exact: true }).click()]);
const file = join(dir, 'p.pdf'); await dl.saveAs(file);
const text = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' });
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0);
const gone = missing(m.lines, text);
ok(gone.length === 0, `3 every line of the page is on the paper${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
ok(pages >= 2 && pages <= 8, `3 page count sane (${pages})`);
ok(/Re-set the dancer arm/.test(text) && /Slow the unwind 5%/.test(text) && /five coaching questions/i.test(text), '3 the team’s experiments and the coaching questions are on the paper');

/* 4 client, phone */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${K}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && /routine that has stopped/.test(await page.locator('.mrep').innerText()), '4 a client reads the report');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${K}/method-report`, 2500);
ok((await t.wide()) <= 1, '4 on a phone nothing is off the side');
await page.screenshot({ path: '/tmp/claude-0/kata-report-phone.png', fullPage: true });

await t.finish('The Kata report and dashboard accepted: the insight on the dashboard and in the report, three sections equal to the model, the paper read back, a client, a phone');
