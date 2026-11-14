/* ANY WORKBOOK — THE SHAPES FACTORY WORKBOOKS COME IN (14 November, docs/WORKBOOKS.md — Rowland: "excel abilities is not on just this
 * workbook it generilisticly all of them any excel workbook yes it will be in our domain manufacturing but Luna must understand any work
 * book"; told what she could and could not read of sixteen shapes: "go do all 3"). Driven in the real page on
 * scripts/workbook/make-shape-workbooks.mjs (every name and figure made up, each workbook with the truth it was written from), the
 * gateway played by the script and EVERY request to it counted — the first look of each is the app's own, so there must be NONE:
 *   1  NEVER A WRONG FIGURE   the sheet's own total rows left out and said; "45 min", "21,450", "£108.00" and dates typed as words read
 *                      as what they are; a duration kept as a time read as minutes; a sheet of rates AVERAGED and never added; pack
 *                      weights said by their average and spread and how many are outside their limits; a stock list's value as
 *                      quantity × unit cost; a small summary beside the log left out of it;
 *   2  THE SHAPES      months across the top read as rows; two rows of headings; a tab a week read as ONE table; three tables stacked
 *                      on one sheet, each its own — and each time she SAYS how she read it;
 *   3  NOTHING TO ADD UP   an action log counted (its rows, what is past its date and not closed, by owner and status); a filled-in
 *                      form said answer by answer, with no total made of it;
 *   4  ROUND TWO       (the same evening — eleven harder workbooks, measured before the reader was changed: 3 right, 6 wrong) the
 *                      headings repeated down a printed report passed over (one table, not eight); a row of units taken into the
 *                      headings; lines across the top read as one figure by line; three rows of headings, a column a level; a day
 *                      a column with a Total column AND a Total row, neither counted; an outline pasted from a pivot table read by
 *                      the rows under its group rows; kg, packs and litres never added together; a form in two pairs of columns;
 *   5  LUNA            a question typed goes to Luna — one request, and the look she is sent says how the sheet was read;
 *   6  THE PHONE       nothing off the side. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'wbshape-'));
execFileSync('node', ['scripts/workbook/make-shape-workbooks.mjs', dir], { stdio: 'ignore' });
const truth = name => JSON.parse(readFileSync(join(dir, `${name}.truth.json`), 'utf8'));
const n = v => v.toLocaleString('en-GB');

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked of Luna.' }) });
});
await t.go('#/ai', 3000);
/** Attach a workbook through Luna's own attach control and return what she says of it by herself, as the page shows it. */
const attach = async name => {
  const before = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
  await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(join(dir, `${name}.xlsx`));
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before, { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  const turn = page.locator('.ai-turn.is-colleague').last();
  return { turn, said: t.norm(await turn.innerText()), code: await turn.locator('[data-ai-code]').count() };
};
const has = (said, words) => said.includes(t.norm(words));

/* ---- 1 · never a wrong figure ---- */
let T = truth('04-total-rows');
let a = await attach('04-total-rows');
ok(a.code === 1 && asks.length === 0, `1 total rows: the first look is the app's own — no request sent (${asks.length})`);
ok(has(a.said, '5 rows are the sheet’s own totals') && has(a.said, 'left out, so nothing is counted twice'), '1 the sheet’s own total rows are left out, and said');
ok(has(a.said, `Line 1 ${n(3304)}`) && !has(a.said, n(T.wrongIfDoubled ?? -1)), '1 each line’s minutes as written — not doubled by its total row');
ok(has(a.said, `as the figure that matters: ${n(T.total)} over 240 rows`), `1 the total is the rows' own (${n(T.total)})`);

T = truth('08-text-numbers');
a = await attach('08-text-numbers');
ok(has(a.said, '“Downtime (mins)” is typed as words (with “min”) - read as numbers') && has(a.said, '“Date” is typed as words - read as dates'), '1 numbers and dates typed as words are read as what they are, and said');
ok(has(a.said, `I have taken “Downtime (mins)” as the figure that matters: ${n(T.total)} over 240 rows`), `1 and the figure and its total follow (${n(T.total)})`);

T = truth('13-durations-as-time');
a = await attach('13-durations-as-time');
ok(has(a.said, '“Duration” is kept as a time (0:45) - read as minutes') && has(a.said, 'I have taken “Duration” as the figure that matters'), '1 a duration kept as a time is read as minutes and led with');
ok(has(a.said, `${n(T.total)} min over 240 rows`), `1 its minutes are the generator's (${n(T.total)})`);

T = truth('14-rates-only');
a = await attach('14-rates-only');
ok(has(a.said, '“OEE %” is a rate, so I have AVERAGED it over the rows and never added it'), '1 a sheet of rates is averaged, never added');
ok(has(a.said, `never added it: ${T.total}% over 160 rows`) && has(a.said, 'Not added up: “Availability %” (a rate)'), `1 its average is the generator's (${T.total}%), the other rates not added up`);

T = truth('15-measurements');
a = await attach('15-measurements');
ok(has(a.said, '“Weight (g)” is a measurement, not something to add up'), '1 pack weights are a measurement, not a sum');
ok(has(a.said, `${T.total} rows of 200 are outside`) && has(a.said, 'Against “Lower limit” and “Upper limit” on the same rows'), `1 how many are outside their limits, as the generator counted (${T.total})`);

T = truth('16-stock-list');
a = await attach('16-stock-list');
ok(has(a.said, '“Qty on hand” × “Unit cost £” on each row gives a value'), '1 a stock list’s value is quantity × unit cost, row by row');
ok(has(a.said, `I have led with that: £${n(Math.round(T.total))} over 80 rows`) && has(a.said, '“Unit cost £” (a price for one)'), `1 the value is the generator's (£${n(Math.round(T.total))}); the price is not added up`);

T = truth('11-side-by-side');
a = await attach('11-side-by-side');
ok(has(a.said, '“Reason (2)”, “Minutes (all)” - to the right of a gap') && has(a.said, 'left out of it'), '1 a small summary beside the log is left out of it, and said');
ok(has(a.said, `as the figure that matters: ${n(T.total)} over 60 rows`), `1 the log's own minutes (${n(T.total)})`);
ok(asks.length === 0, `1 seven workbooks read and said — still no request sent (${asks.length})`);

/* ---- 2 · the shapes, read as the tables they are ---- */
T = truth('02-months-across');
a = await attach('02-months-across');
ok(has(a.said, '“Output” is a grid - “Line” down the side, 3 months across the top (Apr-26 to Jun-26). I have read it as rows'), '2 months across the top: said to be a grid, read as rows');
ok(has(a.said, `Line 1 ${n(T.byLine['Line 1'])}`) && has(a.said, `Line 4 ${n(T.byLine['Line 4'])}`), '2 each line’s packs across its months, as the generator made them');

T = truth('03-two-row-headings');
a = await attach('03-two-row-headings');
ok(has(a.said, '“Line 1” has two rows of headings - “Days”, “Nights” over “Packs”, “Downtime (mins)”') && has(a.said, 'with “Shift” a column of its own'), '2 two rows of headings: the top row becomes a column');
ok(has(a.said, `“Downtime (mins)” as the figure that matters: ${n(T.also.mins)} over 80 rows`) && has(a.said, 'By “Shift” (2): Days'), `2 downtime over both shifts as the generator made it (${n(T.also.mins)}), split by shift`);

T = truth('05-tab-per-week');
a = await attach('05-tab-per-week');
ok(has(a.said, '8 tabs - “Wk 15”, “Wk 16”, “Wk 17” … “Wk 22” - have the same headings') && has(a.said, 'ONE table of 224 rows, with the tab as a column (“Week”)'), '2 a tab a week: read as ONE table, the tab a column named for what it is');
ok(has(a.said, `as the figure that matters: ${n(T.total)} over 224 rows`) && !has(a.said, `as the figure that matters: ${n(T.oneTab)} `), `2 the total is all eight tabs' (${n(T.total)}), not one tab's (${n(T.oneTab)})`);

T = truth('06-stacked-tables');
a = await attach('06-stacked-tables');
ok(has(a.said, '“Summary” holds 3 tables one under another') && has(a.said, '“DOWNTIME BY REASON” from row 11, “LABOUR” from row 18'), '2 three tables stacked on one sheet are each said, with the row its headings are on');
ok(has(a.said, `“Packs” as the figure that matters: ${n(T.total)} over 4 rows`) && has(a.said, `“Minutes” ${n(T.also.mins)}`), `2 the first table's packs (${n(T.total)}) and the second's minutes (${n(T.also.mins)}), each from its own table`);
ok(asks.length === 0, `2 four more read and said — still no request sent (${asks.length})`);

/* ---- 3 · nothing to add up ---- */
T = truth('09-action-log');
a = await attach('09-action-log');
ok(has(a.said, 'has no figure to add up - it reads as a register, a row a thing - so I have counted its rows: 60 rows'), '3 an action log is counted, not guessed at');
ok(has(a.said, `${T.total} rows are past their “Due” date and not “Closed”`), `3 what is past its date and not closed (${T.total})`);
ok(has(a.said, 'By “Owner” (3): A. Marsh 20, B. Okoro 20, C. Lund 20') && has(a.said, `Overdue ${T.also.overdue}`), '3 by owner and by status, as the generator made them');

a = await attach('07-form');
ok(a.code === 1 && has(a.said, '“Shift report” reads as a filled-in form, not a table'), '3 a filled-in form is said to be a form');
ok(has(a.said, 'Packs made: 21,450') && has(a.said, 'Target: 24,000') && has(a.said, 'Team leader: A. Marsh') && has(a.said, 'Downtime (mins): 85'), '3 its answers are given, each by its label');
ok(has(a.said, 'There is nothing to add up in one form'), '3 and no total is made of it');
ok(asks.length === 0, `3 thirteen workbooks, every one answered by the app — no request sent (${asks.length})`);

/* ---- 4 · round two: harder sheets, and the shapes round one left unread ---- */
T = truth('22-repeated-headings');
a = await attach('22-repeated-headings');
ok(has(a.said, 'the headings are said again 7 times down the sheet, as a printed report repeats them - passed over, so it is one table'), '4 headings repeated down the sheet are passed over, and said');
ok(has(a.said, `as the figure that matters: ${n(T.total)} over 240 rows`) && !has(a.said, 'working copy'), `4 one table of 240 rows (${n(T.total)}), not eight copies of the first page`);

T = truth('23-units-row');
a = await attach('23-units-row');
ok(has(a.said, 'row 2, straight under the headings, gives the units - taken into the headings, not read as a row'), '4 a row of units is taken into the headings, and said');
ok(has(a.said, `“Downtime (mins)” as the figure that matters: ${n(T.total)} over 240 rows`), `4 the heading carries its unit and the rows are the data's own (${n(T.total)} over 240)`);

T = truth('18-names-across');
a = await attach('18-names-across');
ok(has(a.said, '“Output” has a column for each line - “Line 1”, “Line 2”, “Line 3” … “Line 4” - across the top. I have read it as rows'), '4 lines across the top: read as rows, the line a column');
ok(has(a.said, `as the figure that matters: ${n(T.total)} over 12 rows`) && has(a.said, `Line 4 ${n(T.byLine['Line 4'])}`), `4 every line's packs, not Line 1's alone (${n(T.total)})`);

T = truth('19-three-row-headings');
a = await attach('19-three-row-headings');
ok(has(a.said, '“Line 1” has three rows of headings - “Granola 500g”, “Muesli 750g” over “Days”, “Nights” over “Packs”, “Downtime (mins)”') && has(a.said, 'with “Group” and “Shift” columns of their own'), '4 three rows of headings: a column for each level');
ok(has(a.said, `“Downtime (mins)” as the figure that matters: ${n(T.total)} over 120 rows`) && has(a.said, `Days ${n(T.also.days)}, Nights ${n(T.also.nights)}`), `4 every product and shift (${n(T.total)}), split by shift`);

T = truth('25-matrix-both-totals');
a = await attach('25-matrix-both-totals');
ok(has(a.said, '“Daily” is a grid - “Line” down the side, 14 dates across the top (6 Apr 2026 to 19 Apr 2026)') && has(a.said, 'Its “Total” column is the grid’s own adding-up and is left out'), '4 a day a column: the heading row of dates is found, the Total column left out');
ok(has(a.said, '1 row is the sheet’s own totals (“Total”)') && has(a.said, `as the figure that matters: ${n(T.total)} over 56 rows`) && !has(a.said, n(T.also.quadrupled)), `4 neither total is counted (${n(T.total)}, not ${n(T.also.quadrupled)})`);

T = truth('24-outline');
a = await attach('24-outline');
ok(has(a.said, '“Pivot” is an outline - 4 rows (“Line 1”, “Line 2” …) each carry the total of the rows under them') && has(a.said, 'left the 4 group rows out, so nothing is counted twice'), '4 an outline from a pivot table: the group rows are left out, and said');
ok(has(a.said, `“Minutes” as the figure that matters: ${n(T.total)} over 16 rows`) && !has(a.said, n(T.also.doubled)), `4 its minutes once (${n(T.total)}), never the lines and their reasons together (${n(T.also.doubled)})`);

T = truth('27-mixed-units');
a = await attach('27-mixed-units');
ok(has(a.said, '“Qty used” is counted in 3 different units (“UoM”: kg, packs, litres), so it is never added across them'), '4 quantities in mixed units are never added across them');
ok(has(a.said, `${n(T.total)} kg`) && has(a.said, `${n(T.also.packs)} packs`) && has(a.said, `${n(T.also.litres)} litres`) && !has(a.said, n(T.also.wrongIfAdded)), `4 said unit by unit, as the generator made them — never ${n(T.also.wrongIfAdded)}`);

a = await attach('20-form-two-pairs');
ok(has(a.said, 'reads as a filled-in form, not a table - labels with their answers beside them, in pairs across each row. 11 answers'), '4 a form in two pairs of columns is still a form');
ok(has(a.said, 'Shift: Nights') && has(a.said, 'Team leader: B. Okoro') && has(a.said, 'Target: 24,000') && has(a.said, 'Rejects: 410'), '4 the second pair of every row is an answer too');
ok(asks.length === 0, `4 twenty-one workbooks, every one answered by the app — no request sent (${asks.length})`);

/* ---- 5 · a question for Luna goes to Luna ---- */
{
  const before = await page.locator('.ai-turn.is-colleague').count();
  await page.locator('.ai-box').fill('Which owner has the most actions overdue, and what should we do about it?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length > k && !document.querySelector('.ai-thinking'), before, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  ok(asks.length === 1, `5 a question goes to Luna — one request (${asks.length})`);
  const sent = JSON.stringify(asks[0] ?? {});
  ok(sent.includes('it reads as a register') && sent.includes('is an outline'), '5 she is sent the looks that say how each sheet was read');
  ok(!sent.includes('Action 17 to put right'), '5 and never the workbook’s cells');
}

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '6 on a phone nothing runs off the side');
await t.finish('any workbook — the shapes');
