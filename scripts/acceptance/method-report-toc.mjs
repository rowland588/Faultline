/* ACCEPTANCE — THE THEORY OF CONSTRAINTS' PROJECT REPORT AND ITS READING OF THE DASHBOARD (docs/METHODS.md §17;
 * project/method/report/toc, lib/methodInsights/toc — Rowland, 1 November: "let me view what everything is telling me right now;
 * then a beautiful, dynamic report that appropriately presents everything. Must be correct."):
 *
 *   1  the worked line (Bagger 70, Wrapper 50, Packer 80 a minute, target 60, 2 h buffer; a count with 45 min of Wrapper stops at 4p
 *      a pack) and answers written through the real board: the report's five Theory of Constraints sections between the attention
 *      list and "Everything we wrote"; each says what the module and the hand-worked literals say (the constraint and 10 short; the
 *      station table; 45 min = 2,250 bags = £90; the buffer; the passes)
 *   2  the page equals the model (every line of reportLines on the page); the flags — the constraint written as Packer when the line
 *      reads Wrapper — are in "What needs attention" once, with the dashboard's own insight (the constraint moved, no pass 2 yet)
 *   3  the dashboard shows the insight and a smarter Next ("Go again: start pass 2 at …")
 *   4  starting the pass takes that insight away with no reload
 *   5  the paper read back: every line of the page, the sections, the numbers, the team's words, a sane page count
 *   6  a client reads; a phone fits
 *
 *   SMOKE_BASE=http://127.0.0.1:5247 node scripts/acceptance/method-report-toc.mjs */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { paper as pressPaper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, norm, words } = t;
const sd = await t.seed();
const P = sd.methodProjectIds.toc;
const squash = s => s.replace(/\s*[→➡➔]\s*/g, ' to ').toLowerCase().replace(/[^a-z0-9£%]/g, '');
const missingFrom = (lines, hay) => { const h = squash(hay); return lines.filter(l => squash(l) && !h.includes(squash(l))); };
const model = () => page.evaluate(async id => {
  const D = await import('/src/project/method/reportData.ts'); const M = await import('/src/lib/methodReportModel.ts');
  const l = await D.loadMethodReport(id);
  return { lines: M.reportLines(l.report), ids: l.report.sections.map(s => s.id), titles: l.report.sections.map(s => s.title), attention: [...l.report.dash.attention.map(a => a.text), ...l.report.sections.flatMap(x => (x.flags ?? []).map(f => f.text))], next: l.report.dash.next, sections: l.report.sections };
}, P);
const pageText = () => page.evaluate(() => document.querySelector('.mrep')?.textContent ?? '');
const paperOf = async press => {
  const dir = mkdtempSync(join(tmpdir(), 'mrep-toc-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), press()]);
  const file = join(dir, 'p.pdf'); await dl.saveAs(file);
  return { text: execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1] ?? 0) };
};

/* ---- 1 the worked line, and the answers written on the real board ---- */
await go(`#/project/${P}`, 2000);
await page.evaluate(async P => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  const t = Date.now(), HR = 3_600_000;
  const ws = await db.createWorkspace('Line T');
  await db.updateWorkspace({ ...ws, crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 });
  const st = (id, name, rate) => ({ id, name, kind: 'machine', unit: 'bags', contains: 1, rate, ratePer: 'min', source: 'plate' });
  await db.putStandard({ id: uid(), projectId: P, workspaceId: ws.id, product: 'Maris 2kg', marks: [], sort: 0, createdAt: t, updatedAt: t,
    capacity: { targetPerMin: 60, bufferH: 2, stations: [st('t-a', 'Bagger', 70), st('t-b', 'Wrapper', 50), st('t-c', 'Packer', 80)] } });
  const from = t - 10 * HR, to = from + 8 * HR;
  const stop = (at, mins, asset) => ({ id: uid(), workspaceId: ws.id, category: 'Breakdown', subcategory: 'Mechanical', asset, shift: 'Days', startedAt: at, endedAt: at + mins * 60_000, durationMs: mins * 60_000, count: 1, timing: 'stopwatch', media: [], createdAt: t, updatedAt: t });
  for (const o of [stop(from + HR, 30, 'Wrapper'), stop(from + 3 * HR, 15, 'Wrapper'), stop(from + 5 * HR, 10, 'Packer')]) await db.addObservation(o);
  await db.putStudy({ id: uid(), tool: 'losses', name: 'Days shift', workspaceId: ws.id, projectId: P, facts: { losses: { shift: 'Days', from, to, breakMin: 30, plannedMin: 450, made: 18000, rejects: 200, ratePerMin: 50, rateFrom: 'plate', rateMachine: 'Wrapper' } }, uses: [], startedAt: to + 60_000, createdAt: t, updatedAt: t });
}, P);
await go(`#/project/${P}`, 2500);
await page.waitForSelector('.toc-card', { timeout: 20000 });
const sec = n => page.locator(`.pmethod-sec[aria-label="${n}"]`);
const box = (s, q) => sec(s).locator('.msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + q + '$') }) }).locator('.msheet-in');
const write = async (s, q, v) => { const b = box(s, q); await b.fill(v); await b.blur(); await page.waitForTimeout(450); };
await write('Identify the constraint', 'The constraint', 'Packer');
await write('Go again', 'Where the constraint is now', 'Bagger');
await write('Elevate it', 'The option, and its worth', 'A second person on the Wrapper');

await go(`#/project/${P}/method-report`, 2800);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
let m = await model(), pt = await pageText();
ok(m.ids.join() === 'journey,telling,attention,toc-constraint,toc-exploit,toc-subordinate,toc-elevate,toc-again,wrote', `1 the sections in order: ${m.titles.join(' · ')}`);
ok(JSON.stringify(m.titles) === JSON.stringify(await page.locator('.mrep-h').allTextContents()), '1 the page draws exactly those sections');
const S = id => { const s = m.sections.find(x => x.id === id); return JSON.stringify(s); };
ok(S('toc-constraint').includes('Wrapper limits the line: it makes 50 bags a minute against 60 wanted, 10 short.') && S('toc-constraint').includes('The next to limit it is Bagger'), '1 the constraint, the gap and the next station as worked by hand (50 against 60, 10 short; next Bagger)');
ok(/"rows":\[\["Wrapper","50","—","Constraint"\],\["Bagger","70","20","Next to limit"\],\["Packer","80","30",""\]\]/.test(S('toc-constraint')), '1 the station table: Wrapper 50 (constraint), Bagger 70 with 20 to spare, Packer 80 with 30');
ok(S('toc-exploit').includes('At Wrapper a minute is a minute for the whole line: 45 min is about 2,250 bags, £90 of contribution.') && S('toc-exploit').includes('"kind":"money"'), '1 45 min at Wrapper = 2,250 bags = £90 at 4p, said as money (the loss count’s, not added to anything)');
ok(S('toc-subordinate').includes('A buffer of 2 hours of the constraint’s running time is set in front of Wrapper.') && S('toc-subordinate').includes('No orders are laid on the week yet.'), '1 the 2 h buffer, and the missing orders named');
ok(S('toc-again').includes('["Pass 1","Packer","Bagger","Moved on"]') || S('toc-again').includes('"Pass 1","Packer","Bagger"'), '1 the passes: pass 1 the team wrote Packer, it moved to Bagger');

/* ---- 2 the page equals the model; the flags once ---- */
const gone = missingFrom(m.lines, pt);
ok(gone.length === 0, `2 every one of the model’s ${m.lines.length} lines is on the page${gone.length ? ' — missing: ' + gone.slice(0, 3).join(' | ') : ''}`);
const mismatch = m.attention.filter(a => /wrote “Packer” .* reads Wrapper/.test(a));
const moved = m.attention.filter(a => /The constraint has moved: pass 1 says it is now Bagger, and pass 2 has not been started/.test(a));
ok(mismatch.length === 1 && moved.length === 1, '2 the written-Packer-but-Wrapper-read flag and the moved-constraint insight are each in attention once (the dashboard’s rules and the section’s flag)');
const calls = await page.locator('.mrep-sec[aria-label="What needs attention"] .mrep-call').allInnerTexts();
ok(mismatch.every(a => calls.filter(c => squash(c).includes(squash(a))).length === 1) && moved.every(a => calls.filter(c => squash(c).includes(squash(a))).length === 1), '2 …and both on the page’s attention list, each with its word');
ok(m.sections.find(x => x.id === 'toc-exploit').items.some(i => i.kind === 'table') && (await page.locator('.mrep-sec[aria-label="What is lost at the constraint"] .mrep-money').count()) === 1, '2 the loss section’s table and its one money line are on the page');

/* ---- 3 the dashboard ---- */
await go(`#/project/${P}`, 2400);
await page.waitForSelector('.mdash', { timeout: 20000 });
const att = (await page.locator('.mdash-a').allInnerTexts()).map(norm), next = norm(await words('.mdash-next'));
ok(att.some(a => a.includes(norm(moved[0]))) && next === norm('Go again: start pass 2 at Bagger — read Line capacity afresh and find what limits the line now.'), `3 the dashboard says the constraint moved, and the next step is to go again from Bagger`);

/* ---- 4 start the pass: the insight goes, no reload ---- */
await page.getByRole('button', { name: /^Go again — start pass 2 at Bagger/ }).click(); await page.waitForTimeout(900);
const att2 = (await page.locator('.mdash-a').allInnerTexts()).map(norm), next2 = norm(await words('.mdash-next'));
ok(!att2.some(a => a.includes('pass 2 has not been started')) && !/^Go again: start pass 2/.test(next2), '4 pass 2 started: the insight is gone from the dashboard with no reload, and Next is the common one');

/* ---- 5 the paper ---- */
await go(`#/project/${P}/method-report`, 2800);
await page.waitForSelector('.mrep .ln-band', { timeout: 20000 });
m = await model();
const printed = await paperOf(() => page.getByRole('button', { name: 'Print', exact: true }).click());
ok(printed.pages >= 2 && printed.pages <= 9, `5 Print makes the paper (${printed.pages} pages)`);
const viaMenu = await paperOf(() => pressPaper(page, 'Project report'));
ok(viaMenu.pages === printed.pages, '5 Report ▾ › Project report makes the same paper');
const lost = missingFrom(m.lines, printed.text);
ok(lost.length === 0, `5 every one of the page’s ${m.lines.length} lines is on the paper${lost.length ? ' — missing: ' + lost.slice(0, 3).join(' | ') : ''}`);
const flat = squash(printed.text);
ok(['Wrapper limits the line: it makes 50 bags a minute against 60 wanted, 10 short.', '45 min is about 2,250 bags, £90 of contribution', 'A buffer of 2 hours', 'Pass 2', 'A second person on the Wrapper', 'The constraint: Packer'.replace('The constraint: ', '')].every(s => flat.includes(squash(s))), '5 the paper carries the constraint, the £90, the buffer, pass 2 and the team’s words');
ok(m.titles.filter(x => /constraint|rest of the line|Spending|Going again/.test(x)).every(x => flat.includes(squash(x))), '5 every Theory of Constraints section title is on the paper');
ok(/\b1 of \d+\b/.test(printed.text) && /printed/i.test(printed.text), '5 page numbers and the printed date');

/* ---- 6 a client; a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${P}/method-report`, 2500);
ok((await page.locator('.mrep .ln-band').count()) === 1 && (await page.locator('.mrep-sec[aria-label="Going again — the passes round the loop"]').count()) === 1, '6 a client reads the report, passes and all');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${P}/method-report`, 2500);
{ const w = await t.wide(); ok(w <= 1, `6 on a phone nothing is off the side (${w}px over)`);
  const wide = await page.evaluate(() => [...document.querySelectorAll('.mrep *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length); ok(wide === 0, `6 no element past the phone’s edge (${wide})`);
  await page.screenshot({ path: '/tmp/claude-0/toc-report-phone.png', fullPage: true }); }
await page.setViewportSize({ width: 1280, height: 900 }); await go(`#/project/${P}/method-report`, 2500);
await page.screenshot({ path: '/tmp/claude-0/toc-report-desk.png', fullPage: true });

await t.finish('The Theory of Constraints’ project report accepted: five sections equal to the model, the flags and the dashboard’s insight once each, the paper carrying every line, a client, a phone');
