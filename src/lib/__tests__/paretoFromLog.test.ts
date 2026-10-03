/* The Pareto from the log timed in the app — no workbook. */
import { describe, it, expect } from 'vitest';
import { paretoFromLog, profileOf } from '../paretoFromLog';
import { paretoView } from '../paretoView';
import type { Observation } from '../../types';

const DAY = 86_400_000;
const T = Date.UTC(2026, 9, 1);
const ob = (category: string, mins: number, daysAgo: number, count = 1): Observation => ({
  id: category + mins + daysAgo, workspaceId: 'w', category, asset: 'Bagger',
  startedAt: T - daysAgo * DAY, durationMs: mins * 60_000, timing: 'typed', count,
  media: [], createdAt: 1, updatedAt: 1,
});
const lineOf = () => 'Line 2A';

describe('the Pareto, from what was timed on the line', () => {
  const log = [ob('Changeover', 40, 3), ob('Changeover', 30, 10), ob('Film break', 4, 2, 3), ob('Changeover', 90, 40)];
  const now = paretoFromLog(log, T - 28 * DAY, T, lineOf)!;
  const before = paretoFromLog(log, T - 56 * DAY, T - 28 * DAY, lineOf)!;

  it('ranks the window by minutes lost, counting stops', () => {
    expect(now.rows.map(r => r.category)).toEqual(['Changeover', 'Film break']);
    expect(now.rows[0].mins).toBe(70);
    expect(now.rows[1].events).toBe(3);
    expect(now.totalMins).toBe(74);
    expect(now.rows[0].byLine['Line 2A']).toBe(70);
  });
  it('says what kind of loss each is', () => {
    expect(profileOf(35)).toBe('Long-stop');
    expect(profileOf(1.3)).toBe('Frequency');
    expect(profileOf(5)).toBe('Mixed');
  });
  it('two windows that do not overlap are movement', () => {
    const v = paretoView(now, before);
    expect(v.comparable).toBe(true);
    expect(v.rows.find(r => r.category === 'Changeover')?.verdict).toBe('down');
  });
  it('with nothing timed before, says so in the app\'s terms — not "uploaded"', () => {
    const v = paretoView(now, undefined);
    expect(v.comparable).toBe(false);
    expect(v.whyNot).toMatch(/four weeks before/);
    expect(v.whyNot).not.toMatch(/upload/i);
  });
  it('nothing timed is nothing to draw', () => {
    expect(paretoFromLog([], T - 28 * DAY, T, lineOf)).toBeUndefined();
  });
});
