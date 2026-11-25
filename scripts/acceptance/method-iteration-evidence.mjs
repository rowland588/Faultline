/* The same tool in two phases, two runs in the chosen phase, another mode, and a historical chart
 * without phase information. Read the real worksheet and its downloadable PDF for each method. */
import { BASE, openApp } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok } = t;
page.setDefaultTimeout(60000);
await t.ctx.route(/^https:\/\//, route => route.abort());
await openSeedPage(page, BASE);
const projects = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { placementNote } = await import('/src/lib/methodPlacement.ts');
  const line = await db.createWorkspace('Packaging line');
  const ids = {};
  const start = Date.now();
  for (const key of ['pdca', 'kata']) {
    const project = await db.createProject(key.toUpperCase() + ' trial', '#344455', undefined, undefined, undefined, key, undefined, { lineIds: [line.id] });
    ids[key] = project.id;
    const section = key === 'pdca' ? 'Check' : 'Experiment toward it';
    const other = key === 'pdca' ? 'Plan' : 'Grasp the current condition';
    for (const [suffix, phase, tool, kind] of [
      ['Retained first run', section, 'analysis', 'change'], ['Retained second run', section, 'analysis', 'change'],
      ['Newer source from other phase', other, 'analysis', 'change'], ['Incorrect analysis mode', section, 'analysis', 'grr'],
      ['Historical unplaced chart', '', 'chart', 'xmr'],
    ]) {
      const id = key + '-' + suffix;
      const at = start + (suffix.startsWith('Newer') ? 60000 : 0);
      const readings = kind === 'change' ? ['before', 'after'].flatMap((arm, group) =>
        [40, 41, 42, 43, 44, 45].map((value, n) => ({ id: arm + n, at: at + n, arm, value: value + group * 10 }))) : [];
      await db.putStudy({ id, projectId: project.id, workspaceId: line.id, tool, name: suffix, uses: [], agreed: { [tool]: { kind, name: 'Line rate', unit: 'ppm' } },
        facts: { readings }, startedAt: at, updatedAt: at, createdAt: at });
      if (phase) await db.putTestItem(placementNote({ projectId: project.id, method: key, section: phase }, 'study', id, at));
    }
  }
  return ids;
});

for (const [method, id] of Object.entries(projects)) {
  const pdca = method === 'pdca';
  const section = pdca ? 'Check' : 'Experiment toward it';
  await t.go('#/project/' + id + '/method?phase=' + encodeURIComponent(section), 0);
  const worksheet = page.locator('[data-fold="method-review-' + method + '"] > .fold-h .fold-toggle');
  await worksheet.waitFor().catch(async error => {
    console.error({ at: page.url(), screen: (await page.locator('body').innerText()).slice(0, 1200), errors: t.errors });
    throw error;
  });
  if (await worksheet.getAttribute('aria-expanded') === 'false') await worksheet.click();
  if (pdca) {
    const check = page.locator('.pdca-q[data-q="Check"] .fold-toggle');
    if (await check.getAttribute('aria-expanded') === 'false') await check.click();
  }
  const tool = pdca ? page.locator('.pdca-q[data-q="Check"] .pdca-tool').filter({ hasText: 'Analysis' }).first()
    : page.locator('.kata-fall[aria-label^="Analysis"]');
  await tool.getByRole('button', { name: 'Retained first run' }).waitFor();
  const words = await tool.innerText();
  ok(words.includes('Retained second run') && !words.includes('Newer source') && !words.includes('Incorrect analysis mode'),
    method + ' shows both phase runs of the correct analysis mode');
  await tool.getByRole('button', { name: 'Retained first run' }).click();
  ok(decodeURIComponent(page.url()).includes('/analysis/' + method + '-Retained first run'), method + ' reopens the exact selected analysis');
  await t.go('#/project/' + id + '/method-report', 0);
  const text = await t.pdfText(() => paper(page, pdca ? 'PDCA cycle record' : 'Kata storyboard'), method);
  const evidence = text.slice(text.indexOf('Tool evidence by phase'));
  ok(text.includes('Tool evidence by phase') && evidence.includes(section) && evidence.includes('Retained first run') &&
    evidence.includes('Retained second run') && evidence.includes('Newer source from other phase') &&
    evidence.includes('Project evidence') && evidence.includes('Historical unplaced chart'),
    method + ' worksheet PDF includes distinct phase runs and keeps ambiguous historical evidence at project level');
  ok(!text.slice(0, text.indexOf('Tool evidence by phase')).includes('Retained first run'),
    method + ' worksheet PDF keeps phase-wide evidence separate from individual iterations');
}
await t.finish('Phase-specific PDCA and Kata worksheets and PDFs passed.');
