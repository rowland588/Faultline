/* The analysis's figures and sentences (knowledge/specs/FC-105-analysis.md §6–§7, §9) — the independent cases are in
 * lib/ie/__tests__/stats.test.ts; these check the module turns them into the right words, tones and refusals. */
import { describe, it, expect } from 'vitest';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';
import { analysisClosing, analysisFigures, analysisPicture, analysisProblem, analysisSays, analysisTiles, fmtP, parsePasted, planProblem } from '../analysis';

const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const B = [12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7];
const A = [12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5];
let n = 0;
const rd = (r: Partial<StudyReading>): StudyReading => ({ id: `r${++n}`, at: n, ...r });
const vals = (vs: number[], arm?: string): StudyReading[] => vs.map(value => rd({ value, ...(arm ? { arm } : {}) }));
const run = (made: number, rejected: number, arm?: string): StudyReading => rd({ made, rejected, ...(arm ? { arm } : {}) });
const agree = (a: Partial<AgreedAnalysis> & Pick<AgreedAnalysis, 'kind'>): AgreedAnalysis => ({ name: 'Fill weight', ...a });
const all = (a: AgreedAnalysis, rs: StudyReading[]) => { const f = analysisFigures(a, rs); const said = analysisSays(f, a); return { f, said, tiles: analysisTiles(f, a), closing: analysisClosing(f, a, said) }; };

describe('how sure — a mean (FC-104, FC-103)', () => {
  const a = agree({ kind: 'sure', unit: 'g' });
  it('says the mean, its interval and the spread in words', () => {
    const { said, f } = all(a, vals(THIRTY));
    expect(said.text).toBe('30 readings, mean 401.20 g — we can be 95% confident the true mean is between 400.97 and 401.42 g (± 0.22 g).');
    expect(said.verdict).toBe('Sure to ± 0.22 g'); expect(said.tone).toBe('n');
    expect(said.more[0]).toContain('between 0.48 and 0.80 g'); expect(said.more[1]).toContain('Middle half 400.80–401.60 g, median 401.20 g, lean 0.14');
    expect(f.kind === 'sure' && f.d?.n).toBe(30);
  });
  it('confidence changes the interval and the words', () => {
    const t99 = all({ ...a, confidence: 0.99 }, vals(THIRTY)).said.text, t90 = all({ ...a, confidence: 0.9 }, vals(THIRTY)).said.text;
    expect(t99).toContain('99% confident'); expect(t99).toContain('between 400.90 and 401.50'); expect(t90).toContain('between 401.01 and 401.38');
  });
  it('too few readings: the count, no interval', () => {
    const { said, tiles } = all(a, vals(THIRTY.slice(0, 5)));
    expect(said.verdict).toBe('Too few'); expect(said.text).toContain('needs at least 8'); expect(tiles[2].v).toBe('—');
  });
  it('struck readings are left out; nothing typed says not started', () => {
    const rs = vals(THIRTY); rs[1].struck = true;
    expect(all(a, rs).said.text).toContain('29 readings'); expect(all(a, []).said.verdict).toBe('Not started');
  });
  it('a wild reading is flagged, never removed; dependence is said with the spacing', () => {
    const f = analysisFigures(a, vals([...THIRTY, 410])), checks = f.checks.map(c => c.say).join(' ');
    expect(checks).toContain('1 reading beyond the fences'); expect(checks).toContain('410 at reading 31'); expect(f.kind === 'sure' && f.n).toBe(31);
    const AR = [399.6, 399.1, 399.33, 399.81, 400.45, 400.33, 399.92, 399.56, 400.11, 400.88, 400.67, 399.78, 399.39, 400.43, 400.36, 399.35, 399.57, 399.16, 399.18, 399.26,
      399.2, 399.8, 399.85, 399.61, 399.97, 400.4, 399.42, 399.52, 399.22, 399.45, 399.02, 399.42, 399.64, 399.63, 399.25, 399.35, 399.07, 398.76, 399.37, 399.07];
    const o = all(a, vals(AR));
    expect(o.f.checks.map(c => c.say).join(' ')).toContain('sample every 2nd'); expect(o.tiles[4].v).toBe('Linked'); expect(o.tiles[4].tone).toBe('a');
  });
});
describe('how sure — a share and a rate', () => {
  it('7 of 600', () => {
    const { said, tiles } = all(agree({ kind: 'sure', of: 'share', name: 'Reject rate' }), [run(300, 3), run(300, 4)]);
    expect(said.text).toBe('7 of 600 — 1.2% reject rate: we can be 95% confident the true figure is between 0.47% and 2.4%.');
    expect(tiles[0].v).toBe('7 of 600'); expect(tiles[2].v).toBe('0.47%–2.4%'); expect(said.more[0]).toContain('0.57% to 2.4%');
  });
  it('none found is not none there', () => {
    const { said } = all(agree({ kind: 'sure', of: 'share', name: 'Leakers' }), [run(50, 0)]);
    expect(said.text).toContain('between 0.00% and 7.1%'); expect(said.more.join(' ')).toContain('up to 7.1% could still be');
  });
  it('12 in 40 hours', () => {
    const { said, tiles } = all(agree({ kind: 'sure', of: 'rate', name: 'Stops', unit: 'hours' }), [run(40, 12)]);
    expect(said.text).toContain('12 in 40 hours — 0.30 per hour'); expect(said.text).toContain('between 0.16 and 0.52 per hour'); expect(tiles[2].v).toBe('0.30 per hour');
  });
  it('nothing counted, or more rejected than made', () => {
    expect(all(agree({ kind: 'sure', of: 'share' }), []).said.verdict).toBe('Not started');
    expect(all(agree({ kind: 'sure', of: 'share' }), [run(5, 9)]).said.text).toContain('cannot be more than were made');
  });
});
describe('did it change — measured (FC-105)', () => {
  const a = agree({ kind: 'change', unit: 'g', better: 'lower' }), rs = [...vals(B, 'before'), ...vals(A, 'after')];
  it('the right way, in words, with the interval and the p', () => {
    const { said, tiles, closing } = all(a, rs);
    expect(said.text).toBe('Before 12.81 g, after 12.31 g: it fell by 0.50 g — we can be 95% confident it fell by between 0.24 and 0.76 g (p = 0.0006). That is the right way for this measure. What moved it is the fix’s to say.');
    expect(said.tone).toBe('g'); expect(said.verdict).toBe('Moved the right way'); expect(tiles[3].v).toBe('0.0006'); expect(closing.text).toBe('Moved the right way — Fill weight, p = 0.0006, 95% confidence.');
    expect(said.more[1]).toContain('U 17.5, p = 0.0018 (normal approximation, ties and continuity corrected), shown beside the t');
  });
  it('the wrong way is red; no view is neutral', () => {
    expect(all({ ...a, better: 'higher' }, rs).said.tone).toBe('r'); expect(all({ ...a, better: 'higher' }, rs).said.verdict).toBe('Moved the wrong way');
    expect(all({ ...a, better: 'either' }, rs).said.tone).toBe('n'); expect(all({ ...a, better: 'either' }, rs).said.verdict).toBe('Changed');
  });
  it('not significant says what it would take', () => {
    const near = [...vals(B, 'before'), ...vals(B.map((v, i) => v + (i % 2 ? 0.2 : -0.15)), 'after')];
    const { said } = all(a, near);
    expect(said.verdict).toBe('No change shown'); expect(said.text).toContain('cannot tell a change from chance'); expect(said.text).toMatch(/would take about [\d,]+ in each group/);
  });
  it('too few, and no spread', () => {
    expect(all(a, [...vals([1, 2], 'before'), ...vals([1, 2, 3], 'after')]).said.verdict).toBe('Too few');
    expect(all(a, [...vals([5, 5, 5], 'before'), ...vals([5, 5, 5], 'after')]).said.verdict).toBe('Nothing to test');
  });
  it('under eight a side is said weak', () => { expect(analysisFigures(a, [...vals(B.slice(0, 5), 'before'), ...vals(A.slice(0, 5), 'after')]).checks.map(c => c.say).join(' ')).toContain('a weak test'); });
  it('exact Mann–Whitney leads when the readings are not bell-shaped', () => {
    const skewB = [...Array(18).fill(0).map((_, i) => 10 + i * 0.01), 30, 35], skewA = [...Array(18).fill(0).map((_, i) => 10.2 + i * 0.011), 33, 40];
    const f = analysisFigures(a, [...vals(skewB, 'before'), ...vals(skewA, 'after')]);
    expect(f.kind === 'change' && f.nonNormal).toBe(true); expect(f.kind === 'change' && f.leads).toBe('mw'); expect(analysisSays(f, a).text).toContain('Mann–Whitney (the readings are not bell-shaped)');
  });
});
describe('did it change — counted (FC-105)', () => {
  const a = agree({ kind: 'change', data: 'counted', better: 'lower', name: 'Reject rate' });
  it('14 of 400 → 5 of 380 is borderline: z under 0.05, Fisher over', () => {
    const { said, tiles, f } = all(a, [run(400, 14, 'before'), run(380, 5, 'after')]);
    expect(said.verdict).toBe('Borderline'); expect(said.text).toContain('Before 14 of 400 (3.5%), after 5 of 380 (1.3%): it fell by 2.2 points — borderline'); expect(said.tone).toBe('n');
    expect(f.checks.map(c => c.say).join(' ')).toContain('either side of 0.05'); expect(tiles[3].k).toBe('p');
  });
  it('3 of 40 → 0 of 45: Fisher leads on a small expected count', () => {
    const { said, f } = all(a, [run(40, 3, 'before'), run(45, 0, 'after')]);
    expect(f.kind === 'change' && f.counted?.t.leads).toBe('fisher'); expect(said.text).toContain('Fisher’s exact'); expect(said.verdict).toBe('No change shown'); expect(said.text).toMatch(/would take about [\d,]+ in each/);
  });
  it('a clear fall is green and says what moved it is the fix’s to say', () => {
    const { said } = all(a, [run(1000, 90, 'before'), run(1000, 30, 'after')]);
    expect(said.tone).toBe('g'); expect(said.verdict).toBe('Moved the right way'); expect(said.text).toContain('we can be 95% confident it fell'); expect(said.text).toContain('What moved it is the fix’s to say');
  });
  it('one side missing: not started', () => { expect(all(a, [run(400, 14, 'before')]).said.verdict).toBe('Not started'); });
});
describe('two ways agree (FC-106)', () => {
  const P1 = [401.2, 400.8, 402.1, 399.9, 401.5, 400.4, 401.9, 400.7, 401.1, 402.4, 400.2, 401.6];
  const P2 = [401.6, 401.1, 402.2, 400.5, 401.9, 400.3, 402.5, 401.2, 401.4, 402.9, 400.8, 402.1];
  const pairs = P1.map((value, i) => rd({ value, with: P2[i] }));
  const a = agree({ kind: 'paired', unit: 'g', firstName: 'Checkweigher 1', secondName: 'Checkweigher 2' });
  it('says which reads higher and by how much', () => {
    const { said } = all(a, pairs);
    expect(said.text).toBe('Checkweigher 2 reads 0.39 g higher than Checkweigher 1 — we can be 95% confident by between 0.25 and 0.53 g (p < 0.0001), in 11 of 12 pairs.');
    expect(said.verdict).toBe('Differ'); expect(said.tone).toBe('n');
  });
  it('red only beyond the difference that does not matter; agree when the interval fits inside it', () => {
    expect(all({ ...a, within: 0.2 }, pairs).said.tone).toBe('r'); expect(all({ ...a, within: 0.2 }, pairs).said.text).toContain('more than the 0.20 g that does not matter');
    expect(all({ ...a, within: 0.6 }, pairs).said.verdict).toBe('Agree'); expect(all({ ...a, within: 0.6 }, pairs).said.tone).toBe('g');
    expect(all({ ...a, within: 0.45 }, pairs).said.verdict).toBe('Differ, within what matters');
  });
  it('too few pairs; a first value with no second is left out and said', () => {
    expect(all(a, pairs.slice(0, 4)).said.verdict).toBe('Too few');
    const x = all(a, [...pairs, rd({ value: 400 })]); expect(x.said.more.join(' ')).toContain('1 reading with no second value, left out');
  });
});
describe('how many readings (FC-113, FC-020)', () => {
  it('a mean: Student’s t leads, the normal’s count is beside it', () => {
    const { said } = all(agree({ kind: 'plan', unit: 'g', plan: { ask: 'mean', sd: 0.9, e: 0.3 } }), []);
    expect(said.verdict).toBe('38 readings'); expect(said.text).toContain('take about 38 readings'); expect(said.more[0]).toContain('35 by the normal’s z');
  });
  it('two means: 52 a group at 80% power, and what fewer could see', () => {
    const { said } = all(agree({ kind: 'plan', unit: 'g', plan: { ask: 'difference', sd: 0.9, delta: 0.5 } }), []);
    expect(said.verdict).toBe('52 a group'); expect(said.more[0]).toContain('with 26 a group you could see');
    expect(all(agree({ kind: 'plan', plan: { ask: 'difference', sd: 0.9, delta: 0.5, power: 0.9 } }), []).said.verdict).toBe('70 a group');
  });
  it('shares, two shares and zero failures', () => {
    expect(all(agree({ kind: 'plan', plan: { ask: 'share', p: 0.1, e: 0.02 } }), []).said.verdict).toBe('865 counted');
    expect(all(agree({ kind: 'plan', plan: { ask: 'share', e: 0.02 } }), []).said.verdict).toBe('2,401 counted');
    expect(all(agree({ kind: 'plan', plan: { ask: 'twoShares', p1: 0.1, p2: 0.05 } }), []).said.verdict).toBe('435 a group');
    expect(all(agree({ kind: 'plan', plan: { ask: 'zero', p0: 0.01 } }), []).said.text).toContain('test 299 in a row');
  });
  it('the spread from a pilot of eight or more, and its time and cost', () => {
    const f = analysisFigures(agree({ kind: 'plan', plan: { ask: 'mean', e: 0.3, seconds: 20 } }), vals(THIRTY), { rate: 12 });
    expect(f.kind === 'plan' && f.sdFrom).toBe('readings'); const t = analysisSays(f, agree({ kind: 'plan', plan: { ask: 'mean', e: 0.3, seconds: 20 } })).text;
    expect(t).toContain('at 20 seconds a reading'); expect(t).toContain('of one person’s time');
  });
  it('cycles: five timed, six needed, one more', () => {
    const a = agree({ kind: 'plan', unit: 's', plan: { ask: 'cycles', k: 0.05 } }), { said, tiles } = all(a, vals([12.1, 12.8, 11.6, 13.0, 12.4]));
    expect(said.verdict).toBe('1 more cycles'); expect(said.text).toContain('sure to ± 5.6% at 95%'); expect(said.text).toContain('time 6 in all: 1 more'); expect(tiles.map(t => t.v)).toEqual(['5', '6', '1', '± 5.6%']);
    expect(all(agree({ kind: 'plan', plan: { ask: 'cycles', k: 0.1 } }), vals([12.1, 12.8, 11.6, 13.0, 12.4])).said.verdict).toBe('Enough cycles');
  });
  it('what is missing is said as the box to fill', () => {
    expect(planProblem({ ask: 'mean' })).toContain('A guess of the spread'); expect(planProblem({ ask: 'mean', sd: 1 })).toContain('precision');
    expect(all(agree({ kind: 'plan', plan: { ask: 'difference', sd: 0.9 } }), []).said.text).toBe('The difference that matters, in the unit.');
    expect(planProblem({ ask: 'twoShares', p1: 0.1, p2: 0.1 })).toContain('two different shares'.replace('two', 'Two'));
  });
});
describe('the agreement and the words', () => {
  it('a name is needed; a tolerance above zero', () => { expect(analysisProblem({ kind: 'sure', name: ' ' })).toContain('What is measured'); expect(analysisProblem({ kind: 'paired', name: 'x', within: 0 })).toContain('above 0'); expect(analysisProblem({ kind: 'sure', name: 'x' })).toBe(''); });
  it('p is said to the precision it earns', () => { expect(fmtP(0.24)).toBe('0.24'); expect(fmtP(0.0443)).toBe('0.044'); expect(fmtP(0.000594)).toBe('0.0006'); expect(fmtP(0.00002)).toBe('< 0.0001'); });
});
describe('pasted readings', () => {
  it('a number to a line, spaced or comma separated; the rest is listed, never dropped', () => {
    const p = parsePasted('401.2\n401.6, 400.8  402\n\nabc 12,\n-3 .5');
    expect(p.values).toEqual([401.2, 401.6, 400.8, 402, 12, -3, 0.5]); expect(p.skipped).toEqual(['abc']);
  });
  it('pairs: two numbers to a line, a bad line is skipped whole', () => {
    const p = parsePasted('401.2 401.6\n400.8,401.1\n5\n1 2 3\nx 4', 2);
    expect(p.pairs).toEqual([[401.2, 401.6], [400.8, 401.1]]); expect(p.skipped).toEqual(['5', '1 2 3', 'x 4']);
  });
});
describe('the picture', () => {
  it('a mean: the readings as bars, the mean with its interval under them', () => {
    const rows = analysisPicture(...(() => { const a = agree({ kind: 'sure', unit: 'g' }); return [analysisFigures(a, vals(THIRTY)), a] as const; })());
    expect(rows.map(r => r.label)).toEqual(['Readings', 'Mean']); expect(rows[0].hist!.counts.reduce((x, y) => x + y, 0)).toBe(30); expect(rows[1].point!.text).toBe('401.20'); expect(rows[1].band!.text).toBe('95%: 400.97–401.42');
  });
  it('a change: before, after and the difference on a zero line, red or green by the way', () => {
    const a = agree({ kind: 'change', unit: 'g', better: 'lower' }), rows = analysisPicture(analysisFigures(a, [...vals(B, 'before'), ...vals(A, 'after')]), a);
    expect(rows.map(r => r.label)).toEqual(['Before', 'After', 'Change']); expect(rows[2].zero).toBe(true); expect(rows[2].tone).toBe('g'); expect(rows[2].point!.text).toBe('−0.50'); expect(rows[0].axis[0]).toBeLessThan(11.9);
  });
  it('nothing to draw before there is something', () => { const a = agree({ kind: 'change' }); expect(analysisPicture(analysisFigures(a, []), a)).toEqual([]); const p = agree({ kind: 'plan', plan: { ask: 'mean', sd: 1, e: 1 } }); expect(analysisPicture(analysisFigures(p, []), p)).toEqual([]); });
});
