/* W2 — THE TEAM'S WEEKLY NUMBER, TRENDED AND PROVED (FC-117, FC-201; knowledge/specs/FC-117-weekly-number.md, knowledge/specs/FC-086-charts.md
 * criterion 8; 24 October and 1 November 2026): eight weekly readings of the seeded 6M project's rate (lib/measureProof numberTrend — Mann–Kendall's S and p,
 * Sen's slope, the runs about the median): the sentence on the line's Numbers under its chart as the module says
 * it, the right way for a measure that should rise; nothing said of the measure with fewer than eight readings. And, since 1 November, the independent
 * cases of scripts/knowledge/cases-kaizen.py section P (Sen 1.6333, p 0.0354, runs 4; the eight weeks cut after week 5 — Welch t 2.15178, p 0.03993, +15.8%):
 *
 *   2  the number proved at a change: Log a win › Prove it from the readings — the verdict for the weeks cut where the change landed, as the independent
 *      case says (41.3 → 47.8 ppm · +15.8% · 4 before · 4 after, proven at p 0.04), another day chosen, Call it freezing the numbers onto the win
 *   3  the paper: the client report's full report (A3) downloaded and read back — the trend sentence under the line's chart, and the win's proof sentence
 *   4  a method project's row for FC-117 and FC-201 (the A3's Target, the Kata's challenge): with no measure it says where to set it; with eight readings it
 *      says the latest and the trend as the module does; a tap opens the project's Results
 *

 *   node scripts/acceptance/weekly-number.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const dir = mkdtempSync(join(tmpdir(), 'weekly-'));
const readPdf = async (d, file) => { const f = join(dir, file); await d.saveAs(f); return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
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
/* the moving average of the last three readings (FC-117): drawn dashed on the chart of the measure with eight readings — 42 41 35 47 44 46 49 52 gives 39.33 41 42 45.67 46.33 49
   (worked by hand) — and not on the chart with fewer; named in the legend */
const avg = await page.evaluate(async () => {
  const paths = [...document.querySelectorAll('path[data-moving-average]')];
  const { movingAverage } = await import('/src/lib/measureProof.ts');
  return { n: paths.length, segs: paths.map(p => (p.getAttribute('d') ?? '').split(/[ML]/).filter(Boolean).length), charts: document.querySelectorAll('.nm-measure .pace-chart svg[role=img]').length,
    key: [...document.querySelectorAll('.pace-key')].some(k => /3-reading average/.test(k.textContent ?? '')), ma: movingAverage([42, 41, 35, 47, 44, 46, 49, 52]).map(v => v === null ? null : Math.round(v * 100) / 100) };
});
ok(avg.n === 1 && avg.segs[0] === 6 && avg.key && avg.charts >= 2, `1 the moving average is drawn once, on the chart with eight readings (6 points of 8), named in the legend; the chart with fewer has none (${avg.n} of ${avg.charts} charts)`, JSON.stringify(avg));
ok(JSON.stringify(avg.ma) === JSON.stringify([null, null, 39.33, 41, 42, 45.67, 46.33, 49]), '1 …the averages are the hand-worked ones: 39.33 41 42 45.67 46.33 49', JSON.stringify(avg.ma));


/* 2 — the number proved at a change */
await page.goto(`${BASE}/#/project/${sd.pacedProjectId}?view=wins`); await page.waitForTimeout(2500);
const unit = await page.evaluate(async pid => { const db = await import('/src/db.ts'); return (await db.getProject(pid)).measures?.[0]?.unit; }, sd.pacedProjectId);
await page.getByRole('button', { name: /Log (a|the first) win/ }).first().click(); await page.waitForTimeout(900);
await page.getByRole('button', { name: /Prove it from the readings/ }).first().click(); await page.waitForTimeout(1200);
const sheet = page.locator('[aria-label="Prove this win"]');
ok(await sheet.count() === 1, '2 Prove it from the readings opens the sheet');
const chips = await sheet.locator('.wp-chips').last().locator('.chip').allInnerTexts();
ok(chips.length === 5, `2 five days the change could have landed on (two weeks each side at least): ${chips.length}`);
const verdict = async () => ({ badge: (await sheet.locator('.wp-badge').innerText()).trim(), sentence: (await sheet.locator('.wp-sentence').innerText()).trim(), note: flat(await sheet.locator('.wp-note').innerText()) });
const v4 = await verdict();
ok(v4.sentence === `41.3 → 47.8${unit ? ` ${unit}` : ''} · +15.8% · 4 before · 4 after` && v4.badge === 'PROVEN' && /about 4 times in 100/.test(v4.note), `2 cut after week 4 (the middle): "${v4.sentence}" — ${v4.badge}`, JSON.stringify(v4));
const p4 = await page.evaluate(async () => { const { numberProof } = await import('/src/lib/measureProof.ts'); const p = numberProof([42, 41, 35, 47, 44, 46, 49, 52], 4, 'up'); return { p: p.pValue, pct: p.changePct, sig: p.significant }; });
ok(Math.abs(p4.p - 0.03993) < 0.00002 && Math.abs(p4.pct - 15.7576) < 0.001 && p4.sig === true, `2 …Welch p ${p4.p?.toFixed(5)} (independent: 0.03993), +${p4.pct?.toFixed(4)}% (independent: 15.7576)`);
await sheet.locator('.wp-chips').last().locator('.chip').nth(3).click(); await page.waitForTimeout(500);
const v5 = await verdict();
const p5 = await page.evaluate(async () => { const { numberProof } = await import('/src/lib/measureProof.ts'); const p = numberProof([42, 41, 35, 47, 44, 46, 49, 52], 5, 'up'); return { p: p.pValue, pct: p.changePct, v: p.verdict }; });
ok(v5.sentence === `41.8 → 49${unit ? ` ${unit}` : ''} · +17.2% · 5 before · 3 after` && Math.abs(p5.p - 0.01779) < 0.00002 && v5.badge === 'PROVEN' && p5.v === 'proven', `2 cut after week 5: "${v5.sentence}" — ${v5.badge}, p ${p5.p?.toFixed(5)} (independent: 0.01779)`, JSON.stringify(v5));
ok(/by chance about 2 times in 100/.test(v5.note), `2 …said in plain words: "${v5.note.slice(0, 110)}"`);
await sheet.getByRole('button', { name: 'Call it' }).click(); await page.waitForTimeout(1200);
const called = flat(await page.locator('.win-proof-line').first().innerText());
ok(called === v5.sentence, `2 Call it freezes the numbers onto the win: "${called}"`);

/* 3 — the paper: the 6M client report (the full report), and the A3 of a project that keeps its numbers on the A3 */
await page.goto(`${BASE}/#/pace-report?project=${sd.pacedProjectId}&line=${sd.pacedLineId}`); await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Full report', exact: true }).click(); await page.waitForTimeout(1200);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click({ timeout: 60000 })]);
const txt = await readPdf(dl, 'full.pdf');
ok(txt.includes(flat(said.up.text)), `3 the 6M client report’s paper carries the trend under the line’s chart, as the page says it: "${flat(said.up.text).slice(0, 110)}…"`, txt.slice(0, 600));
ok(/DOTTED = AVERAGE OF THE LAST 3/.test(txt), '3 …and names the dotted moving average on the chart');
/* the lever tree project's A3 (drawPaceReport): eight readings on its line, then the paper */
const tree = await page.evaluate(async (pid) => {
  const db = await import('/src/db.ts'); const rs = (await db.listReadings(pid)).filter(r => !r.deletedAt);
  const base = rs[0]; const day = i => new Date(Date.now() - 7 * (9 - i) * 86_400_000).toISOString().slice(0, 10);
  for (const r of rs) await db.deleteReading(r.id);
  await db.putReadings([42, 41, 35, 47, 44, 46, 49, 52].map((value, i) => ({ id: crypto.randomUUID(), projectId: pid, lineId: base.lineId, measureId: base.measureId, at: day(i), value, createdAt: Date.now() + i, updatedAt: Date.now() + i })));
  const m = (await db.getProject(pid)).measures.find(x => x.id === base.measureId);
  return { ok: !!base, name: m?.name, unit: m?.unit, direction: m?.direction };
}, sd.treeProjectId);
await page.goto(`${BASE}/#/pace-report?project=${sd.treeProjectId}`); await page.waitForTimeout(3000);
const exp = await page.evaluate(async (m) => { const { numberTrend } = await import('/src/lib/measureProof.ts'); const day = i => new Date(Date.now() - 7 * (9 - i) * 86_400_000).toISOString().slice(0, 10);
  return numberTrend([42, 41, 35, 47, 44, 46, 49, 52].map((value, i) => ({ at: day(i), value })), m.direction, m.unit)?.text; }, tree);
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click({ timeout: 60000 })]);
const txt2 = await readPdf(dl2, 'a3.pdf');
ok(/The dotted line is the average of the last 3 readings\./.test(txt2), '3 the A3 names its dotted moving average');
ok(!!exp && txt2.includes(flat(exp)), `3 the A3 carries it too: "${(exp ?? '').slice(0, 100)}…"`, txt2.slice(0, 400));

/* 4 — a method project's row: FC-201 on a Kata project (the challenge), FC-117 on an A3 (the Target) */
const MPs = { kata: sd.methodProjectIds?.kata, a3: sd.methodProjectIds?.a3 };
ok(!!MPs.kata && !!MPs.a3, '4 the seed has a Kata and an A3 project', JSON.stringify(Object.keys(sd.methodProjectIds)));
const rowText = async (name) => flat(await page.locator('li, .rec-row').filter({ hasText: name }).first().innerText());
const keep = async (pid) => page.evaluate(async (pid) => {
  const db = await import('/src/db.ts'); const p = await db.getProject(pid);
  await db.updateProject({ ...p, measures: [{ id: `m-${pid}`, name: 'Rate', unit: 'ppm', direction: 'up', sort: 0 }], updatedAt: Date.now() });
  const day = i => new Date(Date.now() - 7 * (8 - i) * 86_400_000).toISOString().slice(0, 10);
  await db.putReadings([42, 41, 35, 47, 44, 46, 49, 52].map((value, i) => ({ id: crypto.randomUUID(), projectId: pid, lineId: `line-${pid}`, measureId: `m-${pid}`, at: day(i), value, createdAt: Date.now() + i, updatedAt: Date.now() + i })));
}, pid);
for (const [fc, name, pid] of [['FC-201', 'The team’s own weekly number, proved', MPs.kata], ['FC-117', 'The team’s own weekly number, trended', MPs.a3]]) {
  await page.goto(`${BASE}/#/project/${pid}`); await page.waitForTimeout(2500);
  const t0 = await rowText(name);
  ok(/No measure set yet — the project’s owner sets what the team’s number is on its Setup\./.test(t0), `4 ${fc}: with no measure the row says where to set it — "${t0.slice(0, 150)}"`);
  await keep(pid); await page.waitForTimeout(1200);
  const t1 = await rowText(name);
  ok(t1.includes('Rate: 8 readings, latest 52 ppm; rising about 1.6 ppm a week — the right way.'), `4 ${fc}: with eight readings the latest and the trend as the module says — "${t1.slice(0, 170)}"`);
  await page.getByText(name, { exact: true }).first().click(); await page.waitForTimeout(1500);
  ok(new RegExp(`#/project/${pid}\\?view=data`).test(page.url()), `4 ${fc}: a tap opens the project’s Results (${page.url().split('#')[1]})`);
}

/* the phone */
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/#/project/${sd.pacedProjectId}/line/${sd.pacedLineId}`); await page.waitForTimeout(2500);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '3 the phone: nothing off the side');

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
