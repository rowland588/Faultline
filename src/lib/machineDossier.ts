/* THE MACHINES' PAPERS, READ WHEN ASKED FOR — one loader for every machine paper (Rowland, 27 October: "It says,
 * hey, Rowland, where are we on line 2A? I should be able to go to line 2A on the machine and then print off a report
 * that says, there you go. There's everything that's happening on that line currently").
 *
 * Reads what the pages read — the line, its machines (lib/lineRecords machinesOnLine), every stage-gate project's
 * records for the machines it works on, the register, the studies, the stops timed — and hands each machine to
 * lib/machineDetail, the list of them to lib/factoryMachines, so the paper says what the Factory's Machines, the
 * project's Machines and the machine's own page say, with all the detail behind it. Made on the press, never kept. */
import {
  allPaceLines, allProjects, getProject, getWorkspace, listAllAssets, listAllPrograms, listAllSnags, listAllStudies, listAllTests,
  listAssets, listMaterials, listObservations, listPrograms, listStudies, listTestItems, listTests,
} from '../db';
import type { Project, Workspace } from '../types';
import type { JobInput } from './portfolio';
import { planModel } from './planModel';
import { lineOfMachine, machineKey, machinesOnLine } from './lineRecords';
import { lineMachineView } from './lineMachine';
import { loadJobFloor, projectsOnLines } from './useJobFloor';
import { machineDetailPaper } from './machineDetail';
import { factoryMachines, type InProject } from './factoryMachines';
import { gateOwed, projectMachineRows } from '../project/machines/machines';
import type { MachinePaper, MachinesPaper } from './machinePaper';
import { todayISO } from './weeks';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A stage-gate project's records, as the control room reads them (lib/useJobInputs). */
async function gateOf(project: Project): Promise<JobInput> {
  const [tests, items, assets, materials, programs, studies] = await Promise.all([
    listTests(project.id), listTestItems(project.id), listAssets(project.id), listMaterials(project.id), listPrograms(project.id), listStudies(project.id),
  ]);
  return { project, tests, items, assets, materials, programs, studies };
}

interface Shared {
  today: string;
  jobLines: Awaited<ReturnType<typeof allPaceLines>>;
  jobs: Project[];
  assets: Awaited<ReturnType<typeof listAllAssets>>;
  programs: Awaited<ReturnType<typeof listAllPrograms>>;
  tests: Awaited<ReturnType<typeof listAllTests>>;
  snags: Awaited<ReturnType<typeof listAllSnags>>;
  studies: Awaited<ReturnType<typeof listAllStudies>>;
  gates: Map<string, JobInput>;
}

async function shared(): Promise<Shared> {
  const [jobLines, jobs, assets, programs, tests, snags, studies] = await Promise.all([
    allPaceLines(), allProjects(), listAllAssets(), listAllPrograms(), listAllTests(), listAllSnags(), listAllStudies(),
  ]);
  return { today: todayISO(), jobLines, jobs: jobs.filter(j => !j.deletedAt), assets, programs, tests, snags, studies, gates: new Map() };
}

const isGate = (p: Project | undefined): p is Project => !!p && !p.archivedAt && planModel(p) === 'commissioning';

async function gateFor(s: Shared, projectId: string | undefined): Promise<JobInput | undefined> {
  if (!projectId) return undefined;
  const hit = s.gates.get(projectId);
  if (hit) return hit;
  const p = s.jobs.find(j => j.id === projectId);
  if (!isGate(p)) return undefined;
  const g = await gateOf(p);
  s.gates.set(projectId, g);
  return g;
}

/** Every machine on a line, in full — each one's page as lib/machineDetail says it. */
async function linePapers(s: Shared, ws: Workspace, only?: string): Promise<MachinePaper[]> {
  const [stops, floor] = await Promise.all([
    listObservations(ws.id),
    loadJobFloor(projectsOnLines([ws.id], s.jobLines, pid => s.jobs.some(j => j.id === pid && !j.archivedAt))),
  ]);
  const jobNames = new Map(s.jobs.map(j => [j.id, j.name]));
  const out: MachinePaper[] = [];
  for (const m of machinesOnLine(ws, s.assets, s.jobLines)) {
    if (only && machineKey(m.name) !== machineKey(only)) continue;
    const view = lineMachineView(m.name, { ws, assets: s.assets, jobLines: s.jobLines, jobs: s.jobs, programs: s.programs, tests: s.tests, snags: s.snags,
      studies: s.studies, stops, now: Date.now(), floor, jobNames, today: s.today });
    const gate = await gateFor(s, m.record?.projectId);
    out.push(machineDetailPaper({
      name: m.name, today: s.today, line: ws.name, ...(view ? { view } : {}), snags: s.snags, studies: s.studies,
      ...(gate && m.record ? { project: { name: gate.project.name, gate, assetId: m.record.id } } : {}),
    }));
  }
  return out;
}

/** THE LINE'S MACHINES REPORT — the line's machines as the Factory's Machines says them, then every machine in full. */
export async function lineMachinesPaper(wsId: string): Promise<MachinesPaper | undefined> {
  const ws = await getWorkspace(wsId);
  if (!ws) return undefined;
  const s = await shared();
  const papers = await linePapers(s, ws);
  /* the rows as the Factory's Machines says them — a project's machine as its project says it */
  const inProjects = new Map<string, InProject>();
  for (const g of s.gates.values()) for (const row of projectMachineRows(g, gateOwed(g, s.today), s.today)) inProjects.set(row.id, { projectId: g.project.id, project: g.project.name, row });
  const r = factoryMachines({ lines: [ws], assets: s.assets, jobLines: s.jobLines, jobs: s.jobs, programs: s.programs, snags: s.snags, inProjects });
  const rows = r.groups[0]?.rows ?? [];
  return {
    eyebrow: `${ws.name.toUpperCase()} · EVERY MACHINE`, title: `${ws.name} — its machines`,
    says: rows.length ? `${plural(rows.length, 'machine')} on ${ws.name} · ${r.withProject} with a project · ${r.open ? `${plural(r.open, 'problem')} open on the register${r.critical ? `, ${r.critical} critical` : ''}` : 'no problem open on the register'} — each in full on the pages after.` : `No machines named on ${ws.name} yet.`,
    groups: [{ rows: rows.map(x => ({ n: x.n, name: `${x.name}${x.oem ? ` — ${x.oem}` : ''}`, ...(x.status ? { status: { word: x.status, tone: x.statusTone ?? 'w' } } : {}), says: x.says, right: x.right, rightTone: x.rightTone })), empty: 'No machines named on it yet.' }],
    machines: papers,
    foot: `${ws.name} — its machines, each in full`,
  };
}

/** ONE MACHINE'S REPORT — on its line (its name there) or in its project (its record), in full. */
export async function machinePaper(at: { wsId: string; name: string } | { projectId: string; assetId: string }): Promise<MachinesPaper | undefined> {
  return machinePaperWith(await shared(), at);
}

async function machinePaperWith(s: Shared, at: { wsId: string; name: string } | { projectId: string; assetId: string }): Promise<MachinesPaper | undefined> {
  let paper: MachinePaper | undefined;
  if ('wsId' in at) {
    const ws = await getWorkspace(at.wsId);
    if (!ws) return undefined;
    paper = (await linePapers(s, ws, at.name))[0];
  } else {
    const asset = s.assets.find(a => a.id === at.assetId);
    const wsId = asset ? lineOfMachine(asset, s.jobLines) : undefined;
    const ws = wsId ? await getWorkspace(wsId) : undefined;
    if (ws && asset) paper = (await linePapers(s, ws, asset.name))[0];
    if (!paper && asset) {
      const project = await getProject(at.projectId);
      const gate = isGate(project) ? await gateOf(project) : undefined;
      if (gate) paper = machineDetailPaper({ name: asset.name.trim(), today: s.today, project: { name: gate.project.name, gate, assetId: asset.id }, snags: s.snags, studies: s.studies });
    }
  }
  return paper ? { eyebrow: paper.eyebrow, title: paper.name, says: '', groups: [], machines: [paper], foot: `${paper.name} — ${paper.eyebrow.replace(/^MACHINE · /, '')}` } : undefined;
}

/** A STAGE-GATE PROJECT'S MACHINES REPORT — its Machines tab's rows, then every machine in full. */
export async function projectMachinesFullPaper(projectId: string, front: Pick<MachinesPaper, 'eyebrow' | 'title' | 'says' | 'groups' | 'foot'>): Promise<MachinesPaper> {
  const s = await shared();
  const project = s.jobs.find(j => j.id === projectId);
  const gate = isGate(project) ? await gateOf(project) : undefined;
  const machines: MachinePaper[] = [];
  for (const a of gate ? gate.assets.filter(x => !x.deletedAt).sort((x, y) => x.sort - y.sort) : []) {
    const one = await machinePaperWith(s, { projectId, assetId: a.id });
    if (one?.machines[0]) machines.push(one.machines[0]);
  }
  return { ...front, machines };
}
