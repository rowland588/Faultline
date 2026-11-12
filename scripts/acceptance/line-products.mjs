/* ACCEPTANCE — LINE CAPACITY: THE PRODUCTS OF A LINE ON ONE CAPACITY (knowledge/specs/FC-034-products-on-a-line.md — Rowland, 5 November: "I've opened up capacity one time and I can do everything within there ... 1.25 kg, 1.75 kg, 2 kg ... swiping left").
   filler 120, bagger 100, sealer 90, wrapper 50 typed once; 1.25 kg held by the wrapper at 50; ＋ Another product 1.75 kg with the sealer at 36 and 2 kg at 30 — each its own bottleneck; All products; a labeller added to the line reaching every product; the paper; the phone and a swipe. */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true, hasTouch: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const SID = sd.lineStandardId;
const CAP = `#/w/${sd.wsId}/standards/${SID}?at=balance`;
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2400); };
const m = (id, rate) => ({ id, kind: 'machine', name: id, rate, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew: 1 });
const BASEC = { targetPerMin: 60, stations: [m('filler', 120), m('bagger', 100), m('sealer', 90), m('wrapper', 50)] };
await page.evaluate(async ([id, c]) => { const db = await import('/src/db.ts'); const s = await db.getStandard(id); await db.putStandard({ ...s, capacity: c }); }, [SID, BASEC]);
const rows = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const C = await import('/src/tools/linebalance/capacity.ts');
  const s = await db.getStandard(id); const r = C.productRows(s.capacity, s.product ?? 'Base');
  return { rows: r?.map(x => ({ name: x.name, line: x.r.line, held: x.r.limit?.station.name, says: x.says })), n: (s.capacity.whatIfs ?? []).filter(w => w.product).length, stations: s.capacity.stations.length,
    inEvery: (s.capacity.whatIfs ?? []).filter(w => w.product).map(w => C.whatIfCapacity(s.capacity, w).stations.some(q => q.name === 'labeller')) };
}, SID);
await go(CAP);
ok(await page.getByRole('button', { name: /Another product/ }).count() === 1, '1 the tabs offer ＋ Another product beside ＋ What if');
ok((await rows()).rows === undefined, '1b a line with no products has none (it reads as it always did)');

const setSpeed = async (stationName, v) => {
  const card = page.locator('.cap-st').filter({ has: page.locator(`input[aria-label$="name"]`).filter({ hasText: '' }) }).nth(['filler', 'bagger', 'sealer', 'wrapper', 'labeller'].indexOf(stationName));
  await card.getByRole('button', { name: 'Edit', exact: true }).click(); await page.waitForTimeout(400);
  const box = card.getByLabel('Speed', { exact: true }); await box.fill(String(v)); await box.blur(); await page.waitForTimeout(800);
  await card.getByRole('button', { name: 'Done', exact: true }).click().catch(() => {}); await page.waitForTimeout(300);
};
// product 1.75 kg
await page.getByRole('button', { name: /Another product/ }).click(); await page.waitForTimeout(700);
const nameBox = page.getByLabel('Name of this product'); await nameBox.fill('1.75 kg'); await nameBox.blur(); await page.waitForTimeout(600);
await setSpeed('sealer', 36);
// product 2 kg
await page.getByRole('button', { name: /Another product/ }).click(); await page.waitForTimeout(700);
const nb2 = page.getByLabel('Name of this product'); await nb2.fill('2 kg'); await nb2.blur(); await page.waitForTimeout(600);
await setSpeed('sealer', 30);
let a = await rows();
ok(a.n === 2 && a.rows.length === 3, `2 two products made through the page: ${a.rows?.map(x => `${x.name} ${x.line} (${x.held})`).join(' · ')}`);
ok(a.rows[1].line === 36 && a.rows[1].held === 'sealer' && a.rows[2].line === 30 && a.rows[2].held === 'sealer' && a.rows[0].line === 50 && a.rows[0].held === 'wrapper', '2b the hand-worked rates and bottlenecks: 50 wrapper · 36 sealer · 30 sealer');
const card = ((await page.locator('.cap-products').innerText()).replace(/\s+/g, ' '));
ok(a.rows.every(x => card.includes(x.name) && card.includes(x.says.replace(/\s+/g, ' '))), '3 All products: a row each with the module’s words — ' + card.slice(0, 160));
ok(/held by sealer/.test(card) && /short of/.test(card), '3b held by and short of, in words');

// a product's tab shows its own sentence
await page.getByRole('tab', { name: '1.75 kg' }).click(); await page.waitForTimeout(500);
const says = ((await page.locator('.cap-says').first().innerText()).replace(/\s+/g, ' '));
ok(/36/.test(says) && /sealer/.test(says), '4 the 1.75 kg tab says its own bottleneck: ' + says.slice(0, 120));
ok(await page.getByText(/Make it so/).count() === 0, '4b no "Make it so" on a product (that is for a what-if)');

// a station added to the line reaches every product
await page.getByRole('tab', { name: /Maris|As run|Line standard|Product/ }).first().click().catch(() => {});
await page.waitForTimeout(400);
await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/tools/linebalance/capacity.ts'); const s = await db.getStandard(id);
  const stations = [...s.capacity.stations.slice(0, 3), { id: 'lab', kind: 'machine', name: 'labeller', rate: 45, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew: 1 }, s.capacity.stations[3]];
  await db.putStandard({ ...s, capacity: C.syncWhatIfs(s.capacity, { ...s.capacity, stations }) }); }, SID);
a = await rows();
ok(a.inEvery.length === 2 && a.inEvery.every(Boolean) && a.rows[0].line === 45 && a.rows[0].held === 'labeller', `5 the labeller added to the line is in every product; it now holds the first at ${a.rows[0].line}`);

// the paper
await go(CAP);
const dir = mkdtempSync(join(tmpdir(), 'prd-'));
try { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, /^Line capacity — /)]); const f = join(dir, 'cap.pdf'); await d.saveAs(f);
  const txt = execFileSync('pdftotext', ['-layout', f, '-']).toString().replace(/\s+/g, ' ');
  const pages = execFileSync('pdfinfo', [f]).toString().match(/Pages:\s+(\d+)/)?.[1];
  console.log('   paper:', txt.match(/Products on this line.{0,260}/i)?.[0]);
  ok(/Products on this line/i.test(txt) && /1\.75 kg: /.test(txt) && /2 kg: /.test(txt), `6 the paper carries Products on this line (${pages} pages)`);
  /* EACH PRODUCT A PAGE OF ITS OWN, as its tab shows it (10 November — Rowland: "each page to have its own line drawing and explanation, so
     what each station can do, then with the commentary … identical" to the screen): its name, its sentence, its line drawn and its bars,
     on one page — never a drawing here and its bars somewhere else */
  const byPage = execFileSync('pdftotext', ['-layout', f, '-']).toString().split('\f').map(t => t.replace(/\s+/g, ' '));
  for (const nm of ['1.75 kg', '2 kg']) {
    const row = a.rows.find(x => x.name === nm);
    const pg = byPage.findIndex(t => new RegExp(`^\\s*${nm.replace('.', '\\.')} `).test(t.replace(/^.*?(?:LUNAR|LUNA|Faultline)\s*/, '')));
    const t = pg >= 0 ? byPage[pg] : '';
    ok(pg > 0 && /the line, drawn/i.test(t) && /what each station can do/i.test(t) && (!row || t.includes(row.says.replace(/\s+/g, ' '))), `6c ${nm} on a page of its own (page ${pg + 1}): its sentence, its line drawn and what each station can do together`);
  }
  ok(a.rows.every(x => txt.includes(x.says.replace(/\s+/g, ' '))), '6b the paper says each row as the card does');
} catch (e) { ok(false, '6 the paper: ' + e.message); }

// the phone and a swipe
await page.setViewportSize({ width: 375, height: 800 }); await go(CAP);
await page.getByRole('button', { name: /Show the workings/ }).first().click().catch(() => {}); await page.waitForTimeout(500);
const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const tabsOk = await page.getByRole('tab').count() >= 3;
const before = await page.locator('.cap-tabs [aria-selected="true"]').first().innerText();
await page.evaluate(() => {
  const el = document.querySelector('.cap-tabs'); const wrap = el?.closest('.cap') ?? el?.parentElement ?? document.body;
  const mk = (type, x, y) => new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: wrap, clientX: x, clientY: y })], changedTouches: [new Touch({ identifier: 1, target: wrap, clientX: x, clientY: y })] });
  wrap.dispatchEvent(mk('touchstart', 300, 400)); wrap.dispatchEvent(mk('touchend', 120, 405));
});
await page.waitForTimeout(600);
const after = await page.locator('.cap-tabs [aria-selected="true"]').first().innerText();
ok(!over && tabsOk, '7 the phone: tabs reachable, nothing off the side');
ok(before !== after, `7b a swipe left moves to the next product (“${before.trim()}” → “${after.trim()}”)`);
ok(errors.length === 0, `8 no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
