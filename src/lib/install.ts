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
import { isOverdue, isSettled, live, needsVerdict, plannedEnd, testOfFix, type Asset, type Test, type TestItem } from './testing';
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
