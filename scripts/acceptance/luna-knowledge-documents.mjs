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
  const sourceId = await page.evaluate(async id => {
    const {putStudy,patchStudy} = await import('/src/db.ts');
    const {newConversation,appendAction} = await import('/src/colleague/conversation.ts');
    const {takeDocument} = await import('/src/capabilities/factoryBuild.ts');
    await putStudy(newConversation({id,at:Date.now(),name:'Named source fixture'}));
    const name='Bench-Layout.pdf', words='Fixture observation: the component tray is in the amber cabinet.';
    const source=await takeDocument({now:Date.now(),conversationId:id},{client:'Training fixture',file:{name,mime:'application/pdf',blob:new Blob([words])},text:words,readBy:'code',items:[]});
    if(!source.ok) throw new Error(source.why);
    await appendAction(patchStudy,id,{callId:'fixture-src',name:'factory_source',title:'Read a factory document',status:'done',says:'Document attached',refs:[{kind:'study',id:source.sourceId,label:name+' — factory source',href:''}],at:Date.now()});
    return source.sourceId;
  },cid+'-source');
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
    await doc.getByRole('heading',{name:/Why organise the work/}).waitFor();
    assert.equal(await doc.locator('[data-guide-figure="inspection"], [data-guide-figure="bench"]').count(),0);
    await doc.locator('.ai-report-download summary').click();
    const download = async button => {
      const pending = page.waitForEvent('download');
      await doc.locator(button).click();
      return readFile(await (await pending).path());
    };
    const pdf = await download('[data-report-pdf]');
    assert.doesNotMatch(pdf.toString('latin1'),/\/Width 1040\s+\/Height 532|\/Width 608\s+\/Height 467/);
    const deck=unzipSync(new Uint8Array(await download('[data-report-pptx]')));
    assert.equal(Object.keys(deck).filter(path=>/^ppt\/media\/.+\.jpe?g$/i.test(path)).length,0);
    console.log('PASS generic guide starts with its learning purpose on screen and omits stock pictures from PDF and slides.');
  }
  await ask('Turn that document into a html');
  await receipt('5S training guide').waitFor();
  if (phone) await receipt('5S training guide').click();
  await frame.getByRole('heading', { name: '5S training guide', exact: true }).waitFor();
  assert.equal(await frame.locator('section h2').count(), 8);
  assert.equal(await frame.locator('main > figure').count(),0);
  assert.match(await frame.locator('section h2').first().innerText(),/Why organise the work/);
  const barWidths=()=>page.locator('[data-artifact-preview]').evaluate(iframe=>[...iframe.contentDocument.querySelectorAll('.lg-track i')].map(el=>Math.round(parseFloat(el.style.width))));
  assert.deepEqual(await barWidths(),[100,39]);
  assert.equal(await frame.locator('[data-guide-figure="bench"],[data-guide-figure="inspection"]').count(),0);
  assert.match(await frame.locator('body').innerText(), /General guidance from Faultline/);
  assert.match(await frame.locator('body').innerText(), /red-tag/i);
  assert.match(await frame.locator('#s7').innerText(), /55 seconds less/);
  assert.match(await frame.locator('#s7').innerText(), /saleable output/);
  assert.equal(await frame.locator('.intro,script,.dashboard-grid').count(), 0);
  assert.equal(await page.locator('[data-artifact-preview]').evaluate(el=>el.contentDocument.documentElement.scrollWidth-el.contentDocument.documentElement.clientWidth),0);
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
    assert.match(html, /Facilitator check/);
    if (process.env.LUNA_SAMPLE_HTML) await file.saveAs(process.env.LUNA_SAMPLE_HTML);
    if (!origin) {
      const older = await page.evaluate(async cid => {
        const {getStudy} = await import('/src/db.ts');
        const {illustratedArtifact} = await import('/src/colleague/htmlArtifacts.ts');
        const record = await getStudy(cid);
        const saved = record.facts.htmlArtifacts[0];
        const original = '<!doctype html><html><head><style></style></head><body class="document"><main class="wrap" data-guide-layout="3"><header>Original edition</header><figure data-guide-figure="inspection">Former lead</figure><nav class="contents"></nav></main></body></html>';
        const legacy = {...saved,html:original};
        const upgraded = await illustratedArtifact(legacy,cid);
        const differentEdition = await illustratedArtifact({...legacy,reportVersion:0},cid);
        return {purposeFirst:!upgraded.html.includes('Former lead'),sameId:saved.id===upgraded.id,words:upgraded.html.includes('Original edition'),historical:differentEdition.html===original};
      },cid);
      assert.deepEqual(older,{purposeFirst:true,sameId:true,words:true,historical:true});
    }
    const offline = await page.context().newPage();
    await offline.route(/^https?:/, route => route.abort());
    await offline.setViewportSize({width:980,height:920});
    await offline.setContent(html);
    await offline.getByRole('heading',{name:'Why organise the work?'}).waitFor();
    assert.equal(await offline.locator('.lg-inspection,.lg-bench').count(),0);
    await offline.close();
    await ask('Write an illustrated 5S exercise and turn it into HTML');
    await frame.getByRole('heading',{name:'5S illustrated exercise',exact:true}).waitFor();
    const exercise=frame.locator('[data-guide-figure="inspection"]');
    await exercise.getByText('Check your decision').click();
    await exercise.getByText('Hold the kit',{exact:false}).waitFor();
    assert.match(await frame.locator('body').innerText(),/fictional exercise/);
    console.log('PASS kit appears in the explicitly requested illustrated exercise, labelled as a fictional scenario.');
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
    const control='Allergen label at handover';
    scripted=[{ok:true,calls:[{id:'brief',name:'build_report',input:{title:control,sections:[
      {kind:'text',heading:'Label release',text:'| Normal condition | Signal | Response |\n| --- | --- | --- |\n| Label matches the approved master | Code differs | Line lead holds the pack and asks quality to verify |'},
      {kind:'text',heading:'Example elapsed time',text:'| Condition | Check time (seconds) |\n| --- | --- |\n| Baseline example | 40 |\n| Trial example | 20 |'},
    ]}}],assistant:{v:1,rounds:['brief']}},{ok:true,reply:'The illustrative briefing is ready.'}];
    await ask('Write an HTML briefing on how to teach allergen label checks using a hypothetical example');
    await frame.getByRole('heading',{name:control,exact:true}).waitFor();
    await frame.locator('.lg-controls').getByText('Code differs',{exact:true}).waitFor();
    await frame.locator('.lg-control-state').getByText(/asks quality to verify/).waitFor();
    assert.deepEqual(await barWidths(),[100,50]);
    console.log('PASS standard, abnormal signal, owner response and comparable measures rendered from an unrelated authored example.');
    console.log('PASS custom Claude response fixture goes through the app’s authoring tool and preserves its specific instructions in HTML.');
    scripted = [{ok:true,reply:'# Label-change briefing\n\n## Before the switch\nCompare the approved artwork with the next product.\n\n## At handover\nAsk the incoming operator to identify the correct label and record the handover.'}];
    await ask('I need an HTML briefing about artwork checks before a label change');
    await frame.getByRole('heading', { name:'Label-change briefing', exact:true }).waitFor();
    assert.equal(await frame.locator('section h2').count(), 2);
    scripted = [{ok:true,reply:'Which approved procedure should the local briefing refer to?'}];
    await ask('Draft an HTML briefing using our actual local procedure for label release');
    await page.getByText(/What should I use for the procedure/).waitFor();
    const count = await page.locator('.luna-file-receipt').count();
    await ask('Turn that document into HTML');
    await page.getByText('Which document would you like to create? Give me a topic and an audience.',{exact:true}).waitFor();
    assert.equal(await page.locator('.luna-file-receipt').count(), count);
    console.log('PASS structured prose exports intact; an unanswered request cannot export an unrelated earlier document.');
    scripted=[];
    const nCalls=calls.length;
    await ask('Build me a 5S training guide for this workbench in HTML');
    await page.getByText(/What should I use for the workbench/).last().waitFor();
    assert.equal(calls.length,nCalls);
    assert.equal(await page.locator('.luna-file-receipt').count(),count);
    await ask('Use a general example');
    await frame.getByRole('heading',{name:'5S training guide',exact:true}).waitFor();
    assert.equal(calls.length,nCalls);
    assert.match(await frame.locator('body').innerText(), /General guidance from Faultline/);
    await ask('Write an HTML briefing about our packing station');
    await page.getByText(/What should I use for the station/).last().waitFor();
    const custom = 'Handover at the described station';
    scripted=[
      {ok:true,calls:[{id:'unrelated',name:'read_record',input:{studyId:'another-customers-study'}}],assistant:{v:1,rounds:['unrelated']}},
      {ok:true,calls:[{id:'grounded',name:'build_report',input:{title:custom,sections:[
        {kind:'text',heading:'Current condition',text:'The team describes yellow rolls beside the printer.'},
        {kind:'text',heading:'Trial at handover',text:'Ask the relief operator to identify the approved roll and record the outcome.'},
      ]}}],assistant:{v:1,rounds:['grounded']}},
      {ok:true,reply:'The draft uses your description of the station.'},
    ];
    await ask('Our station has yellow rolls beside the printer.');
    await frame.getByRole('heading',{name:custom,exact:true}).waitFor();
    assert.match(await frame.locator('body').innerText(),/Based on your description in this conversation/);
    assert.ok(calls.slice(nCalls).some(c=>JSON.stringify(c).includes('only its selected sources')));
    console.log('PASS missing workplace evidence asks once; general and described-site routes stay distinct and unrelated records cannot enter the brief.');
    if (origin) await page.goto(origin+'/#/ai?c='+cid+'-source');
    else await t.go('#/ai?c='+cid+'-source');
    const beforeFile=calls.length;
    await ask('Write a guide about this workbench using Bench-Layout.pdf and Missing-Floor.pdf');
    await page.getByText(/What should I use for the workbench/).last().waitFor();
    assert.equal(calls.length,beforeFile);
    scripted=[
      {ok:true,calls:[{id:'source',name:'read_record',input:{studyId:sourceId}}],assistant:{v:1,rounds:['source']}},
      {ok:true,calls:[{id:'document',name:'build_report',input:{title:'Component tray handover',sections:[{kind:'text',heading:'Where to look',text:'The supplied layout places the component tray in the amber cabinet.'}]}}],assistant:{v:1,rounds:['document']}},
      {ok:true,reply:'The briefing uses the supplied layout.'},
    ];
    await ask('Write an HTML briefing about this workbench using Bench-Layout.pdf');
    await frame.getByRole('heading',{name:'Component tray handover',exact:true}).waitFor();
    assert.match(await frame.locator('body').innerText(), /Based on “Bench-Layout.pdf”, read for this guide/);
    assert.ok(!JSON.stringify(calls[beforeFile]).includes('amber cabinet'));
    assert.ok(calls.slice(beforeFile+1).some(c=>JSON.stringify(c).includes('amber cabinet')));
    console.log('PASS an unavailable file cannot stand in for an available one; an actual content read grounds the named-file briefing.');
  }
  assert.deepEqual(t.errors, []);
} catch (e) {
  console.error((await page.locator('body').innerText().catch(() => '')).slice(-1700));
  throw e;
} finally {
  await t.browser.close();
}
