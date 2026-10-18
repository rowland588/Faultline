/* WORK FOUND IN THE FOOTAGE BY ITS MOVEMENT (docs/VIDEO.md, analysis).
 *
 * The browser reads frames of the footage at the study's interval and, for
 * each station in view, how much the picture changed since the frame before
 * (lib/video/extract). That is the signal: a number a frame a station. Here,
 * pure and deterministic, it becomes candidate events — the stretches where a
 * station moved more than its own quiet level — each with its boundaries in
 * the SOURCE footage's seconds and how sure the reading is.
 *
 * Why movement and not a model: a person working at a station moves, and an
 * idle one mostly does not; that is measured from every frame read, costs
 * nothing, and can be checked against footage whose times are known
 * (lib/video/evaluate). A model is then asked only what movement cannot say —
 * what the work is — and only about the frames this reading picks. Nothing
 * here is accepted: every event is a candidate until a person says so. */
import { READING_VERSION, type ProcessingConfig, type VideoEvent, type VideoZone } from './record';

export interface ZoneSignal {
  zone: string;
  /** How much the zone changed since the frame before, 0–1, one per time. */
  values: number[];
}

export interface Signal {
  /** The source seconds of each frame read. */
  times: number[];
  zones: ZoneSignal[];
}

/** A moving average over `w` frames either side. */
export function smooth(v: readonly number[], w = 1): number[] {
  return v.map((_, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(v.length - 1, i + w); j++) { s += v[j]; n++; }
    return n ? s / n : 0;
  });
}

const pct = (sorted: readonly number[], p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];

/** The quiet level and the working level of one station, from its own
 *  values: quiet is its low twentieth and its spread the scatter of its
 *  lowest fifth (the camera's grain — a station is idle at least that often
 *  in any footage worth studying), busy its high tenth. Work is movement
 *  above whichever is higher: `sensitivity` spreads over quiet, or a share
 *  of the way from quiet to busy (a quarter at the usual sensitivity of 4) —
 *  so grain never counts as work and a busy station's slow moments still do.
 *  Found reading synthetic footage on 18 October: two groups split by their
 *  means put a station busy three-quarters of the time wholly in "quiet",
 *  and it showed no work at all; a spread from the lowest tenth alone let
 *  grain through. */
export function levels(v: readonly number[], sensitivity = 4): { quiet: number; busy: number; threshold: number; spread: number; contrast: number } {
  if (!v.length) return { quiet: 0, busy: 0, threshold: 0, spread: 0, contrast: 0 };
  const s = [...v].sort((a, b) => a - b);
  const quiet = pct(s, 0.05), busy = pct(s, 0.9);
  const low = s.slice(0, Math.max(5, Math.ceil(s.length / 5)));
  const m = low.reduce((t, x) => t + x, 0) / low.length;
  const spread = Math.max(1e-4, Math.sqrt(low.reduce((t, x) => t + (x - m) ** 2, 0) / low.length));
  const share = Math.min(0.5, Math.max(0.1, sensitivity / 16));
  const threshold = quiet + Math.max(sensitivity * spread, share * (busy - quiet));
  return { quiet, busy, threshold, spread, contrast: (busy - quiet) / spread };
}

/** The least the busy level must stand above the quiet one, as a share of the picture changing — below it, the station is said to show no work at all. */
const FLOOR = 0.004;

export interface Interval { start: number; end: number; strength: number }

/** The stretches one station was busy, in source seconds: boundaries halfway
 *  between the last quiet frame and the first busy one (so a boundary is
 *  within half the interval of the truth), short gaps joined, short blips
 *  dropped. */
export function busyIntervals(times: readonly number[], values: readonly number[], c: Pick<ProcessingConfig, 'sensitivity' | 'joinGapSec' | 'minEventSec'>): { intervals: Interval[]; level: ReturnType<typeof levels> } {
  const v = smooth(values, 1);
  const level = levels(v, c.sensitivity);
  if (times.length < 3 || level.busy - level.quiet < FLOOR || level.contrast < c.sensitivity) return { intervals: [], level };
  const on = v.map(x => x > level.threshold);
  const raw: Interval[] = [];
  const half = (i: number, j: number) => (times[i] + times[j]) / 2;
  let i = 0;
  while (i < on.length) {
    if (!on[i]) { i++; continue; }
    let j = i;
    while (j + 1 < on.length && on[j + 1]) j++;
    /* the smoothed signal finds the stretch; its edges are placed on the raw
       values, where they cross halfway between quiet and this stretch's own
       level — smoothing alone pushed every boundary a frame outwards */
    const seg = values.slice(i, j + 1);
    const own = seg.reduce((t, x) => t + x, 0) / seg.length;
    const mid = (level.quiet + Math.max(own, level.threshold)) / 2;
    let a = i, z = j;
    while (a < z && values[a] < mid) a++;
    while (z > a && values[z] < mid) z--;
    const start = a === 0 ? times[0] : half(a - 1, a);
    const end = z === on.length - 1 ? times[z] : half(z, z + 1);
    raw.push({ start, end, strength: own });
    i = j + 1;
  }
  const joined: Interval[] = [];
  for (const r of raw) {
    const last = joined[joined.length - 1];
    if (last && r.start - last.end < c.joinGapSec) {
      const la = last.end - last.start, ra = r.end - r.start;
      last.strength = (last.strength * la + r.strength * ra) / Math.max(1e-9, la + ra);
      last.end = r.end;
    } else joined.push({ ...r });
  }
  return { intervals: joined.filter(r => r.end - r.start >= c.minEventSec), level };
}

/** CANDIDATE EVENTS from the signal — one a busy stretch a station, each
 *  saying what was seen, how sure, and the frames that show it. */
export function detectEvents(sig: Signal, config: ProcessingConfig, o: { key?: string; idOf?: (zone: string, i: number) => string } = {}): VideoEvent[] {
  const out: VideoEvent[] = [];
  const step = config.sampleSec;
  for (const zs of sig.zones) {
    const zone: VideoZone | undefined = config.zones.find(z => z.id === zs.zone);
    if (!zone) continue;
    const { intervals, level } = busyIntervals(sig.times, zs.values, config);
    intervals.forEach((r, i) => {
      const span = Math.max(1e-6, level.busy - level.threshold);
      const short = r.end - r.start < 3 * step;
      const confidence = Math.max(0.1, Math.min(0.95, 0.5 + 0.45 * Math.min(1, (r.strength - level.threshold) / span) - (short ? 0.2 : 0)));
      const mid = (r.start + r.end) / 2;
      out.push({
        id: o.idOf ? o.idOf(zs.zone, i) : `${zs.zone}-${i + 1}`,
        start: round(r.start), end: round(r.end), category: 'work', zone: zs.zone, track: zone.track,
        observed: `Movement at ${zone.label}`, confidence: round(confidence),
        frames: [round(r.start), round(mid), round(r.end)], basis: 'motion', review: 'candidate',
        provenance: { provider: 'motion', version: READING_VERSION, ...(o.key ? { key: o.key } : {}) },
      });
    });
  }
  return out.sort((a, b) => a.start - b.start || a.zone.localeCompare(b.zone));
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** HOW OFTEN TO READ A FRAME — denser for short footage, never more than the
 *  limit, never finer than the footage's own frames. */
export function sampleInterval(durationSec: number, fps: number | undefined, maxSamples: number): number {
  const frame = fps && fps > 0 ? 1 / fps : 1 / 30;
  const target = durationSec <= 60 ? 0.1 : durationSec <= 300 ? 0.2 : 0.5;
  const fit = durationSec / maxSamples;
  const s = Math.max(target, fit, frame);
  return Math.round(s * 1000) / 1000;
}
