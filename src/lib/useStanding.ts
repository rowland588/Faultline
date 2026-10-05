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
import { gateOf, live } from './testing';

export interface StandingState {
  loading: boolean;
  standing: Standing;
  /** What the rail shows against each list (ui/rail): how many open, how
   *  many late, and how many already done — the last so a gate with nothing
   *  left can be drawn green rather than grey. Same numbers, same source — a
   *  rail that disagreed with the page beneath it would be the whole problem
   *  back again. */
  counts: Record<string, { n: number; late: number; done: number }>;
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
    const tests = by('tests'), obs = by('observations'), fixes = by('fixes');
    /* DONE is what is on the list and not open. standing() keeps only what is
       owed, so the totals are read off the same records here: a strand's live
       rows less its open ones. */
    const t = loading ? [] : live(tt.tests);
    const steps = (g: string) => t.filter(x => x.kind === 'install' && gateOf(x) === g).length;
    const total = {
      testing: t.filter(x => x.kind !== 'install' && x.kind !== 'fix').length,
      fixes: t.filter(x => x.kind === 'fix').length,
      install: steps('install'), setup: steps('setup'), handover: steps('handover'),
      materials: loading ? 0 : live(mats.materials).length,
      programs: loading ? 0 : live(progs.programs).length,
    };
    const row = (k: keyof typeof total, n: number, late: number) => ({ n, late, done: Math.max(0, total[k] - n) });
    return {
      /* Testing covers the tests AND what they turned up, because that is where
         you go to deal with either. Fixes are their own screen now and so are
         their own count. */
      testing: row('testing', (tests?.open ?? 0) + (obs?.open ?? 0), tests?.late ?? 0),
      fixes: row('fixes', fixes?.open ?? 0, fixes?.late ?? 0),
      install: row('install', by('install')?.open ?? 0, by('install')?.late ?? 0),
      materials: row('materials', by('materials')?.open ?? 0, by('materials')?.late ?? 0),
      programs: row('programs', by('programs')?.open ?? 0, by('programs')?.late ?? 0),
      /* The gates after Install — Set up's line adds the programs to this. */
      setup: row('setup', by('setup')?.open ?? 0, by('setup')?.late ?? 0),
      handover: row('handover', by('handover')?.open ?? 0, by('handover')?.late ?? 0),
    };
  }, [answer.rows, loading, tt.tests, mats.materials, progs.programs]);

  return { loading, standing: answer, counts, expectedAt, plannedAt };
}
