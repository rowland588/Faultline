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
import { INSTALL_STAGES, assetStateOf, isOverdue, isSettled, live, needsVerdict, plannedEnd, testOfFix, type Asset, type Test, type TestItem } from './testing';
import { niceDay } from './weeks';

/** done · a problem stopped it · ran and nobody has said · the day has gone · still ahead */
export type StepTone = 'done' | 'problem' | 'asking' | 'late' | 'ahead';

export interface StepView {
  step: Test;
  tone: StepTone;
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

export function toneOf(t: Test, today: string): StepTone {
  if (t.outcome === 'passed') return 'done';
  if (t.outcome === 'failed') return 'problem';
  if (needsVerdict(t)) return 'asking';
  if (t.outcome === 'notRun' || isOverdue(t, today)) return 'late';
  return 'ahead';
}

const day = (iso?: string) => (iso ? niceDay(iso, { weekday: 'short' }) : '');

export function installOf(asset: Asset | undefined, all: Test[], items: TestItem[], today: string): MachineInstall {
  const tests = live(all);
  const mine = tests
    .filter(t => t.kind === 'install' && (t.assetId ?? undefined) === (asset?.id ?? undefined))
    .sort((a, b) => a.sort - b.sort);
  const liveItems = live(items);
  const nextId = mine.find(t => !isSettled(t))?.id;
  const steps: StepView[] = mine.map(t => ({
    step: t,
    tone: toneOf(t, today),
    next: t.id === nextId,
    found: liveItems.filter(i => i.testId === t.id && i.kind === 'found').length,
  }));
  const ids = new Set(mine.map(t => t.id));
  const fixesOpen = tests.filter(f => f.kind === 'fix' && !isSettled(f) && ids.has(testOfFix(f, tests)?.id ?? '')).length;
  const done = steps.filter(s => s.tone === 'done').length;
  const late = steps.filter(s => s.tone === 'late').length;
  const ready = !!asset && steps.length > 0 && done === steps.length && !asset.installedOn && !asset.runningOn;

  return { asset, steps, done, total: steps.length, late, fixesOpen, ready, says: saysOf(steps, done, fixesOpen, asset) };
}

function saysOf(steps: StepView[], done: number, fixesOpen: number, asset?: Asset): string {
  if (steps.length === 0) {
    return asset?.installedOn || asset?.runningOn || asset?.state === 'installed' || asset?.state === 'running'
      ? 'Already installed — no steps were kept for it.'
      : 'No install steps yet.';
  }
  const fixes = fixesOpen ? ` ${fixesOpen} fix${fixesOpen === 1 ? '' : 'es'} still open from it.` : '';
  if (done === steps.length) {
    return asset?.installedOn || asset?.runningOn
      ? `Installed — all ${steps.length} steps done.${fixes}`
      : `All ${steps.length} steps done.${fixes}`;
  }
  const head = `${done} of ${steps.length} done.`;
  /* A problem is the story before the plan: it is why the next step waits. */
  const stuck = steps.find(s => s.tone === 'problem');
  if (stuck) {
    const why = stuck.step.result?.trim();
    return `${head} ${stuck.step.title} hit a problem${why ? ` — ${why}` : ''}.${fixes}`;
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
    return `${head} ${t.title} is late${when ? ` — it was due ${day(when)}` : ''}${who ? `, ${who}’s` : ''}.${fixes}`;
  }
  return `${head} Next: ${t.title}${when ? `, ${day(when)}` : ', no day yet'}${who ? `, ${who}` : ''}.${fixes}`;
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
export function usualStages<P extends { id: string; installStages?: string[]; updatedAt: number; deletedAt?: number }>(
  project: P | undefined, all: readonly P[] = [],
): { stages: string[]; from: 'job' | 'other' | 'app'; otherId?: string } {
  if (project?.installStages?.length) return { stages: project.installStages, from: 'job' };
  const other = all
    .filter(p => p.id !== project?.id && !p.deletedAt && p.installStages?.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (other?.installStages) return { stages: other.installStages, from: 'other', otherId: other.id };
  return { stages: [...INSTALL_STAGES], from: 'app' };
}

/** A list as typed → a list worth saving: trimmed, no blanks, no repeats.
 *  Undefined when it is the app's own six again, so "absent" keeps meaning
 *  "the app's". */
export function cleanStages(typed: readonly string[]): string[] | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of typed) {
    const s = raw.trim().replace(/\s+/g, ' ');
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  if (out.length === INSTALL_STAGES.length && out.every((s, i) => s === INSTALL_STAGES[i])) return undefined;
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

const stageKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function installGrid(assets: Asset[], tests: Test[], items: TestItem[], today: string,
  usual: readonly string[]): InstallGrid {
  const machines = live(assets).sort((a, b) => a.sort - b.sort);
  const views = [...machines.map(a => installOf(a, tests, items, today)), installOf(undefined, tests, items, today)]
    /* The line row only when the line has steps of its own; a machine that
       was in and running before anybody kept steps has no installation left
       to capture, and "add the usual stages to every machine" must not give
       it six. */
    .filter(v => v.total > 0 || (!!v.asset && !['installed', 'running'].includes(assetStateOf(v.asset))));

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
