import { describe, expect, it } from 'vitest';
import { doingOf, fourQuestions, greeting, sentenceOf, whoOf, wrongOf } from '../factoryQuestions';
import type { ProjectAction } from '../projectActions';
import type { ProblemCost } from '../problemCost';

const cost = (o: Partial<ProblemCost>): ProblemCost => ({ stopsLine: true, neckKnown: true, missing: [], words: '', short: '', ...o });
const act = (o: Partial<ProjectAction>): ProjectAction => ({ key: Math.random().toString(36), kind: 'Action', what: 'x', who: '', late: false, soon: false, ...o });

describe('the four questions on the Factory (docs/LOOK.md §1)', () => {
  it('what is going wrong: the open problems by what they cost, priced where the line prices them', () => {
    const w = wrongOf([
      { id: 'a', what: 'Film breaks', line: 'Line 7', priority: 'high', late: false, cost: cost({ labour: 60, contribution: 800 }) },
      { id: 'b', what: 'Guide loose', line: 'Line 7', priority: 'critical', late: true },
      { id: 'c', what: 'Short of target', line: 'Line 2A', priority: 'high', late: false, cost: cost({ labour: 180 }) },
    ]);
    expect([w.open, w.critical, w.late, w.priced, w.costDay]).toEqual([3, 1, 1, 2, 1040]);
    /* the priced first, dearest first; then the unpriced by priority — never a figure invented for it */
    expect(w.top.map(r => r.id)).toEqual(['a', 'c', 'b']);
    expect(w.top[0].pounds).toBe(860);
    expect(w.top[2].pounds).toBeUndefined();
  });
  it('what needs doing: late first, then this week, then the rest', () => {
    const d = doingOf([act({ key: 'later', due: '2026-12-01' }), act({ key: 'late', due: '2026-11-04', late: true }), act({ key: 'week', due: '2026-11-10', soon: true }), act({ key: 'none' })], '2026-11-06');
    expect([d.open, d.late, d.week, d.nobody]).toEqual([4, 1, 1, 4]);
    expect(d.top.map(a => a.key)).toEqual(['late', 'week', 'later', 'none']);
  });
  it('who is responsible: the most late first, nobody-yet apart', () => {
    const who = whoOf([act({ who: 'Dave', late: true }), act({ who: 'Dave' }), act({ who: 'Priya' }), act({ who: ' dave ', late: true }), act({ who: '' })]);
    expect(who.people).toEqual([{ name: 'Dave', open: 3, late: 2 }, { name: 'Priya', open: 1, late: 0 }]);
    expect(who.nobody).toBe(1);
    expect(who.mostLate?.name).toBe('Dave');
  });
  it('the cards and the sentence say the figures, a missing one in words', () => {
    const q = fourQuestions({ wrong: [{ id: 'a', what: 'x', line: 'L', priority: 'critical', late: false }], actions: [act({ who: 'Dave', late: true, due: '2026-11-01' })], proved: [], lines: 3, today: '2026-11-06' });
    expect(q.cards.map(c => [c.value, c.of, c.change])).toEqual([['1', 'problem open', '1 critical'], ['1', 'action open', '1 late'], ['1', 'person with actions', 'Dave has 1 late'], ['0', 'fixes proved', 'no fix proved yet']]);
    expect(q.cards.map(c => c.tone)).toEqual(['r', 'r', 'r', 'n']);
    expect(q.sentence).toBe('3 lines running. 1 problem open, 1 critical; 1 action late — Dave has 1; no fix proved yet.');
    const quiet = sentenceOf(0, wrongOf([]), doingOf([], '2026-11-06'), whoOf([]), { proved: [] });
    expect(quiet).toBe('No lines yet. Nothing going wrong on the register; nothing owed; no fix proved yet.');
    expect(fourQuestions({ wrong: [], actions: [], proved: [], lines: 1, today: '2026-11-06' }).cards.map(c => c.change)).toEqual(['nothing open', 'nothing owed', 'nobody owes anything', 'no fix proved yet']);
  });
  it('the greeting by the hour', () => {
    expect([greeting(6), greeting(13), greeting(19)]).toEqual(['Good morning', 'Good afternoon', 'Good evening']);
  });
});
