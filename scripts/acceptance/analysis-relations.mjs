/* W3b — THE ANALYSIS, part two, driven (knowledge/specs/FC-107-groups-tables-relations.md, acceptance criteria 3–6; 24 October 2026):
 * do groups differ (FC-107), are two things linked — counts in a table (FC-108), what moves with what — one driver and
 * several (FC-109, FC-110). "We can be 95% confident", on screen against the module, on paper read back, on a phone.
 * The independent figures are SciPy's and NumPy's (scripts/knowledge/cases-w3b.py); the page is checked against the module
 * (src/tools/analysis/analysis.ts) and against those literals.
 *
 *   1  do groups differ — three shifts named and pasted: F, η², each pair of Tukey’s with its interval, Levene and
 *      Kruskal–Wallis beside; 99 · 90%; the worst group amber when lower is better; a reading struck
 *   2  are two things linked — three lanes by three fault types typed by cell and pasted: χ², V in words, the cell beyond ±2
 *      named and marked, the table drawn; a 2 × 2 with Yates and Fisher; a table too small refused amber
 *   3  what moves with what — twelve pairs: r, ρ, the slope with its interval, R², the line too straight said, the scatter
 *      with the line and its band, a prediction inside the range and beyond it, a pair typed box by box and struck; two
 *      drivers (too few rows said, then thirty), the coefficients and the VIF; drivers that move together warned
 *   4  kept after a reload; the list’s rows; the questions
 *   5  on paper: the sentence, the table / pairs / coefficients, the checks, every reading
 *   6  the phone
 *
 * Fails on any console error.   node scripts/acceptance/analysis-relations.mjs      (SMOKE_BASE, as smoke) */
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

const SA = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2], SB = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6], SC = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1];
const LANES = ['Lane 1', 'Lane 2', 'Lane 3'], FAULTS = ['Underweight', 'Leaker', 'Misprint'], TABLE = [[18, 7, 5], [9, 14, 4], [6, 5, 12]];
const X = [150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205], Y = [9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1, 15.9, 16.2, 16.8, 17.0];
const SP = [73, 99, 73, 92, 95, 76, 78, 75, 64, 79, 70, 70, 67, 68, 93, 77, 70, 84, 84, 86, 96, 66, 75, 71, 61, 67, 76, 76, 85, 78];
const TP = [10.1, 6.2, 5.3, 7.3, 5.0, 7.7, 8.6, 11.2, 12.7, 4.5, 13.6, 11.2, 13.9, 5.2, 7.8, 9.0, 11.5, 7.1, 8.5, 6.8, 8.5, 9.1, 9.7, 11.0, 6.4, 10.3, 4.9, 10.1, 8.6, 5.3];
const GA = [2.78, 2.79, 2.66, 2.84, 3.24, 2.55, 2.66, 2.79, 2.95, 2.49, 3.33, 2.66, 3.02, 2.76, 2.92, 2.89, 3.21, 2.89, 2.7, 2.25, 3.7, 2.66, 3.09, 2.68, 2.69, 2.79, 2.42, 2.6, 2.98, 2.36];
const T2 = [7.29, 9.82, 7.28, 9.21, 9.44, 7.6, 7.83, 7.48, 6.37, 7.87, 7.05, 6.92, 6.68, 6.78, 9.31, 7.7, 6.94, 8.5, 8.41, 8.53, 9.56, 6.6, 7.53, 7.03, 6.14, 6.63, 7.56, 7.64, 8.59, 7.8];
const G2 = [1.8, 2.63, 1.65, 2.3, 2.35, 2.12, 2.02, 1.85, 1.8, 1.75, 1.96, 1.67, 1.56, 1.69, 2.27, 2.08, 1.76, 2.23, 2.28, 2.1, 2.12, 1.9, 1.96, 1.4, 1.42, 1.77, 1.65, 1.78, 1.76, 2.04];

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
  return { a, f: { p: f.p, significant: f.significant, leads: f.leads, kind: f.kind, lead: f.lead }, said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: A.analysisClosing(f, a, said).text, checks: f.checks.map(c => c.say) };
}, id);
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(([k, v]) => tiles.includes(flat(String(v))));
  ok(say === t.said.text && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)), `${tag}: "${say?.slice(0, 150)}${say && say.length > 150 ? '…' : ''}" — the tiles and closing line as the module says them`);
};
const start = async (what, machine = 'Multihead weigher') => {
  await go('#/analysis');
  await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByLabel(/On which machine/).fill(machine);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
const agreeIt = async () => { await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700); };
const reagree = async fn => { await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300); await fn(); await agreeIt(); };
const addGroup = async (g, vals) => {
  await page.getByLabel('New shift').fill(g); await page.getByRole('button', { name: 'Add the shift' }).click(); await page.waitForTimeout(300);
  await page.getByLabel(new RegExp(`^Or paste ${g}’s readings`)).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(500);
};
const cellCount = async (row, col, n) => {
  await page.getByRole('radio', { name: new RegExp(`^${row} ·`) }).click(); await page.getByRole('radio', { name: new RegExp(`^${col} ·`) }).click();
  await page.getByLabel('How many', { exact: true }).fill(String(n)); await page.getByRole('button', { name: 'Add to the count' }).click(); await page.waitForTimeout(250);
};
const tableAgree = async ({ name, first, rows, second, cols }) => {
  await page.getByRole('radio', { name: /Is one thing linked/ }).click();
  await page.getByLabel('What is measured').fill(name);
  await page.getByLabel(/^What the rows are/).fill(first); await page.getByLabel('The rows', { exact: true }).fill(rows.join(', '));
  await page.getByLabel(/^What the columns are/).fill(second); await page.getByLabel('The columns', { exact: true }).fill(cols.join(', '));
  await agreeIt();
};
const pasteTable = async rows => { await page.getByLabel('Paste the table').fill(rows.map(r => r.join(' ')).join('\n')); await page.getByRole('button', { name: 'Add these counts' }).click(); await page.waitForTimeout(600); };
const pasteRows = async rows => { await page.getByLabel('Paste rows').fill(rows.map(r => r.join(' ')).join('\n')); await page.getByRole('button', { name: 'Add these rows' }).click(); await page.waitForTimeout(700); };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · do groups differ ---- */
let groups;
{
  groups = await start('Give-away by shift');
  const kinds = await all('[role=radiogroup][aria-label="What do you want to know?"] .ie-kind');
  ok(kinds.length === 12 && /^Do these groups really differ/.test(kinds[3]) && /^Is one thing linked to the other/.test(kinds[4]) && /^Does one thing move with another/.test(kinds[5]), `1 the three new questions offered with the four: ${kinds.map(k => k.split('?')[0]).join(' · ')}`);
  await page.getByRole('radio', { name: /Do these groups really differ/ }).click();
  await page.getByLabel('What is measured').fill('Give-away'); await page.getByLabel('Unit', { exact: false }).first().fill('g');
  await page.getByLabel(/^What the groups are/).fill('shift'); await page.getByRole('radio', { name: /Lower is better/ }).click();
  await agreeIt();
  ok((await words('.ie-agreed b')) === 'Give-away — do the shifts differ · lower is better · in g · 95% confidence', `1 agreed: "${await words('.ie-agreed b')}"`);
  ok(/Name the first shift/i.test((await words('.ie-cap-box')) ?? ''), '1 nothing typed — it asks to name the first shift');
  await addGroup('A', SA); await addGroup('B', SB);
  ok(/Too few|Not started/.test((await words('.ln-band')) ?? '') === false, '1 two groups are enough to compare');
  await addGroup('C', SC);
  const chips = await all('.chip-row .chip');
  ok(chips.join('|') === 'A · 8|B · 8|C · 8', `1 a chip a shift with its count: ${chips.join(' ')}`);
  let t = await truth(groups);
  ok(t.f.significant && t.f.leads === 'anova' && t.said.verdict === 'B is the worst' && t.said.tone === 'a', '1 the record: significant, the F leads, B the worst — amber');
  await sameAsModule(t, '1 three shifts');
  const say = t.said.text;
  ok(say.includes('Give-away by shift: we can be 95% confident the shifts differ (F 21.9 on 2 and 21 degrees of freedom, p < 0.0001)') && say.includes('η² 0.68 — 68% of the variation is between the shifts')
    && say.includes('B is above A by 0.59 g (between 0.34 and 0.84 g)') && say.includes('B is above C by 0.55 g (between 0.30 and 0.80 g)') && say.includes('A and C are not shown to differ'), '1 as SciPy’s figures say it (F 21.9291, η² 0.6762, Tukey −0.5875 −0.8379…−0.3371, 0.5500 0.2996…0.8004)');
  const more = (await all('.ie-more')).join(' | ');
  ok(/A 1\.11 g \(n 8, s 0\.20\) · B 1\.70 g \(n 8, s 0\.23\) · C 1\.15 g \(n 8, s 0\.16\)/.test(more) && /Kruskal–Wallis, beside: H 15\.1, p = 0\.0005/.test(more) && /Tukey’s HSD: 95% intervals/.test(more), `1 the means, Kruskal–Wallis beside the F (H 15.0729, p 0.000533), Tukey: ${more.slice(0, 170)}`);
  ok((await all('.ie-check')).join(' ').includes('Levene’s test p = 0.67') && (await page.locator('.ie-an-pic g').count()) === 3, '1 Levene said (p 0.6701) and a lane a shift with its interval');
  ok((await page.locator('.ie-say.is-a').count()) === 1 && (await page.locator('.ie-say.is-r').count()) === 0, '1 amber, never red');
  await reagree(async () => { await page.getByRole('radio', { name: /No view/ }).click(); });
  ok((await page.locator('.ie-say.is-n').count()) === 1 && /The shifts differ/.test((await words('.ln-band')) ?? ''), '1 no view: neutral, “The shifts differ”');
  await reagree(async () => { await page.getByRole('radio', { name: '99%', exact: true }).click(); });
  ok((await words('.ie-say'))?.includes('99% confident the shifts differ'), '1 99% said');
  await reagree(async () => { await page.getByRole('radio', { name: '90%', exact: true }).click(); });
  ok((await words('.ie-say'))?.includes('between 0.37 and 0.80 g'), '1 90%: the interval narrower (SciPy: −0.8030…−0.3720)');
  await reagree(async () => { await page.getByRole('radio', { name: '95%', exact: true }).click(); await page.getByRole('radio', { name: /Lower is better/ }).click(); });
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Strike reading 1', exact: true }).click(); await page.waitForTimeout(600);
  ok((await all('.chip-row .chip'))[0] === 'A · 7' && /\(n 7,/.test((await all('.ie-more')).join(' ')), '1 a reading struck — A has 7');
  await page.getByRole('button', { name: 'Restore reading 1', exact: true }).click(); await page.waitForTimeout(600);
}

/* ---- 2 · are two things linked ---- */
let table, two, small;
{
  table = await start('Rejects by lane and fault type', 'Packer');
  await tableAgree({ name: 'Rejects', first: 'Lane', rows: LANES, second: 'Fault type', cols: FAULTS });
  ok((await words('.ie-agreed b')) === 'Rejects — 3 lanes by 3 fault types, counted · 95% confidence', `2 agreed: "${await words('.ie-agreed b')}"`);
  ok(/^Nothing counted yet/.test((await words('.ie-say')) ?? ''), '2 nothing counted — it says so');
  for (let j = 0; j < 3; j++) await cellCount('Lane 1', FAULTS[j], TABLE[0][j]);
  await pasteTable([[0, 0, 0], ...TABLE.slice(1)]);
  ok((await all('.chip-row .chip')).slice(0, 3).join('|') === 'Lane 1 · 30|Lane 2 · 27|Lane 3 · 23', `2 row chips carry their totals: ${(await all('.chip-row .chip')).slice(0, 3).join(' ')}`);
  const t = await truth(table);
  ok(t.f.significant && t.f.lead === 'chi2' && t.said.verdict === 'Linked' && t.said.tone === 'n', '2 the record: linked, the χ² leads, neutral');
  await sameAsModule(t, '2 three lanes by three fault types');
  const say = t.said.text;
  ok(say.includes('Fault type and lane are linked: we can be 95% confident the pattern of fault types is not the same in every lane (χ² 17.2 on 4 degrees of freedom, p = 0.0017; Cramér’s V 0.33, a medium link)')
    && say.includes('Lane 3 has more Misprint than chance would give (12 against 6.0)'), '2 as SciPy’s figures say it (χ² 17.2383, df 4, p 0.001737, V 0.3282; residual 2.43 at lane 3, misprint)');
  const grid = await page.evaluate(() => [...document.querySelectorAll('.ie-tbl tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.replace(/\s+/g, ' ').trim())));
  ok(grid[0][0].startsWith('18 12.4') && grid[2][2].startsWith('12 6.0') && /more/i.test(grid[2][2]) && (await page.locator('.ie-tbl td.is-more').count()) === 1 && (await page.locator('.ie-tbl td.is-fewer').count()) === 0, `2 the table drawn: count, then what chance gives; one cell marked more: ${JSON.stringify(grid[2])}`);
  ok(/Test: 100% of the cells expect 5 or more and none expects under 1/.test((await words('.ie-checks')) ?? ''), '2 the χ² said trustworthy');
  /* a 2 × 2 */
  two = await start('Rejects days and nights', 'Packer');
  await tableAgree({ name: 'Rejects', first: 'Shift', rows: ['Days', 'Nights'], second: 'Result', cols: ['Rejected', 'Good'] });
  await pasteTable([[12, 88], [4, 96]]);
  let t2 = await truth(two);
  ok((await all('.ie-more')).join(' ').includes('2 × 2: χ² 4.35 (p = 0.037), with Yates’ correction 3.33 (p = 0.068), Fisher’s exact p = 0.065'), `2 a 2 × 2: Yates and Fisher beside (SciPy 4.3478 / 3.3288 / 0.065197): ${(await all('.ie-more')).join(' ').slice(0, 130)}`);
  await sameAsModule(t2, '2 the 2 × 2');
  /* a table too small */
  small = await start('Rejects, a small count', 'Packer');
  await tableAgree({ name: 'Rejects', first: 'Shift', rows: ['Day', 'Night'], second: 'Fault', cols: ['Short', 'Leak', 'Print'] });
  await pasteTable([[3, 1, 6], [8, 5, 2]]);
  t2 = await truth(small);
  ok(t2.said.verdict === 'Counts too small' && (await page.locator('.ie-say.is-a').count()) === 1 && /too small for the χ² to be trusted: 83% of the cells expect fewer than 5/.test(t2.said.text), `2 a table too small is refused amber, the p only an approximation (SciPy χ² 6.1869, p 0.045; exact 0.0612): "${t2.said.text.slice(0, 120)}"`);
  await sameAsModule(t2, '2 too small');
  ok(/Counts too small/.test((await words('.ie-checks')) ?? ''), '2 …and in the checks');
}

/* ---- 3 · what moves with what ---- */
let line, multi, together;
{
  line = await start('Seal strength against jaw temperature', 'Sealer');
  await page.getByRole('radio', { name: /Does one thing move with another/ }).click();
  await page.getByLabel('What is measured').fill('Seal strength'); await page.getByLabel('Unit', { exact: false }).first().fill('N');
  await page.getByLabel('The drivers', { exact: true }).fill('Jaw temperature (°C)'); await agreeIt();
  ok((await words('.ie-agreed b')) === 'Seal strength in N against Jaw temperature (°C) · 95% confidence', `3 agreed: "${await words('.ie-agreed b')}"`);
  await pasteRows(X.map((x, i) => [x, Y[i]]));
  let t = await truth(line);
  ok(t.a.drivers.length === 1 && t.said.verdict === 'Linked, not straight' && t.said.tone === 'a', '3 the record: linked, the line too straight — amber');
  await sameAsModule(t, '3 twelve pairs');
  ok(t.said.text.includes('Seal strength rises 0.145 N for every extra 1 °C of jaw temperature') && t.said.text.includes('between 0.128 and 0.162 N') && t.said.text.includes('97% of the variation in seal strength goes with jaw temperature (r 0.99, R² 0.97')
    && t.said.text.includes('3 stretches where about 7 are expected'), '3 as NumPy’s figures say it (slope 0.14517, 0.12841…0.16194, R² 0.97384; runs 3 of 7, z −2.422)');
  const more = (await all('.ie-more')).join(' | ');
  ok(/Pearson’s r 0\.987 \(95%: 0\.952 to 0\.996, p < 0\.0001\); Spearman’s ρ 1\.000/.test(more), `3 Pearson with its interval and Spearman: ${more.slice(0, 130)}`);
  ok((await page.locator('.ie-an-scatter .ie-an-dot').count()) === 12 && (await page.locator('.ie-an-scatter polygon').count()) === 1 && (await page.locator('.ie-an-scatter .ie-an-fit').count()) === 1, '3 the scatter: twelve points, the line and the band of its own interval');
  ok(/Shape: the points fall above and below the line in 3 stretches where about 7 are expected \(p = 0\.015\)/.test((await words('.ie-checks')) ?? ''), '3 the shape check said');
  await page.getByLabel('Predict at').fill('172'); await page.waitForTimeout(300);
  ok((await words('.ie-predict .ie-check'))?.startsWith('At 172 °C the line gives 12.95 N') && /between 12\.65 and 13\.26 N/.test((await words('.ie-predict .ie-check')) ?? '') && /between 11\.90 and 14\.00 N/.test((await words('.ie-predict .ie-check')) ?? ''), `3 a prediction at 172: the line, the average’s interval and a new reading’s (NumPy ±0.3037, ±1.0475): "${await words('.ie-predict .ie-check')}"`);
  await page.getByLabel('Predict at').fill('230'); await page.waitForTimeout(300);
  ok(/is outside the 150–205 measured — beyond the readings the line is a guess, so no interval is given/.test((await words('.ie-predict .ie-check')) ?? '') && (await page.locator('.ie-predict .ie-check.is-a').count()) === 1, '3 at 230, beyond the range: a guess, no interval, amber');
  await page.getByLabel('Jaw temperature (°C)', { exact: true }).fill('210'); await page.getByLabel('Seal strength (N)', { exact: true }).fill('17.4'); await page.getByRole('button', { name: 'Add the pair' }).click(); await page.waitForTimeout(600);
  ok((await words('.ie-say'))?.startsWith('Seal strength rises') && (await page.locator('.ie-an-scatter .ie-an-dot').count()) === 13, '3 a pair typed box by box: thirteen points');
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  ok(/210 → 17\.4 N/.test((await all('.ie-rows li')).at(-1) ?? ''), '3 …listed driver → result');
  await page.getByRole('button', { name: 'Strike reading 13', exact: true }).click(); await page.waitForTimeout(600);
  ok((await page.locator('.ie-an-scatter .ie-an-dot').count()) === 12, '3 …and struck: twelve again');
  /* two drivers */
  multi = await start('Give-away against speed and temperature', 'Filler');
  await page.getByRole('radio', { name: /Does one thing move with another/ }).click();
  await page.getByLabel('What is measured').fill('Give-away'); await page.getByLabel('Unit', { exact: false }).first().fill('g');
  await page.getByLabel('The drivers', { exact: true }).fill('Filler speed (per min), Product temperature (°C)'); await agreeIt();
  await pasteRows(SP.slice(0, 5).map((s, i) => [s, TP[i], GA[i]]));
  ok(/^5 rows — at least 15 are needed for 2 drivers/.test((await words('.ie-say')) ?? ''), `3 five rows for two drivers: refused, said how many: "${await words('.ie-say')}"`);
  await pasteRows(SP.slice(5).map((s, i) => [s, TP[i + 5], GA[i + 5]]));
  t = await truth(multi);
  await sameAsModule(t, '3 two drivers');
  ok(t.said.verdict === 'Drivers found' && t.said.text.includes('F 6.80, p = 0.0041; R² 0.33') && t.said.text.includes('Filler speed +0.014 g (0.00329 to 0.0247, p = 0.012)') && t.said.text.includes('Product temperature +0.0685 g (0.0277 to 0.109, p = 0.0019)'), '3 as NumPy’s figures say it (speed 0.01399, temperature 0.06851, R² 0.33492, F 6.7984, p 0.004062)');
  ok(/variance inflation Filler speed 1\.2, Product temperature 1\.2 — below 10/.test((await words('.ie-checks')) ?? '') && (await page.locator('.ie-an-fit.is-equal').count()) === 1 && (await page.locator('.ie-an-scatter .ie-an-dot').count()) === 30, '3 the VIF said fine (1.2372); the fit against what was read on a line of equal values');
  ok((await page.locator('.ie-predict').count()) === 0, '3 no one-driver prediction offered for several drivers');
  /* drivers that move together */
  together = await start('Give-away, drivers that move together', 'Filler');
  await page.getByRole('radio', { name: /Does one thing move with another/ }).click();
  await page.getByLabel('What is measured').fill('Give-away'); await page.getByLabel('Unit', { exact: false }).first().fill('g');
  await page.getByLabel('The drivers', { exact: true }).fill('Filler speed, Second driver'); await agreeIt();
  await pasteRows(SP.map((s, i) => [s, T2[i], G2[i]]));
  t = await truth(together);
  ok(t.said.tone === 'a' && t.said.verdict === 'Drivers move together' && /variance inflation Filler speed 459\.8, Second driver 459\.8 — above 10/.test(t.checks.join(' ')) && /cannot be read apart/.test(t.said.text), `3 VIF 459.76 warned of, amber (NumPy): "${t.said.verdict}"`);
  await sameAsModule(t, '3 drivers that move together');
}

/* ---- 4 · kept; the list; the questions ---- */
{
  const before = await truth(table);
  await go(`#/analysis/${table}`); await page.reload(); await page.waitForTimeout(2500);
  ok((await words('.ie-say')) === before.said.text && (await page.locator('.ie-tbl td.is-more').count()) === 1, '4 reloaded: the table answers the same');
  await go('#/analysis');
  const rows = Object.fromEntries(await Promise.all([[groups, 'groups'], [table, 'table'], [line, 'line'], [multi, 'multi']].map(async ([id, k]) => [k, flat(await page.locator(`.lt-li[data-study="${id}"]`).innerText())])));
  ok(rows.groups.includes('do groups differ · 24 readings') && rows.table.includes('counts in a table · 80 counted') && rows.line.includes('what moves with what · 12 pairs') && rows.multi.includes('what moves with what · 30 rows'), '4 the list says what was typed on each', JSON.stringify(rows));
  ok(rows.groups.includes('B is the worst') && rows.table.includes('Linked') && rows.line.includes('Linked, not straight'), '4 …and each one’s verdict');
}

/* ---- 5 · on paper ---- */
{
  await go(`#/analysis/${groups}`);
  let p = await pdf('groups.pdf');
  ok(p.text.includes('Give-away by shift: we can be 95% confident the shifts differ') && p.text.includes('B is above A by 0.59 g') && /Every pair — Tukey’s HSD, 95% intervals/i.test(p.text) && /A [−-] B/.test(p.text) && /[−-]0\.59/.test(p.text), '5 the groups on paper: the sentence, every pair with its interval', p.text.slice(0, 900));
  ok(/The picture/i.test(p.text) && /Levene/.test(p.text) && /Every reading, in the order taken/i.test(p.text), '5 …the picture, the checks, every reading', p.text.slice(-900));
  await go(`#/analysis/${table}`);
  p = await pdf('table.pdf');
  ok(p.text.includes('Fault type and lane are linked') && p.text.includes('chi² 17.2 on 4 degrees of freedom') && /The counts — each with what chance would give in brackets/i.test(p.text) && p.text.includes('12 (6.0) MORE') && p.text.includes('18 (12.4)') && /Every count, in the order taken/i.test(p.text), '5 the table on paper: the counts with what chance gives, the cell marked MORE', p.text.slice(0, 1100));
  await go(`#/analysis/${line}`);
  p = await pdf('line.pdf');
  ok(p.text.includes('Seal strength rises 0.145 N for every extra 1 °C of jaw temperature') && /too straight/.test(p.text) && /Every pair, in the order taken/i.test(p.text) && /The picture/i.test(p.text) && /rho 1\.00/.test(p.text), '5 the one-driver line on paper', p.text.slice(0, 900));
  await go(`#/analysis/${multi}`);
  p = await pdf('multi.pdf');
  ok(p.text.includes('Give-away goes with the drivers') && /Each driver, per unit, the others held/i.test(p.text) && p.text.includes('Filler speed') && /The fit against what was read/i.test(p.text), '5 several drivers on paper: each coefficient with its interval, p and VIF', p.text.slice(0, 900));
  await go('#/analysis');
  p = await pdf('list.pdf', /every one shown/);
  ok(p.text.includes('Give-away by shift') && p.text.includes('Rejects by lane and fault type') && p.text.includes('Seal strength against jaw temperature'), `5 the list on paper: every analysis shown (${p.pages} pages)`);
}

/* ---- 6 · the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, tag] of [[groups, 'groups'], [table, 'table'], [line, 'line'], [multi, 'several drivers']]) {
    await go(`#/analysis/${id}`);
    const w = await page.evaluate(() => document.scrollingElement.scrollWidth);
    const inside = await page.locator('.ie-an-pic, .ie-an-scatter, .ie-tbl-wrap, .ie-relrow, .ie-cap-box').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= 391; }));
    ok(w <= 390 && inside, `6 the phone, ${tag}: nothing off the side (${w}px)`);
  }
  await page.setViewportSize({ width: 1360, height: 900 });
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
