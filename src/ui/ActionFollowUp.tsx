import { isConversation } from '../colleague/conversation';
import { openActionRecord } from './ActionRecord';
/** Findings become existing action records. Sources remain references, with AI standing stated explicitly. */
import { useEffect, useState } from 'react';
import { allProjects, listWorkspaces, addPaceTodoSources, listAllPaceTodos, listAllSnags, listAllTests, onDataChange, patchSnag, patchTest, type PaceTodoRow } from '../db';
import type { Snag } from '../snag/types';
import type { ToolStudy } from '../lib/study';
import { actionText, actionsFrom, sourceKey, withActionSources, type ActionSource } from '../lib/actionSources';
import { studyHref, recordHref } from '../lib/studyLinks';
import { customerKey } from '../lib/customers';
import { useClientScope } from '../lib/activeClient';
import { useAccess } from '../cloud/access';
import { openQuickSnag } from '../snag/QuickSnag';
import { openProblem } from '../snag/ProblemPanel';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';

export const studyActionSource = (s: ToolStudy): ActionSource => ({ kind: isConversation(s) ? 'conversation' : 'study', id: s.id, href: isConversation(s) ? `/ai?c=${encodeURIComponent(s.id)}` : studyHref(s), label: s.name || s.tool, how: s.tool === 'talk' ? 'ai' : 'record' });
export const problemActionSource = (s: Snag): ActionSource => ({ kind: 'problem', id: s.id, href: `/snags?open=${encodeURIComponent(s.id)}`, label: s.problem, how: 'record' });
export interface ActionContext { workspaceId?: string; projectId?: string; machine?: string; tools?: Snag['tools']; reason?: string }

/** Review a real action in the same editor from any source; a project is never required. */
export function CreateAction({ sources = [], context = {}, canEdit = true, evidence = true }: { sources?: ActionSource[]; context?: ActionContext; canEdit?: boolean; evidence?: boolean }) {
  const [kept, setKept] = useState<PaceTodoRow | null>(null);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState<Target | null>(null);
  const identity=JSON.stringify([sources.map(sourceKey),context.workspaceId,context.projectId,context.machine]);
  useEffect(()=>{setKept(null);setLinked(null);setLinking(false);},[identity]);
  const access=useAccess(context.projectId ?? '');
  if(!canEdit || !access.edit)return null;
  const first = sources[0];
  const tool = first && (first.kind === 'study' || first.kind === 'conversation') ? { studyId: first.id, ...(first.part ? { part: first.part } : {}) } : undefined;
  return <div className="action-follow-up" data-action-follow-up>
    <button type="button" className="btn btn-sm" data-create-action onClick={() => openQuickSnag(undefined, {
      intent: 'action', said: first?.label || 'Actions', sources, ...context,
      words: context.reason || first?.excerpt?.slice(0, 600) || '', ...(tool ? { tool } : {}),
      onActionSaved: a => setKept(a),
    })}>Create action</button>
    {evidence && sources.length > 0 && <button type="button" className="linkish" onClick={() => setLinking(true)}>Link as evidence…</button>}
    {kept && <span className="sub" role="status">Action saved. <button type="button" className="linkish" onClick={() => openActionRecord(kept.id)}>Open action</button></span>}
    {linked && <span className="sub" role="status">Linked to {linked.label}. <button type="button" className="linkish" onClick={() => linked.kind === 'action' ? openActionRecord(linked.id) : nav(linked.href)}>Open</button></span>}
    {linking && <LinkEvidence sources={sources} onClose={() => setLinking(false)} onSaved={t => { setLinked(t); setLinking(false); }} />}
  </div>;
}

export function ActionSources({ sources,onGo }: { sources?: readonly ActionSource[];onGo?:()=>void }) {
  if (!sources?.length) return null;
  return <section className="action-sources" data-action-sources aria-label="Sources and supporting evidence">
    <h3 className="field-label">Sources and supporting evidence</h3>
    <p className="sub">A source explains the finding or supports the work. It does not by itself prove that the action worked.</p>
    <ul>{sources.map(s => <li key={sourceKey(s)}>
      <a href={`#${s.href}`} onClick={e=>{if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)return;e.preventDefault();onGo?.();nav(s.href);}}>{s.label}</a>{' '}<span className="sub">{s.how === 'ai' ? 'Luna suggestion — review against evidence' : 'Saved record'}</span>
      {s.excerpt && <details><summary>Source excerpt</summary><blockquote>{s.excerpt}</blockquote></details>}
    </li>)}</ul>
  </section>;
}

/** Related actions include completed work; several actions never collapse into one problem status. */
export function ActionsFromSource({ source }: { source: ActionSource }) {
  const [all, setAll] = useState<{problems:Snag[];actions:PaceTodoRow[]}>({problems:[],actions:[]});
  useEffect(() => {
    let live = true;
    const load = async () => { const [problems,actions] = await Promise.all([listAllSnags(),listAllPaceTodos()]); if (live) setAll({problems,actions}); };
    void load(); const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, []);
  const tasks = actionsFrom(all.actions,source.kind,source.id).filter(a=>!source.part || a.sources?.some(s=>s.kind===source.kind && s.id===source.id && s.part===source.part));
  const problems = actionsFrom(all.problems,source.kind,source.id).filter(s=>s.proposedSolution?.trim() && (!source.part || s.sources?.some(r=>r.kind===source.kind && r.id===source.id && r.part===source.part)));
  if (!tasks.length && !problems.length) return null;
  return <section className="action-sources" data-actions-from={source.id} aria-label="Actions linked here">
    <h3 className="field-label">Actions linked here</h3>
    <ul>
      {tasks.map(a=><li key={`action:${a.id}`}><button type="button" className="linkish" onClick={()=>openActionRecord(a.id)}>{a.what}</button>{' '}<span className="sub">{a.state === 'done' ? 'Done' : a.state === 'waiting' ? 'Waiting' : 'To do'} · {a.who || 'Owner not agreed'} · {a.due ? `due ${a.due}` : 'no date agreed'}</span></li>)}
      {problems.map(s=><li key={`problem:${s.id}`}><button type="button" className="linkish" onClick={()=>openProblem(s.id)}>{actionText(s)}</button>{' '}<span className="sub">{s.status === 'closed' ? 'Done' : 'Open'} · {s.owner || 'Owner not agreed'}</span></li>)}
    </ul>
  </section>;
}

type Target = { kind: 'snag' | 'action' | 'test'; id: string; clientName?:string; projectId?: string; workspaceId?: string; label: string; href: string };
function LinkEvidence({ sources, onClose, onSaved }: { sources: ActionSource[]; onClose: () => void; onSaved: (t: Target) => void }) {
  const cs = useClientScope();
  const [targets, setTargets] = useState<Target[]>([]);
  const [chosen, setChosen] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void Promise.all([listAllSnags(), listAllPaceTodos(), listAllTests(),allProjects(),listWorkspaces()]).then(([snags, actions, tests,projects,places]) => {
      if (!live) return;
      const rows: Target[] = [
        ...snags.filter(s => !s.deletedAt && !s.archivedAt).map(s => ({ kind: 'snag' as const, id: s.id, projectId: s.projectId, workspaceId: s.workspaceId, label: `${actionText(s)}${s.status === 'closed' ? ' · Done' : ''}`, href: `/snags?open=${encodeURIComponent(s.id)}` })),
        ...actions.map(a => ({ kind: 'action' as const, id: a.id, projectId: a.projectId, workspaceId:a.workspaceId,clientName:a.clientName, label: `${a.what}${a.state === 'done' ? ' · Done' : ''}`, href: `/actions?open=${encodeURIComponent(a.id)}` })),
        ...tests.map(t => ({ kind: 'test' as const, id: t.id, projectId: t.projectId, label: `${t.title} · ${t.kind || 'test'}`, href: recordHref(t.projectId, {kind:t.kind === 'fix' ? 'fix' : 'test',ref:t.id}) })),
      ];
      setTargets(rows.map(t=>({...t,label:[t.label,t.workspaceId ? places.find(w=>w.id === t.workspaceId)?.name : '',t.projectId ? projects.find(p=>p.id === t.projectId)?.name : '',t.clientName || (t.workspaceId ? places.find(w=>w.id === t.workspaceId)?.clientName : '')].filter(Boolean).join(' · ')})));
    });
    return () => { live = false; };
  }, []);
  const offered = cs.ready ? targets.filter(t => t.clientName && !t.workspaceId && !t.projectId ? !cs.filtering || customerKey(t.clientName) === customerKey(cs.client) : cs.record(t)) : [];
  const target = offered.find(t => `${t.kind}:${t.id}` === chosen);
  const can = useAccess(target?.projectId ?? '');
  const save = async () => {
    if (!target || !can.edit || busy) return;
    setBusy(true); setError('');
    try {
      if (target.kind === 'snag') await patchSnag(target.id, cur => ({sources:withActionSources(cur.sources,sources)}));
      else if (target.kind === 'action') await addPaceTodoSources(target.id,sources);
      else await patchTest(target.id,cur => ({sources:withActionSources(cur.sources,sources)}));
      onSaved(target);
    } catch { setError('The evidence link could not be saved. Try again.'); }
    finally { setBusy(false); }
  };
  return <Sheet open onClose={onClose} title="Link as supporting evidence">
    <div className="qs" data-link-action-evidence>
      <p className="sub">Keep the original source on an action, problem or test. AI suggestions remain labelled; linking does not verify them.</p>
      <label className="field"><span className="field-label">Action, problem or test</span><select className="text-input" value={chosen} aria-label="Evidence for" onChange={e=>setChosen(e.target.value)}><option value="">Choose the work it supports</option>{offered.map(t=><option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>{t.label}</option>)}</select></label>
      {target && !can.edit && <p className="sub">You can read this work; its team adds evidence.</p>}
      {error && <p role="alert">{error}</p>}
      <button type="button" className="btn btn-primary" disabled={!target || !can.edit || busy} onClick={()=>void save()}>Save evidence link</button>
    </div>
  </Sheet>;
}

/** Actual actions at a place, with completed work still available. Problem counts remain separate. */
export function ActionsAtPlace({workspaceIds}:{workspaceIds:readonly string[]}){
  const [all,setAll]=useState<PaceTodoRow[]>([]);
  useEffect(()=>{let live=true;const load=async()=>{const rows=await listAllPaceTodos();if(live)setAll(rows);};void load();const off=onDataChange(()=>void load());return()=>{live=false;off();};},[]);
  const mine=all.filter(a=>!!a.workspaceId && workspaceIds.includes(a.workspaceId));
  const ongoing=mine.filter(a=>a.state !== 'done');const done=mine.filter(a=>a.state === 'done');
  const row=(a:PaceTodoRow)=><li key={a.id}><button type="button" className="linkish" onClick={()=>openActionRecord(a.id)}>{a.what}</button>{' '}<span className="sub">{a.who || 'Owner not agreed'} · {a.due ? `due ${a.due}` : 'no date agreed'}{a.state === 'done' ? ' · Done' : ''}</span></li>;
  return <section className="action-sources" data-place-actions><h2 className="ln-h">Actions</h2>{ongoing.length ? <ul>{ongoing.map(row)}</ul> : <p className="sub">No open actions at this place.</p>}{done.length>0 && <details><summary>Completed · {done.length}</summary><ul>{done.map(row)}</ul></details>}</section>;
}
