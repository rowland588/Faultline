/* THE REGISTER'S PROBLEMS FOR A JOB, NOT ON IT YET — counted for the job's
 * band (lib/stageGateLean criticalTile), read the way its papers read them
 * (lib/clientReport assignedToJob), and kept current.
 *
 * Walkthrough, 25 October: Line 2 A had five open problems filed to it and its
 * front page said "Critical 0 — none open" and "Fixes open 0". The papers and
 * the band now count the same problems. */
import { useEffect, useState } from 'react';
import { listAllSnags, onDataChange } from '../db';
import { assignedToJob } from './clientReport';

export interface AssignedCount { open: number; critical: number }

/** undefined while the register is being read. */
export function useAssignedProblems(projectId: string): AssignedCount | undefined {
  const [got, setGot] = useState<AssignedCount | undefined>(undefined);
  useEffect(() => {
    let on = true;
    const load = () => void listAllSnags().then(all => {
      if (!on) return;
      const mine = assignedToJob(all, projectId);
      setGot({ open: mine.length, critical: mine.filter(sn => sn.priority === 'critical').length });
    }).catch(() => { if (on) setGot(undefined); });
    load();
    const off = onDataChange(load);
    return () => { on = false; off(); };
  }, [projectId]);
  return got;
}
