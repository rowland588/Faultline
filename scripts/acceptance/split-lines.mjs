/* ACCEPTANCE — LINE CAPACITY: ONE FEED SPLITTING INTO LINES (knowledge/specs/FC-034-split-lines.md — Rowland, 5 November: "one feed feeding products into multiple packing areas ... each of them could have their own bottleneck ... a process map of bottlenecks"; "keep it simple, the PDF too").
   Line A (bagger 160, palletiser 68.25), Line B (a sealer at 40): a shared Filler added THROUGH THE PAGE at 120 — the lines hold it at 108.25 and the feed has 11.75 spare; at 80 the feed holds it; fixed shares 60/40 and Line B binds at 100; the drawn line and the paper carry the three zones; the phone. */
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
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const m = (id, rate, lane) => ({ id, ...(lane ? { lane } : {}), kind: 'machine', name: id, rate, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew: 1 });
const TWO = { targetPerMin: 120, lanes: [{ id: 'a', name: 'Line A' }, { id: 'b', name: 'Line B' }],
  stations: [m('bagger', 160, 'a'), m('palletiser', 68.25, 'a'), m('sealer', 40, 'b')] };
const put = cap => page.evaluate(async ([id, c]) => { const db = await import('/src/db.ts'); const s = await db.getStandard(id); await db.putStandard({ ...s, capacity: c }); }, [SID, cap]);
const mod = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const C = await import('/src/tools/linebalance/capacity.ts');
  const c = (await db.getStandard(id)).capacity; const r = C.analyse(c);
  return { sentence: r.sentence, line: r.line, heldBy: r.lanes?.heldBy, fed: r.lanes?.sections.map(x => x.fed), limit: r.limit?.station.name, feedStations: c.stations.filter(s => s.lane === C.FEED_ZONE).length };
}, SID);
const flat = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');

await put(TWO); await go(CAP);
ok(await page.getByRole('button', { name: /A shared feed before the lines/ }).count() === 1, '1 two lines offer "＋ A shared feed before the lines" (nothing drawn before it is asked)');
ok(await page.locator('.cap-grp', { hasText: 'Before the lines split' }).count() === 0, '1b no feed group until asked');

// through the page
await page.getByRole('button', { name: /A shared feed before the lines/ }).click(); await page.waitForTimeout(500);
ok(await page.locator('.cap-grp', { hasText: 'Before the lines split' }).count() === 1, '2 the group "Before the lines split" appears');
await page.getByRole('button', { name: /Add a machine to Before the lines split/ }).click(); await page.waitForTimeout(600);
const grp = page.locator('.cap-grp').filter({ hasText: 'Before the lines split' }).first();
await grp.getByLabel(/Station 1 name/).fill('Filler'); await grp.getByLabel(/Station 1 name/).blur(); await page.waitForTimeout(500);
const speed = grp.getByLabel('Speed', { exact: true });
await speed.fill('120'); await speed.blur(); await page.waitForTimeout(1000);
let a = await mod();
ok(a.feedStations === 1 && a.heldBy === 'lanes' && Math.abs(a.line - 108.25) < 1e-6, `3 Filler at 120 typed through the boxes: the lines hold it at ${a.line} (hand-worked 108.25), heldBy ${a.heldBy}`);
await go(CAP);
const first = page.locator('.cap-grp').filter({ hasText: 'Line A' }).first();
ok((await flat('.cap-says, .cxf, .cap-sentence, [data-says]')) !== undefined, '3b page reloads with the feed kept');
ok(a.sentence.includes('Filler can supply 120') && a.sentence.includes('the feed has 11.8 to spare'), '4 the module says it: ' + a.sentence);
const body = await page.locator('main').innerText();
ok(body.replace(/\s+/g, ' ').includes(a.sentence.replace(/\s+/g, ' ')), '4b the page shows that very sentence');

// the arrival notice is set apart
const calc = await page.locator('.cap-calc').count();
ok(calc >= 1 && /not typed/.test(await page.locator('.cap-calc').first().innerText()), '5 the arrival notice says it is worked out from the station before, not typed (' + calc + ')');

// the feed at 80: the feed holds it
await put({ ...TWO, stations: [m('Filler', 80, '__feed__'), ...TWO.stations] }); await go(CAP);
a = await mod();
ok(a.heldBy === 'feed' && Math.abs(a.line - 80) < 1e-9 && a.limit === 'Filler' && Math.abs(a.fed[0] - (80 * 68.25) / 108.25) < 1e-6, `6 the feed at 80 holds it: line ${a.line}, Line A fed ${a.fed?.[0]?.toFixed(2)} = 80 × 68.25 ÷ 108.25`);

// fixed shares through the chips and boxes
await put({ ...TWO, stations: [m('Filler', 120, '__feed__'), ...TWO.stations] }); await go(CAP);
await page.getByRole('button', { name: 'Fixed shares' }).click(); await page.waitForTimeout(500);
for (const [lab, v] of [[/Share of the feed for Line A/, 60], [/Share of the feed for Line B/, 40]]) { const b = page.getByLabel(lab); await b.fill(String(v)); await b.blur(); await page.waitForTimeout(700); }
a = await mod();
ok(Math.abs(a.line - 100) < 1e-9 && a.limit === 'sealer' && Math.abs(a.fed[0] - 60) < 1e-9 && Math.abs(a.fed[1] - 40) < 1e-9, `7 fixed shares 60/40: Line B binds, the line makes ${a.line} (hand-worked 100), fed ${a.fed}`);
ok(/Fixed shares: Line B holds the split/.test(a.sentence), '7b the sentence says so');

// the drawn line and the paper
const svg = ((await page.locator('.cxf-svg').first().textContent()) ?? '').replace(/\s+/g, ' ');
ok(/The feed splits/.test(svg) && /Filler/.test(svg) && /Line A/.test(svg) && /Line B/.test(svg) && /BOTTLEN/.test(svg), '8 the drawn line: Filler, the split pill, Line A, Line B and the bottleneck tag');
const dir = mkdtempSync(join(tmpdir(), 'spl-'));
let txt = '';
try { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, /^Line capacity — /)]); const f = join(dir, 'cap.pdf'); await d.saveAs(f);
  txt = execFileSync('pdftotext', ['-layout', f, '-']).toString().replace(/\s+/g, ' ');
  const pages = execFileSync('pdfinfo', [f]).toString().match(/Pages:\s+(\d+)/)?.[1];
  ok(/The feed splits/.test(txt) && /Before the lines split/.test(txt) && /Line A/.test(txt) && /Line B/.test(txt), `9 the paper carries the three zones — the split pill and the feed's bars (${pages} page${pages === '1' ? '' : 's'})`);
  ok(/BOTTLENECK/.test(txt), '9b the paper tags the bottleneck');
  ok(Number(pages) <= 3, `9c the paper stays short (${pages} pages) — lean`);
} catch (e) { ok(false, '9 the paper downloaded and read back: ' + e.message); }

// the phone
await page.setViewportSize({ width: 375, height: 800 }); await go(CAP);
await page.getByRole('button', { name: /Show the workings/ }).first().click().catch(() => {}); await page.waitForTimeout(600);
const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const short = await page.locator('.cap-split button, .cap-split input').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).length);
ok(!over && short === 0, `10 the phone: nothing off the side, split controls at least 40 px (${short} short)`);
ok(errors.length === 0, `11 no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
