/* THE PACE SAYS WHEN — a stage-gate job's own forecast for Hand over, from
 * what it has actually got done (docs/LEAN40.md, the stage gate's evolution,
 * step 1).
 *
 * Rowland, 10 October: "What can be done right now to give it the evolution
 * that I could actually say this is Lean 4.0?" — the first answer is that the
 * job forecasts itself: nobody types the forecast, the record makes it.
 *
 * WHY A BURN-DOWN, NOT EARNED SCHEDULE. The design first said earned schedule
 * (how far the job has got against its plan). Built against the code it would
 * have been wrong: when a stage moves, its planned days are rewritten
 * (ui/WhyMoved recordMove), and the stages after it on the machine are shifted
 * with no record of their first day. Measured against that plan, every slip
 * would read as though it had been planned — the baseline following the
 * forecast around, which types.ts already warns is how a handover slipped
 * three weeks with nothing said. So the pace is counted from what is never
 * rewritten: the days things were actually done (`ranOn` / `ranTo`).
 *
 *   rate      stages and tests done in the last two weeks ÷ the days counted
 *   to go     stages and tests not yet done
 *   lands     today + to go ÷ rate, rounded up to a whole day
 *
 * The same open work the job counts everywhere else: a stage at any gate and a
 * test, open until settled (lib/testing isSettled) — a fix is found work, not
 * planned work, and is left out, as planGaps leaves it out. Calendar days on
 * both sides, so weekends are in the rate and in the projection alike.
 *
 * WHAT IS NOT ON THE LISTS YET. A count can only count what is listed. A
 * machine with nothing on its list, or still to arrive with no day for it, is
 * work the count cannot see — so the pace says it cannot say when, and names
 * the machine. A machine still to arrive with a day holds the forecast back:
 * its own stages cannot start before it is here, so Hand over is no sooner
 * than its arrival and its stages after it, at the pace (found in the browser
 * on 10 October: the seeded job read "lands 16 Oct" with its coder not here
 * and nothing on its list).
 *
 * HONEST ABOUT WHAT IT KNOWS (docs/TOOLKIT.md, the honesty rules):
 *   - under five done, or under a week since the job's first day: too early;
 *   - nothing done in the last two weeks: said, never projected to infinity;
 *   - every stage weighs the same — a count, said as one ("8 done ... 7 to go");
 *   - "at the pace so far", "about": a projection, not a promise.
 *
 * It never moves a date and never changes the verdict (lib/onTarget): it is
 * said beside them. Pure: records in, words out. */
import { assetStateOf, isSettled, live, ranEnd, type Asset, type Test } from './testing';
import { addDays, daysBetween, niceDay } from './weeks';

/** The days the pace is counted over, at most. */
export const PACE_WINDOW = 14;
/** Fewer done than this, and it is too early to say. */
export const PACE_MIN_DONE = 5;
/** Fewer days than this since the job's first day, and it is too early. */
export const PACE_MIN_DAYS = 7;

export type PaceTone = 'risk' | 'on' | 'none';

export interface Pace {
  /** forecast — a day it lands; stalled — nothing done lately; early — too
   *  early to say; unplanned — a machine's work is not on the lists yet. */
  kind: 'forecast' | 'stalled' | 'early' | 'unplanned';
  /** About when Hand over lands, at the pace (forecast only). */
  at?: string;
  /** Days after (+) or before (−) the date it is set against. */
  vs?: number;
  /** The date it is set against: the date now expected, else the date agreed. */
  against?: { iso: string; is: 'expected' | 'agreed' };
  /** The machine still to arrive that holds the forecast back, when one does. */
  after?: { machine: string; due: string };
  done: number;
  doneLately: number;
  windowDays: number;
  left: number;
  /** The answer in a sentence — the same words on every screen and paper. */
  text: string;
  /** Its working, in a short line: "8 done in the last 2 weeks · 7 to go". */
  working: string;
  /** risk (amber): lands after the date, or stalled · on: on or before it · none: too early. */
  tone: PaceTone;
}

export interface PaceInput {
  tests: Test[];
  /** The job's machines — what is not on the lists yet, and what is still to arrive. */
  assets?: Asset[];
  today: string;
  expectedAt?: string;
  plannedAt?: string;
}

/** The planned work the pace counts: a stage at any gate, and a test. */
const isStep = (t: Test): boolean => t.kind === 'install' || (t.kind ?? 'test') === 'test';

const day = (iso: string) => niceDay(iso, { weekday: 'short' });
const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
/** "in the last 2 weeks" · "in the last 9 days" · "today". */
/** "the Domino coder", "the Domino coder and the Labeller", "the Domino coder, the Labeller and 1 more". */
const named = (xs: string[]): string => {
  const the = xs.map(x => `the ${x}`);
  if (the.length <= 2) return the.join(' and ');
  return `${the.slice(0, 2).join(', ')} and ${the.length - 2} more`;
};
const span = (d: number) => (d >= PACE_WINDOW ? 'in the last 2 weeks' : d <= 1 ? 'today' : `in the last ${d} days`);

/** The job's pace, or undefined when there is nothing to forecast: no planned
 *  work at all, or all of it done. */
export function paceOf({ tests, assets = [], today, expectedAt, plannedAt }: PaceInput): Pace | undefined {
  const steps = live(tests).filter(isStep);
  if (!steps.length) return undefined;
  const settled = steps.filter(isSettled);
  const left = steps.length - settled.length;
  const machines = live(assets);

  /* WORK NOT ON THE LISTS YET — the count cannot see it, so it does not guess. */
  const empty = machines.filter(a => !steps.some(t => t.assetId === a.id)).map(a => a.name);
  const undated = machines.filter(a => assetStateOf(a) === 'awaited' && !a.dueOn && steps.some(t => t.assetId === a.id)).map(a => a.name);
  if (empty.length || undated.length) {
    const why = [
      empty.length ? `${named(empty)} ${empty.length === 1 ? 'has nothing on its list' : 'have nothing on their lists'}` : '',
      undated.length ? `${named(undated)} ${undated.length === 1 ? 'has' : 'have'} no arrival date` : '',
    ].filter(Boolean).join('; ');
    return { kind: 'unplanned', tone: 'none', done: settled.length, doneLately: 0, windowDays: 0, left,
      working: `${settled.length} done · ${left} to go on the lists so far`,
      text: `The pace can’t say when yet — ${why}.` };
  }
  if (left === 0) return undefined;

  /* THE JOB'S FIRST DAY — the earliest day anything was planned or done. */
  const firsts = steps.flatMap(t => [t.plannedFor, t.ranOn]).filter((d): d is string => !!d && d <= today).sort();
  const sinceFirst = firsts.length ? daysBetween(firsts[0], today) + 1 : 0;
  const windowDays = Math.max(0, Math.min(PACE_WINDOW, sinceFirst));
  const from = addDays(today, -(windowDays - 1));
  const doneLately = settled.filter(t => { const d = ranEnd(t); return !!d && d >= from && d <= today; }).length;
  const done = settled.length;
  const working = `${n(doneLately, 'stage or test', 'stages and tests')} done ${span(windowDays)} · ${left} to go`;
  const base = { done, doneLately, windowDays, left, working };

  if (done < PACE_MIN_DONE || windowDays < PACE_MIN_DAYS) {
    return { ...base, kind: 'early', tone: 'none', working: `${done} done · ${left} to go`,
      text: done === 0 ? 'Too early to say when — nothing done yet.'
        : `Too early to say when at the pace so far — ${n(done, 'stage or test', 'stages and tests')} done.` };
  }
  if (doneLately === 0) {
    return { ...base, kind: 'stalled', tone: 'risk',
      text: `Nothing done ${span(windowDays)} — ${left} still to go, so the pace cannot say when.` };
  }

  const rate = doneLately / windowDays;
  let at = addDays(today, Math.ceil(left / rate));
  /* A MACHINE STILL TO ARRIVE holds Hand over back: its stages start when it
     is here, at the same pace. One whose day has gone is taken as arriving
     today, the soonest it can — so it never holds the forecast past the pace
     itself; its lateness is the verdict's to say (a machine past its day is
     late in lib/standing). */
  let after: { machine: string; due: string } | undefined;
  for (const a of machines) {
    if (assetStateOf(a) !== 'awaited' || !a.dueOn) continue;
    const own = steps.filter(t => t.assetId === a.id && !isSettled(t)).length;
    const here = a.dueOn > today ? a.dueOn : today;
    const end = addDays(here, Math.ceil(own / rate));
    if (end > at) { at = end; after = { machine: a.name, due: a.dueOn }; }
  }
  const against = expectedAt && expectedAt !== plannedAt ? { iso: expectedAt, is: 'expected' as const }
    : plannedAt ? { iso: plannedAt, is: 'agreed' as const }
    : expectedAt ? { iso: expectedAt, is: 'agreed' as const } : undefined;
  const vs = against ? daysBetween(against.iso, at) : undefined;
  const which = against?.is === 'expected' ? 'the date now expected' : 'the date agreed';
  const tail = against == null || vs == null ? ''
    : vs === 0 ? ` — on ${which} (${day(against.iso)})`
    : ` — ${n(Math.abs(vs), 'day')} ${vs > 0 ? 'after' : 'before'} ${which} (${day(against.iso)})`;
  return {
    ...base, kind: 'forecast', at, ...(against ? { against } : {}), ...(vs != null ? { vs } : {}), ...(after ? { after } : {}),
    tone: vs != null && vs > 0 ? 'risk' : 'on',
    text: `At the pace so far, Hand over lands about ${day(at)}${after
      ? `, after the ${after.machine} arrives (due ${day(after.due)})` : ''}${tail}.`,
  };
}

/** The answer and its working as one line, for a title or a line of paper. */
export const paceSays = (p: Pace): string => `${p.text} ${p.working[0].toUpperCase()}${p.working.slice(1)}.`;
