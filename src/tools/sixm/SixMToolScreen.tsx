/* 6M AS A TOOL — its list on a line and its own page inside the line (tools/sixm/sixmTool says why and what does not change).
 *   #/sixm?line=<line>          the 6Ms on the line (or every line): each by its name, its line and when it was started; New 6M
 *   #/sixm/<6M>?line=<line>     one 6M: Fishbone · Pareto · Countermeasures · Report — the same screens the record has always had, in
 *                               the line's frame, with the tool's own header (rename it, put it away, its report)
 * A 6M is named for its problem, in a few words; a line has as many as it has problems worth one. */
import { useEffect, useMemo, useState } from 'react';
import { nav, navReplace, useRoute } from '../../state/useRoute';
import { useProjects, useProject } from '../../lib/useProjects';
import { useFactoryLines } from '../../lib/useFactoryLines';
import { useAccess } from '../../cloud/access';
import { addPaceLine, allPaceLines, archiveProject, updateProject } from '../../db';
import { onDataChange } from '../../db/core';
import { lineKey } from '../../lib/lines';
import { kindOf } from '../../project/projectKind';
import { PageHeader, ViewTabs } from '../../ui/parts';
import { FishboneJourney } from '../../screens/FishboneScreen';
import { ParetoScreen } from '../../screens/ParetoScreen';
import { BoardScreen } from '../../screens/BoardScreen';
import { SixMReportScreen } from '../../screens/SixMReportScreen';
import { SIXM_VIEWS, setSixmOpen, sixmHref, sixmListHref, sixmsOf, sixmsOnLine, viewOf } from './sixmTool';

type Row = { projectId: string; id: string; workspaceId?: string; name: string };
function useLineRows(): Row[] | null {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void allPaceLines().then(r => { if (live) setRows(r as Row[]); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return rows;
}
/** The 6Ms on one line, newest first — for the line's Tools. */
export function useSixmsOnLine(lineId: string): { id: string; name: string }[] {
  const { projects } = useProjects();
  const rows = useLineRows();
  return useMemo(() => (rows ? sixmsOnLine(projects, rows, lineId) : []).sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0)).map(p => ({ id: p.id, name: p.name })), [projects, rows, lineId]);
}
const day = (ms: number): string => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* ------------------------------------------------------------------ the list */
export function SixMListScreen() {
  const route = useRoute();
  const lineId = route.query.get('line') ?? undefined;
  const { projects, create, loading } = useProjects();
  const lines = useFactoryLines();
  const rows = useLineRows();
  const line = lines.find(l => l.id === lineId);
  const [name, setName] = useState('');
  const [on, setOn] = useState<string>(lineId ?? '');
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => (rows ? (lineId ? sixmsOnLine(projects, rows, lineId) : sixmsOf(projects)) : []).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [projects, rows, lineId]);
  const lineOf = (pid: string) => { const r = rows?.find(x => x.projectId === pid && x.workspaceId); return r ? lines.find(l => l.id === r.workspaceId) : undefined; };
  const target = lines.find(l => l.id === (lineId ?? on));
  const start = async (): Promise<void> => {
    if (!target || !name.trim() || busy) return;
    setBusy(true);
    try {
      const p = await create(name.trim(), undefined, 'board');
      await addPaceLine({ projectId: p.id, key: lineKey(target.name), name: target.name, workspaceId: target.id, sort: 1 });
      nav(sixmHref(p.id, { line: target.id }));
    } finally { setBusy(false); }
  };
  return (
    <div className="wrap pace sixm-tool" data-sixm-list>
      <PageHeader eyebrow={line ? `6M · ${line.name}` : '6M'} title="6M" says="Find the root cause of a problem and prove the fix: the problem in its number, its causes on six bones with how each is known, the five whys, the countermeasures, before and after." />
      <section className="sixm-new" aria-label="Start a 6M">
        <label className="field">
          <span className="field-label">A new 6M — what is the problem, in a few words?</span>
          <input className="text-input" value={name} maxLength={80} placeholder="Bags not opening on the bagger" aria-label="The problem, in a few words" data-sixm-name onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void start(); }} />
        </label>
        {!lineId && (
          <label className="field">
            <span className="field-label">On which line?</span>
            <select className="text-input" value={on} aria-label="On which line" data-sixm-line onChange={e => setOn(e.target.value)}>
              <option value="">Pick the line</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-primary" disabled={busy || !name.trim() || !target} data-sixm-start onClick={() => void start()}>Start the 6M</button>
        {!target && !lineId && <p className="sub">A 6M is on a line — pick the line it is about{lines.length ? '' : '; add one in Factory › Set up first'}.</p>}
      </section>
      <h2 className="part-h">{line ? `On ${line.name}` : 'Every 6M'} · {list.length}</h2>
      {loading || !rows ? <p className="sub">Loading…</p> : list.length === 0
        ? <p className="sub" data-sixm-none>No 6M {line ? `on ${line.name} ` : ''}yet. Name the problem above to start one.</p>
        : (
          <ul className="sixm-list">
            {list.map(p => {
              const l = lineOf(p.id);
              return (
                <li key={p.id}>
                  <button type="button" className="sixm-row" data-sixm={p.id} onClick={() => nav(sixmHref(p.id, { line: l?.id ?? lineId }))}>
                    <b>{p.name}</b>
                    <span className="sub">{l ? `On ${l.name}` : 'On no line of the factory'}{p.createdAt ? ` · started ${day(p.createdAt)}` : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      {lineId && <p className="sub"><button type="button" className="linkish" onClick={() => nav(sixmListHref())}>Every line’s 6Ms ›</button></p>}
    </div>
  );
}

/* ------------------------------------------------------------------ one 6M, as a tool */
export function SixMToolScreen({ projectId }: { projectId: string }) {
  const route = useRoute();
  const { loading, project } = useProject(projectId);
  const can = useAccess(projectId);
  const lines = useFactoryLines();
  const rows = useLineRows();
  const view = viewOf(route.query.get('view'));
  /* the line it is opened on, else the first of its own that is a line of the factory */
  const mine = rows?.filter(r => r.projectId === projectId) ?? [];
  const asked = route.query.get('line') ?? undefined;
  const row = mine.find(r => r.workspaceId === asked) ?? mine.find(r => r.workspaceId) ?? mine[0];
  const line = lines.find(l => l.id === (row?.workspaceId ?? asked));
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => { setSixmOpen({ projectId, ...(line?.id ? { line: line.id } : {}) }); return () => setSixmOpen(null); }, [projectId, line?.id]);
  /* an address with no line takes the 6M's own, so the page sits in its line's frame */
  useEffect(() => { if (!asked && row?.workspaceId) navReplace(sixmHref(projectId, { line: row.workspaceId, view, query: Object.fromEntries([...route.query].filter(([k]) => k !== 'view' && k !== 'line')) })); }, [asked, row?.workspaceId]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !rows) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project || kindOf(project) !== 'sixm') return (
    <div className="wrap pace">
      <p className="sub">That 6M isn’t here any more.</p>
      <button type="button" className="btn btn-primary" onClick={() => nav(sixmListHref(asked))}>Every 6M</button>
    </div>
  );
  const go = (v: string) => nav(sixmHref(projectId, { line: line?.id, view: viewOf(v) }));
  const save = async (): Promise<void> => { const n = name.trim(); setRenaming(false); if (n && n !== project.name) await updateProject({ ...project, name: n }); };
  const away = async (): Promise<void> => { await archiveProject(projectId); nav(sixmListHref(line?.id)); };
  return (
    <div className="sixm-tool" data-sixm-tool={projectId}>
      <div className="wrap pace sixm-tool-head">
        <PageHeader eyebrow={line ? `6M · ${line.name}` : '6M'} title={project.name}
          back={{ to: sixmListHref(line?.id), label: line ? `${line.name}’s 6Ms` : 'Every 6M' }}
          more={[
            ...(can.agree ? [{ label: 'Rename', run: () => { setName(project.name); setRenaming(true); } }] : []),
            ...(can.remove ? [{ label: 'Put this 6M away', danger: true, run: () => void away() }] : []),
          ]} />
        {renaming && (
          <div className="sixm-rename" role="group" aria-label="Rename this 6M">
            <input className="text-input" autoFocus value={name} maxLength={80} aria-label="Its name" data-sixm-rename onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setRenaming(false); }} />
            <button type="button" className="btn btn-primary" onClick={() => void save()}>Save</button>
            <button type="button" className="btn" onClick={() => setRenaming(false)}>Cancel</button>
          </div>
        )}
        <ViewTabs label="The parts of this 6M" views={SIXM_VIEWS.map(v => ({ key: v.key, label: v.label }))} value={view} onChange={go} />
      </div>
      {view === 'fishbone' && <div className="wrap pace"><FishboneJourney projectId={projectId} {...(row?.workspaceId ? { lineId: row.id } : {})} can={can} /></div>}
      {view === 'pareto' && <ParetoScreen projectId={projectId} />}
      {view === 'board' && <BoardScreen projectId={projectId} />}
      {view === 'report' && <SixMReportScreen projectId={projectId} {...(row ? { lineId: row.id } : {})} name={project.name} {...(project.lead ? { lead: project.lead } : {})} project={project} />}
    </div>
  );
}
