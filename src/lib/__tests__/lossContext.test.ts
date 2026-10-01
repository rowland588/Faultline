import { describe, it, expect } from 'vitest';
import { lossContext } from '../lossContext';
import type { Observation } from '../../types';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 1, 12);
const ob = (category: string, asset: string, mins: number, daysAgo: number, count = 1): Observation => ({
  id: category + asset + daysAgo + mins, workspaceId: 'w', category, asset, startedAt: NOW - daysAgo * DAY,
  durationMs: mins * 60_000, timing: 'typed', count, media: [], createdAt: 1, updatedAt: 1,
});
const log = [
  ob('Changeover', 'Bagger', 60, 2), ob('Changeover', 'Bagger', 40, 10), ob('Jams', 'Bagger', 60, 3, 4),
  ob('Changeover', 'Bagger', 500, 60),   // outside the window
];

describe('why an action was raised, in the loss that raised it', () => {
  it('says the scope’s loss, its share, and its stops, over the last four weeks', () => {
    const words = lossContext(log, 'w', [{ dimension: 'category', value: 'Changeover' }], NOW);
    expect(words).toBe('Changeover — 1.7 h lost in the last 4 weeks, 63% of this line’s lost time (2 stops)');
  });
  it('is empty when nothing was timed in the window', () => {
    expect(lossContext(log, 'w', [{ dimension: 'category', value: 'Film break' }], NOW)).toBe('');
  });
});
