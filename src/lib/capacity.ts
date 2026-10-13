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
  /** Identical machines or people side by side. Default 1. */
  crew?: number;
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

export interface Capacity {
  /** What the line should be doing, in the line's own unit per minute. */
  targetPerMin?: number;
  /** Planned running hours in a week — what a share of stops is measured
   *  against. Only used to SUGGEST a running percentage, never silently. */
  plannedHoursPerWeek?: number;
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
  ({ targetPerMin: w.targetPerMin ?? cap.targetPerMin, plannedHoursPerWeek: cap.plannedHoursPerWeek, stations: whatIfStations(cap.stations, w) });

export const EMPTY_CAPACITY: Capacity = { stations: [] };

/* ================================ speeds =================================== */

const PER_MIN: Record<RatePer, number> = { sec: 60, min: 1, hour: 1 / 60 };

/** The station's own speed, in its own unit per minute — or undefined when it
 *  has not been given one that can be used. */
export function perMinute(s: Station): number | undefined {
  if (s.rate != null && s.rate > 0) return s.rate * PER_MIN[s.ratePer ?? 'min'];
  if (s.cycleSec != null && s.cycleSec > 0 && s.perCycle != null && s.perCycle > 0) return (s.perCycle * 60) / s.cycleSec;
  return undefined;
}

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
}

/** THE LINE'S SPEED, as the practice takes it (docs/CAPACITY.md §1 —
 *  Rowland, 12 October: "we go by plate speed ... of course, unless human"):
 *  the station slowest on running speed alone, in the line's unit a minute
 *  at the start of the line — a machine's when its speed is off its PLATE,
 *  a person's when people set the pace and were timed, or carry a standard
 *  time from the time study. Nothing when the
 *  slowest station's speed is a guess, or a machine's timed rather than
 *  read off its plate: running below the plate is a loss (slow running),
 *  never a lower plate. What a stop's packs are counted at (SMED, the loss
 *  count). */
export function lineSpeed(cap: Capacity | undefined): { perMin: number; unit: string; station: string; from: 'plate' | 'person' } | undefined {
  if (!cap?.stations?.length) return undefined;
  const r = analyse(cap), x = r.limitAtRunning;
  if (!x || !(x.running > 0)) return undefined;
  const st = x.station, name = st.name.trim() || `station ${x.index + 1}`;
  if (st.kind === 'machine' && st.source === 'plate') return { perMin: x.running, unit: r.unit, station: name, from: 'plate' };
  if (st.kind === 'people' && (st.source === 'timed' || st.source === 'standard')) return { perMin: x.running, unit: r.unit, station: name, from: 'person' };
  return undefined;
}

/** Numbers as a person would say them: 62, 66.5, 0.13 — no trailing zeros. */
export function fmtN(n: number): string {
  const a = Math.abs(n);
  const d = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return String(Number(n.toFixed(d)));
}

const norm = (s: string) => s.trim().toLowerCase();

export function analyse(cap: Capacity): CapacityResult {
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
    const speed = perMinute(s) as number;
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
  for (const x of ok) {
    const up = upGood.get(x.station.id) ?? 1;
    const own = x.station.unit.trim() || unit;
    x.does = (x.effective * up) / x.factor;
    if (Number.isFinite(slowestBefore)) {
      x.arrives = (slowestBefore * up) / x.factor;
      const gap = x.does - x.arrives;
      x.feed = gap < -1e-9
        ? `${fmtN(x.arrives)} ${own} a minute arrive · it does ${fmtN(x.does)} — holds the line back`
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
}

/** WHAT A STATION IS ASKED TO DO, AND WHETHER IT DOES IT — worked out from the
 *  line before it (Rowland, 13 October: "70 a minute. How many go into a
 *  basket? 10. So one basket goes to a human every X"). A person is said in
 *  seconds a piece, the way they are timed; a machine in its rate. */
export function paceSays(r: CapacityResult, s: Station): PaceSays {
  const a = r.arrivals[s.id];
  const one = oneOf(s.unit);
  const people = s.kind === 'people';
  const who = people ? 'them' : 'it';
  const arrive = a
    ? `A ${one} reaches ${who} every ${fmtSec(a.everySec)} — ${fmtN(a.perMin)} a minute: ${a.from.name} does ${fmtN(a.from.perMin)} ${a.from.unit} a minute${Math.abs(a.ratio - 1) > 1e-9 ? `, ${fmtN(a.ratio)} to a ${one}` : ''}.`
    : undefined;
  const speed = perMinute(s);
  if (speed == null) {
    return { ...(arrive ? { arrive } : {}), verdict: people ? `Time how long one ${one} takes them.` : `Give it its speed to see whether it keeps up.`, short: false };
  }
  const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
  const running = pct(s.runningPct, 1) || 1;
  const does = speed * crew * running;             // its own unit a minute
  const each = 60 / speed;                         // one of it, one of them
  if (!a) {
    return { verdict: people ? `They take ${fmtSec(each)} a ${one}${crew > 1 ? ` each, ${crew} of them` : ''} — ${fmtN(does)} a minute.` : `It does ${fmtN(does)} ${s.unit.trim() || 'units'} a minute.`, short: false };
  }
  const short = does < a.perMin - 1e-9;
  const needed = Math.ceil(a.perMin / (speed * running) - 1e-9);
  if (!people) {
    return { ...(arrive ? { arrive } : {}), verdict: short ? `It does ${fmtN(does)} a minute — holds the line back.` : `It does ${fmtN(does)} a minute — keeps up${does - a.perMin > 1e-9 ? `, ${fmtN(does - a.perMin)} to spare` : ''}.`, short };
  }
  const gapSec = Math.abs(60 / does - a.everySec);
  const takes = `They take ${fmtSec(each)} a ${one}${crew > 1 ? ` each, ${crew} of them` : ''}`;
  const verdict = short
    ? `${takes} — ${fmtSec(gapSec)} too slow: they hold the line back. It needs ${needed} ${needed === 1 ? 'person' : 'people'} to keep up.`
    : `${takes} — they keep up${gapSec > 0.05 ? `, ${fmtSec(gapSec)} to spare a ${one}` : ''}.`;
  return { ...(arrive ? { arrive } : {}), verdict, short, ...(short && needed > crew ? { needed } : {}) };
}

/** The finding in a few words, for a list of lines or a page header: "Basketer
 *  limits at 62 bags/min · 4 short of 66". Undefined until something can be
 *  counted. The full sentence is `sentence`; this is the part that fits a row. */
export function shortSays(r: CapacityResult): string | undefined {
  if (!r.limit || r.line == null) return undefined;
  const nm = r.limit.station.name.trim() || `Station ${r.limit.index + 1}`;
  const tgt = r.target == null ? '' : (r.gap as number) > 0 ? ` · ${fmtN(r.gap as number)} short of ${fmtN(r.target)}` : ` · target ${fmtN(r.target)} met`;
  return r.next ? `${nm} limits at ${fmtN(r.line)} ${r.unit}/min${tgt}` : `${nm} runs ${fmtN(r.line)} ${r.unit}/min — add the rest of the line`;
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
  const unit = s.unit.trim() || 'units';
  if (byRate(a) && byRate(s) && (a.ratePer ?? 'min') === (s.ratePer ?? 'min')) return `${fmtN(s.rate as number)} ${unit} ${PER_WORD[s.ratePer ?? 'min']} instead of ${fmtN(a.rate as number)}`;
  if (byCycle(a) && byCycle(s)) {
    if (a.perCycle === s.perCycle) return `${fmtN(s.perCycle as number)} ${unit} every ${fmtN(s.cycleSec as number)} s instead of every ${fmtN(a.cycleSec as number)} s`;
    if (a.cycleSec === s.cycleSec) return `${fmtN(s.perCycle as number)} ${unit} every ${fmtN(s.cycleSec as number)} s instead of ${fmtN(a.perCycle as number)}`;
    return `${fmtN(s.perCycle as number)} ${unit} every ${fmtN(s.cycleSec as number)} s instead of ${fmtN(a.perCycle as number)} every ${fmtN(a.cycleSec as number)} s`;
  }
  // the way of saying it changed (a minute → an hour, a rate → a timing): both, as typed
  const typed = (x: Station, withUnit: boolean) => {
    const u = withUnit ? `${unit} ` : '';
    if (byRate(x)) return `${fmtN(x.rate as number)} ${u}${PER_WORD[x.ratePer ?? 'min']}`;
    if (byCycle(x)) return `${fmtN(x.perCycle as number)} ${u}every ${fmtN(x.cycleSec as number)} s`;
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
  if (asRun.line == null || !asRun.next) return `Finish the line as it runs first — the what-if is compared with it.`;
  if (w.line == null || !w.next) return `${name} cannot be counted yet — ${w.skipped.length ? `${w.skipped.length} station${w.skipped.length === 1 ? '' : 's'} not counted` : 'add its stations'}.`;
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
export function stationDetail(s: Station): string {
  const unit = s.unit.trim() || 'units';
  const speed = s.rate != null && s.rate > 0 ? `${fmtN(s.rate)} ${unit} ${PER_WORDS[s.ratePer ?? 'min']}`
    : s.perCycle != null && s.cycleSec != null ? `${fmtN(s.perCycle)} ${unit} every ${fmtN(s.cycleSec)} s` : 'no speed';
  const crew = s.crew ?? 1;
  const who = s.kind === 'people' ? `${fmtN(crew)} ${crew === 1 ? 'person' : 'people'}` : crew === 1 ? '1 of it' : `${fmtN(crew)} of it`;
  const bits = [speed, who, `${fmtN(s.runningPct ?? 100)}% running`];
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
    if (!r.limit || !r.next || r.line == null) continue;
    const shown = r.ok.slice(0, CAP_REPORT_ROWS);
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
        name: x.station.name.trim() || `Station ${x.index + 1}`, kind: x.station.kind, chain: x.chain,
        running: x.running, effective: x.effective, limit: x.index === (r.limit as StationResult).index,
        feed: x.feed, detail: stationDetail(x.station),
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

const nameOf = (x: StationResult): string => x.station.name.trim() || `Station ${x.index + 1}`;

export function vCurve(r: CapacityResult, marginPct?: number): VCurve {
  const lim = r.limit;
  if (!lim || !r.ok.length) return { points: [], under: [], sentence: 'Put in the stations and their speeds; the V draws itself once the bottleneck is known.' };
  const at = r.ok.indexOf(lim);
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


/* =============================== accumulation ===============================
 * docs/CAPACITY.md §4. A buffer adds no speed; it lets a short stop beside
 * the bottleneck pass without stopping it. For each station either side of
 * the bottleneck whose own stops are logged, its typical stop (own minutes ÷
 * own stops) against what can collect between it and the bottleneck, in
 * minutes of the bottleneck's work: upstream, the buffers must hold enough
 * to keep the bottleneck fed; downstream, enough room to keep it from being
 * blocked. A rule of thumb is 2–5 minutes of production. */
export interface Protection { index: number; name: string; side: 'before' | 'after'; typicalMin: number; coverMin: number; covered: boolean }
export interface Accumulation { rows: Protection[]; written: boolean; sentence: string }

export function accumulation(r: CapacityResult, stats: Record<string, StopStats>): Accumulation {
  const lim = r.limit;
  if (!lim || !r.ok.length) return { rows: [], written: false, sentence: '' };
  const at = r.ok.indexOf(lim);
  const written = r.ok.some(x => (x.station.bufferAfter ?? 0) > 0);
  const between = (from: number, to: number) => r.ok.slice(from, to).reduce((u, x) => u + (x.station.bufferAfter ?? 0) * x.factor, 0);
  const rows: Protection[] = [];
  r.ok.forEach((x, i) => {
    if (i === at) return;
    const st = stats[x.station.id];
    const n = st?.ownEvents ?? 0;
    if (!st || !(n > 0) || !(st.ownMins > 0)) return;
    const units = i < at ? between(i, at) : between(at, i);
    const coverMin = lim.effective > 0 ? units / lim.effective : 0;
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
 * rest. Nothing is assumed: a break not said, or a changeover not timed or
 * not counted, is said so and left out of the sum. */
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
  const lim = r.limit, rate = r.line;
  if (!lim || rate == null || !(rate > 0)) return undefined;
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
  const at = `At ${ln}’s ${fmtN(rate)} ${unit} a minute`;
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
