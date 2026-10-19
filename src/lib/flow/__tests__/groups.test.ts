/* DOES IT DIFFER BY GROUP? (the 'groups' block, lib/flow/analysis): one-way
 * analysis of variance — the shift, the crew, the product, the cause — and
 * how sure the difference is not chance. Written as one entry in the
 * registry and nothing else: the editor, the validator, the assistant, the
 * screen and the paper offer it from the catalogue. The F-distribution is
 * held to its exact forms and to the printed tables; the test to a hand
 * example whose chance is exactly one in a thousand. */
import { describe, expect, it } from 'vitest';
import { BLOCK_CATALOGUE, analyse, fUpper, oneWay, tTwoSided, type FlowEntry } from '../analysis';
import type { FlowField } from '../definition';
import { libraryEntry } from '../library';
import { validateDefinition } from '../validate';

describe('the F-distribution, as the tables give it', () => {
  it('with one degree of freedom on top, F is t squared', () => {
    for (const [f, d2] of [[4.2, 7], [9.5, 3], [1.1, 25]]) expect(fUpper(f, 1, d2)).toBeCloseTo(tTwoSided(Math.sqrt(f), d2), 12);
  });
  it('with two on top it has a closed form: (1 + 2f/d2)^(−d2/2)', () => {
    for (const [f, d2] of [[27, 6], [3.3, 11], [0.4, 40]]) expect(fUpper(f, 2, d2)).toBeCloseTo((1 + (2 * f) / d2) ** (-d2 / 2), 12);
  });
  it('the printed critical values — 5% and 1%', () => {
    for (const [f, d1, d2, p] of [[4.9646, 1, 10, 0.05], [4.1028, 2, 10, 0.05], [7.5594, 2, 10, 0.01], [3.0984, 3, 20, 0.05], [2.6896, 4, 30, 0.05]] as const) {
      expect(Math.abs(fUpper(f, d1, d2) - p), `F ${f} on ${d1}, ${d2}`).toBeLessThan(3e-4);
    }
  });
});

describe('one-way analysis of variance, worked by hand', () => {
  it('three groups of three: F 27 on 2 and 6 — a chance of exactly one in a thousand', () => {
    /* means 5, 8 and 2 about a grand mean of 5: between = 3·0 + 3·9 + 3·9 = 54 on 2;
       within = 2 + 2 + 2 = 6 on 6; F = 27 / 1 = 27; P = (1 + 2·27/6)^(−3) = 10^(−3) */
    const r = oneWay([[4, 5, 6], [7, 8, 9], [1, 2, 3]])!;
    expect([r.f, r.d1, r.d2]).toEqual([27, 2, 6]);
    expect(r.p).toBeCloseTo(0.001, 12);
  });
  it('a group of one is left out; fewer than two groups of two is nothing to test', () => {
    expect(oneWay([[4, 5, 6], [7, 8, 9], [100]])).toMatchObject({ d1: 1, d2: 4 });
    expect(oneWay([[4, 5, 6], [7]])).toBeUndefined();
    expect(oneWay([[2, 2], [5, 5]])).toMatchObject({ p: 0 });
    expect(oneWay([[2, 2], [2, 2]])).toMatchObject({ f: 0, p: 1 });
  });
});

const COLS: FlowField[] = [{ key: 'secs', label: 'Seconds', type: 'timer', unit: 's' }, { key: 'cause', label: 'Cause', type: 'choice', options: ['Jam', 'Film', 'Sensor', 'Other'] }];
const ents = (rows: [number, string][]): FlowEntry[] => rows.map(([secs, cause], i) => ({ id: `e${i}`, on: '2026-10-18', at: i, values: { secs, cause } }));
const read = (rows: [number, string][]) => analyse([{ key: 'g', label: 'Depends on the cause?', block: 'groups', of: 'secs', by: 'cause' }], COLS, ents(rows)).g;

describe('the block', () => {
  it('the groups, highest and lowest, and how sure they differ', () => {
    const r = read([[7, 'Jam'], [8, 'Jam'], [9, 'Jam'], [4, 'Film'], [5, 'Film'], [6, 'Film'], [1, 'Sensor'], [2, 'Sensor'], [3, 'Sensor'], [10, 'Other']]);
    expect(r.series).toEqual([{ label: 'Jam', value: 8 }, { label: 'Film', value: 5 }, { label: 'Sensor', value: 2 }]);
    expect(r.value).toBeCloseTo(99.9, 10);
    expect(r.says).toBe('Depends on the cause?: seconds highest for Jam at 8 s an entry, lowest for Sensor at 2 s — it differs by cause: 99.9% sure it is not chance — look at what Jam does differently (on 9 entries in 3 groups; Other left out — fewer than 2 entries; fewer than 5 in a group: read it with care).');
  });
  it('said plainly when there is nothing to tell, or not enough', () => {
    expect(read([[1, 'Jam'], [3, 'Jam'], [2, 'Film'], [2, 'Film']]).says).toBe('Depends on the cause?: seconds the same in every cause, 2 s an entry — no real difference by cause shown: it could be chance (0% sure) (on 4 entries in 2 groups; fewer than 5 in a group: read it with care).');
    expect(read([[1, 'Jam'], [3, 'Jam'], [2, 'Film']]).says).toBe('Depends on the cause?: needs at least 2 cause groups with 2 entries each to compare — 1 group so far; Film left out — fewer than 2 entries.');
  });
  it('offered from the registry — in the catalogue the editor and the assistant read', () => {
    expect(BLOCK_CATALOGUE.find(b => b.id === 'groups')).toMatchObject({ of: 'required', by: 'required', output: 'both', picture: 'bars' });
  });
});

describe('on Faultline’s short stops', () => {
  it('asks whether a stop’s length depends on what stopped it — and the validator keeps it', () => {
    const def = libraryEntry('short-stops')!.build();
    expect(validateDefinition(def).errors).toEqual([]);
    expect(def.stages[0].steps[0].analyses?.find(a => a.block === 'groups')).toMatchObject({ of: 'time_to_clear', by: 'stopped_by' });
  });
});
