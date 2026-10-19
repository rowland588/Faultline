/* WHAT DRIVES IT (the 'drivers' block, lib/flow/analysis): several number
 * columns read together by least squares — how much each moves the figure
 * with the others held still, how sure each is not chance, how much they
 * explain. Built from the status page's own example of what needed
 * development ("a regression on several columns"): one registry entry, its
 * arithmetic held here to an exact line, to a brute-force least squares, to
 * the textbook two-column formula and, with one column, to the Pearson test. */
import { describe, expect, it } from 'vitest';
import { analyse, leastSquares, lineFit, tTwoSided, type FlowAnalysis, type FlowEntry } from '../analysis';
import type { FlowField } from '../definition';
import { validateDefinition } from '../validate';
import { fromProposal, toProposal } from '../proposal';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';

/* speed, temperature and a rejects count that depends on both, with a little scatter */
const SPEED = [50, 52, 55, 58, 60, 61, 63, 65, 68, 70, 72, 75];
const TEMP = [18, 22, 19, 24, 20, 25, 21, 23, 19, 26, 22, 24];
const NOISE = [0.4, -0.3, 0.1, -0.5, 0.6, -0.2, 0.3, -0.4, 0.2, -0.1, 0.5, -0.6];
const REJECTS = SPEED.map((s, i) => 2 + 0.5 * s + 0.3 * TEMP[i] + NOISE[i]);

const sse = (xs: number[][], y: number[], beta: number[]) => y.reduce((t, v, i) => t + (v - (beta[0] + xs[i].reduce((u, x, j) => u + x * beta[j + 1], 0))) ** 2, 0);

describe('least squares with several columns', () => {
  it('an exact line is found exactly, explaining all of it', () => {
    const xs = SPEED.map((s, i) => [s, TEMP[i]]), y = SPEED.map((s, i) => 2 + 3 * s - 0.5 * TEMP[i]);
    const fit = leastSquares(xs, y);
    if (!fit || fit === 'collinear') throw new Error('no fit');
    expect(fit.beta[0]).toBeCloseTo(2, 8);
    expect(fit.beta[1]).toBeCloseTo(3, 10);
    expect(fit.beta[2]).toBeCloseTo(-0.5, 10);
    expect(fit.r2).toBe(1);
  });
  it('no nudge to any coefficient makes the squared error smaller', () => {
    const xs = SPEED.map((s, i) => [s, TEMP[i]]);
    const fit = leastSquares(xs, REJECTS);
    if (!fit || fit === 'collinear') throw new Error('no fit');
    const best = sse(xs, REJECTS, fit.beta);
    for (let j = 0; j < 3; j++) for (const d of [1e-3, -1e-3]) {
      const b = [...fit.beta]; b[j] += d;
      expect(sse(xs, REJECTS, b)).toBeGreaterThan(best);
    }
  });
  it('the same coefficients as the textbook formula for two columns', () => {
    /* b1 = (r_y1 − r_y2·r_12) / (1 − r_12²) · s_y / s_1 */
    const m = (v: number[]) => v.reduce((t, x) => t + x, 0) / v.length;
    const sd = (v: number[]) => Math.sqrt(v.reduce((t, x) => t + (x - m(v)) ** 2, 0) / (v.length - 1));
    const r = (p: number[], q: number[]) => p.reduce((t, x, i) => t + (x - m(p)) * (q[i] - m(q)), 0) / ((p.length - 1) * sd(p) * sd(q));
    const ry1 = r(REJECTS, SPEED), ry2 = r(REJECTS, TEMP), r12 = r(SPEED, TEMP);
    const b1 = ((ry1 - ry2 * r12) / (1 - r12 ** 2)) * (sd(REJECTS) / sd(SPEED));
    const b2 = ((ry2 - ry1 * r12) / (1 - r12 ** 2)) * (sd(REJECTS) / sd(TEMP));
    const fit = leastSquares(SPEED.map((s, i) => [s, TEMP[i]]), REJECTS);
    if (!fit || fit === 'collinear') throw new Error('no fit');
    expect(fit.beta[1]).toBeCloseTo(b1, 10);
    expect(fit.beta[2]).toBeCloseTo(b2, 10);
  });
  it('with one column: the straight line, and the slope’s chance the Pearson test’s', () => {
    const fit = leastSquares(SPEED.map(s => [s]), REJECTS);
    if (!fit || fit === 'collinear') throw new Error('no fit');
    const line = lineFit(SPEED, REJECTS)!;
    expect(fit.beta[1]).toBeCloseTo(line.slope, 10);
    const rr = line.r!, n = SPEED.length;
    expect(fit.p[1]).toBeCloseTo(tTwoSided((rr * Math.sqrt(n - 2)) / Math.sqrt(1 - rr * rr), n - 2), 10);
    expect(fit.r2).toBeCloseTo(rr * rr, 10);
  });
  it('columns that move together cannot be told apart; too few rows or a figure that never varies is nothing', () => {
    expect(leastSquares(SPEED.map(s => [s, 2 * s + 1]), REJECTS)).toBe('collinear');
    expect(leastSquares([[1, 2], [2, 1], [3, 3], [4, 4]], [1, 2, 3, 4])).toBeUndefined();
    expect(leastSquares(SPEED.map((s, i) => [s, TEMP[i]]), SPEED.map(() => 7))).toBeUndefined();
  });
});

const COLS: FlowField[] = [
  { key: 'rejects', label: 'Rejects', type: 'number', unit: 'packs' },
  { key: 'speed', label: 'Line speed', type: 'number', unit: 'ppm' },
  { key: 'temp', label: 'Temperature', type: 'number', unit: '°C' },
  { key: 'humidity', label: 'Humidity', type: 'number', unit: '%' },
];
const HUMID = [55, 41, 63, 48, 59, 44, 52, 61, 47, 57, 50, 45];
const ents = (): FlowEntry[] => SPEED.map((s, i) => ({ id: `e${i}`, on: '2026-10-18', at: i, values: { rejects: REJECTS[i], speed: s, temp: TEMP[i], humidity: HUMID[i] } }));
const A: FlowAnalysis = { key: 'why', label: 'What drives the rejects', block: 'drivers', of: 'rejects', against: 'speed', also: ['temp', 'humidity'] };

describe('the block', () => {
  it('each driver with the others held still, how sure, what they explain, where to look first', () => {
    const r = analyse([A], COLS, ents()).why;
    const fit = leastSquares(SPEED.map((s, i) => [s, TEMP[i], HUMID[i]]), REJECTS);
    if (!fit || fit === 'collinear') throw new Error('no fit');
    expect(r.value).toBeCloseTo(fit.r2 * 100, 10);
    expect(r.says).toMatch(/^What drives the rejects: line speed, temperature and humidity together explain \d+(\.\d+)?% of the rejects — more than 99\.9% sure it is not chance\. /);
    expect(r.says).toMatch(/\. Line speed: 0\.\d+ packs higher for every 1 ppm more, the others held still — more than 99\.9% sure; temperature: /);
    expect(r.says).toMatch(/humidity: [\d.]+ packs (higher|lower) for every 1% more, the others held still — not shown \(/);
    expect(r.says).toMatch(/Look at line speed first\. On 12 entries \(fewer than 30: read it with care\)\. A link is not proof of a cause — test it\.$/);
    expect(r.series?.[0].label).toBe('line speed');
  });
  it('said plainly when it cannot be read', () => {
    expect(analyse([A], COLS, ents().slice(0, 5)).why.says).toBe('What drives the rejects: needs 6 entries with rejects and line speed, temperature and humidity all filled — 5 so far.');
    const twin = ents().map(e => ({ ...e, values: { ...e.values, temp: (e.values.speed as number) * 2 } }));
    expect(analyse([A], COLS, twin).why.says).toBe('What drives the rejects: line speed, temperature and humidity move together in these entries — their effects cannot be told apart; drop one, or log them where they vary apart.');
  });
});

const def = (also: unknown): unknown => ({
  schema: FLOW_SCHEMA, name: 'Rejects read', purpose: 'What drives them.', kind: 'investigation', roles: [],
  stages: [{ key: 's', name: 'Read', steps: [{ key: 'log', title: 'Log the rejects', per: 'line', answer: 'log', columns: COLS, analyses: [{ ...A, also }] }], gate: { conditions: [{ id: 'g', type: 'stepsDone', policy: 'block' }] } }],
});

describe('kept honest, and proposed', () => {
  it('the validator keeps the columns once each, and refuses in words', () => {
    expect(validateDefinition(def(['temp', 'humidity'])).errors).toEqual([]);
    const said = (also: unknown) => validateDefinition(def(also)).errors.map(e => e.message).join(' | ');
    expect(said(['temp', 'temp'])).toMatch(/reads “Temperature” twice — each column once/);
    expect(said(['speed'])).toMatch(/reads “Line speed” twice/);
    expect(said(['nope'])).toMatch(/reads "nope", which is not a column of the log/);
    const rel = structuredClone(def(['temp'])) as { stages: { steps: { analyses: Record<string, unknown>[] }[] }[] };
    rel.stages[0].steps[0].analyses[0].block = 'relation';
    expect(validateDefinition(rel).errors.map(e => e.message).join(' | ')).toMatch(/reads no more columns — only what drives it does/);
  });
  it('the assistant names the columns by their labels; read back to their keys', () => {
    const p = toProposal(validateDefinition(def(['temp', 'humidity'])).def as FlowDefinition) as { stages: { steps: { analyses: Record<string, unknown>[] }[] }[] };
    expect(p.stages[0].steps[0].analyses[0]).toMatchObject({ against: 'Line speed', also: ['Temperature', 'Humidity'] });
    const back = validateDefinition(fromProposal({ ...p, assumptions: [], questions: [] }).def);
    expect(back.errors).toEqual([]);
    expect(back.def?.stages[0].steps[0].analyses?.[0]).toMatchObject({ block: 'drivers', of: 'rejects', against: 'line_speed', also: ['temperature', 'humidity'] });
  });
});
