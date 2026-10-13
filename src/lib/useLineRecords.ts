/* THE FACTORY'S MACHINES AND PROGRAMS, LIVE (lib/lineRecords). The lines of
 * Your factory in floor order, every machine and program on the device and
 * the jobs' lines that say which line a job's records are on — read again
 * whenever anything is written, so the control room's Programs, a line's page
 * and a job all show the same records. */
import { useEffect, useState } from 'react';
import type { Project, Workspace } from '../types';
import type { Asset, Test } from './testing';
import type { Program } from './programs';
import type { Standard } from './standard';
import type { JobLine } from './lineRecords';
import type { ToolStudy } from './study';
import { allPaceLines, allProjects, listAllAssets, listAllPrograms, listAllStandards, listAllStudies, listProvingTests, listWorkspaces, onDataChange } from '../db';
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
  /** What proves a program (flow audit #21): the tests that name one, on
   *  whichever job, and every study — one naming a program shows it proved
   *  (lib/programsReport proofOf). */
  provingTests: Test[];
  studies: ToolStudy[];
}

const EMPTY: LineRecords = { loading: true, lines: [], all: [], machines: [], programs: [], standards: [], jobLines: [], jobs: [], provingTests: [], studies: [] };

export function useLineRecords(): LineRecords {
  const [state, setState] = useState<LineRecords>(EMPTY);
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const [all, machines, programs, standards, jobLines, jobs, provingTests, studies] = await Promise.all([
        listWorkspaces(), listAllAssets(), listAllPrograms(), listAllStandards(), allPaceLines(), allProjects(), listProvingTests(), listAllStudies(),
      ]);
      const lines = await liveProductionLines(all);
      if (live) setState({ loading: false, lines, all, machines, programs, standards: standards.filter(s => !s.deletedAt), jobLines, jobs: jobs.filter(j => !j.deletedAt), provingTests, studies });
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return state;
}
