/* ACCEPTANCE — WORKING WITHIN AN AGREED INVESTIGATION (10 November, docs/LUNA-WORKSPACE.md W3 — Rowland: "Once I've authorised an
 * investigation, Luna should be able to capture and populate information within that agreed scope without asking me to approve every
 * individual field. Significant or consequential changes must still have appropriate safeguards"). The gateway answered by the script:
 *
 *   1  Luna beside the DMAIC project; she asks once to work within it — a card; nothing agreed until Do it; then "Working within" with Stop
 *   2  readings added to the project's capability study: NO card — a receipt saying what landed and where; the readings on the study
 *   3  the study's own page with Luna beside it says what she just changed, at the top of the page
 *   4  a consequential step inside the same project (raise a problem) still a card; a study of ANOTHER project still a card
 *   5  Stop: the next capture into the project is a card again
 *
 *   node scripts/acceptance/luna-scope.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: true, reply: 'Done.', model: 'test' }) });
});
const P = '[data-luna-panel]';
const send = async w => { await page.locator(`${P} .ai-box`).fill(w); await page.locator(P).getByRole('button', { name: 'Send', exact: true }).click(); };
const settle = async () => { await page.waitForFunction(p => !document.querySelector(`${p} .ai-thinking`), P, { timeout: 15000 }).catch(() => undefined); await page.waitForTimeout(700); };
/* the DMAIC project's capability study, and a study of another project */
const ids = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ss = (await db.listAllStudies()).filter(s => !s.deletedAt && s.tool === 'capability' && s.projectId);
  const a = ss[0];
  const b = ss.find(s => s.projectId !== a.projectId);
  return { study: a.id, project: a.projectId, other: b?.id ?? null, n: (a.facts.readings ?? []).length };
});

/* ---- 1 · asked once ---- */
await t.go(`#/project/${encodeURIComponent(ids.project)}`, 2500);
await page.evaluate(async () => (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('open'));
await page.waitForTimeout(1500);
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'w1', name: 'work_within', input: { projectId: ids.project } }], assistant: { v: 1 }, model: 'test' }), () => ({ ok: true, reply: 'Agreed — I will fill it in as we go.', model: 'test' })];
await send('Fill it in as we go');
await page.waitForSelector(`${P} [data-card="work_within"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
ok((await page.locator(`${P} [data-card="work_within"][data-card-status="waiting"]`).count()) === 1 && /without asking each time/.test(await t.words(`${P} [data-card="work_within"]`)), '1 asked once, as a card, saying what it allows and what still asks');
await page.locator(`${P} [data-card="work_within"]`).getByRole('button', { name: /Do it/ }).click();
await settle();
const agreed = await page.evaluate(async () => { const db = await import('/src/db.ts'); const c = (await db.listAllStudies()).find(s => s.tool === 'talk' && s.facts.colleague && (s.facts.authorised ?? []).length); return c?.facts.authorised ?? []; });
ok(agreed.includes(ids.project), '1 agreed on Do it — the project kept as agreed in the conversation');

/* ---- 2 · captured with no card ---- */
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'r1', name: 'add_readings', input: { studyId: ids.study, values: [181.2, 180.9, 181.4] } }], assistant: { v: 2 }, model: 'test' }), () => ({ ok: true, reply: 'Three readings added.', model: 'test' })];
await send('Jaw 2: 181.2, 180.9, 181.4');
await settle();
ok((await page.locator(`${P} [data-card="add_readings"]`).count()) === 0, '2 no card for readings inside the agreed investigation');
ok((await page.locator(`${P} [data-receipt="add_readings"]`).count()) === 1, `2 a receipt instead: "${(await t.words(`${P} [data-receipt="add_readings"]`)).slice(0, 90)}"`);
const n2 = await page.evaluate(async id => ((await (await import('/src/db.ts')).getStudy(id))?.facts.readings ?? []).length, ids.study);
ok(n2 === ids.n + 3, `2 the readings on the study (${ids.n} → ${n2})`);

/* ---- 3 · the study's page says what she changed ---- */
await page.locator(`${P} [data-receipt="add_readings"] .ai-ref`).first().click();
await page.waitForTimeout(2500);
ok((await page.locator(`${P} [data-ai]`).count()) === 1, `3 the receipt opens the study as the work, Luna beside it (${await page.evaluate(() => location.hash)})`);
ok(/Luna · \d\d:\d\d — Add the readings/.test(await t.words('[data-luna-changed]')), `3 the study's page says what Luna just changed ("${(await t.words('[data-luna-changed]')).slice(0, 70)}")`);

/* ---- 4 · consequential steps still ask ---- */
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'p1', name: 'raise_problem', input: { lineId: sd.wsId, projectId: ids.project, words: 'Jaw 2 drifting high', priority: 'high', how: 'measured' } }], assistant: { v: 3 }, model: 'test' })];
await send('Raise it as a problem');
await page.waitForSelector(`${P} [data-card="raise_problem"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
ok((await page.locator(`${P} [data-card="raise_problem"][data-card-status="waiting"]`).count()) === 1, '4 raising a problem in the agreed project still asks');
await page.locator(`${P} [data-card="raise_problem"]`).getByRole('button', { name: /Not now/ }).click();
await settle();
if (ids.other) {
  plan = [() => ({ ok: true, reply: '', calls: [{ id: 'r2', name: 'add_readings', input: { studyId: ids.other, values: [1, 2] } }], assistant: { v: 4 }, model: 'test' })];
  await send('Add these to the other study');
  await page.waitForSelector(`${P} [data-card="add_readings"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
  ok((await page.locator(`${P} [data-card="add_readings"][data-card-status="waiting"]`).count()) === 1, '4 a study of another project still asks');
  await page.locator(`${P} [data-card="add_readings"]`).getByRole('button', { name: /Not now/ }).click();
  await settle();
}

/* ---- 5 · Stop ---- */
await page.locator(`${P} .ai-strip`).click(); await page.waitForTimeout(600);
const stop = page.locator('[data-agreed-stop]:visible').first();
ok((await stop.count()) >= 1 && /Working within/.test(await t.words('[data-ctx-agreed]')), '5 the agreement is shown with Stop');
await stop.click(); await page.waitForTimeout(800);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'r3', name: 'add_readings', input: { studyId: ids.study, values: [181] } }], assistant: { v: 5 }, model: 'test' })];
await send('One more: 181');
await page.waitForSelector(`${P} [data-card="add_readings"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
ok((await page.locator(`${P} [data-card="add_readings"][data-card-status="waiting"]`).count()) >= 1, '5 after Stop, the next capture asks again');

await t.finish('Working within an agreed investigation — captured as receipts inside it, consequential steps and other projects still asked, Stop puts it back.');
