/* A line's timed stops, as the capacity view needs them: the last four weeks of
 * the log on the line's own workspace, live. The same log the Pareto is drawn
 * from — one source, so the two cannot disagree about what was timed. */
import { useCallback, useEffect, useState } from 'react';
import type { Observation } from '../types';
import { listObservations, onDataChange } from '../db';
import { PARETO_WINDOW_DAYS } from './paretoFromLog';

const DAY = 86_400_000;

export interface LineStops {
  loading: boolean;
  obs: Observation[];
  /** The window, in ms, so stats are cut from the same edges. */
  from: number;
  to: number;
  weeks: number;
}

export function useLineStops(workspaceId?: string): LineStops {
  const [obs, setObs] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const to = new Date().setHours(0, 0, 0, 0) + DAY;
  const from = to - PARETO_WINDOW_DAYS * DAY;
  const load = useCallback(async () => {
    if (!workspaceId) { setObs([]); setLoading(false); return; }
    setObs(await listObservations(workspaceId));
    setLoading(false);
  }, [workspaceId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  return { loading, obs, from, to, weeks: PARETO_WINDOW_DAYS / 7 };
}
