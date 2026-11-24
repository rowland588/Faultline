/* THE READING — TOLD ONCE, KEPT FOR THAT CUSTOMER'S REPORT, USED AGAIN (15 November, docs/WORKBOOKS.md — Rowland: "Luna will always
 * need some help to understand the sheet and that's fine, even you do"). Driven in the real page on
 * scripts/workbook/make-reading-workbooks.mjs — three months of a made-up site's shift report in the site's own words, each with its
 * truth BOTH WAYS (as a reader gets it unaided, and as the site reads it once told) — the gateway played by the script and EVERY
 * request to it counted:
 *   1  UNAIDED         March attached through Luna's attach control: read wrong for the site (the packs lead, every row counted) —
 *                      by the generator's unaided figures; NO request;
 *   2  TOLD            four short sentences, each answered by the app (no request): "Standing" is time lost — it leads; trial rows
 *                      left out — how many, and what they carry; "Score" is a rate — averaged, and what she would have done by
 *                      herself; never add "Crew" — each look the generator's figures;
 *   3  THE PACK        made from the look as told: its PDF read back — how it was read is on the paper, the figure over the rows
 *                      read, and the paper asks nobody anything;
 *   4  NEXT MONTH      a NEW conversation, April attached: read the way March was, right first time, and it says so with the day
 *                      and the file; compared with March like with like; no request;
 *   5  WHAT WAS TOLD   "What have I told you?" — the reading in words; something added on April ("Charge" is money);
 *   6  FORGET          "Forget what I told you" — put away, and the unaided look back, by the generator's unaided figures;
 *   7  AFTER THAT      a third conversation, May attached: read from nothing;
 *   8  LUNA            said another way it goes to Luna — one request, the look sent, never a cell;
 *   9  THE PHONE       nothing off the side, the offered follow-ups a thumb's height. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'wbr-'));
execFileSync('node', ['scripts/workbook/make-reading-workbooks.mjs', dir], { stdio: 'ignore' });
const F = m => join(dir, `shift-report-${m}.xlsx`);
const E = Object.fromEntries(['march', 'april', 'may'].map(m => [m, JSON.parse(readFileSync(join(dir, `shift-report-${m}.truth.json`), 'utf8'))]));
const n0 = v => Math.round(v).toLocaleString('en-GB');
const n2 = v => v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const today = (() => { const d = new Date(); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; })();

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
let said = '';
const read = async turn => { said = t.norm(await turn.innerText()); return said; };
const has = (x, m) => ok(said.includes(t.norm(x)), `${m}: "${x.slice(0, 130)}"`);
const hasNot = (x, m) => ok(!said.includes(t.norm(x)), `${m}: not "${x.slice(0, 90)}"`);
/* a new conversation: its own button where the head has room for it, else from More ▾ — as a person finds it */
const fresh = async () => {
  const b = page.getByRole('button', { name: /New (chat|conversation)/ }).filter({ visible: true }).first();
  if (await b.count()) await b.click();
  else { await page.locator('.ai-head-acts').getByRole('button', { name: /^More/ }).click(); await page.getByRole('menuitem', { name: /New conversation/ }).first().click(); }
  await page.waitForTimeout(900);
};

/* ---- 1 · unaided ---- */
let m = E.march;
await read(await attach(F('march')));
ok(/no AI used/.test(said), '1 the first look appears by itself, marked done in the app');
has(`I have taken “Packs” as the figure that matters: ${n0(m.unaided.packs)} over ${m.rows} rows`, '1 unaided, the packs lead and every row is counted — the generator’s unaided total');
hasNot('Read the way you told me', '1 nothing has been told');
ok(asks.length === 0, `1 NOTHING was sent to the AI service (${asks.length} requests)`);

/* ---- 2 · told, a sentence at a time ---- */
await read(await say('“Standing” is time lost'));
ok(/no AI used/.test(said), '2 answered by the app');
has('Read the way you told me: “Standing” read as time lost.', '2 what was told is said back');
has(`I have taken “Standing” as the figure that matters: ${n0(m.told.standingAll)} over ${m.rows} rows`, '2 the standing minutes lead now, over every row');
await read(await say('Leave out rows where “Type” is “Trial”'));
has(`rows where “Type” is “Trial” left out. That reads ${m.told.rows} of ${m.rows} rows; the ${m.told.out} left out carry ${n0(m.told.standingOut)} of “Standing”.`, '2 the trial rows are left out — how many, and what they carry');
has(`I have taken “Standing” as the figure that matters: ${n0(m.told.standing)} over ${m.told.rows} rows`, '2 the figure as the site reads it');
for (const [line, v] of Object.entries(m.told.byLine)) has(`${line} ${n0(v)}`, `2 ${line} without its trial runs`);
await read(await say('Score is a rate'));
has('By myself I would have added “Score” up.', '2 what she would have done by herself is said, once');
has(`“Score” averages ${n2(m.told.score)} over the rows read.`, '2 the score is averaged, by the generator’s average');
has('Not added up: “Score” (averaged, as you said)', '2 and listed with what is never added');
await read(await say('Never add Crew'));
has('“Crew” never added up', '2 the crew is never a total');
has('Say “forget what I told you” to have it read as I would by myself.', '2 how to undo it is said');
ok(asks.length === 0, `2 no request was sent for any of it (${asks.length})`);
/* a column that is not there is refused by the app's code — and so goes to Luna, never guessed */
await say('“Scoore” is a rate');
ok(asks.length === 1, `2 a column that is not in the workbook is not taken — it goes to Luna (${asks.length} request)`);
asks.length = 0;

/* ---- 3 · the pack, as told ---- */
let turn = await say('Make this a pack');
await read(turn);
ok(said.includes(t.norm('Here is the pack — shift-report-march — first look')), `3 the pack is made: ${said.slice(0, 80)}`);
const card = page.locator('[data-report]').last();
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), card.locator('[data-report-pdf]').click()]);
const pdf = join(dir, 'pack.pdf'); await dl.saveAs(pdf);
const text = execFileSync('pdftotext', ['-layout', pdf, '-']).toString().replace(/\s+/g, ' ');
const onPaper = (x, w) => ok(text.includes(x.replace(/\s+/g, ' ')), `3 the paper ${w}: "${x.slice(0, 100)}"`);
onPaper(`March 2026: “Standing” is ${n0(m.told.standing)} over ${m.told.rows} rows of “Shift log”.`, 'opens with the figure over the rows read');
onPaper('Read the way you told me: “Standing” read as time lost; “Score” averaged, never added; “Crew” never added up; rows where “Type” is “Trial” left out.', 'says how it was read');
ok(!/forget what I told you|Say if it is another/.test(text), '3 the paper asks nobody anything');
ok(asks.length === 0, `3 no request was sent for the pack (${asks.length})`);

/* ---- 4 · next month, a new conversation ---- */
await fresh();
m = E.april;
await read(await attach(F('april')));
has(`Read the way you told me (${today}, on “shift-report-march.xlsx”): “Standing” read as time lost; “Score” averaged, never added; “Crew” never added up; rows where “Type” is “Trial” left out.`, '4 April is read the way March was — and it says so, with the day and the file');
has(`That reads ${m.told.rows} of ${m.rows} rows; the ${m.told.out} left out carry ${n0(m.told.standingOut)} of “Standing”.`, '4 April’s own trial rows');
has(`I have taken “Standing” as the figure that matters: ${n0(m.told.standing)} over ${m.told.rows} rows`, '4 right first time — the generator’s figure as the site reads it');
has(`“Score” averages ${n2(m.told.score)}`, '4 the score averaged');
hasNot('By myself', '4 what she would have done by herself is not said again');
has('Since “shift-report-march.xlsx”', '4 compared with March');
hasNot('are not compared', '4 like with like');
ok(asks.length === 0, `4 no request was sent (${asks.length})`);

/* ---- 5 · what was told, and added to ---- */
await read(await say('What have I told you?'));
has(`About “shift-report-april.xlsx” you have told me (first on ${today}, about “shift-report-march.xlsx”): “Standing” read as time lost;`, '5 the reading in words');
await read(await say('“Charge” is money'));
has('“Charge” read as money', '5 added to on April');
has('“Standing” read as time lost', '5 what stood still stands');
ok(asks.length === 0, `5 no request was sent (${asks.length})`);

/* ---- 6 · forget ---- */
await read(await say('Forget what I told you'));
has('Forgotten — what you told me about this report is put away and will not be used again.', '6 put away');
has(`I have taken “Packs” as the figure that matters: ${n0(m.unaided.packs)} over ${m.rows} rows`, '6 the unaided look back, by the generator’s unaided figure');
hasNot('Read the way you told me', '6 nothing is applied');
ok(asks.length === 0, `6 no request was sent (${asks.length})`);

/* ---- 7 · after that, the next month is read from nothing ---- */
await fresh();
m = E.may;
await read(await attach(F('may')));
has(`I have taken “Packs” as the figure that matters: ${n0(m.unaided.packs)} over ${m.rows} rows`, '7 May is read from nothing');
hasNot('Read the way you told me', '7 a forgotten reading is never applied');
ok(asks.length === 0, `7 no request was sent (${asks.length})`);

/* ---- 8 · said another way it goes to Luna ---- */
await say('The trial runs should not count, and the score is out of a hundred so adding it means nothing — can you sort that out and tell me which line stands the most?');
ok(asks.length === 1, `8 said another way it goes to Luna — one request (${asks.length})`);
const sent = JSON.stringify(asks[0] ?? {});
ok(sent.includes('I have taken “Packs” as the figure that matters'), '8 she is sent the look');
ok(!sent.includes('"Trial","Production"') && !/\b20\d{3},\d{2},\d{2,3},[4-7]\b/.test(sent), '8 and never the workbook’s cells');

/* ---- 9 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
const off = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(off <= 1, `9 nothing off the side on a phone (${off}px)`);
const small = await page.evaluate(() => [...document.querySelectorAll('.ai-sug')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 44).length);
ok(small === 0, `9 every offered follow-up is a thumb’s height (${small} smaller)`);

await t.finish('the reading: told once, kept for that customer’s report, used again');
