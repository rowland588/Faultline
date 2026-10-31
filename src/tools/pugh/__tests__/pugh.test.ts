/* FC-143 — the Pugh matrix against the independent cases of scripts/knowledge/cases-pugh.py (a second implementation, run
   with `python3 -I scripts/knowledge/cases-pugh.py`) and the hand-worked sum of the knowledge record's film-breaks case. */
import { describe, expect, it } from 'vitest';
import { pugh, pughTable, signed, summarizePugh, type PughIn, type PughResult } from '../pugh';

const build = (criteria: [string, number][], options: [string, number[], number?][], datum?: string): PughIn => ({
  datum,
  criteria: criteria.map(([name, weight], j) => ({ id: `c${j}`, name, weight })),
  options: options.map(([name, marks, cost], i) => ({ id: `o${i}`, name, cost, scores: Object.fromEntries(marks.map((m, j) => [`c${j}`, m])) })),
});
const ok = (i: PughIn): PughResult => { const r = pugh(i); if (!('ok' in r)) throw new Error(r.problems.join(' ')); return r.ok; };

const FILM = build(
  [['cuts breaks', 5], ['cost', 3], ['time to do', 3], ['safety', 4], ['hygiene', 4]],
  [['Film guide', [1, 1, 1, 0, 0]], ['Reel trolley', [1, 0, 0, 1, 0]], ['New unwind unit', [1, -1, -1, 0, 0]], ['Second operator', [0, -1, 1, 0, 0]]],
);

describe('case 1 — the record’s film-breaks case (5·1+3·1+3·1 = 11; 5+4 = 9; 5−3−3 = −1; −3+3 = 0)', () => {
  const r = ok(FILM);
  const by = (n: string) => r.ranked.find(o => o.name === n)!;
  it('counts and weighted scores', () => {
    expect([by('Film guide').plus, by('Film guide').minus, by('Film guide').same, by('Film guide').score]).toEqual([3, 0, 2, 11]);
    expect([by('Reel trolley').plus, by('Reel trolley').minus, by('Reel trolley').same, by('Reel trolley').score]).toEqual([2, 0, 3, 9]);
    expect([by('New unwind unit').plus, by('New unwind unit').minus, by('New unwind unit').same, by('New unwind unit').score]).toEqual([1, 2, 2, -1]);
    expect([by('Second operator').plus, by('Second operator').minus, by('Second operator').same, by('Second operator').score]).toEqual([1, 1, 3, 0]);
  });
  it('ranks, leads, beaten on safety, holds under any one-step weight change', () => {
    expect(r.ranked.map(o => o.name)).toEqual(['Film guide', 'Reel trolley', 'Second operator', 'New unwind unit']);
    expect(r.ranked.map(o => o.rank)).toEqual([1, 2, 3, 4]);
    expect(r.leaders).toEqual(['Film guide']);
    expect(r.margin).toBe(2);
    expect(r.weighted).toBe(true);
    expect(r.beaten).toEqual([{ criterion: 'safety', options: ['Reel trolley'] }]);
    expect(r.flips).toEqual([]);
  });
  it('says it', () => {
    const s = summarizePugh(r);
    expect(s.verdict).toBe('Film guide leads');
    expect(s.tone).toBe('n');
    expect(s.sentence).toBe('Film guide leads: better than Present state on 3 criteria, worse on none — weighted +11. Reel trolley follows at +9.');
    expect(s.tiles.map(t => [t.k, t.v])).toEqual([['Leads', 'Film guide'], ['Beat the datum', '2 of 4'], ['Margin', '+2'], ['If a weight moves a step', 'Holds']]);
    expect(s.closing).toBe('Take Film guide forward as the countermeasure to try — the matrix orders the choice; a trial on the number proves it.');
    expect(s.also?.lines).toEqual(['On safety: Reel trolley scored better than Film guide — worth taking into it.']);
  });
});

describe('case 1b — the same, every weight 1 (pure Pugh: pluses less minuses)', () => {
  const r = ok(build(FILM.criteria.map(c => [c.name, 1] as [string, number]), [['Film guide', [1, 1, 1, 0, 0]], ['Reel trolley', [1, 0, 0, 1, 0]], ['New unwind unit', [1, -1, -1, 0, 0]], ['Second operator', [0, -1, 1, 0, 0]]]));
  it('scores +3, +2, 0, −1; unweighted; safety a step up ties the guide and the trolley', () => {
    expect(r.ranked.map(o => o.score)).toEqual([3, 2, 0, -1]);
    expect(r.weighted).toBe(false);
    expect(r.flips).toEqual([{ criterion: 'safety', step: 1, leaders: ['Film guide', 'Reel trolley'] }]);
    const s = summarizePugh(r);
    expect(s.tone).toBe('a');
    expect(s.sentence).toBe('Film guide leads: better than Present state on 3 criteria, worse on none — +3. Reel trolley follows at +2.');
    expect(s.closing).toBe('The lead is thin: safety counted a step more and Film guide and Reel trolley lead. Agree the weights again before choosing.');
  });
});

describe('case 2 — a thin lead', () => {
  const r = ok(build([['cost', 3], ['safety', 2], ['speed', 2]], [['X', [1, 0, 1]], ['Y', [0, 1, 1]]]));
  it('X +5, Y +4; cost down or safety up ties them', () => {
    expect(r.ranked.map(o => [o.name, o.score])).toEqual([['X', 5], ['Y', 4]]);
    expect(r.flips).toEqual([{ criterion: 'cost', step: -1, leaders: ['X', 'Y'] }, { criterion: 'safety', step: 1, leaders: ['X', 'Y'] }]);
    expect(r.beaten).toEqual([{ criterion: 'safety', options: ['Y'] }]);
    expect(summarizePugh(r).verdict).toBe('X leads');
    expect(summarizePugh(r).tone).toBe('a');
  });
});

describe('case 3 — a tie', () => {
  const r = ok(build([['cost', 2], ['safety', 2], ['speed', 1]], [['P', [1, -1, 1]], ['Q', [-1, 1, 1]], ['R', [0, 0, -1]]]));
  it('P and Q tie at +1, R −1; each of the four one-step changes separates them', () => {
    expect(r.leaders).toEqual(['P', 'Q']);
    expect(r.ranked.map(o => [o.name, o.score, o.rank])).toEqual([['P', 1, 1], ['Q', 1, 1], ['R', -1, 3]]);
    expect(r.margin).toBe(2);
    expect(r.flips).toEqual([
      { criterion: 'cost', step: 1, leaders: ['P'] }, { criterion: 'cost', step: -1, leaders: ['Q'] },
      { criterion: 'safety', step: 1, leaders: ['Q'] }, { criterion: 'safety', step: -1, leaders: ['P'] },
    ]);
    const s = summarizePugh(r);
    expect(s.verdict).toBe('P and Q tie');
    expect(s.sentence).toBe('P and Q tie for the lead at +1 against Present state.');
    expect(s.closing.startsWith('Don’t choose yet: P and Q tie.')).toBe(true);
  });
});

describe('case 4 — nothing beats the datum', () => {
  const r = ok(build([['cost', 3], ['time', 2]], [['M', [-1, 1]], ['N', [-1, 0]]], 'Today'));
  it('M −1, N −3', () => {
    expect(r.ranked.map(o => [o.name, o.score])).toEqual([['M', -1], ['N', -3]]);
    const s = summarizePugh(r);
    expect(s.verdict).toBe('None beats the datum');
    expect(s.sentence).toBe('No option beats Today: the best, M, scores −1.');
    expect(s.closing).toBe('Keep Today for now or find a stronger option — none scored better than it.');
    expect(s.tiles[1].v).toBe('0 of 2');
    expect((s.also?.lines ?? []).some(l => l.startsWith('On '))).toBe(false);
  });
});

describe('case 5 — the order depends on the datum (same ratings, marked by the sign of the difference)', () => {
  const ratings: Record<string, number[]> = { D: [3, 3, 3], A: [4, 4, 1], B: [5, 2, 2] };
  const leaderAgainst = (datum: string) => {
    const options: [string, number[]][] = Object.entries(ratings).filter(([n]) => n !== datum).map(([n, v]) => [n, v.map((x, j) => Math.sign(x - ratings[datum][j]))]);
    const r = ok(build([['a', 1], ['b', 1], ['c', 1]], options, datum));
    return [r.leaders, r.ranked.map(o => o.score)] as const;
  };
  it('A leads against D, B against A, D against B', () => {
    expect(leaderAgainst('D')).toEqual([['A'], [1, -1]]);
    expect(leaderAgainst('A')).toEqual([['B'], [1, -1]]);
    expect(leaderAgainst('B')).toEqual([['D'], [1, -1]]);
  });
});

describe('what it refuses and how it copes', () => {
  it('needs a criterion and an option', () => {
    expect(pugh({ criteria: [], options: [] })).toEqual({ problems: ['Add at least one criterion — what matters in the choice.', 'Add at least one option to set against the datum.'] });
    const blank = pugh({ criteria: [{ id: 'c', name: '  ' }], options: [{ id: 'o', name: ' ' }] });
    expect('problems' in blank).toBe(true);
  });
  it('refuses a weight that is not a whole number 1 to 5, naming it', () => {
    for (const w of [0, 6, 2.5, -1, NaN]) {
      const r = pugh(build([['cost', w]], [['A', [1]]]));
      expect(r).toEqual({ problems: ['“cost” needs a weight that is a whole number from 1 to 5.'] });
    }
  });
  it('takes a blank weight as 1', () => {
    const r = ok({ criteria: [{ id: 'c', name: 'cost' }], options: [{ id: 'o', name: 'A', scores: { c: 1 } }] });
    expect(r.criteria[0].weight).toBe(1);
    expect(r.weighted).toBe(false);
  });
  it('leaves out an option not marked on every criterion and names it, ranking the rest', () => {
    const r = ok({ criteria: [{ id: 'a', name: 'cost' }, { id: 'b', name: 'safety' }], options: [
      { id: '1', name: 'Full', scores: { a: 1, b: 0 } }, { id: '2', name: 'Half', scores: { a: 1 } }, { id: '3', name: '', scores: { a: 1, b: 1 } },
    ] });
    expect(r.ranked.map(o => o.name)).toEqual(['Full']);
    expect(r.left).toEqual([{ id: '2', name: 'Half', missing: ['safety'] }]);
    expect((c => c[c.length - 1])(summarizePugh(r).caveats)).toBe('Left out until marked on every criterion: Half (not marked on safety).');
  });
  it('turns every option left out into the problem', () => {
    const r = pugh({ criteria: [{ id: 'a', name: 'cost' }], options: [{ id: '1', name: 'Half' }] });
    expect(r).toEqual({ problems: ['“Half” isn’t marked on cost.', 'Mark at least one option on every criterion to rank it.'] });
  });
  it('reads a mark that is not +1, 0 or −1 as not marked', () => {
    const r = pugh({ criteria: [{ id: 'a', name: 'cost' }], options: [{ id: '1', name: 'Odd', scores: { a: 2 } }] });
    expect('problems' in r).toBe(true);
  });
  it('a single option still reads against the datum', () => {
    const r = ok(build([['cost', 1]], [['Only', [1]]]));
    const s = summarizePugh(r);
    expect(r.margin).toBeUndefined();
    expect(s.tiles[2].v).toBe('—');
    expect(s.sentence).toBe('Only leads: better than Present state on 1 criterion, worse on none — +1.');
  });
  it('three tied options are named as a count in the verdict', () => {
    const r = ok(build([['a', 1]], [['A', [1]], ['B', [1]], ['C', [1]]]));
    expect(summarizePugh(r).verdict).toBe('3 options tie');
    expect(summarizePugh(r).sentence).toBe('A, B and C tie for the lead at +1 against Present state.');
  });
});

describe('cost typed — beside the score, never in it', () => {
  it('shows the leader’s cost as a tile and the costs in the table; none typed says nothing of money', () => {
    const withCost = build([['cost', 1], ['safety', 1]], [['A', [1, 1], 1200], ['B', [0, 1], 300]]);
    const r = ok(withCost);
    expect(r.anyCost).toBe(true);
    expect(r.ranked[0].name).toBe('A');
    expect((c => c[c.length - 1])(summarizePugh(r).tiles)).toMatchObject({ k: 'Leader’s cost', v: '£1,200' });
    expect((c => c[c.length - 1])(pughTable(withCost, r).foot)).toEqual(['Cost typed', '', '', '£1,200', '£300']);
    expect(summarizePugh(r).caveats.join(' ')).toContain('not weighed in it');
    const none = ok(build([['cost', 1]], [['A', [1]]]));
    expect(none.anyCost).toBe(false);
    expect(summarizePugh(none).tiles.map(t => t.k)).not.toContain('Leader’s cost');
    expect(summarizePugh(none).caveats.join(' ')).not.toContain('costs typed');
    const negative = ok(build([['cost', 1]], [['A', [1], -5]]));
    expect(negative.anyCost).toBe(false);
  });
});

describe('the table', () => {
  it('lays the matrix out criteria down and options across, in the order typed, with the foot', () => {
    const r = ok(FILM);
    const t = pughTable(FILM, r);
    expect(t.head).toEqual(['Criterion', 'Weight', 'Datum: Present state', 'Film guide', 'Reel trolley', 'New unwind unit', 'Second operator']);
    expect(t.rows[0]).toEqual(['cuts breaks', '5', 'S', '+', '+', '+', 'S']);
    expect(t.rows[1]).toEqual(['cost', '3', 'S', '+', 'S', '−', '−']);
    expect(t.foot.map(f => f[0])).toEqual(['Better (+)', 'Worse (−)', 'Same (S)', 'Weighted score', 'Rank']);
    expect(t.foot[3]).toEqual(['Weighted score', '', '0', '+11', '+9', '−1', '0']);
    expect(t.foot[4]).toEqual(['Rank', '', '', '1 — leads', '2', '4', '3']);
    expect(t.shares).toHaveLength(t.head.length);
    expect(t.shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
  it('keeps a column for an option left out, marked not ranked', () => {
    const input: PughIn = { criteria: [{ id: 'a', name: 'cost' }], options: [{ id: '1', name: 'Full', scores: { a: 1 } }, { id: '2', name: 'Half' }] };
    const t = pughTable(input, ok(input));
    expect(t.head.slice(3)).toEqual(['Full', 'Half']);
    expect(t.rows[0].slice(3)).toEqual(['+', '—']);
    expect(t.foot[4].slice(3)).toEqual(['1 — leads', 'not ranked']);
  });
  it('signs numbers', () => { expect([signed(11), signed(0), signed(-1)]).toEqual(['+11', '0', '−1']); });
});
