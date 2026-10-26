/* NOW — WHERE A STAGE-GATE PROJECT IS, ON ONE PAGE (docs/STAGEGATE-RESEARCH.md §4).
 *
 * Rowland, 26 October: "must have clear, simple understanding of the current state of anything";
 * then, given three hours, the Now page first. It reads only what is already read — the gate each
 * machine is at (lib/install machineAt), its programs as the Programs report says them
 * (lib/programsReport), what the project owes (lib/projectActions, the rows Needs you and Actions
 * count) and the journey's days (project/journey) — and says them in the order the obeya asks:
 * what blocks handover, where each machine is, what is coming, what you owe. Nothing here is a
 * second answer: every word comes from the module that already says it. */
import type { Asset, Test, TestItem } from '../../lib/testing';
import type { JobItem } from '../../lib/portfolio';
import type { ProgramsReading, ProgramLine } from '../../lib/programsReport';
import { badgeOf } from '../../lib/programsReport';
import type { ProjectAction } from '../../lib/projectActions';
import type { GateTone, JourneyGate } from '../../lib/install';
import { addDays } from '../../lib/weeks';
import type { Standing } from '../../lib/standing';
import type { JobFigures } from '../../lib/stageGateLean';
import type { LinesDay } from '../../lib/lineLoss';
import { criticalProblems, riskProblems } from '../../lib/critical';
import { fixTone } from '../../lib/fixTone';

/** How many days ahead the look-ahead reads, from today. */
export const LOOK_AHEAD_DAYS = 14;

/** The look-ahead's range: today and the next two weeks. */
export const lookAhead = (today: string): { from: string; to: string } => ({ from: today, to: addDays(today, LOOK_AHEAD_DAYS) });

export type NowTone = 'r' | 'a' | 'w' | 'g' | 'n';

export interface NowMachine {
  id: string;
  name: string;
  /** The gate it is at, in a word — "Commission", "Due on site", "Handed over". */
  gate: string;
  gateTone: NowTone;
  /** Its programs — "3 of 5 passed · 1 didn’t pass"; absent with none. */
  programs?: string;
  programsTone?: NowTone;
  /** The program most in need, as the Programs report badges it — "FAILED Program 5". */
  worstProgram?: string;
  /** What it owes, counted — open problems and late things on it. */
  open: number;
  late: number;
  critical: number;
  /** The next thing due on it, with its day. */
  next?: { what: string; on: string; late: boolean };
}

const GATE_TONE: Record<GateTone, NowTone> = { done: 'g', going: 'w', late: 'r', problem: 'r', failed: 'r', ahead: 'w', none: 'n' };

/** The worst first: a program that did not pass, then late, then to do, then done. */
const PROGRAM_RANK: Record<ProgramLine['bucket'], number> = { failed: 0, late: 1, open: 2, baseline: 3, done: 4 };

/** One machine's row. `journey` is lib/install journeyOf for it; `at` is machineAt's short word. */
export function nowMachine(a: Pick<Asset, 'id' | 'name'>, at: { short: string }, journey: { gate?: JourneyGate; label: string; tone: GateTone }[],
  reading: ProgramsReading | undefined, owed: readonly JobItem[], tests: readonly Pick<Test, 'id' | 'assetId'>[]): NowMachine {
  const here = journey.find(g => g.label === at.short);
  const gateTone: NowTone = at.short === 'Handed over' ? 'g' : at.short === 'Due on site' ? 'n' : here ? GATE_TONE[here.tone] : 'n';
  const lines = (reading?.lines ?? []).filter(l => l.assetId === a.id);
  const passed = lines.filter(l => l.bucket === 'done' || l.bucket === 'baseline').length;
  const failed = lines.filter(l => l.bucket === 'failed').length;
  const late = lines.filter(l => l.bucket === 'late').length;
  const worst = [...lines].sort((x, y) => PROGRAM_RANK[x.bucket] - PROGRAM_RANK[y.bucket])[0];
  const onIt = new Set(tests.filter(t => t.assetId === a.id).map(t => t.id));
  const mine = owed.filter(x => x.id && onIt.has(x.id));
  const dated = mine.filter(x => x.on).sort((x, y) => (x.on as string).localeCompare(y.on as string));
  const next = dated[0];
  return {
    id: a.id, name: a.name.trim(), gate: at.short, gateTone,
    ...(lines.length ? {
      programs: [`${passed} of ${lines.length} passed`, failed ? `${failed} didn’t pass` : '', late ? `${late} late` : ''].filter(Boolean).join(' · '),
      programsTone: failed || late ? 'r' : passed === lines.length ? 'g' : 'w',
    } : {}),
    ...(worst && worst.bucket !== 'done' && worst.bucket !== 'baseline' ? { worstProgram: `${badgeOf(worst)} ${worst.what}` } : {}),
    open: mine.length,
    late: mine.filter(x => x.late).length,
    critical: mine.filter(x => x.critical && !x.critical.risk).length,
    ...(next ? { next: { what: next.what, on: next.on as string, late: next.late } } : {}),
  };
}

/** WHAT BLOCKS HANDOVER — the open critical problems, the project's own and the register's taken for
 *  it (lib/projectActions marks both 'critical'). High risks are not blockers; they are owed. */
export function blockers(rows: readonly ProjectAction[]): ProjectAction[] {
  return rows.filter(a => a.priority === 'critical');
}

/** WHAT YOU OWE, most pressing first — late, then soon, then by day, then the undated — and how many
 *  more there are than are shown. */
export function owedFirst(rows: readonly ProjectAction[], most = 6): { shown: ProjectAction[]; more: number } {
  const rank = (a: ProjectAction) => (a.late ? 0 : a.soon ? 1 : a.due ? 2 : 3);
  const sorted = rows.filter(a => a.priority !== 'critical')
    .slice().sort((x, y) => rank(x) - rank(y) || (x.due ?? '9999').localeCompare(y.due ?? '9999') || x.what.localeCompare(y.what));
  return { shown: sorted.slice(0, most), more: Math.max(0, sorted.length - most) };
}

/** The page's one sentence under the band — what is blocking, and what is next. */
export function nowSays(machines: readonly NowMachine[], block: readonly ProjectAction[], owed: readonly ProjectAction[]): string {
  const late = owed.filter(a => a.late).length;
  const handed = machines.filter(m => m.gate === 'Handed over').length;
  return [
    machines.length ? `${machines.length} machine${machines.length === 1 ? '' : 's'}${handed ? `, ${handed} handed over` : ''}` : 'No machines yet',
    block.length ? `${block.length} critical problem${block.length === 1 ? '' : 's'} blocking handover` : 'nothing critical blocking handover',
    late ? `${late} thing${late === 1 ? '' : 's'} late` : 'nothing late',
  ].join(' · ') + '.';
}

/* THE BAND'S FIGURES — what the front page's tiles count (lib/stageGateLean stageGateTiles), worked
 * out once here so the front page and Now never count two ways. */

export function jobFiguresOf(st: Standing, project: { expectedAt?: string; plannedAt?: string }, tests: readonly Test[], items: TestItem[], assets: Asset[],
  day: LinesDay, assigned: { open: number; critical: number } | undefined, today: string): JobFigures {
  const alive = tests.filter(t => !t.deletedAt), fixes = alive.filter(t => t.kind === 'fix').map(t => fixTone(t, today).tone);
  return {
    ...(st.daysToGo != null ? { daysToGo: st.daysToGo } : {}), ...(st.handedOver ? { handedOver: true } : {}), ...(st.handedVs != null ? { handedVs: st.handedVs } : {}),
    ...(st.slipDays != null ? { slipDays: st.slipDays } : {}), outstanding: st.outstanding, late: st.late,
    ...(project.expectedAt ?? project.plannedAt ? { handoverOn: (project.expectedAt ?? project.plannedAt) as string } : {}),
    critical: criticalProblems(alive, items, assets).open.length, risks: riskProblems(alive, items, assets).open.length,
    fixesOpen: fixes.filter(x => x !== 'done').length, fixesLate: fixes.filter(x => x === 'late').length,
    day,
    ...(assigned ? { assigned } : {}),
  };
}
