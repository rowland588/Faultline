/* Two lines at one client's site get separate recovery projects and reports,
 * while the existing Factory control room sees both. */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const place = await page.evaluate(async () => {
  await (await import('/src/dev/seed.ts')).seedAreasForTest();
  const db = await import('/src/db.ts');
  const lines = await db.listWorkspaces();
  const first = lines.find(w => w.name === 'Line 7');
  const second = lines.find(w => w.name === 'Line 2A — capacity');
  const other = lines.find(w => w.name === 'Line 7 — smoke test');
  if (!first || !second || !other) throw new Error('Site fixture lines missing');
  await db.updateWorkspace({ ...first, clientName: 'Acme' });
  await db.updateWorkspace({ ...second, clientName: 'Acme' });
  await db.updateWorkspace({ ...other, clientName: 'Beta' });
  (await import('/src/lib/activeClient.ts')).setActiveClient('Acme');
  return { first: first.id, second: second.id, other: other.id };
});

await t.go('#/projects', 850);
await page.getByRole('button', { name: 'Start line recovery' }).click();
await page.locator('.proj-new input[placeholder]').first().fill('Hull Line 7 recovery');
ok(await page.getByRole('button', { name: 'Create line recovery' }).isDisabled(), 'a recovery cannot be created without a line');
await page.getByRole('button', { name: 'Line 7', exact: true }).click();
await page.getByRole('button', { name: 'Create line recovery' }).click();
await page.waitForURL(/#\/project\/[^/]+\/recovery/, { timeout: 15000 });
const firstProject = page.url().match(/\/project\/([^/]+)\/recovery/)?.[1];
if (!firstProject) throw new Error('First recovery did not open');
await page.getByRole('button', { name: 'Customer report' }).click();
await page.getByRole('heading', { name: 'Customer report' }).waitFor({ timeout: 15000 });
ok((await page.locator('.cr-status').innerText()).includes('Line 7'), 'the customer preview contains the first line');
ok((await page.locator('.cr-status').innerText()).includes('performance cannot be judged'), 'the report does not claim an unmeasured line meets target');
const [customerPdf] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download' }).click()]);
ok(/Hull.Line.7.recovery/i.test(customerPdf.suggestedFilename()), 'the customer PDF downloads with the project name');
if (process.env.SHOTS) await customerPdf.saveAs(`${process.env.SHOTS}/line-recovery-customer.pdf`);
if (process.env.SHOTS) { await page.waitForTimeout(2500); await page.screenshot({ path: `${process.env.SHOTS}/line-recovery-customer.png`, fullPage: true }); }
ok(!((await page.locator('.cr-status').innerText()).includes('Line 2A')), 'the first recovery report is for Line 7 alone');
await page.getByRole('button', { name: 'Full report' }).click();
const [fullPdf] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download' }).click()]);
ok(/Hull.Line.7.recovery/i.test(fullPdf.suggestedFilename()), 'the full customer report downloads with the project name');
if (process.env.SHOTS) await fullPdf.saveAs(`${process.env.SHOTS}/line-recovery-full.pdf`);

await t.go(`#/project/${firstProject}/recovery`, 650);
await page.locator('.nv-tabs .nv-tab', { hasText: /^Reports$/ }).click();
ok(await page.getByText('DMAIC project evidence', { exact: true }).count() > 0, 'Reports offers the customer PDF and supporting DMAIC evidence');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Start another line recovery at Hull ›' }).click();
await page.getByRole('button', { name: 'Create line recovery' }).waitFor({ timeout: 15000 });
ok(await page.getByRole('button', { name: 'Line 2A — capacity' }).getAttribute('aria-pressed') === 'true', 'the other line at this site is already selected');
ok(await page.getByRole('button', { name: 'Line 7 — smoke test' }).count() === 0, 'another client at the same site is not offered');
await page.locator('.proj-new input[placeholder]').first().fill('Hull Line 2A recovery');
await page.getByRole('button', { name: 'Create line recovery' }).click();
await page.waitForURL(/#\/project\/[^/]+\/recovery/, { timeout: 15000 });
const secondProject = page.url().match(/\/project\/([^/]+)\/recovery/)?.[1];
ok(!!secondProject && secondProject !== firstProject, 'the second line has a separate recovery project');
const methods = await page.evaluate(async ids => Promise.all(ids.map(id => import('/src/db.ts').then(db => db.getProject(id)).then(project => project?.method))), [firstProject, secondProject]);
ok(methods.every(method => method === 'dmaic'), 'both recoveries are saved as DMAIC projects');
await page.getByRole('button', { name: 'Customer report' }).click();
await page.getByRole('heading', { name: 'Customer report' }).waitFor({ timeout: 15000 });
ok(!((await page.locator('.cr-status').innerText()).includes('Line 7')), 'the second recovery report excludes Line 7');

await t.go('#/projects', 850);
const rows = await page.locator('.proj-list').innerText();
ok(rows.includes('Hull Line 7 recovery') && rows.includes('Hull Line 2A recovery'), 'Projects lists both recoveries with their own line');
await t.go('#/room', 1700);
await page.locator('[data-fold="control-room"] .fold-toggle').click();
await page.locator('.jb-gantt').waitFor({ timeout: 15000 });
const board = await page.locator('.jb-gantt').innerText();
ok(board.includes('Hull Line 7 recovery') && board.includes('Hull Line 2A recovery'), 'the shared control room sees both separate projects');
await page.setViewportSize({ width: 390, height: 844 });
ok(await t.wide() <= 0, 'the shared control room fits a 390 px phone');
await page.evaluate(async () => (await import('/src/lib/activeClient.ts')).setActiveClient(''));
await t.go('#/projects?new=1&program=line-recovery', 700);
await page.getByRole('button', { name: 'Include several lines in one project' }).click();
await page.getByRole('button', { name: /^Line 7 · Acme/ }).click();
ok(await page.getByRole('button', { name: /Beta/ }).count() === 0, 'All clients cannot mix two businesses in one customer report');
ok(await page.getByRole('button', { name: /Line 2A — capacity/ }).count() === 1, 'another line from the same customer is available');
await t.go(`#/project/${firstProject}/setup?part=pset-lines`, 650);
const setupPicker = page.getByRole('combobox', { name: 'Which line of your factory' });
await setupPicker.getByRole('option', { name: /Line 2A/ }).waitFor({ state: 'attached' });
const available = await setupPicker.textContent();
ok(available.includes('Line 2A') && !available.includes('smoke test'), 'editing the recovery offers the same customer’s factory lines');
await t.finish('Separate line recoveries and reports share the same site control room.');
