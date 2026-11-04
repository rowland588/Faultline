/* FC-241 — STOPS ACROSS WORKSTATIONS (knowledge/specs/FC-241-workstation-stops.md; 4 November 2026 — Rowland: "multiple workstations in front of me ... time every time that
 * workstation stops ... I could have 30 ... put some sort of metric next to it ... interchangeable"). Figures are the hand-worked cases of the spec, never the module's output:
 *   1  case A typed through the real boxes: 429 kg lost, Sealer 264 kg (61.5%), 35.75 min, 6 stops, 7.4% of the watched time, £900.90
 *   2  the unit changed kg → packs: the words change, the number does not; the hour period divides by 60
 *   3  the timer: Stopped then Running again adds the elapsed minutes and counts one stop, a second pair adds to it; a reload mid-stop keeps it running
 *   4  thirty workstations: thirty rows of boxes, the total as worked (465 min × 12 = 5,580 kg)
 *   5  the paper read back: the sentence and the ranking
 *   6  the phone (390): nothing off the side, the Stopped button 44 px
 *   node scripts/acceptance/workstation-stops.mjs   (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {} } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const OUT = mkdtempSync(join(tmpdir(), 'workstation-stops-'));
const nn = i => String(i + 1).padStart(2, '0');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const type = async (id, v) => { await page.locator(`[data-field-input="${id}"]`).fill(String(v)); };
const tiles = async () => Object.fromEntries(await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));

await go('#/room');
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · case A */
await go('#/calc/workstation-stops');
await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Packing hall, 10 to 12');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const rid = decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
ok(page.url().includes('/calc/workstation-stops/') && rid.length > 8, `1 started: ${page.url().split('#')[1]}`);
await type('n', 4);
ok(await page.locator('[data-field="w04_min"]').count() === 1 && await page.locator('[data-field="w05_min"]').count() === 0, '1 boxes for exactly four workstations');
await page.locator('[data-field="unit"] [data-value="kg"]').click();
await type('rate', 12);
for (const [i, name, min, stops] of [[0, 'Filler', 8.5, 3], [2, 'Sealer', 22, 2], [3, 'Packer', 5.25, 1]]) { await type(`w${nn(i)}_name`, name); await type(`w${nn(i)}_min`, min); await type(`w${nn(i)}_stops`, stops); }
await type('w02_name', 'Wrapper');
await type('watched', 120);
await page.locator('.calc-money > summary').click(); await page.waitForTimeout(200);
await type('unitCost', 2.1);
await page.waitForTimeout(800);
const SAYS = '3 of 4 workstations stopped for 35.75 minutes in all (6 stops), losing 429 kg at 12 kg every minute. Sealer lost the most — 264 kg, 61.5% of it.';
ok((await words('[data-calc=sentence]')) === SAYS, `1 the sentence is the hand-worked case: "${SAYS.slice(0, 90)}…"`, await words('[data-calc=sentence]'));
const t1 = await tiles();
ok(t1.Lost === '429' && t1.Stopped === '35.75' && t1.Stops === '6' && t1.Worst === 'Sealer' && t1['If it goes on'] === '1,716' && t1.Confidence === 'Rough', `1 the tiles: ${JSON.stringify(t1)}`);
ok(/£900\.90/.test(await words('[data-calc=money]') ?? ''), '1 the money: £900.90 if it cannot be made up');

/* ---- 2 · the unit and the period */
await page.locator('[data-field="unit"] [data-value="packs"]').click(); await page.waitForTimeout(600);
ok(/losing 429 packs at 12 packs every minute/.test(await words('[data-calc=sentence]') ?? '') && (await tiles()).Lost === '429', '2 kg → packs changes the word and not the number');
await page.locator('[data-field="per"] [data-value="hour"]').click(); await page.waitForTimeout(600);
ok((await tiles()).Lost === '7.15', `2 an hourly rate divides by 60 (35.75 min… 7.15 packs): ${(await tiles()).Lost}`);
await page.locator('[data-field="per"] [data-value="min"]').click(); await page.waitForTimeout(400);

/* ---- 3 · the timer */
await page.locator('[data-timer="w02_min"]').click();
ok(/Running again/.test(await words('[data-timer="w02_min"]') ?? ''), '3 Stopped starts the clock');
await page.waitForTimeout(3000);
await page.locator('[data-timer="w02_min"]').click(); await page.waitForTimeout(700);
const m1 = Number(await page.locator('[data-field-input="w02_min"]').inputValue()), s1 = Number(await page.locator('[data-field-input="w02_stops"]').inputValue());
ok(m1 >= 0.04 && m1 <= 0.08 && s1 === 1, `3 Running again adds the elapsed minutes (${m1}) and counts one stop (${s1})`);
await page.locator('[data-timer="w02_min"]').click(); await page.waitForTimeout(2200);
await page.locator('[data-timer="w02_min"]').click(); await page.waitForTimeout(700);
const m2 = Number(await page.locator('[data-field-input="w02_min"]').inputValue()), s2 = Number(await page.locator('[data-field-input="w02_stops"]').inputValue());
ok(m2 > m1 && s2 === 2, `3 a second press-pair adds to it (${m2} min, ${s2} stops)`);
await page.locator('[data-timer="w01_min"]').click(); await page.waitForTimeout(300);
await go(`#/calc/workstation-stops/${rid}`);
ok(/Running again/.test(await words('[data-timer="w01_min"]') ?? ''), '3 a reload mid-stop keeps the clock running');
await page.locator('[data-timer="w01_min"]').click(); await page.waitForTimeout(500);

/* ---- 4 · thirty */
await type('n', 30);
ok(await page.locator('[data-field="w30_min"]').count() === 1, '4 thirty workstations: thirty sets of boxes');
for (let i = 0; i < 30; i++) { await type(`w${nn(i)}_min`, i + 1); if (i < 4) await type(`w${nn(i)}_stops`, ''); }
await page.waitForTimeout(900);
ok((await tiles()).Lost === '5,580', `4 thirty workstations total as worked (465 min × 12): ${(await tiles()).Lost}`);

/* ---- 4b · the grid at a laptop: 22 small tiles, many to a row, and the rate asked in the unit's words */
await page.locator('[data-field="unit"] [data-value="kg"]').click();
await type('n', 22); await page.waitForTimeout(500);
const tilesBox = await page.locator('.calc-tile').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
const firstRow = tilesBox.filter(t => t === tilesBox[0]).length;
ok(tilesBox.length === 22 && firstRow >= 6, `4b 22 tiles, ${firstRow} to a row (not one long list)`);
ok(/How many kg are lost in every minute a workstation is stopped/i.test(await words('[data-field="rate"] .field-label') ?? ''), '4b the rate is asked in the unit’s words: "How many kg are lost in every minute…"');
ok(/min · .*kg lost|not stopped/.test(await words('[data-tile="0"] .calc-tile-says') ?? ''), '4b each tile says what that workstation has cost so far');
await type('n', 30);
for (let i = 0; i < 30; i++) await type(`w${nn(i)}_min`, i + 1);
await page.waitForTimeout(600);

/* ---- 5 · the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const f = join(OUT, 'stops.pdf'); await dl.saveAs(f);
const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(/30 of 30 workstations stopped for 465 minutes/.test(text) && /5,580/.test(text), '5 the paper says the sentence and the total');

/* ---- 8 · carried forward, and how sure that is (spec Part 2; SciPy cases) */
await page.setViewportSize({ width: 1360, height: 900 });
await go('#/calc/workstation-stops');
await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Carried forward');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const rid2 = decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
await type('n', 4);
await page.locator('[data-field="unit"] [data-value="kg"]').click();
await type('rate', 12);
for (const [i, min, stops] of [[0, 8.5, 3], [2, 22, 2], [3, 5.25, 1]]) { await type(`w${nn(i)}_min`, min); await type(`w${nn(i)}_stops`, stops); }
await type('watched', 120);
await page.waitForTimeout(700);
const more8 = async () => flat(await page.locator('.ie-says').innerText().catch(() => ''));
const say8 = await more8();
ok(/Carried on for 8 hours: about 1,716 kg lost — between 629\.7 and 3,735 kg at 95% confidence — from 6 stops in 2 hours of watching\./.test(say8) && /Confidence: Rough\./.test(say8) && /About 66 stops — roughly 20 hours more watching/.test(say8) && /rests on the 6 stops counted, not on the minutes watched/.test(say8), '8 the sample carried 8 hours: 1,716 kg, 629.7 to 3,735 at 95%, Rough, 66 stops needed (SciPy)', say8);
ok(await page.locator('[data-field="horizon"] .chip').count() >= 11, '8 the horizon chips: 1 · 2 · 3 · 4 · 5 · 8 · 10 · 11 · 12 · 24 hours, A week, and a box for any hours');
ok(await page.locator('[data-field="customH"] input').count() === 1, '8 the hours box is always there — any number can be typed');
await page.locator('[data-field="horizon"] [data-value="1"]').click(); await page.locator('[data-field="conf"] [data-value="90"]').click(); await page.waitForTimeout(600);
const t8 = await tiles();
ok(t8['If it goes on'] === '214.5' && /90% range 93\.4 to 423\.4/.test(await words('.calc-tiles') ?? ''), `8 one hour at 90%: 214.5 kg, 93.4 to 423.4 (SciPy) — ${t8['If it goes on']}`);
await page.locator('[data-field="conf"] [data-value="95"]').click();
await page.locator('[data-field="horizon"] [data-value="week"]').click(); await page.waitForTimeout(500);
ok(/Give the hours the line runs in a week/.test(await more8()), '8 A week asks the hours a week and does not guess');
await type('weekH', 120); await page.waitForTimeout(600);
ok(/Carried on for a week \(120 hours\): about 25,740 kg lost/.test(await more8()), '8 A week of 120 hours: 25,740 kg');
await page.locator('[data-field="horizon"] [data-value="8"]').click(); await page.waitForTimeout(500);
const pic = await page.evaluate(() => ({ lines: document.querySelectorAll('.calc-pic-line').length, dash: document.querySelectorAll('.calc-pic-line.is-dash').length, dots: document.querySelectorAll('.calc-pic-dot').length }));
ok(pic.lines === 3 && pic.dash === 2 && pic.dots === 2, `8 the chart: the sample’s line, the range as two dashed lines, the observed and the horizon dots (${JSON.stringify(pic)})`);
const before8 = await words('.calc-tiles');
await type('watched', 1200);
for (const [i, min, stops] of [[0, 85, 30], [2, 220, 20], [3, 52.5, 10]]) { await type(`w${nn(i)}_min`, min); await type(`w${nn(i)}_stops`, stops); }
await page.waitForTimeout(700);
ok(/95% range 1,309\.5 to 2,208\.8/.test(await words('.calc-tiles') ?? ''), '8 ten times the watching at the same rate: the same 1,716 kg, the range 1,309.5 to 2,208.8, much narrower than 629.7 to 3,735');
await type('watched', 120);
for (const [i, min, stops] of [[0, 8.5, 3], [2, 22, 2], [3, 5.25, 1]]) { await type(`w${nn(i)}_min`, min); await type(`w${nn(i)}_stops`, stops); }
await type('watched', '');
await page.waitForTimeout(300);
await page.locator('[data-timer="watched"]').click(); await page.waitForTimeout(3000); await page.locator('[data-timer="watched"]').click(); await page.waitForTimeout(700);
const w1 = Number(await page.locator('[data-field-input="watched"]').inputValue());
ok(w1 >= 0.04 && w1 <= 0.08, `8 Start watching … Pause adds the minutes watched (${w1})`);
await go(`#/calc/workstation-stops/${rid2}`);
await page.locator('[data-timer="watched"]').click(); await page.waitForTimeout(2500); await page.locator('[data-timer="watched"]').click(); await page.waitForTimeout(700);
const w2 = Number(await page.locator('[data-field-input="watched"]').inputValue());
ok(w2 > w1, `8 the record reopened and watched again: the sample grows (${w1} → ${w2})`);
void before8;
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const f2 = join(OUT, 'carried.pdf'); await dl2.saveAs(f2);
const text2 = flat(execFileSync('pdftotext', ['-raw', f2, '-'], { encoding: 'utf8' }));
ok(/Carried on for 8 hours/.test(text2) && /Confidence:/.test(text2), '9 the paper says the carried-forward sentence and the confidence');

/* ---- 6 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/calc/workstation-stops/${rid}`);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the phone: nothing off the side');
const h = await page.locator('[data-timer="w01_min"]').evaluate(e => Math.round(e.getBoundingClientRect().height));
ok(h >= 44, `6 the Stopped button is a thumb’s height (${h})`);
ok(errors.length === 0, 'no console errors', errors.join(' | '));
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
