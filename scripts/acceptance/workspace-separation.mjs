/* Clear workspaces over connected records: docs/WORKSPACES.md. */
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp(); const { page: p, ok } = t;
await t.seed();
await t.go('#/');
ok(await p.locator('.nv-rail').count() === 1 && await p.locator('.nv-rail .nv-ri').filter({ hasText: /^Tools$/ }).count() === 1, 'Luna keeps direct access to the app workspaces');
const record = await p.evaluate(async () => {
  const db = await import('/src/db.ts');
  const s = (await db.listAllStudies()).find(s => s.tool === 'capability' && s.projectId && !s.deletedAt);
  return { id: s.id, name: s.name, projectId: s.projectId, workspaceId: s.workspaceId };
});
await p.locator('.nv-rail .nv-ri').filter({ hasText: /^Tools$/ }).click();
await p.getByRole('tab', { name: 'Saved work', exact: true }).click();
const link = p.locator(`[data-use="study:${record.id}"] .line-use-open`);
await link.waitFor({ timeout: 60000 });
ok((await link.innerText()).includes(record.name), 'saved work includes a project-linked use without duplicating it');
await link.click();
await p.getByRole('heading', { name: record.name, exact: true }).waitFor();
ok((await p.locator('.nv-rail .nv-ri.is-on').innerText()).trim() === 'Tools' && await p.locator('.nv-tabs').count() === 0, 'opening saved work stays in Tools instead of switching into its project');
const after = await p.evaluate(async id => (await import('/src/db.ts')).getStudy(id), record.id);
ok(after.projectId === record.projectId && after.workspaceId === record.workspaceId, 'workspace separation preserves the saved ownership and line');
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
  }
  (await import('/src/lib/activeClient.ts')).setActiveClient('Workspace A');
});
await t.go('#/tools?view=saved');
await p.locator('[data-use="study:workspace-A-study"]').waitFor();
ok(await p.locator('[data-use="study:workspace-B-study"]').count() === 0, 'Saved work respects the active client');
await t.go('#/programs?workspace=testing');
await p.getByText('A-only verification', { exact: true }).waitFor();
ok(!(await p.locator('.lp').innerText()).includes('B-only verification'), 'Testing respects the active client, including standalone plans');
await p.evaluate(async () => (await import('/src/lib/activeClient.ts')).setActiveClient(''));
for (const width of [360, 820, 1440]) {
  await p.setViewportSize({ width, height: 1000 });
  for (const route of ['#/', '#/tools', '#/tools?view=saved', '#/programs?workspace=testing']) {
    await t.go(route);
    ok(await t.wide() <= 1, `${route} fits ${width}px`);
  }
  if (width < 1100) {
    ok(await p.locator('.nv-bar').isVisible(), `the app navigation remains available at ${width}px`);
    await t.go('#/');
    const box = await p.locator('.ai-compose').boundingBox(), bar = await p.locator('.nv-bar').boundingBox();
    ok(!!box && !!bar && box.y + box.height <= bar.y + 1, `Luna's composer does not cover navigation at ${width}px`);
  }
}
await t.finish('Workspaces stay separate; records and evidence remain connected explicitly.');
