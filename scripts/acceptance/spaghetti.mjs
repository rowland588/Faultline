/* FC-004 — THE SPAGHETTI DIAGRAM (knowledge/specs/FC-004-spaghetti-diagram.md; 1 November 2026).
 * The knowledge record's packer — the film store 42 m away, the case store 28 m, the scale 9 m, there and back, 36 rounds a shift — typed through the real boxes, every
 * figure checked against the independent hand-worked case (scripts/knowledge/cases-kaizen.py S and S2), never the module's own output:
 *
 *   1  the sentence, the five tiles, the trips, the other pace and the money as the independent case says them: 158 m, 5.7 km, 73 min at 1.3 m/s (59 at 1.6), 15.2%,
 *      film 53%, £30.38 a shift and £151.92 a week
 *   2  the round drawn to scale from positions (the line (30,0), the film store (0,0), the scale (30,16)): one line a leg, a dot and a name a place, a metre the same length
 *      across and up (the 30 m leg and the 16 m leg in the ratio 30 : 16), straight lines said to be that, the pace timed at 1.5 m/s -> 92 m, 920 m, 10 min
 *   3  what it will not make up: a leg with no length named and left out of the sums; one place only refused in words; no pace-free guess
 *   4  saved as the before, then the film staged at the line (6 m each way): 86 m, 3.1 km, 40 min — each tile says what moved (33 min less, £13.85 a shift)
 *   5  the paper, downloaded and read back: the sentence, the trips, the places' names, the working leg by leg, the money, before -> after
 *   6  the phone (390 px): nothing off the side, the boxes thumb-sized, the drawing inside its box
 *   7  from a Kaizen event's Observe section: the row opens the calculator and New starts one in the project
 *
 *   node scripts/acceptance/spaghetti.mjs      (SMOKE_BASE, as smoke) */
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { openApp } from '../lib/tocBrowser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp();
const { page, ok, words } = t;
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const OUT = mkdtempSync(join(tmpdir(), 'spaghetti-'));
const nn = i => String(i + 1).padStart(2, '0');
const go = async h => { await page.goto(`${process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191'}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };

/** A round typed as a person types it: each place's name, then the metres walked to it, what the trip is for and, optionally, its position. */
async function typeRound(rows, max = 20) {
  for (let i = 0; i < max; i++) {
    const r = rows[i];
    const name = page.locator(`[data-field-input="p${nn(i)}_name"]`);
    if (!r) { if (await name.count()) await name.fill(''); continue; }
    await name.fill(r[0]);
    const set = async (part, v) => { const b = page.locator(`[data-field-input="p${nn(i)}_${part}"]`); if (await b.count()) await b.fill(v === undefined ? '' : String(v)); };
    await set('m', r[1]); await set('trip', r[2] ?? ''); await set('x', r[3]); await set('y', r[4]);
  }
  await page.waitForTimeout(500);
}
const PACKER = [['Packing line'], ['Film store', 42, 'Fetch film'], ['Packing line', 42, 'Fetch film'], ['Case store', 28, 'Fetch cases'], ['Packing line', 28, 'Fetch cases'], ['Scale', 9, 'Weigh'], ['Packing line', 9, 'Weigh']];
const STAGED = [['Packing line'], ['Film trolley', 6, 'Fetch film'], ['Packing line', 6, 'Fetch film'], ['Case store', 28, 'Fetch cases'], ['Packing line', 28, 'Fetch cases'], ['Scale', 9, 'Weigh'], ['Packing line', 9, 'Weigh']];
const LAYOUT = [['Packing line', undefined, undefined, 30, 0], ['Film store', undefined, 'Fetch film', 0, 0], ['Packing line', undefined, 'Fetch film', 30, 0], ['Scale', undefined, 'Weigh', 30, 16], ['Packing line', undefined, 'Weigh', 30, 0]];

const sd = await t.seed();

/* ---- 1 · the packer typed through the boxes */
await go('#/calc/spaghetti');
ok(flat(await page.locator('h1').first().innerText()) === 'Spaghetti diagram', '1 its page: Spaghetti diagram');
await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Packer, flow-wrap line');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const rid = decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
ok(page.url().includes('/calc/spaghetti/') && rid.length > 8, `1 started: ${page.url().split('#')[1]}`);
ok((await page.locator('[data-calc=sentence]').count()) === 0 && (await page.locator('[data-field-input="p02_name"]').count()) === 0, '1 a new round is asked for its first place and no more (each place appears once the one above is named)');
await page.locator('[data-field-input="who"]').fill('the packer');
await typeRound(PACKER);
for (const [k, v] of [['rounds', 36], ['shiftMin', 480]]) await page.locator(`[data-field-input="${k}"]`).fill(String(v));
const moneyFold = page.locator('.calc-money > summary'); if (await moneyFold.count()) { await moneyFold.click(); await page.waitForTimeout(200); }
for (const [k, v] of [['rate', 25], ['shiftsWeek', 5]]) await page.locator(`[data-field-input="${k}"]`).fill(String(v));
await page.waitForTimeout(700);
const SAYS = 'One round of the packer’s is 158 m over 6 legs; 36 rounds a shift is 5.7 km — 73 min of walking at 1.3 m/s (loaded or in a crowded hall), 15.2% of the 480-minute shift.';
const say = await words('[data-calc=sentence]');
ok(say === SAYS, `1 the sentence is the independent case's: "${SAYS.slice(0, 110)}…"`, say);
const mod = await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/tools/calc/calc.ts'); const s = await db.getStudy(id); const r = C.studyCalc(s).run.result; return { sentence: r.sentence, money: r.money?.text }; }, rid);
ok(mod.sentence === SAYS, '1 …and the module’s own', JSON.stringify(mod).slice(0, 200));
const tiles = Object.fromEntries(await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
ok(tiles['A round'] === '158 m' && tiles['Walked a shift'] === '5.7 km' && tiles['Walking a shift'] === '73 min' && tiles['Share of the shift'] === '15.2%' && tiles['Labour a shift'] === '£30.38', `1 the tiles: ${JSON.stringify(tiles)}`);
const says = flat(await page.locator('.ie-says').innerText());
ok(/Fetch film 84(\.0)? m \(53%\)/.test(says) && /Fetch cases 56(\.0)? m \(35%\)/.test(says) && /Weigh 18(\.0)? m \(11%\)/.test(says), '1 the trips ranked by distance: film 84 m (53%), cases 56 m (35%), weigh 18 m (11%)', says);
ok(/at 1\.6 m\/s .*the same walk is 59 min a shift/.test(says), '1 the other pace said every time: 59 min at 1.6 m/s', says);
const MONEY = '72.9 min of walking a shift at £25.00 an hour is £30.38 a shift — £151.92 over 5 shifts a week.';
ok((await words('[data-calc=money]')) === MONEY, `1 the money: ${MONEY}`, await words('[data-calc=money]'));
ok(/Give each place its position on the layout/.test(says), '1 no positions yet: it says how to get the drawing and draws nothing', says);
ok((await page.locator('.calc-pic').count()) === 0, '1 …no drawing until positions are given');

/* ---- 2 · the round drawn to scale */
await typeRound(LAYOUT);
await page.locator('[data-field-input="rounds"]').fill('10');
await page.locator('[data-field="pace"] [data-value="timed"]').click();
await page.locator('[data-field-input="paceMs"]').fill('1.5'); await page.waitForTimeout(700);
const S2 = 'One round of the packer’s is 92 m over 4 legs; 10 rounds a shift is 920 m — 10 min of walking at 1.5 m/s (timed on the floor), 2.1% of the 480-minute shift.';
ok((await words('[data-calc=sentence]')) === S2, `2 positions give legs 30 + 30 + 16 + 16 = 92 m, 920 m, 10.2 min at 1.5 m/s: "${S2.slice(0, 100)}…"`, await words('[data-calc=sentence]'));
ok(/straight line between positions/.test((await page.locator('.ie-check').allInnerTexts()).join(' ')), '2 …and every leg a straight line is said so, beside a standing answer');
const geo = await page.locator('.calc-pic-svg').evaluate(svg => {
  const lines = [...svg.querySelectorAll('polyline.calc-pic-line')].map(p => p.getAttribute('points').split(' ').map(s => s.split(',').map(Number)));
  const len = ([[a, b], [c, d]]) => Math.hypot(c - a, d - b);
  return { n: lines.length, lens: lines.map(len), dots: [...svg.querySelectorAll('circle.calc-pic-dot')].length, names: [...svg.querySelectorAll('text.calc-pic-val')].map(x => x.textContent), vb: svg.getAttribute('viewBox') };
});
ok(geo.n === 4 && geo.dots === 3 && ['Packing line', 'Film store', 'Scale'].every(x => geo.names.includes(x)), `2 one line a leg (4), a dot and a name a place (3, once each): ${geo.names.join(', ')}`, JSON.stringify(geo));
const horiz = geo.lens[0], vert = geo.lens[2];
ok(Math.abs(horiz / vert - 30 / 16) < 0.02, `2 to scale — the 30 m leg and the 16 m leg are drawn ${horiz.toFixed(1)} : ${vert.toFixed(1)} (30 : 16)`, JSON.stringify(geo.lens));

/* ---- 3 · what it will not make up */
await typeRound(PACKER);
await page.locator('[data-field-input="rounds"]').fill('36');
await page.locator('[data-field="pace"] [data-value="loaded"]').click();
await page.locator('[data-field-input="p04_m"]').fill(''); await page.waitForTimeout(600);
const warns = (await page.locator('.ie-check').allInnerTexts()).map(flat).join(' | ');
ok(/Leg 3 \(to Case store\) has no length — left out of the sums\./.test(warns), `3 a leg with no length is named: "${warns.slice(0, 160)}"`);
ok(/is 130 m over 5 legs|One round of the packer’s is 130 m/.test(await words('[data-calc=sentence]') ?? '') || /130 m/.test(await words('[data-calc=sentence]') ?? ''), '3 …and left out of the sums (158 − 28 = 130 m)', await words('[data-calc=sentence]'));
await page.locator('[data-field-input="p04_m"]').fill('28'); await page.waitForTimeout(400);
await page.locator('[data-field-input="rate"]').fill(''); await page.waitForTimeout(500);
const miss = (await page.locator('.calc-money-missing').allInnerTexts()).map(flat).join(' ');
ok(!(await page.locator('[data-calc=money]').count()) && /hour/.test(miss), `3 no hourly cost: no money made up, the missing input named — "${miss.slice(0, 100)}"`);
await page.locator('[data-field-input="rate"]').fill('25'); await page.waitForTimeout(500);

/* ---- 4 · saved as the before, then the film staged at the line */
await page.getByRole('button', { name: 'Save as before', exact: true }).click(); await page.waitForTimeout(700);
ok(/Before/.test((await words('[data-calc=before]')) ?? ''), '4 the figures saved as the before');
await typeRound(STAGED);
const S4 = 'One round of the packer’s is 86 m over 6 legs; 36 rounds a shift is 3.1 km — 40 min of walking at 1.3 m/s (loaded or in a crowded hall), 8.3% of the 480-minute shift.';
ok((await words('[data-calc=sentence]')) === S4, `4 film staged (6 m each way) is the independent case: "${S4.slice(0, 100)}…"`, await words('[data-calc=sentence]'));
const ch = Object.fromEntries((await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-ch')?.textContent?.trim() ?? '']))).map(([k, v]) => [k, flat(v)]));
ok(/72 m less/.test(ch['A round']) && /33 min less/.test(ch['Walking a shift']) && /13\.85 less|£13\.85/.test(ch['Labour a shift']), `4 each tile says what moved: "${ch['A round']}" · "${ch['Walking a shift']}" · "${ch['Labour a shift']}"`, JSON.stringify(ch));
await typeRound(PACKER);                          // back to the packer for the paper
await page.waitForTimeout(400);

/* ---- 5 · the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const f = join(OUT, 'spaghetti.pdf'); await dl.saveAs(f);
const text = t.norm(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(text.includes('One round of the packer\'s is 158 m over 6 legs') && text.includes('5.7 km'), '5 the paper says the sentence');
ok(['Fetch film', 'Fetch cases', 'Weigh', 'Film store', 'Case store', 'Scale'].every(w => text.includes(w)), '5 the trips and the places on paper');
ok(/Leg 1: Packing line to Film store 42 m walked, typed/.test(text) && /Time walking/.test(text), '5 the working leg by leg');
ok(text.includes('£30.38 a shift') && text.includes('£151.92'), '5 the money on paper');
ok(/Before/.test(text), '5 …and the before -> after');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]);
ok(pages >= 1 && pages <= 3, `5 ${pages} page(s) of paper`);

/* ---- 6 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/calc/spaghetti/${rid}`);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the phone: nothing off the side');
const hs = await page.locator('.calc-form input.text-input').evaluateAll(els => els.filter(e => e.offsetParent).slice(0, 10).map(e => Math.round(e.getBoundingClientRect().height)));
ok(hs.length > 3 && hs.every(h => h >= 44), `6 the boxes are a thumb’s height (${[...new Set(hs)].join(', ')})`);
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- 7 · from a Kaizen event's Observe section */
const kz = sd.methodProjectIds['kaizen-event'];
await go(`#/project/${kz}`);
const row = page.locator('li, .rec-row').filter({ hasText: 'Spaghetti diagram' }).first();
const rt = flat(await row.innerText());
ok(/Built/.test(rt) && !/Not built yet|A mode of/.test(rt), `7 Observe lists the Spaghetti diagram as built, a tool of its own since 8 November — "${rt.slice(0, 90)}"`);
await page.getByRole('button', { name: /^New — Spaghetti diagram/ }).click(); await page.waitForTimeout(1500);
ok(/#\/calc\/spaghetti/.test(page.url()) && /project=/.test(page.url()), `7 New starts it in the project (${page.url().split('#')[1]})`);
await page.getByLabel('What is it of?').fill('Packing hall packer'); await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const mine = await page.evaluate(async pid => (await (await import('/src/db.ts')).listStudies(pid)).filter(s => s.tool === 'calc' && s.agreed?.calc?.key === 'spaghetti').map(s => s.name), kz);
ok(mine.includes('Packing hall packer'), '7 the round is the project’s own', JSON.stringify(mine));

await t.finish('ALL PASSED');
