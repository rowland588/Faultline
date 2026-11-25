import { more, paper, scopePage } from '../lib/pageHeader.mjs';
import { mkdirSync } from 'node:fs';
import {openApp} from '../lib/tocBrowser.mjs';
const t=await openApp();const {page:p,ok}=t;const sd=await t.seed();
const data=await p.evaluate(async ws=>{
 const db=await import('/src/db.ts');const all=await db.listAllStudies();const old=all.find(s=>s.tool==='capability' && !s.deletedAt);const now=Date.now();
 const s={...old,id:crypto.randomUUID(),name:'Independent film check',workspaceId:ws,projectId:undefined,uses:[],createdAt:now,updatedAt:now};await db.putStudy(s);
 return {id:s.id,href:(await import('/src/lib/studyLinks.ts')).studyHref(s),problems:(await db.listAllSnags()).length,facts:s.facts};
},sd.wsId);
await t.go(`#${data.href}`);
await p.locator('.ep-tool-band [data-create-action]').click();
const d=p.getByRole('dialog');await d.getByLabel('Action',{exact:true}).fill('Set and verify wrapper film tension');
await d.getByLabel('Whose is it',{exact:true}).fill('Rowland');await d.getByLabel('By when',{exact:true}).fill('2026-11-24');
await d.getByRole('button',{name:'Save',exact:true}).click();await d.waitFor({state:'hidden'});
const a=await p.evaluate(async()=> (await (await import('/src/db.ts')).listAllPaceTodos()).find(a=>a.what==='Set and verify wrapper film tension'));
ok(!!a && a.standalone && !a.projectId && a.who==='Rowland' && a.due==='2026-11-24','standalone saved use creates a real owned/dated action without a project');
ok(a.sources.some(s=>s.id===data.id),'the action retains its exact saved-use source');
ok(await p.evaluate(async n=>(await (await import('/src/db.ts')).listAllSnags()).length===n,data.problems),'creating an action does not create or duplicate a fault');
const sourcePaper=await t.pdfText(()=>paper(p,/on paper$/),'tool-follow-up');
ok(sourcePaper.includes('Set and verify wrapper film tension') && sourcePaper.includes('Rowland') && !sourcePaper.includes('Nothing raised from it yet.'),'the tool paper retains its owned follow-up and does not falsely say nothing was raised');
await p.locator('.nv-rail .nv-ri').filter({hasText:/^Actions$/}).click();
await p.getByRole('heading',{name:'Actions',exact:true}).waitFor();
await p.locator('.act').getByRole('button').filter({hasText:'Set and verify wrapper film tension'}).first().click();
await p.locator('[data-independent-action]').waitFor();
ok(await p.getByLabel('Action owner',{exact:true}).inputValue()==='Rowland','the shared action tracker reopens the same owner');
ok((await p.locator('.action-progress').getAttribute('open')) === null,'new actions open on the commitment, with progress available in one disclosure');
await p.locator('.action-progress summary').click();
await p.getByLabel('Action outcome',{exact:true}).fill('Tension set. A verification run is still required.');
await p.getByRole('dialog').getByLabel('Action status',{exact:true}).selectOption('done');
await p.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
const closed=await p.evaluate(async id=>(await (await import('/src/db.ts')).listAllPaceTodos()).find(a=>a.id===id),a.id);
ok(closed.state==='done' && !!closed.doneOn && closed.outcome.includes('still required'),'completion keeps its outcome without claiming verified improvement');
await p.getByRole('tab',{name:'Completed',exact:true}).click();
await p.locator('.act').getByRole('button').filter({hasText:'Set and verify wrapper film tension'}).first().click();
await p.locator('[data-independent-action]').waitFor();
ok(await p.getByLabel('Action outcome',{exact:true}).inputValue() === 'Tension set. A verification run is still required.','completed work remains directly reachable in Actions');
await p.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});
const closedPaper=await t.pdfText(()=>paper(p,'The action list'),'completed-actions');
ok(closedPaper.includes('Tension set. A verification run is still required.') && closedPaper.includes('Independent film check') && closedPaper.includes('Completed'),'completed action paper keeps its outcome, source and honest completion status');
await t.go(`#${data.href}`);
await p.locator(`[data-actions-from="${data.id}"]`).getByRole('button',{name:'Set and verify wrapper film tension',exact:true}).click();
await p.locator('[data-independent-action]').waitFor();
ok((await p.locator('[data-action-sources]').innerText()).includes('Independent film check'),'the source remains visible after completion and reopening');
await p.locator('[data-action-sources] a').filter({hasText:'Independent film check'}).click();
await p.getByRole('heading',{name:'Independent film check',exact:true}).waitFor();
ok(await p.getByRole('dialog').count()===0,'opening the source closes the task editor and reveals the original record');
// Multiple tasks from the same finding retain independent owner, date and lifecycle.
const fixture=await p.evaluate(async ws=>{
 const db=await import('/src/db.ts');const now=Date.now();const problem={id:crypto.randomUUID(),workspaceId:ws,problem:'Film breaks at the wrapper guide',status:'open',raisedAt:now,updatedAt:now,media:[],priority:'high',targetAsset:'Wrapper'};await db.addSnag(problem);
 const project=(await db.allProjects()).find(p=>!p.archivedAt && !p.deletedAt);
 const target={id:crypto.randomUUID(),projectId:project.id,what:'Verify wrapper adjustment',why:'Project follow-up',who:'Dave',where:'Wrapper',when:'',state:'todo',createdAt:now,updatedAt:now};await db.putPaceTodo(target);
 const test=(await db.listAllTests()).find(t=>!t.deletedAt);await db.putTest({...test,docs:[]});
 const {newConversation}=await import('/src/colleague/conversation.ts');const c=newConversation({id:crypto.randomUUID(),at:now,name:'Wrapper investigation',thread:{id:'wrapper',title:'Wrapper',scope:{lineId:ws}}});c.workspaceId=undefined;
 c.facts.turns=[{id:'finding-reply',kind:'reply',actionScope:{lineId:ws},at:now,text:'Inspect the guide alignment and verify the result with a controlled trial.',used:[{callId:'made-report',name:'compose_report',title:'Investigation note',kind:'local',status:'done',says:'Saved report',refs:[{kind:'convreport',id:'wrapper-report@1',label:'Wrapper investigation note',href:''}],at:now}]}];
 c.facts.reports=[{id:'wrapper-report',title:'Wrapper investigation note',form:'report',sections:[{id:'recommendation',kind:'recommendation',heading:'Next step',text:'Inspect guide alignment.',basis:'colleague'}],at:now,updated:now,version:1}];await db.putStudy(c);
 return {problemId:problem.id,problemCount:(await db.listAllSnags()).length,projectId:project.id,targetId:target?.id,testId:test?.id,conversationId:c.id};
},sd.wsId);
const create=async(what,who,due)=>{
 await p.getByRole('button',{name:'Create action',exact:true}).last().click();
 const form=p.getByRole('dialog',{name:'Create action',exact:true});await form.getByLabel('Action',{exact:true}).fill(what);await form.getByLabel('Whose is it',{exact:true}).fill(who);await form.getByLabel('By when',{exact:true}).fill(due);await form.getByRole('button',{name:'Save',exact:true}).click();await form.waitFor({state:'hidden'});
};
await t.go(`#/snags?open=${fixture.problemId}`);
await create('Align the wrapper guide','Sam','2026-11-25');
await create('Run the controlled film trial','Priya','2026-11-26');
await p.locator(`[data-actions-from="${fixture.problemId}"]`).getByRole('button',{name:'Align the wrapper guide',exact:true}).waitFor();
const tasks=await p.evaluate(async id=>(await (await import('/src/db.ts')).listAllPaceTodos()).filter(a=>a.sources?.some(s=>s.kind==='problem' && s.id===id)),fixture.problemId);
ok(tasks.length===2 && tasks.some(a=>a.who==='Sam' && a.due==='2026-11-25') && tasks.some(a=>a.who==='Priya' && a.due==='2026-11-26'),'one problem creates two separately owned and dated actions');
await p.locator(`[data-actions-from="${fixture.problemId}"]`).getByRole('button',{name:'Align the wrapper guide',exact:true}).click();
await p.locator('.action-progress summary').click();
await p.getByRole('dialog',{name:'Action',exact:true}).getByLabel('Action status').selectOption('done');
await p.getByRole('dialog',{name:'Action',exact:true}).getByLabel('Action outcome').fill('Guide adjusted; controlled trial still outstanding.');
await p.getByRole('dialog',{name:'Action',exact:true}).getByRole('button',{name:'Save',exact:true}).click();
const independent=await p.evaluate(async id=>{const db=await import('/src/db.ts');return {problem:await db.getSnag(id),tasks:(await db.listAllPaceTodos()).filter(a=>a.sources?.some(s=>s.kind==='problem' && s.id===id)),count:(await db.listAllSnags()).length};},fixture.problemId);
ok(independent.problem.status==='open' && independent.tasks.filter(a=>a.state==='done').length===1 && independent.tasks.find(a=>a.what==='Run the controlled film trial').state==='todo' && independent.count===fixture.problemCount,'completing one action neither closes its problem/sibling nor creates duplicate faults');
await t.go(`#/lines/${sd.wsId}`);await scopePage(p,'Actions');
await p.locator('#fq-doing .fq-row').first().waitFor();   /* the list drawn before its Show all is looked for (it lost the race on a busy server) */
for(let i=0;i<2;i++){const more=p.locator('#fq-doing [data-rest]').filter({hasText:/^Show all/});if(!await more.count())break;await more.first().click();}
await p.locator('#fq-doing .fq-row').filter({hasText:'Run the controlled film trial'}).first().waitFor();
ok(await p.locator('#fq-doing .fq-row').filter({hasText:'Run the controlled film trial'}).count()===1,'the line Actions tab shows the same independent task in its main work list');
const report=await t.pdfText(()=>paper(p,'Action tracker'),'actions-with-finding');
ok(report.includes('Run the controlled film trial') && report.includes('Priya') && report.includes('Film breaks at the wrapper guide'),'the line action paper includes the real task, owner and original finding');
// Use the actual source controls to attach supporting evidence to existing work, without moving ownership.
await t.go(`#${data.href}`);
for(const [kind,id] of [['action',fixture.targetId],['test',fixture.testId]]){
 if(!id)throw new Error(`Seed needs an existing project ${kind}`);
 await more(p,'Link as evidence…');
 const link=p.getByRole('dialog',{name:'Link as supporting evidence'});await link.getByLabel('Evidence for').selectOption(`${kind}:${id}`);
 ok((await link.getByLabel('Evidence for').locator('option:checked').innerText()).includes(' · '),`${kind} evidence choice names its context`);
 await link.getByRole('button',{name:'Save evidence link',exact:true}).click();await link.waitFor({state:'hidden'});
}
const evidence=await p.evaluate(async f=>{const db=await import('/src/db.ts');return {action:(await db.listAllPaceTodos()).find(a=>a.id===f.targetId),test:(await db.listAllTests()).find(a=>a.id===f.testId),study:await db.getStudy(f.studyId)};},{...fixture,studyId:data.id});
ok(evidence.action.sources.some(s=>s.id===data.id) && evidence.test.sources.some(s=>s.id===data.id) && !evidence.study.projectId,'the same saved use supports an existing action and test without taking project ownership');
// Tests expose follow-through even when there is no attached file.
await t.go(`#/project/${evidence.test.projectId}?open=${fixture.testId}`);
await p.locator('aside.rd').waitFor();
ok(await p.locator('aside.rd').getByRole('button',{name:'Create action',exact:true}).count()===1,'a test without attached files still exposes action creation and its supporting sources');
await p.locator('aside.rd').getByRole('button',{name:'Create action',exact:true}).click();await p.getByRole('dialog',{name:'Create action',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
ok(await p.locator('aside.rd').count()===1,'cancelling test follow-up returns to the same source record');
await create('Follow up on the test result','Sam','2026-11-28');
const tested=await p.evaluate(async()=> (await (await import('/src/db.ts')).listAllPaceTodos()).find(a=>a.what==='Follow up on the test result'));
ok(tested?.projectId===evidence.test.projectId && tested.sources?.some(s=>s.kind==='test' && s.id===fixture.testId),'a test creates an actual task retaining its record and project context');
await t.go('#/actions');await p.getByText('Follow up on the test result',{exact:true}).first().waitFor();
ok(await p.getByText('Follow up on the test result',{exact:true}).count()===1,'the task from Testing reaches the shared Actions tracker');
// A saved Luna reply/output becomes a reviewed action; this proves the UI/storage, not model judgement.
await t.go(`#/ai?c=${fixture.conversationId}`);
await p.locator('[data-turn="finding-reply"] [data-reply-faultline] summary').click();
await p.locator('[data-turn="finding-reply"] [data-create-action]').waitFor();
await create('Inspect guide alignment from Luna review','Rowland','2026-11-27');
const lunar=await p.evaluate(async()=> (await (await import('/src/db.ts')).listAllPaceTodos()).find(a=>a.what==='Inspect guide alignment from Luna review'));
ok(lunar?.workspaceId === sd.wsId && lunar?.sources.some(s=>s.kind==='conversation' && s.part==='finding-reply' && s.how==='ai') && lunar.sources.some(s=>s.kind==='report' && s.id==='wrapper-report@1' && s.how==='ai'),'Luna task retains its exact reply and produced report, labelled for review');
await p.getByRole('button',{name:'Open action',exact:true}).click();
ok((await p.locator('[data-action-sources]').innerText()).includes('Luna suggestion — review against evidence'),'Luna material never appears as automatically verified evidence');
await p.locator('[data-action-sources] a').filter({hasText:'Wrapper investigation note'}).click();
await p.locator('[data-work-kind="convreport"]').waitFor();
ok((await p.locator('[data-work-kind="convreport"]').innerText()).includes('Wrapper investigation note') && await p.getByRole('dialog').count()===0,'a produced-output source reopens the saved output and closes the task editor');
// Phone, tablet and desk: actual task opening, editable name and safe close/return.
const shots=process.env.UI_REVIEW_SHOTS;if(shots)mkdirSync(shots,{recursive:true});
for(const width of [360,820,1440]){
 await p.setViewportSize({width,height:1000});await t.go('#/actions');
 await p.locator('.act').getByRole('button').filter({hasText:'Run the controlled film trial'}).first().click();await p.locator('[data-independent-action]').waitFor();
 await p.getByLabel('Action owner',{exact:true}).fill('Priya');
 ok(await t.wide()<=1 && await p.getByLabel('Action owner',{exact:true}).inputValue()==='Priya',`task controls and typing work at ${width}px`);
 if(shots)await p.screenshot({path:`${shots}/action-editor-${width}.png`});
 await p.locator('.action-progress summary').click();
 const status=p.getByLabel('Action status',{exact:true});ok((await status.boundingBox()).height>=44,`status is a thumb target at ${width}px`);
 await p.getByRole('dialog',{name:'Action',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
 ok(await p.getByRole('dialog').count()===0 && p.url().endsWith('#/actions'),`closing returns directly to Actions at ${width}px`);
}
await t.go('#/actions');await create('Prepare next client visit','Rowland','2026-11-29');
const personal=await p.evaluate(async()=> (await (await import('/src/db.ts')).listAllPaceTodos()).find(a=>a.what==='Prepare next client visit'));
ok(personal?.standalone && !personal.projectId && !personal.workspaceId,'a manual task can remain unplaced with no invented line or required project');
await p.reload();await p.getByText('Prepare next client visit',{exact:true}).first().waitFor();
const areaInfo=await p.evaluate(async()=>{
 const db=await import('/src/db.ts');const {ensureAreaPlace}=await import('/src/lib/areaPlace.ts');const {areaHref}=await import('/src/lib/areas.ts');const area={area:'Dispatch action review',site:'Audit site',client:'Client A'};const place=await ensureAreaPlace(area);
 const other=await (await import('/src/lib/lines.ts')).addLineToFactory('Client B action line');await db.updateWorkspace({...other,clientName:'Client B'});
 const now=Date.now();await db.putPaceTodo({id:'b-only-action',standalone:true,clientName:'Client B',what:'B-only unrelated action',why:'Other client',where:'',who:'Bob',when:'',state:'todo',createdAt:now,updatedAt:now});
 (await import('/src/lib/activeClient.ts')).setActiveClient('Client A');return {href:areaHref(area),report:areaHref(area,true),place:place.id};
});
await t.go(`#${areaInfo.href}`);await create('Organise dispatch handover','Alice','2026-11-28');
await p.getByText('Organise dispatch handover',{exact:true}).first().waitFor();
const areaTask=await p.evaluate(async()=> (await (await import('/src/db.ts')).listAllPaceTodos()).find(a=>a.what==='Organise dispatch handover'));
ok(areaTask.workspaceId===areaInfo.place && !areaTask.projectId,'an area without production lines owns its actual task without inventing a line/project');
await t.go('#/actions');await p.getByText('Organise dispatch handover',{exact:true}).first().waitFor();
ok(!(await p.locator('.act').innerText()).includes('B-only unrelated action'),'the shared Actions view excludes another client’s unplaced task');
await t.go(`#${areaInfo.report}`);await p.getByRole('heading').filter({hasText:'Dispatch action review'}).first().waitFor();
const areaPaper=await t.pdfText(()=>p.getByRole('button',{name:'Download',exact:true}).click(),'area-actions');
ok(areaPaper.includes('Organise dispatch handover') && areaPaper.includes('Alice'),'the area paper includes its no-line task and owner');
await t.finish('Accepted: findings → owned actions → place/shared tracking → outcome/history → original source and supporting evidence.');
