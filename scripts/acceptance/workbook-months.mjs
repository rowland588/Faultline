/* SEVERAL MONTHS AT ONCE (20 November, docs/CONNECTED-LUNA.md — a manager keeps a file a month and picks them together), driven in the
 * real page on scripts/workbook/make-reading-workbooks.mjs — three months of a made-up site's shift report, each with its truth — the
 * gateway played by the script and EVERY request to it counted:
 *   1  CHOSEN TOGETHER  May, March and April chosen in one go through Luna's attach control, out of order — each read on the device,
 *                       then their first looks said in the order of their OWN dates: March, April, May — each by the generator's
 *                       figures; April's says what changed since March, May's since April (like with like); March's compares with
 *                       nothing; a closing line says the order and why; the strip says three of three were read; NO request;
 *   2  THE REGISTER     each one in the register once, by its own name;
 *   3  ONE BAD FILE     two good months and a file that is not a workbook chosen together: the two read and looked at in order, the
 *                       bad one said in words, nothing sent;
 *   4  THE PHONE        nothing off the side. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'wbm-'));
execFileSync('node', ['scripts/workbook/make-reading-workbooks.mjs', dir], { stdio: 'ignore' });
const F = m => join(dir, `shift-report-${m}.xlsx`);
const E = Object.fromEntries(['march', 'april', 'may'].map(m => [m, JSON.parse(readFileSync(join(dir, `shift-report-${m}.truth.json`), 'utf8'))]));
const n0 = v => Math.round(v).toLocaleString('en-GB');

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
const CODE = '.ai-turn.is-colleague [data-ai-code]';
/** Choose files together; wait for `n` turns said by the app; return the texts of the turns said since. */
const choose = async (files, n) => {
  const before = await page.locator('.ai-turn.is-colleague').count();
  const codeBefore = await page.locator(CODE).count();
  await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(files);
  await page.waitForFunction(([sel, k]) => document.querySelectorAll(sel).length >= k, [CODE, codeBefore + n], { timeout: 120000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  const all = await page.locator('.ai-turn.is-colleague').allInnerTexts();
  return all.slice(before).map(x => t.norm(x));
};

/* ---- 1 · chosen together, out of order ---- */
let said = await choose([F('may'), F('march'), F('april')], 4);
ok(said.length >= 4, `1 three first looks and a closing line said by the app (${said.length} turns)`);
const looks = said.filter(x => /has \d+ sheets?|The one worth analysing|I have taken/.test(x));
const nameIn = x => (/shift-report-(march|april|may)\.xlsx/.exec(x) ?? [])[1];
ok(looks.map(nameIn).join(' ') === 'march april may', `1 the looks in the order of their own dates: ${looks.map(nameIn).join(', ')}`);
for (const [i, m] of ['march', 'april', 'may'].entries()) {
  const l = looks[i] ?? '';
  ok(l.includes(t.norm(`I have taken “Packs” as the figure that matters: ${n0(E[m].unaided.packs)} over ${E[m].rows} rows`)), `1 ${m} — the generator’s figure: ${n0(E[m].unaided.packs)} over ${E[m].rows} rows`);
}
ok(!/Since “shift-report-/.test(looks[0] ?? ''), '1 March, the first, compares with nothing');
ok((looks[1] ?? '').includes(t.norm('Since “shift-report-march.xlsx”')), '1 April says what changed since March');
ok((looks[2] ?? '').includes(t.norm('Since “shift-report-april.xlsx”')), '1 May says what changed since April');
ok(!looks.some(l => /are not compared/.test(l)), '1 like with like');
const closing = said.find(x => /in the order of their own dates/.test(x)) ?? '';
ok(/I read the 3 workbooks in the order of their own dates - “shift-report-march\.xlsx” \(from [^)]+\), then “shift-report-april\.xlsx” \(from [^)]+\), then “shift-report-may\.xlsx”/.test(closing), `1 the closing line says the order: “${closing.slice(0, 220)}”`);
const strip = t.norm(await page.locator('[data-workbook-said]').innerText().catch(() => ''));
ok(/Read 3 of 3 workbooks on this device/.test(strip) && /in the order of their own dates/.test(strip), `1 the strip: “${strip}”`);
ok(asks.length === 0, `1 NOTHING was sent to the AI service (${asks.length} requests)`);

/* ---- 2 · the register ---- */
const reg = await page.evaluate(async () => {
  const { allSources } = await import('/src/capabilities/data.ts');
  return (await allSources()).map(s => s.facts.fileName).filter(n => /shift-report-/.test(n));
});
ok(['march', 'april', 'may'].every(m => reg.filter(n => n === `shift-report-${m}.xlsx`).length === 1), `2 each month in the register once: ${reg.join(', ')}`);

/* ---- 3 · one that is not a workbook ---- */
const bad = join(dir, 'June shift report.xlsx');
writeFileSync(bad, 'this is not a workbook, only words saved with the wrong name');
await page.getByRole('button', { name: /New (chat|conversation)/ }).filter({ visible: true }).first().click().catch(async () => {
  await page.locator('.ai-head-acts').getByRole('button', { name: /^More/ }).click(); await page.getByRole('menuitem', { name: /New conversation/ }).first().click();
});
await page.waitForTimeout(900);
said = await choose([bad, F('april'), join(dir, 'strip-shift-report-march.xlsx')], 3);
const closing3 = said.find(x => /could not be read/.test(x)) ?? '';
ok(/“June shift report\.xlsx” could not be read/.test(closing3), `3 the bad file said in words: “${closing3.slice(0, 200)}”`);
ok(/I read the 2 workbooks in the order of their own dates - “strip-shift-report-march\.xlsx”/.test(closing3), '3 the two good ones read, March first');
ok(asks.length === 0, `3 still nothing sent (${asks.length})`);

/* ---- 4 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `4 nothing off the side at 390 (${wide}px)`);

await t.finish('workbook-months');
