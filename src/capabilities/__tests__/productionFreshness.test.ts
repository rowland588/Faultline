import { describe, expect, it } from 'vitest';
import { productionFreshness } from '../production';
import type { DataConnectionRow } from '../../db/rows';

const connection = (lastError?: string): DataConnectionRow => ({
  id: 'c1', name: 'MES', kind: 'pull', status: 'active', mapping: {}, lineMap: {},
  scheduleMinutes: 60, rowsTotal: 4, createdAt: 1, updatedAt: 1, lastError,
});

describe('current production answer', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  it('names an old newest row and a failed connection instead of presenting it as current', () => {
    const f = productionFreshness('2026-11-01', [connection('API refused its key')], now);
    expect(f.ageDays).toBe(23);
    expect(f.says).toContain('23 days old');
    expect(f.says).toContain('1 active data connection is failing');
  });
  it('does not invent staleness for a recent row', () => {
    expect(productionFreshness('2026-11-23', [connection()], now).says).toBe('');
  });
});
