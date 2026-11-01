/* ACCEPTANCE — THE A3 METHOD'S OWN SHEET AND PAPER (docs/METHODS.md §16; FC-151; knowledge/methods/rca/a3.md — Rowland, 1 November:
 * "I asked you to build the method and insert the tools where required").
 *
 *   1  the board: Toyota's one sheet in two columns — how it is now (Background, Current condition, Target) left, what is to be done
 *      (Analysis, Countermeasures, Plan, Follow-up) right; the default boxes under the sections are not drawn twice
 *   2  an answer kept after a reload; the closing line counts the blocks in words
 *   3  the countermeasures as a list: what / who / by when / against which cause; a second and a third row; one with no cause named
 *      said so; kept after a reload
 *   4  tools fall in: the project's latest capability study speaks under the current condition in the tool's own words and opens;
 *      the follow-up says there is no before-and-after yet and offers one; the fishbone and the Actions one tap from their blocks
 *   5  "A3 on one page" from Report ▾: ONE page, A3 landscape, the words of the board on it, read back; the page too full to fit
 *      one A3 at a readable size runs on and says so, nothing cut
 *   6  a client reads and writes nothing
 *   7  a phone: one column, nothing off the side
 *
 *   node scripts/acceptance/method-a3.mjs      (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, norm } = t;
const sd = await t.seed();
const A3 = sd.methodProjectIds.a3;
const box = label => page.getByLabel(label, { exact: true }).first();
const fill = async (label, v) => { await box(label).fill(v); await box(label).blur(); await page.waitForTimeout(450); };

/* the module's own sentence for the seeded project's study, to check the screen against */
const said = await page.evaluate(async id => {
  const { listStudies } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts'); const M = await import('/src/project/method/shapes/a3Model.ts');
  const ss = await listStudies(id); const s = M.evidencePair(ss).current;
  return s ? { title: L.studyTitle(s), says: L.studyLine(s, { studies: ss }).text, href: L.studyHref(s) } : null;
}, A3);

/* ---- 1 the board ---- */
await go(`#/project/${A3}`, 2200);
await page.waitForSelector('.a3', { timeout: 20000 });
{
  const left = await page.locator('.a3-col[aria-label="How it is now"] .a3-blk').evaluateAll(e => e.map(x => x.getAttribute('aria-label')));
  const right = await page.locator('.a3-col[aria-label="What is to be done"] .a3-blk').evaluateAll(e => e.map(x => x.getAttribute('aria-label')));
  ok(JSON.stringify(left) === JSON.stringify(['1. Background', '2. Current condition', '3. Target']), `1 left: how it is now — ${left.join(' · ')}`);
  ok(JSON.stringify(right) === JSON.stringify(['4. Analysis', '5. Countermeasures', '6. Plan', '7. Follow-up']), `1 right: what is to be done — ${right.join(' · ')}`);
  const cols = await page.locator('.a3-cols').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  ok(cols === 2, `1 two columns at a desk (${cols})`);
  ok((await page.locator('.msheet').count()) === 0, '1 the sections’ own boxes are not drawn a second time');
  ok((await page.locator('.pmethod-sec').count()) === 6, '1 the six sections and their tools rows stay');
}

/* ---- 2 an answer kept ---- */
await fill('The problem, in one line', 'Lane 3 leakers at 3.2% against 0.3%');
await fill('Why it matters', 'Leakers cost £800 a week and one retailer complaint');
await fill('The number wanted, by when', '0.3% on lane 3 by 14 November');
await go(`#/project/${A3}`, 2200);
ok((await box('The problem, in one line').inputValue()) === 'Lane 3 leakers at 3.2% against 0.3%', '2 the answer is kept after a reload');
const says = await page.locator('.a3-says').textContent();
ok(/2 of 7 blocks written/.test(says), `2 the closing line counts the blocks: ${says}`);
ok(/follow-up is not written/.test(says), '2 an unwritten follow-up is said in words');

/* ---- 3 the countermeasures, a list ---- */
await fill('What — countermeasure 1', 'Calibrate the heater at every jaw change');
await fill('Who — countermeasure 1', 'Engineering');
await fill('By when — countermeasure 1', '7 November');
await fill('Against which cause — countermeasure 1', 'New jaw’s heater runs cold');
await page.getByRole('button', { name: 'Add a countermeasure' }).click();
await fill('What — countermeasure 2', 'Jaw-change checklist');
await fill('Who — countermeasure 2', 'Production');
await go(`#/project/${A3}`, 2200);
ok((await box('What — countermeasure 1').inputValue()) === 'Calibrate the heater at every jaw change' && (await box('Against which cause — countermeasure 1').inputValue()) === 'New jaw’s heater runs cold', '3 a countermeasure kept after a reload, cause and all');
ok((await box('Who — countermeasure 2').inputValue()) === 'Production', '3 a second row is a row of its own');
ok(/1 countermeasure names no cause/.test(await page.locator('.a3-blk[aria-label="5. Countermeasures"] .a3-warn').innerText()), '3 a countermeasure naming no cause is said so');
await fill('Against which cause — countermeasure 2', 'No jaw-change standard');
ok((await page.locator('.a3-blk[aria-label="5. Countermeasures"] .a3-warn').count()) === 0, '3 once it names its cause the warning goes');

/* ---- 4 tools fall in ---- */
{
  const cur = page.locator('.a3-blk[aria-label="2. Current condition"] .a3-ev');
  ok(!!said && norm(await cur.innerText()).includes(norm(said.title)) && norm(await cur.innerText()).includes(norm(said.says)), `4 the project’s latest study speaks under the current condition, as the tool says it (${said?.title})`);
  await cur.getByRole('button', { name: /^Open / }).click(); await page.waitForTimeout(1500);
  ok(page.url().includes(said.href.split('/')[1]) && page.url().includes(A3), `4 it opens in the project (${page.url().split('#')[1]})`);
  await go(`#/project/${A3}`, 2200);
  const fol = page.locator('.a3-blk[aria-label="7. Follow-up"] .a3-ev');
  ok(/No before-and-after in this project yet/.test(await fol.innerText()) && (await fol.getByRole('button', { name: /^Use Analysis/ }).count()) === 1, '4 no before-and-after yet: said, and one is offered — the follow-up can be written without one');
  await page.locator('.a3-blk[aria-label="4. Analysis"]').getByRole('button', { name: /fishbone/ }).click(); await page.waitForTimeout(1200);
  ok(/fishbone/.test(page.url()) && page.url().includes(A3), '4 the analysis is one tap from the fishbone and five whys');
  await go(`#/project/${A3}`, 2200);
  await page.locator('.a3-blk[aria-label="5. Countermeasures"]').getByRole('button', { name: /Actions/ }).click(); await page.waitForTimeout(1200);
  ok(/actions/.test(page.url()) && page.url().includes(A3), '4 the countermeasures are one tap from the project’s Actions');
  await go(`#/project/${A3}`, 2200);
}

/* ---- 5 the paper ---- */
const pdf = async () => {
  const dir = mkdtempSync(join(tmpdir(), 'a3-')); const file = join(dir, 'a3.pdf');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'A3 on one page')]);
  await dl.saveAs(file);
  const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  return { info, text: norm(execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' })), pages: +/Pages:\s+(\d+)/.exec(info)[1], size: /Page size:\s+([\d.]+) x ([\d.]+)/.exec(info).slice(1).map(Number) };
};
/* ---- 4b the fishbone speaks at the analysis (FC-151 — the cause is kept on the fishbone once; the sheet says what it holds) ---- */
{
  const an = () => page.locator('.a3-blk[aria-label="4. Analysis"] [aria-label="Analysis — what the project’s fishbone says"]');
  await go(`#/project/${A3}`, 2200);
  ok((await an().count()) === 0, '4b no fishbone causes yet: the analysis block says nothing it does not know');
  await page.evaluate(async id => {
    const D = await import('/src/db.ts');
    const ws = await D.createWorkspace('Line 3 — A3 fishbone');
    await D.addPaceLine({ projectId: id, key: 'L3', name: 'Line 3', workspaceId: ws.id });
    const now = Date.now(), why = n => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, text: `why ${i + 1}` }));
    await D.addCase({ id: 'a3-case', workspaceId: ws.id, projectId: id, lineId: ws.id, title: 'Leaking seals', path: [], baselineMsWeek: 0, status: 'open', openedAt: now, updatedAt: now, causes: [
      { id: 'k1', m: 'machine', text: 'The new jaw’s heater reads low', grade: 'measured', status: 'confirmed', root: true, whys: why(3), at: now },
      { id: 'k2', m: 'material', text: 'Film batch', grade: 'observed', status: 'suspected', whys: why(1), at: now },
    ] });
  }, A3);
  await go(`#/project/${A3}`, 2600);
  const said = norm(await an().innerText());
  ok(said.includes(norm('2 causes on the fishbone, 1 marked as the root: “The new jaw’s heater reads low” (3 whys).')), `4b the analysis reads the fishbone: ${said.slice(0, 160)}`);
  ok(said.includes(norm('No countermeasure names “The new jaw’s heater reads low” yet.')), '4b the written countermeasure names another cause, so the root is bare — said in words');
  await fill('Against which cause — countermeasure 1', 'The new jaw’s heater reads low');
  ok(/Every root has a countermeasure that names it/.test(norm(await an().innerText())), '4b a countermeasure that names the root, and the sheet says so');
  await fill('Against which cause — countermeasure 1', 'New jaw’s heater runs cold');
  const p = await pdf();
  ok(p.text.includes(norm('The project’s fishbone')) && p.text.includes(norm('2 causes on the fishbone, 1 marked as the root')), '4b the paper carries the same sentence under Analysis, read back');
}

{
  const p = await pdf();
  ok(p.pages === 1, `5 “A3 on one page” is ONE page (${p.pages})`);
  ok(p.size[0] > p.size[1] && Math.abs(p.size[0] / p.size[1] - 420 / 297) < 0.02, `5 A3 landscape, the proportion 420 × 297 (${p.size.join(' × ')} pt)`);
  const want = ['Lane 3 leakers at 3.2% against 0.3%', '1 Background', 'Leakers cost £800 a week', '2 Current condition', '3 Target', '0.3% on lane 3 by 14 November', '4 Analysis', '5 Countermeasures', 'Calibrate the heater at every jaw change', 'Engineering', '7 November', 'New jaw’s heater runs cold', 'Jaw-change checklist', 'No jaw-change standard', '6 Plan', '7 Follow-up', 'WHAT THE PROJECT’S TOOLS SAY', said?.title ?? '', said?.says ?? ''].map(norm);
  const lost = want.filter(w => w && !p.text.includes(w));
  ok(lost.length === 0, lost.length ? `5 words missing from the paper: ${lost.join(' | ')}` : `5 the board’s words are on the paper, read back (${want.length} phrases)`);
  ok(!/runs on/.test(p.text), '5 an ordinary sheet needs no run-on');
}
{
  await fill('The steps', Array.from({ length: 90 }, (_, i) => `Step ${i + 1}: move the fifth cart to the sealer and check the film tension.`).join('\n'));
  const p = await pdf();
  ok(p.pages > 1 && /runs on, nothing cut/.test(p.text) && p.text.includes('Step 90: move the fifth cart'), `5 more than one A3 holds: it runs on over ${p.pages} pages, says so, and nothing is cut`);
  await fill('The steps', '');
}

/* ---- 6 a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${A3}`, 1000); await page.reload(); await page.waitForTimeout(2200);
{
  const boxes = await page.locator('.a3 textarea, .a3 input, .a3-add').count();
  ok(boxes === 0 && /Lane 3 leakers/.test(await page.locator('.a3-head').innerText()), `6 a client reads the sheet and writes nothing (${boxes} controls)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 7 a phone ---- */
await page.setViewportSize({ width: 390, height: 800 }); await go(`#/project/${A3}`, 2200);
{
  const w = await t.wide(); const cols = await page.locator('.a3-cols').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  ok(w <= 1 && cols === 1, `7 on a phone one column, nothing off the side (${w}px over, ${cols} column)`);
  const small = await page.locator('.a3 textarea, .a3 input, .a3 button').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height < 43.5).length);
  ok(small === 0, `7 every control 44 px tall (${small} short)`);
}

await t.finish('The A3 accepted: Toyota’s sheet in two columns, countermeasures as a list, tools falling in, A3 on one page read back, a client reads only, a phone fits');
