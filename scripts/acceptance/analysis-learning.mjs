/* W3c — HOW FAST IS A NEW JOB BEING LEARNED, driven (knowledge/specs/FC-027-learning.md, acceptance criteria 3–5; 25 October 2026): Wright's unit-time
 * curve fitted to the time of each run in the order timed — the rate with its interval, the run the standard arrives at, the average to plan at, the labour
 * of learning in money. On screen against the module, on paper read back, on a phone. The independent figures are SciPy's (scripts/knowledge/cases-w3c.py).
 *
 *   1  the record's eight runs pasted: the sentence, the tiles, the curve and the standard drawn; too few said at four; the standard changed and the run moving
 *   2  a curve that flattens above the standard — amber, the method or the station; a standard already met — green
 *   3  money: the units of work in a run and the line's wage — each missing one named; pounds on a line with a wage
 *   4  kept after a reload; the list; the ten questions
 *   5  on paper; the phone
 *
 * Fails on any console error.   node scripts/acceptance/analysis-learning.mjs      (SMOKE_BASE, as smoke) */
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
const RUNS = [68, 58, 53, 49, 47, 45, 44, 43], FLAT = [68, 58, 53, 49, 47, 46, 46, 46, 46, 46, 46, 46];

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
/* the line's wage, as the page reads it (useLine → labourRatePerHour × on-costs for one person) */
const truth = id => page.evaluate(async sid => {
  const { getStudy, getWorkspace } = await import('/src/db.ts'); const A = await import('/src/tools/analysis/analysis.ts'); const C = await import('/src/lib/cost.ts');
  const s = await getStudy(sid); const a = s.agreed?.analysis; const line = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
  const rate = line?.labourRatePerHour && line.labourRatePerHour > 0 ? C.labourPerHour({ crew: 1, labourRatePerHour: line.labourRatePerHour, labourBurden: line.labourBurden }) : undefined;
  const f = A.analysisFigures(a, s.facts.readings ?? [], { rate }); const said = A.analysisSays(f, a);
  return { a, rate, said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: A.analysisClosing(f, a, said).text, plot: A.analysisPlot(f, a) ? { curve: A.analysisPlot(f, a).curve?.length, hline: A.analysisPlot(f, a).hline } : null };
}, id);
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(([k, v]) => tiles.includes(flat(String(v))));
  ok(say === t.said.text && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)), `${tag}: "${say?.slice(0, 150)}${say && say.length > 150 ? '…' : ''}" — the tiles and closing line as the module says them`);
};
const start = async what => {
  await go('#/analysis');
  await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByLabel(/On which machine/).fill('Hand-pack station');
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
const agreeIt = async () => { await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700); };
const reagree = async fn => { await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300); await fn(); await agreeIt(); };
const learnAgree = async ({ name, unit = 's', standard, noun, perRun }) => {
  await page.getByRole('radio', { name: /How fast is a new job being learned/ }).click();
  await page.getByLabel('What is measured').fill(name); await page.getByLabel('Unit', { exact: false }).first().fill(unit);
  if (standard !== undefined) await page.getByLabel('Standard', { exact: true }).fill(String(standard));
  if (noun !== undefined) await page.getByLabel('What each reading is', { exact: true }).fill(noun);
  if (perRun !== undefined) await page.getByLabel('Units in a run', { exact: true }).fill(String(perRun));
  await agreeIt();
};
const pasteReadings = async vals => { await page.getByLabel('Or paste readings — a number to a line, or spaced', { exact: true }).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(600); };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · the record's eight runs ---- */
let eight, flatS, metS;
{
  eight = await start('New starter on the tray pack');
  await page.waitForSelector('.ie-kind'); await page.waitForTimeout(300);
  const kinds = await all('[role=radiogroup][aria-label="What do you want to know?"] .ie-kind');
  ok(kinds.length === 10 && /^How fast is a new job being learned/.test(kinds[9]), `1 the tenth question offered after the nine: ${kinds.map(k => k.split('?')[0].slice(0, 28)).join(' · ')}`);
  await page.getByRole('radio', { name: /How fast is a new job being learned/ }).click();
  await page.getByLabel('What is measured').fill('Seconds a pack, new starter'); await page.getByLabel('Standard', { exact: true }).fill('-3');
  ok(/^The standard it is heading for — a time above 0/.test((await words('.ie-problem')) ?? '') && (await page.getByRole('button', { name: 'Agree these' }).isDisabled()), '1 a standard of less than 0 refused, Agree held');
  await page.getByLabel('Standard', { exact: true }).fill('40'); await page.getByLabel('Units in a run', { exact: true }).fill('2.5');
  ok(/^Units in a run — a whole number/.test((await words('.ie-problem')) ?? ''), '1 a run of two and a half units refused');
  await page.getByLabel('Units in a run', { exact: true }).fill(''); await page.getByLabel('Unit', { exact: false }).first().fill('s'); await agreeIt();
  ok((await words('.ie-agreed b')) === 'Seconds a pack, new starter in s — how fast it is learning, to a standard of 40 s · 95% confidence', `1 agreed: "${await words('.ie-agreed b')}"`);
  ok(/^Type or paste the time of each run in the order timed/.test((await words('.ie-say')) ?? ''), '1 nothing typed — it says how to start');
  await pasteReadings(RUNS.slice(0, 4));
  ok(/^4 runs — a curve is fitted from 6, spanning a doubling or two\./.test((await words('.ie-say')) ?? '') && /Too few/.test((await words('.ln-band')) ?? ''), '1 four runs: too few, said');
  await pasteReadings(RUNS.slice(4));
  const t = await truth(eight);
  ok(t.said.verdict === 'Standard at run 11' && t.said.tone === 'n', '1 the record: the 40 s standard arrives at run 11');
  await sameAsModule(t, '1 the eight runs');
  ok(t.said.text.includes('learning at 85.6% a doubling (we can be 95% confident between 85.0% and 86.3%; R² 0.998)') && t.said.text.includes('The 40 s standard arrives at run 11. Plan the first 8 runs at about 50.9 s'), '1 as SciPy says it (b −0.22394, rate 0.85622, 0.84972 to 0.86278, R² 0.99759, n* 10.47, mean 50.875)');
  ok(/time at run n = 67\.7 s × n\^−0\.224/.test((await all('.ie-more')).join(' ')) && /At run 16 it gives 36\.4 s, at 32 31\.1 s/.test((await all('.ie-more')).join(' ')), '1 the curve and its projections (36.38, 31.15)');
  ok((await page.locator('.ie-an-scatter .ie-an-dot').count()) === 8 && (await page.locator('.ie-an-scatter polyline.ie-an-fit').count()) === 1 && (await page.locator('.ie-an-scatter .ie-an-fit.is-equal').count()) === 1, '1 the picture: eight runs, the fitted curve, the standard as a level');
  ok(/Standard arrives\s*run 11/i.test(flat(await page.locator('.ie-strip').innerText())) || /run 11/.test(flat(await page.locator('.ie-strip').innerText())), '1 the tile says run 11');
  await reagree(async () => { await page.getByLabel('Standard', { exact: true }).fill('46'); });
  let t2 = await truth(eight);
  ok(t2.said.verdict === 'Standard met at run 6' && t2.said.tone === 'g' && (await page.locator('.ie-say.is-g').count()) === 1, '1 a standard of 46 s: already met at run 6 — green');
  await sameAsModule(t2, '1 …standard 46');
  await reagree(async () => { await page.getByLabel('Standard', { exact: true }).fill('42'); });
  t2 = await truth(eight);
  ok(t2.said.verdict === 'Standard at run 9' && (await words('.ie-say'))?.includes('The 42 s standard arrives at run 9.'), `1 a standard of 42 s: the run moves from 11 to 9 — "${t2.said.verdict}"`);
  await reagree(async () => { await page.getByLabel('Standard', { exact: true }).fill('40'); await page.getByLabel('What each reading is', { exact: true }).fill('Day'); });
  ok(/each time the days double/.test((await words('.ie-say')) ?? ''), '1 a run called a day: the words follow');
  await reagree(async () => { await page.getByLabel('What each reading is', { exact: true }).fill('run'); });
}

/* ---- 2 · a curve that flattens ---- */
{
  flatS = await start('New product, flattening');
  await learnAgree({ name: 'Seconds a pack, new product', standard: 40 });
  await pasteReadings(FLAT);
  const t = await truth(flatS);
  ok(t.said.verdict === 'Flattening above the standard' && t.said.tone === 'a' && (await page.locator('.ie-say.is-a').count()) === 1 && /the method or the station limits it, not the person — redesign, not more practice/.test(t.said.text), '2 the series stuck at 46 s: amber, the method or the station, not the person');
  await sameAsModule(t, '2 flattening');
  /* a time that is not falling */
  const rising = await start('A series that does not fall');
  await learnAgree({ name: 'Seconds a pack', standard: 40 });
  await pasteReadings([50, 51, 50, 52, 51, 53, 52, 54]);
  ok((await words('.ln-band'))?.includes('Not reaching the standard') && (await page.locator('.ie-say.is-a').count()) === 1, '2 a series that is not falling does not reach the standard by learning — amber');
}

/* ---- 3 · money ---- */
{
  metS = await start('Launch crew, money');
  await learnAgree({ name: 'Seconds a pack, launch crew', standard: 40 });
  await pasteReadings(RUNS);
  ok(/In money: give the units of work in a run to say the learning in money\./.test((await all('.ie-more')).join(' ')) && /give the units of work in a run to say the learning in money/.test(flat(await page.locator('.ie-strip').innerText())), '3 no units of work in a run: named, nothing blocked');
  await reagree(async () => { await page.getByLabel('Units in a run', { exact: true }).fill('60'); });
  ok(/take(s)? about 1\.5 hours of extra time over the 11 runs — give the line a wage to say the learning in money\./.test((await all('.ie-more')).join(' ')), '3 sixty packs a run and no wage: the hours said, the wage named');
  /* the study put on Line 7, whose wage is £14.50 × 1.3 on-costs */
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const ws = (await db.listWorkspaces()).find(w => w.labourRatePerHour > 0); await db.patchStudy(id, { workspaceId: ws.id }); }, metS);
  await page.reload(); await page.waitForTimeout(2500);
  const t = await truth(metS);
  ok(t.rate > 18 && t.rate < 19 && /£\d+ of labour at the line’s rate, because of the time over the standard\./.test(t.said.more.join(' ')), `3 on a line with a wage: pounds with the because — "${t.said.more.at(-1)?.slice(0, 160)}"`);
  await sameAsModule(t, '3 in money');
  ok(/£28 of labour/.test(t.said.more.join(' ')) && /£28/.test(flat(await page.locator('.ie-strip').innerText())) && /£28 of labour/.test((await all('.ie-more')).join(' ')), '3 88.77 s over the standard a unit × 60 packs a run = 1.48 hours × £18.85 an hour = £28, in the sentence and the tile', t.said.more.join(' ').slice(-200));
}

/* ---- 4 · kept; the list ---- */
{
  const before = await truth(eight);
  await go(`#/analysis/${eight}`); await page.reload(); await page.waitForTimeout(2500);
  ok((await words('.ie-say')) === before.said.text, '4 reloaded: the curve answers the same');
  await go('#/analysis');
  const rows = Object.fromEntries(await Promise.all([[eight, 'eight'], [flatS, 'flat']].map(async ([id, k]) => [k, flat(await page.locator(`.lt-li[data-study="${id}"]`).innerText())])));
  ok(rows.eight.includes('how fast it is learning · 8 runs') && rows.flat.includes('how fast it is learning · 12 runs'), '4 the list says what was typed on each', JSON.stringify(rows));
  ok(rows.eight.includes('Standard at run 11') && rows.flat.includes('Flattening above the standard'), '4 …and each one’s verdict');
}

/* ---- 5 · on paper, on the phone ---- */
{
  await go(`#/analysis/${eight}`);
  let p = await pdf('learning.pdf');
  ok(p.text.includes('learning at 85.6% a doubling') && p.text.includes('The 40 s standard arrives at run 11') && /standard 40 s/.test(p.text) && /how fast it is learning in s, to a standard of 40 s/i.test(p.text) && /Every reading, in the order taken/i.test(p.text), '5 the curve on paper: the sentence, the standard’s level, the agreement, every reading', p.text.slice(0, 700));
  await go('#/analysis');
  p = await pdf('list.pdf', /every one shown/);
  ok(p.text.includes('Seconds a pack, new starter'), `5 the list on paper: every analysis shown (${p.pages} pages)`);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, tag] of [[eight, 'the eight runs'], [flatS, 'the flat series']]) {
    await go(`#/analysis/${id}`);
    const w = await page.evaluate(() => document.scrollingElement.scrollWidth);
    const inside = await page.locator('.ie-an-pic, .ie-an-scatter, .ie-tbl-wrap, .ie-cap-box').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= 391; }));
    ok(w <= 390 && inside, `5 the phone, ${tag}: nothing off the side (${w}px)`);
  }
  await page.setViewportSize({ width: 1360, height: 900 });
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
