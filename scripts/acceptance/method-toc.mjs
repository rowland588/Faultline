/* ACCEPTANCE — THEORY OF CONSTRAINTS' OWN BOARD AND PAPER (docs/METHODS.md §16; src/project/method/shapes/toc*).
 *
 * The project's method page is the five focusing steps: a strip of the steps with where each stands in words, a card a step reading
 * the line's OWN numbers (Line capacity's constraint and gap, the loss count's minutes at the constraint in packs and pounds, the
 * buffer, the options to elevate), the tool that answers each with the project's record of it, the passes round the loop, and the
 * Constraint review on paper.
 *
 *   1  a project with no records: the board says what is missing and where to give it; Start opens Line capacity in the project
 *   2  the worked line (Bagger 70, Wrapper 50, Packer 80 a minute, target 60, 2 h buffer; a count with 45 min of Wrapper stops at 4p):
 *      the cards say what the module and the hand-worked literals say
 *   3  the tools fall in: the project's Line capacity and Loss count are read and opened from the cards
 *   4  the questions: the new ones asked, an answer kept after a reload, the strip counting what is written
 *   5  going again: pass 2 starts at where the constraint moved, the repeat list kept after a reload
 *   6  the Constraint review read back from the PDF
 *   7  a client reads and writes nothing
 *   8  a phone: nothing off the side, the controls 44 px
 *
 *   SMOKE_BASE=http://127.0.0.1:5217 node scripts/acceptance/method-toc.mjs */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, norm } = t;
const sd = await t.seed();
const P = sd.methodProjectIds.toc;
const card = n => page.locator(`.toc-card[aria-label^="Step ${n} "]`);
const text = async n => norm(await card(n).innerText());

/* ---- 1 nothing yet ---- */
await go(`#/project/${P}`, 2000);
await page.waitForSelector('.toc', { timeout: 20000 });
ok((await page.locator('.toc-chip').count()) === 0 && (await page.locator('.toc-card').count()) === 5, '1 five step cards, no second strip (the dashboard’s journey is the one)');
ok(/The constraint is not read yet/.test(await text(1)) && /no Line capacity with stations yet/.test(await text(1)), '1 step 1 says the constraint is not read and what is missing');
ok(/No loss count in the project yet/.test(await text(2)) && /Count a shift/.test(await text(2)), '1 step 2 names the missing loss count');
await card(1).getByRole('button', { name: 'Start Line capacity' }).click(); await page.waitForTimeout(1500);
ok(page.url().includes(P) && /balances/.test(page.url()), `1 Start opens Line capacity in the project (${page.url().split('#')[1]})`);

/* ---- 2 the worked line ---- */
await page.evaluate(async P => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  const t = Date.now(), HR = 3_600_000;
  const ws = await db.createWorkspace('Line T');
  await db.updateWorkspace({ ...ws, crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 });
  const st = (id, name, rate, o = {}) => ({ id, name, kind: 'machine', unit: 'bags', contains: 1, rate, ratePer: 'min', source: 'plate', ...o });
  await db.putStandard({ id: uid(), projectId: P, workspaceId: ws.id, product: 'Maris 2kg', marks: [], sort: 0, createdAt: t, updatedAt: t,
    capacity: { targetPerMin: 60, bufferH: 2, stations: [st('t-a', 'Bagger', 70), st('t-b', 'Wrapper', 50), st('t-c', 'Packer', 80)] } });
  const from = t - 10 * HR, to = from + 8 * HR;
  const stop = (at, mins, asset) => ({ id: uid(), workspaceId: ws.id, category: 'Breakdown', subcategory: 'Mechanical', asset, shift: 'Days', startedAt: at, endedAt: at + mins * 60_000, durationMs: mins * 60_000, count: 1, timing: 'stopwatch', media: [], createdAt: t, updatedAt: t });
  for (const o of [stop(from + HR, 30, 'Wrapper'), stop(from + 3 * HR, 15, 'Wrapper'), stop(from + 5 * HR, 10, 'Packer')]) await db.addObservation(o);
  await db.putStudy({ id: uid(), tool: 'losses', name: 'Days shift', workspaceId: ws.id, projectId: P, facts: { losses: { shift: 'Days', from, to, breakMin: 30, plannedMin: 450, made: 18000, rejects: 200, ratePerMin: 50, rateFrom: 'plate', rateMachine: 'Wrapper' } }, uses: [], startedAt: to + 60_000, createdAt: t, updatedAt: t });
}, P);
await go(`#/project/${P}`, 2500);
await page.waitForSelector('.toc-card', { timeout: 20000 });
const lit = {
  one: 'Wrapper limits the line: it makes 50 bags a minute against 60 wanted, 10 short.',
  next: 'The next to limit it is Bagger, so fixing Wrapper gives at most 20 bags a minute more.',
  at: 'At Wrapper a minute is a minute for the whole line: 45 min is about 2,250 bags, £90 of contribution.',
  buffer: 'A buffer of 2 hours of the constraint’s running time is set in front of Wrapper.',
  five: 'When Wrapper is lifted the constraint moves to Bagger after 20 bags a minute more — check Bagger next.',
};
ok((await text(1)).includes(norm(lit.one)) && (await text(1)).includes(norm(lit.next)), '2 step 1: the constraint, the gap and the next station as worked by hand');
ok((await text(2)).includes(norm(lit.at)) && /Breakdown/.test(await text(2)), '2 step 2: 45 min at the Wrapper = 2,250 bags = £90 at 4p');
ok((await text(3)).includes(norm(lit.buffer)) && /No orders are laid on the week yet/.test(await text(3)), '2 step 3: the 2 h buffer, and the missing orders named');
ok((await text(5)).includes(norm(lit.five)), '2 step 5: the constraint moves to Bagger');
const mod = await page.evaluate(async P => {
  const { loadTocRecords } = await import('/src/project/method/shapes/toc.tsx'); const { tocSteps } = await import('/src/project/method/shapes/tocModel.ts');
  return tocSteps({}, await loadTocRecords(P)).map(s => ({ says: s.says, lines: s.lines }));
}, P);
for (const i of [0, 1, 2, 3, 4]) { const tx = await text(i + 1); ok(tx.includes(norm(mod[i].says)) && mod[i].lines.every(l => tx.includes(norm(l))), `2 step ${i + 1} on the screen is the module’s, every line`); }

/* ---- 3 tools fall in ---- */
ok(/This project's Line capacity is read here/.test(await text(1)) && /This project's Loss count is read here/.test(await text(2)), '3 the project’s Line capacity and Loss count are read — said on the cards');
await card(2).getByRole('button', { name: 'Open Loss count' }).click(); await page.waitForTimeout(1200);
ok(page.url().includes(P) && /loss/i.test(page.url()), `3 the card opens the Loss count in the project (${page.url().split('#')[1]})`);

/* ---- 4 the questions, kept ---- */
await go(`#/project/${P}`, 2000);
await t.openSections();   // the section in hand is open, the rest one line each (docs/DESIGN.md) — opened to read them
const sec = n => page.locator(`.pmethod-sec[aria-label="${n}"]`);
const box = (s, q) => sec(s).locator('.msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + q + '$') }) }).locator('.msheet-in');
ok((await sec('Identify the constraint').locator('.msheet-q').count()) === 2 && (await sec('Exploit it').locator('.msheet-q').count()) === 2 && (await sec('Go again').locator('.msheet-q').count()) === 2, '4 the extra questions are asked (2 · 2 · 3 · 2 · 2)');
await box('Identify the constraint', 'The constraint').fill('Wrapper'); await box('Identify the constraint', 'The constraint').blur(); await page.waitForTimeout(500);
await box('Go again', 'Where the constraint is now').fill('Packer'); await box('Go again', 'Where the constraint is now').blur(); await page.waitForTimeout(500);
await go(`#/project/${P}`, 2200);
ok((await box('Identify the constraint', 'The constraint').inputValue()) === 'Wrapper', '4 the answer is kept after a reload');
ok(/Under way: 1 of 2 written/.test(norm(await sec('Identify the constraint').locator('.pace-sec-sub').first().innerText())), '4 the section counts what is written, in words');

/* ---- 5 going again ---- */
const goAgain = page.getByRole('button', { name: /^Go again — start pass 2 at Packer/ });
ok((await goAgain.count()) === 1, '5 Go again offers pass 2 starting at where the constraint moved');
await goAgain.click(); await page.waitForTimeout(700);
ok((await page.locator('.toc-pass').count()) === 2 && /Pass 2.*Packer/.test(norm(await page.locator('.toc-pass').nth(1).innerText())), '5 pass 2 is listed, the constraint carried in');
const mv = page.getByLabel('Pass 2 — where the constraint moved to');
await mv.fill('Bagger'); await mv.blur(); await page.waitForTimeout(500);
await go(`#/project/${P}`, 2200);
ok((await page.locator('.toc-pass').count()) === 2 && (await page.getByLabel('Pass 2 — where the constraint moved to').inputValue()) === 'Bagger', '5 the passes are kept after a reload');
ok((await page.getByRole('button', { name: /^Go again — start pass 3 at Bagger/ }).count()) === 1, '5 and the next pass starts from Bagger');

/* ---- 6 the paper ---- */
const pdf = await t.pdfText(() => paper(page, 'Constraint review'), 'toc');
ok(/Constraint review/.test(pdf) && pdf.includes(norm(lit.one)), '6 the paper: the title and the constraint as the screen says it');
ok(pdf.includes(norm(lit.at)) && pdf.includes(norm(lit.buffer)) && pdf.includes(norm(lit.five)), '6 the paper: the losses at the constraint in packs and pounds, the buffer, the next constraint');
ok(/The constraint: Wrapper/.test(pdf) && /Where the constraint is now: Packer/.test(pdf) && /Pass 2: the constraint Packer; it moved to Bagger/.test(pdf), '6 the paper: the team’s words and the passes');
ok(/Missing: .*orders/.test(pdf), '6 the paper names what is missing, never invents it');

/* ---- 7 a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await page.reload(); await page.waitForTimeout(2500);
ok((await page.locator('.toc button:not([aria-label^="Open "])').count()) === 0, `7 a client has no Go again and no Start — only Open`);
ok((await page.locator('.pmethod textarea').count()) === 0 && (await page.locator('.toc-passes input').count()) === 0, '7 a client writes nothing');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 8 a phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await go(`#/project/${P}`, 2200);
{ const w = await t.wide(); ok(w <= 1, `8 on a phone nothing is off the side (${w}px over)`);
  const small = await page.locator('.toc .btn:visible').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43.5).length);
  ok(small === 0, `8 every board button is 44 px (${small} short)`); }

await t.finish('The Theory of Constraints’ board and paper accepted: the five steps read the line’s own numbers, tools fall in, passes repeat, the Constraint review is read back, a client reads only, a phone fits');
