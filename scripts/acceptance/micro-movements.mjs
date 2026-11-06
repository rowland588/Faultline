/* FC-233 — MICRO-MOVEMENTS (knowledge/specs/FC-233-micro-movements.md; 7 November 2026).
 * Two cycles typed through the real boxes, every figure checked against the independent hand-worked cases (scripts/knowledge/cases-kaizen.py section M), never the
 * module's own output:
 *
 *   1  M1, an FLT driver moving one box (10 elements, whole body): the sentence, the tiles, the money (15 s x 40 a shift = 10 min, £2.50, £12.50 a week), the two-handed chart
 *      with one lane and a row an element, the three line styles (6 working, 2 to question, 2 plain), the codes in order
 *   2  the paper, downloaded and read back: the sentence, every element, the chart's caption and the codes, the caveat that no time is supplied
 *   3  M2, a bench packer's two hands (13 elements in 8 moments, pairs marked together): 6.2 s, 72.6 / 12.9 / 14.5%, the left hand holding 2.2 s while the right works
 *      and nothing listed for 1.7 s, £12.80 a shift and £64.00 a week; the chart in three lanes, the pairs in one row, the paper
 *   4  named but not timed: elements counted, no cycle or share, each untimed element and the pair that is not a pair said, the money naming what is missing
 *   5  the phone (390 px): nothing off the side, the boxes a thumb's height, the chart inside its box
 *
 *   node scripts/acceptance/micro-movements.mjs      (SMOKE_BASE, as smoke) */
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { openApp } from '../lib/tocBrowser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp();
const { page, ok, words } = t;
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const OUT = mkdtempSync(join(tmpdir(), 'micro-movements-'));
const nn = i => String(i + 1).padStart(2, '0');
const go = async h => { await page.goto(`${process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191'}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const box = id => page.locator(`[data-field-input="${id}"]`);
const pick = (id, value) => page.locator(`[data-field="${id}"] [data-value="${value}"]`).click();

/** Each element typed as a person types: the words, the class, the hand, the seconds, whether it goes with the one above. */
async function typeElements(els) {
  for (const [i, [what, cls, hand, sec, together]] of els.entries()) {
    await box(`e${nn(i)}_what`).fill(what);
    await pick(`e${nn(i)}_cls`, cls);
    if (hand) await pick(`e${nn(i)}_hand`, hand);
    if (sec !== undefined) await box(`e${nn(i)}_sec`).fill(String(sec));
    if (together) await pick(`e${nn(i)}_tog`, 'yes');
  }
  await page.waitForTimeout(500);
}
async function startOne(title) {
  await go('#/calc/micro-movements');
  await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(title);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
}
async function openMoney() { const f = page.locator('.calc-money > summary'); if (await f.count()) { await f.click(); await page.waitForTimeout(200); } }
const tilesNow = async () => Object.fromEntries(await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const chartNow = () => page.locator('[data-calc-hands] svg').evaluate(svg => ({
  heads: [...svg.querySelectorAll('text.ch-head')].map(x => x.textContent),
  rows: [...svg.querySelectorAll('g[data-moment]')].map(g => ({
    n: Number(g.getAttribute('data-moment')),
    sec: g.querySelector('text.ch-fig')?.textContent,
    cells: [...g.querySelectorAll('g[data-code]')].map(c => ({ lane: Number(c.getAttribute('data-lane')), code: c.getAttribute('data-code'), style: c.getAttribute('data-style'), words: [...c.querySelectorAll('text.ch-what')].map(x => x.textContent).join(' ') })),
  })),
}));
const pdfText = async (name, press) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), press()]);
  const f = join(OUT, name); await dl.saveAs(f);
  return { f, text: t.norm(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};

await t.seed();

/* ---- 1 · M1, an FLT driver, typed through the boxes */
const FLT = [
  ['Drive empty to the pallet', 'reach', 14], ['Search for the right pallet', 'search', 9], ['Check the label', 'inspect', 4], ['Line up the forks', 'position', 6], ['Lift the box', 'grasp', 5],
  ['Drive to the chiller', 'move', 22], ['Wait for the door', 'delayUnavoidable', 12], ['Line up at the rack', 'position', 8], ['Set down and back out', 'release', 7], ['Wait for the scanner', 'delayAvoidable', 6],
].map(([w, c, s]) => [w, c, 'whole', s]);
await go('#/calc/micro-movements');
ok(flat(await page.locator('h1').first().innerText()) === 'Micro-movements', '1 its page: Micro-movements');
const rid1 = await startOne('Truck 1 goods-in to chiller');
ok(page.url().includes('/calc/micro-movements/') && rid1.length > 8, `1 started: ${page.url().split('#')[1]}`);
ok((await box('e02_what').count()) === 0 && (await box('e01_sec').count()) === 0, '1 a new cycle asks for the first element’s class only — its hand and seconds appear once it is classed, the next element once the one above is');
await box('who').fill('Truck 1');
await typeElements(FLT);
await openMoney();
await box('perShift').fill('40'); await box('rate').fill('15'); await box('shiftsWeek').fill('5');
await page.waitForTimeout(700);
const SAYS1 = 'Truck 1: 10 elements. The cycle takes 93 s: 62 s (66.7%) is working motion, 15 s (16.1%) is motion to question and 16 s (17.2%) is checking or allowed time. The longest is “Drive to the chiller” — 22 s.';
ok((await words('[data-calc=sentence]')) === SAYS1, `1 the sentence is the independent case's: "${SAYS1.slice(0, 80)}…"`, await words('[data-calc=sentence]'));
const mod1 = await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/tools/calc/calc.ts'); const s = await db.getStudy(id); return C.studyCalc(s).run.result.sentence; }, rid1);
ok(mod1 === SAYS1, '1 …and the module’s own');
const t1 = await tilesNow();
ok(t1.Cycle === '93 s' && t1['Working motion'] === '66.7%' && t1['To question'] === '16.1%' && t1['Longest element'] === '22 s' && t1.Elements === '10' && t1['Labour a shift'] === '£2.50', `1 the tiles: ${JSON.stringify(t1)}`);
const MONEY1 = '15 s of the cycle is only motion to question × 40 cycles a shift = 10 min a shift — £2.50 labour at £15.00 an hour, £12.50 over 5 shifts a week.';
ok((await words('[data-calc=money]')) === MONEY1, `1 the money: ${MONEY1}`, await words('[data-calc=money]'));
const c1 = await chartNow();
ok(c1.heads.join('|') === 'No.|Truck 1|Seconds', `1 the chart has one lane, headed by the truck: ${c1.heads.join(' | ')}`);
ok(c1.rows.length === 10 && c1.rows.every(r => r.cells.length === 1 && r.cells[0].lane === 0), '1 a row an element (10), each in the one lane');
ok(c1.rows.map(r => r.cells[0].code).join(' ') === 'TE SH I P G TL UD P RL AD', `1 the codes in order: ${c1.rows.map(r => r.cells[0].code).join(' ')}`);
const st = s => c1.rows.filter(r => r.cells[0].style === s).length;
ok(st('working') === 6 && st('question') === 2 && st('plain') === 2, `1 the three line styles: ${st('working')} working, ${st('question')} to question, ${st('plain')} plain`);
ok(c1.rows[5].sec === '22' && /Drive to the chiller/.test(c1.rows[5].cells[0].words), '1 row 6 is the 22 s move, its words beside the box');
ok(/no predetermined-time table|never supplies a time/.test(flat(await page.locator('.calc-caveats').innerText())), '1 the page says no time is supplied and no table is carried');
const cap1 = flat(await page.locator('[data-calc-hands] .calc-pic-cap').innerText());
ok(/heavy solid line is working motion/.test(cap1) && /dashed box is motion to question/.test(cap1) && /TE reach/.test(cap1), '1 the caption names the three styles and the letters');

/* ---- 2 · the paper */
const p1 = await pdfText('truck.pdf', () => pressPaper(page, / — on paper$/));
ok(p1.text.includes('Truck 1: 10 elements. The cycle takes 93 s') && p1.text.includes('The longest is “Drive to the chiller” - 22 s'), '2 the paper says the sentence');
ok(FLT.every(([w]) => p1.text.includes(w)), '2 every element is on the paper');
ok(/TE reach, G grasp, TL move/.test(p1.text) && /dashed box is motion to question/.test(p1.text), '2 the chart’s caption and the letters on the paper');
ok(p1.text.includes('£2.50') && p1.text.includes('£12.50'), '2 the money on paper');
ok(/never supplies a time/.test(p1.text) || /predetermined-time table/.test(p1.text), '2 the caveat that no time is supplied on paper');
ok(p1.pages >= 1 && p1.pages <= 4, `2 ${p1.pages} page(s) of paper`);

/* ---- 3 · M2, a bench packer's two hands */
const PACKER = [
  ['Reach for the pouch', 'reach', 'right', 0.8], ['Reach for the tray', 'reach', 'left', 0.6, true],
  ['Grasp the pouch', 'grasp', 'right', 0.5], ['Grasp the tray', 'grasp', 'left', 0.5, true],
  ['Move the pouch to the tray', 'move', 'right', 1.2], ['Hold the tray', 'hold', 'left', 1.2, true],
  ['Position the pouch', 'position', 'right', 0.7], ['Hold the tray', 'hold', 'left', 0.7, true],
  ['Release the pouch', 'release', 'right', 0.3], ['Hold the tray', 'hold', 'left', 0.3, true],
  ['Slide the tray to the belt', 'move', 'both', 1.0],
  ['Check the count', 'inspect', 'right', 0.9],
  ['Wait for the next tray', 'delayAvoidable', 'right', 0.8],
];
const rid2 = await startOne('Packer 1 pouch into tray');
await box('who').fill('Packer 1');
await typeElements(PACKER);
await openMoney();
await box('perShift').fill('4000'); await box('rate').fill('14.4'); await box('shiftsWeek').fill('5');
await page.waitForTimeout(700);
const SAYS2 = 'Packer 1: 13 elements in 8 moments. The cycle takes 6.2 s: 4.5 s (72.6%) is working motion, 0.8 s (12.9%) is motion to question and 0.9 s (14.5%) is checking or allowed time. The longest is “Move the pouch to the tray” — 1.2 s.';
ok((await words('[data-calc=sentence]')) === SAYS2, `3 the sentence: "${SAYS2.slice(0, 80)}…"`, await words('[data-calc=sentence]'));
const t2 = await tilesNow();
ok(t2.Cycle === '6.2 s' && t2['Working motion'] === '72.6%' && t2['To question'] === '12.9%' && t2['Longest element'] === '1.2 s' && t2.Elements === '13' && t2['Labour a shift'] === '£12.80', `3 the tiles: ${JSON.stringify(t2)}`);
const says2 = flat(await page.locator('.ie-says').innerText());
ok(/Left hand: 4\.3 s in its 6 elements; holds for 2\.2 s, all of it while the other hand works; has nothing listed for 1\.7 s while the other hand works alone\./.test(says2), '3 the left hand: 2.2 s held while the right works, 1.7 s with nothing listed (the hand-worked figures)', says2);
ok(/Right hand: 6\.2 s in its 8 elements\./.test(says2) && /A hand that holds while the other works is a clamp/.test(says2), '3 the right hand 6.2 s, and the clamp said', says2);
const MONEY2 = '0.8 s of the cycle is only motion to question × 4,000 cycles a shift = 53.3 min a shift — £12.80 labour at £14.40 an hour, £64.00 over 5 shifts a week.';
ok((await words('[data-calc=money]')) === MONEY2, `3 the money: ${MONEY2}`, await words('[data-calc=money]'));
const c2 = await chartNow();
ok(c2.heads.join('|') === 'No.|Left hand|Right hand|Both or whole body|Seconds', `3 three lanes: ${c2.heads.join(' | ')}`);
ok(c2.rows.length === 8 && c2.rows.reduce((n, r) => n + r.cells.length, 0) === 13, '3 8 rows, 13 boxes — the pairs share a row');
ok(c2.rows.slice(0, 5).every(r => r.cells.length === 2 && r.cells.some(c => c.lane === 0) && r.cells.some(c => c.lane === 1)), '3 rows 1–5 hold the left hand’s box and the right hand’s side by side');
ok(c2.rows.slice(0, 5).map(r => r.sec).join(' ') === '0.8 0.5 1.2 0.7 0.3', `3 each row lasts the longer of its two: ${c2.rows.slice(0, 5).map(r => r.sec).join(' ')}`);
ok(c2.rows[2].cells.find(c => c.lane === 0)?.code === 'H' && c2.rows[2].cells.find(c => c.lane === 0)?.style === 'question', '3 the left hand’s hold is a dashed box (to question) while the right’s move is heavy', JSON.stringify(c2.rows[2]));
ok(c2.rows[5].cells[0].lane === 2 && c2.rows[5].cells[0].code === 'TL' && c2.rows[6].cells[0].lane === 1 && c2.rows[6].cells[0].code === 'I', '3 the both-hands move in the third lane, the check in the right hand’s');
if (process.env.MICRO_SHOTS) await page.locator('[data-calc-hands]').screenshot({ path: join(process.env.MICRO_SHOTS, 'packer-chart.png') });
const p2 = await pdfText('packer.pdf', () => pressPaper(page, / — on paper$/));
ok(p2.text.includes('Packer 1: 13 elements in 8 moments') && p2.text.includes('Left hand: 4.3 s in its 6 elements'), '3 the paper says the sentence and the left hand');
ok(PACKER.every(([w]) => p2.text.includes(w)), '3 every element is on the paper');
ok(p2.text.includes('£12.80') && p2.text.includes('£64.00') && /Left hand/.test(p2.text) && /Both or whole body/.test(p2.text), '3 the money and the three lanes on paper');
ok(p2.pages >= 1 && p2.pages <= 4, `3 ${p2.pages} page(s) of paper`);

/* ---- 4 · named but not timed */
await startOne('Packer 2 not timed');
await box('who').fill('Packer 2');
await typeElements([['Reach for the box', 'reach', 'right'], ['Grasp the box', 'grasp', 'right'], ['Hold the lid', 'hold', 'right', undefined, true]]);
const SAYS4 = 'Packer 2: 3 elements. None of the elements is timed yet, so there is no cycle time or share to say.';
ok((await words('[data-calc=sentence]')) === SAYS4, `4 not timed: "${SAYS4}"`, await words('[data-calc=sentence]'));
const t4 = await tilesNow();
ok(t4.Cycle === '—' && t4['Working motion'] === '—' && t4['To question'] === '—' && t4.Elements === '3', `4 no cycle, no share, three elements counted: ${JSON.stringify(t4)}`);
const checks4 = flat((await page.locator('.ie-check').allInnerTexts()).join(' '));
ok(/Element 1, Element 2 and Element 3 have no seconds — counted, left out of the time\./.test(checks4), '4 each untimed element is named', checks4);
ok(/Element 3 is marked together with the one above but is not the other hand to it — taken as after the one above\./.test(checks4), '4 the pair that is not a pair is said and taken in sequence');
ok(/Give how many cycles a shift/.test(flat(await page.locator('.calc-money-missing').first().innerText())), '4 the money names what is missing — no figure made up');
const c4 = await chartNow();
ok(c4.rows.length === 3 && c4.rows.every(r => r.sec === '—'), '4 the chart shows three rows with no seconds, none made up');

/* ---- 5 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/calc/micro-movements/${rid2}`);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '5 the phone: nothing off the side');
const hs = await page.locator('.calc-form input.text-input').evaluateAll(els => els.filter(e => e.offsetParent).slice(0, 10).map(e => Math.round(e.getBoundingClientRect().height)));
ok(hs.length > 3 && hs.every(h => h >= 44), `5 the boxes are a thumb’s height (${[...new Set(hs)].join(', ')})`);
const chips = await page.locator('.calc-form [data-value]').evaluateAll(els => els.filter(e => e.offsetParent).slice(0, 14).map(e => Math.round(e.getBoundingClientRect().height)));
ok(chips.length > 3 && chips.every(h => h >= 44), `5 the choices are a thumb’s height (${[...new Set(chips)].join(', ')})`);
await page.getByRole('tab', { name: 'Answer' }).click().catch(() => {}); await page.waitForTimeout(500);
const fb = await page.locator('[data-calc-hands]').boundingBox(); const sv = await page.locator('[data-calc-hands] svg').boundingBox();
ok(fb && sv && sv.x >= fb.x - 1 && sv.x + sv.width <= fb.x + fb.width + 1 && sv.width > 250, `5 the chart sits inside its box (${Math.round(sv?.width ?? 0)} px wide)`);
await page.setViewportSize({ width: 1360, height: 900 });

await t.finish('ALL PASSED');
