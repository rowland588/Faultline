/* W3b — groups, a table, a relation (knowledge/specs/FC-107-groups-tables-relations.md §5, §7, §9). The independent cases are in
 * lib/ie/__tests__/groups.test.ts and relate.test.ts; these check the module turns them into the right words, tones, tiles and refusals. */
import { describe, it, expect } from 'vitest';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';
import { analysisClosing, analysisFigures, analysisPicture, analysisPlot, analysisProblem, analysisSays, analysisTiles, cramersWord, parseRows, predictionSays, type GroupsFigures, type RelateFigures, type TableFigures } from '../analysis';

let n = 0;
const rd = (r: Partial<StudyReading>): StudyReading => ({ id: `r${++n}`, at: n, ...r });
const g = (name: string, vs: number[]) => vs.map(value => rd({ value, arm: name }));
const all = (a: AgreedAnalysis, rs: StudyReading[]) => { const f = analysisFigures(a, rs); const said = analysisSays(f, a); return { f, said, tiles: analysisTiles(f, a), closing: analysisClosing(f, a, said) }; };
const A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2], B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6], C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1];
const shifts = [...g('A', A), ...g('B', B), ...g('C', C)];

describe('do groups differ (FC-107)', () => {
  const a: AgreedAnalysis = { kind: 'groups', name: 'Give-away', unit: 'g', firstName: 'shift' };
  it('a difference found: the F, η², each pair with its interval, and the ones not shown to differ', () => {
    const { said, f, tiles, closing } = all(a, shifts);
    expect(said.verdict).toBe('The shifts differ'); expect(said.tone).toBe('n');
    expect(said.text).toContain('Give-away by shift: we can be 95% confident the shifts differ (F 21.9 on 2 and 21 degrees of freedom, p < 0.0001)');
    expect(said.text).toContain('η² 0.68 — 68% of the variation is between the shifts');
    expect(said.text).toContain('B is above A by 0.59 g (between 0.34 and 0.84 g)'); expect(said.text).toContain('B is above C by 0.55 g (between 0.30 and 0.80 g)');
    expect(said.text).toContain('A and C are not shown to differ'); expect(said.text).not.toMatch(/alike|the same as/);
    expect(said.more.join(' ')).toContain('Kruskal–Wallis, beside: H 15.1, p = 0.0005');
    expect(f.kind === 'groups' && f.leads).toBe('anova'); expect(tiles.map(t => t.k)).toEqual(['Shifts', 'Readings', 'Widest gap', 'p', 'Between the groups']);
    expect(tiles[2].v).toBe('0.59 g'); expect(closing.text).toBe('The shifts differ — Give-away, p < 0.0001, 95% confidence.');
  });
  it('which way is better makes the worst group amber, never red; no view leaves it neutral', () => {
    const lower = all({ ...a, better: 'lower' }, shifts).said; expect(lower.tone).toBe('a'); expect(lower.verdict).toBe('B is the worst'); expect(lower.text).toContain('B is the wrong way for this measure.');
    const higher = all({ ...a, better: 'higher' }, shifts).said; expect(higher.verdict).toBe('A is the worst');
    expect(all({ ...a, better: 'either' }, shifts).said.tone).toBe('n');
  });
  it('confidence changes every interval and the words', () => {
    expect(all({ ...a, confidence: 0.99 }, shifts).said.text).toContain('99% confident'); expect(all({ ...a, confidence: 0.9 }, shifts).said.text).toContain('between 0.37 and 0.80 g');
  });
  it('no difference is said as no difference shown, not as the same', () => {
    const same = [...g('H1', [5.1, 5.3, 4.9, 5.2, 5.0, 5.1]), ...g('H2', [5.0, 5.2, 5.1, 4.8, 5.3, 5.2]), ...g('H3', [5.2, 5.0, 5.1, 5.3, 4.9, 5.1])];
    const { said } = all({ ...a, firstName: 'head' }, same); expect(said.verdict).toBe('No difference shown'); expect(said.text).toContain('cannot tell the heads apart from chance'); expect(said.notClaimed).toContain('not shown to be the same');
  });
  it('spreads that differ make Kruskal–Wallis lead and say Tukey is indicative', () => {
    const wide = [...g('A', [10, 10.1, 9.9, 10.2, 9.8, 10.0]), ...g('B', [10, 14, 6, 16, 4, 10.5, 9.5, 13])];
    const f = analysisFigures(a, wide); expect(f.kind === 'groups' && f.unalike).toBe(true); expect(f.kind === 'groups' && f.leads).toBe('kruskal');
    expect(f.checks.map(c => c.say).join(' ')).toContain('Kruskal–Wallis leads'); expect(analysisSays(f, a).more.join(' ')).toContain('indicative');
  });
  it('too few: a group of two is left out and said; one group is not a comparison; nothing typed is not started', () => {
    expect(all(a, [...g('A', A), ...g('B', [1.6, 1.9])]).said.verdict).toBe('Too few'); expect(all(a, [...g('A', A), ...g('B', [1.6, 1.9])]).f.checks.map(c => c.say).join(' ')).toContain('B has fewer than 3');
    expect(all(a, g('A', A)).said.verdict).toBe('Too few'); expect(all(a, []).said.verdict).toBe('Not started');
  });
  it('a struck reading is left out; the picture is a lane a group with its interval', () => {
    const rs = shifts.map(r => ({ ...r })); rs[0].struck = true; expect((analysisFigures(a, rs) as GroupsFigures).groups[0].values.length).toBe(7);
    const rows = analysisPicture(analysisFigures(a, shifts), a); expect(rows.map(r => r.label)).toEqual(['A · 8', 'B · 8', 'C · 8']); expect(rows[1].band).toBeTruthy(); expect(rows[0].dots?.length).toBe(8);
  });
});

const rows = ['Lane 1', 'Lane 2', 'Lane 3'], cols = ['Underweight', 'Leaker', 'Misprint'];
const cells = (m: number[][], rs: string[], cs: string[]) => m.flatMap((r, i) => r.map((made, j) => rd({ arm: rs[i], col: cs[j], made })));
describe('are two things linked (FC-108)', () => {
  const a: AgreedAnalysis = { kind: 'table', name: 'Rejects', firstName: 'Lane', secondName: 'Fault type', rows, cols };
  it('a link found: χ², V in words, and the cell beyond ±2 named with its count and what chance gives', () => {
    const { said, f, tiles } = all(a, cells([[18, 7, 5], [9, 14, 4], [6, 5, 12]], rows, cols));
    expect(said.verdict).toBe('Linked'); expect(said.text).toContain('Fault type and lane are linked: we can be 95% confident the pattern of fault types is not the same in every lane');
    expect(said.text).toContain('χ² 17.2 on 4 degrees of freedom, p = 0.0017'); expect(said.text).toContain('Cramér’s V 0.33, a medium link');
    expect(said.text).toContain('Lane 3 has more Misprint than chance would give (12 against 6.0)'); expect(said.notClaimed).toContain('A link is not a cause');
    expect(f.kind === 'table' && f.lead).toBe('chi2'); expect(tiles[0].v).toBe('80'); expect(tiles[3].v).toBe('0.33');
  });
  it('counts accumulate and a struck count is left out', () => {
    const rs = [...cells([[18, 7, 5], [9, 14, 4], [6, 5, 12]], rows, cols), rd({ arm: 'Lane 1', col: 'Leaker', made: 2 })]; rs[rs.length - 1].struck = true;
    expect((analysisFigures(a, rs) as TableFigures).total).toBe(80);
    expect((analysisFigures(a, [...rs, rd({ arm: 'Lane 1', col: 'Leaker', made: 3 })]) as TableFigures).total).toBe(83);
  });
  it('a 2 × 2 with Yates and Fisher beside; Fisher leads below 5 expected', () => {
    const two: AgreedAnalysis = { kind: 'table', name: 'Rejects', firstName: 'Shift', secondName: 'Result', rows: ['Days', 'Nights'], cols: ['Rejected', 'Good'] };
    const { said } = all(two, cells([[12, 88], [4, 96]], ['Days', 'Nights'], ['Rejected', 'Good'])); expect(said.more.join(' ')).toContain('Yates’ correction 3.33 (p = 0.068), Fisher’s exact p = 0.065');
    const tiny = all(two, cells([[3, 1], [1, 3]], ['Days', 'Nights'], ['Rejected', 'Good'])); expect(tiny.f.kind === 'table' && tiny.f.lead).toBe('fisher'); expect(tiny.said.text).toContain('Fisher’s exact test');
  });
  it('a table that cannot be trusted is said not to be — amber, with the p only as an approximation', () => {
    const small: AgreedAnalysis = { kind: 'table', name: 'Rejects', firstName: 'Shift', secondName: 'Fault', rows: ['Day', 'Night'], cols: ['a', 'b', 'c'] };
    const { said, tiles } = all(small, cells([[3, 1, 6], [8, 5, 2]], ['Day', 'Night'], ['a', 'b', 'c']));
    expect(said.verdict).toBe('Counts too small'); expect(said.tone).toBe('a'); expect(said.text).toContain('too small for the χ² to be trusted'); expect(said.text).toContain('83% of the cells expect fewer than 5'); expect(tiles[2].tone).toBe('a');
  });
  it('nothing yet, an empty row, names changed under counts', () => {
    expect(all(a, []).said.verdict).toBe('Not started');
    expect(all(a, cells([[18, 7, 5], [9, 14, 4], [0, 0, 0]], rows, cols)).said.text).toContain('Lane 3');
    const f = analysisFigures({ ...a, rows: ['Lane 1', 'Lane 2'] }, cells([[18, 7, 5], [9, 14, 4], [6, 5, 12]], rows, cols)); expect(f.kind === 'table' && f.orphans).toBe(3); expect(f.checks.map(c => c.say).join(' ')).toContain('3 counts typed under a name no longer agreed');
  });
  it('the table is drawn as the module says; V is worded by Cohen’s sizes scaled to the table', () => {
    const p = analysisPlot(analysisFigures(a, cells([[18, 7, 5], [9, 14, 4], [6, 5, 12]], rows, cols)), a); expect(p?.kind).toBe('table');
    expect(p?.kind === 'table' && p.residuals[2][2]).toBeCloseTo(2.43, 2); expect(cramersWord(0.05, 2, 2)).toBe('negligible'); expect(cramersWord(0.15, 2, 2)).toBe('small'); expect(cramersWord(0.35, 2, 2)).toBe('medium'); expect(cramersWord(0.6, 2, 2)).toBe('large');
  });
});

const X = [150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205], Y = [9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1, 15.9, 16.2, 16.8, 17.0];
const pairs = (xs: number[], ys: number[]) => xs.map((x, i) => rd({ xs: [x], value: ys[i] }));
describe('what moves with what (FC-109, FC-110)', () => {
  const a: AgreedAnalysis = { kind: 'relate', name: 'Seal strength', unit: 'N', drivers: [{ name: 'Jaw temperature', unit: '°C' }] };
  it('one driver: the slope in words with its interval, R², and the line that is too straight', () => {
    const { said, f, tiles } = all(a, pairs(X, Y));
    expect(said.text).toContain('Seal strength rises 0.145 N for every extra 1 °C of jaw temperature'); expect(said.text).toContain('we can be 95% confident the true change for each is between 0.128 and 0.162 N');
    expect(said.text).toContain('97% of the variation in seal strength goes with jaw temperature (r 0.99, R² 0.97'); expect(said.text).toContain('too straight for these points: they fall above and below it in 3 stretches where about 7 are expected');
    expect(said.verdict).toBe('Linked, not straight'); expect(said.tone).toBe('a'); expect(said.notClaimed).toContain('A link is not a cause');
    expect(f.checks.map(c => c.say).join(' ')).toContain('the line is too straight'); expect(tiles.map(t => t.k)).toEqual(['Pairs', 'Link', 'Per unit', 'Explained', 'Shape']);
  });
  it('a straight line and a flat one', () => {
    const xs = [10.0, 11.3, 12.6, 13.9, 15.2, 16.5, 17.8, 19.1, 20.4, 21.7, 23.0, 24.3, 25.7, 27.0, 28.3, 29.6, 30.9, 32.2, 33.5, 34.8, 36.1, 37.4, 38.7, 40.0];
    const ys = [7.43, 9.46, 6.16, 10.97, 9.54, 9.29, 9.94, 10.25, 11.93, 13.85, 14.2, 14.92, 12.82, 13.61, 18.01, 17.96, 20.07, 19.55, 17.52, 20.94, 20.8, 20.96, 20.37, 22.0];
    expect(all(a, pairs(xs, ys)).said.verdict).toBe('Linked');
    const flat = all(a, pairs([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [5.1, 4.8, 5.3, 4.9, 5.2, 5.0, 4.7, 5.1, 5.3, 4.9]));
    expect(flat.said.verdict).toBe('No link shown'); expect(flat.said.text).toContain('does not move with jaw temperature that these readings can show');
  });
  it('an outlier is flagged where Pearson and Spearman disagree; fewer than 10 pairs is a hint; fewer than 4 is nothing', () => {
    const o = analysisFigures(a, pairs([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 1, 4, 3, 5, 6, 6, 8, 9, 40])); expect(o.checks.map(c => c.what)).toContain('Outlier');
    const few = analysisFigures(a, pairs(X.slice(0, 6), Y.slice(0, 6))); expect(few.checks.map(c => c.say).join(' ')).toContain('fewer than 10 pairs');
    expect(all(a, pairs(X.slice(0, 3), Y.slice(0, 3))).said.verdict).toBe('Too few'); expect(all(a, []).said.verdict).toBe('Not started');
  });
  it('a prediction inside the range has both intervals; beyond it is a guess with none', () => {
    const f = analysisFigures(a, pairs(X, Y)) as RelateFigures; const inside = predictionSays(f, a, 172)!, beyond = predictionSays(f, a, 230)!;
    expect(inside.inside).toBe(true); expect(inside.text).toContain('the line gives 12.95 N'); expect(inside.text).toContain('between 12.65 and 13.26 N'); expect(inside.text).toContain('between 11.90 and 14.00 N'); expect(inside.text).toContain('rough');
    expect(beyond.inside).toBe(false); expect(beyond.text).toContain('is a guess, so no interval is given'); expect(predictionSays(f, a, 230)?.text).not.toContain('between');
  });
  const SP = [73, 99, 73, 92, 95, 76, 78, 75, 64, 79, 70, 70, 67, 68, 93, 77, 70, 84, 84, 86, 96, 66, 75, 71, 61, 67, 76, 76, 85, 78];
  const TP = [10.1, 6.2, 5.3, 7.3, 5.0, 7.7, 8.6, 11.2, 12.7, 4.5, 13.6, 11.2, 13.9, 5.2, 7.8, 9.0, 11.5, 7.1, 8.5, 6.8, 8.5, 9.1, 9.7, 11.0, 6.4, 10.3, 4.9, 10.1, 8.6, 5.3];
  const GA = [2.78, 2.79, 2.66, 2.84, 3.24, 2.55, 2.66, 2.79, 2.95, 2.49, 3.33, 2.66, 3.02, 2.76, 2.92, 2.89, 3.21, 2.89, 2.7, 2.25, 3.7, 2.66, 3.09, 2.68, 2.69, 2.79, 2.42, 2.6, 2.98, 2.36];
  const two: AgreedAnalysis = { kind: 'relate', name: 'Give-away', unit: 'g', drivers: [{ name: 'Filler speed', unit: 'per min' }, { name: 'Product temperature', unit: '°C' }] };
  const multi = (xs: number[][], ys: number[]) => ys.map((value, i) => rd({ xs: xs.map(c => c[i]), value }));
  it('two drivers: each per unit with the others held, R² and F, the VIF said fine', () => {
    const { said, tiles, f } = all(two, multi([SP, TP], GA));
    expect(said.verdict).toBe('Drivers found'); expect(said.text).toContain('F 6.80, p = 0.0041; R² 0.33'); expect(said.text).toContain('Filler speed +0.014 g (0.00329 to 0.0247, p = 0.012)'); expect(said.text).toContain('Product temperature +0.0685 g');
    expect(said.more[0]).toContain('explain 33% of the variation in give-away (adjusted 29%)'); expect(f.checks.map(c => c.say).join(' ')).toContain('variance inflation Filler speed 1.2, Product temperature 1.2 — below 10');
    expect(tiles.map(t => t.k)).toEqual(['Rows', 'Explained', 'p', 'Strongest', 'Worst VIF']); expect(tiles[3].v).toBe('Product temperature');
  });
  it('drivers that move together are warned of; exact collinearity and too few rows are refused', () => {
    const t2 = [7.29, 9.82, 7.28, 9.21, 9.44, 7.6, 7.83, 7.48, 6.37, 7.87, 7.05, 6.92, 6.68, 6.78, 9.31, 7.7, 6.94, 8.5, 8.41, 8.53, 9.56, 6.6, 7.53, 7.03, 6.14, 6.63, 7.56, 7.64, 8.59, 7.8];
    const g2 = [1.8, 2.63, 1.65, 2.3, 2.35, 2.12, 2.02, 1.85, 1.8, 1.75, 1.96, 1.67, 1.56, 1.69, 2.27, 2.08, 1.76, 2.23, 2.28, 2.1, 2.12, 1.9, 1.96, 1.4, 1.42, 1.77, 1.65, 1.78, 1.76, 2.04];
    const w = all(two, multi([SP, t2], g2));
    expect(w.said.tone).toBe('a'); expect(w.said.verdict).toBe('Drivers move together'); expect(w.f.checks.map(c => c.say).join(' ')).toContain('Filler speed 459.8, Product temperature 459.8 — above 10'); expect(w.said.text).toContain('cannot be read apart');
    expect(all(two, multi([SP, SP.map(v => v * 2)], GA)).said.text).toContain('move exactly together'); expect(all(two, multi([SP.slice(0, 12), TP.slice(0, 12)], GA.slice(0, 12))).said.text).toContain('at least 15 are needed for 2 drivers');
    expect(all(two, multi([SP, SP.map(() => 5)], GA)).said.text).toContain('is the same in every row');
  });
  it('the plot: a scatter with a band for one driver, the fit against what was read for several', () => {
    const p1 = analysisPlot(analysisFigures(a, pairs(X, Y)), a)!, p2 = analysisPlot(analysisFigures(two, multi([SP, TP], GA)), two)!;
    expect(p1.kind === 'scatter' && p1.band?.length).toBe(25); expect(p1.kind === 'scatter' && p1.pts.length).toBe(12); expect(p2.kind === 'scatter' && p2.equal).toBe(true); expect(p2.kind === 'scatter' && p2.xName).toBe('Fitted');
  });
});

describe('agreeing the three kinds, and pasted rows', () => {
  it('a table needs two to eight distinct rows and columns; a relation one to five distinct drivers', () => {
    expect(analysisProblem({ kind: 'table', name: 'Rejects', rows: ['a'], cols: ['x', 'y'] })).toContain('The rows'); expect(analysisProblem({ kind: 'table', name: 'Rejects', rows: ['a', 'b'], cols: ['x'] })).toContain('The columns');
    expect(analysisProblem({ kind: 'table', name: 'Rejects', rows: ['a', 'A'], cols: ['x', 'y'] })).toContain('same name'); expect(analysisProblem({ kind: 'table', name: 'Rejects', rows: ['a', 'b'], cols: ['x', 'y'] })).toBe('');
    expect(analysisProblem({ kind: 'relate', name: 'Strength', drivers: [] })).toContain('The drivers'); expect(analysisProblem({ kind: 'relate', name: 'Strength', drivers: [{ name: 'T' }, { name: 't' }] })).toContain('same name');
    expect(analysisProblem({ kind: 'relate', name: 'Strength', drivers: [{ name: 'Temperature', unit: '°C' }] })).toBe(''); expect(analysisProblem({ kind: 'groups', name: 'Give-away' })).toBe('');
  });
  it('rows pasted: exactly that many numbers to a line, the rest listed', () => {
    const p = parseRows('1 2 3\n4,5,6\nx 7 8\n9 10\n', 3); expect(p.rows).toEqual([[1, 2, 3], [4, 5, 6]]); expect(p.skipped).toEqual(['x 7 8', '9 10']);
  });
});
