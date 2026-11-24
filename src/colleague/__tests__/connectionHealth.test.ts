import { describe, expect, it } from 'vitest';
import { connectionHealthSaid } from '../connectionHealth';
import type { DataConnectionRow } from '../../db/rows';

const now = Date.parse('2026-11-24T12:00:00Z');
const c = (id: string, workspaceId: string, extra: Partial<DataConnectionRow> = {}): DataConnectionRow => ({
  id, workspaceId, name: id, kind: 'pull', status: 'active', mapping: {}, lineMap: {}, scheduleMinutes: 60,
  rowsTotal: 0, createdAt: 1, updatedAt: 1, ...extra,
});

describe('Luna knows connection health in the current customer', () => {
  it('names failed, never-delivered and old sources without leaking another line or a raw API error', () => {
    const result = connectionHealthSaid([
      c('MES', 'line-a', { lastError: 'Bearer secret rejected' }),
      c('ERP', 'line-a'),
      c('Monthly', 'line-a', { lastSuccessAt: now - 9 * 86_400_000 }),
      c('Other company', 'line-b', { lastError: 'failed' }),
    ], new Map([['line-a', 'Packing']]), now);
    expect(result).toContain('MES on Packing is failing');
    expect(result).toContain('ERP on Packing has not delivered data yet');
    expect(result).toContain('Monthly on Packing last delivered data 9 days ago');
    expect(result).not.toContain('Other company');
    expect(result).not.toContain('Bearer secret');
  });
  it('keeps a healthy connection quiet', () => {
    expect(connectionHealthSaid([c('MES', 'line-a', { lastSuccessAt: now - 86_400_000 })], new Map([['line-a', 'Packing']]), now)).toBeUndefined();
  });
});
