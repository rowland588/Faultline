/* THE FACTORY'S MACHINES AND PROGRAMS, LIVE (lib/lineRecords). The lines of
 * Your factory in floor order, every machine and program on the device and
 * the jobs' lines that say which line a job's records are on — read again
 * whenever anything is written, so the control room's Programs, a line's page
 * and a job all show the same records. */
import { useEffect, useState } from 'react';
import type { Project, Workspace } from '../types';
import type { Asset } from './testing';
import type { Program } from './programs';
import type { Standard } from './standard';
import type { JobLine } from './lineRecords';
import { allPaceLines, allProjects, listAllAssets, listAllPrograms, listAllStandards, listWorkspaces, onDataChange } from '../db';
import { liveProductionLines } from './lines';

export interface LineRecords {
  loading: boolean;
  /** Your factory's lines, in floor order. */
  lines: Workspace[];
  /** Every workspace — a line a record is on that is no longer on the floor
   *  (archived) is still named. */
  all: Workspace[];
  machines: Asset[];
  programs: Program[];
  standards: Standard[];
  jobLines: JobLine[];
  jobs: Project[];
}

const EMPTY: LineRecords = { loading: true, lines: [], all: [], machines: [], programs: [], standards: [], jobLines: [], jobs: [] };

export function useLineRecords(): LineRecords {
  const [state, setState] = useState<LineRecords>(EMPTY);
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const [all, machines, programs, standards, jobLines, jobs] = await Promise.all([
        listWorkspaces(), listAllAssets(), listAllPrograms(), listAllStandards(), allPaceLines(), allProjects(),
      ]);
      const lines = await liveProductionLines(all);
      if (live) setState({ loading: false, lines, all, machines, programs, standards: standards.filter(s => !s.deletedAt), jobLines, jobs: jobs.filter(j => !j.deletedAt) });
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return state;
}
