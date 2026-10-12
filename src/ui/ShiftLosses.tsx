/* A LINE'S LATEST SHIFT, COUNTED — the branch a loss count puts wherever the
 * line's stops are read (docs/TOOLKIT.md, tool 7: "the line's board, beside
 * the Pareto"; docs/BUILD.md, E).
 *
 * The Pareto ranks the stops the floor timed; it cannot say how much of the
 * shift's loss they explain. One line under it does: "Shift 1 yesterday: 85
 * min lost · 9 min not yet explained ›" — the part not yet explained the only
 * thing that may wear amber, and only over a tenth. One tap opens the count.
 * And the door to make one: "Count a shift" — the shift that has just run
 * on this line, the standard's rate when the line has one product with an
 * agreed rate, on the line's job when it has one.
 *
 * Reads: the line's studies of tool 'losses', its stops and its cost model.
 * Writes: a new study, only on "Count a shift", only for someone who may. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { chainForWorkspace, getWorkspace, listObservations, listStandardsForLine, listStudiesForLine, onDataChange, putStudy } from '../db';
import { currentLosses, lossCardLine, studyHref, type StudyContext } from '../lib/studyLinks';
import { firstCount } from '../lib/ie/losses';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import type { ToolStudy } from '../lib/study';
import type { Observation, Workspace } from '../types';

/** What a set of studies reads beside their facts (lib/studyLinks
 *  StudyContext): for the loss counts among them, their lines' stops and
 *  cost models — loaded only when there is a loss count to read them for. */
export function useStudyContext(studies: ToolStudy[]): StudyContext {
  const key = [...new Set(studies.filter(s => s.tool === 'losses' && !s.deletedAt && s.workspaceId).map(s => s.workspaceId as string))].sort().join('|');
  const [ctx, setCtx] = useState<StudyContext>({});
  useEffect(() => {
    if (!key) { setCtx({}); return; }
    const ids = key.split('|');
    let alive = true;
    const load = async () => {
      const [obs, ws] = await Promise.all([
        Promise.all(ids.map(id => listObservations(id))).then(x => x.flat() as Observation[]),
        Promise.all(ids.map(id => getWorkspace(id))).then(x => x.filter((w): w is Workspace => !!w)),
      ]);
      if (alive) setCtx({ observations: obs, workspaces: ws });
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { alive = false; off(); };
  }, [key]);
  return ctx;
}

/** A line's loss counts and what they read, kept current. */
function useLineLosses(workspaceId?: string): { studies: ToolStudy[]; ctx: StudyContext; line?: Workspace } {
  const [st, setSt] = useState<{ studies: ToolStudy[]; ctx: StudyContext; line?: Workspace }>({ studies: [], ctx: {} });
  const load = useCallback(async () => {
    if (!workspaceId) { setSt({ studies: [], ctx: {} }); return; }
    const [studies, observations, line] = await Promise.all([listStudiesForLine(workspaceId), listObservations(workspaceId), getWorkspace(workspaceId)]);
    setSt({ studies: studies.filter(s => s.tool === 'losses'), ctx: { observations, workspaces: line ? [line] : [] }, ...(line ? { line } : {}) });
  }, [workspaceId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return st;
}

/** Start a count of the shift that has just run on this line, and open it. */
export async function countAShift(line: Workspace, projectId?: string): Promise<void> {
  const t = now();
  /* one product with an agreed rate on the line: its rate, said as the standard's */
  const rated = (await listStandardsForLine(line.id)).filter(s => !s.deletedAt && (s.capacity?.targetPerMin ?? 0) > 0);
  const std = rated.length === 1 ? rated[0] : undefined;
  /* on the line's job when the line is one job's — else a count on the line */
  const job = projectId ?? (await chainForWorkspace(line.id))?.projectId;
  const s: ToolStudy = {
    id: uid(), tool: 'losses', name: 'Loss count', workspaceId: line.id, ...(job ? { projectId: job } : {}),
    ...(std ? { standardId: std.id, product: std.product } : {}),
    facts: { losses: firstCount(line.shifts ?? [], std?.capacity?.targetPerMin, t) }, uses: [], startedAt: t, createdAt: t, updatedAt: t,
  };
  await putStudy(s);
  nav(studyHref(s));
}

/** THE LINE'S LATEST SHIFT in one line, and the door to count one. `name`:
 *  the line's name, when more than one line is in view. */
export function ShiftLossLine({ workspaceId, projectId, canEdit, name, quiet }: {
  workspaceId?: string; projectId?: string; canEdit: boolean; name?: string;
  /** Said nothing at all when no shift is counted yet and nobody may count one. */
  quiet?: boolean;
}) {
  const { studies, ctx, line } = useLineLosses(workspaceId);
  const cur = useMemo(() => (workspaceId ? currentLosses(studies, workspaceId) : undefined), [studies, workspaceId]);
  const said = cur ? lossCardLine(cur, ctx) : undefined;
  const [busy, setBusy] = useState(false);
  if (!workspaceId || (!cur && (!canEdit || quiet))) return null;
  const count = async () => {
    if (!line || busy) return;
    setBusy(true);
    try { await countAShift(line, projectId); } finally { setBusy(false); }
  };
  return (
    <div className="sll" aria-label="The latest shift's losses">
      {cur && said ? (
        <button type="button" className="sll-go" onClick={() => nav(studyHref(cur))}>
          <span className="sll-k">{name ? `${name} · the latest shift` : 'The latest shift'}</span>
          <span className={'sll-t' + (said.abnormal ? ' is-a' : '')}>{said.text}</span>
          <span className="sll-c" aria-hidden>›</span>
        </button>
      ) : <span className="sll-none sub">{name ? `${name}: ` : ''}No shift counted yet — two counts at the end of a shift say how much of its loss these stops explain.</span>}
      {canEdit && line && <button type="button" className="btn sll-new" disabled={busy} onClick={() => void count()}>Count a shift</button>}
    </div>
  );
}
