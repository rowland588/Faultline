/* W2 — THE CONTROL CHART, driven (knowledge/specs/FC-086-charts.md, acceptance criteria 6; 24 October 2026):
 * readings in the order taken against limits set from a steady period and kept, the signals said in words,
 * the CUSUM saying since when, subgroups, short-run, pre-control — on screen, against the module, on paper
 * read back, and on a phone.
 *
 *   1  the seeded chart — its row on the list, the page against the module: the sentence, seven signals each
 *      with what it usually means, the seven tiles, the limits set, the chart + the moving range + the CUSUM,
 *      a point a reading, the line's page saying its latest
 *   2  one started from the list, agreed (one at a time, the limits, the target, the shift worth catching);
 *      nineteen readings — provisional limits said; the twentieth — Set the limits keeps them; twenty more —
 *      the signals as the module says them, the tiles, the closing line; the CUSUM's since; a note on a
 *      reading; one struck and brought back; on no project the action plan says nothing is raised
 *   3  on paper: the cells, the sentence, the signals in words, the chart, the moving range, the CUSUM, every
 *      reading with its note; the limits set again and the old ones kept on the paper
 *   4  subgroups of four — six subgroups, the fourth beyond its limits, a short subgroup plotted not judged
 *   5  short-run — two products on one chart, Levene's word, the changeover boundary, a table by product
 *   6  pre-control — five greens qualify, the pairs read in words, stop on a red, the disclaimer
 *   7  capability across products and over time (FC-101): a row each product, a column each month, the latest, on
 *      the list and on its paper
 *   8  the phone
 *
 * Fails on any console error.   node scripts/acceptance/control-chart.mjs      (SMOKE_BASE, as smoke) */
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

/* the CUSUM case's forty fill weights (knowledge/methods/spc/cusum-ewma.md; cases-spc.py): steady for twenty, then 1 g higher */
const FORTY = [400.0, 400.2, 399.8, 399.3, 399.6, 399.2, 400.0, 401.1, 399.6, 399.5, 400.4, 400.3, 400.1, 399.3, 400.0, 400.6, 398.9, 399.6, 398.5, 399.0, 399.5, 400.8, 400.0, 401.2, 401.1, 400.9, 399.0, 400.6, 401.0, 401.1, 399.8, 400.6, 400.2, 400.4, 401.8, 400.4, 401.0, 401.7, 400.5, 400.9];
const GROUPS = [[400.2, 399.8, 400.5, 400.1], [399.9, 400.4, 400.0, 399.6], [400.3, 400.1, 399.7, 400.6], [400.8, 401.2, 400.9, 401.5], [400.0, 399.5, 400.2, 399.9], [400.4, 400.0, 400.3, 399.8]];
const DA = [0.0, 1.5, 1.3, -0.6, -0.3, -0.6, 0.6, -0.1, 0.8, -2.0, 1.7, -0.1], DB = [0.9, -0.2, -0.5, 0.6, 1.1, -0.3, -0.2, 0.9, -1.1, -2.0];
const PRE = [400.5, 401.0, 403.0, 399.8, 400.2, 401.1, 399.5, 400.9, 402.8, 403.1, 400.4, 402.9, 400.3, 405.2];

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
const blur = () => page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
const typeAll = async vs => { await blur(); for (const v of vs) { await page.keyboard.type(String(v)); await page.keyboard.press('Enter'); await page.waitForTimeout(40); } await page.waitForTimeout(700); };
const pdf = async name => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const studyId = () => decodeURIComponent(page.url().split('/chart/')[1]?.split('?')[0] ?? '');
/* WHAT THE MODULE SAYS on the same record, as stored now — every sentence on the page is checked against it */
const truth = id => page.evaluate(async sid => {
  const { getStudy } = await import('/src/db.ts'); const C = await import('/src/tools/chart/chart.ts');
  const s = await getStudy(sid); const a = s.agreed?.chart; const f = C.chartFigures(a, s.facts.readings ?? []); const said = C.chartSays(f, a);
  return { a, f: { n: f.n, provisional: f.provisional, signals: f.signals.length, centre: f.centre, lcl: f.lcl, ucl: f.ucl, cusum: f.cusum && { signal: f.cusum.signal, since: f.cusum.since, level: f.cusum.level }, points: f.points.length, pre: f.pre, shortRun: f.shortRun && { mode: f.shortRun.mode, alike: f.shortRun.alike, p: f.shortRun.levene?.p, boundaries: f.shortRun.boundaries }, m: f.m, beyond: f.points.filter(p => p.state === 'beyond').map(p => p.no) },
    said, tiles: C.chartTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: C.chartClosing(f, a, said).text, signals: said.signals };
}, id);
const startChart = async (what, machine) => {
  await go('#/chart');
  await page.getByRole('button', { name: 'New control chart' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByLabel(/On which machine/).fill(machine);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(([k, v]) => tiles.includes(flat(String(v))));
  ok(say === t.said.text && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)), `${tag}: "${say}" — the tiles and closing line as the module says`);
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · the seeded chart ---- */
{
  await go('#/chart');
  ok(/^Control chart$/.test(flat(await page.locator('h1').first().innerText())), '1 the list’s name');
  const t = await truth(sd.chartId);
  const row = flat(await page.locator(`.lt-li[data-study="${sd.chartId}"]`).innerText());
  ok(row.includes('Fill weight 400 g') && row.includes(t.said.verdict) && row.includes('40 readings · 7 signals'), '1 the list’s row — its verdict, its readings and signals', row);
  await go(`#/chart/${sd.chartId}`);
  ok(t.a.frozen.n === 20 && t.f.provisional === false && t.f.beyond.join() === '35,38' && t.f.signals === 7, `1 the record: limits set from 20, beyond at ${t.f.beyond}, ${t.f.signals} signals`);
  await sameAsModule(t, '1 the seeded chart');
  const sigs = await all('[data-signal]');
  ok(sigs.length === 7 && sigs.every((x, i) => x.startsWith(t.signals[i].text) && x.includes(t.signals[i].means)), `1 seven signals, each with what it usually means: "${sigs[2]}"`);
  ok(/A point beyond a limit \(above\) — reading 35/.test(sigs.join(' | ')) && /Eight in a row on one side of the centre \(above\) — readings 28–40/.test(sigs.join(' | ')), '1 the beyond and the run said in words');
  const tiles = await page.locator('.ie-strip .ln-tile').count();
  ok(tiles === 6 && (await page.locator('.ln-band .ln-verdict, .ln-band [class*=verdict]').count()) >= 1, '1 the six tiles — the verdict is the band’s');
  ok(/^Limits set .* from readings 1–20\./.test((await words('.ie-limits-act')) ?? ''), `1 the limits set, kept: "${await words('.ie-limits-act')}"`);
  ok((await page.locator('.ie-ch-pic svg').count()) === 3 && (await page.locator('.ie-ch [data-point]').count()) === 40 && (await page.locator('.ie-ch [data-state="beyond"]').count()) === 2, '1 the chart, the moving range and the CUSUM; 40 points, 2 beyond');
  ok(t.f.cusum.signal !== undefined && t.f.cusum.since >= 21 && t.f.cusum.since <= 30 && (await words('.ie-strip')).includes(`reading ${t.f.cusum.since}`), `1 the CUSUM says since reading ${t.f.cusum.since}, signalled at ${t.f.cusum.signal}`);
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  ok(/New reel/.test((await all('.ie-rows li'))[20]), '1 the note on reading 21 on its row');
  await go(`#/lines/${sd.wsId}`);
  const tile = flat(await page.locator('.pl-tool', { has: page.locator('b', { hasText: /^Control chart$/ }) }).innerText());
  ok(tile.includes('Fill weight 400 g') && tile.includes(t.said.verdict), '1 the line’s page — Control chart with its latest', tile);
}

/* ---- 2 · one started, agreed, taken, set, judged ---- */
const chart = await startChart('Fill weight — nights', 'Multihead weigher');
{
  ok(chart.length > 8, `2 started from the list: ${chart.slice(0, 8)}…`);
  const kinds = await all('.ie-kind');
  ok(kinds.length === 3 && /^One reading at a time/.test(kinds[0]) && /^Subgroups/.test(kinds[1]) && /^Pre-control/.test(kinds[2]), `2 the three charts offered: ${kinds.map(k => k.split(' ')[0]).join(', ')}`);
  ok((await page.getByRole('checkbox').count()) === 10, '2 the eight signals and two options as checkboxes');
  ok((await page.getByRole('checkbox', { name: /Western Electric/ }).count()) === 0 && (await page.getByRole('checkbox', { checked: true }).count()) === 4, '2 Western Electric’s four are on, the others off');
  await page.getByLabel('What is measured').fill(''); await page.getByRole('button', { name: 'Agree these' }).click({ force: true }).catch(() => {});
  ok(/^What is measured/.test((await words('.ie-problem')) ?? ''), `2 no name — refused, said why: "${await words('.ie-problem')}"`);
  await page.getByLabel('What is measured').fill('Fill weight'); await page.getByLabel('Unit', { exact: true }).fill('g');
  await page.getByLabel(/^Target/).fill('400'); await page.getByLabel(/^Lower specification limit/).fill('396'); await page.getByLabel(/^Upper specification limit/).fill('404');
  await page.getByLabel(/^The shift worth catching/).fill('0.8');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed b')) === 'Fill weight — individuals and moving range · specification 396–404 g · target 400 g · CUSUM for a 0.8 g shift', `2 agreed: "${await words('.ie-agreed b')}"`);
  await typeAll(FORTY.slice(0, 19));
  let t = await truth(chart);
  ok(t.f.provisional && /provisional limits [\d.]+–[\d.]+ g from 19 — set from 20/.test(t.said.text), `2 nineteen in: "${t.said.text.slice(0, 110)}…"`);
  await sameAsModule(t, '2 nineteen in');
  ok((await page.getByRole('button', { name: 'Set the limits' }).count()) === 1, '2 Set the limits offered while the limits are provisional');
  await typeAll([FORTY[19]]);
  t = await truth(chart);
  ok(/from the first 20, not set yet — Set the limits keeps them/.test(t.said.text) && (await words('.ie-say')) === t.said.text, '2 the twentieth: the limits from the first 20, not set yet');
  await page.getByRole('button', { name: 'Set the limits' }).click(); await page.waitForTimeout(700);
  t = await truth(chart);
  ok(t.a.frozen && t.a.frozen.n === 20 && t.f.provisional === false && /set from readings 1–20/.test(t.said.text) && /^Limits set .* from readings 1–20\./.test((await words('.ie-limits-act')) ?? ''), `2 set and kept: centre ${t.a.frozen?.centre.toFixed(3)}, "${(await words('.ie-limits-act'))?.slice(0, 60)}"`);
  await typeAll(FORTY.slice(20));
  t = await truth(chart);
  await sameAsModule(t, '2 forty in');
  ok(t.f.beyond.join() === '35,38' && t.f.signals === 7 && t.said.verdict === 'Out of control' && (await page.locator('.ie-say.is-r').count()) === 1, '2 two beyond, seven signals, Out of control, in red');
  ok(t.f.cusum.signal !== undefined && /the rise began about reading \d+ \(CUSUM, signalled at \d+\)/.test(t.said.text), `2 the CUSUM: "${t.said.text.slice(-120)}"`);
  /* a note on the last reading, one struck and brought back */
  await page.locator('.ie-notes').getByRole('button', { name: 'Adjusted' }).click(); await page.waitForTimeout(400);
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  ok(/Adjusted/.test((await all('.ie-last li b'))[0]) && /Adjusted/.test((await all('.ie-rows li'))[39]), `2 a note on the last reading: "${(await all('.ie-last li b'))[0]}"`);
  await page.locator('.ie-last').getByRole('button', { name: 'Strike reading 40' }).click(); await page.waitForTimeout(500);
  t = await truth(chart);
  ok(t.f.n === 39 && /39 readings/.test(t.said.text), '2 one struck — 39 readings, the chart re-read');
  await page.getByRole('button', { name: 'Bring back reading 40' }).click(); await page.waitForTimeout(500);
  t = await truth(chart);
  ok(t.f.n === 40, '2 brought back — 40');
  /* a quick session has no project to raise a fix on — Make it better is the project's (ui/StudyPlace), the plan says so */
  ok(/Nothing raised from it yet/.test(flat(await page.locator('.ln-plan-p').innerText())) && (await page.getByRole('button', { name: /^Make it better/ }).count()) === 0, '2 on no project: the action plan empty, no fix to raise');
}

/* ---- 3 · on paper ---- */
{
  await go(`#/chart/${chart}`);
  let p = await pdf('chart.pdf');
  ok(/CONTROL CHART/i.test(p.text) && /Fill weight — 40 readings against limits [\d.]+–[\d.]+ g set from readings 1–20/.test(p.text), `3 on paper: the eyebrow and the sentence (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  ok(/The signals, in words/i.test(p.text) && /A point beyond a limit \(above\) — reading 35/.test(p.text) && /Eight in a row on one side of the centre \(above\)/.test(p.text), '3 the signals in words, each with what it usually means');
  ok(/The chart — limits set from readings 1–20/i.test(p.text) && /The moving range/i.test(p.text) && /The CUSUM — since when/i.test(p.text) && /Every reading, in the order taken/i.test(p.text), '3 the chart, the moving range, the CUSUM, every reading');
  ok(/UCL \d+\.\d+/.test(p.text) && /LCL \d+\.\d+/.test(p.text) && /centre \d+\.\d+/.test(p.text), '3 the limits and the centre drawn and named');
  ok(/\* \d+: Adjusted/.test(p.text), '3 the note on its reading, said under the readings');
  /* set again from the latest twenty — the old ones kept */
  await page.getByRole('button', { name: /Set them again from the latest 20/ }).click(); await page.waitForTimeout(700);
  const t = await truth(chart);
  ok(t.a.frozenBefore?.length === 1 && t.a.frozen.from === 21 && /set before: 399\.7/.test((await words('.ie-limits-act')) ?? ''), `3 set again from readings 21–40; the old kept: "${(await words('.ie-limits-act'))?.slice(-60)}"`);
  p = await pdf('chart-again.pdf');
  ok(/Limits set before: 399\.7\d* from 20 by /.test(p.text), '3 the limits set before kept on the paper');
}

/* ---- 4 · subgroups ---- */
{
  const x = await startChart('Fill weight — subgroups of four', 'Multihead weigher');
  await page.getByRole('radio', { name: /^Subgroups/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel('Readings in a subgroup').inputValue()) === '4', '4 subgroups asks the readings in one — 4 by default');
  await page.getByLabel('What is measured').fill('Fill weight'); await page.getByLabel('Unit', { exact: true }).fill('g');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed b')) === 'Fill weight — subgroups of 4', `4 agreed: "${await words('.ie-agreed b')}"`);
  await typeAll(GROUPS.flat().slice(0, 22));
  let t = await truth(x);
  ok(t.f.points === 6 && t.f.m === 4 && /5 subgroups of 4|6 subgroups of 4/.test(t.said.text) && (await page.locator('.ie-count').innerText()).includes('2 of 4 in the next'), `4 22 readings: 6 subgroups, the sixth short — "${(await words('.ie-count'))}"`);
  await typeAll(GROUPS.flat().slice(22));
  t = await truth(x);
  await sameAsModule(t, '4 six subgroups');
  ok(t.f.beyond.join() === '4' && /^Fill weight — 6 subgroups of 4 against provisional limits 399\.70–400\.77 g from 6 — set from 20: 1 beyond \(4\) — the process has moved\.$/.test(t.said.text), `4 the fourth beyond its limits: "${t.said.text}"`);
  ok((await page.locator('.ie-ch [data-point]').count()) === 6 && (await page.locator('.ie-ch-spread').count()) === 1, '4 six points and the range chart under them');
  const pp = await pdf('xbar.pdf');
  ok(/The range in each subgroup/i.test(pp.text) && /1 beyond \(4\)/.test(pp.text), '4 on paper: the range chart and the sentence');
}

/* ---- 5 · short-run ---- */
{
  const x = await startChart('Fill weight — two products', 'Multihead weigher');
  await page.getByLabel('What is measured').fill('Fill weight'); await page.getByLabel('Unit', { exact: true }).fill('g');
  await page.getByRole('checkbox', { name: /Many products on one chart/ }).check();
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await page.getByLabel('Product', { exact: true }).count()) === 1 && (await page.getByLabel('Its nominal').count()) === 1, '5 the pad asks the product and its nominal');
  ok(await page.getByRole('button', { name: 'Enter the reading' }).isDisabled(), '5 no reading without its product and nominal');
  await page.getByLabel('Product', { exact: true }).fill('A 250 g'); await page.getByLabel('Its nominal').fill('250');
  await typeAll(DA.map(d => Math.round((250 + d) * 10) / 10));
  await page.getByLabel('Product', { exact: true }).fill('B 500 g'); await page.getByLabel('Its nominal').fill('500');
  await typeAll(DB.map(d => Math.round((500 + d) * 10) / 10));
  const t = await truth(x);
  await sameAsModule(t, '5 two products');
  ok(t.f.shortRun.mode === 'dnom' && t.f.shortRun.alike && Math.abs(t.f.shortRun.p - 0.83) < 0.02 && t.f.shortRun.boundaries.join() === '13', `5 Levene p ${t.f.shortRun.p.toFixed(2)}: alike, pooled by DNOM; the changeover at 13`);
  ok(/2 products on one chart — Levene p 0\.83: the spreads are alike, so the deviations are pooled\./.test(t.said.text) && (await page.locator('.ie-ch .ie-bound').count()) === 1, '5 said in words and the boundary drawn');
  const pp = await pdf('short.pdf');
  ok(/By product/i.test(pp.text) && /A 250 g 250 12/.test(pp.text) && /B 500 g 500 10/.test(pp.text), '5 on paper: a table by product');
}

/* ---- 6 · pre-control ---- */
{
  const x = await startChart('Set-up — fill weight', 'Multihead weigher');
  await page.getByRole('radio', { name: /^Pre-control/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('What is measured').fill('Fill weight'); await page.getByLabel('Unit', { exact: true }).fill('g');
  await page.getByLabel(/^Lower specification limit/).fill(''); await page.getByRole('button', { name: 'Agree these' }).click({ force: true }).catch(() => {});
  ok(/^Pre-control needs both specification limits\.$/.test((await words('.ie-problem')) ?? ''), `6 one limit — refused: "${await words('.ie-problem')}"`);
  await page.getByLabel(/^Lower specification limit/).fill('396'); await page.getByLabel(/^Upper specification limit/).fill('404');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll(PRE.slice(0, 4));
  let t = await truth(x);
  ok(t.f.pre.greens === 1 && !t.f.pre.qualified && /Set-up: 1 green in a row of the 5 needed \(an amber or a red restarts the count\)\./.test(t.said.text), `6 an amber restarts: "${t.said.text.slice(0, 160)}…"`);
  await typeAll(PRE.slice(4));
  t = await truth(x);
  await sameAsModule(t, '6 qualified and run');
  ok(t.f.pre.qualified && t.f.pre.qualifiedAt === 8 && t.said.verdict === 'Stop', `6 qualified at reading 8, then a red: ${t.said.verdict}`);
  ok(/Set-up: 5 greens in a row — qualified at reading 8\. Running: pair 3 \(readings 13 and 14\) a red — stop, find why, re-qualify with five greens\. Pre-control is a set-up rule, not a control chart and not capability\.$/.test(t.said.text), '6 the pairs said in words, the disclaimer last');
  ok((await page.locator('.ie-strip .ln-tile').count()) === 4 && (await page.locator('.ie-ch-zones rect').count()) === 5 && (await page.locator('.ie-ch-zones .z-green').count()) === 1, '6 four tiles and the zones drawn — green, two ambers, two reds');
  const pp = await pdf('pre.pdf');
  ok(/Set-up and the pairs/i.test(pp.text) && /Readings 13 and 14 — a red — stop/.test(pp.text), '6 on paper: the set-up and the pairs');
}

/* ---- 7 · capability across products and over time (FC-101) ---- */
{
  const SPEED = [80, 81, 79, 80, 82, 78, 80, 81, 79, 80, 81, 80, 79, 82, 80, 78, 81, 80, 79, 81, 80, 83, 79, 80, 81, 80, 79, 77, 80, 81];
  const at = (y, m, d) => new Date(y, m, d, 10).getTime();
  await page.evaluate(async ([speed, slow, sep, oct]) => {
    const { putStudy } = await import('/src/db.ts');
    const mk = (id, name, startedAt, vs) => ({ id, tool: 'capability', name, product: 'Ot product', agreed: { readings: { kind: 'limits', unit: 'a minute', lower: 75, count: 30 } },
      facts: { readings: vs.map((value, i) => ({ id: `${id}-${i}`, value, at: startedAt + i })) }, uses: [], startedAt, createdAt: startedAt, updatedAt: startedAt });
    await putStudy(mk('ot-sep', 'Wrapper speed — September', sep, speed));
    await putStudy(mk('ot-oct', 'Wrapper speed — October', oct, slow));
  }, [SPEED, SPEED.map(v => v - 4), at(2026, 8, 12), at(2026, 9, 10)]);
  await go('#/capability');
  const t = await page.evaluate(async () => {
    const { listAllStudies } = await import('/src/db.ts'); const O = await import('/src/tools/capability/overTime.ts');
    const all = await listAllStudies(); const ot = O.overTime(all);
    const row = ot.rows.find(r => r.who === 'Ot product');
    return { months: ot.months.map(m => m.label), who: ot.rows.map(r => r.who), cells: ot.months.map(m => row.cells[m.key]?.text ?? '—'), latest: row.latest.verdict, says: O.overTimeSays(ot), ppks: [row.cells[ot.months.find(m => m.label.startsWith('Sep')).key].text, row.cells[ot.months.find(m => m.label.startsWith('Oct')).key].text] };
  });
  const table = page.locator('.ot');
  ok((await table.count()) === 1 && (await words('.ot .qsl-gh h2')) === 'Capability over time', '7 the list has Capability over time, with the sentence under its name');
  const head = await all('.ot-t thead th');
  ok(JSON.stringify(head.slice(1, -1).map(h => h.toLowerCase())) === JSON.stringify(t.months.map(h => h.toLowerCase())) && /^product or machine$/i.test(head[0]) && /^latest$/i.test(head[head.length - 1]), `7 a column each month — ${t.months.join(', ')} — and the latest: ${head.join(' | ')}`);
  const rowText = await all('.ot-t tr[data-who="Ot product"] td');
  ok(t.ppks[0].startsWith('Ppk ') && t.ppks[1].startsWith('Ppk ') && Number(t.ppks[1].slice(4)) < Number(t.ppks[0].slice(4)), `7 the product's row — September ${t.ppks[0]}, October ${t.ppks[1]}: slower, lower`);
  ok(rowText.some(c => c.startsWith(t.ppks[0])) && rowText.some(c => c.startsWith(t.ppks[1])) && rowText[rowText.length - 1] === t.latest, `7 its cells as the module says them and its latest verdict (${t.latest})`);
  ok((await words('.ot .qsl-gh .sub')) === t.says, `7 the sentence: "${t.says}"`);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, /every one shown/)]);
  const lf = join(OUT, 'capability-list.pdf'); await dl.saveAs(lf);
  const pp = { text: flat(execFileSync('pdftotext', ['-raw', lf, '-'], { encoding: 'utf8' })) };
  ok(/Capability over time/i.test(pp.text) && pp.text.includes('Ot product') && pp.text.includes(t.ppks[0]) && pp.text.includes(t.ppks[1]), '7 on the list’s paper: the same table, before each study’s page');
}

/* ---- 8 · the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/chart/${sd.chartId}`);
  const w = await page.evaluate(() => document.scrollingElement.scrollWidth);
  const pad = await page.locator('.ie-pad .ie-key').evaluateAll(els => els.length === 13 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390 && r.height >= 36; }));
  const svgs = await page.locator('.ie-ch-pic svg').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; }));
  ok(w <= 390 && pad && svgs, `7 the phone: nothing off the side (${w}px), the pad’s keys big enough, the three pictures inside`);
  await page.setViewportSize({ width: 1360, height: 900 });
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
