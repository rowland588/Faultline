/* FC-112 — OPTIMISING SETTINGS (the response surface), driven (knowledge/specs/FC-112-response-surface.md, acceptance criteria 1–8; 1 November 2026): two or three
 * factors, a central composite or Box–Behnken design, the run sheet in a shuffled order, the response typed as each run is made; a quadratic fitted, its stationary
 * point and nature, the best setting only inside what was run, a confirmation run. Held to the module (src/tools/rsm/rsm.ts), to the knowledge record's frozen
 * 13-run case and to the second implementation's literals (scripts/knowledge/cases-t8-3.py — plain Gauss–Jordan least squares).
 *
 *   1  the hub and the list: Optimising settings as a card, "New optimisation" the one primary, the empty list says what to do, ?add=1 opens the sheet
 *   2  the record's 13-run case opened — R² 0.963, adjusted 0.936, predicted 0.875; lack of fit F 0.64; the best setting 56.03 a minute and 21.54 °C, 1.08 g
 *   3  an optimisation made through New optimisation: the factors, a face-centred design, the run sheet made (13 runs, a response box each), the responses typed —
 *      too few said in words, then the surface follows
 *   4  what is wanted turned the other way: the stationary point is the wrong kind and the edge is given
 *   5  a minimum outside what was run: not quoted, the best on the edge, "move the box and run again"
 *   6  a confirmation run: inside the prediction interval confirms, outside does not
 *   7  the run sheet made again — the earlier runs gone, said, Undo bringing them back
 *   8  the paper, read back; kept after a reload; the list row; a client changes nothing; the phone
 *
 * Fails on any console error.   node scripts/acceptance/rsm.mjs      (SMOKE_BASE, as smoke) */
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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const settle = () => page.waitForTimeout(900);   /* the register saves a moment after the last key */
const cardOf = i => page.locator('section.fm-card').nth(i);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const lineId = sd.wsId;
const example = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.find(d => d.key === 'rsm').examples[0]);


const savedStudy = (name, rows, setup, extra = {}) => page.evaluate(async ([name, rows, lineId, setup, extra]) => {
  const { putStudy } = await import('/src/db.ts'); const { SCORED } = await import('/src/tools/scored/registry.ts'); const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const s = newScoredStudy(SCORED.find(d => d.key === 'rsm'), { name, workspaceId: lineId, now: Date.now(), ...extra }); s.agreed.scored.rows = rows; s.agreed.scored.rsm = setup; await putStudy(s); return s.id;
}, [name, rows, lineId, setup, extra]);
const truth = id => page.evaluate(async sid => {
  const { getStudy, listAllStudies } = await import('/src/db.ts'); const { studyScored } = await import('/src/tools/scored/scored.ts');
  const s = await getStudy(sid); const x = studyScored(s, { studies: await listAllStudies() });
  return { sentence: x?.result?.sentence, verdict: x?.result?.verdict, closing: x?.result?.closing, tiles: x?.result?.tiles.map(t => [t.k, t.v, t.of]), problems: x?.problems, rows: s.agreed.scored.rows, setup: s.agreed.scored.rsm };
}, id);
const openDesign = async () => { if (!(await page.locator('details.fm-more').first().evaluate(d => d.open))) await page.locator('details.fm-more > summary').first().click(); };
const runCard = i => page.locator('li.rs-run').nth(i);
const respond = async (i, v) => { await runCard(i).getByLabel(`Response of run ${i + 1}`).fill(String(v)); };
/* a smooth surface with a little deterministic noise, so the fit has something to say about its own error */
const surface = (x, n) => 1.1 + 0.1 * x[0] - 0.07 * x[1] + 0.23 * x[0] ** 2 + 0.13 * x[1] ** 2 + 0.04 * x[0] * x[1] + [0.02, -0.03, 0.01, -0.02, 0.03, -0.01, 0.02, -0.02, 0.01, -0.03, 0.02, 0, -0.01][n % 13];

/* ---- 1 · the hub and the list ---- */
{
  await go('#/scored');
  ok((await all('.pl-tool-card')).some(c => /^Optimising settings/.test(c)), '1 Optimising settings is a card on the Scored registers hub');
  await go('#/scored/rsm');
  ok(/^Optimising settings$/.test((await words('.part-head .pace-title')) ?? '') && /^New optimisation$/.test((await words('.pace-head-actions .btn-primary')) ?? ''), '1 the list: Optimising settings, New optimisation the one primary');
  ok(/No optimisation yet/.test((await words('.qsl-empty')) ?? ''), '1 the empty list says what to do');
  await go(`#/scored/rsm?project=${sd.projectId}&add=1`);
  ok((await page.locator('.lt-new').count()) === 1, '1 ?add=1 opens the sheet at once, in the project');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});
}

/* ---- 2 · the record's 13-run case ---- */
let worked;
{
  worked = await savedStudy('Filler give-away — speed and temperature', example.rows, example.rsm);
  const t = await truth(worked);
  ok(t.verdict === 'Best 1.08 g', `2 the module reads the 13 runs: ${t.verdict}`);
  await go(`#/scored/rsm/${worked}`);
  ok((await words('.ie-says')) === t.sentence && /13 runs of 13 fitted to 6 terms\. R² 0\.963, adjusted 0\.936, predicted 0\.875; the whole model p < 0\.0001\./.test(t.sentence), `2 the sentence is the module's: "${t.sentence.slice(0, 130)}"`);
  ok(/Lack of fit F 0\.64, p 0\.63 — no sign the quadratic is wrong\./.test(t.sentence), '2 lack of fit F 0.64, p 0.63 — the record’s and the second implementation’s figure');
  ok(/Filler speed 56\.03 a minute, Product temperature 21\.54 °C — a minimum, 0\.41 from the centre against 1\.41 run, inside what was run; predicted 1\.08 g\./.test(t.sentence), '2 the stationary point 56.03 a minute and 21.54 °C, a minimum, 0.41 of 1.41, 1.08 g — as cases-t8-3.py prints it');
  ok(/the mean is 1\.08 ± 0\.0585 g \(95%\) and a single run 0\.146 g either side/.test(t.sentence), '2 the intervals: ± 0.0585 for the mean, 0.146 for a single run');
  const tiles = await all('.ln-tiles .ln-tile');
  ok(t.tiles.length === 5 && t.tiles.every(([k, v], i) => tiles[i]?.toLowerCase().includes(k.toLowerCase()) && tiles[i]?.includes(v)), `2 five tiles as the module says: ${tiles.join(' | ')}`);
  ok(((await words('.ln-close')) ?? '').includes(t.closing) && /^Best 1\.08 g — 13 runs of 13, R² 0\.963 \(predicted 0\.875\)\.$/.test(t.closing), `2 the closing line: ${t.closing}`);
  ok((await page.locator('li.rs-run').count()) === 13 && (await runCard(0).getByLabel('Response of run 1').inputValue()) === '1.483', '2 a card each run, its response in a box');
  ok(/Run 1 · Filler speed 45 a minute, Product temperature 15 °C → 1\.483 g/.test((await all('.ln-panel li, .ie-caveats li')).join(' | ')), '2 the runs listed in natural units, as they were made');
}

/* ---- 3 · an optimisation made through New optimisation ---- */
let made;
{
  await go('#/scored/rsm');
  await page.getByRole('button', { name: 'New optimisation' }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel('What is being optimised?').fill('Sealer — temperature and dwell');
  await page.locator('.lt-new select').selectOption(lineId);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1500);
  made = decodeURIComponent(page.url().split('/scored/rsm/')[1]?.split('?')[0] ?? '');
  ok(made.length > 8, '3 New optimisation opens the page');
  ok(/The factors — two or three/.test((await words('[role=alert]')) ?? '') && (await page.locator('[data-factor]').count()) === 2, '3 nothing set: the page says what to set, two factor rows waiting');
  await page.getByLabel('Factor 1', { exact: true }).fill('Seal temperature'); await page.getByLabel('Unit of factor 1').fill('°C');
  await page.getByLabel('Low of factor 1').fill('160'); await page.getByLabel('High of factor 1').fill('180');
  await page.getByLabel('Factor 2', { exact: true }).fill('Dwell'); await page.getByLabel('Unit of factor 2').fill('s');
  await page.getByLabel('Low of factor 2').fill('0.5'); await page.getByLabel('High of factor 2').fill('1.1');
  await page.getByLabel('The response', { exact: true }).fill('Seal strength'); await page.getByLabel('The response unit').fill('N');
  await page.getByLabel('What is wanted').selectOption('max'); await settle();
  ok(/13 runs \(central composite, face-centred, 5 at the centre\)/.test((await words('details.fm-more')) ?? ''), '3 the design says its run count: 13 — 4 corners, 4 faces, 5 at the centre');
  await page.getByRole('button', { name: 'Make the run sheet' }).click(); await page.waitForTimeout(1200);
  ok((await page.locator('li.rs-run').count()) === 13, '3 the run sheet made: 13 runs, a response box each');
  const t0 = await truth(made);
  ok(t0.rows.length === 13 && t0.rows.filter(r => r.run.x.every(v => v === 0)).length === 5 && t0.setup.seed >= 1, '3 five of the 13 are centre runs; the order is the design shuffled from a stored seed');
  const c0 = await runCard(0).innerText();
  ok(/Seal temperature (160|170|180) °C, Dwell (0\.5|0\.8|1\.1) s/i.test(c0), '3 each run in natural units: "Seal temperature 170 °C, Dwell 0.8 s"', c0 + ' | ' + (await page.locator('li.rs-run').first().innerHTML()).slice(0, 400));
  ok(/6 terms|The factors|Type the response|have a response/.test((await words('[role=alert]')) ?? ''), '3 no responses: the page says how many runs have one');
  for (let i = 0; i < 5; i++) await respond(i, surface(t0.rows[i].run.x, i).toFixed(3));
  await settle();
  ok(/5 of 13 runs have a response\. 5 runs with a response — a 2-factor quadratic has 6 terms and needs at least 7\./.test((await words('[role=alert]')) ?? ''), `3 five typed: too few, said in words — "${await words('[role=alert]')}"`);
  for (let i = 5; i < 13; i++) await respond(i, surface(t0.rows[i].run.x, i).toFixed(3));
  await settle();
  const t = await truth(made);
  ok((await words('.ie-says')) === t.sentence && /13 runs of 13 fitted to 6 terms/.test(t.sentence), `3 all thirteen typed through the real boxes: the page’s sentence is the module’s — "${t.sentence.slice(0, 110)}"`);
  ok(/Seal temperature \d+(\.\d+)? °C, Dwell [\d.]+ s/.test(t.sentence) && !/NaN|undefined/.test(t.sentence), '3 the best setting is said in the settings’ own units');
}

/* ---- 4 · what is wanted, turned the other way ---- */
{
  const before = (await truth(made)).sentence;
  await openDesign();
  await page.getByLabel('What is wanted').selectOption(before.includes('a minimum') ? 'max' : 'min'); await settle();
  const t = await truth(made);
  ok((await words('.ie-says')) === t.sentence && /not the (largest|smallest|maximum|minimum) wanted|beyond the/.test(t.sentence), '4 with the other thing wanted, the stationary point is the wrong kind or beyond the runs: the edge of the region is given');
  await page.getByLabel('What is wanted').selectOption('max'); await settle();
}

/* ---- 5 · outside the region ---- */
{
  const f = x => 1 - 1.18 * x[0] - 0.213 * x[1] + 0.2 * x[0] ** 2 + 0.15 * x[1] ** 2;
  const rows = example.rows.map(r => ({ ...r, run: { x: r.run.x, y: f(r.run.x) } }));
  const out = await savedStudy('A minimum outside the runs', rows, example.rsm);
  const t = await truth(out);
  await go(`#/scored/rsm/${out}`);
  ok(t.verdict === 'Beyond the runs' && (await words('.ie-says')) === t.sentence, `5 a minimum at radius 3.03 against the 1.41 run: "${t.verdict}"`);
  ok(/beyond the 1\.41 that was run, so it is not quoted/.test(t.sentence) && /move the box and run again/.test(t.sentence), '5 not quoted — the best inside what was run is given on its edge, and the page says to move the box and run again');
  ok(!/2\.95|1\.18/.test(t.sentence.split('beyond')[0]), '5 the setting 2.95 is never printed');
}

/* ---- 6 · the confirmation run ---- */
{
  await go(`#/scored/rsm/${worked}`);
  await page.getByLabel('Confirmation run').fill('1.1'); await settle();
  let t = await truth(worked);
  ok(t.verdict === 'Confirmed' && /is inside the prediction interval 0\.936 to 1\.23 g — the model holds at that setting/.test(t.sentence) && /Confirmed — /.test((await words('.ln-close')) ?? ''), '6 1.10 g against the interval 0.936 to 1.23: Confirmed', `${t.verdict} | ${t.sentence.slice(-200)} | ${await words('.ln-close')}`);
  await page.getByLabel('Confirmation run').fill('1.4'); await settle();
  t = await truth(worked);
  ok(t.verdict === 'Not confirmed' && /do not adopt the setting/.test(t.sentence) && /Not confirmed — /.test((await words('.ln-close')) ?? ''), '6 1.40 g is outside it: Not confirmed, do not adopt the setting');
  await page.getByLabel('Confirmation run').fill(''); await settle();
}

/* ---- 7 · the run sheet made again ---- */
{
  await go(`#/scored/rsm/${made}`);
  await openDesign();
  await page.getByRole('button', { name: 'Make the run sheet again' }).click(); await page.waitForTimeout(1200);
  ok((await page.locator('li.rs-run').count()) === 13 && (await runCard(0).getByLabel('Response of run 1').inputValue()) === '' && /The run sheet was made again — the earlier runs and their responses are gone\./.test((await all('[role=status]')).join(' ')), '7 made again: new runs, no responses, said');
  await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1200);
  ok((await runCard(0).getByLabel('Response of run 1').inputValue()) !== '' && /13 runs of 13 fitted/.test((await words('.ie-says')) ?? ''), '7 Undo brings the earlier runs and their responses back');
}

/* ---- 8 · on paper, kept, the list row, a client, the phone ---- */
{
  await go(`#/scored/rsm/${worked}`);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, 'rsm.pdf'); await d.saveAs(f);
  const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
  const t = await truth(worked);
  ok(text.includes(t.sentence.slice(0, 80)) && /Optimising settings/.test(text) && /Best 1\.08 g/.test(text), '8 the paper carries the band and the sentence');
  ok(/Term \(coded units\)/.test(text) && /Filler speed²/.test(text) && /Product temperature/.test(text) && /Filler speed × Product temperature/.test(text) && /1\.107/.test(text), '8 the coefficients with their standard errors, t and p');
  ok(/The runs, in the order to make them/.test(text) && /Run 8 · Filler speed 81\.21 a minute/.test(text), '8 the runs listed, in natural units');
  ok(/Give the packs a run uses and the materials a pack/.test(text) && /What this does not say/i.test(text) && /parabola with no physics/.test(text), '8 the money named missing, and what it does not say');
  await go(`#/scored/rsm/${made}`);
  ok((await page.locator('li.rs-run').count()) === 13 && (await page.getByLabel('Factor 1', { exact: true }).inputValue()) === 'Seal temperature', '8 kept after a reload');
  await go('#/scored/rsm');
  const row = flat(await page.locator(`.lt-li[data-study="${worked}"]`).innerText());
  ok(/Best 1\.08 g/.test(row) && /13 runs of 13 fitted/.test(row), '8 the list’s row says the verdict and the fit', row);
  const cid = await savedStudy('A client reads', example.rows, example.rsm, { projectId: sd.projectId });
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/scored/rsm/${cid}`);
  const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('.fm input, .fm select, .fm textarea')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('.fm button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
  ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('Give-away: 13 runs'), `8 a client sees the surface and the answer and changes nothing (${JSON.stringify({ ...ro, says: ro.says.slice(0, 20) })})`);
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/scored/rsm/${worked}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: nothing off the side');
  const small = await page.evaluate(() => [...document.querySelectorAll('.rs-run input, .rs-run button, .rs-sheet input, .rs button, .rs select')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? ''}`));
  ok(small.length === 0, '8 the phone: every box and button a thumb’s size', small.slice(0, 4).join(' | '));
  ok((await page.evaluate(() => [...document.querySelectorAll('.rs-run, .rs-factor')].every(g => g.getBoundingClientRect().right <= 392))), '8 the phone: each run and each factor row fits the screen');
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
