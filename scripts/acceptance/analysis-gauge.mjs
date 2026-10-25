/* W3c — IS THE GAUGE FIT, driven (knowledge/specs/FC-119-gauge.md, acceptance criteria 3–7; 25 October 2026): one reference read again and
 * again (the Type 1 study, FC-119), references across the range (bias and linearity, FC-120) and one reference checked day after day
 * (stability, FC-120). On screen against the module, on paper read back, on a phone. The independent figures are NumPy's and SciPy's
 * (scripts/knowledge/cases-w3c.py); the page is checked against the module (src/tools/analysis/measure.ts through analysis.ts) and
 * against those literals.
 *
 *   1  one reference read again and again: the record's fifty readings pasted — Cg, Cgk, the bias with its interval, the share of the
 *      tolerance, the lanes, the least count; a worn scale not fit (red); a scale that repeats but reads off (amber); the slice and the
 *      Cg wanted changed and every number moving; too few said
 *   2  money: a scale that reads low — give-away in packs, kilos and pounds with its because; a missing input named; a scale that
 *      reads high — short weight, no pounds; a probe — no money at all
 *   3  references across the range: the probe at five references typed by chip and pasted — three, four, then five; the table, the
 *      scatter with the line and its band, the sentence, the true value at the limit that matters
 *   4  one reference checked day after day: 25 checks — the chart with its limits, "from check 19", the trend; limits from a
 *      baseline that was not steady said
 *   5  kept after a reload; the list's rows; the nine questions
 *   6  on paper: the sentence, the figures, the references table, the checks, the agreement, every reading
 *   7  the phone
 *
 * Fails on any console error.   node scripts/acceptance/analysis-gauge.mjs      (SMOKE_BASE, as smoke) */
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

const GOOD = [500.09, 500.14, 500.17, 500.04, 500.18, 500.14, 500.18, 500.14, 500.21, 500.04, 500.26, 500.22, 500.07, 500.17, 500.16, 499.98, 500.17, 500.07, 500.1, 500.07, 500.09, 500.13, 500.13, 500.0, 500.1, 500.01, 500.02, 500.09, 500.19, 500.17, 500.07, 500.06, 500.05, 500.13, 500.19, 500.12, 500.18, 500.15, 500.24, 499.96, 499.95, 500.1, 500.17, 500.09, 500.15, 500.03, 500.02, 500.06, 500.19, 500.18];
const WORN = [501.9, 501.7, 500.9, 501.6, 500.2, 498.9, 502.7, 501.4, 498.6, 499.7, 500.2, 501.3, 502.4, 501.2, 500.4, 501.4, 500.7, 501.1, 500.2, 499.6, 502.3, 500.5, 501.0, 500.2, 500.3, 500.5, 501.6, 502.2, 501.5, 500.3];
const R2 = n => Math.round(n * 100) / 100;
const LOW = GOOD.map(x => R2(x - 0.4)), OFF = GOOD.map(x => R2(x + 0.9));
const READS = {
  0: [-0.22, -0.28, -0.02, -0.29, -0.36, -0.07, -0.05, -0.26, -0.22, 0.18], 20: [19.81, 19.87, 20.07, 20.02, 20.12, 20.03, 19.88, 19.94, 19.86, 20.03],
  40: [40.07, 39.86, 40.07, 39.91, 40.02, 39.96, 40.04, 39.7, 40.06, 39.84], 60: [60.23, 59.95, 60.03, 60.0, 60.12, 60.22, 60.12, 60.09, 60.11, 60.08],
  80: [80.18, 80.08, 80.15, 80.35, 80.3, 79.97, 80.14, 80.19, 80.11, 80.09] };
const DAILY = [60.09, 60.14, 60.08, 60.08, 60.14, 60.14, 60.12, 59.95, 60.03, 60.06, 60.16, 60.09, 60.05, 60.13, 60.12, 59.98, 60.14, 60.05, 60.41, 60.44, 60.29, 60.51, 60.29, 60.48, 60.45];

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
  return { a, f: { kind: f.kind, mode: f.mode, problem: f.problem }, said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: A.analysisClosing(f, a, said).text, checks: f.checks.map(c => c.say), grids: A.analysisGrids(f, a) };
}, id);
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(([k, v]) => tiles.includes(flat(String(v))));
  ok(say === t.said.text && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)), `${tag}: "${say?.slice(0, 150)}${say && say.length > 150 ? '…' : ''}" — the tiles and closing line as the module says them`);
};
const start = async (what, machine = 'Checkweigher') => {
  await go('#/analysis');
  await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByLabel(/On which machine/).fill(machine);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
const agreeIt = async () => { await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700); };
const reagree = async fn => { await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300); await fn(); await agreeIt(); };
const openMore = async () => { const d = page.locator('.ie-agree-more'); if (!(await d.getAttribute('open')) && (await d.count())) await d.locator('summary').click(); await page.waitForTimeout(150); };
const gaugeAgree = async ({ name, unit = 'g', mode = /One reference, read again/, reference, lower, upper, target, limit, more = {} }) => {
  await page.getByRole('radio', { name: /Is this gauge fit/ }).click();
  await page.getByRole('radio', { name: mode }).click();
  await page.getByLabel('What is measured').fill(name); await page.getByLabel('Unit', { exact: false }).first().fill(unit);
  if (reference !== undefined) await page.getByLabel('Reference value', { exact: true }).fill(String(reference));
  if (lower !== undefined) await page.getByLabel('Lower limit', { exact: true }).fill(String(lower));
  if (upper !== undefined) await page.getByLabel('Upper limit', { exact: true }).fill(String(upper));
  if (target !== undefined) await page.getByLabel('Target', { exact: true }).fill(String(target));
  if (limit !== undefined) await page.getByLabel('Limit that matters', { exact: true }).fill(String(limit));
  if (Object.keys(more).length) {
    await openMore();
    for (const [k, v] of Object.entries(more)) await page.getByLabel(k, { exact: true }).fill(String(v));
  }
  await agreeIt();
};
const pasteReadings = async vals => { await page.getByLabel('Or paste readings — a number to a line, or spaced', { exact: true }).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(600); };
const addRef = async (ref, vals) => {
  await page.getByLabel('New reference', { exact: true }).fill(String(ref)); await page.getByRole('button', { name: 'Add the reference' }).click(); await page.waitForTimeout(300);
  await page.getByLabel(new RegExp(`^Or paste readings of ${ref}( |$)`)).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(600);
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · one reference, read again and again ---- */
let good, worn, off, lowS;
{
  good = await start('Bench scale, 500 g test weight');
  await page.waitForSelector('.ie-kind'); await page.waitForTimeout(300);
  const kinds = await all('[role=radiogroup][aria-label="What do you want to know?"] .ie-kind');
  ok(kinds.length === 9 && /^Is this gauge fit for what it judges/.test(kinds[7]) && /^Which shape do these readings follow/.test(kinds[8]), `1 the two new questions offered after the seven: ${kinds.map(k => k.split('?')[0]).join(' · ')}`);
  await page.getByRole('radio', { name: /Is this gauge fit/ }).click();
  const modes = await all('[role=radiogroup][aria-label="How is it checked?"] .ie-kind');
  ok(modes.length === 3 && /^One reference, read again and again/.test(modes[0]) && /^References across its range/.test(modes[1]) && /^One reference, checked day after day/.test(modes[2]), `1 three ways of checking offered: ${modes.map(m => m.split(' — ')[0].slice(0, 40)).join(' | ')}`);
  /* nothing agreed: refused in words */
  await page.getByLabel('What is measured').fill('Bench scale');
  ok(/The reference’s true value/.test((await words('.ie-problem')) ?? '') && (await page.getByRole('button', { name: 'Agree these' }).isDisabled()), '1 a Type 1 study asks for the reference first, Agree held');
  await page.getByLabel('Reference value', { exact: true }).fill('500');
  ok(/What it judges — a lower and an upper limit/.test((await words('.ie-problem')) ?? ''), '1 …then the tolerance it judges');
  await page.getByLabel('Lower limit', { exact: true }).fill('495'); await page.getByLabel('Target', { exact: true }).fill('');
  await page.getByLabel('Upper limit', { exact: true }).fill('490');
  ok(/The upper limit has to be above the lower/.test((await words('.ie-problem')) ?? ''), '1 …an upper limit below the lower refused');
  await page.getByLabel('Upper limit', { exact: true }).fill('505'); await agreeIt();
  ok((await words('.ie-agreed b')) === 'Bench scale — one reference (500 g) read again and again judging 495–505 g · 95% confidence', `1 agreed: "${await words('.ie-agreed b')}"`);
  ok(/^Read the reference again and again/.test((await words('.ie-say')) ?? ''), '1 nothing typed — it says how to start');
  await pasteReadings(GOOD.slice(0, 6));
  ok(/^6 readings — a Type 1 study is read from 10/.test((await words('.ie-say')) ?? '') && /Too few/.test((await words('.ln-band')) ?? ''), '1 six readings: too few, said');
  await pasteReadings(GOOD.slice(6));
  const t = await truth(good);
  ok(t.said.verdict === 'Fit' && t.said.tone === 'g' && (await page.locator('.ie-say.is-g').count()) === 1, '1 the record: fit, green');
  await sameAsModule(t, '1 fifty readings');
  const say = t.said.text;
  ok(say.includes('Bench scale: Cg 4.54 and Cgk 4.03 against 1.33 — fit for a 10 g tolerance: its spread (6s = 0.441 g) uses 4.4% of it.') && say.includes('It reads 0.112 g high (we can be 95% confident between 0.0915 and 0.133 g) — a real bias, small against the tolerance'),
    '1 as NumPy says it (Cg 4.5403, Cgk 4.0300, 6s = 4.405% of T, bias +0.1124, 0.09154 to 0.13326)');
  const more = (await all('.ie-more')).join(' | ');
  ok(/bias \+0\.112 g, 95% interval 0\.0915 to 0\.133 g \(t 10\.83 on 49 degrees of freedom, p < 0\.0001\)/.test(more) && /the automotive practice’s constants \(VDA volume 5, not read here\)/.test(more), `1 the bias with its t and p (SciPy 10.8257), and where the constants come from: ${more.slice(0, 150)}`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(/readings/i.test(tiles) && /bias/i.test(tiles) && /\bcg\b/i.test(tiles) && /cgk/i.test(tiles) && /uses of tolerance/i.test(tiles) && /in money/i.test(tiles), `1 the tiles: readings, bias, Cg, Cgk, the share of the tolerance, money — ${tiles.slice(0, 160)}`);
  ok((await page.locator('.ie-an-pic g').count()) === 3, '1 three lanes: each reading from the reference, its 6s, the slice it may use');
  const checks = (await all('.ie-check')).join(' | ');
  ok(/Least count: 0\.01 g \(the smallest step the readings show\) is 0\.10% of the tolerance — fine enough/.test(checks), `1 the least count against the tolerance: ${checks.slice(0, 140)}`);
  ok((await page.locator('.ie-grid').count()) === 0, '1 no table on a Type 1 study');
  /* the slice and the Cg wanted changed */
  await reagree(async () => { await openMore(); await page.getByLabel('Slice of the tolerance', { exact: true }).fill('30'); await page.getByLabel('Cg wanted', { exact: true }).fill('1'); });
  let t2 = await truth(good);
  ok(t2.said.text.includes('Cg 6.81 and Cgk 6.30 against 1 ') || t2.said.text.includes('Cg 6.81 and Cgk 6.30 against 1 —'), `1 30% and 1.0 agreed: Cg = 0.3 × 10 ÷ (6 × 0.07342) = 6.81 (NumPy), Cgk 6.30: "${t2.said.text.slice(0, 90)}"`);
  await sameAsModule(t2, '1 …agreed otherwise');
  await reagree(async () => { await openMore(); await page.getByLabel('Slice of the tolerance', { exact: true }).fill(''); await page.getByLabel('Cg wanted', { exact: true }).fill(''); });
  ok((await words('.ie-say'))?.startsWith('Bench scale: Cg 4.54 and Cgk 4.03 against 1.33'), '1 back to the defaults');
  /* a worn scale */
  worn = await start('Bench scale, worn');
  await gaugeAgree({ name: 'Bench scale', reference: 500, lower: 495, upper: 505 });
  await pasteReadings(WORN);
  t2 = await truth(worn);
  await sameAsModule(t2, '1 a worn scale');
  ok(t2.said.verdict === 'Not fit' && t2.said.tone === 'r' && (await page.locator('.ie-say.is-r').count()) === 1 && t2.said.text.includes('not fit for a 10 g tolerance: its spread (6s = 5.96 g) uses 59.6% of it, more than the 20% it may — Cg 0.34 and Cgk 0.04 against 1.33'),
    '1 not fit, red, in NumPy’s figures (Cg 0.3355, Cgk 0.0391, 6s = 59.6% of T)');
  ok((await page.locator('.ie-strip .is-r, .ie-strip [class*="r"]').count()) >= 1, '1 the failing tiles wear the failure colour');
  /* repeats well, reads off */
  off = await start('Bench scale, reads off');
  await gaugeAgree({ name: 'Bench scale', reference: 500, lower: 495, upper: 505 });
  await pasteReadings(OFF);
  t2 = await truth(off);
  ok(t2.said.verdict === 'Biased — correct it' && t2.said.tone === 'a' && (await page.locator('.ie-say.is-a').count()) === 1 && /repeats well \(Cg 4\.54\) but reads 1\.01 g high/.test(t2.said.text), `1 repeats well but reads off: amber — "${t2.said.text.slice(0, 120)}"`);
  await sameAsModule(t2, '1 biased');
}

/* ---- 2 · the money of a bias ---- */
{
  lowS = await start('Bench scale, reads low');
  await gaugeAgree({ name: 'Bench scale', reference: 500, lower: 495, upper: 505, more: { 'Packs a shift': 3000, 'Shifts a week': 10, 'Pounds a kilo': 2.4 } });
  await pasteReadings(LOW);
  let t = await truth(lowS);
  const more = (await all('.ie-more')).join(' | ');
  ok(/In money: Bench scale reads 0\.288 g low, so packs set by it run that much heavier than they read — 0\.86 kg of product a shift \(3,000 packs\), £2 a shift, £21 a week at £2\.40 a kilo — because of the bias/.test(more), `2 reads low: give-away in kilos and pounds with its because: ${more.slice(more.indexOf('In money')).slice(0, 190)}`);
  await sameAsModule(t, '2 reads low');
  ok(/£2 a shift/.test(flat(await page.locator('.ie-strip').innerText())), '2 …and as a tile');
  await reagree(async () => { await openMore(); await page.getByLabel('Pounds a kilo', { exact: true }).fill(''); });
  ok(/give £ a kg to say it in money/.test((await all('.ie-more')).join(' | ')), '2 £ a kilo missing: named, nothing blocked');
  await reagree(async () => { await openMore(); await page.getByLabel('Packs a shift', { exact: true }).fill(''); });
  ok(/give the packs a shift to say it in money/.test((await all('.ie-more')).join(' | ')), '2 packs a shift missing: named');
  await go(`#/analysis/${good}`);
  ok(/short weight, which is not a saving and is not priced here/.test((await all('.ie-more')).join(' | ')) && !/£\d/.test((await all('.ie-more')).join(' | ')), '2 reads high: short weight, never priced');
  /* a probe: no money at all */
  const probe = await start('Probe at the cook limit');
  await gaugeAgree({ name: 'Probe', unit: '°C', reference: 75, lower: 70, upper: 80 });
  await pasteReadings([75.1, 75.2, 75.0, 75.1, 75.3, 75.1, 75.2, 75.0, 75.1, 75.2, 75.1, 75.3]);
  ok(!/In money/.test((await all('.ie-more')).join(' | ')) && /none/.test(flat(await page.locator('.ie-strip').innerText())), '2 a probe: nothing about money, the tile says none');
  void probe;
}

/* ---- 3 · references across the range ---- */
let range;
{
  range = await start('Probe, five references', 'Cook-chill');
  await gaugeAgree({ name: 'Probe', unit: '°C', mode: /References across its range/, limit: 75 });
  ok((await words('.ie-agreed b')) === 'Probe — bias across its range in °C, read at 75 °C · 95% confidence', `3 agreed: "${await words('.ie-agreed b')}"`);
  ok(/^Read each reference several times/.test((await words('.ie-say')) ?? ''), '3 nothing typed — it says how to start');
  await addRef(0, READS[0]); await addRef(20, READS[20]); await addRef(40, READS[40]);
  let t = await truth(range);
  ok(t.said.verdict === 'Bias shown, no line yet' && /a line of bias needs 4 references/i.test(t.said.text), `3 three references: a bias seen, no line yet, said: "${t.said.text.slice(0, 140)}"`);
  await addRef(60, READS[60]);
  t = await truth(range);
  ok(/^The bias changes with size|^One offset|^Reads true/.test(t.said.verdict) && (await page.locator('.ie-an-fit').count()) === 1, `3 four references: a line is drawn — "${t.said.verdict}"`);
  await addRef(80, READS[80]);
  t = await truth(range);
  ok(t.said.verdict === 'The bias changes with size' && t.said.tone === 'a' && (await page.locator('.ie-say.is-a').count()) === 1, '3 five references: the bias changes with the size — amber');
  await sameAsModule(t, '3 five references');
  const say = t.said.text;
  ok(say.includes('Probe reads 0.159 °C low at 0 and 0.156 °C high at 80 — the bias changes with the size (0.00381 °C more for every extra 1 °C of the reference; we can be 95% confident between 0.00194 and 0.00568, p = 0.0074): one offset will not fix it.')
    && say.includes('At 75 °C, the limit that matters, the line gives +0.135 °C: a reading of 75 means product at 74.865 °C.'), '3 as NumPy says it (−0.1508 + 0.00381 × ref, slope p 0.007445, 0.001940 to 0.005680, +0.13495 at 75, true 74.86505)');
  const grid = await page.evaluate(() => [...document.querySelectorAll('.ie-grid tbody tr')].map(tr => [...tr.children].map(c => c.innerText.replace(/\s+/g, ' ').trim())));
  ok(grid.length === 5 && grid[0].join('|') === t.grids[0].rows[0].join('|') && grid[0][6] === 'real' && grid[1][6] === 'not shown' && grid[4][3] === '+0.156', `3 the references table: ${grid.map(r => r.slice(0, 1).concat(r.slice(3, 4), r.slice(6)).join(' ')).join(' · ')}`);
  ok((await page.locator('.ie-an-scatter .ie-an-dot').count()) === 50 && (await page.locator('.ie-an-scatter polygon').count()) === 1 && (await page.locator('.ie-an-scatter .ie-an-fit').count()) === 1, '3 the scatter: fifty readings’ bias against the reference, the line and the band of its own interval');
  const chips = await all('.chip-row .chip');
  ok(chips.join('|') === '0 °C · 10|20 °C · 10|40 °C · 10|60 °C · 10|80 °C · 10', `3 a chip a reference with its count: ${chips.join(' ')}`);
  /* a reference of two readings is left out and said */
  await page.getByLabel('New reference', { exact: true }).fill('100'); await page.getByRole('button', { name: 'Add the reference' }).click();
  await page.getByLabel(/^Or paste readings of 100( |$)/).fill('100.2\n100.1'); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(600);
  ok(/Too few: 100 \(2\) has fewer than 5 readings, so it is left out/.test((await all('.ie-check')).join(' ')) && (await page.locator('.ie-grid tbody tr').count()) === 5, '3 a reference with two readings: left out, said');
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  const lastRows = await all('.ie-rows li');
  ok(/100\.1 °C against 100 °C/.test(lastRows.at(-1) ?? ''), `3 every reading listed against its reference: "${lastRows.at(-1)}"`);
  /* the limit that matters, outside the references */
  await reagree(async () => { await page.getByLabel('Limit that matters', { exact: true }).fill('120'); });
  ok(/is outside the references measured/.test((await all('.ie-check')).join(' ')) && !/the line gives/.test((await words('.ie-say')) ?? ''), '3 a limit beyond the references: the line is not read there, said');
  await reagree(async () => { await page.getByLabel('Limit that matters', { exact: true }).fill('75'); });
  /* a gauge that reads true */
  const clean = await start('Scale across sizes', 'Intake');
  await gaugeAgree({ name: 'Scale', unit: 'kg', mode: /References across its range/ });
  const mk = (r, off) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => +(r + off + [0.02, -0.03, 0.01, -0.02, 0.03, -0.01, 0.0, 0.02, -0.02, 0.01][i]).toFixed(2));
  for (const r of [1, 2, 5, 10]) await addRef(r, mk(r, 0));
  t = await truth(clean);
  ok(t.said.verdict === 'Reads true' && t.said.tone === 'g' && (await page.locator('.ie-say.is-g').count()) === 1, `3 a scale with no bias anywhere reads true: green — "${t.said.text.slice(0, 110)}"`);
}

/* ---- 4 · one reference, checked day after day ---- */
let drift;
{
  drift = await start('Check weight, daily', 'Checkweigher 2');
  await gaugeAgree({ name: 'Check weight', unit: 'g', mode: /One reference, checked day after day/, reference: 60, more: { 'Baseline checks': 18 } });
  ok((await words('.ie-agreed b')) === 'Check weight — the reference 60 g checked day after day · 95% confidence', `4 agreed: "${await words('.ie-agreed b')}"`);
  await pasteReadings(DAILY.slice(0, 7));
  ok(/^7 checks — at least 8 are needed to draw limits/.test((await words('.ie-say')) ?? ''), '4 seven checks: too few to draw limits, said');
  await pasteReadings(DAILY.slice(7, 18));
  let t = await truth(drift);
  ok(t.said.verdict === 'Steady' && t.said.tone === 'g', `4 eighteen steady checks: held — "${t.said.text.slice(0, 120)}"`);
  await pasteReadings(DAILY.slice(18));
  t = await truth(drift);
  ok(t.said.verdict === 'Drifted from check 19' && t.said.tone === 'r' && (await page.locator('.ie-say.is-r').count()) === 1, '4 twenty-five: drifted from check 19 — red');
  await sameAsModule(t, '4 the daily check weight');
  ok(t.said.text.includes('the first 18 checks put the limits at 59.905 to 60.268 g (centre 60.086 g, +0.0861 g against the reference). From check 19 it signals — 7 checks are beyond the upper limit.'), '4 as NumPy says it (centre 60.0861, limits 59.9046 to 60.2676, days 19–25 beyond)');
  ok(/Kendall’s τ 0\.38, p = 0\.0087; Sen’s slope \+0\.0124 g a check \(rising\)/.test((await all('.ie-more')).join(' | ')), '4 the trend (SciPy τ 0.3838, Sen 0.012426)');
  ok((await page.locator('.ie-an-scatter .ie-an-dot').count()) === 25 && (await page.locator('.ie-an-scatter polygon').count()) === 1 && (await page.locator('.ie-an-scatter .ie-an-fit').count()) === 1, '4 the chart: twenty-five checks, the centre and the limits as a band');
  ok(/check 19/.test(flat(await page.locator('.ie-strip').innerText())) && /Size|Baseline/.test((await all('.ie-check')).join(' ')) === false, '4 the tile says from check 19; no stray warning');
  /* a baseline that was not steady */
  await reagree(async () => { await openMore(); await page.getByLabel('Baseline checks', { exact: true }).fill('22'); });
  t = await truth(drift);
  ok(await page.locator('.ie-say').count() === 1 && (await words('.ie-say')) === t.said.text, `4 the limits from the first 22 (two of them drifted): "${t.said.verdict}" — the module’s word`);
  await reagree(async () => { await openMore(); await page.getByLabel('Baseline checks', { exact: true }).fill('18'); });
  /* a client may not type */
}

/* ---- 5 · kept; the list; the questions ---- */
{
  const before = await truth(range);
  await go(`#/analysis/${range}`); await page.reload(); await page.waitForTimeout(2500);
  ok((await words('.ie-say')) === before.said.text && (await page.locator('.ie-grid tbody tr').count()) === 5, '5 reloaded: the range study answers the same, its table kept');
  await go('#/analysis');
  const rows = Object.fromEntries(await Promise.all([[good, 'good'], [range, 'range'], [drift, 'drift']].map(async ([id, k]) => [k, flat(await page.locator(`.lt-li[data-study="${id}"]`).innerText())])));
  ok(rows.good.includes('is the gauge fit · 50 readings') && rows.range.includes('is the gauge fit · 52 readings') && rows.drift.includes('is the gauge fit · 25 checks'), '5 the list says what was typed on each', JSON.stringify(rows));
  ok(rows.good.includes('Fit') && rows.range.includes('The bias changes with size') && rows.drift.includes('Drifted from check 19'), '5 …and each one’s verdict');
}

/* ---- 6 · on paper ---- */
{
  await go(`#/analysis/${good}`);
  let p = await pdf('type1.pdf');
  ok(p.text.includes('Bench scale: Cg 4.54 and Cgk 4.03 against 1.33 — fit for a 10 g tolerance') && /The picture/i.test(p.text) && /Least count: 0\.01 g/.test(p.text) && /one reference read again and again, reference 500 g, judging 495–505 g, its 6s may use 20% of the tolerance, Cg and Cgk wanted at 1\.33/.test(p.text) && /Every reading, in the order taken/i.test(p.text),
    '6 the Type 1 study on paper: the sentence, the picture, the least count, the agreement with its slice and need, every reading', p.text.slice(0, 700));
  await go(`#/analysis/${range}`);
  p = await pdf('range.pdf');
  ok(p.text.includes('Probe reads 0.159 °C low at 0 and 0.156 °C high at 80') && /Each reference — its bias and whether it is real/i.test(p.text) && /not shown/.test(p.text) && /real/.test(p.text) && /a reading of 75 means product at 74\.865/.test(p.text) && /@80/.test(p.text), '6 the range study on paper: the sentence, the references table, the true value at 75, every reading with its reference', p.text.slice(0, 800));
  await go(`#/analysis/${drift}`);
  p = await pdf('drift.pdf');
  ok(p.text.includes('Check weight drifted up') && /From check 19 it signals/.test(p.text) && /Sen.s slope/.test(p.text) && /limits from the first 18 checks/.test(p.text), '6 the stability study on paper: the sentence, the trend, the baseline agreed', p.text.slice(0, 700));
  await go('#/analysis');
  p = await pdf('list.pdf', /every one shown/);
  ok(p.text.includes('Bench scale') && p.text.includes('Probe, five references') && p.text.includes('Check weight'), `6 the list on paper: every analysis shown (${p.pages} pages)`);
}

/* ---- 7 · the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, tag] of [[good, 'Type 1'], [worn, 'a worn scale'], [range, 'the range'], [drift, 'the check']]) {
    await go(`#/analysis/${id}`);
    const w = await page.evaluate(() => document.scrollingElement.scrollWidth);
    const inside = await page.locator('.ie-an-pic, .ie-an-scatter, .ie-tbl-wrap, .ie-cap-box').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= 391; }));
    ok(w <= 390 && inside, `7 the phone, ${tag}: nothing off the side (${w}px)`);
  }
  await go(`#/analysis/${good}`);
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(400);
  const w2 = await page.evaluate(() => document.scrollingElement.scrollWidth);
  ok(w2 <= 390, `7 the agreement with its fold of defaults fits a phone (${w2}px)`);
  await page.setViewportSize({ width: 1360, height: 900 });
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
