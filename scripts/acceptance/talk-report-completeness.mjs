/* Authored Line Talk / line-walk reports retain their complete native paper in every combined export.
 * Fictional records only. Two different photos both called P1 must remain different in the area's single PDF. */
import { BASE, openApp } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp(); const {page:p,ok}=t;
await t.go('#/room');
const fixture=await p.evaluate(async()=>{
  const db=await import('/src/db.ts');
  const core=await import('/src/db/core.ts');
  await (await core.getDB()).put('meta','11111111-1111-1111-1111-111111111111','org.mine');
  const w=await db.createWorkspace('Packaging alpha');
  await db.patchWorkspaceRecord(w.id,{assets:['Whole line','Washer'],siteName:'Test site',areaName:'Packing'});
  const at=Date.now();
  await db.addObservation({id:'timed-stop',workspaceId:w.id,category:'Unplanned stop',asset:'Washer',startedAt:at-600000,endedAt:at-180000,durationMs:420000,timing:'typed',count:1,media:[],createdAt:at,updatedAt:at});
  const walkId='acc00001-0000-4000-8000-000000000001';
  for(const [id,color,kind,body] of [['walk','#e73924','line-walk','Inspect the transfer guide after the next controlled stop.'],['engineering','#274ce2','engineering','Check the drive temperature before changing the speed.']]){
    const cv=document.createElement('canvas');cv.width=80;cv.height=60;const g=cv.getContext('2d');g.fillStyle=color;g.fillRect(0,0,80,60);
    const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/jpeg'));await db.putBlob(`picture-${id}`,blob);
    await db.putStudy({id:id==='walk' ? walkId : 'acc00002-0000-4000-8000-000000000002',tool:'talk',workspaceId:w.id,name:`Conversation ${id}`,uses:[],agreed:{},startedAt:at,createdAt:at,updatedAt:at,facts:{turns:[
      {id:`photo-${id}`,kind:'photo',at,media:{blobKey:`picture-${id}`,mime:'image/jpeg',capturedAt:at}},
      {id:`reply-${id}`,kind:'reply',at:at+1,text:'The saved authored output follows.',pdfs:id==='walk' ? [{id:'legacy-copy',key:'legacy-pdf',name:'Earlier-line-walk.pdf',at}] : [],doc:{title:`Authored ${id} report`,kind,status:{state:'watch',line:'A controlled check is required.'},sections:[{heading:`Detailed ${id} findings`,text:body,points:[{text:`Action from ${id}`,basis:'observed',owner:id==='walk'?'Alex':'Sam',due:'2026-12-02',state:'action'}],photos:[{photo:'P1',caption:`Distinct ${id} photograph`}]}]}}
    ]}});
  }
  const walk=await db.getStudy(walkId);
  await db.patchStudy(walkId,{facts:{...walk.facts,turns:[...walk.facts.turns,{id:'reply-follow-up',kind:'reply',at:at+2,doc:{title:'Follow-up summary',kind:'summary',sections:[{heading:'Follow-up',text:'A separate note from the same conversation.',points:[],photos:[]}]}}]}});
  await db.putStudy({id:'talk-spoken',tool:'talk',workspaceId:w.id,name:'Recorded observation',uses:[],agreed:{},startedAt:at,createdAt:at,updatedAt:at,facts:{turns:[{id:'spoken',kind:'said',at,heard:'The guide moves when the product crosses the transfer.'}]}});
  const {jsPDF}=await (await import('/src/lib/savePdf.ts')).loadPdfLib();const old=new jsPDF();old.text('Earlier saved line walk',20,20);await db.putBlob('legacy-pdf',old.output('blob'));
  const empty=await db.createWorkspace('No tool uses yet');await db.patchWorkspaceRecord(empty.id,{assets:['Whole line','Wrapper']});
  return {line:w.id,empty:empty.id,walk:walkId};
});
const dir=mkdtempSync(join(tmpdir(),'talk-report-'));
const readDownloaded=async(dl,name)=>{
  const path=join(dir,`${name}.pdf`);await dl.saveAs(path);
  const raw=execFileSync('pdftotext',['-raw',path,'-'],{encoding:'utf8'});return {path,text:raw.replace(/\s+/g,' ')};
};
const download=async(name,press)=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}),press()]);return readDownloaded(dl,name);};
const facts=['Inspect the transfer guide after the next controlled stop.','Check the drive temperature before changing the speed.','Action from walk','Action from engineering','Alex','Sam','Distinct walk photograph','Distinct engineering photograph'];
const complete=(pdf,label)=>ok(facts.every(f=>pdf.text.includes(f)),`${label}: authored bodies, actions, owners and photo captions retained`);
const counts=await p.evaluate(async id=>{
  const db=await import('/src/db.ts');const lines=await db.listWorkspaces(),studies=await db.listAllStudies();
  const records={lines,studies,machines:[],programs:[],jobLines:[],snags:[],standards:[],projectsOn:()=>[]};
  const {itemsOn}=await import('/src/line/report/lineBundle.ts');const {areaBundle}=await import('/src/line/report/areaBundle.ts');
  return {uses:itemsOn({id},records).length,area:areaBundle({site:'Test site',area:'Packing'},records).facts[0].toolsLately};
},fixture.line);
ok(counts.uses===3 && counts.area===3,'two documents from one conversation do not inflate the line or area tool-use counts');
await t.go(`#/lines/${fixture.line}?view=reports`);
await p.locator('[data-line-reports]').waitFor();
ok(await p.getByRole('button',{name:'Choose contents',exact:true}).isVisible(),'the line report starts with choosing its contents');
await p.getByText('Earlier-line-walk.pdf',{exact:true}).waitFor();
ok(await p.locator('[data-saved-report-list] [data-kept="legacy-copy"]').count()===1,'an older Line Talk PDF is visible directly in Saved reports');
const old=await download('legacy',()=>p.locator('[data-kept-down="legacy-copy"]').click());
ok(old.text.includes('Earlier saved line walk'),'the old saved report downloads its original bytes');
await p.getByRole('button',{name:'Choose contents',exact:true}).click();
const walk=p.getByRole('checkbox',{name:/^Line-walk report — Authored walk report/});
const engineering=p.getByRole('checkbox',{name:/^Engineering report — Authored engineering report/});
await walk.waitFor();
ok(await walk.isChecked() && await engineering.isChecked(),'each authored output is independently selected by default');
ok(await p.getByRole('checkbox',{name:'Problems report',exact:true}).count()===0 && await p.getByRole('checkbox',{name:'Programs report',exact:true}).count()===0 && await p.getByRole('checkbox',{name:'Test cards',exact:true}).count()===0,'empty sections have no switches that would do nothing');
ok(await p.locator('.lr-part .sg-tiles').count()===0 && await p.locator('[data-fold="line-package-order"] .fold-b').count()===0,'content selection comes first, with the detailed contents preview closed');
// Delay the real local stop reader. Auto-export must wait rather than capturing its initial empty maps.
let injected=false;
await p.route('**/src/db/observations.ts*',async route=>{
  const response=await route.fetch();const js=await response.text();
  const patched=js.replace('async function listObservations(workspaceId) {',`async function listObservations(workspaceId) {
    if(globalThis.__faultlineReportReads && /usePartReadings|useLooking/.test(new Error().stack ?? '')) {
      globalThis.__reportWaitSeen=true; await globalThis.__faultlineReportReads;
    }`);
  injected ||= patched!==js;await route.fulfill({response,body:patched});
});
await t.ctx.addInitScript(id=>{
  if(location.hash.startsWith(`#/lines/${id}/report`) && !sessionStorage.getItem('report-delay-proved'))
    globalThis.__faultlineReportReads=new Promise(resolve=>{globalThis.__releaseReportReads=resolve;});
},fixture.line);
let early=0;const countDownload=()=>early++;p.on('download',countDownload);
const pending=p.waitForEvent('download',{timeout:60000});
await openSeedPage(p,BASE);
await t.go(`#/lines/${fixture.line}/report?full=1&save=1`);
const button=p.getByRole('button',{name:'Download the full package',exact:true});
ok(injected && await p.evaluate(()=>!!globalThis.__reportWaitSeen) && early===0 && (!await button.count() || await button.isDisabled()),'automatic export waits for the saved stop/finding reads');
await p.evaluate(()=>{sessionStorage.setItem('report-delay-proved','1');globalThis.__releaseReportReads();});
const full=await readDownloaded(await pending,'full');p.off('download',countDownload);
complete(full,'Full line package');
const hasStop=/STOPS TIMED\s+7 min\s+lost in 1 stop/i.test(full.text);
ok(hasStop,`the first export includes all seven minutes of its saved timed stop instead of a premature zero${hasStop ? '' : ` — ${/STOPS TIMED.{0,110}/i.exec(full.text)?.[0] ?? 'tile missing'}`}`);
ok(full.text.includes('A separate note from the same conversation.'),'a second document in the same conversation is retained too');
ok(full.text.includes('The guide moves when the product crosses the transfer.'),'a conversation without an authored document retains its spoken transcript');
const preview=p.locator('[data-fold="line-package-order"]');
ok(await preview.count()===1,'the detailed package order remains available as an explicit preview');
if(await preview.count() && !await preview.locator('.fold-b').count())await preview.locator('.fold-toggle').click();
ok(await p.locator('[data-package] [data-group="Line Talk documents"]').count()===1,'authored documents stay together under one contents heading');
ok(await p.locator('.pdfr .sub').innerText()==='Download started.','the actual download receipt gives no obsolete Report-menu instruction');
ok(await p.locator('.pdfr a,.pdfr button').evaluateAll(xs=>xs.every(e=>{const r=e.getBoundingClientRect();return r.height>=44 && r.width>=44;})),'download Open/Send/Close controls meet the phone touch target');
await engineering.uncheck();
const selective=await download('selective',()=>p.getByRole('button',{name:'Download the full package',exact:true}).click());
ok(selective.text.includes(facts[0]) && !selective.text.includes(facts[1]),'unticking one document excludes its paper while retaining the other');
await t.go('#/area/report?site=Test+site&area=Packing');
const area=await download('area',()=>p.getByRole('button',{name:'Download',exact:true}).click());
complete(area,'Area report');
const images=execFileSync('pdfimages',['-list',area.path],{encoding:'utf8'}).split('\n').filter(l=>/^\s*\d+\s+\d+\s+image/.test(l)).map(l=>l.trim().split(/\s+/).slice(10,12).join(':'));
ok(new Set(images).size>=2,'two different conversations retain different P1 photo objects in one PDF');
await t.go(`#/talk/${fixture.walk}?doc=reply-walk`);
await p.locator('[data-doc="reply-walk"]').waitFor();
const single=await download('single-walk',()=>p.getByRole('button',{name:'Download PDF',exact:true}).click());
ok(single.text.includes(facts[0]) && single.text.includes('Alex'),'the individual report retains the same authored body and action');
const saved=await p.evaluate(async id=>{
  const all=await (await import('/src/lib/keptPdfs.ts')).listKept();
  return all.find(k=>k.studyId===id);
},fixture.walk);
ok(saved?.workspaceId===fixture.line && saved?.kind==='talk','a new individual export is catalogued for its actual line and Library');
await t.go(`#/lines/${fixture.line}?view=reports`);
ok(saved && await p.locator('[data-saved-report-list] .sc-n').filter({hasText:saved.name}).count()===1,'the same export is shown once when catalogued and kept in its conversation');
await t.go(`#/lines/${fixture.empty}/report?full=1`);
await p.getByRole('button',{name:'Download the full package',exact:true}).waitFor();
const bare=await download('bare-line',()=>p.getByRole('button',{name:'Download the full package',exact:true}).click());
ok(bare.text.includes('Wrapper'),'a line with no saved tool use still exports its machines');
for(const width of [360,820,1440]){
  await p.setViewportSize({width,height:900});await t.go(`#/lines/${fixture.line}?view=reports`);
  ok(await t.wide()<=1,`line reports fit ${width}px`);
}
await t.finish('Line Talk reports, independent selection, original saved copies and photos survive combined exports.');
