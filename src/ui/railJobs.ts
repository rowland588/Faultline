/* HOW EACH JOB STANDS, for the control room's rail.
 *
 * On the control room the rail lists every job, and each line's square has to
 * say what the board beside it says — red if anything on the job is past its
 * day, indigo if it is under way (CLAUDE.md, visual management rule 1). The
 * board (ui/JobsBoard) already reads every job, the way each job's own method
 * reads it, to draw itself. Reading them all a second time for the rail would
 * be the same work twice and could disagree with it, so the board hands its
 * answer here and the rail reads it. Off the control room (the Projects page,
 * a loose line study) the rail keeps the last answer it was given; before the
 * board has ever drawn, every job is simply under way.
 */
import { useSyncExternalStore } from 'react';

export interface JobStand { outstanding: number; late: number }

let byJob: ReadonlyMap<string, JobStand> = new Map();
const subs = new Set<() => void>();

/** Called by the board each time it has worked the jobs out. */
export function publishJobStands(jobs: { id: string; outstanding: number; late: number }[]): void {
  const next = new Map(jobs.map(j => [j.id, { outstanding: j.outstanding, late: j.late }]));
  const same = next.size === byJob.size
    && [...next].every(([id, s]) => byJob.get(id)?.outstanding === s.outstanding && byJob.get(id)?.late === s.late);
  if (same) return;
  byJob = next;
  subs.forEach(f => f());
}

export function useJobStands(): ReadonlyMap<string, JobStand> {
  return useSyncExternalStore(
    f => { subs.add(f); return () => { subs.delete(f); }; },
    () => byJob,
  );
}
