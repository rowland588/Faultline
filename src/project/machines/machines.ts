/* A STAGE-GATE PROJECT'S MACHINES, A ROW EACH — the words the project's Machines tab, the Factory's Machines tab
 * and their papers all say (27 October — Rowland: "projects, machines shows the page I have been wanting ...
 * factory machines tells you nothing").
 *
 * Each row is Now's (project/now machinesOf: the gate it is at, its programs as the Programs report says them,
 * what it owes, what is next) with the machine's own status in plain words beside it — handed over, else where
 * the machine itself is (lib/testing assetStateOf). Read once here so a row says the same on every page and every
 * paper. Pure. */
import type { JobInput, JobItem } from '../../lib/portfolio';
import { criticalItems, jobItems, riskItems } from '../../lib/portfolio';
import { programsReading } from '../../lib/programsReport';
import { ASSET_STATE_WORD, assetStateOf, live } from '../../lib/testing';
import { niceDay } from '../../lib/weeks';
import { machinesOf, type NowMachine } from '../now/now';
import type { MachinesPaper } from '../../lib/machinePaper';

export type StatusTone = 'g' | 'w' | 'n';

export interface ProjectMachineRow extends NowMachine {
  /** Its status in plain words — "Not here yet", "On site", "Installed", "Running", "Handed over". */
  status: string;
  statusTone: StatusTone;
}

/** What a stage-gate project owes, from its own records — the rows a machine's row counts (project/projectRead
 *  owedAndDone, less the project's own actions, which are on no machine). */
export const gateOwed = (gate: JobInput, today: string): JobItem[] => [...criticalItems(gate), ...riskItems(gate), ...jobItems(gate, today)];

/** Every machine of a stage-gate project, in its order, a row each. */
export function projectMachineRows(gate: JobInput, owed: readonly JobItem[], today: string): ProjectMachineRow[] {
  const tests = live(gate.tests), items = live(gate.items), assets = live(gate.assets);
  const reading = programsReading({ tests, items, assets, programs: gate.programs, today, holder: gate.project, studies: gate.studies ?? [] });
  return machinesOf(assets, tests, items, gate.programs, reading, owed, today).map(m => {
    const a = assets.find(x => x.id === m.id);
    const status = m.gate === 'Handed over' ? 'Handed over' : a ? ASSET_STATE_WORD[assetStateOf(a)] : '';
    return { ...m, status, statusTone: status === 'Handed over' ? 'g' : status === 'Not here yet' ? 'n' : 'w' };
  });
}

/** Where it is up to in the project, in a few words — "at Commission", "due on site", "handed over". */
export const upTo = (m: Pick<NowMachine, 'gate'>): string =>
  (m.gate === 'Handed over' ? 'handed over' : m.gate === 'Due on site' ? 'due on site' : `at ${m.gate}`);

/** What it owes, counted — "2 open, 1 late, 1 critical", or "nothing owed". */
export const owesWords = (m: Pick<NowMachine, 'open' | 'late' | 'critical'>): string =>
  (m.open ? `${m.open} open${m.late ? `, ${m.late} late` : ''}${m.critical ? `, ${m.critical} critical` : ''}` : 'nothing owed');

/** The row's line under its name: the project and where it is up to, its programs, what it owes. */
export function rowSays(m: ProjectMachineRow, project: string): string {
  return [`In ${project}: ${upTo(m)}`, m.programs ? `Programs: ${m.programs}` : '', owesWords(m)].filter(Boolean).join(' · ');
}

/** The next or late thing on it, with its day — "Late: Seal integrity · Mon, 12 Oct", or "nothing dated". */
export const nextWords = (m: Pick<NowMachine, 'next'>): string =>
  (m.next ? `${m.next.late ? 'Late' : 'Next'}: ${m.next.what} · ${niceDay(m.next.on)}` : 'nothing dated');

/** The page's sentence — how many, how many handed over, how many with something late or critical. */
export function projectMachinesSays(rows: readonly ProjectMachineRow[]): string {
  if (!rows.length) return 'No machines on the project yet.';
  const handed = rows.filter(m => m.gate === 'Handed over').length;
  const late = rows.filter(m => m.late || m.critical).length;
  return [`${rows.length} machine${rows.length === 1 ? '' : 's'}`, handed ? `${handed} handed over` : '', late ? `${late} with something late or critical` : 'nothing late'].filter(Boolean).join(' · ');
}

/* ON PAPER — the project's Machines report: a row a machine as the tab says it (each machine in full follows). */

/** The project's Machines report's front: the tab's sentence and rows (each machine in full follows, lib/machineDossier). */
export function projectMachinesPaper(gate: JobInput, owed: readonly JobItem[], today: string): MachinesPaper {
  const rows = projectMachineRows(gate, owed, today);
  return {
    eyebrow: `MACHINES · ${gate.project.name}`, title: 'The machines', says: projectMachinesSays(rows),
    groups: [{ rows: rows.map(m => ({
      name: `${m.name}${m.oem ? ` — ${m.oem}` : ''}`, status: { word: m.status, tone: m.statusTone },
      says: rowSays(m, gate.project.name), right: nextWords(m), rightTone: m.next?.late || m.critical ? 'r' : m.next ? 'w' : 'n',
    })), empty: 'No machines on the project yet.' }],
    /* each machine in full is lib/machineDossier's (projectMachinesFullPaper) */
    machines: [],
    foot: `${gate.project.name} — its machines`,
  };
}
