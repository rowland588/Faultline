/* THE STAGE GATE'S PAGES AS LEAN PAGES (docs/LEAN-PAGE.md; Rowland, 17
 * October: "Stage gate entire system is the current priority") — the tiles
 * and the closing line of each place a stage-gate job is worked in: the
 * three gates of steps (Install, Set up, Hand over), Commission, Programs,
 * the job's Problems and Materials. Each reads the counts its page already
 * says in its header (lib/install, lib/programsReport, lib/noted
 * problemsTally, lib/materialsReport), so the header, the tiles and the
 * page's paper say one thing. Nothing is worked out here.
 *
 * Every page's last tile is the job's money (lib/stageGateLean moneyTile):
 * what the slip costs, or what a day late would — the one cost model, from
 * the job's lines in Your factory. The closing line is the page in one
 * sentence: where it stands, what is wrong, and the slip in money. */
import type { LeanTile, LeanTone } from './lean';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

/** The money tile while the job's lines are still being read — the tiles
 *  show at once, the money a moment later (lib/useJobMoney). */
export const MONEY_WAIT: LeanTile = { k: 'A day late', v: '…', of: 'reading the job’s lines' };

/** The money said once more where the page closes — only when it is a cost
 *  already run up (the slip), never the "what a day would cost". */
const moneyClause = (money: LeanTile): string => (money.tone === 'r' ? ` ${money.k} ${money.v}.` : '');

/* ------------------------------------------------ the gates of steps */

export type StepGate = 'install' | 'setup' | 'handover';
const GATE_WORD: Record<StepGate, string> = { install: 'Install', setup: 'Set up', handover: 'Hand over' };

export interface GateCounts {
  gate: StepGate;
  done: number;
  total: number;
  late: number;
  /** Stages stopped by a problem, and parts said to have failed. */
  problems: number;
  /** Stages a machine has on the grid with nothing planned in them. */
  notAdded: number;
  /** Machines with none of this gate's stages at all. */
  bare: number;
}

export function gateTiles(x: GateCounts, money: LeanTile): LeanTile[] {
  const unit = x.gate === 'handover' ? 'item' : 'step';
  return [
    { k: 'Done', v: String(x.done), of: x.total ? `of ${x.total} ${plural(x.total, unit)}` : `no ${unit}s planned yet`, ...(x.total && x.done === x.total ? { tone: 'g' as LeanTone } : {}) },
    { k: 'Late', v: String(x.late), of: x.late ? 'past their day' : 'nothing past its day', tone: x.late ? 'r' : 'n' },
    { k: 'Problems', v: String(x.problems), of: x.problems ? `stopping a ${x.gate === 'handover' ? 'hand-over item' : 'stage'}` : 'none stopping a stage', tone: x.problems ? 'r' : 'n' },
    { k: 'Not added yet', v: String(x.notAdded + x.bare), of: x.notAdded || x.bare
      ? [x.notAdded ? `${x.notAdded} ${plural(x.notAdded, 'stage')} not on a machine's list` : '', x.bare ? `${x.bare} ${plural(x.bare, 'machine')} with none yet` : ''].filter(Boolean).join(' · ')
      : 'every machine has its list',
      ...(x.notAdded || x.bare ? { tone: 'a' as LeanTone } : { tone: 'n' as LeanTone }) },
    money,
  ];
}

export function gateClosing(x: GateCounts, money: LeanTile): { text: string; tone: LeanTone } {
  const unit = x.gate === 'handover' ? 'item' : 'step';
  if (!x.total) return { text: `${GATE_WORD[x.gate]}: nothing planned yet — give each machine its ${x.gate === 'handover' ? 'hand-over items' : 'stages'}.`, tone: 'n' };
  const wrong = [x.late ? `${x.late} late` : '', x.problems ? `${x.problems} stopped by a problem` : '', x.notAdded + x.bare ? `${x.notAdded + x.bare} not added yet` : ''].filter(Boolean);
  const all = x.done === x.total;
  return {
    text: `${GATE_WORD[x.gate]}: ${x.done} of ${x.total} ${plural(x.total, unit)} done${wrong.length ? ` — ${and(wrong)}` : all ? ' — the gate is through' : ', nothing late'}.${moneyClause(money)}`,
    tone: x.late || x.problems ? 'r' : x.notAdded || x.bare ? 'a' : all ? 'g' : 'n',
  };
}

/* ------------------------------------------------ Commission */

export interface CommissionCounts { passed: number; total: number; failed: number; notRun: number }

export function commissionTiles(x: CommissionCounts, money: LeanTile): LeanTile[] {
  const left = Math.max(0, x.total - x.passed - x.failed - x.notRun);
  return [
    { k: 'Passed', v: String(x.passed), of: x.total ? `of ${x.total} ${plural(x.total, 'test')}` : 'no tests planned yet', ...(x.total && x.passed === x.total ? { tone: 'g' as LeanTone } : {}) },
    { k: 'Didn’t pass', v: String(x.failed), of: x.failed ? 'ran and fell short' : 'none fell short', tone: x.failed ? 'r' : 'n' },
    { k: 'Didn’t run', v: String(x.notRun), of: x.notRun ? 'booked, did not happen' : 'every booked test ran', tone: x.notRun ? 'r' : 'n' },
    { k: 'Still to run', v: String(left), of: left ? `${plural(left, 'test')} planned` : 'nothing left to run', tone: 'n' },
    money,
  ];
}

export function commissionClosing(x: CommissionCounts, money: LeanTile): { text: string; tone: LeanTone } {
  if (!x.total) return { text: 'Commission: no tests planned yet — give each machine its usual tests.', tone: 'n' };
  const wrong = [x.failed ? `${x.failed} didn’t pass` : '', x.notRun ? `${x.notRun} didn’t run` : ''].filter(Boolean);
  return {
    text: `Commission: ${x.passed} of ${x.total} ${plural(x.total, 'test')} passed${wrong.length ? ` — ${and(wrong)}` : x.passed === x.total ? ' — every machine proved' : ', none fell short'}.${moneyClause(money)}`,
    tone: wrong.length ? 'r' : x.passed === x.total ? 'g' : 'n',
  };
}

/* ------------------------------------------------ Programs */

export interface ProgramCounts { total: number; doneAll: number; failed: number; late: number; open: number; notTested: number; noProgram: number }

export function programTiles(x: ProgramCounts, money: LeanTile): LeanTile[] {
  const toDo = Math.max(0, x.total - x.doneAll - x.failed);
  return [
    { k: 'Done', v: String(x.doneAll), of: x.total ? `of ${x.total} ${plural(x.total, 'program')} — passed or at baseline` : 'no programs yet', ...(x.total && x.doneAll === x.total ? { tone: 'g' as LeanTone } : {}) },
    { k: 'Failed', v: String(x.failed), of: x.failed ? 'tested and did not pass' : 'none failed', tone: x.failed ? 'r' : 'n' },
    { k: 'To do', v: String(toDo), of: x.late ? `${x.late} past ${x.late === 1 ? 'its' : 'their'} test day` : toDo ? 'none past its test day' : 'nothing left to prove', tone: x.late ? 'r' : 'n' },
    { k: 'Not ready', v: String(x.noProgram + x.notTested), of: x.noProgram || x.notTested ? [x.noProgram ? `${x.noProgram} with no program` : '', x.notTested ? `${x.notTested} not tested` : ''].filter(Boolean).join(' · ') : 'every one has a program',
      ...(x.noProgram ? { tone: 'a' as LeanTone } : { tone: 'n' as LeanTone }) },
    money,
  ];
}

export function programClosing(x: ProgramCounts, money: LeanTile): { text: string; tone: LeanTone } {
  if (!x.total) return { text: 'Programs: none yet — plan each machine’s programs and the test that proves each.', tone: 'n' };
  const wrong = [x.failed ? `${x.failed} failed` : '', x.late ? `${x.late} past ${x.late === 1 ? 'its' : 'their'} test day` : '', x.noProgram ? `${x.noProgram} with no program` : ''].filter(Boolean);
  return {
    text: `Programs: ${x.doneAll} of ${x.total} done${wrong.length ? ` — ${and(wrong)}` : x.doneAll === x.total ? ' — every program proved' : ', none failed'}.${moneyClause(money)}`,
    tone: x.failed || x.late ? 'r' : x.noProgram ? 'a' : x.doneAll === x.total ? 'g' : 'n',
  };
}

/* ------------------------------------------------ the job's Problems */

export interface ProblemCounts { open: number; fixes: number; noFix: number; late: number; done: number; critical: number; risks: number }

export function problemTiles(x: ProblemCounts, money: LeanTile): LeanTile[] {
  return [
    { k: 'Open', v: String(x.open), of: x.open ? [x.fixes ? `${x.fixes} ${plural(x.fixes, 'fix', 'fixes')} still to do` : '', x.noFix ? `${x.noFix} with no fix yet` : ''].filter(Boolean).join(' · ') : x.done ? `nothing outstanding — ${x.done} done` : 'nothing on the list yet',
      ...(x.open ? {} : { tone: 'g' as LeanTone }) },
    { k: 'Critical', v: String(x.critical), of: x.risks ? `${x.risks} high ${plural(x.risks, 'risk')} as well` : x.critical ? 'stopping the job' : 'none open', ...(x.critical ? { tone: 'r' as LeanTone } : x.risks ? { tone: 'a' as LeanTone } : {}) },
    { k: 'Late', v: String(x.late), of: x.late ? 'fixes past their day' : 'no fix past its day', tone: x.late ? 'r' : 'n' },
    { k: 'No fix yet', v: String(x.noFix), of: x.noFix ? `${plural(x.noFix, 'problem')} nobody is putting right yet` : 'every problem has its fix', tone: x.noFix ? 'a' : 'n' },
    money,
  ];
}

export function problemClosing(x: ProblemCounts, money: LeanTile): { text: string; tone: LeanTone } {
  if (!x.open) return { text: x.done ? `Problems: nothing outstanding — ${x.done} put right.` : 'Problems: none on the job.', tone: x.done ? 'g' : 'n' };
  const wrong = [x.critical ? `${x.critical} critical` : '', x.late ? `${x.late} ${plural(x.late, 'fix', 'fixes')} late` : '', x.noFix ? `${x.noFix} with no fix yet` : ''].filter(Boolean);
  return { text: `Problems: ${x.open} open${wrong.length ? ` — ${and(wrong)}` : ', each with its fix on time'}.${moneyClause(money)}`, tone: x.critical || x.late ? 'r' : x.noFix ? 'a' : 'n' };
}

/* ------------------------------------------------ Materials */

export interface MaterialCounts { here: number; total: number; late: number; waiting: number; undated: number; nextDue?: string }

export function materialTiles(x: MaterialCounts, money: LeanTile, nice: (iso: string) => string): LeanTile[] {
  return [
    { k: 'Here', v: String(x.here), of: x.total ? `of ${x.total} needed` : 'nothing on the list yet', ...(x.total && x.here === x.total ? { tone: 'g' as LeanTone } : {}) },
    { k: 'Late', v: String(x.late), of: x.late ? 'past the day they were due' : 'none past its day', tone: x.late ? 'r' : 'n' },
    { k: 'Waiting', v: String(x.waiting), of: x.nextDue ? `next due ${nice(x.nextDue)}` : x.waiting ? 'on their way' : 'nothing on its way', tone: 'n' },
    { k: 'No date', v: String(x.undated), of: x.undated ? 'nobody has said when' : 'every one has a day', tone: x.undated ? 'a' : 'n' },
    money,
  ];
}

export function materialClosing(x: MaterialCounts, money: LeanTile): { text: string; tone: LeanTone } {
  if (!x.total) return { text: 'Materials: nothing on the list yet — say what the job needs before it can run.', tone: 'n' };
  const wrong = [x.late ? `${x.late} late` : '', x.undated ? `${x.undated} with no date` : ''].filter(Boolean);
  return { text: `Materials: ${x.here} of ${x.total} here${wrong.length ? ` — ${and(wrong)}` : x.here === x.total ? ' — everything the job needs is in' : ', the rest on time'}.${moneyClause(money)}`,
    tone: x.late ? 'r' : x.undated ? 'a' : x.here === x.total ? 'g' : 'n' };
}

/* ------------------------------------------------ the handover report */

export interface HandoverCounts { machines: number; handed: number; open: number; handedOver: boolean }

export function handoverTiles(x: HandoverCounts, money?: LeanTile): LeanTile[] {
  return [
    { k: 'Handed over', v: String(x.handed), of: x.machines ? `of ${x.machines} ${plural(x.machines, 'machine')}` : 'no machines on the job yet', ...(x.machines && x.handed === x.machines ? { tone: 'g' as LeanTone } : {}) },
    { k: 'Still open', v: String(x.open), of: x.open ? (x.handedOver ? 'handed over with — said below, machine by machine' : 'to close before hand-over — said below') : 'nothing open', tone: x.open ? 'a' : 'n' },
    ...(money ? [money] : []),
  ];
}

export function handoverClosing(x: HandoverCounts, money?: LeanTile): { text: string; tone: LeanTone } {
  if (!x.machines) return { text: 'Hand over: no machines on the job yet.', tone: 'n' };
  return {
    text: `Hand over: ${x.handed} of ${x.machines} ${plural(x.machines, 'machine')} handed over${x.open ? ` — ${x.open} still open` : ' — nothing left open'}.${money ? moneyClause(money) : ''}`,
    tone: x.handed === x.machines && !x.open ? 'g' : x.open ? 'a' : 'n',
  };
}
