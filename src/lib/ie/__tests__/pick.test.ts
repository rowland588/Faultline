import { describe, expect, it } from 'vitest';
import { effortMoney, paybackWeeksOf, paybackWords, quadrantOf, rankPick, summarizePick, type PickRanked, type PickRowIn } from '../pick';

/* scripts/knowledge/cases-pick.py — written apart from the module */
const film: PickRowIn[] = [
  { id: '1', name: 'Film guide', impact: 3, effort: 1, worthGbp: 6000, hours: 6 },
  { id: '2', name: 'Reel trolley', impact: 3, effort: 2, worthGbp: 4500, hours: 20 },
  { id: '3', name: 'New unwind unit', impact: 4, effort: 5, worthGbp: 30000, hours: 200, spendGbp: 18000 },
  { id: '4', name: 'Second operator', impact: 2, effort: 2, worthGbp: 2000, hours: 40 },
];
const packing: PickRowIn[] = [
  { id: '1', name: 'Sealer jaw spares kit', impact: 4, effort: 2 },
  { id: '2', name: 'Splice tape change', impact: 3, effort: 3 },
  { id: '3', name: 'Re-tune the auto-reject', impact: 2, effort: 4 },
  { id: '4', name: 'Rewrite the changeover checklist', impact: 2, effort: 1 },
  { id: '5', name: 'Replace the wrapper', impact: 5, effort: 5 },
];
const ok = (r: ReturnType<typeof rankPick>): PickRanked[] => { if (!('ok' in r)) throw new Error(r.problems.join(' ')); return r.ok; };

describe('the cut (impact 3 or more is high, effort 2 or less is low)', () => {
  it('places every boundary', () => {
    expect(quadrantOf(3, 2)).toBe('Implement');
    expect(quadrantOf(2, 2)).toBe('Possible');
    expect(quadrantOf(3, 3)).toBe('Challenge');
    expect(quadrantOf(2, 3)).toBe('Kill');
    expect(quadrantOf(5, 1)).toBe('Implement');
    expect(quadrantOf(1, 5)).toBe('Kill');
    expect(quadrantOf(5, 5)).toBe('Challenge');
    expect(quadrantOf(1, 1)).toBe('Possible');
  });
});

describe('film breaks, priced at £18 an hour (case 1)', () => {
  const r = rankPick(film, { rate: 18 });
  const rows = ok(r);
  it('counts and orders', () => {
    expect('counts' in r && r.counts).toEqual({ Implement: 2, Challenge: 1, Possible: 1, Kill: 0 });
    expect(rows.map(x => x.name)).toEqual(['Film guide', 'Reel trolley', 'New unwind unit', 'Second operator']);
    expect(rows.map(x => x.score)).toEqual([1, 2, 3, 4]);
    expect(rows.map(x => x.onLine)).toEqual([true, true, false, false]);
  });
  it('prices the work and the payback', () => {
    expect(rows.map(x => x.effortGbp)).toEqual([108, 360, 21600, 720]);
    expect(rows.map(x => Number((x.paybackWeeks as number).toFixed(2)))).toEqual([0.94, 4.16, 37.44, 18.72]);
    expect(rows.map(x => paybackWords(x.paybackWeeks as number))).toEqual(['under a week', '4 weeks', '37 weeks', '19 weeks']);
  });
  it('says the quick wins in money', () => {
    const s = summarizePick(rows, { rate: 18 });
    expect(s.verdict).toBe('2 to do first');
    expect(s.tiles.map(t => [t.k, t.v])).toEqual([['Implement', '2'], ['Challenge', '1'], ['Possible', '1'], ['Kill', '0']]);
    expect(s.money).toEqual(['The quick wins are worth £10.5k a year for 26 hours of work (£468 of labour at £18 an hour).']);
    expect(s.sentence).toBe('Do first: Film guide, Reel trolley. Plan as projects: New unwind unit. When there is slack: Second operator.');
  });
});

describe('a packing line, nothing priced (case 2)', () => {
  const r = rankPick(packing);
  const rows = ok(r);
  it('counts and orders, a 3 on the line', () => {
    expect('counts' in r && r.counts).toEqual({ Implement: 1, Challenge: 2, Possible: 1, Kill: 1 });
    expect(rows.map(x => x.name)).toEqual(['Sealer jaw spares kit', 'Replace the wrapper', 'Splice tape change', 'Rewrite the changeover checklist', 'Re-tune the auto-reject']);
    expect(rows.filter(x => x.onLine).map(x => x.name)).toEqual(['Splice tape change']);
  });
  it('names what to give, and invents nothing', () => {
    const s = summarizePick(rows);
    expect(s.verdict).toBe('1 to do first');
    expect(s.money).toEqual(['Type what each is worth a year to say what the quick wins are worth.', 'Give the hours, and the £ an hour, to say what the work costs.']);
    expect(rows.every(x => x.effortGbp === undefined && x.paybackWeeks === undefined)).toBe(true);
    expect(s.caveats[1]).toContain('1 row has a 3 on an axis');
  });
});

describe('the money, input by input', () => {
  it('hours need the £ an hour; spend alone does not', () => {
    expect(effortMoney({ hours: 10 }, undefined)).toBeUndefined();
    expect(effortMoney({ hours: 10 }, 18)).toBe(180);
    expect(effortMoney({ spendGbp: 500 }, undefined)).toBe(500);
    expect(effortMoney({ hours: 10, spendGbp: 500 }, 18)).toBe(680);
    expect(effortMoney({}, 18)).toBeUndefined();
    expect(effortMoney({ hours: 0, spendGbp: 40 }, undefined)).toBe(40);
  });
  it('payback only with a cost and a worth above zero; said in weeks then years', () => {
    expect(paybackWeeksOf(520, 5200)).toBeCloseTo(5.2, 10);
    expect(paybackWeeksOf(520, 0)).toBeUndefined();
    expect(paybackWeeksOf(undefined, 5200)).toBeUndefined();
    expect(paybackWords(0.4)).toBe('under a week');
    expect(paybackWords(1)).toBe('1 week');
    expect(paybackWords(104)).toBe('104 weeks');
    expect(paybackWords(130)).toBe('2.5 years');
  });
  it('some given, some not: says how many, and what is missing', () => {
    const rows = ok(rankPick([
      { id: 'a', name: 'A', impact: 4, effort: 1, worthGbp: 1000, hours: 5 },
      { id: 'b', name: 'B', impact: 5, effort: 2 },
    ]));
    const s = summarizePick(rows);
    expect(s.money[0]).toBe('The quick wins are worth £1.0k a year (1 of 2 given) for 5 hours of work (1 of 2 given).');
    expect(s.money[1]).toBe('Give the £ an hour for the people doing the work, to say what the hours cost.');
  });
});

describe('refusals and edges', () => {
  it('names a row without both scores and ranks the rest', () => {
    const r = rankPick([{ id: '1', name: 'Film guide', impact: 3 }, { id: '2', name: 'Trolley', impact: 3, effort: 2 }]);
    expect('ok' in r && r.ok.map(x => x.name)).toEqual(['Trolley']);
    expect('left' in r && r.left).toEqual(['“Film guide” needs an impact and an effort, each a whole number from 1 to 5.']);
    const none = rankPick([{ id: '1', name: 'Film guide', impact: 3 }]);
    expect('problems' in none && none.problems).toEqual(['“Film guide” needs an impact and an effort, each a whole number from 1 to 5.']);
  });
  it('refuses scores that are not whole or not 1 to 5, and negatives', () => {
    for (const [i, e] of [[0, 2], [6, 2], [3, 2.5], [3, 0]] as const) expect('problems' in rankPick([{ id: '1', name: 'X', impact: i, effort: e }])).toBe(true);
    const neg = rankPick([{ id: '1', name: 'X', impact: 3, effort: 2, hours: -1 }]);
    expect('problems' in neg && neg.problems[0]).toContain('negative number of hours');
  });
  it('an empty register is not scored yet, not an error; one countermeasure is not a choice', () => {
    const e = rankPick([{ id: '1', name: '  ' }]);
    expect('ok' in e && e.ok).toEqual([]);
    expect(summarizePick([]).verdict).toBe('Not scored yet');
    expect(summarizePick(ok(rankPick([{ id: '1', name: 'Only', impact: 4, effort: 1 }]))).sentence).toBe('One countermeasure is not a choice yet — add the others.');
  });
  it('no quick win says so; ties break by impact, effort, worth, then typed order', () => {
    const rows = ok(rankPick([
      { id: '1', name: 'Big', impact: 5, effort: 5 },
      { id: '2', name: 'Kill me', impact: 1, effort: 4 },
    ]));
    expect(summarizePick(rows).verdict).toBe('None to do first');
    expect(summarizePick(rows).sentence.startsWith('No quick win on this list — plan the projects with the sponsor.')).toBe(true);
    expect(summarizePick(rows).money).toEqual(['Nothing to do first, so no quick win to price.']);
    const tie = ok(rankPick([
      { id: '1', name: 'First typed', impact: 4, effort: 1 },
      { id: '2', name: 'Worth more', impact: 4, effort: 1, worthGbp: 900 },
      { id: '3', name: 'Third typed', impact: 4, effort: 1 },
      { id: '4', name: 'Higher impact', impact: 5, effort: 2 },
    ]));
    expect(tie.map(x => x.name)).toEqual(['Higher impact', 'Worth more', 'First typed', 'Third typed']);
  });
});
