/* THE PROGRAMS A JOB MAY PROVE — its own and its lines' own (Stage 2),
 * read once for every place a test names one: Commission's picker and board
 * (lib/commissionPrograms), a test's page and its drawer. The job's alone was
 * what each read before, so a line's program could not be named from
 * Commission (Rowland, 14 October). The records are the line's and the
 * job's; nothing is copied. */
import { useMemo } from 'react';
import { usePrograms } from './usePrograms';
import { useLineRecords } from './useLineRecords';
import { jobLinePrograms, type JobLinePrograms } from './lineRecords';
import type { Program } from './programs';

export interface JobPrograms {
  loading: boolean;
  /** The job's own, in its order. */
  job: Program[];
  /** Each of its lines with the line's own programs (none of the job's). */
  lines: JobLinePrograms[];
  /** Both, the job's first, each once, none deleted. */
  all: Program[];
}

export function useJobPrograms(projectId: string): JobPrograms {
  const { programs: job, loading } = usePrograms(projectId);
  const rec = useLineRecords();
  const lines = useMemo(() => jobLinePrograms(projectId, rec.all, rec.machines, rec.programs, rec.jobLines)
    .map(l => ({ ...l, programs: l.programs.filter(p => !p.deletedAt) })), [projectId, rec]);
  const all = useMemo(() => {
    const own = job.filter(p => !p.deletedAt);
    const seen = new Set(own.map(p => p.id));
    return [...own, ...lines.flatMap(l => l.programs).filter(p => !seen.has(p.id) && (seen.add(p.id), true))];
  }, [job, lines]);
  return { loading, job, lines, all };
}
