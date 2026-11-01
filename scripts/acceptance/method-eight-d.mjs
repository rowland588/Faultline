/* ACCEPTANCE — THE 8D REPORT FORM AND PAPER (docs/METHODS.md §16; src/lib/eightD, project/method/shapes/eight-d, lib/report/eightDPaper).
 *
 *   1  the board: nine disciplines D0–D8, each with its state in words, all "Not started"; the closing line as the module says it
 *   2  D2's is / is not side by side — four rows; an answer kept after a reload; D2 Under way in words
 *   3  the questions the method asks (customer, opened, symptom…) are on the page; D1 team written → All written
 *   4  corrective actions as a list: two added, who and by when typed, one marked done — D6 says an action is open
 *   5  tools fall in: Capability's record in this project shown read-only at D2/D6 with a button that opens the tool; nothing waits on it
 *   6  the 8D report paper, read back: every discipline with its state, the is / is-not pairs, the actions with who and when
 *   7  a client reads and writes nothing; 8 a phone fits
 *
 *   node scripts/acceptance/method-eight-d.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go } = t;
const sd = await t.seed();
const P = sd.methodProjectIds['eight-d'];
const mod = await page.evaluate(async () => { const m = await import('/src/lib/eightD.ts'); return { closing: m.closingLine({}), n: m.DISCIPLINES.length }; });
const board = () => page.locator('.e8');
const fillBox = async (label, v) => { const b = board().getByLabel(label, { exact: true }); await b.fill(v); await b.blur(); await page.waitForTimeout(350); };

await go(`#/project/${P}`, 2200);
await page.waitForSelector('.e8', { timeout: 20000 });

/* 1 */
{
  const ds = await board().locator('.e8-strip .e8-d').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
  ok(ds.length === 9 && ds.every((d, i) => d.startsWith(`D${i} `) && d.endsWith('Not started')), `1 nine disciplines, each Not started in words (${ds.length})`);
  ok((await t.words('.e8-says')) === mod.closing, `1 the closing line is the module’s — “${mod.closing}”`);
}
/* 2 */
await fillBox('Is — What', 'Leakers on the end seal');
await fillBox('Is not — What', 'Leakers on the top seal');
await fillBox('Is — Where', 'Lane 3');
await fillBox('Is not — Where', 'Lanes 1, 2 and 4');
await go(`#/project/${P}`, 2200);
{
  const rows = await board().locator('.e8-isnot b').allInnerTexts();
  ok(rows.join('|') === 'What|Where|When|How much', `2 is / is not has four rows (${rows.join(', ')})`);
  const pos = await board().getByLabel('Is — What', { exact: true }).boundingBox(), neg = await board().getByLabel('Is not — What', { exact: true }).boundingBox();
  ok(pos && neg && Math.abs(pos.y - neg.y) < 4 && neg.x > pos.x, '2 the two columns are side by side');
  ok((await board().getByLabel('Is — Where', { exact: true }).inputValue()) === 'Lane 3', '2 an answer is kept after a reload');
  ok(/D2 .*Under way — 4 of 8/.test(await board().locator('.e8-d').nth(2).getAttribute('aria-label')), '2 D2 says Under way — 4 of 8');
}
/* 3 — the method's questions are still asked, and D1 */
{
  const qs = await page.locator('.pmethod-sec[aria-label^="D0"] .msheet-q').allInnerTexts();
  ok(qs[0] === 'Who raised it, and their reference' && qs.includes('The symptom') && qs.includes('The emergency response'), `3 D0 asks who raised it, when, the symptom, the response (${qs.length} boxes)`);
  const team = page.locator('.pmethod-sec[aria-label^="D0"]').getByLabel('The team', { exact: true });
  await team.fill('Sam (lead), Priya QA'); await team.blur(); await page.waitForTimeout(400);
  ok(/^D1 .*All written/.test(await board().locator('.e8-d').nth(1).getAttribute('aria-label')), '3 D1 team written → All written');
}
/* 4 — actions */
await board().getByRole('button', { name: 'Add an action' }).click(); await page.waitForTimeout(500);
await board().getByLabel('Action 1', { exact: true }).fill('Fit the new jaw on lane 3'); await board().getByLabel('Action 1', { exact: true }).blur();
await board().getByLabel('Action 1 — who').fill('Sam'); await board().getByLabel('Action 1 — who').blur();
await board().getByLabel('Action 1 — by when').fill('7 Nov'); await board().getByLabel('Action 1 — by when').blur(); await page.waitForTimeout(400);
await board().getByRole('button', { name: 'Add an action' }).click(); await page.waitForTimeout(500);
await board().getByLabel('Action 2', { exact: true }).fill('Add the seal check to the round'); await board().getByLabel('Action 2', { exact: true }).blur(); await page.waitForTimeout(400);
await board().getByRole('button', { name: /Open — mark done/ }).first().click(); await page.waitForTimeout(500);
await go(`#/project/${P}`, 2200);
{
  ok((await board().locator('.e8-act').count()) === 2 && (await board().getByLabel('Action 1 — who').inputValue()) === 'Sam', '4 two actions listed with who and by when, kept after a reload');
  ok(/D6 .*1 action open/.test(await board().locator('.e8-d').nth(6).getAttribute('aria-label')), '4 D6 says one action is open, in words');
  ok((await board().getByRole('button', { name: /Done ✓/ }).count()) === 1, '4 one action marked done');
}
/* 5 — tools fall in */
{
  const ins = board().locator('[data-tool="capability"]').first();
  ok((await ins.count()) === 1, '5 Capability’s record in this project is shown at D2');
  const text = await ins.innerText();
  ok(/Capability/.test(text) && (/in this project: “/.test(text) || /nothing waits on it/.test(text)), `5 it says what the project holds, or that nothing waits (${text.replace(/\s+/g, ' ').slice(0, 90)})`);
  ok((await board().locator('[data-tool]').count()) >= 4, `5 at least four insertions (${await board().locator('[data-tool]').count()})`);
  await ins.getByRole('button').click(); await page.waitForTimeout(1200);
  ok(/capability/.test(page.url()) && page.url().includes(P), '5 the button opens the tool inside the project');
}
/* 6 — paper */
await go(`#/project/${P}`, 2200);
{
  const { openReport } = { openReport: async () => { await page.getByRole('button', { name: /Report/ }).first().click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: /8D report/ }).or(page.getByRole('button', { name: /^8D report/ })).first().click(); } };
  const txt = await t.pdfText(openReport, '8d');
  const want = ['8D report', 'D0 Symptom and emergency response', 'D1 The team', 'D2 Describe the problem', 'D6 Implement and validate', 'D8 Close', 'IS NOT', 'Leakers on the end seal', 'Leakers on the top seal', 'Lanes 1, 2 and 4', 'Fit the new jaw on lane 3', 'Sam', '7 Nov', 'Done', 'Open', 'Sam (lead), Priya QA', 'disciplines written'];
  const miss = want.filter(w => !txt.includes(w));
  ok(miss.length === 0, `6 the 8D report holds every discipline, the pairs and the actions (${miss.length ? 'missing: ' + miss.join(' | ') : want.length + ' lines read back'})`);
  ok(/D1 The team Under way|D1 The team All written/.test(txt) || txt.includes('All written'), '6 each discipline’s state is in words on the paper');
}
/* 7 — client */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${P}`, 800); await page.reload(); await page.waitForTimeout(2500);
{
  const n = await board().locator('textarea, input').count(), btn = await board().getByRole('button', { name: /Add an action|mark done/ }).count();
  ok(n === 0 && btn === 0 && (await t.words('.e8 .e8-ro')) !== '', `7 a client reads the form and writes nothing (${n} boxes, ${btn} write buttons)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
/* 8 — phone */
await page.setViewportSize({ width: 390, height: 844 }); await go(`#/project/${P}`, 2000);
{
  const w = await t.wide(); ok(w <= 1, `8 on a phone nothing is off the side (${w}px over)`);
  const small = await board().locator('button').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 40 && e.getBoundingClientRect().height > 0).length);
  ok(small === 0, `8 controls are thumb-sized (${small} under 40px)`);
}
await t.finish('The 8D form accepted: nine disciplines with states in words, is / is not side by side, the action list, tools falling in, the 8D report paper read back, a client reads only, a phone fits');
