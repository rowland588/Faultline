/* The same named tool ran twice. The customer can identify the trial that led to a real action and its observed outcome. */
import assert from 'node:assert/strict';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';

const t = await openApp();
const { page } = t;
page.setDefaultTimeout(40000);
const action = 'Mark and lock the revised infeed guide position';
const expected = 'Keep average packer cycle time at or below 9 seconds.';
const observed = 'Shift lead verified 8.7 seconds across the next 20 cartons.';
try {
  await openSeedPage(page, BASE);
  const job = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const line = await db.createWorkspace('Packaging line 7');
    const p = await db.createProject('Carton packer cycle time', '#2b6984', 'Roland', undefined, 'board', 'dmaic');
    await db.addPaceLine({projectId: p.id, key: line.id, name: line.name, workspaceId: line.id});
    const start = Date.UTC(2026, 10, 17, 8);
    const note = async (field, what) => db.putTestItem({id: crypto.randomUUID(), projectId: p.id, testId: 'method:dmaic:' + field,
      kind: 'note', what, createdAt: start, updatedAt: start, sort: start});
    for (const [field, what] of Object.entries({
      problem: 'Cartons build up at the packer during the morning shift. The customer needs a cycle of 9 seconds or less.',
      goal: 'Verify a repeatable packer cycle of 9 seconds or less on the standard carton.',
      scope: 'Packaging line 7, standard carton, morning shift.',
      baseline: 'Six readings at the existing guide setting averaged 12.5 seconds per carton.',
      pilot: 'Repeat the trial with the revised guide position and compare it with the first trial.',
      plan: 'The shift lead checks 20 cartons at start-up and records the average cycle time.',
    })) await note(field, what);
    const ids = [];
    for (const [run, after] of [[0, [11,12,11,12,11,12]], [1, [8,9,8,9,8,9]]]) {
      const id = crypto.randomUUID(), at = start + run * 86400000;
      const readings = [['before', [12,13,12,13,12,13]], ['after', after]].flatMap(([arm, values]) =>
        values.map((value, i) => ({id: crypto.randomUUID(), arm, value, at: at + i * 1000})));
      await db.putStudy({id, projectId: p.id, workspaceId: line.id, name: 'Infeed guide trial', machine: 'Carton packer',
        tool: 'analysis', createdAt: at, startedAt: at, updatedAt: at, uses: [], facts: {readings},
        agreed: {analysis: {kind: 'change', name: 'Carton cycle time', unit: 's', data: 'measured', better: 'lower'}}},
        {projectId: p.id, method: 'dmaic', section: 'Improve'});
      ids.push(id);
    }
    return {projectId: p.id, ids};
  });
  await page.goto(BASE + '/#/analysis/' + job.ids[1]);
  await page.locator('.ie-say').filter({hasText: /Before 12\.50? s, after 8\.50? s/}).waitFor();
  await page.getByRole('button', {name: 'Create action', exact: true}).first().click();
  await page.getByLabel('Action', {exact: true}).fill(action);
  await page.getByLabel('Whose is it').fill('Sam Taylor');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await page.getByRole('button', {name: 'Open action', exact: true}).first().click();
  const editor = page.getByRole('dialog').last();
  for (const summary of ['More plan details', 'Progress and outcome']) {
    const details = editor.locator('details').filter({has: page.locator('summary', {hasText: summary})});
    await details.waitFor();
    if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
  }
  await editor.getByLabel('WHAT IT SHOULD CHANGE').fill(expected);
  await editor.getByRole('group', {name: 'State'}).getByRole('button', {name: 'Done', exact: true}).click();
  await editor.getByLabel('HOW IT ENDED').fill(observed);
  await editor.getByRole('button', {name: /^Save/}).click();
  await editor.waitFor({state: 'hidden'});
  await page.goto(BASE + '/#/project/' + job.projectId + '/method-report');
  const facts = page.locator('.mrep-facts').filter({hasText: action});
  await facts.waitFor();
  const details = await facts.innerText();
  for (const text of ['Improve', 'Infeed guide trial', 'Run 2 of 2', 'When linked', 'after 8.5', 'Sam Taylor', expected, observed]) assert.ok(details.includes(text), text);
  assert.doesNotMatch(details, /Run 1 of 2|after 11\.5/);
  const paper = await t.pdfText(() => page.getByRole('button', {name: 'Download PDF', exact:true}).click(), 'linked-dmaic-trials');
  for (const text of ['RUN 1 OF 2', 'RUN 2 OF 2', 'before 12.5 s, after 11.5 s', 'before 12.5 s, after 8.5 s', 'Saved tool records']) assert.ok(paper.toLowerCase().includes(text.toLowerCase()), text);
  const decision = paper.slice(paper.indexOf(action));
  assert.ok(decision.includes('Run 2 of 2') && decision.includes(expected) && decision.includes(observed), 'Decision trace on downloaded paper');
  assert.doesNotMatch(decision.split(observed)[0], /Run 1 of 2|after 11\.5/);
  t.ok(true, 'Both runs, the exact linked run, finding, owner, expectation and observed outcome survived the browser PDF download');
} catch (e) {
  console.error('At', page.url(), '\n', (await page.locator('main').innerText().catch(() => '')).slice(0, 1300));
  await t.browser.close();
  throw e;
}
await t.finish('Customer action evidence verified.');
