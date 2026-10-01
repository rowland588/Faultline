/* The numbers on a 3P (or lever tree) job's row of tabs — see methodPeers.
 * One hook, so the row reads the same on every page that carries it: the
 * board's open actions, and Materials counting the programs it holds. */
import { useMemo } from 'react';
import { useActions, isLate } from './actions';
import { useStanding } from './useStanding';
import { todayISO } from './weeks';

export function useMethodCounts(projectId: string): Record<string, { n: number; late: number }> {
  const ax = useActions(projectId);
  const stand = useStanding(projectId);
  return useMemo(() => {
    const today = todayISO();
    const c = stand.counts as Record<string, { n: number; late: number } | undefined>;
    return {
      board: {
        n: ax.steps.filter(s => s.state !== 'done').length,
        late: ax.steps.filter(s => isLate(s, today)).length,
      },
      materials: {
        n: (c.materials?.n ?? 0) + (c.programs?.n ?? 0),
        late: (c.materials?.late ?? 0) + (c.programs?.late ?? 0),
      },
    };
  }, [ax.steps, stand.counts]);
}
