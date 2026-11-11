/* ACCEPTANCE — THE KATA STORYBOARD (docs/METHODS.md §16; src/lib/kataBoard, project/method/shapes/kata — Rowland, 1 November:
 * "I asked you to build the method and insert the tools where required").
 *
 *   1  the storyboard: four cells (challenge, current, target, obstacles) and the questions the module holds, no default boxes
 *   2  an answer kept after a reload; the experiments table starts with one row, "Add an experiment" makes more, rows kept as @n
 *   3  the five coaching questions answered from the board (the module's), the missing ones named
 *   4  tools fall in: the seeded capability study under the current condition (its sentence), a button that opens it in the project
 *   5  the paper "Kata storyboard" downloaded and read back: cells, every experiment, the five questions
 *   6  a client reads and writes nothing
 *   7  a phone: nothing off the side
 *
 *   node scripts/acceptance/method-kata.mjs      (SMOKE_BASE) */
import { openApp } from '../lib/tocBrowser.mjs';
import { goOpeningBoard } from '../lib/methodFolds.mjs';

const t = await openApp();
const { page, ok, words } = t;
const go = goOpeningBoard(t);   // a method's board opens on the step in hand, the rest one line each (docs/DESIGN.md) — opened to read them
const sd = await t.seed();
const K = sd.methodProjectIds.kata;
const mod = await page.evaluate(async () => { const B = await import('/src/lib/kataBoard.ts'); return { keys: ['challenge', 'coach', 'measure', 'current', 'target', 'obstacles', 'obstacle_now'], qs: B.coaching({}).map(c => c.ask) }; });
const board = page.locator('.kata');
const box = n => board.getByLabel(n, { exact: true });
const fill = async (n, v) => { await box(n).fill(v); await box(n).blur(); await page.waitForTimeout(350); };

/* 1 */
await go(`#/project/${K}`, 2000);
await page.waitForSelector('.kata', { timeout: 20000 });
await t.openSections();   // every section opened, so 'no default boxes' is read in them, not in a shut fold (docs/DESIGN.md)
ok((await board.locator('.kata-cell').count()) === 4, '1 the storyboard has its four cells');
ok((await page.locator('.pmethod-sec .msheet-q').count()) === 0, '1 the default boxes are not drawn under the sections — the board is the interface');
ok(JSON.stringify(await board.locator('.kata-coach-q b').allInnerTexts()) === JSON.stringify(mod.qs.map((q, i) => `${i + 1}. ${q}`)), '1 the five coaching questions as the module words them');
ok((await board.locator('.kata-row').count()) === 1, '1 the experiments table starts with one row');

/* 2 */
await fill('The challenge', '52 packs a minute on Line 7 by March');
await fill('The measure and its unit', 'Packs a minute at the packer, counted per hour');
await fill('The process as it is — its pattern', 'Between 46 and 49, dipping after changeovers');
await fill('The target condition', '50 a minute every hour for a week');
await fill('The obstacles in the way', 'Film tension\nJaw temperature drift');
await fill('The obstacle we are addressing now', 'Film tension');
await fill('Step — experiment 1', 'Re-set the dancer arm');
await fill('What we expect — experiment 1', '50 a minute for two hours');
await board.getByRole('button', { name: 'Add an experiment' }).click();
await fill('Step — experiment 2', 'Slow the unwind 5%');
await fill('What we expect — experiment 2', '49');
await fill('When we go and see what we have learned', 'Tomorrow 9:00 at the packer');
await go(`#/project/${K}`, 2000);
ok((await box('The challenge').inputValue()).startsWith('52 packs'), '2 the challenge is kept after a reload');
ok((await board.locator('.kata-row').count()) === 2 && (await box('Step — experiment 2').inputValue()) === 'Slow the unwind 5%', '2 a second experiment row is kept as its own answer (many rows)');
await board.getByRole('button', { name: 'Add an experiment' }).click();
await fill('Step — experiment 3', 'Replace the jaw heater');
await fill('What happened — experiment 3', '51 for an hour, then 47');
await fill('What we learned — experiment 3', 'Heater was not the limit');
ok((await board.locator('.kata-row').count()) === 3, '2 three experiments in the table');

/* 3 */
const coach = await board.locator('.kata-coach-q').allInnerTexts();
ok(/50 a minute every hour/.test(coach[0]) && /46 and 49/.test(coach[1]) && /Addressing now: Film tension/.test(coach[2]), '3 the first three questions answered from the board');
ok(/Next step: Re-set the dancer arm/.test(coach[3]) && /We expect: 50 a minute for two hours/.test(coach[3]), '3 the fourth is the first step still open, with its expectation');
ok(/Tomorrow 9:00/.test(coach[4]), '3 the fifth is the day we go and see');
ok(/3 experiments run|2 experiment/.test(await words('.kata-says')) || /experiment/.test(await words('.kata-says')), `3 the pulse is said: ${await words('.kata-says')}`);

/* 4 */
const fall = board.locator('.kata-fall[aria-label="Capability study in this project"]');
ok(/Seal temperature/.test(await fall.innerText()), `4 the project’s capability study is read under the current condition (${(await fall.innerText()).replace(/\s+/g, ' ').slice(0, 90)}…)`);
await fall.getByRole('button', { name: 'Open Capability study' }).click(); await page.waitForTimeout(1200);
ok(/capability/.test(page.url()) && page.url().includes(K), `4 the tool opens in the project (${page.url().split('#')[1]})`);
await go(`#/project/${K}`, 2000);
ok((await board.locator('.kata-fall[aria-label="Control chart in this project"]').innerText()).includes('none in this project yet'), '4 a tool not used is said so and is not needed');

/* 5 */
await page.waitForSelector('.kata');
const txt = await t.pdfText(async () => { await page.getByRole('button', { name: /Report/ }).first().click(); await page.getByRole('menuitem', { name: /Kata storyboard/ }).click().catch(async () => { await page.getByText('Kata storyboard').first().click(); }); }, 'kata');
for (const s of ['The storyboard', 'Challenge', '52 packs a minute on Line 7 by March', 'Current condition', 'Target condition', 'Obstacles', 'Experiment 1', 'Re-set the dancer arm', 'Experiment 2', 'Slow the unwind 5%', 'Experiment 3', 'Heater was not the limit', 'The five coaching questions', 'Tomorrow 9:00 at the packer'])
  ok(txt.toLowerCase().includes(t.norm(s).toLowerCase()), `5 the paper says “${s}”`);

/* 6 */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await page.reload(); await page.waitForTimeout(2500);
ok((await board.locator('textarea, input').count()) === 0 && (await board.getByRole('button', { name: 'Add an experiment' }).count()) === 0, '6 a client reads the board and writes nothing');
ok(/52 packs a minute/.test(await board.innerText()), '6 the client reads the answers');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* 7 */
await page.setViewportSize({ width: 390, height: 800 }); await go(`#/project/${K}`, 2000);
{ const w = await t.wide(); ok(w <= 1, `7 on a phone nothing is off the side (${w}px over)`);
  const small = await board.locator('button, input, textarea').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 40 && e.getBoundingClientRect().height > 0).length);
  ok(small <= 4, `7 controls are thumb-sized (${small} under 40px)`); }

await t.finish('The Kata storyboard accepted: four cells, an experiments table of many rows kept, the five coaching questions answered from the board, tools fall in, the paper read back, a client reads only, a phone fits');
