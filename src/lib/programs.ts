/* WHAT THE MACHINE CAN RUN, AND WHETHER WE TRUST IT.
 *
 * Rowland's own words for why this exists: "programs on the machine, programs
 * that we have that have been validated… What programs do we have? What
 * programs do we need? When are we testing them?"
 *
 * It is the materials sheet's twin, and deliberately so — the same grid, the
 * same weeks, the same green — because a line is waiting on two kinds of thing
 * and nobody should have to learn two pictures.
 *
 * ONE IDEA IS ADDED, AND ONLY ONE. A film either turned up or it did not: two
 * states. A program can sit on the machine for a month with nobody willing to
 * run production on it. So where it has got to is three states, never two:
 *
 *   NOT WRITTEN     we need it, nobody has made it. Usually the OEM owes us one.
 *   ON THE MACHINE  it exists and can be selected. Nobody has proved it works.
 *   PROVED          tested, passed, DATED.
 *
 * THE DATE IS THE FACT. `provedOn` is what makes a program proved; the word on
 * its own is an opinion, and `stateOf` below refuses to read it as more than
 * that. A row claiming to be proved with no date reads as on the machine.
 *
 * WHAT PROVES ONE IS A TEST — the record this app already keeps (lib/testing:
 * the plan, the day, what we found, what is next). A test that passes writes
 * its date here; a test that FAILS drops the program back to on the machine and
 * says why in its own record, rather than adding a fourth colour to the grid
 * that would draw the same fact twice.
 *
 * It can also be set by hand, without a test, because plenty of programs were
 * proved long before this app existed and inventing a test record for them
 * would be a lie. `testId` absent is how the screen says so out loud.
 *
 * WHAT IS NOT HERE, on purpose: version numbers, who last edited it on the HMI,
 * parameter lists, approval signatures. The machine and its own software own
 * all of that, a second copy would be wrong inside a week, and none of it
 * answers the question a project actually asks — can we run this product yet,
 * and if not, when do we find out.
 */
import type { ID } from '../types';
import { daysBetween, todayISO, weeksFrom, type Week } from './weeks';
/* The date reader is shared with the materials paste, so the two cannot
   disagree about what "09-Oct" means on the same spreadsheet. */
import { readDate } from './materials';
export { todayISO, monthSpans, weekIndexOf, type Week } from './weeks';
export { readDate } from './materials';

/** Where a program has got to. Three words, the same three on every line, so a
 *  grid of them means something at a glance and across projects. Never free
 *  text: a status somebody types is a status only they can read. */
export type ProgramState = 'needed' | 'onMachine' | 'proved';

export const STATE_WORD: Record<ProgramState, string> = {
  needed: 'Not written', onMachine: 'On the machine', proved: 'Proved',
};

export const STATE_SUB: Record<ProgramState, string> = {
  needed: 'nobody has made it yet',
  onMachine: 'written, not proved',
  proved: 'tested, passed, dated',
};

export interface Program {
  id: ID;
  projectId: ID;
  /** What it is — the name or number on the machine. The only field that must
   *  be filled in. */
  what: string;
  /** What it runs — the product or film. This is what ties a program to the
   *  material it needs, and it is how somebody recognises the row. */
  runs?: string;
  /** Which machine. Absent means the line itself — the same rule as a test. */
  assetId?: ID;
  /** Which line it is for. Optional: some programs are not line-specific. */
  lineId?: ID;

  /** Where it has got to. `proved` here means nothing without `provedOn`. */
  state: ProgramState;
  /** ISO date it is booked to be proved. Absent is a real answer — no date
   *  agreed — and the screen says that rather than inventing one. */
  testOn?: string;
  /** ISO date it was proved. THE fact; see the header. */
  provedOn?: string;
  /** The test that proved it, when there is one. Absent means a person signed
   *  it off, and the screen says which. */
  testId?: ID;

  /** Who owes it to us. Usually the OEM. */
  from?: string;
  note?: string;
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export const live = (rows: Program[]): Program[] => rows.filter(p => !p.deletedAt);

/** Where it has got to, read off the record rather than off the word.
 *
 *  A row that says `proved` with no date is not proved — it is a program on the
 *  machine that somebody felt good about. This is the single place that rule is
 *  enforced, so no screen has to remember it. */
export function stateOf(p: Program): ProgramState {
  if (p.provedOn) return 'proved';
  return p.state === 'proved' ? 'onMachine' : p.state;
}

export const isProved = (p: Program): boolean => stateOf(p) === 'proved';

/* ============================== where it stands =============================
 *
 * A second question, and a different one: not "have we got it" but "when do we
 * find out". A program can be on the machine with a test booked for Tuesday, or
 * on the machine with nobody having said when — the same state, and nowhere
 * near the same problem.
 */

export type Standing =
  | 'overdue'   // the day it was booked for has gone, and it is still not proved
  | 'booked'    // a date, still ahead
  | 'undated'   // no date agreed
  | 'proved';   // done

export function standingOf(p: Program, today = todayISO()): Standing {
  if (isProved(p)) return 'proved';
  if (!p.testOn) return 'undated';
  return p.testOn < today ? 'overdue' : 'booked';
}

/** How many days past its test date, or undefined when it is not. */
export function daysOverdue(p: Program, today = todayISO()): number | undefined {
  return standingOf(p, today) === 'overdue' && p.testOn ? daysBetween(p.testOn, today) : undefined;
}

/** The order the list reads in: what has slipped, then what is coming, then
 *  what nobody has dated, and last what is already proved.
 *
 *  Inside the undated group a program that does not exist yet comes before one
 *  that does: both are waiting on somebody to name a day, but one of them is
 *  also waiting on somebody to write it. */
export function byUrgency(rows: Program[], today = todayISO()): Program[] {
  const rank: Record<Standing, number> = { overdue: 0, booked: 1, undated: 2, proved: 3 };
  return live(rows).slice().sort((a, b) => {
    const ra = rank[standingOf(a, today)], rb = rank[standingOf(b, today)];
    if (ra !== rb) return ra - rb;
    if (ra === 2 && stateOf(a) !== stateOf(b)) return stateOf(a) === 'needed' ? -1 : 1;
    if (a.testOn && b.testOn && a.testOn !== b.testOn) return a.testOn.localeCompare(b.testOn);
    if (a.testOn !== b.testOn) return a.testOn ? -1 : 1;
    return a.sort - b.sort || a.what.localeCompare(b.what);
  });
}

export interface Tally {
  total: number;
  proved: number;
  onMachine: number;
  needed: number;
  /** Booked for a day that has been and gone. Counted separately because it is
   *  the only number on this screen that is anybody's fault. */
  overdue: number;
  undated: number;
  nextTest?: string;
}

export function tally(rows: Program[], today = todayISO()): Tally {
  const all = live(rows);
  const states = all.map(stateOf);
  const standings = all.map(p => standingOf(p, today));
  const booked = all.flatMap((p, i) => (standings[i] === 'booked' && p.testOn ? [p.testOn] : [])).sort();
  return {
    total: all.length,
    proved: states.filter(s => s === 'proved').length,
    onMachine: states.filter(s => s === 'onMachine').length,
    needed: states.filter(s => s === 'needed').length,
    overdue: standings.filter(s => s === 'overdue').length,
    undated: standings.filter(s => s === 'undated').length,
    nextTest: booked[0],
  };
}

/* ================================== the grid ================================ */

/** The columns: this week forward, far enough to cover the last test anybody
 *  has booked. Proved rows need no column of their own — they are green all the
 *  way across. */
export function weeksFor(rows: Program[], today = todayISO(), least = 6, most = 14): Week[] {
  return weeksFrom(live(rows).flatMap(p => (!isProved(p) && p.testOn ? [p.testOn] : [])), today, least, most);
}

/** What a cell is filled with.
 *
 *  `proved` is green, from the week it was proved onward — a program that has
 *  been signed off does not un-sign itself the following week. `machine` is
 *  amber all the way across: it can run today, and it could equally be wrong
 *  today. `none` is hollow, because nothing exists to fill it with. */
export type Fill = 'proved' | 'machine' | 'none';

export function fillIn(p: Program, w: Week): Fill {
  if (p.provedOn) return p.provedOn <= w.end ? 'proved' : 'none';
  return stateOf(p) === 'onMachine' ? 'machine' : 'none';
}

/** Is this the week its test is booked in — the ring on the grid. Not drawn on
 *  something already proved: the ring is a question, and that one is answered. */
export function testedIn(p: Program, w: Week): boolean {
  return !isProved(p) && !!p.testOn && p.testOn >= w.start && p.testOn <= w.end;
}

/* ============================== pasting a list ==============================
 *
 * The same reader as the materials sheet, and for the same reason: this list
 * lives in a spreadsheet or an OEM's email and always will. It reads each ROW
 * rather than the column headings, because a real sheet has a merged title, a
 * heading row and columns that mean nothing here.
 *
 * The first cell with words in it is the program. Anything to its right that
 * looks like a date is when it is being tested; anything that reads as a word
 * for proved, or for on the machine, sets where it has got to. A row with words
 * and nothing else is still a program — "we need one and nobody has said when"
 * is the most common row on a list like this, and refusing it would make the
 * paste useless on exactly the list it is for.
 */

export interface PastedProgram {
  rowNo: number;
  what: string;
  runs?: string;
  state: ProgramState;
  testOn?: string;
  provedOn?: string;
  /** Why this row is not a program, in words somebody can act on. */
  problem?: string;
}

const PROVED = /^(proved|validated|signed off|signed-off|approved|passed|done|yes|y|green|complete|completed)$/i;
const ON_MACHINE = /^(on machine|on the machine|loaded|written|exists|in place|built|have it|untested|unproved|unvalidated)$/i;
const NEEDED = /^(needed|not written|none|no|missing|to write|required|outstanding|tbc)$/i;

/** THE ROWS A "PUT THEM ALL ON THAT MACHINE" WRITES, and no others.
 *
 *  Rowland: "all the current existing programs set to the machine called pick
 *  and place." A list pasted from the OEM lands with no machine on any row, and
 *  the per-row picker means one tap per program — thirty of them is the job the
 *  app is supposed to be doing.
 *
 *  Here rather than in the hook because the risk is arithmetic, not React: it
 *  must touch exactly the rows asked for and change exactly one field on them.
 *  A bulk write that quietly caught a row it should not have, or dropped a test
 *  date on the way past, is the kind of fault nobody notices until the grid is
 *  wrong a week later. */
export const ontoMachine = (rows: Program[], ids: string[], assetId: string): Program[] => {
  const want = new Set(ids);
  return rows.filter(p => want.has(p.id)).map(p => ({ ...p, assetId }));
};

export function readProgramPaste(text: string, today = todayISO()): PastedProgram[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';

  return lines.map((line, i): PastedProgram => {
    const cells = line.split(sep).map(c => c.trim());
    const first = cells.findIndex(c => c !== '');
    const what = first < 0 ? '' : cells[first];

    let testOn: string | undefined;
    let state: ProgramState | undefined;
    let runs: string | undefined;

    for (const cell of cells.slice(first + 1)) {
      if (!cell) continue;
      if (PROVED.test(cell)) { state = 'proved'; continue; }
      if (ON_MACHINE.test(cell)) { state ??= 'onMachine'; continue; }
      if (NEEDED.test(cell)) { state ??= 'needed'; continue; }
      const d = readDate(cell, today);
      if (d) { testOn ??= d; continue; }
      /* Words that are not a date and not a state are what it runs — the
         product column, which on a real sheet sits right beside the name. */
      runs ??= cell;
    }

    /* A pasted "proved" with no date takes the day it was pasted. The sheet
       knows it is proved and does not know when, exactly as an "In stock" row
       knows a film is here without knowing the day it landed. */
    const provedOn = state === 'proved' ? (testOn ?? today) : undefined;

    return {
      rowNo: i + 1,
      what,
      runs,
      state: state ?? 'needed',
      testOn: state === 'proved' ? undefined : testOn,
      provedOn,
      problem: what ? undefined : 'Nothing on this row',
    };
  });
}
