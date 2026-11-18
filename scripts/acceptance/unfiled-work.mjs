/* Capture before place: the same notes, report, photo and PDF survive reopening and later area/line assignment. */
import {openApp} from '../lib/tocBrowser.mjs';
import {mkdirSync} from 'node:fs';
const t=await openApp();const {page:p,ok}=t;const sd=await t.seed();
const context=await p.evaluate(async id=>{
  const db=await import('/src/db.ts');
  await db.patchWorkspaceRecord(id,{clientName:'Alpha',siteName:'Hull',areaName:'Packing'});
  const other=await (await import('/src/lib/lines.ts')).addLineToFactory('Beta line');
  await db.patchWorkspaceRecord(other.id,{clientName:'Beta',siteName:'York',areaName:'Finishing'});
  (await import('/src/lib/activeClient.ts')).setActiveClient('Alpha');
  return {line:id};
},sd.wsId);
await t.go('#/talk');
await p.getByRole('button',{name:'Start a Line Talk',exact:true}).click();
await p.waitForURL(/#\/talk\/[^/?]+/);
await p.locator('.wrap.tk[data-talk]').waitFor();const id=await p.locator('.wrap.tk[data-talk]').getAttribute('data-talk');
await p.locator('.tk-box').fill('UNFILED_OBSERVATION: the dispatch barrier needs a repair.');
await p.getByRole('button',{name:'Send',exact:true}).click();
await p.waitForFunction(async id=>(await (await import('/src/db.ts')).getStudy(id)).facts.turns.some(t=>t.kind==='typed'&&t.text.includes('UNFILED_OBSERVATION')),id);
await p.waitForFunction(()=>!document.querySelector('.tk-send')?.disabled);
ok((await p.locator('[data-record-location]').innerText()).includes('Saved in Unfiled work'),'a location-free capture says where it is saved');
const baseline=await p.evaluate(async id=>{
  const db=await import('/src/db.ts');const at=Date.now();
  const cv=document.createElement('canvas');cv.width=40;cv.height=30;const g=cv.getContext('2d');g.fillStyle='#deee83';g.fillRect(0,0,40,30);g.fillStyle='#272b24';g.fillRect(4,4,32,8);
  const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/jpeg'));await db.putBlob('unfiled-photo',blob);
  await db.patchStudy(id,s=>({facts:{...s.facts,turns:[...(s.facts.turns??[]),{id:'photo-kept',kind:'photo',at,media:{blobKey:'unfiled-photo',mime:'image/jpeg',capturedAt:at}},{id:'unfiled-report',kind:'reply',at:at+1,text:'The report is ready.',doc:{kind:'line-walk',title:'Dispatch walk before setup',sections:[{heading:'Observation',text:'UNFILED_REPORT_BODY: repair the barrier.',points:[{text:'Fit the guard before restarting.',basis:'observed',owner:'Sam',due:''}],photos:[{photo:'P1',caption:'Original barrier photograph'}]}]}}]}}));
  return {lines:(await (await import('/src/lib/lines.ts')).liveProductionLines(await db.listWorkspaces())).length};
},id);
await t.go(`#/talk/${id}?doc=unfiled-report`);
const originalPdf=await t.pdfText(()=>p.getByRole('button',{name:'Download PDF',exact:true}).click(),'unfiled-original');
ok(originalPdf.includes('UNFILED_REPORT_BODY')&&originalPdf.includes('Original barrier photograph'),'the unfiled report can be downloaded before any location exists');
const before=await p.evaluate(async id=>{const s=await(await import('/src/db.ts')).getStudy(id);return {facts:s.facts,owner:s.ownerId};},id);
await p.reload();await p.locator('.tk-docv').waitFor();
await t.go('#/room');await p.locator('[data-unfiled-work]').waitFor();await p.locator('[data-unfiled-work]').click();
await p.getByRole('heading',{name:'Unfiled work',exact:true}).waitFor();
ok(await p.evaluate(async id=>{const s=await(await import('/src/db.ts')).getStudy(id);return !s.workspaceId&&s.facts.turns.some(t=>t.text?.includes('UNFILED_OBSERVATION'));},id),'the exact saved capture still has no location after reload');
ok(await p.evaluate(()=>localStorage.getItem('faultline.client')===''),'Factory opens Unfiled work for All clients');
const row=p.locator(`[data-use="study:${id}"]`);
try{await row.waitFor();}catch(error){console.log('Unfiled reopen diagnostic',await p.evaluate(async id=>{const db=await import('/src/db.ts'),s=await db.getStudy(id);return {hash:location.hash,client:localStorage.getItem('faultline.client'),record:s&&{id:s.id,tool:s.tool,workspaceId:s.workspaceId,projectId:s.projectId,deletedAt:s.deletedAt},rows:[...document.querySelectorAll('[data-use]')].map(e=>e.getAttribute('data-use')),text:document.querySelector('.nv-main')?.textContent?.slice(0,1400)};},id));throw error;}
await row.locator('a').click();
await p.locator(`[data-talk="${id}"]`).waitFor();
ok((await p.locator('[data-talk]').innerText()).includes('UNFILED_OBSERVATION'),'Factory reopens the original saved capture after leaving and reload');
const area=await p.evaluate(async()=>{
  const db=await import('/src/db/departments.ts');await db.addDepartment({client:'Alpha',site:'Hull',area:'Dispatch'});
  return {key:(await import('/src/lib/areas.ts')).areaKey({client:'Alpha',site:'Hull',area:'Dispatch'})};
});
await p.locator('[data-record-location]').getByRole('button',{name:'Set location',exact:true}).click();
await p.locator('[data-area-choice]').filter({hasText:'Hull › Dispatch'}).filter({hasText:'Alpha'}).click();
await p.waitForFunction(()=>!history.state?.flPanel);
const placed=await p.evaluate(async id=>{const db=await import('/src/db.ts');const s=await db.getStudy(id);const w=await db.getWorkspace(s.workspaceId);return {facts:s.facts,owner:s.ownerId,workspace:s.workspaceId,area:w.areaName,type:w.lineType,lines:(await(await import('/src/lib/lines.ts')).liveProductionLines(await db.listWorkspaces())).length};},id);
ok(placed.area==='Dispatch'&&placed.lines===baseline.lines,'a newly registered area accepts the walk without creating a production line');
ok(JSON.stringify(placed.facts)===JSON.stringify(before.facts)&&placed.owner===before.owner,'filing keeps every turn, document clock, original photo, saved PDF and owner');
await t.go('#/area?client=Alpha&site=Hull&area=Dispatch&view=tools');
await p.locator(`[data-area-tools] [data-card*="${id}"]`).click();await p.locator(`[data-talk="${id}"]`).waitFor();
ok(true,'the area Tools page opens the exact original capture');
await t.go('#/area/report?client=Alpha&site=Hull&area=Dispatch');
const areaPdf=await t.pdfText(()=>p.getByRole('button',{name:'Download',exact:true}).click(),'area-unfiled-walk');
ok(areaPdf.includes('UNFILED_REPORT_BODY')&&areaPdf.includes('Original barrier photograph')&&areaPdf.includes('Sam'),'the area report includes the placed walk body, photograph caption and owner');
await t.go(`#/talk/${id}`);await p.locator('[data-record-location]').getByRole('button',{name:'Change location',exact:true}).click();
await p.locator(`[data-place-choice="line"][data-workspace="${context.line}"]`).click();await p.waitForFunction(()=>!history.state?.flPanel);
ok(await p.evaluate(async ([id,ws])=>(await(await import('/src/db.ts')).getStudy(id)).workspaceId===ws,[id,context.line]),'a walk can later move from its area onto a real line');
const luna=await p.evaluate(async line=>{
  const db=await import('/src/db.ts'),c=await import('/src/colleague/conversation.ts');
  const id='unfiled-luna',s=c.newConversation({id,at:Date.now(),name:'Walk debrief',thread:{id:'line-subject',title:'Existing line discussion',scope:{lineId:line}}});
  s.facts.threads=[...s.facts.threads,{id:'loose-subject',title:'Unplaced dispatch discussion',status:'parked',scope:{},notes:[],refs:[],at:Date.now()}];
  s.facts.turns=[{id:'reply',kind:'reply',at:Date.now(),text:'LUNA_UNFILED_ADVICE: inspect the barrier.',actionScope:{}}];await db.putStudy(s);return id;
},context.line);
await t.go('#/tools?view=saved&place=unfiled');
const subject=p.locator(`[data-use="luna:${luna}:loose-subject"]`);await subject.waitFor();await subject.locator('a').click();
await p.waitForFunction(async id=>(await(await import('/src/db.ts')).getStudy(id)).facts.threads.find(t=>t.status==='current')?.id==='loose-subject',luna);
await p.locator('[data-record-location]').getByRole('button',{name:'Set location',exact:true}).click();await p.locator('[data-area-choice]').filter({hasText:'Hull › Dispatch'}).filter({hasText:'Alpha'}).click();await p.waitForFunction(()=>!history.state?.flPanel);
const scopes=await p.evaluate(async id=>(await(await import('/src/db.ts')).getStudy(id)).facts,luna);
ok(scopes.threads.find(t=>t.id==='loose-subject').scope.lineId===placed.workspace&&scopes.threads.find(t=>t.id==='line-subject').scope.lineId===context.line&&scopes.turns[0].actionScope.lineId===undefined,'filing one Luna subject preserves the other subject and the earlier reply scope');
await t.go('#/area?client=Alpha&site=Hull&area=Dispatch&view=tools');
ok((await p.locator('[data-luna-saved-work]').innerText()).includes('Unplaced dispatch discussion'),'the filed Luna subject is reachable in the area without copying its conversation');
await t.go('#/tools?view=saved&place=unfiled');
ok(await p.locator('[data-use]').filter({hasText:'department'}).count()===0,'area definitions are not misleading unfiled captures');
const out=process.env.UI_REVIEW_SHOTS;if(out)mkdirSync(out,{recursive:true});
for(const width of [360,820,1440]){
  await p.setViewportSize({width,height:1000});
  await t.go('#/tools?view=saved');ok(await t.wide()<=1,`saved work fits ${width}px`);if(out)await p.screenshot({path:`${out}/saved-${width}.png`,fullPage:true});
  await t.go(`#/talk/${id}`);const change=p.locator('[data-record-location]').getByRole('button',{name:'Change location',exact:true});
  ok((await change.boundingBox()).height>=44,`the saved-location control is a touch target at ${width}px`);await change.click();
  ok(await t.wide()<=1,`the area/line picker fits ${width}px`);if(out)await p.screenshot({path:`${out}/picker-${width}.png`,fullPage:true});
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!history.state?.flPanel);
}
await t.finish('Capture first, reopen from Factory, file to an area/line and retain the original work and reports.');
