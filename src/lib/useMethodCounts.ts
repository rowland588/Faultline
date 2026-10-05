/* The numbers on a 6M (or lever tree) job's rail lines — see ui/rail
 * methodGroup. One hook, so the rail reads the same on every page: the
 * board's open actions, and Materials counting the programs it holds. `done`
 * lets a line with nothing left be drawn green rather than grey. */
import { useMemo } from 'react';
import { useActions, isLate } from './actions';
import { useStanding } from './useStanding';
import { todayISO } from './weeks';

export function useMethodCounts(projectId: string): Record<string, { n: number; late: number; done: number }> {
  const ax = useActions(projectId);
  const stand = useStanding(projectId);
  return useMemo(() => {
    const today = todayISO();
    const c = stand.counts as Record<string, { n: number; late: number; done: number } | undefined>;
    return {
      board: {
        n: ax.steps.filter(s => s.state !== 'done').length,
        late: ax.steps.filter(s => isLate(s, today)).length,
        done: ax.steps.filter(s => s.state === 'done').length,
      },
      materials: {
        n: (c.materials?.n ?? 0) + (c.programs?.n ?? 0),
        late: (c.materials?.late ?? 0) + (c.programs?.late ?? 0),
        done: (c.materials?.done ?? 0) + (c.programs?.done ?? 0),
      },
    };
  }, [ax.steps, stand.counts]);
}
