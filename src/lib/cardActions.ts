/* HOW A CARD'S ACTIONS STAND (15 November, docs/AREAS.md A3 — agreed with Rowland 14 November: "each card saying how its actions stand").
 *
 * A tool record's actions are the problems held by it — raised from inside the tool or linked to it afterwards (snag/toolLink problemsOn,
 * docs/TOOL-PROBLEMS.md): one rule for every tool, no new record. Said under the card's sentence — "2 actions open · 1 late", "1 action,
 * done" — and nothing when it holds none. Late is the only red. And a line's own cards before its tools: its open problems, and its
 * programs not yet proved whose latest test did not pass — the test as Commission reads it (lib/commission provingTestOf: the test
 * naming the program, then its re-tests to the newest), or the program's criteria said failed (lib/lineRecords lineProgramsReading).
 * A line's reading leaves tests out on purpose (it counts a program proved by its record), so the test is read here. Pure. */
import type { Snag } from '../snag/types';
import { problemsOn, problemStands } from '../snag/toolLink';
import type { LeanTone } from './lean';
import type { ProgramsReading } from './programsReport';
import { isProved, type Program } from './programs';
import { provingTestOf } from './commission';
import type { Test } from './testing';

export interface CardActions { text: string; tone: LeanTone; open: number; late: number; done: number }

const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;

/** The problems a record holds, said as its actions — or nothing when it holds none. */
export function cardActions(snags: readonly Snag[], studyId: string, now = Date.now()): CardActions | undefined {
  const held = problemsOn(snags, studyId);
  if (!held.length) return undefined;
  const open = held.filter(s => s.status !== 'closed');
  const done = held.length - open.length;
  const late = open.filter(s => problemStands(s, now).late > 0).length;
  const text = open.length
    ? `${n(open.length, 'action')} open${late ? ` · ${late} late` : ''}${done ? ` · ${done} done` : ''}`
    : `${n(done, 'action')}, done`;
  return { text, tone: late ? 'r' : open.length ? 'n' : 'g', open: open.length, late, done };
}

/** A line's own card on the area's page — its problems, or its tests that did not pass. */
export interface LineCard { key: 'problems' | 'failed'; tool: string; name: string; says: string; tone: LeanTone }

/** The line's open problems as one card — how many, the late and critical among them, the worst in words. None when nothing is open. */
export function problemsCard(p: { open: number; late: number; critical: number; worst?: string }): LineCard | undefined {
  if (!p.open) return undefined;
  const red = [p.critical ? `${p.critical} critical` : '', p.late ? `${p.late} late` : ''].filter(Boolean).join(' · ');
  return { key: 'problems', tool: 'Problems', name: `${n(p.open, 'problem')} open${red ? ` · ${red}` : ''}`, says: p.worst ?? '', tone: red ? 'r' : 'a' };
}

/** The line's programs not yet proved whose latest test did not pass, each with its machine where the reading names it. */
export function failedPrograms(programs: readonly Program[], tests: readonly Test[], reading: ProgramsReading | undefined): { what: string; machine?: string }[] {
  const lineOf = (id: string) => reading?.lines.find(l => l.programId === id);
  return programs.filter(p => !p.deletedAt && !isProved(p)).filter(p => lineOf(p.id)?.bucket === 'failed' || provingTestOf(p, [...tests])?.outcome === 'failed')
    .map(p => { const m = lineOf(p.id)?.machine; return { what: p.what, ...(m ? { machine: m } : {}) }; });
}

/** Those programs as one card — how many, the first by name. None when none failed. */
export function failedCard(failed: readonly { what: string; machine?: string }[]): LineCard | undefined {
  if (!failed.length) return undefined;
  const first = failed[0];
  return { key: 'failed', tool: 'Tests that didn’t pass', name: n(failed.length, 'program'), says: `${first.what}${first.machine ? ` on the ${first.machine}` : ''}${failed.length > 1 ? ` and ${failed.length - 1} more` : ''}`, tone: 'r' };
}
