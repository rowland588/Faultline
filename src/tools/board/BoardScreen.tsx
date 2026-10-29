/* BOARDS — hub, one board’s saved views, one record (FC-067 maintenance measures first). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { can as canAt } from '../../lib/access';
import { inScope, startLine, type ProjectScope } from '../../lib/inProject';
import { useInProject } from '../../lib/useInProject';
import { useFactoryLines, useArchivedPlaces } from '../../lib/useFactoryLines';
import { now } from '../../lib/ids';
import { bandPage } from '../../lib/lean';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { ToolStudy } from '../../lib/study';
import { studyHref } from '../../lib/studyLinks';
import { PageHeader, Section } from '../../ui/parts';
import { Sheet } from '../../ui/Sheet';
import { ProjectScopeChips } from '../../ui/ProjectScope';
import { LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { StudyBand, removeStudy, StudyRowName } from '../../ui/StudyActs';
import { WhereItSits } from '../../ui/StudyPlace';
import { boardByKey, boardGroups } from './registry';
import { boardSays, boardTitle, newBoardStudy, studyBoard } from './board';
import type { BoardDef } from './types';

const OWNER = canAt('owner');

export function BoardScreen({ boardKey, id }: { boardKey?: string; id?: string }) {
  if (id) return <BoardRecord id={id} />;
  if (boardKey) return <BoardList boardKey={boardKey} />;
  return <BoardHub />;
}

function useBoardList(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList((await listAllStudies()).filter(s => s.tool === 'board')), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

function useSiblings(): ToolStudy[] {
  const [all, setAll] = useState<ToolStudy[]>([]);
  useEffect(() => {
    void listAllStudies().then(setAll);
    return onDataChange(() => { void listAllStudies().then(setAll); });
  }, []);
  return all;
}

function useShown(list: ToolStudy[] | null) {
  const inP = useInProject();
  const [scope, setScope] = useState<ProjectScope>('project');
  const put = useArchivedPlaces();
  const shown = useMemo(() => inScope(list ?? [], scope, inP.id, inP.lineIds).filter(s => {
    const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none';
    return !put.has(k) || (inP.id && s.projectId === inP.id);
  }), [list, scope, inP.id, inP.lineIds, put]);
  return { shown, inP, scope, setScope };
}

function BoardRowItem({ s, siblings }: { s: ToolStudy; siblings: ToolStudy[] }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const said = boardSays(s, siblings, now());
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
        <b className="lt-what">{s.name || 'Not named'}</b>
        <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
        <span className="lt-where">{boardTitle(s)} · {said.verdict}</span>
      </button>
      {may.remove && <span className="lt-acts"><button type="button" className="cw-link sp-rm" onClick={() => void removeStudy(s)}>Delete</button></span>}
      {may.edit && !s.closedAt && <span className="lt-acts"><button type="button" className="cw-link" onClick={() => setNaming(true)}>Rename</button></span>}
    </li>
  );
}

function BoardHub() {
  const list = useBoardList();
  const siblings = useSiblings();
  const { shown } = useShown(list);
  const groups = boardGroups();
  return (
    <div className="wrap ie">
      <PageHeader title="Boards" says="Measures read from the line’s logs and studies — PM compliance, planned share, MTBF." />
      {groups.map(g => (
        <Section key={g.group} title={g.group}>
          <ul className="pl-tool">
            {g.defs.map(d => {
              const n = shown.filter(s => s.agreed?.board?.key === d.key).length;
              return (
                <li key={d.key}><button type="button" className="pl-tool-card" onClick={() => nav(`/board/${d.key}`)}>
                  <b>{d.title}</b><span className="sub">{d.says}</span><span className="sub">{n ? `${n} saved` : 'None yet'}</span>
                </button></li>
              );
            })}
          </ul>
        </Section>
      ))}
      {shown.length > 0 && (
        <Section title="Saved boards">
          <ul className="lt-rows">{shown.map(s => <BoardRowItem key={s.id} s={s} siblings={siblings} />)}</ul>
        </Section>
      )}
    </div>
  );
}

function BoardList({ boardKey }: { boardKey: string }) {
  const def = boardByKey(boardKey);
  const list = useBoardList();
  const siblings = useSiblings();
  const { shown, inP, scope, setScope } = useShown(list);
  const rows = shown.filter(s => s.agreed?.board?.key === boardKey);
  const [adding, setAdding] = useState(false);
  const jobCan = useAccess(inP.id ?? '');
  const mayAdd = inP.id ? jobCan.edit : OWNER.edit;
  if (!def) return <div className="wrap ie"><p className="sub">This board isn’t in the app yet.</p></div>;
  return (
    <div className="wrap ie">
      <PageHeader eyebrow={<button type="button" className="linkish" onClick={() => nav('/board')}>Boards</button>} title={def.title} says={def.says}
        primary={mayAdd ? { label: 'New board', run: () => setAdding(true) } : undefined} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {rows.length === 0 && <p className="sub qsl-empty">No {def.title.toLowerCase()} yet — start one on the line whose PM log and reliability studies it should read.</p>}
      <ul className="lt-rows">{rows.map(s => <BoardRowItem key={s.id} s={s} siblings={siblings} />)}</ul>
      <NewBoard open={adding} def={def} onClose={() => setAdding(false)} project={inP.project ? { id: inP.project.id, lineIds: inP.lineIds } : undefined} />
    </div>
  );
}

function NewBoard({ open, def, onClose, project }: { open: boolean; def: BoardDef; onClose: () => void; project?: { id: string; lineIds: string[] } }) {
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState('');
  const lines = useFactoryLines();
  useEffect(() => { if (open && !lineId && project?.lineIds?.length) setLineId(startLine(project.lineIds)); }, [open, lineId, project]);
  const ready = name.trim() && lineId;
  const make = async () => {
    if (!ready) return;
    const s = newBoardStudy(def, { name: name.trim(), workspaceId: lineId, projectId: project?.id, now: now() });
    await putStudy(s);
    onClose();
    nav(studyHref(s));
  };
  return (
    <Sheet open={open} onClose={onClose} title={`New ${def.title.toLowerCase()}`}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        <label className="field"><span className="field-label">Name</span>
          <input className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Line 2 — October maintenance" /></label>
        <label className="field"><span className="field-label">Line</span>
          <select className="text-input" value={lineId} onChange={e => setLineId(e.target.value)}>
            <option value="">Choose a line</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select></label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start</button>
      </form>
    </Sheet>
  );
}

function BoardRecord({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>();
  const siblings = useSiblings();
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (!s) return <div className="wrap ie"><p className="sub">Not on this device.</p></div>;
  const x = studyBoard(s, siblings, now());
  if (!x) return <div className="wrap ie"><p className="sub">Not a board.</p></div>;
  return <Record s={s} def={x.def} result={x.result} siblings={siblings} can={can} onPatch={patch => void patchStudy(id, patch).then(() => load())} />;
}

function Record({ s, def, result, siblings, can, onPatch }: {
  s: ToolStudy; def: BoardDef; result: NonNullable<ReturnType<typeof studyBoard>>['result']; siblings: ToolStudy[];
  can: ReturnType<typeof canAt>; onPatch: (fn: (cur: ToolStudy) => Partial<ToolStudy>) => void;
}) {
  const reactive = s.agreed?.board?.reactiveHours;
  const canEdit = can.edit && !s.closedAt;
  const page = bandPage(def.title, s, result.verdict, result.tone, [['Catalogue', def.fc]]);
  const setReactive = (h: number | undefined) => {
    onPatch(cur => ({
      agreed: { ...cur.agreed, board: { key: cur.agreed?.board?.key ?? def.key, reactiveHours: h } },
      updatedAt: now(),
    }));
  };
  return (
    <div className="wrap ie ie-board tool-sig-board" data-board={def.key}>
      <StudyBand page={page} s={s} what={def.title} canEdit={canEdit} canRemove={can.remove} />
      <WhereItSits s={s} can={can} />
      <p className="sub">{def.question}</p>
      <LeanTiles tiles={result.tiles} />
      <p className="ie-says">{result.sentence}</p>
      <Section title="Reactive maintenance hours">
        <p className="sub">Crew-hours of reactive work in the last 30 days — until repair-time stops feed them automatically.</p>
        <label className="field"><span className="field-label">Reactive hours</span>
          <input className="text-input" type="number" min={0} step={0.5} disabled={!canEdit} value={reactive ?? ''} onChange={e => setReactive(e.target.value === '' ? undefined : Number(e.target.value))} />
        </label>
      </Section>
      <LeanPanel title="What this does not say">
        <ul className="ie-caveats">{result.caveats.map(c => <li key={c}>{c}</li>)}</ul>
        {def.limits.map(l => <p key={l} className="sub">{l}</p>)}
      </LeanPanel>
      <LeanClosing closing={{ text: result.closing, tone: result.tone }} />
      <p className="sub">Started {niceDay(isoDay(s.startedAt))} · reads {siblings.filter(x => x.workspaceId === s.workspaceId && x.tool === 'log').length} logs and {siblings.filter(x => x.workspaceId === s.workspaceId && x.tool === 'reliability').length} reliability studies on this line</p>
    </div>
  );
}
