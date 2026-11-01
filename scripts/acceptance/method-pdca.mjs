/* ACCEPTANCE — PDCA'S OWN BOARD AND PAPER (docs/METHODS.md §16; src/lib/methodPdca, project/method/shapes/pdca, lib/report/pdcaPaper).
 *
 * A PDCA is the four-quarter loop with the cycle in hand and a LIST of cycles — not a list of tools.
 *   1  the board asks the module's questions, quarter by quarter, in order (Plan 5, Do 4, Check 5, Act 5), cycle 1 in hand
 *   2  answers kept after a reload, the quarter saying Under way / All written in words; the cycle saying where it is
 *   3  Start the next cycle carries the number, the cause, where it ended and Act's "again" into the new Plan; cycle 1 untouched
 *   4  the list of cycles: two tabs, each with its own answers; a third started; each kept after a reload
 *   5  tools fall in: the project's capability study's own sentence under the number, Check's result offering Analysis and the Control
 *      chart, the fishbone under the cause, the line standard under the standard; Open lands on the tool in the project; nothing required
 *   6  the PDCA cycle record: downloaded and read back — every cycle, its answers, the glance lines
 *   7  a client reads and writes nothing (no boxes, no Start the next cycle)
 *   8  a phone: nothing off the side, one column, 44 px controls
 *
 *   node scripts/acceptance/method-pdca.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words } = t;
const sd = await t.seed();
const PD = sd.methodProjectIds.pdca;
const qs = await page.evaluate(async () => { const M = await import('/src/lib/methodSheet.ts'); return ['Plan', 'Do', 'Check', 'Act'].map(q => ({ q, labels: M.fieldsOf('pdca', q).map(f => f.label) })); });
const quarter = q => page.locator(`.pdca-q[data-q="${q}"]`);
const box = (q, label) => quarter(q).locator('.msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).locator('.msheet-in');
const type = async (q, label, v) => { await box(q, label).fill(v); await box(q, label).blur(); await page.waitForTimeout(450); };

/* ---- 1 the questions ---- */
await go(`#/project/${PD}`, 2200);
await page.waitForSelector('.pdca', { timeout: 20000 });
const got = await page.locator('.pdca-q').evaluateAll(els => els.map(e => ({ q: e.getAttribute('data-q'), labels: [...e.querySelectorAll('.msheet-q')].map(x => x.textContent?.trim()) })));
ok(JSON.stringify(got) === JSON.stringify(qs), `1 the board asks PDCA’s questions in order (${qs.map(x => x.labels.length).join(' · ')})`);
ok(await page.locator('.pdca-cycle.on', { hasText: 'Cycle 1' }).count() === 1, '1 cycle 1 is in hand');

/* ---- 2 kept, in words ---- */
await type('Plan', 'The number we are improving', 'Packs a minute at the packer');
await type('Plan', 'Where it is, and where it should be', '48 against 60');
await go(`#/project/${PD}`, 2200);
ok((await box('Plan', 'The number we are improving').inputValue()) === 'Packs a minute at the packer', '2 an answer is kept after a reload');
ok(/Under way/i.test(await words('.pdca-q[data-q="Plan"] .msheet-state')) && /2 of 5 written/i.test(await words('.pdca-q[data-q="Plan"] .msheet-state')), '2 Plan says Under way — 2 of 5 written');
ok(/here/i.test(await words('.pdca-q[data-q="Plan"] .msheet-state')) && /Under way — in Plan/.test(await words('.pdca-cycle.on')), '2 the cycle says where it is, in words');
for (const [q, l, v] of [['Plan', 'The cause we suspect, and why', 'Film tension'], ['Plan', 'The change we will make', 'Re-set the dancer'], ['Plan', 'The effect we expect, in the number', '58'],
  ['Do', 'Who does what, by when', 'Sam, Tuesday'], ['Do', 'What we measure while doing it, and who collects it', 'Packs a minute, hourly'], ['Do', 'How small we start', 'One shift'], ['Do', 'What we saw while doing it', 'Film snagged once'],
  ['Check', 'The number now, against before', '57'], ['Check', 'Against what we predicted', 'No — short by one'], ['Check', 'What we learned', 'Tension is part of it'], ['Check', 'Is the change more than the ordinary ups and downs? How we know', 'Not sure'],
  ['Act', 'Made the standard — where it is written', 'Not yet'], ['Act', 'Who was trained', 'Nobody'], ['Act', 'Adopt, adapt or abandon — and why', 'Adapt — nearly there'], ['Act', 'Or: the next cycle’s change', 'Slow the unwind as well']]) await type(q, l, v);
await go(`#/project/${PD}`, 2200);
ok(/All written/i.test(await words('.pdca-q[data-q="Plan"] .msheet-state')) && /5 of 5/i.test(await words('.pdca-q[data-q="Plan"] .msheet-state')), '2 Plan: All written — 5 of 5');
ok(/Complete/.test(await words('.pdca-cycle.on')), `2 the cycle is complete once the required answers are in (${await words('.pdca-cycle.on')})`);

/* ---- 3 the next cycle ---- */
await page.getByRole('button', { name: 'Start the next cycle' }).click(); await page.waitForTimeout(1200);
ok(await page.locator('.pdca-cycle.on', { hasText: 'Cycle 2' }).count() === 1, '3 cycle 2 is in hand');
ok((await box('Plan', 'The number we are improving').inputValue()) === 'Packs a minute at the packer', '3 the number is carried');
ok((await box('Plan', 'The change we will make').inputValue()) === 'Slow the unwind as well', '3 Act’s “again” is the new Plan’s change');
ok((await box('Plan', 'Where it is, and where it should be').inputValue()) === 'Cycle 1 ended at: 57', '3 where cycle 1 ended is where cycle 2 starts');
ok((await box('Plan', 'The cause we suspect, and why').inputValue()) === 'Film tension', '3 the cause is carried');
ok((await box('Check', 'The number now, against before').inputValue()) === '', '3 cycle 2’s Check starts empty');
await page.locator('.pdca-cycle', { hasText: 'Cycle 1' }).click(); await page.waitForTimeout(400);
ok((await box('Plan', 'The change we will make').inputValue()) === 'Re-set the dancer', '3 cycle 1 is untouched');

/* ---- 4 the list of cycles ---- */
await page.locator('.pdca-cycle', { hasText: 'Cycle 2' }).click(); await page.waitForTimeout(300);
await type('Plan', 'The effect we expect, in the number', '60');
await type('Check', 'The number now, against before', '60');
await page.getByRole('button', { name: 'Start the next cycle' }).click(); await page.waitForTimeout(1200);
await go(`#/project/${PD}`, 2200);
ok(await page.locator('.pdca-cycle').count() === 3, `4 three cycles listed after a reload (${await page.locator('.pdca-cycle').count()})`);
await page.locator('.pdca-cycle', { hasText: 'Cycle 2' }).click(); await page.waitForTimeout(300);
ok((await box('Check', 'The number now, against before').inputValue()) === '60', '4 cycle 2’s own answer is kept');
await page.locator('.pdca-cycle', { hasText: 'Cycle 1' }).click(); await page.waitForTimeout(300);
ok((await box('Check', 'The number now, against before').inputValue()) === '57', '4 cycle 1’s own answer is kept');

/* ---- 5 tools fall in ---- */
ok(await page.getByRole('button', { name: /^Start Capability for The number we are improving/ }).count() === 1 || await page.getByRole('button', { name: 'Open Capability in this project' }).count() >= 1, '5 Capability is offered at the number — Open if one is in the project, else Start');
ok(await quarter('Check').getByRole('button', { name: /^Start Analysis|^Another analysis|Open Analysis/ }).count() >= 1 && await quarter('Check').getByRole('button', { name: /Control chart/i }).count() >= 1, '5 Check’s result offers Analysis and the Control chart');
ok(await quarter('Plan').getByRole('button', { name: 'Open the fishbone for the cause' }).count() === 1, '5 the fishbone is offered under the cause');
ok(await quarter('Act').getByRole('button', { name: /Line standard/i }).count() >= 1, '5 the line standard is offered under the standard');
{
  const note = await words('.pdca-q[data-q="Plan"] .pdca-tool-says');
  console.log('   capability note:', note);
  ok(/Capability/.test(note), '5 what the project’s own Capability record says (or that there is none) sits under the number');
  const b = quarter('Plan').getByRole('button', { name: /^Start Capability|Open Capability in this project/ }).first();
  await b.click(); await page.waitForTimeout(1500);
  ok(/capability/.test(page.url()) && page.url().includes(PD), `5 the tool opens in the project (${page.url().split('#')[1]})`);
}

/* ---- 6 the paper ---- */
await go(`#/project/${PD}`, 2200);
{
  const txt = await t.pdfText(async () => {
    const rb = page.getByRole('button', { name: /^Report/ }).first(); await rb.click(); await page.waitForTimeout(300);
    await page.getByRole('menuitem', { name: /PDCA cycle record/ }).or(page.getByRole('button', { name: /PDCA cycle record/ })).first().click();
  }, 'pdca');
  ok(/PDCA cycle record/.test(txt), '6 the paper is named for what it is — PDCA cycle record');
  ok(/The cycles at a glance/.test(txt) && /Cycle 1 - Complete/.test(txt) && /Cycle 2/.test(txt) && /Cycle 3/.test(txt), '6 the glance lists every cycle');
  ok(/Packs a minute at the packer/.test(txt) && /Re-set the dancer/.test(txt) && /Slow the unwind as well/.test(txt) && /Cycle 1 ended at: 57/.test(txt), '6 the answers are on the paper');
  ok(/Adopt, adapt or abandon/.test(txt) && /Not written yet\./.test(txt), '6 every question is asked, an unwritten one said so');
}

/* ---- 7 a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${PD}/notes`, 1500); await go(`#/project/${PD}`, 2200);
{
  const boxes = await page.locator('.pdca textarea, .pdca input').count();
  ok(boxes === 0 && await page.getByRole('button', { name: 'Start the next cycle' }).count() === 0 && (await words('.pdca-q[data-q="Plan"] .msheet-ro')).includes('Packs a minute'), `7 a client reads and writes nothing (${boxes} boxes)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 8 a phone ---- */
await page.setViewportSize({ width: 390, height: 800 }); await go(`#/project/${PD}`, 2200);
{
  const w = await t.wide();
  const cols = await page.locator('.pdca-loop').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  const small = await page.locator('.pdca-cycle, .pdca-tool-do .chip, .pdca-next .btn').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43).length);
  ok(w <= 1 && cols === 1 && small === 0, `8 a phone: nothing off the side (${w}px), one column (${cols}), controls under 44px: ${small}`);
}
await t.finish('PDCA’s board and paper accepted: the loop asks its questions, cycles are a list and the next carries Act’s again, tools fall in, the cycle record reads back, a client reads only, a phone fits');
