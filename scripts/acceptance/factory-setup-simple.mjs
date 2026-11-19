/* Factory setup keeps Area → Line → Machine in one place, including on a phone. */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go } = t;
await t.seed();

await go('#/room');
await page.locator('[data-dept-add]').getByRole('button', { name: 'Add area in Set up' }).click();
await page.getByRole('form', { name: 'Add area' }).waitFor();
ok(page.url().includes('#/factory?add=area'), 'Factory sends area creation to Set up');
await page.getByLabel('New area name').fill('Assembly audit area');
await page.getByLabel('New area site').fill('Hull');
await page.getByRole('form', { name: 'Add area' }).getByRole('button', { name: 'Add area' }).click();
await page.getByRole('form', { name: 'Add lines' }).waitFor();
ok((await page.getByLabel('Area for the new line').inputValue()) !== '', 'new area is selected for the next line');

await page.getByLabel("The new line's name").fill('Assembly audit line');
await page.getByRole('form', { name: 'Add lines' }).getByRole('button', { name: 'Add line' }).click();
await page.locator('[data-setup-area="Hull › Assembly audit area"] [data-line="Assembly audit line"]').waitFor();
const line = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.name === 'Assembly audit line'));
ok(line?.areaName === 'Assembly audit area' && line?.siteName === 'Hull', 'new line is saved directly beneath its chosen area');

await page.locator('[data-line="Assembly audit line"]').getByRole('button', { name: 'Edit line' }).click();
await page.getByRole('textbox', { name: 'New machine on Assembly audit line', exact: true }).fill('Case packer');
await page.getByRole('form', { name: 'Add a machine to Assembly audit line' }).getByRole('button', { name: 'Add machine' }).click();
await page.locator('[data-line="Assembly audit line"] [data-machine="Case packer"]').waitFor();
const saved = await page.evaluate(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.assets, line.id);
ok(saved?.includes('Case packer'), 'machine is saved from the line editor inside Factory Set up');

await page.getByRole('form', { name: 'Add lines' }).getByRole('button', { name: 'Done' }).click();
await page.evaluate(() => { location.hash = '#/factory'; });
await page.evaluate(() => { location.hash = '#/factory?add=area'; });
await page.getByRole('form', { name: 'Add area' }).waitFor();
ok(true, 'Add area deep link opens its form while Factory Set up is already mounted');

await page.setViewportSize({ width: 360, height: 800 });
ok(await t.wide() <= 1, 'Factory Set up has no sideways overflow on a 360px phone');
await page.locator('[data-line="Assembly audit line"] .fac-line-name').click();
ok(page.url().includes(`/lines/${line.id}`), 'line name opens its working page from Set up');
ok(await t.wide() <= 1, 'the line page fits the 360px phone');

await t.finish('Factory setup accepted: area, line and machine created in order and reachable on a phone.');
