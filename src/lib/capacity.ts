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
  /** How the speed is known — the plate, timed by somebody, or a guess. */
  source?: 'plate' | 'timed' | 'estimate';
  note?: string;
  /** The machine name its stops are logged under, when that is not its name. */
  asset?: string;
}

export interface Capacity {
  /** What the line should be doing, in the line's own unit per minute. */
  targetPerMin?: number;
  /** Planned running hours in a week — what a share of stops is measured
   *  against. Only used to SUGGEST a running percentage, never silently. */
  plannedHoursPerWeek?: number;
  stations: Station[];
}

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
export function stationProblem(s: Station, i: number): string | undefined {
  if (!s.unit.trim()) return 'it does not say what it counts in';
  if (i > 0 && !(s.contains > 0)) return `it does not say how many of the one before make one ${s.unit.trim()}`;
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
}

export interface Skipped { station: Station; index: number; why: string }

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
  stations.forEach((s, i) => {
    if (i > 0) {
      if (chainBroken) { skipped.push({ station: s, index: i, why: `the chain of units breaks at ${chainBroken}` }); return; }
      if (s.contains > 0) factor *= s.contains;
      else { chainBroken = s.name || `station ${i + 1}`; }
    }
    const problem = stationProblem(s, i);
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
    ok.push({ station: s, index: i, factor, chain, running, effective, loadAtLine: 0, headroom: 0 });
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
  const out: CapacityResult = { unit, ok, skipped, target, sentence: '', notes };

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

export interface StopStats { ownMins: number; waitMins: number; events: number }

/** Starved or blocked by a neighbour — not the station's own fault. */
export const isWaiting = (o: Pick<Observation, 'category' | 'subcategory'>): boolean =>
  /^wait/i.test((o.category || '').trim()) || /starv|block/i.test(o.subcategory || '');

/** Each station's timed stops over a window, own and waiting kept apart.
 *  Matched on the machine name the stop was logged against. */
export function stopStats(obs: Observation[], stations: Station[], from: number, to: number): Record<string, StopStats> {
  const out: Record<string, StopStats> = {};
  for (const s of stations) out[s.id] = { ownMins: 0, waitMins: 0, events: 0 };
  const key = (s: Station) => norm(s.asset?.trim() || s.name);
  for (const o of obs) {
    if (o.deletedAt || !(o.durationMs > 0) || o.startedAt < from || o.startedAt >= to) continue;
    const st = stations.find(s => key(s) && key(s) === norm(o.asset || ''));
    if (!st) continue;
    const m = o.durationMs / 60_000;
    const slot = out[st.id];
    if (isWaiting(o)) slot.waitMins += m; else slot.ownMins += m;
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
  return { id, name: '', kind, unit: first ? 'units' : '', contains: 1, ratePer: 'min', crew: 1, source: 'estimate' };
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
  line: number;
  target?: number;
  /** The most any bar reaches — the scale both drawings share. */
  top: number;
  rows: { name: string; kind: StationKind; chain: string; running: number; effective: number; limit: boolean }[];
  /** Stations counted but not drawn, when a line has more than a sheet holds. */
  more: number;
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
    out.push({
      name: l.name, owner: l.owner, unit: r.unit, sentence: r.sentence, line: r.line, target: r.target,
      top: Math.max(...shown.map(x => x.running), r.target ?? 0) * 1.06 || 1,
      rows: shown.map(x => ({
        name: x.station.name.trim() || `Station ${x.index + 1}`, kind: x.station.kind, chain: x.chain,
        running: x.running, effective: x.effective, limit: x.index === (r.limit as StationResult).index,
      })),
      more: r.ok.length - shown.length,
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
    const w = 3 + l.rows.length + (l.more > 0 ? 1 : 0);
    if (!sheets.length || used + w > CAP_SHEET_UNITS) { sheets.push([]); used = 0; }
    sheets[sheets.length - 1].push(i);
    used += w;
  });
  return sheets;
}
