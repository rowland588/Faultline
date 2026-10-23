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
import type { Asset, Test } from './testing';
import type { Program } from './programs';
import { inOrder, productsOf, isProved, standingOf, todayISO } from './programs';
import { programsReading, proofOf, readingOf, type ProgramLine, type ProgramsReading } from './programsReport';
import type { ToolStudy } from './study';

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

/** The job's lines as the factory holds them — their speed, shifts and
 *  margin a pack price a day late (lib/lineLoss linesDay). */
export function jobFactoryLines<W extends { id: string }>(projectId: string, jobLines: readonly JobLine[], all: readonly W[]): W[] {
  return factoryLinesOf(projectId, jobLines).flatMap(id => all.filter(w => w.id === id));
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

/** "Whole line" — the stopwatch's place for a loss on no one machine. A
 *  picker that offers places keeps it first (ui: the stopwatch). */
export const isWholeLine = (name: string): boolean => machineKey(name) === 'whole line';

/** EVERY "WHICH MACHINE" ON A LINE — the one source every picker reads
 *  (BLUEPRINT §6.2; flow audit #14, 13 October: "One line has three lists
 *  of machines. The problem sheet offers another line's machines. The
 *  stopwatch offers 1 of 4. Capacity stations never reach the line's list
 *  ... A study's machine is typed."). The line's machines in flow order —
 *  its list, then the machines its jobs brought onto it (machinesOnLine) —
 *  and, for a job on this line, that job's own machines not yet placed on
 *  any one line (a job on several lines). Never another line's. Names only:
 *  a stop, a problem, a station and a study are kept against the name. */
export function machinesOf(ws: Pick<Workspace, 'id' | 'assets'>, assets: readonly Asset[], jobLines: readonly JobLine[], jobId?: string): string[] {
  const out = machinesOnLine(ws, assets, jobLines).map(m => m.name);
  const onThisLine = !!jobId && jobLines.some(l => !l.deletedAt && l.projectId === jobId && l.workspaceId === ws.id);
  if (!onThisLine) return out;
  const seen = new Set(out.map(machineKey));
  for (const a of assets.filter(x => !x.deletedAt && x.projectId === jobId && !lineOfMachine(x, jobLines)).slice().sort((x, y) => x.sort - y.sort)) {
    const k = machineKey(a.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(a.name.trim());
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
  for (const name of [...programs.flatMap(p => productsOf(p.runs)), ...standards.filter(s => !s.deletedAt).map(s => s.product ?? '')]) {
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
export function lineProgramsReading(lines: readonly { name: string; id: string; machines: readonly LineMachine[]; programs: readonly Program[] }[], today?: string,
  /** What each job's floor said of its programs (lib/useJobFloor), and the
   *  jobs' names: said under the program on paper, as on the screen (flow
   *  audit #3: one program, one answer). */
  o: { floor?: ReadonlyMap<string, { word: string; note?: string }>; jobName?: ReadonlyMap<string, string>;
    /** The tests that prove programs, on whichever job (Test.programId), and
     *  the studies naming them: how each proved one was proved (flow audit
     *  #21). Without the tests, a program naming one says "Proved by its
     *  test in Commission". */
    tests?: readonly Test[]; studies?: readonly ToolStudy[];
    /** THE PROJECTS' PROGRAMS THAT ARE ONLY A LINE ON A MACHINE'S *Programs loaded* (Rowland, 23 October: "programs on
     *  the line in my factory, it's like you don't have any programs"): by line, each as its project's reading says it,
     *  with the machine's name — put under that machine of the line, else the line itself, and counted. */
    stageOnly?: ReadonlyMap<string, readonly ProgramLine[]> } = {}): ProgramsReading | undefined {
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
  /* no tests here on purpose: the line's reading counts a program proved by
     its record, not by a job's test — passing the tests in re-counted the
     proved and moved the words the line's page and paper say (the
     machines-programs acceptance). A failed test travelling to the line
     (docs/UPGRADE-AUDIT.md C6) waits on programsReading carrying "failed"
     without re-counting proved — with C2, the Commission cell. */
  const r0 = programsReading({ tests: [], items: [], assets, programs, ...(today ? { today } : {}) });
  const extra = lines.flatMap(l => (o.stageOnly?.get(l.id) ?? []).map(x => {
    const own = l.machines.find(m => m.record && machineKey(m.name) === machineKey(x.machine));
    const name = own ? (many ? `${l.name} · ${own.name}` : own.name) : many ? `${l.name} · the line itself` : 'The line';
    return { ...x, machine: name };
  }));
  const r = !extra.length ? r0 : readingOf((() => {
    const groups = (r0?.machines ?? []).map(m => ({ name: m.name, lines: [...m.lines] }));
    for (const x of extra) {
      const g = groups.find(m => m.name === x.machine);
      if (g) g.lines.push(x);
      else groups.push({ name: x.machine, lines: [x] });
    }
    /* the machines in the line's order, the line itself last */
    const order = assets.map(a => a.name);
    return groups.sort((a, b) => (order.indexOf(a.name) < 0 ? 1e6 : order.indexOf(a.name)) - (order.indexOf(b.name) < 0 ? 1e6 : order.indexOf(b.name)));
  })());
  if (!r) return r;
  const byId = new Map(programs.map(p => [p.id, p]));
  const withFloor = (l: ProgramLine): ProgramLine => {
    const p = l.programId ? byId.get(l.programId) : undefined;
    const f = l.programId ? o.floor?.get(l.programId) : undefined;
    const job = p ? o.jobName?.get(p.projectId) : undefined;
    const proof = p ? proofOf(p, o.tests, o.studies) : undefined;
    return { ...l, ...(f ? { proving: `On ${job ?? 'its project'}'s Set up: ${f.word}${f.note ? ` — ${f.note}` : ''}` } : {}), ...(proof ? { proof } : {}) };
  };
  const machines = r.machines.map(m => ({ ...m, lines: m.lines.map(withFloor) }));
  return { ...r, machines, lines: machines.flatMap(m => m.lines) };
}

/** A JOB'S LINES' OWN PROGRAMS — each line the job is on (its job lines),
 *  not archived, with its machines and the programs planned on it with no
 *  job: what the job's Programs page shows (ui/LineProgramsOnJob) and every
 *  paper of the job prints (lib/clientReport, lib/handoverReport). */
export interface JobLinePrograms { name: string; id: string; machines: LineMachine[]; programs: Program[] }

export function jobLinePrograms(projectId: string, all: readonly Workspace[], machines: readonly Asset[], programs: readonly Program[], jobLines: readonly JobLine[]): JobLinePrograms[] {
  const ids = new Set(jobLines.filter(l => l.projectId === projectId && l.workspaceId && !l.deletedAt).map(l => l.workspaceId as string));
  return all.filter(w => ids.has(w.id) && !w.archived).map(w => ({ name: w.name, id: w.id,
    machines: machinesOnLine(w, machines, jobLines), programs: programsOnLine(w.id, programs, jobLines).filter(p => !p.projectId) }));
}

/** Each of those lines read as its own Programs page reads it — a line with
 *  no programs of its own has none. `tests`: the tests on any job that prove
 *  a program (a line's proved on another job says its test). */
export function jobLineReadings(lines: readonly JobLinePrograms[], today: string, o: { tests?: readonly Test[]; studies?: readonly ToolStudy[] } = {}): { line: string; reading: ProgramsReading }[] {
  return lines.flatMap(l => {
    const r = l.programs.length ? lineProgramsReading([l], today, o) : undefined;
    return r ? [{ line: l.name, reading: r }] : [];
  });
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
