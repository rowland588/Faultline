/* WHERE THE JOB IS — worked out once, drawn three times.
 *
 * Rowland: "we must be cohesive with the entire app. We don't build something
 * without any regard for anything else."
 *
 * The app keeps five lists — trials, observations and actions, materials,
 * programs, machines — and every one of them is good. What it never had was a
 * place that relates them, so the project page, the phone and the client
 * report each worked their own numbers out. That is exactly how the report
 * came to say "5 open of 5" while the screen meant something else.
 *
 * So this is the one source. It reads all five and returns:
 *
 *   THE SENTENCE    what somebody would say out loud if you asked
 *   THE HEADLINE    days to go, how much is outstanding, how much is late
 *   OUTSTANDING     one row per list: how many open, how many late, whose
 *   THE PLAN        everything carrying a date, on one axis
 *
 * NOTHING HERE IS STORED. Every number is derived from records that already
 * exist, which is why there is no new noun in the app to explain it — see
 * CLAUDE.md. The only thing that had to be added was dates on a machine, and
 * that is because a machine was the one record with a state and no date.
 *
 * WHOSE IT IS comes off the field each record already carries: `withWhom` on a
 * trial, `from` on a material or a program, `owner` on an action, `oem` on a
 * machine. That is what turns a list of failures into a document you can hand
 * to an OEM.
 */
import { isHere, type Material } from './materials';
import { daysOverdue, stateOf, type Program } from './programs';
import {
  hasRun, isOpen, isOverdue, live, standingOfItem,
  type Asset, type Test, type TestItem,
} from './testing';

export type Strand = 'trials' | 'materials' | 'programs' | 'observations' | 'actions' | 'machines';

/** One line of "what are we waiting on". */
export interface OutstandingRow {
  key: Strand;
  /** In the words the screen and the report both use. */
  what: string;
  open: number;
  /** Open AND past the day it was wanted. Never more than `open`. */
  late: number;
  /** "Brilopak × 2", when one name owns more of it than anyone else. */
  whose?: string;
}

/** One thing on the plan. A machine has an `until` and is drawn as a bar,
 *  because arriving and running are different days; everything else is a point. */
export interface PlanMark {
  kind: 'trial' | 'material' | 'program' | 'machine';
  /** ISO. For a machine, the day it landed or is due. */
  at: string;
  until?: string;
  label: string;
  /** done = it happened and it was good · failed = it happened and it wasn't
   *  booked = still ahead of us · late = the day has gone · none = no date agreed */
  tone: 'done' | 'failed' | 'booked' | 'late' | 'none';
}

export interface Standing {
  /** One sentence, plain words. The same on the phone, the desk and the paper. */
  sentence: string;
  /** Days until the date the job is currently expected to be at rate. */
  daysToGo?: number;
  /** How far the forecast has moved from the baseline. Positive is late. */
  slipDays?: number;
  outstanding: number;
  late: number;
  rows: OutstandingRow[];
  plan: PlanMark[];
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** The name that owns most of a set, and how many it owns. Only worth saying
 *  when one name actually dominates — "Brilopak × 1" of four is noise. */
function mostlyWhose(names: (string | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const n of names) {
    const name = n?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | undefined, most = 0;
  for (const [name, n] of counts) if (n > most) { best = name; most = n; }
  return best && most > 1 ? `${best} × ${most}` : best;
}

const plural = (n: number, one: string, many = one + 's'): string =>
  `${n} ${n === 1 ? one : many}`;

export interface StandingInput {
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
  assets: Asset[];
  /** The date the job is currently expected to be at rate. */
  expectedAt?: string;
  /** What it was agreed to be, written once. The gap is the slip. */
  plannedAt?: string;
  today?: string;
}

export function standing(input: StandingInput): Standing {
  const today = input.today ?? todayISO();
  const tests = live(input.tests);
  const ids = new Set(tests.map(t => t.id));
  /* An item whose trial was deleted is not counted against anybody. */
  const items = live(input.items).filter(i => ids.has(i.testId));
  const materials = live(input.materials);
  const programs = live(input.programs);
  const assets = live(input.assets);

  /* ---------------------------- the five lists ---------------------------- */

  const trialsOpen = tests.filter(t => !hasRun(t));
  const trialsLate = trialsOpen.filter(isOverdue);

  const matsOpen = materials.filter(m => !isHere(m));
  const matsLate = matsOpen.filter(m => !!m.due && m.due < today);

  const progsOpen = programs.filter(p => stateOf(p) !== 'proved');
  const progsLate = progsOpen.filter(p => daysOverdue(p, today) != null);

  const obs = items.filter(i => i.kind === 'found');
  const undecided = obs.filter(i => standingOfItem(i, items) === 'new');

  const actions = items.filter(i => i.kind === 'next' && isOpen(i));
  const actionsLate = actions.filter(a => !!a.due && a.due < today);

  /* A machine is outstanding until it is RUNNING — installed is not the job. */
  const machOpen = assets.filter(a => a.state !== 'running');
  const machLate = machOpen.filter(a => !!a.dueOn && a.dueOn < today);

  const rows: OutstandingRow[] = ([
    { key: 'trials', what: 'Trials still to run', open: trialsOpen.length, late: trialsLate.length,
      whose: mostlyWhose(trialsOpen.map(t => t.withWhom)) },
    { key: 'materials', what: 'Materials not here', open: matsOpen.length, late: matsLate.length,
      whose: mostlyWhose(matsOpen.map(m => m.from)) },
    { key: 'programs', what: 'Programs not proved', open: progsOpen.length, late: progsLate.length,
      whose: mostlyWhose(progsOpen.map(p => p.from)) },
    { key: 'machines', what: 'Machines not running', open: machOpen.length, late: machLate.length,
      whose: mostlyWhose(machOpen.map(a => a.oem)) },
    /* An observation is never LATE. Nobody agreed a day for it — it is waiting
       on somebody to say whether it matters, which is a different thing. */
    { key: 'observations', what: 'Observations to decide on', open: undecided.length, late: 0,
      whose: undefined },
    { key: 'actions', what: 'Actions agreed, not done', open: actions.length, late: actionsLate.length,
      whose: mostlyWhose(actions.map(a => a.owner)) },
  ] as OutstandingRow[]).filter(r => r.open > 0);

  const outstanding = rows.reduce((n, r) => n + r.open, 0);
  const late = rows.reduce((n, r) => n + r.late, 0);

  /* ------------------------------- the plan ------------------------------- */

  const plan: PlanMark[] = [];

  for (const t of tests) {
    const at = t.ranOn ?? t.plannedFor;
    if (!at) continue;
    plan.push({
      kind: 'trial', at, label: t.title,
      tone: t.outcome === 'passed' ? 'done'
        : t.outcome === 'failed' || t.outcome === 'notRun' ? 'failed'
          : isOverdue(t) ? 'late' : 'booked',
    });
  }

  for (const m of materials) {
    const at = m.inOn ?? m.due;
    if (!at) continue;
    plan.push({
      kind: 'material', at, label: m.what,
      tone: isHere(m) ? 'done' : m.due && m.due < today ? 'late' : 'booked',
    });
  }

  for (const p of programs) {
    const at = p.provedOn ?? p.testOn;
    if (!at) continue;
    plan.push({
      kind: 'program', at, label: p.what,
      tone: stateOf(p) === 'proved' ? 'done'
        : daysOverdue(p, today) != null ? 'late' : 'booked',
    });
  }

  for (const a of assets) {
    const at = a.onSiteOn ?? a.dueOn;
    if (!at) continue;
    plan.push({
      kind: 'machine', at, until: a.runningOn,
      label: a.name,
      tone: a.state === 'running' ? 'done'
        : a.dueOn && a.dueOn < today && !a.onSiteOn ? 'late' : 'booked',
    });
  }

  plan.sort((x, y) => x.at.localeCompare(y.at) || x.kind.localeCompare(y.kind));

  /* ----------------------------- the sentence ----------------------------- */

  const daysToGo = input.expectedAt ? daysBetween(today, input.expectedAt) : undefined;
  const slipDays = input.expectedAt && input.plannedAt
    ? daysBetween(input.plannedAt, input.expectedAt)
    : undefined;

  return {
    sentence: sentenceFor({ daysToGo, slipDays, late, outstanding, rows, tests }),
    daysToGo, slipDays, outstanding, late, rows, plan,
  };
}

/** What somebody would say out loud if you asked where the job is.
 *
 *  Written as a sentence rather than a row of tiles, for the reason the testing
 *  model already gives: a tile says "6" and a sentence says what the six are
 *  and whether anybody should be worried. It leads on the DATE, because that is
 *  the only question a client actually asked. */
function sentenceFor(x: {
  daysToGo?: number; slipDays?: number; late: number; outstanding: number;
  rows: OutstandingRow[]; tests: Test[];
}): string {
  const ran = x.tests.filter(hasRun).length;

  if (x.outstanding === 0) {
    return x.tests.length
      ? `Nothing outstanding. ${ran} of ${x.tests.length} trials have run.`
      : 'Nothing outstanding, and nothing planned yet.';
  }

  /* Who owns the late work. Naming them is the difference between a confession
     and a document you can hand to the OEM. */
  const lateRows = x.rows.filter(r => r.late > 0);
  const owners = new Set(lateRows.map(r => r.whose?.split(' × ')[0]).filter(Boolean));
  const blame = x.late > 0 && owners.size === 1
    ? `, and ${x.late === 1 ? 'it is' : 'they are all'} ${[...owners][0]}’s`
    : '';

  const head = x.daysToGo == null
    ? `${plural(x.outstanding, 'thing')} outstanding`
    : x.daysToGo < 0
      ? `${plural(Math.abs(x.daysToGo), 'day')} past the date, with ${plural(x.outstanding, 'thing')} outstanding`
      : `${plural(x.daysToGo, 'day')} to go, with ${plural(x.outstanding, 'thing')} outstanding`;

  /* NOT `plural` here. `plural` always prints the number, and a single late
     thing read "1 one is past the day it was wanted" on the dashboard. At one,
     the count is the word. */
  const tail = x.late > 0
    ? ` — ${x.late === 1 ? 'one is' : `${x.late} of them are`} past the day it was wanted${blame}.`
    : ' — none of it late.';

  return `${head[0].toUpperCase()}${head.slice(1)}${tail}`;
}
