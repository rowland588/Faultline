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
 *   6  FOUND WITHOUT KNOWING WHERE IT IS (21 November — Rowland: "Can't find archive client? Was in Set up … simple things missing"):
 *      Customers stands first on Set up, in sight on arrival with nothing opened and Archive beside each name (it was inside a shut fold
 *      at the foot of the page); the top bar's customer menu has Manage customers…, landing there with the archived open; Everything
 *      finds it by "archive", by "customer" and by "client" — and by what a person actually types, "archive client", "How do I archive
 *      a client?", "bring a customer back" (word by word, lib/findWords); what is found only by typing (People by "invite someone", the
 *      account by "sign out"); the top bar's own search finds it by "archive client" too; and Luna — who never archives or deletes a record herself (the AI's own
 *      rule) — says which customers there are (list_customers), opens the place where archiving is done (open_page), and brings one
 *      back on a card (continue_customer), a name that is no customer refused before any card
 *   7  the phone: Customers and its first Archive on the first screen, the presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/customers.mjs   (SMOKE_BASE, as smoke) */
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openAddLines } from '../lib/setup.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
/* nothing is opened on arriving at Set up: Customers is in sight there (until 21 November this story opened the "Business and clients"
   fold first, which is how a person could not find it) */

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
await page.locator('[data-customer="Branston"]').waitFor();
const rows = async (sel = '[data-customer]') => page.locator(sel).evaluateAll(els => els.map(e => e.getAttribute('data-customer') ?? e.getAttribute('data-customer-archived')));
ok(JSON.stringify(await rows()) === JSON.stringify(['Branston']) && (await page.locator('.nv-client').count()) === 0, '1 Set up: Customers lists Branston, the top bar names no client (only one)');
{
  /* IN SIGHT: first on the page, with nothing opened */
  const seen = await page.evaluate(() => {
    const top = (sel) => document.querySelector(sel)?.getBoundingClientRect().top ?? null;
    const arch = document.querySelector('[data-customer-archive="Branston"]');
    return { customers: top('[data-customers]'), firstLine: top('.fac-line'), why: top('.fac-why'), foldOpen: !!document.querySelector('[data-fold="setup-business"].is-open'), inFold: !!document.querySelector('[data-fold="setup-business"] [data-customers]'),
      archive: arch ? { shown: arch.getBoundingClientRect().height > 0, bottom: Math.round(arch.getBoundingClientRect().bottom), label: arch.getAttribute('aria-label') } : null, vh: window.innerHeight,
      heading: document.querySelector('[data-customers] h2')?.textContent };
  });
  ok(seen.heading === 'Customers' && seen.customers !== null && seen.firstLine !== null && seen.customers < seen.firstLine && seen.customers < seen.why && !seen.inFold && !seen.foldOpen,
    `1 Customers stands first on Set up — above the areas and lines, in no fold, nothing opened (${JSON.stringify({ customers: Math.round(seen.customers), firstLine: Math.round(seen.firstLine ?? -1), foldOpen: seen.foldOpen })})`);
  ok(!!seen.archive?.shown && seen.archive.bottom <= seen.vh && seen.archive.label === 'Archive Branston', `1 Archive is beside Branston, on the first screen (${JSON.stringify(seen.archive)})`);
}
await page.locator('[data-customer-add]').click();
await page.getByLabel('The customer’s name').fill('Cobb Foods');
await page.getByLabel('The customer’s site').fill('York');
await page.getByRole('button', { name: 'Add the customer' }).click(); await page.waitForTimeout(1500);
ok(JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods']) && (await t.words('.nv-client-l')) === 'Cobb Foods', `1 Cobb Foods added with no line: listed, and the bar says "${await t.words('.nv-client-l')}"`);
await t.go('#/room', 3000);
ok((await t.words('.part-head h1, .fq-hero h1')) === 'Cobb Foods' && (await page.locator('.fac-new-customer').count()) === 1 && /Add the first line or area/.test(await t.words('.fac-new-customer')) && (await page.locator(':is(.fac-card-name, .fac-achip-name)').count()) === 0,
  '1 the Lines tab: titled Cobb Foods, its empty world with the next step said, no line of Branston’s');
await t.go('#/snags', 3000);
ok((await page.locator('.qsl-what').count()) === 0, '1 Problems: none — Cobb Foods has none yet');

/* 2 — ITS FIRST LINE TAKES THE CUSTOMER */
await t.go('#/factory', 3000);
await openAddLines(page, BASE);   /* Add lines, or the app's own door when no area exists (19 November) */
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
ok((await page.locator(':is(.fac-card-name, .fac-achip-name)', { hasText: 'Cobb Packing 1' }).count()) === 1, '4 …its line back on the Lines tab');
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

/* 6 — FOUND WITHOUT KNOWING WHERE IT IS */
const cap = (name, input, confirmed) => page.evaluate(async ({ name, input, confirmed }) => (await (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now(), level: 'owner' }, { id: 'c', name, input }, { confirmed })), { name, input, confirmed });
const inView = () => page.evaluate(() => { const r = document.querySelector('[data-customers]')?.getBoundingClientRect(); return !!r && r.top >= 0 && r.top < window.innerHeight * 0.6; });
/* Luna: she says which there are, and opens the place — archiving is not hers (the AI never deletes a record or puts one away) */
const listed = await cap('list_customers', {}, false);
ok(listed.ok && listed.says === 'Customers in use: Branston — 3 lines; Cobb Foods (York) — 1 line; Dale Dairies — no lines yet. The person is in Dale Dairies. Archiving one is the person\'s to press — Set up › Customers, Archive beside its name (open_page /factory?customer=manage opens it for them); bringing one back is continue_customer.', `6 Luna’s list_customers: “${listed.says}”`);
const none = await cap('archive_customer', { client: 'Dale Dairies' }, true);
ok(!none.ok && /no capability called “archive_customer”/.test(none.why) && (await rows()).includes('Dale Dairies'), `6 Luna has no step that archives — asked, nothing is archived (“${none.why}”)`);
const opened = await cap('open_page', { href: '/factory?customer=manage' }, false);
ok(opened.ok && opened.refs?.[0]?.href === '/factory?customer=manage', '6 …she opens the place where it is done, and the press is the person’s');
/* archived by the person, on the page */
await t.go('#/factory?customer=manage', 3000);
await page.locator('[data-customer-archive="Dale Dairies"]').click(); await page.waitForTimeout(1500);
ok(JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods']), '6 Dale Dairies archived by its button');
await page.waitForTimeout(8500);   // the Undo offer passes
const noSuch = await cap('continue_customer', { client: 'Nobody Ltd' }, true);
ok(!noSuch.ok && /No customer called “Nobody Ltd” in the app, archived or not\./.test(noSuch.why) && /Yours are Branston, Cobb Foods\./.test(noSuch.why), `6 a name that is no customer is refused, naming those there are: “${noSuch.why}”`);
const unasked = await cap('continue_customer', { client: 'Dale Dairies' }, false);
ok(!unasked.ok && /waits for you to say yes/.test(unasked.why) && !(await rows()).includes('Dale Dairies'), '6 continue_customer waits for the yes — nothing brought back by asking');
/* the top bar's customer menu → Manage customers… */
await t.go('#/today', 2500);
await page.locator('.nv-client-b').click(); await page.waitForTimeout(300);
ok((await page.locator('[data-client-manage]').innerText()).startsWith('Manage customers…'), '6 the top bar’s customer menu offers Manage customers…');
await page.locator('[data-client-manage]').click(); await page.waitForTimeout(1800);
ok(/#\/factory\?customer=manage$/.test(page.url()) && await inView() && (await page.locator('[data-fold="fac-customers-archived"].is-open').count()) === 1 && (await page.locator('[data-customer-continue="Dale Dairies"]:visible').count()) === 1,
  '6 …and it lands on Set up’s Customers, in view, the archived open with Continue beside Dale Dairies');
/* Everything, by the words a person would type */
const everything = async words => {
  await t.go('#/today', 2000);
  await page.evaluate(async () => (await import('/src/colleague/environment.ts')).openEverything());
  await page.locator('[data-everything-q]').fill(words); await page.waitForTimeout(400);
  const places = await page.locator('[data-everything-place]').evaluateAll(els => els.map(e => e.getAttribute('data-everything-place')));
  return places;
};
/* a single word, and what a person actually types — matched word by word, the little words of a question left out (lib/findWords) */
for (const words of ['archive', 'customer', 'client', 'archive client', 'archive a customer', 'How do I archive a client?', 'bring a customer back']) {
  const places = await everything(words);
  ok(places.includes('customers'), `6 Everything, typing “${words}”: Customers is offered (${places.join(', ') || 'nothing'})`);
  if (words === 'archive client') {
    await page.locator('[data-everything-place="customers"]').click(); await page.waitForTimeout(1800);
    ok(/#\/factory\?customer=manage$/.test(page.url()) && await inView(), '6 …and opening it lands on Set up’s Customers, in view');
  } else await page.keyboard.press('Escape');
}
/* what is only found by typing: the people of the business, and the account — which is a sheet, not a page */
{
  const people = await everything('invite someone');
  ok(people.includes('people'), `6 Everything, typing “invite someone”: People is offered (${people.join(', ') || 'nothing'})`);
  await page.keyboard.press('Escape');
  const account = await everything('sign out');
  ok(JSON.stringify(account) === JSON.stringify(['account']), `6 Everything, typing “sign out”: Your account is offered (${account.join(', ') || 'nothing'})`);
  await page.locator('[data-everything-place="account"]').click(); await page.waitForTimeout(700);
  /* with no sign-in on this device the Account button is not there to open — the offer is what is proved; where it is, the sheet opens */
  const sheet = await page.locator('.sheet-title, [role="dialog"] h2', { hasText: /^Account$/ }).count();
  ok((await page.locator('[data-everything]').count()) === 0, `6 …and opening it closes Everything${sheet ? ' and opens the Account sheet' : ''}`);
  await page.keyboard.press('Escape');
}
/* the other search, in the top bar */
await t.go('#/today', 2000);
await page.locator('.nv-jump').click(); await page.waitForTimeout(400);
await page.locator('.jt-in').fill('archive client'); await page.waitForTimeout(500);
const jump = await page.locator('.jt-row').allInnerTexts();
ok(jump.some(x => /Customers — add, archive or continue a client/.test(x)), `6 the top bar’s search, typing “archive client”: ${jump[0]?.replace(/\s+/g, ' ') ?? 'nothing'}`);
await page.locator('.jt-row', { hasText: 'Customers — add, archive or continue a client' }).first().click(); await page.waitForTimeout(1800);
ok(/#\/factory\?customer=manage$/.test(page.url()) && await inView(), '6 …and it lands on Set up’s Customers, in view');
/* …and back, by Luna */
const back = await cap('continue_customer', { client: 'Dale Dairies' }, true);
await page.waitForTimeout(1200);
await t.go('#/factory', 3000);
ok(back.ok && /Dale Dairies is continued/.test(back.says) && JSON.stringify(await rows()) === JSON.stringify(['Branston', 'Cobb Foods', 'Dale Dairies']) && (await t.words('.nv-client-l')) === 'Dale Dairies', `6 continue_customer brings it back, the one you are in: “${back.says}”`);
const notAway = await cap('continue_customer', { client: 'Branston' }, true);
ok(!notAway.ok && /not archived/.test(notAway.why), '6 …and one in use is said to be in use, not continued');

/* 7 — THE PHONE */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/factory', 3000);
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);   /* the page as it opens, not as the manage link left it */
const presses = await page.locator('.fac-customer .btn-sm').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
const firstArchive = await page.locator('[data-customer-archive]').first().evaluate(e => Math.round(e.getBoundingClientRect().bottom));
ok(presses.length === 3 && presses.every(h => h >= 44) && (await t.wide()) <= 1, `7 the phone: Archive presses ${presses.join(', ')} px, nothing off the side`);
ok(firstArchive > 0 && firstArchive <= 844 - 70, `7 the phone: Customers and its first Archive are on the first screen (its foot at ${firstArchive} px of 844)`);

await t.finish('Customers accepted: one added by name with no line and made the client you are in, its first line aligned to it, archived out of every list and Luna’s reach with its records untouched, continued exactly as it was, Undo, another added, kept after a reload; found without knowing where it is — first on Set up, from the top bar, from Everything by “archive”, “customer” or “client”, and by asking Luna on a card; and on the phone.');
/* since 14 November an area is a card on the front page and its lines are chips on it (lib/areas areaCard) — a line's name is read
   from its row where the factory names no area, from its chip where it does */
