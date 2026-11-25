/* Drive the same measured trial in seven projects on one factory line. Each method
 * keeps the selected phase, reopens the original measurements, and prints only its own work.
 * The eighth method's commissioning path is driven by stagegate-walk.mjs. */
import assert from 'node:assert/strict';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';

const methods = [
  ['PDCA', 'Check', 'Copper'],
  ['DMAIC', 'Improve', 'Cobalt'],
  ['8D', 'D5–D6', 'Jade'],
  ['A3', 'Plan and follow-up', 'Amber'],
  ['Kaizen event', 'Improve', 'Slate'],
  ['Improvement Kata', 'Experiment toward it', 'Ivory'],
  ['Theory of Constraints', 'Go again', 'Onyx'],
].map(([method, phasePrefix, colour]) => ({
  method, phasePrefix, name: `${method} packaging job`, evidence: `${colour} changeover samples`,
}));

const t = await openApp();
const { page } = t;
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(60000);
const navigate = hash => page.goto(BASE + '/' + hash, { waitUntil: 'domcontentloaded' });

async function projectFromList(job) {
  await navigate('#/projects');
  await page.locator('.proj-list').getByText(job.name, { exact: true }).click();
  await page.locator('.pmethod').waitFor();
}

async function returnFromStudy(job) {
  await page.locator('.part-belongs').getByRole('button', { name: job.name, exact: true }).click();
  await page.locator('.pmethod').waitFor();
}

async function openPhase(prefix) {
  const phase = page.locator('.pmethod-sec[aria-label^="' + prefix + '"]').first();
  const toggle = phase.locator('.fold-toggle').first();
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  return phase;
}

async function createStudy(phase, toolName, title) {
  await phase.getByRole('button', { name: toolName }).click();
  await page.getByLabel('What is it of?').fill(title);
  await page.getByLabel(/On which machine/).fill('Packer');
  await page.getByRole('button', { name: 'Start it' }).click();
  await page.waitForURL(/#\/analysis\/[^/?]+/);
  return new URL(page.url()).hash.split('?')[0];
}

async function measure(job) {
  const phase = await openPhase(job.phasePrefix);
  const id = await createStudy(phase, /^New — Before and after/i, job.evidence);
  const change = page.getByRole('radio', { name: /Did it really change/ });
  assert.equal(await change.getAttribute('aria-checked'), 'true', 'The phase row should select the before/after analysis');
  await page.getByRole('radio', { name: /^Measured/ }).click();
  await page.getByRole('radio', { name: /Lower is better/ }).click();
  await page.getByLabel('What is measured').fill('Cycle time');
  await page.getByLabel('Unit', { exact: true }).fill('s');
  await page.getByRole('button', { name: 'Agree these' }).click();
  for (const [group, values] of [['Before', '12\n13\n12\n13\n12\n13'], ['After', '8\n9\n8\n9\n8\n9']]) {
    await page.getByRole('radio', { name: new RegExp('^' + group) }).click();
    await page.getByLabel(/^Or paste readings/).fill(values);
    await page.getByRole('button', { name: 'Add these' }).click();
  }
  await page.locator('.ie-say').filter({ hasText: /Before 12\.50? s, after 8\.50? s/ }).waitFor();
  return id;
}

try {
  await openSeedPage(page, BASE);
  await page.evaluate(async () => { await (await import('/src/db.ts')).createWorkspace('Line 7'); });
  for (const job of methods) {
    await navigate('#/projects?new=1');
    await page.locator('.proj-model-opt').filter({ has: page.locator('.proj-model-t', { hasText: new RegExp('^' + job.method + '$') }) }).click();
    await page.getByRole('button', { name: 'Line 7', exact: true }).click();
    await page.locator('.proj-new-grid input.text-input').first().fill(job.name);
    await page.getByRole('button', { name: 'Create project' }).click();
    await page.locator('.pmethod').waitFor();
    const id = await measure(job);
    await returnFromStudy(job);
    const phase = await openPhase(job.phasePrefix);
    const phaseName = await phase.getAttribute('aria-label');
    await phase.getByLabel('Saved work for ' + phaseName, { exact: true }).getByText(job.evidence, { exact: false }).click();
    await page.waitForURL(url => url.hash.split('?')[0] === id);
    await page.locator('.ie-say').filter({ hasText: /Before 12\.50? s, after 8\.50? s/ }).waitFor();
    console.log('PASS ', job.method, 'saved and reopened the measured trial in', phaseName);

    if (job.method === 'DMAIC') {
      await returnFromStudy(job);
      const measurePhase = await openPhase('Measure');
      const gaugeId = await createStudy(measurePhase, /^New — Gauge R&R/i, 'Reference gauge trial');
      const gauge = page.getByRole('radio', { name: /How much of what we see is the measurement/ });
      assert.equal(await gauge.getAttribute('aria-checked'), 'true', 'Gauge R&R should already be selected');
      await page.getByLabel('What is measured').fill('Pin diameter');
      await page.getByLabel('Unit', { exact: true }).fill('mm');
      await page.getByLabel('The parts').fill('A, B, C, D, E, F, G, H, I, J');
      await page.getByLabel('The appraisers').fill('Sam, Joe, Pat');
      await page.getByRole('button', { name: 'Agree these' }).click();
      await page.getByLabel('Paste gauge R&R readings').waitFor();
      await returnFromStudy(job);
      await (await openPhase('Measure')).getByLabel('Saved work for Measure').getByText('Reference gauge trial', { exact: false }).click();
      await page.waitForURL(url => url.hash.split('?')[0] === gaugeId);
      await page.getByLabel('Paste gauge R&R readings').waitFor();
      console.log('PASS  DMAIC Measure opened Gauge R&R directly and reopened its saved design');
    }
  }
  for (const job of methods) {
    await projectFromList(job);
    await page.getByRole('button', { name: 'Project report', exact: true }).click();
    await page.getByText(job.evidence, { exact: false }).first().waitFor();
    const paper = await t.pdfText(() => page.getByRole('button', { name: 'Download PDF', exact: true }).click(), 'project-trial');
    assert.ok(paper.includes(job.evidence), 'PDF should identify the saved trial');
    assert.match(paper, /Before 12\.50? s, after 8\.50? s/, 'PDF should include the measured result');
    for (const other of methods.filter(other => other !== job)) {
      assert.ok(!paper.includes(other.evidence), 'PDF includes another same-line project: ' + other.name);
    }
    console.log('PASS ', job.method, 'customer PDF includes the measured result and excludes all six peer projects');
  }
} catch (error) {
  console.error('At', page.url(), '\n', (await page.locator('main').innerText().catch(() => '')).slice(0, 2500));
  await t.browser.close();
  throw error;
}
await t.finish('Project tools, saved phase evidence and seven isolated project PDFs verified.');
