/* Two uses of the same instrument on one line belong to different DMAIC phases.
 * Check the saved originals, the customer preview, and the actual downloaded PDF. */
import assert from 'node:assert/strict';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';

const t = await openApp({ mobile: true, width: 390, height: 844 });
const { page } = t;
const projectName = 'Recovery of the foil fillers';
const baseline = { name: 'Foil filler baseline', phase: 'Measure', day: '2026-11-05', date: '5 Nov 2026', mean: 412 };
const pilot = { name: 'Foil filler pilot', phase: 'Improve', day: '2026-11-19', date: '19 Nov 2026', mean: 436 };
const sister = { name: 'Carton filler baseline', phase: 'Measure', day: '2026-11-08', date: '8 Nov 2026', mean: 539 };
const privateStudy = { name: 'Separate project check', phase: 'Measure', day: '2026-11-04', date: '4 Nov 2026', mean: 618 };
const action = {
  name: 'Check the filler calibration', owner: 'Morgan Ellis',
  quote: 'The low-fill trial prompted the adjustment.', outcome: 'The calibration check was recorded on the trial sheet.',
};
const readings = s => new RegExp('mean ' + s.mean + '(?:\\.0+)?\\s*g\\b', 'i');
const region = phase => page.getByRole('region', { name: phase + ' phase' });
const navigate = path => page.goto(BASE + '/#' + path, { waitUntil: 'domcontentloaded' });

function checkResult(section, study, excluded) {
  const text = section.toLowerCase();
  const from = text.indexOf(study.name.toLowerCase());
  assert.ok(from >= 0, 'Missing study in ' + study.phase + ': ' + study.name);
  const later = section.slice(from + study.name.length).split(/Capability study - |Loss count - /i)[0];
  assert.match(later, readings(study));
  assert.ok(later.includes('Started ' + study.date), 'Missing original date for ' + study.name);
  for (const other of excluded) {
    assert.ok(!text.includes(other.name.toLowerCase()) && !readings(other).test(section), other.name + ' appears in the wrong phase');
  }
}

try {
  await openSeedPage(page, BASE);
  const ids = await page.evaluate(async ({ projectName, baseline, pilot, sister, privateStudy, action }) => {
    const db = await import('/src/db.ts');
    const foil = await db.createWorkspace('Foil line');
    const carton = await db.createWorkspace('Carton line');
    const createRecovery = (name, lineIds) => db.createProject(name, '#4158a3', undefined, undefined, undefined,
      'dmaic', 'line-recovery', { lineIds });
    const project = await createRecovery(projectName, [foil.id, carton.id]);
    const other = await createRecovery('Separate engagement', [foil.id]);
    async function save(s, projectId, workspaceId) {
      const id = crypto.randomUUID(), at = Date.parse(s.day + 'T10:00:00Z');
      const readings = [-1, 0, 1].map((delta, i) => ({ id: crypto.randomUUID(), at: at + i * 1000, value: s.mean + delta }));
      await db.putStudy({ id, projectId, workspaceId, tool: 'capability', name: s.name, uses: [],
        agreed: { readings: { kind: 'limits', count: 3, lower: 425, upper: 650, unit: 'g' } },
        facts: { readings }, startedAt: at, createdAt: at, updatedAt: at },
      { projectId, method: 'dmaic', section: s.phase });
      return id;
    }
    const baselineId = await save(baseline, project.id, foil.id);
    await save(pilot, project.id, foil.id);
    await save(sister, project.id, carton.id);
    await save(privateStudy, other.id, foil.id);
    const line = (await db.loadPaceLines(project.id)).find(row => row.workspaceId === foil.id);
    const at = Date.parse('2026-11-12T10:00:00Z');
    await db.putPaceTodo({ id: crypto.randomUUID(), projectId: project.id, lineId: line.id, workspaceId: foil.id,
      what: action.name, who: action.owner, where: 'Filler', why: '', when: '', state: 'done',
      doneOn: '2026-11-12', outcome: action.outcome, createdAt: at, updatedAt: at,
      sources: [{ kind: 'study', id: baselineId, href: '/capability/' + baselineId, label: baseline.name,
        how: 'record', excerpt: action.quote }] });
    return { project: project.id, foil: foil.id, carton: carton.id, baselineId };
  }, { projectName, baseline, pilot, sister, privateStudy, action });

  await navigate('/projects');
  await page.locator('.proj-list').getByText(projectName, { exact: true }).click();
  const selector = page.getByRole('combobox', { name: 'Line in this recovery program' });
  await selector.selectOption(ids.foil);
  const pack = '/project/' + ids.project + '/recovery?line=' + ids.foil;
  const saved = phase => region(phase).locator('details.recovery-saved-work');
  async function expand(phase) {
    const records = saved(phase);
    await records.waitFor();
    if (await records.getAttribute('open') === null) await records.locator('summary').click();
    return records;
  }
  const foilSaved = await expand('Measure');
  await foilSaved.getByRole('link', { name: new RegExp(baseline.name) }).click();
  await page.waitForURL(url => url.hash.split('?')[0] === '#/capability/' + ids.baselineId);
  await page.locator('.ie-say').filter({ hasText: readings(baseline) }).first().waitFor();
  await navigate(pack);
  const onFoil = await expand('Measure');
  assert.ok(!(await onFoil.innerText()).includes(sister.name), 'The other line appears in Foil line’s saved work');
  await selector.selectOption(ids.carton);
  const onCarton = await expand('Measure');
  await onCarton.getByRole('link', { name: new RegExp(sister.name) }).waitFor();
  assert.ok(!(await onCarton.innerText()).includes(baseline.name), 'Foil work appears in Carton line’s saved work');
  assert.equal(await saved('Improve').count(), 0);
  await selector.selectOption(ids.foil);
  await region('Measure').getByRole('button', { name: 'Start a loss count' }).click();
  const scope = new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
  for (const [key, value] of Object.entries({ project: ids.project, line: ids.foil, method: 'dmaic', phase: 'Measure' })) {
    assert.equal(scope.get(key), value, 'Pack tool lost its ' + key);
  }
  await page.getByRole('button', { name: 'Start it' }).click();
  await page.waitForURL(/#\/losses\/[^/?]+/);
  const lossId = new URL(page.url()).hash.split('?')[0].split('/').at(-1);
  await navigate(pack);
  await (await expand('Measure')).locator('a[href="#/losses/' + lossId + '"]').waitFor();
  console.log('PASS  The recovery pack reopens the original result, filters saved work by line and places a newly launched tool in Measure.');

  await page.getByRole('button', { name: 'Customer report', exact: true }).click();
  await page.getByRole('button', { name: 'Full report', exact: true }).click();
  const phaseSummary = name => page.locator('.cr-body li').filter({ has: page.locator('b', { hasText: new RegExp('^' + name + '$') }) });
  const measure = await phaseSummary('Measure').innerText(), improve = await phaseSummary('Improve').innerText();
  assert.match(measure, /3 saved tool records/);
  assert.match(improve, /1 saved tool record\b/);
  for (const study of [baseline, sister]) checkResult(t.norm(measure), study, [pilot, privateStudy]);
  checkResult(t.norm(improve), pilot, [baseline, sister, privateStudy]);
  const previewEvidence = phaseSummary('Tool evidence');
  const baselineFinding = previewEvidence.locator(':scope > span').filter({ has: page.getByText('Capability study — ' + baseline.name, { exact: true }) });
  const linked = await baselineFinding.innerText();
  for (const value of [action.name, action.owner, action.quote, action.outcome]) assert.ok(linked.includes(value), 'Missing in phone preview: ' + value);
  assert.ok(await t.wide() <= 0, 'Customer preview overflows the phone');
  const pdf = await t.pdfText(() => page.getByRole('button', { name: 'Download', exact: true }).click(), 'recovery-phase-report');
  const measureAt = pdf.indexOf('Measure '), improveAt = pdf.indexOf('Improve ', measureAt + 1);
  const appendix = /\bEvidence\s+\d+ studies\b/i.exec(pdf);
  assert.ok(measureAt >= 0 && improveAt > measureAt && appendix && appendix.index > improveAt, 'Missing distinct phase and evidence sections in the PDF');
  for (const study of [baseline, sister]) checkResult(pdf.slice(measureAt, improveAt), study, [pilot, privateStudy]);
  checkResult(pdf.slice(improveAt, appendix.index), pilot, [baseline, sister, privateStudy]);
  assert.ok(!pdf.includes(privateStudy.name), 'A separate project on the same line leaked into the customer PDF');
  assert.doesNotMatch(pdf, /not on a bone yet|nothing on the board for People, Machine|the board by bone/i,
    'An ordinary study action should not be presented as an incomplete fishbone investigation');
  const original = pdf.slice(appendix.index);
  const studyRows = original.split(/(?=Capability study - )/i);
  const row = studyRows.find(text => text.startsWith('Capability study - ' + baseline.name));
  for (const word of [action.name, action.owner, action.quote, action.outcome]) assert.ok(row?.includes(word), 'Baseline action missing ' + word);
  for (const study of [pilot, sister]) {
    const unlinked = studyRows.find(text => text.startsWith('Capability study - ' + study.name));
    assert.ok(unlinked && !unlinked.includes(action.name), 'An unrelated study acquired the baseline action');
  }
  console.log('PASS  Full customer PDF has the original readings and dates in their DMAIC phases and prints the quoted action only against its source.');
  await navigate(pack);
  await selector.selectOption(ids.carton);
  await page.getByRole('link', { name: 'Report for Carton line', exact: true }).click();
  await page.getByRole('button', { name: 'Full report', exact: true }).click();
  const cartonOnly = await t.pdfText(() => page.getByRole('button', { name: 'Download', exact: true }).click(), 'carton-only');
  checkResult(cartonOnly, sister, [baseline, pilot, privateStudy]);
  for (const text of [action.name, action.quote, action.outcome]) assert.ok(!cartonOnly.includes(text), 'Wrong line action: ' + text);
  console.log('PASS  The selected Carton line PDF includes only its recorded study and omits the Foil line’s action.');
} catch (error) {
  console.error('At', page.url(), (await page.locator('main').innerText({ timeout: 1500 }).catch(() => '')).slice(0, 2300));
  await t.browser.close();
  throw error;
}
await t.finish('Recovery phase records verified on the phone and in the downloaded customer report.');
