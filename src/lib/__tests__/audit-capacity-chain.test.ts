/* AUDIT — the station chain, derived independently from docs/CAPACITY.md §1–§3
 * and checked against lib/capacity on the seeds and on random factories.
 *
 * Reference (written before reading the module):
 *   F_i   = Π_{k≤i} contains_k                    (line units in one of station i's)
 *   up_i  = Π_{j<i} good_j                        (the good fraction reaching i)
 *   own_i = plan_i × crew_i × F_i                 (what i MAKES, line units a minute)
 *   L_i   = own_i ÷ up_i                          (like-for-like, rejects before it put back)
 *   E_i   = L_i × running_i                       (once its own stops count)
 *   line  = min_i E_i ; bottleneck = argmin ; goodOut = line × Π_all good_j
 *   arrivals_i = min_{j<i} E_j × up_i ÷ F_i       (in i's own unit) */
import { describe, expect, it } from 'vitest';
import { analyse, lineIfRaised, ownSpeed, planPerMinute, perMinute, type Capacity, type Station } from '../../tools/linebalance/capacity';

/* ------------------------------ reference ------------------------------ */
interface Ref { factor: number[]; up: number[]; own: number[]; L: number[]; E: number[]; line: number; limit: number; goodOut: number; arrivals: (number | undefined)[] }
function reference(stations: Station[]): Ref {
  const n = stations.length;
  const factor: number[] = [], up: number[] = [], own: number[] = [], L: number[] = [], E: number[] = [], arrivals: (number | undefined)[] = [];
  let f = 1, g = 1;
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    if (i > 0) f *= s.contains;
    factor.push(f); up.push(g);
    const plan = planPerMinute(s) as number;
    const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
    own.push(plan * crew * f);
    L.push(own[i] / g);
    E.push(L[i] * ((s.runningPct ?? 100) / 100));
    g *= (s.goodPct ?? 100) / 100;
  }
  let limit = 0;
  for (let i = 1; i < n; i++) if (E[i] < E[limit]) limit = i;
  for (let i = 0; i < n; i++) {
    if (i === 0) { arrivals.push(undefined); continue; }
    let slow = Infinity;
    for (let j = 0; j < i; j++) slow = Math.min(slow, E[j]);
    arrivals.push((slow * up[i]) / factor[i]);
  }
  return { factor, up, own, L, E, line: E[limit], limit, goodOut: E[limit] * g, arrivals };
}

/* ------------------------------ factories ------------------------------ */
let seed = 20261016;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const UNITS = ['bags', 'trays', 'cases', 'pallets', 'punnets'];
let n = 0;
/** A clean random line: every station countable, 1–5 units, rejects 0–5%, running 50–100%. */
function cleanLine(k = 2 + Math.floor(rand() * 7)): Station[] {
  const out: Station[] = [];
  const nUnits = 1 + Math.floor(rand() * 5);
  const breaks = new Set<number>();
  while (breaks.size < Math.min(nUnits - 1, k - 1)) breaks.add(1 + Math.floor(rand() * (k - 1)));
  let unit = UNITS[0], ui = 0;
  for (let i = 0; i < k; i++) {
    const newUnit = breaks.has(i);
    if (newUnit) unit = UNITS[++ui % UNITS.length];
    const contains = i === 0 ? 1 : newUnit ? pick([2, 4, 8, 10, 12, 36]) : 1;
    const kind = rand() < 0.35 ? 'people' : 'machine';
    const speed: Partial<Station> = rand() < 0.5
      ? { rate: Math.round((1 + rand() * 200) * 100) / 100, ratePer: pick(['sec', 'min', 'hour'] as const) }
      : { cycleSec: Math.round((0.5 + rand() * 120) * 10) / 10, perCycle: pick([1, 1, 2, 3]) };
    out.push({ id: `s${++n}`, name: `St ${i + 1}`, kind, unit, contains, ...speed,
      source: kind === 'machine' ? 'plate' : pick(['timed', 'standard', 'estimate'] as const),
      ...(rand() < 0.5 ? { runningPct: 50 + Math.round(rand() * 50) } : {}),
      ...(rand() < 0.4 ? { goodPct: 95 + Math.round(rand() * 50) / 10 } : {}),
      ...(rand() < 0.3 ? { crew: 1 + Math.floor(rand() * 4) } : {}) });
  }
  return out;
}
const finiteDeep = (v: unknown, path = 'r'): string[] => {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [`${path}=${v}`];
  if (typeof v === 'string') return /NaN|Infinity|undefined/.test(v) ? [`${path}="${v}"`] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => finiteDeep(x, `${path}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v as Record<string, unknown>).filter(([k]) => k !== 'station').flatMap(([k, x]) => finiteDeep(x, `${path}.${k}`));
  return [];
};

/* ------------------------------- the seeds ------------------------------ */
const m = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'machine', unit, contains, ...speed, ...x });
const p = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'people', unit, contains, ...speed, ...x });
/** capacitySeeds.ts HUGE: twenty stations in four units (the last two break the chain). */
const HUGE: Station[] = [
  m('Bagger', 'bags', 1, { rate: 72, ratePer: 'min', source: 'plate' }, { runningPct: 88 }),
  m('Weigher', 'bags', 1, { rate: 80, ratePer: 'min', source: 'plate' }, { runningPct: 96 }),
  m('Coder', 'bags', 1, { rate: 1.6, ratePer: 'sec', source: 'timed' }),
  m('Checkweigher', 'bags', 1, { rate: 95, ratePer: 'min', source: 'plate' }, { goodPct: 98.5, runningPct: 97 }),
  m('Metal detector', 'bags', 1, { rate: 6000, ratePer: 'hour', source: 'plate' }, { goodPct: 99.6 }),
  m('Conveyors', 'bags', 1, { rate: 110, ratePer: 'min', source: 'estimate' }, { bufferAfter: 120 }),
  p('Tray loader', 'trays', 8, { cycleSec: 6.5, perCycle: 1, source: 'timed' }, { crew: 2 }),
  p('Tray checker', 'trays', 1, { cycleSec: 3, perCycle: 1, source: 'standard' }),
  m('Cartoner', 'trays', 1, { rate: 18, ratePer: 'min', source: 'plate' }, { runningPct: 91 }),
  m('Case packer', 'cases', 4, { rate: 5, ratePer: 'min', source: 'timed' }, { runningPct: 90 }),
  m('Labeller', 'cases', 1, { rate: 6.5, ratePer: 'min', source: 'plate' }, { bufferAfter: 20 }),
  p('Case checker', 'cases', 1, { cycleSec: 8, perCycle: 1, source: 'timed' }),
  m('Vision', 'cases', 1, { rate: 9, ratePer: 'min', source: 'plate' }),
  m('Case conveyor', 'cases', 1, { rate: 12, ratePer: 'min', source: 'plate' }),
  m('Robot', 'pallets', 60, { rate: 9, ratePer: 'hour', source: 'plate' }, { runningPct: 95 }),
  m('Wrapper', 'pallets', 1, { rate: 14, ratePer: 'hour', source: 'plate' }),
  p('Pallet labeller', 'pallets', 1, { cycleSec: 90, perCycle: 1, source: 'timed' }),
  p('FLT driver', 'pallets', 1, { cycleSec: 240, perCycle: 1, source: 'estimate' }, { crew: 2 }),
  m('Dispatch wrap check', 'loads', 1, { rate: 20, ratePer: 'hour', source: 'plate' }),
  m('Trailer loading bay', 'trailers', 0, { rate: 2, ratePer: 'hour', source: 'estimate' }),
];
/** seed.ts Line 2A. */
const LINE_2A: Station[] = [
  m('Bagger', 'bags', 1, { rate: 70, ratePer: 'min', source: 'plate' }),
  m('Basketer', 'baskets', 12, { rate: 5.5, ratePer: 'min', source: 'timed' }, { runningPct: 94 }),
  p('Carrier', 'baskets', 1, { cycleSec: 20, perCycle: 2, source: 'timed' }),
  m('Palletiser', 'pallets', 40, { rate: 8, ratePer: 'hour', source: 'plate' }),
];
/** seed.ts Line 7, Maris Piper 2kg. */
const LINE_7: Station[] = [
  m('Bagger', 'bags', 1, { rate: 100, ratePer: 'min', source: 'plate' }),
  m('Checkweigher', 'bags', 1, { rate: 2.2, ratePer: 'sec', source: 'plate' }),
  p('Packer', 'cases', 10, { cycleSec: 5, perCycle: 1, source: 'timed' }, { crew: 2 }),
];
/** capacitySeeds.ts Maris Piper 2kg — Tall. */
const TALL: Station[] = [
  m('Bagger', 'bags', 1, { rate: 70, ratePer: 'min', source: 'plate' }),
  m('Basketer', 'baskets', 12, { rate: 5, ratePer: 'min', source: 'timed' }, { runningPct: 92 }),
  p('Packer', 'baskets', 1, { cycleSec: 15, perCycle: 1, source: 'timed' }),
];

const sameAsReference = (stations: Station[], label: string) => {
  const r = analyse({ stations });
  const ref = reference(stations);
  const okIdx = r.ok.map(x => x.index);
  for (const x of r.ok) {
    const i = x.index;
    expect(x.factor, `${label} factor[${i}]`).toBeCloseTo(ref.factor[i], 9);
    expect(x.running, `${label} L[${i}]`).toBeCloseTo(ref.L[i], 6);
    expect(x.effective, `${label} E[${i}]`).toBeCloseTo(ref.E[i], 6);
    expect(ownSpeed(x), `${label} own[${i}]`).toBeCloseTo(ref.own[i], 6);
    expect(x.does, `${label} does[${i}]`).toBeCloseTo((ref.E[i] * ref.up[i]) / ref.factor[i], 6);
    if (i > 0 && ref.arrivals[i] != null && Number.isFinite(ref.arrivals[i] as number)) {
      expect(x.arrives, `${label} arrives[${i}]`).toBeCloseTo(ref.arrivals[i] as number, 6);
      expect(r.arrivals[x.station.id]?.perMin, `${label} arrivals[${i}]`).toBeCloseTo(ref.arrivals[i] as number, 6);
    }
  }
  if (r.limit) {
    const refLimit = okIdx.reduce((b, i) => (ref.E[i] < ref.E[b] ? i : b), okIdx[0]);
    expect(r.limit.index, `${label} bottleneck`).toBe(refLimit);
    expect(r.line, `${label} line`).toBeCloseTo(ref.E[refLimit], 6);
  }
  return { r, ref };
};

describe('AUDIT chain — the seeds against the reference', () => {
  it('Line 2A (seed.ts): 70 · 66 · 72/1.09 · 64 running — but the basketer runs 94% of the time, so at 62.04 effective it, not the palletiser, limits', () => {
    /* the reference first read the bottleneck off the running speeds (64 at the palletiser);
       docs/CAPACITY.md §3 says the bottleneck is the lowest EFFECTIVE speed — stops counted */
    const { r } = sameAsReference(LINE_2A, '2A');
    expect(r.ok.map(x => Math.round(x.running * 100) / 100)).toEqual([70, 66, 66.06, 64]);
    expect(r.ok[1].effective).toBeCloseTo(66 * 0.94, 9);
    expect(r.limit?.station.name).toBe('Basketer');
    expect(r.line).toBeCloseTo(66 * 0.94, 9);
    expect(r.next?.station.name).toBe('Palletiser');
  });
  it('Line 7 (seed.ts): bagger 100 · checkweigher 132 · 2 packers at 5 s + 9% on cases of 10 = 220.2 — the bagger limits', () => {
    const { r } = sameAsReference(LINE_7, 'L7');
    expect(r.limit?.station.name).toBe('Bagger');
    expect(r.ok[2].running).toBeCloseTo((60 / 5 / 1.09) * 2 * 10, 6);
  });
  it('Maris Piper 2kg — Tall (capacitySeeds): basketer 60 × 92% = 55.2 limits; the packer 44 bags/min on speed… no: 12 × 4 ÷ 1.09 = 44.04', () => {
    const { r } = sameAsReference(TALL, 'Tall');
    /* a basket every 15 s + 9% = 3.67 baskets/min × 12 = 44.04 bags/min: the PACKER limits, not the basketer */
    expect(r.limit?.station.name).toBe('Packer');
    expect(r.line).toBeCloseTo((60 / 15 / 1.09) * 12, 6);
    expect(r.next?.station.name).toBe('Basketer');
    expect(r.liftAtMost).toBeCloseTo(55.2 - (60 / 15 / 1.09) * 12, 6);
  });
  it('HUGE (capacitySeeds): eighteen counted, the chain breaking at the trailer bay; every figure as the reference', () => {
    const { r } = sameAsReference(HUGE, 'huge');
    expect(r.ok).toHaveLength(19);
    expect(r.skipped.map(k => k.station.name)).toEqual(['Trailer loading bay']);
    /* 8 to a tray × 4 to a case × 60 to a pallet = 1,920 from the robot on; the dispatch check's "loads" contain 1 pallet each */
    expect(r.ok.map(x => x.factor).slice(-6)).toEqual([32, 1920, 1920, 1920, 1920, 1920]);
    /* the dispatch check counts one-for-one with pallets in a new word — a hint, not a skip */
    expect(r.notes.some(t => /Dispatch wrap check/.test(t) && /one-for-one/.test(t))).toBe(true);
    expect(finiteDeep(r)).toEqual([]);
  });
});

describe('AUDIT chain — properties on random factories', () => {
  it('every counted figure equals the reference, 300 random lines', () => {
    for (let t = 0; t < 300; t++) sameAsReference(cleanLine(), `rand${t}`);
  });
  it('round trip: own speed in the line’s unit ÷ factor = plan × crew in the station’s own unit', () => {
    for (let t = 0; t < 200; t++) {
      const r = analyse({ stations: cleanLine() });
      for (const x of r.ok) {
        const crew = x.station.crew != null && x.station.crew > 0 ? x.station.crew : 1;
        expect(ownSpeed(x) / x.factor).toBeCloseTo((planPerMinute(x.station) as number) * crew, 9);
      }
    }
  });
  it('the bottleneck is the minimum effective like-for-like speed and the line never makes more than any station', () => {
    for (let t = 0; t < 200; t++) {
      const r = analyse({ stations: cleanLine() });
      const line = r.line as number;
      for (const x of r.ok) expect(line).toBeLessThanOrEqual(x.effective + 1e-9);
      expect(r.limit?.effective).toBeCloseTo(line, 9);
      expect(r.goodOut as number).toBeLessThanOrEqual(line + 1e-9);
    }
  });
  it('a reject upstream never changes what a downstream station MAKES (own speed), only its like-for-like figure', () => {
    for (let t = 0; t < 200; t++) {
      const st = cleanLine(4 + Math.floor(rand() * 4)).map(s => ({ ...s, goodPct: 100 }));
      const a = analyse({ stations: st });
      const i = 1 + Math.floor(rand() * (st.length - 2));
      const st2 = st.map((s, k) => (k === i ? { ...s, goodPct: 95 } : s));
      const b = analyse({ stations: st2 });
      for (const x of b.ok) {
        const before = a.ok.find(y => y.station.id === x.station.id) as typeof x;
        expect(ownSpeed(x)).toBeCloseTo(ownSpeed(before), 9);
        if (x.index > i) expect(x.running).toBeCloseTo(before.running / 0.95, 6);
        else expect(x.running).toBeCloseTo(before.running, 9);
      }
      expect(b.goodOut).toBeCloseTo((b.line as number) * 0.95, 6);
    }
  });
  it('the doc’s worked case: a weigher rejecting 2% before a Bagger at 100 — like-for-like 102.04, it MAKES 100', () => {
    const st = [m('Weigher', 'bags', 1, { rate: 200, ratePer: 'min', source: 'plate' }, { goodPct: 98 }), m('Bagger', 'bags', 1, { rate: 100, ratePer: 'min', source: 'plate' })];
    const r = analyse({ stations: st });
    expect(r.ok[1].running).toBeCloseTo(100 / 0.98, 9);
    expect(ownSpeed(r.ok[1])).toBe(100);
    expect(r.line).toBeCloseTo(102.04, 2);
    expect(r.goodOut).toBeCloseTo(100, 9);
  });
  it('adding capacity at the bottleneck never lowers the line and never raises it past the next-slowest', () => {
    for (let t = 0; t < 200; t++) {
      const st = cleanLine(3 + Math.floor(rand() * 5));
      const a = analyse({ stations: st });
      if (!a.limit || !a.next) continue;
      const id = a.limit.station.id;
      const crew = a.limit.station.crew != null && a.limit.station.crew > 0 ? a.limit.station.crew : 1;
      const b = analyse({ stations: st.map(s => (s.id === id ? { ...s, crew: crew + 1 } : s)) });
      expect(b.line as number).toBeGreaterThanOrEqual((a.line as number) - 1e-9);
      expect(b.line as number).toBeLessThanOrEqual(a.next.effective + 1e-9);
      expect(lineIfRaised(a, a.limit.index, Infinity)).toBeCloseTo(a.next.effective, 9);
    }
  });
  it('speeding a station that is not the bottleneck adds nothing', () => {
    for (let t = 0; t < 100; t++) {
      const st = cleanLine(3 + Math.floor(rand() * 5));
      const a = analyse({ stations: st });
      if (!a.limit || !a.next) continue;
      const other = a.ok.find(x => x.index !== a.limit?.index) as typeof a.limit;
      const crew = other.station.crew != null && other.station.crew > 0 ? other.station.crew : 1;
      const b = analyse({ stations: st.map(s => (s.id === other.station.id ? { ...s, crew: crew * 3 } : s)) });
      expect(b.line).toBeCloseTo(a.line as number, 9);
      expect(lineIfRaised(a, other.index, 1e9)).toBeCloseTo(a.line as number, 9);
    }
  });
  it('the three speeds: limitAtRunning is the minimum like-for-like speed before stops', () => {
    for (let t = 0; t < 100; t++) {
      const r = analyse({ stations: cleanLine() });
      const slowest = [...r.ok].sort((a, b) => a.running - b.running)[0];
      expect(r.limitAtRunning?.running).toBeCloseTo(slowest.running, 9);
    }
  });
  it('arrivals: one every N seconds is 60 ÷ a minute, and the ratio is the chain between the pace-setter and the station', () => {
    for (let t = 0; t < 100; t++) {
      const r = analyse({ stations: cleanLine() });
      for (const [id, a] of Object.entries(r.arrivals)) {
        expect(a.everySec).toBeCloseTo(60 / a.perMin, 9);
        const x = r.ok.find(o => o.station.id === id);
        const from = r.ok.find(o => o.station.name === a.from.name);
        if (x && from) expect(a.ratio).toBeCloseTo(x.factor / from.factor, 9);
      }
    }
  });
});

describe('AUDIT chain — edges said in words, never NaN', () => {
  it('nothing, one station, a zero rate, a broken chain, a station never running', () => {
    expect(analyse({ stations: [] }).sentence).toMatch(/^Add the stations/);
    const one = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 40, ratePer: 'min', source: 'plate' })] });
    expect(one.sentence).toMatch(/^Only Bagger is counted so far, at 40 bags\/min/);
    expect(one.line).toBe(40); expect(one.next).toBeUndefined(); expect(one.liftAtMost).toBeUndefined();
    const zero = analyse({ stations: [m('A', 'bags', 1, { rate: 0, ratePer: 'min' }), m('B', 'bags', 1, { rate: 10, ratePer: 'min' })] });
    expect(zero.skipped[0].why).toBe('it has no speed yet');
    const broken = analyse({ stations: [m('A', 'bags', 1, { rate: 10 }), m('B', 'trays', 0, { rate: 10 }), m('C', 'cases', 2, { rate: 10 })] });
    expect(broken.skipped.map(k => k.why)).toEqual(['it does not say how many bags make one tray', 'the chain of units breaks at B']);
    const never = analyse({ stations: [m('A', 'bags', 1, { rate: 10 }, { runningPct: 0 })] });
    expect(never.skipped[0].why).toMatch(/never running/);
    const noGood = analyse({ stations: [m('A', 'bags', 1, { rate: 10 }, { goodPct: 0 })] });
    expect(noGood.skipped[0].why).toMatch(/passes nothing on/);
    for (const r of [one, zero, broken, never, noGood]) expect(finiteDeep(r)).toEqual([]);
  });
  it('random broken factories: no NaN, Infinity or "undefined" anywhere in the result', () => {
    for (let t = 0; t < 300; t++) {
      const st = cleanLine().map(s => {
        const x = { ...s };
        if (rand() < 0.15) { delete x.rate; delete x.cycleSec; }
        if (rand() < 0.1) x.contains = 0;
        if (rand() < 0.1) x.runningPct = 0;
        if (rand() < 0.1) x.goodPct = 0;
        if (rand() < 0.1) x.crew = 0;
        if (rand() < 0.1) x.unit = '';
        return x;
      });
      const cap: Capacity = { stations: st, ...(rand() < 0.5 ? { targetPerMin: Math.round(rand() * 200) } : {}) };
      expect(finiteDeep(analyse(cap)), JSON.stringify(st)).toEqual([]);
    }
  });
  it('QUESTION C-q1: a station that cannot be counted yet still takes its rejects off goodOut', () => {
    const st = [m('A', 'bags', 1, { rate: 100 }), m('B', 'bags', 1, {}, { goodPct: 90 }), m('C', 'bags', 1, { rate: 200 })];
    const r = analyse({ stations: st });
    expect(r.skipped.map(k => k.station.name)).toEqual(['B']);
    /* the reference counts only counted stations' rejects: 100. The app takes B's 10% off: 90.
       Either is defensible — a reject typed is a fact whether or not B has a speed. Recorded, not judged. */
    expect(r.goodOut).toBeCloseTo(90, 9);
    expect(r.ok[1].running).toBeCloseTo(200 / 0.9, 9);
  });
  it('perMinute: per hour, per second, a cycle and "typed in the unit before" all agree', () => {
    expect(perMinute(m('a', 'x', 1, { rate: 450, ratePer: 'hour' }))).toBeCloseTo(7.5, 9);
    expect(perMinute(m('a', 'x', 1, { cycleSec: 8, perCycle: 1 }))).toBeCloseTo(7.5, 9);
    expect(perMinute(m('a', 'x', 1, { rate: 0.125, ratePer: 'sec' }))).toBeCloseTo(7.5, 9);
    expect(perMinute(p('a', 'pallets', 36, { cycleSec: 6, perCycle: 1 }, { speedIn: 'before' }))).toBeCloseTo(10 / 36, 9);
    expect(perMinute(p('a', 'pallets', 0, { cycleSec: 6, perCycle: 1 }, { speedIn: 'before' }))).toBeUndefined();
  });
});
