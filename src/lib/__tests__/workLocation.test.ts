import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import {beforeEach,expect,it,vi} from 'vitest';
import type {ToolStudy} from '../study';
import type {Workspace} from '../../types';
import {AREA_PLACE_TYPE,productionLines} from '../lines';
let db:typeof import('../../db');
let work:typeof import('../workLocation');
beforeEach(async()=>{vi.stubGlobal('indexedDB',new IDBFactory());vi.resetModules();db=await import('../../db');work=await import('../workLocation');},30000);
const talk=(id='walk'):ToolStudy=>({id,tool:'talk',name:'Walk before setup',facts:{turns:[{id:'note',kind:'typed',at:1,text:'Keep the original observation.'},{id:'photo',kind:'photo',at:2,media:{blobKey:'original-photo',mime:'image/jpeg',capturedAt:2}},{id:'report',kind:'reply',at:3,docUpdatedAt:3,doc:{kind:'line-walk',title:'Original report',sections:[]},pdfs:[{id:'pdf',key:'original-pdf',name:'walk.pdf',at:4}]}]},uses:[],ownerId:'owner',startedAt:1,createdAt:1,updatedAt:1});

it('location-free captures remain distinguishable from client and area configuration',()=>{
  expect(work.isUnfiledWork(talk(),[])).toBe(true);
  expect(work.isUnfiledWork({...talk(),projectId:'project'},[])).toBe(true);
  expect(work.isSavedWork({...talk(),tool:'source',facts:({department:{area:'Dispatch'}} as unknown as ToolStudy['facts'])})).toBe(false);
  expect(work.isSavedWork({...talk(),tool:'story'})).toBe(false);
});
it('an area is a place with an area route, and never adds a production line',()=>{
  const w={id:'area',name:'Dispatch — the area itself',lineType:AREA_PLACE_TYPE,clientName:'Alpha',siteName:'Hull',areaName:'Dispatch'} as Workspace;
  expect(work.workLocation(w)).toMatchObject({kind:'area',label:'Hull › Dispatch'});
  expect(work.workLocation(w).href).toContain('/area?');
  expect(productionLines([w])).toEqual([]);
});
it('filing and moving a walk retains every turn, content clock, photo and PDF identity',async()=>{
  const area=await db.createWorkspace('Dispatch'),line=await db.createWorkspace('Line A');
  await db.patchWorkspaceRecord(area.id,{lineType:AREA_PLACE_TYPE,areaName:'Dispatch'});
  const s=talk();await db.putStudy(s);const before=await db.getStudy(s.id);
  await work.placeStudyRecord(s.id,area.id);
  let after=await db.getStudy(s.id);
  expect(after?.workspaceId).toBe(area.id);expect(after?.facts).toEqual(before?.facts);expect(after?.id).toBe(s.id);
  await work.placeStudyRecord(s.id,line.id);after=await db.getStudy(s.id);
  expect(after?.workspaceId).toBe(line.id);expect(after?.facts).toEqual(before?.facts);
  await work.placeStudyRecord(s.id,undefined);expect((await db.getStudy(s.id))?.facts).toEqual(before?.facts);
});
it('one Luna subject can be filed and reopened without rewriting other subjects or past scopes',async()=>{
  const {newConversation,factsOfConversation}=await import('../../colleague/conversation');
  const cf=(s:ToolStudy|undefined)=>{if(!s)throw new Error('Missing saved conversation');return factsOfConversation(s);};
  const s=newConversation({id:'luna',at:1,name:'Walk debrief',thread:{id:'line-topic',title:'Existing line work',scope:{lineId:'line-a'}}});
  const f=factsOfConversation(s);
  f.threads=[...(f.threads ?? []).map(t=>({...t,status:'parked' as const})),{id:'loose-topic',title:'A separate observation',status:'current',scope:{},notes:[],refs:[],at:2}];
  f.turns=[{id:'reply',kind:'reply',at:3,text:'Past advice.',actionScope:{}}];s.facts=f;
  await db.putStudy(s);const before=await db.getStudy(s.id);
  expect(work.lunaSavedWork([s],[]).filter(r=>r.unfiled).map(r=>r.name)).toEqual(['A separate observation']);
  await work.placeLunaSubject(s.id,'loose-topic','area-id');
  let after=await db.getStudy(s.id);
  expect(cf(after).threads?.find(t=>t.id==='line-topic')).toEqual(cf(before).threads?.find(t=>t.id==='line-topic'));
  expect(cf(after).threads?.find(t=>t.id==='loose-topic')?.scope.lineId).toBe('area-id');
  expect(after?.facts.turns).toEqual(before?.facts.turns);
  await expect(work.placeLunaSubject(s.id,'missing-topic','wrong-place')).rejects.toThrow('no longer available');
  expect((await db.getStudy(s.id))?.facts).toEqual(after?.facts);
  await work.resumeLunaSubject(s.id,'line-topic');after=await db.getStudy(s.id);
  expect(cf(after).threads?.find(t=>t.status==='current')?.id).toBe('line-topic');
  expect(cf(after).threads?.find(t=>t.id==='loose-topic')?.scope.lineId).toBe('area-id');
  expect(work.lunaSavedWork([s],[])[1].href).toContain('&thread=loose-topic');
});
