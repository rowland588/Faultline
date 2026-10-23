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
  const { getStudy } = await import('/src/db.ts'); const S = await import('/src/lib/ie/sample.ts'); const SL = await import('/src/lib/ie/sampleLean.ts');
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
  const plan0 = await page.evaluate(async () => (await import('/src/lib/ie/sample.ts')).passFailPlan(20, 0));
  ok((await words('.ie-plan')) === plan0, `4 what it would prove, said while agreeing: "${await words('.ie-plan')}"`);
  await page.getByLabel('How many may fail').fill('20'); await page.waitForTimeout(150);
  ok(flat(await page.locator('.ie-problem').innerText()) === 'At most 19 of 20 may fail.' && await page.getByRole('button', { name: 'Agree these' }).isDisabled(), '4 twenty of twenty allowed to fail — refused');
  await page.getByLabel('How many may fail').fill('1'); await page.waitForTimeout(150);
  const plan1 = await page.evaluate(async () => (await import('/src/lib/ie/sample.ts')).passFailPlan(20, 1));
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
    && (await words('.ie-cap')) === '1 failed in 20 proves fewer than 22 in 100 would fail (95% sure); to show fewer than 1 in 100 takes 473 checked with 1 failed.',
    `4 passed, and what it proves: "${await words('.ie-cap')}"`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(/Checked\s*20/i.test(tiles) && /Failed\s*1\s*of 1 allowed/i.test(tiles) && /Proves\s*< 22 in 100/i.test(tiles), `4 the tiles: checked, failed of allowed, what it proves — "${tiles.slice(0, 120)}…"`);
  const p = await pdf('seal.pdf');
  ok(/MAY FAIL/i.test(p.text) && p.text.includes('fewer than 22 in 100') && /\b7 failed\b/.test(p.text) && /\b12 failed struck\b/.test(p.text) && (p.text.match(/\bgood\b/g) ?? []).length >= 19,
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

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
