/* THE EXCEL WORK, FINISHED (13 November, docs/WORKBOOKS.md — Rowland: "I can sit next to the manufacturing manager and go, check this
 * out. This is what's happening currently in the business"; "you drive that through to completion"). The four things the first look was
 * still missing, each driven in the real page on scripts/workbook/make-marked-workbook.mjs (a hand-kept shift report, every name and
 * figure made up, with its own totals), the gateway played by the script and EVERY request to it counted:
 *   1  CELL COLOURS    the workbook attached through Luna's attach control — the first look says the colours painted by hand, each kept
 *                      as a column with its count as the generator painted them, that their meaning is not in the file, and that a
 *                      rule's colours are not read; NO request sent;
 *   2  THE PACK        "Make this a pack" offered first; tapped and sent — answered by the app (no request): the report's card with its
 *                      sections; its PDF downloaded and read back (the title, every section, the generator's monthly totals, what the
 *                      figures rest on); its slides downloaded (a real .pptx);
 *   3  NEXT MONTH      the same report a month later attached — its first look says what changed since the last, by the generator's
 *                      totals: the rows added, the new month, the part month now whole, the figure already read that CHANGED; no request;
 *   4  THE HEADINGS    in a new conversation, a copy with a details strip above its headings — "The headings are on row 3" typed and
 *                      sent, answered by the app (no request): the headings named, the look by them with the generator's totals, the
 *                      pack offered;
 *   5  THE PHONE       nothing off the side, the offered follow-ups a thumb's height. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'wbf-'));
const F = { sep: join(dir, 'Shift report September.xlsx'), oct: join(dir, 'Shift report October.xlsx'), strip: join(dir, 'Shift report with strip.xlsx') };
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', F.sep], { stdio: 'ignore' });
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', F.oct, '--later'], { stdio: 'ignore' });
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', F.strip, '--strip'], { stdio: 'ignore' });
const E = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, JSON.parse(readFileSync(`${f}.expected.json`, 'utf8'))]));
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
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked of Luna.' }) });
});
await t.go('#/ai', 3000);
const attach = async file => {
  const before = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
  await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(file);
  await page.waitForFunction(n => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > n, before, { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  return page.locator('.ai-turn.is-colleague').last();
};
const say = async words => {
  const before = await page.locator('.ai-turn.is-colleague').count();
  await page.locator('.ai-box').fill(words);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.waitForFunction(n => document.querySelectorAll('.ai-turn.is-colleague').length > n && !document.querySelector('.ai-thinking'), before, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  return page.locator('.ai-turn.is-colleague').last();
};

/* ---- 1 · the colours painted by hand ---- */
let turn = await attach(F.sep);
let said = t.norm(await turn.innerText());
const has = (x, m) => ok(said.includes(t.norm(x)), `${m}: "${x.slice(0, 120)}"`);
ok(/no AI used/.test(said), '1 the first look appears by itself, marked done in the app');
has(`“Row colour” — ${E.sep.red} red`, '1 a row painted whole is counted as the generator painted it');
has(`“Colour of Packs” — ${E.sep.green} green`, '1 a single painted cell is its column’s (a theme colour with a tint read as green)');
has(`“Colour of Status” — ${E.sep.amber} orange`, '1 the amber cells');
has('What a colour MEANS is not written in the file', '1 the meaning of a colour is asked, never guessed');
has('1 colour rule (conditional formatting)', '1 a rule’s colours are said not to be read');
ok(asks.length === 0, `1 NOTHING was sent to the AI service (${asks.length} requests)`);

/* ---- 2 · the pack ---- */
const chips = await turn.locator('.ai-sug').allInnerTexts();
ok(chips[0] === 'Make this a pack', `2 the pack is offered first: ${chips.join(' | ')}`);
await turn.locator('.ai-sug').first().click();
ok((await page.locator('.ai-box').inputValue()) === 'Make this a pack', '2 a tap puts it in the box');
turn = await say('Make this a pack');
said = t.norm(await turn.innerText());
ok(said.includes(t.norm('Here is the pack — Shift report September — first look')) && /no AI used/.test(said), `2 answered by the app: ${said.slice(0, 90)}`);
ok(asks.length === 0, `2 no request was sent for the pack (${asks.length})`);
const card = page.locator('[data-report]').last();
ok((await card.count()) === 1, '2 the report’s card is in the conversation');
const heads = (await card.locator('.ai-sec-h').allInnerTexts()).map(x => x.trim());
for (const h of ['In short', 'What this workbook holds', 'Month by month', 'The period', 'By Line', 'Colours', 'To know before trusting it']) ok(heads.includes(h), `2 the pack has “${h}”`);
ok(heads[0] === 'In short', '2 it opens with In short');
ok((await card.locator('[data-unbacked]').count()) === 0, '2 nothing the code worked is marked Check this');
const save = async (sel, name) => { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), card.locator(sel).click()]); const p = join(dir, name); await dl.saveAs(p); return p; };
const pdf = await save('[data-report-pdf]', 'pack.pdf');
const text = execFileSync('pdftotext', ['-layout', pdf, '-']).toString().replace(/\s+/g, ' ');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf]).toString())?.[1] ?? 0);
/* the paper's font writes the minus sign as a hyphen */
const plain = x => x.replace(/−/g, '-').replace(/\s+/g, ' ');
const onPaper = (x, m) => ok(plain(text).includes(plain(x)), `2 the paper ${m}: "${x.slice(0, 90)}"`);
onPaper('Shift report September — first look', 'is titled');
for (const h of ['In short', 'What this workbook holds', 'Month by month', 'The period', 'By Line', 'To know before trusting it']) onPaper(h, 'has the section');
onPaper(`August 2026 to September 2026: “Variance £” is ${money(E.sep.variance)} over ${E.sep.rows} rows of “Shift report”.`, 'opens with the figure over the period, as the generator made it');
ok(!/Say if it is another|tell me|I will remember/.test(text), '2 the paper asks nobody anything');
ok(!/\bTEXT\b|\bCHART\b/.test(text), '2 no section is labelled TEXT or CHART');
onPaper(`August: ${money(E.sep.byMonth['2026-08'])}`, 'says August as the generator made it');
onPaper(`September (part — to the 14th, 14 days): ${money(E.sep.byMonth['2026-09'])}`, 'says the part month as part');
onPaper('Shift report: sum of Variance £ by Date by month — 270 of 270 rows, worked by Faultline’s code', 'says what the figures rest on');
ok(pages >= 2 && pages <= 8, `2 the paper is ${pages} pages`);
ok(execFileSync('pdfimages', ['-list', pdf]).toString().split('\n').filter(l => /image/.test(l)).length >= 2, '2 the charts are on the paper as pictures');
const deck = await save('[data-report-pptx]', 'pack.pptx');
ok(readFileSync(deck).subarray(0, 2).toString() === 'PK', '2 the slides download as a real .pptx');
await page.waitForTimeout(400);

/* ---- 3 · the same report, a month later ---- */
turn = await attach(F.oct);
said = t.norm(await turn.innerText());
has(`Since “Shift report September.xlsx”`, '3 the earlier reading is named');
has(`${E.oct.rows - E.sep.rows} rows more on “Shift report” (${E.sep.rows} then, ${E.oct.rows} now)`, '3 the rows added');
has(`New: October ${money(E.oct.byMonth['2026-10'])}.`, '3 the new month, by the generator’s total');
has(`September was 14 days in at ${money(E.sep.byMonth['2026-09'])} and is whole now at ${money(E.oct.byMonth['2026-09'])}`, '3 the part month now whole');
has(`Figures already read have CHANGED: August was ${money(E.sep.byMonth['2026-08'])} and is ${money(E.oct.byMonth['2026-08'])} now (−£500)`, '3 the figure quietly changed, with both figures');
ok(asks.length === 0, `3 no request was sent (${asks.length})`);

/* ---- 4 · the headings, as the person says them ---- */
await page.getByRole('button', { name: 'New conversation' }).first().click();
await page.waitForTimeout(900);
turn = await attach(F.strip);
said = t.norm(await turn.innerText());
ok(!said.includes(`August: ${money(E.strip.byMonth['2026-08'])}`) || !/“Variance £”/.test(said), '4 with the strip read as the headings the look cannot be right');
const start = (await turn.locator('.ai-sug').allInnerTexts()).find(x => /^Start with “Shift report”/.test(x));
if (start) { turn = await say(start); said = t.norm(await turn.innerText()); }
turn = await say('The headings are on row 3');
said = t.norm(await turn.innerText());
ok(/no AI used/.test(said), '4 answered by the app');
has('The headings of “Shift report” are taken from row 3: “Date”, “Shift”, “Line”, “Packs”, “Target”, “Variance £”, “Status”.', '4 the headings named from the row said');
has('The 2 rows down to it are no longer read as data.', '4 the strip is no longer data');
has(`August: ${money(E.strip.byMonth['2026-08'])}`, '4 the look by those headings, by the generator’s total');
has(`Line 3 ${money(E.strip.byLine['Line 3'])}`, '4 the worst line as the generator made it');
ok((await turn.locator('.ai-sug').allInnerTexts())[0] === 'Make this a pack', '4 the pack is offered of the look as now read');
ok(asks.length === 0, `4 no request was sent (${asks.length})`);
/* said another way goes to Luna, who has the same capability */
await say('I think the titles might be a bit further down than you looked, can you check?');
ok(asks.length === 1, `4 said another way it goes to Luna (${asks.length} request)`);

/* ---- 5 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
const off = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(off <= 1, `5 nothing off the side on a phone (${off}px)`);
const small = await page.evaluate(() => [...document.querySelectorAll('.ai-sug')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 44).length);
ok(small === 0, `5 every offered follow-up is a thumb’s height (${small} smaller)`);

await t.finish();
