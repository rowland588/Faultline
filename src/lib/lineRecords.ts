/* THE LINE'S MACHINES AND PROGRAMS (docs/BLUEPRINT.md, Stage 2).
 *
 * Rowland, 13 October: "programs should be able to pick programs from the
 * control room and plan a program for a line rather than open up a full
 * project system." A running line gets new programs too, with no job.
 *
 * No new record. A machine (lib/testing Asset) and a program (lib/programs)
 * each say which line of the factory they are on (`workspaceId`) and, when a
 * job brought them in, which job (`projectId`; '' when none). This module is
 * the one place that answers "which line is it on?" and "what are a line's
 * machines, in flow order?", so the line's page, the control room's Programs,
 * Your factory, the paper and a job all read the same answer.
 *
 * THE MACHINES' NAMES ARE THE LINE'S OWN LIST (`workspace.assets`, in flow
 * order, set up in Set up the line): the list every machine picker already
 * reads — the stopwatch, the walk, a problem — and every timed stop is kept
 * against. A machine's RECORD carries what more is known about one of those
 * names: who made it, the programs it runs, the job that brought it in. They
 * are joined by name, so a list of names is never migrated into records, and a
 * record is made the first time more than the name is said. */
import type { ID, Workspace } from '../types';
import type { Asset } from './testing';
import type { Program } from './programs';
import { inOrder, isProved, standingOf, todayISO } from './programs';
import { programsReading, type ProgramsReading } from './programsReport';

/** Just enough of a job's line (db PaceLineRow) to know its factory line. */
export interface JobLine { id: string; projectId?: string; workspaceId?: string; deletedAt?: number }

/** A machine name as compared — case and spacing never make two machines. */
export const machineKey = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** "Whole line" is the stopwatch's word for a loss on no one machine — a
 *  place on its list, never a machine. */
const notAMachine = (name: string) => !name.trim() || machineKey(name) === 'whole line';

/** The factory lines a job is on, each once, in the job's own order — two of
 *  its lines kept on one line of the factory are that one line. */
export function factoryLinesOf(projectId: string, jobLines: readonly JobLine[]): string[] {
  if (!projectId) return [];
  return [...new Set(jobLines.filter(l => !l.deletedAt && l.projectId === projectId && l.workspaceId).map(l => l.workspaceId as string))];
}

/** The factory line a job is on, when it is on exactly one. */
export function onlyLineOf(projectId: string, jobLines: readonly JobLine[]): string | undefined {
  const ws = factoryLinesOf(projectId, jobLines);
  return ws.length === 1 ? ws[0] : undefined;
}

/** THE LINE A PROGRAM IS ON — its own, else the job line it names, else its
 *  job's only factory line. A job's program written before programs had a
 *  line is found on its line this way, without being written again. */
export function lineOfProgram(p: Pick<Program, 'workspaceId' | 'projectId' | 'lineId'>, jobLines: readonly JobLine[]): string | undefined {
  if (p.workspaceId) return p.workspaceId;
  const named = p.lineId ? jobLines.find(l => l.id === p.lineId && !l.deletedAt)?.workspaceId : undefined;
  return named ?? onlyLineOf(p.projectId, jobLines);
}

/** The line a machine stands on — its own, else its job's only factory line. */
export function lineOfMachine(a: Pick<Asset, 'workspaceId' | 'projectId'>, jobLines: readonly JobLine[]): string | undefined {
  return a.workspaceId ?? onlyLineOf(a.projectId, jobLines);
}

export interface LineMachine {
  name: string;
  /** Its record, when more than its name is known. */
  record?: Asset;
  /** The job that brought it in — its record's job, when it has one. */
  jobId?: string;
}

/** THE LINE'S MACHINES IN FLOW ORDER — its list of names, each joined to its
 *  record on the line; then any machine a job brought in that the list does
 *  not name yet (a job's Install machine, on its line). A record of the line's
 *  own whose name has left the list has left the line. */
export function machinesOnLine(ws: Pick<Workspace, 'id' | 'assets'>, assets: readonly Asset[], jobLines: readonly JobLine[]): LineMachine[] {
  const mine = assets.filter(a => !a.deletedAt && lineOfMachine(a, jobLines) === ws.id)
    .slice().sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const byName = new Map<string, Asset>();
  /* The line's own record first, then a job's, for a name both carry. */
  for (const a of [...mine.filter(x => !x.projectId), ...mine.filter(x => x.projectId)]) {
    const k = machineKey(a.name);
    if (k && !byName.has(k)) byName.set(k, a);
  }
  const out: LineMachine[] = [];
  const seen = new Set<string>();
  for (const name of ws.assets ?? []) {
    const k = machineKey(name);
    if (notAMachine(name) || seen.has(k)) continue;
    seen.add(k);
    const record = byName.get(k);
    out.push({ name: name.trim(), ...(record ? { record } : {}), ...(record?.projectId ? { jobId: record.projectId } : {}) });
  }
  for (const a of mine) {
    const k = machineKey(a.name);
    if (!a.projectId || !k || seen.has(k)) continue;
    seen.add(k);
    out.push({ name: a.name.trim(), record: a, jobId: a.projectId });
  }
  return out;
}

/** Every program on the line, in the order the person set (lib/programs). */
export function programsOnLine(wsId: string, programs: readonly Program[], jobLines: readonly JobLine[]): Program[] {
  return inOrder(programs.filter(p => lineOfProgram(p, jobLines) === wsId));
}

/** The machine a program is on, by name, when it is one of the line's. */
export function machineOfProgram(p: Pick<Program, 'assetId'>, machines: readonly LineMachine[]): LineMachine | undefined {
  return p.assetId ? machines.find(m => m.record?.id === p.assetId) : undefined;
}

/** The id a line's own machine record is made with: the same on every
 *  device for the same name, so two phones naming one machine make one row. */
export const lineMachineId = (wsId: ID, name: string): string =>
  `mc-${wsId}-${machineKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'machine'}`;

/** THE LINE'S PRODUCTS (D2: not a list of their own) — what its programs run
 *  and what its line standards map, each once, in the order first met. */
export function productsOnLine(programs: readonly Pick<Program, 'runs'>[], standards: readonly { product?: string; deletedAt?: number }[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of [...programs.map(p => p.runs ?? ''), ...standards.filter(s => !s.deletedAt).map(s => s.product ?? '')]) {
    const k = machineKey(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(name.trim());
  }
  return out;
}

/** ONE LINE'S PROGRAMS, OR EVERY LINE'S, AS THE PROGRAMS REPORT READS THEM
 *  (lib/programsReport — the job's reading, with no stage and no test on a
 *  line of its own): machine by machine in flow order, the line itself last.
 *  Every line at once names each machine with its line ("Line 7 · Bagger").
 *  A program on a machine that has left the line's list reads as the line's. */
export function lineProgramsReading(lines: readonly { name: string; id: string; machines: readonly LineMachine[]; programs: readonly Program[] }[], today?: string): ProgramsReading | undefined {
  const many = lines.length > 1;
  const assets: Asset[] = [];
  const programs: Program[] = [];
  let n = 0;
  for (const l of lines) {
    const own = l.machines.filter(m => m.record).map(m => m.record as Asset);
    for (const a of own) assets.push({ ...a, name: many ? `${l.name} · ${a.name}` : a.name, sort: n++ });
    const lineItself = many ? `line:${l.id}` : undefined;
    if (many) assets.push({ id: `line:${l.id}`, projectId: '', name: `${l.name} · the line itself`, state: 'running', sort: n++, updatedAt: 0 });
    for (const p of l.programs) {
      const on = p.assetId && own.some(a => a.id === p.assetId) ? p.assetId : lineItself;
      programs.push({ ...p, ...(on ? { assetId: on } : { assetId: undefined }) });
    }
  }
  return programsReading({ tests: [], items: [], assets, programs, ...(today ? { today } : {}) });
}

export interface LineKit {
  machines: LineMachine[];
  programs: Program[];
  proved: number;
  /** Not proved, and the day its test was booked for has gone. */
  late: number;
  /** "3 machines · 4 programs, 2 proved" — the work, neutral; the late are
   *  said apart, in red, where they are drawn. */
  says: string;
  /** The machines in flow order, each with who made it — "Bagger (Ishida) →
   *  Checkweigher". */
  flow: string;
}

/** A LINE'S MACHINES AND PROGRAMS IN A SENTENCE — what Your factory's row,
 *  the factory on paper and the line's page say about them. */
export function lineKit(ws: Pick<Workspace, 'id' | 'assets'>, assets: readonly Asset[], programs: readonly Program[], jobLines: readonly JobLine[], today = todayISO()): LineKit {
  const machines = machinesOnLine(ws, assets, jobLines);
  const progs = programsOnLine(ws.id, programs, jobLines);
  const proved = progs.filter(isProved).length;
  const late = progs.filter(p => standingOf(p, today) === 'overdue').length;
  const says = [
    machines.length ? `${machines.length} machine${machines.length === 1 ? '' : 's'}` : '',
    progs.length ? `${progs.length} program${progs.length === 1 ? '' : 's'}, ${proved} proved` : '',
  ].filter(Boolean).join(' · ');
  const flow = machines.map(m => (m.record?.oem ? `${m.name} (${m.record.oem})` : m.name)).join(' → ');
  return { machines, programs: progs, proved, late, says, flow };
}
