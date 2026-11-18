/* Personal-use workflow: explicit setup save, concurrent-field preservation, repeated tool uses, direct access, all devices. */
import { mkdirSync } from 'node:fs';
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp({ width: 390, height: 844 });
const { page: p, ok } = t;
await t.go('#/room');
const id = await p.evaluate(async () => {
  const { addLineToFactory } = await import('/src/lib/lines.ts');
  return (await addLineToFactory('Redesign line', 'Packing')).id;
});
await t.go(`#/lines/${id}?view=setup`);
const form = p.getByRole('form', { name: 'Details for Redesign line' });
await form.getByLabel("The line's name", { exact: true }).fill('Packing 2A');
await form.getByLabel("The line's client", { exact: true }).fill('Personal consultancy');
await form.getByLabel("The line's site", { exact: true }).fill('Hull');
await form.getByLabel("The line's area", { exact: true }).fill('Packing hall');
await p.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchWorkspaceRecord(id, { crew: 7, labourRatePerHour: 19.5 }); }, id);
await form.getByRole('button', { name: 'Save changes', exact: true }).click();
await p.getByRole('heading', { name: 'Packing 2A', exact: true }).waitFor();
await p.reload(); await p.locator('.line-details-form').waitFor();
const saved = await p.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), id);
ok(saved.name === 'Packing 2A' && saved.clientName === 'Personal consultancy' && saved.siteName === 'Hull' && saved.areaName === 'Packing hall', 'all setup fields persist after one explicit save and reload');
ok(saved.crew === 7 && saved.labourRatePerHour === 19.5, 'saving details preserves a concurrent change to cost inputs');
await t.go('#/factory');
const row = p.locator('.fac-line[data-line="Packing 2A"]');
ok(await row.getByRole('button',{name:'Edit line'}).count()===1 && await p.locator('.fac-line input[aria-label="The line\'s name"]').count() === 0, 'setup starts with compact line rows and an explicit editor');
await row.getByRole('button',{name:'Edit line'}).click();
await row.locator('.line-optional-details > summary').click();
await row.getByLabel("The line's type", { exact: true }).fill('Bagging');
await row.getByRole('button', { name: 'Save changes', exact: true }).click();
await p.waitForFunction(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.lineType === 'Bagging', id);
ok((await p.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), id)).lineType === 'Bagging', 'the same details editor saves from factory setup');
ok(await p.locator('[data-fold="setup-business"].is-open').count() === 0, 'optional business administration is secondary');

await t.go(`#/lines/${id}?view=setup`);

const setup = p.locator('.ws-setup');
await setup.locator('#study-setup-shifts').waitFor();
ok(await setup.locator('.line-settings-section').count() === 3 && await setup.locator('.shift-row').count() === 0, 'the core setup sections open directly on the page');

await setup.locator('input[placeholder="e.g. Days / Backs / Nights…"]').fill('Days');
await setup.getByRole('button', { name: 'Add shift', exact: true }).click();
await setup.getByLabel('Starts', { exact: true }).fill('06:00');
await setup.getByLabel('Ends', { exact: true }).fill('14:00');
await setup.getByLabel('Days breaks, minutes', { exact: true }).fill('30');
await setup.getByLabel('Days breaks, minutes', { exact: true }).press('Tab');
await setup.getByLabel('Days breaks, minutes', { exact: true }).blur();
await p.reload(); await p.locator('.line-details-form').waitFor();
const shifts = await p.evaluate(async id => (await (await import('/src/db.ts')).getWorkspace(id)).shifts, id);
ok(shifts.some(s => s.name === 'Days' && s.start === '06:00' && s.end === '14:00' && s.breakMin === 30), 'shift times and breaks save together and survive reload');

const use = async (name, machine) => {
  await t.go(`#/lines/${id}?view=tools`);
  await p.getByRole('button', { name: 'Start a tool', exact: true }).click();
  await p.getByRole('searchbox', { name: 'Find a tool to start' }).fill('capability');
  await p.getByRole('dialog').getByRole('button', { name: /^Capability/ }).click();
  const dialog = p.getByRole('dialog');
  await dialog.locator('form input').nth(0).fill(name);
  await dialog.locator('form input').nth(1).fill(machine);
  await dialog.getByRole('button', { name: 'Start it', exact: true }).click();
  await p.waitForURL(/#\/capability\/[^?]+/);
  return p.url().split('#')[1];
};
const first = await use('Fill weight morning', 'Filler');
const second = await use('Seal weight afternoon', 'Sealer');
ok(first !== second, 'using the same tool twice creates two distinct saved records');
await t.go(`#/lines/${id}?view=tools`);
ok(await p.locator('[data-line-uses] [data-use]').count() === 2, 'both uses appear independently on the line');
for (const [name, machine, href] of [['Fill weight morning', 'Filler', first], ['Seal weight afternoon', 'Sealer', second]]) {
  const link = p.locator('.line-use-open').filter({ hasText: name });
  ok((await link.innerText()).includes(machine) && await link.getAttribute('href') === `#${href}`, `${name} shows its machine and opens its own record`);
}
await p.getByRole('searchbox', { name: 'Find a saved use' }).fill('Filler');
ok(await p.locator('[data-line-uses] [data-use]').count() === 1, 'machine search finds the intended use');
await p.locator('.line-use-open').click();
ok(p.url().endsWith(`#${first}`), 'one press opens the selected saved use directly');
const third = await use('Fill weight evening', 'Filler');
ok(![first, second].includes(third), 'using a tool again keeps the earlier uses');
const shots = process.env.UI_REVIEW_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
for (const width of [360, 820, 1440]) {
  await p.setViewportSize({ width, height: 1000 });
  for (const view of ['overview', 'tools', 'setup']) {
    await t.go(`#/lines/${id}?view=${view}`);
    ok(await t.wide() <= 1, `${view} fits ${width}px`);
    if (shots) await p.screenshot({ path: `${shots}/line-${view}-${width}.png`, fullPage: true });
  }
  await t.go('#/factory');
  ok(await t.wide() <= 1, `factory setup fits ${width}px`);
  if (shots) await p.screenshot({ path: `${shots}/factory-setup-${width}.png`, fullPage: true });
}
await t.go('#/factory');
const business = p.locator('[data-fold="setup-business"]');
if (await business.evaluate(el => el.classList.contains('is-open'))) await business.locator(':scope > .fold-h > .fold-toggle').click();
await t.go('#/factory?customer=new');
await p.getByLabel('The customer’s name', { exact: true }).waitFor({ state: 'visible' });
ok(await p.getByLabel('The customer’s name', { exact: true }).isEditable(), 'new customer entry opens its form even when Business and clients was closed');
await t.finish('Accepted: setup saves safely and every tool use stays findable across devices');
