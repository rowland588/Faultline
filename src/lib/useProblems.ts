/* A PROJECT'S PROBLEMS, LIVE — the 6M method's data hook (docs/SIXM.md).
 *
 * Reads the problems (Cases) on a project or one of its lines, and everything
 * their fishbones are filled from, out of the stores that already hold it —
 * the lines' logs, the walk, the standards, the materials, the programs, the
 * measures and the board. Nothing new is stored but the Case itself.
 *
 * `loadProblems` is the same read without React, for the client report. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Case, Observation, Workspace } from '../types';
import type { Cause, SixM } from './sixm';
import type { ProblemsApi, ProblemView } from './problems';
import {
  loadPaceLines, putPaceLine, projectWorkspaceIds, getPaceWorkspaceId, setPaceWorkspaceId,
  createWorkspace, getWorkspace, getProject, listObservations, listStandards, listMaterials,
  listPrograms, listTargets, listReadings, listPaceTodos, listProjectCases, addCase, patchCase,
  onDataChange, type PaceLineRow, type PaceTodoRow,
} from '../db';
import { loadWalkSnags } from './useWalkSnags';
import { stepAction } from './actions';
import { uid, now } from './ids';
import { todayISO } from './weeks';
import {
  belongsTo, buildView, causeFromOldWhys, fishboneData, scopeMsWeek,
  type Countermeasure, type FishboneData, type FishNote,
} from './fishbone';

/** A step on the board as a countermeasure: the board's own shape, plus the
 *  cause it is for, what it should change and the day it was done. */
export function countermeasureOf(s: PaceTodoRow, lines: PaceLineRow[], today = todayISO()): Countermeasure {
  return {
    ...stepAction(s, lines, today),
    ...(s.causeRef ? { causeRef: s.causeRef } : {}),
    ...(s.expect ? { expect: s.expect } : {}),
    ...(s.doneOn ? { doneOn: s.doneOn } : {}),
  };
}

export interface LoadedProblems {
  /** Every problem on the project, newest first — new ones and legacy Cases. */
  cases: Case[];
  data: FishboneData;
}

/** Everything a project's fishbones read, in one go. */
export async function loadProblems(projectId: string): Promise<LoadedProblems> {
  const [lines, project, walkIds] = await Promise.all([
    loadPaceLines(projectId), getProject(projectId), projectWorkspaceIds(projectId),
  ]);
  const lineWs = lines.flatMap(l => (l.workspaceId ? [l.workspaceId] : []));
  const wsIds = [...new Set([...walkIds, ...lineWs])];
  const [obs, workspaces, snags, standards, materials, programs, targets, readings, steps, cases] = await Promise.all([
    Promise.all(wsIds.map(id => listObservations(id))).then(x => x.flat() as Observation[]),
    Promise.all(lineWs.map(id => getWorkspace(id))).then(x => x.filter((w): w is Workspace => !!w)),
    loadWalkSnags(projectId).catch(() => []),
    listStandards(projectId),
    listMaterials(projectId),
    listPrograms(projectId),
    listTargets(projectId),
    listReadings(projectId),
    listPaceTodos(projectId),
    listProjectCases(projectId, lineWs),
  ]);
  const today = todayISO();
  const lineOfWs = (ws: string) => lines.find(l => l.workspaceId === ws)?.id;
  const notes: FishNote[] = [
    ...steps.flatMap(s => {
      const text = [s.notes, s.outcome].filter(Boolean).join(' — ');
      return text ? [{ text, kind: 'action' as const, ref: s.id, ...(s.lineId ? { lineId: s.lineId } : {}) }] : [];
    }),
    ...snags.flatMap(s => {
      const lineId = lineOfWs(s.wsId);
      return s.what ? [{ text: s.what, kind: 'snag' as const, ref: s.id, ...(lineId ? { lineId } : {}) }] : [];
    }),
  ];
  return {
    cases: cases.filter(c => belongsTo(c, projectId, lines)),
    data: fishboneData({
      lines, observations: obs, workspaces, snags, standards, materials, programs,
      measures: project?.measures ?? [], periods: project?.periods ?? [], targets, readings,
      actions: steps.map(s => countermeasureOf(s, lines, today)),
      notes,
    }),
  };
}

/** The problems as views — on one line when a line is asked for. */
export function viewsOf(loaded: LoadedProblems, projectId: string, lineId?: string, today = Date.now()): ProblemView[] {
  return loaded.cases
    .filter(c => belongsTo(c, projectId, loaded.data.lines, lineId))
    .map(c => buildView(c, loaded.data, today));
}

/** The drill path a new problem saves, so the older Case screens (and the
 *  Analyse screen it can open) see the same slice the fishbone does. */
function pathOf(source: Case['source'], lines: PaceLineRow[], lineId?: string): Case['path'] {
  if (!source) return [];
  if (source.kind === 'constraint') {
    const st = lines.find(l => l.id === lineId)?.capacity?.stations.find(s => s.id === source.station || s.name === source.station);
    const asset = st?.asset?.trim() || st?.name || source.asset;
    return asset ? [{ dimension: 'asset', value: asset }] : [];
  }
  if (source.kind === 'gap') return [];
  return [
    ...(source.asset ? [{ dimension: 'asset' as const, value: source.asset }] : []),
    ...(source.category ? [{ dimension: 'category' as const, value: source.category }] : []),
    ...(source.subcategory ? [{ dimension: 'subcategory' as const, value: source.subcategory }] : []),
  ];
}

/** The workspace a new problem lives in: its line's (made on first use and
 *  written onto the line, as the line's walk does), else the project's own. */
async function workspaceFor(projectId: string, line?: PaceLineRow): Promise<string> {
  if (line) {
    if (line.workspaceId) return line.workspaceId;
    const ws = await createWorkspace(line.name, 'food-packing');
    await putPaceLine({ ...line, workspaceId: ws.id });
    return ws.id;
  }
  const existing = await getPaceWorkspaceId(projectId);
  if (existing) return existing;
  const p = await getProject(projectId);
  const ws = await createWorkspace(p?.name ? `${p.name} — line walk` : 'Line walk', 'food-packing');
  await setPaceWorkspaceId(ws.id, projectId);
  return ws.id;
}

/** Open a problem: on its line, with the head it was taken from and the
 *  baseline its scope has carried over the last four full weeks. */
export async function createProblem(projectId: string, o: { title: string; lineId?: string; source: Case['source'] }): Promise<Case> {
  const lines = await loadPaceLines(projectId);
  const line = o.lineId ? lines.find(l => l.id === o.lineId) : undefined;
  const workspaceId = await workspaceFor(projectId, line);
  const t = now();
  const draft: Case = {
    id: uid(), workspaceId, title: o.title.trim() || 'Untitled problem',
    path: pathOf(o.source, lines, line?.id), baselineMsWeek: 0, status: 'open', openedAt: t, updatedAt: t,
    projectId, ...(line ? { lineId: line.id } : {}), ...(o.source ? { source: o.source } : {}), causes: [],
  };
  if (o.source?.kind !== 'gap') {
    const { data } = await loadProblems(projectId);
    draft.baselineMsWeek = Math.round(scopeMsWeek(draft, data, t));
  }
  await addCase(draft);
  return draft;
}

/** Add a cause, or change one — merged into the list by id. */
export const saveCauseOn = (problemId: string, cause: Cause) => patchCase(problemId, c => {
  const list = c.causes ?? [];
  const i = list.findIndex(x => x.id === cause.id);
  return { ...c, causes: i < 0 ? [...list, cause] : list.map((x, j) => (j === i ? cause : x)) };
});
export const removeCauseFrom = (problemId: string, causeId: string) =>
  patchCase(problemId, c => ({ ...c, causes: (c.causes ?? []).filter(x => x.id !== causeId) }));
/** A Case's old five whys put on a bone: one cause added (lib/fishbone
 *  causeFromOldWhys) and Case.whys cleared in the SAME write, so the chain is
 *  never on the screen twice and never half-moved. Read from the live row, so
 *  a chain another device has already moved is not moved again. */
export const putOldWhysOnBone = (problemId: string, m: SixM, by?: string) => patchCase(problemId, c => {
  const cause = causeFromOldWhys(c.whys ?? [], m, { newId: uid, at: now(), by });
  return cause ? { ...c, causes: [...(c.causes ?? []), cause], whys: undefined } : c;
});
/** Closed with the check that keeps the gain; with no check given, any check
 *  it already had stays. */
export const closeProblem = (problemId: string, hold?: Case['hold']) =>
  patchCase(problemId, c => ({ ...c, status: 'closed', closedAt: now(), hold: hold ?? c.hold }));
export const reopenProblem = (problemId: string) =>
  patchCase(problemId, c => ({ ...c, status: 'open', closedAt: undefined }));
/** The hold check was looked at today. */
export const checkedProblem = (problemId: string) =>
  patchCase(problemId, c => (c.hold ? { ...c, hold: { ...c.hold, lastChecked: todayISO() } } : c));

/** The 6M problems on a project — or on one of its lines — as views, kept
 *  live: anything written anywhere re-reads them (debounced). */
export function useProblems(projectId: string, lineId?: string): ProblemsApi {
  const [loaded, setLoaded] = useState<LoadedProblems | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const next = await loadProblems(projectId);
      setLoaded(next);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const run = () => { if (alive) void refresh(); };
    run();
    const off = onDataChange(() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(run, 300);
    });
    return () => { alive = false; off(); window.clearTimeout(timer.current); };
  }, [refresh]);

  /* Worked to the end of today, and re-worked when the day changes even if
     nothing is written — "late" and the weeks move on their own. */
  const day = todayISO();
  const problems = useMemo(
    () => (loaded ? viewsOf(loaded, projectId, lineId, Date.parse(`${day}T23:59:59`)) : []),
    [loaded, projectId, lineId, day],
  );

  const mustExist = (r: Case | undefined, id: string) => { if (!r) throw new Error(`No problem ${id}`); };

  return {
    problems,
    loading,
    create: o => createProblem(projectId, { ...o, lineId: o.lineId ?? lineId }),
    saveCause: async (problemId, cause) => { mustExist(await saveCauseOn(problemId, cause), problemId); },
    removeCause: async (problemId, causeId) => { mustExist(await removeCauseFrom(problemId, causeId), problemId); },
    close: async (problemId, hold) => { mustExist(await closeProblem(problemId, hold), problemId); },
    reopen: async problemId => { mustExist(await reopenProblem(problemId), problemId); },
    checked: async problemId => { mustExist(await checkedProblem(problemId), problemId); },
  };
}
