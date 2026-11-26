// Create and export operational guidance in an empty conversation. All records are synthetic.
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
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
  await page.evaluate(async () => {
    const { libraryDocument, writingRequest } = await import('/src/colleague/knowledgeDocuments.ts');
    const { methodRecords } = await import('/src/catalogue/methodIndex.ts');
    const { buildReport } = await import('/src/capabilities/data.ts');
    for (const method of methodRecords()) {
      const request = writingRequest('Build a training guide on ' + method.name);
      const draft = request && libraryDocument(request);
      if (!draft || !buildReport.validate(draft).ok) throw new Error('Cannot save the full catalogue topic: ' + method.name);
    }
  });
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
  if (!phone) {
    const doc = page.locator('[data-report-doc]:visible').first();
    await doc.locator('[data-guide-figure="bench"] img').last().waitFor();
    await doc.locator('.ai-report-download summary').click();
    const download = async button => {
      const pending = page.waitForEvent('download');
      await doc.locator(button).click();
      return readFile(await (await pending).path());
    };
    const pdf = await download('[data-report-pdf]');
    assert.equal((pdf.toString('latin1').match(/\/Width 608\s+\/Height 467/g) ?? []).length, 2);
    const deck = unzipSync(new Uint8Array(await download('[data-report-pptx]')));
    assert.ok(Object.keys(deck).filter(path => /^ppt\/media\/.+\.jpe?g$/i.test(path)).length >= 2);
    console.log('PASS native document, PDF and slide deck contain the packing bench comparison.');
  }
  await ask('Turn that document into a html');
  await receipt('5S training guide').waitFor();
  if (phone) await receipt('5S training guide').click();
  await frame.getByRole('heading', { name: '5S training guide', exact: true }).waitFor();
  assert.equal(await frame.locator('section h2').count(), 7);
  assert.match(await frame.locator('body').innerText(), /red-tag/);
  assert.match(await frame.locator('#s6').innerText(), /Answer: Sort/);
  assert.equal(await frame.locator('.intro,script,.dashboard-grid').count(), 0);
  const figure = frame.locator('[data-guide-figure="bench"]');
  const metrics = await page.locator('[data-artifact-preview]').evaluate(async iframe => {
    const doc = iframe.contentDocument;
    const images = [...doc.querySelectorAll('[data-guide-figure="bench"] img')];
    await Promise.all(images.map(image => image.decode()));
    return {count:images.length, embedded:images.every(i=>i.naturalWidth===608 && i.src.startsWith('data:image/jpeg;base64,') && !!i.alt), overflow:doc.documentElement.scrollWidth-doc.documentElement.clientWidth};
  });
  assert.deepEqual(metrics,{count:2,embedded:true,overflow:0});
  await figure.locator('summary').click();
  await figure.getByText(/The gun has a visible home/).waitFor();
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
    if (!origin) {
      const older = await page.evaluate(async cid => {
        const {getStudy} = await import('/src/db.ts');
        const {illustratedArtifact} = await import('/src/colleague/htmlArtifacts.ts');
        const record = await getStudy(cid);
        const saved = record.facts.htmlArtifacts[0];
        const original = '<!doctype html><html><head><style></style></head><body class="document"><main class="wrap"><header>Original edition</header><nav class="contents"></nav></main></body></html>';
        const legacy = {...saved,html:original};
        const upgraded = await illustratedArtifact(legacy,cid);
        const differentEdition = await illustratedArtifact({...legacy,reportVersion:0},cid);
        return {illustrated:upgraded.html.includes('data-guide-figure="bench"'),sameId:saved.id===upgraded.id,words:upgraded.html.includes('Original edition'),historical:differentEdition.html===original};
      },cid);
      assert.deepEqual(older,{illustrated:true,sameId:true,words:true,historical:true});
    }
    const offline = await page.context().newPage();
    await offline.route(/^https?:/, route => route.abort());
    await offline.setViewportSize({width:980,height:920});
    await offline.setContent(html);
    const example = offline.locator('[data-guide-figure="bench"]');
    await example.locator('img').first().evaluate(image => image.decode());
    assert.equal(await example.locator('img').last().evaluate(image => image.naturalWidth),608);
    if (process.env.LUNA_GUIDE_PREVIEW) {
      await example.locator('summary').click();
      await example.locator('.lg-pin').first().waitFor({state:'visible'});
      await example.screenshot({path:process.env.LUNA_GUIDE_PREVIEW});
    }
    await offline.close();
    await ask('Build a training guide on SMED and turn it into HTML');
    await frame.getByRole('heading', { name: 'SMED training guide', exact: true }).waitFor();
    await frame.locator('[data-guide-figure="changeover"]').getByText('Change between good packs').waitFor();
    assert.notEqual(await page.locator('[data-artifact-preview]').getAttribute('data-artifact-preview'), id);
    await ask('Save the 5S training guide as HTML');
    await frame.getByRole('heading', { name: '5S training guide', exact: true }).waitFor();
    assert.equal(await page.locator('[data-artifact-preview]').getAttribute('data-artifact-preview'), id);
    await ask('Make it more visual');
    await page.waitForFunction(() => document.querySelectorAll('.luna-file-receipt').length >= 4);
    assert.equal(await page.locator('[data-artifact-preview]').getAttribute('data-artifact-preview'),id);
    assert.equal(calls.length, 0);
    console.log('PASS one-step SMED document, named re-export, stable file identity and standalone download.');
    const title = 'Mixed-product shift handover';
    const sections = [
      {kind:'text', heading:'Prepare the incoming lead', text:'Walk the packing line with the relief lead and identify the current product and its approved label.'},
      {kind:'text', heading:'Check the handover', text:'| Check | Owner |\n| --- | --- |\n| Approved label | Relief lead |\n| Line clearance | Outgoing lead |'},
    ];
    scripted = [
      {ok:true, calls:[{id:'authored', name:'build_report', input:{title,sections}}],assistant:{v:1,rounds:['authored']}},
      {ok:true,reply:'The handover briefing is ready.'},
    ];
    await ask('Write an HTML briefing for shift leads about handing over a mixed-product packaging line during a staffing change');
    await frame.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.match(await frame.locator('body').innerText(), /relief lead/);
    await frame.getByRole('rowheader',{name:'Line clearance'}).waitFor();
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
