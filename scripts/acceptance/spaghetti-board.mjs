/* FC-004 part 3 — THE SPAGHETTI DIAGRAM DRAWN ON A BOARD (knowledge/specs/FC-004-spaghetti-board.md; 7 November 2026 — Rowland: "a blank
 * page … draw the line or area out, put people there and click the person to the objects I have on the map, as I do that lines are created").
 * Every tap is a real tap on the board; the figures are checked against the independent case (scripts/knowledge/cases-kaizen.py S3 and S4)
 * and against the module's own reading of the record.
 *
 *   1  the one-person spaghetti list offers Draw it on a board; a new board blank, its hint; an area named Packing line, three people, two
 *      place pins and the Scale icon placed by tap — kept after a reload
 *   2  the scale by two taps and 80 m — the page's words the module's (scaleSaid)
 *   3  Operator 1 walked by taps: four moves, one line in their style, the moves listed; Undo takes the last off; the person tapped again ends it
 *   4  all three walked as S3: 278 m, Operator 1 130 m (47%), the line arrived at 5 times — the literal; the money the module's, £14.85 a shift
 *   5  a measured 46 m typed over Operator 1's first move: 284 m, the move said measured; the case store dragged — its lengths follow, the 46 stays
 *   6  a board with no scale: moves counted, said, the picture as drawn and not to scale
 *   7  the paper read back: the picture's title and caption, the sentence, the places
 *   8  Walk on this map from a product's Line standard: its people copied, the standard unchanged
 *   9  a record from before the board opens as it was, with the blank board offered
 *  10  a client reads the board and has no tools; the phone (390): nothing off the side, the tools a thumb's height, a walk tapped there
 *
 *   node scripts/acceptance/spaghetti-board.mjs      (SMOKE_BASE, as smoke) */
import { paper as pressPaper, more as pressMore } from '../lib/pageHeader.mjs';
import { openApp } from '../lib/tocBrowser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp();
const { page, ok, words } = t;
const OUT = mkdtempSync(join(tmpdir(), 'spaghetti-board-'));
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const svg = () => page.locator('.sb-svg');
const tap = async (x, y) => { await svg().scrollIntoViewIfNeeded(); const r = await svg().boundingBox(); await page.mouse.click(r.x + (r.width * x) / 100, r.y + (r.height * y) / 100); await page.waitForTimeout(250); };
const tool = n => page.locator('.sb-tools').getByRole('button', { name: n, exact: true }).click();
const mark = n => page.locator(`.sb-mark[data-name="${n}"]`);
const name = async n => { await page.getByLabel('Its name').fill(n); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.waitForTimeout(350); };
const rec = () => decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
const module = id => page.evaluate(async rid => {
  const db = await import('/src/db.ts'); const C = await import('/src/tools/calc/calc.ts'); const B = await import('/src/tools/spaghetti/board.ts');
  const s = await db.getStudy(rid); const c = C.studyCalc(s); const b = B.readBoard(s.agreed.calc.inputs.board);
  return { inputs: s.agreed.calc.inputs, sentence: c.run.result?.sentence, money: c.run.result?.money?.text, scale: b ? B.scaleSaid(b) : undefined, marks: b?.marks.length ?? 0, walks: b?.walks ?? [], warn: c.run.problems.map(p => p.say).join(' '), pic: c.run.result?.picture?.title };
}, id);
const walk = async (who, places, done = true) => {
  await mark(who).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Walk/ }).click(); await page.waitForTimeout(200);
  for (const p of places) { if (p === 'LINE') await tap(60, 73); else { await mark(p).click(); await page.waitForTimeout(220); } }
  if (done) { await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(500); }
};

const sd = await t.seed();

/* ---- 1 · the door, a blank board, things placed by tap */
await go('#/calc/spaghetti');
ok((await page.locator('[data-board-door]').count()) === 1, '1 the spaghetti diagram’s list offers Draw it on a board');
await page.locator('[data-board-door]').click(); await page.waitForTimeout(1000);
await page.getByLabel('What is it of?').fill('Packing line walks');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1800);
const rid = rec();
ok(page.url().includes('/calc/spaghetti-walkers/') && (await page.locator('[data-spag-board]').count()) === 1, `1 a new several-walkers diagram opens on the board: ${page.url().split('#')[1]}`);
ok((await page.locator('.sb-mark, .sb-area').count()) === 0 && /^Draw what you are looking at/.test(await words('[data-sb-hint]')), `1 blank, and says what to do: "${await words('[data-sb-hint]')}"`);
await page.locator('.sb-shape').getByRole('button', { name: 'Square' }).click(); await page.waitForTimeout(300);
await tool('Area'); await tap(50, 80); await name('Packing line');
await tool('Person'); await tap(44, 78); await tap(56, 78); await tap(50, 84);
await tool('Place'); await tap(10, 80); await name('Film store');
await tap(35, 60); await name('Case store');
await page.locator('.sb-tools').getByRole('button', { name: /Icon/ }).click(); await page.waitForTimeout(300);
await page.locator('.sb-icon', { hasText: 'Scale' }).first().click(); await tap(50, 71); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await tool('Move');
const placed = await page.evaluate(() => [...document.querySelectorAll('.sb-svg [data-name]')].map(e => e.getAttribute('data-name')));
ok(['Packing line', 'Operator 1', 'Operator 2', 'Operator 3', 'Film store', 'Case store', 'Scale'].every(n => placed.includes(n)) && placed.length === 7, `1 placed by tap: ${placed.join(', ')}`);
await page.reload(); await page.waitForTimeout(2200);
ok((await page.locator('.sb-svg [data-name]').count()) === 7 && (await module(rid)).marks === 7, '1 kept after a reload — on the record');

/* ---- 2 · the scale */
await tool('Set the scale'); await tap(10, 40); await tap(90, 40);
await page.getByLabel('Metres between the two marks').fill('80'); await page.getByRole('button', { name: 'Set the scale' }).last().click(); await page.waitForTimeout(600);
const m2 = await module(rid);
ok(!!m2.scale && (await words('[data-scale]')) === m2.scale && /^Scale set: 80 m between the two marks, so the board is (99\.9|100) m across/.test(m2.scale), `2 the scale in words, the module's: "${m2.scale}"`);

/* ---- 3 · Operator 1 walked by taps */
await walk('Operator 1', ['Film store', 'LINE', 'Case store'], false);
ok(/^Walking: Operator 1/.test(await words('[data-sb-hint]')) && /3 tapped/.test(await words('.sb-walkbar')), `3 walking: "${await words('.sb-walkbar')}"`);
await mark('Scale').click(); await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(300);
ok(/3 tapped/.test(await words('.sb-walkbar')), '3 a place tapped by mistake taken off with Undo');
await tap(60, 73);
await mark('Operator 1').click(); await page.waitForTimeout(500);
ok((await page.locator('.sb-walkbar').count()) === 0, '3 Operator 1 tapped again ends the walk');
const lines3 = await page.locator('.sb-path').count();
const moves3 = await words('.sb-moves');
ok(lines3 === 1 && /^Operator 1 1\. Packing line → Film store \(40(\.0)? m straight\) · 2\. Film store → Packing line .* 4\. Case store → Packing line \(25(\.0)? m straight\)$/.test(moves3), `3 one line, four moves listed with their straight metres: "${moves3}"`);

/* ---- 4 · all three, as S3 */
await walk('Operator 2', ['Scale', 'LINE', 'Film store', 'LINE']);
await walk('Operator 3', ['Case store', 'LINE']);
await page.locator('[data-field-input="rounds"]').fill('10');
const fold = page.locator('.calc-money > summary'); if (await fold.count()) { await fold.click(); await page.waitForTimeout(200); }
await page.locator('[data-field-input="rate"]').fill('25'); await page.locator('[data-field-input="shiftsWeek"]').fill('5');
await page.waitForTimeout(1200);
const SAYS = '3 walkers make 10 moves a round, 278 m together. Operator 1 walks most — 130 m (47%). Packing line is arrived at most — 5 times.';
const m4 = await module(rid);
ok((await words('[data-calc=sentence]')) === SAYS && m4.sentence === SAYS, `4 S3's sentence, on the page and in the module: "${await words('[data-calc=sentence]')}"`);
ok(await page.locator('.sb-path').count() === 3, '4 three lines, one a person');
ok(!!m4.money && /£14\.8\d a shift/.test(m4.money) && (await words('[data-calc=money]')) === m4.money, `4 the money, the module's: "${m4.money}"`);
ok(m4.pic === 'The walk on the board, to scale' && (await page.locator('.calc-pic-area').count()) === 1, '4 the picture is the board to scale, its area drawn');

/* ---- 5 · measured over, a place dragged */
const firstM = page.locator('[data-field-input="w1_s02_m"]');
ok(/Operator 1, move 1: Packing line → Film store — metres measured/.test(await page.locator('.calc-form').textContent()), '5 a move’s box named by its move');
await firstM.fill('46'); await page.waitForTimeout(1300);
ok((await words('[data-calc=sentence]')).includes('284 m together') && (await words('.sb-moves')).includes('Packing line → Film store (46 m measured)'), `5 measured 46 m wins: "${(await words('[data-calc=sentence]')).slice(0, 60)}"`);
const before5 = await words('.sb-moves');
{
  await mark('Case store').scrollIntoViewIfNeeded(); const r = await svg().boundingBox();
  const [cx, cy] = await page.evaluate(() => { const e = document.querySelector('.sb-mark[data-name="Case store"] circle').getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; });
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 10, cy - 10); await page.mouse.move(cx + 0.1 * r.width, cy - 0.1 * r.height, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(1300);
}
const after5 = await words('.sb-moves'), m5 = await module(rid);
ok(after5 !== before5 && /Case store \((?!25)[0-9.]+ m straight\)/.test(after5) && after5.includes('Packing line → Film store (46 m measured)') && m5.inputs.w1_s02_m === 46, '5 the case store dragged: its lengths follow, the measured 46 m stays');

/* ---- 6 · no scale */
await go('#/calc/spaghetti-walkers?add=1');
await page.getByLabel('What is it of?').fill('FLT round, no scale'); await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1800);
const nid = rec();
await tool('Person'); await tap(20, 30);
await tool('Place'); await tap(70, 60); await name('Chiller');
await tool('Move');
await walk('Operator 1', ['Chiller']);
const m6 = await module(nid);
ok(/no scale is set/.test(m6.warn) && m6.pic === 'The walk on the board, as drawn (not to scale)' && /^Operator 1 makes 1 move a round; no lengths were given, so moves are counted, not metres/.test(m6.sentence ?? ''), `6 no scale: counted, said, not to scale ("${m6.sentence}")`);
ok((await words('.sb-moves')).includes('Operator 1’s spot → Chiller (no length)'), '6 a person on no area starts at their own spot, and the move has no length');

/* ---- 7 · the paper */
await go(`#/calc/spaghetti-walkers/${encodeURIComponent(rid)}`);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const f = join(OUT, 'board.pdf'); await dl.saveAs(f);
const text = t.norm(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(text.includes('The walk on the board, to scale') && text.includes('Film store') && text.includes('Case store') && text.includes('Packing line') && text.includes(t.norm((await module(rid)).sentence ?? '—')) && text.includes('NOT TO SCALE') === false, '7 the paper: the board picture to scale, its places and the module’s sentence', text.slice(0, 300));

/* ---- 8 · walk on this map */
await go(`#/project/${sd.projectId}/standard/${sd.standardId}`);
const std = await page.evaluate(async id => { const db = await import('/src/db.ts'); const all = await db.listAllStandards(); const s = all.find(x => x.id === id); return { marks: s.marks.length, people: s.marks.filter(m => m.kind === 'person').length, upd: s.updatedAt }; }, sd.standardId);
await pressMore(page, 'Walk on this map — spaghetti diagram'); await page.waitForTimeout(2200);
const wid = rec();
const m8 = await module(wid);
const std2 = await page.evaluate(async id => { const db = await import('/src/db.ts'); const s = (await db.listAllStandards()).find(x => x.id === id); return { marks: s.marks.length, upd: s.updatedAt }; }, sd.standardId);
ok(page.url().includes('/calc/spaghetti-walkers/') && (await page.locator('[data-from-standard]').count()) === 1 && (await page.locator('.sb-mark.is-person').count()) === std.people && std.people > 0, `8 its ${std.people} people on a new board, said where from`);
ok(std2.marks === std.marks && std2.upd === std.upd && m8.walks.length === 0, '8 the Line standard is unchanged');

/* ---- 9 · a record from before the board */
await go(`#/calc/spaghetti-walkers?add=1`);
await page.getByLabel('What is it of?').fill('Typed before the board'); await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
for (const [k, v] of [['w1_label', 'Operator 1'], ['w1_s01_name', 'Line'], ['w1_s02_name', 'Bins'], ['w1_s02_m', '12']]) await page.locator(`[data-field-input="${k}"]`).fill(v);
await page.waitForTimeout(1200); await page.reload(); await page.waitForTimeout(2200);
ok((await words('[data-calc=sentence]')).startsWith('Operator 1 makes 1 move a round, 12 m in all') && (await page.locator('[data-spag-board]').count()) === 1 && (await page.locator('[data-field-input="w1_label"]').count()) === 1, '9 typed before the board: as it was, the boxes kept, the blank board offered');

/* ---- 10 · a client, and the phone */
await page.evaluate(async ([id, pid]) => { const D = await import('/src/db.ts'); await D.patchStudy(id, { projectId: pid }); }, [rid, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/calc/spaghetti-walkers/${encodeURIComponent(rid)}`);
ok((await page.locator('.sb-path').count()) === 3 && (await page.locator('.sb-tools').count()) === 0 && (await page.locator('.sb-size').count()) === 0, '10 a client sees the board and the walks, with no tools');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/calc/spaghetti-walkers/${encodeURIComponent(nid)}`);
const wide = await page.evaluate(() => document.scrollingElement.scrollWidth);
const small = await page.evaluate(() => [...document.querySelectorAll('.sb-tool')].filter(b => b.getBoundingClientRect().height < 44).length);
ok(wide <= 390 && small === 0 && (await page.locator('[data-spag-board]').isVisible()), `10 the phone: nothing off the side (${wide}), every tool 44 px or more, the board in the figures pane`);
await tool('Place'); await tap(30, 50); await name('Bins');
await tool('Move');
await walk('Operator 1', ['Bins']);
ok((await module(nid)).walks[0]?.places.length === 2, '10 a walk tapped on the phone');

await t.finish('ALL PASSED');
