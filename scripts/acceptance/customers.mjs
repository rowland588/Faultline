/* ACCEPTANCE — CUSTOMERS: ADDED, ARCHIVED AND CONTINUED (11 November, docs/CONSULTANT-WORKSPACE.md C2a; lib/customers, ui/CustomersPanel —
 * Rowland: "I should input a customer, everything under that customer is aligned to it. And I need to archive the customer .. but I
 * need ability to continue it when required. Then add another customer etc."). Driven in a real browser on the smoke seed:
 *
 *   1  every line Branston; Set up's Customers lists Branston; ＋ Add a customer (Cobb Foods, York) with no line — made the client you
 *      are in at once, the top bar saying it, the Lines tab its empty world with the next step said, Problems empty
 *   2  its first line added on Set up takes the customer (Cobb Foods, York) by itself; a problem and a project on it
 *   3  Archive Cobb Foods (confirmed): gone from the top bar, Set up, the Lines tab, Problems, Projects, Today, search and Luna's resolve;
 *      its line, problem and project still in the database exactly as they were
 *   4  Archived › Continue: back exactly as before and made the client you are in; archived again and Undo brings it straight back
 *   5  another customer added (Dale Dairies) from the top bar's ＋ A new customer…; kept after a reload
 *   6  the phone: the Customers panel's presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/customers.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
page.on('dialog', d => void d.accept());
await t.seed();
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});
await page.reload(); await page.waitForTimeout(1500);

/* 1 — A CUSTOMER WITH NO LINE */
await t.go('#/factory', 3000);
const rows = async (sel = '[data-customer]') => page.locator(sel).evaluateAll(els => els.map(e => e.getAttribute('data-customer') ?? e.getAttribute('data-customer-archived')));
ok(JSON.stringify(await rows()) === JSON.stringify(['Branston']) && (await page.locator('.nv-client').count()) === 0, '1 Set up: Customers lists Branston, the top bar names no client (only one)');
await page.locator('[data-customer-add]').click();
await page.getByLabel('The customer’s name').fill('Cobb Foods');
await page.getByLabel('The customer’s site').fill('York');
await page.getByRole('button', { name: 'Add the customer' }).click(); await page.waitForTimeout(1500);
ok(JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods']) && (await t.words('.nv-client-l')) === 'Cobb Foods', `1 Cobb Foods added with no line: listed, and the bar says "${await t.words('.nv-client-l')}"`);
await t.go('#/room', 3000);
ok((await t.words('.part-head h1')) === 'Cobb Foods' && (await page.locator('.fac-new-customer').count()) === 1 && /Add the first line or area/.test(await t.words('.fac-new-customer')) && (await page.locator('.fac-card-name').count()) === 0,
  '1 the Lines tab: titled Cobb Foods, its empty world with the next step said, no line of Branston’s');
await t.go('#/snags', 3000);
ok((await page.locator('.qsl-what').count()) === 0, '1 Problems: none — Cobb Foods has none yet');

/* 2 — ITS FIRST LINE TAKES THE CUSTOMER */
await t.go('#/factory', 3000);
await page.getByRole('button', { name: 'Add lines' }).first().click(); await page.waitForTimeout(300);
await page.getByLabel("The new line's name").fill('Cobb Packing 1');
await page.getByRole('button', { name: 'Add line' }).click(); await page.waitForTimeout(1500);
const cobb = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const w = (await db.listWorkspaces()).find(x => x.name === 'Cobb Packing 1');
  const t0 = Date.now();
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: w.id, problem: 'COBB-ONLY film jams at the sealer', status: 'open', priority: 'high', owner: 'Ann', raisedAt: t0, updatedAt: t0 });
  const p = await db.createProject('COBB-ONLY sealer project', '#2563eb', 'Ann', undefined, 'board', 'pdca');
  await db.addPaceLine({ projectId: p.id, workspaceId: w.id, key: 'C1', name: 'Cobb Packing 1', sort: 0 });
  return { id: w.id, client: w.clientName, site: w.siteName, project: p.id };
});
ok(cobb.client === 'Cobb Foods' && cobb.site === 'York', `2 its first line takes the customer by itself: ${cobb.client}, ${cobb.site}`);
const listedBefore = await page.locator('.fac-line').evaluateAll(els => els.map(e => e.getAttribute('data-line')));
ok(listedBefore.includes('Cobb Packing 1'), '2 Set up lists Cobb Packing 1');
const before = await page.evaluate(async id => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(id); return JSON.stringify({ name: w.name, client: w.clientName, site: w.siteName, archived: !!w.archived }); }, cobb.id);

/* 3 — ARCHIVE */
const resolveSays = () => page.evaluate(async () => (await (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now(), level: 'owner' }, { id: 'r', name: 'resolve', input: { words: 'Cobb Packing 1' } }, { confirmed: false })));
const r0 = await resolveSays();
ok(JSON.stringify(r0).includes('Cobb Packing 1') && JSON.stringify(r0.refs ?? []).includes(cobb.id), '3 before archiving, Luna’s resolve finds Cobb Packing 1');
await t.go('#/factory', 3000);
await page.locator('[data-customer-archive="Cobb Foods"]').click(); await page.waitForTimeout(1500);
/* the lines Set up lists (each a name box) — "Added Cobb Packing 1." under the add form is what was just done, not a line listed */
const setUpLines = await page.locator('.fac-line').evaluateAll(els => els.map(e => e.getAttribute('data-line')));
const afterArchive = { rows: await rows(), bar: await page.locator('.nv-client').count(), cobbInSetUp: setUpLines.includes('Cobb Packing 1') };
ok(JSON.stringify(afterArchive.rows) === JSON.stringify(['Branston']) && afterArchive.bar === 0 && !afterArchive.cobbInSetUp,
  `3 archived: gone from Customers, the top bar and Set up’s lines (${JSON.stringify(afterArchive)})`);
await page.waitForTimeout(8500);   // the Undo offer passes
const body = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const nowhere = {};
for (const h of ['#/room', '#/snags', '#/projects', '#/today', '#/actions']) { await t.go(h, 3000); nowhere[h] = !(await body()).includes('COBB-ONLY') && !(await body()).includes('Cobb Packing 1'); }
ok(Object.values(nowhere).every(Boolean), `3 nothing of Cobb Foods on ${Object.entries(nowhere).map(([h, v]) => `${h} ${v ? 'none' : 'SHOWN'}`).join(', ')}`);
await page.locator('.nv-jump').click(); await page.waitForTimeout(400);
await page.locator('.jt-in').fill('Cobb'); await page.waitForTimeout(500);
const hits = (await page.locator('.jt-row').allInnerTexts()).join(' | ');
await page.keyboard.press('Escape');
ok(!hits.includes('Cobb Packing') && !hits.includes('COBB-ONLY'), '3 search "Cobb": nothing of the archived customer');
const r1 = await resolveSays();
ok(!JSON.stringify(r1.refs ?? []).includes(cobb.id), '3 Luna’s resolve no longer offers Cobb Packing 1');
const after = await page.evaluate(async ({ id, pid }) => {
  const db = await import('/src/db.ts');
  const w = await db.getWorkspace(id);
  const snag = (await db.listAllSnags()).find(s => s.problem.startsWith('COBB-ONLY'));
  const p = (await db.allProjects()).find(x => x.id === pid);
  return { line: JSON.stringify({ name: w.name, client: w.clientName, site: w.siteName, archived: !!w.archived }), snag: snag && !snag.deletedAt && !snag.archivedAt && snag.status === 'open', project: !!p && !p.archivedAt && !p.deletedAt };
}, { id: cobb.id, pid: cobb.project });
ok(after.line === before && after.snag && after.project, '3 its line, problem and project are still in the database exactly as they were — nothing archived one by one, nothing deleted');

/* 4 — CONTINUE, AND UNDO */
await t.go('#/factory', 3000);
const fold = page.locator('[data-fold="fac-customers-archived"] .fold-toggle');
if ((await fold.getAttribute('aria-expanded')) !== 'true') await fold.click();
await page.waitForTimeout(300);
ok((await rows('[data-customer-archived]')).includes('Cobb Foods'), '4 Cobb Foods under Archived');
await page.locator('[data-customer-continue="Cobb Foods"]').click(); await page.waitForTimeout(1500);
ok((await t.words('.nv-client-l')) === 'Cobb Foods' && JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods']), '4 Continue: Cobb Foods back and the client you are in');
await t.go('#/snags', 3000);
ok((await page.locator('.qsl-what', { hasText: 'COBB-ONLY' }).count()) === 1 && (await page.locator('.qsl-what').count()) === 1, '4 …its problem back exactly, nothing of Branston’s mixed in');
await t.go('#/room', 3000);
ok((await page.locator('.fac-card-name', { hasText: 'Cobb Packing 1' }).count()) === 1, '4 …its line back on the Lines tab');
await t.go('#/factory', 3000);
await page.locator('[data-customer-archive="Cobb Foods"]').click(); await page.waitForTimeout(1200);
ok((await page.locator('.nv-client').count()) === 0, '4 archived again');
await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1800);
ok((await t.words('.nv-client-l')) === 'Cobb Foods' && JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods']), '4 Undo: Cobb Foods straight back, the client you are in');

/* 5 — ANOTHER CUSTOMER, FROM THE TOP BAR */
await t.go('#/today', 2500);
await page.locator('.nv-client-b').click(); await page.waitForTimeout(300);
await page.locator('.nv-client-new').click(); await page.waitForTimeout(2000);
await page.getByLabel('The customer’s name').fill('Dale Dairies');
await page.getByRole('button', { name: 'Add the customer' }).click(); await page.waitForTimeout(1500);
ok((await t.words('.nv-client-l')) === 'Dale Dairies' && JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods', 'Dale Dairies']), '5 Dale Dairies added from ＋ A new customer…, the client you are in');
await page.reload(); await page.waitForTimeout(3000);
ok((await t.words('.nv-client-l')) === 'Dale Dairies' && JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods', 'Dale Dairies']), '5 kept after a reload');

/* 6 — THE PHONE */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/factory', 3000);
const presses = await page.locator('.fac-customer .btn-sm').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(presses.length === 3 && presses.every(h => h >= 44) && (await t.wide()) <= 1, `6 the phone: Archive presses ${presses.join(', ')} px, nothing off the side`);

await t.finish('Customers accepted: one added by name with no line and made the client you are in, its first line aligned to it, archived out of every list and Luna’s reach with its records untouched, continued exactly as it was, Undo, another added, kept after a reload and on the phone.');
