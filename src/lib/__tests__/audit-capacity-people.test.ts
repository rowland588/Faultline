/* AUDIT — people as stations: the two ways a rate is typed, the ILO rest
 * applied once, what reaches them, whether they keep up, the paced load, a
 * rate that reads like a time. Reference from docs/CAPACITY.md §1 (worked:
 * 70 bags/min, 8 to a tray → a tray every 6.857 s; a person at 8 s a tray
 * → 8.72 s with 9% rest → 1.86 s too slow, 2 people needed). */
import { describe, expect, it } from 'vitest';
import { PACED_LOAD_MAX, allowanceOf, analyse, chainWords, paceSays, planPerMinute, rateAsTime, screenCapacity, typedPerMinute, type Capacity, type Station } from '../capacity';

let n = 0;
const m = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'machine', unit, contains, ...speed, ...x });
const p = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'people', unit, contains, ...speed, ...x });

describe('AUDIT people — a rate two ways, and the hour', () => {
  it('"450 an hour", "one every 8 s", "7.5 a minute" and "0.125 a second" are the same speed', () => {
    const ways = [{ rate: 450, ratePer: 'hour' as const }, { cycleSec: 8, perCycle: 1 }, { rate: 7.5, ratePer: 'min' as const }, { rate: 0.125, ratePer: 'sec' as const }];
    for (const w of ways) expect(typedPerMinute(w)).toBeCloseTo(7.5, 9);
    /* and the line reads them alike: the same bottleneck figure */
    const lines = ways.map(w => analyse({ stations: [m('Bagger', 'bags', 1, { rate: 70 }), p('Packer', 'trays', 8, w, { allowancePct: 0 })] }).line);
    for (const l of lines) expect(l).toBeCloseTo(60, 9);
  });
  it('a time typed in minutes is kept in seconds: a pallet every 5 min is 0.2 a minute, 12 an hour', () => {
    const s = p('Palletiser', 'pallets', 36, { cycleSec: 300, perCycle: 1 }, { cycleIn: 'min', allowancePct: 0 });
    expect(typedPerMinute(s)).toBeCloseTo(0.2, 9);
    expect((typedPerMinute(s) as number) * 60).toBeCloseTo(12, 9);
  });
});

describe('AUDIT people — the ILO rest, 9%, applied once', () => {
  const ref = (sec: number, allow = 0.09) => 60 / (sec * (1 + allow));
  it('6 s typed is planned as 6.54 s; 8 s as 8.72 s — the time × 1.09, the rate ÷ 1.09', () => {
    expect(planPerMinute(p('a', 'baskets', 1, { cycleSec: 6, perCycle: 1 }, { source: 'timed' }))).toBeCloseTo(ref(6), 9);
    expect(60 / (planPerMinute(p('a', 'baskets', 1, { cycleSec: 6, perCycle: 1 })) as number)).toBeCloseTo(6.54, 9);
    expect(60 / (planPerMinute(p('a', 'trays', 1, { cycleSec: 8, perCycle: 1 })) as number)).toBeCloseTo(8.72, 9);
  });
  it('a standard time from the time study carries its allowances: none added; a machine: none', () => {
    expect(allowanceOf(p('a', 'x', 1, {}, { source: 'standard' }))).toBe(0);
    expect(allowanceOf(p('a', 'x', 1, {}, { source: 'standard', allowancePct: 20 }))).toBe(0);
    expect(allowanceOf(m('a', 'x', 1, {}, { allowancePct: 20 }))).toBe(0);
    expect(allowanceOf(p('a', 'x', 1, {}, { source: 'timed' }))).toBeCloseTo(0.09, 9);
    expect(allowanceOf(p('a', 'x', 1, {}, { source: 'estimate', allowancePct: 14 }))).toBeCloseTo(0.14, 9);
    expect(allowanceOf(p('a', 'x', 1, {}, { allowancePct: 0 }))).toBe(0);
    expect(allowanceOf(p('a', 'x', 1, {}, { allowancePct: -5 }))).toBe(0);
    expect(allowanceOf(p('a', 'x', 1, {}, { allowancePct: NaN }))).toBe(0);
  });
  it('the chain and the pace sentence both take the rest once — never ÷1.09 twice', () => {
    const packer = p('Packer', 'trays', 8, { cycleSec: 8, perCycle: 1 }, { source: 'timed' });
    const r = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 70 }), packer] });
    const x = r.ok[1];
    expect(x.running).toBeCloseTo(ref(8) * 8, 9);                 // 55.05 bags/min, once
    expect(x.does).toBeCloseTo(ref(8), 9);                        // 6.88 trays/min
    const say = paceSays(r, packer, 'bags', r.ok[0].station);
    /* the seconds said: timed 8 s, planned 8.7 s — not 9.5 (twice) */
    expect(say.verdict).toMatch(/^They take 8 s a tray — 8.7 s with 9% rest — /);
  });
  it('a typed allowance replaces the 9%, it does not add to it', () => {
    const s = p('a', 'x', 1, { cycleSec: 10, perCycle: 1 }, { allowancePct: 15 });
    expect(60 / (planPerMinute(s) as number)).toBeCloseTo(11.5, 9);
  });
  it('screen: a person’s rest and a running % that is the same rest again is flagged; a standard time is not', () => {
    const twice = (src: Station['source'], running: number) => {
      const cap: Capacity = { stations: [m('Bagger', 'bags', 1, { rate: 70 }), p('Packer', 'trays', 8, { cycleSec: 8, perCycle: 1 }, { source: src, runningPct: running })] };
      return screenCapacity(cap, analyse(cap)).filter(c => /counted twice/.test(c.text));
    };
    expect(twice('timed', 91)).toHaveLength(1);       // 100/1.09 = 91.7 ± 1.5
    expect(twice('timed', 92)).toHaveLength(1);
    expect(twice('timed', 89)).toHaveLength(0);
    expect(twice('timed', 95)).toHaveLength(0);
    expect(twice('standard', 91)).toHaveLength(0);
    /* the once figure is effective ÷ running — the rest left in, the running taken out */
    const c = twice('timed', 91)[0];
    const eff = (60 / 8 / 1.09) * 8 * 0.91;
    expect(c.text).toContain(`${Number((eff / 0.91).toFixed(1))} a minute instead of ${Number(eff.toFixed(1))}`);
  });
});

describe('AUDIT people — what reaches them and whether they keep up (the doc’s worked numbers)', () => {
  const bagger = m('Bagger', 'bags', 1, { rate: 70, ratePer: 'min', source: 'plate' });
  it('70 bags a minute, 8 to a tray: a tray every 6.857 s — 8.75 a minute, before they have a speed', () => {
    const loader = p('Tray loader', 'trays', 8, {});
    const r = analyse({ stations: [bagger, loader] });
    const a = r.arrivals[loader.id];
    expect(a.perMin).toBeCloseTo(70 / 8, 9);
    expect(a.everySec).toBeCloseTo(60 / 8.75, 9);
    expect(a.ratio).toBe(8);
    /* 8.75 is said 8.8 — the house rounds half up (lib/format), the doc's "8.7" truncated */
    expect(paceSays(r, loader, 'bags', bagger).arrive).toBe('A tray reaches them every 6.9 s — 8.8 a minute: Bagger does 70 bags a minute, 8 to a tray.');
    expect(paceSays(r, loader, 'bags', bagger).verdict).toBe('Time how long one tray takes them.');
  });
  it('8 s a tray: 8.72 s with rest against one every 6.857 s — 1.86 s too slow; ⌈8.75 ÷ 6.88⌉ = 2 people', () => {
    const loader = p('Tray loader', 'trays', 8, { cycleSec: 8, perCycle: 1 }, { source: 'timed' });
    const r = analyse({ stations: [bagger, loader] });
    const say = paceSays(r, loader, 'bags', bagger);
    const planned = 60 / (60 / 8 / 1.09);                      // 8.72 s
    const gap = planned - 60 / 8.75;                            // 1.863 s
    expect(Number(gap.toFixed(1))).toBe(1.9);
    expect(say.verdict).toBe('They take 8 s a tray — 8.7 s with 9% rest — 1.9 s too slow: they hold the line back. It needs 2 people to keep up.');
    expect(say.short).toBe(true);
    expect(say.needed).toBe(Math.ceil(8.75 / (60 / 8 / 1.09)));
    expect(say.needed).toBe(2);
  });
  it('two of them keep up, and the crew’s pace is said with the seconds to spare', () => {
    const loader = p('Tray loader', 'trays', 8, { cycleSec: 8, perCycle: 1 }, { source: 'timed', crew: 2 });
    const r = analyse({ stations: [bagger, loader] });
    const say = paceSays(r, loader, 'bags', bagger);
    expect(say.short).toBe(false);
    expect(say.needed).toBeUndefined();
    /* 2 people: 13.76 trays/min → one every 4.36 s against one every 6.857 s: 2.5 s to spare */
    const spare = 60 / 8.75 - 60 / ((60 / 8 / 1.09) * 2);
    expect(say.verdict).toContain(`${Number(spare.toFixed(1))} s to spare a tray`);
  });
  it('the palletiser timed per basket: "1 pallet = 36 baskets = 360 units"; a basket every 8.57 s, a pallet every 5 min 9 s; 6 s + 9% keeps up', () => {
    const wrapper = p('Wrapper', 'baskets', 10, { cycleSec: 6, perCycle: 1 }, { allowancePct: 0 });
    const pal = p('Palletiser', 'pallets', 36, { cycleSec: 6, perCycle: 1 }, { source: 'timed', speedIn: 'before' });
    const st = [bagger, wrapper, pal];
    expect(chainWords(st, 2)).toBe('1 pallet = 36 baskets = 360 bags');   // said in the line's own unit
    const r = analyse({ stations: st });
    const a = r.arrivals[pal.id];
    expect(a.perMin).toBeCloseTo(70 / 360, 9);
    expect(a.everySec).toBeCloseTo(360 / 70 * 60, 6);           // 308.6 s = 5 min 9 s
    const say = paceSays(r, pal, 'baskets', wrapper);
    expect(say.arrive).toBe('A basket reaches them every 8.6 s — 7 a minute; a full pallet of 36 every 5 min 9 s: Bagger does 70 bags a minute.');   // the bagger's own unit
    expect(say.verdict).toBe('They take 6 s a basket — 6.5 s with 9% rest — they keep up, 2 s to spare a basket.');
    /* the load: 7 ÷ 9.17 = 76% — under 90%, nothing said */
    expect(7 / (60 / 6 / 1.09)).toBeCloseTo(0.763, 3);
    expect(say.paced).toBeUndefined();
  });
});

describe('AUDIT people — fed straight, the paced load', () => {
  const bagger = m('Bagger', 'units', 1, { rate: 70, ratePer: 'min', source: 'plate' });
  it('PACED_LOAD_MAX is 90%; a packer at 7.8 s + 9% on baskets of 10 is loaded to 7 ÷ 7.06 = 99% — said', () => {
    expect(PACED_LOAD_MAX).toBe(0.9);
    const packer = p('Packer', 'baskets', 10, { cycleSec: 7.8, perCycle: 1 }, { source: 'timed' });
    const say = paceSays(analyse({ stations: [bagger, packer] }), packer, 'units', bagger);
    expect(7 / (60 / 7.8 / 1.09)).toBeCloseTo(0.9915, 3);
    expect(say.paced).toMatch(/loaded to 99% of their pace/);
    expect(say.short).toBe(false);
  });
  it('at 90% exactly nothing is said; at 91% it is; with a buffer before them never', () => {
    const at = (load: number, buffer?: number) => {
      const b = { ...bagger, ...(buffer ? { bufferAfter: buffer } : {}) };
      /* a person whose planned pace is 7 ÷ load baskets a minute */
      const sec = 60 / (7 / load) / 1.09;
      const packer = p('Packer', 'baskets', 10, { cycleSec: sec, perCycle: 1 }, { source: 'timed' });
      return paceSays(analyse({ stations: [b, packer] }), packer, 'units', b).paced;
    };
    expect(at(0.9)).toBeUndefined();
    expect(at(0.91)).toMatch(/loaded to 91%/);
    expect(at(0.91, 20)).toBeUndefined();
  });
  it('DESIGN C-d1: a person slower than what reaches them but not the line’s bottleneck is said "loaded to 117%" — the arrivals, not the line’s flow', () => {
    /* bagger 70 → packer 6 baskets/min of 10 (60/min; typed as the pace to plan on) → palletiser at 5 baskets/min (50/min) holds the line.
       In steady state 50 a minute passes the packer: loaded to 50 ÷ 60 = 83%. The card says 70 ÷ 60 = 117%. */
    const packer = p('Packer', 'baskets', 10, { cycleSec: 10, perCycle: 1 }, { source: 'timed', allowancePct: 0 });
    const pal = m('Palletiser', 'baskets', 1, { rate: 5, ratePer: 'min', source: 'plate' });
    const r = analyse({ stations: [bagger, packer, pal] });
    expect(r.limit?.station.name).toBe('Palletiser');
    const say = paceSays(r, packer, 'units', bagger);
    expect(say.short).toBe(false);
    expect(say.verdict).toMatch(/slower than what reaches them, so the one before waits — the line is held at the Palletiser, not here/);
    expect(say.paced).toMatch(/loaded to 117% of their pace/);
    /* what the reference would say */
    expect((r.line as number) / 10 / 6).toBeCloseTo(0.833, 3);
  });
});

describe('AUDIT people — a rate that reads like a time', () => {
  const bagger = m('Bagger', 'units', 1, { rate: 70, ratePer: 'min', source: 'plate' });
  const wrapper = p('Wrapper', 'baskets', 10, { cycleSec: 6, perCycle: 1 }, { allowancePct: 0 });
  it('"5 pallets a minute" is 1,800 units a minute — 25.7 times the 70 that reach them; read as one every 5 min = 0.2 ≈ 0.194: asked', () => {
    const typed = p('Palletiser', 'pallets', 36, { rate: 5, ratePer: 'min' }, { source: 'timed' });
    const q = rateAsTime(analyse({ stations: [bagger, wrapper, typed] }), typed, 'baskets');
    expect(5 * 360).toBe(1800);
    expect(1800 / 70).toBeCloseTo(25.7, 1);
    expect(q?.says).toBe('5 pallets a minute is 1,800 units a minute — 26 times what reaches them.');
    expect(q?.ask).toBe('One pallet every 5 minutes?');
    expect(q?.cycleSec).toBe(300);
  });
  it('the bounds: asked only when ≥ 5 × what reaches them and the time-reading is within ½–2× of it', () => {
    const mk = (rate: number) => { const s = p('Palletiser', 'pallets', 36, { rate, ratePer: 'min' }, { source: 'timed' }); return rateAsTime(analyse({ stations: [bagger, wrapper, s] }), s, 'baskets'); };
    expect(mk(0.9)).toBeUndefined();            // 0.9 × 360 = 324 < 5 × 70
    expect(mk(2.6)).toBeDefined();              // read as one every 2.6 min = 0.385 ≤ 2 × 0.194
    expect(mk(2.4)).toBeUndefined();            // 0.417 > 0.389
    expect(mk(10.2)).toBeDefined();             // one every 10.2 min = 0.098 ≥ 0.0972 (half of what reaches them); 10.3 reads 0.0971 and is just under
    expect(mk(10.4)).toBeUndefined();
    const perSec = p('Palletiser', 'pallets', 36, { rate: 300, ratePer: 'sec' }, { source: 'timed' });
    expect(rateAsTime(analyse({ stations: [bagger, wrapper, perSec] }), perSec, 'baskets')?.ask).toBe('One pallet every 300 seconds?');
  });
});
