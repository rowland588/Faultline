/* ACCEPTANCE — LUNA GOVERNS CUSTOMERS (23 November — Rowland: archive and start a business by voice or chat, confirm cards, never delete).
 * The assist gateway is played by the script; capabilities run for real when the person confirms.
 *
 *   1  "Luna, archive Branston" — archive_customer as ONE card; nothing archived while it waits
 *   2  Do it — Branston put away; list_customers shows it archived, not in use
 *   3  "Start a new business called Meridian Foods" — start_visit as ONE card for the new name
 *   4  the card names Meridian Foods; nothing made while it waits
 *
 *   node scripts/acceptance/luna-customer-governance.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});
await page.reload(); await page.waitForTimeout(1500);

const CORS = { 'access-control-allow-origin': '*' };
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: false, why: 'nothing planned' }) });
});
const answered = async (n, ms = 12000) => {
  for (const until = Date.now() + ms; plan.length && Date.now() < until;) await page.waitForTimeout(100);
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const cap = (name, input, confirmed) => page.evaluate(async ({ name, input, confirmed }) => (await (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now(), level: 'owner' }, { id: 'c', name, input }, { confirmed })), { name, input, confirmed });
const rows = async () => page.locator('[data-customer]').evaluateAll(els => els.map(e => e.getAttribute('data-customer')));

/* 1 — ARCHIVE BY NAME, ONE CARD */
await t.go('#/ai', 3000);
plan = [
  () => ({ ok: true, reply: 'Shall I put Branston away?', calls: [{ id: 'a1', name: 'archive_customer', input: { client: 'Branston' } }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.ok ? 'Branston is put away — everything kept. Where are we going next?' : 'Not archived.' }),
];
await send('Luna, archive Branston');
await page.waitForSelector('[data-card="archive_customer"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const ac = page.locator('[data-card="archive_customer"]').last();
const acWords = (await ac.count()) ? (await ac.innerText()).replace(/\s+/g, ' ') : '';
ok(/Archive Branston:/.test(acWords) && /nothing is deleted/.test(acWords), `1 archive_customer card for Branston ("${acWords.slice(0, 140)}")`);
const stillLive = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { customersOf } = await import('/src/lib/customers.ts');
  return customersOf(await db.listWorkspaces(), await db.listAllStudies()).some(c => c.name === 'Branston' && !c.archived);
});
ok(stillLive, '1 nothing archived while the card waits');

/* 2 — DO IT */
await ac.getByRole('button', { name: 'Do it' }).click();
await answered(1);
const listed = await cap('list_customers', {}, false);
ok(listed.ok && /Archived — kept exactly as they were/.test(listed.says) && /Branston/.test(listed.says) && !/Customers in use:.*Branston/.test(listed.says), `2 Branston archived in list_customers: "${listed.says.slice(0, 120)}…"`);
await t.go('#/factory', 2500);
ok(!(await rows()).includes('Branston'), '2 Branston gone from Set up’s live customers');

/* 3 — START A NEW BUSINESS */
plan = [
  () => ({ ok: true, reply: 'I can start Meridian Foods for you.', calls: [{ id: 's1', name: 'start_visit', input: { client: 'Meridian Foods' } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Ready when you are.' }),
];
await t.go('#/ai', 2000);
await send('Start a new business called Meridian Foods');
await page.waitForSelector('[data-card="start_visit"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const sc = page.locator('[data-card="start_visit"]').last();
const scWords = (await sc.count()) ? (await sc.innerText()).replace(/\s+/g, ' ') : '';
ok(/Add Meridian Foods as a new customer/.test(scWords) || /Meridian Foods/.test(scWords), `3 start_visit card for Meridian Foods ("${scWords.slice(0, 140)}")`);
const none = await page.evaluate(async () => (await import('/src/lib/visits.ts')).visitsOf(await (await import('/src/db.ts')).listAllStudies()).some(v => v.client === 'Meridian Foods'));
ok(!none, '3 nothing made while the card waits');

await t.finish('Luna customer governance: archive Branston on a confirm card then list_customers shows it archived; start a new business proposes start_visit for the name — nothing made until confirmed.');