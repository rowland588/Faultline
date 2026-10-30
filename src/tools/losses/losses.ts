/* A SHIFT'S LOSSES, BY HAND — and what they cost (docs/TOOLKIT.md, Part 4,
 * tool 7; docs/BUILD.md, E; the time model in docs/CAPACITY.md §5–6).
 *
 * The question: of what the line should have made this shift, where did the
 * rest go? Rowland, 10 October: "This is about manual inputs. This is about
 * industrial engineering." So the facts are two counts at the end of the
 * shift (good packs made, rejects), the planned minutes, the rate — and the
 * stops the floor already timed in Capture through the shift. Nothing reads
 * a machine, and there is no OEE: minutes and pounds, never a score.
 *
 * THE TIME MODEL (TPM's six big losses on ISO 22400-2's time model, counted
 * by hand — docs/CAPACITY.md §5). Rowland, 12 October: "we go by plate
 * speed ... of course, unless human."
 *
 *   planned production time = the shift − its planned stops (the breaks
 *                             the line stops for; none under relief)
 *   expected      = planned minutes × the bottleneck's ideal speed — the
 *                   slowest station's: a machine's plate speed, a person's
 *                   standard time
 *   lost minutes  = (expected − good packs) ÷ the rate
 *   availability  = the stops logged + the changeovers  → run time
 *   quality       = rejects ÷ the rate
 *   performance   = lost − stops − changeovers − rejects, never below zero:
 *                   SLOW RUNNING AND SHORT STOPS — running below the ideal
 *                   speed, and stops too short to log. Told apart by timing
 *                   the running speed, as Nakajima's loss structure does
 *                   (Introduction to TPM, 1988; JIPM): the packs run, good
 *                   and rejected, at the running speed took the NET
 *                   OPERATING TIME, packs ÷ running speed — short stops are
 *                   the run time less it, slow running it less the same
 *                   packs at the ideal speed (packs ÷ ideal).
 *
 * WHAT IT COSTS, in two parts, never one blended figure (§6): the idle
 * labour of the crew paid to stand (crew × wage × on-costs × minutes), and
 * the lost contribution (packs not made × price less materials a pack, or
 * the line's margin a pack) — said "if it cannot be made up". No cost on
 * the line, no pounds.
 *
 * FACTS → FIGURES → READING → VERDICT. Pure: the count, the stops in its
 * window, the running speed timed and the line's cost model in; the figures
 * and the sentence out.
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?        the planned minutes, the packs made and a rate — until
 *                  all three are in it is "not yet counted", not a number
 *   how known      every number says how: the planned minutes worked out
 *                  from the shift and its breaks (and why, when changed for
 *                  the day), the packs counted, the rate the plate speed of
 *                  the named machine or the standard time of the named
 *                  person, or said not to be, the stops timed in
 *                  Capture, the running speed timed — and the rest is named
 *                  for what it is, slow running and short stops
 *   what it does   the rest is not split until a running speed is timed —
 *   not claim      "not yet told apart", never a guess; stops that exceed
 *                  the loss are said ("check the counts"); a running speed
 *                  that explains more than the rest is said, not trusted
 *   people decide  the biggest bars are offered to the fishbone as
 *                  suggestions; the rest only once it is told apart */
import type { Observation, Shift, Workspace } from '../../types';
import type { LossCount, RunTiming } from '../../lib/study';
import type { SixM } from '../../lib/sixm';
import { boneOfStop } from '../../lib/sixm';
import { labourPerHour } from '../../lib/cost';
import { analyse, lineSpeed, type Capacity, type Station } from '../linebalance/capacity';
import { shiftWindow } from '../../lib/shifts';
import { niceDay, todayISO } from '../../lib/weeks';
import type { Tone } from '../capability/sample';

const DAY = 86_400_000;

/** A changeover is a stop logged under the changeover category — Capture's
 *  taxonomy ships it as "Changeover" (lib/taxonomy). */
export const isChangeover = (o: Pick<Observation, 'category'>): boolean => /change\s*-?\s*over/i.test(o.category ?? '');

/** The line's stops in the window: live rows that started inside it. */
export function inWindow(obs: Observation[], from: number, to: number, workspaceId?: string): Observation[] {
  return obs.filter(o => o.deletedAt == null && (!workspaceId || o.workspaceId === workspaceId) && o.startedAt >= from && o.startedAt < to);
}

const stopsOf = (o: Observation) => Math.max(1, o.count || 1);
const minsOf = (o: Observation) => (o.durationMs > 0 ? o.durationMs / 60_000 : 0);
const whole = (n: number) => Math.round(n);

/* ------------------------------------------------------------- the rate */

/** THE RATE IS THE BOTTLENECK'S IDEAL SPEED (docs/CAPACITY.md §1, §5) —
 *  Rowland: "plate speed ... of course, unless human". The line's slowest
 *  station at running speed on its capacity (found like for like at the
 *  start of the line, lib/capacity's chain), at its own speed in the line's
 *  unit — no rejects before it put back: a machine at the speed on its plate,
 *  a person at their standard time (from the time study, or their pace as
 *  timed). `why` says it in words — "plate speed of the Bagger", "standard
 *  time of Op 3 (the time study)", "Op 3's timed pace" — or why there is no
 *  ideal speed yet. */
export interface IdealPace {
  rate?: number;
  /** The station that sets the pace, and how its speed is known. */
  station?: string;
  how?: 'plate' | 'standard' | 'timed';
  why: string;
  /** Any station on the line has an ideal speed (a machine on the plate, a
   *  person's standard time) — then the standard's target is never offered
   *  in its place. */
  anyIdeal: boolean;
}

/** A station's speed is ideal: a machine's from its plate, a person's their
 *  standard time — from the time study, or timed. */
const idealSpeed = (x: Pick<Station, 'kind' | 'source'>): boolean => (x.kind === 'machine' ? x.source === 'plate' : x.source === 'standard' || x.source === 'timed');
const MACHINE_NOT: Record<string, string> = { timed: 'timed, not from its plate', standard: 'a standard time, not from its plate', estimate: 'a guess, not from its plate' };

export function idealOf(cap?: Pick<Capacity, 'stations'>): IdealPace {
  const stations = cap?.stations ?? [];
  const anyIdeal = stations.some(idealSpeed);
  if (!stations.length) return { why: 'the line has no capacity sheet yet', anyIdeal };
  const lim = analyse({ stations }).limitAtRunning;
  if (!lim) return { why: anyIdeal ? 'the stations at their ideal speed cannot be counted on Line capacity yet' : 'no station on Line capacity has a speed yet', anyIdeal };
  const name = lim.station.name.trim() || `station ${lim.index + 1}`;
  const src = lim.station.source ?? 'estimate';
  /* The figure is the line's speed (lib/capacity lineSpeed) — one function,
     so SMED and the loss count never count a stop at two different speeds. */
  const sp = lineSpeed({ stations } as Capacity);
  if (sp) {
    const rate = Math.round(sp.perMin * 100) / 100;
    if (sp.from === 'plate') return { rate, station: name, how: 'plate', why: `plate speed of the ${name}`, anyIdeal };
    return src === 'standard' ? { rate, station: name, how: 'standard', why: `standard time of ${name} (the line balance)`, anyIdeal }
      : { rate, station: name, how: 'timed', why: `${name}’s timed pace`, anyIdeal };
  }
  if (lim.station.kind === 'machine') return { why: `the ${name} sets the pace and its speed is ${MACHINE_NOT[src] ?? MACHINE_NOT.estimate}`, anyIdeal };
  return { why: `${name} sets the pace and their speed is a guess — time them in the line balance`, anyIdeal };
}

/** What a count's rate starts from: the pace-setter's ideal speed; else the
 *  line standard's target, only when no station on the line has an ideal
 *  speed; else typed — and `why` says which, in the words the count shows
 *  under it. */
export interface RateOf {
  ratePerMin?: number; rateFrom?: LossCount['rateFrom']; rateMachine?: string; ratePerson?: string; rateTimed?: boolean;
  why: string;
}

export function rateOf(cap: Pick<Capacity, 'stations'> | undefined, standardTarget?: number): RateOf {
  const p = idealOf(cap);
  if (p.rate !== undefined && p.rate > 0 && p.how && p.station) {
    return p.how === 'plate' ? { ratePerMin: p.rate, rateFrom: 'plate', rateMachine: p.station, why: p.why }
      : { ratePerMin: p.rate, rateFrom: 'standard-time', ratePerson: p.station, ...(p.how === 'timed' ? { rateTimed: true } : {}), why: p.why };
  }
  if (!p.anyIdeal && standardTarget !== undefined && standardTarget > 0) return { ratePerMin: standardTarget, rateFrom: 'standard', why: 'the line standard’s target — not a plate speed' };
  return { why: `typed — ${p.why}` };
}

/** Where the rate is from, in the count's words: "plate speed of the
 *  Bagger", "standard time of Op 3 (the time study)", "Op 3's timed pace",
 *  "the line standard's target — not a plate speed", "typed". */
export function paceWords(c?: Pick<LossCount, 'rateFrom' | 'rateMachine' | 'ratePerson' | 'rateTimed'>, product?: string): string {
  if (c?.rateFrom === 'plate') return `plate speed of the ${c.rateMachine ?? 'machine that sets the pace'}`;
  if (c?.rateFrom === 'standard-time') return c.rateTimed ? `${c.ratePerson ?? 'the pace-setter'}’s timed pace` : `standard time of ${c.ratePerson ?? 'the pace-setter'} (the line balance)`;
  if (c?.rateFrom === 'standard') return `the line standard’s target${product ? ` for ${product}` : ''} — not a plate speed`;
  return 'typed';
}

/** How the count's rate is known, as the sentence says it. */
export function rateKnown(c?: Pick<LossCount, 'rateFrom' | 'rateMachine' | 'ratePerson' | 'rateTimed'>, product?: string): string {
  const w = paceWords(c, product);
  return c?.rateFrom === 'plate' || (c?.rateFrom === 'standard-time' && !c.rateTimed) ? `the rate is the ${w}` : `the rate is ${w}`;
}

/** What the rate is called where the rest is said — "running below the
 *  plate speed": the plate speed, the standard-time pace, or the rate. */
export const idealWord = (c?: Pick<LossCount, 'rateFrom'>): string =>
  c?.rateFrom === 'plate' ? 'plate speed' : c?.rateFrom === 'standard-time' ? 'standard-time pace' : 'rate';

/* ------------------------------------------------------- planned minutes */

/** PLANNED PRODUCTION TIME IS THE SHIFT LESS ITS PLANNED STOPS (§5): the
 *  window less the breaks the line stops for — none when relief keeps it
 *  running. `changed` when a person set the day's minutes otherwise. */
export interface Planned { windowMin: number; breakMin: number; workedOut: number; planned?: number; changed: boolean; words: string }

export function plannedOf(c: Pick<LossCount, 'from' | 'to'> & Partial<Pick<LossCount, 'shift' | 'plannedMin' | 'breakMin' | 'relief' | 'plannedWhy'>>): Planned {
  const windowMin = whole((c.to - c.from) / 60_000);
  const breakMin = c.relief ? 0 : Math.max(0, c.breakMin ?? 0);
  const workedOut = Math.max(0, windowMin - breakMin);
  const planned = c.plannedMin !== undefined && c.plannedMin > 0 ? c.plannedMin : undefined;
  const changed = planned !== undefined && whole(planned) !== workedOut;
  const span = c.shift ? 'shift' : 'window';
  const head = c.relief ? `${windowMin} min ${span}, relief covers the breaks`
    : breakMin > 0 ? `${windowMin} min ${span} − ${breakMin} min of breaks`
      : c.breakMin === 0 ? `${windowMin} min ${span}, no planned breaks` : `${windowMin} min ${span}, no breaks set`;
  const words = changed ? `${head} = ${workedOut}; ${whole(planned as number)} planned for the day — ${c.plannedWhy?.trim() || 'no reason given'}` : `${head} = ${workedOut} planned`;
  return { windowMin, breakMin, workedOut, ...(planned !== undefined ? { planned } : {}), changed, words };
}

/* ------------------------------------------------------- the rate counted */

/** WHAT THE LINE MADE A MINUTE, COUNTED — the good packs made ÷ the planned
 *  minutes: a shift's count said as a rate, by hand, never a score. Flow
 *  audit #8: "the gap is typed, not counted" — a 6M job's Numbers offers it
 *  as a reading in one tap, said as counted, so a line cannot read "on
 *  target" in its typed number while its own counts say otherwise. Undefined
 *  until both are in. */
export interface CountedRate { perMin: number; made: number; plannedMin: number; day: string; words: string }

export function countedRate(c: LossCount | undefined): CountedRate | undefined {
  const made = c?.made, planned = c?.plannedMin;
  if (!c || made === undefined || made < 0 || planned === undefined || planned <= 0) return undefined;
  const perMin = Math.round((made / planned) * 10) / 10;
  const day = todayISO(new Date(c.from));
  return { perMin, made, plannedMin: planned, day, words: `${shiftWords(c)}, ${niceDay(day)}: ${packs(made)} good packs in ${whole(planned)} planned min — ${rateWords(perMin)}` };
}

/* ------------------------------------------------------- the running speed */

/** The running speed timed: every live timing pooled — packs over minutes
 *  timed — so a longer timing weighs more. Undefined when none is in. */
export interface Running { perMin: number; n: number; min: number }

export function runningOf(timings?: RunTiming[]): Running | undefined {
  const live = (timings ?? []).filter(x => !x.struck && x.sec > 0 && x.packs >= 0);
  if (!live.length) return undefined;
  const min = live.reduce((n, x) => n + x.sec, 0) / 60;
  const packsN = live.reduce((n, x) => n + x.packs, 0);
  return { perMin: packsN / min, n: live.length, min };
}

/* ------------------------------------------------------------- the money */

/** What the line's cost model is read from — a workspace, and the price and
 *  materials a pack when they are known. */
export type CostModel = Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'marginPerPack'> & { pricePerPack?: number; materialsPerPack?: number };

/** Contribution a pack: price less materials when the line has them, else
 *  its margin a pack; none when it has neither. */
export function contributionOf(c?: CostModel): { perPack: number; from: 'price' | 'margin' } | undefined {
  if (!c) return undefined;
  if (c.pricePerPack !== undefined && c.materialsPerPack !== undefined && c.pricePerPack > c.materialsPerPack && c.materialsPerPack >= 0) return { perPack: c.pricePerPack - c.materialsPerPack, from: 'price' };
  if (c.marginPerPack !== undefined && c.marginPerPack > 0) return { perPack: c.marginPerPack, from: 'margin' };
  return undefined;
}

/* ------------------------------------------------------------- the figures */

/** One bar of the waterfall: a cause (stops under one category), the
 *  changeovers, the rejects — and the rest: slow running and short stops,
 *  or once a running speed is timed, each on its own. */
export interface LossBar {
  /** "cause:Breakdown" · "changeover" · "rejects" · "performance" · "slow" ·
   *  "short" — what a record raised from the bar names (StudyUse.step). */
  key: string;
  kind: 'cause' | 'changeover' | 'rejects' | 'performance' | 'slow' | 'short';
  /** The floor's words: the category, "Changeovers", "Rejects", "Slow
   *  running and short stops", "Slow running", "Short stops". */
  label: string;
  min: number;
  /** Stops under it — a batch counts its count. */
  stops?: number;
  /** The machine carrying most of its minutes, when the stops name one. */
  asset?: string;
  /** The bone it most likely belongs on: the floor's own taps when it gave
   *  them (Observation.causeM), else the category's usual bone (lib/sixm). */
  bone: SixM;
  /** How it is known: timed on the stopwatch (or the running speed timed),
   *  typed, counted (the rejects), or not logged (the rest). */
  grade: 'measured' | 'typed' | 'counted' | 'none';
  /** The rest over a tenth of the loss — the one kind of bar that may wear amber. */
  abnormal?: boolean;
  /** £ of idle labour, and £ of lost contribution, when the line has the cost. */
  labour?: number;
  contribution?: number;
  /** Packs — the rejects. */
  packs?: number;
}

export interface LossFigures {
  /** Planned minutes, packs made and a rate are all in. */
  enough: boolean;
  /** What is still to put in, in words. */
  missing: string[];
  plannedMin?: number;
  rate?: number;
  made?: number;
  rejects: number;
  expected?: number;
  /** Packs short of expected (0 when more were made). */
  shortPacks?: number;
  /** Packs made over what was expected — the rate or the count wants checking. */
  overPacks?: number;
  lostMin?: number;
  /** Whether the stops were given: without them the split is unknown. */
  split: boolean;
  /** Stops in the window, every category: how many rows, how many stops. */
  logged: number;
  stopsN: number;
  /** Minutes of stops that are not changeovers. */
  stopsMin: number;
  byCause: LossBar[];
  changeoverMin: number;
  changeoverN: number;
  rejectsMin?: number;
  /** Stops + changeovers + rejects. */
  explainedMin: number;
  /** Planned less the stops and the changeovers — the time it ran. */
  runMin?: number;
  /** The packs run, good and rejected, at the running speed timed: the net
   *  operating time (Nakajima) — what the run time holds once the short
   *  stops are out of it. */
  netMin?: number;
  /** THE REST — slow running and short stops: lost − explained, never below zero. */
  performanceMin?: number;
  /** performance ÷ lost. */
  performanceShare?: number;
  /** explained − lost, when the stops logged exceed the loss. */
  excessMin?: number;
  /** The running speed timed, when any is. */
  running?: Running;
  /** What the rate is called where the rest is said: "plate speed",
   *  "standard-time pace", "rate" (idealWord). */
  ideal: string;
  /** Told apart, once a running speed is timed: the net operating time less
   *  the packs at the ideal speed, capped at the rest; the short stops what
   *  is left — the run time less the net operating time. */
  slowMin?: number;
  shortMin?: number;
  /** The slow running the timing says before the cap — more than the rest
   *  leaves is said, not trusted. */
  slowRawMin?: number;
  /** Timed above the plate speed — the plate or the timing wants checking. */
  abovePlate?: boolean;
  /** £ an hour of the crew standing, and £ a pack not made — when the line has them. */
  labourPerHour?: number;
  contributionPerPack?: number;
  contributionFrom?: 'price' | 'margin';
  /** The shift's lost minutes in pounds, the two parts. */
  labour?: number;
  contribution?: number;
  /** The waterfall, in order: the causes (biggest first), the changeovers,
   *  the rejects, the rest. Only bars with something in them. */
  bars: LossBar[];
}

/** The bone a group of stops most likely sits on: the floor's taps carry the
 *  minutes they were given; else the category's usual bone (lib/sixm
 *  boneOfStop), weighed by minutes — a stop with no time weighs one minute,
 *  so a bar of count-only stops still finds a bone. */
function boneOf(rows: Observation[]): SixM {
  const weigh = (of: (o: Observation) => SixM | undefined) => {
    const w = new Map<SixM, number>();
    for (const o of rows) { const m = of(o); if (m) w.set(m, (w.get(m) ?? 0) + Math.max(1, minsOf(o))); }
    return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  return weigh(o => o.causeM) ?? weigh(o => boneOfStop(o.category, o.subcategory, o.note)) ?? 'machine';
}

/** The machine carrying most of a group's minutes, when any names one. */
function assetOf(rows: Observation[]): string | undefined {
  const w = new Map<string, number>();
  for (const o of rows) { const a = (o.asset ?? '').trim(); if (a) w.set(a, (w.get(a) ?? 0) + Math.max(1, minsOf(o))); }
  return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

const gradeOf = (rows: Observation[]): LossBar['grade'] => (rows.every(o => o.timing === 'stopwatch') ? 'measured' : 'typed');

/** The rest is abnormal over a tenth of the loss. */
export const REST_TENTH = 0.1;

/** The kinds of bar that make up the rest — the ones that may wear amber. */
export const isRest = (b: Pick<LossBar, 'kind'>): boolean => b.kind === 'performance' || b.kind === 'slow' || b.kind === 'short';

/** A bar by the key a record names — a record raised from the part once
 *  called "not yet explained" names the rest. */
export const findBar = (bars: LossBar[], key: string): LossBar | undefined => bars.find(b => b.key === (key === 'unexplained' ? 'performance' : key));

/** The figures, from the count, the stops in its window, the line's cost
 *  model and the running speed timed. `obs` undefined: the stops were not
 *  given (a list, a card) — the loss is worked out, the split is not. */
export function lossFigures(count: LossCount | undefined, obs?: Observation[], cost?: CostModel, timings?: RunTiming[]): LossFigures {
  const planned = count?.plannedMin !== undefined && count.plannedMin > 0 ? count.plannedMin : undefined;
  const rate = count?.ratePerMin !== undefined && count.ratePerMin > 0 ? count.ratePerMin : undefined;
  const made = count?.made !== undefined && count.made >= 0 ? count.made : undefined;
  const rejects = count?.rejects !== undefined && count.rejects > 0 ? count.rejects : 0;
  const missing = [...(planned === undefined ? ['the planned minutes'] : []), ...(made === undefined ? ['the packs made'] : []), ...(rate === undefined ? ['the rate a minute'] : [])];
  const perHour = cost ? labourPerHour(cost) : 0;
  const contrib = contributionOf(cost);
  /* each bar's pounds, the two parts: the crew standing for its minutes, and
     the packs its minutes would have made at the rate */
  const money = (min: number) => ({
    ...(perHour > 0 ? { labour: (min / 60) * perHour } : {}),
    ...(contrib && rate !== undefined ? { contribution: min * rate * contrib.perPack } : {}),
  });

  /* the stops in the window, by cause — the changeovers their own bar */
  const rows = obs && count ? inWindow(obs, count.from, count.to) : [];
  const groups = new Map<string, Observation[]>();
  const co: Observation[] = [];
  for (const o of rows) {
    if (isChangeover(o)) { co.push(o); continue; }
    const k = (o.category || 'Uncategorised').trim();
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const sum = (xs: Observation[], f: (o: Observation) => number) => xs.reduce((n, o) => n + f(o), 0);
  const byCause: LossBar[] = [...groups.entries()].map(([label, g]): LossBar => {
    const min = sum(g, minsOf), asset = assetOf(g);
    return { key: `cause:${label}`, kind: 'cause', label, min, stops: sum(g, stopsOf), ...(asset ? { asset } : {}), bone: boneOf(g), grade: gradeOf(g), ...money(min) };
  }).sort((a, b) => b.min - a.min || (b.stops ?? 0) - (a.stops ?? 0) || a.label.localeCompare(b.label));
  const stopsMin = byCause.reduce((n, b) => n + b.min, 0);
  const changeoverMin = sum(co, minsOf), changeoverN = sum(co, stopsOf);
  const running = runningOf(timings);

  const base: LossFigures = {
    enough: !missing.length, missing, ...(planned !== undefined ? { plannedMin: planned } : {}), ...(rate !== undefined ? { rate } : {}), ...(made !== undefined ? { made } : {}),
    rejects, split: !!obs, logged: rows.length, stopsN: sum(rows.filter(o => !isChangeover(o)), stopsOf), stopsMin, byCause, changeoverMin, changeoverN,
    explainedMin: 0, ...(running ? { running } : {}), ideal: idealWord(count),
    ...(perHour > 0 ? { labourPerHour: perHour } : {}), ...(contrib ? { contributionPerPack: contrib.perPack, contributionFrom: contrib.from } : {}), bars: [],
  };
  if (planned === undefined || rate === undefined || made === undefined) return base;

  const expected = planned * rate;
  const shortPacks = Math.max(0, expected - made);
  const overPacks = Math.max(0, made - expected);
  const lostMin = shortPacks / rate;
  const rejectsMin = rejects / rate;
  const explained = stopsMin + changeoverMin + rejectsMin;
  const rest = Math.max(0, lostMin - explained);
  const excess = Math.max(0, explained - lostMin);
  const runMin = Math.max(0, planned - stopsMin - changeoverMin);
  /* TOLD APART by the running speed (Nakajima's net operating time): every
     pack run, good and rejected, at the speed timed took packs ÷ running
     speed of the run time — the rest of it the line stood in stops too short
     to log; and the same packs at the ideal speed take packs ÷ ideal, the
     difference the slow running. It was the run time × (ideal − running) ÷
     ideal, which runs the line at the timed speed through its short stops
     too — slow running over-, short stops under-counted by the short stops ×
     the speed it lacked. Never more than the rest. A timing with no packs
     in it is not a running speed. On a line a person paces it sits on
     People, else on Machine. */
  const slowBone: SixM = count?.rateFrom === 'standard-time' ? 'people' : 'machine';
  const through = made + rejects;
  const timedRun = running && running.perMin > 0 ? running : undefined;
  const netMin = timedRun ? through / timedRun.perMin : undefined;
  const slowRaw = timedRun && netMin !== undefined ? (timedRun.perMin < rate ? netMin - through / rate : 0) : undefined;
  const slow = obs && slowRaw !== undefined ? Math.min(slowRaw, rest) : undefined;
  const short = slow !== undefined ? rest - slow : undefined;
  const tenth = (min: number) => lostMin > 0 && min / lostMin > REST_TENTH && min > 0.5;
  const restBars: LossBar[] = !obs ? []
    : slow !== undefined && short !== undefined ? [
      ...(slow > 0.5 ? [{ key: 'slow', kind: 'slow' as const, label: 'Slow running', min: slow, bone: slowBone, grade: 'measured' as const, ...(tenth(slow) ? { abnormal: true } : {}), ...money(slow) }] : []),
      ...(short > 0.5 ? [{ key: 'short', kind: 'short' as const, label: 'Short stops', min: short, bone: 'machine' as const, grade: 'none' as const, ...(tenth(short) ? { abnormal: true } : {}), ...money(short) }] : []),
    ]
      : rest > 0.5 ? [{ key: 'performance', kind: 'performance' as const, label: 'Slow running and short stops', min: rest, bone: 'machine' as const, grade: 'none' as const, ...(tenth(rest) ? { abnormal: true } : {}), ...money(rest) }] : [];
  const bars: LossBar[] = [
    ...byCause.filter(b => b.min > 0 || (b.stops ?? 0) > 0),
    ...(changeoverN > 0 ? [{ key: 'changeover', kind: 'changeover' as const, label: 'Changeovers', min: changeoverMin, stops: changeoverN, ...(assetOf(co) ? { asset: assetOf(co) } : {}), bone: boneOf(co), grade: gradeOf(co), ...money(changeoverMin) }] : []),
    ...(rejects > 0 ? [{ key: 'rejects', kind: 'rejects' as const, label: 'Rejects', min: rejectsMin, packs: rejects, bone: boneOfStop('Quality'), grade: 'counted' as const, ...money(rejectsMin) }] : []),
    ...restBars,
  ];
  const total = money(lostMin);
  return {
    ...base, expected, shortPacks, ...(overPacks > 0 ? { overPacks } : {}), lostMin, rejectsMin, explainedMin: explained,
    ...(obs ? { runMin, performanceMin: rest, ...(excess > 0 ? { excessMin: excess } : {}), ...(lostMin > 0 ? { performanceShare: rest / lostMin } : {}) } : {}),
    ...(obs && netMin !== undefined ? { netMin } : {}),
    ...(slow !== undefined && short !== undefined ? { slowMin: slow, shortMin: short, slowRawMin: slowRaw } : {}),
    ...(timedRun && timedRun.perMin > rate ? { abovePlate: true } : {}),
    ...(total.labour !== undefined ? { labour: total.labour } : {}), ...(total.contribution !== undefined ? { contribution: total.contribution } : {}),
    bars,
  };
}

/* ------------------------------------------------------------------ the words */

/** A rate as the floor says it: "100 a minute", "58.4 a minute". */
export const rateWords = (r: number): string => `${Number.isInteger(r) ? r : r.toFixed(1)} a minute`;
/** Packs with their thousands: "45,000". */
export const packs = (n: number): string => whole(n).toLocaleString('en-GB');
/** Whole pounds: "£3,600" (docs/TOOLKIT.md 3.4). */
export const gbp = (n: number): string => `£${whole(n).toLocaleString('en-GB')}`;
/** Pounds and pence, for a rate: "£75.40", "£0.04". */
export const gbp2 = (n: number): string => `£${n.toFixed(2)}`;
/** Whole minutes: "85 min". */
export const minWords = (m: number): string => `${whole(m)} min`;
const num = (n: number) => String(Number(n.toFixed(1)));

/** THE POUNDS IN TWO PARTS, as the sentence says them: "£107 idle labour ·
 *  £340 lost contribution if it cannot be made up" — '' with no cost. */
export function moneyWords(labour?: number, contribution?: number): string {
  return [...(labour !== undefined ? [`${gbp(labour)} idle labour`] : []), ...(contribution !== undefined ? [`${gbp(contribution)} lost contribution if it cannot be made up`] : [])].join(' · ');
}
const barMoney = (b: Pick<LossBar, 'labour' | 'contribution'>) => {
  const p = [...(b.labour !== undefined ? [`${gbp(b.labour)} idle labour`] : []), ...(b.contribution !== undefined ? [`${gbp(b.contribution)} lost contribution`] : [])];
  return p.length ? ` (${p.join(' · ')})` : '';
};

/** The shift as the sentence names it: its name, else its window — "the
 *  16:00–04:00 shift" — so a count typed by hand still says which hours. */
export const shiftWords = (c?: Pick<LossCount, 'shift'> & Partial<Pick<LossCount, 'from' | 'to'>>): string =>
  c?.shift?.trim() || (c?.from !== undefined && c.to !== undefined ? `The ${windowWords({ from: c.from, to: c.to })} shift` : 'The shift');

/** The day a count's shift started, relative to now — "today", "yesterday",
 *  else the day: "Fri 10 Oct". */
export function dayWords(from: number, now = Date.now()): string {
  const d0 = new Date(from); d0.setHours(0, 0, 0, 0);
  const n0 = new Date(now); n0.setHours(0, 0, 0, 0);
  const days = Math.round((n0.getTime() - d0.getTime()) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return new Date(from).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "06:00–14:00" */
export const windowWords = (c: Pick<LossCount, 'from' | 'to'>): string => {
  const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${hm(c.from)}–${hm(c.to)}`;
};

/** How the running speed was timed, and what it splits — the packs run
 *  (good and rejected) at the running speed and at the ideal speed: "Running
 *  speed timed at 98 a minute over 3 timings (3.5 min): slow running =
 *  37,100 packs run ÷ 98 − 37,100 ÷ 100 = 8 min; short stops = 380 min run −
 *  37,100 ÷ 98 = 1 min." */
export function splitWords(f: LossFigures): string | undefined {
  const r = f.running, rate = f.rate;
  if (!r || rate === undefined || f.slowMin === undefined || f.shortMin === undefined) return undefined;
  const timed = `Running speed timed at ${rateWords(r.perMin)} over ${r.n} timing${r.n === 1 ? '' : 's'} (${num(r.min)} min)`;
  if (f.abovePlate) return `${timed}, above the ${f.ideal} of ${rateWords(rate)} — no slow running; check the ${f.ideal} or the timing.`;
  const raw = f.slowRawMin ?? 0;
  const through = packs((f.made ?? 0) + f.rejects);
  const sum = `slow running = ${through} packs run ÷ ${num(r.perMin)} − ${through} ÷ ${num(rate)} = ${minWords(raw)}`;
  if (raw > (f.performanceMin ?? 0) + 0.5) return `${timed}: ${sum} — more than the ${minWords(f.performanceMin ?? 0)} the count leaves; time it again, or check the counts.`;
  return `${timed}: ${sum}; short stops = ${minWords(f.runMin ?? 0)} run − ${through} ÷ ${num(r.perMin)} = ${minWords(f.shortMin)}.`;
}

export interface LossSays { text: string; tone: Tone; verdict: string; lines: { text: string; tone: Tone }[] }

/** What the count says — the one sentence, then the lines under it: how
 *  each number is known, and what wants checking. */
export function lossSays(f: LossFigures, c?: LossCount, o: { product?: string; maxLostMin?: number } = {}): LossSays {
  const base = lossSaysFigures(f, c, o);
  const vs = lostAgainst(f, o.maxLostMin);
  if (!vs) return base;
  return { ...base, text: `${base.text} ${vs.text}`, tone: vs.word === 'within' ? 'g' : vs.word === 'over' ? 'r' : base.tone, verdict: vs.verdict };
}

/** AGAINST THE MOST A SHIFT MAY LOSE (30 October, a program's criterion — AgreedLosses.maxLostMin, typed on the count): the
 *  minutes lost at the bottleneck's speed, which the count's own figures give (`lostMin`), against it. `within` at or under
 *  it, `over` above it, `notYet` while the shift is not counted. Undefined when no most is wanted. */
export function lostAgainst(f: LossFigures, max: number | undefined): { word: 'within' | 'over' | 'notYet'; text: string; verdict: string } | undefined {
  if (!(max !== undefined && Number.isFinite(max) && max >= 0)) return undefined;
  if (!f.enough || f.lostMin === undefined) return { word: 'notYet', text: `At most ${minWords(max)} lost is the target — the shift is not counted yet.`, verdict: `Not yet against ${minWords(max)}` };
  const lost = f.lostMin;
  return lost > max + 1e-9
    ? { word: 'over', text: `${minWords(lost)} lost against at most ${minWords(max)} — over by ${minWords(lost - max)}.`, verdict: `Over the ${minWords(max)} allowed by ${minWords(lost - max)}` }
    : { word: 'within', text: `${minWords(lost)} lost, within the ${minWords(max)} allowed.`, verdict: `Within the ${minWords(max)} allowed` };
}

function lossSaysFigures(f: LossFigures, c?: LossCount, o: { product?: string } = {}): LossSays {
  const who = shiftWords(c);
  if (!f.enough) {
    return { text: `Count the shift: ${f.missing.join(', ')} still to put in — then the waterfall draws itself from the stops already timed.`, tone: 'n', verdict: 'Not yet counted', lines: [] };
  }
  const lost = f.lostMin ?? 0, rate = f.rate ?? 0;
  const head = `${who} should have made ${packs(f.expected ?? 0)} at ${rateWords(rate)}; made ${packs(f.made ?? 0)}`;
  const pounds = moneyWords(f.labour, f.contribution);
  const lines: LossSays['lines'] = [];
  const known: string[] = [];
  if (c) known.push(plannedOf(c).words);
  known.push('the packs made and the rejects counted');
  known.push(rateKnown(c, o.product));
  if (f.split) known.push(f.logged ? `${f.logged} stop${f.logged === 1 ? '' : 's'} timed in Capture in the window` : 'no stops logged in the window');
  if (f.labourPerHour !== undefined) known.push(`idle labour ${gbp2(f.labourPerHour)} an hour (crew × wage × on-costs)`);
  if (f.contributionPerPack !== undefined) known.push(`contribution ${gbp2(f.contributionPerPack)} a pack (${f.contributionFrom === 'price' ? 'price less materials' : 'the line’s margin'})`);
  const howKnown = { text: `How known: ${known.join(' · ')}.`, tone: 'n' as Tone };

  if (f.overPacks && f.overPacks > 0) {
    lines.push({ text: `Made ${packs(f.overPacks)} more than expected at ${rateWords(rate)} — check the rate or the count.`, tone: 'a' });
    lines.push(howKnown);
    return { text: `${head} — nothing lost against the rate.`, tone: 'a', verdict: 'Nothing lost', lines };
  }
  if (!f.split) {
    lines.push(howKnown);
    return { text: `${head} — ${minWords(lost)} lost.${pounds ? ` ${pounds}.` : ''} Where it went is read from the line's stops in the window.`, tone: 'n', verdict: `${minWords(lost)} lost`, lines };
  }
  const rest = f.performanceMin ?? 0;
  const none = 'no slow running or short stops left over';
  const restParts = f.excessMin && f.excessMin > 0 ? []
    : f.slowMin !== undefined && f.shortMin !== undefined
      ? (f.slowMin > 0.5 || f.shortMin > 0.5
        ? [...(f.slowMin > 0.5 ? [`${minWords(f.slowMin)} of slow running`] : []), ...(f.shortMin > 0.5 ? [`${minWords(f.shortMin)} of short stops`] : [])]
        : [none])
      : [rest > 0.5 ? `${minWords(rest)} of slow running and short stops` : none];
  const parts = [
    `${minWords(f.stopsMin)} of stops`,
    ...(f.changeoverN > 0 ? [`${minWords(f.changeoverMin)} of changeovers`] : []),
    f.rejects > 0 ? `${minWords(f.rejectsMin ?? 0)} of rejects (${packs(f.rejects)} packs)` : 'no rejects',
    ...restParts,
  ];
  const text = `${head} — ${minWords(lost)} lost: ${parts.join(' · ')}.${pounds ? ` ${pounds}.` : ''}`;
  if (f.excessMin && f.excessMin > 0.5) lines.push({ text: `Stops logged exceed the loss by ${minWords(f.excessMin)} — check the counts.`, tone: 'a' });
  if (lost > 0 && !f.logged) lines.push({ text: 'No stops logged in the window — the Pareto is empty for this shift.', tone: 'n' });
  const split = splitWords(f);
  if (split) lines.push({ text: split, tone: f.abovePlate || (f.slowRawMin ?? 0) > rest + 0.5 ? 'a' : 'n' });
  else if (rest > 0.5) lines.push({ text: `Slow running and short stops is the rest: running below the ${f.ideal}, and stops too short to log — not yet told apart. Time the running speed while it runs to split them.`, tone: 'n' });
  lines.push(howKnown);
  const flagged = f.bars.filter(b => b.abnormal).sort((a, b) => b.min - a.min)[0];
  const tone: Tone = flagged || (f.excessMin ?? 0) > 0.5 ? 'a' : 'n';
  const verdict = lost <= 0 ? 'Nothing lost' : flagged ? `${minWords(flagged.min)} ${flagged.label.toLowerCase()}` : `${minWords(lost)} lost`;
  return { text, tone, verdict, lines };
}

/** A bar in its own words — the figure a fix or a countermeasure is raised
 *  with: "Breakdown on the Bagger — 32 min of stops (1 stop) on Shift 1,
 *  yesterday (£40 idle labour · £128 lost contribution)". */
export function barWords(b: LossBar, c?: LossCount, now?: number): string {
  const when = c ? ` on ${shiftWords(c)}, ${dayWords(c.from, now)}` : ' this shift';
  const at = b.asset ? ` on the ${b.asset}` : '';
  const ideal = idealWord(c);
  switch (b.kind) {
    case 'cause': return `${b.label}${at} — ${minWords(b.min)} of stops (${b.stops ?? 0} stop${b.stops === 1 ? '' : 's'})${when}${barMoney(b)}`;
    case 'changeover': return `Changeovers${at} — ${minWords(b.min)} (${b.stops ?? 0})${when}${barMoney(b)}`;
    case 'rejects': return `Rejects — ${packs(b.packs ?? 0)} packs, ${minWords(b.min)} at the rate${when}${barMoney(b)}`;
    case 'slow': return `Slow running — ${minWords(b.min)} below the ${ideal}${when}${barMoney(b)}`;
    case 'short': return `Short stops — ${minWords(b.min)} of stops too short to log${when}${barMoney(b)}`;
    default: return `${minWords(b.min)} of slow running and short stops${when}${barMoney(b)} — running below the ${ideal}, and stops too short to log`;
  }
}

/** What a countermeasure raised from a bar should change — said before it is
 *  done, held against the next shift's count. */
export function barExpect(b: LossBar, c?: Pick<LossCount, 'rateFrom'>): string {
  if (b.kind === 'performance') return `Slow running and short stops: ${minWords(b.min)} a shift — fewer on the next shift counted, the running speed timed to tell them apart`;
  if (b.kind === 'slow') return `Slow running: ${minWords(b.min)} a shift — the running speed nearer the ${idealWord(c)} on the next shift counted`;
  return `${b.label}${b.asset ? ` on the ${b.asset}` : ''}: ${minWords(b.min)} a shift — fewer on the next shift counted`;
}

/* ------------------------------------------------------------- before → after */

/** BEFORE → AFTER on two counts of the same shift: lost minutes and the
 *  slow running and short stops — and first, when the fix was raised from a
 *  bar, that bar. It says "the number moved", never "the fix did it". */
export function compareLosses(before: LossFigures, after: LossFigures, bar?: string): { text: string; tone: Tone } {
  if (!before.enough || !after.enough) return { text: 'Too early — the next shift is not counted yet.', tone: 'n' };
  const b = before.lostMin ?? 0, a = after.lostMin ?? 0;
  const both = before.split && after.split;
  const key = bar === 'unexplained' ? 'performance' : bar;
  const parts: string[] = [];
  if (key === 'performance') {
    if (both) parts.push(`Slow running and short stops: ${minWords(before.performanceMin ?? 0)} → ${minWords(after.performanceMin ?? 0)}`);
  } else if (key) {
    const x = findBar(before.bars, key), y = findBar(after.bars, key);
    const label = x?.label ?? y?.label;
    const untimed = (key === 'slow' || key === 'short') && after.slowMin === undefined;
    if (label) parts.push(`${label}${x?.asset ? ` on the ${x.asset}` : ''}: ${minWords(x?.min ?? 0)} → ${untimed ? 'not timed' : minWords(y?.min ?? 0)}`);
  }
  parts.push(whole(a) === whole(b) ? `Lost ${minWords(b)} a shift, no change` : `Lost ${minWords(b)} → ${minWords(a)} a shift`);
  if (both && key !== 'performance') {
    const rb = before.performanceMin ?? 0, ra = after.performanceMin ?? 0;
    parts.push(whole(rb) === whole(ra) ? `slow running and short stops ${minWords(rb)}, no change` : `slow running and short stops ${minWords(rb)} → ${minWords(ra)}`);
  }
  const tone: Tone = whole(a) < whole(b) ? 'g' : whole(a) > whole(b) ? 'r' : 'n';
  return { text: `${parts.join('; ')}. The number moved; what moved it is the fix's to say.`, tone };
}

/** PROVE IT: the next shift's count, the same shift pattern — the window
 *  moved on by whole days to the latest one that has ended when it is pressed
 *  (a quarter of an hour's grace), never the same shift twice, and the next
 *  day's when none has ended yet; the rate, the breaks and the planned
 *  minutes carried (a day's own change to them not), nothing counted yet. */
export function nextShift(c: LossCount, at: number): LossCount {
  const k = Math.max(1, Math.floor((at + 15 * 60_000 - c.to) / DAY));
  const { made: _m, rejects: _r, plannedWhy, ...rest } = c;
  void _m; void _r;
  return { ...rest, ...(plannedWhy !== undefined ? { plannedMin: plannedOf(c).workedOut } : {}), from: c.from + k * DAY, to: c.to + k * DAY };
}

/** THE STOPS UNDER ONE BAR — what tapping it opens: the stops in the
 *  count's window of that cause (or the changeovers), in the order they
 *  happened. The rejects and the rest have none. */
export function stopsOfBar(obs: Observation[], c: Pick<LossCount, 'from' | 'to'>, bar: Pick<LossBar, 'kind' | 'label'>, workspaceId?: string): Observation[] {
  const rows = inWindow(obs, c.from, c.to, workspaceId).sort((a, b) => a.startedAt - b.startedAt);
  if (bar.kind === 'changeover') return rows.filter(isChangeover);
  if (bar.kind === 'cause') return rows.filter(o => !isChangeover(o) && (o.category || 'Uncategorised').trim() === bar.label);
  return [];
}

/* ---------------------------------------------------------- one line, paper */

/** The count in one line for a card or a row: "Shift 1 yesterday: 85 min
 *  lost · 9 min slow running and short stops". `abnormal` when the rest (or
 *  either part of it) is over a tenth, or the counts want checking — the one
 *  part that wears amber. */
export function lossLine(f: LossFigures, c: LossCount, now = Date.now()): { text: string; abnormal: boolean } {
  const when = `${shiftWords(c)} ${dayWords(c.from, now)}`;
  if (!f.enough) return { text: `${when}: not yet counted`, abnormal: false };
  if (f.overPacks && f.overPacks > 0) return { text: `${when}: made ${packs(f.overPacks)} over the rate — check the count`, abnormal: true };
  const rest = f.performanceMin ?? 0;
  const told = f.slowMin !== undefined && f.shortMin !== undefined
    ? [...(f.slowMin > 0.5 ? [`${minWords(f.slowMin)} slow running`] : []), ...(f.shortMin > 0.5 ? [`${minWords(f.shortMin)} short stops`] : [])]
    : rest > 0.5 ? [`${minWords(rest)} slow running and short stops`] : [];
  const tail = !f.split ? '' : f.excessMin && f.excessMin > 0.5 ? ` · stops exceed the loss by ${minWords(f.excessMin)}` : told.length ? ` · ${told.join(' · ')}` : ' · the stops explain it all';
  return { text: `${when}: ${minWords(f.lostMin ?? 0)} lost${tail}`, abnormal: f.bars.some(b => b.abnormal) || (f.excessMin ?? 0) > 0.5 };
}

/** One row of the waterfall as paper says it (lib/report/lossTable): every
 *  figure already in words, so the PDF only draws. */
export interface LossRow { cause: string; stops: string; minutes: string; labour: string; contribution: string; kind: LossBar['kind']; abnormal?: boolean;
  /** Its share of the minutes lost — "38%" — the lean page's top causes (docs/LEAN-PAGE.md). */
  share: string }

const restCause = (b: LossBar, f: LossFigures): string => {
  if (b.kind === 'slow') return `Slow running — timed at ${rateWords(f.running?.perMin ?? 0)} against the ${f.ideal} of ${rateWords(f.rate ?? 0)}`;
  if (b.kind === 'short') return 'Short stops — the rest once the slow running is timed: stops too short to log';
  return `Slow running and short stops — the rest: below the ${f.ideal}, and stops too short to log; not yet told apart`;
};

/** How the rate is known, on paper: ", the plate speed of the Bagger". */
const rateSource = (c?: Pick<LossCount, 'rateFrom' | 'rateMachine' | 'ratePerson' | 'rateTimed'>): string =>
  c?.rateFrom === 'plate' || (c?.rateFrom === 'standard-time' && !c.rateTimed) ? `, the ${paceWords(c)}` : `, ${paceWords(c)}`;

/** THE WATERFALL AS A TABLE: a row per bar — cause · stops · minutes · idle
 *  labour · lost contribution — and the total lost; the head says how the
 *  planned minutes and the rate are known, and what was expected and made. */
/** `where` — whether a bar's stops sit on the line's constraint, as the count's
 *  own page says it (lib/lineRead constraintOfBars): the paper says it too. */
export function lossRows(f: LossFigures, c?: LossCount, where?: (b: LossBar) => 'on' | 'off' | undefined): { head: string; rows: LossRow[]; total: { minutes: string; labour: string; contribution: string } } | undefined {
  if (!f.enough) return undefined;
  const money = (n?: number) => (n !== undefined ? gbp(n) : '');
  const rows: LossRow[] = f.bars.map(b => ({
    cause: `${b.kind === 'cause' && b.asset ? `${b.label} — ${b.asset}` : b.kind === 'rejects' ? `Rejects (${packs(b.packs ?? 0)} packs)` : isRest(b) ? restCause(b, f) : b.label}${(w => (w === 'on' ? ' · on the constraint' : w === 'off' ? ' · off the constraint' : ''))(where?.(b))}`,
    stops: b.stops !== undefined ? String(b.stops) : '—', minutes: minWords(b.min), labour: money(b.labour), contribution: money(b.contribution), kind: b.kind,
    share: (f.lostMin ?? 0) > 0 ? `${Math.round((b.min / (f.lostMin ?? 1)) * 100)}%` : '',
    ...(b.abnormal ? { abnormal: true } : {}),
  }));
  const planned = c ? `${whole(f.plannedMin ?? 0)} planned minutes (${plannedOf(c).words.replace(/ = \d+ planned$/, '')})` : `${whole(f.plannedMin ?? 0)} planned minutes`;
  return {
    head: `${planned} at ${rateWords(f.rate ?? 0)}${c ? rateSource(c) : ''} — ${packs(f.expected ?? 0)} expected, ${packs(f.made ?? 0)} made`,
    rows, total: { minutes: minWords(f.lostMin ?? 0), labour: money(f.labour), contribution: money(f.contribution) },
  };
}

/** A NEW COUNT'S FIRST FACTS: the shift that has just run on the line — of
 *  every shift's window today and yesterday, the latest one that has ended
 *  (a quarter of an hour's grace, so the count can be made in the last
 *  minutes) — else 06:00–14:00 today, typed, when the line has no shifts; the
 *  planned minutes the shift less its breaks (none under relief); the rate
 *  the bottleneck's ideal speed (rateOf). Every one is changed on the count itself — they
 *  save the taps. */
export function firstCount(shifts: Shift[], rate: Omit<RateOf, 'why'> | undefined, t: number): LossCount {
  const days = [todayISO(new Date(t - DAY)), todayISO(new Date(t))];
  const ended = shifts.flatMap(x => days.flatMap(d => { const w = shiftWindow(x, d); return w && w.to <= t + 15 * 60_000 ? [{ shift: x, ...w }] : []; }))
    .sort((a, b) => b.to - a.to)[0];
  const w = ended ?? shiftWindow({ start: '06:00', end: '14:00' }, days[1]) ?? { from: t - 8 * 3_600_000, to: t };
  const sh = ended?.shift;
  const breaks = { ...(sh?.breakMin !== undefined && sh.breakMin >= 0 ? { breakMin: sh.breakMin } : {}), ...(sh?.relief ? { relief: true } : {}) };
  return { ...(sh ? { shift: sh.name } : {}), from: w.from, to: w.to, plannedMin: plannedOf({ from: w.from, to: w.to, ...breaks }).workedOut, ...breaks,
    ...(rate?.ratePerMin !== undefined && rate.ratePerMin > 0 ? { ratePerMin: rate.ratePerMin, rateFrom: rate.rateFrom ?? 'typed', ...(rate.rateMachine ? { rateMachine: rate.rateMachine } : {}),
      ...(rate.ratePerson ? { ratePerson: rate.ratePerson } : {}), ...(rate.rateTimed ? { rateTimed: true } : {}) } : {}) };
}
