import {LocationControl} from './LocationPicker';
import {workLocation} from '../lib/workLocation';
/** Personal and line actions: the work, owner/date, progress and outcome, without a project method to set up. */
import { useEffect, useState } from 'react';
import { getWorkspace,listWorkspaces, patchPaceTodo, type PaceTodoRow } from '../db';
import type { MediaRef, Workspace } from '../types';
import { useAccess } from '../cloud/access';
import { useClientScope } from '../lib/activeClient';
import { isAreaPlace, liveProductionLines } from '../lib/lines';
import { customerKey } from '../lib/customers';
import { Sheet } from './Sheet';
import { ActionSources } from './ActionFollowUp';
import { removeActionWithUndo } from './ActionSheet';
import { Evidence } from './EvidenceDoors';
import { EvidenceViewer } from './Evidence';
const FIELDS=['what','why','who','due','where','workspaceId','clientName','state','notes','outcome','media'] as const;
export function IndependentActionSheet({row,onClose}:{row:PaceTodoRow;onClose:()=>void}){
  const [draft,setDraft]=useState(row);const [places,setPlaces]=useState<Workspace[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [viewing,setViewing]=useState<MediaRef|null>(null);
  const [progressOpen,setProgressOpen]=useState(row.state !== 'todo' || !!row.notes || !!row.outcome || !!row.media?.length);
  const can=useAccess('');const cs=useClientScope();const set=(p:Partial<PaceTodoRow>)=>setDraft(s=>({...s,...p}));
  useEffect(()=>{let live=true;void listWorkspaces().then(async ws=>{const floor=await liveProductionLines(ws);if(live)setPlaces(ws.filter(w=>w.id === row.workspaceId || (!w.archived && (isAreaPlace(w) || floor.some(l=>l.id === w.id)))));});return()=>{live=false;};},[row.workspaceId]);

  const save=async()=>{if(!can.edit || !draft.what.trim() || busy)return;setBusy(true);setError('');try{
    const changes:Partial<PaceTodoRow>={};for(const key of FIELDS)if(JSON.stringify(draft[key])!==JSON.stringify(row[key]))Object.assign(changes,{[key]:draft[key]});
    if(changes.what!==undefined)changes.what=changes.what.trim();
    if(changes.who!==undefined)changes.who=changes.who.trim();
    if(changes.where!==undefined)changes.where=changes.where.trim();
    await patchPaceTodo(row.id,changes);onClose();
  }catch{setError('The action could not be saved. Try again.');}finally{setBusy(false);}};
  return <Sheet open onClose={onClose} title="Action">
    <div className="qs" data-independent-action={row.id}>
      <fieldset className="ax-fs" disabled={!can.edit || busy}>
        <label className="field"><span className="field-label">Action</span><textarea className="text-area" aria-label="Action" value={draft.what} onChange={e=>set({what:e.target.value})} rows={2} /></label>
        <label className="field"><span className="field-label">Why / finding</span><textarea className="text-area" aria-label="Why this action" value={draft.why} onChange={e=>set({why:e.target.value})} rows={2} /></label>
        <div className="qs-row">
          <label className="field"><span className="field-label">Owner</span><input className="text-input" aria-label="Action owner" value={draft.who} onChange={e=>set({who:e.target.value})} /></label>
          <label className="field"><span className="field-label">Due date</span><input className="text-input" type="date" aria-label="Action due date" value={draft.due ?? ''} onChange={e=>set({due:e.target.value || undefined})} /></label>
        </div>
        <LocationControl workspaceId={draft.workspaceId} may={can.edit&&!busy} unfiledText="No area or line" onPick={async workspaceId=>{const w=workspaceId?await getWorkspace(workspaceId):undefined;set({workspaceId:w?.id,clientName:w?.clientName||draft.clientName});if(w)setPlaces(ps=>ps.some(p=>p.id===w.id)?ps:[...ps,w]);}}/>
        <details className="action-location"><summary>More location details{draft.where?` · ${draft.where}`:''}{draft.workspaceId&&places.find(w=>w.id===draft.workspaceId)?` · ${workLocation(places.find(w=>w.id===draft.workspaceId)).label}`:''}</summary>
        {!draft.workspaceId && cs.clients.length>1 && <label className="field"><span className="field-label">Client</span><select className="text-input" aria-label="Action client" value={draft.clientName ?? ''} onChange={e=>set({clientName:e.target.value || undefined})}><option value="">No client assigned</option>{cs.clients.filter(c=>!cs.filtering || customerKey(c)===customerKey(cs.client) || c===draft.clientName).map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
        <label className="field"><span className="field-label">Machine / place · optional</span><input className="text-input" aria-label="Action machine" value={draft.where} onChange={e=>set({where:e.target.value})} /></label>
        </details>
      </fieldset>
      <details className="action-progress" open={progressOpen} onToggle={e=>setProgressOpen(e.currentTarget.open)}>
        <summary>Progress and outcome{draft.state === 'done' ? ' · Done' : draft.state === 'waiting' ? ' · Waiting' : ''}</summary>
        <fieldset className="ax-fs" disabled={!can.edit || busy}>
          <label className="field"><span className="field-label">Progress</span><textarea className="text-area" aria-label="Action progress" value={draft.notes ?? ''} onChange={e=>set({notes:e.target.value})} rows={2} /></label>
          <label className="field"><span className="field-label">Status</span><select className="text-input" aria-label="Action status" value={draft.state} onChange={e=>set({state:e.target.value as PaceTodoRow['state']})}><option value="todo">To do</option><option value="waiting">Waiting on someone</option><option value="done">Done</option></select></label>
          <label className="field"><span className="field-label">Outcome / what happened</span><textarea className="text-area" aria-label="Action outcome" value={draft.outcome ?? ''} onChange={e=>set({outcome:e.target.value})} rows={2} /></label>
          <p className="sub">Completing an action does not verify the improvement. Keep the test or observations that show its result.</p>
        </fieldset>
        <Evidence media={draft.media ?? []} kind="fix" onView={setViewing} onAdd={can.edit ? async refs=>set({media:[...(draft.media ?? []),...refs]}) : undefined} />
      </details>
      <ActionSources sources={draft.sources} onGo={onClose} />
      {error && <p role="alert">{error}</p>}
      <div className="row-inline action-editor-footer">
        {can.remove && <button type="button" className="btn btn-ghost" onClick={()=>{onClose();void removeActionWithUndo(row);}}>Delete action</button>}
        {can.edit && <button type="button" className="btn btn-primary" disabled={busy || !draft.what.trim()} onClick={()=>void save()}>Save</button>}
      </div>
    </div>
    {viewing && <EvidenceViewer media={viewing} onClose={()=>setViewing(null)} />}
  </Sheet>;
}
