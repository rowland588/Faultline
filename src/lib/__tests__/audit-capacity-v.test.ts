/* AUDIT — the V-curve, its colours, accumulation, and the words at the
 * edges. Reference from docs/CAPACITY.md §4: the stations next to the
 * critical machine about 10% faster, each further one about 10% more (the
 * owner's margin); a buffer must hold the typical minor stop × the critical
 * machine's rate; 2–5 minutes of production is the rule of thumb. */
import { describe, expect, it } from 'vitest';
import { accumulation, analyse, lineIfRaised, ownSpeed, shareColours, vCurve, type Capacity, type Station, type StopStats } from '../capacity';
import { fmtDur, fmtN } from '../capacityWords';
import { perMinWords } from '../capacityFlow';

let n = 0;
const m = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'machine', unit, contains, ...speed, source: 'plate', ...x });

describe('AUDIT V — the guide and the shares', () => {
  const st = [m('Depal', 'bags', 1, { rate: 133 }), m('Filler', 'bags', 1, { rate: 100 }), m('Capper', 'bags', 1, { rate: 108 }), m('Labeller', 'bags', 1, { rate: 125 }), m('Packer', 'bags', 1, { rate: 128 })];
  it('shares are each station’s effective ÷ the bottleneck’s; the bottleneck 100%; steps signed from it', () => {
    const v = vCurve(analyse({ stations: st }), 10);
    expect(v.points.map(x => Math.round(x.pct))).toEqual([133, 100, 108, 125, 128]);
    expect(v.points.map(x => x.steps)).toEqual([-1, 0, 1, 2, 3]);
    expect(v.limit?.name).toBe('Filler');
  });
  it('DESIGN C-d2: the guide is LINEAR in the steps (110, 120, 130), not compounded (110, 121, 133.1)', () => {
    const v = vCurve(analyse({ stations: st }), 10);
    expect(v.points.map(x => x.guide)).toEqual([110, undefined, 110, 120, 130]);
    const compounded = [1, 2, 3].map(k => Math.round(100 * 1.1 ** k * 10) / 10);
    expect(compounded).toEqual([110, 121, 133.1]);
    /* the packer at 128%, three steps out, clears the linear V (130? no — 128 < 130: under) and would be under the compounded one too */
    expect(v.points[4].under).toBe(true);
    expect(v.points[2].under).toBe(true);                       // capper 108 < 110
    expect(v.points[3].under).toBe(false);                      // labeller 125 ≥ 120 (compounded would ask 121)
    expect(v.sentence).toBe('The capper is only 8% faster than Filler (the V asks 10%) — a short stop there blocks Filler; the packer is only 28% faster than Filler (the V asks 30%) — a short stop there blocks Filler.');
  });
  it('no margin: no guide, nothing under, the sentence asks for it; every station clearing says so', () => {
    const none = vCurve(analyse({ stations: st }));
    expect(none.points.every(x => x.guide == null && !x.under)).toBe(true);
    expect(none.sentence).toMatch(/Set the V’s margin|Set the V's margin/);
    const clear = vCurve(analyse({ stations: st }), 5);
    expect(clear.under).toEqual([]);
    expect(clear.sentence).toBe('Every station clears the V: each step away from Filler is at least 5% faster, so a short stop beside it is absorbed.');
  });
  it('the running share sits above the effective one when a station has stops', () => {
    const v = vCurve(analyse({ stations: [m('A', 'bags', 1, { rate: 100 }), m('B', 'bags', 1, { rate: 120 }, { runningPct: 80 })] }), 10);
    const b = v.points[1];
    expect(b.runningPct).toBeCloseTo((120 / 96) * 100, 9);
    expect(b.pct).toBeCloseTo(100, 9);
    expect(v.limit?.name).toBe('B');
  });
  it('shareColours: the bottleneck graphite, under the V amber, else teal lightening to 250% — finite strings for every share', () => {
    expect(shareColours(100, true, false)[0]).toBe('#12171c');
    expect(shareColours(100, false, true)[0]).toBe('#b45309');
    const at = (pct: number) => shareColours(pct, false, false)[0];
    expect(at(100)).toBe('rgb(12,116,137)');
    expect(at(250)).toBe('rgb(127,219,228)');
    expect(at(1e9)).toBe(at(250));
    expect(at(50)).toBe(at(100));
    for (const pct of [0, 1, 99.9, 100.1, 175, 249, 251, 1e6]) expect(at(pct)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
  it('an empty line: no points, a sentence that says what to do', () => {
    const v = vCurve(analyse({ stations: [] }), 10);
    expect(v.points).toEqual([]); expect(v.limit).toBeUndefined();
    expect(v.sentence).toMatch(/^Put in the stations/);
  });
});

describe('AUDIT V — accumulation (docs/CAPACITY.md §4)', () => {
  const stats = (o: Record<string, Partial<StopStats>>): Record<string, StopStats> =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ownMins: 0, waitMins: 0, events: 0, ownEvents: 0, ...v }]));
  it('the buffer must hold the typical minor stop × the bottleneck’s RUNNING rate: 150 bags before a Bagger at 100 covers a 1.5 min stop', () => {
    const feeder = m('Feeder', 'bags', 1, { rate: 200 }, { bufferAfter: 150 });
    const bagger = m('Bagger', 'bags', 1, { rate: 100 }, { runningPct: 80, bufferAfter: 50 });
    const packer = m('Packer', 'bags', 1, { rate: 200 });
    const r = analyse({ stations: [feeder, bagger, packer] });
    expect(r.limit?.station.name).toBe('Bagger');
    const acc = accumulation(r, stats({ [feeder.id]: { ownMins: 4.5, ownEvents: 3 }, [packer.id]: { ownMins: 2, ownEvents: 2 } }));
    const rows = Object.fromEntries(acc.rows.map(x => [x.name, x]));
    /* at the bagger's running 100 a minute (not its 80 once stops count): 150 ÷ 100 = 1.5 min ≥ 1.5 typical → covered */
    expect(ownSpeed(r.limit!)).toBe(100);
    expect(rows.Feeder.coverMin).toBeCloseTo(1.5, 9); expect(rows.Feeder.typicalMin).toBeCloseTo(1.5, 9); expect(rows.Feeder.covered).toBe(true); expect(rows.Feeder.side).toBe('before');
    /* after: room for 50 bags = 0.5 min of the bagger's work against a 1 min typical stop → blocks */
    expect(rows.Packer.coverMin).toBeCloseTo(0.5, 9); expect(rows.Packer.typicalMin).toBe(1); expect(rows.Packer.covered).toBe(false); expect(rows.Packer.side).toBe('after');
    expect(acc.sentence).toBe('The packer\'s own stops last 1 min on average; what can collect between it and Bagger holds 0.5 min of Bagger\'s work — a typical stop there blocks Bagger.');
  });
  it('buffers in a station’s own unit are read into the line’s; several between are summed; nothing written says so', () => {
    const a = m('A', 'bags', 1, { rate: 200 }, { bufferAfter: 100 });
    const b = m('B', 'trays', 8, { rate: 30 }, { bufferAfter: 10 });        // 240 bags/min; 10 trays = 80 bags
    const c = m('C', 'trays', 1, { rate: 12 });                               // 96 bags/min — the bottleneck
    const r = analyse({ stations: [a, b, c] });
    const acc = accumulation(r, stats({ [a.id]: { ownMins: 3, ownEvents: 1 } }));
    expect(acc.rows[0].coverMin).toBeCloseTo((100 + 80) / 96, 9);
    const none = accumulation(r, stats({ [a.id]: { ownMins: 3, ownEvents: 1 } }));
    void none;
    const bare = analyse({ stations: [a, b, c].map(s => ({ ...s, bufferAfter: undefined })) });
    expect(accumulation(bare, stats({ [a.id]: { ownMins: 3, ownEvents: 1 } })).sentence).toMatch(/^Nothing is written down as collecting/);
    expect(accumulation(bare, stats({})).sentence).toBe('');
  });
});

describe('AUDIT V — what an improvement is worth, and the words at the edges', () => {
  it('lineIfRaised is capped by the others; an empty line gives nothing', () => {
    const r = analyse({ stations: [m('A', 'bags', 1, { rate: 60 }), m('B', 'bags', 1, { rate: 70 }), m('C', 'bags', 1, { rate: 65 })] });
    expect(lineIfRaised(r, 0, 100)).toBe(65);
    expect(lineIfRaised(r, 0, 62)).toBe(62);
    expect(lineIfRaised(r, 1, 1000)).toBe(60);
    expect(lineIfRaised(analyse({ stations: [] }), 0, 10)).toBeUndefined();
  });
  it('fmtN, fmtDur, perMinWords: no trailing zeros, no NaN, sensible at 0, tiny, huge and negative', () => {
    expect([fmtN(0), fmtN(0.004), fmtN(0.13), fmtN(1.25), fmtN(99.96), fmtN(100.4), fmtN(-2.345), fmtN(1e6)]).toEqual(['0', '0', '0.13', '1.3', '100', '100', '-2.3', '1000000']);
    expect([fmtDur(0), fmtDur(6.857), fmtDur(45), fmtDur(89.6), fmtDur(90), fmtDur(308.6), fmtDur(3600), fmtDur(4800)]).toEqual(['0 s', '6.9 s', '45 s', '90 s', '1 min 30 s', '5 min 9 s', '1 h', '1 h 20 min']);
    expect([perMinWords(0), perMinWords(68.7999), perMinWords(99.95), perMinWords(1240.4)]).toEqual(['0', '68.8', '100', '1,240']);
  });
  it('a target of zero is no target; a negative gap is "above"; the sentence on a met target points at stops and quality', () => {
    const cap: Capacity = { targetPerMin: 0, stations: [m('A', 'bags', 1, { rate: 60 }), m('B', 'bags', 1, { rate: 70 })] };
    const r = analyse(cap);
    expect(r.target).toBeUndefined(); expect(r.gap).toBeUndefined();
    const met = analyse({ ...cap, targetPerMin: 50 });
    expect(met.gap).toBe(-10);
    expect(met.sentence).toContain('above the 50 target. Capacity is not what holds this line back at that target — look at stops and quality.');
  });
  it('QUESTION C-q3: the headline figure is not said "at most" — only the lift is', () => {
    const r = analyse({ stations: [m('A', 'bags', 1, { rate: 60 }), m('B', 'bags', 1, { rate: 70 })] });
    expect(r.sentence).toBe('A limits the line at 60 bags/min. B is next at 70, so fixing A lifts the line by 10 at most.');
    expect(/at 60 bags\/min at most|at most 60/.test(r.sentence)).toBe(false);
  });
});
