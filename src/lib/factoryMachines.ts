/* EVERY MACHINE IN THE FACTORY, LINE BY LINE (Rowland, 27 October: "if I go to factory, I see overview,
 * lines, programs. Why don't I see machines? ... Something's wrong").
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
  /** Its own page on its line. */
  href: string;
}

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
}): FactoryMachines {
  const jobName = (id?: string) => (id ? i.jobs.find(j => j.id === id && !j.deletedAt)?.name : undefined);
  const groups: FactoryMachineGroup[] = i.lines.map(line => {
    const progs = programsOnLine(line.id, i.programs, i.jobLines);
    const open = i.snags.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed' && s.workspaceId === line.id && !!s.targetAsset);
    const rows = machinesOnLine(line, i.assets, i.jobLines).map((m, k): FactoryMachineRow => {
      const key = machineKey(m.name);
      const mine = m.record ? progs.filter(p => p.assetId === m.record?.id) : [];
      const on = open.filter(s => machineKey(s.targetAsset ?? '') === key);
      const project = jobName(m.record?.projectId ?? m.jobId);
      return {
        n: k + 1, name: m.name,
        ...(m.record?.oem ? { oem: m.record.oem } : {}),
        ...(project ? { project } : {}),
        programs: mine.length, proved: mine.filter(isProved).length,
        open: on.length, critical: on.filter(s => s.priority === 'critical').length,
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
