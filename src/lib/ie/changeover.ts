/* SMED — QUICK CHANGEOVER: how long the line stops between two products,
 * Shingo's stages to shorten it, what the changeovers cost the line, and
 * how often each product can run (docs/TOOLKIT.md, tool 6; SMED and EPEI in
 * docs/LEAN40.md's appendix). Stored as tool `changeover`.
 *
 * Rowland, 12 October: "you should be making the lean tool SMED, firstly,
 * and doing everything along them principles"; "you want to be able to
 * extrapolate it ... I've timed the changeover, but you do X many changeovers
 * on one shift, then per shift, and then you're able to extrapolate the full
 * quantity of what the changeovers are actually costing you."
 *
 * SHINGO'S STAGES, each a rung of the ladder:
 *   0 RECORD      every element, last good piece to first good piece at rate
 *                 — the run-up and the adjustments are elements too
 *   1 SEPARATE    internal (the line stopped) from external (could be done
 *                 while it runs): the stop with the external work outside
 *   2 CONVERT     internal made external — prepare in advance, standardise
 *                 the function, an intermediate jig
 *   3 STREAMLINE  what is left inside: in parallel, quick-release clamps, no
 *                 adjustment; each streamlined element with its target
 *   STANDARDISE   the agreed sequence and its checklist, on the product's
 *                 line standard
 * against SMED's own target, single-digit minutes.
 *
 * THE GRID (screens/ChangeoverScreen): elements in sequence across, a lane
 * per person (or per part of the machine); elements in the same column run at
 * the same time. The ELAPSED changeover is the sum over the columns of the
 * longest element in each; the LABOUR is every element's time, by every
 * person on it.
 *
 * FACTS → FIGURES → READING → VERDICT. Pure. Nothing worked out is stored.
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?      nothing said until an element has a time; an untimed one
 *                makes the minutes "at least"; the cost needs how the line
 *                runs and how many changeovers, the interval every product's
 *                run time — each missing piece named, in grey
 *   how known    an element is timed, typed or carried from before; the rate
 *                is from the line balance, the line's settings or typed; the
 *                pounds from the line's own cost settings, or not said
 *   what it      converted and streamlined are PLANS — proved only when the
 *   does not     changeover is timed again; the interval is "at most this
 *   claim        often": the free time has nothing else in it */
import type { ChangeoverProduct, ChangeoverStep, RunningPattern, SmedFunction, SmedHow, StandardChangeover, StudyFacts } from '../study';
import type { Tone } from './sample';
import { dur } from './steps';

/* --------------------------------------------------------------- basics */

const sorted = (seq: ChangeoverStep[] | undefined): ChangeoverStep[] => [...(seq ?? [])].sort((a, b) => a.order - b.order);
const secOf = (st: ChangeoverStep): number => (st.sec !== undefined && Number.isFinite(st.sec) && st.sec > 0 ? st.sec : 0);
const hasTime = (st: ChangeoverStep): boolean => secOf(st) > 0;
const crewOf = (xs: string[] | undefined): string[] => (Array.isArray(xs) ? xs : []).map(x => String(x).trim()).filter(Boolean);

/** SMED's own target: single-digit minutes — 9 min or less. */
export const SMED_TARGET_SEC = 9 * 60;

/** Minutes as the floor says them: whole from ten up, one decimal under it
 *  ("4.5 min"), seconds under a minute ("30.0 s"). */
export function mins(sec: number): string {
  if (sec < 60) return dur(sec);
  const m = sec / 60;
  return m >= 10 ? `${Math.round(m)} min` : `${+m.toFixed(1)} min`;
}

/** A span of the line's time: minutes up to two hours ("90 min a week back",
 *  as the floor says it), else hours to one decimal ("29.4 h"). */
export const span = (sec: number): string => (sec < 7200 ? mins(sec) : `${(sec / 3600).toFixed(1)} h`);

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** "Five products", "12 products". */
export const countWord = (n: number): string => (n >= 0 && n <= 10 && Number.isInteger(n) ? COUNT[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (n: number): string => (Number.isInteger(n) ? String(n) : String(+n.toFixed(1)));
const big = (n: number): string => Math.round(n).toLocaleString('en-GB');

/* ------------------------------------------------- the grid's columns */

/** A rung of the ladder: as timed, with the external work outside, after
 *  conversion, after streamlining (the plan). */
export type Rung = 'now' | 'separated' | 'converted' | 'streamlined';
export const RUNGS: Rung[] = ['now', 'separated', 'converted', 'streamlined'];
export const RUNG_WORD: Record<Rung, string> = { now: 'now', separated: 'separated', converted: 'converted', streamlined: 'streamlined' };

/** An element placed on the grid at a rung: its time there, who does it, its column. */
export interface Placed { st: ChangeoverStep; sec: number; crew: string[]; col: number }
export interface Arrangement {
  placed: Placed[];
  /** Each column's time: the longest element in it. */
  cols: { col: number; sec: number; ids: string[] }[];
  elapsedSec: number;
  labourSec: number;
}

/** WHAT THE STOP IS AT A RUNG. As timed, every element; separated, the
 *  internal ones; converted, less what is converted (or what it leaves
 *  inside); streamlined, with each target, nothing eliminated, and who does
 *  what and alongside what as planned. Elements alongside another share its
 *  column. `untimed`: place elements with no time too (the grid draws them). */
export function arrange(seq: ChangeoverStep[] | undefined, rung: Rung, o: { untimed?: boolean } = {}): Arrangement {
  const list = sorted(seq);
  const inStop: { st: ChangeoverStep; sec: number; crew: string[]; alongside?: string }[] = [];
  for (const st of list) {
    if (!hasTime(st) && !o.untimed) continue;
    if (rung !== 'now' && st.side === 'external') continue;
    const p = st.plan;
    let sec = secOf(st);
    if ((rung === 'converted' || rung === 'streamlined') && p?.kind === 'convert') {
      if (!(p.targetSec && p.targetSec > 0)) continue;
      sec = p.targetSec;
    }
    if (rung === 'streamlined' && p?.kind === 'eliminate') continue;
    if (rung === 'streamlined' && p?.kind === 'streamline' && p.targetSec !== undefined && p.targetSec >= 0) sec = p.targetSec;
    const planned = rung === 'streamlined' && p?.kind === 'streamline';
    inStop.push({ st, sec, crew: planned && crewOf(p?.crew).length ? crewOf(p?.crew) : crewOf(st.crew), alongside: planned && p?.alongside ? p.alongside : st.alongside });
  }
  /* columns: an element on its own opens one; one alongside another joins the
     column of the element it is alongside (followed up the chain) */
  const byId = new Map(inStop.map(x => [x.st.id, x]));
  const rootOf = (id: string): string => {
    let cur = id;
    for (let i = 0; i < inStop.length; i++) {
      const nxt = byId.get(cur)?.alongside;
      if (!nxt || nxt === cur || !byId.has(nxt)) return cur;
      cur = nxt;
    }
    return cur;
  };
  const colOfRoot = new Map<string, number>();
  for (const x of inStop) { const r = rootOf(x.st.id); if (!colOfRoot.has(r)) colOfRoot.set(r, colOfRoot.size); }
  const placed = inStop.map(x => ({ st: x.st, sec: x.sec, crew: x.crew, col: colOfRoot.get(rootOf(x.st.id)) ?? 0 }));
  const cols = [...new Set(placed.map(p => p.col))].sort((a, b) => a - b).map(col => {
    const here = placed.filter(p => p.col === col);
    return { col, sec: Math.max(0, ...here.map(p => p.sec)), ids: here.map(p => p.st.id) };
  });
  return { placed, cols, elapsedSec: cols.reduce((t, c) => t + c.sec, 0), labourSec: placed.reduce((t, p) => t + p.sec * Math.max(1, p.crew.length), 0) };
}

/** The lanes of the grid: who does each element, or where it is done. An
 *  element nobody is named on is in "Not said". */
export type CoLaneBy = 'who' | 'where';
export const lanesOfElement = (p: Pick<Placed, 'crew' | 'st'>, by: CoLaneBy): string[] =>
  (by === 'who' ? (p.crew.length ? p.crew : ['Not said']) : [p.st.where?.trim() || 'Not said']);
/** The lanes in the order the changeover first reaches them. */
export function coLanes(a: Arrangement, by: CoLaneBy): string[] {
  const out: string[] = [];
  for (const p of [...a.placed].sort((x, y) => x.col - y.col || x.st.order - y.st.order)) for (const l of lanesOfElement(p, by)) if (!out.includes(l)) out.push(l);
  return out;
}

/* ------------------------------------------------------------ the ladder */

export interface Ladder {
  now: { elapsedSec: number; labourSec: number };
  separated: { elapsedSec: number; labourSec: number };
  converted: { elapsedSec: number; labourSec: number };
  streamlined: { elapsedSec: number; labourSec: number };
  converts: number;
  /** Streamlined (or moved alongside another) or eliminated, as planned. */
  streamlines: number;
  /** Any plan at all — the last rungs are then plans, not measurements. */
  planned: boolean;
  /** The last rung there is a plan for (separated when there is none). */
  last: Rung;
}

export function ladderOf(seq: ChangeoverStep[] | undefined): Ladder {
  const r = (x: Rung) => { const a = arrange(seq, x); return { elapsedSec: a.elapsedSec, labourSec: a.labourSec }; };
  const list = sorted(seq).filter(st => st.side === 'internal' && hasTime(st));
  const converts = list.filter(st => st.plan?.kind === 'convert').length;
  const streamlines = list.filter(st => st.plan?.kind === 'streamline' || st.plan?.kind === 'eliminate').length;
  return {
    now: r('now'), separated: r('separated'), converted: r('converted'), streamlined: r('streamlined'),
    converts, streamlines, planned: converts + streamlines > 0,
    last: streamlines ? 'streamlined' : converts ? 'converted' : 'separated',
  };
}

/** The ladder in one sentence: "42 min now → 27 min separated → 24 min
 *  converted → 18 min streamlined, planned — proved when it is timed again.
 *  SMED's target is single-digit minutes: 9 min still to find." */
export function ladderSays(l: Ladder): { text: string; tone: Tone } {
  if (l.now.elapsedSec <= 0) return { text: '', tone: 'n' };
  const rungs: Rung[] = ['now', 'separated', ...(l.converts ? ['converted' as Rung] : []), ...(l.streamlines ? ['streamlined' as Rung] : [])];
  const parallel = l.streamlines && l.streamlined.labourSec > l.streamlined.elapsedSec + 1 ? ` (${mins(l.streamlined.labourSec)} of work, some in parallel)` : '';
  const steps = rungs.map(x => `${mins(l[x].elapsedSec)} ${RUNG_WORD[x]}${x === 'streamlined' ? parallel : ''}`).join(' → ');
  const end = l[l.last].elapsedSec;
  const planned = l.planned ? ', planned — proved when it is timed again' : '';
  const target = end <= SMED_TARGET_SEC ? ' Single-digit minutes — SMED\'s target.' : ` SMED's target is single-digit minutes: ${mins(end - SMED_TARGET_SEC)} still to find.`;
  return { text: `${steps}${planned}.${target}`, tone: end <= SMED_TARGET_SEC && l.planned ? 'g' : 'n' };
}

/* ------------------------------------------- Shingo's four functions */

export const FN_WORD: Record<SmedFunction, string> = { prepare: 'Prepare and check', mount: 'Remove and fit', adjust: 'Set and adjust', trial: 'Trial run and run-up' };
export const FNS: SmedFunction[] = ['prepare', 'mount', 'adjust', 'trial'];

/** Where the time goes by Shingo's four functions. */
export function functionShares(seq: ChangeoverStep[] | undefined): { by: Record<SmedFunction, number>; untagged: number; total: number } {
  const by: Record<SmedFunction, number> = { prepare: 0, mount: 0, adjust: 0, trial: 0 };
  let untagged = 0, total = 0;
  for (const st of sorted(seq)) {
    if (!hasTime(st)) continue;
    total += secOf(st);
    if (st.fn && st.fn in by) by[st.fn] += secOf(st); else untagged++;
  }
  return { by, untagged, total };
}

/** "Setting, adjusting and trial runs: 7 min of 42 min — 17%; they are
 *  typically half a changeover, and the first to eliminate." */
export function functionSays(seq: ChangeoverStep[] | undefined): string {
  const f = functionShares(seq);
  if (!f.total) return '';
  const tagged = f.by.prepare + f.by.mount + f.by.adjust + f.by.trial;
  const head = tagged ? `Setting, adjusting and trial runs: ${mins(f.by.adjust + f.by.trial)} of ${mins(f.total)} — ${Math.round(((f.by.adjust + f.by.trial) / f.total) * 100)}%; they are typically half a changeover, and the first to eliminate.` : '';
  const rest = f.untagged ? `${f.untagged} element${f.untagged === 1 ? '' : 's'} not given a function yet.` : '';
  return [head, rest].filter(Boolean).join(' ');
}

/* ---------------------------------------------------- the figures */

export interface ChangeoverFigures {
  steps: number;
  /** Elements with a time, timed or typed (a carried one counts: it is a figure, the old one). */
  known: number;
  untimed: number;
  carried: number;
  /** The weakest source under the minutes: timed, typed, or carried from before. */
  source: 'timed' | 'typed' | 'carried' | 'none';
  /** The changeover as timed: elapsed — the longest element in each column. */
  nowSec: number;
  /** Every element's time, by every person on it. */
  labourSec: number;
  /** The internal and the external work, element by element. */
  internalSec: number;
  externalSec: number;
  /** With the external work done while the line runs: the internal elements, elapsed. */
  afterSec: number;
  perWeek?: number;
  /** external × the changeovers a week. */
  weekSec?: number;
  /** The external elements, longest first — the work to move out. */
  external: ChangeoverStep[];
  /** The internal elements, longest first — the work to shorten next. */
  internal: ChangeoverStep[];
  /** At least one element timed or typed. */
  enough: boolean;
}

export function changeoverFigures(seq: ChangeoverStep[] | undefined, perWeek?: number): ChangeoverFigures {
  const list = sorted(seq);
  const withTime = list.filter(hasTime);
  const internalSec = withTime.filter(s => s.side === 'internal').reduce((t, s) => t + secOf(s), 0);
  const externalSec = withTime.filter(s => s.side === 'external').reduce((t, s) => t + secOf(s), 0);
  const carried = list.filter(s => s.source === 'carried').length;
  const source: ChangeoverFigures['source'] = !withTime.length ? 'none' : withTime.some(s => s.source === 'carried') ? 'carried' : withTime.some(s => s.source === 'typed') ? 'typed' : 'timed';
  const pw = perWeek && perWeek > 0 ? perWeek : undefined;
  const byLongest = (a: ChangeoverStep, b: ChangeoverStep) => secOf(b) - secOf(a) || a.order - b.order;
  const now = arrange(list, 'now'), sep = arrange(list, 'separated');
  return {
    steps: list.length, known: withTime.length, untimed: list.length - withTime.length, carried, source,
    nowSec: now.elapsedSec, labourSec: now.labourSec, internalSec, externalSec, afterSec: sep.elapsedSec,
    ...(pw ? { perWeek: pw, weekSec: externalSec * pw } : {}),
    external: list.filter(s => s.side === 'external' && hasTime(s)).sort(byLongest),
    internal: list.filter(s => s.side === 'internal' && hasTime(s)).sort(byLongest),
    enough: withTime.length > 0,
  };
}

/* ---------------------------------------- how the line runs, extrapolated */

export interface Running {
  shifts: number;
  minutesPerShift: number[];
  minutesPerDay: number;
  daysPerWeek: number;
  minutesPerWeek: number;
  weeksPerYear?: number;
}

/** How the line runs, worked out — or what is still to say about it. Nothing
 *  is assumed: no shifts, no hours, no days, no figure. */
export function runningOf(r: RunningPattern | undefined): { run?: Running; missing: string[] } {
  const shifts = r?.shiftsPerDay && r.shiftsPerDay > 0 ? Math.round(r.shiftsPerDay) : 0;
  const each = Array.isArray(r?.shiftHours) && r.shiftHours.length && r.shiftHours.every(h => h > 0) ? r.shiftHours.map(h => h * 60)
    : r?.hoursPerShift && r.hoursPerShift > 0 && shifts ? Array.from({ length: shifts }, () => (r.hoursPerShift as number) * 60) : [];
  const days = r?.daysPerWeek && r.daysPerWeek > 0 && r.daysPerWeek <= 7 ? r.daysPerWeek : 0;
  const missing = [...(!shifts && !each.length ? ['the shifts a day'] : []), ...(!each.length ? ['the hours a shift'] : []), ...(!days ? ['the days a week'] : [])];
  if (missing.length) return { missing };
  const perDay = each.reduce((t, x) => t + x, 0);
  return { run: { shifts: each.length, minutesPerShift: each, minutesPerDay: perDay, daysPerWeek: days, minutesPerWeek: perDay * days,
    ...(r?.weeksPerYear && r.weeksPerYear > 0 ? { weeksPerYear: r.weeksPerYear } : {}) }, missing: [] };
}

/** The changeovers a shift, a day and a week, from whichever the floor knows. */
export function changeoversPer(c: { count: number; per: 'shift' | 'day' | 'week' } | undefined, run: Running | undefined): { shift: number; day: number; week: number } | undefined {
  if (!c || !(c.count > 0) || !run) return undefined;
  const day = c.per === 'shift' ? c.count * run.shifts : c.per === 'day' ? c.count : c.count / run.daysPerWeek;
  return { shift: day / run.shifts, day, week: day * run.daysPerWeek };
}

/** The changeovers as the study holds them — the running pattern and the
 *  count, or an older record's changeovers a week. */
export function changeoversOf(f: Pick<StudyFacts, 'changeovers' | 'running' | 'perWeek'>): { shift?: number; day?: number; week?: number } {
  const per = changeoversPer(f.changeovers, runningOf(f.running).run);
  if (per) return per;
  if (f.changeovers?.per === 'week' && f.changeovers.count > 0) return { week: f.changeovers.count };
  return f.perWeek && f.perWeek > 0 ? { week: f.perWeek } : {};
}

/** The figures of a study's facts — the changeovers a week from the running pattern. */
export const figuresOf = (f: Pick<StudyFacts, 'sequence' | 'changeovers' | 'running' | 'perWeek'>): ChangeoverFigures => changeoverFigures(f.sequence, changeoversOf(f).week);

/** Minutes the line runs a day, and where that came from — the running
 *  pattern, or an older record's typed minutes. */
export function availableOf(f: Pick<StudyFacts, 'running' | 'availableMinPerDay'>): { min: number; from: 'running' | 'typed' } | undefined {
  const run = runningOf(f.running).run;
  if (run) return { min: run.minutesPerDay, from: 'running' };
  return f.availableMinPerDay && f.availableMinPerDay > 0 ? { min: f.availableMinPerDay, from: 'typed' } : undefined;
}

export interface Cost { sec: number; packs?: number; pounds?: number }
export interface CostScale { shift: Cost; day: Cost; week: Cost; year?: Cost; shareOfRunning: number }

/** WHAT THE CHANGEOVERS COST, from one stop: per shift → per day → per week
 *  (→ per year when the weeks are said) — the time stopped, the packs not
 *  made at the line's rate, and pounds at the line's own cost an hour. */
export function extrapolate(stopSec: number, per: { shift: number; day: number; week: number }, run: Running, ratePerMin?: number, poundsPerHour?: number): CostScale {
  const at = (n: number): Cost => {
    const sec = stopSec * n;
    return { sec, ...(ratePerMin && ratePerMin > 0 ? { packs: (sec / 60) * ratePerMin } : {}), ...(poundsPerHour && poundsPerHour > 0 ? { pounds: (sec / 3600) * poundsPerHour } : {}) };
  };
  return { shift: at(per.shift), day: at(per.day), week: at(per.week), ...(run.weeksPerYear ? { year: at(per.week * run.weeksPerYear) } : {}),
    shareOfRunning: run.minutesPerWeek > 0 ? (stopSec * per.week) / (run.minutesPerWeek * 60) : 0 };
}

/** What a cost buys, in words: "176,400 packs, £5,880" — nothing when neither is known. */
export const costOf = (c: Cost): string => [c.packs !== undefined ? `${big(c.packs)} packs` : '', c.pounds !== undefined ? `£${big(c.pounds)}` : ''].filter(Boolean).join(', ');

/** Where the rate came from, in words, for the page and paper. */
export const RATE_FROM: Record<'standard' | 'line' | 'typed', string> = { standard: 'its line balance', line: 'the line\'s settings', typed: 'typed' };

/** WHAT THEY COST, SAID: "Now 42 min × 3 a shift × 2 shifts × 7 days = 29.4 h
 *  a week stopped (26% of the running time) — 176,400 packs, £5,880.
 *  Streamlined to 9 min: 6.3 h a week — 23.1 h back, if the plan holds."
 *  The furthest rung there is a plan for is the second sentence; the year
 *  follows the week when its weeks are said. What is missing, said instead. */
export function extrapolationSays(l: Ladder, f: Pick<StudyFacts, 'changeovers' | 'running' | 'perWeek'>, ratePerMin?: number, poundsPerHour?: number): { text: string; tone: Tone; scale?: CostScale } {
  if (l.now.elapsedSec <= 0) return { text: '', tone: 'n' };
  const { run, missing } = runningOf(f.running);
  const per = changeoversPer(f.changeovers, run);
  if (!run || !per) {
    const need = [...missing, ...(!(f.changeovers?.count && f.changeovers.count > 0) ? ['how many changeovers a shift, a day or a week'] : [])];
    return { text: `What the changeovers cost needs how the line runs — ${need.join(', ')}.`, tone: 'n' };
  }
  const c = f.changeovers as { count: number; per: 'shift' | 'day' | 'week' };
  const how = c.per === 'shift' ? `${num(c.count)} a shift × ${run.shifts} shift${run.shifts === 1 ? '' : 's'} × ${num(run.daysPerWeek)} days`
    : c.per === 'day' ? `${num(c.count)} a day × ${num(run.daysPerWeek)} days` : `${num(c.count)} a week`;
  const now = extrapolate(l.now.elapsedSec, per, run, ratePerMin, poundsPerHour);
  const share = now.shareOfRunning > 0 ? ` (${Math.round(now.shareOfRunning * 100)}% of the running time)` : '';
  const buys = costOf(now.week);
  const year = now.year && run.weeksPerYear ? ` Over ${num(run.weeksPerYear)} weeks a year: ${span(now.year.sec)}${costOf(now.year) ? ` — ${costOf(now.year)}` : ''}.` : '';
  const head = `Now ${mins(l.now.elapsedSec)} × ${how} = ${span(now.week.sec)} a week stopped${share}${buys ? ` — ${buys}` : ''}.${year}`;
  const best: Rung = l.planned ? l.last : 'separated';
  const bestSec = l[best].elapsedSec;
  if (bestSec >= l.now.elapsedSec) return { text: head, tone: 'n', scale: now };
  const then = extrapolate(bestSec, per, run, ratePerMin, poundsPerHour);
  const back = now.week.sec - then.week.sec;
  return { text: `${head} ${cap(RUNG_WORD[best])} to ${mins(bestSec)}: ${span(then.week.sec)} a week — ${span(back)} back${l.planned ? ', if the plan holds' : ''}.`, tone: 'n', scale: now };
}

/* ------------------------------------------------------------ the interval */

/** A product's run time a day, minutes, and how it is known: from its demand
 *  and the line's rate on it, or typed. Nothing when neither is there. */
export function runMinOf(p: ChangeoverProduct): { min: number; how: 'rate' | 'typed' } | undefined {
  if (p.demandPerDay && p.demandPerDay > 0 && p.ratePerMin && p.ratePerMin > 0) return { min: p.demandPerDay / p.ratePerMin, how: 'rate' };
  if (p.runMinPerDay && p.runMinPerDay > 0) return { min: p.runMinPerDay, how: 'typed' };
  return undefined;
}

export interface IntervalFigures {
  products: number;
  known: number;
  missing: string[];
  availableMinPerDay?: number;
  runMinPerDay?: number;
  /** Minutes a day free for changeovers: available − run. */
  freeMinPerDay?: number;
  /** Every product every this many running days, at the changeover now … */
  daysNow?: number;
  /** … and with the external work done while the line runs. */
  daysAfter?: number;
  /** The changeover a daily interval needs: free ÷ products, minutes. */
  dailyMin?: number;
  ready: boolean;
}

/** EVERY PRODUCT EVERY INTERVAL: the time free for changeovers each day is
 *  what the line runs less what is run; one cycle of every product costs one
 *  changeover each. Toolkit's proof: 450 − 300 = 150 free; 5 × 42 = 210 →
 *  1.4 days; 5 × 27 = 135 → 0.9 days; a daily interval needs 150 ÷ 5 = 30 min. */
export function intervalOf(f: ChangeoverFigures, products: ChangeoverProduct[] | undefined, availableMinPerDay?: number): IntervalFigures {
  const list = (products ?? []).filter(p => p.product.trim());
  const runs = list.map(p => ({ p, r: runMinOf(p) }));
  const known = runs.filter(x => x.r).length;
  const missing = runs.filter(x => !x.r).map(x => x.p.product.trim());
  const available = availableMinPerDay && availableMinPerDay > 0 ? availableMinPerDay : undefined;
  const base: IntervalFigures = { products: list.length, known, missing, ...(available ? { availableMinPerDay: available } : {}), ready: false };
  if (list.length < 2 || missing.length || !available || !f.enough) return base;
  const run = runs.reduce((t, x) => t + (x.r?.min ?? 0), 0);
  const free = available - run;
  if (free <= 0) return { ...base, runMinPerDay: run, freeMinPerDay: free };
  const n = list.length;
  return { ...base, runMinPerDay: run, freeMinPerDay: free, daysNow: (n * f.nowSec / 60) / free, daysAfter: (n * f.afterSec / 60) / free, dailyMin: free / n, ready: true };
}

const days = (d: number): string => `${d.toFixed(1)}`;

/** The interval in one sentence — or what it still needs, in words. */
export function intervalSays(iv: IntervalFigures, f: ChangeoverFigures): { text: string; tone: Tone } {
  if (!f.enough) return { text: 'Time or type the changeover first — the interval is read from its minutes.', tone: 'n' };
  if (iv.products < 2) return { text: 'List the products run on this line, each with what the customer takes a day, to read how often each can run.', tone: 'n' };
  if (iv.missing.length) return { text: `${iv.known} of ${iv.products} products have a run time; the interval needs all — ${iv.missing.join(', ')} still to say.`, tone: 'n' };
  if (!iv.availableMinPerDay) return { text: 'How the line runs — its shifts and their hours — the interval needs it.', tone: 'n' };
  if (!iv.ready || iv.freeMinPerDay === undefined || iv.daysNow === undefined || iv.daysAfter === undefined || iv.dailyMin === undefined) {
    return { text: `No time free for changeovers: ${mins((iv.runMinPerDay ?? 0) * 60)} of run in the ${mins(iv.availableMinPerDay * 60)} the line has a day.`, tone: 'r' };
  }
  const n = cap(countWord(iv.products));
  const daily = iv.daysAfter <= 1 ? ' — daily' : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`;
  if (f.externalSec > 0 && f.afterSec < f.nowSec) return { text: `${n} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days; at ${mins(f.afterSec)}, every ${days(iv.daysAfter)}${daily}.`, tone: 'n' };
  return { text: `${n} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days${iv.daysNow <= 1 ? ' — daily' : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`}.`, tone: 'n' };
}

/* ------------------------------------------------------------ the reading */

export interface ChangeoverSays {
  text: string;
  tone: Tone;
  verdict: string;
  /** What is not known yet, and the standard it stands against — each with its tone. */
  lines: { text: string; tone: Tone }[];
}

/** What the changeover says: the minutes now, what moving the external work
 *  out would make it and buy back; against the agreed standard when there is
 *  one. The abnormal — external work still done with the line stopped, or
 *  minutes over the standard — carries the colour. */
export function changeoverSays(f: ChangeoverFigures, agreed?: Pick<StandardChangeover, 'minutes'>): ChangeoverSays {
  if (!f.steps) return { text: 'Record the changeover element by element — from the last good piece of the old product to the first good piece of the new at full rate — Lap as each ends, or type them.', tone: 'n', verdict: 'Not timed', lines: [] };
  if (!f.enough) return { text: `${f.steps} element${f.steps === 1 ? '' : 's'}, none timed yet — Lap as each ends, or type the minutes.`, tone: 'n', verdict: 'Not timed', lines: [] };
  const lines: ChangeoverSays['lines'] = [];
  if (f.untimed) lines.push({ text: `${f.untimed} element${f.untimed === 1 ? ' has' : 's have'} no time yet — the minutes are at least this.`, tone: 'n' });
  if (f.carried) lines.push({ text: `${f.carried} element${f.carried === 1 ? ' is' : 's are'} carried from the changeover before — not timed again yet.`, tone: 'n' });
  const agreedMin = agreed && agreed.minutes > 0 ? agreed.minutes : undefined;
  const over = agreedMin !== undefined ? f.nowSec / 60 - agreedMin : undefined;
  if (agreedMin !== undefined && over !== undefined) {
    if (over > 0.5) lines.push({ text: `Over the ${mins(agreedMin * 60)} standard by ${mins(over * 60)}.`, tone: 'r' });
    else lines.push({ text: `Within the ${mins(agreedMin * 60)} standard.`, tone: 'g' });
  }
  const atLeast = f.untimed ? 'at least ' : '';
  const week = f.weekSec && f.perWeek ? ` — ${span(f.weekSec)} a week back, ${num(f.perWeek)} changeover${f.perWeek === 1 ? '' : 's'}` : '';
  const text = f.externalSec > 0
    ? `${cap(atLeast)}${mins(f.nowSec)} now. With the ${mins(f.externalSec)} of external work done while the line runs: ${mins(f.afterSec)}${week}.`
    : `${cap(atLeast)}${mins(f.nowSec)} now, all of it with the line stopped — no external work found yet.`;
  const tone: Tone = over !== undefined && over > 0.5 ? 'r' : f.externalSec > 0 ? 'a' : over !== undefined ? 'g' : 'n';
  const verdict = over !== undefined && over > 0.5 ? 'Over the standard' : f.externalSec > 0 ? `${mins(f.externalSec)} external inside` : over !== undefined ? 'Within the standard' : `${mins(f.nowSec)} now`;
  return { text, tone, verdict, lines };
}

/* ------------------------------------------------------- the plan's words */

export const HOW_WORD: Record<SmedHow, string> = {
  prepare: 'prepare in advance', standardise: 'standardise the function', jig: 'an intermediate jig',
  parallel: 'in parallel', clamps: 'quick-release clamps', 'no-adjust': 'no adjustment', organise: '5S, shadow boards, kits',
};
/** The ways each plan is done — converting, and streamlining. */
export const CONVERT_HOW: SmedHow[] = ['prepare', 'standardise', 'jig'];
export const STREAMLINE_HOW: SmedHow[] = ['parallel', 'clamps', 'no-adjust', 'organise'];

/** One element's figure: "external, 11 min". */
export function stepFigure(st: ChangeoverStep): string {
  return `${st.side}, ${hasTime(st) ? mins(secOf(st)) : 'no time yet'}`;
}

/** THE SMED ACTION on an element, in the words a fix or a countermeasure
 *  carries after the element's name: "convert to external (prepare in
 *  advance), 6 min"; "streamline (quick-release clamps), 10 min → 4 min";
 *  "eliminate (no adjustment), 5 min"; an external element with no plan "do
 *  it while the line runs (external), 7 min"; else "internal, 10 min". */
export function actionWords(st: ChangeoverStep): string {
  const t = hasTime(st) ? mins(secOf(st)) : 'no time yet';
  const p = st.plan, how = p?.how ? ` (${HOW_WORD[p.how]})` : '';
  if (p?.kind === 'convert') return `convert to external${how}, ${t}${p.targetSec ? ` — ${mins(p.targetSec)} left inside` : ''}`;
  if (p?.kind === 'streamline') return `streamline${how}, ${t}${p.targetSec !== undefined ? ` → ${mins(p.targetSec)}` : ''}`;
  if (p?.kind === 'eliminate') return `eliminate${how}, ${t}`;
  if (st.side === 'external') return `do it while the line runs (external), ${t}`;
  return stepFigure(st);
}

/** An external element: before the line stops, or after it runs again — as
 *  said, else worked out from where it falls (after the last internal
 *  element: after). */
export function whenIn(seq: ChangeoverStep[] | undefined): (st: ChangeoverStep) => 'before' | 'after' {
  const last = Math.max(-Infinity, ...sorted(seq).filter(x => x.side === 'internal').map(x => x.order));
  return st => st.when ?? (st.order > last ? 'after' : 'before');
}

/** The plan on paper and in the sheet: "Convert to external — prepare in
 *  advance"; "Streamline — quick-release clamps: 10 min → 4 min"; an
 *  external element with none, when it is done. */
export function planWords(st: ChangeoverStep, nameOf?: (id: string) => string | undefined, when?: (st: ChangeoverStep) => 'before' | 'after'): string {
  const p = st.plan;
  if (!p || p.kind === 'keep') {
    if (st.side === 'external') return (when ?? (x => x.when ?? 'before'))(st) === 'after' ? 'Done after the line runs again' : 'Done before the line stops';
    return p?.kind === 'keep' ? 'Kept as it is' : '';
  }
  const how = p.how ? ` — ${HOW_WORD[p.how]}` : '';
  const note = p.note?.trim() ? `: ${p.note.trim()}` : '';
  if (p.kind === 'convert') return `Convert to external${how}${note}${p.targetSec ? ` (${mins(p.targetSec)} left inside)` : ''}`;
  if (p.kind === 'eliminate') return `Eliminate${how}${note}`;
  const along = p.alongside ? `, alongside ${nameOf?.(p.alongside) ?? 'another element'}${crewOf(p.crew).length ? ` (${crewOf(p.crew).join(', ')})` : ''}` : '';
  return `Streamline${how}${note}${along}${p.targetSec !== undefined ? `: ${mins(secOf(st))} → ${mins(p.targetSec)}` : ''}`;
}

/** THE CHECKLIST the standard keeps: what is prepared before the line stops
 *  (the external work before, and what is converted), what is done with it
 *  stopped (with a target where it is streamlined), what after it runs again. */
export function checklistOf(seq: ChangeoverStep[] | undefined): { before: string[]; stopped: string[]; after: string[] } {
  const list = sorted(seq), when = whenIn(list);
  const name = (st: ChangeoverStep) => st.name.trim() || 'An element';
  return {
    before: list.filter(st => (st.side === 'external' && when(st) === 'before') || (st.side === 'internal' && st.plan?.kind === 'convert')).map(name),
    stopped: list.filter(st => st.side === 'internal' && st.plan?.kind !== 'convert' && st.plan?.kind !== 'eliminate')
      .map(st => (st.plan?.kind === 'streamline' && st.plan.targetSec !== undefined ? `${name(st)} — ${mins(st.plan.targetSec)}` : name(st))),
    after: list.filter(st => st.side === 'external' && when(st) === 'after').map(name),
  };
}

/* ----------------------------------------------------- before → after */

/** BEFORE → AFTER, the changeover timed again: its minutes, and the week
 *  they buy back; nothing claimed while an element is still carried; and,
 *  when the changeover before carried a plan, how near the plan it came. It
 *  says "the number moved", never "the fix did it". */
export function compareChangeovers(before: ChangeoverFigures, after: ChangeoverFigures, plan?: Ladder): { text: string; tone: Tone } {
  if (!before.enough || !after.enough) return { text: 'Too early to compare — time the changeover on both sides.', tone: 'n' };
  if (after.carried) return { text: `${mins(before.nowSec)} → ${mins(after.nowSec)} so far — ${after.carried} of ${after.steps} elements carried from before, not timed again yet.`, tone: 'n' };
  const d = after.nowSec - before.nowSec;
  const target = plan?.planned ? plan[plan.last].elapsedSec : undefined;
  const planned = plan && target !== undefined && target < before.nowSec
    ? ` The plan was ${mins(target)} ${RUNG_WORD[plan.last]} — ${after.nowSec <= target + 30 ? 'met' : `${mins(after.nowSec - target)} still to go`}.` : '';
  if (Math.abs(d) < 30) return { text: `${mins(before.nowSec)} → ${mins(after.nowSec)}, no change. The number moved only within the half-minute.${planned}`, tone: 'n' };
  const pw = after.perWeek ?? before.perWeek;
  const week = d < 0 && pw ? `; ${span(-d * pw)} a week back at ${num(pw)} changeover${pw === 1 ? '' : 's'}` : '';
  const still = after.externalSec > 0 ? ` ${mins(after.externalSec)} of external work is still done with the line stopped.` : '';
  return { text: `${mins(before.nowSec)} → ${mins(after.nowSec)} (${d < 0 ? '−' : '+'}${mins(Math.abs(d))})${week}. The number moved; what moved it is the fix's to say.${still}${planned}`, tone: d < 0 ? 'g' : 'r' };
}

/** Prove it: the same elements, each CARRIED — timed or typed again one by
 *  one, and until then said to be the old figure. */
export const carrySequence = (seq: ChangeoverStep[] | undefined): ChangeoverStep[] =>
  sorted(seq).map(({ at: _at, who: _who, plan: _plan, ...st }) => { void _at; void _who; void _plan; return { ...st, source: 'carried' as const }; });

/* ----------------------------------------------------------- standardise */

/** The agreed sequence, as Set as the standard writes it onto the product's
 *  line standard: each element's words, side, time, function, crew and plan;
 *  the agreed minutes — the stop with the external work done before and
 *  after; the plan's minutes when there is one; and the checklist. */
export function standardFrom(seq: ChangeoverStep[] | undefined, x: { id: string; from?: string; at: number; by?: string; studyId: string }): StandardChangeover {
  const list = sorted(seq), when = whenIn(list);
  const l = ladderOf(list);
  return {
    id: x.id, ...(x.from?.trim() ? { from: x.from.trim() } : {}),
    steps: list.map(st => ({ name: st.name, side: st.side, ...(hasTime(st) ? { sec: secOf(st) } : {}), ...(st.fn ? { fn: st.fn } : {}),
      ...(crewOf(st.crew).length ? { crew: crewOf(st.crew) } : {}), ...(st.plan ? { plan: st.plan } : {}), ...(st.side === 'external' ? { when: when(st) } : {}) })),
    minutes: +(l.separated.elapsedSec / 60).toFixed(1),
    ...(l.planned ? { targetMinutes: +(l[l.last].elapsedSec / 60).toFixed(1) } : {}),
    checklist: checklistOf(list), agreedAt: x.at, ...(x.by ? { by: x.by } : {}), fromStudyId: x.studyId,
  };
}

/** The standard's own line, under the product: "27 min stopped · 8
 *  elements, 3 external · plan 18 min · from Finest Red 2kg · agreed 11 Oct". */
export function standardLine(a: StandardChangeover, day: (ms: number) => string): string {
  const ext = a.steps.filter(s => s.side === 'external').length;
  return `${mins(a.minutes * 60)} stopped · ${a.steps.length} element${a.steps.length === 1 ? '' : 's'}${ext ? `, ${ext} external` : ''}${a.targetMinutes !== undefined ? ` · plan ${mins(a.targetMinutes * 60)}` : ''}${a.from ? ` · from ${a.from}` : ''} · agreed ${day(a.agreedAt)}`;
}

/** The agreed changeover a study stands against, from its product's line
 *  standard: the one from the same product when the standard holds it, else
 *  the standard's newest. */
export function agreedFor(list: StandardChangeover[] | undefined, from?: string): StandardChangeover | undefined {
  const all = list ?? [];
  const f = (from ?? '').trim().toLowerCase();
  return (f ? all.find(a => (a.from ?? '').trim().toLowerCase() === f) : undefined) ?? [...all].sort((a, b) => b.agreedAt - a.agreedAt)[0];
}

/* -------------------------------------------------------------- on paper */

export interface ChangeoverRow {
  n: number; name: string; who: string; where: string; side: 'I' | 'E'; plan: string; minutes: string;
  /** The changeover elapsed by the end of this element's column. */
  elapsed: string;
  how: string;
  /** Carried from the changeover before, not timed again yet — its figure is the old one. */
  carried?: boolean;
  /** The fix or countermeasure raised from it — the branch off the element. */
  branch?: string;
}
export interface ChangeoverSheet {
  rows: ChangeoverRow[];
  total: { minutes: string; labour: string; internal: string; external: string };
  /** The reading, the ladder, the functions, the cost and the interval — each a sentence. */
  lines: string[];
}

const HOW: Record<ChangeoverStep['source'], string> = { timed: 'timed', typed: 'typed', carried: 'carried from before' };

/** THE GRID AS A TABLE (lib/report/changeoverTable), as the map's stream
 *  table is: a row per element in order — what, who, where, I/E, the plan,
 *  its time, the elapsed changeover by the end of its column, how known —
 *  the totals, and under them the ladder, the functions, what the
 *  changeovers cost and the interval, in words. `branches` names the record
 *  raised from an element, by its id; `poundsPerHour` the line's cost. */
export function changeoverSheet(facts: Pick<StudyFacts, 'sequence' | 'changeovers' | 'running' | 'perWeek' | 'products' | 'availableMinPerDay' | 'ratePerMin'>,
  agreed?: Pick<StandardChangeover, 'minutes'>, branches: Map<string, string> = new Map(), poundsPerHour?: number): ChangeoverSheet {
  const list = sorted(facts.sequence);
  const f = figuresOf(facts), l = ladderOf(list), when = whenIn(list);
  const now = arrange(list, 'now', { untimed: true });
  const colOf = new Map(now.placed.map(p => [p.st.id, p.col]));
  let acc = 0;
  const elapsedBy = new Map<number, number>();
  for (const c of now.cols) { acc += c.sec; elapsedBy.set(c.col, acc); }
  const name = (id: string) => list.find(x => x.id === id)?.name;
  const rows = list.map((st, i) => ({
    n: i + 1, name: st.name.trim() || 'An element', who: crewOf(st.crew).join(', ') || '—', where: st.where?.trim() || '—',
    side: (st.side === 'external' ? 'E' : 'I') as ChangeoverRow['side'], plan: planWords(st, name, when) || '—',
    minutes: hasTime(st) ? mins(secOf(st)) : 'no time yet', elapsed: mins(elapsedBy.get(colOf.get(st.id) ?? -1) ?? 0), how: HOW[st.source] ?? 'typed',
    ...(st.source === 'carried' ? { carried: true } : {}), ...(branches.get(st.id) ? { branch: branches.get(st.id) } : {}),
  }));
  const said = changeoverSays(f, agreed);
  const iv = intervalOf(f, facts.products, availableOf(facts)?.min);
  const lines = f.enough ? [said.text, ...said.lines.filter(x => x.tone !== 'n').map(x => x.text), ladderSays(l).text, functionSays(list),
    extrapolationSays(l, facts, facts.ratePerMin, poundsPerHour).text, intervalSays(iv, f).text].filter(Boolean) : [];
  return { rows, total: { minutes: mins(f.nowSec), labour: mins(f.labourSec), internal: mins(f.internalSec), external: mins(f.externalSec) }, lines };
}
