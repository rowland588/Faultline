/* ACCEPTANCE — THE FIRST LOOK AT A WORKBOOK, IN CODE (12 November; docs/WORKBOOKS.md; src/lib/workbook/firstLook, screens/AiModeScreen
 * readWorkbookFile). Rowland, 12 November: "if we can nail the excel analysis thats a significant achievement"; "how much can we take
 * into code". An hour-by-hour labour workbook in the shape a packing site keeps (scripts/workbook/make-hourly-workbook.mjs — every name
 * and figure made up, its own totals kept as it writes) is attached through AI Mode's own attach control in a real browser, every
 * request to the `assist` gateway counted by the script:
 *
 *   1  attached and read on the device — and Luna's turn appears by itself: the first look, marked "Done in the app — no AI used",
 *      with NO request sent
 *   2  what it says is the generator's own totals: the sheet worth analysing with its rows; the figure taken, said as a choice; each
 *      month, the part-months said; the last part-month compared a day; the lines losing money and the best; the biggest mover between
 *      the last two whole months; the downtime with no reason given
 *   3  the next questions offered in the columns' own words; one tapped is put in the box and, sent, goes to Luna (one request), who is
 *      sent the first look
 *   4  the phone at 390: the turn inside the screen, the chips 44 px
 *
 *   node scripts/acceptance/ai-first-look.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'wbl-'));
const file = join(dir, 'Packing labour hour by hour.xlsx');
execFileSync('node', ['scripts/workbook/make-hourly-workbook.mjs', file], { stdio: 'ignore' });
const exp = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8'));
const money = v => { const r = Math.round(v); return `${r < 0 ? '−' : ''}£${Math.abs(r).toLocaleString('en-GB')}`; };

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Line 2 on the red tray is where October fell away.' }) });
});
await t.go('#/ai', 3000);

/* ---- 1 · attached, and the first look appears by itself ---- */
await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(file);
await page.waitForSelector('.ai-turn.is-colleague [data-ai-code]', { timeout: 60000 }).catch(() => undefined);
await page.waitForTimeout(600);
const turn = page.locator('.ai-turn.is-colleague').last();
const said = t.norm(await turn.innerText());
ok((await turn.locator('[data-ai-code]').count()) === 1 && /no AI used/.test(said), '1 Luna’s turn appears when the workbook is read, marked as done in the app');
ok(asks.length === 0, `1 NOTHING was sent to the AI service (${asks.length} requests)`);

/* ---- 2 · what it says is the generator's own totals ---- */
const has = (x, m) => ok(said.includes(t.norm(x)), `2 ${m}: "${x.slice(0, 110)}"`);
has(`The one worth analysing is “Hourly archive” — ${exp.rows.toLocaleString('en-GB')} rows`, 'the sheet worth analysing, with its rows');
has('I have led with “Direct P&L £ (fav +)” — it is filled on the most rows. Which one does the business manage by?', 'the figure led with said as a choice, and the question asked');
has(`“Fin var £” ${money(exp.fin)} (filled on ${exp.finRows.toLocaleString('en-GB')} rows — only where “Wrong line flag” is 1)`, 'a result column filled only under a flag said so, with its total, and not led with');
has('has 5 sheets — 2 hold rows of data, the other 3 read as reports, lists or grids', 'the data sheets told from the reports');
has(`By “Shift” (2): Days ${money(exp.plByShift.Days)}, Lates ${money(exp.plByShift.Lates)} — none stands out.`, 'the shifts said though none stands out');
has(`July (part — from the 27th, ${exp.daysByMonth['2026-07']} days): ${money(exp.plByMonth['2026-07'])}`, 'a part-month said as part');
has(`August: ${money(exp.plByMonth['2026-08'])} · September: ${money(exp.plByMonth['2026-09'])} · October: ${money(exp.plByMonth['2026-10'])}`, 'each whole month');
has(`November is only 9 days in, so it is compared a day: ${money(exp.plByMonth['2026-11'] / 9)} a day so far, against ${money(exp.plByMonth['2026-10'] / 31)} a day in October.`, 'the part-month compared a day');
const asc = Object.entries(exp.plByLine).sort((a, b) => a[1] - b[1]);
has(`By “Line” (6): losing most ${asc[0][0]} ${money(asc[0][1])}, ${asc[1][0]} ${money(asc[1][1])}; best ${asc.at(-1)[0]} ${money(asc.at(-1)[1])}.`, 'the lines losing money and the best');
has(`The biggest single mover is Line 2 on “Line”: ${money(exp.plByLineMonth['Line 2|2026-10'] - exp.plByLineMonth['Line 2|2026-09'])}`, 'the biggest mover, September to October');
has(`${exp.dtBlank.toLocaleString('en-GB')} of “Unplanned DT (mins)” on “Hourly archive” (${Math.round((exp.dtBlank / exp.dt) * 100)}% of ${exp.dt.toLocaleString('en-GB')}) has no reason`, 'the downtime with no reason');
ok(!/\bShift\b.*\(2\): /.test(said), '2 a split that does not stand out (the two shifts) is not said');
has('By “Description” (from “Product master”, by “SKU”) (6): losing most Red 2kg tray — retail pack', 'a code said by its description from the product master');
has(`“Wrong line flag” marks ${exp.wrongRows.toLocaleString('en-GB')} rows of ${exp.rows.toLocaleString('en-GB')}`, 'a flag counted, with what sits on it');
has(`None of the ${exp.logMinutes.toLocaleString('en-GB')} of “Minutes” on “Downtime log” has a reason: every row’s “Reason” is “Unclassified”.`, 'time lost with no reason at all said plainly');

/* ---- 3 · the next questions; one tapped goes to Luna ---- */
const chips = await turn.locator('.ai-sug').allInnerTexts();
ok(chips.length >= 2 && chips[0] === 'Why did “Direct P&L £ (fav +)” move from September to October?', `3 the next questions in the columns’ own words: ${chips.join(' | ')}`);
await turn.locator('.ai-sug').first().click();
ok((await page.locator('.ai-box').inputValue()) === chips[0], '3 a tap puts the question in the box, to send or change');
await page.getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.ai-turn.is-colleague').length >= 2 && !document.querySelector('.ai-thinking'), null, { timeout: 15000 }).catch(() => undefined);
await page.waitForTimeout(500);
ok(asks.length === 1, `3 the question goes to Luna (${asks.length} request)`);
ok(JSON.stringify(asks[0] ?? {}).includes('I have led with'), '3 Luna is sent the first look with it');

/* ---- 4 · the phone ---- */
await page.setViewportSize({ width: 390, height: 800 });
await page.waitForTimeout(700);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '4 nothing off the side at 390');
const small = await page.evaluate(() => [...document.querySelectorAll('.ai-sug')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 44).length);
ok(small === 0, `4 the chips are a thumb’s height (${small} under 44 px)`);

await t.finish('ai-first-look');
