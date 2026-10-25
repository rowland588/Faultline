/* ACCEPTANCE — THE LEARNING CURVE, A QUESTION OF THE ANALYSIS (knowledge/specs/FC-027-learning-curve.md; FC-027).
 *
 * The record's eight runs (68, 58, 53, 49, 47, 45, 44, 43 s to pack a case, a 40 s standard) driven through the real
 * controls, checked against the module AND against the independent figures (scripts/knowledge/cases-time.py §8, §8b —
 * NumPy and SciPy): T = 67.69 × n^−0.22394, rate 85.6% (84.97%–86.28%), R² 0.9976, the standard at run 11 (between 10
 * and 12), the first eleven runs averaging 48.03 s, learning costing 88.77 s a unit above the standard — £443.84 at
 * 1,200 units a reading and £15 an hour.
 *
 *   1  the question asked first (How fast is a new job being learned?), the standard and the units agreed; four runs
 *      pasted say too few; the fifth fits a curve
 *   2  eight runs: the sentence, the tiles and the closing line as the module says them; the independent figures
 *   3  the picture: the runs, the curve, the standard as a line
 *   4  a run struck keeps its place (run 3 struck leaves runs 1, 2, 4 …), and is restored
 *   5  money: no wage, then the wage — the pounds as the case gives them
 *   6  the paper, downloaded and read back: the sentence, the standard, every run
 *   7  kept after a reload; a client changes nothing; the phone has nothing off the side
 *
 * Fails on any console error.   node scripts/acceptance/learning-curve.mjs      (SMOKE_BASE, as smoke) */
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
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const studyId = () => decodeURIComponent(page.url().split('/analysis/')[1]?.split('?')[0] ?? '');
const paste = async vals => { await page.getByLabel(/^Or paste readings/).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(700); };
const truth = id => page.evaluate(async sid => {
  const { getStudy, getWorkspace } = await import('/src/db.ts'); const A = await import('/src/tools/analysis/analysis.ts'); const C = await import('/src/lib/cost.ts');
  const s = await getStudy(sid); const a = s.agreed?.analysis;
  const ws = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
  const rate = ws?.labourRatePerHour && ws.labourRatePerHour > 0 ? C.labourPerHour({ crew: 1, labourRatePerHour: ws.labourRatePerHour, labourBurden: ws.labourBurden }) : undefined;
  const f = A.analysisFigures(a, s.facts.readings ?? [], { rate }); const said = A.analysisSays(f, a);
  return { a, f: JSON.parse(JSON.stringify({ ...f, line: undefined })), said, rate, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: A.analysisClosing(f, a, said).text, plot: A.analysisPlot(f, a) ? { pts: A.analysisPlot(f, a).pts.length, curve: A.analysisPlot(f, a).curve?.length, ref: A.analysisPlot(f, a).ref } : null };
}, id);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · the question, agreed; too few, then enough ---- */
await go('#/analysis');
await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Packing a case');
await page.getByLabel(/On which machine/).fill('Hand-pack bench 2');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const ID = studyId();
await page.getByRole('radio', { name: 'How fast is a new job being learned?' }).click();
await page.getByLabel('What is measured').fill('Time to pack a case');
await page.getByLabel('The standard').fill('40');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
ok(/Type the time of each run/.test(await words('.ie-say') ?? ''), `1 asked first, nothing yet: "${await words('.ie-say')}"`);
ok(/The time each run took, in s, in the order made — run 1 first/.test(await words('.ie-pad-hint') ?? ''), `1 the entry says what a reading is: "${await words('.ie-pad-hint')}"`);
await paste([68, 58, 53, 49]);
{
  const t = await truth(ID);
  ok(/at least 5 are needed/.test(await words('.ie-say') ?? '') && t.said.verdict === 'Too few' && (await words('.ie-say')) === t.said.text, `1 four runs are too few for a curve: "${await words('.ie-say')}"`);
}
await paste([47, 45, 44, 43]);

/* ---- 2 · eight runs against the module and the independent case ---- */
{
  const t = await truth(ID), f = t.f;
  ok(Math.abs(f.b + 0.22394) < 1e-4 && Math.abs(f.t1 - 67.6864) < 1e-3 && Math.abs(f.rate - 0.85622) < 1e-4 && Math.abs(f.r2 - 0.99759) < 1e-4 && Math.abs(f.rateLo - 0.8497) < 1e-3 && Math.abs(f.rateHi - 0.8628) < 1e-3,
    `2 the independent case: T = ${f.t1.toFixed(2)} × n^${f.b.toFixed(5)}, rate ${(f.rate * 100).toFixed(2)}% (${(f.rateLo * 100).toFixed(2)}–${(f.rateHi * 100).toFixed(2)}%), R² ${f.r2.toFixed(4)}`);
  ok(f.reach.run === 11 && f.reach.lo === 10 && f.reach.hi === 12 && f.reach.actual === undefined && Math.abs(f.plan.avg - 48.03) < 0.01 && Math.abs(f.plan.readAvg - 50.875) < 1e-9,
    `2 the standard at run ${f.reach.run} (${f.reach.lo}–${f.reach.hi}), the first ${f.plan.upto} runs planned at ${f.plan.avg.toFixed(2)} s, the eight read ${f.plan.readAvg}`);
  const say = await words('.ie-say');
  ok(say === t.said.text && say.startsWith('8 runs: each time the runs double, the time falls to 85.6% of itself') && say.includes('reached at about run 11 (between run 10 and run 12'), `2 the sentence as the module says it: "${say.slice(0, 150)}…"`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(t.tiles.every(([, v]) => tiles.includes(flat(String(v)))) && tiles.includes('85.6%') && tiles.includes('run 11') && tiles.includes('48.0 s'), `2 the tiles: ${t.tiles.map(x => `${x[0]} ${x[1]}`).join(' · ')}`);
  ok((await words('.ln-close'))?.includes(t.closing) && t.closing === 'Learning at 86% — Time to pack a case, the standard at about run 11.', `2 the closing line: "${await words('.ln-close')}"`);
  const more = await all('.ie-more');
  ok(more.some(m => /Plan the first 11 runs at about 48\.0 s each on average — not at the standard; the 8 read averaged 50\.9 s/.test(m)) && more.some(m => /run 16 takes 36\.4 s and run 32 31\.1 s/.test(m)), `2 what to plan the first runs at, and the projections said as projections`);
  ok(more.some(m => /Give the line a wage to say the learning in money|how many units each reading stands for/.test(m)), `2 the money names what it lacks: "${more.find(m => /wage|units/.test(m))}"`);
  ok(/^Wright/.test(more[more.length - 1]) && more[more.length - 1].includes('67.7 × run^−0.224'), `2 the curve's equation: "${more[more.length - 1]}"`);
  ok(/does not say/.test(await words('.ie-notclaimed') ?? '') && /two curves averaged into nonsense/.test(await words('.ie-notclaimed') ?? ''), '2 what it does not say');
}

/* ---- 3 · the picture ---- */
{
  const dots = await page.locator('svg.ie-an-scatter circle').count(), curve = await page.locator('svg.ie-an-scatter polyline.ie-an-fit').count();
  const t = await truth(ID);
  ok(dots === 8 && curve === 1 && (await page.locator('svg.ie-an-scatter line.ie-an-ref').count()) === 1 && t.plot.ref.label === 'standard 40.0 s' && (await page.locator('svg.ie-an-scatter').textContent()).includes('standard 40.0 s'),
    `3 the picture: ${dots} runs, the curve (${t.plot.curve} points) and "${t.plot.ref.label}" as a line`);
}

/* ---- 4 · a run struck keeps its place ---- */
{
  await page.getByText(/^Every reading, in the order taken/).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Strike reading 3' }).click(); await page.waitForTimeout(700);
  const t = await truth(ID);
  ok(t.f.n === 7 && JSON.stringify(t.f.runs.map(r => r.run)) === '[1,2,4,5,6,7,8]' && (await words('.ie-say')) === t.said.text && /^7 runs/.test(await words('.ie-say') ?? ''), `4 run 3 struck: ${t.f.n} runs left, kept in their places (${t.f.runs.map(r => r.run).join(', ')}); "${(await words('.ie-say'))?.slice(0, 60)}…"`);
  await page.getByRole('button', { name: 'Restore reading 3' }).click(); await page.waitForTimeout(700);
  ok((await truth(ID)).f.n === 8, '4 restored: eight runs again');
}

/* ---- 5 · money: the wage and the units ---- */
await page.evaluate(async ([id, ws]) => {
  const db = await import('/src/db.ts'); const s = await db.getStudy(id); const w = await db.getWorkspace(ws);
  await db.updateWorkspace({ ...w, labourRatePerHour: 15, labourBurden: 1 });
  await db.putStudy({ ...s, workspaceId: ws, updatedAt: Date.now() });
}, [ID, sd.wsId]);
await go(`#/analysis/${ID}`);
ok((await all('.ie-more')).some(m => /how many units each reading stands for/.test(m)), `5 with the wage, the units a reading stands for are asked for: "${(await all('.ie-more')).find(m => /units/.test(m))}"`);
await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
await page.getByLabel('Units each reading stands for').fill('1200');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(800);
{
  const t = await truth(ID);
  const hours = 88.768 * 1200 / 3600;
  ok(Math.abs(t.f.extra.seconds - 88.768) < 0.01 && Math.abs(t.f.extra.pounds - hours * t.rate) < 0.5, `5 the independent case: ${t.f.extra.seconds.toFixed(2)} s a unit above the standard, ${hours.toFixed(2)} hours, £${t.f.extra.pounds.toFixed(2)} at £${t.rate} an hour (£443.84 at £15)`);
  const m = (await all('.ie-more')).find(x => /Learning to the standard costs/.test(x));
  ok(!!m && m.includes('29.6 hours') && m.includes(`£${Math.round(t.f.extra.pounds).toLocaleString('en-GB')}`) && m.includes('over 11 runs of 1200 units'), `5 said in money: "${m}"`);
}

/* ---- 6 · the paper ---- */
{
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, 'learn.pdf'); await d.saveAs(f);
  const txt = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })).replace(/−/g, '-');
  ok(txt.includes('each time the runs double, the time falls to 85.6% of itself') && txt.includes('reached at about run 11') && txt.includes('standard 40.0 s') && txt.includes('Learning at 86%'), '6 the paper carries the sentence, the standard on the picture and the verdict');
  ok(/Every run, in the order taken/i.test(txt) && txt.includes('68') && txt.includes('43') && /Plan the first 11 runs/.test(txt), '6 the paper carries every run, and what to plan the first runs at');
  ok(/Agreed: Time to pack a case/.test(txt) && /heading for 40/.test(txt) === false, '6 the paper says what was agreed');
}

/* ---- 7 · kept; a client; the phone ---- */
await page.reload(); await page.waitForTimeout(2200);
ok((await words('.ie-say'))?.startsWith('8 runs') && (await words('.ie-agreed'))?.includes('heading for 40'), `7 kept after a reload: "${await words('.ie-agreed')}"`);
/* a client reads what is on a project: the analysis goes onto the seeded one */
await page.evaluate(async ([id, pid]) => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); await db.putStudy({ ...s, projectId: pid, updatedAt: Date.now() }); }, [ID, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/analysis/${ID}`);
ok((await page.getByRole('button', { name: 'Add these' }).count()) === 0 && (await page.getByRole('button', { name: 'Change what was agreed' }).count()) === 0, '7 a client reads it and changes nothing');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/analysis/${ID}`);
ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, '7 on a phone nothing is off the side');
await page.setViewportSize({ width: 1360, height: 900 });

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nthe learning curve accepted: asked first, fitted, the standard reached, planned for, costed, on paper');
process.exit(failed ? 1 : 0);
