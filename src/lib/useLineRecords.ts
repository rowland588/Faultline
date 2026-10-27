/* THE FACTORY'S MACHINES AND PROGRAMS, LIVE (lib/lineRecords). The lines of
 * Your factory in floor order, every machine and program on the device and
 * the jobs' lines that say which line a job's records are on — read again
 * whenever anything is written, so the control room's Programs, a line's page
 * and a job all show the same records. */
import { useEffect, useState } from 'react';
import type { Project, Workspace } from '../types';
import type { Asset, Test } from './testing';
import type { Program } from './programs';
import type { Standard } from '../tools/linestandard/standard';
import type { JobLine } from './lineRecords';
import type { ToolStudy } from './study';
import { allPaceLines, allProjects, getWorkspace, listAllAssets, listAllPrograms, listAllStandards, listAllStudies, listProvingTests, listWorkspaces, onDataChange } from '../db';
import { machineKey, machinesOf, machinesToTakeOn, onlyLineOf } from './lineRecords';
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

/** A LINE'S MACHINES FOR A PICKER (lib/lineRecords machinesOf — flow audit
 *  #14): the one list every "which machine" offers, kept current. `jobId`
 *  adds that job's machines not yet placed on a line, when it is on this
 *  one. Empty for no line. */
export function useMachinesOf(wsId: string | undefined, jobId?: string): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (!wsId) { setNames([]); return; }
    const load = () => void Promise.all([getWorkspace(wsId), listAllAssets(), allPaceLines(), listWorkspaces()]).then(([ws, assets, jobLines, all]) => {
      if (live) setNames(ws ? machinesOf(ws, assets, jobLines, jobId, all) : []);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId, jobId]);
  return names;
}

/** THE MACHINES OF A PROJECT'S LINE IT CAN TAKE ON (lib/lineRecords
 *  machinesToTakeOn) — for Install's Add a machine. None for a project on no
 *  line, or on several (it says which when it adds one). */
export function useMachinesToTakeOn(projectId: string): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([allPaceLines(), listAllAssets()]).then(async ([jobLines, assets]) => {
      const wsId = onlyLineOf(projectId, jobLines);
      const ws = wsId ? await getWorkspace(wsId) : undefined;
      if (live) setNames(ws ? machinesToTakeOn(ws, assets, jobLines) : []);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return names;
}

/** A PROJECT'S OWN MACHINES (the assets it was made with, on a line or not), by name in the order set — for a
 *  picker made inside a project, beside the line's (Rowland, 25 October: "I have 2 machines in the project
 *  but I can't pick them in any drop down"). */
export function useProjectMachines(projectId: string | undefined): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (!projectId) { setNames([]); return; }
    const load = () => void listAllAssets().then(assets => {
      if (!live) return;
      const seen = new Set<string>();
      setNames(assets.filter(a => !a.deletedAt && a.projectId === projectId).slice().sort((x, y) => x.sort - y.sort)
        .filter(a => { const k = machineKey(a.name); if (!k || seen.has(k)) return false; seen.add(k); return true; }).map(a => a.name.trim()));
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return names;
}

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
    })().catch(e => {
      /* a read that failed ends the wait with what was read before — never
         "Loading…" for ever (the client report waits on this) — and says so */
      console.error('line records could not be read', e);
      if (live) setState(s => ({ ...s, loading: false }));
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return state;
}
