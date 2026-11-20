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
 *                runs (its shifts, their breaks, its days) and how many
 *                changeovers, the interval every product's run time — each
 *                missing piece named, in grey
 *   how known    an element is timed, typed or carried from before; the
 *                speed is the critical machine's PLATE speed (or a timed
 *                person's where people set the pace), else the standard's
 *                target or the line's rated speed said as not a plate speed,
 *                else typed (docs/CAPACITY.md §1); the pounds from the line's
 *                own cost settings, in two parts, or not said (§6)
 *   what it      converted and streamlined are PLANS — proved only when the
 *   does not     changeover is timed again; the interval is "at most this
 *   claim        often": the free time has nothing else in it; the lost
 *                contribution is lost only if the packs cannot be made up */
import type { ChangeoverProduct, ChangeoverStep, CleanPart, Cleandown, RunningPattern, SmedFunction, SmedHow, SmedRateFrom, StandardChangeover, StudyFacts, ToolStudy } from '../../lib/study';
import { lineSpeed, type Capacity, type ChangeoverIn } from '../linebalance/capacity';
import { labourPerHour } from '../../lib/cost';
import type { Tone } from '../capability/sample';
import { dur } from '../valuestream/steps';

/* --------------------------------------------------------------- a new one */

/** A NEW SMED's record — as SMED's New makes one (screens/StudiesScreen NewStudy) and AI Mode's make_record: a changeover from one
 *  product to the next, named for both, on its line and project when known, on the product's line standard when it has one,
 *  with no element yet. */
export function newChangeoverStudy(o: { id: string; from?: string; to?: string; now: number; workspaceId?: string; projectId?: string; standardId?: string; name?: string }): ToolStudy {
  return {
    id: o.id, tool: 'changeover', name: o.name ?? `${o.from ?? 'a product'} → ${o.to ?? 'a product'}`, ...(o.to ? { product: o.to } : {}),
    ...(o.workspaceId ? { workspaceId: o.workspaceId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}), ...(o.standardId ? { standardId: o.standardId } : {}),
    facts: { ...(o.from !== undefined ? { fromProduct: o.from } : {}), ...(o.to !== undefined ? { toProduct: o.to } : {}), sequence: [] }, uses: [], startedAt: o.now, createdAt: o.now, updatedAt: o.now,
  };
}

/* --------------------------------------------------------------- basics */

const sorted = (seq: ChangeoverStep[] | undefined): ChangeoverStep[] => [...(seq ?? [])].sort((a, b) => a.order - b.order);
const secOf = (st: ChangeoverStep): number => (st.sec !== undefined && Number.isFinite(st.sec) && st.sec > 0 ? st.sec : 0);
const hasTime = (st: ChangeoverStep): boolean => secOf(st) > 0;
const crewOf = (xs: string[] | undefined): string[] => (Array.isArray(xs) ? xs : []).map(x => String(x).trim()).filter(Boolean);

/** SMED's own target: single-digit minutes — UNDER TEN (Shingo, A
 *  Revolution in Manufacturing: the SMED System, 1985: "setups that take
 *  fewer than ten minutes"). A changeover is on it while it is below this.
 *  (It was 9 min or less: 9 min 30 s, single-digit minutes, read "30 s still
 *  to find". Audit, 13 October.) */
export const SMED_TARGET_SEC = 10 * 60;
/** On SMED's target: below ten minutes. */
export const onTarget = (sec: number): boolean => sec < SMED_TARGET_SEC;

/** Minutes as the floor says them: whole from ten up, one decimal under it
 *  ("4.5 min"), seconds under a minute ("30.0 s"). */
export function mins(sec: number): string {
  if (sec < 60) return dur(sec);
  const m = sec / 60;
  return m >= 10 ? `${Math.round(m)} min` : `${+m.toFixed(1)} min`;
}

/** A span of the line's time: minutes up to two hours ("90 min a week back",
 *  as the floor says it), else hours to one decimal ("29.4 h"). */
export const span = (sec: number): string => (sec < 7200 ? mins(sec) : `${(sec / 3600).toLocaleString('en-GB', { maximumFractionDigits: 1 })} h`);

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
    /* a plan never makes an element longer than it was timed: a target past
       the time itself (typed the wrong way round) counts as the time, so the
       ladder only ever comes down (docs/UPGRADE-AUDIT.md M14) */
    if ((rung === 'converted' || rung === 'streamlined') && p?.kind === 'convert') {
      if (!(p.targetSec && p.targetSec > 0)) continue;
      sec = Math.min(sec, p.targetSec);
    }
    if (rung === 'streamlined' && p?.kind === 'eliminate') continue;
    if (rung === 'streamlined' && p?.kind === 'streamline' && p.targetSec !== undefined && p.targetSec >= 0) sec = Math.min(sec, p.targetSec);
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
  const target = onTarget(end) ? ' Single-digit minutes — SMED\'s target.' : ` SMED's target is single-digit minutes: ${mins(Math.max(1, end - SMED_TARGET_SEC))} still to find.`;
  return { text: `${steps}${planned}.${target}`, tone: onTarget(end) && l.planned ? 'g' : 'n' };
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
  /** Each shift's RUNNING minutes: the shift less its planned breaks the
   *  line stops for (docs/CAPACITY.md §5, planned production time). */
  minutesPerShift: number[];
  /** Each shift's length, and its planned breaks — for saying how it was worked out. */
  shiftMinutes: number[];
  breakMinutes: number[];
  minutesPerDay: number;
  daysPerWeek: number;
  minutesPerWeek: number;
  weeksPerYear?: number;
}

/** How the line runs, worked out — or what is still to say about it. Nothing
 *  is assumed: no shifts, no hours, no breaks, no days, no figure. A shift
 *  runs for its length less the planned breaks the line stops for; breaks
 *  covered by relief are 0, and 0 is an answer. */
export function runningOf(r: RunningPattern | undefined): { run?: Running; missing: string[] } {
  const shifts = r?.shiftsPerDay && r.shiftsPerDay > 0 ? Math.round(r.shiftsPerDay) : 0;
  const each = Array.isArray(r?.shiftHours) && r.shiftHours.length && r.shiftHours.every(h => h > 0) ? r.shiftHours.map(h => h * 60)
    : r?.hoursPerShift && r.hoursPerShift > 0 && shifts ? Array.from({ length: shifts }, () => (r.hoursPerShift as number) * 60) : [];
  const told = Array.isArray(r?.shiftBreaks) && r.shiftBreaks.length === each.length && r.shiftBreaks.every(b => b >= 0) ? r.shiftBreaks : undefined;
  const breaks = told ?? (r?.breakMin !== undefined && r.breakMin >= 0 ? each.map(() => r.breakMin as number) : undefined);
  const days = r?.daysPerWeek && r.daysPerWeek > 0 && r.daysPerWeek <= 7 ? r.daysPerWeek : 0;
  const missing = [...(!shifts && !each.length ? ['the shifts a day'] : []), ...(!each.length ? ['the hours a shift'] : []),
    ...(each.length && !breaks ? ['the planned breaks a shift the line stops for'] : []), ...(!days ? ['the days a week'] : [])];
  if (missing.length || !breaks) return { missing };
  if (each.some((m, i) => breaks[i] >= m)) return { missing: ['breaks shorter than the shift'] };
  const net = each.map((m, i) => m - breaks[i]);
  const perDay = net.reduce((t, x) => t + x, 0);
  return { run: { shifts: each.length, minutesPerShift: net, shiftMinutes: each, breakMinutes: breaks, minutesPerDay: perDay, daysPerWeek: days, minutesPerWeek: perDay * days,
    ...(r?.weeksPerYear && r.weeksPerYear > 0 ? { weeksPerYear: r.weeksPerYear } : {}) }, missing: [] };
}

const hrs = (min: number): string => (min % 60 === 0 ? `${min / 60} h` : `${+(min / 60).toFixed(2)} h`);

/** How the line runs, in words: "2 shifts of 8 h, less 30 min of breaks the
 *  line stops for — 7.5 h running each; 7 days a week; 48 weeks a year". */
export function runningWords(run: Running): string {
  const same = run.shiftMinutes.every(m => m === run.shiftMinutes[0]) && run.breakMinutes.every(b => b === run.breakMinutes[0]);
  const sh = (m: number, b: number) => (b > 0 ? `${hrs(m)}, less ${b} min of breaks the line stops for — ${hrs(m - b)} running` : `${hrs(m)}, the line running through its breaks`);
  const shifts = same
    ? `${run.shifts} shift${run.shifts === 1 ? '' : 's'} of ${sh(run.shiftMinutes[0], run.breakMinutes[0])}${run.shifts > 1 && run.breakMinutes[0] > 0 ? ' each' : ''}`
    : `${run.shifts} shifts — ${run.shiftMinutes.map((m, i) => sh(m, run.breakMinutes[i])).join('; ')}`;
  return `${shifts}; ${num(run.daysPerWeek)} day${run.daysPerWeek === 1 ? '' : 's'} a week${run.weeksPerYear ? `; ${num(run.weeksPerYear)} weeks a year` : ''}`;
}

/** The line's own shifts as a running pattern (Workspace.shifts — the clock
 *  windows Capture stamps a stop with): how many, each one's hours, and each
 *  one's breaks when the line's settings say them for every shift (relief
 *  is 0 — the line runs on). A break not said is still asked. Nothing when
 *  no shift has both its times. */
export function patternFromShifts(shifts: readonly { start?: string; end?: string; breakMin?: number; relief?: boolean }[] | undefined): Pick<RunningPattern, 'shiftsPerDay' | 'shiftHours' | 'shiftBreaks'> | undefined {
  const at = (t?: string): number | undefined => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim());
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : undefined;
  };
  const kept = (shifts ?? []).map(x => {
    const a = at(x.start), b = at(x.end);
    const h = a === undefined || b === undefined || a === b ? 0 : ((b - a + 1440) % 1440) / 60;
    /* the breaks the line's settings carry (the loss count's): relief covers
       them — the line runs on, nothing comes off; else the minutes typed */
    const brk = x.relief ? 0 : x.breakMin !== undefined && x.breakMin >= 0 ? x.breakMin : undefined;
    return { h, brk };
  }).filter(x => x.h > 0);
  if (!kept.length) return undefined;
  const breaks = kept.map(x => x.brk);
  return { shiftsPerDay: kept.length, shiftHours: kept.map(x => x.h), ...(breaks.every(b => b !== undefined) ? { shiftBreaks: breaks as number[] } : {}) };
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
 *  pattern (its shifts less their breaks), or an older record's typed minutes. */
export function availableOf(f: Pick<StudyFacts, 'running' | 'availableMinPerDay'>): { min: number; from: 'running' | 'typed' } | undefined {
  const run = runningOf(f.running).run;
  if (run) return { min: run.minutesPerDay, from: 'running' };
  return f.availableMinPerDay && f.availableMinPerDay > 0 ? { min: f.availableMinPerDay, from: 'typed' } : undefined;
}

/* --------------------------------------------- the line's speed, the pounds */

/** THE LINE'S SPEED, offered — what a stop's packs are counted at
 *  (docs/CAPACITY.md §1, Rowland: "we go by plate speed ... unless human"):
 *  the critical station's plate speed off the product's line balance, or a
 *  person's, timed or by standard time, where people set the pace (lib/capacity lineSpeed); else
 *  the standard's target, or the line's rated speed in its settings — each
 *  said as not a plate speed. Nothing: it is typed. */
export function lineRateOf(cap: Capacity | undefined, line?: { packsPerMin?: number }): { ratePerMin: number; from: Exclude<SmedRateFrom, 'typed'>; station?: string } | undefined {
  const sp = lineSpeed(cap);
  if (sp) return { ratePerMin: +sp.perMin.toFixed(2), from: sp.from, station: sp.station };
  if (cap?.targetPerMin && cap.targetPerMin > 0) return { ratePerMin: cap.targetPerMin, from: 'standard' };
  if (line?.packsPerMin && line.packsPerMin > 0) return { ratePerMin: line.packsPerMin, from: 'line' };
  return undefined;
}

/** Where the speed came from, in words — "the Bagger's plate speed", "the
 *  standard's target — not a plate speed", "typed". */
export function rateFromWords(from: SmedRateFrom | undefined, station?: string): string {
  const who = station?.trim();
  switch (from) {
    case 'plate': return who ? `the ${who}'s plate speed` : 'the plate speed';
    case 'person': return who ? `${who}'s timed pace — people set it` : 'a timed pace — people set it';
    case 'standard': return 'the standard\'s target — not a plate speed';
    case 'line': return 'the line\'s rated speed in its settings — not a plate speed';
    default: return 'typed';
  }
}

/** THE POUNDS, IN TWO PARTS (docs/CAPACITY.md §6): the idle labour of the
 *  crew paid while the line is stopped, and the contribution the packs not
 *  made would have earned — a real loss only when the time cannot be made
 *  up (a sold-out line, a fixed shift end), so always said that way and
 *  never added into one figure. From the line's own cost settings (lib/cost);
 *  without them, no pounds at all. */
export interface SmedMoney { labourPerHour?: number; marginPerPack?: number }
export function moneyOf(w: { crew?: number; labourRatePerHour?: number; labourBurden?: number; marginPerPack?: number } | undefined): SmedMoney | undefined {
  if (!w) return undefined;
  const lab = labourPerHour(w), margin = w.marginPerPack && w.marginPerPack > 0 ? w.marginPerPack : undefined;
  return lab > 0 || margin ? { ...(lab > 0 ? { labourPerHour: lab } : {}), ...(margin ? { marginPerPack: margin } : {}) } : undefined;
}

export interface Cost { sec: number; packs?: number; labour?: number; contribution?: number }
export interface CostScale { shift: Cost; day: Cost; week: Cost; year?: Cost; shareOfRunning: number }

/** WHAT THE CHANGEOVERS COST, from one stop: per shift → per day → per week
 *  (→ per year when the weeks are said) — the time stopped, the packs not
 *  made at the line's speed, the idle labour, and the contribution lost if
 *  the packs cannot be made up. The share is of the running time (the
 *  shifts less their breaks). */
export function extrapolate(stopSec: number, per: { shift: number; day: number; week: number }, run: Running, ratePerMin?: number, money?: SmedMoney): CostScale {
  const at = (n: number): Cost => {
    const sec = stopSec * n;
    const packs = ratePerMin && ratePerMin > 0 ? (sec / 60) * ratePerMin : undefined;
    return { sec, ...(packs !== undefined ? { packs } : {}),
      ...(money?.labourPerHour && money.labourPerHour > 0 ? { labour: (sec / 3600) * money.labourPerHour } : {}),
      ...(packs !== undefined && money?.marginPerPack && money.marginPerPack > 0 ? { contribution: packs * money.marginPerPack } : {}) };
  };
  return { shift: at(per.shift), day: at(per.day), week: at(per.week), ...(run.weeksPerYear ? { year: at(per.week * run.weeksPerYear) } : {}),
    shareOfRunning: run.minutesPerWeek > 0 ? (stopSec * per.week) / (run.minutesPerWeek * 60) : 0 };
}

/** The pounds in words, two parts, never one figure: "£5,880 of idle labour,
 *  and £8,820 of contribution if the packs cannot be made up". */
export const poundsOf = (c: Cost): string => [c.labour !== undefined ? `£${big(c.labour)} of idle labour` : '',
  c.contribution !== undefined ? `£${big(c.contribution)} of contribution if the packs cannot be made up` : ''].filter(Boolean).join(', and ');

/** What a cost buys, short, for a bar: "176,400 packs · £5,880 labour · £8,820 contribution". */
export const costOf = (c: Cost): string => [c.packs !== undefined ? `${big(c.packs)} packs` : '', c.labour !== undefined ? `£${big(c.labour)} labour` : '',
  c.contribution !== undefined ? `£${big(c.contribution)} contribution` : ''].filter(Boolean).join(' · ');

/** WHAT THEY COST, SAID: "Now 42 min × 3 a shift × 2 shifts × 7 days = 29.4 h
 *  a week stopped (28% of the running time) — 176,400 packs at 100 a minute,
 *  the Bagger's plate speed; £5,880 of idle labour, and £8,820 of
 *  contribution if the packs cannot be made up. Streamlined to 9 min: 6.3 h a
 *  week — 23.1 h back, if the plan holds." The furthest rung there is a plan
 *  for is the second sentence; the year follows the week when its weeks are
 *  said. What is missing, said instead. */
export function extrapolationSays(l: Ladder, f: Pick<StudyFacts, 'changeovers' | 'running' | 'perWeek' | 'ratePerMin' | 'rateFrom' | 'rateStation'>, money?: SmedMoney): { text: string; tone: Tone; scale?: CostScale } {
  if (l.now.elapsedSec <= 0) return { text: '', tone: 'n' };
  const { run, missing } = runningOf(f.running);
  const per = changeoversPer(f.changeovers, run);
  if (!run || !per) {
    const need = [...missing, ...(!(f.changeovers?.count && f.changeovers.count > 0) ? ['how many changeovers a shift, a day or a week'] : [])];
    return { text: `What the changeovers cost needs how the line runs — ${need.join(', ')}.`, tone: 'n' };
  }
  const rate = f.ratePerMin && f.ratePerMin > 0 ? f.ratePerMin : undefined;
  const c = f.changeovers as { count: number; per: 'shift' | 'day' | 'week' };
  const how = c.per === 'shift' ? `${num(c.count)} a shift × ${run.shifts} shift${run.shifts === 1 ? '' : 's'} × ${num(run.daysPerWeek)} days`
    : c.per === 'day' ? `${num(c.count)} a day × ${num(run.daysPerWeek)} days` : `${num(c.count)} a week`;
  const now = extrapolate(l.now.elapsedSec, per, run, rate, money);
  const share = now.shareOfRunning > 0 ? ` (${Math.round(now.shareOfRunning * 100)}% of the running time)` : '';
  const packsAt = (x: Cost, first: boolean) => (x.packs !== undefined ? `${big(x.packs)} packs${first && rate ? ` at ${num(rate)} a minute, ${rateFromWords(f.rateFrom, f.rateStation)}` : ''}` : '');
  const buys = (x: Cost, first: boolean) => [packsAt(x, first), poundsOf(x)].filter(Boolean).join('; ');
  const year = now.year && run.weeksPerYear ? ` Over ${num(run.weeksPerYear)} weeks a year: ${span(now.year.sec)}${buys(now.year, false) ? ` — ${buys(now.year, false)}` : ''}.` : '';
  const head = `Now ${mins(l.now.elapsedSec)} × ${how} = ${span(now.week.sec)} a week stopped${share}${buys(now.week, true) ? ` — ${buys(now.week, true)}` : ''}.${year}`;
  const best: Rung = l.planned ? l.last : 'separated';
  const bestSec = l[best].elapsedSec;
  if (bestSec >= l.now.elapsedSec) return { text: head, tone: 'n', scale: now };
  const then = extrapolate(bestSec, per, run, rate, money);
  const back = now.week.sec - then.week.sec;
  return { text: `${head} ${cap(RUNG_WORD[best])} to ${mins(bestSec)}: ${span(then.week.sec)} a week — ${span(back)} back${l.planned ? ', if the plan holds' : ''}.`, tone: 'n', scale: now };
}

/** THE SCALE, ROW BY ROW — a shift, a day, a week (and a year when its weeks
 *  are said): the time stopped, the packs, the idle labour and the
 *  contribution if the packs cannot be made up, each as the floor says it.
 *  The page draws it as a small table under the sentence; the paper says
 *  the shift and the day in `scaleSays` (the week and the year are in the
 *  sentence). */
export interface ScaleRow { per: 'A shift' | 'A day' | 'A week' | 'A year'; stopped: string; packs?: string; labour?: string; contribution?: string }
export function scaleRows(scale: CostScale): ScaleRow[] {
  const row = (per: ScaleRow['per'], c: Cost): ScaleRow => ({ per, stopped: span(c.sec), ...(c.packs !== undefined ? { packs: big(c.packs) } : {}),
    ...(c.labour !== undefined ? { labour: `£${big(c.labour)}` } : {}), ...(c.contribution !== undefined ? { contribution: `£${big(c.contribution)}` } : {}) });
  return [row('A shift', scale.shift), row('A day', scale.day), row('A week', scale.week), ...(scale.year ? [row('A year', scale.year)] : [])];
}

/** The shift and the day, in words, for the paper: "A shift: 2.1 h stopped
 *  — 12,600 packs, £420 of idle labour, £630 of contribution; a day: 4.2 h
 *  — 25,200 packs, £840 of idle labour, £1,260 of contribution." */
export function scaleSays(scale: CostScale | undefined): string {
  if (!scale) return '';
  const one = (r: ScaleRow, first: boolean) => `${first ? r.per : r.per.toLowerCase()}: ${r.stopped}${first ? ' stopped' : ''}${[r.packs ? `${r.packs} packs` : '', r.labour ? `${r.labour} of idle labour` : '', r.contribution ? `${r.contribution} of contribution` : ''].filter(Boolean).map((x, i) => (i ? `, ${x}` : ` — ${x}`)).join('')}`;
  const [shift, day] = scaleRows(scale);
  return `${one(shift, true)}; ${one(day, false)}.`;
}

/* ------------------------------------------------------------ the interval */
/* EVERY PRODUCT EVERY INTERVAL (FC-069, knowledge/specs/FC-069-epei.md; lean.heijunka-epei): the time the demand
 * leaves free each running day, divided into the changeovers one full cycle of every product needs — at this SMED's
 * minutes for a product with none of its own, said so; now, separated and as planned; the stock the interval needs
 * (the common cycle's: a run makes a day's demand × the interval, the stock peaks at that less what is used while it
 * runs and averages half the peak — Silver, Pyke & Peterson 1998; Hopp & Spearman 2008) and, from the costs typed,
 * what it ties up and what carrying it costs. "At most this often": the free time has nothing else in it. */

/** A product's demand a day the line runs: typed a day, or a week divided by the line's OWN days a week (asked in
 *  How the line runs — never a guessed five or seven). Nothing when it cannot be said. */
export function demandOf(p: ChangeoverProduct, daysPerWeek?: number): number | undefined {
  if (!(p.demandPerDay && p.demandPerDay > 0)) return undefined;
  if (p.demandPer === 'week') return daysPerWeek && daysPerWeek > 0 ? p.demandPerDay / daysPerWeek : undefined;
  return p.demandPerDay;
}

/** A product's run time a day, minutes, and how it is known: from its demand
 *  and the line's rate on it, or typed. Nothing when neither is there. */
export function runMinOf(p: ChangeoverProduct, daysPerWeek?: number): { min: number; how: 'rate' | 'typed' } | undefined {
  const d = demandOf(p, daysPerWeek);
  if (d && p.ratePerMin && p.ratePerMin > 0) return { min: d / p.ratePerMin, how: 'rate' };
  if (p.runMinPerDay && p.runMinPerDay > 0) return { min: p.runMinPerDay, how: 'typed' };
  return undefined;
}

/** One product in the interval: its run a day, its demand a day (when it can be said), the changeover into it as
 *  timed — its own, or this SMED's — and its cost a pack. */
export interface IntervalRow { id: string; product: string; runMin?: number; how?: 'rate' | 'typed'; perDay?: number; coMin: number; coFrom: 'own' | 'this'; pieceCost?: number }

export interface IntervalFigures {
  products: number;
  known: number;
  missing: string[];
  /** Of the missing: those whose demand is said a week while the line's days a week are not. */
  weekly: string[];
  availableMinPerDay?: number;
  runMinPerDay?: number;
  /** Minutes a day free for changeovers: available − run. */
  freeMinPerDay?: number;
  /** Every product every this many running days, at the changeover now … */
  daysNow?: number;
  /** … and with the external work done while the line runs … */
  daysAfter?: number;
  /** … and at this SMED's furthest planned rung, when there is a plan shorter than separated. */
  daysPlan?: number;
  /** This SMED's planned minutes (seconds), when daysPlan is said. */
  planSec?: number;
  /** One cycle's changeovers, minutes — now, separated, planned. */
  cycleNowMin?: number;
  cycleAfterMin?: number;
  cyclePlanMin?: number;
  /** Products with a changeover of their own; products taken at this SMED's minutes. */
  own: number;
  taken: number;
  /** The changeover a daily interval needs when every product is on this SMED's minutes: free ÷ products, minutes. */
  dailyMin?: number;
  rows: IntervalRow[];
  ready: boolean;
}

/** EVERY PRODUCT EVERY INTERVAL: the time free for changeovers each day is
 *  what the line runs less what is run; one cycle of every product costs one
 *  changeover each — its own, else this SMED's. Toolkit's proof: 450 − 300 = 150 free; 5 × 42 = 210 →
 *  1.4 days; 5 × 27 = 135 → 0.9 days; a daily interval needs 150 ÷ 5 = 30 min. The record's week
 *  (cases-smed-epei-cleandown.py E1): 35 + 35 + 50 + 50 = 170 ÷ 90 = 1.9 days. */
export function intervalOf(f: ChangeoverFigures, products: ChangeoverProduct[] | undefined, availableMinPerDay?: number, o: { daysPerWeek?: number; planSec?: number } = {}): IntervalFigures {
  const list = (products ?? []).filter(p => p.product.trim());
  const runs = list.map(p => ({ p, r: runMinOf(p, o.daysPerWeek) }));
  const known = runs.filter(x => x.r).length;
  const missing = runs.filter(x => !x.r).map(x => x.p.product.trim());
  const weekly = runs.filter(x => !x.r && x.p.demandPer === 'week' && x.p.demandPerDay && x.p.ratePerMin && !(o.daysPerWeek && o.daysPerWeek > 0)).map(x => x.p.product.trim());
  const ownOf = (p: ChangeoverProduct) => (p.changeoverMin !== undefined && Number.isFinite(p.changeoverMin) && p.changeoverMin > 0 ? p.changeoverMin : undefined);
  const rows: IntervalRow[] = runs.map(({ p, r }) => {
    const d = demandOf(p, o.daysPerWeek), own = ownOf(p);
    return { id: p.id, product: p.product.trim(), ...(r ? { runMin: r.min, how: r.how } : {}), ...(d ? { perDay: d } : {}), coMin: own ?? f.nowSec / 60, coFrom: own ? 'own' : 'this',
      ...(p.pieceCost && p.pieceCost > 0 ? { pieceCost: p.pieceCost } : {}) };
  });
  const own = rows.filter(x => x.coFrom === 'own').length;
  const available = availableMinPerDay && availableMinPerDay > 0 ? availableMinPerDay : undefined;
  const base: IntervalFigures = { products: list.length, known, missing, weekly, ...(available ? { availableMinPerDay: available } : {}), own, taken: list.length - own, rows, ready: false };
  if (list.length < 2 || missing.length || !available || !f.enough) return base;
  const run = runs.reduce((t, x) => t + (x.r?.min ?? 0), 0);
  const free = available - run;
  if (free <= 0) return { ...base, runMinPerDay: run, freeMinPerDay: free };
  const n = list.length;
  const cycle = (sec: number) => list.reduce((t, p) => t + (ownOf(p) ?? sec / 60), 0);
  const cycleNow = cycle(f.nowSec), cycleAfter = cycle(f.afterSec);
  const plan = o.planSec !== undefined && o.planSec >= 0 && o.planSec < f.afterSec && base.taken > 0 ? o.planSec : undefined;
  const cyclePlan = plan !== undefined ? cycle(plan) : undefined;
  return { ...base, runMinPerDay: run, freeMinPerDay: free, daysNow: cycleNow / free, daysAfter: cycleAfter / free, cycleNowMin: cycleNow, cycleAfterMin: cycleAfter,
    ...(plan !== undefined && cyclePlan !== undefined ? { planSec: plan, cyclePlanMin: cyclePlan, daysPlan: cyclePlan / free } : {}), dailyMin: free / n, ready: true };
}

/** THE INTERVAL OF A STUDY, as its page, its paper and its line's card all read it: the products, the line's
 *  minutes and days a week from how it runs, this SMED's minutes now, separated and at its furthest planned rung. */
export function intervalFor(f: ChangeoverFigures, facts: Pick<StudyFacts, 'sequence' | 'products' | 'running' | 'availableMinPerDay'>): IntervalFigures {
  const l = ladderOf(facts.sequence);
  return intervalOf(f, facts.products, availableOf(facts)?.min, { daysPerWeek: runningOf(facts.running).run?.daysPerWeek, ...(l.planned ? { planSec: l[l.last].elapsedSec } : {}) });
}

const days = (d: number): string => `${d.toFixed(1)}`;

/** The interval in one sentence — or what it still needs, in words. */
export function intervalSays(iv: IntervalFigures, f: ChangeoverFigures): { text: string; tone: Tone } {
  if (!f.enough) return { text: 'Time or type the changeover first — the interval is read from its minutes.', tone: 'n' };
  if (iv.products < 2) return { text: 'List the products run on this line, each with what the customer takes a day, to read how often each can run.', tone: 'n' };
  if (iv.missing.length) {
    const wk = (iv.weekly ?? []).length ? ` A week's demand (${iv.weekly.join(', ')}) is divided by the days the line runs — say how the line runs.` : '';
    return { text: `${iv.known} of ${iv.products} products have a run time; the interval needs all — ${iv.missing.join(', ')} still to say.${wk}`, tone: 'n' };
  }
  if (!iv.availableMinPerDay) return { text: 'How the line runs — its shifts and their hours — the interval needs it.', tone: 'n' };
  if (!iv.ready || iv.freeMinPerDay === undefined || iv.daysNow === undefined || iv.daysAfter === undefined || iv.dailyMin === undefined) {
    return { text: `No time free for changeovers: ${mins((iv.runMinPerDay ?? 0) * 60)} of run in the ${mins(iv.availableMinPerDay * 60)} the line has a day.`, tone: 'r' };
  }
  const n = cap(countWord(iv.products));
  const planned = iv.daysPlan !== undefined && iv.planSec !== undefined;
  if (!iv.own) {
    const plan = planned ? `; at ${mins(iv.planSec as number)} as planned, every ${days(iv.daysPlan as number)}` : '';
    const daily = iv.daysAfter <= 1 ? ' — daily' : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`;
    if (f.externalSec > 0 && f.afterSec < f.nowSec) return { text: `${n} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days; at ${mins(f.afterSec)}, every ${days(iv.daysAfter)}${daily}${plan}.`, tone: 'n' };
    return { text: `${n} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days${iv.daysNow <= 1 ? ' — daily' : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`}${plan}.`, tone: 'n' };
  }
  /* some products carry a changeover of their own: one cycle's changeovers, said */
  const cyc = (m?: number) => mins((m ?? 0) * 60);
  const taken = iv.taken ? `, ${iv.taken} at this changeover's ${mins(f.nowSec)}` : '';
  const after = iv.taken && iv.daysAfter < iv.daysNow ? `; separated, ${cyc(iv.cycleAfterMin)} a cycle, every ${days(iv.daysAfter)}` : '';
  const plan = planned ? `; as planned, ${cyc(iv.cyclePlanMin)} a cycle, every ${days(iv.daysPlan as number)}` : '';
  const best = Math.min(iv.daysNow, after ? iv.daysAfter : Infinity, planned ? iv.daysPlan as number : Infinity);
  const daily = best <= 1 ? ' — daily' : ` — a daily interval needs one cycle's changeovers in ${mins(iv.freeMinPerDay * 60)} or less`;
  return { text: `${n} products — ${cyc(iv.cycleNowMin)} of changeovers a cycle${taken} — run every ${days(iv.daysNow)} days${after}${plan}${daily}.`, tone: 'n' };
}

/** The stock one interval needs, product by product (the common cycle): a run makes the demand a day × the interval;
 *  the stock peaks at that less what is used while it runs (× (1 − its run ÷ the line's day)) and averages half the
 *  peak; tied up at its cost a pack. Totals only when every product has what they need — never a partial sum. */
export interface StockRow { product: string; lot: number; peak: number; avg: number; tied?: number }
export interface IntervalStock { days: number; rows: StockRow[]; avg?: number; tied?: number; carry?: number; noDemand: string[]; noCost: string[] }
export function intervalStock(iv: IntervalFigures, atDays: number, carryPct?: number): IntervalStock | undefined {
  if (!iv.ready || !iv.availableMinPerDay || !(atDays > 0)) return undefined;
  const avail = iv.availableMinPerDay;
  const noDemand = iv.rows.filter(r => !r.perDay).map(r => r.product);
  const rows: StockRow[] = iv.rows.filter(r => r.perDay && r.runMin !== undefined).map(r => {
    const lot = (r.perDay as number) * atDays, peak = lot * (1 - (r.runMin as number) / avail), avg = peak / 2;
    return { product: r.product, lot, peak, avg, ...(r.pieceCost ? { tied: avg * r.pieceCost } : {}) };
  });
  const noCost = iv.rows.filter(r => r.perDay && !r.pieceCost).map(r => r.product);
  const whole = !noDemand.length;
  const avg = whole ? rows.reduce((t, r) => t + r.avg, 0) : undefined;
  const tied = whole && !noCost.length ? rows.reduce((t, r) => t + (r.tied ?? 0), 0) : undefined;
  const carry = tied !== undefined && carryPct && carryPct > 0 ? tied * (carryPct / 100) : undefined;
  return { days: atDays, rows, ...(avg !== undefined ? { avg } : {}), ...(tied !== undefined ? { tied } : {}), ...(carry !== undefined ? { carry } : {}), noDemand, noCost };
}

const andList = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** THE STOCK AND THE MONEY OF THE INTERVAL (knowledge/MONEY.md FC-069 — C against H), in words: the stock at the
 *  interval now and at the best other one said, tied up and carried; the changeovers' minutes a day at the interval
 *  (the free time, at any interval it allows) and the crew's time in money. Each missing input named. Nothing until the
 *  interval itself can be said. */
export function intervalStockSays(iv: IntervalFigures, money?: SmedMoney, carryPct?: number): { text: string; tone: Tone } {
  if (!iv.ready || iv.daysNow === undefined || iv.freeMinPerDay === undefined) return { text: '', tone: 'n' };
  const now = intervalStock(iv, iv.daysNow, carryPct);
  if (!now) return { text: '', tone: 'n' };
  const other = iv.daysPlan !== undefined ? { word: 'as planned', d: iv.daysPlan } : iv.daysAfter !== undefined && iv.daysAfter < iv.daysNow ? { word: 'separated', d: iv.daysAfter } : undefined;
  const pct = carryPct && carryPct > 0 ? carryPct : undefined;
  let stock: string;
  if (now.noDemand.length) {
    stock = `The stock the interval needs is read from each product's demand — ${andList(now.noDemand)} ${now.noDemand.length === 1 ? 'has' : 'have'} only minutes typed.`;
  } else {
    const then = other ? intervalStock(iv, other.d, carryPct) : undefined;
    const money0 = now.tied !== undefined ? ` — £${big(now.tied)} tied up${now.carry !== undefined ? `, £${big(now.carry)} a year to carry at ${num(pct as number)}%` : ''}` : '';
    const later = then && then.avg !== undefined ? `; ${other?.word}, every ${days(then.days)} days, ${big(then.avg)} packs${then.tied !== undefined && now.tied !== undefined ? ` — £${big(then.tied)}, £${big(now.tied - then.tied)} less` : ''}, if the products run that often` : '';
    const ask = now.noCost.length ? ` Give ${andList(now.noCost)} a cost a pack to say the stock in money.` : now.carry === undefined ? ' Give a carrying rate a year to say what holding it costs.' : '';
    stock = `At every ${days(iv.daysNow)} days a run of each product makes its demand until the next: ${big(now.avg as number)} packs on average${money0}${later}.${ask}`;
  }
  const lab = money?.labourPerHour && money.labourPerHour > 0 ? money.labourPerHour : undefined;
  const which = other ? 'at any of these intervals' : 'at this interval';
  const crew = `The changeovers take the ${mins(iv.freeMinPerDay * 60)} a day the demand leaves free ${which}${lab ? ` — £${big((iv.freeMinPerDay / 60) * lab)} of the crew's time a day` : ''}; a shorter changeover is banked as less stock when the products run more often, or as time when they do not.${lab ? '' : ' Give the line its crew and wage to say the crew\'s time in money.'}`;
  return { text: `${stock} ${crew}`, tone: 'n' };
}

/** The products' table, for the page and the paper: each product's run a day, the changeover into it and where it is
 *  from, what a run makes, the stock on average and what it ties up — at the interval now. */
export interface IntervalTableRow { product: string; run: string; into: string; lot: string; avg: string; tied: string }
export function intervalRows(iv: IntervalFigures, carryPct?: number): IntervalTableRow[] {
  if (!iv.ready || iv.daysNow === undefined) return [];
  const st = intervalStock(iv, iv.daysNow, carryPct);
  return iv.rows.map(r => {
    const s = st?.rows.find(x => x.product === r.product);
    return { product: r.product, run: r.runMin !== undefined ? `${mins(r.runMin * 60)} a day` : '—', into: `${mins(r.coMin * 60)}${r.coFrom === 'this' ? ' — this changeover' : ''}`,
      lot: s ? big(s.lot) : '—', avg: s ? big(s.avg) : '—', tied: s?.tied !== undefined ? `£${big(s.tied)}` : '—' };
  });
}

/* ------------------------------------------------- the cleandown (FC-072) */
/* A CLEANDOWN BY SMED (knowledge/specs/FC-072-cleandown.md; changeover.smed, foodsafety.allergen-changeover): the
 * changeover is a dry or a wet clean, an allergen clean or not; an element is part of the cleaning, the verification
 * (the swabs or test and the wait for the result) or the release (signed — the line may run). The clock runs from the
 * last good pack to the first good pack as SMED's always does; what this adds is the TIME TO RELEASE, WHERE THE
 * VERIFICATION'S WAIT SITS, the split, and a PLAN THAT WOULD CHANGE THE CLEAN said beside it — "the clean's time saved
 * by SMED must not be saved from the clean's validated method; only from what is around it". Nothing refused. */

export const CLEAN_PARTS: CleanPart[] = ['clean', 'verify', 'release'];
export const PART_WORD: Record<CleanPart, string> = { clean: 'Cleaning', verify: 'Verification', release: 'Release' };
export const PART_LETTER: Record<CleanPart, string> = { clean: 'C', verify: 'V', release: 'R' };
/** What a part is, in words — for a screen reader and the element's sheet. */
export const PART_SAYS: Record<CleanPart, string> = { clean: 'part of the cleaning', verify: 'the verification — the swabs or test and the wait for the result', release: 'the release — signed, the line may run' };

/** "A wet clean, allergen (nut)"; "A dry clean". */
export function cleandownWords(cd: Cleandown): string {
  const name = cd.allergenName?.trim();
  return `${cd.kind === 'wet' ? 'A wet clean' : 'A dry clean'}${cd.allergen ? `, allergen${name ? ` (${name})` : ''}` : ''}`;
}

/** Each column's start and end on the elapsed stop. */
function spansOf(a: Arrangement): Map<number, { from: number; to: number }> {
  const out = new Map<number, { from: number; to: number }>();
  let at = 0;
  for (const c of a.cols) { out.set(c.col, { from: at, to: at + c.sec }); at += c.sec; }
  return out;
}

export interface CleanWait { id: string; name: string; fromSec: number; toSec: number; sec: number }
export interface CleanFlag { id: string; name: string; text: string }
export interface CleandownFigures {
  /** The stop's elapsed time to the end of the last release element's column, at each rung where one is in the stop. */
  toRelease: Partial<Record<Rung, number>>;
  /** As timed: what runs after the release to the first good pack. */
  afterReleaseSec?: number;
  /** As timed, the elements up to the release by part — their own minutes, seconds; the rest is other work. */
  split: { clean: number; verify: number; release: number; other: number };
  /** The verification's place in the stop, as timed. */
  waits: CleanWait[];
  /** A plan that would change the clean, its verification or the release. */
  flags: CleanFlag[];
  marked: { clean: boolean; verify: boolean; release: boolean };
}

/** The flag a plan carries, or none: the cleaning eliminated or streamlined shorter; the verification eliminated,
 *  converted or streamlined shorter; the release eliminated or converted. Converting the cleaning (parts cleaned off the
 *  line, a spare set) is SMED's own move and is not flagged; a release streamlined shorter is not a change to the method. */
export function cleanFlagOf(st: ChangeoverStep, allergen?: boolean): string | undefined {
  const p = st.plan, part = st.part;
  if (!p || !part || p.kind === 'keep' || st.side !== 'internal') return undefined;
  const shorter = p.kind === 'streamline' && p.targetSec !== undefined && hasTime(st) && p.targetSec < secOf(st);
  const name = st.name.trim() || 'An element';
  if (part === 'clean' && (p.kind === 'eliminate' || shorter)) {
    return `${name} is part of the clean — a plan that ${p.kind === 'eliminate' ? 'removes' : 'shortens'} it changes the cleaning method${allergen ? ' validated for the allergen' : ''}, which is validated again before it is used. SMED shortens what is around the clean, not the clean itself.`;
  }
  if (part === 'verify' && (p.kind === 'eliminate' || p.kind === 'convert' || shorter)) {
    return `${name} is the verification — the line is released on its result, so it stays inside the stop and is not planned away or shortened; work that does not need the result can be done alongside it.`;
  }
  if (part === 'release' && (p.kind === 'eliminate' || p.kind === 'convert')) {
    return `${name} is the release — the line runs again only once it is signed, inside the stop; it is not planned out of it.`;
  }
  return undefined;
}

/** THE CLEANDOWN'S FIGURES, from SMED's own arrangement at each rung. */
export function cleandownOf(seq: ChangeoverStep[] | undefined, cd?: Cleandown): CleandownFigures {
  const list = sorted(seq);
  const toRelease: Partial<Record<Rung, number>> = {};
  for (const r of RUNGS) {
    const a = arrange(list, r), sp = spansOf(a);
    const rel = a.placed.filter(p => p.st.part === 'release');
    if (rel.length) toRelease[r] = Math.max(...rel.map(p => sp.get(p.col)?.to ?? 0));
  }
  const now = arrange(list, 'now'), sp = spansOf(now);
  const relCol = toRelease.now !== undefined ? Math.max(...now.placed.filter(p => p.st.part === 'release').map(p => p.col)) : Infinity;
  const split = { clean: 0, verify: 0, release: 0, other: 0 };
  for (const p of now.placed) if (p.col <= relCol) split[p.st.part ?? 'other'] += p.sec;
  const waits = now.placed.filter(p => p.st.part === 'verify').map(p => {
    const from = sp.get(p.col)?.from ?? 0;
    return { id: p.st.id, name: p.st.name.trim() || 'An element', fromSec: from, toSec: from + p.sec, sec: p.sec };
  });
  const flags = list.map(st => ({ st, text: cleanFlagOf(st, cd?.allergen) })).filter((x): x is { st: ChangeoverStep; text: string } => !!x.text)
    .map(x => ({ id: x.st.id, name: x.st.name.trim() || 'An element', text: x.text }));
  const marked = { clean: list.some(x => x.part === 'clean'), verify: list.some(x => x.part === 'verify'), release: list.some(x => x.part === 'release') };
  return { toRelease, ...(toRelease.now !== undefined ? { afterReleaseSec: Math.max(0, now.elapsedSec - toRelease.now) } : {}), split, waits, flags, marked };
}

/** "70 to 85 min", "the start to 15 min", "45 s to 2.5 min". */
const fromTo = (a: number, b: number): string => {
  if (a <= 0) return `the start to ${mins(b)}`;
  const x = mins(a), y = mins(b);
  return / min$/.test(x) && / min$/.test(y) ? `${x.replace(/ min$/, '')} to ${y}` : `${x} to ${y}`;
};

/** WHAT THE CLEANDOWN SAYS — each a sentence with its tone: the time to release and its split; where the
 *  verification's wait sits; release at the rung the plan reaches; each plan that would change the clean (amber);
 *  the chemicals and water in money, or what to give. Nothing for a product change or before an element is timed. */
export function cleandownSays(facts: Pick<StudyFacts, 'sequence' | 'cleandown' | 'changeovers' | 'running' | 'perWeek'>): { text: string; tone: Tone }[] {
  const cd = facts.cleandown;
  if (!cd) return [];
  const list = sorted(facts.sequence);
  if (!list.some(hasTime)) return [];
  const c = cleandownOf(list, cd), l = ladderOf(list);
  const out: { text: string; tone: Tone }[] = [];
  const atLeast = list.some(x => !hasTime(x)) ? 'at least ' : '';
  if (c.toRelease.now !== undefined) {
    const parts = [c.split.clean ? `${mins(c.split.clean)} cleaning` : '', c.split.verify ? `${mins(c.split.verify)} on the verification` : '',
      c.split.release ? `${mins(c.split.release)} on the release` : '', c.split.other ? `${mins(c.split.other)} of other work` : ''].filter(Boolean);
    const sum = c.split.clean + c.split.verify + c.split.release + c.split.other;
    const together = sum > c.toRelease.now + 1 ? ', some of it at the same time' : '';
    const after = c.afterReleaseSec && c.afterReleaseSec > 0 ? `; then ${mins(c.afterReleaseSec)} to the first good pack` : '';
    out.push({ text: `${cleandownWords(cd)}: ${atLeast}${mins(c.toRelease.now)} to release — ${andList(parts)}${together}${after}.`, tone: 'n' });
  } else {
    out.push({ text: `${cleandownWords(cd)}: mark the element that releases the line to say the time to release.`, tone: 'n' });
  }
  if (cd.allergen && !c.marked.verify) out.push({ text: 'An allergen clean is released on its verification — mark the swabs and the wait for their result.', tone: 'n' });
  for (const w of c.waits) if (w.sec > 0) out.push({ text: `The verification — ${w.name} — holds the line ${mins(w.sec)}, from ${fromTo(w.fromSec, w.toSec)} into the stop; work that does not need its result can be done alongside it.`, tone: 'n' });
  const rung: Rung = l.planned ? l.last : 'separated';
  const was = c.toRelease.now, then = c.toRelease[rung];
  if (was !== undefined && then !== undefined && then < was - 1) {
    out.push({ text: `${rung === 'separated' ? 'With the external work done outside the stop' : 'As planned'}, release at ${mins(then)} — ${mins(was - then)} sooner${c.flags.length ? '' : ', the clean and its verification as they are'}.`, tone: 'n' });
  }
  for (const f of c.flags) out.push({ text: f.text, tone: 'a' });
  out.push({ text: cleanMaterialsSays(facts), tone: 'n' });
  return out.filter(x => x.text);
}

/** The chemicals and water, in money (knowledge/MONEY.md FC-072, E): £ a clean typed × the cleans a week (a year when
 *  its weeks are said) — or what to give. */
export function cleanMaterialsSays(facts: Pick<StudyFacts, 'cleandown' | 'changeovers' | 'running' | 'perWeek'>): string {
  const cd = facts.cleandown;
  if (!cd) return '';
  const m = cd.materials && cd.materials > 0 ? cd.materials : undefined;
  if (!m) return 'Give what one clean uses in chemicals and water to say it in money.';
  const week = changeoversOf(facts).week;
  const weeks = runningOf(facts.running).run?.weeksPerYear;
  const pounds = (x: number) => `£${x < 100 && !Number.isInteger(x) ? x.toFixed(2) : big(x)}`;
  return `Chemicals and water: ${pounds(m)} a clean${week ? ` — ${pounds(m * week)} a week at ${num(week)} clean${week === 1 ? '' : 's'} a week${weeks ? `, ${pounds(m * week * weeks)} a year` : ''}` : ' — say how many changeovers to say it a week'}.`;
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
  /* the figures the ladder counts (M14): a target typed no shorter than
     the time is not a saving, and is said so rather than printed as one */
  if (p?.kind === 'convert') return `convert to external${how}, ${t}${p.targetSec ? ` — ${mins(Math.min(secOf(st) || p.targetSec, p.targetSec))} left inside` : ''}`;
  if (p?.kind === 'streamline') return `streamline${how}, ${t}${p.targetSec !== undefined ? (hasTime(st) && p.targetSec >= secOf(st) ? ` — the target typed (${mins(p.targetSec)}) is no shorter, so ${mins(secOf(st))} stands` : ` → ${mins(p.targetSec)}`) : ''}`;
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
  if (p.kind === 'convert') return `Convert to external${how}${note}${p.targetSec ? ` (${mins(Math.min(secOf(st) || p.targetSec, p.targetSec))} left inside)` : ''}`;
  if (p.kind === 'eliminate') return `Eliminate${how}${note}`;
  const along = p.alongside ? `, alongside ${nameOf?.(p.alongside) ?? 'another element'}${crewOf(p.crew).length ? ` (${crewOf(p.crew).join(', ')})` : ''}` : '';
  const to = p.targetSec !== undefined ? (hasTime(st) && p.targetSec >= secOf(st) ? `${mins(secOf(st))} stands — the target typed (${mins(p.targetSec)}) is no shorter` : `${mins(secOf(st))} → ${mins(p.targetSec)}`) : '';
  return `Streamline${how}${note}${along}${to ? `${note ? '; ' : ': '}${to}` : ''}`;
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
    steps: list.map(st => ({ name: st.name, side: st.side, ...(hasTime(st) ? { sec: secOf(st) } : {}), ...(st.fn ? { fn: st.fn } : {}), ...(st.part ? { part: st.part } : {}),
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

/** THE MINUTES IT MUST COME IN AT — typed on the study (AgreedChangeover), else the product's line standard's. A study's own
 *  wins: a program's criterion is judged by the number set on it, whatever the line standard says for other changeovers. */
export function mustComeIn(typed: { minutes?: number } | undefined, std: Pick<StandardChangeover, 'minutes'> | undefined): Pick<StandardChangeover, 'minutes'> | undefined {
  if (typed && typed.minutes !== undefined && Number.isFinite(typed.minutes) && typed.minutes > 0) return { minutes: typed.minutes };
  return std;
}

/** AGAINST ITS MINUTES — the one verdict a changeover gives, by the rule changeoverSays says it with (over by more than half
 *  a minute is over): `within`, `over` (by how many minutes), or `notYet` while it cannot be told — nothing timed, an
 *  element with no time of its own, or an element carried from the changeover before and not timed again. Over is still
 *  over with elements untimed (the minutes are at least this). Undefined when no minutes are agreed: nothing to judge by. */
export function againstStandard(f: ChangeoverFigures, agreed?: Pick<StandardChangeover, 'minutes'>): { word: 'within' | 'over' | 'notYet'; overMin?: number; minutes: number } | undefined {
  const minutes = agreed && agreed.minutes > 0 ? agreed.minutes : undefined;
  if (minutes === undefined) return undefined;
  if (!f.steps || !f.enough) return { word: 'notYet', minutes };
  const over = f.nowSec / 60 - minutes;
  if (over > 0.5) return f.carried ? { word: 'notYet', minutes } : { word: 'over', overMin: over, minutes };
  return f.untimed || f.carried ? { word: 'notYet', minutes } : { word: 'within', minutes };
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
  /** A cleandown's part (FC-072): Cleaning, Verification or Release. */
  part?: string;
}
export interface ChangeoverSheet {
  rows: ChangeoverRow[];
  total: { minutes: string; labour: string; internal: string; external: string };
  /** The reading, the ladder, the functions, the cost and the interval — each a sentence. */
  lines: string[];
  /** FC-069: the products of the interval, a row each, when the interval can be read. */
  products?: IntervalTableRow[];
}

const HOW: Record<ChangeoverStep['source'], string> = { timed: 'timed', typed: 'typed', carried: 'carried from before' };

/** THE GRID AS A TABLE (lib/report/changeoverTable), as the map's stream
 *  table is: a row per element in order — what, who, where, I/E, the plan,
 *  its time, the elapsed changeover by the end of its column, how known —
 *  the totals, and under them the ladder, the functions, what the
 *  changeovers cost (the week and year, then the shift and the day) and the
 *  interval, in words. `branches` names the record
 *  raised from an element, by its id; `money` the line's cost settings. */
export function changeoverSheet(facts: Pick<StudyFacts, 'sequence' | 'changeovers' | 'running' | 'perWeek' | 'products' | 'availableMinPerDay' | 'ratePerMin' | 'rateFrom' | 'rateStation' | 'carryingRatePerYear' | 'cleandown'>,
  agreed?: Pick<StandardChangeover, 'minutes'>, branches: Map<string, string> = new Map(), money?: SmedMoney): ChangeoverSheet {
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
    ...(facts.cleandown && st.part ? { part: PART_WORD[st.part] } : {}),
  }));
  const said = changeoverSays(f, agreed);
  const iv = intervalFor(f, facts);
  const cost = extrapolationSays(l, facts, money);
  const lines = f.enough ? [said.text, ...said.lines.filter(x => x.tone !== 'n').map(x => x.text), ladderSays(l).text, ...cleandownSays(facts).map(x => x.text), functionSays(list),
    cost.text, scaleSays(cost.scale), intervalSays(iv, f).text, intervalStockSays(iv, money, facts.carryingRatePerYear).text].filter(Boolean) : [];
  const products = f.enough ? intervalRows(iv, facts.carryingRatePerYear) : [];
  return { rows, total: { minutes: mins(f.nowSec), labour: mins(f.labourSec), internal: mins(f.internalSec), external: mins(f.externalSec) }, lines, ...(products.length ? { products } : {}) };
}

/** THE CHANGEOVER LINE CAPACITY TAKES OFF EACH SHIFT (docs/CAPACITY.md §2):
 *  the standard's newest agreed minutes, else the newest SMED into the
 *  product as timed; how many a shift from the SMED it came from — its count
 *  and how the line runs. Nothing when no changeover is timed. */
export function changeoverIn(agreed: StandardChangeover[] | undefined, studies: ToolStudy[], standardId: string): ChangeoverIn | undefined {
  const a = [...(agreed ?? [])].sort((x, y) => y.agreedAt - x.agreedAt)[0];
  const cur = studies.filter(s => !s.deletedAt && s.tool === 'changeover' && s.standardId === standardId).sort((x, y) => y.startedAt - x.startedAt)[0];
  const src = (a && studies.find(s => s.id === a.fromStudyId && !s.deletedAt)) || cur;
  const per = src ? changeoversOf(src.facts).shift : undefined;
  const perShift = per != null && Number.isFinite(per) ? { perShift: Math.round(per * 100) / 100 } : {};
  if (a && a.minutes > 0) return { min: a.minutes, ...perShift, agreed: true, ...(a.from ? { from: a.from } : {}) };
  const nowMin = cur ? ladderOf(cur.facts.sequence).now.elapsedSec / 60 : 0;
  return nowMin > 0 ? { min: Math.round(nowMin * 10) / 10, ...perShift, agreed: false } : undefined;
}
