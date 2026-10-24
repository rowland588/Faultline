/* The control chart's figures and words (knowledge/specs/FC-086-charts.md §6, §7; cases-spc.py, cases-w2.py). */
import { describe, it, expect } from 'vitest';
import { chartFigures, chartSays, chartTiles, chartClosing, chartProblem, freezeFrom, zoneOf, LIMITS_FROM } from '../chart';
import type { AgreedChart, StudyReading } from '../../../lib/study';

const FORTY = [400.0, 400.2, 399.8, 399.3, 399.6, 399.2, 400.0, 401.1, 399.6, 399.5, 400.4, 400.3, 400.1, 399.3, 400.0, 400.6, 398.9, 399.6, 398.5, 399.0, 399.5, 400.8, 400.0, 401.2, 401.1, 400.9, 399.0, 400.6, 401.0, 401.1, 399.8, 400.6, 400.2, 400.4, 401.8, 400.4, 401.0, 401.7, 400.5, 400.9];
const rs = (vs: number[], extra: (i: number) => Partial<StudyReading> = () => ({})): StudyReading[] => vs.map((value, i) => ({ id: `r${i + 1}`, value, at: i + 1, ...extra(i) }));
const XMR: AgreedChart = { kind: 'xmr', name: 'Fill weight', unit: 'g', target: 400 };

describe('the individuals chart (FC-086) — frozen limits, the signals, the CUSUM', () => {
  it('nineteen readings: provisional limits, said so', () => {
    const f = chartFigures(XMR, rs(FORTY.slice(0, 19)));
    expect(f.provisional).toBe(true); expect(f.from).toEqual({ from: 1, to: 19, n: 19 });
    expect(chartSays(f, XMR).text).toMatch(/^Fill weight — 19 readings against provisional limits [\d.]+–[\d.]+ g from 19 — set from 20: no signal — in control against those limits\.$/);
  });
  it('forty readings, limits from the first twenty but not set: the two beyond and the run said, Set the limits offered', () => {
    const f = chartFigures(XMR, rs(FORTY));
    expect(f.centre).toBeCloseTo(399.75, 3); expect(f.lcl).toBeCloseTo(397.986, 2); expect(f.ucl).toBeCloseTo(401.514, 2);
    expect(f.points.filter(p => p.state === 'beyond').map(p => p.no)).toEqual([35, 38]);
    const said = chartSays(f, XMR);
    expect(said.verdict).toBe('Out of control'); expect(said.tone).toBe('r');
    expect(said.text).toBe('Fill weight — 40 readings against limits 397.99–401.51 g from the first 20, not set yet — Set the limits keeps them: 2 beyond (35, 38), four of five beyond 1σ on one side above from reading 22, two of three beyond 2σ on one side above from reading 23, two of three beyond 2σ on one side above from reading 28, eight in a row on one side of the centre above from reading 28, two of three beyond 2σ on one side above from reading 35 — the process has moved.');
    const texts = said.signals.map(s => s.text);
    expect(texts.length).toBe(7);
    expect(texts).toContain('A point beyond a limit (above) — reading 35'); expect(texts).toContain('A point beyond a limit (above) — reading 38');
    expect(texts).toContain('Four of five beyond 1σ on one side (above) — readings 22–40'); expect(texts).toContain('Eight in a row on one side of the centre (above) — readings 28–40');
    expect(said.signals.find(s => /^Two of three/.test(s.text))!.means).toBe('the process has shifted — look at what changed just before');
  });
  it('frozen on 1–20 by a tap, the CUSUM on with a 0.8 g shift: since about reading 28, the level said', () => {
    const frozen = freezeFrom(XMR, rs(FORTY), 1, 20, 1700000000000, 'Dee')!;
    expect(frozen).toMatchObject({ from: 1, to: 20, n: 20, who: 'Dee' }); expect(frozen.centre).toBeCloseTo(399.75, 3);
    const A: AgreedChart = { ...XMR, frozen, cusum: { shift: 0.8 }, ewma: true };
    const f = chartFigures(A, rs(FORTY));
    expect(f.provisional).toBe(false); expect(f.from).toEqual({ from: 1, to: 20, n: 20 });
    expect(f.cusum!.k).toBeCloseTo(0.4, 6); expect(f.cusum!.h).toBeCloseTo(5 * frozen.sigma, 6);
    expect(f.cusum!.signal).toBeDefined(); expect(f.cusum!.since).toBeGreaterThanOrEqual(21); expect(f.cusum!.since).toBeLessThanOrEqual(30);
    expect(f.ewma!.level).toBeGreaterThan(400.5);
    const said = chartSays(f, A);
    expect(said.text).toMatch(/set from readings 1–20: 2 beyond \(35, 38\), four of five beyond 1σ on one side above from reading 22, .* eight in a row on one side of the centre above from reading 28, .* — the process has moved; the rise began about reading \d+ \(CUSUM, signalled at \d+\); the level now about 40\d\.\d g\.$/);
    const tiles = chartTiles(f, A);
    expect(tiles.map(t => t.k)).toEqual(['Readings', 'Centre', 'Limits', 'Signals', 'Since', 'Level']);
    expect(tiles[4].v).toMatch(/^reading \d+$/); expect(tiles[3].v).toBe('7'); expect(tiles[3].of).toBe('2 beyond');
    expect(chartClosing(f, A, said).text).toMatch(/^Out of control — 40 readings, 7 signals \(2 beyond\); the rise began/);
  });
  it('a note on a reading rides on its point; a struck reading is left out', () => {
    const f = chartFigures(XMR, rs(FORTY.slice(0, 10), i => (i === 3 ? { note: 'New reel' } : i === 5 ? { struck: true } : {})));
    expect(f.n).toBe(9); expect(f.points[3].note).toBe('New reel'); expect(f.points.length).toBe(9);
  });
  it('nothing yet, and too few', () => {
    expect(chartSays(chartFigures(XMR, []), XMR).verdict).toBe('Not started');
    expect(chartSays(chartFigures(XMR, rs([400])), XMR).verdict).toBe('Too few');
    expect(chartProblem({ kind: 'xmr', name: '' })).toBe('What is measured — a name, "Fill weight".');
    expect(chartProblem({ kind: 'xbar', name: 'x', subgroup: 1 })).toBe('Readings in a subgroup — 2 to 25.');
    expect(chartProblem({ kind: 'precontrol', name: 'x', lower: 1 })).toBe('Pre-control needs both specification limits.');
    expect(chartProblem({ kind: 'xmr', name: 'x', cusum: { shift: 0 } })).toBe('The shift worth catching — a number above 0, in the unit.');
  });
});

describe('subgroups (FC-087)', () => {
  const G = [[400.2, 399.8, 400.5, 400.1], [399.9, 400.4, 400.0, 399.6], [400.3, 400.1, 399.7, 400.6], [400.8, 401.2, 400.9, 401.5], [400.0, 399.5, 400.2, 399.9], [400.4, 400.0, 400.3, 399.8]];
  const A: AgreedChart = { kind: 'xbar', name: 'Fill weight', unit: 'g', subgroup: 4 };
  it('six subgroups of four in order: X̿ 400.2375, the fourth outside, the R chart inside', () => {
    const f = chartFigures(A, rs(G.flat()));
    expect(f.m).toBe(4); expect(f.points.length).toBe(6); expect(f.centre).toBeCloseTo(400.2375, 4);
    expect(f.lcl).toBeCloseTo(399.703, 2); expect(f.ucl).toBeCloseTo(400.772, 2); expect(f.spreadUcl).toBeCloseTo(1.673, 2);
    expect(f.points.map(p => p.state)).toEqual(['in', 'in', 'in', 'beyond', 'in', 'in']);
    expect(f.points[3].spread).toBeCloseTo(0.7, 6);
    expect(chartSays(f, A).text).toMatch(/^Fill weight — 6 subgroups of 4 against provisional limits 399\.70–400\.77 g from 6 — set from 20: 1 beyond \(4\) — the process has moved\.$/);
  });
  it('a short subgroup is plotted, not judged; readings carrying their group are grouped by it', () => {
    const f = chartFigures(A, rs([...G.flat(), 400.1, 400.2]));
    expect(f.points.length).toBe(7); expect(f.points[6].short).toBe(true); expect(f.points[6].state).toBe('in');
    const g = chartFigures(A, rs(G.flat(), i => ({ group: 6 - Math.floor(i / 4) })));
    expect(g.points[0].y).toBeCloseTo(400.125, 6);   // group 1 is the last four typed
  });
});

describe('short-run (FC-093) and pre-control (FC-092)', () => {
  it('two products: Levene alike → DNOM pooled, the boundary marked; spreads unalike → Z-MR', () => {
    const A = [0.0, 1.5, 1.3, -0.6, -0.3, -0.6, 0.6, -0.1, 0.8, -2.0, 1.7, -0.1].map(d => 250 + d), B = [0.9, -0.2, -0.5, 0.6, 1.1, -0.3, -0.2, 0.9, -1.1, -2.0].map(d => 500 + d);
    const S: AgreedChart = { kind: 'xmr', name: 'Fill weight', unit: 'g', products: true };
    const f = chartFigures(S, rs([...A, ...B], i => (i < 12 ? { product: 'A 250 g', nominal: 250 } : { product: 'B 500 g', nominal: 500 })));
    expect(f.shortRun!.mode).toBe('dnom'); expect(f.shortRun!.alike).toBe(true); expect(f.shortRun!.levene!.p).toBeCloseTo(0.83, 1);
    expect(f.shortRun!.boundaries).toEqual([13]); expect(f.points[12].spread).toBeUndefined();
    expect(f.centre).toBeCloseTo(0.225, 3); /* the provisional centre from the first 20 of the 22 (the record's 0.06 pools all 22) */ expect(f.points.every(p => p.state === 'in')).toBe(true);
    expect(chartSays(f, S).text).toMatch(/2 products on one chart — Levene p 0\.83: the spreads are alike, so the deviations are pooled\.$/);
    const g = chartFigures(S, rs([...A.map(v => 250 + (v - 250) * 4), ...B], i => (i < 12 ? { product: 'A', nominal: 250 } : { product: 'B', nominal: 500 })));
    expect(g.shortRun!.mode).toBe('zmr'); expect(g.ucl).toBe(3); expect(chartSays(g, S).text).toMatch(/limits −3 to \+3 on z/);
  });
  it('pre-control: zones from 396–404, five greens qualify, an amber restarts, the pairs read by the rules', () => {
    const P: AgreedChart = { kind: 'precontrol', name: 'Fill weight', unit: 'g', lower: 396, upper: 404 };
    expect(zoneOf(401, 400, 4)).toBe('green'); expect(zoneOf(403, 400, 4)).toBe('amber'); expect(zoneOf(405, 400, 4)).toBe('red');
    const f = chartFigures(P, rs([400.5, 401.0, 403.0, 399.8, 400.2, 401.1, 399.5, 400.9, 402.8, 403.1, 400.4, 402.9, 400.3, 405.2]));
    expect(f.pre).toMatchObject({ nominal: 400, t: 4, qualified: true, qualifiedAt: 8 });
    expect(f.pre!.pairs.map(p => p.say)).toEqual(['both amber on the high side — adjust toward the nominal, then re-qualify', 'one green, one amber — carry on', 'a red — stop, find why, re-qualify with five greens']);
    const said = chartSays(f, P);
    expect(said.verdict).toBe('Stop');
    expect(said.text).toBe('Fill weight — zones from 396.0–404.0 g (green within ±2.0 g of 400.0 g). Set-up: 5 greens in a row — qualified at reading 8. Running: pair 3 (readings 13 and 14) a red — stop, find why, re-qualify with five greens. Pre-control is a set-up rule, not a control chart and not capability.');
    const g = chartFigures(P, rs([400.5, 401.0, 403.0, 399.8]));
    expect(g.pre!.greens).toBe(1); expect(chartSays(g, P).text).toMatch(/Set-up: 1 green in a row of the 5 needed \(an amber or a red restarts the count\)\./);
    expect(chartTiles(f, P).map(t => t.k)).toEqual(['Readings', 'Set-up', 'Pairs', 'Red']);
  });
  it(`limits are set from ${LIMITS_FROM}`, () => expect(LIMITS_FROM).toBe(20));
});
