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
  walk: 'Night shift walk report',
  finding: 'The film slips through the left jaw during restart.',
};
const fill = {
  name: 'Monday fill recovery',
  statement: 'The filler stops during the first hour of Monday production.',
  walk: 'Monday walk report',
  finding: 'The filler photoeye was blocked before startup.',
};
const firstDraft = 'Operators report a sealing problem.';
const obsolete = 'Discarded draft attributes the fault to a carton guide.';
const raw = 'Private voice transcript for the consultant only.';

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

async function recordWalk(project) {
  const projectId = page.url().split('/project/')[1].split('/')[0];
  await page.evaluate(async ({ projectId, project, raw, obsolete }) => {
    const db = await import('/src/db.ts');
    const [line] = await db.loadPaceLines(projectId);
    const now = Date.now();
    const doc = (title, text) => ({ kind: 'line-walk', title, sections: [{ heading: 'Walk findings', text, points: [], photos: [] }] });
    await db.putStudy({
      id: crypto.randomUUID(), tool: 'talk', projectId, workspaceId: line.workspaceId, name: project.walk,
      uses: [], startedAt: now, createdAt: now, updatedAt: now, facts: { turns: [
        { id: 'voice', kind: 'said', at: now - 3, transcript: raw },
        { id: 'draft', kind: 'reply', at: now - 2, docUpdatedAt: now - 2, doc: doc('Draft walk report', obsolete) },
        { id: 'issued', kind: 'reply', at: now - 1, docUpdatedAt: now, doc: doc(project.walk, project.finding) },
      ] },
    });
  }, { projectId, project, raw, obsolete });
}

async function checkReport(project, excluded) {
  await t.go('#/projects', 0);
  await page.locator('.proj-list').getByText(project.name, { exact: true }).click();
  await define.getByText(project.statement, { exact: true }).waitFor();
  ok(await t.wide() <= 0, 'the saved problem statement fits the phone');
  await page.getByRole('button', { name: 'Customer report' }).click();
  await page.getByRole('heading', { name: 'Customer report', exact: true }).waitFor();
  for (const mode of ['status', 'full']) {
    if (mode === 'full') {
      await page.getByRole('button', { name: 'Full report', exact: true }).click();
      await page.locator('.cr-body summary', { hasText: project.walk }).click();
    }
    const download = page.getByRole('button', { name: 'Download', exact: true });
    const paper = await t.pdfText(() => download.click(), mode);
    const visible = t.norm(await page.locator('.cr-body').innerText());
    ok(visible.includes(project.statement), `${project.name} shows the saved statement in the ${mode} preview`);
    ok(paper.includes(project.statement), `${project.name} prints the saved statement in its ${mode} customer PDF`);
    if (mode === 'full') ok(paper.includes(project.finding) && visible.includes(project.finding),
      `${project.name} includes the latest issued walk report in its full PDF and phone preview`);
    ok([...excluded, raw, obsolete, 'No line findings have been recorded'].every(text => !paper.includes(text) && !visible.includes(text)),
      `the ${mode} report excludes the previous draft, private transcript and the other recovery’s records`);
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
await recordWalk(seal);
await createRecovery(fill.name);
await saveStatement(fill.statement);
await recordWalk(fill);
await checkReport(seal, [firstDraft, fill.statement, fill.finding]);
await checkReport(fill, [firstDraft, seal.statement, seal.finding]);
await t.finish('Two customer recoveries on one line carry their own current Define statement into both PDFs.');
