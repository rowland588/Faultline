/* A consultant can start one recovery program for several underperforming lines
 * and reach the real capacity, Problems and Actions records from it. */
import { openApp } from '../lib/tocBrowser.mjs';
import { more } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const seeded = await t.seed();
await t.go('#/projects', 1000);
await page.getByRole('button', { name: 'Start line recovery' }).click();
ok(await page.getByText(/Choose one line for its own recovery and report/).count() > 0, 'recovery starts with one line and a separate report');
const choices = page.locator('.proj-lines-chips button');
ok(await choices.count() >= 2, 'the engagement can include several factory lines');
await choices.nth(0).click();
ok(await page.getByRole('button', { name: 'Create line recovery' }).isDisabled(), 'a line and a name are both required before creating a recovery');
await page.getByRole('button', { name: 'Include several lines in one project' }).click();
await choices.nth(1).click();
await page.locator('.proj-new input[placeholder]').first().fill('Packing line recovery');
await page.getByRole('button', { name: 'Create line recovery' }).click();
await page.waitForURL(/#\/project\/[^/]+\/recovery/, { timeout: 15000 });
await page.locator('[data-recovery-step="7"]').waitFor({ timeout: 15000 });
ok(await page.locator('[data-recovery-step]').count() === 7 && await page.locator('.recovery-phase').count() === 5, 'one DMAIC page groups seven practical actions in five phases');
ok((await page.locator('.nv-tabs').innerText()).includes('DMAIC') && !(await page.locator('.nv-tabs').innerText()).includes('Program'), 'the project navigation leads with DMAIC, without a Programs tab');
await page.screenshot({ path: '/tmp/line-recovery-desk.png' });
const program = page.url().split('#')[1];
const projectId = program.split('/')[2];
const lines = page.getByRole('combobox', { name: 'Line in this recovery program' });
await lines.locator('option').nth(1).waitFor({ state: 'attached', timeout: 15000 });
ok(await lines.locator('option').count() >= 2, 'both lines are available in one program');
const first = await lines.inputValue();
await page.getByRole('button', { name: /Open Line capacity/ }).click();
ok(page.url().includes('project=') && page.url().includes(`line=${encodeURIComponent(first)}`), 'capacity opens with project and selected line context');
await t.go(`#${program}`, 700);
await page.setViewportSize({ width: 390, height: 844 });
const second = await lines.locator('option').nth(1).getAttribute('value');
await lines.selectOption(second);
const selectedRecovery = page.url().split('#')[1];
ok(page.url().includes(`line=${encodeURIComponent(second)}`), 'the selected line stays in the program address for a return visit');
ok(await t.wide() <= 0, 'the recovery program fits a 390px phone');
await page.screenshot({ path: '/tmp/line-recovery-phone.png' });
await page.getByRole('button', { name: /Open Problems/ }).click();
ok(page.url().includes(`line=${encodeURIComponent(second)}`) && page.url().includes('project='), 'Problems opens for the other line in the same project');
const finding = 'The packer drops trays as the infeed belt starts.';
const cause = 'The infeed guide is loose.';
const fix = 'Reset and secure the infeed guide.';
const outcome = 'The guide was reset during the trial. Output still needs a follow-up count.';
await page.getByRole('button', { name: 'Problem', exact: true }).click();
const capture = page.getByRole('dialog');
const words = capture.getByPlaceholder(/Guard on the infeed conveyor/);
const place = capture.getByLabel('Which line', { exact: true });
await place.locator(`option[value="${second}"]`).waitFor({ state: 'attached' });
ok(await place.inputValue() === second && await capture.getByLabel('Which project', { exact: true }).inputValue() === projectId,
  'problem capture starts on the selected factory line and project');
await words.fill(finding);
await capture.getByRole('button', { name: 'Save', exact: true }).click();
await capture.waitFor({ state: 'hidden' });
const stored = await page.evaluate(async ({ second, finding }) => {
  const db = await import('/src/db.ts');
  return (await db.snagsForWorkspace(second)).find(row => row.problem === finding)?.projectId;
}, { second, finding });
ok(stored === projectId, 'the new problem belongs to this recovery and its selected line');
await t.go(`#${selectedRecovery}`, 0);
await page.getByRole('button', { name: /Open 6M/ }).click();
await page.waitForURL(/\/fishbone\?/);
const fishboneHash = page.url().split('#')[1];
const lineRow = await page.evaluate(async ({ projectId, second }) =>
  (await (await import('/src/db.ts')).loadPaceLines(projectId)).find(row => row.workspaceId === second)?.id,
{ projectId, second });
ok(fishboneHash.startsWith(`/project/${projectId}/fishbone?`) && new URLSearchParams(fishboneHash.split('?')[1]).get('line') === lineRow,
  'Analyse opens this recovery’s own fishbone on its selected project line');
if (!(await page.locator('.fj-open').isVisible())) await page.getByRole('button', { name: /Open a problem/ }).first().click();
await page.locator('.fj-seen').getByRole('button', { name: new RegExp(finding.replace(/\.$/, '')) }).click();
await page.getByRole('button', { name: 'Add a cause on Machine', exact: true }).first().click();
await page.getByRole('textbox', { name: 'The cause', exact: true }).fill(cause);
await page.getByRole('radio', { name: 'Confirmed', exact: true }).click();
await page.getByRole('button', { name: /Ask why/ }).click();
await page.getByPlaceholder('Because…').fill('The mounting bolt lacks a locking washer.');
await page.getByRole('checkbox', { name: /This is a root/ }).check();
await page.getByRole('button', { name: 'Add to the fishbone', exact: true }).click();
await page.getByRole('button', { name: /Machine: The infeed guide is loose/ }).first().click();
await page.getByRole('button', { name: /Add a fix/ }).click();
await page.getByRole('textbox', { name: 'WHAT HAS TO BE DONE' }).fill(fix);
await page.getByRole('textbox', { name: 'WHO', exact: true }).fill('Alex');
await page.getByRole('button', { name: 'Add it', exact: true }).click();
await page.getByRole('dialog').filter({ has: page.getByRole('textbox', { name: 'WHAT HAS TO BE DONE' }) }).waitFor({ state: 'hidden' });
const action = await page.evaluate(async ({ projectId, fix }) =>
  (await (await import('/src/db.ts')).listPaceTodos(projectId)).find(row => row.what === fix),
{ projectId, fix });
ok(!!action?.causeRef && action.lineId === lineRow && action.who === 'Alex', 'the saved action retains its cause, line, project and owner');
await t.go(`#${program}`, 600);
await page.getByRole('button', { name: 'Open Actions' }).click();
ok(page.url().includes('/actions'), 'Actions opens the project tracker');
await page.getByText(fix, { exact: true }).first().waitFor();
ok(await page.getByText(fix, { exact: true }).first().isVisible(), 'Improve lists the countermeasure created from the actual line finding');
await page.getByText(fix, { exact: true }).first().click();
await page.getByText('Progress and outcome', { exact: true }).click();
await page.getByRole('group', { name: 'State', exact: true }).getByRole('button', { name: 'Done', exact: true }).click();
await page.getByRole('textbox', { name: 'HOW IT ENDED' }).fill(outcome);
await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
await page.getByRole('dialog').waitFor({ state: 'hidden' });
for (const [label, path] of [['Start a loss count', '/losses'], ['Open Analysis', '/analysis']]) {
  await t.go(`#${program}`, 500);
  await page.getByRole('button', { name: new RegExp(label) }).click();
  ok(page.url().includes(path) && page.url().includes('project='), `${label} opens inside the project`);
}
await t.go(`#${program}`, 500);
await page.locator('[data-recovery-step="4"] summary').click();
await page.getByRole('link', { name: 'Stops Pareto' }).click();
ok(page.url().includes('/analyse'), 'the stops Pareto opens the line’s real analysis');
await t.go(`#${program}`, 500);
ok(await page.getByRole('button', { name: 'Customer report' }).count() >= 1 && await page.getByRole('link', { name: /Report for/ }).count() >= 1, 'the customer report leads and the selected line also has its own report');
await page.getByRole('link', { name: /Report for/ }).click();
ok(page.url().includes(`project=${encodeURIComponent(program.split('/')[2])}`) && page.url().includes('line='), 'the line report is scoped to this project and this line');
await t.go(`#${program}`, 500);
ok(await page.getByRole('heading', { name: 'DMAIC' }).count() >= 1, 'line recovery is presented as DMAIC');
ok(await page.locator('.recovery-phase').first().getByRole('heading', { name: 'Define' }).count() === 1
  && await page.locator('.recovery-phase').last().getByRole('heading', { name: 'Control' }).count() === 1, 'the practical line steps sit inside DMAIC phases');
await page.getByRole('link', { name: 'Phase reviews and more DMAIC tools' }).click();
await page.waitForURL(/\/method/, { timeout: 15000 });
await page.locator('.pmethod').waitFor({ timeout: 30000 });
ok(page.url().includes('/method'), 'the project opens its DMAIC phase workspace and report');
await t.go(`#${program}`, 500);
const projectBase = program.replace(/\/recovery$/, '');
await t.go(`#${projectBase}`, 500);
await page.locator('[data-recovery-step="7"]').waitFor({ timeout: 8000 });
ok(await page.getByRole('heading', { name: 'DMAIC' }).count() >= 1, 'reopening the project returns to its DMAIC pack');
await page.getByRole('button', { name: 'Customer report' }).click();
ok(page.url().includes('/pace-report') && !page.url().includes('&line='), 'the program opens the whole project customer report');
await page.getByRole('button', { name: 'Full report', exact: true }).click();
const customerPaper = await t.pdfText(() => page.getByRole('button', { name: 'Download', exact: true }).click(), 'recovery-action');
ok([finding, cause, fix, 'Alex', outcome].every(word => customerPaper.includes(word)), 'the full customer PDF carries the line problem, its cause, action, owner and recorded outcome');
ok(customerPaper.includes('Checking it worked'), 'completing the action still leaves control evidence outstanding');
const peerProblem = await page.evaluate(async ({ projectId, second }) => {
  const db = await import('/src/db.ts');
  const id = crypto.randomUUID();
  await db.addSnag({ id, workspaceId: second, projectId, problem: 'Another project on the same factory line', status: 'open', raisedAt: Date.now(), updatedAt: Date.now() });
  return id;
}, { projectId: seeded.projectId, second });
await t.go(`#${selectedRecovery}`, 0);
await page.getByRole('button', { name: /Open Problems/ }).click();
await page.locator('.qsl-reg').waitFor();
page.once('dialog', d => d.accept());
await more(page, 'Start fresh');
await page.waitForFunction(async ({ second, finding }) => {
  const db = await import('/src/db.ts');
  return (await db.snagsForWorkspace(second)).some(snag => snag.problem === finding && snag.archivedAt);
}, { second, finding });
const peer = await page.evaluate(async ({ second, peerProblem }) =>
  (await (await import('/src/db.ts')).snagsForWorkspace(second)).find(snag => snag.id === peerProblem),
{ second, peerProblem });
ok(!!peer && !peer.archivedAt, 'starting fresh in one recovery preserves the other project’s problem on the same line');
await t.finish('Line recovery starts for multiple lines and opens the existing records on desktop and phone.');
