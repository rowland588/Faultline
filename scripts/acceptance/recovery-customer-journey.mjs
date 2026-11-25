/* A consultant defines two separate recovery projects on the same factory line.
 * Each exported customer PDF must carry only that project's current statement. */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ mobile: true, width: 390, height: 844 });
const { page, ok } = t;
const define = page.getByRole('region', { name: 'Define phase' });
const statement = define.getByRole('textbox', { name: 'Problem statement' });
const seal = {
  name: 'Night shift seal recovery',
  statement: 'Top seals split on the night shift after each film change.',
};
const fill = {
  name: 'Monday fill recovery',
  statement: 'The filler stops during the first hour of Monday production.',
};
const firstDraft = 'Operators report a sealing problem.';

async function createRecovery(name) {
  await t.go('#/projects', 0);
  await page.getByRole('button', { name: 'Start line recovery' }).click();
  await page.locator('.proj-new input[placeholder]').first().fill(name);
  await page.getByRole('button', { name: 'Line 7', exact: true }).click();
  await page.getByRole('button', { name: 'Create line recovery' }).click();
  await define.waitFor();
}

async function saveStatement(value) {
  await statement.fill(value);
  await define.getByRole('button', { name: 'Save statement' }).click();
  await define.getByText(value, { exact: true }).waitFor();
}

async function checkReport(project, excluded) {
  await t.go('#/projects', 0);
  await page.locator('.proj-list').getByText(project.name, { exact: true }).click();
  await define.getByText(project.statement, { exact: true }).waitFor();
  ok(await t.wide() <= 0, 'the saved problem statement fits the phone');
  await page.getByRole('button', { name: 'Customer report' }).click();
  await page.getByRole('heading', { name: 'Customer report', exact: true }).waitFor();
  for (const mode of ['status', 'full']) {
    if (mode === 'full') await page.getByRole('button', { name: 'Full report', exact: true }).click();
    const download = page.getByRole('button', { name: 'Download', exact: true });
    const paper = await t.pdfText(() => download.click(), mode);
    const visible = t.norm(await page.locator('.cr-body').innerText());
    ok(visible.includes(project.statement), `${project.name} shows the saved statement in the ${mode} preview`);
    ok(paper.includes(project.statement), `${project.name} prints the saved statement in its ${mode} customer PDF`);
    ok(excluded.every(text => !paper.includes(text) && !visible.includes(text)),
      `the ${mode} report excludes superseded wording and the other recovery on this line`);
    ok(await t.wide() <= 0, `the ${mode} customer report fits the phone`);
  }
}

await t.seed();
await createRecovery(seal.name);
await saveStatement(firstDraft);
await page.reload();
await define.getByRole('button', { name: 'Edit statement' }).click();
ok(await statement.inputValue() === firstDraft, 'the original statement survives a reload and can be edited');
await saveStatement(seal.statement);
await createRecovery(fill.name);
await saveStatement(fill.statement);
await checkReport(seal, [firstDraft, fill.statement]);
await checkReport(fill, [firstDraft, seal.statement]);
await t.finish('Two customer recoveries on one line carry their own current Define statement into both PDFs.');
