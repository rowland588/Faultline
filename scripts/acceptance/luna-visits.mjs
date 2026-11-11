/* ACCEPTANCE — LUNA KNOWS THE CUSTOMER AND THE VISIT (11 November, docs/CONSULTANT-WORKSPACE.md C6; src/capabilities/visits — Rowland: "I'm at
 * a new customer today, I've been asked to look at their production performance"). Driven in a real browser on the smoke seed, every line
 * Branston's, the `assist` gateway played by the script round by round:
 *
 *   1  "I'm at a new customer today…" — start_visit as ONE card (the new customer, its brief in the person's words); nothing made while it waits
 *   2  Do it — the customer added, the visit in hand, the top bar saying Business B and the visit
 *   3  the next turn tells the gateway the client and the visit in hand (customer, site, day, brief)
 *   4  a problem captured on the visit (held at the customer); visit_state reads it — and never Branston's problem of the same hours
 *   5  "I'm back at Branston" — switch_client with no card; the bar says Branston; the visit at Business B said still in hand
 *   6  end_visit by a card; the phone, nothing off the side
 *
 *   node scripts/acceptance/luna-visits.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const br = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const ls = await liveProductionLines(await db.listWorkspaces());
  for (const w of ls) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
  const t0 = Date.now();
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: ls[0].id, problem: 'BRANSTON-ONLY sealer drift', status: 'open', priority: 'high', raisedAt: t0, updatedAt: t0, media: [] });
  return ls[0].id;
});
await page.reload(); await page.waitForTimeout(1500);

const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: false, why: 'nothing planned' }) });
});
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const lastWords = () => t.words('.ai-turn.is-colleague:last-of-type .ai-words');

/* 1 — ONE CARD FOR A NEW CUSTOMER AND ITS VISIT */
await t.go('#/ai', 3000);
const start = { client: 'Business B', site: 'Leeds', brief: 'look at their production performance' };
plan = [
  () => ({ ok: true, reply: 'Shall I start the visit?', calls: [{ id: 'v1', name: 'start_visit', input: start }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.ok ? 'Visit started at Business B.' : 'Not started.' }),
];
await send("I'm at a new customer today, Business B in Leeds — I've been asked to look at their production performance");
await page.waitForSelector('[data-card="start_visit"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const card = page.locator('[data-card="start_visit"]').last();
const cardWords = (await card.count()) ? (await card.innerText()).replace(/\s+/g, ' ') : '';
ok(/Add Business B as a new customer \(Leeds\)/.test(cardWords) && /look at their production performance/.test(cardWords), `1 one card: the new customer and its visit, the brief in the person’s words ("${cardWords.slice(0, 160)}")`);
const none = await page.evaluate(async () => (await import('/src/lib/visits.ts')).visitsOf(await (await import('/src/db.ts')).listAllStudies()).length);
ok(none === 0 && !(await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).some(s => s.agreed?.story?.client === 'Business B'))), '1 nothing made while the card waits');

/* 2 — DO IT */
await card.getByRole('button', { name: 'Do it' }).click();
await answered(1);
const made = await page.evaluate(async () => { const v = await import('/src/lib/visits.ts'); const vs = v.visitsOf(await (await import('/src/db.ts')).listAllStudies()); return { vs: vs.map(x => [x.client, x.site, x.brief]), hand: v.storedVisit()?.id === vs[0]?.id }; });
ok(JSON.stringify(made.vs) === JSON.stringify([['Business B', 'Leeds', 'look at their production performance']]) && made.hand, `2 Do it: the customer and the visit made, in hand (${JSON.stringify(made)})`);
const dayWord = await page.evaluate(() => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
ok((await t.words('.nv-client-l')) === 'Business B' && (await t.words('.nv-visit-l')) === `Visit ${dayWord}`, `2 the top bar: "${await t.words('.nv-client-l')}" · "${await t.words('.nv-visit-l')}"`);

/* 3 — THE NEXT TURN CARRIES THE CLIENT AND THE VISIT */
plan = [() => ({ ok: true, reply: 'Noted.' })];
const n3 = asks.length;
await send('Packing looks like the place to start.');
await answered(2);
const focus = asks[n3]?.focus ?? '';
ok(/The client the person is working in: Business B/.test(focus) && /The visit in hand: Business B, Leeds, .*asked: “look at their production performance”/.test(focus), `3 the gateway told the client and the visit in hand ("${(focus.match(/The visit in hand:[^\n]*/) ?? [''])[0].slice(0, 140)}")`);

/* 4 — WHAT THE VISIT HOLDS: its customer's only */
await page.evaluate(async () => {
  const v = await import('/src/lib/visits.ts');
  const db = await import('/src/db.ts');
  const h = await v.ensureHoldingLine('Business B', 'Leeds');
  const t0 = Date.now();
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: h.id, problem: 'VISIT-B pallets wait for the wrapper', status: 'open', priority: 'low', raisedAt: t0, updatedAt: t0, media: [] });
});
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 's1', name: 'visit_state', input: {} }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: `So far: ${b.pending?.results?.[0]?.says ?? 'nothing'}` }),
];
const n4 = asks.length;
await send('What have we got so far?');
await answered(3);
const res = asks[n4 + 1]?.pending?.results?.[0];
const resText = JSON.stringify(res ?? {});
ok(res?.ok === true && /The visit in hand: Business B/.test(res.says) && /VISIT-B pallets wait for the wrapper/.test(resText) && /held at the customer/.test(resText), `4 visit_state read at once: "${(res?.says ?? '').slice(0, 120)}"`);
ok(!resText.includes('BRANSTON-ONLY') && !resText.includes(br), '4 nothing of Branston in what was read — its problem of the same hours never among it');

/* 5 — BACK AT BRANSTON */
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'x1', name: 'switch_client', input: { client: 'Branston' } }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.says ?? 'could not' }),
];
await send("I'm back at Branston");
await answered(4);
ok((await page.locator('[data-card="switch_client"]').count()) === 0 && (await t.words('.nv-client-l')) === 'Branston', `5 switched with no card, the bar saying "${await t.words('.nv-client-l')}"`);
ok(/You are in Branston now.*The visit at Business B is still in hand/.test(await lastWords()), `5 said in the reply: "${(await lastWords()).slice(0, 120)}"`);

/* 6 — END THE VISIT, BY A CARD */
plan = [
  () => ({ ok: true, reply: 'End it?', calls: [{ id: 'e1', name: 'end_visit', input: {} }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.ok ? 'Ended.' : 'Not ended.' }),
];
await send('End the visit at Business B');
await page.waitForSelector('[data-card="end_visit"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const ec = page.locator('[data-card="end_visit"]').last();
ok(/End the visit at Business B/.test((await ec.innerText()).replace(/\s+/g, ' ')) && (await page.locator('.nv-visit').count()) === 1, '6 end_visit is a card; the visit still in hand while it waits');
await ec.getByRole('button', { name: 'Do it' }).click();
await answered(5);
const ended = await page.evaluate(async () => { const v = await import('/src/lib/visits.ts'); return { hand: v.storedVisit(), ended: v.visitsOf(await (await import('/src/db.ts')).listAllStudies())[0].endedAt != null }; });
ok(ended.ended && !ended.hand && (await page.locator('.nv-visit').count()) === 0, '6 Do it: the visit ended, out of hand, gone from the bar');

await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/ai', 3000);
ok((await t.wide()) <= 0, `6 the phone: AI Mode nothing off the side (${await t.wide()})`);

await t.finish('Luna knows the customer and the visit: proved');
