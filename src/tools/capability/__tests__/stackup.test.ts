/* FC-116 — several deposits in one pack: the root sum of squares, the target the rules need at that spread, which deposit holds the spread and what halving
 * it buys. The independent figures are NumPy's/SciPy's (scripts/knowledge/cases-w3c.py, the record's ready meal). */
import { describe, it, expect } from 'vitest';
import { depositsProblem, depositsText, parseDeposits, stackFigures, stackSays } from '../modes';
import { modeNotes, packersTne, sample } from '../sample';
import type { AgreedReadings, StudyReading } from '../../../lib/study';

const MEAL = [{ name: 'Rice', mean: 120, sd: 3.0 }, { name: 'Sauce', mean: 80, sd: 2.5 }, { name: 'Vegetables', mean: 60, sd: 2.0 }, { name: 'Garnish', mean: 40, sd: 1.5 }];
const SOLD: AgreedReadings = { kind: 'packers', unit: 'g', nominal: 300, count: 30, deposits: MEAL };
const SAY = { packs: 'give the packs a shift to say it in money', kg: 'give £ a kg to say it in money' };

describe('the root sum of squares', () => {
  const f = stackFigures(SOLD, packersTne(SOLD))!;
  it('mean 300, spread 4.6368 (the worst case of 27 g never happens; the RSS 3σ is 13.9)', () => {
    expect(f.mean).toBe(300); expect(f.sd).toBeCloseTo(4.636809247747852, 12); expect(f.worst).toBe(27);
  });
  it('the rice holds 41.9% of the spread, then the sauce 29.1%, the vegetables 18.6%, the garnish 10.5%', () => {
    expect(f.deposits.map(d => +(d.share * 100).toFixed(1))).toEqual([41.9, 29.1, 18.6, 10.5]); expect(f.biggest.name).toBe('Rice');
  });
  it('the three rules at that spread: the 1-in-40 rule binds at 300.088 g (TNE 9 g); halved, the average rule binds at 300', () => {
    expect(f.basis).toBe('rules'); expect(f.lowest).toBeCloseTo(300.08797912876804, 6);   // normalQuantile agrees with SciPy to about 1e-7 expect(f.binds).toBe(2);
    expect(f.halvedSd).toBeCloseTo(3.840572873934304, 12); expect(f.halvedLowest).toBe(300); expect(f.saves).toBeCloseTo(0.08797912876804, 6);
    expect(f.gap).toBeCloseTo(-0.08797912876804, 6);
  });
  it('the sentence: short of the lowest target, so amber', () => {
    const s = stackSays(f, 1, 'g', SAY);
    expect(s.tone).toBe('a');
    expect(s.text).toBe('4 deposits make 300.0 g: the pack’s spread is 4.64 g — the deposits’ spreads add as squares, not as a sum (the worst case, every deposit at its 3σ at once, 27.0 g, almost never happens). At that spread the lowest target that keeps the three rules is 300.1 g (the 1-in-40 rule binds); the deposits average 300.0 g, 0.1 g short of it — raise a deposit or tighten them. Rice holds 42% of the spread; halving its spread brings the pack’s to 3.84 g and the target to 300.0 g — 0.1 g a pack saved — give the packs a shift to say it in money.');
  });
});

describe('a floor kept to 1 in 1,000 (the record’s own example)', () => {
  const f = stackFigures({ kind: 'limits', unit: 'g', lower: 290, count: 30, deposits: MEAL }, undefined)!;
  it('290 + 3.0902 × 4.6368 = 304.33; halving the rice: 301.88 — 2.45 g a pack', () => {
    expect(f.basis).toBe('floor'); expect(f.lowest).toBeCloseTo(304.32881773492807, 6); expect(f.halvedLowest).toBeCloseTo(290 + 3.090232306167813 * 3.840572873934304, 6); expect(f.saves).toBeCloseTo(2.460555365704522, 6);
  });
  it('money: packs a shift and £ a kilo say the saving in kilos and pounds a shift and a week, with the because', () => {
    const g = stackFigures({ kind: 'limits', unit: 'g', lower: 290, count: 30, deposits: MEAL, packsPerShift: 5000, shiftsPerWeek: 10, costPerKg: 18 }, undefined)!;
    expect(g.kgShift).toBeCloseTo(12.30277682852261, 5); expect(g.gbpShift).toBeCloseTo(221.44998291340698, 4); expect(g.gbpWeek).toBeCloseTo(2214.49982913407, 3);
    expect(stackSays(g, 1, 'g', SAY).text).toMatch(/2\.5 g a pack saved — about 12 kg and £221 a shift, £2,214 a week because of the give-away\.$/);
  });
  it('a pack of sold-by-weight money: 0.088 g × 5,000 packs × £18 a kilo = £7.92 a shift (NumPy)', () => {
    const g = stackFigures({ ...SOLD, packsPerShift: 5000, costPerKg: 18 }, packersTne(SOLD))!;
    expect(g.gbpShift).toBeCloseTo(7.918121589123643, 3);
    expect(stackSays(g, 1, 'g', SAY).text).toContain('0.1 g a pack saved — about 0.4 kg and £7.92 a shift because of the give-away.');
  });
  it('£ a kilo missing: named', () => {
    expect(stackSays(stackFigures({ ...SOLD, packsPerShift: 5000 }, packersTne(SOLD))!, 1, 'g', SAY).text).toContain('saved — give £ a kg to say it in money.');
  });
});

describe('the average rule binds: a tighter spread buys nothing, and the page says so', () => {
  const calm = { ...SOLD, deposits: [{ name: 'A', mean: 150, sd: 0.8 }, { name: 'B', mean: 150, sd: 0.6 }] };
  it('lowest target = the nominal; halving the biggest lowers nothing', () => {
    const f = stackFigures(calm, packersTne(calm))!;
    expect(f.binds).toBe(1); expect(f.lowest).toBe(300); expect(f.saves).toBe(0); expect(f.gap).toBe(0);
    expect(stackSays(f, 1, 'g', SAY).text).toMatch(/lowers the target by nothing — the average rule binds, so a tighter spread does not lower the legal target\.$/);
    expect(stackSays(f, 1, 'g', SAY).tone).toBe('n');
  });
});

describe('beside the pack’s own readings', () => {
  const rs = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i}`, value, at: i }));
  const wide = Array.from({ length: 30 }, (_, i) => 300 + 12 * Math.sin(i * 2.1));
  it('from 25 readings the pack’s own spread is said beside the deposits’, and has the last word', () => {
    const n = modeNotes(sample(SOLD, rs(wide)), SOLD).find(x => x.k === 'stack')!;
    expect(n.text).toMatch(/The 30 pack readings spread \d+\.\d+ g, wider than the deposits give — they may move together, or something else adds; the pack’s own spread is the final word\.$/);
  });
  it('before the readings the note is there already — it needs only the deposits', () => {
    const n = modeNotes(sample(SOLD, []), SOLD).find(x => x.k === 'stack');
    expect(n).toBeDefined(); expect(n!.text).not.toContain('pack readings');
  });
  it('a study without deposits, with one, or a counted mode: no note', () => {
    expect(modeNotes(sample({ ...SOLD, deposits: undefined }, rs(wide)), { ...SOLD, deposits: undefined }).some(x => x.k === 'stack')).toBe(false);
    expect(stackFigures({ ...SOLD, deposits: [MEAL[0]] }, 9)).toBeUndefined();
    expect(stackFigures({ kind: 'limits', unit: 'g', upper: 310, count: 30, deposits: MEAL }, undefined)).toBeUndefined();
  });
});

describe('the deposits as typed', () => {
  it('a line each: name, mean, spread; what is not a deposit is listed', () => {
    expect(parseDeposits('Rice, 120, 3.0\nSauce; 80; 2.5\n\n').deposits).toEqual([{ name: 'Rice', mean: 120, sd: 3 }, { name: 'Sauce', mean: 80, sd: 2.5 }]);
    expect(parseDeposits('Rice, 120\nSauce, x, 2').bad).toEqual(['Rice, 120', 'Sauce, x, 2']);
    expect(depositsText(MEAL)).toBe('Rice, 120, 3\nSauce, 80, 2.5\nVegetables, 60, 2\nGarnish, 40, 1.5');
  });
  it('refused in words', () => {
    expect(depositsProblem('')).toBe('');
    expect(depositsProblem('Rice, 120')).toMatch(/A deposit is a line — its name, its mean and its spread/);
    expect(depositsProblem('Rice, 120, 3')).toBe('Two deposits at least — a pack of one is the study itself.');
    expect(depositsProblem('Rice, 120, 3\nrice, 80, 2')).toBe('Two deposits have the same name.');
    expect(depositsProblem('Rice, 120, 0\nSauce, 80, 2')).toMatch(/both numbers above 0/);
    expect(depositsProblem('Rice, 120, 3\nSauce, 80, 2')).toBe('');
  });
});
