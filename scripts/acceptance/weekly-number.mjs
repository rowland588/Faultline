/* W2 — THE TEAM'S WEEKLY NUMBER, TRENDED (FC-117, FC-201; knowledge/specs/FC-086-charts.md, criterion 8; 24 October 2026):
 * eight weekly readings of the seeded 6M project's rate (lib/measureProof numberTrend — Mann–Kendall's S and p,
 * Sen's slope, the runs about the median): the sentence on the line's Numbers under its chart as the module says
 * it, the right way for a measure that should rise; nothing said of the measure with fewer than eight readings.
 *
 *   node scripts/acceptance/weekly-number.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* what the module says of the seeded series: eight weeks of the rate, 42 41 35 47 44 46 49 52, a week apart */
const said = await page.evaluate(async () => {
  const { numberTrend } = await import('/src/lib/measureProof.ts');
  const day = i => new Date(Date.now() - 7 * (8 - i) * 86_400_000).toISOString().slice(0, 10);
  const pts = [42, 41, 35, 47, 44, 46, 49, 52].map((value, i) => ({ at: day(i), value }));
  return { up: numberTrend(pts, 'up', 'ppm'), seven: numberTrend(pts.slice(0, 7), 'up', 'ppm') };
});
ok(said.up && said.up.n === 8 && said.up.rising && said.up.tone === 'g' && said.seven === null, `the module: ${said.up?.text}`);
ok(/^Trend over 8 readings: rising about \d(\.\d)? ppm a week \(Sen\), Mann–Kendall p 0\.0\d+ — the right way for this measure\./.test(said.up.text), 'rising, about a week, the right way for a measure that should rise');

/* the line's Numbers on its project — the sentence under the chart */
await page.goto(`${BASE}/#/project/${sd.pacedProjectId}/line/${sd.pacedLineId}`); await page.waitForTimeout(3000);
const found = (await page.locator('[data-trend]').allInnerTexts()).map(flat);
ok(found.includes(flat(said.up.text)), `1 the line’s Numbers say it under the chart: "${(found[0] ?? '').slice(0, 130)}"`, found.join(' | '));
ok((await page.locator('.nm-trend.is-g').count()) >= 1, '1 in the right-way tone — and in words, never the colour alone');
ok((await page.locator('.nm-measure').count()) >= 2 && found.length === 1, `1 only the measure with eight readings says a trend (${found.length} of ${await page.locator('.nm-measure').count()} measures)`);

/* the phone */
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/#/project/${sd.pacedProjectId}/line/${sd.pacedLineId}`); await page.waitForTimeout(2500);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '3 the phone: nothing off the side');

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
