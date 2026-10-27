/* EVERY MACHINE IN THE FACTORY, LINE BY LINE (Rowland, 27 October: "if I go to factory, I see overview,
 * lines, programs. Why don't I see machines? ... Something's wrong"; then: "factory machines tells you nothing.
 * But projects, machines shows the page I have been wanting").
 *
 * So a machine a stage-gate project is working on says here what the project's Machines tab says of it — its
 * status in plain words, where it is up to in the project, its programs, what it owes, what is next
 * (project/machines projectMachineRows) — and opens its page in the project. A machine with no project on it says
 * so, with its programs proved of planned. Either way the register's problems open on it are said beside.
 *
 * The Factory's Machines tab and its paper read this: each line in floor order, its machines in flow
 * order (lib/lineRecords machinesOnLine — the one list every picker reads), each with who made it, the
 * project working on it, its programs proved of planned, and the register's problems open on it. A row
 * opens the machine's own page on its line (line/LineMachineScreen). No new record and no second answer.
 * Pure. */
import type { Project, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { Asset } from './testing';
import type { Program } from './programs';
import { isProved } from './programs';
import { machineKey, machinesOnLine, programsOnLine, type JobLine } from './lineRecords';
import { nextWords, rowSays, type ProjectMachineRow } from '../project/machines/machines';
import type { MachinesPaper, PaperTone } from './machinePaper';

export interface FactoryMachineRow {
  /** Its place in its line's flow, from 1. */
  n: number;
  name: string;
  oem?: string;
  /** The project working on it — the record's project, when it has one. */
  project?: string;
  programs: number;
  proved: number;
  /** The register's problems open on it, and of them the critical. */
  open: number;
  critical: number;
  /** Its status in plain words, when a project is working on it — "On site", "Handed over". */
  status?: string;
  statusTone?: PaperTone;
  /** Its line of words: the project and where it is up to, its programs, what it owes — or "No project on it". */
  says: string;
  /** What is next on it ("Late: … · 12 Oct"), or the problems open on it. */
  right: string;
  rightTone: PaperTone;
  /** Its one page, on its line — a project working on it is a part of that page. */
  href: string;
}

/** A machine a stage-gate project is working on, as that project's Machines tab reads it. */
export interface InProject { projectId: string; project: string; row: ProjectMachineRow }

export interface FactoryMachineGroup {
  line: Pick<Workspace, 'id' | 'name' | 'lineType'>;
  rows: FactoryMachineRow[];
}

export interface FactoryMachines {
  groups: FactoryMachineGroup[];
  total: number;
  /** Machines a project is working on. */
  withProject: number;
  open: number;
  critical: number;
  /** The page's one sentence. */
  says: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Every line's machines, the lines in the order given (floor order). */
export function factoryMachines(i: {
  lines: readonly Workspace[];
  assets: readonly Asset[];
  jobLines: readonly JobLine[];
  jobs: readonly Pick<Project, 'id' | 'name' | 'deletedAt'>[];
  programs: readonly Program[];
  snags: readonly Snag[];
  /** By machine record id: the machines stage-gate projects are working on, read as their Machines tab reads them. */
  inProjects?: ReadonlyMap<string, InProject>;
}): FactoryMachines {
  const jobName = (id?: string) => (id ? i.jobs.find(j => j.id === id && !j.deletedAt)?.name : undefined);
  const groups: FactoryMachineGroup[] = i.lines.map(line => {
    const progs = programsOnLine(line.id, i.programs, i.jobLines);
    const openHere = i.snags.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed' && s.workspaceId === line.id && !!s.targetAsset);
    const rows = machinesOnLine(line, i.assets, i.jobLines).map((m, k): FactoryMachineRow => {
      const key = machineKey(m.name);
      const mine = m.record ? progs.filter(p => p.assetId === m.record?.id) : [];
      const on = openHere.filter(s => machineKey(s.targetAsset ?? '') === key);
      const project = jobName(m.record?.projectId ?? m.jobId);
      const inP = m.record ? i.inProjects?.get(m.record.id) : undefined;
      const open = on.length, critical = on.filter(s => s.priority === 'critical').length, proved = mine.filter(isProved).length;
      const problems = open ? `${plural(open, 'problem')} open${critical ? `, ${critical} critical` : ''}` : '';
      const says = inP
        ? [rowSays(inP.row, inP.project), problems ? `${problems} on the register` : ''].filter(Boolean).join(' · ')
        : [project ? `With ${project}` : 'No project on it', mine.length ? `${proved} of ${mine.length} program${mine.length === 1 ? '' : 's'} proved` : 'no programs'].join(' · ');
      const late = inP ? inP.row.next?.late || inP.row.late > 0 || inP.row.critical > 0 : false;
      return {
        n: k + 1, name: m.name,
        ...(m.record?.oem ? { oem: m.record.oem } : {}),
        ...(project ? { project } : {}),
        programs: mine.length, proved,
        open, critical,
        ...(inP ? { status: inP.row.status, statusTone: inP.row.statusTone } : {}),
        says,
        right: inP ? nextWords(inP.row) : problems || 'No problems open',
        rightTone: inP ? (late ? 'r' : inP.row.next ? 'w' : 'n') : critical ? 'r' : open ? 'a' : 'n',
        /* its one page, on its line — the project's part is on it (27 October) */
        href: `/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(m.name)}`,
      };
    });
    return { line: { id: line.id, name: line.name, ...(line.lineType ? { lineType: line.lineType } : {}) }, rows };
  });
  const all = groups.flatMap(g => g.rows);
  const total = all.length, withProject = all.filter(r => r.project).length;
  const open = all.reduce((n, r) => n + r.open, 0), critical = all.reduce((n, r) => n + r.critical, 0);
  const named = groups.filter(g => g.rows.length).length;
  const says = !i.lines.length ? 'No lines in the factory yet — set up its lines first.'
    : !total ? `No machines named on any of the ${plural(i.lines.length, 'line')} yet — name them on a line's Machines tab.`
      : [`${plural(total, 'machine')} on ${plural(named, 'line')}`,
        withProject ? `${withProject} with a project` : 'none with a project',
        open ? `${plural(open, 'problem')} open${critical ? `, ${critical} critical` : ''}` : 'no problem open'].join(' · ') + '.';
  return { groups, total, withProject, open, critical, says };
}

/** The factory's machines on paper — the page's sentence, then each line in floor order, a row a machine as the
 *  page says it (lib/machinePaperPdf draws it). */
export function factoryMachinesPaper(r: FactoryMachines): MachinesPaper {
  return {
    eyebrow: 'FACTORY · EVERY MACHINE', title: 'The factory’s machines', says: r.says,
    groups: r.groups.map(g => ({
      head: `${g.line.name}${g.line.lineType ? ` — ${g.line.lineType}` : ''} · ${g.rows.length ? plural(g.rows.length, 'machine') : 'no machines named yet'}`,
      rows: g.rows.map(x => ({
        n: x.n, name: `${x.name}${x.oem ? ` — ${x.oem}` : ''}`,
        ...(x.status ? { status: { word: x.status, tone: x.statusTone ?? 'w' } } : {}),
        says: x.says, right: x.right, rightTone: x.rightTone,
      })),
      empty: 'No machines named on it yet.',
    })),
    machines: [],
    foot: 'The factory’s machines — each machine’s own page has its tests, programs and studies',
  };
}
