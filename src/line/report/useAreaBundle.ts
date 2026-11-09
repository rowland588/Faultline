/* AN AREA, READ — the records an area's page and its report both read (src/line/report/areaBundle), again whenever anything is
 * written, so a problem raised on one of its lines is on the area's page with no reload. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Snag } from '../../snag/types';
import type { Workspace } from '../../types';
import { listAllSnags, listWorkspaces, onDataChange, projectsOnWorkspace } from '../../db';
import { useLineRecords } from '../../lib/useLineRecords';
import { linesInArea, type AreaId } from '../../lib/areas';
import { productionLines } from '../../lib/lines';
import { todayISO } from '../../lib/weeks';
import { areaBundle, type AreaBundle } from './areaBundle';
import { useLineObs } from './usePartReadings';

export function useAreaBundle(area: AreaId | undefined) {
  const rec = useLineRecords();
  const [all, setAll] = useState<Workspace[] | null>(null);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [projOn, setProjOn] = useState<Map<string, string[]>>(new Map());
  const today = todayISO();
  const load = useCallback(async () => {
    const [ws, every] = await Promise.all([listWorkspaces(), listAllSnags()]);
    const mine = area ? linesInArea(productionLines(ws), area) : [];
    const ids = [...new Set([...mine.map(w => w.id), ...mine.flatMap(w => w.madeOf ?? [])])];
    const on = await Promise.all(ids.map(id => projectsOnWorkspace(id)));
    setAll(ws); setSnags(every); setProjOn(new Map(ids.map((id, i) => [id, on[i]])));
  }, [area]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* the ids of every line the report may hold — the area's lines and the lines a dual line of it is made of */
  const ids = useMemo(() => {
    const mine = all && area ? linesInArea(productionLines(all), area) : [];
    return [...new Set([...mine.map(w => w.id), ...mine.flatMap(w => w.madeOf ?? [])])];
  }, [all, area]);
  const { obs, jobsOn } = useLineObs(ids);
  const jobName = useCallback((id: string) => rec.jobs.find(j => j.id === id)?.name, [rec.jobs]);
  const ctx = useMemo(() => ({ observations: [...obs.values()].flat(), workspaces: all ?? [] }), [obs, all]);
  const bundle: AreaBundle | undefined = useMemo(() => {
    if (!area || !all || rec.loading) return undefined;
    const live = new Map(rec.jobs.filter(j => !j.archivedAt).map(j => [j.id, j.name]));
    return areaBundle(area, { lines: all, machines: rec.machines, programs: rec.programs, jobLines: rec.jobLines, snags, standards: rec.standards, studies: rec.studies, jobName, ctx, today,
      projectsOn: id => (projOn.get(id) ?? []).flatMap(pid => (live.has(pid) ? [{ id: pid, name: live.get(pid) as string }] : [])) });
  }, [area, all, rec, snags, jobName, ctx, today, projOn]);
  return { rec, bundle, obs, jobsOn, ctx, snags, all, today, loading: all === null || rec.loading };
}
