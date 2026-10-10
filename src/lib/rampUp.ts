/* THE CLIMB TO RATE — a product's runs on a machine, read as the climb they
 * are (docs/LEAN40.md, the stage gate's evolution, step 1).
 *
 * Rowland, 10 October: "What can be done right now to give it the evolution
 * that I could actually say this is Lean 4.0?" — the second answer: every run
 * is plotted the moment it is recorded, and the app says when the line will
 * reach its agreed rate at the climb so far.
 *
 * NOTHING NEW IS KEPT. A performance run already holds a list of products,
 * each with the day it ran and its numbers (lib/run ProductRun); the net rate
 * is worked out there (readRun). This reads every measured run of one product
 * on one machine, across every run test on the job, in the order they ran.
 *
 * THE ARITHMETIC — the learning curve (Wright, 1936), unit form: each run's
 * time per pack, T = 1 ÷ net, falls by a steady share every time the number
 * of runs doubles: T(n) = T(1) × n^b, b < 0. Fitted by least squares on
 * log T against log n; the run at which T reaches 1 ÷ the agreed rate is
 * n* = exp((log(1 ÷ agreed) − a) ÷ b). Turned into a day at the runs' own
 * cadence: the days from the first run to the last, over the runs between.
 * A learning curve flattens as it goes, so it never promises the straight
 * line a ruler would — the honest shape of a ramp-up.
 *
 * HONEST ABOUT WHAT IT KNOWS:
 *   - one run is a run, not a climb: its own verdict says it (lib/run);
 *   - two runs: "too early to say when";
 *   - time per pack not falling: "not climbing", never a date;
 *   - the latest run at or over the rate: "at the agreed rate";
 *   - nothing agreed: no climb is drawn — there is nothing to climb to;
 *   - "at this climb", "about": a projection, not a promise.
 *
 * Pure: records in, words out. */
import { isRunTest, num, productName, productRuns, readRun } from './run';
import { live, type Asset, type Test } from './testing';
import { addDays, daysBetween, niceDay } from './weeks';

/** Fewer measured runs than this, and it is too early to say when. */
export const CLIMB_MIN_RUNS = 3;
/** How many runs the sentence lists, most recent last. */
const SHOWN = 5;

export interface ClimbPoint {
  /** The day it ran. */
  on: string;
  /** Good packs a minute over the run. */
  net: number;
  testId: string;
  runId: string;
}

export type ClimbKind = 'meets' | 'climbing' | 'flat' | 'early';

export interface Climb {
  machineId?: string;
  machine?: string;
  product: string;
  points: ClimbPoint[];
  /** The rate agreed for it — the latest run's, else the latest agreed. */
  agreed: number;
  kind: ClimbKind;
  /** About when it meets the agreed rate, at this climb (climbing only). */
  at?: string;
  /** The run, counted from the first, at which it meets it (climbing only). */
  runNo?: number;
  /** The learning rate: the share of the time per pack each doubling keeps (0.85 = an 85% curve). */
  learning?: number;
  /** The fitted net rate at run n — for drawing the climb. */
  fit?: (n: number) => number;
  /** The climb in a sentence. */
  text: string;
  /** risk (amber): not climbing · on · none: too early to say. It speaks of the
   *  runs alone — the handover is the pace's to judge (lib/pace), so a run
   *  reads the same wherever it is shown. */
  tone: 'risk' | 'on' | 'none';
}

const day = (iso: string) => niceDay(iso, { weekday: 'short' });
const key = (s: string) => s.trim().toLowerCase();

/** Least squares through (x, y): y = a + b·x. */
function line(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const b = sxx === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx;
  return { a: my - b * mx, b };
}

/** One product's climb on one machine, from its measured runs in order. */
export function climbOf(points: ClimbPoint[], agreed: number, opts: { product: string; machine?: string; machineId?: string }): Climb {
  const ps = [...points].sort((x, y) => x.on.localeCompare(y.on));
  const head = `${opts.product}: ${ps.length > SHOWN ? '… → ' : ''}${ps.slice(-SHOWN).map(p => num(p.net)).join(' → ')} a minute over ${ps.length} runs`;
  const base = { product: opts.product, points: ps, agreed, ...(opts.machine ? { machine: opts.machine } : {}), ...(opts.machineId ? { machineId: opts.machineId } : {}) };
  const last = ps[ps.length - 1];
  if (last.net + 1e-9 >= agreed) {
    return { ...base, kind: 'meets', tone: 'on', text: `${head} — at the agreed ${num(agreed)}.` };
  }
  if (ps.length < CLIMB_MIN_RUNS) {
    return { ...base, kind: 'early', tone: 'none', text: `${head} — too early to say when it reaches ${num(agreed)}.` };
  }
  const xs = ps.map((_, i) => Math.log(i + 1));
  const ys = ps.map(p => Math.log(1 / p.net));
  const { a, b } = line(xs, ys);
  if (b >= -1e-6) {
    return { ...base, kind: 'flat', tone: 'risk', text: `${head} — not climbing: at this rate it does not reach ${num(agreed)}.` };
  }
  const nStar = Math.exp((Math.log(1 / agreed) - a) / b);
  const runNo = Math.max(ps.length + 1, Math.ceil(nStar - 1e-9));
  const cadence = Math.max(1, daysBetween(ps[0].on, last.on) / (ps.length - 1));
  const at = addDays(last.on, Math.ceil((runNo - ps.length) * cadence));
  return {
    ...base, kind: 'climbing', at, runNo, learning: Math.pow(2, b),
    fit: (n: number) => 1 / Math.exp(a + b * Math.log(n)),
    tone: 'on',
    text: `${head} — at this climb, the agreed ${num(agreed)} about ${day(at)} (run ${runNo}).`,
  };
}

/** Every product's climb on the job: one per machine and product with two
 *  measured runs or more and a rate agreed. In the order the machines and
 *  products first ran. */
export function climbsOf(x: { tests: Test[]; assets?: Asset[] }): Climb[] {
  const groups = new Map<string, { machineId?: string; product: string; points: ClimbPoint[]; agreed?: { on: string; rate: number } }>();
  for (const t of live(x.tests)) {
    /* A test with run numbers on it is a run, whatever its answer says
       (lib/run isRunTest) — and only measured runs make a climb. */
    if (!isRunTest(t)) continue;
    for (const p of productRuns(t)) {
      const r = readRun({ run: p.day, runAgreed: p.agreed });
      const on = p.ranOn ?? t.ranOn;
      const g0 = `${t.assetId ?? ''}|${key(productName(p))}`;
      const g = groups.get(g0) ?? { ...(t.assetId ? { machineId: t.assetId } : {}), product: productName(p), points: [] };
      groups.set(g0, g);
      const rate = r.agreed.rate;
      if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && (!g.agreed || (on ?? '') >= g.agreed.on)) g.agreed = { on: on ?? '', rate };
      if (r.net != null && r.net > 0 && on) g.points.push({ on, net: r.net, testId: t.id, runId: p.id });
    }
  }
  const machines = live(x.assets ?? []);
  const out: Climb[] = [];
  for (const g of groups.values()) {
    if (g.points.length < 2 || !g.agreed) continue;
    const machine = machines.find(m => m.id === g.machineId)?.name;
    out.push(climbOf(g.points, g.agreed.rate, {
      product: g.product, ...(g.machineId ? { machineId: g.machineId } : {}),
      ...(machine ? { machine } : {}),
    }));
  }
  return out
    .sort((p, q) => p.points[0].on.localeCompare(q.points[0].on));
}

/** The climbs a run test is part of — its machine's, for its products. */
export const climbsOn = (cs: Climb[], t: Test): Climb[] =>
  cs.filter(c => (c.machineId ?? '') === (t.assetId ?? '') && productRuns(t).some(p => key(productName(p)) === key(c.product)));
