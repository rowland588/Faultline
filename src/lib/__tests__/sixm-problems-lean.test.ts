/* THE LEAN PAGE, SLICE 4 (docs/LEAN-PAGE.md) — the 6M report's tiles and
 * closing line (lib/sixmLean) and the Problems register's (lib/problemsLean),
 * each read from its own module's model. */
import { describe, expect, it } from 'vitest';
import { sixmClosing, sixmTiles, type SixMFigures } from '../sixmLean';
import { registerClosing, registerTiles } from '../problemsLean';
import type { SnagsReading } from '../snagsReport';

const base: SixMFigures = { measured: 2, short: 1, open: 3, finding: 1, acting: 1, proving: 1, slipped: 0, causes: 7, roots: 2, suspected: 3, actionsOpen: 8, actionsLate: 2, actionsDone: 4, held: 1, missed: 0, owedLate: 2, owedLateSaid: '2 countermeasures', owedOpen: 8 };

describe('the 6M report’s tiles', () => {
  it('two lines, one short: the gap, three problems in their phases, two roots of seven, 8 countermeasures with 2 late, one gain held', () => {
    expect(sixmTiles(base).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['The gap', '1 of 2', 'lines short of their target', 'r'],
      ['Problems', '3', '1 finding the cause · 1 acting on it · 1 checking it worked', undefined],
      ['Roots found', '2', 'of 7 causes on the fishbone · 3 suspected', 'n'],
      ['Countermeasures', '8', 'open · 2 late · 4 done', 'r'],
      ['Holding', '1', 'gains kept by a check', 'g'],
    ]);
    expect(sixmClosing(base)).toEqual({ text: '1 of 2 lines are short of their target; 3 problems being worked — 2 countermeasures late.', tone: 'r' });
  });
  it('one line short in its own words; a problem slipped back and a check missed in red', () => {
    const x = { ...base, measured: 1, short: 1, oneLine: { line: 'Line 7', short: '3.2 ppm short of target' }, slipped: 1, missed: 1, actionsLate: 0, owedLate: 1, owedLateSaid: '1 check' };
    const t = sixmTiles(x);
    expect([t[0], t[1].of, t[1].tone, t[4]]).toEqual([{ k: 'The gap', v: '3.2 ppm', of: 'short — Line 7 against its target', tone: 'r' }, '1 slipped back · 1 finding the cause · 1 acting on it · 1 checking it worked', 'r', { k: 'Holding', v: '1', of: 'kept by a check · 1 check missed', tone: 'r' }]);
    expect(sixmClosing(x).text).toBe('Line 7 is 3.2 ppm short of its target; 3 problems being worked — 1 problem slipped back and 1 check missed.');
  });
  it('at target with nothing wrong in green; nothing measured says so', () => {
    expect(sixmClosing({ ...base, short: 0, actionsLate: 0, owedLate: 0, owedLateSaid: '' })).toEqual({ text: 'All 2 lines are at their target; 3 problems being worked.', tone: 'g' });
    expect(sixmTiles({ ...base, measured: 0, short: 0 })[0]).toEqual({ k: 'The gap', v: '—', of: 'no line measured against a target yet' });
  });
});

const reading = (over: Partial<SnagsReading['counts']>, lines: SnagsReading['lines'] = [], jobs: SnagsReading['jobs'] = []): SnagsReading => ({
  counts: { open: 0, in_progress: 0, closed: 0, late: 0, moved: 0, movedOpen: 0, lines: 0, problems: 0, fixes: 0, jobLate: 0, jobDone: 0, jobs: 0, critical: 0, high: 0, low: 0, ...over },
  says: '', lines, jobs, moved: [],
});
const row = (what: string, priority: 'critical' | 'high' | 'low', late = false) =>
  ({ id: what, workspaceId: 'w', line: 'Line 7', what, from: '', status: 'open' as const, priority, word: 'Open', tone: 'a' as const, late, journey: [], raisedAt: 1 });

describe('the Problems register’s tiles', () => {
  it('by priority in its RAG with the word, late, done — the worst open one named where it closes', () => {
    const r = reading({ critical: 1, high: 1, low: 13, late: 0, jobLate: 2, closed: 3, jobDone: 2 }, [{ id: 'w', name: 'Line 7', rows: [row('Guard switch loose', 'low', true), row('Seal jaw too cold', 'critical')] }]);
    expect(registerTiles(r).map(t => [t.k, t.v, t.tone])).toEqual([['Critical', '1', 'r'], ['High', '1', 'a'], ['Low', '13', 'g'], ['Late', '2', 'r'], ['Done', '5', 'n']]);
    expect(registerClosing(r)).toEqual({ text: '15 problems open — 1 critical, 2 late; the first to put right: “Seal jaw too cold” on Line 7.', tone: 'r' });
  });
  it('nothing open: put right, in green', () => {
    expect(registerClosing(reading({ closed: 4 }))).toEqual({ text: 'No problem open — 4 put right.', tone: 'g' });
  });
});
