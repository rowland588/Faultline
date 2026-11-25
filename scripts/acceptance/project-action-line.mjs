/* A recovery containing two physical lines. Both its tracker and its phase action preserve the chosen line on a phone. */
import assert from 'node:assert/strict';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';

const t = await openApp({width: 390, height: 844, mobile: true});
const { page } = t;
page.setDefaultTimeout(35000);
const go = route => page.goto(BASE + '/#' + route, {waitUntil: 'domcontentloaded'});
const hash = () => new URL(page.url()).hash.slice(1);
const query = href => new URL(href, 'https://example.invalid').searchParams;
const tracked = 'Adjust discharge on the second line';
const phased = 'Trial the revised second-line guide';
try {
  await openSeedPage(page, BASE);
  const f = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const p = await db.createProject('Twin-line recovery', '#216EA4', 'Roland', undefined, 'board', 'dmaic', 'line-recovery');
    const other = await db.createProject('Separate project', '#546C75', undefined, undefined, 'board', 'dmaic');
    const [first, second, foreign] = await Promise.all(['West wrapper', 'East wrapper', 'Foreign wrapper'].map(name => db.createWorkspace(name)));
    const attach = (projectId, line) => db.addPaceLine({projectId, key: line.id, name: line.name, workspaceId: line.id});
    const p1 = await attach(p.id, first), p2 = await attach(p.id, second), external = await attach(other.id, second);
    const todo = (what, projectId, props) => db.putPaceTodo({id: crypto.randomUUID(), projectId,
      what, state: 'todo', where: '', why: '', who: 'Shift lead', when: '', createdAt: 1, updatedAt: 1, ...props});
    await todo('First line only', p.id, {workspaceId: first.id, lineId: p1.id});
    await todo('Second line only', p.id, {workspaceId: second.id, lineId: p2.id});
    await todo('Old second-line action', p.id, {lineId: p2.id});
    await todo('Whole project only', p.id, {});
    await todo('Other project action', other.id, {workspaceId: second.id, lineId: external.id});
    return {pid: p.id, p1: p1.id, p2: p2.id, first: first.id, second: second.id, foreign: foreign.id};
  });
  const checkRow = async (what, method = false) => {
    const row = await page.evaluate(async ({pid, what}) => (await (await import('/src/db.ts')).listPaceTodos(pid)).find(r => r.what === what), {pid: f.pid, what});
    assert.ok(row, 'The action must have been saved');
    assert.equal(row.projectId, f.pid);
    assert.equal(row.workspaceId, f.second);
    assert.equal(row.lineId, f.p2);
    if (method) {
      const source = row.sources.find(s => s.kind === 'method');
      assert.equal(source.id, f.pid);
      assert.equal(source.part, 'dmaic:Improve');
      assert.equal(query(source.href).get('line'), f.second);
      assert.equal(query(source.href).get('phase'), 'Improve');
    }
  };
  const openFolds = async () => {
    const closed = page.locator('.act .fold:not(.is-open) .fold-toggle');
    while (await closed.count()) await closed.first().click();
  };
  const rowNames = () => page.locator('.act .act-li .lt-what').allTextContents();
  const save = async what => {
    const lineField = page.getByLabel('Which line', {exact: true});
    const projectField = page.getByLabel('Which project', {exact: true});
    await lineField.waitFor();
    assert.equal(await lineField.inputValue(), f.second);
    await projectField.locator('option').filter({hasText: 'Twin-line recovery'}).waitFor({state: 'attached'});
    assert.equal(await projectField.inputValue(), f.pid);
    assert.ok(await lineField.isDisabled() && await projectField.isDisabled(), 'A scoped creation should retain its original project and line');
    await page.getByLabel('Action', {exact: true}).fill(what);
    await page.getByLabel('Whose is it').fill('Roland');
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    await page.getByRole('dialog').last().waitFor({state: 'hidden'});
  };
  await go('/project/' + f.pid + '/recovery');
  await page.getByLabel('Line in this recovery program').selectOption(f.second);
  await page.getByRole('region', {name: 'Improve phase'}).getByRole('button', {name: 'Open Actions', exact: true}).click();
  await page.locator('.act').waitFor();
  assert.equal(query(hash()).get('line'), f.second);
  await page.locator('.act .fold-toggle').first().waitFor();
  await openFolds();
  await page.getByText('Old second-line action', {exact: true}).waitFor();
  assert.deepEqual((await rowNames()).sort(), ['Old second-line action', 'Second line only']);
  await page.getByRole('button', {name: 'Create action', exact: true}).click();
  await save(tracked);
  await checkRow(tracked, true);
  await go('/project/' + f.pid + '/actions');
  await page.getByText('5 of its own', {exact: true}).waitFor();
  await openFolds();
  await page.locator('.act-li').getByText(tracked, {exact: true}).waitFor();
  assert.deepEqual((await rowNames()).sort(), ['First line only', 'Old second-line action', 'Second line only', 'Whole project only', tracked].sort());
  t.ok(true, 'Recovery tracker shows the chosen line, includes earlier project-line records, and creates on the exact two line ids; the whole tracker lists all owned work');

  await go('/project/' + f.pid + '/actions?line=' + f.foreign);
  await page.getByRole('alert').filter({hasText: /line is unavailable in this project/i}).waitFor();
  assert.equal(await page.getByRole('button', {name:'Create action', exact:true}).count(), 0);
  assert.equal(await page.getByText('Whole project only', {exact:true}).count(), 0);
  t.ok(true, 'An unrelated physical line exposes neither the create action nor project work');

  const method = '/project/' + f.pid + '/method?line=' + f.second + '&phase=Improve';
  await go(method);
  const phase = page.locator('.pmethod-sec[aria-label="Improve"]');
  await phase.waitFor();
  const fold = phase.locator('.fold-toggle').first();
  if (await fold.getAttribute('aria-expanded') !== 'true') await fold.click();
  await phase.getByText('Actions from this phase', {exact:true}).click();
  await phase.getByRole('button', {name:'Create action', exact:true}).click();
  await save(phased);
  await checkRow(phased, true);
  await phase.getByRole('button', {name:'Open action', exact:true}).click();
  const source = page.getByRole('dialog').getByRole('link', {name:/DMAIC.*Improve/i});
  await source.click();
  await page.waitForURL(url => url.hash.startsWith('#/project/' + f.pid + '/method') && new URLSearchParams(url.hash.split('?')[1]).get('line') === f.second);
  assert.equal(query(hash()).get('phase'), 'Improve');
  assert.ok(await t.wide() <= 1, 'Phone viewport should not overflow');
  t.ok(true, 'Creating from Improve saves the selected physical line and project line; opening its source returns to that same phase and line');
} catch (error) {
  console.error('At', page.url(), (await page.locator('main').innerText().catch(() => '')).slice(0, 1500));
  await t.browser.close();
  throw error;
}
await t.finish('Selected-line action journey verified at phone width.');
