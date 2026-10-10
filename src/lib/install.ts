/* WHERE A MACHINE HAS GOT TO IN ITS INSTALLATION — read, never stored.
 *
 * Rowland: "an installing section — the ability to understand the issues and
 * stages that are taking place on a day to day basis, telling a story."
 *
 * A machine's install steps are ordinary records (see INSTALL_STAGES in
 * lib/testing): each is planned for a day, done by somebody, and turns things
 * up. This reads them the way somebody on the floor would say it — how far it
 * has got, what is next and whose it is, what stopped it — so the Install
 * screen and, later, the client report say the same sentence from one call.
 */
import { owns } from './format';
import { COMMISSION_TESTS, HANDOVER_STAGES, INSTALL_STAGES, SETUP_STAGES, assetStateOf, daysBetween, gateOf, isOverdue, isSettled, latestAttempts, live, needsVerdict, plannedEnd, testOfFix, type Asset, type StepGate, type Test, type TestItem } from './testing';
import { niceDay } from './weeks';
import type { Project } from '../types';
import { stateOf, type Program } from './programs';
import { DAY_HOURS, hoursTally, hoursWord } from './hoursLost';

/** done · a problem stopped it · ran and nobody has said · the day has gone · still ahead */
export type StepTone = 'done' | 'problem' | 'asking' | 'late' | 'ahead';

export interface StepView {
  step: Test;
  tone: StepTone;
  /** Its finish has gone and it is not done. A SEPARATE fact from a problem:
   *  Rowland, 4 October — "a problem doesn't mean it will cause a lateness …
   *  2 different things can be both." The tone gives the square one colour
   *  (a problem is the louder red); the words say every fact that is true. */
  late: boolean;
  /** The first step not yet done, in order — what the machine is waiting on. */
  next: boolean;
  /** Things written down under "what we found doing it". */
  found: number;
  /** Done, and how many days after its first planned finish (doneLateBy) —
   *  0 when on time or not done. */
  lateBy: number;
}

export interface MachineInstall {
  /** Undefined for steps on the line itself rather than on one machine. */
  asset?: Asset;
  steps: StepView[];
  done: number;
  total: number;
  late: number;
  /** Fixes still open that are FOR one of these steps. */
  fixesOpen: number;
  /** Every step done and the machine not yet marked installed — the app asks. */
  ready: boolean;
  /** What somebody would say about it, in one breath. */
  says: string;
}

/** What is wrong with a step, every fact that is true: "hit a problem",
 *  "is late", or both — "hit a problem and is late". Empty when neither. */
export function stepFacts(v: Pick<StepView, 'tone' | 'late'>): string {
  const problem = v.tone === 'problem';
  return problem && v.late ? 'hit a problem and is late' : problem ? 'hit a problem' : v.late ? 'is late' : '';
}

export function toneOf(t: Test, today: string): StepTone {
  if (t.outcome === 'passed') return 'done';
  if (t.outcome === 'failed') return 'problem';
  if (needsVerdict(t)) return 'asking';
  if (t.outcome === 'notRun' || isOverdue(t, today)) return 'late';
  return 'ahead';
}

/** LATE, OR A PROBLEM — WHICH ONE. Rowland, 6 October: "if hours are lost =
 *  late. If no hours added then just a problem." One rule for an install step
 *  (every gate), read by the plan on screen and on paper and by its words:
 *  - `late` (red): its day has gone and it is not done, or its problems lost
 *    hours (lib/hoursLost) and it is not done, or a problem MOVED ITS FINISH
 *    LATER — Rowland, 7 October: "we have I/O late but it doesn't show it, I
 *    think because it had a problem against it." A problem that pushed the
 *    finish took the day off the plan, so the day was never "gone"; it had
 *    slipped all the same;
 *  - `problem` (amber, waiting on something): it hit a problem, lost no
 *    hours, and its day is still to come;
 *  - `done` (green) even if it had problems — its story tells them.
 *  Undefined when none of these is true, or for anything but an install step:
 *  a test that did not pass keeps its own "didn't pass". */
export function lateOrProblem(t: Test, items: TestItem[], today: string): 'done' | 'late' | 'problem' | undefined {
  if (t.kind !== 'install') return undefined;
  if (t.outcome === 'passed') return 'done';
  const lost = hoursTally(t.id, items, DAY_HOURS).hours;
  const end = plannedEnd(t) ?? t.ranTo ?? t.ranOn;
  const gone = isOverdue(t, today) || (t.outcome === 'failed' && !!end && end < today);
  if (lost > 0 || gone || movedLater(t.id, items) > 0) return 'late';
  return t.outcome === 'failed' ? 'problem' : undefined;
}

/** DONE, AND LATE — how many days after its FIRST planned finish a stage was
 *  done. Rowland, 7 October: "planned 5 to the 6th, done the 7th, so it was
 *  late." A stage went green when it was done and its lateness was never said
 *  again. Measured from the finish first planned — the earliest finish a
 *  problem or a change of dates moved it from — so a moved date does not hide
 *  the slip. 0 when on time, early, or not done. */
export function doneLateBy(t: Test, items: TestItem[]): number {
  if (t.outcome !== 'passed') return 0;
  const did = t.ranTo ?? t.ranOn;
  const firsts = items.filter(i => !i.deletedAt && i.testId === t.id && i.kind === 'found' && i.movedFrom).map(i => i.movedFrom as string);
  const planned = [...firsts, plannedEnd(t)].filter((d): d is string => !!d).sort()[0];
  if (!did || !planned || did <= planned) return 0;
  return Math.max(0, daysBetween(planned, did) ?? 0);
}

/** "1 day late" / "3 days late". */
export const lateByWords = (n: number): string => `${n} day${n === 1 ? '' : 's'} late`;

/* HELD UP BY THE STAGE BEFORE — the reason a stage ran late, when it was not
 * its own doing. Rowland, 7 October: "sensors were 1 day late, but only
 * because the power connection ... took longer, 6 hours lost ... the next
 * processes were affected. You can't see that correlation — it looks as if
 * sensors are delayed, but it's the power connection that delayed it ... and
 * be smart enough: if I ever switch those processes round, it needs to be
 * intelligent."
 *
 * "Before" is ON THE SAME MACHINE AND GATE, IN THE JOB'S OWN STAGE LIST (`order`, the usual stages — so reordering the list
 * changes which stage comes before, and never a name written in here); any
 * stage not on the list comes after, in the order it was added. It held this
 * one up when this one is late, and the stage before LOST TIME — hours lost on
 * it, or it finished after its own planned finish — AND its work ran into this
 * stage's planned days (it finished on or after this one was due to start). A
 * stage before that is merely still open is not a reason: every stage behind
 * it would say so, and say nothing. Followed back to the stage that
 * lost the time itself — the root, said by name. Nothing is stored. */
export interface HeldUp {
  /** The stage that lost the time. */
  by: Test;
  /** Its hours lost, or the days it finished late. */
  why: string;
  /** "held up by Air and power connected — 6 h lost there" */
  words: string;
}

export function heldUpBy(t: Test, tests: Test[], items: TestItem[], today: string, order: readonly string[] = [], seen = new Set<string>()): HeldUp | undefined {
  if (t.kind !== 'install' || seen.has(t.id)) return undefined;
  seen.add(t.id);
  const late = doneLateBy(t, items) > 0 || lateOrProblem(t, items, today) === 'late';
  if (!late) return undefined;
  const keys = order.map(stageKey);
  const rank = (x: Test) => { const i = keys.indexOf(stageKey(x.title)); return i >= 0 ? i : keys.length + x.sort / 1e6; };
  const mine = live(tests).filter(x => x.kind === 'install' && gateOf(x) === gateOf(t) && (x.assetId ?? '') === (t.assetId ?? ''))
    .sort((a, b) => rank(a) - rank(b) || a.sort - b.sort);
  /* THE NEAREST EARLIER STAGE THAT LOST TIME INTO THIS ONE — looking back
     through every stage before it on the machine, not only the one next to
     it: a stage in between that went to plan does not hide the one that ran
     over. Its work ran into this stage's days when it finished — or, still
     open, is still going — on or after the day this one was due to start. */
  if (!t.plannedFor) return undefined;
  const before = mine.slice(0, mine.indexOf(t)).reverse();
  /* …and it truly came first on the calendar too: it started on or before
     this stage's planned finish. An open stage booked for later days cannot
     have held up one booked before it, whatever the list says. */
  const myEnd = plannedEnd(t) ?? t.plannedFor;
  const prev = before.find(x => {
    if (!hoursTally(x.id, items, DAY_HOURS).hours && !doneLateBy(x, items)) return false;
    const start = x.ranOn ?? x.plannedFor;
    const end = x.outcome === 'passed' ? (x.ranTo ?? x.ranOn ?? plannedEnd(x)) : today;
    return !!start && !!end && start <= myEnd && end >= (t.plannedFor as string);
  });
  if (!prev) return undefined;
  const hours = hoursTally(prev.id, items, DAY_HOURS).hours;
  const by = doneLateBy(prev, items);
  /* The root: a stage before that lost nothing itself was held up in turn. */
  if (!hours && !movedLater(prev.id, items)) {
    const root = heldUpBy(prev, tests, items, today, order, seen);
    if (root) return root;
  }
  const why = hours ? `${hoursWord(hours)} lost there` : `it finished ${lateByWords(by)}`;
  return { by: prev, why, words: `held up by ${prev.title} — ${why}` };
}

/** The days a stage's finish was moved later by its problems — each move a
 *  problem kept (movedFrom → movedTo), added up. */
export function movedLater(stepId: string, items: TestItem[]): number {
  return items.filter(i => !i.deletedAt && i.testId === stepId && i.kind === 'found' && i.movedFrom && i.movedTo)
    .reduce((n, i) => n + Math.max(0, daysBetween(i.movedFrom, i.movedTo) ?? 0), 0);
}

/** WHICH, IN WORDS — "late, 2 h lost", "late", "a problem, no time lost": what
 *  Today's update, the client report and the gate strips say of an install
 *  step, off lateOrProblem and nothing else (the plan says the same with a
 *  dash). Undefined when the step is neither. */
export function lateOrProblemSays(t: Test, items: TestItem[], today: string): { which: 'late' | 'problem'; lost: number; words: string } | undefined {
  const which = lateOrProblem(t, items, today);
  if (which !== 'late' && which !== 'problem') return undefined;
  const lost = hoursTally(t.id, items, DAY_HOURS).hours;
  const moved = movedLater(t.id, items);
  return { which, lost, words: which === 'problem' ? 'a problem, no time lost'
    : lost > 0 ? `late, ${hoursWord(lost)} lost`
      : moved > 0 ? `late, finish moved ${moved} day${moved === 1 ? '' : 's'}` : 'late' };
}

const day = (iso?: string) => (iso ? niceDay(iso, { weekday: 'short' }) : '');

export function installOf(asset: Asset | undefined, all: Test[], items: TestItem[], today: string,
  gate: StepGate = 'install'): MachineInstall {
  const tests = live(all);
  const mine = tests
    .filter(t => t.kind === 'install' && gateOf(t) === gate && (t.assetId ?? undefined) === (asset?.id ?? undefined))
    .sort((a, b) => a.sort - b.sort);
  const liveItems = live(items);
  const nextId = mine.find(t => !isSettled(t))?.id;
  const steps: StepView[] = mine.map(t => ({
    step: t,
    tone: toneOf(t, today),
    /* Late by the one rule (lateOrProblem) — its day gone, hours lost, or
       its finish moved later by a problem — so the square says what the
       counts say. */
    late: isOverdue(t, today) || lateOrProblem(t, liveItems, today) === 'late',
    next: t.id === nextId,
    found: liveItems.filter(i => i.testId === t.id && i.kind === 'found').length,
    lateBy: doneLateBy(t, liveItems),
  }));
  const ids = new Set(mine.map(t => t.id));
  const fixesOpen = tests.filter(f => f.kind === 'fix' && !isSettled(f) && ids.has(testOfFix(f, tests)?.id ?? '')).length;
  const done = steps.filter(s => s.tone === 'done').length;
  /* Every step past its finish, a problem or not — "1 late" is about the day. */
  const late = steps.filter(s => s.late).length;
  /* "Mark it installed" is the install gate's last word; the others have none. */
  const ready = gate === 'install' && !!asset && steps.length > 0 && done === steps.length && !asset.installedOn && !asset.runningOn;

  return { asset, steps, done, total: steps.length, late, fixesOpen, ready, says: saysOf(steps, done, fixesOpen, asset, gate) };
}

function saysOf(steps: StepView[], done: number, fixesOpen: number, asset: Asset | undefined, gate: StepGate): string {
  if (steps.length === 0) {
    if (gate !== 'install') return `No ${GATE_WORD[gate].toLowerCase()} steps yet.`;
    return asset?.installedOn || asset?.runningOn || asset?.state === 'installed' || asset?.state === 'running'
      ? 'Already installed — no steps were kept for it.'
      : 'No install steps yet.';
  }
  const fixes = fixesOpen ? ` ${fixesOpen} fix${fixesOpen === 1 ? '' : 'es'} still open from it.` : '';
  if (done === steps.length) {
    /* "All 1 steps done" read as a fault: one step is "the one step". */
    const all = steps.length === 1 ? 'the one step done' : `all ${steps.length} steps done`;
    return gate === 'install' && (asset?.installedOn || asset?.runningOn)
      ? `Installed — ${all}.${fixes}`
      : `${all[0].toUpperCase()}${all.slice(1)}.${fixes}`;
  }
  const head = `${done} of ${steps.length} done.`;
  /* A problem is the story before the plan: it is why the next step waits. */
  const stuck = steps.find(s => s.tone === 'problem');
  if (stuck) {
    /* The account's own full stop is the sentence's — "bag.." read as a slip. */
    const why = stuck.step.result?.trim().replace(/[.!?]+$/, '');
    return `${head} ${stuck.step.title} ${stepFacts(stuck)}${why ? ` — ${why}` : ''}.${fixes}`;
  }
  const next = steps.find(s => s.next);
  if (!next) return `${head}${fixes}`;
  const t = next.step;
  const who = t.withWhom?.trim();
  const when = plannedEnd(t);
  if (next.tone === 'asking') {
    return `${head} ${t.title} was worked on${t.ranOn ? ` ${day(t.ranOn)}` : ''} — nobody has said if it is done.${fixes}`;
  }
  if (next.tone === 'late') {
    return `${head} ${t.title} is late${when ? ` — it was due ${day(when)}` : ''}${who ? `, ${owns(who)}` : ''}.${fixes}`;
  }
  /* A block of days says both ends — "5 to 9 Oct" — a single day says one. */
  const span = t.plannedFor && t.plannedTo && t.plannedTo > t.plannedFor ? `${day(t.plannedFor)} to ${day(t.plannedTo)}` : when ? day(when) : '';
  return `${head} Next: ${t.title}${span ? `, ${span}` : ', no day yet'}${who ? `, ${who}` : ''}.${fixes}`;
}

/* ---------------------------- THE USUAL STAGES ----------------------------
 *
 * Rowland: "Allow me to edit the 6 install names that you have made as
 * default." The six are the app's guess at how a machine goes in; a site
 * installs its own way, and says so once.
 *
 * The job's own list first. A job that has none yet takes the list from the
 * job whose list was edited most recently — Line 2A is installed the way Line
 * 2B was, and making somebody type the same six names twice is the app not
 * doing its job. Only then the app's six. */
export type StageHolder = { id: string; installStages?: string[]; gateStages?: Project['gateStages']; updatedAt: number; deletedAt?: number };

/** A gate with a usual list: the three of stages, and Commission, whose list
 *  is its usual TESTS (testing COMMISSION_TESTS) — kept, edited and handed on
 *  to the next job exactly as the stages are. */
export type ListGate = StepGate | 'commission';

/** A gate's list as the job keeps it — absent means the app's. */
export const stagesKept = (p: StageHolder | undefined, gate: ListGate): string[] | undefined =>
  gate === 'install' ? p?.installStages : p?.gateStages?.[gate];

/** The app's own list for a gate. */
export const appStages = (gate: ListGate): readonly string[] =>
  gate === 'setup' ? SETUP_STAGES : gate === 'handover' ? HANDOVER_STAGES : gate === 'commission' ? COMMISSION_TESTS : INSTALL_STAGES;

/** What a gate is called on screen and on paper. */
export const GATE_WORD: Record<StepGate, string> = { install: 'Install', setup: 'Set up', handover: 'Hand over' };
/** Where its screen is. "set-up" because /setup is the project's Details. */
export const GATE_PATH: Record<StepGate, string> = { install: 'install', setup: 'set-up', handover: 'handover' };

/** WHERE A RECORD OPENS — in the drawer (?open=, ui/RecordDrawer), over the
 *  list it is kept on: a stage over its gate, a fix over the Fixes, a test
 *  over the tests. Its own page is not a door any more (docs/DOORS.md). */
export function recordHref(projectId: string, id: string, kind?: string): string {
  const list = kind === 'fix' ? 'fixes' : kind === 'install' || kind === 'setup' || kind === 'handover' ? GATE_PATH[kind] : 'testing';
  return `/project/${projectId}/${list}?open=${encodeURIComponent(id)}`;
}

export function usualStages<P extends StageHolder>(
  project: P | undefined, all: readonly P[] = [], gate: ListGate = 'install',
): { stages: string[]; from: 'job' | 'other' | 'app'; otherId?: string } {
  const own = stagesKept(project, gate);
  if (own?.length) return { stages: own, from: 'job' };
  const other = all
    .filter(p => p.id !== project?.id && !p.deletedAt && stagesKept(p, gate)?.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const theirs = stagesKept(other, gate);
  if (other && theirs) return { stages: theirs, from: 'other', otherId: other.id };
  return { stages: [...appStages(gate)], from: 'app' };
}

/* -------------------- WHO IT IS WITH, WHAT IT MUST SHOW --------------------
 *
 * docs/JOBSTART.md. Every line started as the machine's supplier's — the
 * site's own air and power, its electrics, the safety sign-off and the
 * client's own sign-off included — so on day one the control room said
 * "Ilapak UK owes 92" and the site owed nothing. And a usual test was a name
 * only: what it must show was written on each machine's test, 48 times. Both
 * are now said once, beside the list, and given to every machine. */

export type UsualWith = 'supplier' | 'site';
/** Who a line with the site is with — the word the control room files the
 *  site's own work under (lib/portfolio SITE). */
export const SITE_NAME = 'The site';
export const usualKey = (gate: ListGate, title: string): string => `${gate}:${stageKey(title)}`;
/* The site's own work on the app's lists — built on first use, as the names
   it is keyed by are read by stageKey, further down this file. */
let siteWork: Set<string> | undefined;
const SITE_WORK = (): Set<string> => (siteWork ??= new Set([
  usualKey('install', 'Air and power connected'), usualKey('install', 'Electrically complete'),
  usualKey('handover', 'Safety sign-off (PUWER)'), usualKey('handover', 'Client signed off'),
]));

/** The job whose usual list this job is using — its own, or the one it took
 *  its list from (usualStages) — so what that list says about each line comes
 *  with it. */
export function usualHolder<P extends StageHolder>(project: P | undefined, all: readonly P[], gate: ListGate): P | undefined {
  const u = usualStages(project, all, gate);
  return u.from === 'other' ? all.find(p => p.id === u.otherId) ?? project : project;
}

/** Who a usual stage is usually with. */
export function usualWith(holder: StageHolder | undefined, gate: ListGate, title: string): UsualWith {
  return holder?.gateStages?.usualWith?.[usualKey(gate, title)] ?? (SITE_WORK().has(usualKey(gate, title)) ? 'site' : 'supplier');
}

/** Who a new line of this stage starts with on this machine. */
export const whoFor = (holder: StageHolder | undefined, gate: ListGate, title: string, oem?: string): string | undefined =>
  usualWith(holder, gate, title) === 'site' ? SITE_NAME : oem?.trim() || undefined;

export interface UsualAgreed { passesIf?: string; runAgreed?: { rate?: number; minutes?: number; rejectsMax?: number } }

/** What a usual test must show, when it has been written. */
export function usualAgreed(holder: StageHolder | undefined, title: string): UsualAgreed | undefined {
  const a = holder?.gateStages?.usualAgreed?.[usualKey('commission', title)];
  return a && (a.passesIf?.trim() || Object.values(a.runAgreed ?? {}).some(v => typeof v === 'number')) ? a : undefined;
}

/* ------------------------------------------------------------------------- */
/*  A STAGE'S ANSWER (docs/PANELS.md items 4–5)                               */
/* ------------------------------------------------------------------------- */

/** HOW "YES" IS SAID ON A STAGE — a small fixed set, not a panel per name.
 *  Rowland, 10 October: "documents signed off and drawings delivered ... it
 *  really should be just a yes or a no." The floor names its stages any way
 *  it likes; what differs is what "yes" carries:
 *   - done       Done today (the default);
 *   - paperwork  "Here they are": the files, and done in the same go;
 *   - signoff    "Signed": who signed, always asked, and what it accepted;
 *   - programs   the machine's programs, each with its status (Set up);
 *   - run        a test's numbers, judged against what was agreed.
 *  A plain test is "done" here: its verdict is its own (Passed, Didn't pass). */
export type StageAnswer = 'done' | 'paperwork' | 'signoff' | 'programs' | 'run';
export const ANSWER_WORD: Record<StageAnswer, string> = {
  done: 'Done', paperwork: 'Paperwork', signoff: 'Sign-off', programs: 'Programs', run: 'Run',
};
/** The answers a gate's stages can have — Programs only at Set up; a test is
 *  a test or a run. */
export const answersAt = (gate: ListGate): StageAnswer[] =>
  gate === 'commission' ? ['done', 'run'] : gate === 'setup' ? ['done', 'paperwork', 'signoff', 'programs'] : ['done', 'paperwork', 'signoff'];

/* THE WORD LIST — whole words, so "Signal tower checked" is not a sign-off
   and "Training programme agreed" is not the programs stage (both matched the
   old rules by accident). About twenty words in all. A Reading is never
   guessed: it needs a limit agreed. */
const SIGN_WORDS = /\b(sign|signs|signed|signing|sign-off|signoff|accept|accepted|acceptance|approval|approved)\b/i;
const PAPER_WORDS = /\b(drawings?|manuals?|documents?|documentation|docs|certificates?|declarations?|datasheets?|schematics?|o&m|packs?|reports?)\b/i;
const PROGRAM_WORDS = /\bprograms?\b/i;

/* The app's usual lines whose answer the words would miss. */
let appAnswers: Record<string, StageAnswer> | undefined;
const APP_ANSWERS = (): Record<string, StageAnswer> => (appAnswers ??= {
  [usualKey('handover', 'Spares list agreed')]: 'paperwork',
});

const listOf = (t: Pick<Test, 'kind' | 'gate'>): ListGate => ((t.kind ?? 'test') === 'test' ? 'commission' : gateOf(t));

/** What the owner chose for this name at this gate on this job (kept in
 *  gate_stages beside who it is usually with), or the app's own for its usual
 *  lines. Undefined: nobody chose, and the name and the record decide. */
export type AnswerHolder = { gateStages?: Project['gateStages'] };
export function chosenAnswer(holder: AnswerHolder | undefined, t: Pick<Test, 'kind' | 'gate' | 'title'>): StageAnswer | undefined {
  const k = usualKey(listOf(t), t.title);
  return holder?.gateStages?.usualAnswer?.[k] ?? APP_ANSWERS()[k];
}

/** The answer a name alone gives — the word list, in this order. */
export function answerByName(t: Pick<Test, 'kind' | 'gate' | 'title'>): StageAnswer {
  if ((t.kind ?? 'test') === 'test') return RUN_WORDS.test(t.title) ? 'run' : 'done';
  if (t.kind !== 'install') return 'done';
  const app = APP_ANSWERS()[usualKey(gateOf(t), t.title)];
  if (app) return app;
  if (SIGN_WORDS.test(t.title)) return 'signoff';
  if (gateOf(t) === 'setup' && PROGRAM_WORDS.test(t.title)) return 'programs';
  if (PAPER_WORDS.test(t.title)) return 'paperwork';
  return 'done';
}

/** A STAGE'S ANSWER — one rule, in this order:
 *   1. what the owner chose for that name at that gate (chosenAnswer);
 *   2. what the record already holds — numbers kept make a test a run;
 *      programs with a status said make a Set up stage the programs stage —
 *      so a rename on one machine never loses what is on it;
 *   3. the word list (answerByName);
 *   4. otherwise Done. */
export function answerOf(t: Pick<Test, 'id' | 'kind' | 'gate' | 'title'> & Partial<Pick<Test, 'run' | 'runAgreed' | 'runs'>>, holder?: AnswerHolder, items: TestItem[] = []): StageAnswer {
  const test = (t.kind ?? 'test') === 'test';
  if (test && (t.runs?.length || hasNumbers(t.run) || hasNumbers(t.runAgreed))) return 'run';
  const chosen = chosenAnswer(holder, t);
  if (chosen && (test ? chosen === 'run' || chosen === 'done' : chosen !== 'run')) return chosen;
  if (!test && t.kind === 'install' && gateOf(t) === 'setup'
    && items.some(i => !i.deletedAt && i.testId === t.id && i.kind === 'next' && (i.results?.length ?? 0) > 0)) return 'programs';
  return answerByName(t);
}
const hasNumbers = (o?: object): boolean => !!o && Object.values(o).some(v => typeof v === 'number' && Number.isFinite(v));
/** The run words — the same whole words lib/run has always read a run's name by. */
const RUN_WORDS = /\b(speed|rate|performance|ppm|throughput|output)\b/i;

/** The patch that keeps who each usual stage is with, what each usual test
 *  must show, and how each is answered, beside the lists. */
export function keepUsualDetails<P extends StageHolder>(project: P, details: { usualWith?: Record<string, UsualWith>; usualAgreed?: Record<string, UsualAgreed>; usualAnswer?: Record<string, StageAnswer> }): Partial<P> {
  return { gateStages: { ...(project.gateStages ?? {}), ...details } } as Partial<P>;
}

/** Has this test something agreed to show — a "passes if", or a run's agreed
 *  numbers? */
export const hasAgreed = (t: Pick<Test, 'passesIf' | 'runAgreed' | 'runs'>): boolean =>
  !!t.passesIf?.trim() || Object.values(t.runAgreed ?? {}).some(v => typeof v === 'number')
  || !!t.runs?.some(r => Object.values(r.agreed ?? {}).some(v => typeof v === 'number'));

/** The patch that keeps a gate's list on the project. */
export function keepStages<P extends StageHolder>(project: P, gate: ListGate, list: string[] | undefined): Partial<P> {
  if (gate === 'install') return { installStages: list } as Partial<P>;
  return { gateStages: { ...(project.gateStages ?? {}), [gate]: list } } as Partial<P>;
}

/** A list as typed → a list worth saving: trimmed, no blanks, no repeats.
 *  Undefined when it is the app's own six again, so "absent" keeps meaning
 *  "the app's". */
export function cleanStages(typed: readonly string[], gate: ListGate = 'install'): string[] | undefined {
  const app = appStages(gate);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of typed) {
    const s = raw.trim().replace(/\s+/g, ' ');
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  if (out.length === app.length && out.every((s, i) => s === app[i])) return undefined;
  return out;
}

/* ------------------------------- THE GRID --------------------------------
 *
 * Rowland: "two, three, four, five assets all being installed — I need to
 * capture each of the six steps within each of them, and I need to do it
 * fast."
 *
 * One card per machine is one machine at a time. The grid is every machine
 * at once: machines down the side, stages across the top in the job's own
 * order, a cell where they cross. A cell is the step, or the gap where it
 * has not been added. Matched by NAME, because "Dry run" on the wrapper and
 * "Dry run" on the coder are the same stage of two installations. */
export interface GridRow {
  asset?: Asset;
  cells: (StepView | undefined)[];
  missing: number;
  /** The machine's whole reading — its sentence, and whether it is ready to
   *  be marked installed — printed under its row. */
  view: MachineInstall;
}
export interface InstallGrid { columns: string[]; rows: GridRow[] }

/* THE APP'S OWN OLD NAMES. The fifth of the app's six stages was "I/O
   checked" until Rowland asked what I/O meant and it became "Sensors and
   controls checked (I/O)". Steps made before that kept the old name, and the
   grid — which matches by name — drew them as a seventh column nobody could
   remove (the stage editor only lists the six). The same stage under either
   name is one column. */
const OLD_NAMES: Record<string, string> = {
  'i/o checked': 'sensors and controls checked (i/o)',
};
export const stageKey = (s: string) => {
  const k = s.trim().toLowerCase().replace(/\s+/g, ' ');
  return OLD_NAMES[k] ?? k;
};

export function installGrid(assets: Asset[], tests: Test[], items: TestItem[], today: string,
  usual: readonly string[], gate: StepGate = 'install'): InstallGrid {
  const machines = live(assets).sort((a, b) => a.sort - b.sort);
  const views = [...machines.map(a => installOf(a, tests, items, today, gate)), installOf(undefined, tests, items, today, gate)]
    /* Every machine — Install is where the machines live, so a machine that
       was in and running before anybody kept steps still has its row (it says
       so, and is never given stages in bulk). The line's own row only when the
       line has steps of its own. */
    .filter(v => v.total > 0 || !!v.asset);

  /* The job's stages first, in its order; then any other step name in use,
     in the order it was first planned. */
  const columns: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => { const k = stageKey(s); if (k && !seen.has(k)) { seen.add(k); columns.push(s.trim()); } };
  usual.forEach(add);
  views.flatMap(v => v.steps).sort((a, b) => a.step.sort - b.step.sort).forEach(s => add(s.step.title));

  const rows = views.map(v => {
    const cells = columns.map(c => v.steps.find(s => stageKey(s.step.title) === stageKey(c)));
    return { asset: v.asset, cells, view: v, missing: usual.filter(u => !v.steps.some(s => stageKey(s.step.title) === stageKey(u))).length };
  });
  return { columns, rows };
}

/* ------------------------- A STAGE THAT WAS CHANGED -------------------------
 *
 * Rowland: "I/O checked is in the six standard, making it seven, but I can't
 * remove it." Editing the usual stages changes what the NEXT machine gets; the
 * steps already on machines are records of their own and kept their old name,
 * so the grid — which shows every step name in use — grew a seventh column
 * with nothing on screen to clear it. These are the three readings that let
 * him: what was renamed, which steps can move into a stage, and which were
 * never touched and can simply go. */

/** Stages renamed in an edit: same place in the list, a new name, and the old
 *  name gone. A stage moved, added or removed is not a rename. */
export function stageRenames(before: readonly string[], after: readonly string[]): { from: string; to: string }[] {
  const has = (list: readonly string[], s: string) => list.some(x => stageKey(x) === stageKey(s));
  const out: { from: string; to: string }[] = [];
  for (let i = 0; i < Math.min(before.length, after.length); i++) {
    const from = before[i], to = after[i];
    if (stageKey(from) !== stageKey(to) && !has(after, from) && !has(before, to)) out.push({ from, to });
  }
  return out;
}

/** The install steps called `name` — on any machine, or the line itself.
 *  For Commission, the tests of that name (every attempt). */
export const stepsNamed = (tests: Test[], name: string, gate: ListGate = 'install'): Test[] =>
  live(tests).filter(t => (gate === 'commission'
    ? (t.kind ?? 'test') === 'test'
    : t.kind === 'install' && gateOf(t) === gate) && stageKey(t.title) === stageKey(name));

/** Moving steps into another stage: each moves unless its machine already has
 *  that stage — then it stays, rather than making two of the same square. */
export function foldInto(steps: Test[], tests: Test[], target: string, gate: StepGate = 'install'): { move: Test[]; clash: Test[] } {
  const holders = new Set(stepsNamed(tests, target, gate).map(t => t.assetId ?? ''));
  const move: Test[] = [], clash: Test[] = [];
  for (const t of steps) (holders.has(t.assetId ?? '') ? clash : move).push(t);
  return { move, clash };
}

/** Never touched: still planned, no day it ran, nothing written under it, no
 *  pictures, no fix for it. The only steps the app offers to remove in bulk. */
export function untouched(t: Test, tests: Test[], items: TestItem[]): boolean {
  return t.outcome === 'planned' && !t.ranOn && !(t.result ?? '').trim() && !(t.media ?? []).length
    && !live(items).some(i => i.testId === t.id)
    && !live(tests).some(f => f.kind === 'fix' && f.fromTestId === t.id);
}

/* --------------------------- THE JOURNEY STRIP ----------------------------
 *
 * Rowland: "these are the gates — install, set up, commissioning, handover."
 * Where each machine is on that journey, read off what is already kept: the
 * three gates' steps, and the tests on it for Commission. Nothing is stored;
 * the Overview and the client report draw the same reading. */
/** done · under way · late (red: a stage late by lateOrProblem — its day gone,
 *  or hours lost — or a test past its day) · a problem (amber: a stage hit a
 *  problem and lost no time, and nothing at the gate is late) · didn't pass
 *  (red: a test that failed and has not passed since) · not started · nothing
 *  kept. Rowland, 6 October: never "late or a problem" — the app knows which. */
export type GateTone = 'done' | 'going' | 'late' | 'problem' | 'failed' | 'ahead' | 'none';

/** A gate's state in words — the strip, the control room and the client
 *  report say it the same, beside its colour. */
export const GATE_TONE_WORD: Record<GateTone, string> = {
  done: 'done', going: 'under way', late: 'late', problem: 'a problem', failed: 'didn\u2019t pass', ahead: 'not started', none: 'nothing kept',
};

/** Red or amber — a gate with something wrong at it. */
export const isWrongGate = (t: GateTone): boolean => t === 'late' || t === 'failed' || t === 'problem';
export type JourneyGate = StepGate | 'commission';
export const JOURNEY: { gate: JourneyGate; label: string; path: string }[] = [
  { gate: 'install', label: 'Install', path: 'install' },
  { gate: 'setup', label: 'Set up', path: 'set-up' },
  { gate: 'commission', label: 'Commission', path: 'testing' },
  { gate: 'handover', label: 'Hand over', path: 'handover' },
];

/** A machine's tests as they stand now — see testing.latestAttempts. */
function currentProofs(asset: Asset, tests: Test[]): Test[] {
  return latestAttempts(tests).filter(t => t.assetId === asset.id);
}

/** WHY A GATE IS RED, in the words the floor would use — one line per cause,
 *  so a red tile on the front page says what to go and look at instead of
 *  leaving it to be found. Same rules journeyOf colours by. */
export function redReasons(asset: Asset, tests: Test[], items: TestItem[], today: string): string[] {
  return reasonsOf(asset, tests, items, today).map(r => r.text);
}

/** The same reasons, each with its own colour — a stage late (red, with the
 *  hours it lost), a stage that hit a problem and lost no time (amber), a
 *  test that did not pass (red) — so a line of them says which in words AND
 *  in colour (lib/install lateOrProblem). */
export function reasonsOf(asset: Asset, tests: Test[], items: TestItem[], today: string): { text: string; tone: 'late' | 'problem' | 'failed' }[] {
  const out: { text: string; tone: 'late' | 'problem' | 'failed' }[] = [];
  for (const g of ['install', 'setup'] as const) {
    for (const v of installOf(asset, tests, items, today, g).steps) {
      const which = lateOrProblemSays(v.step, items, today);
      if (which) out.push({ text: `${v.step.title} — ${which.words}`, tone: which.which });
      else if (v.tone === 'late') out.push({ text: `${v.step.title} — late`, tone: 'late' });
    }
  }
  for (const t of currentProofs(asset, tests)) {
    if (t.outcome === 'failed') out.push({ text: `${t.title} did not pass`, tone: 'failed' });
    else if (t.outcome === 'notRun') out.push({ text: `${t.title} did not run`, tone: 'late' });
    else if (isOverdue(t, today)) out.push({ text: `${t.title} is late`, tone: 'late' });
  }
  return out;
}

export function journeyOf(asset: Asset, tests: Test[], items: TestItem[], today: string,
  programs: readonly Program[] = []): { gate: JourneyGate; label: string; tone: GateTone }[] {
  const inAlready = ['installed', 'running'].includes(asset.state) || !!asset.installedOn || !!asset.runningOn;
  const fromSteps = (g: StepGate): GateTone => {
    const v = installOf(asset, tests, items, today, g);
    if (v.total === 0) return g === 'install' && inAlready ? 'done' : 'none';
    if (v.done === v.total) return 'done';
    /* WHICH ONE (lateOrProblem): a stage late by its day or by the hours its
       problems lost makes the gate late; one that hit a problem and lost no
       time makes it a problem — amber — while nothing there is late. */
    const which = v.steps.map(s => lateOrProblem(s.step, items, today));
    if (which.includes('late') || v.steps.some(s => s.tone === 'late')) return 'late';
    if (which.includes('problem')) return 'problem';
    if (v.done > 0 || v.steps.some(s => s.tone === 'asking')) return 'going';
    return 'ahead';
  };
  /* SET UP COUNTS THE MACHINE'S PROGRAMS. Rowland's Line 2B had seventeen
     programs written, loaded and proved on its pick and place and no set-up
     steps, and the strip called Set up "nothing kept". A program on the
     machine (loaded or proved) is set up; one not written yet is not. */
  const progs = programs.filter(p => !p.deletedAt && p.assetId === asset.id);
  const fromPrograms: GateTone = progs.length === 0 ? 'none'
    : progs.every(p => stateOf(p) !== 'needed') ? 'done'
      : progs.some(p => stateOf(p) !== 'needed') ? 'going' : 'ahead';
  const setup = ((): GateTone => {
    const st = fromSteps('setup');
    if (st === 'none') return fromPrograms;
    if (fromPrograms === 'none' || st === 'late' || st === 'problem') return st;
    if (st === 'done' && fromPrograms === 'done') return 'done';
    return st === 'ahead' && fromPrograms === 'ahead' ? 'ahead' : 'going';
  })();
  const proofs = currentProofs(asset, tests);
  const commission: GateTone = proofs.length === 0 ? 'none'
    : proofs.every(t => t.outcome === 'passed') ? 'done'
      /* A test that did not pass is said so — not "late". */
      : proofs.some(t => t.outcome === 'failed') ? 'failed'
      : proofs.some(t => t.outcome === 'notRun' || isOverdue(t, today)) ? 'late'
        : proofs.some(t => isSettled(t) || needsVerdict(t)) ? 'going' : 'ahead';
  return JOURNEY.map(j => ({ gate: j.gate, label: j.label,
    tone: j.gate === 'commission' ? commission : j.gate === 'setup' ? setup : fromSteps(j.gate) }));
}

/** THE FOUR GATES FOR A WHOLE JOB — each machine's, put together. A gate is
 *  late if any machine is late at it, done when every machine with something
 *  kept there is done, under way when some of it has happened, and still
 *  ahead otherwise. Machines with nothing kept at a gate do not hold it back:
 *  the same rule journeyNow keeps for one machine. What the all-jobs board
 *  shows on each job's row. */
export function jobJourney(assets: Asset[], tests: Test[], items: TestItem[], today: string,
  programs: readonly Program[] = []): { gate: JourneyGate; label: string; tone: GateTone }[] {
  const each = live(assets).map(a => journeyOf(a, tests, items, today, programs));
  return JOURNEY.map((j, i) => {
    const tones = each.map(e => e[i].tone).filter(t => t !== 'none');
    const tone: GateTone = tones.length === 0 ? 'none'
      : tones.includes('failed') ? 'failed'
      : tones.includes('late') ? 'late'
      : tones.includes('problem') ? 'problem'
        : tones.every(t => t === 'done') ? 'done'
          : tones.some(t => t === 'done' || t === 'going') ? 'going' : 'ahead';
    return { gate: j.gate, label: j.label, tone };
  });
}

/** WHERE A MACHINE STANDS, IN WORDS — "due on site", "at Set up", "Handed
 *  over". Rowland, 5 October: a machine not here yet read "at Install"
 *  (Domino coder, still due on site, said "at Install · 1 late"). A machine
 *  that has not arrived (testing.assetStateOf: awaited) is DUE ON SITE,
 *  whatever its gates say; otherwise it is at the gate journeyNow finds.
 *  `short` is the column word (the client report's right-hand column):
 *  "Due on site", "Set up", "Handed over". One rule for every place a machine
 *  is worded — the front page's strip, the Gantt's machine header, the client
 *  report's machine list and its count line. */
export function machineAt(a: Pick<Asset, 'state' | 'dueOn' | 'onSiteOn' | 'installedOn' | 'runningOn'>,
  j: { gate?: JourneyGate; label: string; tone: GateTone }[],
  /** What it was handed over with (handedOverWith) — said beside "Handed
   *  over", never instead of it. */
  open: string[] = []): { says: string; short: string; due: boolean } {
  if (assetStateOf(a) === 'awaited') return { says: 'due on site', short: 'Due on site', due: true };
  const now = machineNow(j);
  return now === 'Handed over'
    ? { says: ['Handed over', ...open].join(' · '), short: now, due: false }
    : { says: `at ${now}`, short: now, due: false };
}

/** How many machines stand where, in one line — "1 due on site · 2 at
 *  Install · 1 handed over" — from the column words machineAt gives. */
export function machinesWhere(shorts: string[]): string {
  const n = new Map<string, number>();
  for (const s of shorts) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n].map(([s, k]) => (s === 'Due on site' ? `${k} due on site` : s === 'Handed over' ? `${k} handed over` : `${k} at ${s}`)).join(' · ');
}

/** THE GATE A MACHINE IS AT — the earliest with work open on it (late or
 *  under way); failing that, the next one after the last done; "Handed over"
 *  once all four are. Not simply "the first gate not done": Line 2B's
 *  machines were in commissioning trials with no install steps ever kept,
 *  and that read "at Install". A gate with nothing kept does not hold a
 *  machine back from the work it is actually in. */
export function journeyNow(j: { label: string; tone: GateTone }[]): string {
  const open = j.find(g => isWrongGate(g.tone) || g.tone === 'going');
  if (open) return open.label;
  let lastDone = -1;
  j.forEach((g, i) => { if (g.tone === 'done') lastDone = i; });
  const after = j.slice(lastDone + 1);
  const next = after.find(g => g.tone === 'ahead') ?? after.find(g => g.tone !== 'done');
  return next ? next.label : 'Handed over';
}

/** WHERE ONE MACHINE IS — journeyNow, except that a machine whose hand-over
 *  list is done IS handed over, whatever is still open before it. Rowland, 9
 *  October: "in reality things don't go to plan, and business will accept
 *  handovers ... nothing gets blocked but we show the status." A wrapper
 *  signed off with a fix still open read "at Commission" or "Handed over"
 *  depending on what else was open; now it reads "Handed over", and what it
 *  went with is said beside it (handedOverWith). A whole job's gates are not
 *  a machine's: a job is handed over when every machine is (lib/standing). */
export function machineNow(j: { gate?: JourneyGate; label: string; tone: GateTone }[]): string {
  const last = j[j.length - 1];
  if (last && (last.gate ? last.gate === 'handover' : last.label === 'Hand over') && last.tone === 'done') return 'Handed over';
  return journeyNow(j);
}

const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

/** WHAT A MACHINE WAS HANDED OVER WITH — everything before its hand-over list
 *  that was not done, in the gates' order, then its open fixes: "no test
 *  kept", "1 test didn't pass", "2 tests not run", "1 install step not done",
 *  "1 fix open". Empty for a machine not handed over (it is still at a gate,
 *  and that gate says what is open) and for one handed over with nothing
 *  left. The status, never a block (machineNow). */
export function handedOverWith(asset: Asset, tests: Test[], items: TestItem[], today: string,
  programs: readonly Program[] = []): string[] {
  if (machineNow(journeyOf(asset, tests, items, today, programs)) !== 'Handed over') return [];
  return stillOpenOn(asset, tests, items, today, programs).counts;
}

/** Everything still open on one machine, before its hand-over list and after
 *  it — counted ("1 fix open") and by name ("Fix: Fit the upgraded jaw heater
 *  · Ilapak UK · 19 Oct") — for the machine's place and for what a sign-off
 *  accepted (signOffNote). */
export function stillOpenOn(asset: Asset, tests: Test[], items: TestItem[], today: string,
  programs: readonly Program[] = [], except?: string): { counts: string[]; names: string[] } {
  const counts: string[] = [], names: string[] = [];
  const when = (t: Test) => (t.plannedFor ? ` · ${isOverdue(t, today) ? 'was ' : ''}${niceDay(plannedEnd(t) ?? t.plannedFor)}` : '');
  const who = (t: Test) => (t.withWhom?.trim() ? ` · ${t.withWhom.trim()}` : '');
  for (const g of ['install', 'setup'] as const) {
    const open = installOf(asset, tests, items, today, g).steps.filter(v => v.step.outcome !== 'passed' && v.step.id !== except);
    if (open.length) counts.push(`${many(open.length, g === 'install' ? 'install step' : 'set-up step')} not done`);
    for (const v of open) names.push(`${g === 'install' ? 'Install' : 'Set up'}: ${v.step.title}${who(v.step)}${when(v.step)}`);
  }
  const progs = programs.filter(p => !p.deletedAt && p.assetId === asset.id && stateOf(p) === 'needed');
  if (progs.length) counts.push(`${many(progs.length, 'program')} not on the machine`);
  for (const p of progs) names.push(`Program: ${p.what}${p.from?.trim() ? ` · ${p.from.trim()}` : ''}`);
  const proofs = currentProofs(asset, tests);
  if (!proofs.length) counts.push('no test kept');
  const failed = proofs.filter(t => t.outcome === 'failed');
  const unrun = proofs.filter(t => t.outcome !== 'passed' && t.outcome !== 'failed');
  if (failed.length) counts.push(`${many(failed.length, 'test')} didn’t pass`);
  if (unrun.length) counts.push(`${many(unrun.length, 'test')} not run`);
  for (const t of failed) names.push(`Test, didn’t pass: ${t.title}${who(t)}`);
  for (const t of unrun) names.push(`Test, not run: ${t.title}${who(t)}${when(t)}`);
  const hand = installOf(asset, tests, items, today, 'handover').steps.filter(v => v.step.outcome !== 'passed' && v.step.id !== except);
  if (hand.length) counts.push(`${many(hand.length, 'hand-over item')} not done`);
  for (const v of hand) names.push(`Hand over: ${v.step.title}${who(v.step)}${when(v.step)}`);
  const all = live(tests);
  const fixes = all.filter(t => t.kind === 'fix' && !isSettled(t) && (t.assetId ?? testOfFix(t, all)?.assetId) === asset.id);
  if (fixes.length) counts.push(`${many(fixes.length, 'fix', 'fixes')} open`);
  for (const t of fixes) names.push(`Fix: ${t.title}${who(t)}${when(t)}`);
  return { counts, names };
}

/** A LINE THAT IS A SIGN-OFF — its answer is Sign-off (answerOf): the owner
 *  said so on the stage list, or its name has a sign-off's word in it, at any
 *  gate. "Client signed off", "Safety sign-off (PUWER)", and "Documents
 *  signed off" at Install are; "Signal tower checked" is not (docs/PANELS.md:
 *  the old rule read any Hand over line with "sign" in it, and no other). */
export const isSignOff = (t: Pick<Test, 'kind' | 'gate' | 'title'> & Partial<Pick<Test, 'id'>>, holder?: AnswerHolder): boolean =>
  t.kind === 'install' && answerOf({ id: t.id ?? '', kind: t.kind, gate: t.gate, title: t.title }, holder) === 'signoff';

/** WHAT A SIGN-OFF ACCEPTED — written into the line's own account when it is
 *  ticked (docs/HANDOVER.md): "Signed off with 2 open — Fix: Fit the upgraded
 *  jaw heater · Ilapak UK · 19 Oct; Test, not run: Rate trial". A sign-off is
 *  accepted as things are, and afterwards anyone can read what that was. */
export function signOffNote(step: Test, tests: Test[], items: TestItem[], today: string,
  assets: Asset[], programs: readonly Program[] = [], holder?: AnswerHolder): string | undefined {
  if (!isSignOff(step, holder)) return undefined;
  const asset = live(assets).find(a => a.id === step.assetId);
  if (!asset) return undefined;
  const { names } = stillOpenOn(asset, tests, items, today, programs, step.id);
  return names.length
    ? `Signed off ${niceDay(today)} with ${names.length} still open — ${names.join('; ')}.`
    : `Signed off ${niceDay(today)} with nothing still open.`;
}

/** DONE TODAY, ONE WRITE — the drawer's button, the grid's "Done today on
 *  all left" and the gates' Needs you button all mark a stage done this way:
 *  today's day unless one is on it, and on a sign-off what it accepted
 *  (signOffNote) added to its account, with who signed when the line had no
 *  name on it. */
export function doneTodayPatch(step: Test, job: { tests: Test[]; items: TestItem[]; assets: Asset[]; programs?: readonly Program[]; holder?: AnswerHolder },
  today: string, who?: string): (cur: Test) => Partial<Test> {
  const note = signOffNote(step, job.tests, job.items, today, job.assets, job.programs ?? [], job.holder);
  return cur => ({
    outcome: 'passed', ranOn: cur.ranOn ?? today,
    ...(note ? { result: [cur.result?.trim(), note].filter(Boolean).join('\n\n') } : {}),
    ...(who?.trim() ? { withWhom: who.trim() } : {}),
  });
}
