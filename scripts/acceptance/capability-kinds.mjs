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
  ok(kinds.length === 3 && /^A measurement/.test(flat(kinds[0])) && /^Sold by weight/.test(flat(kinds[1])) && /^Pass or fail/.test(flat(kinds[2])) && kinds.every(k => flat(k).split(' ').length > 3),
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
  /* 9c · pass or fail: ✗ Failed shows the three fates, waste unless tapped; the rejects by fate at the packs a shift */
  const rej = await startStudy('Seal check — after the jaw fix, costed', 'Ilapak flow wrapper');
  await page.getByRole('radio', { name: /^Pass or fail/ }).click(); await page.waitForTimeout(200);
  await page.getByLabel('How many may fail').fill('2');
  await page.getByLabel('Packs a shift').fill('10000'); await page.getByLabel('Shifts a week').fill('5');
  ok((await page.getByLabel(/A pack’s materials/).count()) === 1 && (await page.getByLabel(/To rework one pack/).count()) === 1 && (await page.getByLabel(/What the product costs you a kilo/).count()) === 0, '9c pass or fail asks a pack’s materials and one rework, not a cost a kilo');
  await page.getByLabel(/A pack’s materials/).fill('0.25'); await page.getByLabel(/To rework one pack/).fill('0.12');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  const good = page.getByRole('button', { name: 'Good', exact: true }), bad = page.getByRole('button', { name: 'Failed', exact: true });
  ok((await page.locator('.ie-fates').count()) === 0, '9c no fate asked while nothing has failed');
  for (let i = 1; i <= 20; i++) { await (i === 5 || i === 12 ? bad : good).click(); await page.waitForTimeout(60); if (i === 12) { await page.waitForTimeout(300); await page.getByRole('radio', { name: 'Reworked' }).click(); await page.waitForTimeout(200); } }
  await page.waitForTimeout(600);
  const fates = page.locator('.ie-fates').first();
  ok((await fates.getAttribute('aria-label')) === 'What became of no. 12?' && (await all('.ie-fates [role=radio]')).slice(0, 3).join(' · ') === 'Waste · Reworked · Recovered by hand'
    && (await page.getByRole('radio', { name: 'Reworked' }).first().getAttribute('aria-checked')) === 'true', `9c the three fates under the last failed item, Reworked tapped: ${(await all('.ie-fates [role=radio]')).slice(0, 3).join(' · ')}`);
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

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
