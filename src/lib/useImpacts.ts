/* "Did it work?" for every closed action of a project, live.
 * One hook so the board, the front page and the client report read the same
 * verdicts — see lib/impact for what a verdict is and is not. */
import { useMemo } from 'react';
import { useActions } from './actions';
import { useMeasures } from './useMeasures';
import { headline } from './measures';
import { impactOfAction, type Impact } from './impact';

export function useImpacts(projectId: string): { loading: boolean; impacts: Map<string, Impact> } {
  const ax = useActions(projectId);
  const m = useMeasures(projectId);
  const impacts = useMemo(() => {
    const lead = headline(m.measures);
    return new Map(ax.steps.map(s => [s.id, impactOfAction(s, lead, m.readings)] as const));
  }, [ax.steps, m.measures, m.readings]);
  return { loading: ax.loading || m.loading, impacts };
}
