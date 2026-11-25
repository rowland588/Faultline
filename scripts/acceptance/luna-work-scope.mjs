/* A conversation opens a real line, reopens its own report in the dock, and returns to Faultline.
 * Two projects share the line; another customer has its own line and recent work. */
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';

const { page, ctx, go, ok, finish } = await openApp({ width: 1440, height: 900 });
page.setDefaultTimeout(70000);
await ctx.route(/^https:\/\//, route => route.abort());
await openSeedPage(page, BASE);

const lineId = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { newConversation } = await import('/src/colleague/conversation.ts');
  const { setActiveClient } = await import('/src/lib/activeClient.ts');
  const { notePlace } = await import('/src/lib/recentPlaces.ts');
  const main = await db.createWorkspace('Audit line');
  const other = await db.createWorkspace('Second customer line');
  await db.updateWorkspace({ ...main, clientName: 'South Co' });
  await db.updateWorkspace({ ...other, clientName: 'North Co' });
  const start = { lineIds: [main.id] };
  const a3 = await db.createProject('Seal investigation', '#56789a', undefined, undefined, undefined, 'a3', undefined, start);
  const peer = await db.createProject('Other investigation', '#56789a', undefined, undefined, undefined, 'dmaic', undefined, start);
  const at = Date.now();
  for (const [id, workspaceId, projectId, problem] of [
    ['own', main.id, a3.id, 'Weak seals on the night shift'],
    ['peer', main.id, peer.id, 'Other project stoppage'],
    ['north', other.id, undefined, 'Other customer stoppage'],
  ]) {
    await db.addSnag({ id, workspaceId, projectId, problem, status: 'open', raisedAt: at, updatedAt: at });
  }
  const chat = newConversation({ id: 'split-chat', at, name: 'Review saved work' });
  const refs = [
    { kind: 'line', id: main.id, label: 'Audit line', href: '/lines/' + main.id },
    { kind: 'convreport', id: 'R@1', label: 'Audit report', href: '' },
  ];
  chat.facts.turns = [{
    id: 'review', at, who: 'Faultline', kind: 'reply', text: 'The audit is ready.',
    used: [{ callId: 'read', name: 'find', kind: 'read', title: 'Find work', status: 'done', says: 'Records in this audit', at, refs }],
  }];
  chat.facts.reports = [{
    id: 'R', title: 'Audit report', at, updated: at, version: 1, form: 'report',
    sections: [{ id: 'S', kind: 'text', heading: 'Audit notes', text: 'Evidence belonging to this conversation.' }],
  }];
  await db.putStudy(chat);
  const projectChat = newConversation({
    id: 'split-project', at, name: 'Open issues',
    thread: { id: 'topic', title: 'Open issues', scope: { projectId: a3.id } },
  });
  projectChat.facts.turns = [{ id: 'one', at, who: 'Faultline', kind: 'reply', text: 'Here is the project.' }];
  await db.putStudy(projectChat);
  setActiveClient('South Co');
  notePlace({ to: '/programs?line=' + other.id, scope: 'Second customer line', kind: 'line', at });
  notePlace({ to: '/lines/' + main.id, scope: 'Audit line', kind: 'line', at });
  return main.id;
});

await go('#/ai?c=split-chat', 0);
await page.locator('details[data-ai-steps] summary').click();
await page.locator(`[data-ref="line:${lineId}"]:visible`).click();
await page.waitForURL('**/#/lines/' + lineId);

const dock = page.locator('.luna-panel');
const showReport = dock.locator('[data-show-beside="convreport:R@1"]');
await showReport.click();
const output = dock.locator('[data-work].is-open');
await output.waitFor();
const [outputBox, dockBox] = await Promise.all([output.boundingBox(), dock.boundingBox()]);
ok(page.url().endsWith('/lines/' + lineId) && await page.locator('[data-work-frame]').count() === 0,
  'The operational reference opens its own Faultline page');
ok(await output.getByText('Evidence belonging to this conversation.').isVisible()
  && Math.abs(outputBox.width - dockBox.width) < 3 && Math.abs(outputBox.height - dockBox.height) < 3,
  'The saved report fills the desktop dock beside the selected line');
await output.getByRole('button', { name: 'Back to the conversation' }).click();
ok(await showReport.isVisible() && page.url().endsWith('/lines/' + lineId),
  'Closing the report returns to the same conversation and line');

await go('#/ai?c=split-chat', 0);
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByRole('menuitem', { name: /^Settings/ }).click();
await page.getByRole('button', { name: 'Back to Faultline', exact: true }).click();
await page.waitForURL('**/#/room');
ok(await page.locator('.luna-panel').count() === 0, 'Back to Faultline opens the factory and closes the dock');

await go('#/ai?c=split-project', 0);
const project = page.locator('[data-work-context="project"]');
await project.getByText('Weak seals on the night shift', { exact: true }).waitFor({ state: 'attached' });
const projectText = await project.textContent();
ok(projectText.includes('A3') && !projectText.includes('Other project stoppage') && !projectText.includes('Other customer stoppage'),
  'The A3 context card shows the methodology and its own open problem');
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByRole('menuitem', { name: /^Recent work/ }).click();
const recent = page.locator('.sheet [data-env-start]');
await recent.locator('[data-env-line]', { hasText: 'Audit line' }).waitFor();
await recent.locator('[data-env-place]', { hasText: 'Audit line' }).waitFor();
ok(!(await recent.textContent()).includes('Second customer line'), 'Recent line activity and saved links respect the selected customer');
await finish('Faultline and Luna navigation checked in Chromium.');
