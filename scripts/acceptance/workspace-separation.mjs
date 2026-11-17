/* Clear workspaces over connected records: docs/WORKSPACES.md. */
import { openApp } from '../lib/tocBrowser.mjs';
import { mkdirSync } from 'node:fs';
import { openFold } from '../lib/folds.mjs';
const t = await openApp(); const { page: p, ok } = t;
const shots = process.env.UI_REVIEW_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
await t.seed();
await t.go('#/');
ok(JSON.stringify((await p.locator('.nv-rail .nv-ri .nv-ri-l').allInnerTexts()).map(s=>s.trim())) === JSON.stringify(['Factory','Tools','Actions','Testing','Projects','Luna']), 'six distinct workspaces, including delivery through Actions; no duplicate Today dashboard in the sidebar');
ok(await p.locator('.nv-rail').count() === 1 && await p.locator('.nv-rail .nv-ri').filter({ hasText: /^Tools$/ }).count() === 1, 'Luna keeps direct access to the app workspaces');
const record = await p.evaluate(async () => {
  const db = await import('/src/db.ts');
  const s = (await db.listAllStudies()).find(s => s.tool === 'capability' && s.projectId && !s.deletedAt);
  return { id: s.id, name: s.name, projectId: s.projectId, workspaceId: s.workspaceId };
});
await p.locator('.nv-rail .nv-ri').filter({ hasText: /^Tools$/ }).click();
await p.getByRole('tab', { name: 'Saved work', exact: true }).click();
ok((await p.locator('.nv-top .nv-job-l, .nv-top .nv-crumb').allInnerTexts()).filter(x => x.trim() === 'Tools').length === 1, 'the header names the workspace once');
const link = p.locator(`[data-use="study:${record.id}"] .line-use-open`);
await link.waitFor({ timeout: 60000 });
ok((await link.innerText()).includes(record.name), 'saved work includes a project-linked use without duplicating it');
const sixm = await p.evaluate(async () => (await import('/src/tools/sixm/sixmTool.ts')).sixmsOf(await (await import('/src/db.ts')).allProjects())[0]?.id);
ok(!!sixm && await p.locator(`[data-use="sixm:${sixm}"]`).count() === 1, '6M is included in saved tool work under its own tool name');
await link.click();
await p.getByRole('heading', { name: record.name, exact: true }).waitFor();
ok((await p.locator('.nv-rail .nv-ri.is-on').innerText()).trim() === 'Tools' && await p.locator('.nv-tabs').count() === 0, 'opening saved work stays in Tools instead of switching into its project');
const after = await p.evaluate(async id => (await import('/src/db.ts')).getStudy(id), record.id);
ok(after.projectId === record.projectId && after.workspaceId === record.workspaceId, 'workspace separation preserves the saved ownership and line');
await p.evaluate(async projectId => (await import('/src/snag/quick.ts')).remember('project', projectId), record.projectId);
await p.locator('.nv-top .qs-top').click();
await p.getByRole('dialog').getByLabel('Which project', { exact: true }).waitFor();
ok(await p.getByRole('dialog').getByLabel('Which project', { exact: true }).inputValue() === '', 'quick capture in Tools inherits neither the saved record project nor a remembered project');
await p.keyboard.press('Escape');
await p.getByRole('dialog').waitFor({ state: 'hidden' });
await p.locator('.nv-top .nv-crumb').filter({ hasText: /^Capability$/ }).click();
await p.getByRole('button', { name: 'New capability study', exact: true }).waitFor();
ok(p.url().includes('workspace=tools'), 'returning to the tool list keeps the same workspace');
await p.getByRole('button', { name: 'New capability study', exact: true }).click();
const dialog = p.getByRole('dialog');
await dialog.locator('form input').first().fill('Standalone workspace check');
await dialog.getByRole('button', { name: 'Start it', exact: true }).click();
await p.getByRole('heading', { name: 'Standalone workspace check', exact: true }).waitFor();
const own = await p.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).find(s => s.name === 'Standalone workspace check'));
ok(!!own && !own.projectId && p.url().includes('workspace=tools'), 'a tool can be started and used without a project');
await t.go('#/balances?workspace=tools');
await p.getByRole('button', { name: 'New line capacity', exact: true }).click();
await openFold(p, 'new-line-tool-project');
await p.getByRole('dialog').getByLabel('Attach to a project').selectOption(record.projectId);
await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'hidden' });
await p.getByRole('button', { name: 'New line capacity', exact: true }).click();
await openFold(p, 'new-line-tool-project');
ok(await p.getByRole('dialog').getByLabel('Attach to a project').inputValue() === '', 'each new tool use starts without a previous optional project selection');
await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'hidden' });
await p.locator('.nv-rail .nv-ri').filter({ hasText: /^Testing$/ }).click();
await p.getByRole('heading', { name: 'Testing', exact: true }).waitFor();
ok((await p.locator('.nv-rail .nv-ri.is-on').innerText()).trim() === 'Testing' && await p.locator('.nv-tabs').count() === 0, 'Testing has its own direct home without project navigation');
await p.evaluate(async () => {
  const db = await import('/src/db.ts'); const { addLineToFactory } = await import('/src/lib/lines.ts');
  for (const letter of ['A', 'B']) {
    const line = await addLineToFactory(`Workspace ${letter} line`);
    await db.updateWorkspace({ ...line, clientName: `Workspace ${letter}` });
    const now = Date.now();
    await db.putStudy({ id: `workspace-${letter}-study`, name: `${letter}-only saved work`, tool: 'capability', workspaceId: line.id, facts: {}, uses: [], startedAt: now, createdAt: now, updatedAt: now });
    await db.addLineProgram(line.id, { what: `${letter}-only verification`, machine: 'Packer' });
    if (letter === 'B') { await db.putStudy({ id: 'workspace-luna-B-conversation', name: 'B-only conversation', tool: 'talk', workspaceId: line.id, facts: { colleague: true }, uses: [], startedAt: now, createdAt: now, updatedAt: now }); (await import('/src/lib/recentPlaces.ts')).notePlace({ kind: 'line', scope: 'Workspace B line', to: `/lines/${line.id}`, at: now }); }
    if (letter === 'A') await db.putStudy({ id: 'workspace-luna-conversation', name: 'Luna conversation stays in Luna', tool: 'talk', workspaceId: line.id, facts: { colleague: true }, uses: [], startedAt: now, createdAt: now, updatedAt: now });
  }
  (await import('/src/lib/activeClient.ts')).setActiveClient('Workspace A');
});
await t.go('#/tools?view=saved');
await p.locator('[data-use="study:workspace-A-study"]').waitFor();
ok(await p.locator('[data-use="study:workspace-B-study"]').count() === 0, 'Saved work respects the active client');
ok(await p.locator('[data-use="study:workspace-luna-conversation"]').count() === 0, 'Luna conversations stay in Luna instead of mixing with saved tool work');
await t.go('#/programs?workspace=testing');
await p.getByText('A-only verification', { exact: true }).waitFor();
ok(!(await p.locator('.lp').innerText()).includes('B-only verification'), 'Testing respects the active client, including standalone plans');
for (const width of [360, 1440]) {
  await p.setViewportSize({width, height: 1000});
  await p.keyboard.press('Control+.'); await p.locator('[data-everything]').waitFor();
  await p.locator('[data-everything-record="workspace-A-study"]').waitFor();
  ok(await p.locator('[data-everything-record="workspace-B-study"]').count() === 0, `Everything keeps other-client tool work out at ${width}px`);
  ok(await p.locator('[data-everything-talk="workspace-luna-conversation"]').count() === 1 && await p.locator('[data-everything-talk="workspace-luna-B-conversation"]').count() === 0, `Everything separates client conversations at ${width}px`);
  ok(!(await p.locator('[data-everything]').innerText()).includes('Workspace B line') && await p.locator('[data-everything] section[aria-label="Projects"]').count() === 0, `Everything separates lines, projects and recent places at ${width}px`);
  ok(await t.wide() <= 1, `Everything fits ${width}px`);
  await p.keyboard.press('Escape'); await p.locator('[data-everything]').waitFor({state:'hidden'});
}
await p.evaluate(async () => (await import('/src/lib/activeClient.ts')).setActiveClient(''));
await p.keyboard.press('Control+.'); await p.locator('[data-everything]').waitFor();
await p.locator('[data-everything-record="workspace-B-study"]').waitFor();
ok((await p.locator('[data-everything-record="workspace-B-study"]').innerText()).includes('Workspace B'), 'All clients restores other-client work and names its client');
await p.keyboard.press('Escape');

for (const width of [360, 820, 1440]) {
  await p.setViewportSize({ width, height: 1000 });
  for (const route of ['#/', '#/tools', '#/tools?view=saved', '#/programs?workspace=testing']) {
    await t.go(route);
    ok(await t.wide() <= 1, `${route} fits ${width}px`);
    if (shots) await p.screenshot({ path: `${shots}/${route === '#/' ? 'luna' : route.includes('saved') ? 'saved-work' : route.includes('programs') ? 'testing' : 'tools'}-${width}.png` });
  }
  if (width < 1100) {
    ok(await p.locator('.nv-bar').isVisible(), `the app navigation remains available at ${width}px`);
    await p.locator('.nv-bar button').filter({hasText:/^More$/}).click();
    await p.locator('.nv-sheet').waitFor();
    ok(await p.locator('.nv-sheet .nv-ri').filter({hasText:/^Today$/}).count() === 0 && await p.locator('.nv-sheet .nv-ri').filter({hasText:/^Testing$/}).count() === 1, `More keeps Testing available without a duplicate Today at ${width}px`);
    await p.keyboard.press('Escape'); await p.locator('.nv-sheet').waitFor({state:'hidden'});
    await t.go('#/');
    const box = await p.locator('.ai-compose').boundingBox(), bar = await p.locator('.nv-bar').boundingBox();
    ok(!!box && !!bar && box.y + box.height <= bar.y + 1, `Luna's composer does not cover navigation at ${width}px`);
  }
}
await t.finish('Workspaces stay separate; records and evidence remain connected explicitly.');
