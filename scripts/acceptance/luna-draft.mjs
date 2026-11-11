/* ACCEPTANCE — WHAT LUNA WROTE ON A METHOD'S SHEET, MARKED IN PLACE (10 November, docs/LUNA-WORKSPACE.md W5 — Rowland: "Traditional
 * project templates such as DMAIC, 8D, PDCA and Kaizen must remain available for manual use, while also becoming accessible and
 * progressively populated through Luna"):
 *
 *   1  Luna answered PDCA's "The number we are improving" through the sheet's own save (a conversation's answer_method step): the box
 *      holds her words, dashed, "Luna wrote this · hh:mm · from “…”" with Keep and Not this; a box she did not write is as ever
 *   2  Keep: the mark goes, the answer stays — kept after a reload
 *   3  a second answer of hers changed in the box by the person: no mark — it is theirs
 *   4  a third taken out with Not this: the box empty, through the sheet's own save
 *   5  a client reads her words with the mark and no Keep or Not this
 *
 *   node scripts/acceptance/luna-draft.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const PD = sd.methodProjectIds.pdca;
const fields = await page.evaluate(async () => (await import('/src/lib/methodSheet.ts')).fieldsOf('pdca', 'Plan').map(f => ({ id: f.id, label: f.label })));
const [f1, f2, f3, f4] = fields;
await page.evaluate(async ({ PD, fs }) => {
  const db = await import('/src/db.ts'); const M = await import('/src/lib/methodSheet.ts');
  const t0 = Date.now();
  const words = ['Packs a minute at the packer', 'Line 7 runs at 52 against 60', 'Film changes take 9 minutes'];
  for (let i = 0; i < 3; i++) await db.putTestItem({ id: `ans-${i}`, projectId: PD, testId: M.answerScope('pdca', fs[i].id), kind: 'note', what: words[i], sort: t0, createdAt: t0, updatedAt: t0 });
  await db.putStudy({ id: 'draft-conv', tool: 'talk', name: 'PDCA with Luna', facts: { colleague: true, named: 'PDCA with Luna', threads: [], actions: [], turns: [{ id: 'r1', at: t0, who: 'Faultline', kind: 'reply', text: 'Written.', used: [{ callId: 'a1', name: 'answer_method', title: 'Answer the method’s questions', kind: 'write', status: 'done', says: 'Written', refs: [], at: t0, auto: true, input: { projectId: PD, answers: words.map((w, i) => ({ field: fs[i].label, text: w })) } }] }] }, uses: [], startedAt: t0, createdAt: t0, updatedAt: t0 });
}, { PD, fs: fields });
const plan = () => page.locator('.pdca-q[data-q="Plan"]');
const field = id => plan().locator(`.msheet-f:has(.msheet-in[aria-label="${fields.find(f => f.id === id).label}"])`);

/* ---- 1 · marked where it stands ---- */
await t.go(`#/project/${PD}`, 2500);
await t.openBoard();   // the board opens on the quarter in hand (docs/DESIGN.md) — opened to read it, kept on the device
const m1 = field(f1.id).locator('[data-luna-draft]');
ok((await m1.count()) === 1 && /Luna wrote this · \d\d:\d\d · from “PDCA with Luna”/.test(await m1.innerText()), `1 her answer marked in place ("${(await m1.innerText().catch(() => '')).slice(0, 60)}")`);
ok((await field(f1.id).locator('[data-luna-keep]').count()) === 1 && (await field(f1.id).locator('[data-luna-not]').count()) === 1, '1 Keep and Not this offered');
ok(f4 ? (await field(f4.id).locator('[data-luna-draft]').count()) === 0 : true, '1 a box she did not write is as ever');

/* ---- 2 · Keep ---- */
await field(f1.id).locator('[data-luna-keep]').click(); await page.waitForTimeout(800);
ok((await field(f1.id).locator('[data-luna-draft]').count()) === 0 && (await field(f1.id).locator('.msheet-in').inputValue()) === 'Packs a minute at the packer', '2 Keep: the mark gone, the answer stays');
await page.reload(); await page.waitForTimeout(3000);
ok((await field(f1.id).locator('[data-luna-draft]').count()) === 0, '2 kept after a reload');

/* ---- 3 · changed by the person ---- */
const box2 = field(f2.id).locator('.msheet-in');
await box2.fill('Line 7 runs at 52 a minute against 60 wanted'); await box2.blur(); await page.waitForTimeout(1200);
ok((await field(f2.id).locator('[data-luna-draft]').count()) === 0, '3 changed in the box: no mark — the person’s answer');

/* ---- 4 · Not this ---- */
await field(f3.id).locator('[data-luna-not]').click(); await page.waitForTimeout(1200);
ok((await field(f3.id).locator('.msheet-in').inputValue()) === '' && (await field(f3.id).locator('[data-luna-draft]').count()) === 0, '4 Not this: taken out through the sheet’s own save');

/* ---- 5 · a client ---- */
await page.evaluate(async ({ PD, id, label }) => {
  const db = await import('/src/db.ts'); const M = await import('/src/lib/methodSheet.ts'); const t0 = Date.now();
  await db.putTestItem({ id: 'ans-c', projectId: PD, testId: M.answerScope('pdca', id), kind: 'note', what: 'Seal force drifting', sort: t0, createdAt: t0, updatedAt: t0 });
  const c = await db.getStudy('draft-conv');
  c.facts.turns.push({ id: 'r2', at: t0, who: 'Faultline', kind: 'reply', text: 'Written.', used: [{ callId: 'a2', name: 'answer_method', title: 'Answer', kind: 'write', status: 'done', says: 'Written', refs: [], at: t0, input: { projectId: PD, answers: [{ field: label, text: 'Seal force drifting' }] } }] });
  await db.putStudy({ ...c, updatedAt: t0 });
}, { PD, id: f3.id, label: f3.label });
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await page.reload(); await page.waitForTimeout(3000);
const cl = plan().locator('[data-luna-draft]');
ok((await cl.count()) >= 1 && (await plan().locator('[data-luna-keep]').count()) === 0, '5 a client: her words marked, no Keep or Not this');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

await t.finish('What Luna wrote on a method’s sheet — marked in place until the person keeps, changes or takes it out.');
