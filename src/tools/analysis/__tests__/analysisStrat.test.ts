/* FC-153 stratification — every figure below was printed by SciPy/NumPy (scripts/knowledge/cases-m6-analysis.py), not by this code. */
import { describe, expect, it } from 'vitest';
import { analysisClosing, analysisFigures, analysisGrids, analysisPicture, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import { parseStrat, stratFigures, stratRecordWord, stratRecords, type StratFigures } from '../strat';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';

let n = 0;
const rec = (tags: Record<string, string>, extra: Partial<StudyReading>): StudyReading => ({ id: `r${n++}`, at: n, tags, ...extra });
const counted = (factors: string[], extra: Partial<NonNullable<AgreedAnalysis['strat']>> = {}): AgreedAnalysis => ({ kind: 'strat', name: 'Rejects', confidence: 0.95, strat: { factors, data: 'counted', ...extra } });
const measured = (factors: string[]): AgreedAnalysis => ({ kind: 'strat', name: 'Give-away', unit: 'g', confidence: 0.95, strat: { factors, data: 'measured' } });

/* the record's worked case: rejects by shift and product */
const SHIFT_PRODUCT: StudyReading[] = [
  rec({ Shift: 'Day', Product: 'A' }, { made: 24000, rejected: 120 }), rec({ Shift: 'Day', Product: 'B' }, { made: 16000, rejected: 80 }),
  rec({ Shift: 'Night', Product: 'A' }, { made: 24000, rejected: 230 }), rec({ Shift: 'Night', Product: 'B' }, { made: 16000, rejected: 90 }),
];
const near = (v: number | undefined, want: number, tol = 1e-3): void => { expect(v).toBeDefined(); expect(Math.abs((v as number) - want)).toBeLessThan(tol); };
const fig = (a: AgreedAnalysis, rs: StudyReading[]): StratFigures => analysisFigures(a, rs) as StratFigures;

describe('Stratification — a counted split (rejects out of made)', () => {
  const a = counted(['Shift', 'Product']), f = fig(a, SHIFT_PRODUCT);
  const shift = f.splits[0], product = f.splits[1];

  it('splits by each factor: the counts, the rates and the shares', () => {
    expect(f.records).toBe(4); expect(f.made).toBe(80000); expect(f.rejected).toBe(520);
    expect(shift.counted?.map(l => [l.name, l.made, l.rejected])).toEqual([['Day', 40000, 200], ['Night', 40000, 320]]);
    near(shift.counted?.[1].rate, 0.008, 1e-9); near(shift.counted?.[1].shareRejects, 320 / 520, 1e-9); near(shift.counted?.[1].shareMade, 0.5, 1e-9);
  });
  it('tests each split — χ², p and Cramér’s V as SciPy prints them', () => {
    near(shift.table?.chi2, 27.8735, 1e-3); near(shift.p, 1.29512e-7, 1e-9); near(shift.strength, 0.01867, 1e-4);
    near(product.table?.chi2, 11.6462, 1e-3); near(product.p, 0.000643334, 1e-7); near(product.strength, 0.01207, 1e-4);
    near(shift.counted?.[1].residual, 3.721, 1e-3); near(shift.counted?.[0].residual, -3.721, 1e-3);
    near(product.counted?.[0].residual, 2.1513, 1e-3); near(product.counted?.[1].residual, -2.6348, 1e-3);
    expect(shift.lead).toBe('chi2');
  });
  it('divides the level by the splits tried (Bonferroni) before a factor passes', () => {
    expect(f.tried).toBe(2); near(f.alphaFactor, 0.025, 1e-12);
    expect(shift.passes).toBe(true); expect(product.passes).toBe(true);
    const tight = fig(counted(['Shift', 'Product', 'Line', 'Machine']), SHIFT_PRODUCT); near(tight.alphaFactor, 0.0125, 1e-12);
  });
  it('names the place: Night carries 62% of the rejects from half of what was made', () => {
    expect(shift.counted?.map(l => l.standsOut)).toEqual([false, true]);
    expect(f.lead?.factor).toBe('Shift'); // the stronger of the two
    const s = analysisSays(f, a);
    expect(s.verdict).toBe('Lives in Night'); expect(s.tone).toBe('a');
    expect(s.text).toMatch(/Rejects by shift: we can be 95% confident the problem is not spread evenly/);
    expect(s.text).toMatch(/Night carries 62% of the rejects from 50% of what was made: 0\.80% \(320 of 40,000\) against 0\.50% for the rest/);
  });
  it('looks at the two strongest together and finds the cell — Night on Product A, not nights in general', () => {
    const c = f.cross; expect(c).toBeDefined();
    expect(c?.tried).toBe(4); near(c?.alphaCell, 0.05 / 6, 1e-12);
    const cell = (x: string, y: string) => c?.cells.find(z => z.a === x && z.b === y);
    near(cell('Night', 'A')?.rate, 0.009583, 1e-5); near(cell('Night', 'A')?.restRate, 0.005179, 1e-5);
    near(cell('Night', 'A')?.excess, 105.714, 1e-2); near(cell('Night', 'A')?.p, 6.46987e-12, 1e-10); // Fisher leads? expected counts are large: the z test leads
    expect(cell('Night', 'A')?.flag).toBe('more');
    expect(cell('Night', 'B')?.flag).toBe(''); expect(cell('Day', 'A')?.flag).toBe('fewer');
    expect(analysisSays(f, a).more.join(' ')).toMatch(/Together: Night on A stands out — 0\.96% \(230 of 24,000\) against 0\.52% for everything else/);
  });
  it('says the excess in money only when what a reject costs is given, and names the missing input otherwise', () => {
    expect(analysisSays(f, a).more.join(' ')).toMatch(/Give what one reject costs/);
    const g = fig(counted(['Shift', 'Product'], { costEach: 0.6 }), SHIFT_PRODUCT);
    near(g.money?.excess, 320 - 40000 * (200 / 40000), 1e-9); // had Night run at Day’s rate: 120 fewer
    expect(g.money?.gbp).toBeCloseTo(72, 6);
    expect(analysisSays(g, counted(['Shift', 'Product'], { costEach: 0.6 })).more.join(' ')).toMatch(/about 120 fewer rejects in these records — about £72 at £0\.60 each/);
  });
  it('has tiles, a picture lane a place, grids and a closing line from the same figures', () => {
    const tiles = analysisTiles(f, a); expect(tiles.map(t => t.k)).toEqual(['Records', 'Made', 'Splits', 'Stands out', 'Strongest']);
    expect(tiles[3].v).toBe('Night · A'); expect(tiles[4].v).toBe('Shift');
    expect(analysisPicture(f, a).map(r => r.label)).toEqual(['Day · 200/40,000', 'Night · 320/40,000']);
    expect(analysisGrids(f, a).map(g => g.label)).toEqual(['Every split tried', 'By shift', 'By product', 'Together — Shift × Product']);
    expect(analysisClosing(f, a, analysisSays(f, a)).text).toBe('Lives in Night — Rejects, 95% confidence.');
  });
});

describe('Stratification — three lines, and the minimum-count rule', () => {
  const LINES: StudyReading[] = [rec({ Line: 'L1' }, { made: 1500, rejected: 12 }), rec({ Line: 'L2' }, { made: 1400, rejected: 9 }), rec({ Line: 'L3' }, { made: 1600, rejected: 31 })];
  it('L3 stands out: χ² 13.4471 on 2 df, p 0.00120225, V 0.05466, residual 2.9096; exact intervals', () => {
    const f = fig(counted(['Line']), LINES), sp = f.splits[0];
    near(sp.table?.chi2, 13.4471, 1e-3); near(sp.p, 0.00120225, 1e-7); near(sp.strength, 0.05466, 1e-4);
    near(sp.counted?.[2].residual, 2.9096, 1e-3); near(sp.counted?.[0].residual, -1.281, 1e-3);
    near(sp.counted?.[0].exact.lo, 0.004140, 1e-5); near(sp.counted?.[2].exact.hi, 0.027389, 1e-5);
    expect(sp.counted?.map(l => l.standsOut)).toEqual([false, false, true]);
    expect(f.cross).toBeUndefined();
  });
  it('a split whose counts are too small to trust is said so, and no place is named from it', () => {
    const f = fig(counted(['Line']), [rec({ Line: 'L1' }, { made: 900, rejected: 3 }), rec({ Line: 'L2' }, { made: 800, rejected: 2 }), rec({ Line: 'L3' }, { made: 700, rejected: 9 })]);
    const sp = f.splits[0];
    near(sp.p, 0.0145706, 1e-6); expect(sp.lead).toBe('approx'); expect(sp.passes).toBe(false);
    expect(f.checks.map(c => c.say).join(' ')).toMatch(/counts too small — 33% of the cells expect fewer than 5/i);
    expect(sp.counted?.some(l => l.standsOut)).toBe(false);
    expect(analysisSays(f, counted(['Line'])).verdict).toBe('Not in one place');
  });
  it('a place with fewer than 5 rejected is never named, however its rate looks', () => {
    const f = fig(counted(['Line']), [rec({ Line: 'L1' }, { made: 5000, rejected: 100 }), rec({ Line: 'L2' }, { made: 5000, rejected: 105 }), rec({ Line: 'L3' }, { made: 40, rejected: 4 })]);
    expect(f.splits[0].counted?.[2].standsOut).toBe(false);
  });
  it('nothing rejected: no problem to place; one level: not a split', () => {
    const none = fig(counted(['Line']), [rec({ Line: 'L1' }, { made: 100, rejected: 0 }), rec({ Line: 'L2' }, { made: 100, rejected: 0 })]);
    expect(none.enough).toBe(false); expect(analysisSays(none, counted(['Line'])).text).toMatch(/none rejected/);
    const one = fig(counted(['Line']), [rec({ Line: 'L1' }, { made: 100, rejected: 3 })]);
    expect(analysisSays(one, counted(['Line'])).text).toMatch(/every factor has one level/);
  });
  it('records with no tag for a factor, or rejected over made, are left out and said', () => {
    const f = fig(counted(['Line']), [...LINES, rec({ Machine: 'M1' }, { made: 10, rejected: 1 }), rec({ Line: 'L1' }, { made: 10, rejected: 11 }), { id: 'x', at: 1, made: 5, rejected: 1 }]);
    expect(f.unusable).toBe(2); expect(f.splits[0].untagged).toBe(1);
    const said = f.checks.map(c => c.say).join(' ');
    expect(said).toMatch(/2 readings could not be used/); expect(said).toMatch(/1 record carry no line/);
    expect(stratRecords(counted(['Line']), [{ ...LINES[0], struck: true }]).recs).toHaveLength(0); // struck: left out
  });
  it('two factors that run together are said to — what shows for one may be the other’s', () => {
    const together = [rec({ Shift: 'Day', Line: 'L1' }, { made: 30000, rejected: 150 }), rec({ Shift: 'Day', Line: 'L2' }, { made: 10000, rejected: 50 }), rec({ Shift: 'Night', Line: 'L1' }, { made: 5000, rejected: 40 }), rec({ Shift: 'Night', Line: 'L2' }, { made: 35000, rejected: 300 })];
    const f = fig(counted(['Shift', 'Line']), together);
    expect(f.together).toHaveLength(1); near(f.together[0].v, 0.62994, 1e-4);
    expect(f.checks.map(c => c.say).join(' ')).toMatch(/Shift and Line run together in these records \(Cramér’s V 0\.63\)/);
  });
});

describe('Stratification — a measured split', () => {
  const A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2], B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6], C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1];
  const rs = [...A.map(v => rec({ Shift: 'A' }, { value: v })), ...B.map(v => rec({ Shift: 'B' }, { value: v })), ...C.map(v => rec({ Shift: 'C' }, { value: v }))];
  const a = measured(['Shift']), f = fig(a, rs), sp = f.splits[0];
  it('F 21.9291, p 7.20559e-6, η² 0.67622 (SciPy); B is the shift that stands out', () => {
    near(sp.groups?.f, 21.9291, 1e-3); near(sp.p, 7.20559e-6, 1e-9); near(sp.strength, 0.67622, 1e-4);
    expect(sp.leads).toBe('anova');
    expect(sp.measured?.map(l => [l.name, l.flag, l.standsOut])).toEqual([['A', '', false], ['B', 'higher', true], ['C', '', false]]);
    near(sp.groups?.pairs[0].p, 0.000021, 5e-6); near(sp.groups?.pairs[1].p, 0.924719, 1e-4);
  });
  it('says it in words', () => {
    const s = analysisSays(f, a);
    expect(s.verdict).toBe('B stands out'); expect(s.tone).toBe('a');
    expect(s.text).toMatch(/Give-away by shift: we can be 95% confident the shifts differ \(F 21\.9 on 2 and 21 degrees of freedom, p < 0\.0001; η² 0\.68/);
    expect(s.text).toMatch(/B is above every other: mean 1\.70 g against 1\.13 g for the rest/);
    expect(analysisPicture(f, a)).toHaveLength(3);
  });
  it('a level with fewer than 3 readings is left out of the test and said', () => {
    const g = fig(a, [...rs, rec({ Shift: 'D' }, { value: 1.0 }), rec({ Shift: 'D' }, { value: 1.1 })]);
    expect(g.splits[0].measured?.find(l => l.name === 'D')?.flag).toBe('few');
    expect(g.checks.map(c => c.say).join(' ')).toMatch(/D \(2\) has fewer than 3 readings/);
    near(g.splits[0].groups?.f, 21.9291, 1e-3);
  });
});

describe('Stratification — agreeing, reading a pasted sheet', () => {
  it('refuses until it is named, with one to four factors, no repeats', () => {
    expect(analysisProblem({ kind: 'strat', name: '', strat: { factors: ['Shift'], data: 'counted' } })).toMatch(/What is measured/);
    expect(analysisProblem({ kind: 'strat', name: 'Rejects', strat: { factors: [], data: 'counted' } })).toMatch(/one to 4 names/);
    expect(analysisProblem({ kind: 'strat', name: 'Rejects', strat: { factors: ['A', 'B', 'C', 'D', 'E'], data: 'counted' } })).toMatch(/one to 4 names/);
    expect(analysisProblem({ kind: 'strat', name: 'Rejects', strat: { factors: ['Shift', 'shift'], data: 'counted' } })).toMatch(/same name/);
    expect(analysisProblem(counted(['Shift']))).toBe('');
  });
  it('reads rows from a sheet — tabs or commas, a level may hold spaces — and lists what it could not use', () => {
    const p = parseStrat('Days\tProduct A\t24,000\t120\nNights, Product A, 24000, 230\nNights;Product B;16000;99999\nNights, Product B\n\nDays, Product B, 16000, x', ['Shift', 'Product'], 'counted');
    expect(p.rows).toEqual([{ tags: { Shift: 'Days', Product: 'Product A' }, made: 24000, rejected: 120 }, { tags: { Shift: 'Nights', Product: 'Product A' }, made: 24000, rejected: 230 }]);
    expect(p.skipped).toEqual(['Nights;Product B;16000;99999', 'Nights, Product B', 'Days, Product B, 16000, x']);
    expect(parseStrat('Head 1, 202.4\nHead 2, 202.9\nHead 3', ['Head'], 'measured').rows).toEqual([{ tags: { Head: 'Head 1' }, value: 202.4 }, { tags: { Head: 'Head 2' }, value: 202.9 }]);
  });
  it('words a record for the list of readings', () => {
    expect(stratRecordWord(counted(['Shift', 'Product']), SHIFT_PRODUCT[2])).toBe('Shift Night · Product A: 230 of 24000');
    expect(stratRecordWord(measured(['Shift']), rec({ Shift: 'B' }, { value: 1.6 }))).toBe('Shift B: 1.6 g');
  });
  it('an empty record says what to do, a half-made agreement says what is missing', () => {
    const f = fig(counted(['Shift']), []);
    expect(analysisSays(f, counted(['Shift'])).text).toMatch(/Nothing counted yet/);
    expect(stratFigures({ kind: 'strat', name: 'X' }, [], { conf: 0.95, alpha: 0.05, dp: 0, unit: '', checks: [] }).splits).toEqual([]);
  });
});
