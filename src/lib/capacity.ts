/* WHERE A LINE IS LIMITED — the capacity of a chain of machines and people.
 *
 * Rowland, on a line walk: the Pareto says where TIME is lost. It does not say
 * where the line is LIMITED when nothing breaks. A bagger does 70 units a
 * minute; the units go into baskets of 12; the basketer does so many baskets a
 * minute; a person carries them; the palletiser stacks pallets. Each is in its
 * own unit and its own speed. Put them in one unit and the shortest bar is the
 * bottleneck — and that is the discussion, and the action.
 *
 * WHAT THIS IS AND IS NOT. A steady-state SCREEN: it says where to look and
 * roughly what fixing it would give. It is not a simulation. Buffers between
 * stations hide short stops, which is why the answer says "at most" and never
 * promises. Everything is derived from the stations typed in — nothing here is
 * stored but those stations (lib/useLineCapacity writes them on the line).
 *
 * THE FIVE WAYS THIS GOES WRONG, AND WHAT KEEPS EACH HONEST
 *
 *  1. Units. Every station says how many of the PREVIOUS station's unit make
 *     one of its own ("1 basket = 12 bags"), and the chain multiplies up. A
 *     missing or zero conversion stops the chain at that station — it is
 *     reported, never guessed — because a silent wrong factor gives a wrong
 *     bottleneck that looks exactly like a right one.
 *  2. Three speeds. The speed WHILE RUNNING is not the speed once STOPS are
 *     counted. Both are worked out; when they name different bottlenecks the
 *     sentence says so — a limit that is stops is a different fix from a limit
 *     that is speed.
 *  3. Rejects. A station that throws away 5% means every station after it sees
 *     5% less. Capacities are all put back in the line's own unit at the START
 *     of the line, so they compare like for like.
 *  4. Waiting is not a fault. Minutes a station spent starved or blocked by its
 *     neighbour are not its own stops; counting them would blame the wrong
 *     machine. They are kept apart, and they are the cross-check: the true
 *     bottleneck is never starved or blocked by others.
 *  5. People are stations. A person is a speed like any other — typed as a rate
 *     or as "this many every this many seconds" — and the pace to type is the
 *     one they can sustain, not their best lap. */
import type { Observation } from '../types';
import type { StandardChangeover } from './study';

export type StationKind = 'machine' | 'people';
export type RatePer = 'sec' | 'min' | 'hour';

export interface Station {
  id: string;
  name: string;
  kind: StationKind;
  /** What this station counts in: "bags", "baskets", "pallets". */
  unit: string;
  /** How many of the PREVIOUS station's unit make one of this one's. The first
   *  station counts the line's own unit, so its value is ignored (it is 1). */
  contains: number;
  /** Speed while running, as a rate… */
  rate?: number;
  ratePer?: RatePer;
  /** …or, for a person or a slow machine, a cycle: `perCycle` of `unit`
   *  every `cycleSec` seconds. Used when `rate` is not set. */
  cycleSec?: number;
  perCycle?: number;
  /** WHAT THE SPEED IS TYPED IN. A person on a palletiser is timed per
   *  basket, not per pallet (Rowland, 14 October: "I need to be able to
   *  determine the speed of the human doing something" — he was dividing 70
   *  a minute by hand to type a rate in pallets). 'before': the rate or the
   *  cycle is in the PREVIOUS station's unit — "a basket every 6 s" — and is
   *  put into this one's by `contains` (36 baskets a pallet). Absent: in its
   *  own unit, as every station was typed before. */
  speedIn?: 'before';
  /** THE CYCLE TYPED IN MINUTES — "it takes 5 minutes to do one pallet"
   *  (Rowland, 14 October). Only how the box shows it: `cycleSec` is always
   *  seconds. Absent: typed in seconds. */
  cycleIn?: 'min';
  /** A PERSON'S REST ALLOWANCE, percent, added to their timed or typed time
   *  to give the time to plan on (docs/CAPACITY.md §1; Rowland, 14 October:
   *  "we need to bring in science when it comes to humans"). Absent: the
   *  ILO's constant allowances, 9% — 5% personal needs and 4% basic fatigue
   *  on every job (Kanawaty, Introduction to Work Study, ILO 1992) — more
   *  typed for standing, awkward posture, weight lifted, heat, noise or
   *  monotony. Never on a machine, and never on a standard time from the time
   *  study, which carries its allowances already. */
  allowancePct?: number;
  /** Identical machines or people side by side. Default 1. */
  crew?: number;
  /** WHICH LINE IT IS ON, when several lines feed one place (Capacity.lanes):
   *  the line's id. Absent — or a line that is not on the list — it is after
   *  the lines merge, where they all come to it. */
  lane?: string;
  /** Percent of the time it is actually running, its OWN stops only. Default
   *  100 — most lines start by looking at speed alone. */
  runningPct?: number;
  /** Percent of what it handles that goes on as good. Default 100. */
  goodPct?: number;
  /** How the speed is known — the plate, timed by somebody, a person's
   *  standard time from the time study, or a guess. */
  source?: 'plate' | 'timed' | 'standard' | 'estimate';
  note?: string;
  /** The machine name its stops are logged under, when that is not its name. */
  asset?: string;
  /** ACCUMULATION after it (docs/CAPACITY.md §4): how many of its own unit
   *  can collect between it and the next station — a conveyor, a table — so
   *  a short stop on one side need not stop the other. */
  bufferAfter?: number;
}

/** A LINE OF SEVERAL THAT FEED ONE PLACE (Rowland, 15 October: "two lines here
 *  that then merge into individuals at the end of the line ... line A, line B,
 *  running ... then merge into one person who has to wrap for both" — and
 *  "3, 4, 5 production lines all running, then merging into one pack hole;
 *  that happens all the time in manufacturing"). Each is its own chain of
 *  stations (Station.lane); the stations that have no line come after they
 *  merge, one chain for all of them. */
export interface Lane { id: string; name: string }

export interface Capacity {
  /** What the line should be doing, in the line's own unit per minute — all
   *  the lines together, when there are several. */
  targetPerMin?: number;
  /** THE LINES THAT FEED ONE PLACE, in the order they are drawn. Absent or
   *  empty: one chain of stations, as ever. */
  lanes?: Lane[];
  /** Planned running hours in a week — what a share of stops is measured
   *  against. Only used to SUGGEST a running percentage, never silently. */
  plannedHoursPerWeek?: number;
  /** NEXT WEEK'S ORDERS for this product, in the line's unit — typed or pasted
   *  on the line's capacity (lib/intelligence loadVsDemand); never from an ERP. */
  demandPerWeek?: number;
  stations: Station[];
  /** THE V's MARGIN (docs/CAPACITY.md §4): how much faster, in percent, each
   *  station a step away from the bottleneck is agreed to be — so a short stop
   *  beside it never starves or blocks it. About 10% a step is the usual
   *  starting point on an accumulation line (a convention, not a law), so it
   *  is the owner's to set; until it is set, no guide is drawn. */
  vMarginPct?: number;
  /** WHAT-IFS. Rowland: "I have a line, but I may take a machine out and put
   *  another machine in… swipe left, add a different machine name — oh look,
   *  it changes, that's a different bottleneck." A what-if is a copy of the
   *  stations with one thing changed, kept beside the line as it runs, and
   *  compared with it in a sentence. It lives here on the line, with the
   *  stations it was copied from; nothing new is stored anywhere else. */
  whatIfs?: WhatIf[];
  /** THE AGREED CHANGEOVERS into this product, one per product it is changed
   *  from — written by a changeover study's Set as the standard (lib/ie/
   *  changeover). Kept here, inside the standard's one jsonb, so no column is
   *  added; the mapper passes `capacity` whole. Only a product's line standard
   *  carries them — a 6M line's balance never does. */
  changeovers?: StandardChangeover[];
  /** WHAT THE LINE'S LABOUR COSTS A PACK (Rowland, 13 October: "if I put two
   *  people there ... is my cost per pack higher or lower? That ultimately
   *  decides whether or not they will pursue putting an extra person on the
   *  line"). The people on the line for this product — all of them, not only
   *  the stations that are people — and what one costs an hour. Each absent
   *  when not typed: the line's own (its crew and rate, Stage 1) or the
   *  line standard's head count stand in, said which. */
  labour?: { people?: number; ratePerHour?: number };
}

export interface WhatIf {
  id: string;
  /** What was changed, in the owner's words: "New basketer", "12 to a basket". */
  name: string;
  /** The what-if's stations as last saved — a snapshot, refreshed on every
   *  save (syncWhatIfs), kept so an older copy of the app on another device
   *  still reads a whole line. The TRUTH is `diff` when it is there. */
  stations: Station[];
  /** WHAT THIS WHAT-IF CHANGES, against the line as run — and nothing else.
   *  It used to be a frozen copy: edit the line as run and every what-if kept
   *  the old stations, reported changes nobody made in it, and Make it so
   *  wrote those onto the board. Stored as changes, a what-if follows the
   *  line in everything it did not change. Absent on one saved before this. */
  diff?: WhatIfDiff;
  targetPerMin?: number;
  createdAt: number;
  /** DECIDED. The action raised on the board to make it real — the what-if
   *  remembers it so the screen can say "on the board" and, once it is done,
   *  the board's own proof judges the prediction. */
  action?: { id: string; raisedAt: number };
}

/** A what-if's changes against the line as run. */
export interface WhatIfDiff {
  /** Per station of the line as run: the fields this what-if sets differently.
   *  `null` is a field it clears (a rate swapped for a cycle). */
  set: Record<string, Record<string, unknown>>;
  /** Stations only the what-if has, each after the station it follows
   *  (absent = at the front). */
  added: { after?: string; station: Station }[];
  /** Stations of the line as run that the what-if leaves out. */
  removed: string[];
  /** The what-if's own order of stations, when it moved one. */
  order?: string[];
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Lay the changes over the line as run: the what-if's stations, now. A
 *  station the line gained since is in it too, where the line has it; one the
 *  line lost is gone from it too. */
export function applyWhatIf(asRun: Station[], d: WhatIfDiff): Station[] {
  const gone = new Set(d.removed);
  let list = asRun.filter(s => !gone.has(s.id)).map(s => {
    const p = d.set[s.id];
    if (!p) return s;
    const out: Record<string, unknown> = { ...s };
    for (const [k, v] of Object.entries(p)) { if (v === null) delete out[k]; else out[k] = v; }
    return out as unknown as Station;
  });
  for (const a of d.added) {
    const i = a.after ? list.findIndex(s => s.id === a.after) : -1;
    list = a.after && i < 0 ? [...list, a.station] : [...list.slice(0, i + 1), a.station, ...list.slice(i + 1)];
  }
  if (d.order?.length) {
    const rank = new Map(d.order.map((id, i) => [id, i]));
    const known = list.filter(s => rank.has(s.id)).sort((a, b) => (rank.get(a.id) as number) - (rank.get(b.id) as number));
    // a station the order does not know (the line gained it since) keeps its place after the one before it
    const out = [...known];
    list.forEach((s, i) => {
      if (rank.has(s.id)) return;
      const before = list.slice(0, i).reverse().find(x => out.some(o => o.id === x.id));
      const at = before ? out.findIndex(o => o.id === before.id) + 1 : 0;
      out.splice(at, 0, s);
    });
    list = out;
  }
  return list;
}

/** The changes that turn the line as run into these stations — what a
 *  what-if stores when it is edited. applyWhatIf(asRun, diffWhatIf(asRun, x))
 *  gives back x. */
export function diffWhatIf(asRun: Station[], mine: Station[]): WhatIfDiff {
  const theirs = new Map(asRun.map(s => [s.id, s]));
  const ours = new Set(mine.map(s => s.id));
  const set: WhatIfDiff['set'] = {};
  for (const m of mine) {
    const a = theirs.get(m.id);
    if (!a) continue;
    const p: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(m)]);
    for (const k of keys) {
      if (k === 'id') continue;
      const av = (a as unknown as Record<string, unknown>)[k], mv = (m as unknown as Record<string, unknown>)[k];
      if (!same(av, mv)) p[k] = mv === undefined ? null : mv;
    }
    if (Object.keys(p).length) set[m.id] = p;
  }
  const added = mine.flatMap((m, i) => (theirs.has(m.id) ? [] : [{ ...(i > 0 ? { after: mine[i - 1].id } : {}), station: m }]));
  const removed = asRun.filter(s => !ours.has(s.id)).map(s => s.id);
  const plain: WhatIfDiff = { set, added, removed };
  const laid = applyWhatIf(asRun, plain).map(s => s.id);
  const ids = mine.map(s => s.id);
  return same(laid, ids) ? plain : { ...plain, order: ids };
}

/** A what-if's stations against the line as run now. One saved before what-ifs
 *  were stored as changes is its own snapshot until it is next saved. */
export const whatIfStations = (asRun: Station[], w: WhatIf): Station[] =>
  (w.diff ? applyWhatIf(asRun, w.diff) : w.stations);

/** A what-if with these stations, stored as changes against the line as run. */
export const withWhatIfStations = (asRun: Station[], w: WhatIf, stations: Station[]): WhatIf =>
  ({ ...w, stations, diff: diffWhatIf(asRun, stations) });

/** Every what-if brought up to the line before it is saved: changes worked out
 *  for one that has none — against the line as it WAS (`prev`), so an edit to
 *  the line as run is never read as a change the what-if made — and each
 *  snapshot redrawn over the line as it now is. */
export function syncWhatIfs(prev: Capacity, next: Capacity): Capacity {
  if (!next.whatIfs?.length) return next;
  return {
    ...next,
    whatIfs: next.whatIfs.map(w => {
      const diff = w.diff ?? diffWhatIf(prev.stations, w.stations);
      return { ...w, diff, stations: applyWhatIf(next.stations, diff) };
    }),
  };
}

/** The what-if as a line of its own to analyse: its stations, its target if it
 *  set one, the line's planned hours. */
export const whatIfCapacity = (cap: Capacity, w: WhatIf): Capacity =>
  ({ targetPerMin: w.targetPerMin ?? cap.targetPerMin, plannedHoursPerWeek: cap.plannedHoursPerWeek, stations: whatIfStations(cap.stations, w),
    /* the lines it feeds are the line's: a what-if changes their stations, not how many there are */
    ...(cap.lanes?.length ? { lanes: cap.lanes } : {}) });

export const EMPTY_CAPACITY: Capacity = { stations: [] };

/* ================================ speeds =================================== */

const PER_MIN: Record<RatePer, number> = { sec: 60, min: 1, hour: 1 / 60 };

/** The station's own speed, in its own unit per minute — or undefined when it
 *  has not been given one that can be used. Typed in the unit before it
 *  (speedIn 'before'), it is put into its own: a basket every 6 s at 36 to a
 *  pallet is 10 baskets a minute, 0.28 pallets. */
export function perMinute(s: Station): number | undefined {
  const typed = typedPerMinute(s);
  if (typed == null) return undefined;
  if (s.speedIn !== 'before') return typed;
  return s.contains > 0 ? typed / s.contains : undefined;
}

/** THE ILO'S CONSTANT ALLOWANCES, percent: personal needs 5 + basic
 *  fatigue 4 (Kanawaty, Introduction to Work Study, ILO 1992). */
export const REST_ALLOWANCE_PCT = 9;

/** The rest allowance on a station's speed, as a fraction: a person timed or
 *  typed — 0.09 unless said — and nothing on a machine or on a standard time
 *  (the time study's carries its own). */
export function allowanceOf(s: Pick<Station, 'kind' | 'source' | 'allowancePct'>): number {
  if (s.kind !== 'people' || s.source === 'standard') return 0;
  const a = s.allowancePct ?? REST_ALLOWANCE_PCT;
  return Number.isFinite(a) && a > 0 ? a / 100 : 0;
}

/** THE SPEED TO PLAN ON, its own unit a minute: what was timed or typed,
 *  with a person's rest allowance taken off — 6 s a basket timed is 6.54 s
 *  to plan on. What the line's capacity is worked out from. */
export function planPerMinute(s: Station): number | undefined {
  const v = perMinute(s);
  return v == null ? undefined : v / (1 + allowanceOf(s));
}

/** The speed as it was typed, a minute, in the unit it was typed in. */
export function typedPerMinute(s: Pick<Station, 'rate' | 'ratePer' | 'cycleSec' | 'perCycle'>): number | undefined {
  if (s.rate != null && s.rate > 0) return s.rate * PER_MIN[s.ratePer ?? 'min'];
  if (s.cycleSec != null && s.cycleSec > 0 && s.perCycle != null && s.perCycle > 0) return (s.perCycle * 60) / s.cycleSec;
  return undefined;
}

/** HOW MANY OF THE LINE'S UNIT ARE IN ONE OF A STATION'S — the steps before
 *  read into it: 36 baskets of 10 is 360 units a pallet. Undefined while a
 *  station up to it does not say how many of the one before make one. */
export function chainFactor(stations: readonly Pick<Station, 'contains'>[], i: number): number | undefined {
  let f = 1;
  for (let k = 1; k <= i; k++) {
    const c = stations[k]?.contains;
    if (!(c != null && c > 0)) return undefined;
    f *= c;
  }
  return f;
}

/** "1 pallet = 36 baskets = 360 units" — a station's unit read back through
 *  every step before it to the line's own, so a wrong number in the chain is
 *  something a person can see (docs/CAPACITY.md §1). Undefined at the front
 *  of the line or while the chain is not whole. */
export function chainWords(stations: readonly Pick<Station, 'unit' | 'contains'>[], i: number): string | undefined {
  if (i <= 0 || chainFactor(stations, i) == null) return undefined;
  const parts = [`1 ${oneOf(stations[i].unit) || 'one'}`];
  let f = 1;
  for (let k = i; k >= 1; k--) {
    f *= stations[k].contains;
    /* a one-for-one step is not said twice; the line's own unit always last */
    if (stations[k].contains !== 1 || k === 1) parts.push(`${fmtN(f)} ${stations[k - 1].unit.trim() || 'units'}`);
  }
  return [...new Set(parts)].join(' = ');
}

/** A STATION'S SPEED AS IT WAS TYPED, in the unit it was typed in — "a
 *  basket every 6 s" for a palletiser timed per basket, "70 bags a minute"
 *  for a bagger. `prevUnit` is the unit of the station before it. */
export function typedSpeedWords(s: Pick<Station, 'unit' | 'rate' | 'ratePer' | 'cycleSec' | 'perCycle' | 'speedIn'>, prevUnit?: string): string {
  const unit = (s.speedIn === 'before' && prevUnit?.trim() ? prevUnit : s.unit).trim() || 'units';
  if (s.rate != null && s.rate > 0) return `${fmtN(s.rate)} ${unit} ${PER_MIN_WORD[s.ratePer ?? 'min']}`;
  if (s.cycleSec != null && s.cycleSec > 0) return cycleWords(s.perCycle ?? 1, s.cycleSec, unit);
  return 'no speed yet';
}
const PER_MIN_WORD: Record<RatePer, string> = { sec: 'a second', min: 'a minute', hour: 'an hour' };

const pct = (v: number | undefined, dflt: number): number => {
  if (v == null || !Number.isFinite(v)) return dflt;
  return Math.min(100, Math.max(0, v)) / 100;
};

/** Why this station cannot be counted yet, in words somebody can act on. */
export function stationProblem(s: Station, i: number, prevUnit?: string): string | undefined {
  if (!s.unit.trim()) return 'it does not say what it counts in';
  if (i > 0 && !(s.contains > 0)) return `it does not say how many ${prevUnit?.trim() || 'of the one before'} make one ${oneOf(s.unit)}`;
  if (perMinute(s) == null) return 'it has no speed yet';
  if (s.crew != null && !(s.crew > 0)) return 'its crew has to be more than none';
  if (pct(s.runningPct, 1) === 0) return 'it is never running — check the running percentage';
  if (pct(s.goodPct, 1) === 0) return 'it passes nothing on — check the good percentage';
  return undefined;
}

/* ================================ results ================================== */

export interface StationResult {
  station: Station;
  index: number;
  /** How many of the LINE's unit are in one of this station's — 1, 12, 480. */
  factor: number;
  /** "baskets · 12 bags each" — the chain made visible, so a wrong conversion
   *  is something a person can SEE. Said without singular forms, which a unit
   *  typed in the plural ("cases", "boxes") cannot be turned into safely. */
  chain: string;
  /** What it handles at running speed, in the line's unit per minute at the
   *  START of the line (rejects upstream put back). */
  running: number;
  /** The same once its own stops are counted. */
  effective: number;
  /** Share of the line's flow this station is loaded to: 1 is the limit. */
  loadAtLine: number;
  /** Room above what the line is doing. 0 at the limit. */
  headroom: number;
  /** WHAT ARRIVES, in THIS station's own unit a minute — the stations before
   *  it, at their slowest, put into its unit: 70 bags a minute and 8 to a
   *  basket is 8.75 baskets a minute arriving. The speed it has to beat.
   *  Undefined at the front of the line. */
  arrives?: number;
  /** What it does once its own stops are counted, in its own unit a minute. */
  does: number;
  /** The two said together: "8.75 baskets a minute arrive · it does 5.5 —
   *  holds the line back". The sentence a person types the next speed against. */
  feed: string;
}

export interface Skipped { station: Station; index: number; why: string }

/** WHAT REACHES A STATION, worked out from the line before it — for every
 *  station whose chain of units is whole, whether or not it has a speed yet
 *  (Rowland, 13 October: "70 a minute ... how many go into a basket? 10 ...
 *  so one basket goes to a human every X"). */
export interface Arrival {
  /** In the station's own unit a minute. */
  perMin: number;
  /** One of its own unit every this many seconds. */
  everySec: number;
  /** The station before it that sets that pace — the slowest so far. */
  from: { name: string; unit: string; perMin: number };
  /** How many of `from`'s unit make one of this station's — 8 bags a tray. */
  ratio: number;
}

export interface CapacityResult {
  unit: string;
  ok: StationResult[];
  skipped: Skipped[];
  /** The station that limits the line once stops are counted. */
  limit?: StationResult;
  /** The one that would limit it next. */
  next?: StationResult;
  /** The slowest on running speed alone — differs from `limit` when it is
   *  stops, not speed, that hold the line down. */
  limitAtRunning?: StationResult;
  /** What the line can do: the limit's effective figure, per minute. */
  line?: number;
  /** Good product out of the end, per minute (after every station's rejects). */
  goodOut?: number;
  target?: number;
  /** Positive: short of the target by this much. Negative: above it. */
  gap?: number;
  /** The most that fixing the limit can give before `next` takes over. */
  liftAtMost?: number;
  /** What losing the limit's own stops would give, capped by `next`. */
  liftNoStops?: number;
  sentence: string;
  notes: string[];
  /** What reaches each station after the first, by station id — every
   *  station whose chain of units is whole, counted or not yet. */
  arrivals: Record<string, Arrival>;
  /** SEVERAL LINES FEEDING ONE PLACE (Capacity.lanes): each line worked out
   *  on its own, and the place they merge worked out from what they send it.
   *  Everything above is then the whole: `line` is all the lines together, the
   *  limit the station that holds that, in the line's unit a minute. */
  lanes?: LanesView;
}

export interface LaneSection {
  id: string;
  name: string;
  /** The line alone — its stations' own limit, in its own unit a minute. */
  result: CapacityResult;
}

export interface LanesView {
  sections: LaneSection[];
  /** After they merge: a station standing for the lines, sending what they
   *  make (first in `ok`, index -1), then the shared stations. Absent when
   *  nothing is shared. */
  merged?: CapacityResult;
  /** What the lines send together, in the line's unit a minute. */
  sends: number;
  /** Where the whole is held: the lines themselves, or the place they merge. */
  heldBy: 'lanes' | 'shared';
}

/** THE LINE'S SPEED, as the practice takes it (docs/CAPACITY.md §1 —
 *  Rowland, 12 October: "we go by plate speed ... of course, unless human"):
 *  the station slowest on running speed alone (found like for like, every
 *  speed put back to the start of the line) — a machine's when its speed is
 *  off its PLATE, a person's when people set the pace and were timed, or
 *  carry a standard time from the time study. Nothing when the
 *  slowest station's speed is a guess, or a machine's timed rather than
 *  read off its plate: running below the plate is a loss (slow running),
 *  never a lower plate. What a stop's packs are counted at (SMED, the loss
 *  count) — so it is that station's OWN speed in the line's unit, its plate
 *  × its crew × the units in one of its own: 100 bags a minute is 100,
 *  whatever the weigher before it rejects. (It was the speed put back to
 *  the start of the line, a rejecting station before it adding packs the
 *  bottleneck never made — 2% rejected upstream said the Bagger's 100 was
 *  102, and every shift counted 9 min of slow running that was not there.
 *  Audit, 13 October.) */
export function lineSpeed(cap: Capacity | undefined): { perMin: number; unit: string; station: string; from: 'plate' | 'person' } | undefined {
  if (!cap?.stations?.length) return undefined;
  const r = analyse(cap), x = r.limitAtRunning;
  if (!x || !(x.running > 0)) return undefined;
  const st = x.station, name = st.name.trim() || `station ${x.index + 1}`;
  const own = ownSpeed(x);
  if (st.kind === 'machine' && st.source === 'plate') return { perMin: own, unit: r.unit, station: name, from: 'plate' };
  if (st.kind === 'people' && (st.source === 'timed' || st.source === 'standard')) return { perMin: own, unit: r.unit, station: name, from: 'person' };
  return undefined;
}

/** A counted station's own speed while running, in the line's unit a
 *  minute at its place in the line: its speed × its crew × the line's units
 *  in one of its own — no rejects before it put back. */
export const ownSpeed = (x: Pick<StationResult, 'station' | 'factor'>): number =>
  (planPerMinute(x.station) ?? 0) * (x.station.crew != null && x.station.crew > 0 ? x.station.crew : 1) * x.factor;

/** Numbers as a person would say them: 62, 66.5, 0.13 — no trailing zeros. */
export function fmtN(n: number): string {
  const a = Math.abs(n);
  const d = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return String(Number(n.toFixed(d)));
}

const norm = (s: string) => s.trim().toLowerCase();

export function analyse(cap: Capacity): CapacityResult {
  return cap.lanes && cap.lanes.length > 0 ? analyseLanes(cap) : analyseChain(cap);
}

/** ONE CHAIN OF STATIONS, in the order the product goes through them. */
function analyseChain(cap: Capacity): CapacityResult {
  const stations = cap.stations;
  const unit = stations[0]?.unit.trim() || 'units';
  const notes: string[] = [];
  const skipped: Skipped[] = [];
  const ok: StationResult[] = [];

  /* THE CHAIN. factor[i] = how many line units are in one of station i's. It
     needs every `contains` up to i to be usable; the first one that is not
     breaks the chain for everything after it. */
  let factor = 1;
  let chainBroken: string | undefined;
  let goodSoFar = 1;                      // product of upstream good fractions
  const upGood = new Map<string, number>(); // each counted station's upstream good fraction
  /* every station whose chain is whole, counted or not: its factor and the good fraction reaching it */
  const whole = new Map<string, { factor: number; up: number }>();
  stations.forEach((s, i) => {
    if (i > 0) {
      if (chainBroken) { skipped.push({ station: s, index: i, why: `the chain of units breaks at ${chainBroken}` }); return; }
      if (s.contains > 0) factor *= s.contains;
      else { chainBroken = s.name || `station ${i + 1}`; }
    }
    if (!chainBroken) whole.set(s.id, { factor, up: goodSoFar });
    const problem = stationProblem(s, i, stations[i - 1]?.unit);
    const upstream = goodSoFar;
    goodSoFar *= pct(s.goodPct, 1) || 1;
    if (problem || chainBroken) {
      skipped.push({ station: s, index: i, why: problem ?? `the chain of units breaks at ${chainBroken}` });
      return;
    }
    const speed = planPerMinute(s) as number;
    const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
    const running = (speed * crew * factor) / upstream;
    const effective = running * pct(s.runningPct, 1);
    const chain = i === 0 ? '' : `${s.unit.trim()} · ${fmtN(factor)} ${unit} each`;
    ok.push({ station: s, index: i, factor, chain, running, effective, loadAtLine: 0, headroom: 0, does: 0, feed: '' });
    upGood.set(s.id, upstream);
  });

  /* WHAT ARRIVES AT EACH STATION, in its own unit. The stations before it, at
     the slowest of them, are what reach it — put back into its own unit by the
     chain (÷ factor) and thinned by the rejects before it (× upstream good). A
     person typing the next speed sees the number it has to beat, and the
     sentence says at once whether this station keeps up. */
  let slowestBefore = Infinity;
  /* only the slowest of them all holds the line back — a station under the
     one before it but above the line's slowest just makes the one before wait */
  const slowestOfAll = Math.min(...ok.map(x => x.effective));
  for (const x of ok) {
    const up = upGood.get(x.station.id) ?? 1;
    const own = x.station.unit.trim() || unit;
    x.does = (x.effective * up) / x.factor;
    if (Number.isFinite(slowestBefore)) {
      x.arrives = (slowestBefore * up) / x.factor;
      const gap = x.does - x.arrives;
      x.feed = gap < -1e-9
        ? `${fmtN(x.arrives)} ${own} a minute arrive · it does ${fmtN(x.does)} — ${x.effective <= slowestOfAll + 1e-9 ? 'holds the line back' : 'the one before waits'}`
        : `${fmtN(x.arrives)} ${own} a minute arrive · it does ${fmtN(x.does)} — keeps up${gap > 1e-9 ? `, ${fmtN(gap)} to spare` : ''}`;
    } else {
      x.feed = `the front of the line · it does ${fmtN(x.does)} ${own} a minute`;
    }
    slowestBefore = Math.min(slowestBefore, x.effective);
  }

  /* WHAT REACHES EVERY STATION — the same sum, for a station with no speed
     yet too: picking People and saying 8 to a tray is enough to say a tray
     reaches them every 6.9 s. */
  const arrivals: Record<string, Arrival> = {};
  let pace: StationResult | undefined;
  stations.forEach((s, i) => {
    const w = whole.get(s.id);
    if (i > 0 && w && pace) {
      const pf = pace.factor, pu = upGood.get(pace.station.id) ?? 1;
      const perMin = (pace.effective * w.up) / w.factor;
      if (perMin > 0) {
        arrivals[s.id] = {
          perMin, everySec: 60 / perMin, ratio: w.factor / pf,
          from: { name: pace.station.name.trim() || `Station ${pace.index + 1}`, unit: pace.station.unit.trim() || unit, perMin: (pace.effective * pu) / pf },
        };
      }
    }
    const x = ok.find(o => o.station.id === s.id);
    if (x && (!pace || x.effective < pace.effective)) pace = x;
  });

  /* Soft hints on the conversions — a one-to-one between two different words
     is usually a missing number, and the chain is silently multiplied by 1. */
  stations.forEach((s, i) => {
    if (i === 0 || !(s.contains > 0)) return;
    const prev = stations[i - 1];
    if (norm(prev.unit) && norm(s.unit) && norm(prev.unit) !== norm(s.unit) && s.contains === 1) {
      notes.push(`${s.name || `Station ${i + 1}`}: its ${s.unit.trim()} are counted one-for-one with the ${prev.unit.trim()} before — is that right?`);
    }
    if (norm(prev.unit) === norm(s.unit) && s.contains !== 1) {
      notes.push(`${s.name || `Station ${i + 1}`} counts in ${s.unit.trim()} like the one before, but says ${fmtN(s.contains)} of those make one — is that right?`);
    }
  });

  const target = cap.targetPerMin != null && cap.targetPerMin > 0 ? cap.targetPerMin : undefined;
  const out: CapacityResult = { unit, ok, skipped, target, sentence: '', notes, arrivals };

  if (ok.length === 0) {
    out.sentence = stations.length === 0
      ? 'Add the stations in the order the product goes through them, with how fast each one runs.'
      : 'None of the stations can be counted yet — see what each one is missing.';
    return out;
  }

  const byEff = [...ok].sort((a, b) => a.effective - b.effective);
  const byRun = [...ok].sort((a, b) => a.running - b.running);
  const limit = byEff[0];
  const next = byEff[1];
  const line = limit.effective;
  for (const r of ok) { r.loadAtLine = r.effective > 0 ? line / r.effective : 0; r.headroom = r.effective - line; }

  out.limit = limit;
  out.next = next;
  out.limitAtRunning = byRun[0];
  out.line = line;
  out.goodOut = line * goodSoFar;
  if (target != null) out.gap = target - line;
  if (next) {
    out.liftAtMost = next.effective - line;
    out.liftNoStops = Math.max(0, Math.min(limit.running, next.effective) - line);
  }
  out.sentence = sentenceOf(out, cap);
  return out;
}

function sentenceOf(r: CapacityResult, cap: Capacity): string {
  const limit = r.limit as StationResult;
  const name = (s: StationResult) => s.station.name.trim() || `Station ${s.index + 1}`;
  const line = r.line as number;
  const per = `${r.unit}/min`;
  const parts: string[] = [];

  if (!r.next) {
    parts.push(`Only ${name(limit)} is counted so far, at ${fmtN(line)} ${per} — add the other stations to see which one limits the line.`);
  } else {
    const level = r.next.effective - line <= line * 0.01;
    const tgt = r.target == null ? ''
      : (r.gap as number) > 0 ? `, ${fmtN(r.gap as number)} short of the ${fmtN(r.target)} target`
        : `, above the ${fmtN(r.target)} target`;
    parts.push(level
      ? `${name(limit)} and ${name(r.next)} are level at ${fmtN(line)} ${per}${tgt}.`
      : `${name(limit)} limits the line at ${fmtN(line)} ${per}${tgt}.`);
    if (r.target != null && (r.gap as number) <= 0) {
      parts.push('Capacity is not what holds this line back at that target — look at stops and quality.');
    } else if (!level) {
      parts.push(`${name(r.next)} is next at ${fmtN(r.next.effective)}, so fixing ${name(limit)} lifts the line by ${fmtN(r.liftAtMost as number)} at most.`);
    }
    if (r.limitAtRunning && r.limitAtRunning.index !== limit.index) {
      parts.push(`On speed alone ${name(r.limitAtRunning)} is the slowest — it is ${name(limit)}’s stops that pull the line down.`);
    } else if (limit.effective < limit.running - 1e-9 && r.liftNoStops && r.liftNoStops > line * 0.01) {
      parts.push(`Its stops cost ${fmtN(limit.running - limit.effective)} ${per}.`);
    }
  }
  if (r.skipped.length) parts.push(`${r.skipped.length} station${r.skipped.length === 1 ? '' : 's'} not counted yet.`);
  void cap;
  return parts.join(' ');
}

/* ============================ SEVERAL LINES, ONE PLACE =======================
 * Each line is worked out on its own, as a chain. What they make together
 * goes to the stations after they merge — a virtual first station standing for
 * the lines, sending that much, then the shared stations in order. The whole
 * is the merged chain's limit, in the line's unit a minute, and that is what
 * every other reading of a capacity (the dashboard's "can make", the loss
 * count's bottleneck, the labour cost a pack) takes of it. */
const MERGE_ID = '__merge__';

function analyseLanes(cap: Capacity): CapacityResult {
  const lanes = cap.lanes ?? [];
  const laneIds = new Set(lanes.map(l => l.id));
  const at = new Map(cap.stations.map((st, i) => [st.id, i]));
  const own = (id: string) => cap.stations.filter(st => st.lane === id);
  const shared = cap.stations.filter(st => !st.lane || !laneIds.has(st.lane));
  const nameOf = (l: Lane, i: number) => l.name.trim() || `Line ${String.fromCharCode(65 + (i % 26))}`;

  /* a result whose stations are numbered as the whole capacity numbers them,
     so a column of the V or a card opens the station it is */
  const global = (x: StationResult): StationResult => ({ ...x, index: at.get(x.station.id) ?? -1 });
  const globalise = (r: CapacityResult): CapacityResult => ({
    ...r,
    ok: r.ok.map(global),
    skipped: r.skipped.map(k => ({ ...k, index: at.get(k.station.id) ?? k.index })),
    ...(r.limit ? { limit: global(r.limit) } : {}),
    ...(r.next ? { next: global(r.next) } : {}),
    ...(r.limitAtRunning ? { limitAtRunning: global(r.limitAtRunning) } : {}),
  });

  const sections: LaneSection[] = lanes.map((l, i) => ({ id: l.id, name: nameOf(l, i), result: globalise(analyseChain({ stations: own(l.id) })) }));
  const live = sections.filter(x => x.result.ok.length > 0 && x.result.line != null);
  const notes: string[] = [];
  const target = cap.targetPerMin != null && cap.targetPerMin > 0 ? cap.targetPerMin : undefined;
  const unit = (live[0] ?? sections[0])?.result.unit ?? 'units';
  const base: CapacityResult = { unit, ok: [], skipped: [], target, sentence: '', notes, arrivals: {} };

  for (const x of sections) {
    x.result.skipped.forEach(k => base.skipped.push(k));
    x.result.notes.forEach(n => notes.push(`${x.name}: ${n}`));
    Object.assign(base.arrivals, x.result.arrivals);
  }
  if (live.length === 0) {
    return { ...base, lanes: { sections, sends: 0, heldBy: 'lanes' },
      sentence: sections.some(x => x.result.skipped.length) ? 'None of the stations can be counted yet — see what each one is missing.' : 'Add the stations each line goes through, in order, with how fast each one runs.' };
  }
  const sameUnit = live.every(x => x.result.unit.trim().toLowerCase() === unit.trim().toLowerCase());
  if (!sameUnit) notes.push(`The lines do not count in the same unit (${live.map(x => `${x.name}: ${x.result.unit}`).join(', ')}) — they are added as if they did.`);

  /* WHAT THE LINES SEND ON is what leaves them: each line's good off its
     end, its own rejects taken off — not what its first station has to be
     fed. The shared station after the merge is compared with what reaches
     it (docs/UPGRADE-AUDIT.md M4); `asked` is the lines' like-for-like at
     their start, which the whole's `line` is kept in, as a chain's is. */
  const asked = live.reduce((n, x) => n + (x.result.line as number), 0);
  const sends = live.reduce((n, x) => n + (x.result.goodOut ?? x.result.line ?? 0), 0);
  const goodFrac = asked > 0 ? sends / asked : 1;
  const per = `${unit}/min`;
  const names = (xs: LaneSection[]) => (xs.length <= 2 ? xs.map(x => x.name).join(' and ') : `${xs.slice(0, -1).map(x => x.name).join(', ')} and ${xs[xs.length - 1].name}`);

  /* AFTER THEY MERGE: what they send, and the shared stations */
  let merged: CapacityResult | undefined;
  if (shared.length > 0) {
    const lastOf = (l: LaneSection) => own(l.id)[own(l.id).length - 1];
    /* the first shared station says how many of the unit before it make one
       of its own — the lines' last unit — so it is put into the line's unit,
       which the merged chain is worked out in */
    const lastFactor = live[0].result.ok[live[0].result.ok.length - 1].factor;
    const lastIsLast = live[0].result.ok[live[0].result.ok.length - 1].station.id === lastOf(live[0])?.id;
    if (!lastIsLast) notes.push(`${live[0].name}: its last station is not counted, so what it sends on cannot be worked out.`);
    const first = shared[0];
    const feeder: Station = { id: MERGE_ID, name: `${names(live)} together`, kind: 'machine', unit, contains: 1, rate: sends, ratePer: 'min', crew: 1, source: 'plate', runningPct: 100, goodPct: 100 };
    /* typed in the unit before (a basket every 6 s) is typed in the lines'
       last unit: it is put into the line's, as the contains is */
    const before = first.speedIn === 'before';
    const chain: Station[] = [feeder, {
      ...first, contains: first.contains > 0 ? first.contains * lastFactor : first.contains,
      ...(before && first.rate != null ? { rate: first.rate * lastFactor } : {}),
      ...(before && first.perCycle != null ? { perCycle: first.perCycle * lastFactor } : {}),
    }, ...shared.slice(1)];
    merged = globalise(analyseChain({ stations: chain }));
    merged.ok = merged.ok.map(x => (x.station.id === MERGE_ID ? { ...x, index: -1 } : x));
    if (merged.limit?.station.id === MERGE_ID) merged = { ...merged, limit: { ...merged.limit, index: -1 } };
    merged.skipped.forEach(k => base.skipped.push(k));
    merged.notes.forEach(n => notes.push(n));
    Object.assign(base.arrivals, merged.arrivals);
  }

  const heldBy: 'lanes' | 'shared' = merged?.limit && merged.limit.station.id !== MERGE_ID ? 'shared' : 'lanes';
  /* the whole, like for like at the lines' start: held after the merge, the
     shared station's limit is what reaches it — the lines' start has to feed
     that much more, their rejects put back; held by the lines, their own */
  const total = heldBy === 'shared' && merged && merged.line != null && goodFrac > 0 ? merged.line / goodFrac : asked;
  const sharedOk = merged ? merged.ok.filter(x => x.station.id !== MERGE_ID) : [];
  const lanesLimit = live.map(x => x.result.limit as StationResult).sort((p, q) => p.effective - q.effective)[0];
  const lanesRun = live.map(x => x.result.limitAtRunning).filter((x): x is StationResult => !!x).sort((p, q) => p.running - q.running)[0];
  const limit = heldBy === 'shared' ? (merged?.limit as StationResult) : lanesLimit;

  base.ok = [...live.flatMap(x => x.result.ok), ...sharedOk];
  base.limit = limit;
  base.limitAtRunning = heldBy === 'shared' ? (merged?.limitAtRunning && merged.limitAtRunning.station.id !== MERGE_ID ? merged.limitAtRunning : limit) : lanesRun ?? limit;
  base.line = total;
  /* good off the end: the merged chain takes the shared stations' rejects off
     what the lines send; with nothing after the merge it is what they send */
  base.goodOut = merged && merged.line != null ? (merged.goodOut ?? merged.line) : sends;
  if (target != null) base.gap = target - total;
  const tgt = target == null ? '' : (base.gap as number) > 0 ? ` — ${fmtN(base.gap as number)} short of the ${fmtN(target)} target` : ` — above the ${fmtN(target)} target`;
  const nm = (x: StationResult) => x.station.name.trim() || `Station ${x.index + 1}`;
  if (heldBy === 'shared' && limit) {
    /* the shared station's figure is its own, in the unit that arrives at it;
       the whole's headline (like for like at the lines' start, their rejects
       put back) is said beside it when the two differ — "holds to 94 — 90
       arrive at it" read as holding to more than arrived (the review of M4) */
    const takes = merged?.line ?? total;
    const alike = Math.abs(takes - total) >= 0.05 ? ` (${fmtN(total)} ${per} like for like at the lines’ start)` : '';
    base.sentence = `${nm(limit)} holds ${live.length === 1 ? live[0].name : names(live)} to ${fmtN(takes)} ${per}${live.length > 1 ? ' together' : ''} — ${fmtN(sends)} ${per} arrive at it${alike}${tgt}.`;
  } else {
    const each = live.map(x => `${x.name} is held by ${nm(x.result.limit as StationResult)} at ${fmtN(x.result.line as number)}`).join('; ');
    const out = `${names(live)} make${live.length === 1 ? 's' : ''} ${fmtN(sends)} ${per}${live.length > 1 ? ' together' : ''}${tgt}. ${each}.`;
    const room = merged?.limit && merged.limit.station.id === MERGE_ID && merged.next ? ` ${nm(merged.next)} can take ${fmtN(merged.next.effective)}, so it is not what limits them.` : '';
    base.sentence = out + room;
  }
  if (base.skipped.length) base.sentence += ` ${base.skipped.length} station${base.skipped.length === 1 ? '' : 's'} not counted yet.`;
  base.lanes = { sections, ...(merged ? { merged } : {}), sends, heldBy };
  return base;
}

/** A unit said once — "baskets" → "basket", "boxes" → "box". Typed units
 *  are usually plural; one of them reads in the singular. */
export const oneOf = (unit: string): string => {
  const u = unit.trim();
  if (!u) return 'one';
  if (/ies$/i.test(u)) return u.replace(/ies$/i, 'y');
  if (/(ss|sh|ch|x)es$/i.test(u)) return u.replace(/es$/i, '');
  return u.replace(/s$/i, '');
};

/** Seconds as a person reads a stopwatch: 6.9 s, 12 s. */
export const fmtSec = (sec: number): string => `${String(Number(sec.toFixed(sec < 10 ? 1 : 0)))} s`;

/** A longer wait as a person says it: 8.6 s, 45 s, 5 min 9 s, 1 h 20 min. */
export function fmtDur(sec: number): string {
  if (sec < 90) return fmtSec(sec);
  const m = Math.round(sec);
  if (m < 3600) { const mm = Math.floor(m / 60), ss = m % 60; return ss ? `${mm} min ${ss} s` : `${mm} min`; }
  const h = Math.floor(m / 3600), mm = Math.round((m % 3600) / 60);
  return mm ? `${h} h ${mm} min` : `${h} h`;
}

/** A time as it was typed, as a person says it: 8 s, 12.5 s, 5 min, 1 min 40 s. */
export const everyWords = (sec: number): string => (sec < 90 ? `${fmtN(sec)} s` : fmtDur(sec));

/** A cycle as typed: "a pallet every 5 min", "2 baskets every 20 s". */
export const cycleWords = (perCycle: number, cycleSec: number, unit: string): string =>
  perCycle === 1 ? `a ${oneOf(unit)} every ${everyWords(cycleSec)}` : `${fmtN(perCycle)} ${unit.trim() || 'units'} every ${everyWords(cycleSec)}`;

/* ======================== a rate that reads like a time ======================
 * Rowland, 14 October: "counts in pallets, each pallet holds 36 baskets ...
 * 5 ... it says 5 pallets a minute ... well, it isn't ... it takes 5 minutes
 * to do one pallet." A rate many times what reaches the station whose
 * reading as "one every N" is close to it is the time typed in the rate's
 * box. Asked, with the time offered — never changed by itself. */
export interface RateAsTime {
  /** "5 pallets a minute is 1,800 units a minute — 26 times what reaches them." */
  says: string;
  /** "One pallet every 5 minutes?" */
  ask: string;
  /** What "Make it…" puts on the station. */
  cycleSec: number; cycleIn?: 'min';
  /** "a pallet every 5 min" — the button's words. */
  every: string;
}
export function rateAsTime(r: CapacityResult, s: Station, prevUnit?: string): RateAsTime | undefined {
  const a = r.arrivals[s.id];
  const per = s.ratePer ?? 'min';
  if (!a || !(a.perMin > 0) || s.rate == null || !(s.rate > 0) || per === 'hour') return undefined;
  const own = perMinute(s);
  if (own == null || own < a.perMin * 5) return undefined;
  const before = s.speedIn === 'before' && s.contains > 0 && !!prevUnit?.trim();
  const k = before ? s.contains : 1;
  const cycleSec = s.rate * (per === 'min' ? 60 : 1);
  const read = 60 / cycleSec / k;                       // read as one every N, in its own unit a minute
  if (read < a.perMin / 2 || read > a.perMin * 2) return undefined;
  const unit = (before ? (prevUnit as string) : s.unit).trim() || 'units';
  const factor = r.ok.find(x => x.station.id === s.id)?.factor;
  const atLine = factor != null && Math.abs(factor - 1) > 1e-9 ? ` is ${fmtBig(own * factor)} ${r.unit} a minute —` : ' —';
  const who = s.kind === 'people' ? 'them' : 'it';
  const time = per === 'min' ? `${fmtN(s.rate)} ${s.rate === 1 ? 'minute' : 'minutes'}` : `${fmtN(s.rate)} seconds`;
  return {
    says: `${fmtN(s.rate)} ${unit} ${PER_MIN_WORD[per]}${atLine} ${fmtBig(own / a.perMin)} times what reaches ${who}.`,
    ask: `One ${oneOf(unit)} every ${time}?`,
    cycleSec, ...(per === 'min' ? { cycleIn: 'min' as const } : {}),
    every: cycleWords(1, cycleSec, unit),
  };
}

export interface PaceSays {
  /** "A tray reaches them every 6.9 s — 8.75 a minute: Bagger does 70 bags a
   *  minute, 8 to a tray." Absent at the front of the line. */
  arrive?: string;
  /** Whether it keeps up, in seconds for a person: "They take 8 s a tray —
   *  1.1 s too slow: they hold the line back. It needs 2 people to keep up." */
  verdict?: string;
  /** Short of what reaches it. */
  short: boolean;
  /** People needed to keep up with what reaches them, when that is more than
   *  are there. */
  needed?: number;
  /** FED STRAIGHT BY A MACHINE OR A PERSON, nothing collecting between, and
   *  loaded past what a person sustains (docs/CAPACITY.md §1): "Fed straight
   *  by the Bagger with nothing collecting between — loaded to 95%: …". */
  paced?: string;
}

/** HOW FULL A PERSON FED STRAIGHT BY THE STEP BEFORE MAY BE LOADED — what
 *  reaches them over what they can do at their planning pace. A person's
 *  time varies piece to piece and person to person (one operator to another
 *  often 1 : 2 — Johnson, 1981), and fed cycle for cycle with nothing
 *  collecting between they lose the long cycles (machine pacing: Salvendy &
 *  Smith, 1981); the practice loads them to 80–90%, not 100. */
export const PACED_LOAD_MAX = 0.9;

/** WHAT A STATION IS ASKED TO DO, AND WHETHER IT DOES IT — worked out from the
 *  line before it (Rowland, 13 October: "70 a minute. How many go into a
 *  basket? 10. So one basket goes to a human every X"). A person is said in
 *  seconds a piece, the way they are timed; a machine in its rate. */
export function paceSays(r: CapacityResult, s: Station, prevUnit?: string,
  /** The station before it — whether a person is fed straight by it. */
  prev?: Pick<Station, 'name' | 'kind' | 'bufferAfter'>): PaceSays {
  const a = r.arrivals[s.id];
  /* TIMED PER THE UNIT BEFORE — a palletiser per basket: said per basket,
     the pallet beside it (Rowland, 14 October) */
  const before = s.speedIn === 'before' && s.contains > 0 && !!prevUnit?.trim();
  const k = before ? s.contains : 1;
  const one = oneOf(before ? (prevUnit as string) : s.unit);
  const whole = oneOf(s.unit);
  const people = s.kind === 'people';
  const who = people ? 'them' : 'it';
  const arrive = a
    ? (before
      ? `A ${one} reaches ${who} every ${fmtDur(a.everySec / k)} — ${fmtN(a.perMin * k)} a minute; a full ${whole} of ${fmtN(k)} every ${fmtDur(a.everySec)}: ${a.from.name} does ${fmtN(a.from.perMin)} ${a.from.unit} a minute.`
      : `A ${one} reaches ${who} every ${fmtDur(a.everySec)} — ${fmtN(a.perMin)} a minute: ${a.from.name} does ${fmtN(a.from.perMin)} ${a.from.unit} a minute${Math.abs(a.ratio - 1) > 1e-9 ? `, ${fmtN(a.ratio)} to a ${one}` : ''}.`)
    : undefined;
  /* the pace to plan on: a person's timed time with their rest allowance */
  const speed = planPerMinute(s);
  if (speed == null) {
    return { ...(arrive ? { arrive } : {}), verdict: people ? `Time how long one ${one} takes them.` : `Give it its speed to see whether it keeps up.`, short: false };
  }
  const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
  const running = pct(s.runningPct, 1) || 1;
  const does = speed * crew * running;             // its own unit a minute
  const each = 60 / speed / k;                     // one of what it is timed per, one of them, rest in it
  const allow = allowanceOf(s);
  const timedEach = each / (1 + allow);            // as timed or typed
  const unitSaid = before ? (prevUnit as string).trim() : (s.unit.trim() || 'units');
  const takes = `They take ${fmtDur(allow > 0 ? timedEach : each)} a ${one}${crew > 1 ? ` each, ${crew} of them` : ''}${allow > 0 ? ` — ${fmtDur(each)} with ${fmtN(allow * 100)}% rest` : ''}`;
  if (!a) {
    return { verdict: people ? `${takes} — ${fmtN(does * k)} a minute.` : `It does ${fmtN(does * k)} ${unitSaid} a minute.`, short: false };
  }
  const slower = does < a.perMin - 1e-9;
  /* ONLY THE BOTTLENECK HOLDS THE LINE BACK (Rowland, 15 October: "the UI
     logic is massively bad"). A station a little slower than the one feeding
     it makes the one before wait — it is not what limits the line unless it
     is the slowest: the line's, or its own line's when several feed in.
     Red is kept for that one; the rest are said plainly, naming where the
     line is held. */
  const short = slower && r.limit?.station.id === s.id;
  const heldAt = r.limit?.station.name.trim();
  /* a line's own slowest, when several feed in: it holds its own line, not the whole */
  const ownLine = r.lanes?.sections.find(x => x.result.limit?.station.id === s.id && r.limit?.station.id !== s.id);
  const notIt = heldAt && r.limit?.station.id !== s.id
    ? ownLine ? ` — it sets ${ownLine.name}'s pace, but the line as a whole is held at the ${heldAt}` : ` — the line is held at the ${heldAt}, not here`
    : '';
  const needed = Math.ceil(a.perMin / (speed * running) - 1e-9);
  if (!people) {
    return { ...(arrive ? { arrive } : {}), verdict: short ? `It does ${fmtN(does * k)} a minute — holds the line back.`
      : slower ? `It does ${fmtN(does * k)} a minute — a little under what reaches it, so the one before waits${notIt}.`
        : `It does ${fmtN(does * k)} a minute — keeps up${does - a.perMin > 1e-9 ? `, ${fmtN((does - a.perMin) * k)} to spare` : ''}.`, short };
  }
  const gapSec = Math.abs(60 / does - a.everySec) / k;
  const verdict = short
    ? `${takes} — ${fmtDur(gapSec)} too slow: they hold the line back. It needs ${needed} ${needed === 1 ? 'person' : 'people'} to keep up.`
    : slower ? `${takes} — ${fmtDur(gapSec)} slower than what reaches them, so the one before waits${notIt}. To keep up on their own it needs ${needed} ${needed === 1 ? 'person' : 'people'}.`
      : `${takes} — they keep up${gapSec > 0.05 ? `, ${fmtDur(gapSec)} to spare a ${one}` : ''}.`;
  /* FED STRAIGHT, nothing collecting between, loaded past what a person sustains */
  const load = a.perMin / does;
  const paced = prev && !short && !(prev.bufferAfter != null && prev.bufferAfter > 0) && load > PACED_LOAD_MAX + 1e-9
    ? `Fed straight by ${prev.name.trim() || 'the step before'} with nothing collecting between — loaded to ${fmtN(Math.round(load * 100))}% of their pace. A person can’t match ${prev.kind === 'machine' ? 'a machine' : 'another person'} piece for piece: plan them at 80–90%, or let some collect before them.`
    : undefined;
  return { ...(arrive ? { arrive } : {}), verdict, short, ...(short && needed > crew ? { needed } : {}), ...(paced ? { paced } : {}) };
}

/** The finding in a few words, for a list of lines or a page header: "Basketer
 *  limits at 62 bags/min · 4 short of 66". Undefined until something can be
 *  counted. The full sentence is `sentence`; this is the part that fits a row. */
export function shortSays(r: CapacityResult): string | undefined {
  if (!r.limit || r.line == null) return undefined;
  const nm = r.limit.station.name.trim() || `Station ${r.limit.index + 1}`;
  const tgt = r.target == null ? '' : (r.gap as number) > 0 ? ` · ${fmtN(r.gap as number)} short of ${fmtN(r.target)}` : ` · target ${fmtN(r.target)} met`;
  /* several lines have no single "next": each is counted on its own */
  return r.next || r.lanes ? `${nm} limits at ${fmtN(r.line)} ${r.unit}/min${tgt}` : `${nm} runs ${fmtN(r.line)} ${r.unit}/min — add the rest of the line`;
}

/** WHAT THE LINE CAN MAKE, in the words a target sits beside — "can make
 *  100 bags a minute": its limit once stops are counted. A 6M job shows it
 *  under each line's target, so a target far below what the line can make
 *  is seen as one (flow audit #8). Undefined until the line can be worked out. */
export function canMakeWords(r: CapacityResult): string | undefined {
  if (!r.limit || r.line == null) return undefined;
  return `can make ${fmtN(r.line)} ${r.unit} a minute`;
}

/* ======================== SCREENING THE NUMBERS ===============================
 * Rowland, 15 October, looking at his own Line capacity — a target of 150 a
 * minute, and 319%, 279% and 273% on the V: "These percentages make no
 * sense ... I want you to screen it for problems."
 *
 * They were right and told him nothing: each is a station's speed against the
 * BOTTLENECK's (the pallet wrapper, 50.1 a minute — one person, two pallets
 * every 12 minutes), not against the target. The thing to say is that the
 * bottleneck is a third of the target and is it typed right. Three screens,
 * each only when it is so, each said in the words a person would say it — a
 * question, never a change made by itself (CLAUDE.md: measured by people):
 *
 *   short    the line makes under three quarters of its target: what holds it,
 *            how it is typed, what it would need to reach the target
 *   steep    a station running at twice the bottleneck or more: it is the
 *            bottleneck that is slow, or a speed or a unit that is mistyped
 *   twice    a person's rest allowance AND a running % of about its inverse:
 *            the same time taken off twice
 *
 * Read by the page above the V (screens/CapacityPanel) and by the paper's
 * "To check before the sums are trusted" (lib/capacityPaper). Pure. */
export interface CapCheck {
  /** r: the line cannot do what it is asked · a: look at this number. */
  tone: 'r' | 'a';
  text: string;
  /** The station to open, when one is the answer. */
  station?: number;
}

export function screenCapacity(cap: Capacity, r: CapacityResult): CapCheck[] {
  if (r.lanes) return screenLanes(cap, r);
  const out: CapCheck[] = [];
  const limit = r.limit;
  if (!limit || r.line == null || !(r.line > 0) || r.ok.length < 2) return out;
  const nm = (x: StationResult) => x.station.name.trim() || `Station ${x.index + 1}`;
  const per = `${r.unit} a minute`;
  const line = r.line;

  /* THE BOTTLENECK FAR SHORT OF THE TARGET */
  if (r.target != null && line < r.target * 0.75) {
    const s = limit.station;
    const unit = s.unit.trim() || 'units';
    const typed = !(s.rate != null && s.rate > 0) && s.cycleSec != null && s.cycleSec > 0 && s.perCycle != null && s.perCycle > 0
      ? cycleWords(s.perCycle, s.cycleSec, unit)
      : s.rate != null && s.rate > 0 ? `${fmtN(s.rate)} ${unit} ${PER_WORD[s.ratePer ?? 'min']}` : undefined;
    const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
    const need = Math.ceil(crew * (r.target / line) - 1e-9);
    const needs = s.kind === 'people' ? `${fmtN(need)} ${need === 1 ? 'person' : 'people'} at it (it has ${fmtN(crew)})` : `${fmtN(need)} of them running (it has ${fmtN(crew)})`;
    out.push({ tone: 'r', station: limit.index,
      text: `${nm(limit)} holds the line to ${fmtN(line)} ${per} — ${fmtN(Math.round((line / r.target) * 100))}% of the ${fmtN(r.target)} target.${typed ? ` It is typed as ${typed}: is that right?` : ''} To make ${fmtN(r.target)} it would need ${needs}.` });
  }

  /* A V THAT STEEP */
  const steep = r.ok.filter(x => x.index !== limit.index && x.effective >= 2 * line);
  if (steep.length) {
    const list = steep.map(x => `${nm(x)} ${fmtN(Math.round((x.effective / line) * 100))}%`).join(' · ');
    out.push({ tone: 'a', station: limit.index,
      text: `${list} — those are against ${nm(limit)}’s ${fmtN(line)} ${per}, not against the ${r.target != null ? `${fmtN(r.target)} target` : 'target'}. A V this steep usually means ${nm(limit)}’s speed or a unit conversion is mistyped, or the other stations are far bigger than the line needs.` });
  }

  /* A PERSON'S REST TAKEN OFF TWICE */
  for (const x of r.ok) {
    const s = x.station;
    const a = allowanceOf(s);
    if (a <= 0 || s.runningPct == null) continue;
    if (Math.abs(s.runningPct - 100 / (1 + a)) > 1.5) continue;
    const once = x.effective / (s.runningPct / 100);
    out.push({ tone: 'a', station: x.index,
      text: `${nm(x)}: the ${fmtN(a * 100)}% rest allowance and a running of ${fmtN(s.runningPct)}% both take time off. If the ${fmtN(s.runningPct)}% is the same rest, it is counted twice — ${fmtN(once)} a minute instead of ${fmtN(x.effective)}.` });
  }
  void cap;
  return out.sort((p, q) => (p.tone === q.tone ? 0 : p.tone === 'r' ? -1 : 1));
}

/** SEVERAL LINES, SCREENED: the whole against its target; each line against
 *  its own bottleneck (a V is steep or not along ONE line); a rest taken off
 *  twice anywhere. A finding every line shares is said once, naming them all. */
function screenLanes(cap: Capacity, r: CapacityResult): CapCheck[] {
  const out: CapCheck[] = [];
  const view = r.lanes as LanesView;
  const limit = r.limit;
  if (!limit || r.line == null || !(r.line > 0)) return out;
  const nm = (x: StationResult) => x.station.name.trim() || `Station ${x.index + 1}`;
  const per = `${r.unit} a minute`;
  const total = r.line;
  const live = view.sections.filter(x => x.result.ok.length > 0 && x.result.line != null);
  const list = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const typedOf = (s: Station) => {
    const unit = s.unit.trim() || 'units';
    return !(s.rate != null && s.rate > 0) && s.cycleSec != null && s.cycleSec > 0 && s.perCycle != null && s.perCycle > 0
      ? cycleWords(s.perCycle, s.cycleSec, unit)
      : s.rate != null && s.rate > 0 ? `${fmtN(s.rate)} ${unit} ${PER_WORD[s.ratePer ?? 'min']}` : undefined;
  };
  const crewOf = (s: Station) => (s.crew != null && s.crew > 0 ? s.crew : 1);
  const needWords = (s: Station, n: number) => (s.kind === 'people' ? `${fmtN(n)} ${n === 1 ? 'person' : 'people'} at it (it has ${fmtN(crewOf(s))})` : `${fmtN(n)} of them running (it has ${fmtN(crewOf(s))})`);

  /* THE WHOLE FAR SHORT OF ITS TARGET */
  if (r.target != null && total < r.target * 0.75) {
    const pct = fmtN(Math.round((total / r.target) * 100));
    if (view.heldBy === 'shared') {
      const typed = typedOf(limit.station);
      /* what the shared station takes is its own figure, in the unit that
         arrives; what arrives (good) over the whole's like-for-like figure
         (rejects put back) said 2 of them would do where 3 are needed (the
         review of M4) */
      const takesAt = view.merged?.line ?? total;
      const takes = Math.ceil(crewOf(limit.station) * (view.sends / takesAt) - 1e-9);
      const alike = Math.abs(takesAt - total) >= 0.05 ? ` (${fmtN(total)} ${per} like for like at the lines’ start)` : '';
      const lines = live.map(x => x.name);
      out.push({ tone: 'r', station: limit.index,
        text: `${nm(limit)} holds ${list(lines)} to ${fmtN(takesAt)} ${per}${lines.length > 1 ? ' together' : ''}${alike} — ${pct}% of the ${fmtN(r.target)} target. They send it ${fmtN(view.sends)}.${typed ? ` It is typed as ${typed}: is that right?` : ''} To take all they send it would need ${needWords(limit.station, takes)}${view.sends < r.target ? ` — and they send ${fmtN(view.sends)}, short of ${fmtN(r.target)} themselves, so they need lifting too` : ''}.` });
    } else {
      const each = live.map(x => `${x.name} is held by ${nm(x.result.limit as StationResult)} at ${fmtN(x.result.line as number)}`).join('; ');
      const needs = live.map(x => {
        const l = x.result.limit as StationResult;
        return `${nm(l)} in ${x.name}: ${needWords(l.station, Math.ceil(crewOf(l.station) * (r.target as number) / total - 1e-9))}`;
      }).join('; ');
      out.push({ tone: 'r', station: limit.index,
        text: `${list(live.map(x => x.name))} make ${fmtN(total)} ${per} together — ${pct}% of the ${fmtN(r.target)} target. ${each}. To make ${fmtN(r.target)} each line, as it runs, would need ${needs}.` });
    }
  }

  /* A LINE'S V THAT STEEP, against that line's own bottleneck */
  const groups = new Map<string, string[]>();
  const stationOf = new Map<string, number>();
  for (const sec of live) {
    const l = sec.result.limit as StationResult | undefined;
    if (!l || sec.result.line == null) continue;
    const steep = sec.result.ok.filter(x => x.index !== l.index && x.effective >= 2 * (sec.result.line as number));
    if (!steep.length) continue;
    const body = `${steep.map(x => `${nm(x)} ${fmtN(Math.round((x.effective / (sec.result.line as number)) * 100))}%`).join(' · ')} — those are against ${nm(l)}’s ${fmtN(sec.result.line as number)} ${per}, not against the target. A V this steep usually means ${nm(l)}’s speed or a unit conversion is mistyped, or the stations before it are far bigger than the line needs.`;
    groups.set(body, [...(groups.get(body) ?? []), sec.name]);
    if (!stationOf.has(body)) stationOf.set(body, l.index);
  }
  for (const [body, names] of groups) out.push({ tone: 'a', station: stationOf.get(body) as number, text: `${list(names)}: ${body}` });

  /* A PERSON'S REST TAKEN OFF TWICE, anywhere */
  const twice = new Map<string, { names: string[]; station: number }>();
  for (const x of r.ok) {
    const st = x.station;
    const a = allowanceOf(st);
    if (a <= 0 || st.runningPct == null) continue;
    if (Math.abs(st.runningPct - 100 / (1 + a)) > 1.5) continue;
    const once = x.effective / (st.runningPct / 100);
    const where = view.sections.find(sec => sec.result.ok.some(y => y.station.id === st.id))?.name;
    const body = `${nm(x)}: the ${fmtN(a * 100)}% rest allowance and a running of ${fmtN(st.runningPct)}% both take time off. If the ${fmtN(st.runningPct)}% is the same rest, it is counted twice — ${fmtN(once)} a minute instead of ${fmtN(x.effective)}.`;
    const key = `${where ? 'lane:' : ''}${body}`;
    const cur = twice.get(key);
    twice.set(key, { names: [...(cur?.names ?? []), ...(where ? [where] : [])], station: cur?.station ?? x.index });
  }
  for (const [key, v] of twice) out.push({ tone: 'a', station: v.station, text: v.names.length ? `${list(v.names)}, ${key.replace(/^lane:/, '').replace(/^./, c => c.toLowerCase())}` : key });
  void cap;
  return out.sort((p, q) => (p.tone === q.tone ? 0 : p.tone === 'r' ? -1 : 1));
}

/* =========================== what a pack costs ============================
 * Labour's cost per pack: the people on the line × what one costs an hour,
 * over the good packs the line makes an hour (its bottleneck, its rejects
 * taken off). The practice's "labour cost per unit" — the number that says
 * whether one more person pays for themselves: they cost an hour's rate, and
 * they lift the line only as far as the next station lets it. */

export interface LabourCost {
  people: number;
  ratePerHour: number;
  /** £ an hour, all of them. */
  perHour: number;
  /** Good packs an hour, in the line's unit. */
  packsPerHour: number;
  /** £ a pack. */
  perPack: number;
}

/** What the line's labour costs a pack, or nothing until the line makes
 *  something and the people and their rate are known. */
export function labourCost(r: CapacityResult, people: number | undefined, ratePerHour: number | undefined): LabourCost | undefined {
  const out = r.goodOut ?? r.line;
  if (!(out != null && out > 0) || !(people != null && people > 0) || !(ratePerHour != null && ratePerHour > 0)) return undefined;
  const perHour = people * ratePerHour, packsPerHour = out * 60;
  return { people, ratePerHour, perHour, packsPerHour, perPack: perHour / packsPerHour };
}

/** WHO AND WHAT, FOR THE COST — typed on this capacity, else the people
 *  placed on the product's line standard, else the line's crew; the rate
 *  typed, else the line's own (its wage × its on-costs, Stage 1). Said where
 *  each came from, so a stand-in is never mistaken for a decision. */
export interface LabourInputs {
  people?: number; peopleFrom?: 'typed' | 'map' | 'line';
  rate?: number; rateFrom?: 'typed' | 'line';
}
export function labourInputs(cap: Pick<Capacity, 'labour'> | undefined, mapPeople: number | undefined,
  line?: { crew?: number; labourRatePerHour?: number; labourBurden?: number }): LabourInputs {
  const tp = cap?.labour?.people, tr = cap?.labour?.ratePerHour;
  const out: LabourInputs = {};
  if (tp != null && tp > 0) { out.people = tp; out.peopleFrom = 'typed'; }
  else if (mapPeople != null && mapPeople > 0) { out.people = mapPeople; out.peopleFrom = 'map'; }
  else if (line?.crew != null && line.crew > 0) { out.people = line.crew; out.peopleFrom = 'line'; }
  if (tr != null && tr > 0) { out.rate = tr; out.rateFrom = 'typed'; }
  else if (line?.labourRatePerHour != null && line.labourRatePerHour > 0) {
    out.rate = line.labourRatePerHour * (line.labourBurden != null && line.labourBurden > 0 ? line.labourBurden : 1);
    out.rateFrom = 'line';
  }
  return out;
}

/** A count as it is read off a board: 3,600. */
export const fmtBig = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** Money as a person says it: under a pound in pence (2.8p), else pounds. */
export const fmtMoney = (gbp: number): string =>
  Math.abs(gbp) < 1 ? `${String(Number((gbp * 100).toFixed(gbp * 100 < 10 ? 2 : 1)))}p` : `£${gbp.toFixed(2)}`;

/** The people working in the stations that are people — what a what-if or
 *  "one more person" adds to, or takes from, the line's people. */
export const peopleInStations = (stations: readonly Station[]): number =>
  stations.filter(s => s.kind === 'people').reduce((n, s) => n + (s.crew != null && s.crew > 0 ? s.crew : 1), 0);

export interface MorePeople {
  /** The station one more person goes to — the bottleneck, when it is people. */
  station: Station;
  /** The line as it would run. */
  r: CapacityResult;
  now: LabourCost;
  then: LabourCost;
  /** "One more person at Tray packer: …" */
  sentence: string;
  /** Lower cost a pack — they pay for themselves. */
  cheaper: boolean;
}

/** ONE MORE PERSON AT THE BOTTLENECK — when people set the pace: what the
 *  line would make, what it would cost, and whether a pack costs more or
 *  less. Nothing when the bottleneck is a machine (a person there adds cost
 *  and no packs) or the cost is not known. */
export function oneMorePerson(cap: Capacity, r: CapacityResult, people: number | undefined, ratePerHour: number | undefined): MorePeople | undefined {
  const lim = r.limit;
  const now = labourCost(r, people, ratePerHour);
  if (!lim || lim.station.kind !== 'people' || !now) return undefined;
  const station = lim.station;
  const crew = station.crew != null && station.crew > 0 ? station.crew : 1;
  const stations = cap.stations.map(s => (s.id === station.id ? { ...s, crew: crew + 1 } : s));
  const r2 = analyse({ ...cap, stations });
  const then = labourCost(r2, now.people + 1, now.ratePerHour);
  if (!then) return undefined;
  const nm = station.name.trim() || `Station ${lim.index + 1}`;
  const one = oneOf(r.unit);
  const nextName = r2.limit && r2.limit.station.id !== station.id ? ` (${r2.limit.station.name.trim() || `Station ${r2.limit.index + 1}`} then limits)` : '';
  const diff = then.perPack - now.perPack;
  const cheaper = diff < -1e-12;
  const sentence = `One more person at ${nm}: the line makes ${fmtBig(then.packsPerHour)} ${r.unit} an hour instead of ${fmtBig(now.packsPerHour)}${nextName} — ${fmtMoney(then.perHour)} an hour, ${fmtMoney(then.perPack)} a ${one} instead of ${fmtMoney(now.perPack)}: `
    + (cheaper ? `${fmtMoney(-diff)} a ${one} lower — they pay for themselves.`
      : Math.abs(diff) <= 1e-12 ? 'the same a ' + one + '.'
        : `${fmtMoney(diff)} a ${one} higher — the packs they add do not pay for them.`);
  return { station, r: r2, now, then, sentence, cheaper };
}

/** A what-if's labour against the line as run: its people are the line's,
 *  changed by what its stations of people change. */
export function whatIfLabour(asRun: Capacity, rAsRun: CapacityResult, w: Capacity, rW: CapacityResult, people: number | undefined, ratePerHour: number | undefined): { now: LabourCost; then: LabourCost; sentence: string } | undefined {
  const now = labourCost(rAsRun, people, ratePerHour);
  if (!now) return undefined;
  const delta = peopleInStations(w.stations) - peopleInStations(asRun.stations);
  const then = labourCost(rW, now.people + delta, now.ratePerHour);
  if (!then) return undefined;
  const one = oneOf(rAsRun.unit);
  const diff = then.perPack - now.perPack;
  const ppl = delta === 0 ? 'the same people' : `${delta > 0 ? delta : -delta} ${Math.abs(delta) === 1 ? 'person' : 'people'} ${delta > 0 ? 'more' : 'fewer'}`;
  const sentence = `Labour: ${ppl}, ${fmtMoney(then.perPack)} a ${one} against ${fmtMoney(now.perPack)} as run — ${Math.abs(diff) <= 1e-12 ? 'the same' : `${fmtMoney(Math.abs(diff))} ${diff < 0 ? 'lower' : 'higher'}`}.`;
  return { now, then, sentence };
}

/** What would the line do if this station were brought up to `to` (in the
 *  line's unit per minute)? The answer is capped by whatever limits next —
 *  the honest "what is it worth" for any improvement. */
export function lineIfRaised(r: CapacityResult, index: number, to: number): number | undefined {
  if (!r.ok.length) return undefined;
  const others = r.ok.filter(x => x.index !== index).map(x => x.effective);
  return Math.min(to, ...(others.length ? others : [Infinity]));
}

/* ======================= stops: from the timed log ======================== */

export interface StopStats { ownMins: number; waitMins: number; events: number; /** Its own stops, counted — for the typical stop's length. */ ownEvents?: number;
  /** Of its own minutes, those logged as changeovers — the line's planned
   *  stop, left out of its running share when SMED's come off the shift. */
  changeoverMins?: number }

/** Starved or blocked by a neighbour — not the station's own fault. */
export const isWaiting = (o: Pick<Observation, 'category' | 'subcategory'>): boolean =>
  /^wait/i.test((o.category || '').trim()) || /starv|block/i.test(o.subcategory || '');

/** Each station's timed stops over a window, own and waiting kept apart.
 *  Matched on the machine name the stop was logged against. */
export function stopStats(obs: Observation[], stations: Station[], from: number, to: number): Record<string, StopStats> {
  const out: Record<string, StopStats> = {};
  for (const s of stations) out[s.id] = { ownMins: 0, waitMins: 0, events: 0, ownEvents: 0, changeoverMins: 0 };
  const key = (s: Station) => norm(s.asset?.trim() || s.name);
  for (const o of obs) {
    if (o.deletedAt || !(o.durationMs > 0) || o.startedAt < from || o.startedAt >= to) continue;
    const st = stations.find(s => key(s) && key(s) === norm(o.asset || ''));
    if (!st) continue;
    const m = o.durationMs / 60_000;
    const slot = out[st.id];
    if (isWaiting(o)) slot.waitMins += m;
    else { slot.ownMins += m; slot.ownEvents = (slot.ownEvents ?? 0) + Math.max(1, o.count || 1); if (isChangeoverStop(o)) slot.changeoverMins = (slot.changeoverMins ?? 0) + m; }
    slot.events += Math.max(1, o.count || 1);
  }
  return out;
}

/** A running percentage SUGGESTED from the stops — only when planned hours are
 *  known, and only ever offered, never applied. `weeks` is the window length. */
export function suggestRunning(ownMins: number, plannedHoursPerWeek: number | undefined, weeks: number): number | undefined {
  if (!plannedHoursPerWeek || plannedHoursPerWeek <= 0 || !(ownMins > 0) || weeks <= 0) return undefined;
  const planned = plannedHoursPerWeek * 60 * weeks;
  return Math.max(0, Math.min(100, Math.round((1 - ownMins / planned) * 100)));
}

/** THE CROSS-CHECK. The real bottleneck is never starved or blocked by others:
 *  everything before it waits for it, everything after it is starved by it. So
 *  if the sums name a station that is often waiting while another hardly ever
 *  does, one of the speeds is probably wrong — say so, and say which to check. */
export function crossCheck(r: CapacityResult, stats: Record<string, StopStats>): string | undefined {
  const limit = r.limit;
  if (!limit) return undefined;
  const have = r.ok.filter(x => {
    const s = stats[x.station.id];
    return !!s && s.ownMins + s.waitMins > 0;
  });
  if (have.length < 2) return undefined;
  const wait = (x: StationResult) => stats[x.station.id].waitMins;
  const lim = stats[limit.station.id];
  if (!lim || lim.ownMins + lim.waitMins === 0) return undefined;
  const least = [...have].sort((a, b) => wait(a) - wait(b))[0];
  if (least.index === limit.index) return undefined;
  if (wait(limit) < 30 || wait(limit) < 2 * wait(least)) return undefined;
  const nm = (x: StationResult) => x.station.name.trim() || `Station ${x.index + 1}`;
  return `${nm(limit)} comes out as the limit, but it spent ${Math.round(wait(limit))} min waiting on its neighbours while ${nm(least)} hardly waited (${Math.round(wait(least))} min) — worth checking ${nm(least)}’s speed.`;
}

/* ============================== a blank station ============================ */

export function blankStation(id: string, kind: StationKind, first: boolean): Station {
  /* a machine goes by its plate speed (docs/CAPACITY.md §1); a person is timed */
  /* After the first, how many of the one before make one is ASKED, never
     taken as one: a tray of 8 left at 1 gave a person eight times their
     speed, silently (Rowland, 13 October: "very strange numbers"). The same
     unit as the one before is one for one, said when the unit is typed. */
  return { id, name: '', kind, unit: first ? 'units' : '', contains: first ? 1 : 0, ratePer: 'min', crew: 1, source: kind === 'machine' ? 'plate' : 'estimate' };
}

/* ================================ what-ifs ================================= */

const nm = (s: Station, i: number) => s.name.trim() || `Station ${i + 1}`;
const speedWords = (s: Station): string => {
  const v = perMinute(s);
  return v == null ? 'no speed' : `${fmtN(v)} ${s.unit.trim() || 'units'} a minute`;
};
const PER_WORD: Record<RatePer, string> = { sec: 'a second', min: 'a minute', hour: 'an hour' };
const byRate = (s: Station) => s.rate != null && s.rate > 0;
const byCycle = (s: Station) => !byRate(s) && s.cycleSec != null && s.cycleSec > 0 && s.perCycle != null && s.perCycle > 0;
/** A SPEED CHANGE IN THE WORDS IT WAS TYPED IN. A person who changed 8 s to
 *  10 s must read "every 10 s instead of every 8 s", not "6 a minute instead
 *  of 7.5" — the number they never typed. Only when the way of saying the speed
 *  itself changed does it fall back to a minute. */
function speedChange(a: Station, s: Station): string | undefined {
  if (perMinute(a) === perMinute(s)) return undefined;
  /* typed in the unit before on either side: the numbers typed are not in
     the same unit, so it is said a minute in its own */
  if (a.speedIn === 'before' || s.speedIn === 'before') return `${speedWords(s)} instead of ${speedWords(a).replace(` ${s.unit.trim() || 'units'}`, '')}`;
  const unit = s.unit.trim() || 'units';
  if (byRate(a) && byRate(s) && (a.ratePer ?? 'min') === (s.ratePer ?? 'min')) return `${fmtN(s.rate as number)} ${unit} ${PER_WORD[s.ratePer ?? 'min']} instead of ${fmtN(a.rate as number)}`;
  if (byCycle(a) && byCycle(s)) {
    if (a.perCycle === s.perCycle) return `${fmtN(s.perCycle as number)} ${unit} every ${everyWords(s.cycleSec as number)} instead of every ${everyWords(a.cycleSec as number)}`;
    if (a.cycleSec === s.cycleSec) return `${fmtN(s.perCycle as number)} ${unit} every ${everyWords(s.cycleSec as number)} instead of ${fmtN(a.perCycle as number)}`;
    return `${fmtN(s.perCycle as number)} ${unit} every ${everyWords(s.cycleSec as number)} instead of ${fmtN(a.perCycle as number)} every ${everyWords(a.cycleSec as number)}`;
  }
  // the way of saying it changed (a minute → an hour, a rate → a timing): both, as typed
  const typed = (x: Station, withUnit: boolean) => {
    const u = withUnit ? `${unit} ` : '';
    if (byRate(x)) return `${fmtN(x.rate as number)} ${u}${PER_WORD[x.ratePer ?? 'min']}`;
    if (byCycle(x)) return `${fmtN(x.perCycle as number)} ${u}every ${everyWords(x.cycleSec as number)}`;
    return withUnit ? speedWords(x) : speedWords(x).replace(` ${unit}`, '');
  };
  return `${typed(s, true)} instead of ${typed(a, false)}`;
}
const crewWords = (s: Station, n: number) => (s.kind === 'people' ? `${fmtN(n)} ${n === 1 ? 'person' : 'people'}` : `${fmtN(n)} of them`);

/** WHAT CHANGED between the line as run and a what-if, in words a person
 *  would say: "Basketer: 8 baskets a minute instead of 5.5", "Packing: 1 baskets
 *  every 10 s instead of every 8 s", "Basketer: 8 to a basket
 *  instead of 12", "+ Second packer", "− Carrier". Matched by station id, so a
 *  renamed machine is "Basketer → New basketer", not a removal and an addition. */
export function changedWords(asRun: Station[], w: Station[]): string[] {
  return changedList(asRun, w).map(c => c.said);
}
/** The ids of the what-if's stations that differ from the line as run — the
 *  rows the report marks on the what-if's ladder. */
export function changedIds(asRun: Station[], w: Station[]): Set<string> {
  return new Set(changedList(asRun, w).map(c => c.id));
}
/** What changed AT EACH STATION, by id, without the station's name — the
 *  lines a ladder row carries under its bar, ONE CHANGE A LINE: "1 baskets
 *  every 10 s instead of every 8 s", "2 people instead of 1". A station not in
 *  the map is as run. */
export function changedByStation(asRun: Station[], w: Station[]): Map<string, string[]> {
  return new Map(changedList(asRun, w).filter(c => c.at?.length).map(c => [c.id, c.at as string[]]));
}
function changedList(asRun: Station[], w: Station[]): { id: string; said: string; at?: string[] }[] {
  const out: { id: string; said: string; at?: string[] }[] = [];
  const before = new Map(asRun.map((s, i) => [s.id, { s, i }]));
  const after = new Map(w.map((s, i) => [s.id, { s, i }]));
  w.forEach((s, i) => {
    const b = before.get(s.id);
    if (!b) { out.push({ id: s.id, said: `+ ${nm(s, i)} (${speedWords(s)})`, at: [`added · ${speedWords(s)}`] }); return; }
    const a = b.s;
    const who = a.name.trim() !== s.name.trim() ? `${nm(a, b.i)} → ${nm(s, i)}` : nm(s, i);
    const bits: string[] = [];
    const sp = speedChange(a, s);
    if (sp) bits.push(sp);
    if (i > 0 && a.contains !== s.contains) bits.push(`${fmtN(s.contains)} to a ${s.unit.trim().replace(/s$/i, '') || 'unit'} instead of ${fmtN(a.contains)}`);
    if ((a.crew ?? 1) !== (s.crew ?? 1)) bits.push(`${crewWords(s, s.crew ?? 1)} instead of ${fmtN(a.crew ?? 1)}`);
    if ((a.runningPct ?? 100) !== (s.runningPct ?? 100)) bits.push(`running ${fmtN(s.runningPct ?? 100)}% instead of ${fmtN(a.runningPct ?? 100)}%`);
    if ((a.goodPct ?? 100) !== (s.goodPct ?? 100)) bits.push(`${fmtN(s.goodPct ?? 100)}% good instead of ${fmtN(a.goodPct ?? 100)}%`);
    if (a.unit.trim() !== s.unit.trim()) bits.push(`counts in ${s.unit.trim() || 'units'} instead of ${a.unit.trim() || 'units'}`);
    if (who !== nm(s, i) && !bits.length) out.push({ id: s.id, said: who, at: [`was ${nm(a, b.i)}`] });
    else if (bits.length) out.push({ id: s.id, said: `${who}: ${bits.join(', ')}`, at: bits });
  });
  asRun.forEach((s, i) => { if (!after.has(s.id)) out.push({ id: s.id, said: `− ${nm(s, i)}` }); });
  return out;
}

/** THE COMPARISON, in one sentence: what the line would do with the what-if
 *  against what it does now, and whether the limit moves. "With New basketer,
 *  the line would do 72 bags/min instead of 62 (+10). Basketer no longer
 *  limits it; Palletiser does." A what-if that changes nothing says so. */
export function compareSays(asRun: CapacityResult, w: CapacityResult, name: string): string {
  const who = (x?: StationResult) => (x ? x.station.name.trim() || `Station ${x.index + 1}` : 'nothing');
  if (asRun.line == null || (!asRun.next && !asRun.lanes)) return `Finish the line as it runs first — the what-if is compared with it.`;
  if (w.line == null || (!w.next && !w.lanes)) return `${name} cannot be counted yet — ${w.skipped.length ? `${w.skipped.length} station${w.skipped.length === 1 ? '' : 's'} not counted` : 'add its stations'}.`;
  const per = `${asRun.unit}/min`;
  const d = w.line - asRun.line;
  const sameLimit = asRun.limit?.station.id === w.limit?.station.id;
  const tgt = w.target == null ? ''
    : (w.gap as number) > 0 ? ` Still ${fmtN(w.gap as number)} short of the ${fmtN(w.target)} target.` : ` That meets the ${fmtN(w.target)} target.`;
  if (Math.abs(d) <= asRun.line * 0.01) {
    return `${name} changes nothing the line can do: still ${fmtN(w.line)} ${per}, limited by ${who(w.limit)}.`;
  }
  if (d > 0) {
    const limitWords = sameLimit
      ? `${who(w.limit)} still limits it.`
      : `${who(asRun.limit)} no longer limits it; ${who(w.limit)} does.`;
    return `With ${name}, the line would do ${fmtN(w.line)} ${per} instead of ${fmtN(asRun.line)} (+${fmtN(d)}). ${limitWords}${tgt}`;
  }
  return `With ${name}, the line would do ${fmtN(w.line)} ${per} — ${fmtN(-d)} less than now. ${who(w.limit)} would limit it.${tgt}`;
}

/** The action that makes a what-if real, in the words the board shows: what
 *  to do, where, and why — the comparison, so the prediction travels with the
 *  work and the board's own proof can judge it afterwards. */
export function makeItSoWords(lineName: string, w: WhatIf, changed: string[], compare: string): { what: string; where: string; why: string } {
  return {
    what: `Make it so on ${lineName}: ${w.name}`,
    where: changed.length ? changed.join('; ') : lineName,
    why: `Predicted on the line capacity — ${compare}`,
  };
}

/* ============================ the client report ============================= */

/** One line's ladder, flattened to numbers and sentences — what the PDF draws
 *  and the screen's preview draws, so the page and the file cannot disagree. */
export interface CapacityReportLine {
  name: string;
  owner?: string;
  unit: string;
  /** The same sentence the Capacity lens leads with. */
  sentence: string;
  /** What the V-curve says, once the owner has agreed its margin (vCurve). */
  vSays?: string;
  line: number;
  target?: number;
  /** The most any bar reaches — the scale both drawings share. */
  top: number;
  rows: { name: string; kind: StationKind; chain: string; running: number; effective: number; limit: boolean;
    /** What arrives against what it does, in its own unit (StationResult.feed). */
    feed: string;
    /** THE DETAIL BEHIND THE BAR — the speed as it was typed, in its own unit,
     *  the crew, running and good percentages, and how the speed is known with
     *  its note: "2 baskets every 20 s · 1 person · 94% running · timed — Timed
     *  30 baskets, 2 Oct". A reader can question any bar from this line. */
    detail: string }[];
  /** Stations counted but not drawn, when a line has more than a sheet holds. */
  more: number;
  /** Each what-if kept beside the line, the sentence that compares it, what
   *  was changed station by station, AND ITS OWN LADDER — the same bars drawn
   *  to the same scale (`top`), so the reader sees the picture move, not just
   *  a sentence saying it would. A changed station is marked; the station
   *  that would limit the line is red, as on the line as run. */
  whatIfs: {
    name: string; says: string; onBoard: boolean; changed: string[];
    line?: number; target?: number;
    rows: { name: string; kind: StationKind; running: number; effective: number; limit: boolean; changed: boolean }[];
  }[];
}

const SOURCE_WORD: Record<NonNullable<Station['source']>, string> = { plate: 'on the plate', timed: 'timed', standard: 'standard time, from the time study', estimate: 'a guess' };
const PER_WORDS: Record<RatePer, string> = { sec: 'a second', min: 'a minute', hour: 'an hour' };

/** One station's detail line for the report — every figure that went into
 *  its bar, as the person typed it. */
export function stationDetail(s: Station, prevUnit?: string): string {
  const unit = (s.speedIn === 'before' && prevUnit?.trim() ? prevUnit : s.unit).trim() || 'units';
  const speed = s.rate != null && s.rate > 0 ? `${fmtN(s.rate)} ${unit} ${PER_WORDS[s.ratePer ?? 'min']}`
    : s.perCycle != null && s.cycleSec != null ? cycleWords(s.perCycle, s.cycleSec, unit) : 'no speed';
  const crew = s.crew ?? 1;
  const who = s.kind === 'people' ? `${fmtN(crew)} ${crew === 1 ? 'person' : 'people'}` : crew === 1 ? '1 of it' : `${fmtN(crew)} of it`;
  const rest = allowanceOf(s);
  const bits = [rest > 0 ? `${speed} + ${fmtN(rest * 100)}% rest` : speed, who, `${fmtN(s.runningPct ?? 100)}% running`];
  if ((s.goodPct ?? 100) !== 100) bits.push(`${fmtN(s.goodPct ?? 100)}% good`);
  const how = SOURCE_WORD[s.source ?? 'estimate'] + (s.note?.trim() ? ` — ${s.note.trim()}` : '');
  return `${bits.join(' · ')} · ${how}`;
}

/** How much of a sheet one line costs: its heading and sentence, its rows
 *  (three lines each, so more than a unit), and each what-if — its sentence,
 *  the changes it lists, and its own compact ladder (a short row a station,
 *  plus its key). Shared by the sheet plan and the PDF so they cannot disagree. */
export function lineSheetUnits(l: Pick<CapacityReportLine, 'rows' | 'more' | 'whatIfs' | 'vSays'>): number {
  return 3 + (l.vSays ? 1 : 0) + l.rows.length * 1.6 + (l.more > 0 ? 1 : 0)
    + l.whatIfs.reduce((n, w) => n + 1 + Math.min(w.changed.length, 3) * 0.5 + w.rows.length * 0.8 + (w.rows.length ? 0.5 : 0), 0);
}
export interface CapacityReport { lines: CapacityReportLine[] }

/** Stations drawn per line on the report. A line past this says how many it left off. */
export const CAP_REPORT_ROWS = 18;
/** What one sheet holds, in rows: a line costs its stations plus three for its
 *  heading and sentence. Shared so the preview and the file break pages alike. */
export const CAP_SHEET_UNITS = 26;

/** The report block for the lines that have something to say — two or more
 *  stations counted, so there is a limit and a next. A line with one station,
 *  or none, has no finding to print and costs the report no page. */
export function capacityReport(lines: { name: string; owner?: string; capacity?: Capacity }[]): CapacityReport | undefined {
  const out: CapacityReportLine[] = [];
  for (const l of lines) {
    if (!l.capacity || l.capacity.stations.length < 2) continue;
    const r = analyse(l.capacity);
    if (!r.limit || (!r.next && !r.lanes) || r.line == null) continue;
    const shown = r.ok.slice(0, CAP_REPORT_ROWS);
    /* several lines: each station named by its line — "Line A · bagger" */
    const laneOf = (x: StationResult) => r.lanes?.sections.find(sec => sec.result.ok.some(y => y.station.id === x.station.id))?.name;
    const label = (x: StationResult) => `${laneOf(x) ? `${laneOf(x)} · ` : ''}${x.station.name.trim() || `Station ${x.index + 1}`}`;
    const cap = l.capacity;
    /* Each what-if analysed on its own, its rows cut to the same count. Its bars
       share the as-run scale, so a longer bar IS a faster station — the reader
       compares the two ladders without reading a number. */
    const whatIfs = (cap.whatIfs ?? []).map(w => {
      const wr = analyse(whatIfCapacity(cap, w));
      const mine = whatIfStations(cap.stations, w);
      const moved = changedIds(cap.stations, mine);
      const rows = wr.ok.slice(0, CAP_REPORT_ROWS).map(x => ({
        name: x.station.name.trim() || `Station ${x.index + 1}`, kind: x.station.kind,
        running: x.running, effective: x.effective, limit: wr.limit != null && x.index === wr.limit.index,
        changed: moved.has(x.station.id),
      }));
      return { name: w.name, says: compareSays(r, wr, w.name), onBoard: !!w.action, changed: changedWords(cap.stations, mine),
        line: wr.line ?? undefined, target: wr.target, rows };
    });
    const top = Math.max(...shown.map(x => x.running), ...whatIfs.flatMap(w => w.rows.map(x => x.running)), r.target ?? 0, ...whatIfs.map(w => w.target ?? 0)) * 1.06 || 1;
    out.push({
      name: l.name, owner: l.owner, unit: r.unit, sentence: r.sentence, line: r.line, target: r.target,
      ...(cap.vMarginPct ? { vSays: vCurve(r, cap.vMarginPct).sentence } : {}),
      top,
      rows: shown.map(x => ({
        name: label(x), kind: x.station.kind, chain: x.chain,
        running: x.running, effective: x.effective, limit: x.index === (r.limit as StationResult).index,
        feed: x.feed, detail: stationDetail(x.station, cap.stations[x.index - 1]?.unit),
      })),
      more: r.ok.length - shown.length,
      whatIfs,
    });
  }
  return out.length ? { lines: out } : undefined;
}

/** Which lines go on which sheet — indexes into `report.lines`, in order, a
 *  line never split across two sheets. */
export function capacityPlan(report: CapacityReport): number[][] {
  const sheets: number[][] = [];
  let used = 0;
  report.lines.forEach((l, i) => {
    const w = lineSheetUnits(l);
    if (!sheets.length || used + w > CAP_SHEET_UNITS) { sheets.push([]); used = 0; }
    sheets[sheets.length - 1].push(i);
    used += w;
  });
  return sheets;
}


/* ================================ the V-curve ================================
 * docs/CAPACITY.md §4. Every station's capacity once its own stops count, as
 * a share of the bottleneck's, in the order the product flows: the
 * bottleneck at the bottom, the stations either side rising away from it.
 * With the owner's margin, the guide V says how fast each station a step
 * away should be; a station under it is the one whose short stop will starve
 * (upstream) or block (downstream) the bottleneck. Nothing is stored here
 * but the margin; the points come from analyse() on every render. */
export interface VPoint {
  index: number;
  name: string;
  kind: StationKind;
  /** Once its own stops count, as a percentage of the bottleneck's. */
  pct: number;
  /** While running, the same way. */
  runningPct: number;
  /** In the line's unit a minute, once its stops count. */
  perMin: number;
  /** The guide V's percentage at this station, when the margin is set. */
  guide?: number;
  /** Steps from the bottleneck: negative upstream, positive downstream. */
  steps: number;
  isLimit: boolean;
  under: boolean;
}
export interface VCurve { points: VPoint[]; under: VPoint[]; limit?: VPoint; sentence: string }

/** THE COLOUR OF A SHARE — the V's one rule on the screen, the sheet and the
 *  paper (ui/VCurve, lib/capacityPaperPdf): the
 *  bottleneck navy; under the V amber (a state: at risk); the rest the
 *  brand's blue, lighter as they have more to spare, palest from 250%.
 *  `[deep, light]` for a column's gradient. */
export function shareColours(pct: number, isLimit: boolean, under: boolean): [string, string] {
  if (isLimit) return ['#0d1f3c', '#23447f'];
  if (under) return ['#b45309', '#e09a52'];
  const t = Math.max(0, Math.min(1, (pct - 100) / 150));
  const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * k)).join(',')})`;
  /* --brand → a sky the landing's gradient ends in */
  return [mix([31, 99, 224], [138, 184, 255], t), mix([92, 150, 255], [196, 220, 255], t)];
}


const nameOf = (x: StationResult): string => x.station.name.trim() || `Station ${x.index + 1}`;

export function vCurve(r: CapacityResult, marginPct?: number): VCurve {
  const lim = r.limit;
  if (!lim || !r.ok.length) return { points: [], under: [], sentence: 'Put in the stations and their speeds; the V draws itself once the bottleneck is known.' };
  /* SEVERAL LINES INTO ONE PLACE: a V a line, each against its own
     bottleneck, and one for the stations after the merge — as the page draws
     them. Read as one row, Line B's palletiser sat three steps from Line A's
     and was "under the V" of a station it never feeds (docs/UPGRADE-AUDIT.md
     M5). The whole's limit is the one the whole names. */
  if (r.lanes) {
    const parts = [
      ...r.lanes.sections.filter(s => s.result.ok.length > 0 && s.result.limit).map(s => ({ name: s.name, v: vCurve(s.result, marginPct) })),
      ...(r.lanes.merged && r.lanes.merged.ok.some(x => x.index >= 0) && r.lanes.merged.limit
        ? [mergedV(r.lanes.merged, r.unit, marginPct)]
        : []),
    ].filter(p => p.v.points.length);
    const points = parts.flatMap(p => p.v.points);
    const under = points.filter(p => p.under);
    const limit = points.find(p => p.index === lim.index);
    const sentence = parts.map(p => `${p.name}: ${p.v.sentence}`).join(' ');
    return { points, under, ...(limit ? { limit } : {}), sentence };
  }
  const at = r.ok.findIndex(x => x.station.id === lim.station.id);
  const m = marginPct != null && marginPct > 0 ? marginPct : undefined;
  const points: VPoint[] = r.ok.map((x, i) => {
    const steps = i - at;
    const guide = m != null && steps !== 0 ? 100 + m * Math.abs(steps) : undefined;
    const pct = (x.effective / lim.effective) * 100;
    return { index: x.index, name: nameOf(x), kind: x.station.kind, pct, runningPct: (x.running / lim.effective) * 100, perMin: x.effective,
      ...(guide != null ? { guide } : {}), steps, isLimit: i === at, under: guide != null && pct < guide - 1e-9 };
  });
  const limit = points[at];
  const under = points.filter(p => p.under);
  const ln = limit ? limit.name : '';
  let sentence: string;
  if (m == null) sentence = `${ln} is the bottleneck at ${fmtN(lim.effective)} ${r.unit} a minute. Set the V's margin to see whether the stations either side protect it — about 10% a step is the usual starting point.`;
  else if (!under.length) sentence = `Every station clears the V: each step away from ${ln} is at least ${fmtN(m)}% faster, so a short stop beside it is absorbed.`;
  else sentence = under.map((p, i) => `${i ? 'the' : 'The'} ${p.name.toLowerCase().startsWith('op ') ? p.name : p.name.charAt(0).toLowerCase() + p.name.slice(1)} is only ${fmtN(Math.max(0, Math.round(p.pct - 100)))}% faster than ${ln} (the V asks ${fmtN(Math.round((p.guide ?? 100) - 100))}%) — a short stop there ${p.steps > 0 ? 'blocks' : 'starves'} ${ln}`).join('; ') + '.';
  return { points, under, ...(limit ? { limit } : {}), sentence };
}

/** The stations after the merge as a V. Held by one of them, a V of their
 *  own; held by the lines, read against what the lines send — the feeder
 *  (index −1) is the 100% point and is not drawn. It returned no points at
 *  all in that case, so the card never named a shared station (the review
 *  of M5). */
function mergedV(mg: CapacityResult, unit: string, marginPct?: number): { name: string; v: VCurve } {
  const lim = mg.limit as StationResult;
  if (lim.index >= 0) return { name: 'after they merge', v: vCurve({ ...mg, ok: mg.ok.filter(x => x.index >= 0) }, marginPct) };
  const v = vCurve(mg, marginPct);
  const points = v.points.filter(p => p.index >= 0);
  const under = v.under.filter(p => p.index >= 0);
  const sentence = `the stations after the merge run against the ${fmtN(lim.effective)} ${unit} a minute the lines send${under.length ? `; ${under.map(p => p.name).join(', ')} ${under.length === 1 ? 'is' : 'are'} under the V` : ''}.`;
  return { name: 'after they merge', v: { points, under, sentence } };
}


/* =============================== accumulation ===============================
 * docs/CAPACITY.md §4. A buffer adds no speed; it lets a short stop beside
 * the bottleneck pass without stopping it. For each station either side of
 * the bottleneck whose own stops are logged, its typical stop (own minutes ÷
 * own stops) against what can collect between it and the bottleneck, in
 * minutes of the bottleneck's work: upstream, the buffers must hold enough
 * to keep the bottleneck fed; downstream, enough room to keep it from being
 * blocked. A rule of thumb is 2–5 minutes of production. A minute of the
 * bottleneck's work is a minute of it RUNNING — while a neighbour is stopped
 * it draws the buffer down at its running speed, not at its average with its
 * own stops in it (CAPACITY §4: "the typical minor stop × the critical
 * machine's rate is what the buffer must hold"); and in the items the buffer
 * actually holds, nothing put back for rejects before it. (It was divided by
 * the bottleneck's figure once its own stops count, which made a buffer look
 * longer the more the bottleneck stopped. Audit, 13 October.) */
export interface Protection { index: number; name: string; side: 'before' | 'after'; typicalMin: number; coverMin: number; covered: boolean }
export interface Accumulation { rows: Protection[]; written: boolean; sentence: string }

export function accumulation(r: CapacityResult, stats: Record<string, StopStats>): Accumulation {
  const lim = r.limit;
  if (!lim || !r.ok.length) return { rows: [], written: false, sentence: '' };
  const at = r.ok.findIndex(x => x.station.id === lim.station.id);
  const written = r.ok.some(x => (x.station.bufferAfter ?? 0) > 0);
  const between = (from: number, to: number) => r.ok.slice(from, to).reduce((u, x) => u + (x.station.bufferAfter ?? 0) * x.factor, 0);
  const rows: Protection[] = [];
  r.ok.forEach((x, i) => {
    if (i === at) return;
    const st = stats[x.station.id];
    const n = st?.ownEvents ?? 0;
    if (!st || !(n > 0) || !(st.ownMins > 0)) return;
    const units = i < at ? between(i, at) : between(at, i);
    const pace = ownSpeed(lim);
    const coverMin = pace > 0 ? units / pace : 0;
    const typicalMin = st.ownMins / n;
    rows.push({ index: x.index, name: nameOf(x), side: i < at ? 'before' : 'after', typicalMin, coverMin, covered: coverMin >= typicalMin - 1e-9 });
  });
  const ln = nameOf(lim);
  const uncovered = rows.filter(p => !p.covered);
  let sentence: string;
  if (!rows.length) sentence = '';
  else if (!written) sentence = `Nothing is written down as collecting between the stations — a stop next to ${ln} stops ${ln}. Write down what can collect after each (a conveyor, a table) to see which stops are absorbed.`;
  else if (!uncovered.length) sentence = `Every logged stop beside ${ln} is absorbed: what can collect covers the typical stop of each.`;
  else sentence = uncovered.map((p, i) => `${i ? 'the' : 'The'} ${p.name.charAt(0).toLowerCase() + p.name.slice(1)}'s own stops last ${fmtN(Math.round(p.typicalMin * 10) / 10)} min on average; what can collect between it and ${ln} holds ${fmtN(Math.round(p.coverMin * 10) / 10)} min of ${ln}'s work — a typical stop there ${p.side === 'before' ? 'starves' : 'blocks'} ${ln}`).join('; ') + '.';
  return { rows, written, sentence };
}

/* ======================= capacity a shift (docs/CAPACITY.md §2) ======================
 * Toyota's production capacity sheet works capacity A SHIFT: the time a shift
 * less its planned stops, at the process's speed. On a packaging line the
 * planned stops are the breaks the line stops for (the line's settings — the
 * loss count's, relief 0) and the changeovers: SMED's minutes × how many a
 * shift. A changeover stops the whole line, not one station, so it comes off
 * the shift once; the bottleneck's speed, its own stops counted, does the
 * rest. What it makes is GOOD packs off the end of the line — the
 * bottleneck's own pace less every station's rejects (r.goodOut); with no
 * rejects typed, its pace. (It was the bottleneck's speed put back to the
 * start of the line, counting packs rejected before it as made and packs
 * rejected after it as good. Audit, 13 October.) Nothing is assumed: a break
 * not said, or a changeover not timed or not counted, is said so and left
 * out of the sum. */
export interface ShiftIn { name: string; min: number; /** Breaks the line stops for; 0 under relief; absent: not said. */ breakMin?: number }
export interface ChangeoverIn {
  /** One changeover, minutes — agreed on the standard, or as timed. */
  min: number;
  /** How many a shift; absent: not said. */
  perShift?: number;
  agreed: boolean;
  /** The product it is changed from, when the standard's agreed one says. */
  from?: string;
}
export interface ShiftRow { name: string; min: number; breakMin?: number; planned?: number; changeoverMin?: number; making?: number; made?: number; without?: number }
export interface ShiftCapacity {
  rows: ShiftRow[];
  /** One line for the card at the line: "32,400 bags a shift — 126 of 450 min changing over". */
  short?: string;
  /** The day's sum, when every shift's breaks are said. */
  day?: { made: number; without?: number; changeoverMin?: number };
  sentence: string;
}

const big = (n: number): string => Math.round(n).toLocaleString('en-GB');
const hoursWord = (m: number): string => `${fmtN(Math.round((m / 60) * 100) / 100)} h`;
const minWord = (m: number): string => `${fmtN(Math.round(m * 10) / 10)} min`;

export function shiftCapacity(r: CapacityResult, shifts: ShiftIn[], co?: ChangeoverIn): ShiftCapacity | undefined {
  const lim = r.limit;
  if (!lim || r.line == null || !(r.line > 0)) return undefined;
  /* the bottleneck's own pace, its stops counted, in the line's unit; and
     the good off the end of the line a minute — what a shift makes */
  const pace = lim.does * lim.factor, rate = r.goodOut ?? r.line;
  if (!shifts.length) return { rows: [], sentence: 'The line’s shifts are not set — set them, with their breaks, in the line’s settings to see what it can make a shift.' };
  const unit = r.unit, ln = nameOf(lim);
  const coShift = co && co.min > 0 && co.perShift != null && co.perShift >= 0 ? co.min * co.perShift : undefined;
  const rows: ShiftRow[] = shifts.map(s => {
    const planned = s.breakMin != null && s.breakMin >= 0 ? Math.max(0, s.min - s.breakMin) : undefined;
    const changeoverMin = planned != null && coShift != null ? Math.min(planned, coShift) : undefined;
    const making = planned != null ? planned - (changeoverMin ?? 0) : undefined;
    return {
      name: s.name, min: s.min, ...(s.breakMin != null ? { breakMin: s.breakMin } : {}),
      ...(planned != null ? { planned } : {}), ...(changeoverMin != null ? { changeoverMin } : {}),
      ...(making != null ? { making, made: rate * making } : {}),
      ...(planned != null && changeoverMin ? { without: rate * planned } : {}),
    };
  });
  const said = rows.filter(x => x.planned != null);
  const unsaid = rows.filter(x => x.planned == null).map(x => x.name);
  const day = said.length === rows.length
    ? { made: said.reduce((a, x) => a + (x.made ?? 0), 0),
      ...(said.some(x => x.without != null) ? { without: said.reduce((a, x) => a + (x.without ?? x.made ?? 0), 0) } : {}),
      ...(coShift != null ? { changeoverMin: said.reduce((a, x) => a + (x.changeoverMin ?? 0), 0) } : {}) }
    : undefined;

  /* how the changeovers were counted, in words */
  const whose = co ? (co.agreed ? `the standard${co.from ? ` from ${co.from}` : ''}` : 'as timed on the SMED, not yet the standard') : '';
  const coNot = !co ? 'no changeover is timed into this product yet — SMED times one; until then none comes off'
    : co.perShift == null ? `a changeover is ${minWord(co.min)} (${whose}), but how many a shift is not said on the SMED — none comes off until it is`
    : '';
  const breaksNot = unsaid.length ? `${unsaid.join(', ')}: the breaks are not said on the line’s settings, so no capacity is worked out for ${unsaid.length === 1 ? 'it' : 'them'}` : '';
  /* several lines held by themselves make the sum of their paces: the words
     name the whole, not one line's bottleneck (docs/UPGRADE-AUDIT.md M5); one
     line feeding shared stations is one line, and its bottleneck is named */
  const liveLanes = r.lanes ? r.lanes.sections.filter(s => s.result.ok.length > 0 && s.result.line != null).length : 0;
  const together = r.lanes && r.lanes.heldBy === 'lanes' && liveLanes > 1 && r.line != null ? r.line : undefined;
  const at = together != null
    ? `At ${fmtN(together)} ${unit} a minute across the lines together${rate < together - 1e-9 ? ` (${fmtN(rate)} good off the end)` : ''}`
    : `At ${ln}’s ${fmtN(pace)} ${unit} a minute${rate < pace - 1e-9 ? ` (${fmtN(rate)} good off the end of the line)` : ''}`;
  const one = rows.length === 1 || rows.every(x => x.min === rows[0].min && x.breakMin === rows[0].breakMin);
  let head: string;
  if (one && said.length) {
    const x = said[0];
    const shiftWords = `A shift of ${hoursWord(x.min)}${x.breakMin ? `, less ${minWord(x.breakMin)} of breaks the line stops for, is ${minWord(x.planned ?? 0)}` : x.breakMin === 0 ? ', the line running through its breaks, is ' + minWord(x.planned ?? 0) : ''}`;
    const coWords = co && co.perShift != null && co.perShift > 0 && x.changeoverMin != null
      ? `; ${fmtN(co.perShift)} changeover${co.perShift === 1 ? '' : 's'} of ${minWord(co.min)} (${whose}) take ${minWord(x.changeoverMin)} — ${minWord(x.making ?? 0)} making`
      : co && co.perShift === 0 ? '; no changeovers a shift' : '';
    head = `${shiftWords}${coWords}. ${at} that is ${big(x.made ?? 0)} ${unit} a shift${x.without != null ? ` — ${big(x.without)} if it never changed over` : ''}${rows.length > 1 ? `; ${rows.length} shifts a day, ${big(day?.made ?? 0)}` : ''}.`;
  } else if (said.length) {
    /* shifts that differ: each one's figure, the day summed — and the
       changeovers said whole, how many, how long and how known, as for one */
    const coWhat = co && co.perShift != null && co.perShift > 0 && coShift != null
      ? `${fmtN(co.perShift)} changeover${co.perShift === 1 ? '' : 's'} a shift of ${minWord(co.min)} (${whose})` : '';
    const takes = co?.perShift === 1 ? 'takes' : 'take';
    const tail = day
      ? ` — ${big(day.made)} ${unit} a day${coWhat && day.changeoverMin ? `; ${coWhat} ${takes} ${minWord(day.changeoverMin)} a day${day.without != null ? ` — ${big(day.without)} if it never changed over` : ''}` : co?.perShift === 0 ? '; no changeovers a shift' : ''}`
      : ` ${unit}${coWhat ? `; ${coWhat} come${co?.perShift === 1 ? 's' : ''} off each` : ''}`;
    head = `${at}: ${said.map(x => `${x.name} ${big(x.made ?? 0)}`).join(' · ')}${tail}.`;
  } else head = '';
  const notes = [coNot, breaksNot].filter(Boolean).map(t => t.charAt(0).toUpperCase() + t.slice(1) + '.');
  const first = said[0];
  const short = !first ? undefined : one
    ? `${big(first.made ?? 0)} ${unit} a shift${first.changeoverMin ? ` — ${fmtN(Math.round(first.changeoverMin))} of ${fmtN(Math.round(first.planned ?? 0))} min changing over` : coShift == null ? ', changeovers not counted' : ''}`
    : day ? `${big(day.made)} ${unit} a day${day.changeoverMin ? ` — ${fmtN(Math.round(day.changeoverMin))} min of it changing over` : coShift == null ? ', changeovers not counted' : ''}` : undefined;
  return { rows, ...(short ? { short } : {}), ...(day ? { day } : {}), sentence: [head, ...notes].filter(Boolean).join(' ') };
}

/** The line's shifts as capacity a shift reads them (Workspace.shifts): each
 *  one's minutes from its clock times, overnight included; its breaks — 0
 *  under relief, else as set, else not said. A shift without both times is
 *  left out. */
export function shiftsIn(shifts: readonly { name?: string; start?: string; end?: string; breakMin?: number; relief?: boolean }[] | undefined): ShiftIn[] {
  const at = (t?: string): number | undefined => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim());
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : undefined;
  };
  return (shifts ?? []).flatMap((x, i) => {
    const a = at(x.start), b = at(x.end);
    if (a === undefined || b === undefined || a === b) return [];
    const brk = x.relief ? 0 : x.breakMin != null && x.breakMin >= 0 ? x.breakMin : undefined;
    return [{ name: x.name?.trim() || `Shift ${i + 1}`, min: (b - a + 1440) % 1440, ...(brk != null ? { breakMin: brk } : {}) }];
  });
}

/** A logged stop that is a changeover — the line's planned stop, not a
 *  station's own (docs/CAPACITY.md §5). */
export const isChangeoverStop = (o: Pick<Observation, 'category' | 'subcategory'>): boolean => /change\s?-?over/i.test(o.category || '');
