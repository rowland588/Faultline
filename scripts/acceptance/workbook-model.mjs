/* THE MODEL ON TOP OF THE ROWS (14 November, docs/WORKBOOKS.md — Rowland, asked what Luna understood of a real KPI workbook and told the
 * three things she missed: "go do all 3"). Driven in the real page on scripts/workbook/make-kpi-workbook.mjs (the SHAPE of that workbook;
 * every name and figure made up, with its own totals), the gateway played by the script and EVERY request to it counted:
 *   1  THE ROWS THE REPORTS LEAVE OUT   attached through Luna's attach control — the first look says the rule read from the report's
 *                      formulas, how many hold it, the rows kept and left out and what they carry, as the generator made them; NO request;
 *   2  ITS OWN WEEKS   the day its weeks end on and where that was read, the latest WHOLE week by the workbook's own name against the
 *                      week before and the weeks before it, the part week said as part — the generator's totals;
 *   3  ITS OWN CHECKS  the checks sheet read as checks: what it says is not fine, what agrees with the rows, what is close, what the rows
 *                      cannot give; the error cells it says are intended no longer warned about as wrong;
 *   4  EVERY ROW       "Read every row" typed and sent — answered by the app (no request) with what the rows left out carry;
 *                      "Leave them out" back again, no request;
 *   5  THE PACK        made by the app (no request): Week by week and The workbook's own checks among its sections; its PDF read back —
 *                      the rule, the latest week, and nothing asked of the reader;
 *   6  LUNA            "week by week" tapped and sent goes to Luna — one request, and she is sent the look that says the basis;
 *   7  THE PHONE       nothing off the side. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'wbm-'));
const file = join(dir, 'Packing KPI.xlsx');
execFileSync('node', ['scripts/workbook/make-kpi-workbook.mjs', file], { stdio: 'ignore' });
const E = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8'));
const money = v => { const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10; return `${r < 0 ? '−' : ''}£${Math.abs(r).toLocaleString('en-GB')}`; };
const n = v => v.toLocaleString('en-GB');
const L = E.weeks[E.latestWeek], B = E.weeks[E.weekBefore], P = E.weeks[E.partWeek];

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
const attach = async f => {
  const before = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
  await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(f);
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before, { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  return page.locator('.ai-turn.is-colleague').last();
};
const say = async words => {
  const before = await page.locator('.ai-turn.is-colleague').count();
  await page.locator('.ai-box').fill(words);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length > k && !document.querySelector('.ai-thinking'), before, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  return page.locator('.ai-turn.is-colleague').last();
};

/* ---- 1 · the rows the reports leave out ---- */
let turn = await attach(file);
let said = t.norm(await turn.innerText());
const has = (x, m) => ok(said.includes(t.norm(x)), `${m}: "${x.slice(0, 130)}"`);
ok(/no AI used/.test(said), '1 the first look appears by itself, marked done in the app');
has('18 formulas on “Report” — of the 22 that add up “Production” under a condition — take only the rows where “Rework flag” is 0', '1 the rule is read from the report’s own formulas');
has(`I have read it the same way: ${n(E.rows - E.flagRows)} of ${n(E.rows)} rows`, '1 the rows kept, as the generator counted them');
has(`The ${E.flagRows} left out carry ${money(E.opFlagged)} of “Op var £”; with them it is ${money(E.opAll)}`, '1 what the rows left out carry, and the total with them');
has('Why they are left out, the file does not say', '1 it does not claim to know why');
for (const [m, v] of Object.entries(E.opByMonthBasis)) ok(said.includes(t.norm(money(v))), `1 ${m} is on the reports’ basis: ${money(v)}`);

/* ---- 2 · its own weeks ---- */
has('The workbook’s own weeks end on a Saturday — read from “Week ending” on “Downtime”', '2 the week is read from the dates, not the calendar’s');
has('it names them itself (“Week” on “Setup”)', '2 and its own names for them');
has(`The latest whole week, to Saturday 6 June — “${L.name}”: “Op var £” ${money(L.op)}, against ${money(B.op)} the week before and ${money(E.averageBefore)} a week on average over the ${E.averageOver} weeks before it`, '2 the latest whole week, the week before and the weeks before it, to the generator’s totals');
has(`The week to Saturday 13 June is only ${P.days} days in: ${money(P.op)} so far`, '2 the week still being filled is said as part');

/* ---- 3 · its own checks ---- */
has('“Health” reads as the workbook’s own checks', '3 the checks sheet is read as checks');
has('By its own word, not fine: “Production data status” — “STALE - chase the entries”', '3 what it says is not fine is said first');
has(`“Production rows” ${n(E.rows)} (the rows of “Production”)`, '3 a row count agrees');
has(`“Runs marked re-work” ${E.flagRows} (the rows “Rework flag” marks on “Production”)`, '3 the rows a flag marks agree');
has(`“Packs” ${n(L.packs)} (“Packs” on “Production” over the week to 6 June, on the reports’ basis)`, '3 the week’s packs agree — on the reports’ basis');
ok(/Close, not equal: “Downtime cost this week” £[\d,.]+ against £[\d,.]+/.test(said), '3 a figure a little off is said close, with both');
ok(/I cannot make from the rows as they stand: “£ against plan”/.test(said), '3 a figure the rows cannot give is said so');
has('not that either is right', '3 agreeing is not claimed to be right');
has('“Trend” shows 30 error cells — the workbook’s own checks (“Health”) say that is intended', '3 the errors it says are on purpose are not warned about as wrong');
ok(!said.includes('may be wrong or out of date'), '3 …and the old warning is gone');
ok(asks.length === 0, `1–3 NOTHING was sent to the AI service (${asks.length} requests)`);
const chips = await turn.locator('.ai-sug').allInnerTexts();
ok(chips.includes('Show “Op var £” week by week'), `2 week by week is offered: ${chips.join(' | ')}`);

/* ---- 4 · every row, and back ---- */
turn = await say('Read every row');
said = t.norm(await turn.innerText());
ok(/no AI used/.test(said), '4 “Read every row” is answered by the app');
has(`You asked for every row, so they are in: the ${E.flagRows} rows the reports leave out carry ${money(E.opFlagged)} of “Op var £”; without them it is ${money(E.opBasis)}`, '4 they are in, and what they carry is said');
for (const [m, v] of Object.entries(E.opByMonthAll)) ok(said.includes(t.norm(money(v))), `4 ${m} on every row: ${money(v)}`);
turn = await say('Leave them out');
said = t.norm(await turn.innerText());
has(`I have read it the same way: ${n(E.rows - E.flagRows)} of ${n(E.rows)} rows`, '4 “Leave them out” goes back to the reports’ basis');
ok(asks.length === 0, `4 no request for either (${asks.length})`);

/* ---- 5 · the pack ---- */
turn = await say('Make this a pack');
said = t.norm(await turn.innerText());
ok(/no AI used/.test(said) && asks.length === 0, '5 the pack is made by the app, no request');
const card = page.locator('[data-report]').last();
const heads = (await card.locator('.ai-sec-h').allInnerTexts()).map(x => x.trim());
for (const h of ['What this workbook holds', 'Month by month', 'Week by week', 'The latest week', 'The workbook’s own checks', 'To know before trusting it']) ok(heads.includes(h), `5 the pack has “${h}”`);
ok((await card.locator('[data-unbacked]').count()) === 0, '5 nothing the code worked is marked Check this');
await card.locator('.ai-report-download > summary').click();
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), card.locator('[data-report-pdf]').click()]);
const pdf = join(dir, 'pack.pdf'); await dl.saveAs(pdf);
const plain = x => x.replace(/−/g, '-').replace(/\s+/g, ' ');
const text = plain(execFileSync('pdftotext', ['-layout', pdf, '-']).toString());
const onPaper = (x, m) => ok(text.includes(plain(x)), `5 the paper ${m}: "${x.slice(0, 100)}"`);
onPaper('take only the rows where “Rework flag” is 0', 'says the rule');
onPaper(`“${L.name}”: “Op var £” ${money(L.op)}`, 'says the latest whole week by its own name');
onPaper('By its own word, not fine: “Production data status”', 'carries the checks');
ok(!/Say “read every row”|Say if your week runs differently|Tell me how one is made/.test(text), '5 the paper asks nobody anything');

/* ---- 6 · a question for Luna goes to Luna, with the look that says the basis ---- */
await say('Show “Op var £” week by week and tell me which line drives it');
ok(asks.length === 1, `6 a question goes to Luna — one request (${asks.length})`);
ok(JSON.stringify(asks[0] ?? {}).includes('take only the rows where'), '6 she is sent the look that says the reports’ basis');

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '7 on a phone nothing runs off the side');
await t.finish('the model on top of the rows');
