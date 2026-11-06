/* FC-242 — THE SPAGHETTI DIAGRAM, SEVERAL PEOPLE (knowledge/specs/FC-242-spaghetti-walkers.md; FC-004 part 2; 6 November 2026).
 * Three operators from the packing line typed through the real boxes, every figure checked against the independent hand-worked case
 * (scripts/knowledge/cases-kaizen.py S3 and S3b), never the module's own output:
 *
 *   1  the sentence, the tiles, the shared routes, the shift and the money: 10 moves, 278 m, Operator 1 130 m (47%), the line arrived at 5 times, two shared routes,
 *      2,780 m, 35.6 min, £14.85 a shift and £74.25 a week
 *   2  the picture a schematic, said so: a line a move in each person's own style (graphite, teal, dashed), each person named under it, no ticks, "not to scale"
 *   3  the paper, downloaded and read back: the sentence, each walker's route, the shared routes, the money, the style names
 *   4  said without any metres: moves counted, not metres, no minutes or money (named missing), the same busiest place and shared routes
 *   5  every place on a plan: drawn to scale, no "not to scale"; one place off the plan: a schematic again, said
 *   6  the phone (390 px): nothing off the side, the boxes a thumb's height, the legend inside its box
 *
 *   node scripts/acceptance/spaghetti-walkers.mjs      (SMOKE_BASE, as smoke) */
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { openApp } from '../lib/tocBrowser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp();
const { page, ok, words } = t;
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const OUT = mkdtempSync(join(tmpdir(), 'spaghetti-walkers-'));
const nn = i => String(i + 1).padStart(2, '0');
const go = async h => { await page.goto(`${process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191'}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const box = id => page.locator(`[data-field-input="${id}"]`);

const L = 'Packing line';
const S3 = [
  ['Operator 1', [[L], ['Film store', 40], [L, 40], ['Case store', 25], [L, 25]]],
  ['Operator 2', [[L], ['Scale', 9], [L, 9], ['Film store', 40], [L, 40]]],
  ['Operator 3', [[L], ['Case store', 25], [L, 25]]],
];
/** Each walker typed as a person types: the label, then each place, then the metres walked into it. */
async function typeWalkers(ws, metres = true) {
  for (const [k, [label, steps]] of ws.entries()) {
    await box(`w${k + 1}_label`).fill(label);
    for (const [i, [place, m]] of steps.entries()) {
      await box(`w${k + 1}_s${nn(i)}_name`).fill(place);
      if (i > 0 && metres && m !== undefined) await box(`w${k + 1}_s${nn(i)}_m`).fill(String(m));
    }
  }
  await page.waitForTimeout(500);
}
async function clearMetres(ws) {
  for (const [k, [, steps]] of ws.entries()) for (let i = 1; i < steps.length; i++) await box(`w${k + 1}_s${nn(i)}_m`).fill('');
  await page.waitForTimeout(500);
}
const tilesNow = async () => Object.fromEntries(await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const picNow = () => page.locator('.calc-pic-svg').evaluate(svg => ({
  lines: [...svg.querySelectorAll('polyline.calc-pic-line')].map(p => ({ ink: p.classList.contains('is-ink'), muted: p.classList.contains('is-muted'), dash: p.classList.contains('is-dash'), n: p.getAttribute('points').split(' ').length })),
  dots: svg.querySelectorAll('circle.calc-pic-dot').length,
  ticks: svg.querySelectorAll('text.calc-pic-tick').length,
  names: [...svg.querySelectorAll('text.calc-pic-val')].map(x => x.textContent),
  ax: [...svg.querySelectorAll('text.calc-pic-ax')].map(x => x.textContent),
}));

await t.seed();

/* ---- 1 · three operators typed through the boxes */
await go('#/calc/spaghetti-walkers');
ok(flat(await page.locator('h1').first().innerText()) === 'Spaghetti diagram — several people', '1 its page: Spaghetti diagram — several people');
await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Packing line operators');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const rid = decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
ok(page.url().includes('/calc/spaghetti-walkers/') && rid.length > 8, `1 started: ${page.url().split('#')[1]}`);
ok((await box('w2_label').count()) === 0 && (await box('w1_s02_name').count()) === 0, '1 a new diagram asks for the first walker and the first place only — the next appears once the one above is named');
await typeWalkers(S3);
await box('rounds').fill('10');
const moneyFold = page.locator('.calc-money > summary'); if (await moneyFold.count()) { await moneyFold.click(); await page.waitForTimeout(200); }
await box('rate').fill('25'); await box('shiftsWeek').fill('5');
await page.waitForTimeout(700);
const SAYS = '3 walkers make 10 moves a round, 278 m together. Operator 1 walks most — 130 m (47%). Packing line is arrived at most — 5 times.';
ok((await words('[data-calc=sentence]')) === SAYS, `1 the sentence is the independent case's: "${SAYS}"`, await words('[data-calc=sentence]'));
const mod = await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/tools/calc/calc.ts'); const s = await db.getStudy(id); return C.studyCalc(s).run.result.sentence; }, rid);
ok(mod === SAYS, '1 …and the module’s own');
const tl = await tilesNow();
ok(tl.Together === '278 m' && tl['Walks most'] === 'Operator 1' && tl['Busiest place'] === 'Packing line' && tl['Shared routes'] === '2' && tl['Walked a shift'] === '2.8 km' && tl['Labour a shift'] === '£14.85', `1 the tiles: ${JSON.stringify(tl)}`);
const says = flat(await page.locator('.ie-says').innerText());
ok(/Film store and Packing line — Operator 1 and Operator 2, 160 m \(58% of a round\)/.test(says) && /Case store and Packing line — Operator 1 and Operator 3, 100 m \(36% of a round\)/.test(says), '1 the shared routes: film store 160 m (58%), case store 100 m (36%)', says);
ok(/2\.8 km together — 35\.6 min of walking at 1\.3 m\/s .*Operator 1 16\.7 min · Operator 2 12\.6 min · Operator 3 6\.4 min/.test(says), '1 the shift: 2,780 m, 35.6 min — 16.7 · 12.6 · 6.4 a person', says);
const MONEY = '35.6 min of walking a shift at £25.00 an hour is £14.85 a shift — £74.25 over 5 shifts a week.';
ok((await words('[data-calc=money]')) === MONEY, `1 the money: ${MONEY}`, await words('[data-calc=money]'));

/* ---- 2 · the picture, a schematic that says so */
const pic = await picNow();
ok(pic.lines.length === 10 && pic.dots === 4, `2 a line a move (10), a dot and a name a place (4, once each): ${pic.names.join(', ')}`, JSON.stringify(pic));
ok(pic.lines.filter(l => l.dash).length === 2 && pic.lines.filter(l => l.ink && !l.dash).length === 4 && pic.lines.filter(l => !l.ink && !l.dash).length === 4, '2 each walker in a style of their own: graphite 4 moves, teal 4, dashed graphite 2');
ok(pic.ticks === 0 && pic.ax.some(x => /Not to scale/.test(x)), '2 no ticks and the axis says "Not to scale"', JSON.stringify(pic.ax));
const cap = flat(await page.locator('.calc-pic-cap').innerText());
ok(/NOT TO SCALE/.test(cap) && /Operator 1 solid graphite/.test(cap) && /Operator 2 solid teal/.test(cap) && /Operator 3 dashed graphite/.test(cap), '2 the caption says NOT TO SCALE and names each style', cap);
const key = await page.locator('.calc-pic-key li').allInnerTexts();
ok(key.map(flat).join('|') === 'Operator 1|Operator 2|Operator 3', `2 each person named under the picture: ${key.map(flat).join(' · ')}`);

/* ---- 3 · the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const f = join(OUT, 'walkers.pdf'); await dl.saveAs(f);
const text = t.norm(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(text.includes('3 walkers make 10 moves a round, 278 m together') && text.includes('Operator 1 walks most'), '3 the paper says the sentence');
ok(text.includes('Packing line to Film store (40 m) to Packing line (40 m) to Case store (25 m) to Packing line (25 m)'), '3 each walker’s route with its metres');
ok(/Shared: Film store and Packing line/.test(text) && /Shared: Case store and Packing line/.test(text), '3 the shared routes');
ok(text.includes('£14.85 a shift') && text.includes('£74.25'), '3 the money on paper');
ok(/NOT TO SCALE/.test(text) && /Operator 3/.test(text), '3 not to scale, and the people named');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]);
ok(pages >= 1 && pages <= 3, `3 ${pages} page(s) of paper`);

/* ---- 4 · said without any metres */
await clearMetres(S3);
await box('rounds').fill('');
await page.waitForTimeout(600);
const S4 = '3 walkers make 10 moves a round; no lengths were given, so moves are counted, not metres. Operator 1 makes the most — 4 of 10 (40%). Packing line is arrived at most — 5 times.';
ok((await words('[data-calc=sentence]')) === S4, `4 no metres: "${S4.slice(0, 100)}…"`, await words('[data-calc=sentence]'));
const t4 = await tilesNow();
ok(t4.Together === '10 moves' && t4['Shared routes'] === '2' && t4['Busiest place'] === 'Packing line' && !('Walked a shift' in t4), `4 moves counted, the same shared routes, no shift: ${JSON.stringify(t4)}`);
ok(/Give the metres walked for every move/.test(flat(await page.locator('.calc-money-missing').first().innerText())), '4 the money names what is missing, no figure made up');

/* ---- 5 · on a plan: to scale; one place off it: a schematic again */
const PLAN = [[L, 30, 0], ['Film store', 0, 0], ['Case store', 0, 10], ['Scale', 30, 16]];
for (const [i, [n, x, y]] of PLAN.entries()) { await box(`l${nn(i)}_name`).fill(n); await box(`l${nn(i)}_x`).fill(String(x)); await box(`l${nn(i)}_y`).fill(String(y)); }
await page.waitForTimeout(700);
let p5 = await picNow();
const cap5 = flat(await page.locator('.calc-pic-cap').innerText());
ok(!/NOT TO SCALE/.test(cap5) && /drawn to one scale/.test(cap5) && p5.ticks >= 2, '5 every place on the plan: drawn to scale, with its metres', cap5);
ok(/Every move is a straight line between positions/.test((await page.locator('.ie-check').allInnerTexts()).join(' ')), '5 …and the straight lines are said to be a floor');
await box('l04_y').fill('');
await page.waitForTimeout(700);
p5 = await picNow();
ok(/NOT TO SCALE/.test(flat(await page.locator('.calc-pic-cap').innerText())) && p5.ticks === 0, '5 one place off the plan: a schematic again');
ok(/Not every place walked has a position/.test((await page.locator('.ie-check').allInnerTexts()).join(' ')), '5 …and it says why');

/* ---- 6 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/calc/spaghetti-walkers/${rid}`);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the phone: nothing off the side');
const hs = await page.locator('.calc-form input.text-input').evaluateAll(els => els.filter(e => e.offsetParent).slice(0, 10).map(e => Math.round(e.getBoundingClientRect().height)));
ok(hs.length > 3 && hs.every(h => h >= 44), `6 the boxes are a thumb’s height (${[...new Set(hs)].join(', ')})`);
await page.getByRole('tab', { name: 'Answer' }).click(); await page.waitForTimeout(500);
const kb = await page.locator('.calc-pic-key').boundingBox(); const fb = await page.locator('.calc-pic').boundingBox();
ok(kb && fb && kb.x >= fb.x - 1 && kb.x + kb.width <= fb.x + fb.width + 1, '6 on the Answer pane the legend sits inside the picture’s box');
await page.setViewportSize({ width: 1360, height: 900 });

await t.finish('ALL PASSED');
