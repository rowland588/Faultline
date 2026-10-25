/* W3c — WHICH SHAPE FITS, driven (knowledge/specs/FC-114-fitting.md, acceptance criteria 3, 5–7; 25 October 2026): the four shapes fitted to
 * readings in order, each judged by Anderson–Darling and compared by AIC, the probability plot of the one that leads, the tail from it
 * beside the count as measured. On screen against the module, on paper read back, on a phone. The independent figures are SciPy's
 * (scripts/knowledge/cases-w3c.py). The capability study's own note (FC-096) is step 16 of capability-kinds.mjs.
 *
 *   1  minutes between short stops, forty: the Weibull leads, the bell, the lognormal and the exponential are rejected — the sentence, the
 *      table of every shape, the probability plot, the percentile Ppk beside the bell's, the count and its bound; too few said at 15
 *   2  residual oxygen, thirty: none of the four fits — said amber, the nearest named, the tail read from the count; the limit changed
 *   3  forty fills: the normal fits and is kept, the lognormal said to fit about as well
 *   4  a reading of zero: three shapes not tried, said
 *   5  kept after a reload; the list's rows; confidence changing the bound
 *   6  on paper: the sentence, the table of shapes, the plot, the checks, the agreement, every reading
 *   7  the phone
 *
 * Fails on any console error.   node scripts/acceptance/analysis-shape.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38, 0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const STOPS = [18.4, 78.4, 15.1, 14.5, 23.6, 17.3, 42.7, 10.8, 66.7, 60.8, 1.0, 34.2, 10.2, 18.8, 27.2, 29.2, 30.0, 73.1, 18.8, 15.0, 42.7, 78.3, 72.0, 64.0, 7.4, 75.4, 41.2, 62.7, 26.7, 16.7, 53.1, 42.1, 51.7, 15.7, 11.9, 50.3, 3.5, 78.0, 12.0, 37.9];
const FILLS = [249.0, 248.4, 249.7, 250.5, 251.4, 250.1, 249.3, 249.1, 250.9, 252.0, 250.3, 248.5, 248.9, 251.9, 250.2, 247.9, 249.9, 248.6, 249.2, 249.4, 249.1, 250.7, 249.9, 249.3, 250.5, 251.0, 248.0, 249.7, 248.8, 249.8, 248.5, 250.0, 250.0, 249.6, 248.7, 249.5, 248.7, 248.4, 250.3, 248.7];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const studyId = () => decodeURIComponent(page.url().split('/analysis/')[1]?.split('?')[0] ?? '');
const pdf = async (name, label = / — on paper$/) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, label)]);
  const f = join(OUT, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const truth = id => page.evaluate(async sid => {
  const { getStudy } = await import('/src/db.ts'); const A = await import('/src/tools/analysis/analysis.ts');
  const s = await getStudy(sid); const a = s.agreed?.analysis; const f = A.analysisFigures(a, s.facts.readings ?? []); const said = A.analysisSays(f, a);
  return { a, f: { kind: f.kind, leads: f.set?.leads, closest: f.set?.closest, alsoFit: f.set?.alsoFit, rejected: f.set?.candidates.filter(c => c.rejected).map(c => c.model.id) }, said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: A.analysisClosing(f, a, said).text, checks: f.checks.map(c => c.say), grids: A.analysisGrids(f, a) };
}, id);
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(([k, v]) => tiles.includes(flat(String(v))));
  ok(say === t.said.text && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)), `${tag}: "${say?.slice(0, 150)}${say && say.length > 150 ? '…' : ''}" — the tiles and closing line as the module says them`);
};
const start = async (what, machine = 'Wrapper') => {
  await go('#/analysis');
  await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByLabel(/On which machine/).fill(machine);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
const agreeIt = async () => { await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700); };
const reagree = async fn => { await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300); await fn(); await agreeIt(); };
const shapeAgree = async ({ name, unit, lower, upper }) => {
  await page.getByRole('radio', { name: /Which shape do these readings follow/ }).click();
  await page.getByLabel('What is measured').fill(name); await page.getByLabel('Unit', { exact: false }).first().fill(unit);
  if (lower !== undefined) await page.getByLabel('Lower limit', { exact: true }).fill(String(lower));
  if (upper !== undefined) await page.getByLabel('Upper limit', { exact: true }).fill(String(upper));
  await agreeIt();
};
const pasteReadings = async vals => { await page.getByLabel('Or paste readings — a number to a line, or spaced', { exact: true }).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(600); };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · minutes between short stops ---- */
let stops, oxygen, fills, zero;
{
  stops = await start('Minutes between short stops');
  await page.getByRole('radio', { name: /Which shape do these readings follow/ }).click();
  await page.getByLabel('What is measured').fill('Minutes between stops'); await page.getByLabel('Unit', { exact: false }).first().fill('min');
  await page.getByLabel('Lower limit', { exact: true }).fill('10'); await page.getByLabel('Upper limit', { exact: true }).fill('5');
  ok(/The upper limit has to be above the lower/.test((await words('.ie-problem')) ?? ''), '1 an upper limit below the lower refused');
  await page.getByLabel('Upper limit', { exact: true }).fill(''); await agreeIt();
  ok((await words('.ie-agreed b')) === 'Minutes between stops in min — which shape fits, a lower limit of 10 min · 95% confidence', `1 agreed: "${await words('.ie-agreed b')}"`);
  ok(/^Type or paste the readings in the order taken/.test((await words('.ie-say')) ?? ''), '1 nothing typed — it says how to start');
  await pasteReadings(STOPS.slice(0, 15));
  ok(/^15 readings — a shape is fitted from 20/.test((await words('.ie-say')) ?? '') && /Too few/.test((await words('.ln-band')) ?? ''), '1 fifteen readings: too few, said');
  await pasteReadings(STOPS.slice(15));
  const t = await truth(stops);
  ok(t.f.leads === 'weibull' && t.f.rejected.join() === 'normal,lognormal,exponential' && t.said.tone === 'n' && t.said.verdict === 'Follows a Weibull', '1 the record: the Weibull leads; the normal, the lognormal and the exponential are rejected');
  await sameAsModule(t, '1 forty stops');
  const say = t.said.text;
  ok(say.includes('Minutes between stops: a Weibull fits (Anderson–Darling p = 0.15, the lowest AIC). The normal (p = 0.0038), the lognormal (p = 0.024) and the exponential (p = 0.023) do not.')
    && say.includes('Under the Weibull, about 12 in 100 would be under 10 min; as counted, 3 of 40 are under 10 min'), '1 as SciPy says it (Weibull A² 0.5684 p 0.1462; normal p 0.00382, lognormal 0.02448, exponential 0.02300; share under 10: 0.1199; 3 of 40)');
  const more = (await all('.ie-more')).join(' | ');
  ok(/Weibull: shape β 1\.49 \(above 1: gaps that wear out/.test(more) && /scale η 39\.97 min/.test(more) && /median 31\.23 min; 99\.7% of the set between 0\.47 and 142\.54 min/.test(more), `1 the Weibull in the floor’s words (SciPy β 1.48513, η 39.9730, median 31.23, 0.47 and 142.54): ${more.slice(0, 160)}`);
  ok(/Percentile Ppk 0\.69/.test(more) && /the bell’s Ppk from the sample’s mean and spread is 0\.36/.test(more), '1 the percentile Ppk (0.6901) beside the bell’s (0.3611)');
  const grid = await page.evaluate(() => [...document.querySelectorAll('.ie-grid tbody tr')].map(tr => [...tr.children].map(c => c.innerText.replace(/\s+/g, ' ').trim())));
  ok(grid.length === 4 && grid.map(r => r[1]).join('|') === 'rejected|rejected|leads|rejected' && grid[2][0] === 'Weibull' && grid[2][3] === '363.2' && grid[0][3] === '371.5' && grid[3][3] === '369.2', `1 the table of every shape: ${grid.map(r => `${r[0]} ${r[1]} AIC ${r[3]}`).join(' · ')}`);
  ok((await page.locator('.ie-grid tr.is-lead').count()) === 1, '1 the leader’s row marked');
  ok((await page.locator('.ie-an-scatter .ie-an-dot').count()) === 40 && (await page.locator('.ie-an-scatter .ie-an-fit.is-equal').count()) === 1, '1 the probability plot: forty readings against the Weibull’s quantiles on a line of equal values');
  ok(/Expected under the Weibull/.test(flat(await page.locator('.ie-an-scatter').innerHTML().then(h => h.replace(/<[^>]+>/g, ' ')))), '1 …named for the shape it is drawn for');
  const checks = (await all('.ie-check')).join(' | ');
  ok(/Steady across the run/.test(checks) && /Size: 40 readings — enough to tell a normal from a lognormal, rarely a lognormal from a Weibull/.test(checks), `1 the checks: steady; the size said: ${checks.slice(0, 160)}`);
  ok(/3 of 40/.test(flat(await page.locator('.ie-strip').innerText())) && /Weibull/.test(flat(await page.locator('.ie-strip').innerText())), '1 the tiles: the shape, the fit, the 99.865th point, the share beyond with the count');
  ok((await page.locator('.ie-say.is-n').count()) === 1 && (await page.locator('.ie-say.is-r').count()) === 0, '1 neutral — a shape is not a failure, red never');
}

/* ---- 2 · residual oxygen: none fits ---- */
{
  oxygen = await start('Residual oxygen, MAP packs', 'Gas flusher');
  await shapeAgree({ name: 'Residual oxygen', unit: '%', upper: 2 });
  await pasteReadings(OXYGEN);
  let t = await truth(oxygen);
  ok(t.f.leads === undefined && t.f.closest === 'lognormal' && t.said.verdict === 'No shape fits' && t.said.tone === 'a' && (await page.locator('.ie-say.is-a').count()) === 1, '2 the record: none of the four fits; the lognormal is nearest — amber');
  await sameAsModule(t, '2 thirty oxygen readings');
  ok(t.said.text.includes('none of the 4 shapes tried fits these readings (the lognormal is nearest, p = 0.0006) — read the tail from the count, not from a model: as counted, 0 of 30 are over 2 % (we can be 95% confident the true share is fewer than 10 in 100).'), '2 as SciPy says it (lognormal A² 1.5004, p 0.00057; the others rejected; 0 of 30; the exact bound 9.5%)');
  const grid = await page.evaluate(() => [...document.querySelectorAll('.ie-grid tbody tr')].map(tr => [...tr.children].map(c => c.innerText.replace(/\s+/g, ' ').trim())));
  ok(grid.length === 4 && grid.every(r => r[1] === 'rejected') && grid[1][3] === '−23.9' && grid[1][5] === '1.378' && (await page.locator('.ie-grid tr.is-lead').count()) === 0, `2 every shape rejected, none led, the nearest’s 99.865th point 1.378 (SciPy): ${grid.map(r => `${r[0]} ${r[2]}`).join(' · ')}`);
  const checks = (await all('.ie-check')).join(' | ');
  ok(/Not steady — reading 13 is outside/.test(checks) && /4 readings beyond the fences/.test(checks), `2 not steady and four readings beyond the fences, said: ${checks.slice(0, 140)}`);
  const more = (await all('.ie-more')).join(' | ');
  ok(/Percentile Ppk 1\.58/.test(more) && /the bell’s Ppk from the sample’s mean and spread is 2\.06/.test(more), '2 the percentile Ppk 1.58 beside the bell’s 2.06 (SciPy 1.5849, 2.0649)');
  await reagree(async () => { await page.getByLabel('Upper limit', { exact: true }).fill('1'); });
  t = await truth(oxygen);
  ok(t.said.text.includes('as counted, 1 of 30 is over 1 %') || t.said.text.includes('as counted, 1 of 30 are over 1 %'), `2 the limit moved to 1%: the count follows — "${t.said.text.slice(-120)}"`);
  await sameAsModule(t, '2 …limit 1');
  await reagree(async () => { await page.getByLabel('Upper limit', { exact: true }).fill(''); });
  ok(/name a limit to see the count/.test((await words('.ie-say')) ?? ''), '2 no limit named: the page asks for one to show the count');
  await reagree(async () => { await page.getByLabel('Upper limit', { exact: true }).fill('2'); });
}

/* ---- 3 · forty fills: the bell holds ---- */
{
  fills = await start('Fill weights, steady filler', 'Filler');
  await shapeAgree({ name: 'Fill weight', unit: 'g', lower: 247, upper: 253 });
  await pasteReadings(FILLS);
  const t = await truth(fills);
  ok(t.f.leads === 'normal' && t.said.verdict === 'Bell-shaped' && t.said.tone === 'g' && JSON.stringify(t.f.alsoFit) === '["lognormal"]' && (await page.locator('.ie-say.is-g').count()) === 1, '3 the record: the normal fits and is kept — green; the lognormal fits about as well');
  await sameAsModule(t, '3 forty fills');
  ok(t.said.text.includes('a normal fits (Anderson–Darling p = 0.53) — bell-shaped enough for the usual Ppk.') && t.said.text.includes('The Weibull (p at most 0.01) and the exponential (p at most 0.01) do not.'), '3 as SciPy says it (normal p 0.5348; Weibull and exponential rejected, p held at the table’s end and said)');
  const more = (await all('.ie-more')).join(' | ');
  ok(/The lognormal fits about as well \(p = 0\.55, AIC within 2 of the normal\) and puts the 99\.865th point at 252\.64 g where the normal says 252\.63 g/.test(more), '3 the lognormal said to fit about as well, with its own point beside (SciPy 252.6415, 252.6282)');
}

/* ---- 4 · a reading of zero ---- */
{
  zero = await start('Oxygen with a zero', 'Gas flusher');
  await shapeAgree({ name: 'Residual oxygen', unit: '%', upper: 2 });
  await pasteReadings([...OXYGEN.slice(0, 29), 0]);
  const t = await truth(zero);
  ok(/Not tried: the lognormal — needs every reading above zero/.test(t.checks.join(' ')) && /Not tried: the Weibull/.test(t.checks.join(' ')) && /Not tried: the exponential/.test(t.checks.join(' ')) && t.f.leads === undefined, `4 a reading of zero: the lognormal, the Weibull and the exponential not tried, said — ${t.checks.filter(c => /Not tried/.test(c)).length} lines`);
  const grid = await page.evaluate(() => [...document.querySelectorAll('.ie-grid tbody tr')].map(tr => tr.children[0].innerText));
  ok(grid.join('|') === 'normal', `4 only the normal is in the table: ${grid.join('|')}`);
  await sameAsModule(t, '4 with a zero');
}

/* ---- 5 · kept; the list; confidence ---- */
{
  const before = await truth(stops);
  await go(`#/analysis/${stops}`); await page.reload(); await page.waitForTimeout(2500);
  ok((await words('.ie-say')) === before.said.text && (await page.locator('.ie-grid tbody tr').count()) === 4, '5 reloaded: the shapes answer the same');
  await reagree(async () => { await page.getByRole('radio', { name: '99%', exact: true }).click(); });
  const t = await truth(stops);
  ok(/we can be 99% confident the true share is fewer than 2\d in 100/.test(t.said.text) && (await words('.ie-say')) === t.said.text, `5 99% confidence: the bound on the count moves — "${t.said.text.slice(-100)}"`);
  await reagree(async () => { await page.getByRole('radio', { name: '95%', exact: true }).click(); });
  await go('#/analysis');
  const rows = Object.fromEntries(await Promise.all([[stops, 'stops'], [oxygen, 'oxygen'], [fills, 'fills']].map(async ([id, k]) => [k, flat(await page.locator(`.lt-li[data-study="${id}"]`).innerText())])));
  ok(rows.stops.includes('which shape fits · 40 readings') && rows.oxygen.includes('which shape fits · 30 readings') && rows.fills.includes('which shape fits · 40 readings'), '5 the list says what was typed on each', JSON.stringify(rows));
  ok(rows.stops.includes('Follows a Weibull') && rows.oxygen.includes('No shape fits') && rows.fills.includes('Bell-shaped'), '5 …and each one’s verdict');
}

/* ---- 6 · on paper ---- */
{
  await go(`#/analysis/${stops}`);
  let p = await pdf('stops.pdf');
  const parts = { sentence: p.text.includes('Minutes between stops: a Weibull fits (Anderson–Darling p = 0.15, the lowest AIC).'), table: /Every shape tried/i.test(p.text), leads: /leads/.test(p.text), rejected: /rejected/.test(p.text), weibull: /Weibull: shape/.test(p.text), picture: /The picture/i.test(p.text), limit: /a lower limit of 10 min/.test(p.text), readings: /Every reading, in the order taken/i.test(p.text) };
  ok(Object.values(parts).every(Boolean), `6 the stops on paper: the sentence, the table of shapes, the plot, the agreement, every reading (${p.pages} pages)`, `missing ${Object.entries(parts).filter(([, v]) => !v).map(([k]) => k).join(', ')}: ${p.text.slice(900, 2400)}`);
  await go(`#/analysis/${oxygen}`);
  p = await pdf('oxygen.pdf');
  ok(p.text.includes('none of the 4 shapes tried fits these readings (the lognormal is nearest, p = 0.0006)') && /Not steady — reading 13/.test(p.text) && /Percentile Ppk 1\.58/.test(p.text), '6 the oxygen on paper: none fits, the count, the checks', p.text.slice(0, 700));
  await go('#/analysis');
  p = await pdf('list.pdf', /every one shown/);
  ok(p.text.includes('Minutes between stops') && p.text.includes('Residual oxygen') && p.text.includes('Fill weight'), `6 the list on paper: every analysis shown (${p.pages} pages)`);
}

/* ---- 7 · the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, tag] of [[stops, 'the stops'], [oxygen, 'the oxygen'], [fills, 'the fills']]) {
    await go(`#/analysis/${id}`);
    const w = await page.evaluate(() => document.scrollingElement.scrollWidth);
    const inside = await page.locator('.ie-an-pic, .ie-an-scatter, .ie-tbl-wrap, .ie-cap-box').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= 391; }));
    ok(w <= 390 && inside, `7 the phone, ${tag}: nothing off the side (${w}px)`);
  }
  await page.setViewportSize({ width: 1360, height: 900 });
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
