/* ACCEPTANCE — THE CAPABILITY STUDY MADE TO COVER WHAT THE FLOOR HAS
 * (knowledge/specs/FC-094-capability.md, part 1; catalogue FC-094, FC-095,
 * FC-097, FC-100, FC-103).
 *
 * Rowland, 22 October: "The process capability study is not flexible enough
 * whatsoever ... I've got no idea what the tick is"; on 75 a minute: "It
 * could be a ceiling of top speed ... or it has to run consistently for 75
 * packs per minute". Driven in a real browser with the real controls:
 *
 *   1  a speed study, AT LEAST 75 a minute — the question asked first (three
 *      kinds, each with its example), the side chosen, only its box shown;
 *      thirty readings; the sentence, how sure the Ppk is, the three checks
 *      before capability, the histogram, the tiles — as lib/ie/sample says
 *  17  (W3c, FC-116) several deposits in one pack: the root sum of squares, the target the rules need, the deposit worth tightening, the money, beside the pack's own spread
 *  16  (W3c, FC-096) readings that are not bell-shaped: the four shapes fitted and the tail said beside the count — the stops, the oxygen, a bell-shaped set with none
 *   2  residual oxygen, AT MOST 2% — skewed: "Not bell-shaped — they lean
 *      high", the one reading beyond the chart's limits, capable never green;
 *      the agreement changed to at most 0.6 — the share outside as measured,
 *      not the bell's
 *   3  a run creeping up between two limits — "Not steady", never green
 *   4  pass or fail, one may fail — counted 20 by default, the claim the count
 *      supports said while agreeing, too many allowed refused; ✓ Good and
 *      ✗ Failed; a second failure fails it at once, struck as a mistap, then
 *      passed with one failed — what it proves, the tiles
 *   5  each on paper: the sentences, the checks, the histogram, how sure; pass
 *      or fail's cells and every item good or failed by its number
 *   6  a study made before 22 October reads as before (the seeded re-test:
 *      pass or fail, none may fail)
 *   7  the phone — the question cards and the two big buttons fit
 *   8  pass or fail judged by a confidence level or a loss allowed (part 1b, 23 October): the three ways
 *      and the confidence, the plan said while agreeing, a count too small refused with the count it
 *      takes, tapped to a fail at once, the tiles, the paper, the phone
 *   9  in money (FC-156): give-away and the rejects by fate
 *  10–15  W1, parts 2–4 (24 October): rejects out of what was made — six runs, the rate, its bounds, the chart with Laney
 *      said, the verdict against 1% and 0.5%, the money; faults found on each item — the kinds as chips, the tally and
 *      its Pareto by count and by money, DPMO once the opportunities are typed; held at a rate — 25 minutes against
 *      60, met and missed bars, held with gaps at 70%, not held at 90%; a measurement's question row — one machine's
 *      parts say Cm/Cmk; the lowest legal fill on a sold-by-weight study; each on paper, and the phone
 *
 * Fails on any console error.
 *
 *   node scripts/acceptance/capability-kinds.mjs      (SMOKE_BASE, as smoke) */
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

/* the same fixed readings as the unit tests' (src/lib/ie/__tests__/sample.test.ts) */
const SPEED = [80, 81, 79, 80, 82, 78, 80, 81, 79, 80, 81, 80, 79, 82, 80, 78, 81, 80, 79, 81, 80, 83, 79, 80, 81, 80, 79, 77, 80, 81];
const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38,
  0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const RAMP = Array.from({ length: 30 }, (_, i) => Math.round((400 + i * 0.1) * 10) / 10);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const studyId = () => decodeURIComponent(page.url().split('/capability/')[1]?.split('?')[0] ?? '');
const typeAll = async vs => { for (const v of vs) { await page.keyboard.type(String(v)); await page.keyboard.press('Enter'); await page.waitForTimeout(50); } await page.waitForTimeout(700); };
const pdf = async name => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
/* WHAT THE MODULE SAYS on the same record — every sentence on the page is checked against it */
const truth = id => page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/capability/sample.ts'); const SL = await import('/src/tools/capability/sampleLean.ts');
  const s = await getStudy(id); const a = s.agreed?.readings;
  const f = S.sample(a, s.facts.readings ?? []); const said = S.sampleSays(f, a);
  return { a, n: f.n, said, checks: S.checksSay(f, a).map(c => ({ text: c.text, tone: c.tone })), bars: f.hist?.counts.length ?? 0, outBars: f.hist?.out.filter(Boolean).length ?? 0,
    ppkLow: f.ppkLow, ticks: f.ticks, tiles: SL.sampleTiles(f, a, said), closing: SL.sampleClosing(f, a, said).text };
}, id);
const startStudy = async (what, machine) => {
  await go('#/capability');
  await page.getByRole('button', { name: 'New capability study' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByLabel(/On which machine/).fill(machine);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
/* the page against the module: the sentence, the second sentence, the checks, the tiles and closing line */
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say'), cap = await words('.ie-cap'), checks = await all('.ie-check');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(x => tiles.includes(flat(String(x.v))));
  ok(say === t.said.text && cap === (t.said.capability?.text ?? null) && JSON.stringify(checks) === JSON.stringify(t.checks.map(c => c.text)) && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)),
    `${tag}: "${say}" "${cap}" — ${checks.length} check${checks.length === 1 ? '' : 's'}, the tiles and closing line as lib/ie/sample says`);
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · a speed study, at least 75 a minute ---- */
const speed = await startStudy('Wrapper speed — Finest 2kg', 'Ilapak flow wrapper');
{
  const kinds = await page.getByRole('radiogroup', { name: 'What are you measuring?' }).getByRole('radio').allInnerTexts();
  /* six kinds since W1 (parts 2–4): the three of part 1 first, then rejects, faults and a rate */
  ok(kinds.length === 6 && /^A measurement/.test(flat(kinds[0])) && /^Sold by weight/.test(flat(kinds[1])) && /^Pass or fail/.test(flat(kinds[2])) && /^Rejects out of what was made/.test(flat(kinds[3])) && /^Faults found on each item/.test(flat(kinds[4])) && /^Held at a rate/.test(flat(kinds[5])) && kinds.every(k => flat(k).split(' ').length > 3),
    `1 the question first: ${kinds.map(k => `"${flat(k).split(/ (?=[a-z])/)[0]}"`).join(', ')}, each with its example`);
  ok(!(await page.getByText('Ticks', { exact: true }).count()), '1 no "Ticks" anywhere on the set-up');
  ok((await page.getByLabel('Lower limit').count()) === 1 && (await page.getByLabel('Upper limit').count()) === 1, '1 a measurement starts between two limits — the lower and the upper asked');
  await page.getByRole('radio', { name: /^At least/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel('At least', { exact: true }).count()) === 1 && (await page.getByLabel('Upper limit').count()) === 0 && (await page.getByLabel('At most', { exact: true }).count()) === 0,
    '1 At least chosen: one box, "At least" — no upper');
  ok(flat(await page.locator('.ie-problem').innerText()) === 'Type the limit — at least what?' && await page.getByRole('button', { name: 'Agree these' }).isDisabled(), '1 no limit typed — refused, said why');
  await page.getByLabel('Unit').fill('a minute');
  await page.getByLabel('At least', { exact: true }).fill('75');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed')).includes('at least 75 a minute, 30 readings'), `1 agreed: "${await words('.ie-agreed b')}"`);
  await typeAll(SPEED.slice(0, 12));
  let t = await truth(speed);
  ok(t.checks.length === 1 && (await all('.ie-check'))[0] === 'Said from 20 readings — 12 so far.', `1 twelve in: the checks wait — "${(await all('.ie-check'))[0]}"`);
  await typeAll(SPEED.slice(12));
  t = await truth(speed);
  ok(t.n === 30 && t.a.lower === 75 && t.a.upper === undefined, '1 thirty readings in, judged on the lower side alone');
  await sameAsModule(t, '1 thirty in');
  ok(/95% sure at least \d\.\d\d/.test(await words('.ie-cap')) && t.ppkLow !== undefined, `1 how sure the Ppk is, said: "${await words('.ie-cap')}"`);
  ok(t.checks.length === 3 && t.checks.every(c => c.tone === 'g'), '1 the three checks before capability: bell-shaped, steady, read finely enough');
  const bars = await page.locator('svg.ie-hist rect.ie-bar').count();
  ok(bars === t.bars && bars >= 5 && (await page.locator('svg.ie-hist rect.ie-bar.is-out').count()) === 0 && /at least 75/.test(flat(await page.locator('svg.ie-hist').textContent())),
    `1 the histogram: ${bars} bars, the limit "at least 75" drawn, none red`);
  const p = await pdf('speed.pdf');
  ok(p.text.includes(flat(t.said.text).slice(0, 40)) && t.checks.every(c => p.text.includes(c.text.slice(0, 30))) && /before capability/i.test(p.text) && /how the readings spread/i.test(p.text) && /95% SURE/i.test(p.text) && p.text.includes(`at least ${t.ppkLow.toFixed(2)}`),
    `5 the speed study on paper: its sentence, the three checks, the histogram, how sure (${p.pages} page${p.pages === 1 ? '' : 's'})`);
}

/* ---- 2 · residual oxygen, at most 2% ---- */
const oxygen = await startStudy('Residual oxygen — MAP trays', 'Tray sealer');
{
  await page.getByRole('radio', { name: /^At most/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Unit').fill('%');
  await page.getByLabel('At most', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll(OXYGEN);
  let t = await truth(oxygen);
  await sameAsModule(t, '2 oxygen at most 2%');
  const checks = await all('.ie-check');
  ok(/^Not bell-shaped — they lean high/.test(checks[0]) && /^Not steady — reading 13 is outside/.test(checks[1]) && (await page.locator('.ie-check.is-a').count()) === 2,
    `2 the shape and the steadiness said, in amber: "${checks[0].slice(0, 44)}…" "${checks[1]}"`);
  ok((await page.locator('.ie-cap.is-a').count()) === 1 && (await page.locator('.ie-cap.is-g').count()) === 0 && /^Capable: .* — but the readings were not steady, so it may not hold\./.test(await words('.ie-cap')),
    `2 capable, but never green: "${await words('.ie-cap')}"`);
  /* the agreement changed — now not capable, its share as measured */
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(400);
  ok((await page.getByRole('radio', { name: /^At most/ }).getAttribute('aria-checked')) === 'true' && (await page.getByLabel('At most', { exact: true }).inputValue()) === '2', '2 changing what was agreed opens on At most 2');
  await page.getByLabel('At most', { exact: true }).fill('0.6');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(800);
  t = await truth(oxygen);
  await sameAsModule(t, '2 at most 0.6%');
  ok(t.said.verdict === 'Didn’t pass' && (await words('.ie-cap')) === 'Not capable: Ppk 0.30 from 30 — as measured, 4 of 30 are outside.' && (await page.locator('svg.ie-hist rect.ie-bar.is-out').count()) === t.outBars && t.outBars > 0,
    `2 not bell-shaped and not capable: "${await words('.ie-cap')}" — ${t.outBars} bar${t.outBars === 1 ? '' : 's'} red`);
  const p = await pdf('oxygen.pdf');
  ok(/Not bell-shaped — they lean high/.test(p.text) && p.text.includes('as measured, 4 of 30 are outside') && /Not steady/.test(p.text), '5 oxygen on paper: the shape, the steadiness and the share as measured');
}

/* ---- 3 · a run creeping up ---- */
const ramp = await startStudy('Fill weight — creeping', 'Multihead weigher');
{
  await page.getByLabel('Lower limit').fill('390'); await page.getByLabel('Upper limit').fill('410');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll(RAMP);
  const t = await truth(ramp);
  await sameAsModule(t, '3 a run creeping up');
  const steady = (await all('.ie-check'))[1];
  ok(/^Not steady — readings 1, 2, 3 and \d+ more are outside .* and 15 in a row sat below the mean from no\. 1\.$/.test(steady), `3 "${steady}"`);
  ok((await page.locator('.ie-cap.is-g').count()) === 0 && /not steady, so it may not hold/.test(await words('.ie-cap')), `3 capable on paper, never green on the page: "${await words('.ie-cap')}"`);
}

/* ---- 4 · pass or fail, one may fail ---- */
const seal = await startStudy('Seal integrity — after the jaw fix', 'Ilapak flow wrapper');
{
  await page.getByRole('radio', { name: /^Pass or fail/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel('How many to check').inputValue()) === '20' && (await page.getByLabel('Unit').count()) === 0, '4 pass or fail: 20 to check by default, no unit or limits asked');
  const plan0 = await page.evaluate(async () => (await import('/src/tools/capability/sample.ts')).passFailPlan(20, 0));
  ok((await words('.ie-plan')) === plan0, `4 what it would prove, said while agreeing: "${await words('.ie-plan')}"`);
  await page.getByLabel('How many may fail').fill('20'); await page.waitForTimeout(150);
  ok(flat(await page.locator('.ie-problem').innerText()) === 'At most 19 of 20 may fail.' && await page.getByRole('button', { name: 'Agree these' }).isDisabled(), '4 twenty of twenty allowed to fail — refused');
  await page.getByLabel('How many may fail').fill('1'); await page.waitForTimeout(150);
  const plan1 = await page.evaluate(async () => (await import('/src/tools/capability/sample.ts')).passFailPlan(20, 1));
  ok((await words('.ie-plan')) === plan1 && /473/.test(plan1), `4 one allowed: "${plan1}"`);
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed b')) === 'pass or fail each, 20 — at most 1 may fail', `4 agreed: "${await words('.ie-agreed b')}"`);
  const good = page.getByRole('button', { name: 'Good', exact: true }), bad = page.getByRole('button', { name: 'Failed', exact: true });
  ok(flat(await good.innerText()) === '✓ Good' && flat(await bad.innerText()) === '✗ Failed', '4 two big buttons: ✓ Good and ✗ Failed');
  for (let i = 1; i <= 11; i++) { await (i === 7 ? bad : good).click(); await page.waitForTimeout(60); }
  let t = await truth(seal);
  await sameAsModule(t, '4 eleven checked, one failed');
  ok(t.said.tone === 'a' && t.said.text === '11 of 20 checked — 1 failed (no. 7), 1 allowed so far.', '4 one failed of one allowed: so far, never passed early');
  await bad.click(); await page.waitForTimeout(500);
  t = await truth(seal);
  ok(t.said.verdict === 'Didn’t pass' && (await words('.ie-say')) === '10 of 12 good — 2 failed (no. 7, no. 12), at most 1 allowed — Didn’t pass.' && (await page.locator('.ie-say.is-r').count()) === 1,
    `4 a second failure fails it at once: "${await words('.ie-say')}"`);
  await page.getByRole('button', { name: 'Strike reading 12' }).click(); await page.waitForTimeout(500);
  ok((await truth(seal)).said.tone === 'a', '4 the mistap struck — back to so far');
  for (let i = 0; i < 9; i++) { await good.click(); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  t = await truth(seal);
  await sameAsModule(t, '4 twenty checked');
  ok(t.said.verdict === 'Passed' && (await words('.ie-say')) === '19 of 20 good — 1 failed (no. 7), 1 allowed — Passed.'
    && (await words('.ie-cap')) === '1 failed in 20: we can be 95% confident fewer than 22 in 100 would fail; to show fewer than 1 in 100 takes 473 checked with 1 failed.',
    `4 passed, and what it proves: "${await words('.ie-cap')}"`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(/Checked\s*20/i.test(tiles) && /Failed\s*1\s*of 1 allowed/i.test(tiles) && /Confident\s*< 22 in 100\s*would fail — 95% confident/i.test(tiles), `4 the tiles: checked, failed of allowed, what it proves with its confidence — "${tiles.slice(0, 160)}…"`);
  const p = await pdf('seal.pdf');
  ok(/MAY FAIL/i.test(p.text) && p.text.includes('fewer than 22 in 100') && /95% CONFIDENT/i.test(p.text) && /\b7 failed\b/.test(p.text) && /\b12 failed struck\b/.test(p.text) && (p.text.match(/\bgood\b/g) ?? []).length >= 19,
    `5 pass or fail on paper: checked, failed, may fail, what it proves; every item good or failed by its number, the struck one said (${p.pages} page${p.pages === 1 ? '' : 's'})`);
}

/* ---- 6 · a study made before 22 October reads as before ---- */
{
  const old = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).find(s => s.name.startsWith('Seal integrity — Finest Red 2kg'))?.id);
  await go(`#/capability/${old}`);
  const t = await truth(old);
  ok(t.a.allowFail === undefined && (await words('.ie-say')) === '8 of 20 checked — all good so far.' && (await words('.ie-agreed b')) === 'pass or fail each, 20 — none may fail',
    `6 the seeded re-test, no allowFail stored: "${await words('.ie-say')}" · "${await words('.ie-agreed b')}"`);
}

/* ---- 7 · the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/capability/${seal}`);
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(400);
  const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
  const cards = await page.locator('.ie-kind').evaluateAll(els => els.map(e => e.getBoundingClientRect()).every(r => r.right <= 390 && r.left >= 0));
  ok(wide <= 390 && cards, `7 the phone: the question's cards inside the screen (page ${wide}px wide)`);
  await page.getByRole('button', { name: 'Keep what was agreed' }).click(); await page.waitForTimeout(300);
  const boxes = await Promise.all(['Good', 'Failed'].map(n => page.getByRole('button', { name: n, exact: true }).boundingBox()));
  ok(boxes.every(b => b && b.height >= 64 && b.width >= 140), `7 the two buttons big enough for a gloved thumb (${boxes.map(b => `${Math.round(b.width)}×${Math.round(b.height)}`).join(', ')})`);
}

/* ---- 8 · pass or fail judged by a confidence level or a loss allowed (part 1b, 23 October — Rowland:
   "Am I doing a confidence level, or am I doing the other level? ... adding confidence as part of our
   language") — the three ways and the confidence offered, the plan said while agreeing as the module
   says it, a count too small refused, then tapped through to a fail at once; the tiles, the closing line,
   the paper; the phone ---- */
{
  await page.setViewportSize({ width: 1360, height: 900 });
  const conf = await startStudy('Seal check — 4,500 packs', 'Ilapak flow wrapper');
  await page.getByRole('radio', { name: /^Pass or fail/ }).click(); await page.waitForTimeout(200);
  const ways = (await page.getByRole('radiogroup', { name: 'How is it judged?' }).getByRole('radio').allInnerTexts()).map(flat);
  const confs = (await page.getByRole('radiogroup', { name: 'Confidence' }).getByRole('radio').allInnerTexts()).map(flat);
  ok(ways.length === 3 && /^How many may fail/.test(ways[0]) && /^A loss allowed/.test(ways[1]) && /^A confidence level/.test(ways[2]) && JSON.stringify(confs) === '["90%","95%","99%"]'
    && (await page.getByRole('radio', { name: '95%', exact: true }).getAttribute('aria-checked')) === 'true' && (await page.getByRole('radio', { name: /^How many may fail/ }).getAttribute('aria-checked')) === 'true',
    `8 how it is judged asked — ${ways.map(w => `"${w.split(' ').slice(0, 4).join(' ')}"`).join(', ')} — and the confidence, 95% to begin with`);
  const planOf = a => page.evaluate(async a => (await import('/src/tools/capability/sample.ts')).passFailPlanOf(a), a);
  await page.getByRole('radio', { name: /^A confidence level/ }).click(); await page.waitForTimeout(250);
  const p20 = await planOf({ count: 20, judge: 'confidence', good: 98, conf: 0.95 });
  ok((await page.getByLabel('At least what % good').inputValue()) === '98' && flat(await page.locator('.ie-problem').innerText()) === p20.problem && /check at least 149/.test(p20.problem) && await page.getByRole('button', { name: 'Agree these' }).isDisabled(),
    `8 a confidence level, 20 checked: refused, with the count it takes — "${p20.problem}"`);
  await page.getByLabel('How many to check').fill('4500'); await page.waitForTimeout(300);
  const p95 = await planOf({ count: 4500, judge: 'confidence', good: 98, conf: 0.95 });
  ok((await words('.ie-plan')) === p95.text && /up to 74 may fail/.test(p95.text), `8 4,500 at 95%: "${await words('.ie-plan')}"`);
  await page.getByRole('radio', { name: '99%', exact: true }).click(); await page.waitForTimeout(250);
  ok(/up to 68 may fail/.test(await words('.ie-plan')), `8 99% asks more of the count: "${await words('.ie-plan')}"`);
  await page.getByRole('radio', { name: '95%', exact: true }).click();
  await page.getByRole('radio', { name: /^A loss allowed/ }).click(); await page.waitForTimeout(250);
  const pl = await planOf({ count: 4500, judge: 'loss', good: 98, conf: 0.95 });
  ok((await words('.ie-plan')) === pl.text && /up to 90 of 4,500 may fail/.test(pl.text) && /at least 97\.6% would be good/.test(pl.text), `8 a loss allowed, 98% good: "${pl.text}"`);
  /* tapped through: a confidence level, 300 checked, 98% good at 95% — one may fail */
  await page.getByRole('radio', { name: /^A confidence level/ }).click();
  await page.getByLabel('How many to check').fill('300'); await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  let t = await truth(conf);
  ok(t.a.judge === 'confidence' && t.a.good === 98 && t.a.conf === undefined && (await words('.ie-agreed b')) === 'pass or fail each, 300 — 95% confident at least 98% good (up to 1 may fail)',
    `8 agreed and kept: "${await words('.ie-agreed b')}"`);
  const good = page.getByRole('button', { name: 'Good', exact: true }), bad = page.getByRole('button', { name: 'Failed', exact: true });
  for (let i = 0; i < 5; i++) { await good.click(); await page.waitForTimeout(40); }
  await bad.click(); await page.waitForTimeout(400);
  t = await truth(conf);
  await sameAsModule(t, '8 six checked, one failed');
  ok(t.said.tone === 'a' && /1 allowed for 98% good, 95% confident\.$/.test(t.said.text) && /we can be 95% confident at least/.test(await words('.ie-cap')), `8 one failed of the one allowed — so far, said with its confidence: "${await words('.ie-cap')}"`);
  await bad.click(); await page.waitForTimeout(500);
  t = await truth(conf);
  await sameAsModule(t, '8 a second failure');
  ok(t.said.verdict === 'Didn’t pass' && (await words('.ie-say')) === t.said.text && /at most 1 allowed for 98% good, 95% confident — Didn’t pass\.$/.test(t.said.text) && (await page.locator('.ie-say.is-r').count()) === 1,
    `8 a second failure fails it at once: "${t.said.text}"`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(/Failed\s*2\s*of 1 allowed · 98% good, 95% confident/i.test(tiles) && /Confident\s*≥ \d+\.\d% good — 95% confident/i.test(tiles), `8 the tiles: failed of allowed with the rule, and what it proves with its confidence — "${tiles.slice(0, 200)}…"`);
  const p = await pdf('confidence.pdf');
  ok(/MAY FAIL/i.test(p.text) && /1 — 98% good, 95% confident/.test(p.text) && /95% CONFIDENT/i.test(p.text) && /at least \d+\.\d% good/.test(p.text) && p.text.includes(t.said.text.slice(0, 40)),
    `8 on paper: may fail with the rule, the confidence, the verdict (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  /* the phone: the three ways and the confidence inside the screen */
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/capability/${conf}`);
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(400);
  const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
  const inside = await page.locator('.ie-kind, .ie-confs .chip').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; }));
  ok(wide <= 390 && inside && (await page.getByRole('radio', { name: /^A confidence level/ }).getAttribute('aria-checked')) === 'true', `8 the phone: the three ways and the confidence inside the screen (page ${wide}px wide), the way agreed shown`);
  await page.getByRole('button', { name: 'Keep what was agreed' }).click(); await page.waitForTimeout(300);
}

/* ---- 9 · in money (knowledge/specs/FC-156-capability-money.md — Rowland, 24 October: the costs typed on each study;
   a reject reworked, recovered by hand, or pure waste) ---- */
{
  await page.setViewportSize({ width: 1360, height: 900 });
  /* 9a · give-away on a sold-by-weight study: the boxes, the tile and the sentence as the module says them */
  const heavy = await startStudy('Fill weight — 400 g bags, heavy', 'Ishida CCW-RV-214W multihead weigher');
  await page.getByRole('radio', { name: /^Sold by weight/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Nominal (on the pack)').fill('400');
  await page.getByLabel('Packs a shift').fill('10000'); await page.getByLabel('Shifts a week').fill('5');
  ok((await page.getByLabel(/What the product costs you a kilo/).count()) === 1 && (await page.getByLabel(/A pack’s materials/).count()) === 0, '9a a measured study asks the cost a kilo, not a pack’s materials');
  await page.getByLabel(/What the product costs you a kilo/).fill('18');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll([404.1, 404.1, 404.1, 404.1]);
  let t = await truth(heavy);
  ok(t.a.packsPerShift === 10000 && t.a.shiftsPerWeek === 5 && t.a.costPerKg === 18, '9a the money kept on the agreement: 10,000 a shift, 5 a week, £18 a kg');
  const money = await page.evaluate(async id => { const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/capability/sample.ts');
    const s = await getStudy(id); const a = s.agreed.readings; const f = S.sample(a, s.facts.readings ?? []); return S.moneySays(S.sampleMoney(f, a), f, a); }, heavy);
  ok((await words('.ie-money')) === money.text && money.text === 'Give-away 4.1 g a pack — 41 kg a shift, £738 a shift, £3.7k a week — because the mean (404.1 g) sits 4.1 g over the nominal.',
    `9a the money sentence with its because: "${await words('.ie-money')}"`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(/Give-away\s*4\.1 g\s*a pack over the nominal — 41 kg a shift · £738 a shift · £3\.7k a week/i.test(tiles), `9a the Give-away tile: "${tiles.slice(tiles.toUpperCase().indexOf('GIVE-AWAY'), tiles.toUpperCase().indexOf('GIVE-AWAY') + 90)}"`);
  /* 9b · with no cost a kilo the tile names what to give; a unit that is not a weight says so */
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.getByLabel(/What the product costs you a kilo/).fill('');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(600);
  ok(/Give-away\s*4\.1 g\s*a pack over the nominal — 41 kg a shift · give £ a kg to say it in money/i.test(flat(await page.locator('.ie-strip').innerText())) && /\. Give £ a kg to say it in money\.$/.test(await words('.ie-money')),
    `9b no cost a kilo: the kilos said, the pounds named as missing: "${await words('.ie-money')}"`);
  const mm = await startStudy('Bag length', 'Ilapak flow wrapper');
  await page.getByLabel('Unit').fill('mm'); await page.getByLabel('Lower limit').fill('11'); await page.getByLabel('Upper limit').fill('13'); await page.getByLabel('Target').fill('12');
  await page.getByLabel('Packs a shift').fill('10000'); await page.getByLabel(/What the product costs you a kilo/).fill('18');
  ok((await words('.ie-money-agree .ie-note')) === 'Give-away in money needs a weight in g or kg.', '9b a unit that is not a weight — said while agreeing');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(600);
  await typeAll([12.4, 12.4]);
  ok(/Give-away\s*0\.4 mm\s*a pack over the nominal · in money needs a weight in g or kg/i.test(flat(await page.locator('.ie-strip').innerText())), '9b 0.4 mm a pack, no money — needs a weight');
  void mm;
  /* 9c · pass or fail: the three fates chosen before ✗ Failed and kept (waste unless tapped), each failed item's own line changing it; the rejects by fate at the packs a shift */
  const rej = await startStudy('Seal check — after the jaw fix, costed', 'Ilapak flow wrapper');
  await page.getByRole('radio', { name: /^Pass or fail/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('How many may fail').fill('2');
  await page.getByLabel('Packs a shift').fill('10000'); await page.getByLabel('Shifts a week').fill('5');
  ok((await page.getByLabel(/A pack’s materials/).count()) === 1 && (await page.getByLabel(/To rework one pack/).count()) === 1 && (await page.getByLabel(/What the product costs you a kilo/).count()) === 0, '9c pass or fail asks a pack’s materials and one rework, not a cost a kilo');
  await page.getByLabel(/A pack’s materials/).fill('0.25'); await page.getByLabel(/To rework one pack/).fill('0.12');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  const good = page.getByRole('button', { name: 'Good', exact: true }), bad = page.getByRole('button', { name: 'Failed', exact: true });
  /* 26 October (Rowland: "it keeps flipping from one thing to the next … when I click a failed it jumps to the incorrect highlighted one"):
     what becomes of a failed item is chosen BEFORE ✗ Failed, kept until changed, and never moved by pressing Failed. */
  const nf = page.locator('.ie-nextfate');
  ok((await nf.count()) === 1 && (await nf.getAttribute('aria-label')) === 'What becomes of a failed item?' && (await all('.ie-nextfate [role=radio]')).join(' · ') === 'Waste · Reworked · Recovered by hand'
    && (await nf.getByRole('radio', { name: 'Waste' }).getAttribute('aria-checked')) === 'true', '9c the choice is asked before anything fails: Waste, Reworked, Recovered by hand — Waste on');
  for (let i = 1; i <= 20; i++) {
    if (i === 12) { await nf.getByRole('radio', { name: 'Reworked' }).click(); await page.waitForTimeout(150); }
    await (i === 5 || i === 12 ? bad : good).click(); await page.waitForTimeout(60);
    if (i === 12) {     /* the choice stays on Reworked after Failed, and no. 12's own line says reworked */
      await page.waitForTimeout(300);
      ok((await nf.getByRole('radio', { name: 'Reworked' }).getAttribute('aria-checked')) === 'true' && (await nf.getByRole('radio', { name: 'Waste' }).getAttribute('aria-checked')) === 'false'
        && (await page.locator('.ie-last .ie-fates').first().getAttribute('aria-label')) === 'What became of no. 12?'
        && (await page.locator('.ie-last .ie-fates').first().getByRole('radio', { name: 'Reworked' }).getAttribute('aria-checked')) === 'true', '9c Reworked chosen for no. 12 stays chosen after Failed; no. 12’s own line says reworked');
    }
    if (i === 5) {      /* pressing Failed leaves the choice where it was, and no. 5's own line says waste */
      await page.waitForTimeout(300);
      ok((await nf.getByRole('radio', { name: 'Waste' }).getAttribute('aria-checked')) === 'true' && (await page.locator('.ie-last .ie-fates').first().getAttribute('aria-label')) === 'What became of no. 5?'
        && (await page.locator('.ie-last .ie-fates').first().getByRole('radio', { name: 'Waste' }).getAttribute('aria-checked')) === 'true', '9c Failed leaves the choice on Waste; the failed item’s own line says waste');
    }
  }
  await page.waitForTimeout(600);
  t = await truth(rej);
  ok(JSON.stringify(t.ticks.fates) === JSON.stringify({ waste: 1, rework: 1, recovered: 0 }), `9c no. 5 waste unless said, no. 12 reworked: ${JSON.stringify(t.ticks.fates)}`);
  const rm = await page.evaluate(async id => { const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/capability/sample.ts');
    const s = await getStudy(id); const a = s.agreed.readings; const f = S.sample(a, s.facts.readings ?? []); return S.moneySays(S.sampleMoney(f, a), f, a); }, rej);
  ok((await words('.ie-money')) === rm.text && rm.text === 'Rejects: 2 of 20 failed — 1 waste, 1 reworked — at 10,000 a shift that is 500 to waste (£125), 500 reworked (£60), £185 a shift, £925 a week.',
    `9c the rejects by fate, at the packs a shift: "${await words('.ie-money')}"`);
  ok(/Rejects cost\s*£185\s*a shift — from 2 of 20: 500 waste £125 · 500 reworked £60 · £925 a week/i.test(flat(await page.locator('.ie-strip').innerText())), '9c the Rejects cost tile');
  /* recovered by hand on the readings list — changed on its row, not priced */
  await page.getByRole('button', { name: /^Every reading/ }).click(); await page.waitForTimeout(300);
  await page.locator('.ie-rows .ie-fates').first().getByRole('radio', { name: 'Recovered by hand' }).click(); await page.waitForTimeout(500);
  t = await truth(rej);
  ok(JSON.stringify(t.ticks.fates) === JSON.stringify({ waste: 0, rework: 1, recovered: 1 }) && /500 recovered by hand, not priced/.test(await words('.ie-money')) && /£60 a shift/.test(await words('.ie-money')),
    `9c no. 5 recovered by hand on its row — not priced: "${await words('.ie-money')}"`);
  /* 9d · on paper: the tiles, the sentence, the inputs and each failed item's fate */
  const p = await pdf('money.pdf');
  ok(p.text.includes('Rejects: 2 of 20 failed') && p.text.includes('In money from: 10,000 a shift · 5 shifts a week · £0.25 a pack’s materials · £0.12 a rework') && /5 failed · recovered by hand/.test(p.text) && /12 failed · reworked/.test(p.text) && /REJECTS COST/i.test(p.text),
    `9d on paper: the sentence, the inputs, each failed item by its fate, the tile (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  await go(`#/capability/${heavy}`);
  const ph = await pdf('heavy.pdf');
  ok(/GIVE-AWAY/i.test(ph.text) && ph.text.includes('Give-away 4.1 g a pack — 41 kg a shift — because the mean (404.1 g) sits 4.1 g over the nominal. Give £ a kg to say it in money.') && ph.text.includes('In money from: 10,000 a shift · 5 shifts a week.'),
    `9d give-away on paper, the missing input said (${ph.pages} page${ph.pages === 1 ? '' : 's'})`);
  /* 9f · the phone: the fate chips inside the screen, under the last reading */
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/capability/${rej}`);
  const inside = await page.locator('.ie-cap-box .ie-fates .chip').evaluateAll(els => els.length === 3 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390 && r.height >= 28; }));
  ok(inside && (await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '9f the phone: the three chips under the last reading, inside the screen');
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- 10 · W1: rejects out of what was made (FC-098, FC-088, FC-102) ---- */
const addRun = async (made, rejected) => { await page.getByRole('textbox', { name: 'Made' }).fill(String(made)); await page.getByRole('textbox', { name: 'Rejected' }).fill(String(rejected)); await page.getByRole('button', { name: 'Add the run' }).click(); await page.waitForTimeout(250); };
const RUNS = [[4800, 24], [5100, 31], [4650, 19], [5000, 28], [4900, 41], [5200, 22]];
const truthMode = id => page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/capability/sample.ts'); const SL = await import('/src/tools/capability/sampleLean.ts');
  const s = await getStudy(id); const a = s.agreed?.readings; const f = S.sample(a, s.facts.readings ?? []); const said = S.sampleSays(f, a);
  return { a, n: f.n, said, runs: f.runs, faults: f.faults, rate: f.rate, machine: f.machine, fill: f.fill, question: f.question, weigher: f.weigher, notes: S.modeNotes(f, a), money: S.moneySays(S.sampleMoney(f, a), f, a), tiles: SL.sampleTiles(f, a, said), closing: SL.sampleClosing(f, a, said).text };
}, id);
const sameMode = async (t, tag) => {
  const say = await words('.ie-say'), cap = await words('.ie-cap');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  const tilesOk = t.tiles.every(x => tiles.includes(flat(String(x.v))));
  ok(say === t.said.text && cap === (t.said.capability?.text ?? null) && tilesOk && (await words('.ln-close'))?.includes(t.closing.slice(0, 30)), `${tag}: "${say}" — the second sentence, the tiles and the closing line as the module says`);
};
const rejects = await startStudy('Rejects — Finest 2kg, nights', 'Ilapak flow wrapper');
{
  await page.getByRole('radio', { name: /^Rejects out of what was made/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel(/At most what % rejected/).count()) === 1 && (await page.getByLabel('How many runs').inputValue()) === '10' && (await page.getByLabel('Unit').count()) === 0 && (await page.getByLabel(/A pack’s materials/).count()) === 1,
    '10 rejects asks the maximum agreed and how many runs (10 by default), a pack’s materials for the money — no unit, no limits');
  await page.getByLabel(/At most what % rejected/).fill('1'); await page.getByLabel('How many runs').fill('6');
  await page.getByLabel('Packs a shift').fill('20000'); await page.getByLabel(/A pack’s materials/).fill('0.25'); await page.getByLabel('Shifts a week').fill('10');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed b')) === 'rejects out of what was made, 6 runs — at most 1% rejected', `10 agreed: "${await words('.ie-agreed b')}"`);
  ok((await page.getByRole('button', { name: 'Add the run' }).isDisabled()), '10 Add the run waits for both counts');
  await page.getByRole('textbox', { name: 'Made' }).fill('100'); await page.getByRole('textbox', { name: 'Rejected' }).fill('200');
  ok((await words('.ie-problem')) === 'Rejected cannot be more than made.', '10 more rejected than made — refused, said why');
  for (const [m, r] of RUNS.slice(0, 2)) await addRun(m, r);
  let t = await truthMode(rejects);
  ok(t.n === 2 && t.said.text.endsWith('the bounds are said from 3 runs — 2 so far.') && (await words('.ie-say')) === t.said.text, `10 two runs in: "${t.said.text}"`);
  for (const [m, r] of RUNS.slice(2)) await addRun(m, r);
  t = await truthMode(rejects);
  ok(t.runs.made === 29650 && t.runs.rejected === 165 && t.said.verdict === 'Met' && t.runs.laney === true, `10 six runs: 165 of 29,650, Laney applied (σz ${t.runs.sigmaZ.toFixed(2)}), Met against 1%`);
  await sameMode(t, '10 six runs in');
  ok(/Laney’s limits are drawn/.test(await words('.ie-cap')) && /Compared with a measurement: Z 2\.54, about Ppk 0\.85/.test(await words('.ie-cap')), `10 the chart's reading, Laney said, the comparison: "${(await words('.ie-cap')).slice(0, 120)}…"`);
  const bars = await page.locator('svg.ie-modebars rect.ie-bar').count();
  ok(bars === 6 && (await page.locator('svg.ie-modebars rect.ie-bar.is-out').count()) === 0 && (await page.locator('svg.ie-modebars line.ie-ucl').count()) >= 6 && /at most 1\.00%/.test(flat(await page.locator('svg.ie-modebars').textContent())),
    `10 the p-chart: ${bars} bars with their limits, none outside, the maximum drawn`);
  ok((await words('.ie-money')) === t.money.text && /loses about 111 packs — £28 of materials, £278 a week — because of the rejects\.$/.test(t.money.text), `10 the money: "${t.money.text}"`);
  await page.getByRole('button', { name: /^Every reading/ }).click(); await page.waitForTimeout(300);
  ok((await all('.ie-rows li b'))[4] === '41 of 4,900', `10 each run on its row as made and rejected: "${(await all('.ie-rows li b'))[4]}"`);
  /* the maximum changed to 0.5%: not met, said why */
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.getByLabel(/At most what % rejected/).fill('0.5'); await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  t = await truthMode(rejects);
  ok(t.said.verdict === 'Not met' && (await words('.ie-say')) === t.said.text && /— Not met: 0\.56% is above it\.$/.test(t.said.text) && (await page.locator('.ie-say.is-r').count()) === 1, `10 at most 0.5%: "${t.said.text.slice(-60)}"`);
}

/* ---- 11 · W1: faults found on each item (FC-099, FC-089, FC-124, FC-125) ---- */
const faults = await startStudy('Pack inspection — seal, label, print', 'Tray sealer');
{
  await page.getByRole('radio', { name: /^Faults found on each item/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel(/At most how many faults per 100 items/).count()) === 1 && (await page.getByLabel(/Opportunities an item/).count()) === 1 && (await page.getByLabel(/The kinds of fault/).count()) === 1, '11 faults asks the maximum per 100, the opportunities (optional) and the kinds');
  await page.getByLabel(/At most how many faults per 100 items/).fill('2'); await page.getByLabel('How many inspections').fill('5');
  await page.getByLabel(/The kinds of fault/).fill('Open seal, Light pack, Mis-label, Crushed, Wrong date');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed b')) === 'faults found on each item, 5 inspections — at most 2 per 100 items', `11 agreed: "${await words('.ie-agreed b')}"`);
  const chips = await page.getByRole('group', { name: 'Faults found, by kind' }).getByRole('button', { name: /^One more/ }).allInnerTexts();
  ok(chips.length === 5 && flat(chips[0]) === 'Open seal' && (await page.getByPlaceholder('Other').count()) === 1, `11 the five kinds as chips, Other typed: ${chips.map(flat).join(' · ')}`);
  const INSP = [[200, { 'Open seal': 4, 'Light pack': 5 }], [200, { 'Open seal': 6, 'Light pack': 7, 'Mis-label': 1 }], [250, { 'Open seal': 5, 'Light pack': 6 }], [200, { 'Light pack': 4, 'Crushed': 2 }], [300, { 'Open seal': 8, 'Light pack': 9 }]];
  for (const [items, kinds] of INSP) {
    await page.getByLabel('Items inspected').fill(String(items));
    for (const [k, c] of Object.entries(kinds)) for (let i = 0; i < c; i++) await page.getByRole('button', { name: `One more ${k}` }).click();
    await page.getByRole('button', { name: /^Add the inspection/ }).click(); await page.waitForTimeout(250);
  }
  let t = await truthMode(faults);
  ok(t.faults.items === 1150 && t.faults.faults === 57 && t.said.verdict === 'Not met', `11 five inspections: 57 faults on 1,150 items — ${t.said.verdict}`);
  await sameMode(t, '11 five inspections in');
  ok(/^Light pack and open seal are 95% of the faults\./.test(await words('.ie-cap')), `11 the Pareto line: "${(await words('.ie-cap')).slice(0, 60)}"`);
  const pareto = await page.locator('.ie-pareto svg rect.ie-bar').count();
  ok(pareto === 4 && (await page.locator('.ie-pareto polyline.ie-cum').count()) === 1 && (await page.locator('.ie-pareto').getByRole('button', { name: 'By money' }).count()) === 0,
    `11 the Pareto: ${pareto} kinds and the cumulative line; no money toggle without a pack's materials`);
  /* the opportunities typed: DPMO and the sigma level appear */
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.getByLabel(/Opportunities an item/).fill('6'); await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  t = await truthMode(faults);
  ok(/8,261 per million opportunities \(6 an item\) — Z 2\.4, a 3\.9-sigma process by the 1\.5-shift convention\./.test(await words('.ie-cap')) && t.faults.dpmo.opportunities === 6, '11 DPMO once the opportunities are typed, the convention named');
  const u = await page.locator('svg.ie-modebars rect.ie-bar').count();
  ok(u === 5 && (await page.locator('svg.ie-modebars rect.ie-bar.is-out').count()) === 0, `11 the u-chart: ${u} inspections as bars, none outside`);
}

/* ---- 12 · W1: held at a rate for a time (FC-083) ---- */
const MINUTES = [60, 58, 61, 63, 65, 62, 60, 55, 54, 67, 63, 58, 59, 67, 63, 57, 62, 59, 60, 61, 60, 64, 62, 60, 63];
const rate = await startStudy('Wrapper held at 60 — the trial', 'Ilapak flow wrapper');
{
  await page.getByRole('radio', { name: /^Held at a rate/ }).click(); await page.waitForTimeout(200);
  const sides = await page.getByRole('radiogroup', { name: 'Judged against' }).getByRole('radio').allInnerTexts();
  ok(sides.length === 2 && /^At least/.test(flat(sides[0])) && (await page.getByLabel('At least, a minute').count()) === 1 && (await page.getByLabel('Minutes in an interval').inputValue()) === '1' && (await page.getByLabel(/Held with gaps from what %/).inputValue()) === '90',
    '12 a rate is at least or at most, a minute; the interval 1 minute and held with gaps from 90% by default');
  ok((await words('.ie-problem')) === 'The rate — at least or at most what, a minute?', '12 no rate typed — refused, said why');
  await page.getByLabel('Unit').fill('packs'); await page.getByLabel('At least, a minute').fill('60'); await page.getByLabel('How many intervals').fill('25');
  ok((await words('.ie-note')) === '25 intervals of 1 — the rate must hold for 25 minutes.', `12 the time it must hold, said while agreeing: "${await words('.ie-note')}"`);
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await words('.ie-agreed b')) === 'at least 60 packs a minute for 25 minutes (25 intervals of 1)', `12 agreed: "${await words('.ie-agreed b')}"`);
  await typeAll(MINUTES);
  let t = await truthMode(rate);
  ok(t.rate.met === 18 && t.rate.stretchMin === 7 && t.rate.made === 1523 && t.said.verdict === 'Not held', `12 twenty-five minutes: met 18, the stretch 7, 1,523 made — ${t.said.verdict}`);
  await sameMode(t, '12 the trial in');
  ok(/^One-sided Ppk on the rates 0\.10/.test(await words('.ie-cap')) && (await page.locator('.ie-cap.is-a').count()) === 1, `12 the Ppk on the rates, amber: "${(await words('.ie-cap')).slice(0, 70)}"`);
  ok((await page.locator('svg.ie-modebars rect.ie-bar.is-met').count()) === 18 && (await page.locator('svg.ie-modebars rect.ie-bar.is-miss').count()) === 7 && (await page.locator('svg.ie-modebars line.ie-lim').count()) === 1,
    '12 the bars: 18 met in teal, 7 missed in amber, the floor drawn');
  /* held with gaps at 70% */
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.getByLabel(/Held with gaps from what %/).fill('70'); await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  t = await truthMode(rate);
  ok(t.said.verdict === 'Held with gaps' && (await words('.ie-say')) === t.said.text && /a dip to 55, 54, 58, 59 at minutes/.test(t.said.text) === false && /7 intervals missed\.$/.test(t.said.text), `12 at 70%: "${t.said.text.slice(-70)}"`);
}

/* ---- 13 · W1: a measurement's question — one machine's parts (FC-084), a weigher's heads ---- */
const machine = await startStudy('Slicer thickness — FAT, 50 parts', 'Weber slicer');
{
  const qs = await page.getByRole('radiogroup', { name: 'Which question?' }).getByRole('radio').allInnerTexts();
  ok(qs.length === 6 && /^A measurement/.test(flat(qs[0])) && /^One machine’s parts/.test(flat(qs[5])) && (await page.getByLabel('Cmk agreed for acceptance').count()) === 0, `13 the question row on a measurement: ${qs.map(q => `"${flat(q).split(/ (?=[a-z])/)[0]}"`).join(', ')}`);
  await page.getByRole('radio', { name: /^One machine’s parts/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel('Cmk agreed for acceptance').inputValue()) === '1.67', '13 one machine’s parts asks the Cmk agreed — 1.67 by default');
  await page.getByLabel('Unit').fill('mm'); await page.getByLabel('Lower limit').fill('398'); await page.getByLabel('Upper limit').fill('403'); await page.getByLabel('How many readings').fill('50');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  const PARTS = Array.from({ length: 50 }, (_, i) => Math.round((400.29 + 0.773 * Math.sin(i * 1.7) * 1.4) * 100) / 100);
  await typeAll(PARTS);
  const t = await truthMode(machine);
  const note = await words('[data-note=machine]');
  ok(t.machine && t.machine.accepted === false && note === t.notes.find(n => n.k === 'machine').text && /^Cm \d\.\d\d, Cmk \d\.\d\d on 50 consecutive parts against 1\.67 agreed — Not accepted/.test(note) && (await page.locator('[data-note=machine].is-r').count()) === 1,
    `13 machine capability beside the measurement, red: "${note}"`);
}
/* 13b · a CCP's limit with the probe's guard band (FC-169), where the limit comes from said */
const ccp = await startStudy('Cook CCP — core temperature, line 7', 'Spiral oven');
{
  await page.getByRole('radio', { name: /^A CCP’s/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel(/Where the limit comes from/).count()) === 1 && (await page.getByLabel(/The probe reads high at the limit by/).count()) === 1, '13b a CCP asks where the limit comes from and the probe’s bias at it');
  await page.getByRole('radiogroup', { name: 'Judged against' }).getByRole('radio', { name: /^At least/ }).click(); await page.waitForTimeout(150);
  await page.getByLabel('Unit').fill('°C'); await page.getByLabel('At least', { exact: true }).fill('75'); await page.getByLabel('How many readings').fill('10');
  await page.getByLabel(/Where the limit comes from/).fill('the HACCP plan'); await page.getByLabel(/The probe reads high at the limit by/).fill('0.14');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll([75.7, 76.9, 78.2, 77.4, 75.1, 79.0, 76.3, 75.08, 77.7, 74.8]);
  const t = await truthMode(ccp);
  const note = await words('[data-note=question]');
  ok(t.question && t.question.over === 1 && t.question.guard === 2 && note === t.notes.find(n => n.k === 'question').text && note === 'CCP: the critical limit is at least 75.00 °C (the HACCP plan); 1 deviation — the product since the last good check is held. With the probe reading +0.14 °C at the limit, a check must read 75.14 °C to be sure of 75.00 °C — 2 readings sit inside that guard band, not shown safe.' && (await page.locator('[data-note=question].is-r').count()) === 1,
    `13b the CCP's note, red: "${note}"`);
}
/* 13c · a weigher's heads (FC-158): the head typed with each reading, the heavy head found by the ANOVA */
const weigher = await startStudy('Multihead — 150 g, heads compared', 'Ishida CCW-RV-214W multihead weigher');
{
  await page.getByRole('radio', { name: /^A weigher’s heads/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Unit').fill('g'); await page.getByLabel('Lower limit').fill('30'); await page.getByLabel('Upper limit').fill('50'); await page.getByLabel('How many readings').fill('20');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok((await page.getByLabel('Head').count()) === 1, '13c the pad carries a Head box');
  const HEADS = { 1: [37.2, 37.9, 37.4, 38.1, 36.8], 2: [37.6, 37.1, 38.0, 37.3, 37.7], 3: [43.1, 43.8, 43.4, 43.9, 43.3], 4: [37.5, 36.9, 37.8, 37.2, 37.6] };
  for (const [h, xs] of Object.entries(HEADS)) { await page.getByLabel('Head').fill(h); await page.getByLabel('Head').blur(); await page.waitForTimeout(100); await typeAll(xs); }
  const t = await truthMode(weigher);
  const note = await words('[data-note=weigher]');
  ok(t.weigher && t.weigher.far.head === 3 && t.weigher.anova.p < 0.001 && note === t.notes.find(n => n.k === 'weigher').text && note === 'Heads: 4 heads read (5 each); head 3 runs 6.0 g heavy (43.5 against 37.5 on the others) — the heads differ (ANOVA p < 0.001) — the fix is that head’s feeder, not the target.' && (await page.locator('[data-note=weigher].is-a').count()) === 1,
    `13c the heads compared, the heavy one found: "${note}"`);
  ok((await all('.ie-last li b'))[0] === '37.6 g · head 4', `13c the last reading says its head: "${(await all('.ie-last li b'))[0]}"`);
}

/* ---- 14 · W1: the lowest legal fill on a sold-by-weight study (FC-157) ---- */
const fill = await startStudy('Fill weight — 400 g bags, the lowest legal target', 'Ishida CCW-RV-214W multihead weigher');
{
  await page.getByRole('radio', { name: /^Sold by weight/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Nominal (on the pack)').fill('400'); await page.getByLabel(/What the product costs you a kilo/).fill('18');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll([404.1, 404.1, 404.1, 404.1]);
  const t = await truthMode(fill);
  ok(t.fill === undefined && (await page.locator('[data-note=fill]').count()) === 0, '14 four readings: the fill note waits for 25');
  await typeAll(Array.from({ length: 26 }, (_, i) => Math.round((402.5 + 2.1 * Math.sin(i * 2.3)) * 10) / 10));
  const u = await truthMode(fill);
  const note = await words('[data-note=fill]');
  ok(u.fill && u.fill.binds === 1 && note === u.notes.find(n => n.k === 'fill').text && /^At this spread the lowest target that keeps the three rules is 400\.0 g \(the average rule binds\); the mean of \d+\.\d gives \d\.\d g a pack away( — £\d+\.\d\d a 100 packs)?\.$/.test(note),
    `14 the lowest legal fill: "${note}"`);
}
/* 14b · a volume pack checked by weight (FC-163): the millilitres and the density make the nominal in grams */
const volume = await startStudy('Juice 400 ml — checked by weight', 'Rotary filler');
{
  await page.getByRole('radio', { name: /^Sold by weight/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel(/Sold by volume — the nominal in ml/).fill('400');
  ok((await page.getByLabel('Nominal (on the pack)').count()) === 0 && (await words('.ie-problem')) === 'The density in g/ml — the product’s, at the temperature it is packed.', '14b with millilitres typed the nominal in grams is not asked and the density is');
  await page.getByLabel(/Density, g\/ml/).fill('1.03');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll([412.5, 411.9, 413.1, 412.2, 410.8]);
  const t = await truthMode(volume);
  const note = await words('[data-note=density]');
  ok(t.a.nominal === 412 && t.a.nominalMl === 400 && t.a.density === 1.03 && note === t.notes.find(n => n.k === 'density').text && note.startsWith('Sold by volume, checked by weight: 400 ml at 1.03 g/ml is 412.0 g; the tolerable negative error 12 ml is 12.36 g — the three rules run in grams (T1 399.64 g, T2 387.28 g).'),
    `14b the nominal kept in grams and the rules said in grams: "${note.slice(0, 120)}…"`);
}

/* ---- 15 · W1 on paper and on the phone ---- */
{
  await go(`#/capability/${rejects}`);
  let p = await pdf('rejects.pdf');
  ok(/MADE/i.test(p.text) && /REJECTED/i.test(p.text) && /AGREED AT MOST/i.test(p.text) && /The runs, in the order counted/i.test(p.text) && p.text.includes('41') && /Laney’s limits/.test(p.text) && /Not met: 0.56% is above it/.test(p.text),
    `15 rejects on paper: the cells, the runs' table, the chart with Laney's limits, the verdict (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  await go(`#/capability/${faults}`);
  p = await pdf('faults.pdf');
  ok(/PER ITEM/i.test(p.text) && /Faults by kind — the tally and its Pareto/i.test(p.text) && /Light pack 31 54% 54%/.test(p.text) && /8,261 per million opportunities/.test(p.text) && /The inspections, in the order made/i.test(p.text),
    `15 faults on paper: the tally with shares, DPMO, the inspections (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  await go(`#/capability/${rate}`);
  p = await pdf('rate.pdf');
  ok(/INTERVALS MET/i.test(p.text) && /LONGEST STRETCH/i.test(p.text) && /Missed: minute 2 \(58 packs\)/.test(p.text) && /Held with gaps/.test(p.text), `15 the rate on paper: met, the stretch, the misses by minute (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  await go(`#/capability/${machine}`);
  p = await pdf('machine.pdf');
  ok(/Cm \d\.\d\d, Cmk \d\.\d\d on 50 consecutive parts against 1\.67 agreed/.test(p.text), '15 machine capability on paper, beside the checks');
  await go(`#/capability/${ccp}`);
  p = await pdf('ccp.pdf');
  ok(/CCP: the critical limit is at least 75.00 °C \(the HACCP plan\); 1 deviation/.test(p.text) && /a check must read 75.14 °C/.test(p.text), '15 the CCP’s guard band on paper');
  await go(`#/capability/${weigher}`);
  p = await pdf('weigher.pdf');
  ok(/Heads: 4 heads read \(5 each\); head 3 runs 6.0 g heavy/.test(p.text) && /BY HEAD/i.test(p.text) && /Head Readings Mean Spread \(s\) Against the others/.test(p.text) && /3 5 43\.5 g 0\.3\d \+6\.0 g/.test(p.text) && /36\.8 H1/.test(p.text),
    `15 the weigher on paper: the heads' table and each reading's head (${p.pages} page${p.pages === 1 ? '' : 's'})`);
  /* the phone: the six cards and the two-box capture inside the screen */
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/capability/${rejects}`);
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(400);
  const inside = await page.locator('.ie-kind').evaluateAll(els => els.length === 6 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; }));
  ok(inside && (await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '15 the phone: the six cards inside the screen');
  await page.getByRole('button', { name: 'Keep what was agreed' }).click(); await page.waitForTimeout(300);
  const cap = await page.locator('.ie-runs-cap .text-input').evaluateAll(els => els.length === 2 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390 && r.height >= 36; }));
  ok(cap && (await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '15 the phone: the two boxes of a run fit, big enough for a thumb');
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- 16 · W3c: readings that are not bell-shaped — the tail fitted beside the count (FC-096, knowledge/specs/FC-114-fitting.md) ---- */
const STOPS = [18.4, 78.4, 15.1, 14.5, 23.6, 17.3, 42.7, 10.8, 66.7, 60.8, 1.0, 34.2, 10.2, 18.8, 27.2, 29.2, 30.0, 73.1, 18.8, 15.0, 42.7, 78.3, 72.0, 64.0, 7.4, 75.4, 41.2, 62.7, 26.7, 16.7, 53.1, 42.1, 51.7, 15.7, 11.9, 50.3, 3.5, 78.0, 12.0, 37.9];
const FILLS = [249.0, 248.4, 249.7, 250.5, 251.4, 250.1, 249.3, 249.1, 250.9, 252.0, 250.3, 248.5, 248.9, 251.9, 250.2, 247.9, 249.9, 248.6, 249.2, 249.4, 249.1, 250.7, 249.9, 249.3, 250.5, 251.0, 248.0, 249.7, 248.8, 249.8, 248.5, 250.0, 250.0, 249.6, 248.7, 249.5, 248.7, 248.4, 250.3, 248.7];
const stops = await startStudy('Minutes between short stops', 'Wrapper');
{
  await page.getByRole('radio', { name: /^At least/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Unit').fill('min'); await page.getByLabel('At least', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll(STOPS.slice(0, 15));
  ok((await page.locator('[data-note=fitted]').count()) === 0, '16 fifteen readings: the fitted note waits for 20');
  await typeAll(STOPS.slice(15));
  const t = await truthMode(stops);
  const note = await words('[data-note=fitted]');
  ok(t.notes.some(n => n.k === 'fitted') && note === t.notes.find(n => n.k === 'fitted').text && note === 'Not bell-shaped, so the tail is fitted: a Weibull fits (Anderson–Darling p = 0.15) — 12.0% would be under 10 min, Ppk 0.69 by the percentile method; as counted, 3 of 40 are under 10 min. The Weibull’s tail from 40 readings is a model’s reach, not a measurement.',
    `16 stops at least 10 minutes: "${note}" (SciPy: Weibull β 1.4851, η 39.973, A* 0.5864, p 0.1462; share under 10: 0.1199; percentile Ppk 0.6901)`);
  ok((await page.locator('[data-note=fitted].is-a').count()) === 1 && (await page.locator('[data-note=fitted].is-g').count()) === 0, '16 …amber, never green');
  ok((await words('.ie-cap'))?.startsWith('Not capable: Ppk 0.36') && (await words('.ie-cap')) === t.said.capability?.text, `16 the study’s own sentences are unchanged beside it: "${await words('.ie-cap')}"`);
  const p = await pdf('stops.pdf');
  ok(p.text.includes('Not bell-shaped, so the tail is fitted: a Weibull fits (Anderson–Darling p = 0.15)') && p.text.includes('as counted, 3 of 40 are under 10 min'), '16 the same note on the capability paper');
}
{
  /* oxygen, now agreed at most 0.6: no shape fits */
  await go(`#/capability/${oxygen}`);
  const t = await truthMode(oxygen);
  const note = await words('[data-note=fitted]');
  ok(t.notes.some(n => n.k === 'fitted') && note === t.notes.find(n => n.k === 'fitted').text && note === 'Not bell-shaped, and no shape tried fits (the lognormal is nearest, Anderson–Darling p = 0.00057) — the share outside is the count as measured: 4 of 30 are over 0.6 %.',
    `16 oxygen at most 0.6%: "${note}" (SciPy: every shape rejected; lognormal A² 1.5004)`);
  ok((await words('.ie-cap')) === 'Not capable: Ppk 0.30 from 30 — as measured, 4 of 30 are outside.', '16 …and the study’s sentence is exactly as it was');
}
const bell = await startStudy('Fill weights — a steady filler', 'Filler');
{
  await page.getByLabel('Lower limit').fill('247'); await page.getByLabel('Upper limit').fill('253'); await page.getByLabel('Unit').fill('g');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  await typeAll(FILLS);
  const t = await truthMode(bell);
  ok(t.notes.every(n => n.k !== 'fitted') && (await page.locator('[data-note=fitted]').count()) === 0, '16 bell-shaped readings carry no fitted note');
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/capability/${stops}`);
  const inside = await page.locator('[data-note=fitted]').evaluateAll(els => els.length === 1 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= 391; }));
  ok(inside && (await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '16 the phone: the fitted note inside the screen');
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- 17 · W3c: several deposits in one pack (FC-116, knowledge/specs/FC-116-stackup.md) ---- */
const MEAL = 'Rice, 120, 3.0\nSauce, 80, 2.5\nVegetables, 60, 2.0\nGarnish, 40, 1.5';
const meal = await startStudy('Chicken and rice meal, 300 g', 'Ready-meal line');
{
  await page.getByRole('radio', { name: /^Sold by weight/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Nominal (on the pack)').fill('300');
  await page.getByLabel('The deposits', { exact: true }).fill('Rice, 120\nSauce, 80, 2.5');
  ok(/^A deposit is a line — its name, its mean and its spread/.test((await words('.ie-problem')) ?? '') && (await page.getByRole('button', { name: 'Agree these' }).isDisabled()), '17 a deposit with no spread: said at the box, Agree held');
  await page.getByLabel('The deposits', { exact: true }).fill('Rice, 120, 3.0');
  ok((await words('.ie-problem')) === 'Two deposits at least — a pack of one is the study itself.', '17 one deposit: refused');
  await page.getByLabel('The deposits', { exact: true }).fill(MEAL);
  await page.getByLabel('Packs a shift').fill('5000'); await page.getByLabel(/What the product costs you a kilo/).fill('18');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  let t = await truthMode(meal);
  let note = await words('[data-note=stack]');
  const want = '4 deposits make 300.0 g: the pack’s spread is 4.64 g — the deposits’ spreads add as squares, not as a sum (the worst case, every deposit at its 3σ at once, 27.0 g, almost never happens). At that spread the lowest target that keeps the three rules is 300.1 g (the 1-in-40 rule binds); the deposits average 300.0 g, 0.1 g short of it — raise a deposit or tighten them. Rice holds 42% of the spread; halving its spread brings the pack’s to 3.84 g and the target to 300.0 g — 0.1 g a pack saved — about 0.4 kg and £7.92 a shift because of the give-away.';
  ok(note === t.notes.find(n => n.k === 'stack').text && note === want && (await page.locator('[data-note=stack].is-a').count()) === 1, `17 the four deposits, before any pack is weighed: "${note?.slice(0, 120)}…" (NumPy: spread 4.63681, rice 41.9%, 300.0880 → 300.0, £7.92)`);
  await typeAll(Array.from({ length: 30 }, (_, i) => Math.round((300 + 12 * Math.sin(i * 2.1)) * 10) / 10));
  t = await truthMode(meal);
  note = await words('[data-note=stack]');
  ok(note === t.notes.find(n => n.k === 'stack').text && /The 30 pack readings spread \d+\.\d+ g, wider than the deposits give — they may move together, or something else adds; the pack’s own spread is the final word\.$/.test(note), '17 thirty pack readings: their own spread beside the deposits’, the last word to the readings');
  const p = await pdf('meal.pdf');
  ok(p.text.includes('4 deposits make 300.0 g: the pack’s spread is 4.64 g') && p.text.includes('Rice holds 42% of the spread'), '17 the same note on the capability paper');
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/capability/${meal}`);
  ok(await page.locator('[data-note=stack]').evaluateAll(els => els.length === 1 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= 391; })) && (await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '17 the phone: the note inside the screen');
  await page.setViewportSize({ width: 1360, height: 900 });
}
const floorS = await startStudy('Meal minimum 290 g, kept to 1 in 1,000', 'Ready-meal line');
{
  await page.getByRole('radio', { name: /^At least/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('Unit').fill('g'); await page.getByLabel('At least', { exact: true }).fill('290');
  await page.getByLabel('The deposits', { exact: true }).fill(MEAL);
  await page.getByLabel('Packs a shift').fill('5000'); await page.getByLabel('Shifts a week').fill('10'); await page.getByLabel(/What the product costs you a kilo/).fill('18');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  const t = await truthMode(floorS);
  const note = await words('[data-note=stack]');
  ok(note === t.notes.find(n => n.k === 'stack').text && note.includes('the pack must average 304.3 g (the floor plus 3.09 × the spread)') && note.includes('2.5 g a pack saved — about 12 kg and £221 a shift, £2,214 a week because of the give-away.'),
    `17 a floor of 290 g kept to 1 in 1,000: "${note?.slice(190, 420)}…" (NumPy: 304.3288 → 301.8683, 2.4606 g, £221.45, £2,214.5)`);
  await go('#/capability'); await go(`#/capability/${floorS}`);
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.getByRole('radio', { name: /^At most/ }).click(); await page.waitForTimeout(200);
  ok((await page.getByLabel('The deposits', { exact: true }).count()) === 0, '17 an “at most” study is not offered the deposits');
  await page.getByRole('button', { name: 'Keep what was agreed' }).click(); await page.waitForTimeout(300);
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
