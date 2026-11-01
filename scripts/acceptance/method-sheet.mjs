/* ACCEPTANCE — A METHOD'S OWN SHEET (docs/METHODS.md §16; src/lib/methodSheet — Rowland, 1 November: "I asked you to build the
 * method and insert the tools where required").
 *
 * A project that runs a method opens on the method's own questions — PDCA's plan is the number, the gap, the cause suspected, the
 * change and the effect expected — answered in the project, with the tools offered where one answers a question.
 *
 *   1  each of the seven worked methods: every section shows its questions, as the module says them, one box each
 *   2  PDCA's plan: one answer typed and left — kept after a reload, the section "Under way: 1 of 5 written"; it is not a meeting
 *      note (the Notes page does not list it)
 *   3  a tool offered at a question opens that tool in the project — nothing was required first
 *   4  all five written: "All written" in words
 *   5  a client reads the answers and writes nothing
 *   6  on a phone nothing off the side
 *
 *   node scripts/acceptance/method-sheet.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words } = t;
const sd = await t.seed();
const ids = sd.methodProjectIds;
const sheets = await page.evaluate(async () => { const M = await import('/src/lib/methodSheet.ts'); const L = await import('/src/lib/methods.ts'); return L.METHODS.map(m => ({ key: m.key, sections: m.sections.map(s => ({ name: s.name, fields: M.fieldsOf(m.key, s.name).map(f => f.label) })) })); });

/* ---- 1 every worked method asks its own questions ---- */
for (const m of sheets) {
  if (m.key === 'stage-gate') continue;
  if (m.key === 'kata') continue;   // the Kata storyboard is the interface; its questions are proved by method-kata.mjs
  await go(`#/project/${ids[m.key]}`, 1800);
  await page.waitForSelector('.pmethod', { timeout: 20000 });
  const got = await page.locator('.pmethod-sec').evaluateAll(els => els.map(e => ({ name: e.getAttribute('aria-label'), qs: [...e.querySelectorAll('.msheet-q')].map(q => q.textContent?.trim()) })));
  const want = m.sections.map(s => ({ name: s.name, qs: s.fields }));
  ok(JSON.stringify(got.filter(g => want.some(w => w.name === g.name))) === JSON.stringify(want), `1 ${m.key}: every section asks its own questions (${want.reduce((n, s) => n + s.qs.length, 0)} boxes)`);
}

/* ---- 2 PDCA: one answer kept ---- */
const PD = ids.pdca;
await go(`#/project/${PD}`, 1800);
const plan = () => page.locator('.pmethod-sec[aria-label="Plan"]');
const box = q => plan().locator('.msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).locator('.msheet-in');
ok(/Not started: 0 of 5 written/.test(await plan().locator('.pace-sec-sub').innerText()) || /0 of 5 written/.test(await plan().locator('.msheet-state').innerText()), '2 PDCA’s plan not started: 0 of 5 written, in words');
await box('The number we are improving').fill('Packs a minute at the packer');
await box('The number we are improving').blur(); await page.waitForTimeout(600);
await go(`#/project/${PD}`, 1800);
ok((await box('The number we are improving').inputValue()) === 'Packs a minute at the packer', '2 the answer is kept after a reload');
ok(/Under way/i.test(await plan().locator('.msheet-state').innerText()) && /1 of 5 written/i.test(await plan().locator('.msheet-state').innerText()), '2 the section says Under way — 1 of 5 written');
await go(`#/project/${PD}/notes`, 1800);
ok(!(await page.locator('body').innerText()).includes('Packs a minute at the packer'), '2 it is not a meeting note — the Notes page does not list it');

/* ---- 3 a tool falls in where it answers ---- */
await go(`#/project/${PD}`, 1800);
{
  const b = plan().getByRole('button', { name: /^Use Capability.* for The number we are improving/ });
  ok((await b.count()) === 1, '3 Capability is offered at “The number we are improving”, saying what it is');
  await b.click(); await page.waitForTimeout(1200);
  ok(/capability/.test(page.url()) && page.url().includes(PD), `3 the tool opens in the project — nothing was required first (${page.url().split('#')[1]})`);
}

/* ---- 4 all five written ---- */
await go(`#/project/${PD}`, 1800);
for (const [q, a] of [['Where it is, and where it should be', '48 against 60'], ['The cause we suspect, and why', 'Film tension'], ['The change we will make', 'Re-set the dancer'], ['The effect we expect, in the number', '58']]) {
  await box(q).fill(a); await box(q).blur(); await page.waitForTimeout(400);
}
await go(`#/project/${PD}`, 1800);
ok(/All written/i.test(await plan().locator('.msheet-state').innerText()) && /5 of 5 written/i.test(await plan().locator('.msheet-state').innerText()), '4 all five written: “All written” in words');

/* ---- 5 a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${PD}`, 2000);
{
  const boxes = await plan().locator('textarea, input').count();
  ok(boxes === 0 && (await words('.pmethod-sec[aria-label="Plan"] .msheet-ro')) === 'Packs a minute at the packer', `5 a client reads the answers and writes nothing (${boxes} boxes)`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 6 a phone ---- */
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${PD}`, 1800);
{ const w = await t.wide(); ok(w <= 1, `6 on a phone nothing is off the side (${w}px over)`); }

await t.finish('A method’s own sheet accepted: each worked method asks its own questions, answers are kept in the project and are not meeting notes, a tool falls in where it answers, a client reads only, a phone fits');
