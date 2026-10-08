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
export { todayISO, monthSpans, weekIndexOf, type Week } from './weeks';

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

/** THE ORDER THE PERSON SET. Rowland, 8 October: "add the ability to move the
 *  order of programs in Set up up and down." The list reads in this order —
 *  each program's state still shows on its row (colour and words), and one
 *  whose test day has gone is still named on Commission's Needs you. New
 *  programs go to the bottom. */
export const inOrder = (rows: Program[]): Program[] =>
  live(rows).slice().sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);

/** One program moved a place up (-1) or down (+1): the list renumbered
 *  10, 20, 30 … so the order is exact, and only the rows whose place changed
 *  are returned to be written. */
export function movedOne(rows: Program[], id: string, by: -1 | 1): Program[] {
  const list = inOrder(rows);
  const i = list.findIndex(p => p.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((p, k) => ({ p, sort: (k + 1) * 10 })).filter(x => x.p.sort !== x.sort).map(x => ({ ...x.p, sort: x.sort }));
}

/** The order the list used to read in (kept for anything that wants urgency first): what has slipped, then what is coming, then
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

/** WHICH MACHINE A NEW PROGRAM SHOULD START ON.
 *
 *  Rowland: "same one as — I press the node and it doesn't work."
 *
 *  It did fill the name in. What it did not do was land anywhere: the machine
 *  on the add form started at "the line itself" even on a job with machines, so
 *  reusing a name off Pick and place added a SECOND copy of it belonging to no
 *  machine at all. The chip was fine; the box under it was wrong, and the two
 *  together made a control that looked broken.
 *
 *  The machine most programs are already on, because that is where the next one
 *  is going: they are added in runs — five for the pick and place, then five
 *  for the wrapper. With none assigned yet it is simply the first machine, and
 *  with no machines at all it is the line itself, which is what it always was.
 *  "The line itself" stays selectable; it is no longer the default answer to a
 *  question the job has machines for. */
export const busiestMachine = (rows: Program[], assets: { id: string }[]): string => {
  if (assets.length === 0) return '';
  const count = new Map<string, number>();
  for (const p of rows) {
    if (!p.assetId || !assets.some(a => a.id === p.assetId)) continue;
    count.set(p.assetId, (count.get(p.assetId) ?? 0) + 1);
  }
  let best = '', most = 0;
  /* Ties go to the machine listed first, so the answer does not move about
     between renders on a job where two machines carry the same number. */
  for (const a of assets) {
    const n = count.get(a.id) ?? 0;
    if (n > most) { most = n; best = a.id; }
  }
  return best || assets[0].id;
};

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

/* ======================= PROVED IN COMMISSION ==============================
 *
 * Rowland, 6 October: "programs are directly linked to commissioning, so make
 * the link." A program is loaded at Set up and PROVED at Commission, and the
 * proving is a test — the record Commission is made of. Two fields already
 * held the link from both ends and nothing joined them: a test says which
 * program it is about (Test.programId), a program says which test proved it
 * (Program.testId). This is the one rule that keeps them agreeing, called on
 * every local write of a test (db/testing → db/programs followTest):
 *
 *   the test passes      → the program is proved, on the day the test ran
 *   it fails, or is put  → a program THIS test proved drops back to on the
 *   back to planned        machine; one signed off by hand is left alone
 *   its day moves        → the program's test date moves with it
 *
 * No new record, no new state: the program's own three states and its dates. */

/** Just enough of a test to read it — no import of lib/testing here. */
export interface ProvingTest {
  id: ID;
  programId?: ID;
  outcome: 'planned' | 'passed' | 'failed' | 'notRun';
  ranOn?: string;
  plannedFor?: string;
  deletedAt?: number;
}

/** The program as the test leaves it, or undefined when nothing changes. */
export function programAfterTest(p: Program, t: ProvingTest, today = todayISO()): Program | undefined {
  if (t.programId !== p.id || t.deletedAt || p.deletedAt) return undefined;
  let next: Program = p;
  if (t.outcome === 'passed') {
    const on = t.ranOn ?? p.provedOn ?? today;
    next = { ...p, state: 'proved', provedOn: on, testOn: undefined, testId: t.id };
  } else if (p.testId === t.id && p.provedOn) {
    /* It was this test that proved it, and the test no longer says it passed. */
    next = { ...p, state: 'onMachine', provedOn: undefined };
  }
  /* Its test date is the test's day, while it is still to prove. */
  if (!next.provedOn && t.outcome === 'planned' && t.plannedFor && next.testOn !== t.plannedFor) {
    next = { ...next, testOn: t.plannedFor, testId: t.id };
  } else if (!next.provedOn && t.outcome !== 'passed' && next.testId !== t.id) {
    next = { ...next, testId: t.id };
  }
  const same = next.state === p.state && next.provedOn === p.provedOn && next.testOn === p.testOn && next.testId === p.testId;
  return same ? undefined : next;
}

/** What a program's proving test is called — the program first, so it reads
 *  as the program on every list the test appears on. */
export const provingTitle = (p: Pick<Program, 'what'>): string => `Prove program ${p.what}`;
