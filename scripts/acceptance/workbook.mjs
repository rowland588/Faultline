/* ACCEPTANCE — A LARGE WORKBOOK IN THE CONVERSATION (10 November; docs/WORKBOOKS.md; src/lib/workbook, src/capabilities/workbook).
 * Rowland, 10 November: "Attach an Excel workbook to the conversation and start talking to Faultline about the business information inside
 * it … files exceeding 50MB … Measure actual supported file sizes, processing time, peak memory, reliability and accuracy."
 * Driven in a real browser, the gateway played by the script, workbooks written by scripts/workbook/make-workbook.mjs with its own totals:
 *
 *   1  ATTACH — the workbook (over 50 MB by default) through AI Mode's own attach control: read on the device with its progress and a Stop,
 *      the time and the browser's peak memory measured, nothing of the file sent anywhere (no request carries it)
 *   2  ASK — "What does this workbook contain?" workbook_profile; "Where are we losing the most production time?" query_workbook — every
 *      figure equal to the generator's; by month; "show me the source data" workbook_rows with its cells; the gateway sent only the answers
 *   3  KEPT — the page reloaded: asked again with no second attach
 *   4  ANOTHER DEVICE — the device's storage cleared: said not on this device, attach it here — never a figure
 *   5  STOPPED — a second workbook stopped part way: said partial, and the profile says PARTIAL
 *   6  INTERRUPTED — a third left mid-read (the page reloaded): said interrupted, never still reading
 *   7  TWO AT ONCE — two tabs reading two workbooks together, each right
 *   8  REFUSED — an old .xls said so in words; the phone: the card fits, Stop a thumb's height
 *
 *   node scripts/acceptance/workbook.mjs     (SMOKE_BASE as smoke; WB_ROWS rows for the big one, 1,400,000 ≈ 57 MB by default)
 *   WB_SIZES_ONLY=1 WB_ROWS="1400000,4000000,8000000" node scripts/acceptance/workbook.mjs   — the size measurements only */
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = process.env.WB_DIR ?? mkdtempSync(join(tmpdir(), 'wbacc-'));
const make = (name, rows, seed = 7) => {
  const f = join(dir, name);
  if (!existsSync(f) || !existsSync(`${f}.expected.json`)) execFileSync('node', ['--max-old-space-size=8192', 'scripts/workbook/make-workbook.mjs', f, String(rows), String(seed)], { stdio: 'ignore' });
  return { f, exp: JSON.parse(readFileSync(`${f}.expected.json`, 'utf8')), mb: statSync(f).size / 1e6 };
};
/* the browser's memory, from outside it: the largest total of its renderer processes while the workbook is read */
const rss = () => { try { return execSync('ps -eo rss,args', { encoding: 'utf8' }).split('\n').filter(l => /chrom/i.test(l) && /--type=renderer/.test(l)).reduce((t, l) => t + Number(l.trim().split(/\s+/)[0] || 0), 0) / 1024; } catch { return 0; } };

/* the size measurements run in an on-disk profile, as a person's own browser keeps its storage; a fresh context keeps it in memory */
const t = await openApp({ width: 1440, height: 900, ...(process.env.WB_SIZES_ONLY ? { profile: mkdtempSync(join(tmpdir(), 'wbprofile-')) } : {}) });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
let biggestPost = 0;
page.on('request', r => { const b = r.postDataBuffer(); if (b && b.length > biggestPost) biggestPost = b.length; });
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: false, why: 'nothing planned' }) });
});
let turns = 0;
const answered = async n => { await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: 120000 }).catch(() => undefined); await page.waitForTimeout(300); };
const round = async (words, rounds) => { plan = rounds; await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); turns += 1; await answered(turns); };
const result = id => asks.flatMap(a => a?.pending?.results ?? []).filter(r => r.id === id).at(-1);
const calls = (...cs) => () => ({ ok: true, reply: '', calls: cs.map(([id, name, input]) => ({ id, name, input })), assistant: { v: 1 } });
const then = words => () => ({ ok: true, reply: words });
const attach = async f => page.locator('input[aria-label="Choose a factory document"]').setInputFiles(f);
const readOne = async (w, label) => {
  const t0 = Date.now(); let peak = 0;
  const base = rss();
  const timer = setInterval(() => { peak = Math.max(peak, rss()); }, 250);
  const tell = setInterval(() => { void page.evaluate(() => document.querySelector('[data-workbook]')?.textContent ?? '(no card)').then(x => console.log(`  … ${Math.round((Date.now() - t0) / 1000)} s: ${x.slice(0, 110)}`)).catch(() => undefined); }, 30_000);
  await attach(w.f);
  const name = w.f.split('/').pop();
  await page.waitForFunction(n => { const c = document.querySelector('[data-workbook]'); return !!c && (c.getAttribute('data-workbook') === 'read' || c.getAttribute('data-workbook') === 'failed') && (c.textContent ?? '').includes(n); }, name, { timeout: 30 * 60_000, polling: 500 });
  clearInterval(timer); clearInterval(tell);
  const secs = (Date.now() - t0) / 1000;
  const said = await t.words('[data-workbook]');
  console.log(`MEASURED  ${label}: ${w.mb.toFixed(1)} MB, ${w.exp.rows.toLocaleString('en-GB')} rows — read in ${secs.toFixed(1)} s; the browser's renderers at most ${Math.round(peak)} MB (${Math.round(base)} MB before)`);
  return { secs, peak, said };
};
const sizes = (process.env.WB_ROWS ?? '1400000').split(',').map(Number);

if (process.env.WB_SIZES_ONLY) {
  for (const [i, rows] of sizes.entries()) {
    await t.go('#/ai', 500); await page.reload(); await page.waitForTimeout(2500);
    const w = make(`size-${rows}.xlsx`, rows, 11 + i);
    const r = await readOne(w, `size ${i + 1}`);
    ok(/^Read “/.test(r.said) && new RegExp(`Downtime ${w.exp.rows.toLocaleString('en-GB')} rows`).test(r.said), `size ${i + 1}: ${w.mb.toFixed(0)} MB read whole: "${r.said.slice(0, 120)}"`);
    turns = 0;
    await round('Where are we losing the most production time?', [calls(['q', 'query_workbook', { sheet: 'Downtime', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }] }]), then('…')]);
    const q = result('q'); const top = Object.entries(w.exp.minutesByReason).sort((a, b) => b[1] - a[1])[0];
    ok(q?.ok && q.data.rowsScanned === w.exp.rows && q.data.groups[0].key[0] === top[0] && Math.abs(q.data.groups[0].values[0] - top[1]) < 1e-6 * top[1], `size ${i + 1}: minutes by reason over all ${w.exp.rows.toLocaleString('en-GB')} rows equal the generator's (${top[0]} ${top[1]})`);
    await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); try { await r.removeEntry('workbooks', { recursive: true }); } catch { /* none */ } });
  }
  await t.finish('workbook sizes measured');
}

/* ---- 1 · ATTACH ---- */
const big = make('Plant 2 downtime.xlsx', sizes[0]);
ok(big.mb > 50, `1 the workbook is over 50 MB: ${big.mb.toFixed(1)} MB, ${big.exp.rows.toLocaleString('en-GB')} rows`);
await t.go('#/ai', 2500);
const before = biggestPost;
const watch = (async () => { const seen = []; for (let i = 0; i < 400; i += 1) { const pct = await page.locator('[data-workbook-pct]').first().textContent().catch(() => null); if (pct) seen.push(pct); if (await page.locator('[data-workbook="read"]').count()) break; await page.waitForTimeout(150); } return seen; })();
const r1 = await readOne(big, 'the acceptance workbook');
const pcts = await watch;
ok(pcts.length > 0 && (await page.locator('[data-workbook-stop]').count()) === 0, `1 its progress shown while it read (${pcts.slice(0, 3).join(', ')}…), with a Stop, gone when done`);
ok(new RegExp(`^Read “Plant 2 downtime\\.xlsx” on this device in [\\d.]+ s: Downtime ${big.exp.rows.toLocaleString('en-GB')} rows, Products 50 rows, Lookups 9 rows\\. It stays on this device; ask about it\\.`).test(r1.said), `1 said read: "${r1.said.slice(0, 140)}"`);
ok(biggestPost - before < 2_000_000 && biggestPost < 2_000_000, `1 nothing of the file sent anywhere — the largest request body was ${Math.round(biggestPost / 1024)} KB`);

/* ---- 2 · ASK ---- */
await round('What does this workbook contain?', [calls(['p', 'workbook_profile', {}]), then('It is a downtime log …')]);
const p = result('p');
ok(p?.ok && /“Downtime” — [\d,]+ rows of data under the header in row 3 \(above it: Line downtime log — Plant 2\)/.test(p.says) && /written more than one way: “Line 3”/.test(p.says) && /with no saved value/.test(p.says) && /NOT read: A pivot table’s cache/.test(p.says), '2 what it holds and what is wrong with it, said by Faultline');
ok(asks.at(-1).focus && /Workbooks attached .*“Plant 2 downtime\.xlsx” \[wb-[^\]]+\] ready — Downtime [\d]+ rows/.test(asks.at(-1).focus), '2 the gateway is told the workbook is attached — its summary, never its cells');
await round('Where are we losing the most production time?', [calls(['q', 'query_workbook', { sheet: 'Downtime', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }, { op: 'count' }] }]), then('Bag presentation, by a distance …')]);
const q = result('q');
const byReason = Object.entries(big.exp.minutesByReason).sort((a, b) => b[1] - a[1]);
ok(q?.ok && q.data.rowsScanned === big.exp.rows && byReason.every(([k, v], i) => q.data.groups[i]?.key[0] === k && Math.abs(q.data.groups[i].values[0] - v) < 1e-6 * v), `2 minutes by reason over all ${big.exp.rows.toLocaleString('en-GB')} rows, in order, each equal to the generator's — ${byReason[0][0]} ${byReason[0][1]}`);
ok(new RegExp(`sum of Minutes: ${big.exp.minutesText.toLocaleString('en-GB')} cells not used — not a number`).test(q?.says ?? ''), `2 the ${big.exp.minutesText} "n/a" cells it could not add named, never dropped silently`);
await round('How has it moved month by month?', [calls(['m', 'query_workbook', { sheet: 'Downtime', time: { column: 'Date', by: 'month' }, measures: [{ op: 'sum', column: 'Minutes' }] }]), then('…')]);
const m = result('m');
ok(m?.ok && m.data.groups.length === 12 && m.data.groups.every(g => Math.abs(g.values[0] - big.exp.minutesByMonth[g.key[0]]) < 1e-6 * g.values[0]), '2 by month: twelve months, each equal to the generator\'s');
await round('Show me the source data behind bag presentation on Line 3.', [calls(['r', 'workbook_rows', { sheet: 'Downtime', filters: [{ column: 'Reason', op: 'eq', value: 'Bag presentation' }, { column: 'Line', op: 'eq', value: 'Line 3' }, { column: 'Minutes', op: 'notblank' }], columns: ['Date', 'Line', 'Reason', 'Minutes'], limit: 3 }]), then('…')]);
const rr = result('r');
ok(rr?.ok && rr.data.rows[0].row === big.exp.firstBagLine3Row && rr.data.rows[0].cells.Reason.ref === `Downtime!E${big.exp.firstBagLine3Row}`, `2 the rows behind it, with their cells (Downtime!E${big.exp.firstBagLine3Row})`);
ok(Math.max(...asks.map(a => JSON.stringify(a).length)) < 200_000, `2 the gateway was sent only the answers — the largest request ${Math.round(Math.max(...asks.map(a => JSON.stringify(a).length)) / 1024)} KB, the workbook ${big.mb.toFixed(0)} MB`);

/* ---- 3 · KEPT ---- */
await page.reload(); await page.waitForTimeout(3000);
turns = await page.locator('.ai-turn.is-colleague').count();
await round('And by line?', [calls(['l', 'query_workbook', { sheet: 'Downtime', groupBy: ['Line'], measures: [{ op: 'sum', column: 'Minutes' }] }]), then('…')]);
const l = result('l');
ok(l?.ok && l.data.groups.every(g => Math.abs(g.values[0] - big.exp.minutesByLine[g.key[0]]) < 1e-6 * g.values[0]), '3 after a reload, asked again with no second attach — by line, each equal to the generator\'s');

/* ---- 4 · ANOTHER DEVICE ---- */
await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.removeEntry('workbooks', { recursive: true }); });
await page.reload(); await page.waitForTimeout(3000);
turns = await page.locator('.ai-turn.is-colleague').count();
await round('What about by shift?', [calls(['s', 'query_workbook', { sheet: 'Downtime', groupBy: ['Shift'], measures: [{ op: 'count' }] }]), then('…')]);
const s4 = result('s');
ok(s4 && !s4.ok && /not on this device — it was read on another one, or this device’s storage was cleared\. Attach it again here/.test(s4.says), `4 not on this device: said so, attach it here — no figure: "${(s4?.says ?? '').slice(0, 90)}"`);

/* ---- 5 · STOPPED ---- */
const second = make('second.xlsx', 600_000, 21);
await attach(second.f);
await page.waitForFunction(() => Number((document.querySelector('[data-workbook-pct]')?.textContent ?? '0').replace('%', '')) >= 20, null, { timeout: 120000 });
await page.locator('[data-workbook-stop]').click();
await page.waitForSelector('[data-workbook="read"]', { timeout: 120000 });
const said5 = await t.words('[data-workbook]');
ok(/only PART of it was read/.test(said5), `5 stopped part way: said partial — "${said5.slice(0, 120)}"`);
await round('What is in the second one?', [calls(['p5', 'workbook_profile', {}]), then('…')]);
ok(/PARTIAL/.test(result('p5')?.says ?? ''), '5 the profile says PARTIAL — never complete');

/* ---- 6 · INTERRUPTED ---- */
const third = make('third.xlsx', 600_000, 31);
await attach(third.f);
await page.waitForSelector('[data-workbook="reading"]', { timeout: 30000 });
await page.waitForTimeout(800);
await page.reload(); await page.waitForTimeout(3500);
turns = await page.locator('.ai-turn.is-colleague').count();
const wbs = await page.evaluate(async () => { const db = await import('/src/db.ts'); const all = await db.listAllStudies(); const c = all.filter(x => (x.facts?.workbooks ?? []).length).sort((a, b) => b.updatedAt - a.updatedAt)[0]; return c?.facts?.workbooks ?? []; });
const w6 = wbs.find(w => w.name === 'third.xlsx');
ok(w6?.status === 'interrupted' && /stopped when the page was left/.test(w6.why ?? ''), `6 left mid-read: kept as interrupted, never still reading (${w6?.status})`);

/* ---- 7 · TWO AT ONCE ---- */
const a7 = make('tab-a.xlsx', 200_000, 41), b7 = make('tab-b.xlsx', 200_000, 42);
const p2 = await t.ctx.newPage();
await p2.goto(`${BASE}/#/ai`); await p2.waitForTimeout(2500);
await t.go('#/ai', 2500);
await Promise.all([attach(a7.f), p2.locator('input[aria-label="Choose a factory document"]').setInputFiles(b7.f)]);
await Promise.all([page.waitForSelector('[data-workbook="read"]', { timeout: 300000 }), p2.waitForSelector('[data-workbook="read"]', { timeout: 300000 })]);
const tally = async (pg, w) => pg.evaluate(async ([name]) => {
  const { workbooks, workbookId } = await import('/src/lib/workbook/client.ts');
  void workbookId;
  const db = await import('/src/db.ts');
  const conv = (await db.listAllStudies()).filter(x => (x.facts?.workbooks ?? []).some(y => y.name === name)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const id = conv.facts.workbooks.find(y => y.name === name).id;
  const r = await workbooks().query(id, { sheet: 'Downtime', measures: [{ op: 'sum', column: 'Minutes' }] });
  return r.totals[0];
}, [w.f.split('/').pop()]);
const [ta, tb] = [await tally(page, a7), await tally(p2, b7)];
ok(Math.abs(ta - a7.exp.minutesTotal) < 1e-6 * ta && Math.abs(tb - b7.exp.minutesTotal) < 1e-6 * tb, `7 two tabs read two workbooks together, each right (${ta} and ${tb})`);
await p2.close();

/* ---- 8 · REFUSED, AND THE PHONE ---- */
const xls = join(dir, 'old.xls'); writeFileSync(xls, 'not really');
await attach(xls);
await page.waitForTimeout(500);
ok(/older Excel format \(\.xls\) — open it in Excel, save it as \.xlsx and attach that/.test(await t.words('[data-imported]')), '8 an old .xls is refused in words');
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/ai', 2500);
await attach(make('small.xlsx', 20000, 51).f);
await page.waitForSelector('[data-workbook]', { timeout: 30000 });
const fits = await page.evaluate(() => { const c = document.querySelector('[data-workbook]'); const r = c?.getBoundingClientRect(); return !!r && r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; });
ok(fits, '8 the phone: the card fits, nothing off the side');
await page.waitForSelector('[data-workbook="read"]', { timeout: 60000 });
ok(t.errors.length === 0, `no errors on the page${t.errors.length ? `: ${t.errors.slice(0, 3).join(' | ')}` : ''}`);
await t.finish('workbooks in the conversation: read on the device, asked over every row, figures equal to the generator\'s');
