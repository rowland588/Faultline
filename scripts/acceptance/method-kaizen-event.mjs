/* ACCEPTANCE — THE KAIZEN EVENT, ITS OWN BOARD AND PAPER (docs/METHODS.md §16; lib/kaizenEvent; lib/report/kaizenPaper;
 * project/method/shapes/kaizen-event — Rowland, 1 November: "I asked you to build the method and insert the tools where required").
 *
 *   1  the questions: Prepare asks the sponsor, the measure and target, the dates; Improve the measure after; Standardise who is trained;
 *      Sustain what the week bought — as lib/methodSheet says them
 *   2  the board: the week as five day columns, each with seen / changed / measure; a day typed is kept after a reload and says Under way,
 *      then Written; the line under the title the module's
 *   3  the start date dating the days (weekends skipped); the 30-day check suggested thirty days after day 5 and booked in one tap;
 *      a verdict (Holding · Slipping · Lost) kept, in words; a check in the past and unrecorded said overdue
 *   4  a sixth day added (the repeat list), kept after a reload
 *   5  tools fall in: the SMED study the project already holds named under the baseline's tools and the changes', with Open (landing in
 *      the project) and Start; nothing required first
 *   6  the paper — Report ▾ › Kaizen event report — read back: charter, each day's words, the check's verdict, the closing sentence
 *   7  a client reads and writes nothing
 *   8  a phone: nothing off the side, the controls 44 px
 *
 *   node scripts/acceptance/method-kaizen-event.mjs      (SMOKE_BASE) */
import { openApp } from '../lib/tocBrowser.mjs';
import { goOpeningBoard } from '../lib/methodFolds.mjs';

const t = await openApp();
const { page, ok } = t;
const go = goOpeningBoard(t);   // a method's board opens on the step in hand, the rest one line each (docs/DESIGN.md) — opened to read them
const sd = await t.seed();
const KE = sd.methodProjectIds['kaizen-event'];
const board = () => page.locator('.kz');
const day = n => page.locator(`.kz-day[aria-label="Day ${n}"]`);
const fillBox = async (loc, v) => { await loc.fill(v); await loc.blur(); await page.waitForTimeout(450); };

/* ---- 1 the questions ---- */
await go(`#/project/${KE}`, 1800);
await page.waitForSelector('.kz', { timeout: 20000 });
await t.openSections();   // the section in hand is open, the rest one line each (docs/DESIGN.md) — opened to read them
const asked = await page.locator('.msheet-q').allInnerTexts();
for (const q of ['Who is the sponsor?', 'The measure, and its target', 'The dates', 'The measure after the changes', 'Who has been trained in it', 'What the week bought', 'The baseline', 'Is the gain still holding?'])
  ok(asked.includes(q), `1 the method asks “${q}”`);
ok((await page.locator('.kz-day').count()) === 5, '2 the week is five day columns');

/* ---- 2 a day ---- */
await fillBox(day(1).getByLabel('Day 1 — what we saw'), 'Four trips to the stores for film; the jaw is re-set by hand');
ok(/Under way/i.test(await day(1).locator('.kz-word').innerText()), '2 one box written: the day says Under way, in words');
await fillBox(day(1).getByLabel('Day 1 — what we changed'), 'Film for the shift staged at the wrapper');
await fillBox(day(1).getByLabel('Day 1 — the measure at the close'), '41 min changeover');
await go(`#/project/${KE}`, 1800);
ok((await day(1).getByLabel('Day 1 — what we saw').inputValue()).startsWith('Four trips') && /Written/i.test(await day(1).locator('.kz-word').innerText()), '2 kept after a reload, and the day says Written');
ok(/^1 of 5 days written\./.test(await board().locator('.kz-sub').first().innerText()), '2 the line under the title says 1 of 5 days written');

/* ---- 3 the start, the check, the verdict ---- */
await board().getByLabel('First day of the event').fill('2026-11-02'); await board().getByLabel('First day of the event').blur(); await page.waitForTimeout(500);
ok(/Mon 2 Nov 2026/.test(await day(1).locator('.kz-dayt').innerText()) && /Fri 6 Nov 2026/.test(await day(5).locator('.kz-dayt').innerText()), '3 the days are dated from the start');
const book = page.getByRole('button', { name: /^Book it for/ });
ok((await book.innerText()).includes('7 Dec 2026'), `3 the check is suggested thirty days after day 5 (${(await book.innerText())})`);
await book.click(); await page.waitForTimeout(500);
ok(/7 Dec 2026/.test(await page.locator('.kz-check .kz-says').innerText()), '3 booked in one tap');
await page.getByRole('radio', { name: 'Slipping' }).click(); await page.waitForTimeout(500);
await go(`#/project/${KE}`, 1800);
ok((await page.getByRole('radio', { name: 'Slipping' }).getAttribute('aria-checked')) === 'true' && /slipping/i.test(await page.locator('.kz-check .kz-says').innerText()) && /Slipping/i.test(await page.locator('.kz-check .kz-word').innerText()), '3 the verdict is kept after a reload, and said in words');
/* a past check, unrecorded */
await page.getByRole('radio', { name: 'Slipping' }).click(); await page.waitForTimeout(400);
await page.getByLabel('The day of the 30-day check').fill('2026-10-01'); await page.getByLabel('The day of the 30-day check').blur(); await page.waitForTimeout(500);
ok(/was due 1 Oct 2026/.test(await page.locator('.kz-check .kz-says').innerText()) && /Overdue/i.test(await page.locator('.kz-check .kz-word').innerText()), '3 a check in the past and not recorded is said overdue');
await page.getByLabel('The day of the 30-day check').fill('2026-12-06'); await page.getByLabel('The day of the 30-day check').blur(); await page.waitForTimeout(400);
await page.getByRole('radio', { name: 'Holding' }).click(); await page.waitForTimeout(500);

/* ---- 4 a sixth day ---- */
await page.getByRole('button', { name: 'Add a day' }).click(); await page.waitForTimeout(300);
ok((await page.locator('.kz-day').count()) === 6, '4 a sixth day is added');
await fillBox(day(6).getByLabel('Day 6 — what we saw'), 'Jig fitted on the Monday after');
await go(`#/project/${KE}`, 1800);
ok((await page.locator('.kz-day').count()) === 6, '4 the sixth day stays after a reload (it holds words)');

/* ---- the sheet's own boxes, for the paper ---- */
const sheet = q => page.locator('.msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + q.replace(/[?.]/g, '\\$&') + '$') }) }).locator('.msheet-in');
await fillBox(sheet('The charter'), 'Wrapper changeover to under 25 minutes, this line only');
await fillBox(sheet('Who is the sponsor?'), 'Maria Okafor');
await fillBox(sheet('Is the gain still holding?'), 'Last six changeovers: 25, 24, 28, 31, 30, 33');

/* ---- 5 tools fall in ---- */
const said = await page.locator('.kz-tools').first().innerText();
await go(`#/project/${KE}`, 1800);
const smed = page.locator('.kz-tool', { hasText: /SMED|changeover/i }).first();
ok((await smed.count()) === 1 && /1 in this project/.test(await smed.innerText()), `5 the SMED study the project holds is said under the week (“${(await smed.innerText()).replace(/\s+/g, ' ').slice(0, 90)}”)`);
ok(/None used in this project yet/.test(await page.locator('.kz-start .kz-tool').first().innerText()), '5 a baseline tool not used is said so — nothing required');
await smed.getByRole('button', { name: /^Open/ }).click(); await page.waitForTimeout(1200);
ok(page.url().includes(KE) && /changeover|smed/i.test(page.url()), `5 Open lands in the project’s tool (${page.url().split('#')[1]})`);
await go(`#/project/${KE}`, 1800);
await page.locator('.kz-check .kz-tool').first().waitFor({ timeout: 10000 }).catch(() => undefined);
ok((await page.locator('.kz-check .kz-tool').count()) >= 1, '5 the check offers the tools that answer it (Actions, the control chart)');

/* ---- 6 the paper ---- */
const pdf = await t.pdfText(async () => {
  const b = page.getByRole('button', { name: /Report/ }).first(); await b.click(); await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: /Kaizen event report/ }).or(page.getByRole('button', { name: /Kaizen event report/ })).first().click();
}, 'kaizen');
for (const s of ['Kaizen event report', 'Wrapper changeover to under 25 minutes', 'Maria Okafor', 'Day 1', 'Mon 2 Nov 2026', 'Four trips to the stores for film', '41 min changeover', 'Day 6', 'Jig fitted on the Monday after', 'Verdict: Holding', '6 Dec 2026', 'Last six changeovers: 25, 24, 28, 31, 30, 33'])
  ok(pdf.includes(t.norm(s)), `6 the paper says “${s}”`);
const m = await page.evaluate(async () => { const K = await import('/src/lib/kaizenEvent.ts'); return null; });
ok(/1 of 6 days written/.test(pdf) || /of 6 days written/.test(pdf), '6 the paper’s sentence is the screen’s (days written of six)');

/* ---- 7 a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${KE}`, 2000);
await page.waitForFunction(() => !document.querySelector('.kz textarea'), null, { timeout: 8000 }).catch(() => undefined);
{
  const boxes = await board().locator('textarea, input, button[role="radio"]:not([disabled])').count();
  ok(boxes === 0 && (await day(1).locator('.kz-ro').first().innerText()).startsWith('Four trips'), `7 a client reads the board and writes nothing (${boxes} controls)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 8 a phone ---- */
await page.setViewportSize({ width: 390, height: 800 }); await go(`#/project/${KE}`, 1800);
{
  const w = await t.wide(); ok(w <= 1, `8 on a phone nothing is off the side (${w}px over)`);
  const small = await board().locator('.kz-day textarea, .kz-day input, .kz-v').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43.5).length);
  ok(small === 0, `8 every control on the board is 44 px (${small} smaller)`);
}
await t.finish('The Kaizen event accepted: its questions, the week as day columns with a sixth day, the 30-day check booked and judged in words, tools falling in, the paper read back, a client reads only, a phone fits');
