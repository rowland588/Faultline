/* AUDIT — several lines feeding one place, the shape, the way to the target
 * and the screen. Reference: each line its own chain; the shared stations
 * receive the SUM of what the lines actually pass on (their good output);
 * like for like at the lines' start, a shared station's figure is its own
 * make ÷ the good fraction of what feeds it; N identical lines send exactly
 * N × one. Rowland's two lines (capacitySeeds lanes2) are the fixture. */
import { describe, expect, it } from 'vitest';
import { analyse, capacityReport, screenCapacity, shiftCapacity, vCurve, type Capacity, type Station } from '../../tools/linebalance/capacity';
import { fmtN } from '../../tools/linebalance/capacityWords';
import { chainOf, lanesAlike, mergeAfterOf, reshape } from '../../tools/linebalance/capacityLines';
import { planToTarget } from '../../tools/linebalance/capacityPlan';
import { barGroups, flowModel } from '../../tools/linebalance/capacityFlow';

let n = 0;
const uid = () => `u${++n}`;
const m = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: uid(), name, kind: 'machine', unit, contains, ...speed, source: 'plate', ...x });
const p = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: uid(), name, kind: 'people', unit, contains, ...speed, source: 'timed', ...x });
let seed = 4242;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/** capacitySeeds.ts lanes2 — Rowland's Line 2a & 2b into one wrapper (Line B's pick & place at 130). */
const LA = 'LA', LB = 'LB';
const lane = (id: string, pp = 140): Station[] => [
  { ...m('bagger', 'units', 1, { rate: 160, ratePer: 'min' }), lane: id },
  { ...m('P160 Pick & Place', 'units', 1, { rate: pp, ratePer: 'min' }), lane: id },
  { ...p('palletiser', 'baskets', 10, { cycleSec: 16, perCycle: 2 }, { source: 'standard', runningPct: 91, allowancePct: 10 }), lane: id },
];
const wrapper = (crew = 1): Station => p('Pallet wrapper', 'pallets', 36, { cycleSec: 720, perCycle: 2 }, { source: 'estimate', cycleIn: 'min', runningPct: 91, crew });
const his = (over: Partial<Capacity> = {}, w = wrapper()): Capacity => ({ targetPerMin: 150, lanes: [{ id: LA, name: 'Line A' }, { id: LB, name: 'Line B — Zoë Brontë’s side' }], stations: [...lane(LA), ...lane(LB, 130), w], ...over });

describe('AUDIT lanes — the seed’s two lines against the reference', () => {
  it('each line: palletiser 2 baskets every 16 s = 7.5 × 10 × 91% = 68.25; both send 136.5; the wrapper does 2 × 360 ÷ 12 min ÷ 1.09 × 91% = 50.09 and holds the whole', () => {
    const r = analyse(his());
    expect(r.lanes?.sections.map(s => s.result.line)).toEqual([expect.closeTo(68.25, 9), expect.closeTo(68.25, 9)]);
    expect(r.lanes?.sends).toBeCloseTo(136.5, 9);
    expect(r.line).toBeCloseTo((2 * 360 / 12) / 1.09 * 0.91, 6);
    expect(r.limit?.station.name).toBe('Pallet wrapper');
    expect(r.goodOut).toBeCloseTo(r.line as number, 9);
  });
  it('N identical lines send exactly N × one line into the shared stations, N = 1…6', () => {
    for (let k = 1; k <= 6; k++) {
      const ids = Array.from({ length: k }, (_, i) => `L${i}`);
      const cap: Capacity = { lanes: ids.map(id => ({ id, name: id })), stations: [...ids.flatMap(id => lane(id)), wrapper(12)] };
      const r = analyse(cap);
      expect(r.lanes?.sends).toBeCloseTo(68.25 * k, 9);
      expect(r.lanes?.merged?.ok[0].effective).toBeCloseTo(68.25 * k, 9);
      /* 12 wrappers do 601: the lines hold it */
      expect(r.lanes?.heldBy).toBe('lanes');
      expect(r.line).toBeCloseTo(68.25 * k, 9);
    }
  });
});

describe('AUDIT lanes — rejects across the merge', () => {
  it('BUG C-b1: a shared station’s rejects are not taken off goodOut when lines feed it', () => {
    /* one line: bagger 100; shared packer 200 rejecting 10%. Good off the end is 90. */
    const cap: Capacity = { lanes: [{ id: 'A', name: 'Line A' }], stations: [{ ...m('bagger', 'bags', 1, { rate: 100 }), lane: 'A' }, m('packer', 'bags', 1, { rate: 200 }, { goodPct: 90 })] };
    const r = analyse(cap);
    expect(r.line).toBeCloseTo(100, 9);
    /* the merged chain itself knows: */
    expect(r.lanes?.merged?.goodOut).toBeCloseTo(90, 9);
    /* the whole does not: */
    expect(r.goodOut).toBeCloseTo(90, 9);
  });
  it('BUG C-b2: a line’s rejects are put back into what it SENDS, so a shared station is compared with more than reaches it', () => {
    /* one line: bagger 100 → weigher rejecting 10% (fast). It passes on 90 good. Shared packer does 95 own.
       Reference: 90 reaches the packer, it does 95 — the BAGGER limits; like for like the packer is 95 ÷ 0.9 = 105.6; good off the end 90. */
    const cap: Capacity = { lanes: [{ id: 'A', name: 'Line A' }], stations: [
      { ...m('bagger', 'bags', 1, { rate: 100 }), lane: 'A' }, { ...m('weigher', 'bags', 1, { rate: 300 }, { goodPct: 90 }), lane: 'A' },
      m('packer', 'bags', 1, { rate: 95 })] };
    const r = analyse(cap);
    expect(r.lanes?.sections[0].result.goodOut).toBeCloseTo(90, 9);
    expect(r.lanes?.sends, 'what the line sends should be what it passes on, 90, not its start-of-line 100').toBeCloseTo(90, 9);
    expect(r.limit?.station.name).toBe('bagger');
    expect(r.goodOut).toBeCloseTo(90, 9);
  });
  it('the same line as ONE chain gets it right — the laned and the plain answer should agree', () => {
    const chain: Capacity = { stations: [m('bagger', 'bags', 1, { rate: 100 }), m('weigher', 'bags', 1, { rate: 300 }, { goodPct: 90 }), m('packer', 'bags', 1, { rate: 95 })] };
    const laned: Capacity = { lanes: [{ id: 'A', name: 'Line A' }], stations: chain.stations.map((s, i) => (i < 2 ? { ...s, lane: 'A' } : s)) };
    const a = analyse(chain), b = analyse(laned);
    expect(a.limit?.station.name).toBe('bagger');
    expect(a.goodOut).toBeCloseTo(90, 9);
    expect(b.limit?.station.name).toBe(a.limit?.station.name);
    expect(b.line).toBeCloseTo(a.line as number, 6);
    expect(b.goodOut).toBeCloseTo(a.goodOut as number, 6);
  });
  it('with no rejects anywhere the laned and the plain answer agree on 200 random one-line shapes', () => {
    for (let t = 0; t < 200; t++) {
      const k = 3 + Math.floor(rand() * 5);
      const st: Station[] = Array.from({ length: k }, (_, i) => (rand() < 0.3
        ? p(`P${i}`, 'bags', 1, { cycleSec: 1 + rand() * 10, perCycle: 1 }, { allowancePct: 0, ...(rand() < 0.5 ? { runningPct: 60 + Math.round(rand() * 40) } : {}) })
        : m(`M${i}`, 'bags', 1, { rate: 10 + rand() * 200 }, rand() < 0.5 ? { runningPct: 60 + Math.round(rand() * 40) } : {})));
      const cut = 1 + Math.floor(rand() * (k - 1));
      const laned: Capacity = { lanes: [{ id: 'A', name: 'A' }], stations: st.map((s, i) => (i < cut ? { ...s, lane: 'A' } : s)) };
      const a = analyse({ stations: st }), b = analyse(laned);
      expect(b.line).toBeCloseTo(a.line as number, 6);
      expect(b.limit?.station.id).toBe(a.limit?.station.id);
      expect(b.goodOut).toBeCloseTo(a.goodOut as number, 6);
    }
  });
});

describe('AUDIT lanes — what reads a laned result', () => {
  it('BUG C-b3: capacity a shift on lines held by themselves names ONE line’s pace while the figure is the sum', () => {
    const cap = his({}, wrapper(3));                     // 3 wrappers: the lines hold it at 136.5
    const r = analyse(cap);
    expect(r.lanes?.heldBy).toBe('lanes');
    expect(r.line).toBeCloseTo(136.5, 9);
    const c = shiftCapacity(r, [{ name: 'Days', min: 480, breakMin: 30 }]) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(c.rows[0].made).toBeCloseTo(450 * 136.5, 6);   // the figure is the whole: 61,425
    /* the words should name the whole's 136.5 a minute, not the palletiser's 68.3 */
    expect(c.sentence).toContain(`At ${fmtN(136.5)} units a minute across the lines together`);   // the house's rounding, the whole named
  });
  it('BUG C-b5: the report’s V sentence on a laned line reads every station against ONE line’s bottleneck', () => {
    const cap = his({ vMarginPct: 10 }, wrapper(3));
    const r = analyse(cap);
    const v = vCurve(r, 10);
    /* a V a line (UPGRADE-AUDIT M5): each palletiser is its own line's 100%, under no V; the whole's limit is the one named */
    const pals = v.points.filter(x => x.name === 'palletiser');
    expect(pals).toHaveLength(2);
    for (const x of pals) { expect(x.isLimit).toBe(true); expect(x.under).toBe(false); }
    expect(v.limit?.index).toBe(r.limit?.index);
    expect(v.sentence).toMatch(/^Line A: /);
    const rep = capacityReport([{ name: 'Line 2', capacity: cap }]);
    expect(rep?.lines[0].vSays ?? '').not.toMatch(/palletiser is only 0% faster than palletiser/);
  });
  it('the flow and the bars read the laned result whole: every lane’s nodes, the merge’s inflow = sends, the whole = line', () => {
    const cap = his();
    const r = analyse(cap);
    const fm = flowModel(cap, r);
    expect(fm.columns.map(c => c.nodes.length)).toEqual([3, 3]);
    expect(fm.sends).toBeCloseTo(136.5, 9);
    expect(fm.makes).toBeCloseTo(r.line as number, 9);
    const groups = barGroups(fm);
    const merged = groups.find(g => g.key === 'merged');
    expect(merged?.rows[0].isInflow).toBe(true);
    expect(merged?.rows[0].perMin).toBeCloseTo(136.5, 9);
    expect(merged?.ref).toBeCloseTo(r.line as number, 9);
  });
});

describe('AUDIT lanes — the way to the target (planToTarget)', () => {
  it('his two lines: 2 on each palletiser, 3 at the wrapper — each step raises the line, the last meets 150', () => {
    const plan = planToTarget(his()) as NonNullable<ReturnType<typeof planToTarget>>;
    expect(plan.reached).toBe(true);
    expect(plan.before).toBeCloseTo(50.09, 1);
    expect(plan.after).toBeGreaterThanOrEqual(150 - 1e-9);
    expect(plan.people).toBe(4);
    expect(plan.crews).toMatchObject({ [his().stations[6].id.replace(/.*/, plan.steps.find(s => s.name.startsWith('Pallet wrapper'))?.stationId ?? '')]: 3 });
    const lines = plan.steps.map(s => s.lineAfter);
    for (let i = 1; i < lines.length; i++) expect(lines[i]).toBeGreaterThanOrEqual(lines[i - 1] - 1e-9);
  });
  it('monotone and stops at the target on 150 random single chains with a people bottleneck', () => {
    for (let t = 0; t < 150; t++) {
      const k = 2 + Math.floor(rand() * 5);
      const st: Station[] = Array.from({ length: k }, (_, i) => (rand() < 0.5
        ? p(`P${i}`, 'bags', 1, { cycleSec: 1 + rand() * 10, perCycle: 1 }, { allowancePct: 0 })
        : m(`M${i}`, 'bags', 1, { rate: 10 + rand() * 200 })));
      const cap: Capacity = { stations: st, targetPerMin: 5 + rand() * 300 };
      const plan = planToTarget(cap);
      if (!plan) continue;
      const after = plan.steps.map(s => s.lineAfter);
      for (let i = 1; i < after.length; i++) expect(after[i]).toBeGreaterThanOrEqual(after[i - 1] - 1e-9);
      if (plan.reached) {
        expect(plan.after).toBeGreaterThanOrEqual(plan.target - 1e-9);
        /* the step before the last did not already meet it */
        if (after.length > 1) expect(after[after.length - 2]).toBeLessThan(plan.target);
      } else expect(plan.stuck).toBeDefined();
      /* the plan's crews re-analysed give the plan's after */
      const done = analyse({ ...cap, stations: st.map(s => (plan.crews[s.id] ? { ...s, crew: plan.crews[s.id] } : s)) });
      expect(done.line).toBeCloseTo(plan.after, 6);
    }
  });
  it('no target or no line: nothing; already met: said; a machine nobody can add to past 12: stuck and said', () => {
    expect(planToTarget({ stations: [m('a', 'bags', 1, { rate: 10 })] })).toBeUndefined();
    expect(planToTarget({ stations: [], targetPerMin: 10 })).toBeUndefined();
    const met = planToTarget({ stations: [m('a', 'bags', 1, { rate: 100 }), m('b', 'bags', 1, { rate: 120 })], targetPerMin: 90 });
    expect(met?.steps).toEqual([]); expect(met?.sentence).toContain('already makes 100 bags/min — 10 over the 90 target');
    const stuck = planToTarget({ stations: [m('a', 'bags', 1, { rate: 1 }), m('b', 'bags', 1, { rate: 1000 })], targetPerMin: 500 });
    expect(stuck?.reached).toBe(false); expect(stuck?.stuck).toMatch(/already has 12/);
  });
});

describe('AUDIT lanes — the screen never fires on a line that meets its target', () => {
  it('200 random lines and laned lines above target: no red check', () => {
    for (let t = 0; t < 200; t++) {
      const k = 2 + Math.floor(rand() * 5);
      const st: Station[] = Array.from({ length: k }, (_, i) => m(`M${i}`, 'bags', 1, { rate: 50 + rand() * 200 }, rand() < 0.3 ? { runningPct: 70 + Math.round(rand() * 30) } : {}));
      const base = analyse({ stations: st });
      const cap: Capacity = { stations: st, targetPerMin: (base.line as number) * (0.3 + rand() * 0.7) };
      expect(screenCapacity(cap, analyse(cap)).filter(c => c.tone === 'r')).toEqual([]);
      const laned = reshape(cap, 2, 1 + Math.floor(rand() * k), uid);
      const lr = analyse(laned);
      if (lr.line != null && lr.line >= (laned.targetPerMin as number)) expect(screenCapacity(laned, lr).filter(c => c.tone === 'r')).toEqual([]);
    }
  });
  it('the short screen fires below 75% and says the people needed as ⌈crew × target ÷ line⌉', () => {
    const cap: Capacity = { targetPerMin: 150, stations: [m('bagger', 'bags', 1, { rate: 200 }), p('packer', 'bags', 1, { cycleSec: 1.2, perCycle: 1 }, { allowancePct: 0 })] };
    const c = screenCapacity(cap, analyse(cap));
    expect(c[0].tone).toBe('r');
    expect(c[0].text).toContain(`To make 150 it would need ${Math.ceil(150 / 50)} people at it (it has 1).`);
    const fine: Capacity = { ...cap, targetPerMin: 66 };          // 50 ÷ 66 = 76%
    expect(screenCapacity(fine, analyse(fine)).filter(x => x.tone === 'r')).toEqual([]);
  });
});

describe('AUDIT lanes — the shape (reshape, lanesAlike, mergeAfterOf)', () => {
  const chain: Capacity = { stations: [m('a', 'bags', 1, { rate: 160 }), m('b', 'bags', 1, { rate: 140 }), p('c', 'baskets', 10, { cycleSec: 16, perCycle: 2 }), p('d', 'pallets', 36, { cycleSec: 720, perCycle: 2 })] };
  it('n lines merging after k: k own each, the rest shared; back to one chain gives the stations back', () => {
    for (let k = 1; k <= 4; k++) for (const lines of [2, 3, 6]) {
      const r = reshape(chain, lines, k, uid);
      expect(r.lanes).toHaveLength(lines);
      expect(mergeAfterOf(r)).toBe(k);
      for (const l of r.lanes ?? []) expect(r.stations.filter(s => s.lane === l.id).map(s => s.name)).toEqual(chain.stations.slice(0, k).map(s => s.name));
      expect(r.stations.filter(s => !s.lane).map(s => s.name)).toEqual(chain.stations.slice(k).map(s => s.name));
      expect(lanesAlike(r)).toBe(true);
      const back = reshape(r, 1, k, uid);
      expect(back.lanes).toBeUndefined();
      expect(back.stations.map(s => s.name)).toEqual(chain.stations.map(s => s.name));
      expect(chainOf(r).map(s => s.name)).toEqual(chain.stations.map(s => s.name));
    }
  });
  it('identical lines give the single chain’s answer per line, and N × it in all', () => {
    for (const lines of [2, 3, 5]) {
      const r = reshape(chain, lines, 4, uid);     // no merge: each ends on its own
      const one = analyse(chain).line as number;
      const all = analyse(r);
      expect(all.lanes?.merged).toBeUndefined();
      expect(all.line).toBeCloseTo(one * lines, 9);
      for (const s of all.lanes?.sections ?? []) expect(s.result.line).toBeCloseTo(one, 9);
    }
  });
  it('more than 8 lines is 8; a fraction is floored; a merge past the end is the end', () => {
    expect(reshape(chain, 20, 2, uid).lanes).toHaveLength(8);
    expect(reshape(chain, 2.9, 2, uid).lanes).toHaveLength(2);
    expect(mergeAfterOf(reshape(chain, 2, 99, uid))).toBe(4);
  });
});
