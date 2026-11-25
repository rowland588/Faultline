/* A saved tool can be reopened directly with no navigation history. Its return
 * follows that record's actual project, phase and physical line. */
import assert from 'node:assert/strict';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';

const t = await openApp({ width: 390, height: 844, mobile: true });
const { page } = t;
page.setDefaultTimeout(45000);
page.setDefaultNavigationTimeout(60000);
await openSeedPage(page, BASE);
const fixture = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { studyHref } = await import('/src/lib/studyLinks.ts');
  const { standardHref } = await import('/src/tools/linestandard/standard.ts');
  const a = await db.createWorkspace('Press A'), b = await db.createWorkspace('Press B');
  const project = name => db.createProject(name, '#333333', '', '', 'board', 'dmaic',
    name === 'Recovery return' ? 'line-recovery' : undefined, { lineIds: [a.id, b.id] });
  const recovery = await project('Recovery return'), normal = await project('Method return');
  const add = async (name, p, phase, line, extra = {}) => {
    const now = Date.now();
    const row = { id: crypto.randomUUID(), name, tool: 'capability', projectId: p?.id, workspaceId: line?.id, facts: {}, uses: [], startedAt: now, createdAt: now, updatedAt: now, ...extra };
    await db.putStudy(row, phase ? {projectId:p.id, method:'dmaic', section:phase} : undefined);
    return studyHref(row);
  };
  const baseline = await add('Initial reading', recovery, 'Measure', a);
  const followUp = await add('Follow-up reading', recovery, 'Control', b);
  const pilot = await add('Other project pilot', normal, 'Improve', b);
  const legacy = await add('Legacy reading', normal, null, a);
  const standalone = await add('Standalone reading', null, null, b);
  const standard = { id:crypto.randomUUID(),projectId:normal.id, workspaceId:b.id, product:'Packing standard', marks:[],sort:0,createdAt:1,updatedAt:1 };
  await db.putStandard(standard, {projectId:normal.id,method:'dmaic',section:'Control',standardView:'map'});
  const timing = await add('Timing on product', normal, 'Measure', b, {tool:'balance', standardId:standard.id});
  return {timing,a:a.id,b:b.id,recovery:recovery.id,normal:normal.id,baseline,followUp,pilot,legacy,standalone,standard:standardHref(standard,'map')};
});
const cold = async path => {
  await page.goto('about:blank');
  await page.goto(BASE + '/#' + path, { waitUntil: 'commit' });
};
try {
  for (const [path,phase,line,title] of [[fixture.baseline,'Measure',fixture.a,'Initial reading'],[fixture.followUp,'Control',fixture.b,'Follow-up reading']]) {
    await cold(path + '?phase=Define&project=' + fixture.normal);
    await page.getByRole('button',{name:new RegExp('Back to ' + phase + ' in Recovery return')}).click();
    const q = new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
    assert.equal(q.get('line'),line);
    assert.equal(q.get('phase'),phase);
    const ownPhase=page.getByRole('region',{name:phase+' phase',exact:true});
    const row=ownPhase.getByRole('link',{name:new RegExp(title)});
    await row.waitFor();
    assert.equal(await page.getByLabel('Line in this recovery program').inputValue(),line);
    await page.waitForFunction(name => {
      const rect = document.querySelector('section[aria-label="'+name+' phase"]').getBoundingClientRect();
      return rect.top >= -4 && rect.top < innerHeight / 2;
    }, phase);
    if (phase === 'Control') {
      const linePicker = page.getByLabel('Line in this recovery program');
      await linePicker.selectOption(fixture.a);
      await row.waitFor({ state: 'hidden' });
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('phase'), phase);
      await linePicker.selectOption(line);
      await row.waitFor();
    }
    await row.click();
    await page.waitForURL(url=>url.hash==='#'+path);
  }
  console.log('PASS  Two cold links for the same recovery tool return to different saved phases and lines, scroll into view and reopen the original record');
  for (const [path,phase,title] of [[fixture.pilot,'Improve','Other project pilot'],[fixture.standard,'Control','Packing standard'],[fixture.timing,'Measure','Timing on product']]) {
    await cold(path);
    await page.getByRole('button',{name:new RegExp('Back to ' + phase + ' in Method return')}).click();
    const section=page.locator('section.pmethod-sec[aria-label="'+phase+'"]');
    await section.getByLabel('Saved work for '+phase,{exact:true}).getByText(title,{exact:false}).waitFor();
    assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('line'),fixture.b);
    if (phase==='Improve') {
      await section.getByRole('button',{name:/^New — Before and after/}).click();
      await page.getByLabel('What is it of?').waitFor();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('line'),fixture.b);
    }
  }
  console.log('PASS  Generic project study and line standard return to their selected phase; the next tool keeps Press B');
  await cold(fixture.legacy);
  await page.getByRole('button',{name:'Back to Method return',exact:true}).click();
  await page.locator('.pmethod').waitFor();
  assert.equal(new URL(page.url()).hash.split('?')[0],'#/project/'+fixture.normal);
  assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('phase'),null);
  await cold(fixture.standalone+'?project='+fixture.normal+'&phase=Improve');
  await page.getByRole('navigation',{name:'You are in'}).getByRole('button',{name:'Press B — its first page'}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Back to .*Method return/}).count(),0);
  console.log('PASS  Unplaced study returns to its project and a standalone study keeps its standalone line navigation');
} catch (error) {
  console.error('At',page.url(),(await page.locator('main').innerText().catch(()=> '')).slice(0,900));
  await t.browser.close();
  throw error;
}
await t.finish('Contextual project tool returns verified on a phone.');
