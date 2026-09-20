/* What one project measures, and every number recorded against it.
 *
 * Small on purpose. A measure is a name, a unit and a direction; a period is a
 * name and two dates; a target and a reading are each one number. If this file
 * grows a vocabulary, the model has drifted back towards the four quarters of
 * packs per minute it replaced.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProject, updateProject, listTargets, putTarget, deleteTarget, listReadings, putReading, putReadings, deleteReading, onDataChange } from '../db';
import { uid, now } from './ids';
import { bySort, quarters, standingFor, targetsAcross } from './measures';
import type { Direction, Measure, Period, Reading, Standing, Target } from './measures';
import type { Project } from '../types';

export interface MeasuresState {
  loading: boolean;
  project?: Project;
  measures: Measure[];
  periods: Period[];
  targets: Target[];
  readings: Reading[];

  /* ---- what this business measures ---- */
  addMeasure: (name: string, unit: string, direction: Direction) => Promise<void>;
  saveMeasure: (m: Measure) => Promise<void>;
  removeMeasure: (id: string) => Promise<void>;

  /* ---- what it calls its periods ---- */
  addPeriod: (name: string, from?: string, to?: string) => Promise<void>;
  savePeriod: (p: Period) => Promise<void>;
  removePeriod: (id: string) => Promise<void>;
  /** Four quarters from a date, OFFERED to a project that has none. */
  offerQuarters: (fromISO: string) => Promise<void>;

  /* ---- the numbers ---- */
  setTarget: (lineId: string, measureId: string, periodId: string, value?: number) => Promise<void>;
  addReading: (lineId: string, measureId: string, at: string, value: number, note?: string) => Promise<void>;
  removeReading: (id: string) => Promise<void>;
  /** A pasted batch, written in one go. */
  importReadings: (rows: { lineId: string; measureId: string; at: string; value: number }[]) => Promise<void>;

  /* ---- read ---- */
  standingFor: (lineId: string) => Standing[];
  targetsAcross: (lineId: string, measureId: string) => { period: Period; value?: number }[];
}

export function useMeasures(projectId: string): MeasuresState {
  const [project, setProject] = useState<Project | undefined>();
  const [targets, setTargets] = useState<Target[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, t, r] = await Promise.all([getProject(projectId), listTargets(projectId), listReadings(projectId)]);
    setProject(p); setTargets(t); setReadings(r);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const measures = useMemo(() => bySort(project?.measures ?? []), [project]);
  const periods = useMemo(() => bySort(project?.periods ?? []), [project]);

  /* Measures and periods are lists on the project row, so every change to one is
     a write of the project. Read back first rather than patching the copy in
     state: two edits in quick succession would otherwise lose the first. */
  const patch = useCallback(async (f: (p: Project) => Partial<Project>) => {
    const p = await getProject(projectId);
    if (!p) return;
    await updateProject({ ...p, ...f(p), updatedAt: now() });
  }, [projectId]);

  const addMeasure = useCallback(async (name: string, unit: string, direction: Direction) => {
    const clean = name.trim();
    if (!clean) return;
    await patch(p => ({
      measures: [...(p.measures ?? []), {
        id: uid(), name: clean, unit: unit.trim() || undefined, direction,
        sort: (p.measures ?? []).reduce((n, m) => Math.max(n, m.sort), 0) + 10,
      }],
    }));
  }, [patch]);

  const saveMeasure = useCallback(async (m: Measure) => {
    await patch(p => ({ measures: (p.measures ?? []).map(x => (x.id === m.id ? m : x)) }));
  }, [patch]);

  /* A measure is removed from the list; its targets and readings are left where
     they are. Deleting somebody's numbers because they tidied up a name is the
     worst possible answer to "we don't track that any more", and putting the
     measure back brings them all with it. */
  const removeMeasure = useCallback(async (id: string) => {
    await patch(p => ({ measures: (p.measures ?? []).filter(m => m.id !== id) }));
  }, [patch]);

  const addPeriod = useCallback(async (name: string, from?: string, to?: string) => {
    const clean = name.trim();
    if (!clean) return;
    await patch(p => ({
      periods: [...(p.periods ?? []), {
        id: uid(), name: clean, from, to,
        sort: (p.periods ?? []).reduce((n, x) => Math.max(n, x.sort), 0) + 10,
      }],
    }));
  }, [patch]);

  const savePeriod = useCallback(async (period: Period) => {
    await patch(p => ({ periods: (p.periods ?? []).map(x => (x.id === period.id ? period : x)) }));
  }, [patch]);

  const removePeriod = useCallback(async (id: string) => {
    await patch(p => ({ periods: (p.periods ?? []).filter(x => x.id !== id) }));
  }, [patch]);

  const offerQuarters = useCallback(async (fromISO: string) => {
    await patch(p => ({ periods: [...(p.periods ?? []), ...quarters(fromISO, uid)] }));
  }, [patch]);

  /* One target per line, measure and period. Setting it to nothing removes it,
     because "no target" is a real state and a zero is a target of zero. */
  const setTarget = useCallback(async (lineId: string, measureId: string, periodId: string, value?: number) => {
    const existing = targets.find(t => t.lineId === lineId && t.measureId === measureId && t.periodId === periodId);
    if (value == null || Number.isNaN(value)) {
      if (existing) await deleteTarget(existing.id);
      return;
    }
    await putTarget(existing
      ? { ...existing, value }
      : { id: uid(), projectId, lineId, measureId, periodId, value, updatedAt: now() });
  }, [projectId, targets]);

  const addReading = useCallback(async (lineId: string, measureId: string, at: string, value: number, note?: string) => {
    const t = now();
    await putReading({ id: uid(), projectId, lineId, measureId, at, value, note, createdAt: t, updatedAt: t });
  }, [projectId]);

  const removeReading = useCallback(async (id: string) => { await deleteReading(id); }, []);

  const importReadings = useCallback(async (rows: { lineId: string; measureId: string; at: string; value: number }[]) => {
    const t = now();
    await putReadings(rows.map(r => ({ ...r, id: uid(), projectId, createdAt: t, updatedAt: t })));
  }, [projectId]);

  const standing = useCallback(
    (lineId: string) => standingFor(measures, periods, targets, readings, lineId),
    [measures, periods, targets, readings],
  );
  const across = useCallback(
    (lineId: string, measureId: string) => targetsAcross(periods, targets, lineId, measureId),
    [periods, targets],
  );

  return {
    loading, project, measures, periods, targets, readings,
    addMeasure, saveMeasure, removeMeasure,
    addPeriod, savePeriod, removePeriod, offerQuarters,
    setTarget, addReading, removeReading, importReadings,
    standingFor: standing, targetsAcross: across,
  };
}
