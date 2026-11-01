/* FC-111 — DESIGNED EXPERIMENTS, driven (knowledge/specs/FC-111-doe.md, acceptance criteria 1–10; 1 November 2026): the question asked first — which
 * settings drive the result, and do they interact? — a two-level factorial made on the page: the factors typed by hand with their low and high, the
 * runs shuffled from a stored seed and said, the response typed (or pasted in run order) as each run is made, the effects and which are real read on
 * the page against the module (src/tools/analysis/doe.ts, lib/ie/factorial) and against NumPy/SciPy's literals (scripts/knowledge/cases-m6-analysis.py,
 * Montgomery's plasma etch, the record's bagger); the paper read back, blank as the run sheet and full as the report; the phone.
 *
 *   1  the question offered under its own heading; the factors refused in words (a high below the low); the run count said as it is made
 *   2  agreed: three factors, one run a corner — the first run said with its settings, the order kept, the blank run sheet on paper
 *   3  the runs made: three typed, five pasted in run order — Lenth's margin ±0.565 N, Temperature and Dwell real, Pressure not, the interaction read
 *      as two numbers (+2.85 and +4.85), the best settings (16.10 N, Pressure either) with no interval — page equal to the module
 *   4  a run struck leaves the experiment short and says which corner; restored, it is whole again
 *   5  two replicates (Montgomery's plasma etch): the analysis of variance — s 47.5 on 8 df, Gap and RF power real (p 0.0027, 1.2e-6), best settings with
 *      their 54.7 interval, the experiment's cost named missing then in pounds when packs and materials are given
 *   6  centre runs: a bend is looked for against their own spread, said either way
 *   7  on paper: the run sheet blank, then the report (the sentence, every effect, the runs with their responses, what was agreed)
 *   8  kept after a reload; the list's row; the phone — nothing off the side, the controls a thumb's size
 *
 * Fails on any console error.   node scripts/acceptance/doe.mjs      (SMOKE_BASE, as smoke) */
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

/* the record's bagger 2³, one run a corner, in standard order; Montgomery's plasma etch 2³, two runs a corner */
const BAG = [[10.2], [13.1], [11.0], [15.8], [10.6], [13.4], [11.5], [16.4]];
const ETCH = [[550, 604], [669, 650], [633, 601], [642, 635], [1037, 1052], [749, 868], [1075, 1063], [729, 860]];
const SEAL = [[10.1, 10.5], [13.2, 12.8], [11.4, 11.0], [15.9, 16.3]];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/same key/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

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
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};
const truth = id => page.evaluate(async sid => {
  const { getStudy } = await import('/src/db.ts'); const A = await import('/src/tools/analysis/analysis.ts');
  const s = await getStudy(sid); const a = s.agreed?.analysis; const f = A.analysisFigures(a, s.facts.readings ?? []); const said = A.analysisSays(f, a);
  return { said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v]), closing: A.analysisClosing(f, a, said).text, grids: A.analysisGrids(f, a).map(g => g.label), checks: f.checks.map(c => c.what), lanes: A.analysisPicture(f, a).length, seed: a.doe?.seed, done: f.done, balanced: f.balanced };
}, id);
/** The plan as stored: each run in the order to make it, with the corner it is (standard order) and the time it is run. */
const planOf = id => page.evaluate(async sid => { const { getStudy } = await import('/src/db.ts'); const D = await import('/src/tools/analysis/doe.ts'); const s = await getStudy(sid); return D.doePlan(s.agreed.analysis.doe).map(p => ({ no: p.no, std: p.std, rep: p.rep, centre: p.centre })); }, id);
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(say === t.said.text && t.tiles.every(([, v]) => tiles.includes(flat(String(v)))) && (await words('.ln-close'))?.includes(t.closing.slice(0, 25)), `${tag}: "${say?.slice(0, 150)}${say && say.length > 150 ? '…' : ''}" — the tiles and closing line as the module says them`);
};
const start = async what => {
  await go('#/analysis');
  await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
/** Agree a factorial: factors as [name, unit, low, high] rows. */
const agree = async ({ name, unit, factors, reps, centre, better, packs, mat }) => {
  await page.getByRole('radio', { name: /Which settings drive the result/ }).click();
  await page.getByLabel('What is measured').fill(name);
  if (unit) await page.getByLabel('Unit', { exact: false }).first().fill(unit);
  for (let i = 0; i < factors.length; i++) {
    if (i >= 2) await page.getByRole('button', { name: 'Add a factor' }).click();
    const [n, u, lo, hi] = factors[i];
    await page.getByLabel(`Factor ${i + 1} name`).fill(n); await page.getByLabel(`Factor ${i + 1} unit`).fill(u);
    await page.getByLabel(`Factor ${i + 1} low`).fill(String(lo)); await page.getByLabel(`Factor ${i + 1} high`).fill(String(hi));
  }
  await page.getByRole('radiogroup', { name: 'Times each corner is run' }).getByRole('radio', { name: String(reps), exact: true }).click();
  if (centre !== undefined) await page.getByRole('radiogroup', { name: 'Centre runs' }).getByRole('radio', { name: String(centre), exact: true }).click();
  if (better) await page.getByRole('radio', { name: better }).click();
  if (packs) { await page.locator('summary', { hasText: /What the experiment costs/ }).click(); await page.getByLabel('Packs one run makes').fill(String(packs)); await page.getByLabel('Materials a pack').fill(String(mat)); }
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(800);
};
/** Type the responses of runs from..to (1-based, in the order made) from a table of responses by corner and time. */
const typeRuns = async (plan, cells, from, to) => {
  for (let i = from - 1; i < to; i++) {
    const p = plan[i];
    await page.getByLabel(`Response of run ${p.no}`).fill(String(cells[p.std][p.rep - 1])); await page.getByLabel(`Response of run ${p.no}`).press('Enter'); await page.waitForTimeout(450);
  }
};
const pasteRuns = async (plan, cells, from) => {
  await page.getByLabel('Paste responses').fill(plan.slice(from - 1).map(p => cells[p.std][p.rep - 1]).join('\n'));
  await page.getByRole('button', { name: 'Add these responses' }).click(); await page.waitForTimeout(900);
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);

/* ---- 1 · the question, a refusal, the count ---- */
let bagger;
{
  bagger = await start('Tray sealer — seal strength');
  const heads = await all('.ie-qhead');
  ok(heads.includes('Where is it, and what drives it?'), `1 the questions under a fourth heading: ${heads.join(' · ')}`);
  const kinds = await all('[role=radiogroup][aria-label="What do you want to know?"] .ie-kind');
  ok(kinds.some(k => /^Which settings drive the result — and do they interact\?/.test(k)), `1 the question is among the others: ${kinds.length} offered`);
  await page.getByRole('radio', { name: /Which settings drive the result/ }).click();
  await page.getByLabel('What is measured').fill('Seal strength');
  ok(/2 to 5/.test((await words('.ie-problem')) ?? '') || /Every factor needs a name|low and a high/.test((await words('.ie-problem')) ?? ''), `1 no factors yet — refused, said why: "${await words('.ie-problem')}"`);
  await page.getByLabel('Factor 1 name').fill('Temperature'); await page.getByLabel('Factor 2 name').fill('Dwell');
  await page.getByLabel('Factor 1 low').fill('190'); await page.getByLabel('Factor 1 high').fill('170');
  await page.getByLabel('Factor 2 low').fill('0.8'); await page.getByLabel('Factor 2 high').fill('1.2');
  ok(/Temperature: the high setting has to be above the low one/.test((await words('.ie-problem')) ?? ''), `1 a high below the low — refused: "${await words('.ie-problem')}"`);
  ok(await page.getByRole('button', { name: 'Agree these' }).isDisabled(), '1 Agree held');
  ok((await page.getByRole('button', { name: 'Add a factor' }).count()) === 1 && (await page.getByLabel('Factor 3 name').count()) === 0, '1 two factors to start, a third on a tap');
  await page.getByLabel('Factor 1 low').fill('170'); await page.getByLabel('Factor 1 high').fill('190');
  ok(/8 runs in all, in a random order shuffled from \d+ and kept\./.test(flat(await page.locator('p.ie-wide').allInnerTexts().then(a => a.join(' ')))), '1 the runs counted as they are planned (two factors, two runs a corner by default)');
}

/* ---- 2 · the bagger agreed ---- */
{
  await page.getByRole('button', { name: 'Add a factor' }).click();
  await page.getByLabel('Factor 3 name').fill('Pressure'); await page.getByLabel('Factor 3 unit').fill('bar');
  await page.getByLabel('Factor 3 low').fill('3'); await page.getByLabel('Factor 3 high').fill('5');
  await page.getByLabel('Factor 1 unit').fill('°C'); await page.getByLabel('Factor 2 unit').fill('s');
  await page.getByLabel('Unit', { exact: false }).first().fill('N');
  await page.getByRole('radiogroup', { name: 'Times each corner is run' }).getByRole('radio', { name: '1', exact: true }).click();
  await page.getByRole('radio', { name: 'Higher is better' }).click();
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(800);
  const t = await truth(bagger);
  ok(t.said.verdict === 'Not started' && /^3 factors, 8 runs \(8 corners × 1\), in the random order below\. Make run 1 first — Temperature \d+ °C, Dwell [\d.]+ s, Pressure \d bar — then type the response\./.test((await words('.ie-say')) ?? ''), `2 agreed: "${(await words('.ie-say'))?.slice(0, 170)}"`);
  ok(new RegExp(`shuffled from ${t.seed} and is kept`).test((await all('.ie-more')).join(' ')), '2 the order is explained and its seed said');
  const sheet = await all('.ie-grid[aria-label="The runs, in the order to make them"] tbody tr');
  ok(sheet.length === 8, `2 the run sheet on the page: ${sheet.length} runs in a random order`, sheet[0]);
  const plan = await planOf(bagger);
  ok(plan.length === 8 && new Set(plan.map(p => p.std)).size === 8 && plan.some((p, i) => p.std !== i), `2 every corner once, not in standard order: ${plan.map(p => p.std + 1).join(' ')}`);
  ok(/Run 1 of 8: set Temperature \d+ °C, Dwell [\d.]+ s, Pressure \d bar/.test((await words('.ie-cap-box .ie-pad-hint')) ?? ''), `2 the entry says what to set: "${await words('.ie-cap-box .ie-pad-hint')}"`);
  const blank = await pdf('doe-blank.pdf');
  ok(/The runs, in the order to make them/i.test(blank) && /Response/.test(blank) && /Agreed: Seal strength — which settings drive it/.test(blank) && new RegExp(`shuffled from ${t.seed}`).test(blank), '2 the blank run sheet on paper: the runs in order, a column for the response, the seed');
}

/* ---- 3 · the runs made: typed, then pasted ---- */
{
  const plan = await planOf(bagger);
  await typeRuns(plan, BAG, 1, 3);
  ok(/Run 4 of 8/.test((await words('.ie-cap-box .ie-pad-hint')) ?? ''), `3 three runs typed — the fourth is next: "${await words('.ie-cap-box .ie-pad-hint')}"`);
  ok(/^3 of 8 runs done — the effects are worked out once every corner has the same number of readings/.test((await words('.ie-say')) ?? ''), `3 part-way: "${await words('.ie-say')}"`);
  await pasteRuns(plan, BAG, 4);
  const t = await truth(bagger);
  await sameAsModule(t, '3 the bagger');
  const say = await words('.ie-say');
  ok(t.said.verdict === 'Temperature and Dwell matter' && /Temperature from 170 °C to 190 °C changes it by \+3\.85 N \(beyond Lenth’s margin ±0\.565 N, and beyond the simultaneous ±1\.351 N\)/.test(say ?? ''), '3 Temperature and Dwell real by Lenth’s margin ±0.565 N (NumPy: PSE 0.15, t(0.975, 7/3) 3.767)');
  ok(/Pressure is not shown to matter in these ranges — leave it where it is cheapest/.test(say ?? ''), '3 Pressure not shown to matter, said as the floor would');
  const more = (await all('.ie-more')).join(' | ');
  ok(/Temperature changes Seal strength by \+2\.85 N at Dwell 0\.8 s and by \+4\.85 N at 1\.2 s — and more at the higher setting — they reinforce each other/.test(more), '3 the interaction read as two numbers');
  ok(/Temperature high \(190 °C\), Dwell high \(1\.2 s\), Pressure either — expected 16\.10 N \(no error estimate to put an interval on\)/.test(more), '3 the best settings, with no interval where there is no error estimate');
  ok(/The experiment itself: 8 runs\. Give the packs a run makes and what a pack’s materials cost/.test(more), '3 the experiment’s cost named missing, not invented');
  ok((await page.locator('.ie-strip .ln-tile').count()) === 5 && t.lanes === 7 && (await page.locator('.ie-an-pic g').count()) >= 7, '3 five tiles; the picture a lane an effect on a zero line, with its margin');
  ok(JSON.stringify(t.grids) === JSON.stringify(['Every effect — against Lenth’s margin ±0.565', 'The runs, in the order they were made']), `3 the tables: ${t.grids.join(' · ')}`);
  const effects = await all('.ie-grid[aria-label^="Every effect"] tbody tr');
  ok(/^Temperature \+3\.85 .* yes$/.test(effects[0]) && /^Pressure/.test(effects.find(r => /^Pressure /.test(r)) ?? '') && /^Temperature × Dwell \+1\.00/.test(effects[2]), `3 every effect, the largest first: ${effects.slice(0, 3).join(' | ')}`);
  ok((await all('.ie-check')).some(c => /^Error: one reading at each corner gives no estimate of the noise/.test(c)) && (await all('.ie-check')).some(c => /^Curvature: with no centre runs/.test(c)), '3 the checks: no error estimate, no centre runs — both said');
}

/* ---- 4 · struck, restored ---- */
{
  await page.locator('.ie-readings summary').click();
  await page.getByRole('button', { name: 'Strike reading 3' }).click(); await page.waitForTimeout(600);
  const say = (await words('.ie-say')) ?? '';
  ok(/^7 of 8 runs done .* Short: /.test(say), `4 a run struck — the experiment is short: "${say.slice(0, 150)}"`);
  await page.getByRole('button', { name: 'Restore reading 3' }).click(); await page.waitForTimeout(600);
  const t = await truth(bagger); await sameAsModule(t, '4 restored');
}

/* ---- 5 · two replicates: the analysis of variance (Montgomery's plasma etch) ---- */
let etch;
{
  etch = await start('Plasma etch');
  await agree({ name: 'Etch rate', unit: 'Å/min', factors: [['Gap', 'cm', 0.8, 1.2], ['Gas flow', 'sccm', 125, 200], ['RF power', 'W', 275, 325]], reps: 2, better: 'Higher is better' });
  const plan = await planOf(etch);
  ok(plan.length === 16 && [0, 1, 2, 3, 4, 5, 6, 7].every(c => plan.filter(p => p.std === c).length === 2), '5 sixteen runs, every corner twice');
  ok(/16 runs/.test((await words('.ie-say')) ?? ''), '5 the plan said: sixteen runs');
  await pasteRuns(plan, ETCH, 1);
  const t = await truth(etch); await sameAsModule(t, '5 the plasma etch');
  const say = await words('.ie-say');
  ok(t.said.verdict === 'Gap and RF power matter' && /RF power from 275 W to 325 W changes it by \+306\.1 Å\/min \(95% between \+251\.4 and \+360\.8 Å\/min; p < 0\.0001\)/.test(say ?? '') && /Gap from 0\.8 cm to 1\.2 cm changes it by −101\.6 Å\/min \(95% between −156\.3 and −46\.9 Å\/min; p = 0\.0027\)/.test(say ?? ''), '5 the analysis of variance as SciPy prints it (SE 23.7306, t 12.9, p 1.23e-6; A p 0.00267861)');
  ok(/Gas flow is not shown to matter/.test(say ?? ''), '5 Gas flow not shown to matter');
  const more = (await all('.ie-more')).join(' | ');
  ok(/s = 47\.5 Å\/min on 8 degrees of freedom; each effect is known to ±23\.7 Å\/min/.test(more) && /Gap changes Etch rate by \+52\.0 Å\/min at RF power 275 W and by −255\.3 Å\/min at 325 W — in opposite directions/.test(more), '5 the noise from the replicates themselves; the interaction in opposite directions (+52.00, −255.25)');
  ok(/Gap low \(0\.8 cm\), Gas flow either, RF power high \(325 W\) — expected 1056\.8 Å\/min, 95% between 1002\.0 and 1111\.5 Å\/min/.test(more) && /accounts for 96% of all the variation/.test(more), '5 the best settings with their interval (±54.72) and the share explained (0.96075)');
  ok((await page.locator('details.ie-grid[aria-label^="The runs"]').count()) === 0 && (await all('.ie-grid[aria-label^="The runs"] tbody tr')).length === 16, '5 the sixteen runs listed with their responses');
  ok(/The experiment itself: 16 runs\. Give the packs a run makes and what a pack’s materials cost/.test(more), '5 the cost named missing');
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.locator('summary', { hasText: /What the experiment costs/ }).click(); await page.getByLabel('Packs one run makes').fill('200'); await page.getByLabel('Materials a pack').fill('0.12');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(800);
  ok(/16 runs × 200 packs × £0\.12 materials = £384 of product/.test((await all('.ie-more')).join(' | ')), '5 the experiment’s cost in pounds once packs and materials are given (16 × 200 × £0.12 = £384)');
  const after = await planOf(etch); ok(JSON.stringify(after) === JSON.stringify(plan), '5 re-agreeing keeps the run order (the seed is kept)');
}

/* ---- 6 · centre runs and curvature ---- */
let seal;
{
  seal = await start('Seal 2² with centre runs');
  await agree({ name: 'Seal strength', unit: 'N', factors: [['Temperature', '°C', 170, 190], ['Dwell', 's', 0.8, 1.2]], reps: 2, centre: 3, better: 'Higher is better' });
  const plan = await planOf(seal);
  ok(plan.length === 11 && plan.filter(p => p.centre).length === 3, `6 eleven runs: eight corners’ worth and three at the centre — ${plan.map(p => (p.centre ? 'C' : p.std + 1)).join(' ')}`);
  const centre = [12.9, 13.0, 15.5];
  let c = 0;
  for (const p of plan) {
    const v = p.centre ? centre[c++] : SEAL[p.std][p.rep - 1];
    await page.getByLabel(`Response of run ${p.no}`).fill(String(v)); await page.getByLabel(`Response of run ${p.no}`).press('Enter'); await page.waitForTimeout(400);
  }
  const t = await truth(seal); await sameAsModule(t, '6 the seal with centre runs');
  const curv = (await all('.ie-check')).find(c2 => /^Curvature:/.test(c2)) ?? '';
  ok(/^Curvature: the centre runs average 13.80 against 12.65 at the corners \(F [\d.]+ on 1 and 2, p = [\d.]+\) — (the result bends between the two levels|no sign of a bend)/.test(curv), `6 the bend looked for against the centre runs’ own spread: "${curv.slice(0, 190)}"`);
  ok(/Temperature, Dwell|Temperature and Dwell/.test(t.said.verdict + (await words('.ie-say'))), '6 the effects still read from the corners');
}

/* ---- 7 · on paper ---- */
{
  await go(`#/analysis/${etch}`);
  const text = await pdf('doe-etch.pdf');
  const t = await truth(etch);
  ok(/Gap and RF power matter/.test(text) && /Every effect — 95% intervals/i.test(text) && /The runs, in the order they were made/i.test(text) && /RF power \+306\.1/.test(text), '7 the report: the verdict, every effect, the runs');
  ok(/Agreed: Etch rate — which settings drive it in Å\/min, Gap 0\.8–1\.2 cm, Gas flow 125–200 sccm, RF power 275–325 W; every corner run 2 times/.test(text) && new RegExp(`shuffled from ${t.seed}`).test(text), '7 what was agreed, in words, with the seed');
  ok(/Every run, in the order taken/i.test(text) && /Run 1 · Gap/.test(text), '7 every reading worded with its run and settings');
  ok(/Settings the fitted model puts best \(higher is better\)/.test(text) && /s = 47\.5 Å\/min on 8 degrees of freedom/.test(text), '7 the settings and the noise are on the paper, as on the screen');
}

/* ---- 8 · kept, the list, the phone ---- */
{
  await go(`#/analysis/${bagger}`);
  const t = await truth(bagger); await sameAsModule(t, '8 after a reload');
  await go('#/analysis');
  const row = flat(await page.locator(`.lt-li[data-study="${bagger}"]`).innerText());
  ok(/which settings drive it/.test(row) && /Temperature and Dwell matter/.test(row) && /8 runs/.test(row), '8 the list’s row: its question, verdict and what was made', row);
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/analysis/${etch}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: nothing off the side');
  await go(`#/analysis/${seal}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: the experiment with centre runs fits too');
  const fresh = await start('Phone check');
  await page.getByRole('radio', { name: /Which settings drive the result/ }).click();
  const small = await page.evaluate(() => [...document.querySelectorAll('.ie-doe-fs button, .ie-doe-fs input, .ie-qgroups button')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? e.textContent?.slice(0, 20)} ${Math.round(e.getBoundingClientRect().height)}px`));
  ok(small.length === 0, '8 the phone: the factor boxes and the questions a thumb’s size', small.slice(0, 4).join(' | '));
  void fresh;
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
