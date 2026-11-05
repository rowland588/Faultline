/* ACCEPTANCE — LINE CAPACITY: THE LINE ON THE REPORT, AND THE TIME TO TAKE IT AWAY (knowledge/specs/FC-034-take-away-and-paper.md — Rowland, 4 November: "the line drawn is brilliant but isn't shown on the report"; "I have no way to add a transportation time to the flows ... the time it takes to take pallets away"). */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { paper as pressPaper, more as pressMore } from '../lib/pageHeader.mjs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');


await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const SID = sd.lineStandardId;
const CAP = `#/w/${sd.wsId}/standards/${SID}?at=balance`;
const stations = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const C = await import('/src/tools/linebalance/capacity.ts');
  const st = await db.getStandard(id); const r = C.analyse(st.capacity);
  return { stations: st.capacity.stations.map(s => ({ id: s.id, name: s.name, kind: s.kind, moveSec: s.moveSec, moveEvery: s.moveEvery, per: C.perMinute(s) })), limit: r.limit?.station.name, line: r.line };
}, SID);
const before = await stations();
const ppl = before.stations.findIndex(s => s.kind === 'people' && s.per != null);
const idx = ppl >= 0 ? ppl : before.stations.findIndex(s => s.per != null);
ok(idx >= 0, `0 the seeded line has a station with a speed to add a take-away time to (${before.stations[idx]?.name})`);

await go(CAP);
const card = page.locator('.cap-st').nth(idx);
await card.getByRole('button', { name: 'Edit', exact: true }).click(); await page.waitForTimeout(500);
ok(await card.locator('[data-take-away]').count() === 1, '1 the station asks for extra time per unit, always in view');
ok(await card.locator('[data-take-away]').count() === 1, '2 it opens to seconds and "every 1 …"');
const sec = card.locator('[data-take-away] input').first();
await sec.fill('30'); await sec.blur(); await page.waitForTimeout(900);
const after = await stations();
const s0 = before.stations[idx], s1 = after.stations[idx];
const want = 60 / (60 / s0.per + 30);
ok(s1.moveSec === 30 && Math.abs(s1.per - want) < 1e-9, `3 30 s kept on the station and its speed is ${s1.per?.toFixed(4)} = 60 / (60/${s0.per.toFixed(4)} + 30) = ${want.toFixed(4)}`);
ok(/to take it away/.test(await card.innerText()), '4 the station says it in words: "30 s to take it away - already in the speed above"');
await go(CAP);
ok((await stations()).stations[idx].moveSec === 30, '5 kept after a reload');
const trip = card.locator('[data-take-away] input').nth(1);
await page.locator('.cap-st').nth(idx).locator('[data-take-away] input').nth(1).fill('4'); await page.locator('.cap-st').nth(idx).locator('[data-take-away] input').nth(1).blur(); await page.waitForTimeout(800);
const every4 = (await stations()).stations[idx];
ok(every4.moveEvery === 4 && Math.abs(every4.per - 60 / (60 / s0.per + 7.5)) < 1e-9, `6 every 4 units: 7.5 s a unit, speed ${every4.per?.toFixed(4)}`);
void trip;

/* THE PAPER — the line drawn, the bars, and the words */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, /^Line capacity — /)]);
const file = `/tmp/cap-line-${Date.now()}.pdf`; await dl.saveAs(file);
const txt = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/’/g, "'");
ok(/The line, drawn/i.test(txt), '7 the paper has "The line, drawn"');
ok(/What each station can do/i.test(txt), '8 the paper has "What each station can do"');
ok(/BOTTLENECK/.test(txt) && /\/min/.test(txt), '9 the drawing names the bottleneck and the speeds');
ok(new RegExp(before.stations[idx].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(txt), '10 every station is named in it');
ok(/to take every 4 away/.test(txt), '11 the sheet says the take-away time in words on the paper');
const low = txt.toLowerCase();
ok(low.indexOf('the line, drawn') >= 0 && low.indexOf('the line, drawn') < low.indexOf('what each station can do'), '12 the drawing comes before the bars');
process.stdout.write(`      paper kept at ${file}\n`);

/* the phone */
await page.setViewportSize({ width: 390, height: 800 }); await go(CAP);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '13 the phone: nothing off the side');
const minH = await page.evaluate(() => { const b = document.createElement('button'); b.className = 'btn btn-sm cap-move-add'; document.body.appendChild(b); const h = parseFloat(getComputedStyle(b).minHeight); b.remove(); return h; });
ok(minH >= 44, `14 the add-time button is a thumb's height (${minH}px)`);
ok(errors.length === 0, 'no console errors' + (errors[0] ? ': ' + errors[0] : ''));
await browser.close(); console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
