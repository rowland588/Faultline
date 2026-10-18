/* BLOCKS WRITTEN AFTER THE FIRST — a control chart, a relationship, a
 * forecast (lib/flow/analysis). The point of the registry: a new block is
 * its arithmetic and these tests, and it is in the designer, the validator,
 * the proposal, the picture and the paper with nothing else rebuilt. Every
 * figure below is worked by hand in its comment. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, numbersOf, type FlowDefinition, type FlowField } from '../definition';
import { BLOCKS, BLOCK_CATALOGUE, analyse, controlOf, lineFit, type FlowAnalysis, type FlowEntry } from '../analysis';
import { validateDefinition } from '../validate';
import { sdWithinOf } from '../../ie/sample';

const cols: FlowField[] = [
  { key: 'w', label: 'Fill weight', type: 'reading', unit: 'g' },
  { key: 'speed', label: 'Line speed', type: 'number', unit: 'ppm' },
  { key: 'rej', label: 'Rejects', type: 'number' },
  { key: 'm', label: 'Minutes', type: 'number', unit: 'min' },
  { key: 'shift', label: 'Shift', type: 'choice', options: ['Days', 'Nights'] },
];
const day = (i: number) => `2026-10-${String(i + 1).padStart(2, '0')}`;
const readings = (xs: number[], key = 'w'): FlowEntry[] => xs.map((v, i) => ({ id: `${key}${i}`, on: day(i), at: i, values: { [key]: v } }));
const one = (a: FlowAnalysis, entries: FlowEntry[]) => analyse([a], cols, entries)[a.key];

describe('a control chart (individuals, I-MR)', () => {
  const cc: FlowAnalysis = { key: 'cc', label: 'Fill weight', block: 'control', of: 'w' };

  it('a reading outside the limits is one signal, said with its day', () => {
    /* mean 109/8 = 13.625; moving ranges 2,1,2,3,1,1,18 → 28/7 = 4; ± 2.66 × 4 = 10.64 */
    const r = one(cc, readings([10, 12, 11, 13, 10, 11, 12, 30]));
    expect(r.limits?.centre).toBeCloseTo(13.625, 9);
    expect(r.limits?.upper).toBeCloseTo(24.265, 9);
    expect(r.limits?.lower).toBeCloseTo(2.985, 9);
    expect(r.value).toBe(1);
    expect(r.series?.map(p => p.flag ?? '')).toEqual(['', '', '', '', '', '', '', 'outside']);
    expect(r.says).toBe('Fill weight: 1 signal — 30 g on 8 Oct above the upper limit; find what changed then. Limits 2.98 g to 24.27 g, centre 13.63 g (fewer than 20 readings: the limits are provisional).');
  });

  it('eight in a row on one side of the centre is one signal, from the day the run began', () => {
    /* mean 37/14; moving ranges thirteen 1s → 1; the six 1–2s below, the eight 3–4s above */
    const r = one(cc, readings([1, 2, 1, 2, 1, 2, 3, 4, 3, 4, 3, 4, 3, 4]));
    expect(r.value).toBe(1);
    expect(r.series?.filter(p => p.flag === 'run')).toHaveLength(8);
    expect(r.says).toMatch(/^Fill weight: 1 signal — 8 in a row above the centre from 7 Oct; find what changed then\./);
    /* seven in a row is not a run */
    expect(one(cc, readings([1, 2, 1, 2, 1, 2, 3, 4, 3, 4, 3, 4, 3])).value).toBe(0);
  });

  it('in control, too few readings, no variation — each said, none faked', () => {
    expect(one(cc, readings([10, 11, 10, 11, 10, 11]))).toMatchObject({ value: 0, says: expect.stringMatching(/^Fill weight: in control — 6 readings within the limits/) });
    const few = one(cc, readings([10, 11, 10, 11])), same = one(cc, readings([10, 10, 10, 10, 10]));
    expect([few.value, few.says]).toEqual([undefined, 'Fill weight: needs 5 readings to set its limits — 4 so far.']);
    expect([same.value, same.says]).toEqual([undefined, 'Fill weight: every reading is the same — no variation to set limits from.']);
  });

  it('the limits are three spreads-within either side — the capability study\'s own spread (lib/ie/sample)', () => {
    const xs = [500.2, 501.1, 499.8, 500.6, 502.0, 500.9, 499.5, 500.1, 501.4, 500.7, 499.9, 500.3];
    const c = controlOf(xs);
    /* 2.66 is 3 ÷ 1.128, rounded as the practice rounds it */
    expect(((c?.upper ?? 0) - (c?.centre ?? 0)) / (3 * sdWithinOf(xs))).toBeCloseTo(1, 3);
  });

  it('readings are taken in the order they happened, a struck one left out', () => {
    const es = readings([10, 12, 11, 13, 10, 11, 12, 30]).reverse();
    es.push({ id: 'x', on: day(3), at: 99, values: { w: 500 }, struck: true });
    expect(one(cc, es).series?.map(p => p.value)).toEqual([10, 12, 11, 13, 10, 11, 12, 30]);
  });
});

describe('a relationship between two columns', () => {
  const rel: FlowAnalysis = { key: 'rel', label: 'Rejects and speed', block: 'relation', of: 'rej', against: 'speed' };
  const pairs = (ps: [number, number][]): FlowEntry[] => ps.map(([speed, rej], i) => ({ id: `p${i}`, on: day(i), at: i, values: { speed, rej } }));

  it('r and the line through the points, said with what it does not prove', () => {
    /* x 1..5, y 3,5,4,8,10: Sxy 17, Sxx 10, Syy 34 → slope 1.7, intercept 0.9, r = 17 ÷ √340 */
    const r = one(rel, pairs([[1, 3], [2, 5], [3, 4], [4, 8], [5, 10]]));
    expect(r.value).toBeCloseTo(17 / Math.sqrt(340), 9);
    expect(r.fit?.slope).toBeCloseTo(1.7, 9);
    expect(r.fit?.intercept).toBeCloseTo(0.9, 9);
    expect(r.series?.map(p => [p.x, p.value])).toEqual([[1, 3], [2, 5], [3, 4], [4, 8], [5, 10]]);
    expect(r.says).toBe('Rejects and speed: a strong link — r = 0.92; Rejects about 1.7 higher for every 1 ppm more line speed, from 5 entries (fewer than 10: read it with care). A link is not proof of a cause — test it.');
  });

  it('falling, no clear link, too few, nothing varying', () => {
    expect(one(rel, pairs([[1, 10], [2, 8], [3, 9], [4, 5], [5, 3]])).says).toMatch(/a strong link — r = -0\.9\d; Rejects about 1\.7 lower for every 1 ppm more line speed/);
    /* y does not follow x at all: r = 0 */
    expect(one(rel, pairs([[1, 5], [2, 3], [3, 7], [4, 3], [5, 5]])).says).toBe('Rejects and speed: no clear link between Rejects and Line speed — r = 0, from 5 entries (fewer than 10: read it with care).');
    expect(one(rel, pairs([[1, 3], [2, 5]])).says).toBe('Rejects and speed: needs 3 entries with both Rejects and Line speed — 2 so far.');
    expect(one(rel, pairs([[2, 3], [2, 5], [2, 4]])).says).toBe('Rejects and speed: Line speed does not vary in these entries — nothing to relate.');
    expect(lineFit([1, 2, 3], [4, 4, 4])).toEqual({ slope: 0, intercept: 4 });
  });
});

describe('a forecast', () => {
  const minutes = (vs: [string, number][]): FlowEntry[] => vs.map(([on, m], i) => ({ id: `f${i}`, on, at: i, values: { m } }));
  const fc: FlowAnalysis = { key: 'fc', label: 'Stop minutes a day', block: 'forecast', of: 'm', target: 10 };

  it('the line through the days, a week on, and the day it reaches its target', () => {
    /* 20, 18, 16, 14 on 12–15 Oct: −2 a day from 20; 10 on day 5 = 17 Oct; a week on (day 10) 0, never below */
    const r = one(fc, minutes([['2026-10-12', 20], ['2026-10-13', 18], ['2026-10-14', 16], ['2026-10-15', 14]]));
    expect(r.fit).toEqual({ slope: -2, intercept: 20 });
    expect(r.value).toBe(0);
    expect(r.says).toBe('Stop minutes a day: falling 2 min a day — 14 min now on the line through 4 days, 0 min a week on; it reaches 10 min on 17 Oct at this rate (fewer than 7 days: a rough guide).');
  });

  it('days apart are days apart — a weekend not logged is not squeezed out', () => {
    /* 12 Oct 20, 15 Oct 14, 16 Oct 12: x 0,3,4 → slope −2 exactly */
    const r = one(fc, minutes([['2026-10-12', 20], ['2026-10-15', 14], ['2026-10-16', 12]]));
    expect(r.fit?.slope).toBeCloseTo(-2, 9);
    expect(r.says).toMatch(/it reaches 10 min on 17 Oct at this rate/);
  });

  it('moving away, flat, past it, too few days', () => {
    expect(one({ ...fc, target: 30 }, minutes([['2026-10-12', 20], ['2026-10-13', 18], ['2026-10-14', 16]])).says).toMatch(/already past 30 min on the line, and moving on/);
    expect(one(fc, minutes([['2026-10-12', 15], ['2026-10-13', 15], ['2026-10-14', 15]])).says).toMatch(/^Stop minutes a day: flat — 15 min now .*; it does not move towards 10 min/);
    expect(one(fc, minutes([['2026-10-12', 15], ['2026-10-13', 14]])).says).toBe('Stop minutes a day: needs 3 days logged to see where it is heading — 2 days so far.');
    /* entries counted, not a column */
    expect(one({ key: 'n', label: 'Stops a day', block: 'forecast' }, minutes([['2026-10-12', 1], ['2026-10-12', 1], ['2026-10-13', 1], ['2026-10-14', 1]])).fit?.slope).toBeCloseTo(-0.5, 9);
  });
});

describe('a new block is in everything at once', () => {
  it('the catalogue the designer and the assistant read carries it, with its picture', () => {
    expect(BLOCK_CATALOGUE.filter(b => ['control', 'relation', 'forecast'].includes(b.id)).map(b => [b.id, b.picture, b.against, b.target])).toEqual([
      ['control', 'control', 'none', 'none'], ['relation', 'scatter', 'required', 'none'], ['forecast', 'forecast', 'none', 'optional'],
    ]);
    expect(BLOCKS.pareto.picture).toBe('pareto');
    expect(BLOCKS.mean.picture).toBe('none');
  });

  const def = (analyses: unknown[]): FlowDefinition => ({
    schema: FLOW_SCHEMA, name: 'Fill weight held', purpose: 'Readings logged, held in control.', kind: 'improvement', roles: [],
    stages: [{ key: 's', name: 'Log', steps: [{ key: 'log', title: 'Log the readings', per: 'line', answer: 'log', columns: cols, analyses: analyses as FlowAnalysis[] }], gate: { conditions: [{ id: 'g', type: 'fieldMeets', policy: 'block', step: 'log', field: 'signals', op: '=', value: 0 }] } }],
  });

  it('the validator keeps it and its figure is a box a gate can wait on', () => {
    const c = validateDefinition(def([
      { key: 'signals', label: 'Signals', block: 'control', of: 'w' },
      { key: 'link', label: 'Rejects and speed', block: 'relation', of: 'rej', against: 'speed' },
      { key: 'ahead', label: 'Minutes a week on', block: 'forecast', of: 'm', target: 10 },
    ]));
    expect(c.errors).toEqual([]);
    expect(c.def?.stages[0].steps[0].analyses?.[1].against).toBe('speed');
    expect(c.def?.stages[0].steps[0].analyses?.[2].target).toBe(10);
    expect(numbersOf(c.def?.stages[0].steps[0] ?? { key: '', title: '', per: 'line', answer: 'log' }).map(n => n.key)).toEqual(expect.arrayContaining(['signals', 'link', 'ahead']));
  });

  it('refuses it used wrongly, in words', () => {
    const errs = (a: unknown) => validateDefinition(def([{ key: 'signals', label: 'Signals', block: 'control', of: 'w' }, a])).errors.map(e => e.message).join(' | ');
    expect(errs({ key: 'x', label: 'Link', block: 'relation', of: 'rej' })).toMatch(/reads one column against another — say which/);
    expect(errs({ key: 'x', label: 'Link', block: 'relation', of: 'rej', against: 'shift' })).toMatch(/reads against “Shift”, which is not a number/);
    expect(errs({ key: 'x', label: 'Link', block: 'relation', of: 'rej', against: 'rej' })).toMatch(/reads “Rejects” against itself/);
    expect(errs({ key: 'x', label: 'Total', block: 'sum', of: 'rej', against: 'speed' })).toMatch(/reads no second column/);
    expect(errs({ key: 'x', label: 'Total', block: 'sum', of: 'rej', target: 5 })).toMatch(/only a forecast reads one/);
    expect(errs({ key: 'x', label: 'Ahead', block: 'forecast', of: 'm', target: 'soon' })).toMatch(/a target that is not a number/);
    expect(errs({ key: 'x', label: 'Chart', block: 'control', of: 'shift' })).toMatch(/not a number/);
  });

  it('proposed by the assistant and said back the same', async () => {
    const { fromProposal, toProposal } = await import('../proposal');
    const c = validateDefinition(def([
      { key: 'signals', label: 'Signals', block: 'control', of: 'w' },
      { key: 'link', label: 'Rejects and speed', block: 'relation', of: 'rej', against: 'speed' },
      { key: 'ahead', label: 'Minutes a week on', block: 'forecast', of: 'm', target: 10 },
    ]));
    const said = toProposal(c.def as FlowDefinition) as { stages: { steps: { analyses: Record<string, unknown>[] }[] }[] };
    expect(said.stages[0].steps[0].analyses[1]).toMatchObject({ block: 'relation', of: 'Rejects', against: 'Line speed', target: null });
    expect(said.stages[0].steps[0].analyses[2]).toMatchObject({ block: 'forecast', of: 'Minutes', against: '', target: 10 });
    const again = validateDefinition(fromProposal({ ...said, assumptions: [], questions: [] }).def);
    expect(again.errors).toEqual([]);
    /* a proposal names columns by their words; the keys are made from them again */
    expect(again.def?.stages[0].steps[0].analyses?.map(a => [a.block, a.of, a.against, a.target])).toEqual([['control', 'fill_weight', undefined, undefined], ['relation', 'rejects', 'line_speed', undefined], ['forecast', 'minutes', undefined, 10]]);
  });
});
