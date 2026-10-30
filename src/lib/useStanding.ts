/* WHERE THE JOB IS, live — the five lists, read at once.
 *
 * lib/standing.ts does the thinking and knows nothing about React. This is the
 * wiring: a screen asks one question instead of five, and cannot answer it
 * differently from the client report, which calls the same `standing()` on the
 * same records.
 */
import { useEffect, useMemo, useState } from 'react';
import { listAllStandards, listStudies, onDataChange } from '../db';
import type { Standard } from '../tools/linestandard/standard';
import type { ToolStudy } from './study';
import { judgedByCriteria } from './programs';
import { useProject } from './useProjects';
import { useTesting } from './useTesting';
import { useMaterials } from './useMaterials';
import { usePrograms } from './usePrograms';
import { standing, type Standing } from './standing';
import { gateOf, live } from './testing';
import { lateOrProblem } from './install';
import { todayISO } from './weeks';
import { programsReading } from './programsReport';
import { problemsTally } from './noted';

export interface StandingState {
  loading: boolean;
  standing: Standing;
  /** What the rail shows against each list (ui/rail): how many open, how
   *  many late, and how many already done — the last so a gate with nothing
   *  left can be drawn green rather than grey. Same numbers, same source — a
   *  rail that disagreed with the page beneath it would be the whole problem
   *  back again. */
  counts: Record<string, { n: number; late: number; done: number; problem?: number }>;
  /** The day the job is expected to be at rate, and what that was agreed to be.
   *  The standing sentence folds them into "27 days to go" and a slip count;
   *  the timeline needs the dates themselves, to draw the two markers and the
   *  ground between them. */
  expectedAt?: string;
  plannedAt?: string;
}

const EMPTY: Standing = { sentence: '', outstanding: 0, late: 0, rows: [], plan: [], lateThings: [] };

export function useStanding(projectId: string): StandingState {
  const { project, loading: pl } = useProject(projectId);
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  /* the studies a program's criteria are answered by (lib/programCriteria) — its count says the same as its page */
  const [studies, setStudies] = useState<ToolStudy[] | undefined>(undefined);
  const [standards, setStandards] = useState<Standard[] | undefined>(undefined);
  /* read only when a program is judged by criteria — every other count needs none */
  const judged = progs.programs.some(judgedByCriteria);
  useEffect(() => {
    if (!judged) { setStudies(undefined); setStandards(undefined); return undefined; }
    let on = true;
    const load = () => void Promise.all([listStudies(projectId), listAllStandards()]).then(([s, st]) => { if (on) { setStudies(s); setStandards(st); } });
    load();
    const off = onDataChange(load);
    return () => { on = false; off(); };
  }, [projectId, judged]);

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
    const tests = by('tests'), obs = by('observations');
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
    /* A gate's stages that hit a problem and lost no time — amber on the
       rail, said apart from late (lib/install lateOrProblem). */
    const today = todayISO();
    const problems = (g: string) => t.filter(x => x.kind === 'install' && gateOf(x) === g && lateOrProblem(x, tt.items, today) === 'problem').length;
    return {
      /* Testing covers the tests AND what they turned up, because that is where
         you go to deal with either. Fixes are their own screen now and so are
         their own count. */
      testing: row('testing', (tests?.open ?? 0) + (obs?.open ?? 0), tests?.late ?? 0),
      /* PROBLEMS — the fixes to do AND the problems no fix is booked for,
         the late the fixes past their day: the count the Problems page says
         at its head (lib/noted problemsTally). It counted the fixes alone —
         "Problems 5" over a page holding 7 more (FLOW-AUDIT.md, 16). */
      fixes: (x => ({ n: x.open, late: x.late, done: x.done }))(problemsTally(tt.tests, tt.items, tt.assets, today)),
      /* INSTALL carries the machines still to land, the late ones late — its
         Needs you lists a machine late on site as the control room does
         (FLOW-AUDIT.md, 16). */
      install: { ...(r => ({ ...r, n: r.n + (by('machines')?.open ?? 0), late: r.late + (by('machines')?.late ?? 0) }))(row('install', by('install')?.open ?? 0, by('install')?.late ?? 0)), problem: problems('install') },
      materials: row('materials', by('materials')?.open ?? 0, by('materials')?.late ?? 0),
      /* THE PROGRAMS line — every program (lib/programsReport): open is what
         has not passed; late what is past its day, failed what failed — two
         words, as the Programs page's tiles say them. */
      programs: (r => (r ? { n: r.open + r.late + r.failed, late: r.late, failed: r.failed, done: r.done + r.baseline } : row('programs', by('programs')?.open ?? 0, by('programs')?.late ?? 0)))(
        loading ? undefined : programsReading({ tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs, today, holder: project, ...(studies ? { studies } : {}), ...(standards ? { standards } : {}) })),
      /* The gates after Install. */
      setup: { ...row('setup', by('setup')?.open ?? 0, by('setup')?.late ?? 0), problem: problems('setup') },
      handover: { ...row('handover', by('handover')?.open ?? 0, by('handover')?.late ?? 0), problem: problems('handover') },
    };
  }, [answer.rows, loading, tt.tests, tt.items, tt.assets, mats.materials, progs.programs, project, studies, standards]);

  return { loading, standing: answer, counts, expectedAt, plannedAt };
}
