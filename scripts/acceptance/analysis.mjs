/* W3a — THE ANALYSIS, driven (knowledge/specs/FC-105-analysis.md, acceptance criteria 3–8; 24 October 2026):
 * the question asked first — how sure, did it change, do two ways agree, how many readings — and the answer in
 * words with its margin, "we can be 95% confident": on screen against the module, on paper read back, on a phone.
 * The independent figures are SciPy's (knowledge/specs/FC-105-analysis.md §6); the page is checked against the
 * module (src/tools/analysis/analysis.ts) and against those literals.
 *
 *   1  the seeded analysis (twelve fill times before and after a re-calibration) — its row, the page against the
 *      module, the right way in green, the picture's three lanes, the line's page saying it
 *   2  how sure — a mean: thirty packs pasted, the interval and the spread, the histogram; 90 · 95 · 99%; a reading
 *      struck and restored; text that is not a number said; a wild reading flagged and kept; the pad
 *   3  how sure — a share (7 of 600) and a rate (12 in 40 hours), none found said
 *   4  did it change — measured: Before and After pasted, Welch and Mann–Whitney, the right way green, the wrong
 *      way red; counted: 14 of 400 → 5 of 380 said borderline
 *   5  do two ways agree — twelve pairs, the paired t and Wilcoxon; the difference that does not matter
 *   6  how many readings — a mean (38 with Student's t), two groups (52, 70 at 90% power), a share (2,401), zero
 *      failures (299), the cycles (six, one more)
 *   7  readings too close together — the AR(1) forty on the page, on a capability study's notes; the median and
 *      middle half under its histogram
 *   8  on paper: the sentence, the picture, the checks, every reading — the study and the list
 *   9  kept after a reload; the phone
 *
 * Fails on any console error.   node scripts/acceptance/analysis.mjs      (SMOKE_BASE, as smoke) */
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

const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8, 401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const BEF = [12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7], AFT = [12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5];
const P1 = [401.2, 400.8, 402.1, 399.9, 401.5, 400.4, 401.9, 400.7, 401.1, 402.4, 400.2, 401.6], P2 = [401.6, 401.1, 402.2, 400.5, 401.9, 400.3, 402.5, 401.2, 401.4, 402.9, 400.8, 402.1];
const AR = [399.6, 399.1, 399.33, 399.81, 400.45, 400.33, 399.92, 399.56, 400.11, 400.88, 400.67, 399.78, 399.39, 400.43, 400.36, 399.35, 399.57, 399.16, 399.18, 399.26, 399.2, 399.8, 399.85, 399.61, 399.97, 400.4, 399.42, 399.52, 399.22, 399.45, 399.02, 399.42, 399.64, 399.63, 399.25, 399.35, 399.07, 398.76, 399.37, 399.07];

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
/* WHAT THE MODULE SAYS on the same record, as stored now */
const truth = id => page.evaluate(async sid => {
  const { getStudy } = await import('/src/db.ts'); const A = await import('/src/tools/analysis/analysis.ts');
  const s = await getStudy(sid); const a = s.agreed?.analysis; const f = A.analysisFigures(a, s.facts.readings ?? []); const said = A.analysisSays(f, a);
  return { a, f: { p: f.p, significant: f.significant, leads: f.leads, kind: f.kind }, said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v, t.of ?? '']), closing: A.analysisClosing(f, a, said).text, checks: f.checks.map(c => c.say), lanes: A.analysisPicture(f, a).length };
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
const agree = async ({ question, of, data, better, name, unit, conf, first, second, within }) => {
  await page.getByRole('radio', { name: question }).click();
  if (of) await page.getByRole('radio', { name: of }).click();
  if (data) await page.getByRole('radio', { name: data }).click();
  if (better) await page.getByRole('radio', { name: better }).click();
  if (conf) await page.getByRole('radio', { name: conf, exact: true }).click();
  await page.getByLabel('What is measured').fill(name);
  if (unit !== undefined) await page.getByLabel('Unit', { exact: false }).first().fill(unit);
  if (first) await page.getByLabel('The first way').fill(first);
  if (second) await page.getByLabel('The second way').fill(second);
  if (within) await page.getByLabel(/^Largest difference that does not matter/).fill(within);
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
};
const paste = async (vals, label = /^Or paste readings/) => { await page.getByLabel(label).fill(vals.join('\n')); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(600); };
const reagree = async fn => { await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300); await fn(); await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(600); };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · the seeded analysis ---- */
{
  await go('#/analysis');
  ok(/^Analysis$/.test(flat(await page.locator('h1').first().innerText())), '1 the list’s name');
  const t = await truth(sd.analysisId);
  const row = flat(await page.locator(`.lt-li[data-study="${sd.analysisId}"]`).innerText());
  ok(row.includes('Fill time before and after the re-calibration') && row.includes(t.said.verdict) && row.includes('24 readings'), '1 the list’s row — its verdict and what was typed', row);
  await go(`#/analysis/${sd.analysisId}`);
  ok(t.f.significant && t.f.leads === 'welch' && t.said.tone === 'g' && t.said.verdict === 'Moved the right way', `1 the record: significant, the t leads, p ${t.f.p?.toFixed(4)}, green`);
  await sameAsModule(t, '1 the seeded analysis');
  ok(t.said.text === 'Before 12.81 s, after 12.31 s: it fell by 0.50 s — we can be 95% confident it fell by between 0.24 and 0.76 s (p = 0.0006). That is the right way for this measure. What moved it is the fix’s to say.', '1 the sentence, as SciPy’s figures say it (Welch t −4.0842, p 0.000594, −0.7556 to −0.2444)');
  ok((await page.locator('.ie-say.is-g').count()) === 1 && /Moved the right way/.test((await words('.ln-band')) ?? ''), '1 the sentence green and the band’s verdict said');
  ok((await page.locator('.ie-strip .ln-tile').count()) === 5 && (await page.locator('.ie-an-pic g').count()) === 3, '1 five tiles and the picture’s three lanes — before, after, the change on a zero line');
  const more = (await all('.ie-more')).join(' | ');
  ok(/Mann–Whitney: U 17\.5, p = 0\.0018 \(normal approximation, ties and continuity corrected\)/.test(more) && /Welch’s t −4\.08, 19\.7 degrees of freedom/.test(more), `1 the rank test beside the t: ${more.slice(0, 160)}`);
  ok(/^What this does not say/.test((await words('.ie-notclaimed')) ?? ''), '1 what it does not say is said');
  await go(`#/lines/${sd.wsId}`);
  const tile = flat(await page.locator('.pl-tool', { has: page.locator('b', { hasText: /^Analysis$/ }) }).innerText());
  ok(tile.includes('Fill time before') && tile.includes(t.said.verdict), '1 the line’s page — Analysis with its latest', tile);
}

/* ---- 2 · how sure — a mean ---- */
let mean;
{
  mean = await start('Thirty packs');
  ok(mean.length > 8, `2 started from the list: ${mean.slice(0, 8)}…`);
  const kinds = await all('[role=radiogroup][aria-label="What do you want to know?"] .ie-kind');
  ok(kinds.length === 12 && /^How sure am I of this figure/.test(kinds[0]) && /^Did it really change/.test(kinds[1]) && /^Do two ways of measuring agree/.test(kinds[2]) && /^Do these groups really differ/.test(kinds[3]) && /^Is one thing linked to the other/.test(kinds[4]) && /^Does one thing move with another/.test(kinds[5]) && /^How fast is a new job being learned/.test(kinds[6]) && /^How many readings/.test(kinds[7]) && /^Is this gauge fit/.test(kinds[8]) && /^How much of what we see is the measurement/.test(kinds[9]) && /^Do inspectors agree with themselves and the standard/.test(kinds[10]) && /^Which shape do these readings follow/.test(kinds[11]), `2 the twelve questions offered: ${kinds.map(k => k.split('?')[0]).join(' · ')}`);
  ok((await page.getByRole('radio', { name: '95%', exact: true, checked: true }).count()) === 1, '2 95% is the confidence unless another is picked');
  await page.getByLabel('What is measured').fill(''); await page.getByRole('button', { name: 'Agree these' }).click({ force: true }).catch(() => {});
  ok(/^What is measured/.test((await words('.ie-problem')) ?? ''), `2 no name — refused, said why: "${await words('.ie-problem')}"`);
  await agree({ question: /How sure am I/, name: 'Pack weight', unit: 'g' });
  ok((await words('.ie-agreed b')) === 'Pack weight — how sure, a mean measured · 95% confidence', `2 agreed: "${await words('.ie-agreed b')}"`);
  await paste(THIRTY);
  let t = await truth(mean);
  ok(t.said.text === '30 readings, mean 401.20 g — we can be 95% confident the true mean is between 400.97 and 401.42 g (± 0.22 g).' && t.said.verdict === 'Sure to ± 0.22 g', '2 the module says it as SciPy’s figures say it (t 2.0452, 400.9732–401.4202)');
  await sameAsModule(t, '2 thirty pasted');
  const more = (await all('.ie-more')).join(' | ');
  ok(/spread \(s\) is 0\.60 g; we can be 95% confident the true spread is between 0\.48 and 0\.80 g/.test(more) && /Middle half 400\.80–401\.60 g, median 401\.20 g, lean 0\.14/.test(more), `2 the spread’s interval and the middle half: ${more.slice(0, 190)}`);
  ok((await page.locator('.ie-an-pic g').count()) === 2 && (await page.locator('.ie-an-bar').count()) >= 5, '2 the histogram and the mean’s interval under it');
  await reagree(async () => { await page.getByRole('radio', { name: '99%', exact: true }).click(); });
  ok((await words('.ie-say'))?.includes('99% confident the true mean is between 400.90 and 401.50 g'), `2 99%: "${(await words('.ie-say'))?.slice(0, 120)}"`);
  await reagree(async () => { await page.getByRole('radio', { name: '90%', exact: true }).click(); });
  ok((await words('.ie-say'))?.includes('90% confident the true mean is between 401.01 and 401.38 g'), '2 90% said the same way');
  await reagree(async () => { await page.getByRole('radio', { name: '95%', exact: true }).click(); });
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Strike reading 2', exact: true }).click(); await page.waitForTimeout(600);
  ok((await words('.ie-say'))?.startsWith('29 readings'), '2 a reading struck — 29 counted');
  await page.getByRole('button', { name: 'Restore reading 2', exact: true }).click(); await page.waitForTimeout(600);
  ok((await words('.ie-say'))?.startsWith('30 readings'), '2 …and restored');
  await page.getByLabel(/^Or paste readings/).fill('abc 12x'); await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(500);
  ok(/Left out — not numbers: abc, 12x/.test((await words('.ie-paste .ie-problem')) ?? ''), `2 what is not a number is listed: "${await words('.ie-paste .ie-problem')}"`);
  await paste([410]);
  t = await truth(mean);
  ok(t.checks.some(c => /1 reading beyond the fences \(410 at reading 31\)/.test(c)) && (await words('.ie-checks'))?.includes('410 at reading 31') && t.said.text.startsWith('31 readings'), '2 a wild reading flagged and kept: "410 at reading 31"');
  for (const k of ['4', '0', '1', '.', '1']) await page.getByRole('button', { name: k, exact: true }).click();
  await page.getByRole('button', { name: 'Enter the reading' }).click(); await page.waitForTimeout(500);
  ok((await words('.ie-say'))?.startsWith('32 readings'), '2 the pad: 401.1 entered — 32 readings');
}

/* ---- 3 · how sure — a share and a rate ---- */
{
  const share = await start('Reject rate this week', 'Packer');
  await agree({ question: /How sure am I/, of: /A share — counted/, name: 'Reject rate', unit: '' });
  await page.getByLabel('Made').fill('300'); await page.getByLabel('Rejected').fill('3'); await page.getByRole('button', { name: 'Add the run' }).click(); await page.waitForTimeout(500);
  await page.getByLabel('Made').fill('300'); await page.getByLabel('Rejected').fill('4'); await page.getByRole('button', { name: 'Add the run' }).click(); await page.waitForTimeout(600);
  const t = await truth(share);
  ok(t.said.text === '7 of 600 — 1.2% reject rate: we can be 95% confident the true figure is between 0.47% and 2.4%.', '3 7 of 600 as SciPy’s figures say it (Clopper–Pearson 0.470–2.389%)');
  await sameAsModule(t, '3 a share');
  ok(/Wilson’s interval, beside the exact: 0\.57% to 2\.4%/.test((await all('.ie-more')).join(' ')), '3 Wilson’s interval beside the exact');
  await page.getByLabel('Made').fill('5'); await page.getByLabel('Rejected').fill('9');
  ok(await page.getByRole('button', { name: 'Add the run' }).isDisabled(), '3 more rejected than made cannot be added');
  const rate = await start('Stops this week', 'Bagger');
  await agree({ question: /How sure am I/, of: /A rate — counted/, name: 'Stops', unit: 'hours' });
  await page.getByLabel('Time counted over').fill('40'); await page.getByLabel('Counted', { exact: true }).fill('12'); await page.getByRole('button', { name: 'Add the run' }).click(); await page.waitForTimeout(600);
  const r = await truth(rate);
  ok(r.said.text.startsWith('12 in 40 hours — 0.30 per hour: we can be 95% confident the true rate is between 0.16 and 0.52 per hour.'), `3 12 in 40 hours: "${r.said.text.slice(0, 100)}"`);
  await sameAsModule(r, '3 a rate');
}

/* ---- 4 · did it change ---- */
let change, counted;
{
  change = await start('Fill weight before and after the re-calibration', 'Checkweigher');
  await agree({ question: /Did it really change/, data: /^Measured/, better: /Lower is better/, name: 'Fill time', unit: 's' });
  await paste(BEF);
  await page.getByRole('radio', { name: /^After/ }).click();
  await paste(AFT);
  let t = await truth(change);
  ok(t.said.text === 'Before 12.81 s, after 12.31 s: it fell by 0.50 s — we can be 95% confident it fell by between 0.24 and 0.76 s (p = 0.0006). That is the right way for this measure. What moved it is the fix’s to say.', '4 twelve and twelve: Welch’s t, the interval, p — in the floor’s words');
  await sameAsModule(t, '4 measured');
  ok((await page.locator('.ie-say.is-g').count()) === 1 && /Before · 12/.test((await all('.chip-row .chip'))[0]) && /After · 12/.test((await all('.chip-row .chip'))[1]), '4 green; the two sides counted on their chips');
  await reagree(async () => { await page.getByRole('radio', { name: /Higher is better/ }).click(); });
  ok((await page.locator('.ie-say.is-r').count()) === 1 && /Moved the wrong way/.test((await words('.ln-band')) ?? '') && /wrong way for this measure/.test((await words('.ie-say')) ?? ''), '4 the other way is better: red, the wrong way, said');
  await reagree(async () => { await page.getByRole('radio', { name: /No view/ }).click(); });
  ok((await page.locator('.ie-say.is-n').count()) === 1 && /Changed/.test((await words('.ln-band')) ?? ''), '4 no view: neutral, said Changed');
  t = await truth(change);
  ok(/Shape: fewer than 20 in a group/.test(t.checks.join(' ')) && /Checks on the readings/i.test((await words('.ie-checks')) ?? ''), '4 under twenty a group: bell-shapedness not checked, said', `${t.checks.join(' | ')} || ${await words('.ie-checks')}`);
  /* counted */
  counted = await start('Rejects before and after the new film', 'Packer');
  await agree({ question: /Did it really change/, data: /^Counted/, better: /Lower is better/, name: 'Reject rate' });
  await page.getByLabel('Made').fill('400'); await page.getByLabel('Rejected').fill('14'); await page.getByRole('button', { name: 'Add the run' }).click(); await page.waitForTimeout(400);
  await page.getByRole('radio', { name: /^After/ }).click();
  await page.getByLabel('Made').fill('380'); await page.getByLabel('Rejected').fill('5'); await page.getByRole('button', { name: 'Add the run' }).click(); await page.waitForTimeout(600);
  t = await truth(counted);
  ok(t.said.verdict === 'Borderline' && t.said.text.startsWith('Before 14 of 400 (3.5%), after 5 of 380 (1.3%): it fell by 2.2 points — borderline'), `4 14 of 400 → 5 of 380: "${t.said.text.slice(0, 130)}"`);
  await sameAsModule(t, '4 counted');
  const m = (await all('.ie-more')).join(' | ');
  ok(/z −1\.98 \(p = 0\.048\); Fisher’s exact p = 0\.062/.test(m) && /either side of 0\.05/.test((await words('.ie-checks')) ?? ''), `4 z and Fisher said, straddling 0.05 (SciPy: z p 0.047945, Fisher 0.062015): ${m.slice(0, 140)}`);
  ok((await page.locator('.ie-an-pic g').count()) === 2, '4 the two shares with their intervals drawn');
}

/* ---- 5 · do two ways agree ---- */
let paired;
{
  paired = await start('Two checkweighers on the same packs', 'Checkweigher');
  await agree({ question: /Do two ways of measuring agree/, name: 'Pack weight', unit: 'g', first: 'Checkweigher 1', second: 'Checkweigher 2' });
  await paste(P1.map((v, i) => `${v} ${P2[i]}`), /^Or paste pairs/);
  let t = await truth(paired);
  ok(t.said.text === 'Checkweigher 2 reads 0.39 g higher than Checkweigher 1 — we can be 95% confident by between 0.25 and 0.53 g (p < 0.0001), in 11 of 12 pairs.', '5 twelve pairs as SciPy’s figures say it (paired t 6.3063, p 0.000058, 0.2550–0.5284)');
  await sameAsModule(t, '5 paired');
  ok(/Wilcoxon’s signed-rank: W 1\.5, p = 0\.0036 \(normal approximation, ties and continuity corrected\)/.test((await all('.ie-more')).join(' ')), '5 Wilcoxon beside the t (ties among the differences, so the normal; W 1.5, p 0.003558)');
  await reagree(async () => { await page.getByLabel(/^Largest difference that does not matter/).fill('0.2'); });
  ok((await page.locator('.ie-say.is-r').count()) === 1 && /Differ/.test((await words('.ln-band')) ?? '') && /more than the 0\.20 g that does not matter/.test((await words('.ie-say')) ?? ''), '5 beyond what matters: red');
  await reagree(async () => { await page.getByLabel(/^Largest difference that does not matter/).fill('0.6'); });
  ok((await page.locator('.ie-say.is-g').count()) === 1 && /Agree/.test((await words('.ln-band')) ?? ''), '5 the interval inside what matters: Agree, green');
  await page.locator('.ie-readings summary').click(); await page.waitForTimeout(300);
  ok(/401\.2 g → 401\.6 g/.test((await all('.ie-rows li'))[0]), '5 each pair listed first → second');
}

/* ---- 6 · how many readings ---- */
{
  const plan = await start('Readings for the shift study', 'Multihead weigher');
  await agree({ question: /How many readings/, name: 'Pack weight', unit: 'g' });
  const fill = async (label, v) => { await page.getByLabel(label, { exact: true }).fill(v); await page.getByLabel(label, { exact: true }).blur(); await page.waitForTimeout(500); };
  ok(/^A guess of the spread/.test((await words('.ie-say')) ?? ''), `6 nothing known — it says which box: "${await words('.ie-say')}"`);
  await fill('Spread (s) — a guess', '0.9'); await fill('Within ± (the unit)', '0.3');
  let say = await words('.ie-say');
  ok(/take about 38 readings/.test(say ?? '') && /35 by the normal’s z/.test((await words('.ie-more')) ?? ''), `6 a mean to ±0.3 g: 38 with Student’s t, 35 by the normal: "${say?.slice(0, 120)}"`);
  await fill('Seconds a reading (optional)', '20');
  ok(/That is about 13 minutes at 20 seconds a reading/.test((await words('.ie-say')) ?? ''), `6 the study’s time said when the seconds a reading are typed: "${(await words('.ie-say'))?.slice(-80)}"`);
  await page.getByRole('radio', { name: /A difference between two groups/ }).click(); await page.waitForTimeout(400);
  await fill('Difference that matters', '0.5');
  say = await words('.ie-say');
  ok(/about 52 from each group/.test(say ?? '') && /at 80% power/.test(say ?? ''), `6 0.5 g between two groups: 52 each at 80% power: "${say?.slice(0, 130)}"`);
  await page.getByRole('radio', { name: '90%', exact: true }).click(); await page.waitForTimeout(500);
  ok(/about 70 from each group/.test((await words('.ie-say')) ?? ''), '6 at 90% power: 70 each');
  await page.getByRole('radio', { name: /A share to ±/ }).click(); await page.waitForTimeout(400);
  await fill('Within ± (as a share)', '0.02');
  ok(/count about 2,401/.test((await words('.ie-say')) ?? ''), `6 a share to ±2 points with nothing known: 2,401`);
  await fill('Share expected', '0.1');
  ok(/near 10\.0% to within ± 2\.0 points[^.]*count about 865/.test((await words('.ie-say')) ?? '') && /2,401 with nothing known/.test((await words('.ie-more')) ?? ''), '6 near 10%: 865, and 2,401 with nothing known');
  await page.getByRole('radio', { name: /Zero failures to show/ }).click(); await page.waitForTimeout(400);
  await fill('Share allowed to be bad', '0.01');
  ok(/test 299 in a row/.test((await words('.ie-say')) ?? ''), '6 zero failures to show 99% good: 299 in a row');
  await page.getByRole('radio', { name: /Cycles to time/ }).click(); await page.waitForTimeout(400);
  await fill('Within ± (share of the mean)', '0.05');
  await paste([12.1, 12.8, 11.6, 13.0, 12.4], /^Or paste readings/);
  say = await words('.ie-say');
  ok(/5 cycles timed — the mean is sure to ± 5\.6% at 95%\. To be sure to ± 5\.0% time 6 in all: 1 more\./.test(say ?? ''), `6 five cycles timed: six needed, one more: "${say?.slice(0, 150)}"`);
  const t = await truth(plan);
  await sameAsModule(t, '6 cycles');
}

/* ---- 7 · readings too close together; the capability study's median and middle half ---- */
{
  const ar = await start('Forty consecutive packs', 'Multihead weigher');
  await agree({ question: /How sure am I/, name: 'Pack weight', unit: 'g' });
  await paste(AR);
  const t = await truth(ar);
  ok(t.checks.some(c => /lean on the one before \(r₁ 0\.55, outside ±0\.32\)[^.]*sample every 2nd/.test(c)), `7 the AR(1) forty: "${t.checks.find(c => /lean/.test(c))?.slice(0, 150)}"`);
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(/Linked/.test(tiles) && /r₁ 0\.55 · band ±0\.32/.test(tiles) && (await page.locator('.ie-check.is-a', { hasText: 'lean on the one before' }).count()) === 1, '7 the Order tile says Linked, amber, with r₁ and the band', `${tiles} || amber checks ${await page.locator('.ie-check.is-a').count()}`);
  const ids = await page.evaluate(async ([ar, thirty]) => {
    const { putStudy } = await import('/src/db.ts');
    const mk = (id, name, vs) => ({ id, tool: 'capability', name, agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 396, upper: 404, count: 30 } },
      facts: { readings: vs.map((value, i) => ({ id: `${id}-${i}`, value, at: Date.now() - (vs.length - i) * 1000 })) }, uses: [], startedAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now() });
    await putStudy(mk('an-cap-ar', 'Order check — leaning', ar)); await putStudy(mk('an-cap-ok', 'Order check — thirty packs', thirty));
    return ['an-cap-ar', 'an-cap-ok'];
  }, [AR, THIRTY.map(v => Math.round((v - 1.2) * 10) / 10)]);
  await go(`#/capability/${ids[0]}`);
  ok(/lean on the one before \(r₁ 0\.55[^)]*\)[^.]*sample every 2nd/.test((await words('[data-note="order"]')) ?? ''), `7 the capability study’s notes say it: "${(await words('[data-note="order"]'))?.slice(0, 120)}"`);
  await go(`#/capability/${ids[1]}`);
  ok((await page.locator('[data-note="order"]').count()) === 0, '7 thirty packs that do not lean say nothing');
  ok(/^Median 400\.00 g · middle half 399\.60–400\.40 g · lean 0\.14$/.test((await words('[data-describe]')) ?? ''), `7 under the histogram: "${await words('[data-describe]')}"`);
}

/* ---- 8 · on paper ---- */
{
  await go(`#/analysis/${change}`);
  let p = await pdf('change.pdf');
  ok(p.text.includes('Before 12.81 s, after 12.31 s: it fell by 0.50 s') && p.text.includes('we can be 95% confident it fell by between 0.24 and 0.76 s') && /Mann–Whitney: U 17\.5/.test(p.text), '8 the change on paper: the sentence, the interval, the rank test beside it');
  ok(/The picture/i.test(p.text) && /Checks on the readings/i.test(p.text) && /Every reading, in the order taken/i.test(p.text) && p.text.includes('12.4 B') && p.text.includes('12.1 A'), '8 …the picture, the checks, every reading with its side', p.text.slice(-700));
  await go(`#/analysis/${paired}`);
  p = await pdf('paired.pdf');
  ok(p.text.includes('Checkweigher 2 and Checkweigher 1 agree') && /Every pair, in the order taken/i.test(p.text) && p.text.includes('401.2 / 401.6') && /Each pair: Checkweigher 1 \/ Checkweigher 2/.test(p.text), '8 the pairs on paper', p.text.slice(-500));
  await go(`#/analysis/${counted}`);
  p = await pdf('counted.pdf');
  ok(p.text.includes('Before 14 of 400 (3.5%), after 5 of 380 (1.3%)') && /borderline/.test(p.text) && /Every run, in the order taken/i.test(p.text), '8 the counted change on paper: borderline said', p.text.slice(0, 900));
  await go(`#/analysis/${mean}`);
  p = await pdf('mean.pdf');
  ok(/mean 401\.\d+ g — we can be 95% confident the true mean is between/.test(p.text) && /1 reading beyond the fences/.test(p.text), '8 the mean on paper with its checks');
  await go('#/analysis');
  p = await pdf('list.pdf', /every one shown/);
  ok(p.text.includes('Thirty packs') && p.text.includes('Two checkweighers on the same packs') && p.text.includes('Fill time before and after the re-calibration'), `8 the list on paper: every analysis shown (${p.pages} pages)`);
}

/* ---- 9 · kept; the phone ---- */
{
  const before = await truth(change);
  await go(`#/analysis/${change}`);
  await page.reload(); await page.waitForTimeout(2500);
  ok((await words('.ie-say')) === before.said.text, '9 reloaded: the answer the same', `${await words('.ie-say')} || ${before.said.text}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/analysis/${sd.analysisId}`);
  const w = await page.evaluate(() => document.scrollingElement.scrollWidth);
  const pad = await page.locator('.ie-pad .ie-key').evaluateAll(els => els.length === 13 && els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390 && r.height >= 36; }));
  const svgs = await page.locator('.ie-an-pic').evaluateAll(els => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; }));
  ok(w <= 390 && pad && svgs, `9 the phone: nothing off the side (${w}px), the pad’s keys big enough, the picture inside`);
  await page.setViewportSize({ width: 1360, height: 900 });
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
