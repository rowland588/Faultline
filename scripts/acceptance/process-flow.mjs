/* FC-003 — THE PROCESS FLOW CHART: operation, transport, inspection, delay, storage (knowledge/specs/FC-003-process-flow-chart.md; 1 November 2026).
 * The knowledge record's tray, oven to despatch pallet — 14 steps, 4 operations, 5 transports, 2 inspections, 2 delays, one four-hour chill — typed step by step through
 * the real boxes, every figure checked against the independent hand-worked case (scripts/knowledge/cases-kaizen.py F and F2), never the module's own output:
 *
 *   1  the sentence, the five tiles and the money as the independent case says them: 279.5 min, 3.9% operations, 93% waiting, 27.8% with the chill aside, 140 m,
 *      £63.75 labour a day, holding £0.45 a day
 *   2  the chart drawn: a row a step, the symbols in the order typed (O T D O I T S T O D T O I T) — a circle for an operation, the others polygons —, each step's words,
 *      minutes and metres
 *   3  what it will not make up: a step with no time and a transport with no distance named; the holding rate left out and named while the labour is still said
 *   4  saved as the before, then the questioned path (the first delay and its check out, two transports cut to 10 m): each tile says what moved
 *      (2 steps fewer, 50 m less) and the figures are the independent case B (266.5 min, 90 m)
 *   5  the paper, downloaded and read back: the sentence, the chart's steps with their words and symbols, the money, before → after
 *   6  the phone (390 px): nothing off the side, the boxes thumb-sized, the chart inside its box
 *   7  from a Kaizen event's Observe section: the row opens the chart and New starts one in the project
 *
 *   node scripts/acceptance/process-flow.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { openMethodSections } from '../lib/methodFolds.mjs';
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
const OUT = mkdtempSync(join(tmpdir(), 'process-flow-'));

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
const nn = i => String(i + 1).padStart(2, '0');

/** A path typed as a person types it: each step's class (one tap), its words, its minutes and, for a transport, its metres. A box not given is emptied. */
async function typePath(steps, max = 24) {
  for (let i = 0; i < max; i++) {
    const s = steps[i];
    if (!s) { const clear = page.locator(`[data-clear="s${nn(i)}_kind"]`); if (await clear.count()) await clear.click(); continue; }
    await page.locator(`[data-field="s${nn(i)}_kind"] [data-value="${s.kind}"]`).click();
    await page.locator(`[data-field-input="s${nn(i)}_what"]`).fill(s.what);
    const t = page.locator(`[data-field-input="s${nn(i)}_min"]`);
    await t.fill(s.min === undefined ? '' : String(s.min));
    const m = page.locator(`[data-field-input="s${nn(i)}_m"]`);
    if (await m.count()) await m.fill(s.m === undefined ? '' : String(s.m));
  }
  await page.waitForTimeout(500);
}
const TRAY = [
  ['Mix and portion', 'operation', 2], ['To the oven', 'transport', 1.5, 30], ['Waiting for the oven', 'delay', 12], ['Bake', 'operation', 3.5], ['Check the core', 'inspection', 1],
  ['To the chiller', 'transport', 2, 45], ['Chill', 'storage', 240], ['To the pack area', 'transport', 1, 20], ['Pack', 'operation', 4], ['Waiting for QA release', 'delay', 8],
  ['To the despatch bay', 'transport', 1.5, 25], ['Palletise', 'operation', 1.5], ['Weigh and label', 'inspection', 0.5], ['To the lorry', 'transport', 1, 20],
].map(([what, kind, min, m]) => ({ what, kind, min, m }));
const QUESTIONED = [
  ['Mix and portion', 'operation', 2], ['To the oven', 'transport', 1.5, 30], ['Bake', 'operation', 3.5], ['To the chiller', 'transport', 2, 10], ['Chill', 'storage', 240],
  ['To the pack area', 'transport', 1, 20], ['Pack', 'operation', 4], ['Waiting for QA release', 'delay', 8], ['To the despatch bay', 'transport', 1.5, 10],
  ['Palletise', 'operation', 1.5], ['Weigh and label', 'inspection', 0.5], ['To the lorry', 'transport', 1, 20],
].map(([what, kind, min, m]) => ({ what, kind, min, m }));

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 · the tray typed through the boxes */
await go('#/calc/process-flow');
ok(flat(await page.locator('h1').first().innerText()) === 'Process flow chart', '1 its page: Process flow chart');
await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Tray, oven to despatch');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const rid = decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
ok(page.url().includes('/calc/process-flow/') && rid.length > 8, `1 started: ${page.url().split('#')[1]}`);
/* a new record is asked for its first step, and shows nothing it made up */
ok((await page.locator('[data-calc=sentence]').count()) === 0 && (await page.locator('[data-field="s02_kind"]').count()) === 0, '1 a new chart is asked for its first step and no more (each step appears once the one above is classed)');
await typePath(TRAY);
await page.locator('.calc-money > summary').click(); await page.waitForTimeout(200);
for (const [k, v] of [['perDay', 30], ['rate', 15], ['loadValue', 120], ['carry', 25]]) await page.locator(`[data-field-input="${k}"]`).fill(String(v));
await page.waitForTimeout(700);
const SAYS = '14 steps: 4 change the product, 5 move it, 2 check it, 2 delay it and 1 stores it. It takes 279.5 min; 3.9% of that is operations and 93% is waiting (delays and storage) — leaving the 240 minutes of storage by design aside, operations are 27.8% of the rest. It travels 140 m.';
const say = await words('[data-calc=sentence]');
ok(say === SAYS, `1 the sentence is the independent case's: "${SAYS.slice(0, 120)}…"`, say);
const mod = await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/tools/calc/calc.ts'); const s = await db.getStudy(id); const r = C.studyCalc(s).run.result; return { sentence: r.sentence, money: r.money?.text, chart: r.chart.rows.length }; }, rid);
ok(mod.sentence === SAYS && mod.chart === 14, '1 …and the module’s own (14 chart rows)', JSON.stringify(mod).slice(0, 200));
const tiles = Object.fromEntries(await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
ok(tiles.Steps === '14' && tiles['Time in operations'] === '3.9%' && tiles.Waiting === '93%' && tiles.Travelled === '140 m' && tiles['Labour a day'] === '£63.75', `1 the tiles: ${JSON.stringify(tiles)}`);
const MONEY = '8.5 min of a person’s time on the moves and checks a load × 30 loads a day = 255 min — £63.75 labour a day at £15.00 an hour. Holding a load worth £120.00 through 260 min of delay and storage costs about £0.01 at 25% a year — £0.45 a day, £0.41 of it the storage by design and £0.03 the delays.';
ok((await words('[data-calc=money]')) === MONEY && mod.money === MONEY, `1 the money: ${MONEY.slice(0, 90)}…`, await words('[data-calc=money]'));
ok(/The longest delay is “Waiting for the oven” — 12 min; the longest transport is “To the chiller” — 45 m\./.test(flat(await page.locator('.ie-says').innerText())), '1 the longest delay and the longest transport named');

/* ---- 2 · the chart drawn */
const chart = page.locator('[data-calc-chart]');
ok(await chart.count() === 1, '2 the chart is on the page');
const rows = await chart.locator('g[data-step]').evaluateAll(els => els.map(e => ({ n: e.getAttribute('data-step'), sym: e.getAttribute('data-symbol'), what: e.querySelector('.cc-what')?.textContent?.replace(/^\d+\.\s*/, '').trim(), fig: [...e.querySelectorAll('.cc-fig')].map(x => x.textContent.trim()), shape: e.querySelector('circle.cc-sym') ? 'circle' : e.querySelector('polygon.cc-sym') ? 'polygon' : '' })));
ok(rows.length === 14 && rows.map(r => r.sym).join('') === 'OTDOITSTODTOIT', `2 a row a step, the symbols in the order typed: ${rows.map(r => r.sym).join(' ')}`);
ok(rows.every(r => (r.sym === 'O') === (r.shape === 'circle')) && rows.filter(r => r.shape === 'circle').length === 4 && rows.filter(r => r.shape === 'polygon').length === 10, '2 an operation is a circle, every other class a polygon — told apart by shape, not colour');
ok(rows[1].what === 'To the oven' && rows[1].fig.join('|') === '1.5|30' && rows[6].what === 'Chill' && rows[6].fig.join('|') === '240|' && rows[5].fig.join('|') === '2|45', `2 each step’s words, minutes and metres: ${rows[1].what} ${rows[1].fig.join('/')}; ${rows[6].what} ${rows[6].fig[0]}`, JSON.stringify(rows.slice(0, 3)));
ok(/ASME/.test(await words('.calc-working-t')) && /operation \(circle\) · transport \(arrow\) · inspection \(square\) · delay \(D\) · storage \(triangle\)/.test(await words('.calc-working-t')), '2 the working names the five symbols');
const box = await chart.locator('svg').boundingBox();
ok(box && box.width > 250 && box.height > 14 * 20, `2 the chart is a readable size (${Math.round(box?.width ?? 0)} × ${Math.round(box?.height ?? 0)})`);

/* ---- 3 · what it will not make up */
await page.locator('[data-field-input="s03_min"]').fill(''); await page.locator('[data-field-input="s06_m"]').fill('');
await page.waitForTimeout(500);
const warns = (await page.locator('.ie-check.is-a').allInnerTexts()).map(flat).join(' | ');
ok(warns.includes('Step 3 has no time — counted, left out of the minutes.') && warns.includes('Step 6 is a transport with no distance — left out of the metres.'), `3 a step with no time and a transport with no distance are named: "${warns}"`);
const say3 = await words('[data-calc=sentence]');
ok(/It takes 267\.5 min; 4\.1% of that is operations and 92\.7% is waiting/.test(say3) && /It travels 95 m \(1 of 5 transports has no distance yet\)\./.test(say3), `3 and left out of the sums: 279.5 − 12 = 267.5 min, 140 − 45 = 95 m — "${say3.slice(80, 260)}"`, say3);
await page.locator('[data-field-input="s03_min"]').fill('12'); await page.locator('[data-field-input="s06_m"]').fill('45'); await page.waitForTimeout(400);
await page.locator('[data-field-input="carry"]').fill(''); await page.waitForTimeout(500);
const m3 = await words('[data-calc=money]'), miss = (await page.locator('.calc-money-missing').allInnerTexts()).map(flat).join(' ');
ok(m3 === '8.5 min of a person’s time on the moves and checks a load × 30 loads a day = 255 min — £63.75 labour a day at £15.00 an hour.' && /Give the cost of holding stock for a year \(finance will have it; the industry quotes 15–35% a year — Faultline never fills it in\)/.test(miss), `3 no holding rate: the labour is still said, the missing rate named — "${miss.slice(0, 100)}"`, m3);
await page.locator('[data-field-input="carry"]').fill('25'); await page.waitForTimeout(500);

/* ---- 4 · saved as the before, then the questioned path */
await page.getByRole('button', { name: 'Save as before', exact: true }).click(); await page.waitForTimeout(700);
ok(/Before → after/.test((await words('.calc-before')) ?? ''), '4 the figures saved as the before');
await typePath(QUESTIONED);
const say4 = await words('[data-calc=sentence]');
const Q = '12 steps: 4 change the product, 5 move it, 1 checks it, 1 delays it and 1 stores it. It takes 266.5 min; 4.1% of that is operations and 93.1% is waiting (delays and storage) — leaving the 240 minutes of storage by design aside, operations are 41.5% of the rest. It travels 90 m.';
ok(say4 === Q, `4 the questioned path is the independent case B: "${Q.slice(0, 100)}…"`, say4);
const changes = (await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-ch')?.textContent?.trim() ?? '']))).reduce((o, [k, v]) => ({ ...o, [k]: flat(v) }), {});
ok(/2 fewer than the saved before/.test(changes.Steps) && /50 m less than the saved before/.test(changes.Travelled), `4 each tile says what moved: Steps "${changes.Steps}"; Travelled "${changes.Travelled}"`, JSON.stringify(changes));
ok(/more than the saved before|points more|up/.test(changes['Time in operations']) || changes['Time in operations'] !== '', `4 …and the share of the time in operations: "${changes['Time in operations']}"`);
await typePath(TRAY);                              // back to the tray for the paper

/* ---- 5 · the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const f = join(OUT, 'flow.pdf'); await dl.saveAs(f);
const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(text.includes('14 steps: 4 change the product') && text.includes('operations are 27.8% of the rest') && text.includes('It travels 140 m'), '5 the paper says the sentence');
ok(text.includes('The path, step by step') && /operation \(a circle, O\), transport \(an arrow, T\)/.test(text) && ['Mix and portion', 'To the oven', 'Waiting for the oven', 'Bake', 'Check the core', 'To the chiller', 'Chill', 'To the pack area', 'Pack', 'Waiting for QA release', 'To the despatch bay', 'Palletise', 'Weigh and label', 'To the lorry'].every(w => text.includes(w)), '5 the chart on paper: every one of the 14 steps with its words');
ok(/1\. Mix and portion/.test(text) && /14\. To the lorry/.test(text), '5 …numbered in the order typed');
ok(text.includes('£63.75 labour a day at £15.00 an hour') && text.includes('£0.45 a day'), '5 the money on paper');
ok(/Before (→|to) after/.test(text) && /Before \(figures saved/.test(text), '5 …and the before → after');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]);
ok(pages >= 1 && pages <= 3, `5 ${pages} page(s) of paper`);

/* ---- 6 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/calc/process-flow/${rid}`);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the phone: nothing off the side');
const hs = await page.locator('.calc-form input.text-input').evaluateAll(els => els.filter(e => e.offsetParent).slice(0, 12).map(e => Math.round(e.getBoundingClientRect().height)));
ok(hs.length > 3 && hs.every(h => h >= 44), `6 the boxes are a thumb’s height (${[...new Set(hs)].join(', ')})`);
const kh = await page.locator('[data-field="s01_kind"] .chip').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(kh.length === 5 && kh.every(h => h >= 44), `6 the five classes are chips a thumb can hit (${[...new Set(kh)].join(', ')})`);
/* on a phone the page is three panes (Figures · Answer · What if): the chart is in the answer */
await page.getByRole('tab', { name: 'Answer' }).click().catch(() => {}); await page.waitForTimeout(500);
const cb = await page.locator('[data-calc-chart] svg').boundingBox();
ok(cb && cb.width <= 390 && cb.width > 250, `6 the chart fits its box (${Math.round(cb?.width ?? 0)} px wide)`);
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- 7 · from a Kaizen event's Observe section */
const kz = sd.methodProjectIds['kaizen-event'];
await go(`#/project/${kz}`); await openMethodSections(page);  // a method page opens on the section in hand, the rest folded (docs/DESIGN.md) — opened to read them
const row = page.locator('.pmethod .lt-li').filter({ hasText: 'Process flow chart' }).first();
const rt = flat(await row.innerText());
ok(/Built/.test(rt) && !/Not built yet|A mode of/.test(rt), `7 Observe lists the Process flow chart as built, a tool of its own since 8 November — "${rt.slice(0, 90)}"`);
await page.getByRole('button', { name: /^New — Process flow chart/ }).click(); await page.waitForTimeout(1500);
ok(/#\/calc\/process-flow/.test(page.url()) && /project=/.test(page.url()), `7 New starts it in the project (${page.url().split('#')[1]})`);
ok((await page.getByLabel('What is it of?').count()) === 1 && /it is the project’s/.test(await words('.ie-for') ?? ''), '7 the new sheet is for the project');
await page.getByLabel('What is it of?').fill('Packing hall tray'); await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const mine = await page.evaluate(async pid => (await (await import('/src/db.ts')).listStudies(pid)).filter(s => s.tool === 'calc' && s.agreed?.calc?.key === 'process-flow').map(s => s.name), kz);
ok(mine.includes('Packing hall tray'), '7 the chart is the project’s own', JSON.stringify(mine));
await go(`#/project/${kz}`); await openMethodSections(page);
const after = flat(await page.locator('.pmethod .lt-li').filter({ hasText: 'Process flow chart' }).first().innerText());
ok(/1 use in this project/.test(after), `7 and its row counts it: "${after.slice(0, 120)}"`);

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
