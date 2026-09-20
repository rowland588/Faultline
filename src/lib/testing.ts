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
  sort: number;
  updatedAt: number;
  deletedAt?: number;
}

/* =================================== TESTS ================================= */

/** Planned, and then one of three things once the day has happened. `notRun` is
 *  a real answer — the day came and it did not happen — and is deliberately not
 *  the same as still being planned. */
export type Outcome = 'planned' | 'passed' | 'failed' | 'notRun';

export const OUTCOME_WORD: Record<Outcome, string> = {
  planned: 'Planned', passed: 'Passed', failed: 'Didn’t pass', notRun: 'Didn’t run',
};

export interface Test {
  id: ID;
  projectId: ID;

  /* ---- the plan, written before the day ---- */
  /** What we plan to do. */
  title: string;
  /** Which machine. Absent means the line itself. */
  assetId?: ID;
  /** ISO date it is planned for. */
  plannedFor?: string;
  /** What it passes on — the expectation, agreed in advance. */
  passesIf?: string;
  /** Who it is being done with. Usually the OEM. */
  withWhom?: string;
  /** The product we plan to run. */
  planned?: string;

  /* ---- the day ---- */
  /** ISO date it actually happened, which is often not the planned one. */
  ranOn?: string;
  /** What we actually put down the machine. */
  product?: string;
  /** What happened, in whatever terms that test is measured in. */
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

/** Has the day happened yet. */
export const hasRun = (t: Test): boolean => t.outcome !== 'planned';

const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** Planned for a date that has been and gone, and still not run. */
export const isOverdue = (t: Test): boolean =>
  !hasRun(t) && !!t.plannedFor && t.plannedFor < todayISO();

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
  /** Everything found and still open, across every test. */
  openFindings: TestItem[];
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

  const upcoming = ts.filter(t => !hasRun(t)).sort(byWhenPlanned);
  const done = ts.filter(hasRun).sort(byWhenRun);
  const openFindings = mine.filter(i => i.kind === 'found' && isOpen(i));
  const openNext = mine.filter(i => i.kind === 'next' && isOpen(i));

  return {
    upcoming,
    done,
    openFindings,
    openNext,
    ran: done.length,
    total: ts.length,
    passed: done.filter(t => t.outcome === 'passed').length,
    sentence: sentenceFor(ts, done.length, openFindings.length, openNext.length),
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
  if (found) bits.push(`${plural(found, 'issue')} still open`);
  if (next) bits.push(`${plural(next, 'next step')} outstanding`);

  const tally = ran ? `${ran} of ${tests.length} tests have run.` : `${plural(tests.length, 'test')} planned, none run yet.`;
  // "Nothing outstanding" before anything has run is technically true and says
  // nothing; the tally alone is the honest sentence there.
  if (!bits.length) return ran ? `Nothing outstanding. ${tally}` : tally;

  const list = bits.length === 1 ? bits[0] : bits.join(' and ');
  const verb = bits.length === 1 && /^1 /.test(bits[0]) ? 'is' : 'are';
  return `${list[0].toUpperCase()}${list.slice(1)} ${verb} in the way. ${tally}`;
}

/** What one test stands at, in its own terms: the result when there is one, the
 *  expectation when there is not. */
export function standsAt(t: Test): string {
  if (t.outcome === 'planned') return t.passesIf?.trim() ? `Passes if: ${t.passesIf}` : 'Planned';
  if (t.outcome === 'notRun') return t.result?.trim() || 'The day came and it did not happen';
  return t.result?.trim() || OUTCOME_WORD[t.outcome];
}

/** The findings and next steps belonging to one test, in their own order. */
export const itemsOf = (items: TestItem[], testId: ID, kind: ItemKind): TestItem[] =>
  live(items).filter(i => i.testId === testId && i.kind === kind).sort((a, b) => a.sort - b.sort);

/** A new test planned from an old one, carrying forward what would otherwise be
 *  retyped: the machine, the product, and who it is with. THE LOOP, in one
 *  function — it is the only thing in the app that creates work from work. */
export function nextFrom(t: Test, mkId: () => string, at: number, title?: string): Test {
  return {
    id: mkId(),
    projectId: t.projectId,
    /* A next step becoming a test keeps its OWN words — it is that work, not a
       re-run of the test that found it. Only a plain re-test is named one. */
    title: title?.trim() || `${t.title} — re-test`,
    assetId: t.assetId,
    planned: t.product ?? t.planned,
    passesIf: t.passesIf,
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
