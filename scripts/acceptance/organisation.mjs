/* ACCEPTANCE — THE BUSINESS AND ITS PEOPLE (11 November, docs/ORGANISATION.md O1–O3; src/org, ui/BusinessPanel,
 * screens/BusinessPeopleScreen; supabase/ORGANISATIONS.sql, ORG_PEOPLE.sql, ORG_VISIBILITY.sql — Rowland: "Manufacturing businesses
 * themselves will subscribe to Luna … Each should be able to interact with Luna according to their role, responsibilities and
 * permissions … A team leader must not automatically have access to everything a managing director can see"). Driven in a real browser
 * on the smoke seed, signed in, the cloud aborted (the database's own rules are proved by supabase/tests/org_visibility_test.sql):
 *
 *   1  Set up opens with Your business first — named from the lines' client (Acme Foods), you its administrator, People one tap away
 *   2  the business named over (Acme Foods Ltd) — kept after a reload, the business a record on the device, the lines in it
 *   3  People (#/business): the header, the sentence, Invite someone; an address that is not one refused in words
 *   4  invites with roles and scope — a leader for the whole business, a team leader in Packing only (the area chip), a viewer — each a
 *      row saying its role and scope, the sentence counting them; the same address twice refused; the row's synced shape
 *      (MAPS.organisation_members.toRow) carrying org, email, role and areas
 *   5  a role changed where it sits (team → manager), kept after a reload
 *   6  removed with Undo — gone from the list, back with Undo, kept
 *   7  a new line made now takes the business's id
 *   8  a viewer (faultline.access.force = 'viewer'): People with no Invite, no role picker, no Remove and the read-only sentence; Set up's
 *      business name not a box; a project's page saying "You can read this project and take its reports"
 *   9  the phone (390): nothing off the side, every press on People a thumb's height
 *
 *   node scripts/acceptance/organisation.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1360, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const settle = ms => page.waitForTimeout(ms);
const ME = 'acceptance@example.com';

/* the seed's lines: Acme Foods's, at Hull, in two areas */
const lines = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const ls = await liveProductionLines(await db.listWorkspaces());
  for (const [i, w] of ls.entries()) await db.patchWorkspaceRecord(w.id, { clientName: 'Acme Foods', siteName: 'Hull', areaName: i % 2 ? 'Dispatch' : 'Packing' });
  return ls.map(w => ({ id: w.id, name: w.name }));
});
ok(lines.length >= 2, `0 the seed's ${lines.length} lines are Acme Foods's at Hull, in Packing and Dispatch`);

/* ---- 1 · Set up: Your business ---- */
await t.go('#/factory', 2500);
{
  const first = await page.locator('[data-business], [data-customers]').first().getAttribute('data-business');
  const name = await page.locator('[data-business-name]').inputValue().catch(() => '');
  const says = await t.words('[data-business] .sub');
  ok(first !== null && name === 'Acme Foods' && /You are its administrator/.test(says),
    `1 Set up: Your business before Customers, named "${name}" from the lines, "${says}"`);
}

/* ---- 2 · named over ---- */
await page.locator('[data-business-name]').fill('Acme Foods Ltd');
await page.locator('[data-business-name]').press('Enter'); await settle(800);
await page.reload(); await settle(2500);
{
  const name = await page.locator('[data-business-name]').inputValue().catch(() => '');
  const rec = await page.evaluate(async () => {
    const o = await import('/src/org/orgStore.ts');
    const orgs = await o.listOrganisations();
    const ws = await (await import('/src/db.ts')).listWorkspaces();
    return { orgs: orgs.map(x => ({ id: x.id, name: x.name })), inIt: ws.filter(w => w.orgId === orgs[0]?.id).length, all: ws.length };
  });
  ok(name === 'Acme Foods Ltd' && rec.orgs.length === 1 && rec.orgs[0].name === 'Acme Foods Ltd' && rec.orgs[0].id === '11111111-1111-1111-1111-111111111111' && rec.inIt === rec.all,
    `2 renamed and kept after a reload — one business, its id the person's own, ${rec.inIt} of ${rec.all} lines in it`);
}

/* ---- 3 · People ---- */
await page.locator('[data-business-people]').click(); await settle(1500);
{
  const url = page.url();
  const title = await t.words('[data-people] .part-head h1');
  const crumb = await t.words('.nv-crumb.nv-page');
  const says = await t.words('[data-people-says]');
  ok(/#\/business/.test(url) && title === 'People' && /People/.test(crumb) && /1 person · 1 administrator/.test(says),
    `3 People at #/business — "${title}", the bar "${crumb}", "${says}"`);
}
const invite = async (email, role, areas = []) => {
  await page.getByRole('button', { name: 'Invite someone' }).click(); await settle(300);
  await page.getByLabel('Their email').fill(email);
  await page.locator(`[data-role="${role}"]`).click();
  for (const a of areas) await page.locator(`[data-scope-area="${a}"]`).click();
  await page.getByRole('button', { name: 'Send the invite' }).click(); await settle(700);
};
await invite('not-an-address', 'team');
ok(/doesn’t look like an email/.test(await t.words('[data-people-why]')), '3 an address that is not one refused in words');
await page.getByRole('button', { name: 'Cancel' }).click(); await settle(300);

/* ---- 4 · invites with roles and scope ---- */
await invite('md@acme.example', 'leader');
await invite('tl.packing@acme.example', 'team', ['Packing']);
await invite('auditor@acme.example', 'viewer');
{
  const row = async e => ({ role: await t.words(`[data-person="${e}"] [data-person-role]`), scope: await t.words(`[data-person="${e}"] [data-person-scope]`) });
  const md = await row('md@acme.example'), tl = await row('tl.packing@acme.example'), au = await row('auditor@acme.example');
  const says = await t.words('[data-people-says]');
  ok(md.role === 'Leader' && md.scope === 'All of the business' && tl.role === 'Team' && tl.scope === 'Packing' && au.role === 'Viewer',
    `4 three invited — Leader · ${md.scope}; Team · ${tl.scope}; Viewer · ${au.scope}`);
  ok(says === '4 people · 1 administrator · 1 with a scope', `4 the sentence counts them: "${says}"`);
  const wire = await page.evaluate(async () => {
    const { MAPS } = await import('/src/cloud/mappers.ts');
    const { listOrgMembers } = await import('/src/org/orgStore.ts');
    const m = (await listOrgMembers()).find(x => x.email === 'tl.packing@acme.example');
    return m ? MAPS.organisation_members.toRow(m, 'x') : null;
  });
  ok(!!wire && wire.id === `11111111-1111-1111-1111-111111111111:tl.packing@acme.example` && wire.role === 'team' && JSON.stringify(wire.areas) === '["Packing"]' && JSON.stringify(wire.sites) === '[]',
    `4 the synced row: ${JSON.stringify(wire && { id: wire.id, role: wire.role, areas: wire.areas })}`);
}
await invite('MD@acme.example', 'team');
ok(/already one of the people/.test(await t.words('[data-people-why]')), '4 the same address twice refused');
await page.getByRole('button', { name: 'Cancel' }).click(); await settle(300);

/* ---- 5 · a role changed ---- */
await page.locator('[data-person="tl.packing@acme.example"] [data-person-role-pick]').selectOption('manager'); await settle(700);
await page.reload(); await settle(2200);
ok(await t.words('[data-person="tl.packing@acme.example"] [data-person-role]') === 'Manager', '5 team → manager where it sits, kept after a reload');
ok(await page.locator(`[data-person="${ME}"] [data-person-role-pick]`).count() === 0, '5 my own role is not offered to change');

/* ---- 6 · removed with Undo ---- */
await page.locator('[data-person="auditor@acme.example"] [data-person-remove]').click(); await settle(600);
const gone = await page.locator('[data-person="auditor@acme.example"]').count();
await page.getByRole('button', { name: /^Undo/ }).first().click(); await settle(900);
const back = await page.locator('[data-person="auditor@acme.example"]').count();
await page.reload(); await settle(2200);
ok(gone === 0 && back === 1 && await page.locator('[data-person="auditor@acme.example"]').count() === 1, `6 removed (${gone} left), back with Undo (${back}), kept after a reload`);

/* ---- 7 · a new line is the business's ---- */
{
  const org = await page.evaluate(async () => {
    const { addLineToFactory } = await import('/src/lib/lines.ts');
    const w = await addLineToFactory('Line 99', 'Packing');
    return (await (await import('/src/db.ts')).getWorkspace(w.id))?.orgId;
  });
  ok(org === '11111111-1111-1111-1111-111111111111', `7 a line made now takes the business (${org})`);
}

/* ---- 8 · a viewer ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'viewer'));
await t.go('#/business', 300); await page.reload(); await settle(2200);
{
  const invites = await page.getByRole('button', { name: 'Invite someone' }).count();
  const picks = await page.locator('[data-person-role-pick], [data-person-remove], [data-person-scope-edit]').count();
  const ro = await t.words('[data-people-readonly]');
  ok(invites === 0 && picks === 0 && /Only the business’s administrator/.test(ro), `8 a viewer on People: no invite, ${picks} controls, "${ro}"`);
}
await t.go('#/factory', 2200);
ok(await page.locator('input[data-business-name]').count() === 0 && (await t.words('[data-business-name]')) === 'Acme Foods Ltd', '8 a viewer reads the business’s name, no box');
await t.go(`#/project/${sd.projectId}`, 2500);
ok(/You can read this project and take its reports/.test(await t.words('.access-note')), `8 a viewer on a project: "${await t.words('.access-note')}"`);
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 9 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/business', 2200);
await page.getByRole('button', { name: 'Invite someone' }).click(); await settle(400);
{
  const wide = await t.wide();
  const small = await page.locator('[data-people] .ppl-acts .btn, [data-people] .ppl-role-pick, [data-people] .ppl-role, [data-people] .ppl-chips .chip, [data-people] .ppl-invite-go .btn')
    .evaluateAll(els => els.filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 43).length);
  ok(wide <= 1 && small === 0, `9 the phone: nothing off the side (${wide}px), presses under 44 px: ${small}`);
}

await t.finish('The business is named, its people invited with a role and a scope, changed and removed with Undo, and a viewer offered nothing to write.');
