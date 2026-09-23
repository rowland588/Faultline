/* TESTING — THE WHOLE MODEL.
 *
 * Rowland, after four rebuilds of something far more elaborate:
 *
 *   "What do we plan to do. What machine. What's the pass, the expectation.
 *    Then the day happens, and the day is fluid. What product did you run, what
 *    was the result, but more importantly what issues did we find on the day.
 *    Then we agree the next steps with the OEM, and that's what we do next.
 *    It's a project cycle. Simple. Really simple."
 *
 * So there is ONE record — a TEST — and it has four parts, in the order the day
 * runs:
 *
 *   THE PLAN    what we plan to do · which machine · when · what it passes on
 *   THE DAY     what we actually ran · when it actually happened · what happened
 *   WHAT WE FOUND   the issues, with the photos and video
 *   WHAT'S NEXT     agreed with the OEM, and each one can become the next test
 *
 * And that is the loop. Nothing else exists.
 *
 * WHAT THIS REPLACED. Five kinds of record, an asset × pack grid, materials with
 * supersession and staleness, a conditions dropdown asking which material spec a
 * result was got on, A/B/C grades on everything, and a 28-item library to pick
 * what a machine must prove. Every one of those was a concept the job does not
 * have. If something here needs a fifth concept to explain it, the answer is
 * that it does not belong.
 *
 * THE PLAN IS NOT REWRITTEN AFTER THE DAY. `plannedFor` and `ranOn` are two
 * fields, as are `planned` and `product`, because the day is fluid and the
 * difference between what you meant to do and what you did is usually the story.
 * One field that quietly follows the result around always reports that
 * everything went to plan.
 */
import type { ID, MediaRef } from '../types';

/** A file somebody was sent — an OEM report, a spec, a drawing. The bytes ride
 *  the same blob store as a snag photo, so it opens on the floor with no signal. */
export interface DocRef {
  id: ID;
  name: string;
  blobKey: string;
  mime: string;
  bytes?: number;
  savedAt: number;
}

/* ================================= MACHINES ================================ */

export type AssetState = 'awaited' | 'onSite' | 'installed' | 'running';

export const ASSET_STATE_WORD: Record<AssetState, string> = {
  awaited: 'Not here yet', onSite: 'On site', installed: 'Installed', running: 'Running',
};

export const ASSET_STATE_ORDER: AssetState[] = ['awaited', 'onSite', 'installed', 'running'];

/** A machine on the line. It carries no checklist of its own: what it has to
 *  prove is whatever tests name it, which is why the same stages repeat down a
 *  line without anybody being made to set them up twice. */
export interface Asset {
  id: ID;
  projectId: ID;
  name: string;
  oem?: string;
  state: AssetState;
  note?: string;
  docs?: DocRef[];

  /* ---------------- WHEN, not just WHERE IT HAS GOT TO ----------------
   *
   * Rowland: "a date of an asset coming to site, for example — it will happen."
   *
   * A machine was the one record in this app carrying a state and no date,
   * which is exactly why it was the one thing that could not go on the plan.
   * Shaped like a material's `due` and `inOn` for the same reason they are
   * shaped that way: what was promised and what actually happened are two
   * facts, and a system that lets one follow the other around always reports
   * that everything went to plan.
   *
   * All optional. A machine already on site when the job started has no due
   * date and never needed one, and an invented date reads as a fact. */
  /** ISO date it is expected on site. */
  dueOn?: string;
  /** ISO dates it actually reached each state. A machine is the only thing on
   *  the plan drawn as a BAR rather than a point, because arriving and running
   *  are different days and the gap between them is the commissioning. */
  onSiteOn?: string;
  installedOn?: string;
  runningOn?: string;

  sort: number;
  updatedAt: number;
  deletedAt?: number;
}

/* =================================== TESTS ================================= */

/** Planned, and then one of three things once the day has happened. `notRun` is
 *  a real answer — the day came and it did not happen — and is deliberately not
 *  the same as still being planned. */
export type Outcome = 'planned' | 'passed' | 'failed' | 'notRun';

/* A TEST AND A FIX ARE THE SAME RECORD WITH DIFFERENT WORDS.
 *
 * Rowland: "fix — literally what we're fixing, the same thing, same sort of
 * format: what's the problem, who's doing it, what was the end result."
 *
 * He is describing this record. A test asks a question of the machine and
 * writes down the answer; a fix states a problem and writes down what was done
 * about it. Both are planned for a day, belong to a machine, are done with
 * somebody, and end in an outcome — and both carry observations and actions
 * underneath. So this is a SECOND FACE, not a second table: no new mapper, no
 * second migration, and every derived thing in the app — the verdict, the
 * plan, what we are waiting on, the client report, the card — reads a fix the
 * day it is added, with nothing new written to draw it. */
export type TestKind = 'test' | 'fix';

export const OUTCOME_WORD: Record<Outcome, string> = {
  planned: 'Planned', passed: 'Passed', failed: 'Didn’t pass', notRun: 'Didn’t run',
};

/** The same four outcomes, said the way a fix says them. "Passed" is a word
 *  about a question; a fix either got done or it did not. */
export const FIX_OUTCOME_WORD: Record<Outcome, string> = {
  planned: 'Planned', passed: 'Fixed', failed: 'Didn’t fix it', notRun: 'Didn’t happen',
};

export const outcomeWord = (t: Pick<Test, 'kind' | 'outcome'>): string =>
  (t.kind === 'fix' ? FIX_OUTCOME_WORD : OUTCOME_WORD)[t.outcome];

/** What each field is CALLED depends on which face you are looking at. One
 *  record, two vocabularies, and the screens and both documents take the words
 *  from here rather than each deciding for themselves. */
export const WORDS: Record<TestKind, {
  one: string; many: string; expectation: string; happened: string;
  withWhom: string; plan: string; day: string;
}> = {
  test: {
    one: 'Test', many: 'Tests',
    expectation: 'Passes if — the expectation',
    happened: 'What happened',
    withWhom: 'Done with',
    plan: 'What we planned', day: 'What happened',
  },
  fix: {
    one: 'Fix', many: 'Fixes',
    expectation: 'The problem',
    happened: 'The end result',
    withWhom: 'Who is doing it',
    plan: 'What we are fixing', day: 'What was done',
  },
};

export interface Test {
  id: ID;
  projectId: ID;

  /** Which face. Absent means a test — every row written before fixes existed
   *  is a test, and reading it that way needs no migration of the data. */
  kind?: TestKind;

  /* ---- the plan, written before the day ---- */
  /** What we plan to do. On a fix, what we are fixing. */
  title: string;
  /** Which machine. Absent means the line itself. */
  assetId?: ID;
  /** WHICH PROGRAM IT IS ABOUT, when it is about one.
   *
   *  Rowland: "you can have a setup of a program, a test of a program, then a
   *  fix of a program, or a fix of an asset."
   *
   *  A program was already able to point at the test that proved it; this is
   *  the same link read from the other end, so a fix can say "this is the
   *  Tesco Express program" rather than only saying it in its title. Optional,
   *  and absent is the ordinary case — most work is about a machine or about
   *  the line. */
  programId?: ID;
  /** ISO date it is planned for — the FIRST day when it is a block. */
  plannedFor?: string;
  /** THE LAST DAY OF THE PLANNED WINDOW, when it is not a single day.
   *
   *  Rowland: "sometimes it's a block, it's like a week commencing... we plan
   *  the test from X date to another date."
   *
   *  Absent is the normal case and means one day. The plan already knows how to
   *  draw a window — a machine is a bar because arriving and running are
   *  different days — so a test or a fix with one becomes a bar with nothing
   *  new to draw, on the screen and on the A3 alike. */
  plannedTo?: string;
  /** What it passes on — the expectation, agreed in advance. On a fix, the
   *  problem being fixed. */
  passesIf?: string;
  /** Who it is being done with. Usually the OEM; on a fix, whose job it is. */
  withWhom?: string;
  /** The product we plan to run. */
  planned?: string;

  /* ---- the day ---- */
  /** ISO date it actually happened, which is often not the planned one. The
   *  FIRST day when it took more than one. */
  ranOn?: string;
  /** The last day it actually ran. Absent means it was one day. */
  ranTo?: string;
  /** What we actually put down the machine. */
  product?: string;
  /** What happened, in whatever terms that test is measured in. On a fix, the
   *  end result. */
  result?: string;
  outcome: Outcome;

  /* ---- what is attached ---- */
  media?: MediaRef[];
  docs?: DocRef[];

  /** The test this was planned from, so a line of them reads as a follow-on. */
  fromTestId?: ID;

  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* ============================ WHAT HANGS OFF ONE ===========================
 *
 * Two lists under a test and ONE table under them, because a finding and a next
 * step are the same shape — a line of words, somebody's name, a date, and
 * whatever was filmed. Splitting them into two tables would have bought nothing
 * but a second mapper and a second migration.
 */

export type ItemKind = 'found' | 'next';

export interface TestItem {
  id: ID;
  projectId: ID;
  testId: ID;
  kind: ItemKind;
  /** What we found, or what we agreed to do. */
  what: string;
  note?: string;
  /** Whose it is. */
  owner?: string;
  /** ISO date it is wanted by — next steps only, in practice. */
  due?: string;
  /** Closed, or done. Absent means open. */
  doneAt?: number;
  media?: MediaRef[];
  /** For a next step that became the next test. */
  becameTestId?: ID;

  /* ---- an observation, and the action somebody decided to take out of it ----
   *
   * A finding is written down live, on the floor, while the trial is running.
   * Most of them are not actions and were never meant to be: they are what you
   * saw. Deciding one IS an action is a separate act, done later, by a person —
   * and it makes a next step, which is the row that carries an owner and a date
   * and gets chased.
   *
   * Both ends of the link are stored so either row reads on its own. */
  /** On an observation: the next step it was turned into. */
  becameItemId?: ID;
  /** On a next step: the observation it came out of. */
  fromItemId?: ID;
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* ================================== derived ================================
 *
 * Everything on every screen is read off the records above. There is no status
 * field anywhere in this model to disagree with them.
 */

export const live = <T extends { deletedAt?: number }>(rows: T[]): T[] => rows.filter(r => !r.deletedAt);

export const isOpen = (i: TestItem): boolean => i.doneAt == null;

/* ===================== AN OBSERVATION, AND WHAT YOU DECIDE ==================
 *
 * "What we found on the day" is not a list of actions. It is what somebody
 * wrote down while the line was running, and most of it is not an action and
 * was never meant to be. Reading it as one — "5 open of 5" — tells the room
 * that five things are going wrong when what actually happened is that five
 * things were noticed.
 *
 * So an observation has three standings, and two of them are decisions a
 * person makes afterwards:
 *
 *   NEW       written down. Nobody has decided anything about it yet.
 *   ACTIONED  somebody decided it needs doing, so it became a next step —
 *             the row that carries an owner and a date and gets chased.
 *   NOTED     somebody decided it needs nothing. Seen, and let go.
 *
 * ACTIONED is derived from the next step still being there rather than from a
 * flag, so deleting the action puts the observation back among the undecided
 * instead of leaving a claim behind that nothing supports. */

export type Standing2 = 'new' | 'actioned' | 'noted';

/** The next step an observation became, if it still exists. */
export const actionOf = (obs: TestItem, items: TestItem[]): TestItem | undefined =>
  obs.becameItemId ? live(items).find(i => i.id === obs.becameItemId) : undefined;

/** WHAT SOMEBODY DECIDED ABOUT AN OBSERVATION.
 *
 *  `becameTestId` is checked FIRST and is the usual answer now: an observation
 *  you decide is a fix becomes its own record, and this only followed the old
 *  line-under-a-test link — so a finding you had already dealt with went on
 *  being counted under "observations to decide on", on the screen and in the
 *  client report. `actionOf` stays for any device that has not yet converted
 *  its lines; see db/testing's actionsBecomeFixes. */
export const standingOfItem = (obs: TestItem, items: TestItem[]): Standing2 =>
  obs.becameTestId || actionOf(obs, items) ? 'actioned' : obs.doneAt != null ? 'noted' : 'new';

export interface FoundTally {
  /** Everything written down. */
  written: number;
  actioned: number;
  noted: number;
  /** Written down, and nobody has said yet whether it needs doing. */
  undecided: number;
}

export function foundTally(found: TestItem[], items: TestItem[]): FoundTally {
  const rows = live(found);
  let actioned = 0, noted = 0;
  for (const r of rows) {
    const st = standingOfItem(r, items);
    if (st === 'actioned') actioned++;
    else if (st === 'noted') noted++;
  }
  return { written: rows.length, actioned, noted, undecided: rows.length - actioned - noted };
}

/** Has the day happened yet. */
export const hasRun = (t: Test): boolean => t.outcome !== 'planned';

/** OFF THE LIST, OR STILL ON IT — and it is not the same question as whether
 *  the day happened.
 *
 *  Rowland: "if I change the status from fixed to not fixed, because that's
 *  what happens, it still falls under done."
 *
 *  For a TEST, any outcome settles it: a test that ran and failed still told
 *  you something, and what you do about it is a NEW record. `notRun` is the
 *  same — a recorded answer, deliberately not the same as still being planned.
 *
 *  For a FIX, the work is the point. "Didn't fix it" means the problem is still
 *  there and somebody is still going to have to deal with it, so it stays on
 *  the list until it is actually fixed. Using "has the day happened" for both
 *  put a fix that had failed under Done, which is the opposite of true.
 *
 *  This decides both lists, the verdict's count, the row in what we are waiting
 *  on and whether something can be late — so it is asked in one place. */
export const isSettled = (t: Test): boolean =>
  t.kind === 'fix' ? t.outcome === 'passed' : hasRun(t);

const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** Planned for a date that has been and gone, and still not run. */
/** The last day of the planned window, which on a single-day plan IS the
 *  planned day. Everything that asks "has the day gone" asks this. */
export const plannedEnd = (t: Test): string | undefined => t.plannedTo ?? t.plannedFor;

/** The last day it actually ran. */
export const ranEnd = (t: Test): string | undefined => t.ranTo ?? t.ranOn;

/** LATE IS THE END OF THE WINDOW, NOT THE START. A test booked for the 5th to
 *  the 9th is not late on the 6th — it is in progress, which is the whole point
 *  of being able to book a block. This one line decides the verdict's late
 *  count, the row in what-we-are-waiting-on and the colour on the plan, so it
 *  is the only place the question is asked. */
export const isOverdue = (t: Test): boolean => {
  const end = plannedEnd(t);
  return !isSettled(t) && !!end && end < todayISO();
};

/** Newest first for what has happened; soonest first for what has not. A list
 *  of past tests reads backwards from today, and a list of planned ones reads
 *  forwards — the same order in both would put the thing you are about to do at
 *  the bottom of the screen. */
export const byWhenRun = (a: Test, b: Test): number =>
  (b.ranOn ?? b.plannedFor ?? '').localeCompare(a.ranOn ?? a.plannedFor ?? '') || b.sort - a.sort;

export const byWhenPlanned = (a: Test, b: Test): number =>
  (a.plannedFor ?? '9999').localeCompare(b.plannedFor ?? '9999') || a.sort - b.sort;

export interface Standing {
  /** Planned and not yet run, soonest first. */
  upcoming: Test[];
  /** Run, newest first. */
  done: Test[];
  /** Everything written down on every trial. Observations, not actions. */
  observations: TestItem[];
  /** The ones nobody has yet said needs doing or needs nothing. */
  undecided: TestItem[];
  /** Everything agreed and still outstanding. */
  openNext: TestItem[];
  ran: number;
  total: number;
  passed: number;
  /** One paragraph, in plain words. The same sentence everywhere. */
  sentence: string;
}

const plural = (n: number, one: string, many = one + 's'): string => `${n} ${n === 1 ? one : many}`;

export function standing(tests: Test[], items: TestItem[]): Standing {
  const ts = live(tests);
  const its = live(items);
  const ids = new Set(ts.map(t => t.id));
  // An item whose test was deleted is not counted against anybody.
  const mine = its.filter(i => ids.has(i.testId));

  const upcoming = ts.filter(t => !isSettled(t)).sort(byWhenPlanned);
  const done = ts.filter(isSettled).sort(byWhenRun);
  const observations = mine.filter(i => i.kind === 'found');
  const undecided = observations.filter(i => standingOfItem(i, mine) === 'new');
  const openNext = mine.filter(i => i.kind === 'next' && isOpen(i));

  return {
    upcoming,
    done,
    observations,
    undecided,
    openNext,
    ran: done.length,
    total: ts.length,
    passed: done.filter(t => t.outcome === 'passed').length,
    sentence: sentenceFor(ts, done.length, undecided.length, openNext.length),
  };
}

/** What somebody would say out loud if you asked where the job is.
 *
 *  Written as a sentence rather than a row of tiles: a tile says "4" and a
 *  sentence says "4 issues are still open", and only one of those can be read
 *  out in a meeting. */
function sentenceFor(tests: Test[], ran: number, found: number, next: number): string {
  if (!tests.length) return 'Nothing planned yet. Plan the first test.';

  const bits: string[] = [];
  /* An observation nobody has decided on is not "in the way" — it is waiting on
     somebody to say whether it matters. That is a different sentence, and
     saying it the old way reported five problems where five things had merely
     been noticed. */
  if (next) bits.push(`${plural(next, 'next step')} outstanding`);
  if (found) bits.push(`${plural(found, 'observation')} to decide on`);

  const tally = ran ? `${ran} of ${tests.length} tests have run.` : `${plural(tests.length, 'test')} planned, none run yet.`;
  // "Nothing outstanding" before anything has run is technically true and says
  // nothing; the tally alone is the honest sentence there.
  if (!bits.length) return ran ? `Nothing outstanding. ${tally}` : tally;

  /* Stated, not dramatised. "In the way" was fair of an open issue and is not
     fair of an observation somebody has yet to look at. */
  const list = bits.length === 1 ? bits[0] : bits.join(', and ');
  return `${list[0].toUpperCase()}${list.slice(1)}. ${tally}`;
}

/** What one test stands at, in its own terms: the result when there is one, the
 *  expectation when there is not. */
export function standsAt(t: Test): string {
  if (t.outcome === 'planned') return t.passesIf?.trim() ? `Passes if: ${t.passesIf}` : 'Planned';
  if (t.outcome === 'notRun') return t.result?.trim() || 'The day came and it did not happen';
  return t.result?.trim() || outcomeWord(t);
}

/** The findings and next steps belonging to one test, in their own order. */
export const itemsOf = (items: TestItem[], testId: ID, kind: ItemKind): TestItem[] =>
  live(items).filter(i => i.testId === testId && i.kind === kind).sort((a, b) => a.sort - b.sort);

/** A new test planned from an old one, carrying forward what would otherwise be
 *  retyped: the machine, the product, and who it is with. THE LOOP, in one
 *  function — it is the only thing in the app that creates work from work. */
export function nextFrom(t: Test, mkId: () => string, at: number, title?: string,
  kind: TestKind = 'test', problem?: string): Test {
  const fix = kind === 'fix';
  return {
    id: mkId(),
    projectId: t.projectId,
    kind,
    /* A next step becoming a test keeps its OWN words — it is that work, not a
       re-run of the test that found it. Only a plain re-test is named one. */
    title: title?.trim() || (fix ? t.title : `${t.title} — re-test`),
    assetId: t.assetId,
    /* A FIX INHERITS THE PROBLEM, A TEST INHERITS THE EXPECTATION. Both live in
       `passesIf` because they are the same field wearing two names — what this
       record is measured against — but carrying a test's pass criterion onto a
       fix would state an expectation nobody agreed. What a fix wants is the
       observation that caused it, which is what `problem` carries in. */
    planned: fix ? undefined : (t.product ?? t.planned),
    passesIf: fix ? problem?.trim() || undefined : t.passesIf,
    withWhom: t.withWhom,
    fromTestId: t.id,
    outcome: 'planned',
    sort: t.sort + 1,
    createdAt: at,
    updatedAt: at,
  };
}

/** Whole days between two ISO dates, positive when `b` is later. */
export function daysBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const x = Date.parse(a), y = Date.parse(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return Math.round((y - x) / 86_400_000);
}

/** Weeks from today to an ISO date. Negative is gone. */
export function weeksTo(iso?: string, today = new Date()): number | undefined {
  const d = daysBetween(today.toISOString().slice(0, 10), iso);
  return d === undefined ? undefined : Math.round(d / 7);
}
