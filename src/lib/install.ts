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
import { HANDOVER_STAGES, INSTALL_STAGES, SETUP_STAGES, assetStateOf, gateOf, isOverdue, isSettled, latestAttempts, live, needsVerdict, plannedEnd, testOfFix, type Asset, type StepGate, type Test, type TestItem } from './testing';
import { niceDay } from './weeks';
import { stateOf, type Program } from './programs';
import { DAY_HOURS, hoursTally } from './hoursLost';

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
 *    hours (lib/hoursLost) and it is not done;
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
  if (lost > 0 || gone) return 'late';
  return t.outcome === 'failed' ? 'problem' : undefined;
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
    late: isOverdue(t, today),
    next: t.id === nextId,
    found: liveItems.filter(i => i.testId === t.id && i.kind === 'found').length,
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
type StageHolder = { id: string; installStages?: string[]; gateStages?: { setup?: string[]; handover?: string[] }; updatedAt: number; deletedAt?: number };

/** A gate's list as the job keeps it — absent means the app's. */
export const stagesKept = (p: StageHolder | undefined, gate: StepGate): string[] | undefined =>
  gate === 'install' ? p?.installStages : p?.gateStages?.[gate];

/** The app's own list for a gate. */
export const appStages = (gate: StepGate): readonly string[] =>
  gate === 'setup' ? SETUP_STAGES : gate === 'handover' ? HANDOVER_STAGES : INSTALL_STAGES;

/** What a gate is called on screen and on paper. */
export const GATE_WORD: Record<StepGate, string> = { install: 'Install', setup: 'Set up', handover: 'Hand over' };
/** Where its screen is. "set-up" because /setup is the project's Details. */
export const GATE_PATH: Record<StepGate, string> = { install: 'install', setup: 'set-up', handover: 'handover' };

export function usualStages<P extends StageHolder>(
  project: P | undefined, all: readonly P[] = [], gate: StepGate = 'install',
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

/** The patch that keeps a gate's list on the project. */
export function keepStages<P extends StageHolder>(project: P, gate: StepGate, list: string[] | undefined): Partial<P> {
  if (gate === 'install') return { installStages: list } as Partial<P>;
  return { gateStages: { ...(project.gateStages ?? {}), [gate]: list } } as Partial<P>;
}

/** A list as typed → a list worth saving: trimmed, no blanks, no repeats.
 *  Undefined when it is the app's own six again, so "absent" keeps meaning
 *  "the app's". */
export function cleanStages(typed: readonly string[], gate: StepGate = 'install'): string[] | undefined {
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
const stageKey = (s: string) => {
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

/** The install steps called `name` — on any machine, or the line itself. */
export const stepsNamed = (tests: Test[], name: string, gate: StepGate = 'install'): Test[] =>
  live(tests).filter(t => t.kind === 'install' && gateOf(t) === gate && stageKey(t.title) === stageKey(name));

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
export type GateTone = 'done' | 'going' | 'late' | 'ahead' | 'none';
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
  const out: string[] = [];
  for (const g of ['install', 'setup'] as const) {
    for (const v of installOf(asset, tests, items, today, g).steps) {
      const facts = stepFacts(v);
      if (facts) out.push(`${v.step.title} ${facts}`);
    }
  }
  for (const t of currentProofs(asset, tests)) {
    if (t.outcome === 'failed') out.push(`${t.title} did not pass`);
    else if (t.outcome === 'notRun') out.push(`${t.title} did not run`);
    else if (isOverdue(t, today)) out.push(`${t.title} is late`);
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
    if (v.steps.some(s => s.tone === 'problem' || s.tone === 'late')) return 'late';
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
    if (fromPrograms === 'none' || st === 'late') return st;
    if (st === 'done' && fromPrograms === 'done') return 'done';
    return st === 'ahead' && fromPrograms === 'ahead' ? 'ahead' : 'going';
  })();
  const proofs = currentProofs(asset, tests);
  const commission: GateTone = proofs.length === 0 ? 'none'
    : proofs.every(t => t.outcome === 'passed') ? 'done'
      : proofs.some(t => t.outcome === 'failed' || t.outcome === 'notRun' || isOverdue(t, today)) ? 'late'
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
      : tones.includes('late') ? 'late'
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
  j: { label: string; tone: GateTone }[]): { says: string; short: string; due: boolean } {
  if (assetStateOf(a) === 'awaited') return { says: 'due on site', short: 'Due on site', due: true };
  const now = journeyNow(j);
  return now === 'Handed over' ? { says: 'Handed over', short: now, due: false } : { says: `at ${now}`, short: now, due: false };
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
  const open = j.find(g => g.tone === 'late' || g.tone === 'going');
  if (open) return open.label;
  let lastDone = -1;
  j.forEach((g, i) => { if (g.tone === 'done') lastDone = i; });
  const after = j.slice(lastDone + 1);
  const next = after.find(g => g.tone === 'ahead') ?? after.find(g => g.tone !== 'done');
  return next ? next.label : 'Handed over';
}
