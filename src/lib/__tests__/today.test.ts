import { describe, expect, it } from 'vitest';
import { briefing, lineState, greeting } from '../today';
import type { ProjectAction, RegisterProblem } from '../projectActions';

const act = (o: Partial<ProjectAction>): ProjectAction => ({ key: Math.random().toString(), kind: 'Action', what: 'x', who: '', late: false, soon: false, ...o });
const prob = (o: Partial<RegisterProblem>): RegisterProblem => ({ id: 'p', problem: 'Film tears', status: 'open', ...o });

describe('Today — the briefing', () => {
  it('names the oldest late action, the newest problem since, the project furthest behind — three at most', () => {
    const rows = [
      act({ what: 'Fit the guard', who: 'Sam', due: '2026-11-03', late: true, project: { id: 'a', name: 'Wrapper' } }),
      act({ what: 'Order film', who: 'Jo', due: '2026-11-01', late: true, project: { id: 'a', name: 'Wrapper' } }),
      act({ what: 'Retrain', due: '2026-11-05', late: true, project: { id: 'b', name: 'Bagger' } }),
      act({ what: 'Check seals', due: '2026-11-12', soon: true }),
    ];
    const b = briefing(rows, [prob({ id: 'old', raisedAt: 100 }), prob({ id: 'n1', problem: 'Jams on the bagger', raisedAt: 2000, line: 'Line 3' }), prob({ id: 'n2', raisedAt: 1500 }), prob({ id: 'c', raisedAt: 3000, status: 'closed' })], 1000);
    expect(b.map(x => x.key)).toEqual(['late', 'new', 'behind']);
    expect(b[0].says).toBe('3 actions past their day — the oldest “Order film”, Jo, due 2026-11-01.');
    expect(b[1].says).toBe('2 problems raised since you were last in — the newest “Jams on the bagger” on Line 3.');
    expect(b[1].to).toBe('/snags?open=n1');
    expect(b[2].says).toBe('Wrapper is the furthest behind — 2 actions late of 2 open actions.');
    expect(b[2].to).toBe('/project/a/actions');
  });
  it('fills with what is due soon, and says clear in green when nothing wants them', () => {
    const b = briefing([act({ what: 'Check seals', due: '2026-11-12', soon: true })], [], 0);
    expect(b).toEqual([{ key: 'soon', state: 'a', word: 'Due soon', to: '/actions', says: '1 action due in the next few days — first “Check seals”, 2026-11-12.' }]);
    expect(briefing([], [], 0)[0].state).toBe('g');
  });
  it('a line in a word, and the greeting by the hour', () => {
    expect(lineState(3, 1)).toEqual({ state: 'r', word: '1 critical problem' });
    expect(lineState(2, 0)).toEqual({ state: 'a', word: '2 problems open' });
    expect(lineState(0, 0).word).toBe('Nothing open');
    expect([greeting(8), greeting(13), greeting(20)]).toEqual(['Good morning', 'Good afternoon', 'Good evening']);
  });
});
