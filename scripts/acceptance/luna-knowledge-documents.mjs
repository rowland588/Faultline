// Create and export operational guidance in an empty conversation. All records are synthetic.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { openApp } from '../lib/tocBrowser.mjs';

const phone = process.env.LUNA_DOCUMENT_PHONE === '1';
const viewport = { width: phone ? 390 : 1440, height: phone ? 844 : 900 };
const t = await openApp({ ...viewport, args: ['--disable-gpu', '--disable-webgl'], serviceWorkers: 'allow' });
let page = t.page;
const cid = 'knowledge-documents-fixture';
try {
  await t.seed();
  await page.evaluate(async id => {
    const { putStudy } = await import('/src/db.ts');
    const { newConversation } = await import('/src/colleague/conversation.ts');
    await putStudy(newConversation({ id, at: Date.now(), name: 'Training materials' }));
  }, cid);
  const origin = process.env.LUNA_DOCUMENT_ORIGIN;
  if (origin) {
    const state = await t.ctx.storageState({ indexedDB: true });
    for (const site of state.origins) {
      site.origin = origin;
      for (const entry of site.localStorage) {
        if (entry.name === 'sb-testproj-auth-token') entry.name = 'sb-eqdigvzbljofxznqtfia-auth-token';
      }
    }
    const ctx = await t.browser.newContext({ storageState: state, viewport, serviceWorkers: 'block', ignoreHTTPSErrors: true });
    await ctx.route('**://*.supabase.co/**', route => route.abort());
    page = await ctx.newPage();
    page.on('pageerror', e => t.errors.push(e.message));
  }
  page.setDefaultTimeout(20000);
  const calls = [];
  let scripted = [];
  await page.route('**/functions/v1/assist', route => {
    calls.push(route.request().postDataJSON());
    return scripted.length ? route.fulfill({ json: scripted.shift() }) : route.abort();
  });
  if (origin) await page.goto(origin + '/#/ai?c=' + cid);
  else await t.go('#/ai?c=' + cid);

  const ask = async words => {
    await page.locator('.ai-box:visible').fill(words);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
  };
  const receipt = title => page.locator('.luna-file-receipt').filter({ hasText: title }).last();
  const frame = page.frameLocator('[data-artifact-preview]');
  await ask('Build me a 5s trainining document');
  await page.getByText('I’ve written “5S training guide”.', { exact: true }).waitFor();
  assert.equal(await page.locator('.ai-box:visible').count(), 1);
  await ask('Turn that document into a html');
  await receipt('5S training guide').waitFor();
  if (phone) await receipt('5S training guide').click();
  await frame.getByRole('heading', { name: '5S training guide', exact: true }).waitFor();
  assert.equal(await frame.locator('section h2').count(), 7);
  assert.match(await frame.locator('body').innerText(), /red-tag/);
  assert.match(await frame.locator('#s6').innerText(), /Answer: Sort/);
  assert.equal(await frame.locator('.intro,script,.dashboard-grid').count(), 0);
  const id = await page.locator('[data-artifact-preview]').getAttribute('data-artifact-preview');
  assert.equal(await page.getByRole('button', { name: 'Yes, track changes' }).count(), 0);
  assert.equal(calls.length, 0);
  console.log('PASS 5S guide with practice and answers, saved to Artifacts without files or an AI call.');
  if (!phone) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download HTML', exact: true }).click();
    const file = await downloading;
    const html = await readFile(await file.path(), 'utf8');
    assert.match(html, /<body class="document">/);
    assert.match(html, /Facilitator close/);
    if (process.env.LUNA_SAMPLE_HTML) await file.saveAs(process.env.LUNA_SAMPLE_HTML);
    await ask('Build a training guide on SMED and turn it into HTML');
    await frame.getByRole('heading', { name: 'SMED training guide', exact: true }).waitFor();
    assert.match(await frame.locator('body').innerText(), /changeover/i);
    assert.notEqual(await page.locator('[data-artifact-preview]').getAttribute('data-artifact-preview'), id);
    await ask('Save the 5S training guide as HTML');
    await frame.getByRole('heading', { name: '5S training guide', exact: true }).waitFor();
    assert.equal(await page.locator('[data-artifact-preview]').getAttribute('data-artifact-preview'), id);
    assert.equal(calls.length, 0);
    console.log('PASS one-step SMED document, named re-export, stable file identity and standalone download.');
    const title = 'Mixed-product shift handover';
    const sections = [
      {kind:'text', heading:'Prepare the incoming lead', text:'Walk the packing line with the relief lead and identify the current product and its approved label.'},
      {kind:'text', heading:'Check the handover', text:'Ask the relief lead to explain what changed and who owns the open checks.'},
    ];
    scripted = [
      {ok:true, calls:[{id:'authored', name:'build_report', input:{title,sections}}],assistant:{v:1,rounds:['authored']}},
      {ok:true,reply:'The handover briefing is ready.'},
    ];
    await ask('Write an HTML briefing for shift leads about handing over a mixed-product packaging line during a staffing change');
    await frame.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.match(await frame.locator('body').innerText(), /relief lead/);
    assert.ok(calls.some(c => JSON.stringify(c).includes('written operational document')));
    console.log('PASS custom Claude response fixture goes through the app’s authoring tool and preserves its specific instructions in HTML.');
    scripted = [{ok:true,reply:'# Label-change briefing\n\n## Before the switch\nCompare the approved artwork with the next product.\n\n## At handover\nAsk the incoming operator to identify the correct label and record the handover.'}];
    await ask('I need an HTML briefing about artwork checks before a label change');
    await frame.getByRole('heading', { name:'Label-change briefing', exact:true }).waitFor();
    assert.equal(await frame.locator('section h2').count(), 2);
    scripted = [{ok:true,reply:'Which approved procedure should the local briefing refer to?'}];
    await ask('Draft an HTML briefing using our actual local procedure for label release');
    await page.getByText('Which approved procedure should the local briefing refer to?', {exact:true}).waitFor();
    const count = await page.locator('.luna-file-receipt').count();
    await ask('Turn that document into HTML');
    await page.getByText('Which document would you like to create? Give me a topic and an audience.',{exact:true}).waitFor();
    assert.equal(await page.locator('.luna-file-receipt').count(), count);
    console.log('PASS structured prose exports intact; an unanswered request cannot export an unrelated earlier document.');
  }
  assert.deepEqual(t.errors, []);
} catch (e) {
  console.error((await page.locator('body').innerText().catch(() => '')).slice(-1700));
  throw e;
} finally {
  await t.browser.close();
}
