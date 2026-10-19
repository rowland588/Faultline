/* THE VIDEO STUDY, WORKED OUT (docs/VIDEO.md, the manufacturing engine).
 *
 * Deterministic and pure: the events a person has accepted — or, said as
 * provisional, those still candidates too — become each station's cycles,
 * its work and its waiting, the line's rate and its balance against takt.
 * The model is never the calculator: whatever proposed an event, the numbers
 * are worked out here, the same way every time, from the boundaries a person
 * can see and correct.
 *
 * The line balance is the line balance's own (lib/ie/balance): a station's
 * accepted work becomes an element whose laps are those events' durations,
 * its waiting another, so the stacks, the takt, the fewest people and the
 * efficiency are worked out by the module every line balance uses. */
import type { BalanceStep } from '../study';
import { balance, cyclesNeeded, MIN_CYCLES, t95, type BalanceFigures } from '../ie/balance';
import type { VideoEvent, VideoSource, VideoZone } from './record';

export type Basis = 'verified' | 'provisional';

export interface Stats {
  n: number; mean: number; median: number; min: number; max: number; range: number; sd?: number; cv?: number;
  /** Half the 95% interval of the mean (Student's t at n − 1) — from three on. */
  ci95?: number;
}

export function stats(xs: readonly number[]): Stats | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length, mean = s.reduce((t, x) => t + x, 0) / n;
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const sd = n >= 3 ? Math.sqrt(s.reduce((t, x) => t + (x - mean) ** 2, 0) / (n - 1)) : undefined;
  return { n, mean, median, min: s[0], max: s[n - 1], range: s[n - 1] - s[0], ...(sd !== undefined ? { sd, cv: mean > 0 ? sd / mean : undefined, ci95: (t95(n - 1) * sd) / Math.sqrt(n) } : {}) };
}

/** The events a figure is worked from: accepted only, or accepted and still-candidate. */
export function counted(events: readonly VideoEvent[], basis: Basis): VideoEvent[] {
  return events.filter(e => e.review === 'accepted' || (basis === 'provisional' && e.review === 'candidate'));
}

export interface Wait { zone: string; start: number; end: number; sec: number }

export interface StationFigures {
  zone: VideoZone;
  /** Its work events counted, in time order. */
  work: VideoEvent[];
  /** Of them, the ones cut off by the start or the end of the footage — not whole cycles, kept out of the times. */
  partial: VideoEvent[];
  /** The work in one cycle: each whole event's length. */
  workTime?: Stats;
  /** Start to start of one whole piece of work and the next. */
  cycleTime?: Stats;
  waits: Wait[];
  waitTime?: Stats;
  /** Cycles more than half again as long as the usual one — a cycle may have been missed there. */
  long: { after: VideoEvent; sec: number }[];
  /** Work ÷ cycle: how much of its cycle the station is working. */
  utilisation?: number;
  /** Its events nobody has reviewed yet. */
  candidates: number;
  /** ± seconds on one piece of work's length, from the ± on its two ends. */
  pm: number;
  /** Whole cycles needed to know its work a cycle to ±5% at 95% (lib/ie/balance), and whether it has them. */
  needed?: number;
  enough: boolean;
  /** Of its counted work, the events the footage flags (the camera shook, the light jumped, after a move). */
  flagged: number;
}

const EDGE = 0.25;

export function stationFigures(zone: VideoZone, events: readonly VideoEvent[], basis: Basis, durationSec: number, sampleSec = 0.2): StationFigures {
  const mine = events.filter(e => e.zone === zone.id);
  const work = counted(mine, basis).filter(e => e.category === 'work' || e.category === 'cycle').sort((a, b) => a.start - b.start);
  const edge = Math.max(EDGE, sampleSec * 1.5);
  const isPartial = (e: VideoEvent) => e.start <= edge || e.end >= durationSec - edge;
  const partial = work.filter(isPartial);
  const whole = work.filter(e => !isPartial(e));
  const workTime = stats(whole.map(e => e.end - e.start));
  /* waiting is the gap between one piece of work and the next — never before the first or after the last, which the footage cuts */
  const waits: Wait[] = [];
  for (let i = 1; i < work.length; i++) {
    const a = work[i - 1], b = work[i];
    if (b.start > a.end) waits.push({ zone: zone.id, start: a.end, end: b.start, sec: b.start - a.end });
  }
  /* a cycle is start to start of two pieces of work that both began in the footage */
  const cyc = work.slice(1).map((b, i) => ({ a: work[i], b })).filter(({ a }) => a.start > edge).map(({ a, b }) => ({ after: a, sec: b.start - a.start }));
  const cycleTime = stats(cyc.map(c => c.sec));
  const long = cycleTime && cycleTime.n >= 3 ? cyc.filter(c => c.sec > 1.5 * cycleTime.median) : [];
  const waitTime = stats(waits.map(w => w.sec));
  /* the ± on a length: its two ends' ± together (the reading's half interval, or a person's frame) */
  const ends = Math.max(sampleSec / 2, ...work.map(e => e.pm ?? sampleSec / 2));
  const needed = workTime ? Math.max(MIN_CYCLES, workTime.sd !== undefined ? cyclesNeeded(workTime.mean, workTime.sd, workTime.n) : MIN_CYCLES) : undefined;
  return {
    zone, work, partial, ...(workTime ? { workTime } : {}), ...(cycleTime ? { cycleTime } : {}), waits, ...(waitTime ? { waitTime } : {}), long,
    ...(workTime && cycleTime && cycleTime.mean > 0 ? { utilisation: Math.min(1, workTime.mean / cycleTime.mean) } : {}),
    candidates: mine.filter(e => e.review === 'candidate').length,
    pm: Math.round(Math.SQRT2 * ends * 100) / 100,
    ...(needed !== undefined ? { needed } : {}), enough: !!workTime && needed !== undefined && workTime.n >= needed,
    flagged: work.filter(e => e.flags?.length).length,
  };
}

/** TAKT from the demand and the time to make it in: seconds a unit. */
export function taktOf(d: VideoSource['demand']): number | undefined {
  if (!d || !(d.units > 0) || !(d.availableMin > 0)) return undefined;
  return (d.availableMin * 60) / d.units;
}

/** THE LINE BALANCE'S ELEMENTS from the footage: a station's work and its
 *  waiting, each timed by the events counted — laps whose seconds are the
 *  events' lengths, whose ids are the events'. */
export function stepsFromEvents(zones: readonly VideoZone[], events: readonly VideoEvent[], basis: Basis, durationSec: number, sampleSec = 0.2): BalanceStep[] {
  const out: BalanceStep[] = [];
  zones.forEach((z, i) => {
    const f = stationFigures(z, events, basis, durationSec, sampleSec);
    const who = z.track.trim() || z.label;
    const whole = f.work.filter(e => !f.partial.includes(e));
    out.push({ id: `v-${z.id}-work`, order: i * 2, name: `Work at ${z.label}`, who, kind: 'work',
      laps: whole.map(e => ({ id: e.id, sec: round(e.end - e.start), at: Math.round(e.start * 1000) })) });
    /* waiting a long cycle holds is not counted as the usual wait — it may hide a missed cycle */
    const usual = f.waits.filter(w => !f.long.some(l => Math.abs(l.after.end - w.start) < 1e-6));
    /* the line balance counts it as waiting; the footage only shows no movement there (docs/VIDEO-DESIGN.md, D2) */
    if (usual.length) out.push({ id: `v-${z.id}-wait`, order: i * 2 + 1, name: `No movement at ${z.label}`, who, kind: 'wait',
      laps: usual.map((w, k) => ({ id: `${z.id}-w${k + 1}`, sec: round(w.sec), at: Math.round(w.start * 1000) })) });
  });
  return out;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export interface VideoStudyFigures {
  basis: Basis;
  stations: StationFigures[];
  accepted: number;
  candidates: number;
  rejected: number;
  /** Every event reviewed, none waiting on a person. */
  verified: boolean;
  takt?: number;
  /** The station whose work in a cycle is longest — it sets the pace. */
  bottleneck?: StationFigures;
  /** What the line can make at the bottleneck's cycle: units a minute. */
  ratePerMin?: number;
  /** Σ work ÷ (stations × the longest): how evenly the work is spread. */
  efficiency?: number;
  overTakt: { station: StationFigures; bySec: number }[];
  /** The line balance's own figures, from the same events (lib/ie/balance). */
  balance: BalanceFigures;
  /** What cannot be worked out yet, and what would let it be. */
  missing: string[];
  /** ± seconds on a piece of work's length at the least sure station. */
  pm: number;
  /** Counted events the footage flags. */
  flagged: number;
}

export function videoFigures(v: Pick<VideoSource, 'facts' | 'job' | 'demand'>, events: readonly VideoEvent[], basis: Basis = 'verified'): VideoStudyFigures {
  const zones = v.job.config.zones;
  const d = v.facts.durationSec, step = v.job.config.sampleSec;
  const stations = zones.map(z => stationFigures(z, events, basis, d, step));
  const takt = taktOf(v.demand);
  const timed = stations.filter(s => s.workTime);
  const bottleneck = timed.reduce<StationFigures | undefined>((m, s) => (!m || (s.workTime?.mean ?? 0) > (m.workTime?.mean ?? 0) ? s : m), undefined);
  const pace = bottleneck?.cycleTime?.mean ?? bottleneck?.workTime?.mean;
  const longest = bottleneck?.workTime?.mean ?? 0;
  const efficiency = timed.length >= 2 && longest > 0 ? timed.reduce((t, s) => t + (s.workTime?.mean ?? 0), 0) / (timed.length * longest) : undefined;
  const overTakt = takt ? timed.filter(s => (s.workTime?.mean ?? 0) > takt).map(s => ({ station: s, bySec: (s.workTime?.mean ?? 0) - takt })) : [];
  const steps = stepsFromEvents(zones, events, basis, d, step);
  const missing: string[] = [];
  if (!takt) missing.push('Takt: the demand (how many) and the time to make it in (minutes a shift or a day).');
  for (const s of stations) if (!s.workTime) missing.push(`${s.zone.label}: no whole piece of work ${basis === 'verified' ? 'accepted' : 'found'} yet.`);
  const accepted = events.filter(e => e.review === 'accepted').length;
  const candidates = events.filter(e => e.review === 'candidate').length;
  return {
    basis, stations, accepted, candidates, rejected: events.filter(e => e.review === 'rejected').length,
    verified: events.length > 0 && candidates === 0 && accepted > 0,
    ...(takt ? { takt } : {}), ...(bottleneck ? { bottleneck } : {}),
    ...(pace && pace > 0 ? { ratePerMin: 60 / pace } : {}), ...(efficiency !== undefined ? { efficiency } : {}),
    overTakt, balance: balance(steps, takt ? { taktSec: takt } : undefined), missing,
    pm: Math.max(0, ...stations.map(s => s.pm)), flagged: stations.reduce((t, s) => t + s.flagged, 0),
  };
}

/** A time in the footage, as the player shows it: 1:05.3. */
export function clock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
}

export const sec1 = (s: number): string => `${s.toFixed(1)} s`;

export type FindingKind = 'measured' | 'calculated' | 'proposed' | 'unknown';

export const FINDING_WORD: Record<FindingKind, string> = {
  measured: 'Measured', calculated: 'Worked out', proposed: 'Proposed — not measured', unknown: 'Not known yet',
};

export interface Finding { kind: FindingKind; text: string; tone: 'r' | 'a' | 'g' | 'n' }

/** WHAT THE STUDY SAYS — each line saying whether it is measured from the
 *  footage, worked out from what was measured, proposed, or not known. */
export function findings(f: VideoStudyFigures): Finding[] {
  const out: Finding[] = [];
  const from = f.basis === 'verified' ? 'accepted' : 'accepted or candidate';
  for (const s of f.stations) {
    if (!s.workTime) continue;
    const w = s.workTime;
    out.push({ kind: 'measured', tone: 'n', text: `${s.zone.label} (${s.zone.track}): ${sec1(w.mean)} of work a cycle — ${w.n} whole cycle${w.n === 1 ? '' : 's'} ${from}${w.ci95 !== undefined ? `, 95% between ${(w.mean - w.ci95).toFixed(1)} and ${(w.mean + w.ci95).toFixed(1)} s` : ''}, median ${sec1(w.median)}, range ${w.min.toFixed(1)}–${w.max.toFixed(1)} s${w.cv !== undefined ? `, varies ${Math.round(w.cv * 100)}%` : ''}${s.cycleTime ? `; one every ${sec1(s.cycleTime.mean)}` : ''}${s.waitTime ? `; no movement for ${sec1(s.waitTime.mean)} between` : ''}.` });
    if (w.n < MIN_CYCLES) out.push({ kind: 'unknown', tone: 'a', text: `${s.zone.label}: ${w.n} cycle${w.n === 1 ? '' : 's'} is too few to say how much it varies — film or accept at least ${MIN_CYCLES}.` });
    else if (!s.enough && s.needed) out.push({ kind: 'unknown', tone: 'a', text: `${s.zone.label}: ${w.n} cycles know its work a cycle to within ${Math.round(((w.ci95 ?? 0) / w.mean) * 100)}% — ${s.needed} are needed for ±5%; film or accept more.` });
    for (const l of s.long) out.push({ kind: 'unknown', tone: 'a', text: `${s.zone.label}: a cycle of ${sec1(l.sec)} after ${clock(l.after.start)} — half again as long as usual; a piece of work may have been missed there.` });
  }
  if (f.bottleneck?.workTime) {
    out.push({ kind: 'calculated', tone: 'n', text: `${f.bottleneck.zone.label} has the most work in a cycle (${sec1(f.bottleneck.workTime.mean)}), so it sets the pace${f.ratePerMin ? `: about ${f.ratePerMin.toFixed(1)} a minute, ${Math.round(f.ratePerMin * 60)} an hour, at its observed cycle` : ''}.` });
  }
  if (f.efficiency !== undefined) out.push({ kind: 'calculated', tone: f.efficiency < 0.85 ? 'a' : 'g', text: `The work is ${Math.round(f.efficiency * 100)}% evenly spread across the stations (the work at every station ÷ the stations × the most at one).` });
  if (f.takt) {
    out.push({ kind: 'calculated', tone: 'n', text: `Takt is ${sec1(f.takt)} a unit.` });
    for (const o of f.overTakt) out.push({ kind: 'calculated', tone: 'r', text: `${o.station.zone.label} is over takt by ${sec1(o.bySec)} — at its pace the demand is not met.` });
    if (f.takt && !f.overTakt.length && f.bottleneck) out.push({ kind: 'calculated', tone: 'g', text: 'Every station is within takt.' });
  }
  /* PROPOSED — kept apart from what was measured, and never said to be safe */
  const timed = f.stations.filter(s => s.workTime);
  if (timed.length >= 2 && f.efficiency !== undefined && f.efficiency < 0.9 && f.bottleneck?.workTime) {
    const even = timed.reduce((t, s) => t + (s.workTime?.mean ?? 0), 0) / timed.length;
    const most = f.bottleneck.workTime.mean;
    const least = timed.reduce((m, s) => ((s.workTime?.mean ?? 0) < (m.workTime?.mean ?? Infinity) ? s : m), timed[0]);
    out.push({ kind: 'proposed', tone: 'n', text: `Moving about ${sec1(most - even)} of work from ${f.bottleneck.zone.label} towards ${least.zone.label} would bring each station near ${sec1(even)} — if the work can be moved: check the method, the reach and the safety before it is.` });
  }
  const waits = f.stations.flatMap(s => s.waits).sort((a, b) => b.sec - a.sec).slice(0, 3);
  if (waits.length) out.push({ kind: 'measured', tone: 'n', text: `The longest gaps with no movement: ${waits.map(w => `${sec1(w.sec)} at ${f.stations.find(s => s.zone.id === w.zone)?.zone.label ?? w.zone} from ${clock(w.start)}`).join('; ')}.` });
  if (f.stations.some(s => s.waitTime)) out.push({ kind: 'unknown', tone: 'n', text: 'A gap with no movement is not said to be waiting: it can be waiting, checking without moving, or the person out of view — mark it as waiting where you have seen it on the footage.' });
  if (f.pm > 0 && timed.length) out.push({ kind: 'measured', tone: 'n', text: `Each end of a piece of work is known to ±${(f.pm / Math.SQRT2).toFixed(2)} s from the frames read, so a length to about ±${f.pm.toFixed(2)} s — the tenths printed here are no surer than that.` });
  if (f.flagged) out.push({ kind: 'unknown', tone: 'a', text: `${f.flagged} of the counted events ${f.flagged === 1 ? 'falls' : 'fall'} where the camera shook, moved or the light jumped — check ${f.flagged === 1 ? 'it' : 'them'} on the footage.` });
  if (f.candidates) out.push({ kind: 'unknown', tone: 'a', text: `${f.candidates} event${f.candidates === 1 ? '' : 's'} still to review — ${f.basis === 'verified' ? 'left out of the figures until accepted' : 'counted here as provisional'}.` });
  for (const m of f.missing) out.push({ kind: 'unknown', tone: 'n', text: m });
  return out;
}

/** Where the study stands, in words — never "verified" while a candidate remains. */
export function standing(f: VideoStudyFigures): { text: string; tone: 'r' | 'a' | 'g' | 'n' } {
  if (!f.accepted && !f.candidates) return { text: 'No events yet', tone: 'n' };
  if (f.verified) return { text: `Verified — ${f.accepted} event${f.accepted === 1 ? '' : 's'} accepted${f.rejected ? `, ${f.rejected} rejected` : ''}`, tone: 'g' };
  return { text: `${f.candidates} to review · ${f.accepted} accepted${f.rejected ? ` · ${f.rejected} rejected` : ''}`, tone: 'a' };
}
