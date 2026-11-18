import {uid} from './ids';
import type {PaceTodoRow} from '../db/rows';
import type {Standard} from '../tools/linestandard/standard';
import type { Workspace } from '../types';
import type { ToolStudy } from './study';
import { areaOfPlace, isAreaPlace } from './areaPlace';
import { areaHref, areaTitle } from './areas';
import { isHolding } from './visits';
import { factsOfConversation, isConversation, setCurrent } from '../colleague/conversation';

export const UNFILED_HREF='/tools?view=saved&place=unfiled';

/** Settings and place definitions are not captured work. */
export function isSavedWork(s:ToolStudy):boolean {
  if(s.deletedAt || ['story','department','business'].includes(s.tool))return false;
  const f=s.facts as Record<string,unknown>;
  return s.tool!=='source' || !['customer','department','business'].some(k=>!!f[k]);
}
export function hasNoLocation(r:{workspaceId?:string;projectId?:string},places:readonly Workspace[]):boolean {
  return !r.workspaceId || !!(r.workspaceId && isHolding(places.find(w=>w.id===r.workspaceId)));
}
export function isUnfiledWork(s:ToolStudy,places:readonly Workspace[]):boolean {
  if(!isSavedWork(s))return false;
  if(!isConversation(s))return hasNoLocation(s,places);
  const ts=factsOfConversation(s).threads ?? [];
  return !ts.length || ts.some(t=>!t.scope.problemId && !t.scope.storyId && hasNoLocation({workspaceId:t.scope.lineId,projectId:t.scope.projectId},places));
}
export function workLocation(w?:Workspace):{label:string;href:string;kind:'area'|'line'|'unfiled'} {
  if(!w || isHolding(w))return {label:'Unfiled work',href:UNFILED_HREF,kind:'unfiled'};
  const a=isAreaPlace(w)?areaOfPlace(w):undefined;
  if(a)return {label:areaTitle(a),href:areaHref(a),kind:'area'};
  return {label:w.name,href:`/lines/${encodeURIComponent(w.id)}`,kind:'line'};
}

/** Subjects remain separate even when one conversation has covered several places. */
export function lunaSavedWork(studies:readonly ToolStudy[],places:readonly Workspace[]) {
  return studies.filter(s=>isSavedWork(s)&&isConversation(s)).flatMap(s=>{
    const ts=factsOfConversation(s).threads ?? [];
    return (ts.length?ts:[undefined]).map(t=>{
      const workspaceId=t?.scope.lineId,projectId=t?.scope.projectId;
      const w=places.find(p=>p.id===workspaceId);
      return {key:`luna:${s.id}:${t?.id ?? 'conversation'}`,id:s.id,tool:'Luna subject',toolKey:'luna',name:t?.title||s.name,
        workspaceId,projectId,unfiled:!t?.scope.problemId&&!t?.scope.storyId&&hasNoLocation({workspaceId,projectId},places),
        place:w?workLocation(w).label:projectId?'In a project':'Unfiled work',href:`/ai?c=${encodeURIComponent(s.id)}${t?`&thread=${encodeURIComponent(t.id)}`:''}`,at:t?.at||s.updatedAt};
    });
  });
}

export async function placeLunaSubject(id:string,threadId:string|undefined,workspaceId:string|undefined):Promise<void> {
  const {patchStudy}=await import('../db');
  await patchStudy(id,s=>{
    if(!isConversation(s))throw new Error('This is not a Luna conversation.');
    const ts=factsOfConversation(s).threads ?? [],target=threadId?ts.find(t=>t.id===threadId):ts.find(t=>t.status==='current');
    if(threadId&&!target)throw new Error('That subject is no longer available.');
    if(!target)return {facts:{...s.facts,threads:setCurrent(ts,'Notes',workspaceId?{lineId:workspaceId}:{},Date.now(),uid())}};
    const {machine,...scope}=target.scope;
    return {facts:{...s.facts,threads:ts.map(t=>t.id===target.id?{...t,scope:{...scope,...(target.scope.lineId===workspaceId && machine?{machine}:{}),lineId:workspaceId}}:t)}};
  });
}
export async function resumeLunaSubject(id:string,threadId:string):Promise<void> {
  const {patchStudy}=await import('../db');
  await patchStudy(id,s=>{
    const ts=factsOfConversation(s).threads ?? [];
    if(!ts.some(t=>t.id===threadId)||ts.some(t=>t.id===threadId&&t.status==='current'))return {};
    return {facts:{...s.facts,threads:ts.map(t=>t.id===threadId?{...t,status:'current' as const,at:Date.now()}:t.status==='current'?{...t,status:'parked' as const}:t)}};
  });
}

export function unfiledActions(actions:readonly PaceTodoRow[]) {
  return actions.filter(a=>a.standalone&&!a.projectId&&!a.workspaceId).map(a=>({key:`action:${a.id}`,id:a.id,tool:'Action',toolKey:'actions',name:a.what,place:[a.clientName,'No area or line',a.state==='done'?'Completed':'Open'].filter(Boolean).join(' · '),href:`/actions?open=${encodeURIComponent(a.id)}`,at:a.updatedAt,clientName:a.clientName}));
}
export function unfiledCount(studies:readonly ToolStudy[],places:readonly Workspace[],actions:readonly PaceTodoRow[]=[],standards:readonly Standard[]=[]):number {
  return studies.filter(s=>isSavedWork(s)&&!isConversation(s)&&hasNoLocation(s,places)).length+lunaSavedWork(studies,places).filter(x=>x.unfiled).length+unfiledActions(actions).length+standards.filter(s=>!s.deletedAt&&hasNoLocation(s,places)).reduce((n,s)=>n+(s.capacity?1:0)+(s.marks.length||!s.capacity?1:0),0);
}
export async function placeStudyRecord(id:string,workspaceId:string|undefined):Promise<void> {
  const {patchStudy,getStudy}=await import('../db');await patchStudy(id,{workspaceId});const after=await getStudy(id);
  if(!after||after.deletedAt||after.workspaceId!==workspaceId)throw new Error('The saved record could not be placed. Try again.');
}
