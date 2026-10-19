/* PACK WEIGHTS AND THE LAW (the 'emark', 'giveaway' and 'fill' blocks,
 * lib/flow/analysis): the average system packers keep — the tolerable
 * negative error from the Regulations' table, the three rules, what is given
 * away over the nominal, and the lowest average a filler can be set to at the
 * spread the packs show. Written as three registry entries with these tests
 * and nothing else: the editor, the validator, the assistant's brief, the
 * screen and the paper took them from the catalogue. Every figure below is
 * worked by hand beside it. */
import { describe, expect, it } from 'vitest';
import { BLOCK_CATALOGUE, PACK_Z, analyse, normalBelow, packRules, tneOf, type FlowEntry } from '../analysis';
import { FLOW_SCHEMA, type FlowDefinition, type FlowField } from '../definition';
import { libraryEntry } from '../library';
import { validateDefinition } from '../validate';
import { fromProposal, toProposal } from '../proposal';

describe('the tolerable negative error, as the Regulations’ table gives it', () => {
  it('a percentage worked out and rounded up to a tenth; a fixed figure in its band', () => {
    /* 9% to 50; 4.5 to 100; 4.5% to 200; 9 to 300; 3% to 500; 15 to 1000; 1.5% to 10,000; 150 to 15,000; 1% to 50,000 */
    expect([40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1234, 2000, 10000, 12000, 20000].map(tneOf))
      .toEqual([3.6, 4.5, 4.5, 4.5, 6.8, 9, 9, 9, 12, 15, 15, 15, 18.6, 30, 150, 150, 200]);
    /* 150 × 4.5% = 6.75 → 6.8; 1,234 × 1.5% = 18.51 → 18.6: rounded UP, never down */
    expect(tneOf(4)).toBeUndefined();
    expect(tneOf(60000)).toBeUndefined();
  });
});

describe('the normal distribution, as the tables give it', () => {
  it('Φ at the points the rules use, and its symmetry', () => {
    expect(normalBelow(0)).toBeCloseTo(0.5, 6);
    expect(normalBelow(1)).toBeCloseTo(0.8413447, 6);
    expect(normalBelow(-PACK_Z.t1)).toBeCloseTo(0.025, 6);           /* 1.96 — 2.5% under */
    expect(Math.abs(normalBelow(-PACK_Z.t2) - 0.0001)).toBeLessThan(1e-9);   /* 3.719 — 1 in 10,000 under */
    for (const z of [0.3, 1.7, 2.9]) expect(normalBelow(z) + normalBelow(-z)).toBeCloseTo(1, 7);
  });
});

const COLS: FlowField[] = [{ key: 'weight', label: 'Weight', type: 'number', unit: 'g' }];
const ents = (xs: number[]): FlowEntry[] => xs.map((w, i) => ({ id: `p${i}`, on: '2026-10-19', at: i, values: { weight: w } }));
const run = (xs: number[], nominal: number) => analyse([
  { key: 'rules', label: 'The three rules', block: 'emark', of: 'weight', target: nominal },
  { key: 'give', label: 'Giveaway a pack', block: 'giveaway', of: 'weight', target: nominal },
  { key: 'fill', label: 'Lowest legal fill', block: 'fill', of: 'weight', target: nominal },
], COLS, ents(xs));

describe('the three rules, worked by hand', () => {
  /* 500 g: TNE 15 g, T1 485 g, T2 470 g. Ten packs averaging 502.5 g; squares about it 190.5 ÷ 9 → spread 4.60 g. */
  const A = [503, 507, 498, 510, 495, 505, 502, 500, 506, 499];
  it('legal on all three: the average over the nominal, and the spread far from T1 and T2', () => {
    const r = packRules(A, 500)!;
    expect([r.tne, r.t1, r.t2, r.mean]).toEqual([15, 485, 470, 502.5]);
    expect(r.sd).toBeCloseTo(Math.sqrt(190.5 / 9), 12);
    /* (485 − 502.5) ÷ 4.60 = −3.80 → about 7 in 100,000 under T1 */
    expect(r.est1).toBeCloseTo(normalBelow(-17.5 / Math.sqrt(190.5 / 9)), 12);
    expect(r.broken).toBe(0);
    const out = run(A, 500);
    expect(out.rules.value).toBe(0);
    expect(out.rules.says).toBe('The three rules: legal on all three rules — average 502.5 g against the nominal 500 g, 0 of 10 under T1 (485 g; under 1 in 10,000 at this spread), 0 under T2 (470 g); the tolerable negative error for 500 g is 15 g; from fewer than 30 packs the spread is an estimate — weigh more to be surer.');
    expect(out.rules.series?.map(p => [p.label, p.value])).toEqual([['under T2', 0], ['T2–T1', 0], ['T1–nominal', 3], ['to +15 g', 7], ['over +15 g', 0]]);
  });
  it('the giveaway: 2.5 g a pack over the nominal', () => {
    const out = run(A, 500);
    expect(out.give.value).toBe(2.5);
    expect(out.give.says).toBe('Giveaway a pack: 2.5 g a pack over the nominal 500 g (0.5%), from 10 packs averaging 502.5 g.');
  });
  it('the lowest legal fill: the nominal itself when the spread is narrow', () => {
    /* max(500, 485 + 1.96 × 4.60 = 494.0, 470 + 3.72 × 4.60 = 487.1) = 500 — rule 1 sets it */
    const out = run(A, 500);
    expect(out.fill.value).toBe(500);
    expect(out.fill.says).toBe('Lowest legal fill: 500 g — set by the nominal itself (rule 1) — the spread is narrow enough that the average sets it. The packs average 502.5 g: 2.5 g a pack above it; from fewer than 30 packs the spread is an estimate — weigh more before setting the filler to it.');
  });

  /* 2 kg: TNE 1.5% = 30 g, T1 1,970 g, T2 1,940 g. Five packs averaging 2,030 g; squares 4,000 ÷ 4 → spread √1000 = 31.62 g. */
  const B = [2010, 2050, 2030, 2070, 1990];
  it('a wide spread breaks rules 2 and 3 with every pack over T1 — the spread says what the next packs will do', () => {
    const r = packRules(B, 2000)!;
    expect([r.tne, r.t1, r.t2, r.mean, r.under1, r.under2]).toEqual([30, 1970, 1940, 2030, 0, 0]);
    /* (1970 − 2030) ÷ 31.62 = −1.897 → 2.89% under T1, over 2.5%; (1940 − 2030) ÷ 31.62 = −2.846 → 0.22% (about 1 in 452) under T2 */
    expect(r.est1).toBeCloseTo(0.02889, 4);
    expect(1 / r.est2).toBeGreaterThan(445);
    expect(1 / r.est2).toBeLessThan(460);
    expect([r.rule1, r.rule2, r.rule3, r.broken]).toEqual([true, false, false, 2]);
    const out = run(B, 2000);
    expect(out.rules.value).toBe(2);
    expect(out.rules.unit).toBe('rules broken');
    expect(out.rules.says).toMatch(/^The three rules: breaks rule 2 \(about 2\.89% would be under T1 at this average and spread — 2\.5% at most\); rule 3 \(about 0\.22% would be under T2 at this spread — none may be\) — average 2030 g against the nominal 2000 g, 0 of 5 under T1 \(1970 g; about 2\.89% at this spread\), 0 under T2 \(1940 g\)/);
  });
  it('the lowest legal fill then set by rule 3: T2 + 3.72 spreads, above where the filler runs', () => {
    /* T1 + 1.96 × 31.62 = 2,031.98; T2 + 3.719 × 31.62 = 2,057.61 — the higher, so rule 3 sets it; the packs average 27.61 g below it */
    const out = run(B, 2000);
    expect(out.fill.value).toBeCloseTo(1940 + PACK_Z.t2 * Math.sqrt(1000), 10);
    expect(out.fill.says).toBe('Lowest legal fill: 2057.6 g — set by T2 1940 g + 3.72 × the spread 31.62 g (rule 3: 1 in 10,000 at most under T2). The packs average 2030 g: 27.61 g a pack BELOW it — raise the fill; from fewer than 30 packs the spread is an estimate — weigh more before setting the filler to it.');
  });
  it('rule 1: an average under the nominal is short, never giveaway', () => {
    /* 498, 499, 497, 500, 496 → 498 g, 2 g under 500 g */
    const out = run([498, 499, 497, 500, 496], 500);
    expect(out.rules.value).toBe(1);
    expect(out.rules.unit).toBe('rule broken');
    expect(out.rules.says).toMatch(/^The three rules: breaks rule 1 \(the average 498 g is under the nominal 500 g\) — /);
    expect(out.give.value).toBe(-2);
    expect(out.give.says).toBe('Giveaway a pack: none — the packs average 2 g SHORT of the nominal 500 g, from 5 packs: rule 1 is broken.');
  });
  it('rule 3: one pack under T2 breaks it, whatever the rest', () => {
    const out = run([505, 506, 504, 505, 468], 500);
    expect(out.rules.says).toMatch(/rule 3 \(1 pack under T2 — none may be\)/);
    expect(out.rules.series?.[0]).toEqual({ label: 'under T2', value: 1 });
  });
  it('rule 2 counted once forty packs make one in forty a count: 2 of 40 under T1 is 5%', () => {
    /* 38 at 505 and 2 at 480: 480 < 485. The spread alone says about 3 in 10,000 under T1 — the count says 5% */
    const xs = [...Array(38).fill(505), 480, 480];
    const r = packRules(xs, 500)!;
    expect([r.under1, r.n, r.rule2, r.broken]).toEqual([2, 40, false, 1]);
    expect(r.est1).toBeLessThan(0.001);
    expect(run(xs, 500).rules.says).toMatch(/breaks rule 2 \(2 of 40 under T1 — 2\.5% at most\)/);
  });
  it('said plainly when it cannot be judged', () => {
    expect(run([501], 500).rules.says).toBe('The three rules: needs at least 2 packs weighed — 1 so far.');
    expect(run([501, 502, 503], 500).fill.says).toBe('Lowest legal fill: needs at least 5 packs weighed to read their spread — 3 so far.');
    expect(run(A, 60000).rules.says).toBe('The three rules: needs the nominal quantity on the pack, from 5 to 50,000 (g or ml) — the law’s table says nothing outside it.');
  });
});

describe('the nominal typed on the floor, in a box of the step', () => {
  const A = [503, 507, 498, 510, 495, 505, 502, 500, 506, 499];
  const box = [{ key: 'rules', label: 'The three rules', block: 'emark' as const, of: 'weight', targetFrom: 'nominal' }];
  it('read from the box; asked for by the box’s name while it is empty', () => {
    expect(analyse(box, COLS, ents(A), { values: { nominal: 500 }, labels: { nominal: 'Nominal on the pack' } }).rules.value).toBe(0);
    expect(analyse(box, COLS, ents(A), { values: {}, labels: { nominal: 'Nominal on the pack' } }).rules.says)
      .toBe('The three rules: needs the nominal quantity on the pack, from 5 to 50,000 (g or ml) — type it in “Nominal on the pack” — the law’s table says nothing outside it.');
  });
  const def = (a: Record<string, unknown>, fields: FlowField[] = [{ key: 'nominal', label: 'Nominal on the pack', type: 'number', unit: 'g' }]): unknown => ({
    schema: FLOW_SCHEMA, name: 'Weights', purpose: 'Legal packs.', kind: 'improvement', roles: [],
    stages: [{ key: 's', name: 'Weigh', steps: [{ key: 'w', title: 'Weigh packs', per: 'line', answer: 'log', columns: COLS, fields, analyses: [{ key: 'r', label: 'The three rules', block: 'emark', of: 'weight', ...a }] }], gate: { conditions: [{ id: 'g', type: 'stepsDone', policy: 'block' }] } }],
  });
  const said = (d: unknown) => validateDefinition(d).errors.map(e => e.message).join(' | ');
  it('the validator wants the nominal — as a number or a number box of the step — and refuses in words', () => {
    expect(validateDefinition(def({ targetFrom: 'nominal' })).errors).toEqual([]);
    expect(validateDefinition(def({ target: 500 })).errors).toEqual([]);
    expect(said(def({}))).toMatch(/The three rules”? needs the nominal quantity printed on the pack \(g or ml\) — give it one, or a number box on the step to type it in\./);
    expect(said(def({ targetFrom: 'nope' }))).toMatch(/reads its target from "nope", which is not a box of the step\./);
    expect(said(def({ targetFrom: 'nominal', target: 500 }))).toMatch(/has a target and reads one from “Nominal on the pack” — one or the other\./);
    expect(said(def({ targetFrom: 'who' }, [{ key: 'who', label: 'Weighed by', type: 'person' }]))).toMatch(/reads its target from “Weighed by”, which is not a number\./);
  });
  it('the assistant names the box by its label; read back to its key', () => {
    const p = toProposal(validateDefinition(def({ targetFrom: 'nominal' })).def as FlowDefinition) as { stages: { steps: { analyses: Record<string, unknown>[] }[] }[] };
    expect(p.stages[0].steps[0].analyses[0]).toMatchObject({ block: 'emark', target: null, target_box: 'Nominal on the pack' });
    const back = validateDefinition(fromProposal({ ...p, assumptions: [], questions: [] }).def);
    expect(back.errors).toEqual([]);
    /* keys are made again from the labels: the analysis points at the box, whatever its key became */
    const step = back.def?.stages[0].steps[0];
    expect(step?.analyses?.[0]).toMatchObject({ block: 'emark', of: 'weight', targetFrom: step?.fields?.find(f => f.label === 'Nominal on the pack')?.key });
  });
  it('the catalogue offers all three, saying what their target is', () => {
    for (const id of ['emark', 'giveaway', 'fill']) expect(BLOCK_CATALOGUE.find(b => b.id === id)).toMatchObject({ target: 'required', targetSays: 'the nominal quantity printed on the pack (g or ml)' });
  });
});

describe('Faultline’s pack-weights method', () => {
  it('runs, and works out what is given away a shift in money from figures the person types', () => {
    const def = libraryEntry('pack-weights')!.build();
    const v = validateDefinition(def);
    expect(v.errors).toEqual([]);
    const step = def.stages[0].steps[0];
    /* the A packs at 500 g, 12,000 packs a shift, £2.40 a kg: 2.5 g × 12,000 × 2.40 ÷ 1,000 = £72.00 a shift given away;
       the lowest legal fill is the nominal, so all of it could be saved */
    const out = analyse(step.analyses, step.columns, ents([503, 507, 498, 510, 495, 505, 502, 500, 506, 499]),
      { values: { nominal: 500, packs_a_shift: 12000, product_cost_a_kg: 2.4 }, labels: Object.fromEntries((step.fields ?? []).map(f => [f.key, f.label])) });
    expect(out.rules_broken.value).toBe(0);
    expect(out.giveaway_a_shift.value).toBeCloseTo(72, 10);
    expect(out.giveaway_a_shift.says).toBe('Giveaway a shift: £72.00 — giveaway a pack × packs a shift × product cost a kg ÷ 1000.');
    expect(out.could_save_a_shift.value).toBeCloseTo(72, 10);
    expect(def.stages[2].gate?.conditions.map(c => c.policy)).toEqual(['block', 'block', 'block']);
    expect(def.stages[0].gate?.conditions[1]).toMatchObject({ type: 'fieldMeets', policy: 'warn', field: 'rules_broken', value: 0 });
  });
});
