/* THE SHELL THE REGISTER TOOLS SHARE (m6-registers; tools/registers/kinds) — a tool's list in the scope the address carries, a
 * New sheet that picks the line, a row that is renamed and deleted where it sits with Undo, and a record's page that loads its
 * study, works out who may change it and hands the tool's own page the parts. The tools bring their arithmetic, their sentences
 * and their page; this brings what is the same (docs/STRUCTURE.md §5.4–5.5). A client reads and changes nothing (lib/access). */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { can as canAt, type Can } from '../../lib/access';
import { inScope, startLine, type ProjectScope } from '../../lib/inProject';
import { asked } from '../../lib/lines';
import { useInProject } from '../../lib/useInProject';
import { useArchivedPlaces, useFactoryLines } from '../../lib/useFactoryLines';
import { now } from '../../lib/ids';
import { nav } from '../../state/useRoute';
import type { ToolStudy } from '../../lib/study';
import { PageHeader } from '../../ui/parts';
import { ProjectScopeChips } from '../../ui/ProjectScope';
import { Sheet } from '../../ui/Sheet';
import { removeStudy, StudyRowName } from '../../ui/StudyActs';
import { registerHref, registerKeyOf, type RegisterKey } from './kinds';
import './registers.css';

export const OWNER = canAt('owner');

/** Every study of one register tool, kept current. */
export function useRegisterStudies(key: RegisterKey): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList((await listAllStudies()).filter(s => !s.deletedAt && registerKeyOf(s) === key)), [key]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

/** The records in the scope the address carries: a line (?line=), a project (?project=, with its lines) or all. */
export function useShown(list: ToolStudy[] | null) {
  const inP = useInProject();
  const line = useMemo(() => asked('line'), []);
  const [scope, setScope] = useState<ProjectScope>('project');
  const put = useArchivedPlaces();
  const shown = useMemo(() => {
    const base = line ? (list ?? []).filter(s => s.workspaceId === line) : inScope(list ?? [], scope, inP.id, inP.lineIds);
    return base.filter(s => { const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none'; return !put.has(k) || (inP.id && s.projectId === inP.id); });
  }, [list, scope, inP.id, inP.lineIds, put, line]);
  return { shown, inP, scope, setScope, line };
}

export interface RowSays { text: string; tone: string; where?: string }

/** One record on a list: what it says, opened with a tap; renamed and deleted where it sits. */
export function RegisterRow({ s, said, lineName }: { s: ToolStudy; said: RowSays; lineName?: string }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const key = registerKeyOf(s);
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => key && nav(s.projectId ? `${registerHref(key, s.id)}?project=${encodeURIComponent(s.projectId)}` : registerHref(key, s.id))}>
        <b className="lt-what">{s.name || 'Not named'}{lineName ? <span className="ie-li-m"> · {lineName}</span> : null}</b>
        <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
        {said.where && <span className="lt-where">{said.where}</span>}
      </button>
      {may.remove && <span className="lt-acts"><button type="button" className="cw-link sp-rm" aria-label={`Delete ${s.name || 'this'}`} onClick={() => void removeStudy(s)}>Delete</button></span>}
      {may.edit && !s.closedAt && <span className="lt-acts"><button type="button" className="cw-link" aria-label={`Rename ${s.name || 'this'}`} onClick={() => setNaming(true)}>Rename</button></span>}
    </li>
  );
}

/** A tool's list page: header, scope chips, its empty words, its rows, and New. */
export function RegisterList({ regKey, title, says, eyebrow, empty, rowOf, newLabel, renderNew, canNewHere = true }: {
  regKey: RegisterKey; title: string; says: ReactNode; eyebrow: string; empty: string; newLabel: string;
  rowOf: (s: ToolStudy) => RowSays;
  renderNew: (p: { onClose: () => void; project?: { id: string; lineIds: string[] }; line?: string; existing: ToolStudy[] }) => ReactNode;
  canNewHere?: boolean;
}) {
  const list = useRegisterStudies(regKey);
  const { shown, inP, scope, setScope, line } = useShown(list);
  const lines = useFactoryLines();
  const [adding, setAdding] = useState(() => asked('add') === '1');   // ?add=1 — a method page's New lands on the sheet
  const jobCan = useAccess(inP.id ?? '');
  const mayAdd = canNewHere && (inP.id ? jobCan.edit : OWNER.edit);
  const rows = [...shown].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="wrap ie rg-list" data-page={`${regKey}-list`}>
      <PageHeader eyebrow={eyebrow} title={title} says={says} primary={mayAdd ? { label: newLabel, run: () => setAdding(true) } : undefined} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {list && rows.length === 0 && <p className="sub qsl-empty">{empty}</p>}
      <ul className="lt-rows" aria-label={title}>{rows.map(s => <RegisterRow key={s.id} s={s} said={rowOf(s)} lineName={lines.find(l => l.id === s.workspaceId)?.name} />)}</ul>
      {adding && renderNew({ onClose: () => setAdding(false), ...(inP.project ? { project: { id: inP.project.id, lineIds: inP.lineIds } } : {}), ...(line ? { line } : {}), existing: list ?? [] })}
    </div>
  );
}

/** The sheet that starts a record on a line: a name and the line. `make` builds the study; the tool says what is new about it. */
export function NewOnLine({ title, regKey, onClose, project, line, existing, make, nameHint, noun }: {
  title: string; regKey: RegisterKey; onClose: () => void; project?: { id: string; lineIds: string[] }; line?: string; existing: ToolStudy[];
  make: (o: { name: string; workspaceId: string; projectId?: string; now: number }) => ToolStudy; nameHint: (lineName: string) => string; noun: string;
}) {
  const lines = useFactoryLines(line);
  const [lineId, setLineId] = useState(line ?? '');
  const [name, setName] = useState('');
  useEffect(() => { if (!lineId && project?.lineIds?.length) setLineId(startLine(project.lineIds)); }, [lineId, project]);
  const lineName = lines.find(l => l.id === lineId)?.name ?? '';
  const there = existing.find(s => s.workspaceId === lineId);
  const ready = !!lineId && !there;
  const go = async () => {
    if (!ready) return;
    const s = make({ name: name.trim() || nameHint(lineName), workspaceId: lineId, ...(project ? { projectId: project.id } : {}), now: now() });
    await putStudy(s);
    onClose();
    nav(project ? `${registerHref(regKey, s.id)}?project=${encodeURIComponent(project.id)}` : registerHref(regKey, s.id));
  };
  return (
    <Sheet open onClose={onClose} title={title}>
      <form className="lt-new" data-sheet={`new-${regKey}`} onSubmit={e => { e.preventDefault(); void go(); }}>
        {project && <p className="sub ie-for" data-for-project={project.id}>For <b>{project.id ? 'this project' : ''}</b> — it is the project’s, with everything else in it.</p>}
        <label className="field"><span className="field-label">Line <i className="sub">a {noun} is a line’s</i></span>
          <select className="text-input" value={lineId} aria-label="Line" onChange={e => setLineId(e.target.value)}>
            <option value="">Choose a line</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select></label>
        {there && <p className="sub" data-already>{lineName} already has one — <button type="button" className="linkish" onClick={() => { onClose(); nav(registerHref(regKey, there.id)); }}>open it</button>.</p>}
        <label className="field"><span className="field-label">Name <i className="sub">optional</i></span>
          <input className="text-input" value={name} maxLength={120} aria-label="Name" placeholder={lineName ? nameHint(lineName) : ''} onChange={e => setName(e.target.value)} /></label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start it</button>
      </form>
    </Sheet>
  );
}

/** A record's page: loads the study, works out who may change it, and gives the tool's page the parts. */
export function RecordFrame({ id, regKey, children }: {
  id: string; regKey: RegisterKey;
  children: (p: { s: ToolStudy; can: Can; canEdit: boolean; patch: (fn: (cur: ToolStudy) => Partial<ToolStudy>) => Promise<void> }) => ReactNode;
}) {
  const [s, setS] = useState<ToolStudy | null | undefined>();
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (!s || registerKeyOf(s) !== regKey) return <div className="wrap ie"><h1>This isn’t on this device</h1><p className="sub">It may have been deleted, or not synced here yet.</p><button type="button" className="btn" onClick={() => nav(registerHref(regKey))}>Back to the list</button></div>;
  return <>{children({ s, can, canEdit: can.edit && !s.closedAt, patch: async fn => { await patchStudy(id, cur => fn(cur)); await load(); } })}</>;
}
