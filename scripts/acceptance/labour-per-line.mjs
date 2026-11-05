/* ACCEPTANCE — LINE CAPACITY: PEOPLE AND RATE FOR EACH LINE (knowledge/specs/FC-034-labour-per-line.md — Rowland, 5 November: "Capacity is confusing when doing more than 1 line ... rate shown independently, they could be different").
   Two lines (2a 40 a minute, 2b 30) merging at a wrapper (100): an old record counted together, then Count each line separately; 2a 3 people at £14, 2b 2 at £12, the wrapper 1 at £14 — 6 people, £80 an hour, 1.9p a unit; 2b's rate changed moving only 2b; the paper; the phone. */
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
const st = (id, lane, rate) => ({ id, ...(lane ? { lane } : {}), kind: 'machine', name: id, rate, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew: 1 });
const OLD = { targetPerMin: 60, labour: { people: 5, ratePerHour: 13 },
  lanes: [{ id: 'a', name: '2a' }, { id: 'b', name: '2b' }],
  stations: [st('f2a', 'a', 40), st('f2b', 'b', 30), st('wrapper', undefined, 100)] };
const put = cap => page.evaluate(async ([id, c]) => { const db = await import('/src/db.ts'); const s = await db.getStandard(id); await db.putStandard({ ...s, capacity: c }); }, [SID, cap]);
const cap = () => page.evaluate(async id => (await import('/src/db.ts')).getStandard(id).then(s => s.capacity), SID);
const says = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const C = await import('/src/tools/linebalance/capacity.ts');
  const c = (await db.getStandard(id)).capacity; const li = C.labourInputs(c, undefined); const r = C.analyse(c);
  const k = C.labourCost(r, li.people, li.rate);
  return { people: li.people, perHour: k?.perHour, perPack: k?.perPack, parts: C.labourPartsSays(li, r), byLine: C.labourByLine(c) };
}, SID);
const box = (name, label) => page.getByRole('group', { name: `Labour for ${name}` }).getByLabel(label);
const fill = async (loc, v) => { await loc.fill(String(v)); await loc.blur(); await page.waitForTimeout(700); };

await put(OLD); await go(CAP);
const costBox = page.locator('.cap-cost');
ok(/people on the line — all of them/i.test(await costBox.innerText()) && await page.getByRole('button', { name: 'Count each line separately' }).count() === 1, '1 an old record with two lines keeps its single count, and offers "Count each line separately"');
ok((await says()).people === 5 && !(await says()).byLine, '1b its labour reads as before: 5 people');

await page.getByRole('button', { name: 'Count each line separately' }).click(); await page.waitForTimeout(800);
ok(await page.getByRole('group', { name: /^Labour for / }).count() === 3, '2 a block for 2a, 2b and the part after the lines merge');
await fill(box('2a', /People on 2a/), 3); await fill(box('2a', /Pounds an hour each on 2a/), 14);
await fill(box('2b', /People on 2b/), 2); await fill(box('2b', /Pounds an hour each on 2b/), 12);
await fill(box('After the lines merge', /People on After the lines merge/), 1); await fill(box('After the lines merge', /Pounds an hour each on After the lines merge/), 14);
let m = await says();
ok(m.people === 6 && Math.abs(m.perHour - 80) < 1e-9 && Math.abs(m.perPack - 80 / 4200) < 1e-9, `3 6 people, £80 an hour, ${(m.perPack * 100).toFixed(2)}p a unit = £80 ÷ 4,200 (the hand-worked case)`);
const text = (await costBox.innerText()).replace(/\s+/g, ' ');
ok(m.parts.every(t => text.includes(t)) && /1\.75p a unit/.test(text) && /1\.33p a unit/.test(text), '4 the page says each line as the module says it (1.75p on 2a, 1.33p on 2b)');
ok(/1\.9p a unit/.test(text), '4b and the whole: 1.9p a unit');

await fill(box('2b', /Pounds an hour each on 2b/), 20); m = await says();
const t2 = (await costBox.innerText()).replace(/\s+/g, ' ');
ok(Math.abs(m.perHour - 96) < 1e-9 && /2a: 3 people × £14\.00 = £42\.00/.test(t2) && /2b: 2 people × £20\.00 = £40\.00/.test(t2), '5 2b at £20 moves only 2b (£40) and the total (£96) — 2a still £42');
const c = await cap();
ok(c.lanes[1].labour.ratePerHour === 20 && c.lanes[0].labour.ratePerHour === 14 && c.labourShared.people === 1, '5b kept on each lane and the shared part, not copied');
await go(CAP);
ok((await says()).perHour === 96 && await page.getByRole('group', { name: /^Labour for / }).count() === 3, '6 kept after a reload');

// the paper
const dir = mkdtempSync(join(tmpdir(), 'lpl-'));
let paperOk = false;
try { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, /^Line capacity — /)]); const f = join(dir, 'cap.pdf'); await d.saveAs(f);
  const txt = execFileSync('pdftotext', ['-layout', f, '-']).toString().replace(/\s+/g, ' ');
  paperOk = /2a: 3 people/.test(txt) && /2b: 2 people/.test(txt) && /After the lines merge: 1 person/.test(txt); } catch { /* fall through */ }
ok(paperOk, '7 the paper carries each line’s people, rate and £ an hour');

// the phone
await page.setViewportSize({ width: 375, height: 800 }); await go(CAP);
await page.getByRole('button', { name: /Show the workings/ }).first().click().catch(() => {}); await page.waitForTimeout(600);
const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const tiny = await page.locator('.cap-cost-part input').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 40).length);
ok(!over && tiny === 0, `8 the phone: nothing off the side, boxes at least 40 px (${tiny} short)`);

await page.setViewportSize({ width: 1360, height: 900 }); await go(CAP);
await page.getByRole('button', { name: 'Count all the lines together again' }).click(); await page.waitForTimeout(800);
ok(!(await says()).byLine && /all of them/i.test(await costBox.innerText()), '9 Count all the lines together again goes back to one count');
ok(errors.length === 0, `10 no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
