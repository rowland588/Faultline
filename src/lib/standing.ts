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
import { owns } from './format';
import { owedParts, partLate } from './noted';
import { isHere, type Material } from './materials';
import { daysOverdue, stateOf, type Program } from './programs';
import {
  assetStateOf, gateOf, hasRun, isOverdue, isSettled, live, needsVerdict, titleOnMachine, latestAttempts,
  type Asset, type Test, type TestItem,
} from './testing';

export type Strand = 'install' | 'setup' | 'handover' | 'parts' | 'tests' | 'fixes' | 'materials' | 'programs' | 'observations' | 'machines';

/** One line of "what are we waiting on". */
export interface OutstandingRow {
  key: Strand;
  /** In the words the screen and the report both use. */
  what: string;
  open: number;
  /** Open AND past the day it was wanted. Never more than `open`. */
  late: number;
  /** "Brillopak × 2", when one name owns more of it than anyone else. */
  whose?: string;
  /** Who owns the LATE ones. The headline blames off this, not off `whose`:
   *  three open with Ishida and the one late one Ilapak's used to print
   *  "and they are all Ishida Europe's" — the late name is the one that
   *  matters, and it is not always the busiest. */
  lateWhose?: string;
}

/** One thing on the plan. A machine has an `until` and is drawn as a bar,
 *  because arriving and running are different days; everything else is a point. */
export interface PlanMark {
  /** The record it is drawn from, so a row on the Gantt opens it. */
  id?: string;
  kind: 'install' | 'setup' | 'handover' | 'test' | 'fix' | 'material' | 'program' | 'machine' | 'action' | 'note';
  /** ISO. For a machine, the day it landed or is due. */
  at: string;
  until?: string;
  label: string;
  /** The machine's name when the label is "Machine — title" — said apart, so
   *  a title that has a dash of its own ("Weight accuracy — 400g") is never
   *  read as a machine and a step. */
  on?: string;
  /** done = it happened and it was good · failed = it happened and it wasn't
   *  ran = it happened and nobody has said which yet
   *  booked = still ahead of us · late = the day has gone · none = no date agreed */
  tone: 'done' | 'failed' | 'ran' | 'booked' | 'late' | 'none';
  /** How many records this one mark stands for — set only by bunchPlan,
   *  where sixteen programs proved on one day are drawn as one line. */
  count?: number;
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
  /** Every machine through all four gates and nothing owed — the method's done. */
  handedOver?: boolean;
  rows: OutstandingRow[];
  plan: PlanMark[];
}

/** "The date has moved 8 days from what was agreed." Absent when it has not.
 *
 *  Lives here rather than in the card that first drew it, because the client
 *  report says the same thing on its own sheet and two copies of a sentence is
 *  how the screen and the page start disagreeing about a job. */
export function slipWords(slipDays?: number): string | undefined {
  if (slipDays == null || slipDays === 0) return undefined;
  const n = Math.abs(slipDays);
  const days = `${n} day${n === 1 ? '' : 's'}`;
  return slipDays > 0
    ? `The date has moved ${days} from what was agreed.`
    : `${days} ahead of what was agreed.`;
}

import { niceDay, todayISO } from './weeks';
import { journeyOf } from './install';
export { todayISO };

const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** The name that owns most of a set, and how many it owns. Only worth saying
 *  when one name actually dominates — "Brillopak × 1" of four is noise. */
function mostlyWhose(names: (string | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const n of names) {
    const name = n?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const most = Math.max(0, ...counts.values());
  if (!most) return undefined;
  /* A TIE NAMES EVERYONE IN IT. It used to name whoever came first in the
     list, so two owners with two each printed "Brillopak × 2" on one device
     and "the site × 2" on another — both untrue as "mostly whose" (found by
     the random-job stress run). Sorted, so the same job always says the same. */
  const top = [...counts].filter(([, n]) => n === most).map(([name]) => name).sort((a, b) => a.localeCompare(b));
  const one = (name: string) => (most > 1 ? `${name} × ${most}` : name);
  if (top.length === 1) return one(top[0]);
  if (top.length === 2) return `${one(top[0])} · ${one(top[1])}`;
  return `${one(top[0])}, ${one(top[1])} and ${top.length - 2} more`;
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
  /* Every face of the one record — tests, fixes, install steps. */
  const tests = live(input.tests);
  const materials = live(input.materials);
  const programs = live(input.programs);
  const assets = live(input.assets);

  /* ---------------------------- the five lists ---------------------------- */

  /* A TEST AND A FIX ARE THE SAME RECORD, COUNTED APART. Both are open until
     they have happened and late once the END of their window has gone — see
     isOverdue — but they are owed by different people and read as different
     news, so a client gets two rows rather than one number hiding both. */
  const isFix = (t: Test) => t.kind === 'fix';
  const isStep = (t: Test) => t.kind === 'install';
  /* A TEST THAT DID NOT RUN IS STILL TO RUN. isSettled calls its day settled —
     the day happened — but the client is owed the demonstration until it is
     rebooked, which is exactly the rule page 1 of the report draws its "Past
     the day" tile by. Leaving notRun out here is how one document said "3
     past the day" on the first sheet and "2, all Ishida's" on the second. */
  const owed = (t: Test) => !isSettled(t) || t.outcome === 'notRun';
  const testsOpen = tests.filter(t => !isFix(t) && !isStep(t) && owed(t));
  const testsLate = testsOpen.filter(t => isOverdue(t, today));
  const fixesOpen = tests.filter(t => isFix(t) && owed(t));
  const fixesLate = fixesOpen.filter(t => isOverdue(t, today));
  /* INSTALL STEPS, their own row: the weeks between a machine landing and it
     running are somebody's work, owed by a day, and a client reads "3 install
     steps late, Brillopak's" as different news from a test that has not run. */
  /* ONE ROW PER GATE — Install, Set up, Hand over: three different pieces of
     work, usually owed by different people, and "2 hand-over items late" is
     different news from install steps late. */
  const stepsOpen = tests.filter(t => isStep(t) && gateOf(t) === 'install' && owed(t));
  const stepsLate = stepsOpen.filter(t => isOverdue(t, today));
  const setupOpen = tests.filter(t => isStep(t) && gateOf(t) === 'setup' && owed(t));
  const setupLate = setupOpen.filter(t => isOverdue(t, today));
  const handOpen = tests.filter(t => isStep(t) && gateOf(t) === 'handover' && owed(t));
  const handLate = handOpen.filter(t => isOverdue(t, today));
  /* PARTS OF THE PLAN with a day (ui/StageParts) — a line inside a stage that
     somebody owes by a day is owed like anything else, by the one rule
     Needs you's rows are made by (lib/noted owedParts), so the band's "late"
     and the rows under it are the same count. */
  const partsOpen = owedParts(tests, input.items);
  const partsLate = partsOpen.filter(x => partLate(x.part, today));

  const matsOpen = materials.filter(m => !isHere(m));
  const matsLate = matsOpen.filter(m => !!m.due && m.due < today);

  const progsOpen = programs.filter(p => stateOf(p) !== 'proved');
  const progsLate = progsOpen.filter(p => daysOverdue(p, today) != null);


  /* THERE IS NO ACTIONS ROW ANY MORE. An agreed next step IS a fix — see
     db/testing's actionsBecomeFixes — so it is counted under "fixes still to
     do" with everything else somebody has to do. Two rows for one job was how
     the same obligation ended up in the table twice. */

  /* A MACHINE IS WAITED ON UNTIL IT LANDS — not until it runs. It used to
     be outstanding until RUNNING, which was right before the gates existed:
     "not running" was the only way to say a machine still had work ahead.
     Now each machine says which gate it is at (lib/install journeyOf, on the
     Overview and on the report's machines page), and counting the same three
     machines again here made a job in its commissioning trials read as
     "10 things outstanding" when seven were owed and three were simply the
     job. Arriving is the one part of a machine somebody owes by a day.
     LATE is unchanged: `dueOn` is the day it was expected ON SITE, so a
     machine that has landed has met it. */
  const machOpen = assets.filter(a => assetStateOf(a) === 'awaited');
  const machLate = machOpen.filter(a => !!a.dueOn && a.dueOn < today && !a.onSiteOn);

  const rows: OutstandingRow[] = ([
    /* First, because it is first in the job: a machine is installed before
       anything can be tested on it. */
    { key: 'install', what: 'Install steps to do', open: stepsOpen.length, late: stepsLate.length,
      whose: mostlyWhose(stepsOpen.map(t => t.withWhom)), lateWhose: mostlyWhose(stepsLate.map(t => t.withWhom)) },
    { key: 'setup', what: 'Set-up steps to do', open: setupOpen.length, late: setupLate.length,
      whose: mostlyWhose(setupOpen.map(t => t.withWhom)), lateWhose: mostlyWhose(setupLate.map(t => t.withWhom)) },
    /* Under the steps they are parts of. */
    { key: 'parts', what: 'Parts of the plan to do', open: partsOpen.length, late: partsLate.length,
      whose: mostlyWhose(partsOpen.map(x => x.part.owner)), lateWhose: mostlyWhose(partsLate.map(x => x.part.owner)) },
    { key: 'tests', what: 'Tests still to run', open: testsOpen.length, late: testsLate.length,
      whose: mostlyWhose(testsOpen.map(t => t.withWhom)), lateWhose: mostlyWhose(testsLate.map(t => t.withWhom)) },
    { key: 'fixes', what: 'Fixes still to do', open: fixesOpen.length, late: fixesLate.length,
      whose: mostlyWhose(fixesOpen.map(t => t.withWhom)), lateWhose: mostlyWhose(fixesLate.map(t => t.withWhom)) },
    { key: 'materials', what: 'Materials not here', open: matsOpen.length, late: matsLate.length,
      whose: mostlyWhose(matsOpen.map(m => m.from)), lateWhose: mostlyWhose(matsLate.map(m => m.from)) },
    { key: 'programs', what: 'Programs not proved', open: progsOpen.length, late: progsLate.length,
      whose: mostlyWhose(progsOpen.map(p => p.from)), lateWhose: mostlyWhose(progsLate.map(p => p.from)) },
    { key: 'handover', what: 'Hand-over items to do', open: handOpen.length, late: handLate.length,
      whose: mostlyWhose(handOpen.map(t => t.withWhom)), lateWhose: mostlyWhose(handLate.map(t => t.withWhom)) },
    { key: 'machines', what: 'Machines not here yet', open: machOpen.length, late: machLate.length,
      whose: mostlyWhose(machOpen.map(a => a.oem)), lateWhose: mostlyWhose(machLate.map(a => a.oem)) },
    /* NO OBSERVATIONS ROW. It counted observations nobody had decided on, and
       an observation is now a note: the decision that something needs doing
       is a fix, made on the Fixes screen and counted in the row above. A row
       that could never come down was a row a client learned to ignore. */
  ] as OutstandingRow[]).filter(r => r.open > 0);

  const outstanding = rows.reduce((n, r) => n + r.open, 0);
  const late = rows.reduce((n, r) => n + r.late, 0);

  /* ------------------------------- the plan ------------------------------- */

  const plan: PlanMark[] = [];

  for (const t of tests) {
    /* The window it ACTUALLY took if it has run, otherwise the one it is booked
       for — never the start of one and the end of the other. */
    /* A STAGE THAT HIT A PROBLEM IS NOT FINISHED. Its bar stays on its planned
       window — moved later if the problem pushed it — so the plan shows the
       overrun and why, rather than collapsing to the one day it went wrong. */
    const stuck = t.kind === 'install' && t.outcome === 'failed' && !!t.plannedFor;
    const at = stuck ? t.plannedFor : t.ranOn ?? t.plannedFor;
    const until = stuck ? t.plannedTo : t.ranOn ? t.ranTo : t.plannedTo;
    if (!at) continue;
    const label = titleOnMachine(t, tests, assets);
    plan.push({
      id: t.id,
      ...(label !== t.title ? { on: label.slice(0, label.length - t.title.length - 3) } : {}),
      kind: t.kind === 'fix' ? 'fix' : t.kind === 'install' ? gateOf(t) : 'test', at,
      /* A block of days draws as a BAR, the same shape a machine already uses
         and for the same reason — it occupies time rather than happening on a
         day. Nothing new had to be drawn for this. */
      until: until && until > at ? until : undefined,
      label,
      /* notRun is "the day has gone" (hollow red), not "ran, didn't pass"
         (filled red) — the key says filled means it happened, and it didn't.
         Ran and not yet called is its own thing: it happened (filled), and
         the colour cannot say good or bad because nobody has. It drew as
         "still ahead" while page 1 of the same report said NOT PROVED. */
      tone: t.outcome === 'passed' ? 'done'
        : t.outcome === 'failed' ? 'failed'
          : needsVerdict(t) ? 'ran'
            : t.outcome === 'notRun' || isOverdue(t, today) ? 'late' : 'booked',
    });
  }

  for (const m of materials) {
    const at = m.inOn ?? m.due;
    if (!at) continue;
    plan.push({
      id: m.id, kind: 'material', at, label: m.what,
      tone: isHere(m) ? 'done' : m.due && m.due < today ? 'late' : 'booked',
    });
  }

  for (const p of programs) {
    const at = p.provedOn ?? p.testOn;
    if (!at) continue;
    plan.push({
      id: p.id, kind: 'program', at, label: p.what,
      tone: stateOf(p) === 'proved' ? 'done'
        : daysOverdue(p, today) != null ? 'late' : 'booked',
    });
  }

  for (const a of assets) {
    const at = a.onSiteOn ?? a.dueOn;
    if (!at) continue;
    plan.push({
      id: a.id, kind: 'machine', at, until: a.runningOn,
      label: a.name,
      tone: a.state === 'running' ? 'done'
        : a.dueOn && a.dueOn < today && !a.onSiteOn ? 'late' : 'booked',
    });
  }

  /* A MEETING NOTE'S REMINDER, when it was put on the plan — drawn in its own
     colour on the Gantt (see lib/reminders). Ticked off, it is done. */
  for (const i of live(input.items)) {
    if (i.kind !== 'note' || !i.due || !i.onPlan || i.deletedAt) continue;
    plan.push({
      id: i.id, kind: 'note', at: i.due, label: i.what.trim() || 'A note',
      tone: i.doneAt != null ? 'done' : i.due < today ? 'late' : 'booked',
    });
  }

  plan.sort((x, y) => x.at.localeCompare(y.at) || x.kind.localeCompare(y.kind));

  /* ----------------------------- the sentence ----------------------------- */

  const daysToGo = input.expectedAt ? daysBetween(today, input.expectedAt) : undefined;
  const slipDays = input.expectedAt && input.plannedAt
    ? daysBetween(input.plannedAt, input.expectedAt)
    : undefined;

  /* A STEP THAT HIT A PROBLEM IS NEWS. The grid draws it solid red — the
     loudest thing on the screen — and the sentence said nothing: "11 things
     outstanding — one is past the day" over a machine stopped at its first
     stage. It is named, machine and stage, until the step is done. */
  const problems = tests.filter(t => isStep(t) && t.outcome === 'failed')
    .map(t => ({ machine: assets.find(a => a.id === t.assetId)?.name ?? 'The line', stage: t.title.trim() || 'a stage' }));

  /* HANDED OVER — what the method is done when, said when it is true. Every
     machine through all four gates, by the same reading "Where each machine
     is" and the report's journey use, and nothing left owed. The day is the
     last hand-over step's; beside it, how that sits against the date agreed.
     Before this the finished job read "Nothing outstanding. 4 of 4 tests have
     run." — true, and not the sentence a client is waiting for. */
  const handedOver = outstanding === 0 && assets.length > 0
    && assets.every(a => journeyOf(a, input.tests, input.items, today, input.programs).every(g => g.tone === 'done'));
  const handedOn = handedOver
    ? tests.filter(t => isStep(t) && gateOf(t) === 'handover' && t.outcome === 'passed').map(t => t.ranTo ?? t.ranOn).filter((d): d is string => !!d).sort().pop()
    : undefined;

  return {
    /* "N of M tests have run" is about tests — an install step is not one. */
    sentence: handedOver
      ? handedOverWords(handedOn, input.plannedAt, assets.length)
      : sentenceFor({ daysToGo, handover: input.expectedAt, slipDays, late, outstanding, rows, tests: latestAttempts(tests), unanswered: unanswered(tests), problems }),
    daysToGo, slipDays, outstanding, late, rows, plan, handedOver: handedOver || undefined,
  };
}

/** Tests that did not pass and have nothing after them: no re-test booked or
 *  run that passed, none still to run. A re-test that is still to run is
 *  already counted as owed, so it does not show up here too. */
export function unanswered(all: Test[]): number {
  const tests = live(all).filter(t => t.kind !== 'fix' && t.kind !== 'install');
  const kids = (t: Test) => tests.filter(c => c.fromTestId === t.id);
  const passedAfter = (t: Test, depth = 0): boolean =>
    depth < 12 && kids(t).some(c => c.outcome === 'passed' || passedAfter(c, depth + 1));
  const openAfter = (t: Test, depth = 0): boolean =>
    depth < 12 && kids(t).some(c => !isSettled(c) || c.outcome === 'notRun' || openAfter(c, depth + 1));
  return tests.filter(t => t.outcome === 'failed' && !passedAfter(t) && !openAfter(t)).length;
}

/** The finished job, in one breath: when, and against what was agreed. */
function handedOverWords(on: string | undefined, agreed: string | undefined, machines: number): string {
  const when = on ? ` on ${niceDay(on, { weekday: 'short' })}` : '';
  const vs = on && agreed
    ? (() => {
      const d = daysBetween(agreed, on);
      return d === 0 ? ', the day agreed' : d > 0 ? `, ${plural(d, 'day')} after the date agreed` : `, ${plural(-d, 'day')} before the date agreed`;
    })()
    : '';
  return `Handed over${when}${vs} — ${machines === 1 ? 'the machine' : `all ${machines} machines`} through all four gates, nothing outstanding.`;
}

/** What somebody would say out loud if you asked where the job is.
 *
 *  Written as a sentence rather than a row of tiles, for the reason the testing
 *  model already gives: a tile says "6" and a sentence says what the six are
 *  and whether anybody should be worried. It leads on the DATE, because that is
 *  the only question a client actually asked. */
function sentenceFor(x: {
  daysToGo?: number; handover?: string; slipDays?: number; late: number; outstanding: number;
  rows: OutstandingRow[]; tests: Test[]; unanswered: number;
  problems: { machine: string; stage: string }[];
}): string {
  const ran = x.tests.filter(hasRun).length;
  const problem = x.problems.length === 0 ? ''
    : x.problems.length === 1 ? `${x.problems[0].machine} hit a problem at ${x.problems[0].stage}`
      : `${x.problems.length} steps hit a problem`;

  if (x.outstanding === 0) {
    /* NOT "nothing outstanding" over a test that failed and was never booked
       again. It is on no list — a failed test is settled, and no re-test
       exists to be owed — so the count says zero while the client has not
       been shown that thing working. Said out loud instead. */
    if (x.unanswered > 0) {
      return `Nothing booked, but ${x.unanswered === 1 ? 'one test did' : `${x.unanswered} tests did`} not pass and ${x.unanswered === 1 ? 'has' : 'have'} no re-test planned.`;
    }
    return x.tests.length
      ? `Nothing outstanding. ${ran} of ${x.tests.length} ${x.tests.length === 1 ? 'test has' : 'tests have'} run.`
      : 'Nothing outstanding, and nothing planned yet.';
  }

  /* Who owns the late work. Naming them is the difference between a confession
     and a document you can hand to the OEM. */
  const lateRows = x.rows.filter(r => r.late > 0);
  /* Off the LATE names — `whose` is who owns most of the open work, and the
     one late thing is not always theirs. Only when every late row names one
     party, and that party owns every late thing in it. */
  const owners = new Set(lateRows.map(r => r.lateWhose?.split(' × ')[0]).filter(Boolean));
  const allTheirs = lateRows.every(r => {
    const [name, n] = (r.lateWhose ?? '').split(' × ');
    return !!name && (n ? Number(n) : 1) === r.late;
  });
  const blame = x.late > 0 && owners.size === 1 && allTheirs
    ? `, and ${x.late === 1 ? 'it is' : 'they are all'} ${owns([...owners][0] ?? '')}`
    : '';

  /* SAY WHAT THE DAYS ARE COUNTED TO. "8 days to go" over a job whose first
     step is on the 5th reads as a mistake: eight days to what? It is the
     handover date typed on the job, so the sentence says so, and says which day
     — the one number a client can check against their own calendar. */
  const on = x.handover ? ` (${niceDay(x.handover, { weekday: 'short' })})` : '';
  /* NO DATE IS SAID, NOT SKIPPED. A stage-gate job is measured against its
     handover; without one the sentence led on a count and never said the
     job had nothing to be measured against. */
  const head = x.daysToGo == null
    ? `No handover date yet, with ${plural(x.outstanding, 'thing')} outstanding`
    : x.daysToGo < 0
      ? `${plural(Math.abs(x.daysToGo), 'day')} past the handover date${on}, with ${plural(x.outstanding, 'thing')} outstanding`
      : x.daysToGo === 0
        ? `Handover is today, with ${plural(x.outstanding, 'thing')} outstanding`
        : `${plural(x.daysToGo, 'day')} to handover${on}, with ${plural(x.outstanding, 'thing')} outstanding`;

  /* NOT `plural` here. `plural` always prints the number, and a single late
     thing read "1 one is past the day it was wanted" on the dashboard. At one,
     the count is the word. */
  const tail = x.late > 0
    /* Its own sentence beside a late count: "…and it is Ilapak UK's, and
       Ishida checkweigher hit a problem" read as one breathless list. */
    ? ` — ${x.late === 1 ? 'one is' : `${x.late} of them are`} past the day it was wanted${blame}.${problem ? ` ${problem}.` : ''}`
    : problem ? ` — none of it late, but ${problem}.` : ' — none of it late.';

  return `${head[0].toUpperCase()}${head.slice(1)}${tail}`;
}
