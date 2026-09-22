/* WHERE THE JOB IS, live — the five lists, read at once.
 *
 * lib/standing.ts does the thinking and knows nothing about React. This is the
 * wiring: a screen asks one question instead of five, and cannot answer it
 * differently from the client report, which calls the same `standing()` on the
 * same records.
 */
import { useMemo } from 'react';
import { useProject } from './useProjects';
import { useTesting } from './useTesting';
import { useMaterials } from './useMaterials';
import { usePrograms } from './usePrograms';
import { standing, type Standing } from './standing';

export interface StandingState {
  loading: boolean;
  standing: Standing;
  /** What the peers row shows against each list: how many open, how many late.
   *  Same numbers, same source — a row that disagreed with the page beneath it
   *  would be the whole problem back again. */
  counts: Record<string, { n: number; late: number }>;
  /** The day the job is expected to be at rate, and what that was agreed to be.
   *  The standing sentence folds them into "27 days to go" and a slip count;
   *  the timeline needs the dates themselves, to draw the two markers and the
   *  ground between them. */
  expectedAt?: string;
  plannedAt?: string;
}

const EMPTY: Standing = { sentence: '', outstanding: 0, late: 0, rows: [], plan: [] };

export function useStanding(projectId: string): StandingState {
  const { project, loading: pl } = useProject(projectId);
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);

  const loading = pl || tt.loading || mats.loading || progs.loading;
  const expectedAt = project?.expectedAt;
  const plannedAt = project?.plannedAt;

  const answer = useMemo(() => (loading ? EMPTY : standing({
    tests: tt.tests, items: tt.items, assets: tt.assets,
    materials: mats.materials, programs: progs.programs,
    expectedAt, plannedAt,
  })), [loading, tt.tests, tt.items, tt.assets, mats.materials, progs.programs, expectedAt, plannedAt]);

  /* The peers row is keyed by ROUTE, not by strand: Testing covers the trials
     AND what they turned up, because that is where you go to deal with either. */
  const counts = useMemo(() => {
    const by = (k: string) => answer.rows.find(r => r.key === k);
    const trials = by('trials'), obs = by('observations'), acts = by('actions');
    return {
      testing: {
        n: (trials?.open ?? 0) + (obs?.open ?? 0) + (acts?.open ?? 0),
        late: (trials?.late ?? 0) + (acts?.late ?? 0),
      },
      materials: { n: by('materials')?.open ?? 0, late: by('materials')?.late ?? 0 },
      programs: { n: by('programs')?.open ?? 0, late: by('programs')?.late ?? 0 },
      setup: { n: 0, late: 0 },
    };
  }, [answer.rows]);

  return { loading, standing: answer, counts, expectedAt, plannedAt };
}
